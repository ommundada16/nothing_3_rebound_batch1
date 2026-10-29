// Landmark visibility is a heuristic, not an angle-accuracy score.
export class TrackingQuality {
 constructor(){this.angle=null;this.candidate=null;this.count=0;}
 assess(leg,width,height,angle){
  if(!leg||!Number.isFinite(angle)||angle<0||angle>165)return {accepted:false,reason:'Keep the hip, knee and ankle in view.'};
  const points=[leg.hip,leg.knee,leg.ankle];
  if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<-.05*width||p.x>1.05*width||p.y<-.05*height||p.y>1.05*height))return {accepted:false,reason:'Move back slightly to include the whole leg.'};
  const thigh=Math.hypot(leg.hip.x-leg.knee.x,leg.hip.y-leg.knee.y),shin=Math.hypot(leg.ankle.x-leg.knee.x,leg.ankle.y-leg.knee.y);
  if(Math.min(thigh,shin)<Math.max(8,width*.015)||thigh/shin<.3||thigh/shin>3.3)return {accepted:false,reason:'Use a side view of the leg.'};
  if(leg.confidence<.35)return {accepted:false,reason:'Try more light and uncover the leg.'};
  if(this.angle!=null&&Math.abs(angle-this.angle)>30){
   if(this.candidate!=null&&Math.abs(angle-this.candidate)<12)this.count++;else this.count=1;
   this.candidate=angle;
   if(this.count<3)return {accepted:false,reason:'Checking movement…'};
  }
  this.angle=angle;this.candidate=null;this.count=0;
  return {accepted:true,reason:'',quality:leg.confidence>=.65?'clear':'limited'};
 }
}
