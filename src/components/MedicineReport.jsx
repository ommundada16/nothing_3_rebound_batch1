import {useState} from 'react';
import {api} from '../lib/api.js';
import {Card} from './ui.jsx';
export default function MedicineReport({refresh}){
 const [name,setName]=useState(''),[text,setText]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function send(e){e.preventDefault();setBusy(true);try{await api.reportIssue({suspectedSideEffect:true,text:`Medicine not suiting the patient: ${name.trim()}. ${text.trim()}`,symptoms:[],pain:0});await refresh();setName('');setText('');setStatus('Message sent to the care team.');}catch(e){setStatus(e.message);}finally{setBusy(false);}}
 return <Card title="Message the care team"><form className="stack" onSubmit={send}><label className="field">Medicine not suiting the patient? Enter its name<input required value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">What is happening?<textarea required value={text} onChange={e=>setText(e.target.value)}/></label><button className="btn primary" disabled={busy}>{busy?'Sending…':'Send message'}</button>{status&&<p role="status">{status}</p>}</form></Card>;
}
