import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../server/seed.js';
import { answerFollowUp, applyAction, createIssueFromReport, nowOf, syncObjective, tick } from '../server/issues.js';

const MIN = 60000;
const advance = (state, minutes) => {
  state.clockOffsetMs += minutes * MIN;
  tick(state);
};

test('an unanswered urgent concern climbs the whole chain and stops at the surgeon', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['calf_swelling'], pain: 3 });
  assert.equal(issue.tier, 'urgent');
  assert.equal(issue.level, 1);
  assert.deepEqual(issue.notifiedLevels, [1, 2]);

  advance(s, 31);
  assert.equal(issue.level, 2);
  advance(s, 31);
  assert.equal(issue.level, 3);
  advance(s, 31);
  assert.equal(issue.level, 4);
  advance(s, 31);
  assert.equal(issue.level, 4); // cannot go higher
  assert.ok(issue.overdueAtFinal);
  assert.equal(issue.status, 'new'); // never closed by the system
});

test('acknowledging stops the acknowledge timer but starts the resolve timer', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['swelling_up'], pain: 5 });
  assert.equal(issue.tier, 'review');
  advance(s, 100);
  applyAction(s, issue.id, { action: 'ack', byLevel: 1 });
  advance(s, 200); // beyond the acknowledge time, within the resolve time
  assert.equal(issue.level, 1);
  advance(s, 24 * 60); // beyond the resolve time
  assert.equal(issue.level, 2);
});

test('resolving needs a note, and a resolved concern stays resolved', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['locking'], pain: 4 });
  assert.ok(applyAction(s, issue.id, { action: 'resolve', byLevel: 1, text: '  ' }).error);
  assert.equal(issue.status, 'new');
  assert.ok(!applyAction(s, issue.id, { action: 'resolve', byLevel: 1, text: 'Visited, settled' }).error);
  advance(s, 24 * 60);
  assert.equal(issue.status, 'resolved');
  assert.equal(issue.level, 1);
});

test('replying keeps the concern open', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['locking'], pain: 4 });
  applyAction(s, issue.id, { action: 'reply', byLevel: 1, text: 'Skip exercise today, I will visit tomorrow.' });
  assert.notEqual(issue.status, 'resolved');
  assert.ok(applyAction(s, issue.id, { action: 'reply', byLevel: 1, text: '' }).error);
});

test('escalating moves it up one level and notifies that level', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['locking'], pain: 4 });
  applyAction(s, issue.id, { action: 'escalate', byLevel: 1, text: 'needs a senior look' });
  assert.equal(issue.level, 2);
  assert.ok(issue.notifiedLevels.includes(2));
  assert.equal(issue.status, 'new');
});

test('"call me" always reaches the physio as urgent', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: [], pain: 0, text: 'please call', callRequest: true });
  assert.equal(issue.tier, 'urgent');
  assert.equal(issue.title, 'Patient asked for a call');
});

test('a follow-up answer of "worse" raises the tier; "better" never closes it', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['swelling_up'], pain: 5 });
  assert.equal(issue.tier, 'review');
  answerFollowUp(s, issue.id, 'worse');
  assert.equal(issue.tier, 'urgent');
  assert.equal(issue.status, 'new');

  const { issue: calm } = createIssueFromReport(s, { symptoms: ['clicking'], pain: 1 });
  assert.equal(calm.tier, 'fyi');
  answerFollowUp(s, calm.id, 'better');
  assert.notEqual(calm.status, 'resolved');
});

test('an unanswered follow-up raises a low-level concern to review', () => {
  const s = freshState('progressing');
  const { issue } = createIssueFromReport(s, { symptoms: ['clicking'], pain: 1 });
  assert.equal(issue.tier, 'fyi');
  advance(s, 241); // follow-up time plus the grace period
  assert.equal(issue.tier, 'review');
  assert.equal(issue.followUpEscalated, true);
});

test('data-driven flags create one concern and do not duplicate', () => {
  const s = freshState('fear');
  const first = syncObjective(s);
  assert.ok(first.some((i) => i.type === 'holding_back'));
  const again = syncObjective(s);
  assert.equal(again.length, 0);
  const stiff = freshState('stiff');
  const made = syncObjective(stiff);
  const f = made.find((i) => i.type === 'possible_stiffness');
  assert.ok(f);
  assert.equal(f.level, 2);
  assert.ok(f.notifiedLevels.includes(4)); // surgeon is copied in
});

test('the clock helper is consistent', () => {
  const s = freshState('progressing');
  const before = nowOf(s);
  s.clockOffsetMs += 5 * MIN;
  assert.ok(nowOf(s) - before >= 5 * MIN);
});


test('suspected medicine side effects reach the assistant doctor without a diagnosis', () => {
  const state = freshState('progressing');
  const { issue, result } = createIssueFromReport(state, {suspectedSideEffect:true, text:'Nausea after a medicine', symptoms:[], pain:0});
  assert.equal(issue.level, 3);
  assert.equal(issue.tier, 'review');
  assert.ok(issue.notifiedLevels.includes(3));
  assert.equal(result.startLevel, 3);
  assert.ok(issue.dueAt);
});
