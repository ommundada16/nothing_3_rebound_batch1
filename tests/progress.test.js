import test from 'node:test';
import assert from 'node:assert/strict';
import {progressData} from '../shared/progress.js';
const sample={id:'a',ts:Date.parse('2026-10-29T10:00:00+05:30'),exercise:'heel_slide',mode:'active',cameraSource:'camera',metrics:{peak:75}};
test('progress uses camera values and excludes seeds, simulation and missing measurements',()=>{const result=progressData([sample,{...sample,id:'seed',cameraSource:'seed',metrics:{peak:120}},{...sample,id:'sim',cameraSource:'sim',metrics:{peak:130}},{...sample,id:'missing',metrics:{peak:null}}]);assert.equal(result.measured.length,1);assert.equal(result.active[0].y,75);});
test('saved angles are included automatically even when an old knee mismatch marked them as practice',()=>{const r=progressData([{...sample,isTestSession:true}]);assert.equal(r.measured.length,1);assert.equal(r.best[0].y,75);});
test('daily best stays separate for each mode and never invents a missing assisted value',()=>{const r=progressData([sample,{...sample,id:'b',metrics:{peak:82}},{...sample,id:'c',mode:'assisted',metrics:{peak:90}}]);assert.equal(r.active[0].y,82);assert.equal(r.assisted[0].y,90);assert.equal(progressData([sample]).assisted.length,0);});

import {movementPlanError} from '../shared/movementPlan.js';
test('catalogue entries must refer to real future exercise names',()=>{assert.equal(movementPlanError({exercises:[],precautions:[],catalogueIds:['ankle_pumps']}),'');assert.ok(movementPlanError({exercises:[],precautions:[],catalogueIds:['unknown']}));});

test('daily highest combines saved sessions and preserves increases and decreases over days',()=>{const sessions=[{...sample,metrics:{peak:78}},{...sample,id:'b',metrics:{peak:80}},{...sample,id:'c',ts:sample.ts+86400000,metrics:{peak:82}},{...sample,id:'d',ts:sample.ts+2*86400000,metrics:{peak:79}}];assert.deepEqual(progressData(sessions).best.map(p=>p.y),[80,82,79]);});
test('sample readings stay inside demo progress and do not appear in actual progress',()=>{const fixture={...sample,cameraSource:'demo',metrics:{peak:92}};assert.equal(progressData([fixture]).measured.length,0);assert.equal(progressData([fixture],{demo:true}).best[0].y,92);assert.equal(progressData([sample],{demo:true}).measured.length,0);});
