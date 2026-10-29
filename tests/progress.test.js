import test from 'node:test';
import assert from 'node:assert/strict';
import {progressData} from '../shared/progress.js';
const sample={id:'a',ts:Date.parse('2026-10-29T10:00:00+05:30'),exercise:'heel_slide',mode:'active',cameraSource:'camera',metrics:{peak:75}};
test('progress uses camera values and excludes seeds, simulation and missing measurements',()=>{const result=progressData([sample,{...sample,id:'seed',cameraSource:'seed',metrics:{peak:120}},{...sample,id:'sim',cameraSource:'sim',metrics:{peak:130}},{...sample,id:'missing',metrics:{peak:null}}]);assert.equal(result.measured.length,1);assert.equal(result.active[0].y,75);});
test('practice measurements require explicit inclusion',()=>{const sessions=[{...sample,isTestSession:true}];assert.equal(progressData(sessions).measured.length,0);assert.equal(progressData(sessions,{includePractice:true}).measured.length,1);});
test('daily best stays separate for each mode and never invents a missing assisted value',()=>{const r=progressData([sample,{...sample,id:'b',metrics:{peak:82}},{...sample,id:'c',mode:'assisted',metrics:{peak:90}}]);assert.equal(r.active[0].y,82);assert.equal(r.assisted[0].y,90);assert.equal(progressData([sample]).assisted.length,0);});

import {movementPlanError} from '../shared/movementPlan.js';
test('catalogue entries must refer to real future exercise names',()=>{assert.equal(movementPlanError({exercises:[],precautions:[],catalogueIds:['ankle_pumps']}),'');assert.ok(movementPlanError({exercises:[],precautions:[],catalogueIds:['unknown']}));});
