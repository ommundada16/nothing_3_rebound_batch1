import { useState } from 'react';
import { EXERCISES } from '../../shared/exercises.js';
import { expectedFlexion } from '../../shared/objective.js';
import { dayPostOp, dayIndex } from '../../shared/time.js';
import { api } from '../lib/api.js';
import { heelChart, relTime, sessionsToday, slrChart } from '../lib/data.js';
import { Card, Icon, LineChart, Stat, Toast, useToast } from '../components/ui.jsx';
import RefVideos from '../components/RefVideos.jsx';
import Session from './Session.jsx';
import { MyConcerns, ReportForm, ReportResult } from './Report.jsx';

export default function Patient({ store }) {
  const { state, now, refresh } = store;
  const [tab, setTab] = useState('today');
  const [session, setSession] = useState(null); // exercise id
  const [result, setResult] = useState(null);
  const toast = useToast();

  const dueFollowUps = state.issues.filter((i) => i.source === 'patient' && i.followUpDueAt && i.followUpDueAt <= now() && !i.followUpAnswer && i.status !== 'resolved');
  const replies = state.issues.filter((i) => i.source === 'patient' && i.status !== 'resolved' && i.thread.some((t) => typeof t.by === 'number' && t.ts > (now() - 6 * 3600 * 1000)));
  const badge = dueFollowUps.length + replies.length;

  if (session) {
    return (
      <main className="page phone">
        <Session
          state={state}
          exerciseId={session}
          toast={(m) => toast.show(m)}
          onExit={() => {
            setSession(null);
            refresh();
          }}
        />
        <Toast msg={toast.msg} onDone={toast.clear} />
      </main>
    );
  }

  return (
    <main className="page phone">
      {tab === 'today' && <Today state={state} now={now} store={store} setSession={setSession} setTab={setTab} dueFollowUps={dueFollowUps} toast={toast} />}
      {tab === 'progress' && <Progress state={state} now={now} />}
      {tab === 'help' && (
        <Help
          state={state}
          now={now}
          dueFollowUps={dueFollowUps}
          result={result}
          setResult={setResult}
          refresh={refresh}
          toast={toast}
        />
      )}

      <nav className="tabbar" aria-label="Patient navigation">
        <div className="tabbar-inner">
          {[
            ['today', 'Today', 'today'],
            ['progress', 'Progress', 'chart'],
            ['help', 'Help', 'help'],
          ].map(([id, label, icon]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon name={icon} />
              {label}
              {id === 'help' && badge > 0 ? ` (${badge})` : ''}
            </button>
          ))}
        </div>
      </nav>
      <Toast msg={toast.msg} onDone={toast.clear} />
    </main>
  );
}

