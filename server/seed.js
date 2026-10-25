import { randomUUID } from 'node:crypto';
import { DAY_MS } from '../shared/constants.js';
import { dayIndex } from '../shared/time.js';
import { DEFAULT_PLAYBOOK } from '../shared/playbook.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const at10am = (dayIdx) => dayIdx * DAY_MS - IST_OFFSET_MS + 10 * 60 * 60 * 1000;

export const SCENARIOS = {
  progressing: 'Healthy progress (no flags expected)',
  fear: 'Plateau because the patient is holding back (assisted >> active)',
  stiff: 'Plateau because the knee is stiff (assisted and active both flat)',
};

// Real numbers from the builder's own clinic test export (screenshots, 2 Jun 2026).
// Shown only to illustrate integration with clinic testing. Not the synthetic patient.
export const CLINIC_BASELINE = {
  source: 'Example clinic test export (MoveHealth+ with ForceDecks, DynaMo, HumanTrak)',
  date: '2 Jun 2026',
  note: "Real example data from the builder's own ACL and meniscus rehab, to show how clinic tests could feed this timeline. Not the synthetic patient.",
  rows: [
    { name: 'Knee extension strength', unit: 'lb', left: 44, right: 60 },
    { name: 'Knee flexion strength', unit: 'lb', left: 34, right: 45 },
    { name: 'Max knee flexion: lunge', unit: '°', left: 90, right: 104 },
    { name: 'Max knee flexion: squat', unit: '°', left: 111, right: 120 },
    { name: 'Max knee flexion: single-leg squat', unit: '°', left: 77, right: 83 },
    { name: 'Hip adduction strength', unit: 'lb', left: 22, right: 27 },
    { name: 'Hop contact time', unit: 's', left: 0.7, right: 0.4, lowerIsBetter: true },
    { name: 'Single-leg balance, eyes closed (sway area)', unit: 'mm²', left: 3739, right: 1593, lowerIsBetter: true },
  ],
};

function wobble(seed) {
  // deterministic pseudo-noise in [-1, 1]
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function mkReps(peak, n = 8) {
  return Array.from({ length: n }, (_, i) => ({
    peak: Math.round((peak + wobble(peak * 7 + i) * 2.5) * 10) / 10,
    holdMs: 3000,
    complete: true,
  }));
}

export function seedSessions(scenario, now) {
  const today = dayIndex(now);
  const sessions = [];
  for (let k = 14; k >= 1; k--) {
    const n = 15 - k; // 1..14
    const ts = at10am(today - k);
    let assisted = 68 + n * 2.4 + wobble(n) * 1.5;
    let active = assisted - (14 - n * 0.5) + wobble(n + 3) * 1.5;
    if (scenario === 'fear') active = 70 + Math.min(n, 6) * 1.2 + wobble(n + 5) * 1.5;
    if (scenario === 'stiff') {
      assisted = n <= 6 ? 68 + n * 2.3 : 82 + wobble(n) * 1.2;
      active = assisted - 4 + wobble(n + 9) * 1;
    }
    const confidence = scenario === 'fear' ? 2 : n < 5 ? 3 : 4;
    const pain = scenario === 'stiff' ? 5 : Math.max(2, 6 - Math.floor(n / 3));

    for (const [mode, peak] of [['active', active], ['assisted', assisted]]) {
      sessions.push({
        id: `seed-${scenario}-${k}-hs-${mode}`,
        ts: ts + (mode === 'assisted' ? 5 * 60000 : 0),
        exercise: 'heel_slide',
        mode,
        leg: 'left',
        stage: null,
        reps: mkReps(peak),
        metrics: { peak: Math.round(peak * 10) / 10, deficit: null },
        confidenceAvg: 0.9,
        cameraSource: 'seed',
        screenshotIds: [],
        selfReport: { pain, confidence },
      });
    }

    const pillow = n <= 9;
    const activeDef = pillow ? 20 - n * 1.2 + wobble(n + 11) * 0.8 : 12 - (n - 9) * 0.6 + wobble(n + 13) * 0.6;
    const lift = 25 + n * 1.0;
    sessions.push({
      id: `seed-${scenario}-${k}-slr-active`,
      ts: ts + 12 * 60000,
      exercise: 'slr',
      mode: 'active',
      leg: 'left',
      stage: pillow ? 'pillow' : 'nopillow',
      reps: mkReps(lift, 8),
      metrics: { peak: Math.round(lift * 10) / 10, deficit: Math.round(activeDef * 10) / 10 },
      confidenceAvg: 0.88,
      cameraSource: 'seed',
      screenshotIds: [],
      selfReport: { pain, confidence },
    });
    sessions.push({
      id: `seed-${scenario}-${k}-slr-assisted`,
      ts: ts + 17 * 60000,
      exercise: 'slr',
      mode: 'assisted',
      leg: 'left',
      stage: pillow ? 'pillow' : 'nopillow',
      reps: mkReps(lift, 6),
      metrics: { peak: Math.round(lift * 10) / 10, deficit: 2 },
      confidenceAvg: 0.88,
      cameraSource: 'seed',
      screenshotIds: [],
      selfReport: { pain, confidence },
    });
  }
  return sessions;
}

export function freshState(scenario = 'progressing', now = Date.now()) {
  const surgeryTs = at10am(dayIndex(now) - 21);
  const state = {
    rev: 1,
    clockOffsetMs: 0,
    scenario,
    patient: {
      id: 'p1',
      name: 'Patient A (synthetic)',
      age: 64,
      procedure: 'Total knee replacement, left knee',
      surgeryTs,
      leg: 'left',
      surgeon: 'Surgeon (example)',
      caregiver: 'Daughter',
    },
    plan: {
      exercises: [
        { id: 'heel_slide', reps: 8, holdSec: 3, modes: ['active', 'assisted'] },
        { id: 'slr', reps: 8, holdSec: 5, modes: ['active', 'assisted'], stage: 'pillow' },
      ],
      precautions: [
        'No pillow directly under the knee when resting.',
        'No twisting or crossing the operated leg.',
        'Stop an exercise if the pain is sharp, not just a stretch.',
      ],
      notes: 'Ice after exercise. Ankle pumps every hour while awake.',
      updatedBy: 'Visiting physio (example)',
    },
    playbook: structuredClone(DEFAULT_PLAYBOOK),
    cues: {},
    cueLanguage: 'en',
    refVideos: { heel_slide: { stock: null, home: null }, slr: { stock: null, home: null } },
    family: { shareLevel: 'status', helperRequest: null, contact: 'Daughter' },
    clinicBaseline: CLINIC_BASELINE,
    sessions: seedSessions(scenario, now),
    issues: [],
    audit: [],
  };
  state.audit.push({ id: randomUUID(), ts: now, by: 'system', text: `Demo data loaded: scenario "${scenario}".` });
  return state;
}
