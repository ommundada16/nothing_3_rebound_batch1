import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
export function installAccounts(app, file, onLogin = () => {}) {
 const users = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
 const sessions = new Map();
 const publicUser = u => ({id:u.id, name:u.name, email:u.email, role:u.role,city:u.city||'',postalCode:u.postalCode||''});
 const addUser=({name,email,password,role,city='',postalCode=''})=>{if(users.some(u=>u.email===email.toLowerCase()))throw new Error('That email is already registered.');const salt=randomBytes(16).toString('hex');const user={id:randomUUID(),name:name.trim(),email:email.toLowerCase(),role,city:String(city||'').trim().slice(0,100),postalCode:String(postalCode||'').trim().slice(0,20),salt,hash:scryptSync(password,salt,64).toString('hex')};users.push(user);save();return user;};
 const save = () => writeFileSync(file, JSON.stringify(users));
 const cookie = (req, res, token) => res.setHeader('Set-Cookie', `pt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 86400 : 0}${req.secure ? '; Secure' : ''}`);
 app.use('/api', (req,res,next) => {
  const token = req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('pt_session='))?.slice(11);
  const session = sessions.get(token);
  if(session && session.expires > Date.now()) req.account = users.find(u=>u.id===session.id);
  next();
 });
 app.get('/api/auth/me', (req,res) => res.json({user:req.account ? publicUser(req.account) : null}));
 app.post('/api/auth/register', (req,res) => {
  const {name, email, password, role} = req.body || {};
  if(typeof name!=='string' || !name.trim() || typeof email!=='string' || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email) || typeof password!=='string' || password.length<8 || password.length>128 || !['patient','physio','family','assistant','careteam'].includes(role)) return res.status(400).json({error:'Enter a name, valid email and a password of 8–128 characters.'});
  if(users.some(u=>u.email===email.toLowerCase())) return res.status(400).json({error:'That email is already registered.'});
  if(role==='patient')return res.status(403).json({error:'Your care team creates your patient account. Ask them for your sign-in details.'});
  if(role!=='physio'&&users.some(u=>u.role===role)) return res.status(400).json({error:'This single-family prototype already has that account. Sign in with the existing account.'});
  const user=addUser({...req.body,name,email,password,role});onLogin(user);
  const token=randomBytes(32).toString('hex');sessions.set(token,{id:user.id,expires:Date.now()+86400000});cookie(req,res,token);
  res.json({user:publicUser(user)});
 });
 const attempts = new Map();
 app.post('/api/auth/login',(req,res)=>{
  const key=req.ip;const a=attempts.get(key) || {n:0,until:Date.now()+60000};
  if(Date.now()>a.until){a.n=0;a.until=Date.now()+60000;} a.n++;attempts.set(key,a);
  if(a.n>15)return res.status(429).json({error:'Too many attempts. Try again in a minute.'});
  const {email,password}=req.body || {};const u=users.find(u=>u.email===String(email).toLowerCase());
  if(!u || typeof password!=='string' || password.length>128 || !timingSafeEqual(Buffer.from(u.hash,'hex'),scryptSync(password,u.salt,64))) return res.status(401).json({error:'Email or password is incorrect.'});
  onLogin(u);
  const token=randomBytes(32).toString('hex');sessions.set(token,{id:u.id,expires:Date.now()+86400000});cookie(req,res,token);res.json({user:publicUser(u)});
 });
 app.put('/api/auth/profile',(req,res)=>{if(req.account?.role!=='physio')return res.status(403).json({error:'Only a physio can set their service area.'});req.account.city=String(req.body?.city||'').trim().slice(0,100);req.account.postalCode=String(req.body?.postalCode||'').trim().slice(0,20);save();res.json({user:publicUser(req.account)});});
 app.post('/api/auth/logout',(req,res)=>{const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('pt_session='))?.slice(11);sessions.delete(token);cookie(req,res,'');res.json({ok:true});});
 return { publicUser, users, addUser };
}
