export function backendOrigin(input){
 let url;try{url=new URL(input);}catch{throw new Error('Provide the public HTTPS backend URL, such as https://rebound-api-abc.onrender.com.');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.port||!url.hostname.includes('.')||['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname)||url.hostname.toLowerCase().includes('your-rebound-backend'))throw new Error('Use the backend HTTPS origin only, with no credentials, path, query, port or placeholder.');
 return url.origin;
}
export function configuredBackend(config){const rule=config.rewrites?.find(r=>r.source==='/api/:path*');if(!rule?.destination?.endsWith('/api/:path*'))throw new Error('Configure /api requests before deploying: npm run configure:vercel -- https://YOUR-ACTUAL-BACKEND.onrender.com');return backendOrigin(rule.destination.slice(0,-'/api/:path*'.length));}
