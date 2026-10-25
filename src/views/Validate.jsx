import { useCallback, useEffect, useRef, useState } from 'react';
import { LEG } from '../../shared/exercises.js';
import { Smoother, flexionFrom, readLeg } from '../lib/geometry.js';
import { detect, loadPose, openCamera } from '../lib/pose.js';
import { SIM_H, SIM_W, createSim, drawScene } from '../lib/sim.js';
import { Card } from '../components/ui.jsx';

const KEY = 'pt.validation';
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

// Accuracy check: hold the real leg at several knee angles, read each angle on a
// goniometer or protractor, and compare with what the camera says. This gives
// the honest error range to quote ("camera estimate, within X degrees").
export default function Validate() {
  const [rows, setRows] = useState(load);
  const [source, setSource] = useState('camera');
  const [side, setSide] = useState('left');
  const [facing, setFacing] = useState('environment');
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState({ angle: null, conf: 0 });
  const [err, setErr] = useState('');
  const [simTrue, setSimTrue] = useState(60);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const sceneRef = useRef(null);
  const loopRef = useRef(0);
  const run = useRef({ buf: [] });

  const persist = (next) => {
    setRows(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const stop = useCallback(() => {
    run.current.running = false;
    cancelAnimationFrame(loopRef.current);
    clearTimeout(loopRef.current);
    run.current.stream?.getTracks().forEach((t) => t.stop());
    run.current.stream = null;
    setRunning(false);
  }, []);
  useEffect(() => stop, [stop]);

  const tick = () => {
    const r = run.current;
    if (!r.running) return;
    const now = performance.now();
    let lm = null;
    let w = SIM_W;
    let h = SIM_H;
    if (r.source === 'camera') {
      const v = videoRef.current;
      w = v.videoWidth;
      h = v.videoHeight;
      if (v.readyState >= 2 && v.currentTime !== r.lastVT) {
        r.lastVT = v.currentTime;
        try {
          lm = detect(r.landmarker, v, now);
        } catch {
          lm = null;
        }
      } else {
        loopRef.current = requestAnimationFrame(tick);
        return;
      }
    } else {
      lm = r.sim.frame(now).landmarks;
      const sc = sceneRef.current;
      if (sc) {
        sc.width = 640;
        sc.height = 360;
        drawScene(sc.getContext('2d'), 640, 360, { exercise: 'heel_slide' });
      }
    }
    const leg = readLeg(lm, LEG[side], w, h);
    const oc = overlayRef.current;
    if (oc) {
      oc.width = w;
      oc.height = h;
      const g = oc.getContext('2d');
      g.clearRect(0, 0, w, h);
      if (leg) {
        g.strokeStyle = '#2dd4bf';
        g.lineWidth = 6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(leg.hip.x, leg.hip.y);
        g.lineTo(leg.knee.x, leg.knee.y);
        g.lineTo(leg.ankle.x, leg.ankle.y);
        g.stroke();
      }
    }
    if (leg && leg.confidence >= 0.5) {
      const a = r.smoother.push(flexionFrom(leg.hip, leg.knee, leg.ankle));
      r.buf.push(a);
      if (r.buf.length > 45) r.buf.shift();
      setLive({ angle: a, conf: leg.confidence });
    } else {
      setLive({ angle: null, conf: leg?.confidence || 0 });
    }
    loopRef.current = r.source === 'sim' ? setTimeout(tick, 33) : requestAnimationFrame(tick);
  };

  const start = async () => {
    setErr('');
    const r = run.current;
    r.source = source;
    r.buf = [];
    r.smoother = new Smoother(0.3);
    try {
      if (source === 'camera') {
        const [stream, lmk] = await Promise.all([openCamera(facing), loadPose()]);
        r.stream = stream;
        r.landmarker = lmk;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } else {
        r.sim = createSim({ exercise: 'heel_slide', peak: simTrue * 1, holdSec: 600, side, noise: 0.4 });
        // hold the leg at the chosen angle: start the sim already at the plateau
        r.sim.frame = ((orig) => (now) => orig(now + (1.6 + 2.4 + 1) * 1000))(r.sim.frame);
      }
    } catch (e) {
      setErr(e.message || 'Could not start');
      return;
    }
    r.running = true;
    setRunning(true);
    tick();
  };

  const capture = () => {
    const a = median(run.current.buf);
    if (a == null) {
      setErr('No stable reading yet. Keep the leg still and fully in view.');
      return;
    }
    setErr('');
    persist([...rows, { id: Date.now(), ts: Date.now(), measured: Math.round(a * 10) / 10, ref: null, source: run.current.source, truth: run.current.source === 'sim' ? simTrue : null }]);
  };

  const setRef = (id, v) => persist(rows.map((r) => (r.id === id ? { ...r, ref: v === '' ? null : Number(v) } : r)));
  const del = (id) => persist(rows.filter((r) => r.id !== id));

  const paired = rows.filter((r) => (r.ref ?? r.truth) != null).map((r) => ({ ...r, truthV: r.ref ?? r.truth, err: r.measured - (r.ref ?? r.truth) }));
  const mae = paired.length ? paired.reduce((s, r) => s + Math.abs(r.err), 0) / paired.length : null;
  const bias = paired.length ? paired.reduce((s, r) => s + r.err, 0) / paired.length : null;
  const maxErr = paired.length ? Math.max(...paired.map((r) => Math.abs(r.err))) : null;

  const csv = () => {
    const lines = ['id,source,reference_deg,camera_deg,error_deg', ...paired.map((r) => `${r.id},${r.source},${r.truthV},${r.measured},${r.err.toFixed(1)}`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'camera-accuracy.csv';
    a.click();
  };

  return (
    <div className="stack">
      <Card>
        <h2 style={{ margin: 0 }}>Accuracy check: camera vs a protractor</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Judges will ask how accurate the phone angle is. Answer with your own numbers. Hold a real leg still at 6 to 10 different knee angles (for example heel on a stool at different heights, or held by a brace), read each angle with a goniometer or a protractor, capture the camera reading, then type the reference. We use the median of the last second.
        </p>
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          Note: a hinged ruler cannot be used here, because the pose model only recognises a human body.
        </p>
      </Card>

      <div className="grid two">
        <Card title="Camera">
          <div className="row wrap" style={{ marginBottom: 8 }}>
            <div className="chips">
              {[
                ['camera', 'Camera'],
                ['sim', 'Simulated (test the tool)'],
              ].map(([id, l]) => (
                <button key={id} className={`chip ${source === id ? 'on' : ''}`} onClick={() => !running && setSource(id)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="chips">
              {[
                ['left', 'Left leg'],
                ['right', 'Right leg'],
              ].map(([id, l]) => (
                <button key={id} className={`chip ${side === id ? 'on' : ''}`} onClick={() => !running && setSide(id)}>
                  {l}
                </button>
              ))}
            </div>
            {source === 'camera' && (
              <div className="chips">
                {[
                  ['environment', 'Back camera'],
                  ['user', 'Front / laptop'],
                ].map(([id, l]) => (
                  <button key={id} className={`chip ${facing === id ? 'on' : ''}`} onClick={() => !running && setFacing(id)}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          {source === 'sim' && !running && (
            <div style={{ marginBottom: 8 }}>
              <label className="field">Simulated true angle: {simTrue}°</label>
              <input type="range" min="10" max="130" value={simTrue} onChange={(e) => setSimTrue(+e.target.value)} />
            </div>
          )}
          <div className="stage" style={{ aspectRatio: '16 / 9' }}>
            <div className={source === 'camera' && facing === 'user' ? 'mirror' : ''} style={{ position: 'absolute', inset: 0 }}>
              <video ref={videoRef} playsInline muted style={{ display: source === 'camera' ? 'block' : 'none' }} />
              <canvas ref={sceneRef} style={{ display: source === 'sim' ? 'block' : 'none' }} />
              <canvas ref={overlayRef} />
            </div>
            <div className="hud-angle">
              <div className="n">{live.angle != null ? Math.round(live.angle * 10) / 10 : '--'}°</div>
              <div className="l">knee bend (camera)</div>
            </div>
          </div>
          {err && <div className="callout urgent small" style={{ marginTop: 8 }}>{err}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            {!running ? (
              <button className="btn primary grow" onClick={start}>
                Start camera
              </button>
            ) : (
              <>
                <button className="btn primary grow" onClick={capture}>
                  Capture this angle
                </button>
                <button className="btn" onClick={stop}>
                  Stop
                </button>
              </>
            )}
          </div>
        </Card>

        <Card title="Results">
          {paired.length === 0 ? (
            <p className="muted small">Capture a few angles and enter the protractor reading for each.</p>
          ) : (
            <div className="row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{mae.toFixed(1)}°</div>
                <div className="tiny muted">mean absolute error</div>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{bias > 0 ? '+' : ''}{bias.toFixed(1)}°</div>
                <div className="tiny muted">average bias</div>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{maxErr.toFixed(1)}°</div>
                <div className="tiny muted">largest error</div>
              </div>
            </div>
          )}
          <Scatter pts={paired} />
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Camera</th>
                <th>Reference (°)</th>
                <th>Error</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = r.ref ?? r.truth;
                return (
                  <tr key={r.id}>
                    <td>{r.measured}°</td>
                    <td>
                      {r.truth != null ? (
                        <span>{r.truth}° (sim)</span>
                      ) : (
                        <input type="number" value={r.ref ?? ''} onChange={(e) => setRef(r.id, e.target.value)} style={{ width: 90, padding: 6 }} aria-label="Reference angle in degrees" />
                      )}
                    </td>
                    <td>{t != null ? `${(r.measured - t).toFixed(1)}°` : '–'}</td>
                    <td>
                      <button className="btn small ghost" onClick={() => del(r.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={csv} disabled={!paired.length}>
              Export CSV
            </button>
            <button className="btn small ghost" onClick={() => persist([])} disabled={!rows.length}>
              Clear all
            </button>
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            Quote this as "camera estimate, mean error X° against a protractor on N readings". It shows the error of the whole chain, including the protractor's own error (about 2 to 5° by hand).
          </p>
        </Card>
      </div>
    </div>
  );
}

function Scatter({ pts }) {
  if (pts.length < 2) return null;
  const W = 300;
  const H = 220;
  const m = 34;
  const lo = Math.floor(Math.min(...pts.flatMap((p) => [p.truthV, p.measured])) / 10) * 10 - 5;
  const hi = Math.ceil(Math.max(...pts.flatMap((p) => [p.truthV, p.measured])) / 10) * 10 + 5;
  const X = (v) => m + ((v - lo) / (hi - lo)) * (W - m - 10);
  const Y = (v) => H - m - ((v - lo) / (hi - lo)) * (H - m - 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 360, display: 'block', margin: '10px auto 0' }} role="img" aria-label="Camera angle against reference angle">
      <line x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} stroke="var(--muted)" strokeDasharray="4 4" />
      {pts.map((p) => (
        <circle key={p.id} cx={X(p.truthV)} cy={Y(p.measured)} r="4.5" fill="var(--brand)" />
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
        reference (°)
      </text>
      <text x="10" y={H / 2} fontSize="11" fill="var(--muted)" transform={`rotate(-90 10 ${H / 2})`} textAnchor="middle">
        camera (°)
      </text>
    </svg>
  );
}
