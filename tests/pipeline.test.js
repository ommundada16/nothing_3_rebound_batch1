import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, SIM_W, SIM_H } from '../src/lib/sim.js';
import { RepCounter } from '../src/lib/repCounter.js';
import { LEG } from '../shared/exercises.js';
import { Smoother, flexionFrom, liftFrom, readLeg } from '../src/lib/geometry.js';

function drive(sim, signal, counter, seconds = 24) {
  const sm = new Smoother(0.35);
  const base = performance.now();
  const deficits = [];
  for (let ms = 0; ms < seconds * 1000; ms += 1000 / 30) {
    const { landmarks } = sim.frame(base + ms);
    const leg = readLeg(landmarks, LEG[sim.side], SIM_W, SIM_H);
    const raw = signal === 'flexion' ? flexionFrom(leg.hip, leg.knee, leg.ankle) : liftFrom(leg.hip, leg.knee);
    counter.update(sm.push(raw), ms);
    if (counter.state === 'holding') deficits.push(flexionFrom(leg.hip, leg.knee, leg.ankle));
  }
  return deficits;
}

test('simulated heel slide: measured peak matches the true peak within 3 degrees', () => {
  const sim = createSim({ exercise: 'heel_slide', peak: 85, holdSec: 3 });
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000 });
  drive(sim, 'flexion', c, 22);
  assert.ok(c.completed >= 2, `completed ${c.completed}`);
  for (const r of c.reps) assert.ok(Math.abs(r.peak - 85) < 3, `peak ${r.peak}`);
});

test('simulated leg raise: lift peak and knee deficit are recovered', () => {
  const sim = createSim({ exercise: 'slr', peak: 40, deficit: 9, holdSec: 5 });
  const c = new RepCounter({ base: 6, minPeak: 15, holdMs: 5000 });
  const deficits = drive(sim, 'lift', c, 28);
  assert.ok(c.completed >= 2, `completed ${c.completed}`);
  const avg = deficits.reduce((a, b) => a + b, 0) / deficits.length;
  assert.ok(Math.abs(avg - 9) < 1.5, `deficit ${avg}`);
  for (const r of c.reps) assert.ok(Math.abs(r.peak - 40) < 3);
});

test('a flawed simulated rep stalls, raises the keep-going cue, and is not counted', () => {
  const sim = createSim({ exercise: 'heel_slide', peak: 85, holdSec: 3, flawRep: 1 });
  const events = [];
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000, onEvent: (e) => events.push(e.type) });
  drive(sim, 'flexion', c, 22);
  assert.ok(events.includes('stalled'));
  assert.ok(c.completed >= 1); // later, healthy reps still count
  assert.ok(c.reps.every((r) => r.peak > 60));
});
