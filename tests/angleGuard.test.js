import test from 'node:test';
import assert from 'node:assert/strict';
import {AngleGuard} from '../src/lib/angleGuard.js';
import {movementPlanError} from '../shared/movementPlan.js';
test('90-degree restriction warns at 85, blocks pushing, and repeats limit reminder',()=>{
 const g=new AngleGuard({maxFlexion:90});
 assert.equal(g.update(60,0).blocked,false);
 assert.equal(g.update(85,1000).state,'near');
 assert.equal(g.update(90,1500).state,'limit');
 assert.equal(g.update(91,2000).speak,false);
 assert.equal(g.update(91,7000).speak,true);
 assert.equal(g.update(83,8000).blocked,true);
 assert.equal(g.update(80,9000).blocked,false);
});
test('missing tracking never authorizes encouragement, and no limit is invented',()=>{
 const g=new AngleGuard();assert.equal(g.update(null,0).blocked,true);
 assert.equal(g.update(70,100).state,'clear');assert.equal(g.max,null);
});
test('a repetition target cannot exceed the prescribed maximum or warning boundary',()=>{
 const p={precautions:[],exercises:[{reps:8,holdSec:3,maxFlexion:90,targetFlexion:95}]};
 assert.ok(movementPlanError(p));p.exercises[0].targetFlexion=70;assert.equal(movementPlanError(p),'');
 p.exercises[0].maxFlexion=-1;assert.ok(movementPlanError(p));
});

test('jitter around the limit cannot restart spoken warnings every frame',()=>{
 const g=new AngleGuard({maxFlexion:90});g.update(90,0);
 for(let t=33;t<1000;t+=33){const r=g.update(t%2?89:91,t);assert.equal(r.state,'limit');assert.equal(r.speak,false);}
});
