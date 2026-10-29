## Companion interface redesign — 29 October 2026

- Patient navigation is now Home, Companion, My sessions and Care team. Replaced the old graph-heavy patient page with a calm home, original SVG robot concept, two prescribed exercise cards and session history. Existing physio/assistant/family accounts remain; shared styling is green/cream with orange actions.
- Our vision is available from every authenticated account. Future.jsx is a three-stage interactive concept walkthrough (everyday activity, exercise, human review), clearly separating working camera/messages from proposed robot and manufacturer-authorised implant integration. No robot, sensor, live implant data, partnership or general AI is claimed.
- Companion.jsx uses explicit guided FAQ answers, optional text-to-speech and the existing report/call-request endpoints. In-app call requests are not automatic phone calls or an emergency service. General treatment decisions remain with clinicians.
- Live exercise is a fixed full-screen camera workspace with one instruction line, angle/rep overlays, Mute, Camera help and Finish & save. Detailed guidance is now an on-demand modal. Setup/reference videos remain before starting. Existing camera inference was retained; no new accuracy claim.
- Poor capture no longer disables Save or suggests repeating a set. Save preserves a limited attempt with null angle, available evidence, captureStatus and optional patientReportedCompletion. Reported completion is labelled separately from measured reps in patient/physio views; it never manufactures reps or angles. Other-knee/demo sessions remain practice. Family projection includes completion metadata, not private pictures.
- New fictional seeded plans use a 2-second hold. Existing clinician prescriptions are preserved. The demo animation respects the current maximum by default, while safety tests still cover limit crossings.
- Verified 64 unit tests, production build, account/API integration checks (including limited reports and family privacy), desktop home, guided companion, interactive vision, phone width without horizontal overflow, full-screen simulation, and an immediately stopped zero-measurement session saving successfully to My sessions. All browser mutations were isolated tmp/review-data. Actual physical camera accuracy remains unverified.

## Detection recovery and camera help — 29 October 2026

- Fixed initial acquisition starvation when visibility winners alternate: initial side is selected from accumulated scores over 400 ms, rather than requiring an uninterrupted winner.
- Fixed stale spatial anchor lockout after camera/leg repositioning: LockedLegTracker can re-anchor the same side after 900 ms of stable coherent observations, rejecting overlapping legs and single-frame jumps. Reacquisition resets smoothing and invalidates any partial rep; no missing time is counted. It does not switch to the other anatomical side automatically.
- Added cameraGuidance.js for no pose, cropped joints, hidden joints, reconnecting and side-view instructions. Live positioning help and an expandable checklist appear when tracking pauses; setup guidance also appears before starting. A Check camera position again button reacquires without clearing saved full reps; detecting a different knee ends the run without mixed-knee saving. Speech remains once per loss episode.
- Camera-frame stalls show a separate connection/tab message. These suggestions reflect landmark/framing evidence, not a diagnosis of sitting posture.
- Verified 61 unit tests and production build; real laptop camera detection and clinical angle accuracy still require user testing.

## Follow-up fixes — 29 October 2026

- Each heel-slide mode has a separate prescription card and optional modeSettings overrides (reps, hold, maximum). shared/exercises.js exercisePrescription resolves inherited defaults; patient tasks, sessions, family completion and server live-alert checks use the appropriate mode. Existing plans need no migration.
- Session now uses LockedLegTracker: acquire a side automatically once, never switch on a visibility advantage, and reject abrupt joint displacement on that same label. Hidden/uncertain leg pauses; no invented angle for occluded joints. This reduces rear-leg takeover but cannot guarantee anatomical identity if the pose model slowly mislabels overlapping legs.
- RepCounter accepts slow movement starts, restarts hold timing if bending continues, and requires a sustained fall before early-release detection. Existing tracking-loss and prescribed-limit exclusions remain. No 90-degree measurement cap exists; the angle math/regression goes to 130 degrees. Do not exceed a doctor's restriction for testing.
- Physio Summary now includes saved practice sessions with knee/status, timestamp and reps, plus a recent saved-session list. Real saved entries take precedence over seeded data. Clinical completion/objective flags still exclude other-knee practice. Surgery record remains unchanged.
- Refresh on tab selection, window focus and visibility return; no-store requests and stale-revision protection supplement existing polling.
- Verified: 55 unit tests; build; isolated API checks for separate mode limits and saved-session visibility; physical webcam accuracy still unverified.

## Latest simplification — 29 October 2026

This section overrides earlier UI/OCR/side-selection descriptions below.

- Physio home searches the assigned patient by name (still one patient in this prototype). Opening the patient defaults to Today: recorded patient login time, per-exercise completion, and today's saved pictures. Summary is last.
- Alerts list prescribed heel-slide tasks not completed for over 48 hours and camera estimates crossing the prescribed maximum. Live camera limit events are sent once per run, persisted and deduplicated without requiring Save session. Other-knee practice is excluded from recovery alerts/completion. These are in-app alerts, not external notifications.
- Patient messages open as one modal conversation with a single reply box. Patient Messages includes an optional typed medicine name. Family can send a typed medicine concern. Medicine-photo/OCR UI, OCR code/dependencies/setup, Daily Care and medicine schedules were removed from navigation. Existing stored care/legacy reports are retained; appointments remain with the assistant and appointment reminders remain visible.
- Exercise plan shows separate assisted/unassisted +/− toggles and shared reps, hold and optional maximum bend. Saving drops the old hidden target; the engine uses its existing safe target under the max. Removing a mode removes that patient task. Existing precaution data is retained but no notes editor is shown.
- Camera side selection is automatic using MediaPipe anatomical labels and sustained visibility evidence: 400 ms initially, 1200 ms plus an advantage before a side change. A three-frame joint median filters isolated landmark spikes. No manual knee choice or saved side preference. If the side changes during a session, finish without a savable measurement to avoid mixing knees. Side-view occlusion can still confuse model labels; this is NOT clinical accuracy validation.
- Verified: 49 unit tests, production build, isolated API tests for login time, exercise modes, limit-event permissions and deduplication, and browser checks for search, Today-first navigation, recorded login, single chat, typed medicine report and simplified plan. Actual laptop webcam accuracy requires a physical retest.

