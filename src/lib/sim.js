// Simulated leg. Produces MediaPipe-style landmarks so the whole pipeline
// (angle -> phases -> voice cues -> screenshots -> logs) can be demonstrated and
// tested without a camera, and used as a reliable fallback on stage.

import { LEG } from '../../shared/exercises.js';

export const SIM_W = 640;
export const SIM_H = 360;

const smooth = (x) => x * x * (3 - 2 * x);
const rad = (d) => (d * Math.PI) / 180;

function emptyLandmarks() {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
}

function setPoint(lm, i, x, y, v = 0.98) {
  lm[i] = { x: x / SIM_W, y: y / SIM_H, z: 0, visibility: v };
}

// Rep timeline (seconds): rest, rise, hold, fall.
function makeTimeline(holdSec) {
  return { rest: 1.6, rise: 2.4, hold: holdSec + 0.8, fall: 2.0 };
}

export function createSim({ exercise, peak, deficit = 6, holdSec = 3, side = 'left', flawRep = 0, noise = 0.5 }) {
  const tl = makeTimeline(holdSec);
  const cycle = tl.rest + tl.rise + tl.hold + tl.fall;
  const idx = LEG[side];
  const t0 = performance.now();

  // Level of the signal (0..1) at time t inside a given rep (1-based index).
  function level(tSec) {
    const rep = Math.floor(tSec / cycle) + 1;
    let t = tSec % cycle;
    // A "flawed" rep: stalls well below the minimum range (to exercise the cue paths).
    const flawed = flawRep > 0 && rep === flawRep;
    if (t < tl.rest) return { k: 0, rep };
    t -= tl.rest;
    if (t < tl.rise) return { k: smooth(t / tl.rise) * (flawed ? 0.3 : 1), rep };
    t -= tl.rise;
    if (t < tl.hold) return { k: flawed ? 0.3 : 1, rep };
    t -= tl.hold;
    if (t < tl.fall) return { k: (1 - smooth(t / tl.fall)) * (flawed ? 0.3 : 1), rep };
    return { k: 0, rep };
  }

  function frame(now = performance.now()) {
    const tSec = (now - t0) / 1000;
    const { k, rep } = level(tSec);
    const jitter = (Math.sin(tSec * 7.3) + Math.sin(tSec * 13.1)) * 0.5 * noise;
    const lm = emptyLandmarks();
    let value;
    let lengthA = 120;
    let lengthB = 120;
    if (exercise === 'heel_slide') {
      const flex = Math.max(0, k * peak + jitter);
      const phi = rad(flex / 2);
      const hip = { x: 170, y: 262 };
      const knee = { x: hip.x + lengthA * Math.cos(phi), y: hip.y - lengthA * Math.sin(phi) };
      const ankle = { x: hip.x + 2 * lengthA * Math.cos(phi), y: hip.y };
      setPoint(lm, idx.hip, hip.x, hip.y);
      setPoint(lm, idx.knee, knee.x, knee.y);
      setPoint(lm, idx.ankle, ankle.x, ankle.y);
      setPoint(lm, idx.foot, ankle.x + 30, ankle.y);
      value = flex;
    } else {
      lengthA = 125;
      lengthB = 120;
      const alpha = Math.max(0, k * peak + jitter);
      const delta = k > 0.05 ? deficit : 0;
      const hip = { x: 150, y: 276 };
      const knee = { x: hip.x + lengthA * Math.cos(rad(alpha)), y: hip.y - lengthA * Math.sin(rad(alpha)) };
      const ankle = {
        x: knee.x + lengthB * Math.cos(rad(alpha - delta)),
        y: knee.y - lengthB * Math.sin(rad(alpha - delta)),
      };
      setPoint(lm, idx.hip, hip.x, hip.y);
      setPoint(lm, idx.knee, knee.x, knee.y);
      setPoint(lm, idx.ankle, ankle.x, ankle.y);
      setPoint(lm, idx.foot, ankle.x + 25, ankle.y - 6);
      value = alpha;
    }
    return { landmarks: lm, rep, truth: value };
  }

  return { frame, side, width: SIM_W, height: SIM_H };
}

// Draws a simple bedroom scene so the simulated view looks like a phone placed
// beside the bed. Purely illustrative.
export function drawScene(ctx, w, h, { exercise, stage } = {}) {
  const sx = w / SIM_W;
  const sy = h / SIM_H;
  ctx.save();
  ctx.scale(sx, sy);
  const g = ctx.createLinearGradient(0, 0, 0, SIM_H);
  g.addColorStop(0, '#d9e6ea');
  g.addColorStop(1, '#b9ccd2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIM_W, SIM_H);
  // bed
  ctx.fillStyle = '#8aa5ad';
  ctx.fillRect(0, exercise === 'slr' ? 278 : 268, SIM_W, 120);
  ctx.fillStyle = '#f2f6f7';
  ctx.fillRect(0, exercise === 'slr' ? 272 : 262, SIM_W, 10);
  // pillow (straight leg raise starts with a small pillow under the knee)
  if (exercise === 'slr' && stage === 'pillow') {
    ctx.fillStyle = '#4c7bd9';
    ctx.beginPath();
    ctx.ellipse(215, 266, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e2c14a';
  ctx.beginPath();
  ctx.ellipse(70, 252, 44, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Joint positions for drawing a figure from a measured value (used to render
// a stand-in picture for seeded history, where no real photo exists).
export function legPose(exercise, value, deficit = 0) {
  if (exercise === 'heel_slide') {
    const phi = rad(value / 2);
    const hip = { x: 170, y: 262 };
    const a = 120;
    return {
      hip,
      knee: { x: hip.x + a * Math.cos(phi), y: hip.y - a * Math.sin(phi) },
      ankle: { x: hip.x + 2 * a * Math.cos(phi), y: hip.y },
    };
  }
  const hip = { x: 150, y: 276 };
  const knee = { x: hip.x + 125 * Math.cos(rad(value)), y: hip.y - 125 * Math.sin(rad(value)) };
  const ankle = { x: knee.x + 120 * Math.cos(rad(value - deficit)), y: knee.y - 120 * Math.sin(rad(value - deficit)) };
  return { hip, knee, ankle };
}
