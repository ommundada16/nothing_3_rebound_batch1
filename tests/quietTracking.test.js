import test from 'node:test';
import assert from 'node:assert/strict';
import {CuePlayer} from '../src/lib/cues.js';
import {TrackingQuality} from '../src/lib/trackingQuality.js';
import {RepCounter} from '../src/lib/repCounter.js';
test('speech finishes before a current limit warning; ordinary stale cues are dropped',()=>{
 const spoken=[];let cancels=0;
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 globalThis.speechSynthesis={speak:u=>spoken.push(u),cancel:()=>cancels++};
 const p=new CuePlayer({getCues:()=>({}),getLang:()=> 'en'});
 p.play('start');p.play('hold',{priority:true});p.play('angle_limit',{priority:true});
 assert.equal(spoken.length,1);assert.equal(cancels,0);
 spoken[0].onend();assert.equal(spoken.length,2);assert.match(spoken[1].text,/Stop/);assert.equal(cancels,0);
 p.stop();assert.equal(cancels,1);delete globalThis.speechSynthesis;delete globalThis.SpeechSynthesisUtterance;
});
test('an outdated limit warning is not spoken after the patient moves away',()=>{
 const spoken=[];globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};globalThis.speechSynthesis={speak:u=>spoken.push(u),cancel:()=>{}};
 const p=new CuePlayer({getCues:()=>({}),getLang:()=> 'en'});let near=true;p.play('start');p.play('angle_limit',{priority:true,valid:()=>near});near=false;spoken[0].onend();assert.equal(spoken.length,1);p.stop();delete globalThis.speechSynthesis;delete globalThis.SpeechSynthesisUtterance;
});
test('tracking admits coherent limited-visibility joints but rejects a single angular jump',()=>{
 const q=new TrackingQuality(),leg={confidence:.45,hip:{x:100,y:100},knee:{x:200,y:100},ankle:{x:200,y:200}};
 assert.equal(q.assess(leg,640,480,60).accepted,true);assert.equal(q.assess(leg,640,480,120).accepted,false);assert.equal(q.assess(leg,640,480,61).accepted,true);
 assert.equal(q.assess({...leg,ankle:{x:2000,y:200}},640,480,60).accepted,false);
});
test('brief occlusion pauses the hold without completing it or discarding it',()=>{
 const c=new RepCounter({base:12,minPeak:30,holdMs:3000});for(let t=0;t<=1800;t+=100)c.update(t<300?2:80,t);
 const start=c.holdStart;c.update(null,1900);c.update(80,2100);assert.equal(c.state,'holding');assert.equal(c.holdStart,start+200);assert.equal(c.completed,0);
});

import {exerciseTaskDone} from '../shared/exercises.js';
test('testing the other knee cannot complete the recovery exercise',()=>{assert.equal(exerciseTaskDone({exercise:'heel_slide',mode:'active',completedReps:8,isTestSession:true},{id:'heel_slide',mode:'active',reps:8}),false);});
