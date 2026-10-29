# Tracking update: explicit knee selection and quiet speech

The user tested the right knee from the side, but the previous setup silently defaulted to the left knee from the patient record. Select the measured knee using the new prominent Left/Right buttons. The preference is remembered per browser origin; the operated side is unchanged. Other-knee tests do not count as operated-knee recovery.

Visibility is now an engineering heuristic combined with geometric and temporal checks. The earlier strict 0.65 threshold is no longer used as a hard gate: coherent samples at 0.35 or higher can be used, while out-of-frame limbs and sudden one-frame angle jumps are rejected. This does not establish clinical accuracy. Brief gaps pause the hold timer; longer loss invalidates the rep.

Speech uses one active sentence, drops obsolete ordinary cues, and queues at most one still-relevant bend warning. It does not interrupt a sentence merely because a movement phase changes. On-screen warnings remain immediate. Repeated push loops, angle narration and spoken second counts were removed.

The technical notes below describe earlier verification and remain historical evidence, not proof that the latest tracker is clinically validated.

---

# Rebound local camera tracking

Uses the full MediaPipe pose model with the already-installed @mediapipe/tasks-vision 0.10.21 (Apache-2.0).
Official guide: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
Official web example: https://github.com/google-ai-edge/mediapipe-samples/tree/main/examples/pose_landmarker/js
Reference examined: https://github.com/e-cagan/realtime-squat-counter (MIT; not copied).

The shared idea is hip-knee-ankle landmarks, vector angle calculation, and a state machine. Squat thresholds are not suitable for prescribing post-operative heel slides. Rebound retains its own heel-slide hold/return logic, patient-specific limits and clinician voice recordings. No third-party repository code was copied in this update.

## Setup

1. Physio signs in, opens Plan, copies any maximum bend from the doctor's prescription and optionally sets a repetition target. Save. No 90-degree limit is assumed by default.
2. Record near_limit and angle_limit phrases under My voice. Fallback system voice is used when clips are missing.
3. Patient opens assisted or unassisted heel slide. In Camera and practice options, select camera, leg and front/back camera.
4. Laptop: http://localhost:8787. Phone on Wi-Fi: npm run dev:phone and use the laptop's HTTPS address. Plain HTTP on a laptop's LAN IP cannot provide phone-camera access. A self-signed certificate may require the user to handle their browser's warning.
5. Keep the phone stationary, side-on, with hip, knee and ankle visible. Use good lighting. The selected operated leg stays fixed; automatic selection locks to the first confidently tracked side.
6. Start, allow camera access, gently bend, hold, and return. A full rep is counted on return. Stop for sharp pain and follow the treating team's plan.

## What the software does

- Fixes video-element mount order before attaching the webcam stream; releases acquired streams on error/cancellation.
- Uses aspect-corrected 2D knee flexion (0 degrees means straight).
- Displays angle, skeleton, observed hold time and completed repetitions.
- Suppresses pushing/hold-count cues near the prescribed maximum; warns 5 degrees before it. Raw and smoothed readings are both considered so smoothing does not delay the warning.
- Invalidates a rep that crosses the estimated maximum. If landmarks disappear, discards the partial rep and requires returning to the starting position.
- Saves up to three annotated peak stills only when the patient saves the session. Video is processed locally.
- Records the maximum used and warning events with the session. Empty/insufficient tracking cannot be saved as zero range.

A camera estimate cannot enforce a medical restriction, verify joint safety, measure strength or replace a goniometer. Landmark visibility is not a validated accuracy score. Calibrate against a clinician's goniometer using Accuracy check before making accuracy claims. Physical leg tracking, audio audibility and phone HTTPS require testing on the user's actual devices.


## Recorded-video QA on 29 October

The supplied self heel-slide clip is a close-up, not the recommended full-body/side-on framing. The lite model produced only 24 confident detections out of 464 processed frames (visibility gate 0.65). This is evidence of a framing limitation, not accuracy validation. Rebound rejects a session measurement when fewer than 60% of processed frames pass tracking checks, or fewer than ten frames are usable. Do not use this close-up clip as evidence of reliable camera measurements.

The full model on the same clip produced 30 confident frames out of 478 processed. Both models struggled with this close framing; changing the model is not a substitute for positioning the camera correctly. The full model is now bundled by npm run setup; no real-world angle-accuracy improvement is claimed from this test.


## Camera lifecycle QA

An isolated page fed the provided video through captureStream as a test-only getUserMedia replacement, while running the unchanged production app bundle. The app mounted the video, loaded the full pose model, reached the live screen, processed frames and showed the visibility warning for the poorly framed recording. This validates the camera-stream code path with recorded input; it does not validate a physical webcam, rehabilitation quality or clinical angle accuracy. The normal in-app browser's physical-camera permission remained pending and the new timeout message was verified. The user will test with a laptop webcam in Chrome or Edge.
