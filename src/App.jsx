import CareTeam from './views/CareTeam.jsx';
import { Component, useEffect, useState } from 'react';
import { api, useStore } from './lib/api.js';
import Account from './views/Account.jsx';
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
  { id: 'assistant', label: 'Assistant surgeon' },
  {id:'careteam',label:'Care team'},
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
  const [user, setUser] = useState(null);
  const [homeVisit, setHomeVisit] = useState(0);
  const [vision,setVision]=useState(false);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  useEffect(() => { api.get('/api/auth/me').then(r=>setUser(r.user)).catch(e=>setAuthError(e.message)).finally(()=>setChecking(false)); }, []);
  const store = useStore(Boolean(user));
  const [role, setRole] = useHashRole();
  const { state, error } = store;

  const choices = user?.role === 'physio' ? ROLES.filter(r=>['physio'].includes(r.id)) : ROLES.filter(r=>r.id===user?.role);
  const currentRole = choices.some(r=>r.id===role) ? role : user?.role;
  const goHome = () => { setVision(false); setRole(user?.role || 'patient'); setHomeVisit(n=>n+1); window.scrollTo(0,0); };
  const ready = u => {setVision(false);setUser(u);setRole(u.role);};
  if(checking) return <main className="page"><p>Opening Rebound…</p></main>;
  if(!user) return <><header className="topbar"><div className="topbar-inner"><a className="brand brand-home" href="/">Rebound</a></div></header>{authError&&<p className="page" role="alert">Cannot connect: {authError}. Start the server and refresh.</p>}<Account onReady={ready}/></>;
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="brand brand-home" onClick={goHome} aria-label="Rebound home">
            <span className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v9a5 5 0 0 0 5 5h6" />
                <circle cx="18" cy="18" r="1.6" fill="#fff" />
              </svg>
            </span>
            Rebound
          </button>
          {choices.length>1 ? <label className="view-select-wrap" style={{ marginLeft: 'auto' }}>
            <span className="tiny muted" style={{ marginRight: 6 }}>
              View as
            </span>
            <select className="view-select" value={currentRole} onChange={(e) => setRole(e.target.value)} aria-label="Switch between patient, physio, care chain, family and future views">
              {choices.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label> : <span className="badge plain" style={{marginLeft:'auto'}}>{choices[0]?.label}</span>}
          <button className="link-btn header-vision" onClick={()=>setVision(v=>!v)}>{vision?'My account':'Our vision'}</button><span className="account-name tiny">{user.name}</span>
          <button className="btn small" onClick={async()=>{await api.post('/api/auth/logout');setUser(null);}}>Sign out</button>
        </div>
      </header>

      {error && (
        <div className="page" style={{ paddingBottom: 0 }}>
          <div className="banner">Could not refresh this record: {error}. <button className="link-btn" onClick={store.refresh}>Retry</button></div>
        </div>
      )}

      {!state ? (
        <div className="page">
          <p className="muted">Loading…</p>
        </div>
      ) : (
        <Boundary key={`${user.id}-${homeVisit}`} resetKey={currentRole}>
          {vision ? <Future onClose={()=>setVision(false)}/> : currentRole === 'patient' ? (
            <Patient store={store} onVision={()=>setVision(true)} />
          ) : currentRole === 'physio' ? (
            <Physio store={store} />
          ) : currentRole === 'assistant' ? (
            <CareTeam store={store}/>
          ) : currentRole === 'careteam' ? (<CareTeam store={store}/>) : currentRole === 'chain' ? (
            <Chain store={store} />
          ) : currentRole === 'family' ? (
            <Family store={store} />
          ) : (
            <Future store={store} />
          )}
        </Boundary>
      )}

      {state && user.role === 'physio' && new URLSearchParams(window.location.search).has('demo') && <DemoPanel store={store} setRole={setRole} />}
    </>
  );
}
