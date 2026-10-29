const deg = (r) => (r * 180) / Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Interior angle at b, in degrees, between rays b->a and b->c.
// Points must be in the SAME pixel units for x and y (not normalised).
export function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (!m) return null;
  return deg(Math.acos(clamp((v1.x * v2.x + v1.y * v2.y) / m, -1, 1)));
}

// Knee flexion: 0 = straight leg, larger = more bent.
export function flexionFrom(hip, knee, ankle) {
  const i = angleAt(hip, knee, ankle);
  return i == null ? null : 180 - i;
}

// Thigh elevation relative to the bed (horizontal axis of the image).
export function liftFrom(hip, knee) {
  const dx = Math.abs(knee.x - hip.x);
  const dy = hip.y - knee.y; // image y points down
  return deg(Math.atan2(dy, dx));
}

// Exponential smoothing that tolerates missing samples.
export class Smoother {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.v = null;
  }
  push(x) {
    if (x == null || Number.isNaN(x)) return this.v;
    this.v = this.v == null ? x : this.v + this.alpha * (x - this.v);
    return this.v;
  }
  reset() {
    this.v = null;
  }
}

// Reads one leg out of a MediaPipe landmark list and returns pixel-space joints
// plus a confidence (lowest visibility among the three joints).
export function readLeg(landmarks, idx, width, height) {
  if (!landmarks) return null;
  const pick = (i) => {
    const p = landmarks[i];
    return p ? { x: p.x * width, y: p.y * height, v: p.visibility ?? 0 } : null;
  };
  const hip = pick(idx.hip);
  const knee = pick(idx.knee);
  const ankle = pick(idx.ankle);
  if (!hip || !knee || !ankle) return null;
  return { hip, knee, ankle, confidence: Math.min(hip.v, knee.v, ankle.v) };
}

// Choose the leg (left/right) that the camera sees better.
export function bestSide(landmarks, LEG) {
  if (!landmarks) return 'left';
  const score = (idx) => Math.min(landmarks[idx.hip]?.visibility ?? 0, landmarks[idx.knee]?.visibility ?? 0, landmarks[idx.ankle]?.visibility ?? 0);
  return score(LEG.left) >= score(LEG.right) ? 'left' : 'right';
}

// Require a sustained visibility advantage before changing anatomical sides.
// Never splice the hip of one leg onto the knee/ankle of the other.
export class AutoLegSelector {
 constructor(){this.side=null;this.candidate=null;this.since=0;}
 update(landmarks,indices,now){
  const score=side=>Math.min(...Object.values(indices[side]).slice(0,3).map(i=>landmarks?.[i]?.visibility??0));
  const left=score('left'),right=score('right');
  const winner=left>=right?'left':'right';
  const best=Math.max(left,right),current=this.side==='left'?left:right;
  let changed=false;
  if(best<.35){this.candidate=null;return {side:this.side,changed};}
  const eligible=!this.side || winner!==this.side && best-current>.18;
  if(eligible){
   if(this.candidate!==winner){this.candidate=winner;this.since=now;}
   if(now-this.since>=(!this.side?400:1200)){changed=Boolean(this.side);this.side=winner;this.candidate=null;}
  }else this.candidate=null;
  return {side:this.side,changed};
 }
}

// A three-frame median removes a single bad joint prediction without the long
// lag caused by repeatedly averaging an incorrect angle into the signal.
export class LegMedianFilter {
 constructor(){this.frames=[];}
 push(leg){
  if(!leg)return null;
  this.frames.push(leg);if(this.frames.length>3)this.frames.shift();
  if(this.frames.length<3)return leg;
  const median=a=>a.sort((x,y)=>x-y)[1];
  const joint=key=>({...leg[key],x:median(this.frames.map(f=>f[key].x)),y:median(this.frames.map(f=>f[key].y))});
  return {...leg,hip:joint('hip'),knee:joint('knee'),ankle:joint('ankle')};
 }
 reset(){this.frames=[];}
}

// Acquire an anatomical label once. Visibility changes must never select the
// stationary leg behind it. Spatial continuity also catches label flips in Pose.
export class LockedLegTracker {
 constructor(){this.acquire=new AutoLegSelector();this.side=null;this.last=null;this.lastAt=0;}
 update(landmarks,indices,width,height,now){
  if(!this.side)this.side=this.acquire.update(landmarks,indices,now).side;
  if(!this.side)return {side:null,leg:null,reason:'Finding your leg…'};
  const leg=readLeg(landmarks,indices[this.side],width,height);
  if(!leg||leg.confidence<.35)return {side:this.side,leg:null,reason:'The tracked leg is hidden. Keep the same leg in view.'};
  if(this.last){
   const size=Math.max(20,Math.hypot(this.last.hip.x-this.last.knee.x,this.last.hip.y-this.last.knee.y),Math.hypot(this.last.ankle.x-this.last.knee.x,this.last.ankle.y-this.last.knee.y));
   const distance=Math.max(...['hip','knee','ankle'].map(k=>Math.hypot(leg[k].x-this.last[k].x,leg[k].y-this.last[k].y)))/size;
   const allowance=.22+Math.min(.18,Math.max(0,now-this.lastAt)/1000*.5);
   if(distance>allowance)return {side:this.side,leg:null,reason:'Leg position is uncertain. Keep the same leg visible or restart.'};
  }
  this.last=leg;this.lastAt=now;
  return {side:this.side,leg,reason:''};
 }
}