# Update — simpler care roles, local medicine OCR and quieter tracking

This update takes precedence over older design notes below.

- Physio home now shows assigned patients only. Open a patient for a plain Summary, Exercise plan, Messages and Daily care. Graph-heavy overview is no longer displayed. Voice/video/routing/measurement tools are under More tools. Demo controls require ?demo=1.
- A fourth account role, assistant (Assistant surgeon), can register/sign in. It has its own assigned-patient home and a First two weeks appointment template. The assistant enters surgery date plus selected appointment dates/optional times; dates are not automatically prescribed or booked. Saved dates share through the existing server state to patient/family/physio. Server allows this staff role to edit care/patient data and review issues, and forces its replies to care level 3.
- Still one real care group / one assigned patient in this prototype. No fake multiple-patient directory or multi-clinic assignment is claimed.
- Patient/family food logging and typed support forms were removed. Food, equipment and support guidance is now inline with original local SVG illustrations; no outbound information links are shown. Diet suggestions are general and do not diagnose deficiencies. Existing care-team protein targets can be displayed, but no patient food/protein entry is required.
- Medicine concerns use Take/upload photo plus optional symptom buttons. Tesseract.js 6 reads English label text locally, using worker/core/language files copied into public/ocr by npm run setup. Those files are ignored generated assets. First-run OCR may take time; an unreadable label can still be sent with the original photo.
- Native barcode reading is attempted only if the browser supports BarcodeDetector. No drug-database lookup or automatic medicine suitability/side-effect diagnosis is claimed. Original photo, unverified OCR and any barcode are stored on the issue and shown to the physio and assistant surgeon. OCR text is NOT fed into symptom triage as if it were the patient's reported symptoms.
- User confirmed their tracking test was a SIDE VIEW of the RIGHT knee. Previous default was LEFT from the synthetic surgery plan. New large Left knee / Right knee buttons are directly on the exercise setup page, the selected side appears live, and the preference is remembered on that device. It does not change the surgery record. A different-knee session is saved as a test and excluded from recovery completion/objective flags.
- Tracker now combines a 0.35 landmark visibility heuristic with in-frame, limb-geometry and temporal-jump checks, instead of rejecting every sample below 0.65. Brief missing intervals up to 500 ms pause holding time; prolonged loss invalidates the partial rep. This is an availability/stability change, not proof of clinical angle accuracy. Physical right-knee testing is still needed on the user's laptop.
- Voice never cancels an active sentence for a new movement cue. Ordinary stale cues are dropped. A still-current bend warning may be next after the sentence finishes; outdated warnings are discarded. Removed repeating push/angle narration, spoken hold counts and repeated stalled prompts. Camera guidance is spoken once per loss episode and rearmed only after stable recovery. Explicit Stop/Mute still stops sound.
- Verified: 45 unit tests; production build; four-account API checks (including assistant permissions and appointment edits); browser assigned-patient home, plain patient summary, guardian suggestions with ZERO external links and ZERO food input fields, successful local OCR of a synthetic medicine label, original image plus OCR visible in the assistant's message view, and successful browser save of the first-fortnight date plan. Date/time controls use onInput for reliable embedded-browser events.
- Generated OCR assets need npm run setup after a fresh clone. Test data and synthetic label files were kept in ignored tmp/review-data and tmp/. No real prescription or surgery dates were changed by tests.

---

# Update — 29 October: real camera and bend restrictions

- User will test first with the laptop webcam. Front/laptop camera is now the default. Use Chrome/Edge at http://localhost:8787 and allow the camera; no LAN HTTPS is needed for this laptop-local test.
- Fixed the camera startup ordering: acquire stream, load model, render live video, wait for the video element, then attach/play and run inference. Late-acquired streams are stopped after cancellation; permission requests have a 20-second timeout with an actionable message.
- MediaPipe full model is downloaded by npm run setup (and npm install). Model/runtime are ignored generated assets; run setup on another checkout before testing.
- Physio Plan now has optional doctor maxFlexion and targetFlexion fields. NO 90-degree limit has been set for the user's real patient. Ninety degrees is only a fictional test setting in tmp/review-data. Warnings begin 5 degrees before a prescribed maximum; repetition targets must stay at least 5 degrees below it.
- Two new reusable cue slots: near_limit and angle_limit. Real physio recordings are preferred. Missing clips use a system voice that names the prescribed limit.
- Warning cues interrupt encouragement. Raw and smoothed angles are considered for warning timing. Hysteresis prevents frame-to-frame warning spam. A repetition that crosses the estimated maximum is not counted as complete.
- Missing landmarks or a stalled frame stream invalidate the partial rep and require returning to the starting position. Unobserved time cannot count as a hold.
- Peak stills now use the current frame's landmarks. Images are uploaded only on Save. Warning events and the limit used are included in a saved session.
- Sessions with fewer than ten accepted frames or less than 60% accepted frames cannot be saved as a zero-angle measurement. These are engineering gates, not clinical validation. Patient/family task completion now requires the prescribed number of full reps, rather than any session record.
- Verified: 39 unit tests; production build; clinician limit field save; camera-permission timeout message; actual model inference on the supplied human reference clip; camera stream lifecycle through an isolated recorded-video-as-camera QA fixture.
- Important limit: the in-app preview did not grant physical webcam access. Do NOT claim a physical human webcam session or angle accuracy was validated. The provided close-up clip had very poor visibility in both lite and full models; use torso/hip/knee/ankle side-on framing. Physical testing against a goniometer and audio audibility are still required.
- Temporary QA fixtures were generated only in ignored dist/ and removed by the final production build. Test patient/physio settings stayed in ignored tmp/review-data, not the user's real saved data.
- Full explanation and open-source references: docs/CAMERA_TRACKING.md. No unrelated GitHub rep-counter code was copied. Rebound uses official MediaPipe plus its own heel-slide and limit rules.

