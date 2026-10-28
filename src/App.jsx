import { Component, useEffect, useState } from 'react';
import { useStore } from './lib/api.js';
import Patient from './views/Patient.jsx';
import Physio from './views/Physio.jsx';
import Chain from './views/Chain.jsx';
import Family from './views/Family.jsx';
import Future from './views/Future.jsx';
import DemoPanel from './views/DemoPanel.jsx';

// A view that throws should never blank the whole app during a demo.
class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page">
        <div className="callout urgent">
          <b>Something went wrong on this screen.</b>
          <div className="small">{String(this.state.error.message || this.state.error)}</div>
          <button className="btn small" style={{ marginTop: 8 }} onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </main>
    );
  }
}

const ROLES = [
  { id: 'patient', label: 'Patient' },
  { id: 'physio', label: 'Physio' },
  { id: 'chain', label: 'Care chain' },
  { id: 'family', label: 'Family' },
  { id: 'future', label: 'Future' },
];

function useHashRole() {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    return ROLES.some((r) => r.id === h) ? h : 'patient';
  };
  const [role, setRole] = useState(read);
  useEffect(() => {
    const on = () => setRole(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [role, (r) => (window.location.hash = `/${r}`)];
}

export default function App() {
  const store = useStore();
  const [role, setRole] = useHashRole();
  const { state, error } = store;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v9a5 5 0 0 0 5 5h6" />
                <circle cx="18" cy="18" r="1.6" fill="#fff" />
              </svg>
            </span>
            Physio Twin
          </div>
          <label className="view-select-wrap" style={{ marginLeft: 'auto' }}>
            <span className="tiny muted" style={{ marginRight: 6 }}>
              View as
            </span>
            <select className="view-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Switch between patient, physio, care chain, family and future views">
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <div className="banner">Cannot reach the server ({error}). Start it with <b>npm run dev</b>.</div>
        </div>
      )}

      {!state ? (
        <div className="page">
          <p className="muted">Loading…</p>
        </div>
      ) : (
        <Boundary resetKey={role}>
          {role === 'patient' ? (
            <Patient store={store} />
          ) : role === 'physio' ? (
            <Physio store={store} />
          ) : role === 'chain' ? (
            <Chain store={store} />
          ) : role === 'family' ? (
            <Family store={store} />
          ) : (
            <Future store={store} />
          )}
        </Boundary>
      )}

      {state && <DemoPanel store={store} setRole={setRole} />}
    </>
  );
}
