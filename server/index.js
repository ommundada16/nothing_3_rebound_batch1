import express from 'express';
import { installAccounts } from './accounts.js';
import { exercisePrescription, heelSlideTasks } from '../shared/exercises.js';
import { movementPlanError } from '../shared/movementPlan.js';
import { emptyCare, validateCare } from '../shared/care.js';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const DATA_DIR = process.env.PHYSIO_DATA_DIR || resolve(__dirname, 'data');
const MEDIA_DIR = resolve(DATA_DIR, 'media');
const STATE_FILE = resolve(DATA_DIR, 'state.json');
const MEDIA_INDEX = resolve(DATA_DIR, 'media.json');
const PORT = Number(process.env.PORT || 8787);

mkdirSync(MEDIA_DIR, { recursive: true });

// Import the user's two supplied reference videos without touching home-video slots.
const referenceFiles = [['stock_active','self knee slide.mp4'],['stock_assisted','assisted knee slide.mp4']];
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
const accounts = installAccounts(app, resolve(DATA_DIR, 'accounts.json'), user => {if(user.role==='patient'){state.activity={...state.activity,patientLastLogin:nowOf(state)};commit();}});
if (!state.care) { state.care = emptyCare(); commit(); }
if (state.plan.exercises.some(e => e.id !== 'heel_slide')) { state.plan.exercises = state.plan.exercises.filter(e => e.id === 'heel_slide'); commit(); }
if (!process.env.PHYSIO_SKIP_IMPORT) {
 for (const [slot,name] of referenceFiles) {
  const source=resolve(__dirname,'..','..',name);
  if(existsSync(source) && !state.refVideos?.heel_slide?.[slot]) {
   const id=randomUUID();copyFileSync(source,resolve(MEDIA_DIR,id));
   media[id]={mime:'video/mp4',kind:'video',name,ts:Date.now()};
   state.refVideos.heel_slide={...state.refVideos.heel_slide,[slot]:id};
   writeFileSync(MEDIA_INDEX,JSON.stringify(media));commit();
  }
 }
}
// This build supports one patient, one assigned physio and one guardian.
app.use('/api', (req,res,next) => {
 if(req.path.startsWith('/auth/') || req.path === '/health') return next();
 if(!req.account) return res.status(401).json({error:'Please sign in.'});
 const role=req.account.role;
 if(role === 'family' && req.method === 'POST' && req.path === '/sessions') return res.status(403).json({error:'Exercise sessions are recorded from the patient account.'});
 const staff=['physio','assistant'].includes(role);
 if(role !== 'physio' && (req.path.startsWith('/clock/') || req.path === '/reset'))return res.status(403).json({error:'Only the physio can use demo controls.'});
 if(!staff && (req.path === '/ai/note' || /\/issues\/[^/]+\/action/.test(req.path)))return res.status(403).json({error:'Only the care team can do this.'});
 if(req.method==='PUT' && req.path.startsWith('/state/')){
  const key=req.path.split('/').pop();
  const allowed=role==='physio' || role==='assistant'&&['care','patient'].includes(key) || ['care','family'].includes(key);
  if(!allowed)return res.status(403).json({error:'Only the assigned care team can edit this plan.'});
 }

 next();
});
app.get('/api/household', (_req,res) => res.json({members:accounts.users.map(accounts.publicUser)}));

app.get('/api/health', (_req, res) => res.json({ ok: true, rev: state.rev, ai: Boolean(process.env.GROQ_API_KEY) }));

app.get('/api/state', (req, res) => {
  const since = Number(req.query.since || 0);
  if (since === state.rev) return res.json({ rev: state.rev, unchanged: true });
  const visible = req.account.role === 'family' ? {
    patient:{name:state.patient.name,surgeryTs:state.patient.surgeryTs},
    family:state.family,care:state.care,plan:{exercises:state.plan.exercises.map(e=>({id:e.id,reps:e.reps,modesEnabled:e.modesEnabled,modeSettings:e.modeSettings}))},
    issues:state.issues.map(i=>({id:i.id,status:i.status,tier:i.tier})),
    sessions:state.sessions.map(s=>({id:s.id,exercise:s.exercise,mode:s.mode,isTestSession:s.isTestSession,completedReps:s.reps?.filter(r=>r.complete).length || 0,patientReportedCompletion:s.patientReportedCompletion,captureStatus:s.captureStatus,ts:s.ts}))
  } : state;
  res.json({ rev: state.rev, state: { ...visible, serverNow: nowOf(state), scenarios: SCENARIOS, ai: Boolean(process.env.GROQ_API_KEY) } });
});

