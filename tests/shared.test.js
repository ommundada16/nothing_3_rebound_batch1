import test from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../shared/triage.js';
import { DEFAULT_PLAYBOOK as PB } from '../shared/playbook.js';
import { analyze } from '../shared/objective.js';
import { DAY_MS } from '../shared/constants.js';

test('calf swelling is urgent and notifies two levels', () => {
  const r = triage({ symptoms: ['calf_swelling'], pain: 3 }, PB);
  assert.equal(r.tier, 'urgent');
  assert.deepEqual(r.notifyLevels, [1, 2]);
});

test('free text can only raise the tier, never lower it', () => {
  const r = triage({ symptoms: ['clicking'], pain: 2, text: 'I had a fever last night' }, PB);
  assert.equal(r.tier, 'urgent');
  const calm = triage({ symptoms: ['calf_swelling'], pain: 0, text: 'all fine really' }, PB);
  assert.equal(calm.tier, 'urgent');
});

test('painless clicking is FYI but still has guidance', () => {
  const r = triage({ symptoms: ['clicking'], pain: 2 }, PB);
  assert.equal(r.tier, 'fyi');
  assert.ok(r.guidance.length > 0);
});

test('fever with redness is urgent (possible infection)', () => {
  const r = triage({ symptoms: ['fever', 'redness_heat'], pain: 4 }, PB);
  assert.equal(r.tier, 'urgent');
});

test('high pain alone raises tier', () => {
  assert.equal(triage({ symptoms: [], pain: 8 }, PB).tier, 'urgent');
  assert.equal(triage({ symptoms: [], pain: 6 }, PB).tier, 'review');
  assert.equal(triage({ symptoms: [], pain: 2 }, PB).tier, 'fyi');
});

test('chest pain flags an emergency', () => {
  assert.equal(triage({ symptoms: ['chest_breath'], pain: 0 }, PB).emergency, true);
});

function mk(days, fn) {
  const now = Date.UTC(2026, 9, 25, 6, 0, 0);
  const out = [];
  for (let i = days; i >= 1; i--) {
    for (const s of fn(i, now - i * DAY_MS)) out.push(s);
  }
  return { now, sessions: out, surgeryTs: now - 21 * DAY_MS };
}

test('holding-back pattern: active far below assisted', () => {
  const { now, sessions, surgeryTs } = mk(5, (i, ts) => [
    { id: 'a' + i, ts, exercise: 'heel_slide', mode: 'active', metrics: { peak: 70 } },
    { id: 'b' + i, ts: ts + 1000, exercise: 'heel_slide', mode: 'assisted', metrics: { peak: 100 } },
  ]);
  const { flags } = analyze({ sessions, now, surgeryTs, playbook: PB });
  assert.ok(flags.some((f) => f.type === 'holding_back'));
});

test('possible stiffness: both flat and below milestone goes to level 2', () => {
  const { now, sessions, surgeryTs } = mk(6, (i, ts) => [
    { id: 'a' + i, ts, exercise: 'heel_slide', mode: 'active', metrics: { peak: 78 } },
    { id: 'b' + i, ts: ts + 1000, exercise: 'heel_slide', mode: 'assisted', metrics: { peak: 82 } },
  ]);
  const { flags } = analyze({ sessions, now, surgeryTs, playbook: PB });
  const f = flags.find((x) => x.type === 'possible_stiffness');
  assert.ok(f);
  assert.equal(f.level, 2);
});

test('missed days raises a review', () => {
  const now = Date.UTC(2026, 9, 25, 6, 0, 0);
  const sessions = [{ id: 'x', ts: now - 3 * DAY_MS, exercise: 'heel_slide', mode: 'active', metrics: { peak: 80 } }];
  const { flags } = analyze({ sessions, now, surgeryTs: now - 21 * DAY_MS, playbook: PB });
  assert.ok(flags.some((f) => f.type === 'missed_days'));
});

test('healthy progress raises no flags', () => {
  const { now, sessions, surgeryTs } = mk(6, (i, ts) => [
    { id: 'a' + i, ts, exercise: 'heel_slide', mode: 'active', metrics: { peak: 110 - i * 3 } },
    { id: 'b' + i, ts: ts + 1000, exercise: 'heel_slide', mode: 'assisted', metrics: { peak: 115 - i * 3 } },
  ]);
  const { flags } = analyze({ sessions, now, surgeryTs, playbook: PB });
  assert.equal(flags.length, 0);
});
