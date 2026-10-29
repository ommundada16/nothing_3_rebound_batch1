import test from 'node:test';
import assert from 'node:assert/strict';
import {AutoLegSelector,LockedLegTracker} from '../src/lib/geometry.js';
import {cameraGuidance} from '../src/lib/cameraGuidance.js';
import {LEG} from '../shared/exercises.js';
function pose(shift=0){const p=Array.from({length:33},()=>({x:.1,y:.1,visibility:.1}));[[24,.2,.3],[26,.4,.3],[28,.6,.3]].forEach(([i,x,y])=>p[i]={x:x+shift,y,visibility:.9});return p;}
test('initial acquisition tolerates alternating visibility winners',()=>{
 const s=new AutoLegSelector();let result;
 for(let t=0;t<=500;t+=100){const p=pose();for(const i of [23,25,27])p[i].visibility=t%200?.8:.9;for(const i of [24,26,28])p[i].visibility=t%200?.9:.8;result=s.update(p,LEG,t);}
 assert.ok(result.side);
});
test('a moved camera can recover the same leg rather than remain rejected forever',()=>{
 const s=new LockedLegTracker();s.update(pose(),LEG,1000,1000,0);s.update(pose(),LEG,1000,1000,450);
 assert.equal(s.update(pose(.15),LEG,1000,1000,500).leg,null);
 let result;for(let t=600;t<=1600;t+=100)result=s.update(pose(.15),LEG,1000,1000,t);
 assert.ok(result.leg);assert.equal(result.side,'right');
});
test('one displaced frame does not replace the tracking anchor',()=>{
 const s=new LockedLegTracker();s.update(pose(),LEG,1000,1000,0);s.update(pose(),LEG,1000,1000,450);
 assert.equal(s.update(pose(.2),LEG,1000,1000,500).leg,null);assert.ok(s.update(pose(),LEG,1000,1000,550).leg);
});
test('overlapping model legs cannot be used as a new anchor',()=>{
 const s=new LockedLegTracker();s.update(pose(),LEG,1000,1000,0);s.update(pose(),LEG,1000,1000,450);
 const p=pose(.15);[23,25,27].forEach((id,n)=>p[id]={...p[[24,26,28][n]]});
 for(let t=500;t<2500;t+=100)assert.equal(s.update(p,LEG,1000,1000,t).leg,null);
});
test('guidance distinguishes no pose, cropped ankle and hidden knee',()=>{
 assert.equal(cameraGuidance(null,null).code,'no-pose');const p=pose();p[28].x=1.1;assert.match(cameraGuidance(p,'right').title,/ankle/);p[28].x=.6;p[26].visibility=.1;assert.match(cameraGuidance(p,'right').title,/knee/);
});
test('position guidance explains reconnecting and supported reference position',()=>{
 assert.equal(cameraGuidance(pose(),'right','Leg position is uncertain').code,'reconnecting');assert.match(cameraGuidance(pose(),'right','Use a side view').tip,/physio.*reference video/);
});
