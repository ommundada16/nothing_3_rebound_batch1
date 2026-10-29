import {AutoLegSelector} from '../src/lib/geometry.js';
import {LEG,heelSlideTasks} from '../shared/exercises.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const pose=(l,r)=>{const p=Array.from({length:33},()=>({visibility:0}));for(const i of [23,25,27])p[i]={visibility:l};for(const i of [24,26,28])p[i]={visibility:r};return p;};
test('automatic side selection waits for stable visibility and selects the right knee',()=>{const s=new AutoLegSelector();assert.equal(s.update(pose(.4,.9),LEG,0).side,null);assert.equal(s.update(pose(.4,.9),LEG,450).side,'right');assert.equal(s.update(pose(.9,.8),LEG,600).side,'right');});
test('a transient occlusion cannot swap knees; a sustained change is explicit',()=>{const s=new AutoLegSelector();s.update(pose(.4,.9),LEG,0);s.update(pose(.4,.9),LEG,450);s.update(pose(.9,.3),LEG,500);assert.equal(s.update(pose(.4,.9),LEG,900).side,'right');s.update(pose(.9,.3),LEG,1000);assert.deepEqual(s.update(pose(.9,.3),LEG,2300),{side:'left',changed:true});});
test('no visible leg means no invented side and removed exercises stay removed',()=>{assert.equal(new AutoLegSelector().update(null,LEG,1000).side,null);assert.deepEqual(heelSlideTasks({exercises:[{id:'heel_slide',modesEnabled:['assisted']}]}).map(e=>e.mode),['assisted']);assert.equal(heelSlideTasks({exercises:[{id:'heel_slide',modesEnabled:[]}]}).length,0);});

import {LegMedianFilter} from '../src/lib/geometry.js';
test('one bad joint frame does not move the displayed knee',()=>{const f=new LegMedianFilter();const leg=x=>({confidence:.9,hip:{x:0,y:0},knee:{x,y:100},ankle:{x:200,y:100}});f.push(leg(100));f.push(leg(100));assert.equal(f.push(leg(500)).knee.x,100);f.reset();assert.equal(f.push(leg(120)).knee.x,120);});
