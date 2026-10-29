import test from 'node:test';
import assert from 'node:assert/strict';
import { RepCounter } from '../src/lib/repCounter.js';

const ease = (x) => x * x * (3 - 2 * x);

// Build a 30 fps signal: rest, rise, hold, fall.
function run(counter, plan) {
  let t = 0;
  const step = 1000 / 30;
  const feed = (v) => {
    counter.update(v, t);
    t += step;
  };
  for (const p of plan) {
    const n = Math.round((p.ms / 1000) * 30);
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 1;
      feed(p.from + (p.to - p.from) * ease(k));
    }
  }
}

const rep = (peak, holdMs = 4000) => [
  { from: 2, to: 2, ms: 1200 },
  { from: 2, to: peak, ms: 2200 },
  { from: peak, to: peak, ms: holdMs },
  { from: peak, to: 2, ms: 2000 },
];

test('counts three full reps with correct peaks and cue events', () => {
  const events = [];
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000, onEvent: (e) => events.push(e.type) });
  run(c, [...rep(80), ...rep(82), ...rep(85)]);
  assert.equal(c.reps.length, 3);
  assert.equal(c.completed, 3);
  assert.ok(Math.abs(c.reps[2].peak - 85) < 1.5);
  assert.deepEqual(
    events.filter((e) => e !== 'hold_tick').slice(0, 4),
    ['start', 'peak', 'release', 'rep_done'],
  );
  assert.ok(events.includes('hold_tick'));
});

test('releasing before the hold time is an incomplete rep', () => {
  const events = [];
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000, onEvent: (e) => events.push(e.type) });
  run(c, rep(80, 1200));
  assert.ok(events.includes('early_release'));
  assert.equal(c.reps.length, 1);
  assert.equal(c.reps[0].complete, false);
  assert.equal(c.completed, 0);
});

test('stalling below the minimum peak raises a stalled event', () => {
  const events = [];
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000, onEvent: (e) => events.push(e.type) });
  run(c, [
    { from: 2, to: 2, ms: 1000 },
    { from: 2, to: 22, ms: 1500 },
    { from: 22, to: 22, ms: 4000 },
    { from: 22, to: 2, ms: 1500 },
  ]);
  assert.ok(events.includes('stalled'));
  assert.equal(c.completed, 0);
});

test('null samples (camera cannot see the leg) are ignored', () => {
  const c = new RepCounter({ base: 12, minPeak: 30, holdMs: 3000 });
  c.update(null, 0);
  assert.equal(c.state, 'rest');
});


test('a lost camera interval cannot count as observed holding time',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:3000});
 for(let t=0;t<=1800;t+=100)c.update(t<300?2:80,t);
 assert.equal(c.state,'holding');c.update(null,1900);c.update(80,10000);
 assert.equal(c.completed,0);assert.equal(c.state,'recovering');
 c.update(2,10100);assert.equal(c.state,'rest');
});
test('a frame gap without null samples also invalidates the current hold',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:3000});
 for(let t=0;t<=1800;t+=100)c.update(t<300?2:80,t);
 c.update(80,10000);assert.equal(c.state,'recovering');assert.equal(c.completed,0);
});
test('a repetition that exceeded the bend limit is not counted as complete',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:3000});
 run(c,[{from:2,to:2,ms:1200},{from:2,to:92,ms:2200},{from:92,to:92,ms:1000}]);
 c.invalidateLimit();
 // Continue time monotonically after the first part.
 for(let t=4500;t<9000;t+=33)c.update(t<7000?92:2,t);
 assert.equal(c.completed,0);
});
