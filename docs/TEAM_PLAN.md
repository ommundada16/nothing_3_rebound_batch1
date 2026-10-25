# Team plan (three members, three GitHub accounts)

The rules say every member must contribute through their own account, visible in the commit
history. The first scaffold was committed from one account. **From here, each member commits their
own work.** Each member should be able to explain and debug their module in Q&A.

Work on short-lived branches, make small commits with clear messages (`feat:`, `fix:`, `test:`,
`docs:`), and merge to `main` when `npm test` and `npm run build` pass.

## Member A: movement engine (camera, angles, cues)
Owns `src/lib/geometry.js`, `repCounter.js`, `pose.js`, `sim.js`, `cues.js`, `src/views/Session.jsx`, `Validate.jsx`.
- [ ] Test the real camera on laptop and phone; tune smoothing and the hold / stall thresholds
- [ ] Run the accuracy check against a protractor (6 to 10 angles); commit the CSV in `docs/validation/`
- [ ] Handle landscape and portrait phone video; confirm which leg is in view
- [ ] Add tests for any threshold you change (`tests/repCounter.test.js`)

## Member B: care chain and safety net
Owns `server/`, `shared/triage.js`, `objective.js`, `playbook.js`, `src/views/Chain.jsx`.
- [ ] Unit tests for `server/issues.js` (escalation timing, follow-up rules, resolve needs a note)
- [ ] Review every default playbook rule with the physio and update `shared/playbook.js`
- [ ] Edge cases: simultaneous concerns, reopened issues, final level overdue
- [ ] Optional: a push notification or WhatsApp stub for "urgent"

## Member C: patient and family experience, content
Owns `src/views/Patient.jsx`, `Report.jsx`, `Family.jsx`, `Future.jsx`, `src/styles.css`, `docs/`.
- [ ] Hindi and Marathi UI strings for the patient screens
- [ ] Accessibility pass for older users (text size, contrast, tap targets, screen reader labels)
- [ ] Record the physio's cue clips and reference videos with the physio (see the checklist)
- [ ] Slides: problem and user insight, alternatives rejected, prototype demo, limits, future vision

## Everyone
- Keep demo data synthetic and labelled; never commit patient photos or real names.
- Run `npm test` before every push.
