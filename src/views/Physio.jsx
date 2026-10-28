import { useMemo, useState } from 'react';
import { EXERCISES } from '../../shared/exercises.js';
import { analyze, expectedFlexion } from '../../shared/objective.js';
import { dayIndex, dayPostOp, fmtDay, fmtTime } from '../../shared/time.js';
import { heelChart, lsi, relTime, slrChart } from '../lib/data.js';
import { mediaUrl } from '../lib/api.js';
import { Card, LegFigure, Lightbox, LineChart, Stat, TierBadge, Toast, useToast } from '../components/ui.jsx';
import { CueStudio, PlanStudio, PlaybookStudio, VideoStudio } from './Studio.jsx';
import Validate from './Validate.jsx';

export default function Physio({ store }) {
  const { state, now, refresh } = store;
  const [tab, setTab] = useState('overview');
  const toast = useToast();
  const analysis = useMemo(
    () => analyze({ sessions: state.sessions, now: now(), surgeryTs: state.patient.surgeryTs, playbook: state.playbook }),
    [state, now],
  );
  const TABS = [
    ['overview', 'Patient overview'],
    ['cues', 'My voice'],
    ['videos', 'Videos'],
    ['plan', 'Plan'],
    ['playbook', 'My rules'],
    ['validate', 'Accuracy check'],
  ];
  return (
    <main className="page">
      <div className="tabs">
        {TABS.map(([id, l]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview state={state} now={now} analysis={analysis} />}
      {tab === 'cues' && <CueStudio state={state} refresh={refresh} toast={toast.show} />}
      {tab === 'videos' && <VideoStudio state={state} refresh={refresh} toast={toast.show} />}
      {tab === 'plan' && <PlanStudio state={state} refresh={refresh} toast={toast.show} suggestions={analysis.suggestions} />}
      {tab === 'validate' && <Validate />}
      {tab === 'playbook' && <PlaybookStudio state={state} refresh={refresh} toast={toast.show} />}
      <Toast msg={toast.msg} onDone={toast.clear} />
    </main>
  );
}

// What the pattern in the data suggests. Words are for the physio, not the patient.
function verdict(state, analysis, dp) {
  const f = analysis.flags;
  const gap = f.find((x) => x.type === 'holding_back');
  const stiff = f.find((x) => x.type === 'possible_stiffness');
  if (stiff) return { kind: 'urgent', title: "Can't: possible mechanical stiffness", text: stiff.detail, action: 'Consider early review by the surgeon: manipulation works best early. More exercise alone is unlikely to help.' };
  if (gap) return { kind: 'review', title: "Won't (yet): the patient is holding back", text: gap.detail, action: 'The knee has more range than the patient uses. Coach and reassure, use your voice, and look at pain and fear before adding stiffness work.' };
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

  const recent = [...state.sessions].sort((a, b) => b.ts - a.ts).slice(0, 6);
  const xLabel = (x) => `Day ${x}`;

  return (
    <div className="stack">
      <Card>
        <div className="row between wrap">
          <div>
            <h1 style={{ margin: 0 }}>{state.patient.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {state.patient.procedure} · day {dp} · {state.patient.age} years · surgery {fmtDay(sx)}
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
            A large gap means the knee can bend more than the patient dares to. A small gap with low numbers means the knee itself is stiff.
          </p>
        </Card>
      </div>

      <details className="more">
        <summary>More charts (leg raise, confidence and pain)</summary>
      <div className="grid two" style={{ marginTop: 8 }}>
        <Card title="Quad lag (straight leg raise): knee deficit at the top">
          <LineChart
            series={[
              { name: 'Active', color: '#0f766e', points: slr.active },
              { name: 'Assisted', color: '#6d5bd0', points: slr.assisted, dashed: true },
            ]}
            hLines={[
              { y: t.quadLagWarn, label: `warn ${t.quadLagWarn}°`, color: '#a15c07' },
              { y: t.quadLagReady, label: `ready to progress ${t.quadLagReady}°`, color: '#17803d' },
            ]}
            annotations={slr.switchDay != null ? [{ x: slr.switchDay, label: 'pillow removed' }] : []}
            yMin={0}
            xLabel={xLabel}
          />
        </Card>
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
                  {EXERCISES[s.exercise].name} · {s.mode}
                </b>
                <span className="tiny muted">
                  {fmtDay(s.ts)} {fmtTime(s.ts)}
                </span>
              </div>
              <div className="tiny muted">
                best {Math.round(s.metrics?.peak || 0)}°{s.metrics?.deficit != null ? ` · lag ${Math.round(s.metrics.deficit)}°` : ''} · {s.cameraSource === 'seed' ? 'synthetic history' : s.cameraSource === 'sim' ? 'simulated leg' : 'camera'}
                {s.selfReport ? ` · felt ${s.selfReport.confidence}/5, pain ${s.selfReport.pain}` : ''}
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
                <span className="muted">{relTime(a.ts, now())}</span> · {a.by}: {a.text}
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
