export function movementPlanError(plan) {
 if(!plan || !Array.isArray(plan.exercises) || !Array.isArray(plan.precautions)) return 'Check the exercise plan.';
 const entries=plan.exercises.flatMap(e=>[e,...Object.entries(e.modeSettings||{}).map(([mode,settings])=>({...e,...settings,modeSettings:null}))]);
 for(const e of entries) {
  if(e.modesEnabled!=null && (!Array.isArray(e.modesEnabled)||e.modesEnabled.some(m=>!['active','assisted'].includes(m))))return 'Choose assisted or unassisted heel slides.';
  if(!Number.isInteger(e.reps) || e.reps<1 || e.reps>30 || !Number.isFinite(e.holdSec) || e.holdSec<1 || e.holdSec>30) return 'Choose 1–30 repetitions and a hold of 1–30 seconds.';
  const max=e.maxFlexion, target=e.targetFlexion;
  if(max!=null && max!=='' && (!Number.isFinite(max) || max<30 || max>150)) return 'Maximum bend must be 30–150 degrees, or left blank.';
  if(target!=null && target!=='' && (!Number.isFinite(target) || target<20 || target>150)) return 'The repetition target must be 20–150 degrees, or left blank.';
  if(max && target && target>max-5) return 'Keep the repetition target at least 5 degrees below the maximum bend.';
 }
 return '';
}