---

# Update — Rebound exercise simplification

- Product name in the app and browser title is now Rebound (repository folder unchanged).
- Patient has two separate tasks: Heel slide — unassisted and Heel slide — assisted. They use the existing heel_slide engine with distinct active/assisted modes. Completion is checked separately for each mode.
- Exercise pages immediately show the matching healthy-person video. The home video appears when uploaded; no empty home-video placeholder is shown.
- Removed the mode selector and extra setup panels. Camera/demo settings and clinician reminders are under one optional section. Base text is larger.
- Logo returns to the signed-in account's landing screen and resets nested navigation, even when the URL already points home.
- Active plans are migrated to heel slides only; historical leg-raise recordings remain saved but do not generate new objective flags.
- Leg raise is hidden from current exercise choices, video management, patient charts and recent-session display. Existing implementation and historical data are retained for later.
- Family session summaries now include mode so assisted and unassisted completion remain separate.

---

# Update — 28 October: accounts and daily care

The sections below this update describe the previous build. This update takes precedence for the changed features.

- Missed-session objective checks now also run on the server timer; explicit chest/breathing emergency text now follows the emergency checkbox workflow.
- User asked to leave live camera setup/testing and patient home recordings until 29 October. Earlier camera/hold-counter findings are still pending; do not claim they were fixed.
- New sign-up/sign-in for patient, physio and family. This is one care group only: one account per role, automatically linked. This is a controlled hackathon prototype, not a multi-clinic account system. No invitation/verification/password-reset workflow yet.
- Passwords are salted and hashed; sign-in uses an HttpOnly session cookie. Sessions expire in 24 hours or when the server restarts. Accounts persist in ignored server/data/accounts.json. Never commit runtime data or real credentials.
- Patient and family have Daily care: shared medicine check-offs, food/protein log, appointments, equipment guidance, insurance notes and official financial-help links.
- Physio has Daily care for entering the treating doctor's prescription, dietitian's protein target and follow-up appointments. Family/patient cannot change these protected fields through the API.
- Suspected medicine side effects from patient/family are routed to level 3 (assistant doctor). This is an in-app review entry, not an SMS or external notification. The app does not diagnose side effects or change prescriptions.
- Reminder banners refresh every 30 seconds while open. No background/push notification service.
- The earlier “can’t vs won’t” framing is not a diagnosis: active/assisted differences need clinician review. Dashboard and flag descriptions now state this limitation.
- Physio voice clips remain saved and reused in the single care group. My account lists registered group members. Multiple assigned physios/patients are future work.
- Family API responses omit private exercise photos, pain scores, clinic baseline and playbook.
- Two supplied videos at D:/srujana/self knee slide.mp4 and D:/srujana/assisted knee slide.mp4 are imported on server startup into healthy-person active/assisted reference slots. Home slots are preserved and remain separate. Existing stock/home uploads are not overwritten.
- User confirmed "EMR" meant EMS. BFR and EMS are not automatically recommended or sold. Equipment list is phase-based discussion guidance linked to AAOS, without checkout or vendor claims.
- Nutrition guidance links to Royal National Orthopaedic Hospital. No automatic protein prescription. Financial help links to official PM-JAY information; no verified NGO partnerships.
- Mobile layout uses available width, wraps controls, stacks grids and keeps content below the header. Verify on physical phone tomorrow too.
- Verified: 32 automated tests pass; production build passes. Isolated integration checks cover all three accounts, protected prescription fields, family privacy, dose logging, assistant-doctor routing and video references. Browser checks cover patient/family daily care at phone width and physio setup at tablet width. The normal app is served at http://localhost:8787.
- Tests: npm test; npm run build. Integration script scripts/check-accounts.mjs uses TEST_BASE and MUST ONLY point to an isolated test server, because it creates fictional accounts and edits care plans. Use PHYSIO_DATA_DIR pointing to tmp/review-data with PORT=8791. tmp/ is ignored.

---

# HANDOFF: Physio Twin (Srujana Hackathon, Problem 1)

Last updated: 2026-10-28 (the day before the prototype deadline).
This file is meant to give a new person, or a new Claude session, the full context: who it is for,
what the hackathon wants, what was learned, what was decided and why, what is built, what is not
tested, and what to do next.

---

## 1. The situation

- **Event:** Srujana Hackathon Series, Round 1, organised by **Biorad Medisys** (a Pune-based medical-device maker; knee and hip implants under its Orthovasive division). Problem statements were released Saturday 17 October 2026.
- **Chosen problem: Problem 1 (Medical), "Life after a new knee".** After joint replacement surgery, patients recover at home with little supervision: some stop exercises, some miss warning signs, many are anxious, and the surgeon only sees them at follow-ups. *How might we make the time between discharge and full recovery go better for the patient, their family and the surgeon?*
- **Deadlines:** working prototype on **29 Oct 2026**; presentation (PPT) on **31 Oct 2026**. A fixed presentation duration exists (length not yet known).
- **Team:** three people, but the user (the builder) is doing nearly all the work with Claude Code. Teammate 2 is technically fine if things are explained; teammate 3 is weaker technically. **Rule: every member must contribute through their own GitHub account and it must show in the commit history.**
- **Judges:** about 2 to 3 technical people and 2 to 3 non-technical people (probably doctors).
- **Judging criteria (from the PDF):** problem understanding and user insight, originality of the solution ("a fresh approach, not the obvious first idea"), fit and feasibility (would it work in an Indian hospital or home, would people use it, is it realistic to build and run), prototype (a working version of the most important part), presentation and Q&A. The PDF also says: explore more than one idea, explain why you chose yours over the alternatives, and talk to real people (patients, physios, nurses, doctors) wherever you can. Data can be public datasets, synthetic data, or data you collect with consent.
- **Lesson from the previous hackathon by the same organiser:** credit went mostly to **innovation**, not implementation. Last time (a hospital website) everyone built generic AI websites; judges wanted thinking about the far future ("will hospitals even exist in 50 years?"). So the pitch needs a bold, original idea plus a real working core, and a vision slide.

