import { dayIndex, dayPostOp } from './time.js';

// Objective triggers: concerns found from the data itself, independent of what
// the patient says. This is the safety net for "the patient did not mention it".

export function expectedFlexion(day, milestones) {
  const ms = [...milestones].sort((a, b) => a.day - b.day);
  if (day <= ms[0].day) return ms[0].flex;
  for (let i = 1; i < ms.length; i++) {
    if (day <= ms[i].day) {
      const a = ms[i - 1];
      const b = ms[i];
      return a.flex + ((b.flex - a.flex) * (day - a.day)) / (b.day - a.day);
    }
  }
  return ms[ms.length - 1].flex;
}

const max = (a) => (a.length ? Math.max(...a) : null);
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

// Per-day best heel-slide range for a mode.
export function heelByDay(sessions) {
  const days = new Map();
  for (const s of sessions) {
    if (s.exercise !== 'heel_slide') continue;
    const d = dayIndex(s.ts);
    const row = days.get(d) || { day: d, active: null, assisted: null };
    const peak = s.metrics?.peak;
    if (peak == null) continue;
    row[s.mode] = row[s.mode] == null ? peak : Math.max(row[s.mode], peak);
    days.set(d, row);
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}

export function slrByDay(sessions) {
  const days = new Map();
  for (const s of sessions) {
    if (s.exercise !== 'slr') continue;
    const d = dayIndex(s.ts);
    const row = days.get(d) || { day: d, activeDeficit: null, assistedDeficit: null, lift: null, stage: s.stage };
    const def = s.metrics?.deficit;
    if (def != null) {
      const key = s.mode === 'assisted' ? 'assistedDeficit' : 'activeDeficit';
      row[key] = row[key] == null ? def : Math.min(row[key], def);
    }
    if (s.mode === 'active' && s.metrics?.peak != null) row.lift = Math.max(row.lift ?? 0, s.metrics.peak);
    row.stage = s.stage || row.stage;
    days.set(d, row);
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}

export function analyze({ sessions, now, surgeryTs, playbook }) {
  const t = playbook.thresholds;
  const today = dayIndex(now);
  const dp = dayPostOp(now, surgeryTs);
  const flags = [];
  const suggestions = [];
  const ordered = [...sessions].sort((a, b) => a.ts - b.ts);

  // 1. Missed days
  if (ordered.length) {
    const lastDay = dayIndex(ordered[ordered.length - 1].ts);
    const missed = today - lastDay;
    if (missed >= t.missedDaysReview) {
      flags.push({
        key: `missed-${lastDay}`,
        type: 'missed_days',
        tier: 'review',
        level: 1,
        title: `No exercise logged for ${missed} days`,
        detail: `Last session was ${missed} days ago. Could be pain, fear, forgetting or a problem. Worth a call.`,
      });
    }
  }

  // 2. Regression in active heel-slide range
  const hsActive = ordered.filter((s) => s.exercise === 'heel_slide' && s.mode === 'active' && s.metrics?.peak != null);
  if (hsActive.length >= 3) {
    const last = hsActive[hsActive.length - 1];
    const prev = hsActive.slice(-4, -1).map((s) => s.metrics.peak);
    if (last.metrics.peak < max(prev) - t.regressionDeg) {
      flags.push({
        key: `regress-${last.id}`,
        type: 'regression',
        tier: 'review',
        level: 1,
        title: 'Active range dropped',
        detail: `Latest active bend ${Math.round(last.metrics.peak)}° vs recent best ${Math.round(max(prev))}°.`,
      });
    }
  }

  // 3. Holding back: active much lower than assisted (can't vs won't)
  const hd = heelByDay(ordered).filter((d) => d.active != null && d.assisted != null);
  if (hd.length >= 3) {
    const last3 = hd.slice(-3);
    const gap = avg(last3.map((d) => d.assisted - d.active));
    if (gap >= t.assistGapWarn) {
      flags.push({
        key: `gap-${last3[2].day}`,
        type: 'holding_back',
        tier: 'review',
        level: 1,
        title: 'Active range well below assisted range',
        detail: `Over 3 days the knee goes about ${Math.round(gap)}° further with help than alone. The difference needs physio review of pain, technique, assistance and recording quality. These readings alone do not identify the cause.`,
      });
    }
  }

  // 4. Possible mechanical stiffness: both flat and below milestone
  const recent = hd.filter((d) => d.day >= today - 8);
  if (recent.length >= 4) {
    const assisted = recent.map((d) => d.assisted);
    const active = recent.map((d) => d.active);
    const flat = Math.max(...assisted) - Math.min(...assisted) <= 4;
    const target = expectedFlexion(dp, playbook.milestones);
    if (flat && Math.max(...assisted) < target - 8 && Math.max(...active) < target - 8) {
      flags.push({
        key: `stiff-${Math.floor(today / 3)}`,
        type: 'possible_stiffness',
        tier: 'review',
        level: 2,
        ccLevels: [4],
        title: 'Both active and assisted range flat, and below the milestone',
        detail: `Assisted range has stayed near ${Math.round(Math.max(...assisted))}° for ${recent.length} days; milestone for day ${dp} is about ${Math.round(target)}°. The recorded range is not increasing. A clinician should review the patient and recording quality; the camera cannot diagnose stiffness.`,
      });
    }
  }

  // 5. Quad lag trend (straight leg raise)
  const sd = slrByDay(ordered).filter((d) => d.activeDeficit != null);
  if (sd.length >= 3) {
    const latest = sd[sd.length - 1];
    const prev = sd.slice(-4, -1).map((d) => d.activeDeficit);
    if (latest.activeDeficit >= t.quadLagWarn && latest.activeDeficit >= avg(prev) - 1) {
      flags.push({
        key: `lag-${latest.day}`,
        type: 'quad_lag',
        tier: 'review',
        level: 1,
        title: 'Quad lag not improving',
        detail: `Extension deficit during the leg raise is ${Math.round(latest.activeDeficit)}° (physio warning level ${t.quadLagWarn}°) and not falling.`,
      });
    }
    const stageNow = latest.stage;
    const last3 = sd.slice(-3);
    if (stageNow === 'pillow' && last3.length === 3 && last3.every((d) => d.activeDeficit <= t.quadLagReady)) {
      suggestions.push({
        key: `progress-${latest.day}`,
        type: 'suggest_progression',
        title: 'Ready to remove the pillow?',
        detail: `Extension deficit has been ${t.quadLagReady}° or less for 3 days with the pillow. The physio decides whether to progress.`,
      });
    }
  }

  return { flags, suggestions, dayPostOp: dp };
}
