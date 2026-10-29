import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {backendOrigin} from './deployment-config.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try{const origin=backendOrigin(process.argv[2]||process.env.REBOUND_BACKEND_URL);const file=resolve(root,'vercel.json'),config=JSON.parse(readFileSync(file,'utf8'));config.rewrites=[{source:'/api/:path*',destination:origin+'/api/:path*'},...(config.rewrites||[]).filter(r=>r.source!=='/api/:path*')];writeFileSync(file,JSON.stringify(config,null,2)+'\n');console.log('Configured Vercel API forwarding to '+origin+'. Commit vercel.json before importing or redeploying the Vercel project.');}catch(e){console.error(e.message);process.exitCode=1;}
