import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {freshState} from './seed.js';
import {emptyCare} from '../shared/care.js';
export function installCareRegistry(app,{dir,accounts,legacy,context}){
 const file=resolve(dir,'registry.json'),folder=resolve(dir,'patients');mkdirSync(folder,{recursive:true});
 const data=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{patients:[],robots:{}};
 const cache=new Map();const save=()=>writeFileSync(file,JSON.stringify(data));
 const staff=u=>u?.role==='careteam';
 const sameWorkspace=(u,p)=>Boolean(u?.isDemo)===Boolean(p?.isDemo);
 const legacyId=legacy.state.patient.id||'p1';
 if(!data.patients.some(p=>p.id===legacyId)){data.patients.unshift({id:legacyId,accountId:accounts.users.find(u=>u.role==='patient')?.id||null,physioId:accounts.users.find(u=>u.role==='physio')?.id||null,legacy:true,createdAt:Date.now()});save();}
 const entry=id=>data.patients.find(p=>p.id===id);
 const load=p=>{if(p.legacy)return legacy;if(!cache.has(p.id)){const path=resolve(folder,p.id+'.json');cache.set(p.id,{state:JSON.parse(readFileSync(path,'utf8')),file:path});}return cache.get(p.id);};
 const accessible=(u,p)=>Boolean(u&&sameWorkspace(u,p)&&(staff(u)||u.role==='assistant'&&(p.assistantId===u.id||p.legacy&&!p.assistantId)||u.role==='physio'&&p.physioId===u.id||u.role==='patient'&&p.accountId===u.id||u.role==='family'&&p.legacy));
 const list=u=>data.patients.filter(p=>accessible(u,p)).map(p=>{const s=load(p).state;return {id:p.id,...s.patient,physioId:p.physioId,physioName:accounts.users.find(u=>u.id===p.physioId)?.name||'Not assigned',assistantId:p.assistantId||null,assistantName:accounts.users.find(u=>u.id===p.assistantId)?.name||'Not assigned',accountCreated:Boolean(p.accountId),lastSession:s.sessions.filter(x=>x.cameraSource!=='seed').sort((a,b)=>b.ts-a.ts)[0]?.ts||null};});
 const requireTeam=(req,res,next)=>{if(!req.account)return res.status(401).json({error:'Please sign in.'});if(!staff(req.account))return res.status(403).json({error:'Only the care team can manage enrolment and devices.'});next();};
 app.get('/api/patients',(req,res)=>{if(!req.account)return res.status(401).json({error:'Please sign in.'});res.json({patients:list(req.account)});});
 app.get('/api/care-team/directory',requireTeam,(req,res)=>{const patients=list(req.account);res.json({patients,physios:accounts.users.filter(u=>u.role==='physio'&&sameWorkspace(u,req.account)).map(accounts.publicUser),assistants:accounts.users.filter(u=>u.role==='assistant'&&sameWorkspace(u,req.account)).map(accounts.publicUser),robots:Object.fromEntries(Object.entries(data.robots).filter(([id])=>patients.some(p=>p.id===id)))});});
 app.post('/api/care-team/patients',requireTeam,(req,res)=>{
  const b=req.body||{},age=Number(b.age),surgeryTs=Date.parse(b.surgeryDate+'T12:00:00+05:30');
  if(typeof b.name!=='string'||!b.name.trim()||!Number.isFinite(age)||age<1||age>120||!Number.isFinite(surgeryTs)||!['left','right'].includes(b.leg)||typeof b.city!=='string'||!b.city.trim()||typeof b.procedure!=='string'||!b.procedure.trim()||!String(b.email||'').match(/^[^ @]+@[^ @]+\.[^ @]+$/)||typeof b.password!=='string'||b.password.length<8||b.password.length>128)return res.status(400).json({error:'Enter the patient details, surgery date, city, email and a password of 8–128 characters.'});
  if(!accounts.users.some(u=>u.role==='physio'&&u.id===b.physioId&&sameWorkspace(u,req.account)))return res.status(400).json({error:'Select a registered physiotherapist.'});
  if(accounts.users.some(u=>u.email===b.email.toLowerCase()))return res.status(400).json({error:'That email is already registered.'});
  const assistantId=b.assistantId||accounts.users.find(u=>u.role==='assistant'&&sameWorkspace(u,req.account))?.id||null;
  if(assistantId&&!accounts.users.some(u=>u.role==='assistant'&&u.id===assistantId&&sameWorkspace(u,req.account)))return res.status(400).json({error:'Select an assistant surgeon from the same workspace.'});
  const id=randomUUID(),s=freshState('progressing');s.isDemo=Boolean(req.account.isDemo);s.patient={id,isDemo:s.isDemo,name:b.name.trim(),age,leg:b.leg,procedure:b.procedure.trim(),surgeryTs,city:b.city.trim(),postalCode:String(b.postalCode||''),phone:String(b.phone||''),surgeon:String(b.surgeon||'')};s.sessions=[];s.issues=[];s.audit=[];s.activity={};s.exerciseAlerts=[];s.care=emptyCare();s.clinicBaseline=null;s.cues={};s.refVideos={heel_slide:{stock_active:legacy.state.refVideos?.heel_slide?.stock_active,stock_assisted:legacy.state.refVideos?.heel_slide?.stock_assisted}};s.plan={exercises:[],precautions:[],notes:''};
  const path=resolve(folder,id+'.json');writeFileSync(path,JSON.stringify(s));
  const user=accounts.addUser({name:s.patient.name,email:b.email,password:b.password,role:'patient',isDemo:s.isDemo});data.patients.push({id,isDemo:s.isDemo,assistantId,accountId:user.id,physioId:b.physioId,createdAt:Date.now()});cache.set(id,{state:s,file:path});save();res.status(201).json({patient:s.patient,user:accounts.publicUser(user)});
 });
 app.put('/api/care-team/patients/:id/assignment',requireTeam,(req,res)=>{const p=entry(req.params.id);if(!p)return res.status(404).json({error:'Patient not found.'});if(!accessible(req.account,p))return res.status(403).json({error:'Patient belongs to another workspace.'});if(!accounts.users.some(u=>u.role==='physio'&&u.id===req.body.physioId&&sameWorkspace(u,p)))return res.status(400).json({error:'Choose a registered physio.'});if(req.body.assistantId&&!accounts.users.some(u=>u.role==='assistant'&&u.id===req.body.assistantId&&sameWorkspace(u,p)))return res.status(400).json({error:'Choose a compatible assistant surgeon.'});p.physioId=req.body.physioId;if(req.body.assistantId!==undefined)p.assistantId=req.body.assistantId||null;save();res.json({ok:true});});
 app.put('/api/care-team/patients/:id/robot',requireTeam,(req,res)=>{if(!entry(req.params.id))return res.status(404).json({error:'Patient not found.'});if(!accessible(req.account,entry(req.params.id)))return res.status(403).json({error:'Patient belongs to another workspace.'});const b=req.body||{},old=data.robots[req.params.id]||{lastSeen:null,currentVersion:null,updates:[]};if(b.targetVersion&&!/^[a-zA-Z0-9._-]{1,40}$/.test(b.targetVersion))return res.status(400).json({error:'Use a version label with letters, numbers, dots or hyphens.'});const robot={...old,serial:String(b.serial??old.serial??'').slice(0,80),status:'not_connected'};if(b.targetVersion){if(!robot.serial)return res.status(400).json({error:'Assign a device identifier first.'});robot.updates=[...robot.updates,{id:randomUUID(),version:b.targetVersion,status:'queued',at:Date.now(),by:req.account.id}];}data.robots[req.params.id]=robot;save();res.json({robot});});
 // Request-local records remain isolated even across asynchronous route handlers.
 app.use('/api',(req,res,next)=>{
  if(!req.account||req.path==='/health'||req.path.startsWith('/auth/'))return next();
  let p;
  if(['patient','family'].includes(req.account.role))p=data.patients.find(p=>accessible(req.account,p));
  else p=req.headers['x-patient-id']?entry(req.headers['x-patient-id']):data.patients.find(p=>accessible(req.account,p));
  if(p&&!accessible(req.account,p))return res.status(403).json({error:'This patient is not assigned to your account.'});
  if(!p){if(req.path==='/state'&&req.method==='GET'){const empty=freshState('progressing');empty.patient={id:null,name:'No assigned patient',surgeryTs:Date.now()};empty.sessions=[];empty.issues=[];empty.audit=[];empty.directoryEmpty=true;return res.json({rev:0,state:{...empty,serverNow:Date.now()}});}return res.status(403).json({error:'No assigned patient. Ask the care team to link your account.'});}
  req.patientId=p.id;context.run(load(p),next);
 });
 return {seedDemo:(id,user,physio,assistant,makeState)=>{if(entry(id))return;const s=makeState();const path=resolve(folder,id+'.json');writeFileSync(path,JSON.stringify(s));data.patients.push({id,isDemo:true,accountId:user.id,physioId:physio.id,assistantId:assistant.id,createdAt:Date.now()});cache.set(id,{state:s,file:path});data.robots[id]={serial:'RB-'+id.toUpperCase(),status:'not_connected',lastSeen:null,currentVersion:null,updates:[{id:'demo-update-'+id,version:'1.1.0',status:'queued',at:Date.now(),by:'demo-careteam'}]};save();},list,contexts:()=>data.patients.map(load),recordLogin:u=>{const p=data.patients.find(p=>p.accountId===u.id);if(p){const c=load(p);c.state.activity={...c.state.activity,patientLastLogin:Date.now()};c.state.rev++;writeFileSync(c.file,JSON.stringify(c.state));}},canAccess:(u,id)=>{const p=entry(id);return p&&accessible(u,p);},household:(u,id)=>{const p=entry(id);return accounts.users.filter(x=>sameWorkspace(x,p)&&(staff(x)||x.id===p?.assistantId||x.id===p?.accountId||x.id===p?.physioId||x.role==='family'&&p?.legacy)).map(accounts.publicUser);}};
}
