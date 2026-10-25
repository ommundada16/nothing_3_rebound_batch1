import { useEffect, useState } from 'react';
import { CARE_LEVELS, SYMPTOMS } from '../../shared/constants.js';
import { EXERCISES } from '../../shared/exercises.js';
import { expectedFlexion, heelByDay, slrByDay } from '../../shared/objective.js';
import { dayPostOp, fmtDay, fmtTime } from '../../shared/time.js';
import { api, mediaUrl } from '../lib/api.js';
import { relTime } from '../lib/data.js';
import { Card, LegFigure, Lightbox, TierBadge, Toast, useToast } from '../components/ui.jsx';

const levelOf = (n) => CARE_LEVELS.find((l) => l.level === n);
const byName = (by) => (by === 'patient' ? 'Patient' : by === 'system' ? 'App' : levelOf(by)?.title || String(by));
const fmtLeft = (ms) => {
  const m = Math.round(Math.abs(ms) / 60000);
  const t = m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d`;
  return ms >= 0 ? `due in ${t}` : `overdue by ${t}`;
};

export default function Chain({ store }) {
  const { state, now, refresh } = store;
  const [level, setLevel] = useState(1);
  const [selId, setSelId] = useState(null);
  const toast = useToast();

  const open = state.issues.filter((i) => i.status !== 'resolved');
  const rank = { urgent: 0, review: 1, fyi: 2 };
  const sortIssues = (a, b) => rank[a.tier] - rank[b.tier] || (a.dueAt ?? 9e15) - (b.dueAt ?? 9e15) || b.createdAt - a.createdAt;

  const mine = open.filter((i) => i.level === level && i.tier !== 'fyi').sort(sortIssues);
  const digest = open.filter((i) => i.level === level && i.tier === 'fyi').sort((a, b) => b.createdAt - a.createdAt);
  const cc = open.filter((i) => i.notifiedLevels.includes(level) && i.level !== level).sort(sortIssues);
  const resolved = state.issues.filter((i) => i.status === 'resolved').sort((a, b) => b.resolvedAt - a.resolvedAt);

  const sel = state.issues.find((i) => i.id === selId) || mine[0] || digest[0] || cc[0] || null;

  useEffect(() => {
    if (selId && !state.issues.some((i) => i.id === selId)) setSelId(null);
  }, [state, selId]);

  const countAt = (n) => open.filter((i) => i.level === n).length;
  const urgentAt = (n) => open.some((i) => i.level === n && i.tier === 'urgent');

  return (
    <main className="page">
      <div className="row between wrap" style={{ marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Care chain</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Every concern goes to the home physio first and moves up only when it needs to, or when nobody answers in time. View it as:
          </p>
        </div>
      </div>

      <div className="pipeline" role="tablist" aria-label="Care chain level">
        {CARE_LEVELS.map((l) => (
          <button key={l.level} role="tab" aria-selected={level === l.level} className={`node ${level === l.level ? 'active' : ''}`} onClick={() => { setLevel(l.level); setSelId(null); }}>
            <div style={{ fontWeight: 700 }}>
              {l.level}. {l.title}
            </div>
            <div className="tiny" style={{ opacity: 0.8, paddingRight: 24 }}>
              {l.blurb}
            </div>
            <span className="count" style={{ color: level === l.level ? 'inherit' : urgentAt(l.level) ? 'var(--urgent)' : 'inherit' }}>
              {countAt(l.level)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px, 380px) 1fr', alignItems: 'start' }}>
        <div className="stack">
          <h3 style={{ margin: 0 }}>With you now ({mine.length})</h3>
          {mine.length === 0 && <p className="muted small">Nothing waiting at this level.</p>}
          {mine.map((i) => (
            <IssueRow key={i.id} issue={i} now={now()} sel={sel?.id === i.id} onClick={() => setSelId(i.id)} />
          ))}

          {level === 1 && (
            <>
              <h3 style={{ margin: '10px 0 0' }}>Daily digest: handled by the app ({digest.length})</h3>
              <p className="tiny muted" style={{ margin: 0 }}>
                Low-level concerns the app answered with your playbook. You still see every one. Tell it when it got one wrong.
              </p>
              {digest.map((i) => (
                <IssueRow key={i.id} issue={i} now={now()} sel={sel?.id === i.id} onClick={() => setSelId(i.id)} />
              ))}
            </>
          )}

          {cc.length > 0 && (
            <>
              <h3 style={{ margin: '10px 0 0' }}>Copied to you ({cc.length})</h3>
              {cc.map((i) => (
                <IssueRow key={i.id} issue={i} now={now()} cc sel={sel?.id === i.id} onClick={() => setSelId(i.id)} />
              ))}
            </>
          )}

          {resolved.length > 0 && (
            <details>
              <summary className="small muted" style={{ cursor: 'pointer' }}>
                Resolved ({resolved.length})
              </summary>
              <div className="stack" style={{ marginTop: 8 }}>
                {resolved.map((i) => (
                  <IssueRow key={i.id} issue={i} now={now()} sel={sel?.id === i.id} onClick={() => setSelId(i.id)} />
                ))}
              </div>
            </details>
          )}
        </div>

        <div>
          {sel ? <Detail key={sel.id} issue={sel} level={level} state={state} now={now} refresh={refresh} toast={toast} /> : <p className="muted">Select a concern to see the detail.</p>}
        </div>
      </div>
      <Toast msg={toast.msg} onDone={toast.clear} />
    </main>
  );
}

function IssueRow({ issue, now, sel, onClick, cc }) {
  const left = issue.dueAt ? issue.dueAt - now : null;
  return (
    <div className={`issue ${sel ? 'sel' : ''} ${cc ? 'cc' : ''}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="row between">
        <TierBadge tier={issue.tier} />
        <span className="tiny muted">{relTime(issue.createdAt, now)}</span>
      </div>
      <div style={{ fontWeight: 700, margin: '6px 0 2px' }}>{issue.title}</div>
      <div className="row wrap tiny muted" style={{ gap: 8 }}>
        <span>{issue.source === 'system' ? 'Found in the data' : 'From the patient'}</span>
        <span>· {issue.status}</span>
        {cc && <span>· now with {levelOf(issue.level)?.title}</span>}
        {left != null && issue.status !== 'resolved' && !cc && (
          <span style={{ color: left < 0 ? 'var(--urgent)' : 'inherit', fontWeight: left < 0 ? 700 : 400 }}>· {fmtLeft(left)}</span>
        )}
      </div>
    </div>
  );
}