## 2. Who the user is, and what they told us

- 20-year-old professional footballer, **left knee, ACL reconstruction with a bone-patellar-tendon (BPT) graft plus 7 meniscus stitches (medial and lateral meniscus tears)**, surgery in December 2025. About 10 months out they can run and do normal activities but cannot yet play.
- **Important gap:** the problem statement is about **total knee replacement (TKR)**. The user's experience is ACL/meniscus. The recoveries overlap (swelling, range of motion, quad strength, fear, drop-off) but a TKR patient is usually older, has different restrictions, and worries about an implant. The user has **no TKR patient in their contacts**, so TKR input comes only from their physio, the literature and clearly labelled assumptions. Be honest about this in the pitch.
- **Their rehab protocol:** 1 month non-weight-bearing on the left leg (walker), 90 degrees flexion limit for 1 month, then progressively more difficulty and range, sticks, a hinged brace, then free walking.
- **Care team (a chain, not one person):** surgeon → assistant doctor → primary physio (visited once every 2 weeks) → a visiting physio who came to their home on alternate days. Issues were raised at the lowest level (the visiting physio) and moved up the tree by severity.
- **Their worst moments and fears:** immense pain and not wanting to move; patella pain; fear the graft or stitches would tear or loosen; fear of sleeping (something could happen while unaware); fear of missing exercises; big swelling; fear of water touching the stitches; fear of internal bleeding and **blood clots** from lack of movement; fear of losing muscle mass; being dependent on others even for the washroom; the knee cap **locking** during exercises and feeling dislocated; random clicking; cramps (medication plus low water intake).
- **Adherence:** they skipped exercises because of pain and because they relied on the physio to push them. The physio could tell they had skipped a session because their performance dropped the next day. **They tracked progress purely from memory**, so they could not progressively overload.
- **What the physio did when called:** asked for a detailed description, asked for a **photo of the knee**, and gave reassurance through **active fixes** (ice, avoid exercise today if swelling is more, or do light exercise) plus "I will come tomorrow and check".
- **Strong preference:** they would **trust a recorded explanation from their own physio** over a generic AI answer. "The physio is the most important person, our best friend while recovering."
- **Family:** supportive but stressful. Constant questions ("what did you do all day, did you do your exercises, how are your studies?") were unanswerable and frustrating. They wanted to **dump their thoughts without judgment** ("will I ever play again?"). They would have wanted daily access to the physio and "someone beside me to just talk with".
- **Family sharing for TKR patients:** TKR patients are older and families will not manage per-update approvals, so sharing is set once.
- **Tools they used:** music, meditation, movies (which became boring). They used Gemini plus a call to the physio when worried; "many people may not have access to the services I had."
- **Clinic testing they went through** (a MoveHealth+ app with ForceDecks force plates, DynaMo strength, HumanTrak camera tests, dated 2 Jun 2026): left vs right knee extension 44 vs 60 lb (27% less), knee flexion 34 vs 45 lb (24% less), lunge 90° vs 104°, squat 111° vs 120°, single-leg squat 77° vs 83°, hop contact time 0.7 s vs 0.4 s, hip strengths 6 to 19% lower on the left, eyes-closed single-leg balance sway much worse on the force plate (3739 vs 1593 mm²). Their MoveHealth+ exercise screen showed "Sessions in last 7 days: 0" (a possible adherence example, unverified). These tests are late-stage, athlete-level, so they support the story but are not early-phase home metrics.
- **Videos of their physio** (described to Claude in text; the videos were not viewable on this machine, no ffmpeg): in the gym on force plates with a barbell the trainer says "Push, push, push… relax"; on the therapy table the physio bends the leg through angles and cues "Push, push" and "Chhoro" (release), in Hindi/English mix. The user says the native word is Marathi "dhakal, dhakal" (push). **Cues are tied to phases of effort** (effort, hold, release), not motivational speeches.
- **Working preferences:** build it with Claude Code; wants the project to be "grand" and **innovative, not a generic rehab app** (they said the first ideas felt generic and told us to be blunt). Prefers surveys to be avoided ("no one answers properly") and real conversations instead. Wants **commits made continuously as milestones are done** (professional practice, and judged). Wants a **simple, minimal, white/light UI like the MoveHealth+ screenshots**. Free-tier tools only (Groq is free; no paid cloud). Laptop: 16 GB RAM, 3 GB GPU, Windows 11.
- **Git identity on this machine:** `ommundada16` (ommundada16@gmail.com). All commits so far are under this identity. User email on the Claude account: saurabhladdha44@gmail.com.

## 3. Research findings (and corrections of earlier mistakes)

The user pasted a long Gemini conversation. What was kept and what was found wrong:

