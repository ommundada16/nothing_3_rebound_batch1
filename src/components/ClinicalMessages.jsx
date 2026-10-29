import {useEffect,useRef,useState} from 'react';
import {api} from '../lib/api.js';
export default function ClinicalMessages({store,patient=false}){
 const {state,refresh}=store;
 const [text,setText]=useState(''),[medicine,setMedicine]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const history=useRef(null);
 const issues=state.issues.filter(i=>i.source==='patient');
 const messages=issues.flatMap(i=>i.thread.filter(m=>m.by!=='system').map((m,n)=>({...m,key:`${i.id}-${n}`}))).sort((a,b)=>a.ts-b.ts);
 useEffect(()=>{if(history.current)history.current.scrollTop=history.current.scrollHeight;},[messages.length]);
 async function send(e){e.preventDefault();setBusy(true);setError('');try{
  const body=medicine.trim()?`Medicine not suiting me: ${medicine.trim()}. ${text.trim()}`:text.trim();
  if(patient)await api.reportIssue({text:body,suspectedSideEffect:Boolean(medicine.trim()),symptoms:[],pain:0});
  else {const target=[...issues].sort((a,b)=>b.createdAt-a.createdAt)[0];if(!target)throw new Error('The patient has not started a conversation yet.');await api.issueAction(target.id,{action:'reply',text:body});}
  setText('');setMedicine('');await refresh();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="stack"><h2>{patient?'Messages to my care team':'Patient conversation'}</h2><div ref={history} className="chat-history" role="log" aria-label="Conversation">{!messages.length&&<p className="muted">No messages yet.</p>}{messages.map(m=><div className={`chat-bubble ${m.by==='patient'?'from-patient':'from-team'}`} key={m.key}><b>{m.by==='patient'?'Patient':'Care team'}</b><p>{m.text}</p><small>{new Date(m.ts).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</small></div>)}</div><form className="stack" onSubmit={send}>{patient&&<label className="field">Medicine not suiting you? Enter its name<input value={medicine} onChange={e=>setMedicine(e.target.value)} placeholder="Optional medicine name"/></label>}<label className="field">Message<textarea value={text} onChange={e=>setText(e.target.value)} required={!medicine.trim()} placeholder={patient?'Tell your care team what is happening…':'Write a reply…'}/></label>{error&&<p role="alert">{error}</p>}<button className="btn primary" disabled={busy||(!text.trim()&&!medicine.trim())}>{busy?'Sending…':'Send message'}</button>{patient&&<p className="small muted">Messages are reviewed in the app. Do not wait for a reply if you need urgent help.</p>}</form></section>;
}
