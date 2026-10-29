import { useEffect, useRef, useState } from 'react';
import { TIERS } from '../../shared/constants.js';
import { legPose, SIM_H, SIM_W } from '../lib/sim.js';

export function Card({ title, right, children, className = '', tight = false }) {
  return (
    <section className={`card ${tight ? 'tight' : ''} ${className}`}>
      {(title || right) && (
        <div className="row between" style={{ marginBottom: 10 }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function TierBadge({ tier }) {
  const t = TIERS[tier] || TIERS.fyi;
  return <span className={`badge ${t.id}`}>{t.label}</span>;
}

export function Badge({ kind = 'plain', children }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function Stat({ n, l, color }) {
  return (
    <div className="stat">
      <div className="n" style={color ? { color } : undefined}>
        {n}
      </div>
      <div className="l">{l}</div>
    </div>
  );
}

export function Icon({ name, size = 22 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    today: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
    chart: <><path d="M4 20V8M10 20V4M16 20v-9M22 20H2" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" /></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    play: <path d="M7 4l13 8-13 8z" />,
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
    check: <path d="M4 12l5 5L20 6" />,
    alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ---------- charts ----------
// series: [{name,color,points:[{x,y}],dashed,dots}], hLines: [{y,label,color}]
export function LineChart({ series, hLines = [], yMin, yMax, xLabel = (x) => x, height = 220, unit = '°', xTicks = 6, annotations = [] }) {
  const containerRef=useRef(null);
  const [chartWidth,setChartWidth]=useState(640);
  const W = chartWidth;
  const H = height;
  const m = { l: 40, r: 14, t: 12, b: 28 };
  const all = series.flatMap((s) => s.points);
  const hasPoints=all.length>0;
  useEffect(()=>{const el=containerRef.current;if(!el)return;const resize=()=>setChartWidth(Math.max(280,Math.round(el.clientWidth)));resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[hasPoints]);
  if (!all.length) return <div className="muted small">No data yet.</div>;
  const xs = all.map((p) => p.x);
  const ys = [...all.map((p) => p.y), ...hLines.map((h) => h.y)];
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const lo = yMin ?? Math.floor((Math.min(...ys) - 4) / 5) * 5;
  const hi = yMax ?? Math.ceil((Math.max(...ys) + 4) / 5) * 5;
  const X = (x) => m.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - m.l - m.r);
  const Y = (y) => m.t + (1 - (y - lo) / Math.max(1, hi - lo)) * (H - m.t - m.b);
  const yt = 4;
  const ticks = Array.from({ length: yt + 1 }, (_, i) => lo + ((hi - lo) * i) / yt);
  const xt = Array.from({ length: Math.min(xTicks, x1 - x0 + 1) }, (_, i) => Math.round(x0 + ((x1 - x0) * i) / Math.max(1, Math.min(xTicks, x1 - x0 + 1) - 1)));

  return (
    <div ref={containerRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke="var(--line)" />
            <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} x={X(t)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
            {xLabel(t)}
          </text>
        ))}
        {hLines.map((h, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={Y(h.y)} y2={Y(h.y)} stroke={h.color || 'var(--muted)'} strokeDasharray="5 4" />
            <text x={W - m.r - 4} y={Y(h.y) - 4} textAnchor="end" fontSize="12" fill={h.color || 'var(--muted)'}>
              {h.label}
            </text>
          </g>
        ))}
        {annotations.map((a, i) => (
          <g key={i}>
            <line x1={X(a.x)} x2={X(a.x)} y1={m.t} y2={H - m.b} stroke="var(--review)" strokeDasharray="3 3" />
            <text x={X(a.x) + 4} y={m.t + 12} fontSize="12" fill="var(--review)">
              {a.label}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.x - b.x);
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '6 4' : undefined} strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={i === pts.length - 1 ? 4.5 : 2.8} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="row wrap small" style={{ gap: 14, marginTop: 4 }}>
        {series.map((s) => (
          <span key={s.name} className="row" style={{ gap: 6 }}>
            <i style={{ width: 14, height: 3, background: s.color, display: 'inline-block', borderRadius: 2 }} />
            {s.name}
          </span>
        ))}
        {unit && <span className="muted">values in {unit}</span>}
      </div>
    </div>
  );
}

// A stand-in picture drawn from a measured angle (used for seeded history).
export function LegFigure({ exercise = 'heel_slide', value = 0, deficit = 0, label, stage }) {
  const p = legPose(exercise, value, deficit);
  const bedY = exercise === 'slr' ? 278 : 268;
  return (
    <svg viewBox={`0 0 ${SIM_W} ${SIM_H}`} width="100%" className="shot" role="img" aria-label={label || 'Leg figure'}>
      <rect width={SIM_W} height={SIM_H} fill="#c9dadf" />
      <rect y={bedY} width={SIM_W} height={SIM_H} fill="#8aa5ad" />
      <rect y={bedY - 6} width={SIM_W} height="8" fill="#f2f6f7" />
      {exercise === 'slr' && stage === 'pillow' && <ellipse cx="215" cy="266" rx="34" ry="12" fill="#4c7bd9" />}
      <ellipse cx="70" cy="252" rx="44" ry="16" fill="#e2c14a" />
      <polyline points={`${p.hip.x},${p.hip.y} ${p.knee.x},${p.knee.y} ${p.ankle.x},${p.ankle.y}`} fill="none" stroke="#0f766e" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      {[p.hip, p.knee, p.ankle].map((q, i) => (
        <circle key={i} cx={q.x} cy={q.y} r="9" fill="#fff" stroke="#0b1718" strokeWidth="3" />
      ))}
      <text x="16" y="34" fontSize="26" fontWeight="700" fill="#0b1718">
        {Math.round(value)}°
      </text>
      <text x="16" y={SIM_H - 14} fontSize="14" fill="#0b1718" opacity="0.7">
        Drawn from the measured angle
      </text>
    </svg>
  );
}

export function Lightbox({ children, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="lightbox" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: '100%' }}>
        {children}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 90, transform: 'translateX(-50%)', background: 'var(--ink)', color: 'var(--bg)', padding: '10px 16px', borderRadius: 999, zIndex: 60, maxWidth: '90vw' }}>
      {msg}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState('');
  return { msg, show: setMsg, clear: () => setMsg('') };
}
