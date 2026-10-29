import {existsSync,statSync} from 'node:fs';
const assets=['public/models/pose_landmarker_full.task','public/wasm/vision_wasm_internal.js','public/wasm/vision_wasm_internal.wasm','public/wasm/vision_wasm_nosimd_internal.js','public/wasm/vision_wasm_nosimd_internal.wasm','public/reference/heel-slide-active.mp4','public/reference/heel-slide-assisted.mp4'];
const missing=assets.filter(path=>{const file=new URL('../'+path,import.meta.url);return !existsSync(file)||statSync(file).size===0;});
if(missing.length){console.error('Deployment assets missing: '+missing.join(', ')+'. Run npm run setup and ensure the reference videos are in the repository.');process.exitCode=1;}else console.log('Camera runtime, pose model and both reference videos are ready.');
