import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

// Loads MediaPipe's pose model once. It runs entirely in the browser (on the
// device), so no video leaves the phone or laptop.
let loading = null;

export function loadPose() {
  if (!loading) {
    loading = (async () => {
      const fileset = await FilesetResolver.forVisionTasks('/wasm');
      const make = (delegate) =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/models/pose_landmarker_full.task', delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export function detect(landmarker, video, tsMs) {
  const out = landmarker.detectForVideo(video, tsMs);
  return out?.landmarks?.[0] || null;
}

export async function openCamera(facing = 'environment') {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera needs a secure page: use localhost, or run npm run dev:phone for HTTPS.');
  }
  return new Promise((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>{settled=true;reject(new Error('Camera permission is still waiting. Allow the camera in your browser. If the in-app browser cannot offer access, open this address in Chrome or Edge.'));},20000);
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio:false,
    }).then(stream=>{
      if(settled){stream.getTracks().forEach(t=>t.stop());return;}
      settled=true;clearTimeout(timer);resolve(stream);
    },error=>{if(!settled){settled=true;clearTimeout(timer);reject(error);}});
  });
}
