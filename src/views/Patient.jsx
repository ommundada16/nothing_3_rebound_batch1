import {useState} from 'react';
import {heelSlideTasks,exerciseTaskDone} from '../../shared/exercises.js';
import {dayPostOp} from '../../shared/time.js';
import {sessionsToday} from '../lib/data.js';
import {Card,Toast,useToast} from '../components/ui.jsx';
import {CareReminders} from './DailyCare.jsx';
import ClinicalMessages from '../components/ClinicalMessages.jsx';
import RobotVisual from '../components/RobotVisual.jsx';
import Session from './Session.jsx';
import Companion from './Companion.jsx';

export default function Patient({store,onVision}) {
 const {state,now,refresh}=store;
 const [tab,setTab]=useState('home'),[session,setSession]=useState(null);const toast=useToast();
 const tasks=heelSlideTasks(state.plan),today=sessionsToday(state.sessions,now());
 const done=tasks.filter(t=>today.some(s=>exerciseTaskDone(s,t))).length;
 if(session)return <main className="page"><Session state={state} exerciseId={session.id} initialMode={session.mode} toast={toast.show} onExit={()=>{setSession(null);refresh();}}/><Toast msg={toast.msg} onDone={toast.clear}/></main>;
 return <main className="page rebound-patient"><nav className="recovery-nav" aria-label="Patient navigation">{[['home','Home'],['companion','Companion'],['sessions','My sessions'],['messages','Care team']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
 {tab==='home'&&<div className="stack"><CareReminders store={store}/><section className="recovery-hero"><div><span className="eyebrow">A LITTLE BETTER, EVERY DAY</span><h1>Recovery starts<br/>right where you are.</h1><p>Your physio’s plan. Your own pace. Your people close by.</p><button className="btn primary big" disabled={!tasks.length} onClick={()=>setSession(tasks.find(t=>!today.some(s=>exerciseTaskDone(s,t)))||tasks[0])}>Start my exercises <span>↗</span></button><p className="small muted">{done} of {tasks.length} exercises recorded today</p></div><div className="hero-companion"><RobotVisual/><span className="concept-label">The companion of tomorrow · concept</span></div></section><div className="home-section-title"><div><span className="eyebrow">YOUR PRESCRIBED PLAN</span><h2>One movement at a time.</h2></div><span className="pill">Day {dayPostOp(now(),state.patient.surgeryTs)}</span></div><div className="grid two">{tasks.map((t,i)=>{const complete=today.some(s=>exerciseTaskDone(s,t));return <button className="movement-tile" key={t.key} onClick={()=>setSession(t)}><div className="row between"><span className="exercise-number">0{i+1}</span><span className={`pill ${complete?'complete':''}`}>{complete?'Recorded':'Ready when you are'}</span></div><h2>{t.name}</h2><p>{t.description}</p><div className="row between"><span>{t.reps} reps · {t.holdSec}s hold{t.maxFlexion?` · max ${t.maxFlexion}°`:''}</span><span className="tile-arrow">↗</span></div></button>;})}</div><section className="home-support"><div><h2>You don’t have to figure it out alone.</h2><p>Ask a general question or send a concern to your care team.</p></div><button className="btn" onClick={()=>setTab('companion')}>Meet your companion →</button></section><button className="vision-link" onClick={onVision}><span>THE NEXT CHAPTER</span><b>Imagine recovery with a home robot and smart implant.</b><span>Explore the vision ↗</span></button></div>}
 {tab==='companion'&&<Companion store={store} onMessages={()=>setTab('messages')}/>}
 {tab==='messages'&&<div className="card"><ClinicalMessages store={store} patient/></div>}
 {tab==='sessions'&&<div className="stack"><div className="section-heading"><span className="eyebrow">YOUR EFFORT COUNTS</span><h1>Every session has a place.</h1><p className="muted">A missing camera reading does not erase the exercise you attempted.</p></div>{[...state.sessions].filter(s=>s.cameraSource!=='seed').sort((a,b)=>b.ts-a.ts).map(s=><Card key={s.id}><div className="row between wrap"><h2>Heel slide · {s.mode==='assisted'?'assisted':'unassisted'}</h2><span className="pill">{s.captureStatus==='limited'?'Needs measurement review':s.isTestSession?'Practice':'Saved'}</span></div><p>{new Date(s.ts).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p><p>{s.metrics?.peak==null?'Angle unavailable':`${Math.round(s.metrics.peak)}° camera estimate`} · {s.reps?.filter(r=>r.complete).length||0} camera-counted reps</p>{s.patientReportedCompletion&&<p className="small">You reported completing the prescribed exercise. Camera confirmation is separate.</p>}</Card>)}{!state.sessions.some(s=>s.cameraSource!=='seed')&&<Card><p>Your saved sessions will appear here after your first exercise.</p></Card>}</div>}
 <Toast msg={toast.msg} onDone={toast.clear}/></main>;
}
