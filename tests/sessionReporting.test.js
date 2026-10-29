import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseTaskDone} from '../shared/exercises.js';
test('reported completion is recorded separately without manufacturing camera reps',()=>{const session={exercise:'heel_slide',mode:'active',reps:[],metrics:{peak:null},captureStatus:'limited',patientReportedCompletion:true};assert.equal(exerciseTaskDone(session,{id:'heel_slide',mode:'active',reps:8}),true);assert.equal(session.reps.length,0);assert.equal(session.metrics.peak,null);});
test('an attempted session is not automatically marked complete',()=>{assert.equal(exerciseTaskDone({exercise:'heel_slide',mode:'active',reps:[],captureStatus:'limited'},{id:'heel_slide',mode:'active',reps:8}),false);});
test('reported completion for a practice knee cannot complete the recovery plan',()=>{assert.equal(exerciseTaskDone({exercise:'heel_slide',mode:'active',patientReportedCompletion:true,isTestSession:true},{id:'heel_slide',mode:'active',reps:8}),false);});
