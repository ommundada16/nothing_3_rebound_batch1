# Demo script (about 5 minutes)

**Set up before going on:** `npm run dev`, scenario = *holding back*, the physio's voice clips
recorded, reference videos added, phone on a tripod (or "Simulated leg" as the backup).

1. **The problem (30 s).** "At the clinic you get numbers and a voice. At home you get neither."
2. **The physio teaches once (45 s).** Physio tab: *My voice* (his clips), *Videos* (healthy reference and this patient's room), *My rules* (what to tell the patient, response times).
3. **The patient practises (90 s).** Patient tab, *Practise with my physio*. Live angle, his voice at each phase, the hold ring, the peak screenshot. Do one **active** and one **assisted** heel slide.
4. **The physio sees it (45 s).** Physio overview: the *gap* chart and the verdict "Won't (yet): holding back", then switch to the *stiff* scenario for "Can't". Show the peak screenshots.
5. **Something is wrong (60 s).** Patient: tick *Calf pain*, send. Show the plain guidance and why it was routed. Care chain: it is with the visiting physio.
6. **Nobody answers (30 s).** Demo controls: +30 min. It climbs to the primary physio on its own. "The system can't decide something is safe. It only decides who sees it, and how fast."
7. **Family and future (30 s).** Family view (one plain status). Future tab: the same teaching, a room sensor or a home robot later. The camera-bot moves to frame the leg.

**Answers to expect**
- *How accurate is the angle?* Our own protractor test: mean error X° (Accuracy check tab). It is a trend tool, not a clinical measurement.
- *What if the app misses a problem?* Red-flag rules run first, free text only raises a level, data-driven flags catch what the patient does not say, unanswered concerns climb, and the patient has a direct "call me" button.
- *Is it AI?* The decisions are physio-written rules. The only AI is an optional note polish that cannot change routing.