// "What changed": the latest home numbers next to your milestone.
function WhatChanged({ state, now }) {
  const sx = state.patient.surgeryTs;
  const dp = dayPostOp(now, sx);
  const hs = heelByDay(state.sessions);
  const slr = slrByDay(state.sessions);
  // Latest known value for a metric, and the value from at least 3 days earlier.
  const pick = (rows, key) => {
    const withVal = rows.filter((r) => r[key] != null);
    const last = withVal[withVal.length - 1];
    const prev = last ? [...withVal].reverse().find((r) => r.day <= last.day - 3) : null;
    return { last: last?.[key], prev: prev?.[key] };
  };
  const hsA = pick(hs, 'active');
  const hsS = pick(hs, 'assisted');
  const slrA = pick(slr, 'activeDeficit');
  const milestone = Math.round(expectedFlexion(dp, state.playbook.milestones));
  const latest = [...state.sessions].sort((a, b) => b.ts - a.ts)[0];
  const row = (label, a, b) => (
    <tr>
      <td>{label}</td>
      <td>{a}</td>
      <td>{b}</td>
    </tr>
  );
  const f = (v) => (v == null ? '–' : `${Math.round(v)}°`);
  return (
    <Card title="What changed" tight>
      <table className="tbl">
        <thead>
          <tr>
            <th />
            <th>3 days ago</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {row('Heel slide, active', f(hsA.prev), f(hsA.last))}
          {row('Heel slide, assisted', f(hsS.prev), f(hsS.last))}
          {row('Gap (assisted − active)', hsA.prev != null && hsS.prev != null ? f(hsS.prev - hsA.prev) : '–', hsA.last != null && hsS.last != null ? f(hsS.last - hsA.last) : '–')}
          {row('Leg raise, knee deficit (active)', f(slrA.prev), f(slrA.last))}
          {row(`Your milestone for day ${dp}`, '', `${milestone}°`)}
        </tbody>
      </table>
      {latest && (
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 150, flex: '0 0 150px' }}>
            {latest.screenshotIds?.[0] ? <img className="shot" src={mediaUrl(latest.screenshotIds[0])} alt="Latest peak" /> : <LegFigure exercise={latest.exercise} value={latest.metrics?.peak || 0} deficit={latest.metrics?.deficit || 0} stage={latest.stage} />}
          </div>
          <div className="small">
            <b>
              Latest: {EXERCISES[latest.exercise].name}, {latest.mode}
            </b>
            <div className="muted">
              {fmtDay(latest.ts)} {fmtTime(latest.ts)} · best {Math.round(latest.metrics?.peak || 0)}°
            </div>
            {latest.selfReport && (
              <div className="muted">
                Patient felt {latest.selfReport.confidence}/5 confident, pain {latest.selfReport.pain}/10
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Detail({ issue, level, state, now, refresh, toast }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [aiNote, setAiNote] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const mineNow = issue.level === level && issue.status !== 'resolved';
  const nowTs = now();
  const left = issue.dueAt ? issue.dueAt - nowTs : null;
  const next = levelOf(Math.min(4, issue.level + 1));

  const act = async (action, t) => {
    setBusy(true);
    try {
      await api.issueAction(issue.id, { action, byLevel: level, text: t });
      await refresh();
      if (action === 'reply') setText('');
      if (action === 'resolve') setNote('');
      toast.show(
        { ack: 'Acknowledged', reply: 'Reply sent to the patient', escalate: `Escalated to ${next.title}`, resolve: 'Resolved', wrong: 'Thanks, noted for the physio team' }[action],
      );
    } catch (e) {
      toast.show(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sym = (issue.symptoms || []).map((id) => SYMPTOMS.find((s) => s.id === id)?.label).filter(Boolean);

  return (
    <div className="stack">
      <Card>
        <div className="row between wrap">
          <div className="row wrap">
            <TierBadge tier={issue.tier} />
            <span className="badge plain">{issue.source === 'system' ? 'Found in the data' : 'From the patient'}</span>
            <span className="badge plain">{issue.status}</span>
            {issue.emergency && <span className="badge urgent">Emergency advised</span>}
          </div>
          <span className="tiny muted">
            raised {relTime(issue.createdAt, nowTs)} · with {levelOf(issue.level)?.title}
          </span>
        </div>
        <h2 style={{ margin: '10px 0 4px' }}>{issue.title}</h2>
        {left != null && issue.status !== 'resolved' && (
          <p className="small" style={{ margin: 0, color: left < 0 ? 'var(--urgent)' : 'var(--muted)', fontWeight: left < 0 ? 700 : 400 }}>
            {issue.status === 'new' ? 'Needs acknowledging' : 'Needs resolving'}: {fmtLeft(left)}. If not, it moves to {next.title}.
          </p>
        )}
      </Card>

      <Card title="Why it reached you" tight>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {issue.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          Sent to: {issue.notifiedLevels.map((n) => levelOf(n)?.title).join(', ')}. The app only chose who sees this and how fast.
        </p>
      </Card>

      {(issue.summary || sym.length > 0 || issue.photoId || issue.voiceId || issue.pain != null) && issue.source === 'patient' && (
        <Card title="What the patient reported" tight>
          {sym.length > 0 && (
            <div className="chips" style={{ marginBottom: 8 }}>
              {sym.map((s) => (
                <span key={s} className="badge plain">
                  {s}
                </span>
              ))}
            </div>
          )}
          {issue.pain != null && <p className="small" style={{ margin: '0 0 6px' }}>Pain: <b>{issue.pain}/10</b></p>}
          {issue.summary && <p style={{ margin: '0 0 8px' }}>"{issue.summary}"</p>}
          <div className="row wrap" style={{ alignItems: 'flex-start' }}>
            {issue.photoId && (
              <button style={{ all: 'unset', cursor: 'zoom-in' }} onClick={() => setLightbox(true)}>
                <img src={mediaUrl(issue.photoId)} alt="Patient's knee photo" style={{ width: 160, borderRadius: 10 }} />
              </button>
            )}
            {issue.voiceId && <audio controls src={mediaUrl(issue.voiceId)} style={{ maxWidth: '100%' }} />}
          </div>
        </Card>
      )}

      {issue.guidance.length > 0 && (
        <Card title="What the patient was told (from your playbook)" tight>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {issue.guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Card>
      )}

      <WhatChanged state={state} now={nowTs} />

      <Card title="Conversation" tight>
        <div className="thread">
          {issue.thread.map((t, i) => (
            <div key={i} className="small">
              <b>{byName(t.by)}</b> <span className="tiny muted">{relTime(t.ts, nowTs)}</span>
              <div>{t.text}</div>
            </div>
          ))}
        </div>
        {issue.followUpAnswer && <p className="tiny muted">Patient's follow-up answer: {issue.followUpAnswer}</p>}
      </Card>

      {mineNow ? (
        <Card title="Your response">
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <button className="btn" onClick={() => act('ack')} disabled={busy || issue.status !== 'new'}>
              Acknowledge
            </button>
            {next && issue.level < 4 && (
              <button className="btn" onClick={() => act('escalate', 'Needs a more senior look.')} disabled={busy}>
                Escalate to {next.title}
              </button>
            )}
            <button
              className="btn"
              onClick={async () => {
                const r = await api.aiNote(issue.id);
                setAiNote(r);
              }}
            >
              Draft handover note
            </button>
          </div>
          {aiNote && (
            <div className="callout small" style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>
              {aiNote.note}
              <div className="tiny muted">Source: {aiNote.source === 'groq' ? 'AI-polished' : 'template'}. Check before use.</div>
            </div>
          )}
          <label className="field">Reply to the patient</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Ice it for 20 minutes and skip hard exercise today. I will visit tomorrow morning." />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={() => act('reply', text)} disabled={busy || !text.trim()}>
              Send reply
            </button>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
          <label className="field">Resolve (needs a note on what was done; the app can never resolve for you)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Visited. Swelling settling. Continue plan." />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => act('resolve', note)} disabled={busy || !note.trim()}>
              Mark resolved
            </button>
            <button className="btn ghost" onClick={() => act('wrong', 'This should have been routed differently.')} disabled={busy}>
              Routing was wrong
            </button>
          </div>
        </Card>
      ) : issue.status === 'resolved' ? (
        <div className="callout small">Resolved {relTime(issue.resolvedAt, nowTs)}.</div>
      ) : (
        <div className="callout small">This is currently with <b>{levelOf(issue.level)?.title}</b>. Switch to that level above to act on it.</div>
      )}

      {lightbox && (
        <Lightbox onClose={() => setLightbox(false)}>
          <img src={mediaUrl(issue.photoId)} alt="Patient's knee photo" style={{ width: '100%' }} />
        </Lightbox>
      )}
    </div>
  );
}
