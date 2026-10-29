import { useMemo, useState } from 'react';
import { EXERCISES, heelSlideTasks, exerciseTaskDone } from '../../shared/exercises.js';
import { analyze, expectedFlexion } from '../../shared/objective.js';
import { dayIndex, dayPostOp, fmtDay, fmtTime } from '../../shared/time.js';
import { heelChart, lsi, relTime, slrChart } from '../lib/data.js';
import { mediaUrl } from '../lib/api.js';
import { Card, LegFigure, Lightbox, LineChart, Stat, TierBadge, Toast, useToast } from '../components/ui.jsx';
import { CueStudio, PlanStudio, PlaybookStudio, VideoStudio } from './Studio.jsx';
import Connections from './Connections.jsx';
import FirstFortnight from './FirstFortnight.jsx';
import ClinicalMessages from '../components/ClinicalMessages.jsx';
import Validate from './Validate.jsx';

export default function Physio({store,assistant=false}) {
 const {state,now,refresh}=store;
 const [selected,setSelected]=useState(false),[tab,setTab]=useState('today');
 const [search,setSearch]=useState(''),[chat,setChat]=useState(false);
 const toast=useToast();
 const analysis=useMemo(()=>analyze({sessions:state.sessions.filter(s=>s.exercise==='heel_slide'&&!s.isTestSession),now:now(),surgeryTs:state.patient.surgeryTs,playbook:state.playbook}),[state,now]);
 const open=state.issues.filter(i=>i.status!=='resolved');
 if(!selected)return <main className="page"><div className="stack"><div><p className="eyebrow">{assistant?'Assistant surgeon':'Physiotherapist'}</p><h1>Assigned patients</h1><p className="muted">Open a patient to see their recovery and care plan.</p></div><label className="field">Search patients<input type="search" placeholder="Patient name" value={search} onChange={e=>setSearch(e.target.value)}/></label>{!state.patient.name.toLowerCase().includes(search.toLowerCase())?<p>No matching patients.</p>:<button className="assigned-patient card" onClick={()=>setSelected(true)}><span className="patient-avatar">{state.patient.name.charAt(0)}</span><span className="grow"><b>{state.patient.name}</b><span className="muted">{state.patient.procedure}</span><span className="small">{open.length?`${open.length} messages to review`:'No messages waiting'}</span></span><span aria-hidden="true">›</span></button>}<p className="tiny muted">One assigned patient in this prototype.</p></div></main>;
 const tabs=assistant?[['today','Today'],['appointments','Appointments'],['alerts','Alerts'],['summary','Summary']]:[['today','Today'],['plan','Exercise plan'],['alerts','Alerts'],['summary','Summary']];
 return <main className="page"><div className="stack"><button className="link-btn back-link" onClick={()=>{setSelected(false);setTab('today');}}>‹ Assigned patients</button><div><h1>{state.patient.name}</h1><p className="muted">{state.patient.procedure}</p></div><div className="tabs">{tabs.map(([id,label])=><button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}</div>
 {tab==='today'&&<TodayActivity store={store}/>}
 {tab==='alerts'&&<PatientAlerts store={store}/>}
 {tab==='summary'&&<SimpleSummary store={store} onMessages={()=>setChat(true)}/>}
 <button className="btn primary" onClick={()=>setChat(true)}>Patient messages</button>
 {chat&&<div className="chat-backdrop" onClick={()=>setChat(false)}><section className="chat-dialog" role="dialog" aria-modal="true" aria-label="Patient conversation" onKeyDown={e=>{if(e.key==='Escape')setChat(false);if(e.key==='Tab'){const items=[...e.currentTarget.querySelectorAll('button,input,textarea')].filter(el=>!el.disabled);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}} onClick={e=>e.stopPropagation()}><button className="btn" autoFocus onClick={()=>setChat(false)}>Close conversation</button><ClinicalMessages store={store}/></section></div>}
 {tab==='appointments'&&<FirstFortnight store={store}/>}


 {tab==='plan'&&<PlanStudio state={state} refresh={refresh} toast={toast.show} suggestions={[]}/>}
 {!assistant&&<details className="more"><summary>More tools: my voice, videos and measurement check</summary><div className="chips">{[['cues','My voice'],['videos','Reference videos'],['validate','Measurement check'],['playbook','Routing rules']].map(([id,label])=><button className={`chip ${tab===id?'on':''}`} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='cues'&&<CueStudio state={state} refresh={refresh} toast={toast.show}/>} {tab==='videos'&&<VideoStudio state={state} refresh={refresh} toast={toast.show}/>} {tab==='validate'&&<Validate/>}{tab==='playbook'&&<PlaybookStudio state={state} refresh={refresh} toast={toast.show}/>}</details>}
 </div><Toast msg={toast.msg} onDone={toast.clear}/></main>;
}
const localDay=ts=>new Date(ts).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
function TodayActivity({store}){
 const {state,now}=store;
 const today=localDay(now());
 const sessions=state.sessions.filter(s=>localDay(s.ts)===today);
 const login=state.activity?.patientLastLogin;
 return <div className="stack"><Card title="Has my patient logged in today?"><h2>{login&&localDay(login)===today?'Yes':'No login recorded today'}</h2>{login&&<p>Last login: {new Date(login).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>}</Card><Card title="Today’s exercises">{['active','assisted'].map(mode=>{const records=sessions.filter(s=>s.mode===mode);const task=heelSlideTasks(state.plan).find(t=>t.mode===mode);const done=task&&records.some(s=>exerciseTaskDone(s,task));return <div key={mode}><h3>Heel slide — {mode==='active'?'unassisted':'assisted'}</h3><p><b>{!task?'Not assigned':done?'Completed today':'Not completed today'}</b></p><p>{records.length?`${records.reduce((n,s)=>n+(s.reps?.filter(r=>r.complete).length||0),0)} full repetitions saved`:'No exercise saved today'}</p>{records.some(s=>s.isTestSession)&&<p className="small muted">Includes practice on the other knee; this does not complete the prescribed exercise.</p>}<div className="grid two">{records.flatMap(s=>(s.screenshotIds||[]).map(id=><img key={id} className="shot" src={mediaUrl(id)} alt="Today’s saved exercise"/>))}</div></div>;})}<p className="small muted">Pictures are saved session evidence. A picture alone does not confirm a full exercise was completed.</p></Card></div>;
}
function PatientAlerts({store}){
 const {state,now}=store;
 const sessions=state.sessions.filter(s=>!s.isTestSession&&s.ts>=state.patient.surgeryTs);
 const missed=heelSlideTasks(state.plan).filter(task=>now()-Math.max(state.patient.surgeryTs,...sessions.filter(s=>exerciseTaskDone(s,task)).map(s=>s.ts))>2*86400000);
 const limits=(state.exerciseAlerts||[]).filter(a=>!a.isTestSession);
 const savedLimits=sessions.filter(s=>s.limitEvents?.some(e=>e.state==='limit')&&!limits.some(a=>Math.abs(a.ts-s.ts)<s.durationS*1000+60000));
 return <Card title="Alerts">{missed.map(task=><p className="callout review" key={task.key}>{task.name}: not completed for more than 2 days.</p>)}{[...limits,...savedLimits].map(s=><p className="callout urgent" key={s.id}>Camera estimate crossed maximum bend — {s.mode==='assisted'?'assisted':'unassisted'} heel slide · {new Date(s.ts).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>)}{!missed.length&&!limits.length&&!savedLimits.length&&<p>No missed-exercise or maximum-bend alerts.</p>}</Card>;
}
function SimpleSummary({store,onMessages}) {
 const {state,now}=store;
 const latest=mode=>[...state.sessions].filter(s=>s.exercise==='heel_slide'&&!s.isTestSession&&s.ts>=state.patient.surgeryTs&&s.mode===mode&&s.metrics?.peak!=null).sort((a,b)=>b.ts-a.ts)[0];
 const appointments=state.care.appointments.filter(a=>a.at>=now()-86400000).sort((a,b)=>a.at-b.at);
 const issues=state.issues.filter(i=>i.status!=='resolved');
 return <div className="stack"><Card title="Recovery at a glance"><p>Day {dayPostOp(now(),state.patient.surgeryTs)} after surgery</p><div className="grid two">{[['active','Latest unassisted bend'],['assisted','Latest assisted bend']].map(([mode,label])=>{const session=latest(mode);return <div className="simple-metric" key={mode}><span>{label}</span><strong>{session?`${Math.round(session.metrics.peak)}°`:'No reading yet'}</strong><small>Camera estimate · not a clinical measurement</small></div>;})}</div></Card><Card title="Messages"><p>{issues.length?`${issues.length} messages are waiting for review.`:'No messages are waiting for review.'}</p><button className="btn primary" onClick={onMessages}>Open patient messages</button></Card><Card title="Next appointment">{appointments[0]?<><h3>{appointments[0].title}</h3><p>{new Date(appointments[0].at).toLocaleDateString('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'})}</p><p>{appointments[0].place}</p></>:<p>The assistant surgeon has not added the next date yet.</p>}</Card><details className="more"><summary>Recent exercise pictures</summary><div className="grid two">{[...state.sessions].filter(s=>s.exercise==='heel_slide'&&s.screenshotIds?.length).slice(-4).reverse().map(s=><Card key={s.id}><p>{s.mode==='active'?'Unassisted':'Assisted'} heel slide</p><img className="shot" src={mediaUrl(s.screenshotIds[0])} alt="Saved exercise moment"/></Card>)}</div></details></div>;
}

// What the pattern in the data suggests. Words are for the physio, not the patient.
function verdict(state, analysis, dp) {
  const f = analysis.flags;
  const gap = f.find((x) => x.type === 'holding_back');
  const stiff = f.find((x) => x.type === 'possible_stiffness');
  if (stiff) return { kind: 'urgent', title: "Can't: possible mechanical stiffness", text: stiff.detail, action: 'Consider early review by the surgeon: manipulation works best early. More exercise alone is unlikely to help.' };
  if (gap) return { kind: 'review', title: "Active and assisted movement differ", text: gap.detail, action: 'Review pain, technique and recording quality with the patient before deciding what the difference means.' };
  const hs = heelChart(state.sessions, state.patient.surgeryTs);
  if (!hs.rows.length) return { kind: 'fyi', title: 'Not enough data yet', text: 'Needs a few days with active and assisted sessions.', action: '' };
  return { kind: 'ok', title: 'On track', text: `Active and assisted ranges are moving together and are near the day-${dp} milestone.`, action: 'Nothing to do. Keep the plan.' };
}

function Overview({ state, now, analysis }) {
  const sx = state.patient.surgeryTs;
  const dp = dayPostOp(now(), sx);
  const hs = heelChart(state.sessions, sx);
  const slr = slrChart(state.sessions, sx);
  const t = state.playbook.thresholds;
  const target = Math.round(expectedFlexion(dp, state.playbook.milestones));
  const v = verdict(state, analysis, dp);
  const [lightbox, setLightbox] = useState(null);

  const gapPts = hs.rows.filter((r) => r.active != null && r.assisted != null).map((r) => ({ x: r.day - dayIndex(sx), y: Math.round((r.assisted - r.active) * 10) / 10 }));
  const open = state.issues.filter((i) => i.status !== 'resolved');
  const selfByDay = new Map();
  for (const s of state.sessions) {
    if (!s.selfReport) continue;
    const d = dayIndex(s.ts) - dayIndex(sx);
    const row = selfByDay.get(d) || { c: [], p: [] };
    row.c.push(s.selfReport.confidence);
    row.p.push(s.selfReport.pain);
    selfByDay.set(d, row);
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const conf = [...selfByDay.entries()].map(([x, r]) => ({ x, y: Math.round(avg(r.c) * 10) / 10 }));
  const pain = [...selfByDay.entries()].map(([x, r]) => ({ x, y: Math.round(avg(r.p) * 10) / 10 }));

  const recent = [...state.sessions].filter(s => s.exercise === 'heel_slide').sort((a, b) => b.ts - a.ts).slice(0, 6);
  const xLabel = (x) => `Day ${x}`;

  return (
    <div className="stack">
      <Card>
        <div className="row between wrap">
          <div>
            <h1 style={{ margin: 0 }}>{state.patient.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {state.patient.procedure}  /  day {dp}  /  {state.patient.age} years  /  surgery {fmtDay(sx)}
            </p>
          </div>
          <div className="row" style={{ gap: 24 }}>
            <Stat n={open.filter((i) => i.tier === 'urgent').length} l="urgent" color="var(--urgent)" />
            <Stat n={open.filter((i) => i.tier === 'review').length} l="to review" color="var(--review)" />
            <Stat n={open.filter((i) => i.tier === 'fyi').length} l="FYI" color="var(--fyi)" />
          </div>
        </div>
      </Card>

      <div className={`callout ${v.kind === 'ok' ? '' : v.kind}`}>
        <div className="row between wrap">
          <b style={{ fontSize: '1.05rem' }}>{v.title}</b>
          <span className="tiny muted">what the data suggests, for your judgement</span>
        </div>
        <p style={{ margin: '6px 0 4px' }}>{v.text}</p>
        {v.action && (
          <p style={{ margin: 0 }}>
            <b>Suggested response:</b> {v.action}
          </p>
        )}
      </div>

      {analysis.flags.length > 0 && (
        <Card title="Data-driven flags (the patient did not have to say anything)">
          <ul className="list-clean">
            {analysis.flags.map((f) => (
              <li key={f.key}>
                <div className="row between">
                  <b className="small">{f.title}</b>
                  <TierBadge tier={f.tier} />
                </div>
                <div className="small muted">{f.detail}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid two">
        <Card title="Knee bend: active vs assisted (heel slide)">
          <LineChart
            series={[
              { name: 'Active (alone)', color: '#0f766e', points: hs.active },
              { name: 'Assisted (strap / helper)', color: '#6d5bd0', points: hs.assisted, dashed: true },
            ]}
            hLines={[{ y: target, label: `milestone ≈ ${target}°`, color: '#a15c07' }]}
            xLabel={xLabel}
          />
        </Card>
        <Card title="The gap: assisted minus active">
          <LineChart
            series={[{ name: 'Gap (degrees)', color: '#b42318', points: gapPts }]}
            hLines={[{ y: t.assistGapWarn, label: `warn at ${t.assistGapWarn}°`, color: '#a15c07' }]}
            yMin={0}
            xLabel={xLabel}
          />
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            A difference between active and assisted readings needs a physio to review pain, technique and recording quality. The camera cannot identify the cause.
          </p>
        </Card>
      </div>

      <details className="more">
        <summary>Confidence and pain</summary>
      <div className="grid two" style={{ marginTop: 8 }}>
        <Card title="Patient's own report: confidence and pain">
          <LineChart
            series={[
              { name: 'Confidence (1-5)', color: '#1d5fc4', points: conf },
              { name: 'Pain (0-10)', color: '#b42318', points: pain, dashed: true },
            ]}
            yMin={0}
            yMax={10}
            unit=""
            xLabel={xLabel}
          />
        </Card>
      </div>
      </details>

      <Card title="Recent sessions and peak moments">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {recent.map((s) => (
            <div key={s.id} className="card flat tight">
              <button style={{ all: 'unset', cursor: 'zoom-in', display: 'block', width: '100%' }} onClick={() => setLightbox(s)} aria-label="Enlarge">
                {s.screenshotIds?.[0] ? (
                  <img className="shot" src={mediaUrl(s.screenshotIds[0])} alt="Peak moment" loading="lazy" />
                ) : (
                  <LegFigure exercise={s.exercise} value={s.metrics?.peak || 0} deficit={s.metrics?.deficit || 0} stage={s.stage} />
                )}
              </button>
              <div className="row between" style={{ marginTop: 8 }}>
                <b className="small">
                  {EXERCISES[s.exercise].name}  /  {s.mode}
                </b>
                <span className="tiny muted">
                  {fmtDay(s.ts)} {fmtTime(s.ts)}
                </span>
              </div>
              <div className="tiny muted">
                best {Math.round(s.metrics?.peak || 0)}°{s.metrics?.deficit != null ? `  /  lag ${Math.round(s.metrics.deficit)}°` : ''}  /  {s.cameraSource === 'seed' ? 'synthetic history' : s.cameraSource === 'sim' ? 'simulated leg' : 'camera'}
                {s.selfReport ? `  /  felt ${s.selfReport.confidence}/5, pain ${s.selfReport.pain}` : ''}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <details className="more">
        <summary>Clinic test results (example data)</summary>
      <Card title="Clinic testing alongside the home data">
        <p className="small muted" style={{ marginTop: 0 }}>
          {state.clinicBaseline.note} ({state.clinicBaseline.source}, {state.clinicBaseline.date}).
        </p>
        <table className="tbl">
          <thead>
            <tr>
              <th>Test</th>
              <th>Left</th>
              <th>Right</th>
              <th>Left as % of right</th>
            </tr>
          </thead>
          <tbody>
            {state.clinicBaseline.rows.map((r) => {
              const p = lsi(r.left, r.right, r.lowerIsBetter);
              return (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>
                    {r.left} {r.unit}
                  </td>
                  <td>
                    {r.right} {r.unit}
                  </td>
                  <td>
                    <span className={`badge ${p >= 90 ? 'ok' : p >= 75 ? 'review' : 'urgent'}`}>{p}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      </details>

      <details>
        <summary className="small muted" style={{ cursor: 'pointer' }}>
          Activity log
        </summary>
        <ul className="list-clean small">
          {[...state.audit]
            .reverse()
            .slice(0, 30)
            .map((a) => (
              <li key={a.id}>
                <span className="muted">{relTime(a.ts, now())}</span>  /  {a.by}: {a.text}
              </li>
            ))}
        </ul>
      </details>

      {lightbox && (
        <Lightbox onClose={() => setLightbox(null)}>
          {lightbox.screenshotIds?.[0] ? (
            <img src={mediaUrl(lightbox.screenshotIds[0])} alt="Peak moment" style={{ width: '100%' }} />
          ) : (
            <LegFigure exercise={lightbox.exercise} value={lightbox.metrics?.peak || 0} deficit={lightbox.metrics?.deficit || 0} stage={lightbox.stage} />
          )}
        </Lightbox>
      )}
    </div>
  );
}
