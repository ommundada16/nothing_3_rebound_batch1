## Latest simplification — 29 October 2026

This section overrides earlier UI/OCR/side-selection descriptions below.

- Physio home searches the assigned patient by name (still one patient in this prototype). Opening the patient defaults to Today: recorded patient login time, per-exercise completion, and today's saved pictures. Summary is last.
- Alerts list prescribed heel-slide tasks not completed for over 48 hours and camera estimates crossing the prescribed maximum. Live camera limit events are sent once per run, persisted and deduplicated without requiring Save session. Other-knee practice is excluded from recovery alerts/completion. These are in-app alerts, not external notifications.
- Patient messages open as one modal conversation with a single reply box. Patient Messages includes an optional typed medicine name. Family can send a typed medicine concern. Medicine-photo/OCR UI, OCR code/dependencies/setup, Daily Care and medicine schedules were removed from navigation. Existing stored care/legacy reports are retained; appointments remain with the assistant and appointment reminders remain visible.
- Exercise plan shows separate assisted/unassisted +/− toggles and shared reps, hold and optional maximum bend. Saving drops the old hidden target; the engine uses its existing safe target under the max. Removing a mode removes that patient task. Existing precaution data is retained but no notes editor is shown.
- Camera side selection is automatic using MediaPipe anatomical labels and sustained visibility evidence: 400 ms initially, 1200 ms plus an advantage before a side change. A three-frame joint median filters isolated landmark spikes. No manual knee choice or saved side preference. If the side changes during a session, finish without a savable measurement to avoid mixing knees. Side-view occlusion can still confuse model labels; this is NOT clinical accuracy validation.
- Verified: 49 unit tests, production build, isolated API tests for login time, exercise modes, limit-event permissions and deduplication, and browser checks for search, Today-first navigation, recorded login, single chat, typed medicine report and simplified plan. Actual laptop webcam accuracy requires a physical retest.

# Rebound

Carry your physio home. A Srujana Hackathon prototype for early recovery after knee replacement, focused on the first two weeks.

## Accounts

- Patient: separate assisted/unassisted heel slides, medicine schedule, photo reports and care suggestions.
- Family / guardian: the same care plan, one-tap dose records, food ideas, appointments and home-support guidance. No food logging.
- Physio: assigned-patient home, plain patient summary, exercise plan and messages. Voice/video/measurement tools are under More tools.
- Assistant surgeon: assigned-patient home, first-fortnight appointment template, prescribed-medicine entry and message review.

This local prototype supports one care group and one account per role. It does not implement a multi-clinic patient directory or verified clinician invitations.

## Run locally

```bash
npm install       # copies pose/OCR assets through postinstall
npm run setup     # repeat if generated model/worker files are missing
npm start         # builds and serves http://localhost:8787
```

For development, npm run dev starts API :8787 and Vite :5173.
A phone on the same Wi-Fi needs npm run dev:phone and the laptop's HTTPS address.
A laptop webcam can use localhost directly in Chrome/Edge.

## Camera sessions

Select Left knee or Right knee directly on the exercise page. The measured side is separate from the operated side in the patient record; other-knee tests do not count as recovery completion.
The browser uses local MediaPipe pose detection, displays estimated flexion and counts bend/hold/return repetitions. Frames are checked for visibility, geometry and sudden jumps. Brief occlusions pause the hold; longer loss invalidates it. Angle accuracy still needs physical validation against a clinician's goniometer.

The care team can enter a doctor's maximum bend. Visual warnings are immediate when detected; speech waits for the current sentence to finish. Ordinary stale cues are dropped. Repeated push loops and angle/second narration are off. Explicit Stop/Mute still stops speech.
Snapshots are uploaded only when the patient saves. Video is processed on the device.

## Medicine photos

A patient or guardian can photograph a medicine label. Tesseract.js reads English text locally; supported browsers may also read a barcode. The original photo and unverified text are sent to the physio and assistant surgeon's in-app message list.
A photo/barcode does not establish medicine suitability or diagnose a side effect. There is no external drug-database lookup or automatic prescription change.
The OCR runtime and English model are generated public/ocr assets, ignored by Git and copied from npm packages during setup. First use may take time.

## Appointments and guidance

The assistant surgeon enters the agreed surgery date and selected check-up dates/times in a first-two-week template. No clinical schedule is imposed or automatically booked. Other roles see saved dates through the shared server state.
Food/equipment/support guidance and original illustrations stay in the app. The app does not promise insurance eligibility, NGO funding, background push notifications or external clinician delivery.

## Verification and limits

```bash
npm test
npm run build
```

scripts/check-accounts.mjs must only target an isolated test server (TEST_BASE), because it creates fictional accounts and edits care plans. Use PHYSIO_DATA_DIR=.../tmp/review-data with a separate port.
Synthetic histories and the builder's separately labelled clinic example are demo data. Default clinical rules require care-team review. This is not a clinically validated device.
See HANDOFF.md for decisions and docs/CAMERA_TRACKING.md for camera details.
