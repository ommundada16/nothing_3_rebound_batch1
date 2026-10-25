import express from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshState, SCENARIOS } from './seed.js';
import {
  answerFollowUp,
  applyAction,
  clinicianNote,
  createIssueFromReport,
  nowOf,
  syncObjective,
  tick,
} from './issues.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');
const MEDIA_DIR = resolve(DATA_DIR, 'media');
const STATE_FILE = resolve(DATA_DIR, 'state.json');
const MEDIA_INDEX = resolve(DATA_DIR, 'media.json');
const PORT = Number(process.env.PORT || 8787);

mkdirSync(MEDIA_DIR, { recursive: true });

// Optional: a Groq key lets the app polish clinician notes. Everything works without it.
loadDotEnv();
function loadDotEnv() {
  const f = resolve(__dirname, '..', '.env');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

let state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null;
let media = existsSync(MEDIA_INDEX) ? JSON.parse(readFileSync(MEDIA_INDEX, 'utf8')) : {};

if (!state) {
  state = freshState('progressing');
  syncObjective(state);
  persist();
}

function persist() {
  writeFileSync(STATE_FILE, JSON.stringify(state));
}
function commit() {
  state.rev += 1;
  persist();
}

const app = express();
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, rev: state.rev, ai: Boolean(process.env.GROQ_API_KEY) }));

app.get('/api/state', (req, res) => {
  const since = Number(req.query.since || 0);
  if (since === state.rev) return res.json({ rev: state.rev, unchanged: true });
  res.json({ rev: state.rev, state: { ...state, serverNow: nowOf(state), scenarios: SCENARIOS, ai: Boolean(process.env.GROQ_API_KEY) } });
});

app.post('/api/reset', (req, res) => {
  const scenario = SCENARIOS[req.body?.scenario] ? req.body.scenario : 'progressing';
  const rev = state.rev + 1;
  state = freshState(scenario);
  state.rev = rev;
  syncObjective(state);
  persist();
  res.json({ ok: true, scenario });
});

const EDITABLE = new Set(['plan', 'playbook', 'cues', 'cueLanguage', 'refVideos', 'family', 'patient']);
app.put('/api/state/:key', (req, res) => {
  const { key } = req.params;
  if (!EDITABLE.has(key)) return res.status(400).json({ error: 'Not editable' });
  state[key] = req.body.value;
  state.audit.push({ id: randomUUID(), ts: nowOf(state), by: req.body.by || 'physio', text: `Updated ${key}` });
  commit();
  res.json({ ok: true });
});

app.post('/api/sessions', (req, res) => {
  const s = req.body;
  if (!s?.exercise || !s?.mode) return res.status(400).json({ error: 'Bad session' });
  const session = { ...s, id: s.id || randomUUID(), ts: s.ts || nowOf(state) };
  if (!state.sessions.some((x) => x.id === session.id)) state.sessions.push(session);
  const created = syncObjective(state);
  state.audit.push({
    id: randomUUID(),
    ts: nowOf(state),
    by: 'patient',
    text: `Logged ${session.exercise.replace('_', ' ')} (${session.mode}), best ${Math.round(session.metrics?.peak ?? 0)}°`,
  });
  commit();
  res.json({ session, newFlags: created.map((i) => ({ id: i.id, title: i.title, tier: i.tier })) });
});

app.post('/api/issues', (req, res) => {
  const { issue, result } = createIssueFromReport(state, req.body || {});
  commit();
  res.json({ issue, result });
});

app.post('/api/issues/:id/action', (req, res) => {
  const out = applyAction(state, req.params.id, req.body || {});
  if (out.error) return res.status(400).json(out);
  commit();
  res.json(out);
});

app.post('/api/issues/:id/followup', (req, res) => {
  const out = answerFollowUp(state, req.params.id, req.body?.answer);
  if (out.error) return res.status(400).json(out);
  commit();
  res.json(out);
});

app.post('/api/clock/advance', (req, res) => {
  const minutes = Math.max(0, Math.min(60 * 24 * 14, Number(req.body?.minutes || 0)));
  state.clockOffsetMs = (state.clockOffsetMs || 0) + minutes * 60000;
  tick(state);
  state.audit.push({ id: randomUUID(), ts: nowOf(state), by: 'demo', text: `Demo clock advanced ${minutes} min` });
  commit();
  res.json({ ok: true, now: nowOf(state) });
});

app.post('/api/clock/reset', (_req, res) => {
  state.clockOffsetMs = 0;
  commit();
  res.json({ ok: true });
});

// ---- media (audio cues, reference videos, screenshots, photos) ----
app.post('/api/media', express.raw({ type: () => true, limit: '120mb' }), (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Empty upload' });
  const id = randomUUID();
  writeFileSync(resolve(MEDIA_DIR, id), req.body);
  media[id] = {
    mime: String(req.headers['content-type'] || 'application/octet-stream').split(';')[0],
    kind: String(req.query.kind || 'file'),
    name: String(req.query.name || id),
    ts: Date.now(),
  };
  writeFileSync(MEDIA_INDEX, JSON.stringify(media));
  res.json({ id, url: `/api/media/${id}` });
});

app.get('/api/media/:id', (req, res) => {
  const m = media[req.params.id];
  const f = resolve(MEDIA_DIR, req.params.id);
  if (!m || !existsSync(f)) return res.status(404).end();
  res.setHeader('Content-Type', m.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(f);
});

// ---- optional AI polish for the clinician note (never changes the routing) ----
app.post('/api/ai/note', async (req, res) => {
  const issue = state.issues.find((i) => i.id === req.body?.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const base = clinicianNote(issue, state.patient);
  if (!process.env.GROQ_API_KEY) return res.json({ note: base, source: 'template' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You write a brief, neutral handover note for a physiotherapist from structured patient data. Do not diagnose, do not say anything is safe or harmless, do not add facts. Max 90 words.',
          },
          { role: 'user', content: base },
        ],
      }),
    });
    const j = await r.json();
    const note = j?.choices?.[0]?.message?.content?.trim();
    res.json({ note: note || base, source: note ? 'groq' : 'template' });
  } catch {
    res.json({ note: base, source: 'template' });
  }
});

// ---- built app (production-style run) ----
const DIST = resolve(__dirname, '..', 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(resolve(DIST, 'index.html')));
}

setInterval(() => {
  if (tick(state)) commit();
}, 5000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] Physio Twin server on http://localhost:${PORT}  (AI polish: ${process.env.GROQ_API_KEY ? 'on' : 'off'})`);
});
