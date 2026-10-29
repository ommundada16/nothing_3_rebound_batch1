// Appointment labels are a clerical template, not a universal clinical schedule.
export const FIRST_FORTNIGHT=[
 {id:'discharge',title:'Discharge / early recovery check',hint:'If requested by the treating team'},
 {id:'physio',title:'First physiotherapy review',hint:'Use the date agreed with the physio'},
 {id:'medicine',title:'Medication review',hint:'If requested by the prescribing team'},
 {id:'wound',title:'Wound / dressing review',hint:'Timing comes from the discharge instructions'},
];
export function fortnightAppointments(dates,existing=[]) {
 const retained=existing.filter(a=>!a.id.startsWith('first14-'));
 for(const item of FIRST_FORTNIGHT){
  const input=dates[item.id];if(!input?.date)continue;
  const at=Date.parse(`${input.date}T${input.time||'12:00'}:00+05:30`);
  if(!Number.isFinite(at))throw new Error('Check the appointment dates.');
  retained.push({id:`first14-${item.id}`,title:item.title,at,dateOnly:!input.time,place:input.place||'Contact the hospital for location details'});
 }
 return retained;
}
