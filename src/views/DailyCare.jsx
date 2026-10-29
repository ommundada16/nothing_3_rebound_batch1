import {useEffect,useState} from 'react';
export function CareReminders({store}) {
 const {state,now}=store;
 const [,redraw]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>redraw(v=>v+1),30000);return()=>clearInterval(timer);},[]);
 const upcoming=(state.care?.appointments||[]).filter(a=>a.at>=now()&&a.at-now()<86400000);
 if(!upcoming.length)return null;
 return <aside className="callout review" role="status">{upcoming.map(a=><p key={a.id}><b>Upcoming:</b> {a.title} · {new Date(a.at).toLocaleString('en-IN',a.dateOnly?{dateStyle:'medium',timeZone:'Asia/Kolkata'}:{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</p>)}</aside>;
}
