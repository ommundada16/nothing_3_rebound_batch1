// Copies the MediaPipe WASM runtime into public/ and downloads the pose model.
// Runs automatically after `npm install` (postinstall) and via `npm run setup`.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDst = resolve(root, 'public/wasm');
const modelDst = resolve(root, 'public/models/pose_landmarker_lite.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

mkdirSync(wasmDst, { recursive: true });
mkdirSync(dirname(modelDst), { recursive: true });

if (existsSync(wasmSrc)) {
  cpSync(wasmSrc, wasmDst, { recursive: true });
  console.log('[setup] copied MediaPipe wasm ->', wasmDst);
} else {
  console.warn('[setup] MediaPipe package not found; run npm install first');
}

if (!existsSync(modelDst)) {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    writeFileSync(modelDst, Buffer.from(await res.arrayBuffer()));
    console.log('[setup] downloaded pose model ->', modelDst);
  } catch (e) {
    console.warn('[setup] could not download the pose model (' + e.message + '). Simulation mode still works.');
  }
} else {
  console.log('[setup] pose model already present');
}
