// Shared constants used by both the Node server and the React client.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Voice cue slots a physio records once ("teach once"). Cues are tied to phases
// of effort, the way a physio coaches: effort -> hold -> release.
export const CUE_TAGS = [
  { id: 'start', label: 'Start', hint: 'e.g. "Okay, begin" / "Chalo, shuru karo"' },
  { id: 'push', label: 'Push (loops while moving)', hint: 'e.g. "Push, push, push" / "Dhakal, dhakal"' },
  { id: 'hold', label: 'Hold at the peak', hint: 'e.g. "Hold it, hold it"' },
  { id: 'relax', label: 'Relax / release', hint: 'e.g. "Relax" / "Chhoro"' },
  { id: 'good', label: 'Good rep', hint: 'e.g. "Good, that is it"' },
  { id: 'again', label: 'Keep going (stalled / early release)', hint: 'e.g. "Come on, one more push"' },
  { id: 'slow', label: 'Slow down', hint: 'e.g. "Slowly, control it"' },
  { id: 'stop', label: 'Stop if sharp pain', hint: 'e.g. "Stop if it is a sharp pain"' },
  { id: 'done', label: 'Session done', hint: 'e.g. "Well done, that is today finished"' },
];

// Fallback (placeholder) phrases used only until the physio records real clips.
export const CUE_FALLBACK = {
  start: 'Okay, let us begin.',
  push: 'Push, push, push.',
  hold: 'Hold it.',
  relax: 'Relax.',
  good: 'Good.',
  again: 'Come on, keep going.',
  slow: 'Slowly, control it.',
  stop: 'Stop if you feel a sharp pain.',
  done: 'Well done. That is today finished.',
};

// The chain of responsibility the patient described.
export const CARE_LEVELS = [
  { level: 1, id: 'visiting', title: 'Visiting physio', blurb: 'Home physio. First to see every concern.' },
  { level: 2, id: 'primary', title: 'Primary physio', blurb: 'Clinic physio. Sees patients every 2 weeks.' },
  { level: 3, id: 'doctor', title: 'Assistant doctor', blurb: 'Medical review of anything the physios cannot settle.' },
  { level: 4, id: 'surgeon', title: 'Surgeon', blurb: 'Final escalation, and surgical decisions.' },
];

export const TIERS = {
  urgent: { id: 'urgent', label: 'Urgent', rank: 3 },
  review: { id: 'review', label: 'Review', rank: 2 },
  fyi: { id: 'fyi', label: 'FYI', rank: 1 },
};

// What the patient can tick when something feels wrong.
export const SYMPTOMS = [
  { id: 'chest_breath', label: 'Chest pain or trouble breathing', emergency: true },
  { id: 'calf_swelling', label: 'Calf pain, swelling or tightness (one leg)' },
  { id: 'fever', label: 'Fever or chills' },
  { id: 'redness_heat', label: 'Redness or heat around the knee' },
  { id: 'wound', label: 'Wound opening, leaking or smelly' },
  { id: 'numbness', label: 'Numbness, or foot cold / pale / blue' },
  { id: 'fall', label: 'I fell' },
  { id: 'cant_weight', label: 'Cannot put weight on the leg' },
  { id: 'locking', label: 'Knee locks or feels stuck' },
  { id: 'giving_way', label: 'Knee gives way / feels unstable' },
  { id: 'swelling_up', label: 'Swelling is more than yesterday' },
  { id: 'stiff', label: 'Knee feels stiffer than usual' },
  { id: 'clicking', label: 'Clicking or popping, no sharp pain' },
  { id: 'cramps', label: 'Muscle cramps or pulling' },
  { id: 'low_mood', label: 'Feeling low, anxious or scared' },
];

export const EMERGENCY_NUMBER = '112';
