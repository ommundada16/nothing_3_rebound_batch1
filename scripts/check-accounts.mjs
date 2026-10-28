import assert from 'node:assert/strict';
const base=process.env.TEST_BASE || 'http://127.0.0.1:8790';
async function request(path,body,cookie,method='POST') {const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
assert.equal((await request('/api/state',null,null,'GET')).status,401);
const users={};
for(const role of ['physio','patient','family']){let r=await request('/api/auth/register',{name:'Demo '+role,email:role+'@example.test',password:'Demo-check-2026',role});if(r.status===400)r=await request('/api/auth/login',{email:role+'@example.test',password:'Demo-check-2026'});assert.equal(r.status,200);users[role]=r.cookie;}
const state=(await request('/api/state',null,users.physio,'GET')).data.state;
assert.ok(state.refVideos.heel_slide.stock_active);assert.ok(state.refVideos.heel_slide.stock_assisted);
const care=state.care;care.medicines=[{id:'test-med',name:'Demo prescription',instructions:'Example only',prescriber:'Demo doctor',times:['09:00']}];care.proteinTarget=70;care.appointments=[{id:'test-appt',title:'Demo follow-up',at:Date.now()+3600000,place:'Clinic'}];
assert.equal((await request('/api/state/care',{value:care},users.physio,'PUT')).status,200);
assert.equal((await request('/api/state/care',{value:{...care,proteinTarget:90}},users.family,'PUT')).status,403);
assert.equal((await request('/api/state/care',{value:{...care,doses:{test:{at:Date.now(),by:'Family'}}}},users.family,'PUT')).status,200);
const report=await request('/api/issues',{suspectedSideEffect:true,text:'Demo: nausea after medicine',symptoms:[],pain:0},users.family);assert.equal(report.data.issue.level,3);assert.equal(report.data.issue.tier,'review');
assert.equal((await request('/api/reset',{},users.family)).status,403);
assert.equal((await request('/api/sessions',{exercise:'slr',mode:'active'},users.family)).status,403);
const fam=(await request('/api/state',null,users.family,'GET')).data.state;
assert.equal(fam.clinicBaseline,undefined);assert.equal(fam.playbook,undefined);assert.equal(fam.issues[0]?.summary,undefined);
assert.equal((await request('/api/household',null,users.physio,'GET')).data.members.length,3);
console.log('PASS: account creation/sign-in, shared care, prescription protection, family privacy, side-effect routing, both video references.');
