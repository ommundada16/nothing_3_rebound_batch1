import {freshState} from './seed.js';
import {emptyCare} from '../shared/care.js';
import {dayIndex} from '../shared/time.js';
import {createIssueFromReport,applyAction} from './issues.js';
export const DEMO_PASSWORD='ReboundDemo2026!';
export function ensureDemoAccounts({accounts,registry,referenceVideos,addImage}){
 const definitions=[
  ['physio','Dr. Aditi Kulkarni','aditi.kulkarni','Kothrud, Pune','411038'],['physio','Dr. Rohan Deshmukh','rohan.deshmukh','Baner, Pune','411045'],['physio','Dr. Neha Shah','neha.shah','Thane','400601'],
  ['assistant','Dr. Sneha Patil','sneha.patil','Shivajinagar, Pune','411005'],['assistant','Dr. Aniket Joshi','aniket.joshi','Pimpri-Chinchwad','411018'],['assistant','Dr. Pooja Mehta','pooja.mehta','Dadar, Mumbai','400014'],
  ['careteam','Anjali More','anjali.more','Pune','411001'],['careteam','Sagar Pawar','sagar.pawar','Pimpri-Chinchwad','411018'],['careteam','Priya Nair','priya.nair','Mumbai','400014'],
  ['patient','Meera Kulkarni','meera.kulkarni','Kothrud, Pune','411038'],['patient','Vijay Patil','vijay.patil','Baner, Pune','411045'],['patient','Sunita Joshi','sunita.joshi','Pimpri-Chinchwad','411018'],['patient','Prakash Deshmukh','prakash.deshmukh','Wakad, Pune','411057'],['patient','Asha Shah','asha.shah','Thane','400601']
 ];
 const demo=definitions.map(([role,name,key,city,postalCode])=>{const email=key+'@rebound.example',existing=accounts.users.find(u=>u.email===email);if(existing&&!existing.isDemo)return null;return existing||accounts.addUser({name,email,role,city,postalCode,isDemo:true,password:DEMO_PASSWORD});}).filter(Boolean);
 const physios=demo.filter(u=>u.role==='physio'),assistants=demo.filter(u=>u.role==='assistant');
 demo.filter(u=>u.role==='patient').forEach((user,index)=>{
  const physio=physios[[0,1,1,1,2][index]],assistant=assistants[[0,1,1,1,2][index]];
  const id='demo-'+user.email.split('@')[0].replaceAll('.','-');
  registry.seedDemo(id,user,physio,assistant,()=>{
   const now=Date.now(),today=dayIndex(now),s=freshState('progressing',now),leg=index%2?'right':'left';
   s.isDemo=true;s.patient={id,isDemo:true,name:user.name,age:[62,68,59,65,71][index],leg,procedure:`Total knee replacement, ${leg} knee`,surgeryTs:(today-10)*86400000-19800000+36000000,city:user.city,postalCode:user.postalCode,phone:'',surgeon:assistant.name};
   s.sessions=[];s.issues=[];s.audit=[];s.activity={patientLastLogin:now-3600000};s.exerciseAlerts=[];s.clinicBaseline=null;s.cues={};s.refVideos={heel_slide:{stock_active:referenceVideos?.heel_slide?.stock_active,stock_assisted:referenceVideos?.heel_slide?.stock_assisted}};s.care=emptyCare();
   s.care.appointments=[['discharge','Discharge / early recovery check',1],['physio','Physiotherapy review',3],['medicine','Medication review',7],['wound','Wound / dressing review',12]].map(([key,title,offset])=>({id:'first14-'+key,title:title+' (demo)',at:(today-10+offset)*86400000-19800000+39600000,place:user.city}));
   s.plan={exercises:[{id:'heel_slide',reps:6,holdSec:2,maxFlexion:110,modesEnabled:['active','assisted']}],catalogueIds:index%2?['ankle_pumps']:[],precautions:[],notes:''};
   const peaks=[80,82,85,87,90,89,92].map(n=>n-index*2);
   for(let day=0;day<7;day++)for(const mode of ['active','assisted']){
    const peak=peaks[day]+(mode==='assisted'?4:0),ts=(today-6+day)*86400000-19800000+36000000+(mode==='assisted'?600000:0),photo='demo-shot-'+id+'-'+day+'-'+mode;
    const screenshots=day===6?[addImage(photo,id,peak)]:[];
    s.sessions.push({id:`${id}-${day}-${mode}`,ts,exercise:'heel_slide',mode,leg,cameraSource:'demo',isDemo:true,isTestSession:false,captureStatus:'measured',metrics:{peak},reps:Array.from({length:6},(_,i)=>({peak:peak-(i%2),holdMs:2000,complete:true})),screenshotIds:screenshots,selfReport:{pain:Math.max(1,4-Math.floor(day/2)),confidence:Math.min(5,3+Math.floor(day/3))},durationS:65,prescribedReps:6,prescribedHoldSec:2,prescribedMaxFlexion:110});
   }
   const report=createIssueFromReport(s,{text:'Demo question: when is my next follow-up appointment?',symptoms:[],pain:0});applyAction(s,report.issue.id,{action:'reply',text:'Demo reply: your review is listed under appointments. Please contact your treating team to confirm arrangements.',byLevel:3});
   return s;
  });
 });
 return demo.map(accounts.publicUser);
}
export function demoSnapshot(angle){return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="380" viewBox="0 0 720 380"><rect width="720" height="380" rx="24" fill="#edf2e6"/><text x="32" y="48" font-family="sans-serif" font-size="21" fill="#294e3b">DEMO EXERCISE SNAPSHOT — ILLUSTRATION</text><path d="M150 240H350L${350+180*Math.cos(angle*Math.PI/180)} ${240-180*Math.sin(angle*Math.PI/180)}" fill="none" stroke="#487b62" stroke-width="16" stroke-linecap="round"/><circle cx="350" cy="240" r="13" fill="#da713a"/><text x="490" y="190" font-family="sans-serif" font-size="52" fill="#294e3b">${angle}°</text><text x="32" y="340" font-family="sans-serif" font-size="17" fill="#607260">Fictional sample · not a patient photograph or camera measurement</text></svg>`;}
