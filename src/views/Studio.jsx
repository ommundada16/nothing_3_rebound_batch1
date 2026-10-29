import {EXERCISE_CATALOGUE} from '../../shared/exerciseCatalogue.js';
import { useRef, useState } from 'react';
import { CUE_TAGS, SYMPTOMS } from '../../shared/constants.js';
import { EXERCISES } from '../../shared/exercises.js';
import { movementPlanError } from '../../shared/movementPlan.js';
import { DEFAULT_PLAYBOOK } from '../../shared/playbook.js';
import { api, mediaUrl } from '../lib/api.js';
import { Card, Icon } from '../components/ui.jsx';

const LANGS = [
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['mr', 'Marathi'],
];

// ---------------------------------------------------------------------------
// Voice cues: the physio records his own coaching phrases once.
// ---------------------------------------------------------------------------
export function CueStudio({ state, refresh, toast }) {
  const cues = state.cues || {};
  const [lang, setLang] = useState(state.cueLanguage || 'en');
  const [recTag, setRecTag] = useState(null);
  const [captions, setCaptions] = useState({});
  const [busy, setBusy] = useState(false);
  const mr = useRef(null);
  const chunks = useRef([]);

  const filled = CUE_TAGS.filter((t) => (cues[t.id] || []).length).length;

  const saveCues = async (next) => {
    await api.setKey('cues', next, 'physio');
    await refresh();
  };

  const addClip = async (tag, blob, name) => {
    setBusy(true);
    try {
      const up = await api.upload(blob, { kind: 'cue', name });
      const next = { ...cues, [tag]: [...(cues[tag] || []), { mediaId: up.id, lang, text: captions[tag] || '' }] };
      await saveCues(next);
      setCaptions((c) => ({ ...c, [tag]: '' }));
      toast('Clip saved');
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleRec = async (tag) => {
    if (recTag === tag) {
      mr.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rcd = new MediaRecorder(stream);
      mr.current = rcd;
      chunks.current = [];
      rcd.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rcd.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecTag(null);
        addClip(tag, new Blob(chunks.current, { type: rcd.mimeType || 'audio/webm' }), `${tag}-${lang}.webm`);
      };
      rcd.start();
      setRecTag(tag);
    } catch {
      toast('Microphone not available on this page');
    }
  };

  const remove = async (tag, i) => {
    const next = { ...cues, [tag]: (cues[tag] || []).filter((_, k) => k !== i) };
    await saveCues(next);
  };

  return (
    <div className="stack">
      <Card>
        <div className="row between wrap">
          <div>
            <h2 style={{ margin: 0 }}>Teach the system your voice</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Record each phrase once, the way you say it in the room. The system only chooses <i>when</i> to play your clip. It never writes instructions of its own.
            </p>
          </div>
          <span className={`badge ${filled === CUE_TAGS.length ? 'ok' : 'review'}`}>
            {filled} of {CUE_TAGS.length} ready
          </span>
        </div>
        <div className="row wrap" style={{ marginTop: 12, gap: 20 }}>
          <div>
            <label className="field">Language of new recordings</label>
            <div className="chips">
              {LANGS.map(([id, l]) => (
                <button key={id} className={`chip ${lang === id ? 'on' : ''}`} onClick={() => setLang(id)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field">Language the patient hears</label>
            <div className="chips">
              {LANGS.map(([id, l]) => (
                <button
                  key={id}
                  className={`chip ${(state.cueLanguage || 'en') === id ? 'on' : ''}`}
                  onClick={async () => {
                    await api.setKey('cueLanguage', id, 'physio');
                    refresh();
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {CUE_TAGS.map((t) => (
        <Card key={t.id} tight>
          <div className="row between wrap">
            <div className="grow" style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 700 }}>{t.label}</div>
              <div className="tiny muted">{t.hint}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="text"
                placeholder="What you say (shown as caption)"
                value={captions[t.id] || ''}
                onChange={(e) => setCaptions({ ...captions, [t.id]: e.target.value })}
                style={{ width: 210 }}
              />
              <button className={`btn small ${recTag === t.id ? 'danger rec' : 'primary'}`} onClick={() => toggleRec(t.id)} disabled={busy || (recTag && recTag !== t.id)}>
                <span className="row">
                  <Icon name="mic" size={14} />
                  {recTag === t.id ? 'Stop' : 'Record'}
                </span>
              </button>
              <label className="btn small" style={{ cursor: 'pointer' }}>
                Upload
                <input
                  type="file"
                  accept="audio/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && addClip(t.id, e.target.files[0], e.target.files[0].name)}
                />
              </label>
            </div>
          </div>
          {(cues[t.id] || []).length > 0 && (
            <ul className="list-clean" style={{ marginTop: 6 }}>
              {cues[t.id].map((c, i) => (
                <li key={c.mediaId} className="row between small" style={{ padding: '6px 0' }}>
                  <div className="row grow">
                    <audio controls preload="none" src={mediaUrl(c.mediaId)} style={{ height: 34, maxWidth: 240 }} />
                    <span className="badge plain">{c.lang || 'any'}</span>
                    <span className="muted">{c.text}</span>
                  </div>
                  <button className="btn small ghost" onClick={() => remove(t.id, i)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reference videos: a healthy-person reference + the patient's own room clip.
// ---------------------------------------------------------------------------
export function VideoStudio({ state, refresh, toast }) {
  const [busy, setBusy] = useState('');
  const [rec, setRec] = useState(null); // {ex, kind}
  const mr = useRef(null);
  const chunks = useRef([]);
  const preview = useRef(null);

  const setVideo = async (ex, kind, blob, name) => {
    setBusy(`${ex}-${kind}`);
    try {
      const up = await api.upload(blob, { kind: 'video', name });
      const next = { ...state.refVideos, [ex]: { ...(state.refVideos[ex] || {}), [kind]: up.id } };
      await api.setKey('refVideos', next, 'physio');
      await refresh();
      toast('Video saved');
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy('');
    }
  };

  const toggleRecord = async (ex, kind) => {
    if (rec && rec.ex === ex && rec.kind === kind) {
      mr.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      if (preview.current) {
        preview.current.srcObject = stream;
        preview.current.play().catch(() => {});
      }
      const r = new MediaRecorder(stream);
      mr.current = r;
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (preview.current) preview.current.srcObject = null;
        setRec(null);
        setVideo(ex, kind, new Blob(chunks.current, { type: r.mimeType || 'video/webm' }), `${ex}-${kind}.webm`);
      };
      r.start();
      setRec({ ex, kind });
    } catch {
      toast('Camera not available on this page');
    }
  };

  const KINDS = [
    ['stock', 'Reference: a healthy person doing it correctly', 'Film a colleague or volunteer once. The patient sees how it should look.'],
    ['home', "This patient's own set-up", "Film the patient doing it in THEIR room, on THEIR bed, with THEIR pillow, while you guide them."],
  ];

  return (
    <div className="stack">
      <Card>
        <h2 style={{ margin: 0 }}>Reference videos</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Healthy-person reference videos and the patient’s home video are kept separately. Heel slides have separate references for doing it alone and with help.
        </p>
        <video ref={preview} muted playsInline style={{ width: '100%', maxHeight: rec ? 260 : 0, borderRadius: 10, marginTop: rec ? 10 : 0, background: '#000' }} />
      </Card>
      {Object.values(EXERCISES).filter(ex => ex.id === 'heel_slide').map((ex) => (
        <Card key={ex.id} title={ex.name}>
          <div className="grid two">
            {(ex.id === 'heel_slide' ? [['stock_active','Reference: heel slide on your own','Healthy-person demonstration, without assistance.'],['stock_assisted','Reference: heel slide with help','Healthy-person demonstration, with assistance.'],KINDS[1]] : KINDS).map(([kind, title, hint]) => {
              const id = state.refVideos?.[ex.id]?.[kind];
              const isRec = rec && rec.ex === ex.id && rec.kind === kind;
              return (
                <div key={kind}>
                  <div style={{ fontWeight: 700 }} className="small">
                    {title}
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 6 }}>
                    {hint}
                  </div>
                  {id ? (
                    <video src={mediaUrl(id)} controls playsInline preload="metadata" style={{ width: '100%', borderRadius: 10, background: '#0b1718' }} />
                  ) : (
                    <div className="muted small" style={{ border: '1px dashed var(--line)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                      Nothing yet
                    </div>
                  )}
                  <div className="row wrap" style={{ marginTop: 8 }}>
                    <label className="btn small" style={{ cursor: 'pointer' }}>
                      {busy === `${ex.id}-${kind}` ? 'Uploading…' : 'Upload a video'}
                      <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && setVideo(ex.id, kind, e.target.files[0], e.target.files[0].name)} />
                    </label>
                    <button className={`btn small ${isRec ? 'danger rec' : ''}`} onClick={() => toggleRecord(ex.id, kind)} disabled={rec && !isRec}>
                      {isRec ? 'Stop recording' : 'Record now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan: reps, holds, pillow stage, precautions.
// ---------------------------------------------------------------------------
export function PlanStudio({state,refresh,toast}) {
 const [plan,setPlan]=useState(()=>structuredClone(state.plan));
 const [busy,setBusy]=useState(false),[catalogueSearch,setCatalogueSearch]=useState('');
 const ex=plan.exercises.find(e=>e.id==='heel_slide')||{id:'heel_slide',reps:8,holdSec:2,modesEnabled:[]};
 const modes=ex.modesEnabled||['active','assisted'];
 const patch=changes=>setPlan({...plan,exercises:[{...ex,...changes}]});
 const setMode=(mode,changes)=>patch({modeSettings:{...ex.modeSettings,[mode]:{...ex.modeSettings?.[mode],...changes,targetFlexion:null}}});
 async function save(){const error=movementPlanError(plan);if(error){toast(error);return;}setBusy(true);try{await api.setKey('plan',plan,'physio');await refresh();toast('Exercise plan saved.');}catch(e){toast(e.message);}finally{setBusy(false);}}
 return <div className="stack"><div className="grid two">{[['active','Heel slide — unassisted'],['assisted','Heel slide — assisted']].map(([mode,label])=>{const settings={...ex,...ex.modeSettings?.[mode]};const added=modes.includes(mode);return <Card key={mode}><div className="row between"><h2>{label}</h2><button className="btn" aria-label={`${added?'Remove':'Add'} ${label}`} aria-pressed={added} onClick={()=>patch({modesEnabled:added?modes.filter(m=>m!==mode):[...modes,mode]})}>{added?'−':'+'}</button></div><p className="small muted">{added?'Assigned to this patient':'Not assigned'}</p>{added&&<div className="stack">{[['reps','Repetitions',1,30],['holdSec','Hold (seconds)',1,30],['maxFlexion','Maximum bend (degrees)',30,150]].map(([key,name,min,max])=><label className="field" key={key}>{name}<input aria-label={`${label}: ${name}`} type="number" min={min} max={max} value={settings[key]??''} placeholder={key==='maxFlexion'?'If prescribed':''} onChange={e=>setMode(mode,{[key]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div>}</Card>;})}</div><Card title="Exercise catalogue"><label className="field">Search exercise names<input type="search" placeholder="Try ankle, quadriceps, walking…" value={catalogueSearch} onChange={e=>setCatalogueSearch(e.target.value)}/></label><p className="small muted">These are future exercise cards. No video or tracking is available yet; they do not launch an exercise.</p><div className="grid two">{EXERCISE_CATALOGUE.filter(e=>e.name.toLowerCase().includes(catalogueSearch.toLowerCase())).map(e=><div className="catalogue-card" key={e.id}><b>{e.name}</b><button type="button" className="btn" aria-label={`${plan.catalogueIds?.includes(e.id)?'Remove':'Add'} ${e.name}`} onClick={()=>setPlan({...plan,catalogueIds:plan.catalogueIds?.includes(e.id)?plan.catalogueIds.filter(id=>id!==e.id):[...(plan.catalogueIds||[]),e.id]})}>{plan.catalogueIds?.includes(e.id)?'−':'+'}</button></div>)}</div></Card><button className="btn primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save plan'}</button></div>;
}

// ---------------------------------------------------------------------------
// Playbook: the physio's if-then rules, thresholds and response times.
// ---------------------------------------------------------------------------
export function PlaybookStudio({ state, refresh, toast }) {
  const [pb, setPb] = useState(() => structuredClone(state.playbook));
  const t = pb.thresholds;
  const setT = (k, v) => setPb({ ...pb, thresholds: { ...pb.thresholds, [k]: Number(v) } });
  const setSla = (k, v) => setPb({ ...pb, sla: { ...pb.sla, [k]: Number(v) } });
  const setRule = (id, patch) => setPb({ ...pb, symptomRules: { ...pb.symptomRules, [id]: { ...pb.symptomRules[id], ...patch } } });
  const setMs = (i, patch) => setPb({ ...pb, milestones: pb.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) });

  const save = async () => {
    await api.setKey('playbook', { ...pb, authoredBy: 'Physio (reviewed)' }, 'physio');
    await refresh();
    toast('Playbook saved and live');
  };

  const THRESH = [
    ['assistGapWarn', 'Active far below assisted by (deg)', 'Over 3 days: patient is holding back'],
    ['quadLagWarn', 'Quad lag warning (deg)', 'Extension deficit during straight leg raise'],
    ['quadLagReady', 'Lag low enough to suggest removing the pillow (deg)', 'You always approve the change'],
    ['regressionDeg', "Today's range below recent best by (deg)", 'Regression flag'],
    ['missedDaysReview', 'Days without exercise before a review', ''],
    ['painReview', 'Pain score that needs a review', 'out of 10'],
    ['painUrgent', 'Pain score that is urgent', 'out of 10'],
  ];
  const SLA = [
    ['urgentAckMin', 'Urgent: must be acknowledged within (min)'],
    ['reviewAckMin', 'Review: must be acknowledged within (min)'],
    ['urgentResolveMin', 'Urgent: must be resolved within (min)'],
    ['reviewResolveMin', 'Review: must be resolved within (min)'],
    ['followUpMin', 'Ask the patient "did that help?" after (min)'],
  ];

  return (
    <div className="stack">
      <div className="callout review small">
        These rules decide <b>who sees a concern and how fast</b>. They never decide that something is safe. The starting rules are a template: review every line before real use.
      </div>
      <Card title="Thresholds">
        <div className="grid three">
          {THRESH.map(([k, label, hint]) => (
            <div key={k}>
              <label className="field">{label}</label>
              <input type="number" value={t[k]} onChange={(e) => setT(k, e.target.value)} />
              {hint && <div className="tiny muted">{hint}</div>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Expected knee bend by day after surgery (your milestones)">
        <div className="grid three">
          {pb.milestones.map((m, i) => (
            <div key={i} className="row">
              <div className="grow">
                <label className="field">Day</label>
                <input type="number" value={m.day} onChange={(e) => setMs(i, { day: +e.target.value })} />
              </div>
              <div className="grow">
                <label className="field">Bend (deg)</label>
                <input type="number" value={m.flex} onChange={(e) => setMs(i, { flex: +e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Response times (the care chain climbs when these pass)">
        <div className="grid three">
          {SLA.map(([k, label]) => (
            <div key={k}>
              <label className="field">{label}</label>
              <input type="number" value={pb.sla[k]} onChange={(e) => setSla(k, e.target.value)} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="If the patient reports… (your rules)">
        <div className="stack">
          {SYMPTOMS.map((s) => {
            const r = pb.symptomRules[s.id];
            if (!r) return null;
            return (
              <div key={s.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
                <div className="row between wrap">
                  <b className="small">{s.label}</b>
                  <select value={r.tier} onChange={(e) => setRule(s.id, { tier: e.target.value })} style={{ width: 130 }}>
                    <option value="urgent">Urgent</option>
                    <option value="review">Review</option>
                    <option value="fyi">FYI</option>
                  </select>
                </div>
                <label className="field" style={{ marginTop: 6 }}>
                  What the patient is told (one per line)
                </label>
                <textarea value={(r.guidance || []).join('\n')} onChange={(e) => setRule(s.id, { guidance: e.target.value.split('\n').filter((l) => l.trim()) })} style={{ minHeight: 60 }} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Words in free text that raise the level (never lower it)">
        <label className="field">Urgent words (comma separated)</label>
        <input type="text" value={pb.keywords.urgent.join(', ')} onChange={(e) => setPb({ ...pb, keywords: { ...pb.keywords, urgent: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} />
        <label className="field" style={{ marginTop: 8 }}>
          Review words
        </label>
        <input type="text" value={pb.keywords.review.join(', ')} onChange={(e) => setPb({ ...pb, keywords: { ...pb.keywords, review: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} />
      </Card>
      <div className="row">
        <button className="btn primary" onClick={save}>
          Save playbook
        </button>
        <button className="btn" onClick={() => setPb(structuredClone(DEFAULT_PLAYBOOK))}>
          Reset to template
        </button>
      </div>
    </div>
  );
}
