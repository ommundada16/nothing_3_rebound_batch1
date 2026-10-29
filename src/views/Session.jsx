import { useCallback, useEffect, useRef, useState } from 'react';
import { EXERCISES, LEG, exercisePrescription } from '../../shared/exercises.js';
import { api } from '../lib/api.js';
import { CuePlayer } from '../lib/cues.js';
import { Smoother, LockedLegTracker, LegMedianFilter, flexionFrom, liftFrom, readLeg } from '../lib/geometry.js';
import { detect, loadPose, openCamera } from '../lib/pose.js';
import { cameraGuidance } from '../lib/cameraGuidance.js';
import { TrackingQuality } from '../lib/trackingQuality.js';
import { AngleGuard } from '../lib/angleGuard.js';
import { RepCounter } from '../lib/repCounter.js';
import { SIM_H, SIM_W, createSim, drawScene } from '../lib/sim.js';
import { Card, Icon } from '../components/ui.jsx';
import RefVideos from '../components/RefVideos.jsx';
import { FLAW_KEY } from './DemoPanel.jsx';

const PHASE_TEXT = {
  rest: 'Ready. Start moving when you are comfortable.',
  moving: 'Moving. Keep going.',
  holding: 'Hold it there.',
  released: 'Relax and come back.',
  recovering: 'Tracking paused. Gently return to the starting position.',
};

function simProfile(state, exerciseId, mode) {
  const last = [...state.sessions].reverse().find((s) => s.exercise === exerciseId && s.mode === mode);
  if (exerciseId === 'heel_slide') {
    const base = last?.metrics?.peak ?? (mode === 'assisted' ? 98 : 88);
    return { peak: Math.min(135, Math.round(base + 3)), deficit: 0 };
  }
  const lift = last?.metrics?.peak ?? 38;
  const stage = state.plan.exercises.find((e) => e.id === 'slr')?.stage;
  const deficit = mode === 'assisted' ? 2 : stage === 'nopillow' ? 9 : 7;
  return { peak: Math.round(lift + 1), deficit };
}

