import { SYMPTOMS, TIERS } from './constants.js';

// Deterministic, explainable triage. Physio-authored rules run first.
// DESIGN RULE: this function can only decide WHO sees a concern and HOW FAST.
// It never marks anything harmless and never closes an issue.

const RANK = { fyi: 1, review: 2, urgent: 3 };

function wordHit(text, word) {
  const w = word.toLowerCase();
  if (w.includes(' ') || w.length > 4) return text.includes(w);
  return new RegExp(`\\b${w}\\b`).test(text);
}

export function triage(report, playbook) {
  const symptoms = report.symptoms || [];
  const pain = Number(report.pain ?? 0);
  const text = (report.text || '').toLowerCase();
  const t = playbook.thresholds;

  let tier = 'fyi';
  const reasons = [];
  const guidance = [];
  let emergency = false;

  const raise = (to, why) => {
    if (RANK[to] > RANK[tier]) tier = to;
    if (why && !reasons.includes(why)) reasons.push(why);
  };

  for (const id of symptoms) {
    const rule = playbook.symptomRules[id];
    const sym = SYMPTOMS.find((s) => s.id === id);
    if (sym?.emergency) emergency = true;
    if (rule) {
      raise(rule.tier, `${sym?.label || id}: ${rule.why}`);
      for (const g of rule.guidance || []) if (!guidance.includes(g)) guidance.push(g);
    }
  }

  const has = (id) => symptoms.includes(id);
  if (has('fever') && (has('redness_heat') || has('wound'))) raise('urgent', 'Fever together with redness, heat or a wound problem: possible infection.');
  if (has('fall') && has('cant_weight')) raise('urgent', 'A fall and not being able to bear weight.');
  if (has('swelling_up') && pain >= 5) raise('review', 'More swelling together with pain of 5 or more.');

  if (pain >= t.painUrgent) raise('urgent', `Pain is ${pain} out of 10.`);
  else if (pain >= t.painReview) raise('review', `Pain is ${pain} out of 10.`);

  for (const w of playbook.keywords?.urgent || []) {
    if (text && wordHit(text, w)) raise('urgent', `Your message mentions "${w}".`);
  }
  for (const w of playbook.keywords?.review || []) {
    if (text && wordHit(text, w)) raise('review', `Your message mentions "${w}".`);
  }

  if (/chest\s+(pain|tightness)|breathless|shortness of breath|difficulty breathing|trouble breathing|cannot breathe|can't breathe/.test(text)) {
    emergency = true;
    raise('urgent', 'Your message describes chest or breathing symptoms that need emergency attention.');
    guidance.unshift('Call the emergency number now. Do not wait for a reply from the app or the physio.');
  }
  if (report.photo) reasons.push('A photo is attached for the physio to look at.');
  if (!reasons.length) reasons.push('No red-flag symptoms ticked. A physio still sees this in the daily digest.');

  if (!guidance.length) guidance.push('Keep to the plan your physio set. If anything changes, tell us.');

  return {
    tier,
    label: TIERS[tier].label,
    reasons,
    guidance,
    emergency,
    startLevel: 1,
    notifyLevels: tier === 'urgent' ? [1, 2] : [1],
  };
}
