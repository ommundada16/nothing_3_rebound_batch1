# Physio Twin

**Carry your physio home.** A prototype for *Srujana Hackathon, Problem 1: Life after a new knee*.

After knee surgery the patient recovers at home with little supervision. Our observation (from a
real recovery with a physio visiting every other day) is that a physio does three things that
disappear at home: he **measures**, he **coaches at the moment of effort** ("push, push, relax"),
and he **notices** when something is wrong. Physio Twin lets the physio **teach a system once**
(his reference, his voice, his rules) so all three continue between visits, and so the system
comes back to a person whenever it is not enough.

> The system never decides that something is safe. It only decides **who looks at a concern and
> how fast**, and it climbs the care chain on its own if nobody answers.

## What is in the prototype

| Area | What it does |
|---|---|
| **Live session** | Phone or laptop camera, on-device pose tracking (MediaPipe), live knee angle, rep phases, peak screenshots |
| **Active vs assisted** | Heel slides measured alone and with a strap or helper. A large gap means the patient holds back; a small gap with low numbers means a stiff knee |
| **Quad lag** | Straight leg raise with a small pillow, then without; knee deficit at the top. Progression is suggested but **approved by the physio** |
| **Physio's voice** | The physio records his own cues (English / Hindi / Marathi). The system plays them at the matching phase. A placeholder voice is clearly labelled until real clips exist |
| **Reference videos** | A healthy-person reference **and** a clip of this patient in their own room with their own props |
| **Care chain** | Visiting physio, primary physio, assistant doctor, surgeon. Acknowledge / reply / escalate / resolve (a note is required). Unanswered concerns climb automatically |
| **Safety net** | Physio-written red-flag rules run first; free text can only *raise* a level; data-driven flags (missed days, regression, holding back, possible stiffness, quad lag); a follow-up "did that help?"; a direct "call me" button |
| **Family view** | One plain status, no clinical detail, a one-time sharing choice |
| **Future** | The same teaching bundle could drive a room sensor or a home robot later |
| **Accuracy check** | Compare the camera angle with a protractor to quote an honest error range |

Histories in the demo are **synthetic**. The clinic test table uses real example numbers from the
builder's own rehab and is labelled as such. Nothing here is clinically validated.

## Run it

```bash
npm install          # also copies the MediaPipe runtime and fetches the pose model
npm run dev          # API on :8787, app on http://localhost:5173
```

To use a phone on the same Wi-Fi: phone browsers only allow the camera on HTTPS, so run
`npm run dev:phone` and open `https://<laptop-ip>:5173` (accept the self-signed certificate).

Optional: copy `.env.example` to `.env` and add a `GROQ_API_KEY` to polish clinician handover notes.

```bash
npm test             # rules, rep counter and the simulated pipeline
npm run build        # production bundle; `npm start` serves it from the API port
```

### Demo controls (bottom right of the app)
- **Scenario**: *progressing*, *holding back* (assisted much higher than active), *stiff* (both flat and below the milestone).
- **Demo clock**: jump +30 min / +4 h / +1 day to show an unanswered concern climbing the chain.
- **Simulated leg**: choose "Simulated leg" in session setup to demo without a camera.

## How it works

```
shared/      rules used by the server AND the app: triage, objective triggers, playbook, exercises
server/      Express API, JSON state and media on disk, issue / escalation engine (response-time timers)
src/lib/     geometry, rep phase detector, MediaPipe wrapper, simulated leg, cue player
src/views/   Patient, Session, Report, Physio, Studio, Chain, Family, Future, Validate
tests/       node:test suites
```

- **Angle**: knee flexion from hip-knee-ankle in pixel space, smoothed; leg lift from hip-to-knee against the bed.
- **Phases** (`src/lib/repCounter.js`): rest, moving, holding, released. Events drive the cues: start, push (looping), hold, relax, good, and "keep going" on a stall or early release.
- **Privacy**: video is analysed on the device. Only still pictures the patient saves are uploaded.

## Honest limits
- The camera angle is a **2D estimate**. Measure its error with the Accuracy check before quoting it.
- Strength, swelling and alignment are **not** measured from the phone.
- Default playbook rules are a **template**; the physio must review every line.
- The simulated leg and synthetic history are used for the demo and tests.

See `docs/` for the team plan, demo script and the checklist for the physio session.
