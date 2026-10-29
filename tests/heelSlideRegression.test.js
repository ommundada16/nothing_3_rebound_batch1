import test from 'node:test';
import assert from 'node:assert/strict';
import {LockedLegTracker,flexionFrom} from '../src/lib/geometry.js';
import {LEG,exercisePrescription,heelSlideTasks} from '../shared/exercises.js';
import {movementPlanError} from '../shared/movementPlan.js';
import {RepCounter} from '../src/lib/repCounter.js';
const landmarks=(angle,rightVisibility=.9,leftVisibility=.4)=>{
 const a=angle*Math.PI/180;const list=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
 for(const [side,v] of [['right',rightVisibility],['left',leftVisibility]]){
  const k=LEG[side];const points=side==='right'?[{x:.3,y:.4},{x:.5,y:.4},{x:.5+Math.cos(a)*.2,y:.4-Math.sin(a)*.2}]:[{x:.3,y:.5},{x:.5,y:.5},{x:.7,y:.5}];
  [k.hip,k.knee,k.ankle].forEach((id,i)=>list[id]={...points[i],visibility:v});
 }
 return list;
};
test('locked right leg continues beyond 90 when the rear left leg becomes clearer',()=>{
 const tracker=new LockedLegTracker();tracker.update(landmarks(0),LEG,1000,1000,0);tracker.update(landmarks(0),LEG,1000,1000,450);
 let result;for(let a=0;a<=130;a+=2)result=tracker.update(landmarks(a,.65,.99),LEG,1000,1000,500+a*20);
 assert.equal(result.side,'right');assert.ok(result.leg);assert.ok(Math.abs(flexionFrom(result.leg.hip,result.leg.knee,result.leg.ankle)-130)<.01);
});
test('hidden tracked leg pauses instead of selecting the rear leg',()=>{
 const tracker=new LockedLegTracker();tracker.update(landmarks(0),LEG,1000,1000,0);tracker.update(landmarks(0),LEG,1000,1000,450);
 for(let t=500;t<4000;t+=100){const r=tracker.update(landmarks(80,.1,.99),LEG,1000,1000,t);assert.equal(r.side,'right');assert.equal(r.leg,null);}
});
test('a model jump onto the other leg is not accepted as a knee angle',()=>{
 const tracker=new LockedLegTracker();tracker.update(landmarks(0),LEG,1000,1000,0);tracker.update(landmarks(0),LEG,1000,1000,450);
 const p=landmarks(0);p[LEG.right.knee]={x:.1,y:.1,visibility:.99};
 assert.equal(tracker.update(p,LEG,1000,1000,500).leg,null);
});
test('assisted and unassisted prescriptions are independent and both are validated',()=>{
 const plan={precautions:[],exercises:[{id:'heel_slide',reps:8,holdSec:3,modeSettings:{active:{reps:4,holdSec:2,maxFlexion:90},assisted:{reps:6,holdSec:4,maxFlexion:110}}}]};
 assert.equal(exercisePrescription(plan,'heel_slide','active').reps,4);assert.equal(exercisePrescription(plan,'heel_slide','assisted').maxFlexion,110);assert.deepEqual(heelSlideTasks(plan).map(t=>t.holdSec),[2,4]);assert.equal(movementPlanError(plan),'');plan.exercises[0].modeSettings.assisted.reps=0;assert.ok(movementPlanError(plan));
});
test('a slow deep heel slide can finish a full repetition above 90 degrees',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:1000});
 for(let t=0;t<1000;t+=50)c.update(2,t);
 for(let t=1000;t<17000;t+=50)c.update(2+(t-1000)/16000*118,t);
 for(let t=17000;t<20000;t+=50)c.update(120,t);
 for(let t=20000;t<24000;t+=50)c.update(120-(t-20000)/4000*118,t);
 assert.equal(c.completed,1);assert.ok(c.reps[0].peak>115);
});

test('a very slow start below four degrees per second still starts a repetition',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:1000});
 for(let t=0;t<1000;t+=100)c.update(2,t);
 for(let t=1000;t<31000;t+=100)c.update(2+(t-1000)/30000*118,t);
 for(let t=31000;t<34000;t+=100)c.update(120,t);
 for(let t=34000;t<38000;t+=100)c.update(120-(t-34000)/4000*118,t);
 assert.equal(c.completed,1);
});
