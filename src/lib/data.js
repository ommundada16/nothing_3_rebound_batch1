import { dayIndex } from '../../shared/time.js';
import { heelByDay, slrByDay } from '../../shared/objective.js';

export const postOpDay = (day, surgeryTs) => day - dayIndex(surgeryTs);

// Chart-ready series for the heel slide (x = day after surgery).
export function heelChart(sessions, surgeryTs) {
  const rows = heelByDay(sessions);
  return {
    active: rows.filter((r) => r.active != null).map((r) => ({ x: postOpDay(r.day, surgeryTs), y: Math.round(r.active * 10) / 10 })),
    assisted: rows.filter((r) => r.assisted != null).map((r) => ({ x: postOpDay(r.day, surgeryTs), y: Math.round(r.assisted * 10) / 10 })),
    rows,
  };
}

export function slrChart(sessions, surgeryTs) {
  const rows = slrByDay(sessions);
  let switchDay = null;
  rows.forEach((r, i) => {
    if (r.stage === 'nopillow' && switchDay == null && i > 0 && rows[i - 1].stage === 'pillow') switchDay = postOpDay(r.day, surgeryTs);
  });
  return {
    active: rows.filter((r) => r.activeDeficit != null).map((r) => ({ x: postOpDay(r.day, surgeryTs), y: Math.round(r.activeDeficit * 10) / 10 })),
    assisted: rows.filter((r) => r.assistedDeficit != null).map((r) => ({ x: postOpDay(r.day, surgeryTs), y: Math.round(r.assistedDeficit * 10) / 10 })),
    lift: rows.filter((r) => r.lift != null).map((r) => ({ x: postOpDay(r.day, surgeryTs), y: Math.round(r.lift * 10) / 10 })),
    switchDay,
    rows,
  };
}

export function sessionsToday(sessions, now) {
  const d = dayIndex(now);
  return sessions.filter((s) => dayIndex(s.ts) === d);
}

export function relTime(ts, now) {
  const diff = now - ts;
  const m = Math.round(Math.abs(diff) / 60000);
  const word = m < 1 ? 'just now' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
  if (word === 'just now') return word;
  return diff >= 0 ? `${word} ago` : `in ${word}`;
}

export const lsi = (left, right, lowerIsBetter = false) => {
  if (!left || !right) return null;
  const pct = lowerIsBetter ? (right / left) * 100 : (left / right) * 100;
  return Math.round(pct);
};
