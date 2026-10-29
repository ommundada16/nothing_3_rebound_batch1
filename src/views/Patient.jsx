import {useBack} from '../lib/navigation.js';
import {EXERCISE_CATALOGUE} from '../../shared/exerciseCatalogue.js';
import Progress from '../components/Progress.jsx';
import Sessions from '../components/Sessions.jsx';
import {useState} from 'react';
import {heelSlideTasks,exerciseTaskDone} from '../../shared/exercises.js';
import {dayPostOp} from '../../shared/time.js';
import {sessionsToday} from '../lib/data.js';
import {Card,Toast,useToast} from '../components/ui.jsx';
import {CareReminders,AssignedPhysio} from './DailyCare.jsx';
import ClinicalMessages from '../components/ClinicalMessages.jsx';
import RobotVisual from '../components/RobotVisual.jsx';
import Session from './Session.jsx';
import Companion from './Companion.jsx';

export default function Patient({store,onVision}) {
 const {state,now,refresh}=store;
 const [tab,setTab]=useState('home'),[session,setSession]=useState(null);const toast=useToast();
 useBack(()=>setTab('home'),!session&&tab!=='home',10);
 const tasks=heelSlideTasks(state.plan),today=sessionsToday(state.sessions,now());
 const done=tasks.filter(t=>today.some(s=>exerciseTaskDone(s,t))).length;
 if(session)return <main className="page"><Session state={state} exerciseId={session.id} initialMode={session.mode} toast={toast.show} onExit={()=>{setSession(null);refresh();}}/><Toast msg={toast.msg} onDone={toast.clear}/></main>;
 return <main className="page rebound-patient"><nav className="recovery-nav" aria-label="Patient navigation">{[['home','Home'],['companion','Companion'],['sessions','My sessions'],['progress','Progress'],['appointments','Appointments'],['messages','Care team']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
 {tab==='home'&&<div className="stack"><section className="recovery-hero"><div><span className="eyebrow">A LITTLE BETTER, EVERY DAY</span><h1>Recovery starts<br/>right where you are.</h1><p>Your physio’s plan. Your own pace. Your people close by.</p><button className="btn primary big" disabled={!tasks.length} onClick={()=>setSession(tasks.find(t=>!today.some(s=>exerciseTaskDone(s,t)))||tasks[0])}>Start my exercises <span>↗</span></button><p className="small muted">{done} of {tasks.length} exercises recorded today</p></div><div className="hero-companion"><RobotVisual/><span className="concept-label">The companion of tomorrow · concept</span></div></section><CareReminders store={store}/><AssignedPhysio patientId={state.patient.id}/><div className="home-section-title"><div><span className="eyebrow">YOUR PRESCRIBED PLAN</span><h2>One movement at a time.</h2></div><span className="pill">Day {dayPostOp(now(),state.patient.surgeryTs)}</span></div><div className="grid two">{tasks.map((t,i)=>{const complete=today.some(s=>exerciseTaskDone(s,t));return <button className="movement-tile" key={t.key} onClick={()=>setSession(t)}><div className="row between"><span className="exercise-number">0{i+1}</span><span className={`pill ${complete?'complete':''}`}>{complete?'Recorded':'Ready when you are'}</span></div><h2>{t.name}</h2><p>{t.description}</p><div className="row between"><span>{t.reps} reps · {t.holdSec}s hold{t.maxFlexion?` · max ${t.maxFlexion}°`:''}</span><span className="tile-arrow">↗</span></div></button>;})}</div>{state.plan.catalogueIds?.length>0&&<section className="stack"><h2>Future exercises selected by your physio</h2><div className="grid two">{EXERCISE_CATALOGUE.filter(e=>state.plan.catalogueIds.includes(e.id)).map(e=><Card key={e.id}><h3>{e.name}</h3><span className="small muted">Video and tracking not available yet</span></Card>)}</div></section>}<section className="home-support"><div><h2>You don’t have to figure it out alone.</h2><p>Ask a general question or send a concern to your care team.</p></div><button className="btn" onClick={()=>setTab('companion')}>Meet your companion →</button></section><button className="vision-link" onClick={onVision}><span>THE NEXT CHAPTER</span><b>Imagine recovery with a home robot and smart implant.</b><span>Explore the vision ↗</span></button></div>}
 {tab==='appointments'&&<div className="stack"><CareReminders store={store}/></div>}
 {tab==='companion'&&<Companion store={store} onMessages={()=>setTab('messages')}/>}
 {tab==='messages'&&<div className="card"><ClinicalMessages store={store} patient/></div>}
 {tab==='sessions'&&<Sessions state={state}/>}
 {tab==='progress'&&<Progress state={state}/>}
 <Toast msg={toast.msg} onDone={toast.clear}/></main>;
}
