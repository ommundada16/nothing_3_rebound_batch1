import assert from 'node:assert/strict';
const base=process.env.TEST_BASE||'http://127.0.0.1:8791',password='Review-only-2026';
async function req(path,{body,cookie,patient,method=body?'POST':'GET',raw}={}){const r=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(raw?{'Content-Type':'image/png'}:{}),...(cookie?{Cookie:cookie}:{}),...(patient?{'X-Patient-Id':patient}:{})},body:raw|| (body?JSON.stringify(body):undefined)});const txt=await r.text();let data;try{data=JSON.parse(txt);}catch{data=txt;}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function account(role,email,city='Pune',postalCode='411001'){let r=await req('/api/auth/register',{body:{name:'Review '+role,email,password,role,city,postalCode}});if(r.status===400)r=await req('/api/auth/login',{body:{email,password}});assert.equal(r.status,200,JSON.stringify(r.data));return r;}
const team=await account('careteam','care-review@example.test'),a=await account('physio','physio-a-review@example.test'),b=await account('physio','physio-b-review@example.test','Mumbai','400001');
assert.equal((await req('/api/auth/profile',{cookie:a.cookie,method:'PUT',body:{city:'Pune',postalCode:'411001'}})).status,200);
assert.equal((await req('/api/auth/profile',{cookie:team.cookie,method:'PUT',body:{city:'Bad'}})).status,403);
assert.equal((await req('/api/auth/register',{body:{name:'Blocked patient',email:'blocked@example.test',password,role:'patient'}})).status,403);
const family=await account('family','family-review@example.test');
const familyState=(await req('/api/state',{cookie:family.cookie})).data.state;assert.equal(familyState.playbook,undefined);assert.equal(familyState.clinicBaseline,undefined);
const nonce=Date.now();
async function enrol(name,physioId,leg){const r=await req('/api/care-team/patients',{cookie:team.cookie,body:{name,age:62,email:`patient-${name.slice(-1)}-${nonce}@example.test`,password,city:'Pune',postalCode:'411001',procedure:'Synthetic knee replacement',surgeryDate:'2026-10-25',leg,physioId}});assert.equal(r.status,201,JSON.stringify(r.data));const login=await req('/api/auth/login',{body:{email:r.data.user.email,password}});assert.equal(login.status,200);return {...r.data,cookie:login.cookie};}
const p=await enrol('Review patient A',a.data.user.id,'left'),q=await enrol('Review patient B',b.data.user.id,'right');
assert.equal((await req('/api/patients',{cookie:a.cookie})).data.patients.some(x=>x.id===p.patient.id),true);
assert.equal((await req('/api/patients',{cookie:a.cookie})).data.patients.some(x=>x.id===q.patient.id),false);
assert.equal((await req('/api/state',{cookie:a.cookie,patient:q.patient.id})).status,403);
assert.equal((await req('/api/state',{cookie:p.cookie,patient:q.patient.id})).data.state.patient.id,p.patient.id);
assert.equal((await req('/api/state',{cookie:p.cookie})).data.state.refVideos.heel_slide.home_active,undefined);
const states=await Promise.all([req('/api/state',{cookie:a.cookie,patient:p.patient.id}),req('/api/state',{cookie:b.cookie,patient:q.patient.id})]);assert.equal(states[0].data.state.patient.id,p.patient.id);assert.equal(states[1].data.state.patient.id,q.patient.id);
const plan={exercises:[{id:'heel_slide',reps:3,holdSec:2,maxFlexion:90}],precautions:[],catalogueIds:['ankle_pumps']};assert.equal((await req('/api/state/plan',{cookie:a.cookie,patient:p.patient.id,method:'PUT',body:{value:plan}})).status,200);
assert.equal((await req('/api/state',{cookie:q.cookie})).data.state.plan.exercises.length,0);
assert.equal((await req('/api/state/plan',{cookie:p.cookie,method:'PUT',body:{value:plan}})).status,403);
const concern=await req('/api/issues',{cookie:p.cookie,body:{suspectedSideEffect:true,text:'Synthetic medicine concern',symptoms:[],pain:0}});assert.equal(concern.data.issue.tier,'review');assert.equal((await req(`/api/issues/${concern.data.issue.id}/action`,{cookie:team.cookie,patient:p.patient.id,body:{action:'reply',text:'Synthetic review',byLevel:4}})).data.issue.thread.at(-1).by,3);
const image=await req('/api/media?kind=screenshot&name=synthetic.png',{method:'POST',cookie:p.cookie,raw:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7zQAAAAASUVORK5CYII=','base64')});assert.equal(image.status,200);
assert.equal((await req('/api/media/'+image.data.id,{cookie:b.cookie})).status,403);
assert.equal((await req('/api/media/'+image.data.id,{cookie:family.cookie})).status,403);
assert.equal((await req('/api/media/'+image.data.id,{cookie:p.cookie})).status,200);
const session=await req('/api/sessions',{cookie:p.cookie,body:{exercise:'heel_slide',mode:'active',leg:'left',cameraSource:'camera',captureStatus:'measured',metrics:{peak:72},reps:[{complete:true,peak:72,holdMs:2000}],screenshotIds:[image.data.id],selfReport:{pain:2,confidence:4},durationS:45,prescribedReps:3,prescribedHoldSec:2}});assert.equal(session.status,200);
assert.equal((await req('/api/state',{cookie:a.cookie,patient:p.patient.id})).data.state.sessions.length,1);assert.equal((await req('/api/state',{cookie:q.cookie})).data.state.sessions.length,0);
const robot=await req(`/api/care-team/patients/${p.patient.id}/robot`,{cookie:team.cookie,method:'PUT',body:{serial:'DEMO-ROBOT-01',targetVersion:'1.1.0'}});assert.equal(robot.status,200);assert.equal(robot.data.robot.status,'not_connected');assert.equal(robot.data.robot.updates.at(-1).status,'queued');assert.equal((await req(`/api/care-team/patients/${p.patient.id}/robot`,{cookie:a.cookie,method:'PUT',body:{serial:'bad'}})).status,403);
assert.equal((await req(`/api/care-team/patients/${p.patient.id}/assignment`,{cookie:team.cookie,method:'PUT',body:{physioId:b.data.user.id}})).status,200);assert.equal((await req('/api/state',{cookie:a.cookie,patient:p.patient.id})).status,403);assert.equal((await req('/api/state',{cookie:b.cookie,patient:p.patient.id})).status,200);
// Restore for browser review.
await req(`/api/care-team/patients/${p.patient.id}/assignment`,{cookie:team.cookie,method:'PUT',body:{physioId:a.data.user.id}});
console.log('PASS: care-team enrolment, patient-only sign-in, separate records, assignment boundaries, private media, per-patient plans/sessions, robot queue and reassignment.');
console.log(JSON.stringify({patientId:p.patient.id,patientEmail:p.user.email,physioEmail:'physio-a-review@example.test',teamEmail:'care-review@example.test'}));
