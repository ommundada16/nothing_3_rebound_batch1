import { useState } from 'react';
import { api } from '../lib/api.js';
import { fmtDay, fmtTime } from '../../shared/time.js';

export const FLAW_KEY = 'pt.flawRep';

// Presenter controls: switch scenario, jump the clock to show escalation,
// reset the demo. Hidden from patients in a real deployment.
export default function DemoPanel({ store, setRole }) {
  const { state, now, refresh } = store;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flaw, setFlaw] = useState(() => {
    try {
      return localStorage.getItem(FLAW_KEY) === '1';
    } catch {
      return false;
    }
  });

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleFlaw = () => {
    const v = !flaw;
    setFlaw(v);
    try {
      localStorage.setItem(FLAW_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const offsetMin = Math.round((state.clockOffsetMs || 0) / 60000);

  return (
    <>
      <button className="demo-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Close demo' : 'Demo controls'}
      </button>
      {open && (
        <div className="card demo-panel stack">
          <div>
            <h3>Demo clock</h3>
            <p className="small muted">
              {fmtDay(now())} {fmtTime(now())} {offsetMin > 0 ? `(+${offsetMin} min ahead)` : '(real time)'}
            </p>
            <div className="chips">
              {[30, 60, 240, 1440].map((m) => (
                <button key={m} className="chip" disabled={busy} onClick={() => run(() => api.advanceClock(m))}>
                  +{m >= 1440 ? '1 day' : m >= 60 ? `${m / 60} h` : `${m} min`}
                </button>
              ))}
              <button className="chip" disabled={busy} onClick={() => run(() => api.resetClock())}>
                Back to now
              </button>
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Jump forward to show an unanswered concern climbing the chain.
            </p>
          </div>

          <div>
            <h3>Scenario</h3>
            <div className="stack">
              {Object.entries(state.scenarios || {}).map(([id, label]) => (
                <button
                  key={id}
                  className={`btn small ${state.scenario === id ? 'primary' : ''}`}
                  style={{ width: '100%', textAlign: 'left' }}
                  disabled={busy}
                  onClick={() => run(() => api.reset(id))}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Loads 14 days of synthetic history and resets concerns. Today stays empty so you can do a live session.
            </p>
          </div>

          <div>
            <h3>Simulated leg</h3>
            <label className="row small" style={{ gap: 8 }}>
              <input type="checkbox" checked={flaw} onChange={toggleFlaw} />
              Make rep 2 stall (shows the "keep going" cue)
            </label>
          </div>

          <div className="row wrap small muted">
            <span>Jump to:</span>
            {['patient', 'physio', 'chain', 'family'].map((r) => (
              <button key={r} className="chip" onClick={() => setRole(r)}>
                {r}
              </button>
            ))}
          </div>
          {state.ai ? <p className="tiny muted">AI note polish: on.</p> : <p className="tiny muted">AI note polish: off (add GROQ_API_KEY to .env). Routing never depends on AI.</p>}
        </div>
      )}
    </>
  );
}