- **Kept (useful):** the landscape of categories: smart implants (Zimmer Biomet Persona IQ with Canary Medical), phone-camera goniometer apps (Curovate, ACL Rehab Tracker), digital physio with sensors (Sword Health, Hinge Health), tethered platforms (mymobility, Activate TKR). The documented gap: none of these track fear, confidence, the family experience, or the physio's own voice. Citable sources named: an NIH/PMC meta-synthesis of patient perspectives, an MDPI paper on the roughly 20% dissatisfaction rate. Read them before citing.
- **Wrong in the Gemini answer:** it said Biorad Medisys makes the **CUVIS robot**. CUVIS is made by **Meril Life Sciences** (Curexo platform). Verified facts about Biorad: Pune-based, Orthovasive division, Genius/Genuin total knee FDA 510(k) cleared in 2021. "Excel MPK with IIT Bombay" and "Ouro Golden Knee" were **unverified**; do not use them. Sword's "24 visits down to 3" claim is unchecked.
- **The Gemini personas (Deepa, Rajesh, Meera, Dr. Vikram) are invented composites**, not real people. Present them only as archetypes. Real evidence = the user's own story, their physio, the literature.
- **A mistake made by Claude earlier, now corrected:** Claude suggested validating the camera angle with a **hinged ruler jig**. That cannot work, because the pose model only detects human bodies. The valid method is a **real leg held at several angles compared with a goniometer or protractor** (built as the *Accuracy check* tab).
- **Competitors to acknowledge honestly:** MoveHealth+ (the user's clinic app) already assigns exercises, shows tests and allows video upload. Camera angle apps already exist. Do **not** claim motion comparison, recorded coaching or remote rehab as novel. The same jump test read very differently on two systems at the clinic (ForceDecks 10.1 in vs HumanTrak 15.2 in drop jump), so expect a judge to ask how accurate camera measurement is.

## 4. Ideas considered and the path to the final concept

Rejected or demoted, with reasons:
- Plain phone-camera angle tracker: obvious, already exists.
- Predictive "digital twin of the knee": no data to substantiate patient-specific predictions.
- Generic "recovery companion" / daily check-in app: the user judged it generic; check-in fatigue (they would abandon it when in pain or busy).
- Between Visits (AI explains why a patient struggles): still generic by the user's judgement.
- Other ideas explored and parked (could go on the future slide): time-capsule voice notes from recovered patients, life-goal recovery for Indian daily life (floor sitting, squatting, temple steps; Western ROM targets are lower), exercise-free ambient monitoring (sit-to-stand), "what if I skip" simulator, night guardian (leg position during sleep), knee-click acoustic tracking (unverified research, too risky in the time), smartwatch (dropped: little gain over the camera).

**Final concept: "Physio Twin: carry your physio home."**
Thesis: *At the clinic you get numbers and a voice. At home you get neither.* A physio does three jobs that vanish at home: **measure, coach at the moment of effort, notice problems**. The physio **teaches a system once** (his reference video in the patient's own room, his own recorded voice cues, his own if-then rules) and the system delivers that between visits and **comes back to a person whenever it is not enough**. The twin is of **the physio's judgement**, not the knee.

Key ideas the user added or chose (all built):
1. **Live camera angle tracking, saved daily** for heel slides.
2. **Active vs assisted angle comparison**: separates **"can't vs won't"**. A big gap means the knee can bend more than the patient dares (fear, pain, weakness: coach and reassure). Both flat and below the milestone means possible mechanical stiffness (scar/arthrofibrosis: needs early review by the surgeon).
3. **Straight leg raise to address quad lag**, first with a small pillow under the knee, later without (progression suggested by data, **approved by the physio**).
4. **Two videos per exercise:** a clean reference of a healthy person **and** a clip of this patient in their own room with their own pillow, recorded with the physio.
5. **Peak-moment screenshots** with the angle drawn, so the physio sees evidence.
6. **The physio's voice continuously during the live exercise**: "push, push", "chhoro", etc., in English/Hindi/Marathi, recorded once at setup, played according to the live movement phase.
7. **Daily logs; the patient reports issues in the app; the app analyses first, then routes to the first (visiting) physio only if needed**, then up the real care chain. Concern: the system might overlook something. Solved with the safety-net design in section 6.
8. **Future-work section in the app:** the same teaching bundle later drives a room sensor or a home robot (the physio teaches once). Today it is a phone on a tripod. Idea for the presentation: three people act as patient, physio and "camera robot"; the user decided to say that for now the camera and tripod are set up manually and in future a robot would move around and frame the leg.
9. **Presentation of the 50-year idea:** a vision slide, not a build. Today a phone; later implants that report movement (ties to Biorad as an implant maker) and ambient sensing; eventually recovery without appointments with physios supervising AI at scale.

## 5. What is built (as of the last commit)

Repository: `D:\srujana\physio-twin` (git repo, branch `main`, about 14 commits, no remote; **nothing pushed to GitHub yet**).

**Stack:** React 18 + Vite (plain JavaScript/JSX), Node + Express backend, MediaPipe (`@mediapipe/tasks-vision`) pose tracking in the browser, hand-written SVG charts, plain CSS, Node's built-in test runner. Shared rules in `shared/` are imported by both the server and the app.

**Screens and features**
- **Patient (phone-first, minimal):** home shows a greeting, "Day N of your recovery", one card with today's exercises (Heel slide, Straight leg raise) and a quiet "Something feels wrong?" link. "More" holds: ask my physio to call me, ask family for help placing the phone, precautions. Tabs: Today, Progress (heel slide chart with physio milestone, plus a collapsed leg-raise chart), Help (report a problem, my messages).
- **Session (the core):** choose Active or Assisted, then Start. Camera by default (with a one-tap fallback to the **simulated leg**); camera settings, reference videos and precautions are folded away. Live: angle HUD, rep count, phase text, hold ring, tracking confidence meter, "I can't see your knee" guidance, mute and stop. Rep phases: rest → moving → holding → released. Cues: stop (every session start), start, push (looping), hold (and spoken counts if no real hold clip), relax, good, "keep going" on a stall or early release, done. Peak screenshots (top 3) are captured. Summary: best angle, full reps, knee deficit for leg raise, tracking quality, a pain and confidence self-report, then Save.
- **Report a problem:** seven common symptom options (chest/breathing, swelling more, calf pain/swelling, fever, locking, clicking, low mood), more under a fold; pain 0 to 10; optional text, voice note, photo. Result screen shows the plain guidance from the physio's playbook, why it was routed, who was notified, and promises a follow-up. Chest pain or breathing trouble shows "Call 112 now".
- **Physio:** Overview (patient header with urgent/review/FYI counts, a **can't vs won't verdict**, data-driven flags, bend chart active vs assisted with milestone line, gap chart, collapsed leg-raise/quad lag and confidence/pain charts, recent sessions with peak screenshots, collapsed clinic-test table with left as percentage of right, activity log). **My voice** (record or upload clips per cue slot, caption text, language for new clips and for what the patient hears: English/Hindi/Marathi). **Videos** (upload or record reference and in-room videos). **Plan** (reps, hold, pillow stage, precautions, approve pillow removal when suggested). **My rules** (editable thresholds, milestones, response times, symptom rules and keywords, reset to template). **Accuracy check** (see below).
- **Care chain:** a four-level pipeline: 1 Visiting physio, 2 Primary physio, 3 Assistant doctor, 4 Surgeon; view as any level. Per level: "With you now", a daily digest of low-level (FYI) concerns the app handled, "Copied to you", resolved. Issue detail: why it reached you, what the patient reported (photo and voice), what the patient was told, a "what changed" table (latest vs 3 days ago, milestone), conversation, and actions: acknowledge, reply, escalate, resolve (**a note is required**), "routing was wrong", optional handover-note draft (Groq if a key is set, template otherwise). Response-time countdowns; overdue concerns climb automatically.
- **Family:** one plain status (red/amber/green wording, no clinical numbers), optional "which exercises are done" sharing chosen once, and a helper request flow (patient asks, family says "on my way").
- **Future:** "Teach once, support always" explanation, an animated camera-robot concept, four-stage roadmap, honest comparison with existing approaches, and explicit limits.
- **Demo panel (small "Demo" button):** switch scenario (progressing / holding back / stiff), advance the demo clock (+30 min, +1 h, +4 h, +1 day), back to real time, and a toggle "make rep 2 stall" for the simulated leg.
- **Accuracy check:** capture the median camera angle of the last second at held angles, type the protractor/goniometer reference, see mean error, bias, largest error, a scatter plot, and export CSV.

**UI decisions:** white light theme only (no dark mode), background `#f4f5f6`, orange accent `#f47b20`, navy `#2a3b4d` pills, large rounded white cards, minimal home. A "View as" dropdown in the top bar switches roles (Patient, Physio, Care chain, Family, Future).

## 6. Safety design (important for the Q&A)

The system **never decides something is safe**. It only decides **who looks at a concern and how fast**, and it climbs on its own when ignored.
1. **Physio-authored red-flag rules run first** (editable template defaults): chest pain/breathlessness (emergency), calf pain/swelling (possible clot) urgent, wound opening/leaking, numbness or cold/blue foot urgent, fever with redness/heat or wound urgent, fall plus cannot bear weight urgent, pain ≥ 8 urgent, pain ≥ 6 review, more swelling plus pain ≥ 5 review, and so on.
2. **Free text can only raise the tier, never lower it.** Keywords include English and a few Hindi/Marathi words (e.g. bukhar, taap).
3. **Three tiers, nothing discarded:** Urgent, Review, FYI. FYI items appear in the physio's daily digest with a "this was wrong" button.
4. **Objective triggers that do not depend on what the patient says:** no exercise for 2+ days; active range dropped by 10+ degrees vs recent best; assisted far above active for 3 days (holding back); assisted and active both flat and below the day's milestone (possible stiffness, routed to level 2 with the surgeon copied); quad lag at or above the warning level and not improving. Also a suggestion (never an automatic change) when quad lag is low enough to remove the pillow.
5. **A direct "ask my physio to call me" button** skips triage on purpose (always urgent).
6. **Response-time ladder:** urgent must be acknowledged in 30 minutes, review in 4 hours (defaults, editable); after acknowledging, resolve within 3 hours (urgent) or 24 hours (review). Unanswered or unresolved concerns auto-escalate one level, up to the surgeon, where an overdue flag is raised. Resolved needs a note. The system can never resolve for a human.
7. **Follow-up loop:** after guidance, the patient is asked "did that help?" about 2 hours later (demo clock can jump). "Worse" raises the tier; "no change" raises FYI to Review; "better" never closes it; no answer after a further grace period raises it to Review.
8. Patient-facing guidance comes from the physio's own playbook and is labelled "not a diagnosis".

## 7. Architecture and file map

```
physio-twin/
  HANDOFF.md                this file
  README.md                 overview, run instructions, honest limits
  package.json              scripts: dev, dev:phone, server, web, build, start, test, setup
  vite.config.js            proxies /api to :8787; basic-ssl only in `--mode phone`
  index.html, .gitattributes, .gitignore, .env.example (optional GROQ_API_KEY)
  scripts/setup-assets.mjs  copies MediaPipe wasm to public/wasm and downloads the pose model
                            (public/wasm and public/models are gitignored; created by npm install)
  shared/                   used by BOTH server and app
    constants.js            cue tags, care levels, tiers, symptom list, emergency number 112
    exercises.js            heel_slide (signal: flexion) and slr (signal: lift); landmark indices
    playbook.js             DEFAULT_PLAYBOOK: thresholds, milestones, SLAs, symptom rules, keywords
    triage.js               deterministic explainable triage
    objective.js            data-driven flags and suggestions; heelByDay / slrByDay; expectedFlexion
    time.js                 IST-based day index, day post-op, formatters
  server/
    index.js                Express API, JSON state + media on disk (server/data, gitignored), 5 s tick
    issues.js               issue creation, actions, follow-up, SLA escalation, clinician note
    seed.js                 fresh state, three scenarios, real clinic baseline rows
  src/
    main.jsx, App.jsx       shell, hash routing, role selector, error boundary
    styles.css              the light theme
    lib/                    api.js (fetch + polling store), geometry.js, repCounter.js, pose.js,
                            sim.js (simulated leg), cues.js (cue player), data.js (chart series)
    components/             ui.jsx (cards, badges, SVG LineChart, LegFigure, lightbox, toast),
                            RefVideos.jsx
    views/                  Patient, Session, Report, Physio, Studio, Chain, Family, Future,
                            Validate, DemoPanel
  tests/                    shared.test.js, repCounter.test.js, pipeline.test.js, issues.test.js
  docs/                     TEAM_PLAN.md, DEMO_SCRIPT.md, PHYSIO_SESSION_CHECKLIST.md
```

**How the measurement works:** knee flexion = 180° minus the interior angle at the knee from hip-knee-ankle in **pixel space** (aspect-ratio corrected), smoothed with an exponential filter; leg lift = angle of hip-to-knee against the image horizontal; tracking confidence = the lowest landmark visibility among the three joints, with a 0.5 gate. For the leg raise, knee deficit during the hold is the average flexion at the top. Quad lag = active deficit minus assisted deficit (approximated by active deficit when no assisted value). **Rep phases** are detected in `repCounter.js` (min peak 30° heel slide / 15° leg raise, hold defaults 3 s and 5 s, early release if the value drops more than 8° during a hold, stall after 2.5 s of stillness below the minimum). Video is analysed **on the device**; only the still pictures the patient saves, photos and voice notes are uploaded.

**State and sync:** one source of truth on the server (`server/data/state.json`), the app polls every 1.5 s, so a phone and a laptop stay in sync. Demo clock offset is server-side so escalation can be shown quickly.

**Seeded history:** surgery date is set 21 days before startup (so "day 21+" on first run); 14 days of synthetic history are generated (heel slide active and assisted, leg raise active and assisted, with pillow removal around day 9 of the series), leaving **today empty** for a live session. Reset via the Demo panel.

## 8. Run, test, build

```bash
cd D:\srujana\physio-twin
npm install        # also runs scripts/setup-assets.mjs (wasm copy + model download)
npm run dev        # API :8787 + app http://localhost:5173
npm run dev:phone  # HTTPS (self-signed) so a phone camera works: https://<laptop-ip>:5173
npm test           # 27 tests pass
npm run build      # production bundle; `npm start` builds and serves it from :8787
```

Practical notes learned:
- If `npm run dev` exits immediately, a **stale API process is holding port 8787**; kill it (`taskkill //PID <pid> //F`) and restart. `concurrently -k` takes both processes down when one dies.
- A Claude browser-pane preview config exists at `D:\srujana\.claude\launch.json` (name `physio-twin-web`, attaches to http://localhost:5173).
- The in-app browser pane does not paint when hidden, so animation frames stop; the **simulated leg runs on a timer** to stay testable.
- Optional `.env` with `GROQ_API_KEY` (free) polishes the handover note; routing never depends on it. Model used: `llama-3.3-70b-versatile`.

## 9. Test and verification status

**Verified:** 27 automated tests pass (triage rules, objective flags, rep phases, simulated pipeline accuracy within 3° for flexion and 1.5° for deficit, escalation ladder to the surgeon, resolve guard, follow-up rules, data-driven flag dedupe). Production build is clean; production serving, SPA fallback, wasm and model files were served correctly. In the browser pane: patient home, session setup, simulated session (angle, phases, cue captions incl. a real uploaded clip, screenshots saved), report flow, follow-up "worse" raising the tier, care chain escalation after advancing the clock, physio overview verdicts for the holding-back scenario, Future and Family views. MediaPipe loads (about 0.4 s) and runs on a blank frame.

**NOT yet verified (do these next, the pane has no camera or microphone):**
- Real camera tracking accuracy on a human leg, laptop and phone (front/back camera, landscape/portrait, left/right leg, auto side).
- Microphone recording of physio cues, voice notes, and in-app video recording.
- Phone over HTTPS (`npm run dev:phone`, certificate warning).
- The simplified UI after the last redesign was only eyeballed for the patient home, session setup and physio overview; the Help, Care chain, Family, Future screens were not re-checked visually after the restyle.
- Layout at tablet width.

## 10. Honest limits (say these out loud in the pitch)

- The camera angle is a **2D estimate**; measure and quote its error from the Accuracy check. It is a trend tool, not a clinical measurement.
- Strength, swelling and alignment are **not** measured from the phone.
- Demo history is **synthetic**; the clinic-test table is the builder's real ACL data and is labelled as such, not the synthetic TKR patient.
- The default playbook rules are a **template** the physio must review.
- Nothing is clinically validated. The app does not diagnose.
- Comparison with existing products is general and from public information; check claims before presenting.

## 11. Decisions log (so no one re-litigates)

| Decision | Why |
|---|---|
| Problem 1 (Life after a new knee) | Fits the user's lived experience and the judging emphasis on user insight |
| Concept = the physio teaches once; his voice, room and rules | User trusts their physio over generic AI; avoids AI inventing clinical advice; makes the physio the author |
| Core measurement = active vs assisted ("can't vs won't") | Novel clinical framing; separates fear from stiffness; time-critical for the surgeon |
| Quad lag via straight leg raise, pillow to no pillow | User's idea; real clinical problem; physio approves progression |
| Cues tied to effort phases, played from the physio's own clips | Mirrors how the physio coaches; rule-based, reliable, no AI invention |
| Safety net: route, never close; objective triggers; escalation ladder; follow-ups; direct call button | Answers "what if the system overlooks something" |
| Family sees one plain status, set once | TKR families are older and cannot manage per-update approvals; stops the "did you do your exercises?" interrogation |
| Web app (React PWA-style) used on laptop and phone | Phone is the most accessible device; one codebase |
| Video processed on-device; Groq only for optional note polish | Privacy; free tier; AI cannot affect routing |
| English UI first; cue audio multilingual | Language is mostly UI; the physio's own voice matters more |
| Smartwatch dropped | Little gain over the camera, adds hardware risk |
| Light white UI, minimal home, orange accent | User asked, to look like the MoveHealth+ app they know |
| Commit continuously with clear messages | User asked; commits are judged |

## 12. Open tasks and next steps (priority order)

1. **Test the real camera** on the user's laptop and phone; tune smoothing and thresholds in `repCounter.js` and `Session.jsx`. If tracking is poor lying down, adjust camera placement guidance (side view, bare leg, 1.5 to 2 m, knee height) before the demo.
2. **Physio session** (checklist in `docs/PHYSIO_SESSION_CHECKLIST.md`): get **written permission** to use his voice and image; record cue clips (start, push ×2 to 3, hold, relax/chhoro, good, keep going, slow down, stop if sharp pain, done) in Marathi/Hindi/English; record reference videos (a healthy person) and this patient's own-room videos; confirm plan and playbook rules; ask the 12 interview questions (the user has only 10 to 15 minutes with a secondary physio who visited at home; no goniometer likely).
3. **Accuracy check:** 6 to 10 held angles against a protractor/goniometer; commit the CSV under `docs/validation/` and quote "camera estimate, mean error X°".
4. **Demo rehearsal** per `docs/DEMO_SCRIPT.md` (about 5 minutes): set scenario to "holding back", demo clock jump to show escalation, simulated leg as the backup. Make a **recorded backup video** of the full demo.
5. **GitHub:** create the repo and push (not done; needs the user's go-ahead). Add the two teammates and have **each commit real work from their own account** (`docs/TEAM_PLAN.md` lists tasks: Member A movement engine and accuracy; Member B care chain/playbook review/server hardening; Member C patient/family UX, Hindi/Marathi strings, accessibility, slides and recordings). Note: all current commits are under one account, which the rules may question; teammates must commit genuine work from now on.
6. **PPT by 31 Oct:** problem and user insight (the real story, the physio chain, the TKR gap stated honestly), the alternatives considered and why they were rejected, the prototype walkthrough, safety design, limits, and the 50-year vision (physio teaches once; phone now, room sensor, implants that report movement, home robot later).
7. Re-check visually the Help, Care chain, Family and Future screens after the restyle; check tablet width.
8. Possible polish if time: Hindi/Marathi UI strings, larger text option for older users, a first-run onboarding that shows the physio recording once, notification stub for urgent concerns, server-side request validation.

## 13. Questions judges may ask, and the prepared answers

- *How accurate is the angle?* Our own test against a protractor: mean error X° on N readings (Accuracy check). It is for tracking one patient's trend, not a clinical measurement; the clinic's own camera system disagreed with its force plate by several inches on the same jump, so we are explicit about error.
- *What if the app misses a problem?* It cannot dismiss one: red-flag rules first, free text only raises, data-driven flags, escalation ladder, follow-up loop, direct call button, and the physio sees a digest of everything.
- *Is it AI?* The decisions are physio-written rules. The only AI is optional polish of a handover note and it cannot change routing.
- *Why not a smart implant or a robot?* Cost and availability; and they cannot capture fear, confidence or the family. They are future stages that the same teaching bundle can drive.
- *Does it work for TKR?* The heel slide and straight leg raise are standard in TKR and ACL rehab; protocols differ, so the physio sets the plan, limits and milestones. The builder's own recovery was ACL/meniscus; TKR evidence comes from the physio and the literature, and the gap is stated openly.
- *Privacy?* Video stays on the device; only saved stills, photos and voice notes are uploaded; the family sees no clinical detail.

## 14. Conversation history in brief (how we got here)

1. The user shared the problem-statement PDF and asked for many questions; Claude read the PDF and asked about their recovery, access to people, team, skills and preferences.
2. Their answers (recovery story, physio chain, fears, family, team of three but solo builder, free tools) shaped the first proposal ("Saathi"): camera tracker plus companion plus dashboards. The user said it was generic and not innovative.
3. Claude offered novel options (can't vs won't; physio's voice; life-goal recovery; etc.). Gemini research was pasted; Claude verified claims and found the Biorad/CUVIS error and the invented personas.
4. The user prepared interview questions for the physio (cut to 12 for 10 to 15 minutes), then shared a ChatGPT conversation proposing "Carry Your Physio Home". Claude sharpened it into the Physio Twin concept with a fail-safe care chain.
5. The user specified the feature set (live angle, active vs assisted, quad lag with pillow progression, two videos, peak screenshots, continuous physio voice, issue chain, future robot section), shared their clinic test screenshots and videos (described), and asked to **start building immediately, commit continuously, and keep going overnight**.
6. Claude built the whole prototype (server, shared rules, pose/sim/cues, all screens, tests, docs) and corrected the jig mistake.
7. The user found the UI intimidating; Claude simplified to a minimal white UI like MoveHealth+ and ran it locally. The user asked whether React is used (yes), then requested this handoff.

## 15. Quick reference

- Emergency number shown in the app: **112** (India).
- Demo reset: Demo button → Scenario. Real-time clock: Demo → Back to now.
- Data on disk: `server/data/state.json`, `server/data/media/` (delete the folder to start completely fresh).
- Routes (hash): `#/patient`, `#/physio`, `#/chain`, `#/family`, `#/future`.
- Key thresholds (editable in Physio → My rules): assist gap 15°, quad lag warn 10°, ready to progress 5°, regression 10°, missed days 2, pain review 6, pain urgent 8; milestones day 7 → 70°, 14 → 90°, 21 → 100°, 28 → 110°, 42 → 120°; SLAs urgent ack 30 min, review ack 240 min, urgent resolve 180 min, review resolve 1440 min, follow-up 120 min.
