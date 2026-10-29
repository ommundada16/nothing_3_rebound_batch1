// A reminder based on a 2D estimate, never a physical or clinical safety interlock.
export class AngleGuard {
  constructor({maxFlexion = null, margin = 5} = {}) {
    this.max = Number.isFinite(maxFlexion) && maxFlexion > 0 ? maxFlexion : null;
    this.margin = this.max ? Math.min(Math.max(1, margin), this.max / 3) : 5;
    this.state = 'unknown'; this.lastSpoken = -Infinity;
  }
  update(angle, time) {
    if (!Number.isFinite(angle)) { this.state='unknown'; return {state:'unknown',blocked:true,speak:false}; }
    if (!this.max) { this.state='clear'; return {state:'clear',blocked:false,speak:false}; }
    let next = angle >= this.max ? 'limit' : angle >= this.max-this.margin ? 'near' : 'clear';
    // Avoid repeatedly switching at the warning boundary.
    if (next === 'clear' && ['near','limit'].includes(this.state) && angle > this.max-this.margin-3) next='near';
    if(this.state === 'limit' && angle > this.max-3) next='limit';
    const changed=next!==this.state;
    const escalation=changed && (next === 'limit' || !['near','limit'].includes(this.state));
    const speak=next!=='clear' && (escalation || time-this.lastSpoken >= 5000);
    this.state=next;
    if(speak)this.lastSpoken=time;
    return {state:next,blocked:next!=='clear',speak,max:this.max};
  }
}
