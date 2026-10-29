import MedicineReport from '../components/MedicineReport.jsx';
import { useState } from 'react';
import { CareReminders, AssignedPhysio } from './DailyCare.jsx';
import { EXERCISES, heelSlideTasks, exerciseTaskDone } from '../../shared/exercises.js';
import { dayPostOp } from '../../shared/time.js';
import { api } from '../lib/api.js';
import { relTime, sessionsToday } from '../lib/data.js';
import { Card, Icon, Toast, useToast } from '../components/ui.jsx';

// What the family sees. Deliberately plain: no clinical numbers, no jargon, no
// reason for family members to quiz the patient about their exercises.
export default function Family({ store }) {
  const { state, now, refresh } = store;
  const [tab,setTab]=useState('recovery');
  const toast = useToast();
  const fam = state.family || { shareLevel: 'status', helperRequest: null };
  const open = state.issues.filter((i) => i.status !== 'resolved');
  const urgent = open.some((i) => i.tier === 'urgent');
  const review = open.some((i) => i.tier === 'review');
  const todays = sessionsToday(state.sessions, now());
  const last = [...state.sessions].sort((a, b) => b.ts - a.ts)[0];
  const tasks = heelSlideTasks(state.plan);
  const doneToday = tasks.length > 0 && tasks.every(pe => todays.some(s => exerciseTaskDone(s, pe)));
  const someToday = todays.length > 0;

  let status;
  if (urgent) status = { c: 'urgent', t: 'A concern is waiting for the care team', d: 'Keep the phone nearby. A physio may call.' };
  else if (review) status = { c: 'review', t: 'A message is awaiting physio review', d: 'Nothing for you to do. They will get in touch if they need to.' };
  else if (doneToday) status = { c: 'ok', t: 'All done for today', d: 'Exercises finished. A good day.' };
  else if (someToday) status = { c: 'fyi', t: 'Part way through today', d: 'Some exercises are done. The rest are still to do.' };
  else status = { c: 'fyi', t: 'Exercises not done yet today', d: 'There is still time. A gentle reminder is fine, but please do not quiz them.' };

  const colors = { urgent: 'var(--urgent)', review: 'var(--review)', ok: 'var(--ok)', fyi: 'var(--fyi)' };

  const setFam = async (patch) => {
    await api.setKey('family', { ...fam, ...patch }, 'family');
    await refresh();
  };

  const req = fam.helperRequest;

  return (
    <main className="page phone">
      <CareReminders store={store}/>
      <AssignedPhysio patientId={state.patient.id||state.patient.name}/>
      <div className="stack">
        <div>
          <p className="muted small" style={{ margin: 0 }}>
            For the family of
          </p>
          <h1 style={{ margin: 0 }}>{state.patient.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Day {dayPostOp(now(), state.patient.surgeryTs)} after surgery
          </p>
        </div>

        <div className={`callout ${status.c === 'ok' ? '' : status.c}`} style={{ borderLeftColor: colors[status.c] }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{status.t}</div>
          <div className="small">{status.d}</div>
        </div>

        {fam.shareLevel === 'status_exercises' && (
          <Card title="Today's exercises" tight>
            <ul className="list-clean">
              {tasks.map((pe) => {
                const done = todays.some((s) => exerciseTaskDone(s, pe));
                return (
                  <li key={pe.key} className="row between">
                    <span>{pe.name}</span>
                    <span className={`badge ${done ? 'ok' : 'plain'}`}>{done ? 'Done' : 'To do'}</span>
                  </li>
                );
              })}
            </ul>
            {last && <p className="tiny muted" style={{ marginBottom: 0 }}>Last session {relTime(last.ts, now())}.</p>}
          </Card>
        )}

        <Card title="A small way to help today">
          {!req && <p className="small muted" style={{ marginTop: 0 }}>When your family member needs a hand setting up the phone or the pillow, they can ask here. You will see it.</p>}
          {req && req.status === 'asked' && (
            <div className="stack">
              <div className="callout review small">
                <b>Please help place the phone</b> ({relTime(req.ts, now())}). Put it beside the bed at knee height so the whole leg is in view.
              </div>
              <button className="btn primary" onClick={() => setFam({ helperRequest: { ...req, status: 'accepted' } })}>
                I am on my way
              </button>
            </div>
          )}
          {req && req.status === 'accepted' && (
            <div className="stack">
              <div className="callout small">Thank you. Marked as on the way.</div>
              <button className="btn" onClick={() => setFam({ helperRequest: null })}>
                Done, all set
              </button>
            </div>
          )}
          {!req && (
            <button className="btn" onClick={() => setFam({ helperRequest: { ts: now(), status: 'asked' } })}>
              <span className="row">
                <Icon name="phone" size={16} /> Demo: patient asks for help placing the phone
              </span>
            </button>
          )}
        </Card>

        <Card title="How to be most helpful" tight>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>You do not need to ask "did you do your exercises?". It is shown above.</li>
            <li>Let them talk about how they feel without fixing it or judging it.</li>
            <li>Help with setting up the phone, pillow and a calm space.</li>
            <li>If you are worried, use the "ask my physio to call" button together.</li>
          </ul>
        </Card>

        <Card title="What is shared with the family" tight>
          <p className="tiny muted" style={{ marginTop: 0 }}>
            Chosen once at set-up by the patient. Exercise sharing is chosen once. Private exercise photos and pain scores are not shown here.
          </p>
          <div className="chips">
            {[
              ['status', 'A simple status only'],
              ['status_exercises', 'Status and which exercises are done'],
            ].map(([id, l]) => (
              <button key={id} className={`chip ${fam.shareLevel === id ? 'on' : ''}`} onClick={() => setFam({ shareLevel: id })}>
                {l}
              </button>
            ))}
          </div>
        </Card>
      </div>
      <MedicineReport refresh={refresh}/>
      <Toast msg={toast.msg} onDone={toast.clear} />
    </main>
  );
}
