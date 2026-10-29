import {useState} from 'react';
import {api} from '../lib/api.js';
import {FIRST_FORTNIGHT,fortnightAppointments} from '../../shared/firstFortnight.js';
import {Card} from '../components/ui.jsx';
export default function FirstFortnight({store}){
 const {state,refresh}=store;
 const [dates,setDates]=useState(()=>Object.fromEntries(FIRST_FORTNIGHT.map(item=>{const a=state.care.appointments.find(x=>x.id===`first14-${item.id}`);return [item.id,a?{date:new Date(a.at+19800000).toISOString().slice(0,10),time:a.dateOnly?'':new Date(a.at+19800000).toISOString().slice(11,16)}:{date:'',time:''}];})));
 const [surgeryDate,setSurgeryDate]=useState(new Date(state.patient.surgeryTs+19800000).toISOString().slice(0,10));
 const lastDate=new Date(Date.parse(`${surgeryDate}T12:00:00+05:30`)+14*86400000+19800000).toISOString().slice(0,10);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(e){e.preventDefault();setBusy(true);try{const appointments=fortnightAppointments(dates,state.care.appointments);
 const surgeryTs=Date.parse(`${surgeryDate}T12:00:00+05:30`);if(!Number.isFinite(surgeryTs))throw new Error('Enter the surgery date.');
 await api.setKey('patient',{...state.patient,surgeryTs},'assistant');
 await api.setKey('care',{...state.care,appointments},'assistant');await refresh();setMessage('Saved. The patient, family and physio can now see these appointments.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <section className="stack"><h1>First two weeks</h1><p>Choose the checks your team needs. Enter dates from the agreed discharge plan; the template does not book appointments automatically.</p><Card title="Scheduled reviews">{state.care.appointments.length?state.care.appointments.map(a=><p key={a.id}><b>{a.title}</b> · {new Date(a.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})} · {a.place||'Location to be confirmed'}</p>):<p>No review dates recorded yet.</p>}</Card><form className="stack" onSubmit={save}><Card title="Surgery date"><label className="field">Date of surgery<input type="date" required value={surgeryDate} onInput={e=>setSurgeryDate(e.target.value)}/></label></Card>{FIRST_FORTNIGHT.map(item=><Card key={item.id} title={item.title}><p className="muted">{item.hint}</p><div className="grid two"><label className="field">Date<input type="date" min={surgeryDate} max={lastDate} value={dates[item.id].date} onInput={e=>setDates({...dates,[item.id]:{...dates[item.id],date:e.target.value}})}/></label><label className="field">Time, if confirmed (India)<input type="time" value={dates[item.id].time} onInput={e=>setDates({...dates,[item.id]:{...dates[item.id],time:e.target.value}})}/></label></div></Card>)}{message&&<p className="callout" role="status">{message}</p>}<button className="btn primary big" disabled={busy}>{busy?'Saving…':'Share appointment plan'}</button></form></section>;
}