function FollowUps({ items, refresh, toast }) {
  if (!items.length) return null;
  return (
    <>
      {items.map((i) => (
        <Card key={i.id} className="stack">
          <div>
            <b>Did that help?</b>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              Earlier you told us: {i.title}. After the advice you were given, how is it now?
            </p>
          </div>
          <div className="chips">
            {[
              ['better', 'Better'],
              ['same', 'No change'],
              ['worse', 'Worse'],
            ].map(([id, l]) => (
              <button
                key={id}
                className="chip"
                onClick={async () => {
                  await api.followUp(i.id, id);
                  await refresh();
                  toast.show(id === 'better' ? 'Glad to hear it.' : 'Thank you. Your physio will look at this again.');
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

function Today({ state, now, store, setSession, setTab, dueFollowUps, toast }) {
  const { refresh } = store;
  const dp = dayPostOp(now(), state.patient.surgeryTs);
  const todays = sessionsToday(state.sessions, now());
  const [open, setOpen] = useState(null);
  const hour = new Date(now()).getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const callPhysio = async () => {
    if (!window.confirm('Ask your physio to call you? They will be alerted straight away.')) return;
    const r = await api.reportIssue({ symptoms: [], pain: 0, text: 'I am worried and would like my physio to call me.', callRequest: true });
    await refresh();
    toast.show('Your physio has been asked to call you.');
    return r;
  };

  return (
    <div className="stack">
      <div>
        <p className="muted small" style={{ margin: 0 }}>
          {state.patient.name}
        </p>
        <h1 style={{ margin: 0 }}>{greet}</h1>
        <p className="muted" style={{ margin: 0 }}>
          Day {dp} after your surgery · {state.patient.procedure}
        </p>
      </div>

      <FollowUps items={dueFollowUps} refresh={refresh} toast={toast} />

      <h2 style={{ margin: '4px 0 0' }}>Today's exercises</h2>
      {state.plan.exercises.map((pe) => {
        const cfg = EXERCISES[pe.id];
        const done = todays.filter((s) => s.exercise === pe.id);
        const doneModes = [...new Set(done.map((s) => s.mode))];
        return (
          <Card key={pe.id}>
            <div className="row between">
              <div className="grow">
                <h3 style={{ margin: 0 }}>{cfg.name}</h3>
                <p className="small muted" style={{ margin: 0 }}>
                  {pe.reps} slow reps · hold {pe.holdSec} s{pe.id === 'slr' ? ` · ${pe.stage === 'nopillow' ? 'no pillow' : 'small pillow under the knee'}` : ''}
                </p>
              </div>
              {doneModes.length ? <span className="badge ok">Done today</span> : <span className="badge plain">To do</span>}
            </div>
            <div className="row wrap" style={{ margin: '8px 0' }}>
              {Object.entries(cfg.modes).map(([id, m]) => (
                <span key={id} className={`badge ${doneModes.includes(id) ? 'ok' : 'plain'}`}>
                  {m.label} {doneModes.includes(id) ? '✓' : ''}
                </span>
              ))}
            </div>
            <div className="row">
              <button className="btn primary grow" onClick={() => setSession(pe.id)}>
                <span className="row" style={{ justifyContent: 'center' }}>
                  <Icon name="play" size={16} /> Practise with my physio
                </span>
              </button>
              <button className="btn" onClick={() => setOpen(open === pe.id ? null : pe.id)}>
                {open === pe.id ? 'Hide videos' : 'Watch'}
              </button>
            </div>
            {open === pe.id && (
              <div style={{ marginTop: 12 }}>
                <RefVideos refVideos={state.refVideos} exerciseId={pe.id} />
              </div>
            )}
          </Card>
        );
      })}

      <div className="grid">
        <button className="btn big" onClick={() => setTab('help')}>
          <span className="row" style={{ justifyContent: 'center' }}>
            <Icon name="alert" size={20} /> Something feels wrong
          </span>
        </button>
        <button className="btn big" onClick={callPhysio}>
          <span className="row" style={{ justifyContent: 'center' }}>
            <Icon name="phone" size={20} /> I am worried. Ask my physio to call me
          </span>
        </button>
      </div>

      <Card title="Remember" tight>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {state.plan.precautions.map((p) => (
            <li key={p}>{p}</li>
          ))}
          {state.plan.notes && <li>{state.plan.notes}</li>}
        </ul>
      </Card>
      <p className="tiny muted">Last seen by your physio team: {relTime(now() - 26 * 3600 * 1000, now())}. Demo data is synthetic.</p>
    </div>
  );
}

function streak(sessions, now) {
  const days = new Set(sessions.map((s) => dayIndex(s.ts)));
  let d = dayIndex(now);
  if (!days.has(d)) d -= 1;
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d -= 1;
  }
  return n;
}

function Progress({ state, now }) {
  const sx = state.patient.surgeryTs;
  const dp = dayPostOp(now(), sx);
  const hs = heelChart(state.sessions, sx);
  const slr = slrChart(state.sessions, sx);
  const bestActive = hs.active.length ? Math.max(...hs.active.map((p) => p.y)) : null;
  const bestAssisted = hs.assisted.length ? Math.max(...hs.assisted.map((p) => p.y)) : null;
  const last = hs.rows[hs.rows.length - 1];
  const target = Math.round(expectedFlexion(dp, state.playbook.milestones));
  const xLabel = (x) => `Day ${x}`;

  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Your progress</h1>
      <Card>
        <div className="row between">
          <Stat n={streak(state.sessions, now())} l="day streak" />
          <Stat n={bestActive != null ? `${Math.round(bestActive)}°` : '–'} l="best bend on your own" />
          <Stat n={bestAssisted != null ? `${Math.round(bestAssisted)}°` : '–'} l="best bend with help" />
        </div>
      </Card>

      <Card title="Knee bend (heel slides)">
        <LineChart
          series={[
            { name: 'On your own', color: '#0f766e', points: hs.active },
            { name: 'With help', color: '#6d5bd0', points: hs.assisted, dashed: true },
          ]}
          hLines={[{ y: target, label: `physio target today ≈ ${target}°`, color: '#a15c07' }]}
          xLabel={xLabel}
        />
        {last && last.active != null && last.assisted != null && (
          <p className="small" style={{ marginBottom: 0 }}>
            Last time: <b>{Math.round(last.active)}°</b> on your own and <b>{Math.round(last.assisted)}°</b> with help. Your physio compares the two to understand what is holding the knee back.
          </p>
        )}
      </Card>

      <Card title="Keeping the knee straight when you lift (leg raise)">
        <LineChart
          series={[
            { name: 'On your own', color: '#0f766e', points: slr.active },
            { name: 'With help', color: '#6d5bd0', points: slr.assisted, dashed: true },
          ]}
          annotations={slr.switchDay != null ? [{ x: slr.switchDay, label: 'pillow removed' }] : []}
          yMin={0}
          xLabel={xLabel}
        />
        <p className="small muted" style={{ marginBottom: 0 }}>
          Lower is better here: it shows how far from straight the knee is at the top of the lift. A small lag between the two lines is common while the thigh muscle wakes up.
        </p>
      </Card>
    </div>
  );
}

function Help({ state, now, dueFollowUps, result, setResult, refresh, toast }) {
  const [view, setView] = useState('report');
  if (result) {
    return (
      <ReportResult
        result={result.result}
        issue={result.issue}
        onClose={() => {
          setResult(null);
          setView('mine');
        }}
      />
    );
  }
  return (
    <div className="stack">
      <h1 style={{ margin: 0 }}>Help</h1>
      <FollowUps items={dueFollowUps} refresh={refresh} toast={toast} />
      <div className="tabs">
        <button className={`tab ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')}>
          Report a problem
        </button>
        <button className={`tab ${view === 'mine' ? 'active' : ''}`} onClick={() => setView('mine')}>
          My messages
        </button>
      </div>
      {view === 'report' ? (
        <ReportForm
          state={state}
          onSent={async (r) => {
            await refresh();
            setResult(r);
          }}
        />
      ) : (
        <MyConcerns state={state} now={now} />
      )}
    </div>
  );
}
