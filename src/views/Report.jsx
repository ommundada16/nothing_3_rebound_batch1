import { useRef, useState } from 'react';
import { CARE_LEVELS, EMERGENCY_NUMBER, SYMPTOMS } from '../../shared/constants.js';
import { api, mediaUrl } from '../lib/api.js';
import { relTime } from '../lib/data.js';
import { Card, Icon, TierBadge } from '../components/ui.jsx';

const levelName = (n) => CARE_LEVELS.find((l) => l.level === n)?.title || 'Care team';

// Records a short voice note (the patient can just say what is wrong).
function VoiceNote({ onDone }) {
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [has, setHas] = useState(false);
  const mr = useRef(null);
  const chunks = useRef([]);

  const toggle = async () => {
    if (rec) {
      mr.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rcd = new MediaRecorder(stream);
      mr.current = rcd;
      chunks.current = [];
      rcd.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rcd.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(false);
        setBusy(true);
        try {
          const blob = new Blob(chunks.current, { type: rcd.mimeType || 'audio/webm' });
          const up = await api.upload(blob, { kind: 'voice', name: 'patient-voice-note' });
          setHas(true);
          onDone(up.id);
        } finally {
          setBusy(false);
        }
      };
      rcd.start();
      setRec(true);
    } catch {
      alert('Microphone is not available on this page.');
    }
  };

  return (
    <button type="button" className={`btn ${rec ? 'danger rec' : ''}`} onClick={toggle} disabled={busy}>
      <span className="row">
        <Icon name="mic" size={18} />
        {rec ? 'Stop recording' : has ? 'Voice note added (record again)' : busy ? 'Saving…' : 'Say it with your voice'}
      </span>
    </button>
  );
}

export function ReportForm({ state, onSent }) {
  const [symptoms, setSymptoms] = useState([]);
  const [pain, setPain] = useState(3);
  const [text, setText] = useState('');
  const [photoId, setPhotoId] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [voiceId, setVoiceId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sla = state.playbook.sla;

  const toggle = (id) => setSymptoms((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoName(f.name);
    try {
      const up = await api.upload(f, { kind: 'photo', name: f.name });
      setPhotoId(up.id);
    } catch (x) {
      setErr(x.message);
    }
  };

  const send = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await api.reportIssue({ symptoms, pain, text, photoId, voiceId });
      onSent(r);
      setSymptoms([]);
      setText('');
      setPhotoId(null);
      setPhotoName('');
      setVoiceId(null);
      setPain(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="callout small">
        Tell us what is happening. Your physio sees <b>every</b> message. This app only decides who looks first and how fast. It will never tell you that something is "nothing".
      </div>

      <Card title="What are you noticing?">
        <div className="chips">
          {SYMPTOMS.map((s) => (
            <button key={s.id} type="button" className={`chip ${symptoms.includes(s.id) ? 'on' : ''} ${s.emergency ? 'danger' : ''}`} onClick={() => toggle(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title={`Pain right now: ${pain} / 10`}>
        <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(+e.target.value)} aria-label="Pain from 0 to 10" />
        <div className="row between tiny muted">
          <span>none</span>
          <span>worst</span>
        </div>
      </Card>

      <Card title="Anything else? (optional)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: the knee felt like it slipped when I stood up from the bed…" />
        <div className="row wrap" style={{ marginTop: 10 }}>
          <VoiceNote onDone={setVoiceId} />
          <label className="btn" style={{ cursor: 'pointer' }}>
            {photoId ? 'Photo added' : 'Add a photo of the knee'}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: 'none' }} />
          </label>
        </div>
        {photoName && <p className="tiny muted">{photoName}</p>}
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          Photos go to your physio, who looks at them. The app does not judge a photo.
        </p>
      </Card>

      {err && <div className="callout urgent small">{err}</div>}
      <button className="btn primary big" onClick={send} disabled={busy || (!symptoms.length && !text.trim() && !voiceId && pain < 4)}>
        {busy ? 'Sending…' : 'Send to my physio'}
      </button>
      <p className="tiny muted">
        If you have chest pain or trouble breathing, call <b>{EMERGENCY_NUMBER}</b> now. Do not wait for this app. If nobody answers your concern within {sla.urgentAckMin} minutes (urgent) or {Math.round(sla.reviewAckMin / 60)} hours (review), it moves up to the next person automatically.
      </p>
    </div>
  );
}

export function ReportResult({ result, issue, onClose }) {
  const urgent = result.tier === 'urgent';
  return (
    <div className="stack">
      {result.emergency && (
        <div className="callout urgent">
          <b>Call {EMERGENCY_NUMBER} now.</b> Chest pain or trouble breathing needs emergency help. Do not wait for a reply.
        </div>
      )}
      <Card>
        <div className="row between">
          <h2 style={{ margin: 0 }}>{urgent ? 'Your physio is being alerted now' : 'Sent to your physio'}</h2>
          <TierBadge tier={result.tier} />
        </div>
        <p className="muted small" style={{ marginTop: 6 }}>
          Sent to: {issue.notifiedLevels.map(levelName).join(' and ')}.
        </p>
        <h3>What you can do right now</h3>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {result.guidance.map((g) => (
            <li key={g} style={{ marginBottom: 6 }}>
              {g}
            </li>
          ))}
        </ul>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          This guidance comes from your physio's own playbook. It is not a diagnosis.
        </p>
      </Card>
      <Card title="Why it was sent this way" tight>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>
      <p className="small muted">We will ask you later whether this helped. If it did not, or you do not answer, it goes up to a physio again.</p>
      <button className="btn primary big" onClick={onClose}>
        Done
      </button>
    </div>
  );
}

export function MyConcerns({ state, now }) {
  const mine = [...state.issues].filter((i) => i.source === 'patient').sort((a, b) => b.createdAt - a.createdAt);
  if (!mine.length) return <p className="muted small">No concerns raised yet.</p>;
  return (
    <div className="stack">
      {mine.map((i) => (
        <Card key={i.id} tight>
          <div className="row between">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{i.title}</div>
              <div className="tiny muted">
                {relTime(i.createdAt, now())} · with {levelName(i.level)}
              </div>
            </div>
            <TierBadge tier={i.tier} />
          </div>
          <div className="thread" style={{ marginTop: 10 }}>
            {i.thread.map((t, k) => (
              <div key={k} className="small">
                <b>{t.by === 'patient' ? 'You' : t.by === 'system' ? 'App' : levelName(t.by)}:</b> {t.text}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <span className={`badge ${i.status === 'resolved' ? 'ok' : 'plain'}`}>{i.status}</span>
            {i.photoId && (
              <a className="small" href={mediaUrl(i.photoId)} target="_blank" rel="noreferrer">
                your photo
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
