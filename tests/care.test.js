import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCare,validateCare,doseKey} from '../shared/care.js';
test('empty care does not invent prescriptions or a protein target',()=>{const c=emptyCare();assert.equal(validateCare(c),true);assert.deepEqual(c.medicines,[]);assert.equal(c.proteinTarget,'');});
test('care plan rejects invalid schedules and malformed food records',()=>{const c=emptyCare();c.medicines=[{id:'m1',name:'Prescription example',instructions:'As written',times:['25:00']}];assert.equal(validateCare(c),false);c.medicines[0].times=['09:00','21:00'];assert.equal(validateCare(c),true);c.foodLogs=[{name:'meal',ts:Date.now(),protein:-10}];assert.equal(validateCare(c),false);});
test('dose key changes at midnight in India, not at UTC midnight',()=>{assert.notEqual(doseKey('m','09:00',Date.parse('2026-10-28T18:29:00Z')),doseKey('m','09:00',Date.parse('2026-10-28T18:31:00Z')));});