export default function Session({ state, exerciseId, initialMode = 'active', onExit, toast }) {
  const cfg = EXERCISES[exerciseId];
  const planEx = exercisePrescription(state.plan,exerciseId,initialMode);
  const stage = planEx.stage || null;
  const maxFlexion = Number(planEx.maxFlexion) > 0 ? Number(planEx.maxFlexion) : null;

  const [step, setStep] = useState('setup'); // setup | live | summary
  const [mode] = useState(initialMode);
  const side = 'auto';
  const [source, setSource] = useState('camera');
  const [facing, setFacing] = useState('user');
  const [err, setErr] = useState('');
  const [caption, setCaption] = useState(null);
  const [live, setLive] = useState({ value: null, phase: 'rest', done: 0, tick: 0, conf: 0, low: false });
  const [aspect, setAspect] = useState(`${SIM_W} / ${SIM_H}`);
  const [summary, setSummary] = useState(null);
  const [self, setSelf] = useState({ pain: 2, confidence: 3 });
  const [saving, setSaving] = useState(false);
  const [reported,setReported]=useState(false),[cameraHelp,setCameraHelp]=useState(false);
  const [muted, setMuted] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const sceneRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const run = useRef({});
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  // ---------- teardown ----------
  const stopAll = useCallback(() => {
    const r = run.current;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(rafRef.current);
    if (r.pushTimer) clearInterval(r.pushTimer);
    if (r.capTimer) clearTimeout(r.capTimer);
    r.resolveVideo?.(null); r.resolveVideo=null;
    for(const timer of r.timers || []) clearTimeout(timer);
    r.timers=[];
    r.cues?.stop();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    r.running = false;
  }, []);
  useEffect(() => stopAll, [stopAll]);
  useEffect(() => {
    if(step === 'live' && videoRef.current && run.current.resolveVideo) {
      run.current.resolveVideo(videoRef.current); run.current.resolveVideo=null;
    }
  }, [step]);
  const later = (fn, ms) => {
    const r=run.current;
    const timer=setTimeout(()=>{if(r.running)fn();},ms);
    r.timers.push(timer);
  };
  const canEncourage = () => {const r=run.current;return r.running && !r.guardStatus?.blocked && !r.lowSince && performance.now()-(r.lastValidFrame ?? -Infinity)<1000;};

  // ---------- helpers ----------
  const compose = useCallback(
    (value, label, pose) => {
      const r = run.current;
      const w = r.w || SIM_W;
      const h = r.h || SIM_H;
      const scale = Math.min(1, 640 / w);
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const g = c.getContext('2d');
      if (r.source === 'camera' && videoRef.current) g.drawImage(videoRef.current, 0, 0, c.width, c.height);
      else drawScene(g, c.width, c.height, { exercise: exerciseId, stage });
      drawLeg(g, pose, scale, '#2dd4bf');
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(8, 8, 170, 46);
      g.fillStyle = '#fff';
      g.font = 'bold 28px system-ui, sans-serif';
      g.fillText(`${Math.round(value)}°`, 16, 40);
      g.font = '12px system-ui, sans-serif';
      g.fillText(label, 86, 40);
      return c.toDataURL('image/jpeg', 0.72);
    },
    [exerciseId, stage],
  );

  function drawLeg(g, pose, scale, color) {
    if (!pose) return;
    g.lineWidth = 6;
    g.strokeStyle = color;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(pose.hip.x * scale, pose.hip.y * scale);
    g.lineTo(pose.knee.x * scale, pose.knee.y * scale);
    g.lineTo(pose.ankle.x * scale, pose.ankle.y * scale);
    g.stroke();
    for (const p of [pose.hip, pose.knee, pose.ankle]) {
      g.beginPath();
      g.fillStyle = '#fff';
      g.arc(p.x * scale, p.y * scale, 6, 0, Math.PI * 2);
      g.fill();
    }
  }

  // ---------- start ----------
  const start = async () => {
    setErr('');
    const r = run.current;
    r.shots = []; r.runId=crypto.randomUUID(); r.alertSent=false;
    r.timers=[]; r.finishing=false; r.lastVT=null; r.selectedSide=null; r.sideChanged=false; r.restartingSide=null; r.lastDisplayed=null;
    r.jointFilter=new LegMedianFilter(); r.selector=new LockedLegTracker(); r.quality=new TrackingQuality();r.trackingNotice=false;r.recoveredSince=null;
    r.guard=new AngleGuard({maxFlexion,margin:Number(planEx.warningMarginDeg)||5});
    r.guardStatus={state:'unknown',blocked:true};
    r.limitEvents=[]; r.observedPeak=null;
    r.repDeficits = [];
    r.curDeficits = [];
    r.confSum = 0;
    r.confN = 0; r.validN=0; r.lastAngleSpoken=0; r.lastMilestone=0;
    r.lowSince = null;
    r.lastSpeak = 0;
    r.lastUi = 0;
    r.source = source;
    r.running = true;
    r.startedAt = Date.now(); r.startedPerf=performance.now(); r.lastValidFrame=null;
    r.firstRepStarted = false;
    r.smoother = new Smoother(0.55);
    r.cues = new CuePlayer({
      getCues: () => state.cues || {},
      getLang: () => state.cueLanguage || 'en',
      onCaption: (c) => {
        setCaption(c);
        clearTimeout(r.capTimer);
        r.capTimer = setTimeout(() => setCaption(null), 2200);
      },
    });
    r.cues.muted = mutedRef.current;

    r.counter = new RepCounter({
      base: cfg.base,
      minPeak: Number(planEx.targetFlexion) > 0 ? Number(planEx.targetFlexion) : Math.min(cfg.minPeak, maxFlexion ? maxFlexion-10 : cfg.minPeak),
      holdMs: planEx.holdSec * 1000,
      onEvent: (e) => handleEvent(e),
    });

    try {
      if (source === 'camera') {
        setLoadingModel(true);
        const stream = await openCamera(facing);
        if(!r.running) {stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current = stream;
        r.landmarker = await loadPose();
        if(!r.running)return;
        const mounted = new Promise(resolve => { r.resolveVideo=resolve; });
        setStep('live');
        const v = await mounted;
        if(!v || !r.running)return;
        v.srcObject = stream;
        await v.play();
        r.w = v.videoWidth;
        r.h = v.videoHeight;
        setAspect(`${r.w} / ${r.h}`);
        setLoadingModel(false);
      } else {
        const prof = simProfile(state, exerciseId, mode);
        let flaw = 0;
        try {
          flaw = localStorage.getItem(FLAW_KEY) === '1' ? 2 : 0;
        } catch {
          /* ignore */
        }
        r.sim = createSim({ exercise: exerciseId, peak: maxFlexion?Math.min(prof.peak,maxFlexion-8):prof.peak, deficit: prof.deficit, holdSec: planEx.holdSec, side: state.patient.leg, flawRep: flaw });
        r.w = SIM_W;
        r.h = SIM_H;
        setAspect(`${SIM_W} / ${SIM_H}`);
      }
    } catch (e) {
      setLoadingModel(false);
      setStep('setup');
      setErr(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera access for this site, then try again.' : e.name === 'NotFoundError' ? 'No camera was found. Connect a webcam or use your phone.' : e.message || 'Could not start the camera. You can use the demo animation instead.');
      stopAll();
      return;
    }

    setStep('live');
    r.cues.play('stop'); // physio's "stop if it is a sharp pain", every session
    loop();
  };

  // ---------- cue + event wiring ----------
  const handleEvent = (e) => {
    const r = run.current;
    const cues = r.cues;
    switch (e.type) {
      case 'start':
        r.lastMilestone=0;
        if (!r.firstRepStarted) {
          r.firstRepStarted = true;
          cues.play('start', { priority: true });
        }
        if (r.pushTimer) clearInterval(r.pushTimer);
        r.curDeficits = [];
        break;
      case 'tracking_lost':
        clearInterval(r.pushTimer);
        break;
      case 'abort':
        clearInterval(r.pushTimer);
        break;
      case 'peak':
        clearInterval(r.pushTimer);
        if(canEncourage())cues.play('hold', { priority: true });
        snap(e.value);
        break;
      case 'hold_tick':
        if (e.sec === 1) snap(r.counter.holdPeak);
        break;
      case 'release':
        if(!r.guardStatus?.blocked)cues.play('relax', { priority: true });
        pushDeficit();
        break;
      case 'early_release':
        pushDeficit();
        break;
      case 'stalled':
        break;
      case 'rep_done':
        if (e.complete) later(() => {if(canEncourage()){cues.play('good');}}, 1500);
        if (r.counter.completed >= planEx.reps && !r.finishing) {
          r.finishing = true;
          later(() => cues.play('done', { priority: true }), 2600);
          later(()=>{const waitUntilQuiet=()=>{if(r.cues.busy)later(waitUntilQuiet,400);else finish();};waitUntilQuiet();},5200);
        }
        break;
      default:
    }
  };

  function pushDeficit() {
    const r = run.current;
    if (r.curDeficits.length) {
      r.repDeficits.push(r.curDeficits.reduce((a, b) => a + b, 0) / r.curDeficits.length);
    }
    r.curDeficits = [];
  }

  function snap(value) {
    const r = run.current;
    if (!r.lastPose) return;
    const best = r.shots.length ? Math.max(...r.shots.map((s) => s.value)) : -1;
    if (r.shots.length >= 6 && value <= best) return;
    const label = `${cfg.name} · ${mode}`;
    r.shots.push({ value, url: compose(value, label, r.lastPose) });
    r.shots.sort((a, b) => b.value - a.value);
    r.shots = r.shots.slice(0, 3);
  }

  // ---------- main loop ----------
  // Simulated leg runs on a timer so it keeps going even if the window is in the
  // background; the real camera follows the display refresh.
  const schedule = () => {
    const r = run.current;
    rafRef.current = r.source === 'sim' ? setTimeout(loop, 33) : requestAnimationFrame(loop);
  };
  const loop = () => {
    const r = run.current;
    if (!r.running) return;
    const now = performance.now();
    const w = r.w || SIM_W;
    const h = r.h || SIM_H;

    let landmarks = null;
    if (r.source === 'camera') {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.currentTime !== r.lastVT) {
        r.lastVT = v.currentTime;
        try {
          landmarks = detect(r.landmarker, v, now);
        } catch {
          landmarks = null;
        }
      } else {
        if(now-(r.lastValidFrame ?? r.startedPerf)>1200) {
          r.counter.update(null,now);r.guardStatus=r.guard.update(null,now);
          if(now-r.lastUi>250){r.lastUi=now;setLive(v=>({...v,value:null,conf:0,low:true,paused:true,guidance:{title:'Waiting for camera frames',tip:'Keep this browser tab open and check that the webcam is connected. If the picture is frozen, stop and restart the camera.'},tick:0,phase:r.counter.state,guard:'unknown'}));}
        }
        schedule();
        return;
      }
    } else {
      landmarks = r.sim.frame(now).landmarks;
      const sc = sceneRef.current;
      if (sc) {
        sc.width = sc.clientWidth * (window.devicePixelRatio > 1 ? 1.5 : 1);
        sc.height = (sc.width * SIM_H) / SIM_W;
        drawScene(sc.getContext('2d'), sc.width, sc.height, { exercise: exerciseId, stage });
      }
    }

    const selection = r.selector.update(landmarks, LEG, w, h, now);
    const useSide = selection.side;
    if(r.restartingSide&&useSide&&useSide!==r.restartingSide){setErr('The other knee was detected after repositioning. Start a new session to keep the two knees separate.');r.sideChanged=true;finish();return;}
    if(useSide)r.restartingSide=null;
    const observedLeg = selection.leg;
    if(selection.reacquired){r.jointFilter.reset();r.smoother.reset();r.quality=new TrackingQuality();r.counter.loseTracking();}
    const leg = observedLeg?.confidence>=.35 ? r.jointFilter.push(observedLeg) : observedLeg;
    if(!observedLeg || observedLeg.confidence<.35)r.jointFilter.reset();
    const conf = leg ? leg.confidence : 0;
    r.confSum += conf;
    r.confN += 1;
    const raw = leg ? (cfg.signal === 'flexion' ? flexionFrom(leg.hip,leg.knee,leg.ankle) : liftFrom(leg.hip,leg.knee)) : null;
    const quality=r.quality.assess(leg,w,h,raw);
    if(!leg&&selection.reason)quality.reason=selection.reason;
    const ok=quality.accepted;
    const guidance=ok?null:cameraGuidance(landmarks,useSide,quality.reason);

    let value = null;
    if (ok) {
      r.validN+=1; r.lastValidFrame=now;
      if(!r.selectedSide)r.selectedSide=useSide;
      value = r.smoother.push(raw); r.lastDisplayed=value;
      r.lastPose = { hip: leg.hip, knee: leg.knee, ankle: leg.ankle };
      r.observedPeak = Math.max(r.observedPeak ?? 0,value);
      const guard=r.guard.update(Math.max(raw,value),now);
      r.guardStatus=guard;
      if(guard.speak) {
        clearInterval(r.pushTimer);
        const tag=guard.state === 'limit' ? 'angle_limit' : 'near_limit';
        const text=guard.state === 'limit' ? `Your prescribed maximum is ${maxFlexion} degrees. Stop bending and gently release.` : `You are close to your ${maxFlexion} degree limit. Do not bend further.`;
        r.cues.play(tag,{priority:true,text:r.cues.hasRealClip(tag)?undefined:text,valid:()=>r.running&&['near','limit'].includes(r.guardStatus?.state)});
        r.limitEvents.push({state:guard.state,angle:Math.round(raw),atMs:Math.round(now-r.startedPerf)});
        if(guard.state === 'limit'){snap(value);if(r.source==='camera'&&!r.alertSent){r.alertSent=true;api.exerciseAlert({runId:r.runId,angle:raw,mode,leg:useSide}).catch(()=>{r.alertSent=false;});}}
      }
      r.counter.update(value, now);
      if(guard.state === 'limit')r.counter.invalidateLimit();
      if (cfg.signal === 'lift' && r.counter.state === 'holding') {
        const d = flexionFrom(leg.hip, leg.knee, leg.ankle);
        if (d != null) r.curDeficits.push(d);
      }
      r.lowSince = null;
      r.recoveredSince ??= now;
      if(now-r.recoveredSince>3000)r.trackingNotice=false;
    } else {
      r.counter.update(null,now);
      r.recoveredSince=null;
      r.guardStatus=r.guard.update(null,now);
      if(r.lowSince == null)r.lowSince=now;
    }
    const low = !ok && r.lowSince != null && now - r.lowSince > 2200;
    if(low && !r.trackingNotice && now-r.lowSince>5000){
      const spoken=r.cues.speak(guidance?.tip||'Please include your hip, knee and foot in the camera view.',{key:'tracking-help'});
      if(spoken)r.trackingNotice=true;
    }

    // overlay
    const oc = overlayRef.current;
    if (oc) {
      oc.width = w;
      oc.height = h;
      const g = oc.getContext('2d');
      g.clearRect(0, 0, w, h);
      if (ok) drawLeg(g, r.lastPose, 1, r.counter.state === 'holding' ? '#facc15' : '#2dd4bf');
    }

    if (now - r.lastUi > 90) {
      r.lastUi = now;
      setLive({
        value: ok ? value : now-(r.lastValidFrame ?? -Infinity)<500?r.lastDisplayed:null,
        paused:!ok,
        phase: r.counter.state,
        done: r.counter.completed,
        tick: r.counter.state === 'holding' ? Math.min(planEx.holdSec, ((r.counter.gapStart ?? now) - r.counter.holdStart) / 1000) : 0,
        conf,
        low, guidance, guard:r.guardStatus.state, reason:quality.reason, quality:quality.quality, side:useSide,
      });
    }
    schedule();
  };

  // ---------- finish ----------
  const finish = () => {
    const r = run.current;
    if (!r.running) return;
    stopAll();
    const reps = r.counter.reps;
    const good = reps.filter((x) => x.complete);
    const pool = good.length ? good : reps;
    const peak = r.sideChanged || r.validN < 10 || r.validN / Math.max(1,r.confN) < 0.6 ? null : pool.length ? Math.max(...pool.map((x) => x.peak)) : r.observedPeak;
    const deficits = r.repDeficits;
    const deficit = cfg.signal === 'lift' && deficits.length ? Math.round((deficits.reduce((a, b) => a + b, 0) / deficits.length) * 10) / 10 : null;
    setSummary({
      reps,
      peak: peak == null ? null : Math.round(peak * 10) / 10,
      deficit,
      shots: r.shots,
      validRatio:r.validN / Math.max(1,r.confN),
      confidenceAvg: r.confN ? Math.round((r.confSum / r.confN) * 100) / 100 : 0,
      seconds: Math.round((Date.now() - r.startedAt) / 1000),
    });
    setStep('summary');
  };

  const save = async () => {
    setSaving(true);
    try {
      const ids = [];
      for (const s of summary.shots) {
        const blob = await (await fetch(s.url)).blob();
        const up = await api.upload(blob, { kind: 'screenshot', name: `${exerciseId}-${Math.round(s.value)}deg.jpg` });
        ids.push(up.id);
      }
      const res = await api.saveSession({
        exercise: exerciseId,
        mode,
        leg: run.current.selectedSide || null,
        legSource: 'automatic-camera-estimate',
        stage,
        reps: summary.reps,
        metrics: { peak: summary.peak, deficit: summary.deficit },
        confidenceAvg: summary.confidenceAvg,
        cameraSource: run.current.source,
        screenshotIds: ids,
        selfReport: self,
        durationS: summary.seconds,
        prescribedMaxFlexion:maxFlexion,
        limitEvents:run.current.limitEvents,
        isTestSession:Boolean(run.current.selectedSide && run.current.selectedSide!==state.patient.leg)||run.current.source==='sim',
        captureStatus:summary.peak==null?'limited':'measured',
        patientReportedCompletion:reported,
        trackingNote:summary.peak==null?'Camera measurement was unreliable; preserve this attempt without asking for another set.':null,
      });
      toast(res.newFlags?.length ? 'Saved. Your physio has been sent a summary to look at.' : 'Saved. Well done.');
      onExit();
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const toggleMute = () => {
    setMuted((m) => {
      const v = !m;
      if (run.current.cues) run.current.cues.muted = v;
      if (v && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      run.current.cues?.stop();
      return v;
    });
  };

  // ---------- render ----------
  if (step === 'setup') {
    const name = mode === 'assisted' ? 'Heel slide — assisted' : 'Heel slide — unassisted';
    return (
      <div className="stack exercise-setup">
        <button className="link-btn back-link" onClick={onExit}>‹ Back to exercises</button>
        <div><h1>{name}</h1><p className="muted">{mode === 'assisted' ? 'With help, as your physio showed you.' : 'Bend your knee using your own muscles.'}</p></div>

        <RefVideos refVideos={state.refVideos} exerciseId={exerciseId} mode={mode} />
        <p className="exercise-prescription"><b>{planEx.reps} repetitions</b> · Hold for <b>{planEx.holdSec} seconds</b></p>
        <p>Move gently. Stop if you feel sharp pain.</p>
        {source === 'camera' && <Card title="Before you start the camera"><ol><li>Use the supported position shown in your physio’s video.</li><li>Place the laptop at knee height, squarely beside your exercising leg, about 1.5–2 metres away.</li><li>Check that your torso, hip, knee and foot all fit in the picture.</li><li>Keep the exercising leg nearest the camera, with good light from in front.</li></ol><p className="small muted">The knee is selected automatically. Hold still briefly in your starting position so tracking can settle.</p></Card>}
        {maxFlexion && <p className="callout review">Prescribed maximum: <b>{maxFlexion}°</b>. The app warns before this estimated angle. Follow your doctor’s restriction.</p>}
        {err && <div className="callout urgent" role="alert">{err}</div>}
        <button className="btn primary big" onClick={start} disabled={loadingModel}>{loadingModel ? 'Getting ready…' : 'Start exercise'}</button>
        <details className="more"><summary>Camera and practice options</summary>
          <div className="stack card">
            <p>{cfg.camera}</p>
            <label className="field">Practice with<select value={source} onChange={e=>setSource(e.target.value)}><option value="camera">My camera</option><option value="sim">Demo animation</option></select></label>
            {source === 'camera' && <>
              <label className="field">Camera<select value={facing} onChange={e=>setFacing(e.target.value)}><option value="environment">Back camera</option><option value="user">Front / laptop camera</option></select></label>

            </>}
            <p className="small muted">Video is processed on your device. Saved exercise pictures are shared with your physio.</p>
            {state.plan.precautions.length > 0 && <><h3>Your physio’s reminders</h3><ul>{state.plan.precautions.map(p=><li key={p}>{p}</li>)}</ul></>}
          </div>
        </details>
      </div>
    );
  }

  if (step === 'summary' && summary) {
    return (
      <div className="stack">
        <h2 style={{ margin: 0 }}>Session finished</h2>
        <Card>
          <div className="row between" style={{ textAlign: 'center' }}>
            <div className="grow">
              <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{summary.peak == null ? 'Unavailable' : `${Math.round(summary.peak)}°`}</div>
              <div className="small muted">{cfg.signal === 'flexion' ? 'Best bend' : 'Best lift'}</div>
            </div>
            <div className="grow">
              <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>
                {summary.reps.filter((r) => r.complete).length}/{planEx.reps}
              </div>
              <div className="small muted">Full reps</div>
            </div>
            {summary.deficit != null && (
              <div className="grow">
                <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{Math.round(summary.deficit)}°</div>
                <div className="small muted">Knee not fully straight</div>
              </div>
            )}
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            Your leg was visible enough in {Math.round(summary.validRatio * 100)}% of camera frames. This does not measure angle accuracy.
          </p>
        </Card>

        {summary.shots.length > 0 && (
          <Card title="Exercise pictures (shared when you save)">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
              {summary.shots.map((s, i) => (
                <img key={i} className="shot" src={s.url} alt={`Peak ${Math.round(s.value)} degrees`} />
              ))}
            </div>
          </Card>
        )}

        {summary.peak == null && <div className="callout review"><b>Your effort still counts.</b><p>The camera could not confirm the measurements. Save this session for your physio to review. You do not need to repeat the exercise just to get a recording.</p></div>}
        <label className="completion-confirm"><input type="checkbox" checked={reported} onChange={e=>setReported(e.target.checked)}/><span>I completed the prescribed exercise.<small>This is your report, kept separate from camera-counted repetitions.</small></span></label>
        <p className="small muted">{summary.reps.filter(r=>r.limitExceeded).length>0?`${summary.reps.filter(r=>r.limitExceeded).length} repetitions crossed the prescribed maximum and were excluded.`:'A full repetition includes the prescribed hold and a return to the starting position.'}</p><Card title="How was it?">
          <label className="field">Pain during the exercise: {self.pain} / 10</label>
          <input type="range" min="0" max="10" value={self.pain} onChange={(e) => setSelf({ ...self, pain: +e.target.value })} />
          <label className="field" style={{ marginTop: 12 }}>
            How confident did you feel moving the knee? {self.confidence} / 5
          </label>
          <input type="range" min="1" max="5" value={self.confidence} onChange={(e) => setSelf({ ...self, confidence: +e.target.value })} />
          {self.pain >= 8 && <div className="callout urgent small" style={{ marginTop: 10 }}>That is a lot of pain. After saving, use "Something feels wrong" so your physio sees it.</div>}
        </Card>
        {err && <div className="callout urgent small">{err}</div>}
        <div className="row">
          <button className="btn grow" onClick={onExit}>
            Discard
          </button>
          <button className="btn primary grow" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save session'}
          </button>
        </div>
      </div>
    );
  }

  // A calm, fixed camera workspace: one instruction, details only on request.
  const instruction=live.guard==='limit'?`Stop bending. Maximum ${maxFlexion}°. Gently release.`:live.guard==='near'?`Near your ${maxFlexion}° limit. Do not bend further.`:live.paused?(live.guidance?.title||'Keep your whole leg in view.') : live.phase==='holding'?`Hold gently · ${Math.max(0,Math.ceil(planEx.holdSec-live.tick))}s`:live.phase==='released'?'Return slowly to your starting position.':live.phase==='recovering'?'Tracking paused. Return gently to the starting position.':live.phase==='moving'?'Bend gently at your own pace.':'Ready when you are. Start gently.';
  return <section className="camera-workspace" aria-label="Exercise camera"><div className="camera-topline"><span>{mode==='assisted'?'Assisted':'Unassisted'} heel slide</span><span>{source==='sim'?'Demo animation · simulated readings':'On-device camera · estimated angles'}</span></div><div className="stage camera-stage"><div className={source==='camera'&&facing==='user'?'mirror':''} style={{position:'absolute',inset:0}}><video ref={videoRef} playsInline muted style={{display:source==='camera'?'block':'none'}}/><canvas ref={sceneRef} style={{display:source==='sim'?'block':'none'}}/><canvas ref={overlayRef}/></div><div className="camera-readings"><div><strong>{live.value!=null?`${Math.round(live.value)}°`:'—'}</strong><span>{live.paused?'Tracking paused':'Knee bend estimate'}</span></div><div><strong>{live.done}<small> / {planEx.reps}</small></strong><span>Full repetitions</span></div></div></div><div className={`camera-one-line ${['near','limit'].includes(live.guard)?'limit':''}`} role="status">{instruction}</div><div className="camera-controls"><button className="btn" onClick={toggleMute}>{muted?'Unmute':'Mute'}</button><button className="btn" onClick={()=>setCameraHelp(true)}>Camera help</button><button className="btn primary" onClick={finish}>Finish & save</button></div>{cameraHelp&&<div className="chat-backdrop"><section className="chat-dialog camera-help-dialog" role="dialog" aria-modal="true" aria-label="Camera help"><h2>{live.guidance?.title||'Set up a clear side view'}</h2><p>{live.guidance?.tip||'Keep your torso, hip, knee and foot visible, with the exercising leg closest to the camera.'}</p><ol><li>Use the supported position shown in your physio’s video.</li><li>Place the camera squarely beside your leg at knee height.</li><li>Use good light and keep furniture and the other leg from blocking the view.</li></ol><p>Tracking pauses do not erase your effort. You can save an attempt with uncertain measurements.</p><div className="row wrap"><button className="btn" onClick={()=>{const r=run.current;r.selector=new LockedLegTracker();r.jointFilter.reset();r.smoother.reset();r.quality=new TrackingQuality();r.counter.loseTracking();r.restartingSide=r.selectedSide;setCameraHelp(false);}}>Recheck position</button><button className="btn primary" autoFocus onClick={()=>setCameraHelp(false)}>Back to exercise</button></div></section></div>}</section>;
}
