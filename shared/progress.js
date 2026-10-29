import {dayIndex} from './time.js';
export function progressData(sessions,{includePractice=false}={}){
 const measured=sessions.filter(s=>s.cameraSource==='camera'&&s.exercise==='heel_slide'&&Number.isFinite(s.metrics?.peak)&&s.captureStatus!=='limited'&&(includePractice||!s.isTestSession));
 const days=new Map();for(const s of measured){const day=dayIndex(s.ts),row=days.get(day)||{day,active:null,assisted:null};row[s.mode]=Math.max(row[s.mode]??-Infinity,s.metrics.peak);days.set(day,row);}
 const rows=[...days.values()].sort((a,b)=>a.day-b.day);
 return {measured,rows,active:rows.filter(r=>r.active!=null).map(r=>({x:r.day,y:r.active})),assisted:rows.filter(r=>r.assisted!=null).map(r=>({x:r.day,y:r.assisted}))};
}