app.post('/api/reset', (req, res) => {
  const scenario = SCENARIOS[req.body?.scenario] ? req.body.scenario : 'progressing';
  const rev = state.rev + 1;
  const retained = {care:state.care,cues:state.cues,cueLanguage:state.cueLanguage,refVideos:state.refVideos};
  state = {...freshState(scenario), ...retained};
  state.rev = rev;
  syncObjective(state);
  persist();
  res.json({ ok: true, scenario });
});

const EDITABLE = new Set(['plan', 'playbook', 'cues', 'cueLanguage', 'refVideos', 'family', 'patient', 'care']);
app.put('/api/state/:key', (req, res) => {
  const { key } = req.params;
  if (!EDITABLE.has(key)) return res.status(400).json({ error: 'Not editable' });
  if(key === 'plan') {const error=movementPlanError(req.body.value); if(error)return res.status(400).json({error});}
  if (key === 'care') {
    const next = req.body.value;
    if (!validateCare(next)) return res.status(400).json({error:'Check the care plan fields and times.'});
    if(!['physio','assistant'].includes(req.account.role) && (JSON.stringify(next.medicines)!==JSON.stringify(state.care.medicines) || next.proteinTarget!==state.care.proteinTarget || JSON.stringify(next.appointments)!==JSON.stringify(state.care.appointments))) return res.status(403).json({error:'Only the care team can change medicines, targets or appointments.'});
  }
  if(key==='patient' && (!req.body.value || !Number.isFinite(req.body.value.surgeryTs)))return res.status(400).json({error:'Enter a valid surgery date.'});
  state[key] = req.body.value;
  state.audit.push({ id: randomUUID(), ts: nowOf(state), by: req.body.by || 'physio', text: `Updated ${key}` });
  commit();
  res.json({ ok: true });
});

app.post('/api/sessions', (req, res) => {
  const s = req.body;
  if (!s?.exercise || !s?.mode) return res.status(400).json({ error: 'Bad session' });
  const session = { ...s, isTestSession:Boolean(s.isTestSession || s.leg && s.leg!==state.patient.leg), id: s.id || randomUUID(), ts: s.ts || nowOf(state) };
  if (!state.sessions.some((x) => x.id === session.id)) state.sessions.push(session);
  const created = syncObjective(state);
  state.audit.push({
    id: randomUUID(),
    ts: nowOf(state),
    by: 'patient',
    text: `Logged ${session.exercise.replace('_', ' ')} (${session.mode}), ${session.metrics?.peak==null?'measurement unavailable':`best ${Math.round(session.metrics.peak)}°`}`,
  });
  commit();
  res.json({ session, newFlags: created.map((i) => ({ id: i.id, title: i.title, tier: i.tier })) });
});

app.post('/api/exercise-alerts', (req,res) => {
 if(req.account.role!=='patient')return res.status(403).json({error:'Only the patient camera can record this alert.'});
 const {runId,angle,mode,leg}=req.body||{};
 const max=exercisePrescription(state.plan,'heel_slide',mode).maxFlexion;
 if(typeof runId!=='string'||runId.length>100||!Number.isFinite(angle)||!max||angle<max||!['active','assisted'].includes(mode)||!['left','right'].includes(leg))return res.status(400).json({error:'Invalid exercise alert.'});
 state.exerciseAlerts ||= [];
 if(!state.exerciseAlerts.some(a=>a.runId===runId)){
  state.exerciseAlerts.push({id:randomUUID(),runId,ts:nowOf(state),angle,maximum:max,mode,leg,isTestSession:leg!==state.patient.leg});
  state.exerciseAlerts=state.exerciseAlerts.slice(-200);commit();
 }
 res.json({ok:true});
});

app.post('/api/issues', (req, res) => {
  const report = req.body || {};
  const { issue, result } = createIssueFromReport(state, report);

  commit();
  res.json({ issue, result });
});

app.post('/api/issues/:id/action', (req, res) => {
  const out = applyAction(state, req.params.id, {...(req.body || {}),byLevel:req.account.role==='assistant'?3:1});
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
  const newFlags = syncObjective(state);
  if (tick(state) || newFlags.length) commit();
}, 5000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] Rebound server on http://localhost:${PORT}  (AI polish: ${process.env.GROQ_API_KEY ? 'on' : 'off'})`);
});
