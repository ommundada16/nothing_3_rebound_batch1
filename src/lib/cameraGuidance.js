import {LEG} from '../../shared/exercises.js';
// Suggestions describe visible framing/landmark evidence, not a diagnosis.
export function cameraGuidance(landmarks,side,reason=''){
 const points=side?Object.entries(LEG[side]).slice(0,3).map(([name,i])=>({name,p:landmarks?.[i]})):[];
 if(!landmarks)return {title:'Move back so the camera sees you',tip:'Include your torso and the whole exercising leg, from hip to foot. A close-up of only your knee is hard to detect.',code:'no-pose'};
 const outside=points.find(({p})=>p&&(p.x<.02||p.x>.98||p.y<.02||p.y>.98));
 if(outside)return {title:`Bring your ${outside.name} into the picture`,tip:'Move the laptop farther back and adjust its tilt until your hip, knee and foot all fit with space around them.',code:'framing'};
 if(!side)return {title:'Hold still briefly in the starting position',tip:'Keep the exercising leg nearest the camera. Face the camera squarely at the side of your leg, rather than diagonally.',code:'acquiring'};
 const hidden=points.filter(({p})=>!p||(p.visibility??0)<.35).map(x=>x.name);
 if(hidden.length)return {title:`Help the camera see your ${hidden.join(' and ')}`,tip:'Use light from in front of you. Keep the joints visible with suitable clothing, and keep the other leg from blocking the exercising leg.',code:'hidden'};
 if(/position|same leg|starting position/i.test(reason))return {title:'Hold still while tracking reconnects',tip:'Keep the camera steady and the same leg nearest it. Return gently to your usual starting position if comfortable. Reps pause while tracking reconnects.',code:'reconnecting'};
 return {title:'Adjust the side view',tip:'Place the laptop at about knee height, roughly 1.5–2 metres away. Use the supported sitting or lying position shown in your physio’s reference video.',code:'side-view'};
}
