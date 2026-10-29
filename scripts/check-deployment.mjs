import {readFileSync} from 'node:fs';
import {configuredBackend} from './deployment-config.mjs';
try{const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));console.log('Deployment backend: '+configuredBackend(config));}catch(e){console.error('Vercel deployment is not configured yet: '+e.message);process.exitCode=1;}
