import {dayIndex} from './time.js';
export function progressData(sessions,{demo=false,mode='all'}={}){
 const measured=sessions.filter(s=>s.exercise==='heel_slide'&&Number.isFinite(s.metrics?.peak)&&Number.isFinite(s.ts)&&s.captureStatus!=='limited'&&['active','assisted'].includes(s.mode)&&(mode==='all'||s.mode===mode)&&(demo?s.cameraSource==='demo':!['seed','sim','demo'].includes(s.cameraSource)));
 const days=new Map();for(const s of measured){const day=dayIndex(s.ts),row=days.get(day)||{day,best:null,active:null,assisted:null};row.best=Math.max(row.best??-Infinity,s.metrics.peak);row[s.mode]=Math.max(row[s.mode]??-Infinity,s.metrics.peak);days.set(day,row);}
 const rows=[...days.values()].sort((a,b)=>a.day-b.day);
 return {measured,rows,best:rows.map(r=>({x:r.day,y:r.best})),active:rows.filter(r=>r.active!=null).map(r=>({x:r.day,y:r.active})),assisted:rows.filter(r=>r.assisted!=null).map(r=>({x:r.day,y:r.assisted}))};
}
