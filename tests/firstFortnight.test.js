import test from 'node:test';
import assert from 'node:assert/strict';
import {fortnightAppointments} from '../shared/firstFortnight.js';
test('first-fortnight templates do not invent dates or duplicate previous appointments',()=>{
 assert.deepEqual(fortnightAppointments({}),[]);const dates={wound:{date:'2026-11-05',time:''}};const a=fortnightAppointments(dates,[{id:'other',title:'Existing',at:123}]);assert.equal(a.length,2);assert.equal(a[1].dateOnly,true);assert.equal(fortnightAppointments(dates,a).length,2);
});
