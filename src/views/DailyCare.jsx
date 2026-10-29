import {useEffect,useState} from 'react';
import {Card} from '../components/ui.jsx';
import {dayIndex} from '../../shared/time.js';
import {api} from '../lib/api.js';
export function CareReminders({store}) {
 const {state,now}=store;
 const [,redraw]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>redraw(v=>v+1),30000);return()=>clearInterval(timer);},[]);
 const appointments=[...(state.care?.appointments||[])].filter(a=>Number.isFinite(a.at)).sort((a,b)=>a.at-b.at);
 const upcoming=appointments.filter(a=>a.dateOnly?dayIndex(a.at)>=dayIndex(now()):a.at>=now());
 const next=upcoming[0];
 const describe=a=><><b>{a.title}</b><p>{new Date(a.at).toLocaleString('en-IN',a.dateOnly?{dateStyle:'medium',timeZone:'Asia/Kolkata'}:{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}{a.dateOnly?' · Time to be confirmed':''}</p><p>{a.place||'Location to be confirmed'}</p>{a.notes&&<p>{a.notes}</p>}</>;
 return <Card className="care-heading-card" title="Next appointment">{next?describe(next):<p>No upcoming appointment scheduled. Contact your care team to arrange the next review.</p>}{appointments.length>0&&<details className="more"><summary>All appointments</summary>{appointments.map(a=><div key={a.id} className="callout">{describe(a)}</div>)}</details>}</Card>;
}
export function AssignedPhysio({patientId}){
 const [physio,setPhysio]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setPhysio(null);setError('');api.get('/api/household').then(r=>{if(active)setPhysio(r.members.find(m=>m.role==='physio')||false);}).catch(()=>{if(active)setError('Could not load your physio. Please refresh.');});return()=>{active=false;};},[patientId]);
 return <Card className="care-heading-card" title="Your physiotherapist">{error?<p role="alert">{error}</p>:physio===null?<p>Loading your care team…</p>:physio?<><h3>{physio.name}</h3>{physio.city&&<p>{physio.city}</p>}<p>Email: <a href={'mailto:'+physio.email}>{physio.email}</a></p><p className="small muted">You can also send a message through Care team. {physio.isDemo?'This is a fictional demo contact.':'No phone number is recorded in this account.'}</p></>:<p>No physiotherapist assigned yet. Please contact the care team.</p>}</Card>;
}
