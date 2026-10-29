// Phase detector for a repetition: rest -> moving (effort) -> holding -> released -> rest.
// It works on one smoothed signal (knee flexion, or thigh lift) and emits the
// events that drive the physio's voice cues. Pure logic, no browser APIs, so it
// can be unit tested.

export class RepCounter {
  constructor({ base, minPeak, holdMs, onEvent }) {
    this.base = base;
    this.minPeak = minPeak;
    this.holdMs = holdMs;
    this.onEvent = onEvent || (() => {});
    this.reset();
  }

  reset() {
    this.state = 'rest';
    this.hist = [];
    this.reps = [];
    this.rep = null;
    this.stableSince = null;
    this.lastStallT = -1e9;
    this.holdStart = 0;
    this.holdPeak = 0;
    this.lastTick = 0;
    this.value = null;
    this.velocity = 0;
    this.lastValidT = null; this.gapStart=null;
  }

  get completed() {
    return this.reps.filter((r) => r.complete).length;
  }

  emit(type, extra = {}) {
    this.onEvent({ type, ...extra });
  }

  velocityAt(v, t) {
    this.hist.push({ t, v });
    while (this.hist.length && t - this.hist[0].t > 700) this.hist.shift();
    const ref = this.hist.find((h) => t - h.t >= 300) || this.hist[0];
    const dt = (t - ref.t) / 1000;
    return dt > 0.05 ? (v - ref.v) / dt : 0;
  }

  loseTracking() {
    this.hist = []; this.stableSince = null; this.lastValidT = null;
    if (this.state !== 'rest' && this.state !== 'recovering') {
      this.state='recovering'; this.rep=null; this.holdStart=0;
      this.emit('tracking_lost');
    }
  }

  invalidateLimit() {
    if(this.rep) { this.rep.limitExceeded=true; this.rep.complete=false; }
  }

  // v: smoothed signal in degrees, or null when the camera cannot see the leg.
  update(v, t) {
    if(!Number.isFinite(v)) {
      this.gapStart ??= t;
      if(t-this.gapStart>500)this.loseTracking();
      return;
    }
    if(this.gapStart!=null){
      const gap=t-this.gapStart;
      if(gap>500)this.loseTracking();
      else if(this.state==='holding')this.holdStart+=gap;
      this.gapStart=null;
    } else if(this.lastValidT != null && t-this.lastValidT>750)this.loseTracking();
    this.lastValidT=t;
    if(this.state === 'recovering') {
      this.value=v;
      if(v < this.base+6) { this.state='rest'; this.hist=[]; }
      return;
    }
    this.value = v;
    const vel = this.velocityAt(v, t);
    this.velocity = vel;

    switch (this.state) {
      case 'rest':
        if (v > this.base + 6 && vel > 4) {
          this.state = 'moving';
          this.rep = { startT: t, max: v };
          this.stableSince = null;
          this.emit('start');
        }
        break;

      case 'moving': {
        this.rep.max = Math.max(this.rep.max, v);
        if (Math.abs(vel) < 5) this.stableSince = this.stableSince ?? t;
        else this.stableSince = null;

        if (v >= this.minPeak && this.stableSince != null && t - this.stableSince >= 350) {
          this.state = 'holding';
          this.holdStart = t;
          this.holdPeak = v;
          this.lastTick = 0;
          this.emit('peak', { value: v });
        } else if (v < this.base + 3 && t - this.rep.startT > 600) {
          this.state = 'rest';
          this.rep = null;
          this.emit('abort');
        } else if (v < this.minPeak && this.stableSince != null && t - this.stableSince > 2500 && t - this.lastStallT > 4000) {
          this.lastStallT = t;
          this.emit('stalled', { value: v });
        }
        break;
      }

      case 'holding': {
        this.holdPeak = Math.max(this.holdPeak, v);
        const elapsed = t - this.holdStart;
        const sec = Math.floor(elapsed / 1000);
        if (sec > this.lastTick && sec < this.holdMs / 1000 + 1) {
          this.lastTick = sec;
          this.emit('hold_tick', { sec, total: Math.round(this.holdMs / 1000) });
        }
        if (elapsed >= this.holdMs) {
          this.state = 'released';
          this.rep.complete = !this.rep.limitExceeded;
          this.rep.holdMs = elapsed;
          this.emit('release', { peak: this.holdPeak });
        } else if (v < this.holdPeak - 8) {
          this.state = 'released';
          this.rep.complete = false;
          this.rep.holdMs = elapsed;
          this.emit('early_release', { peak: this.holdPeak, heldMs: elapsed });
        }
        break;
      }

      case 'released':
        if (v < this.base + 6) {
          const rep = { peak: Math.round(this.holdPeak * 10) / 10, holdMs: Math.round(this.rep.holdMs), complete: !!this.rep.complete, limitExceeded: !!this.rep.limitExceeded };
          this.reps.push(rep);
          this.state = 'rest';
          this.rep = null;
          this.emit('rep_done', { n: this.reps.length, completed: this.completed, ...rep });
        }
        break;

      default:
    }
  }
}
