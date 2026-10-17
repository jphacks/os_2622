import express,{type Request,type Response,type NextFunction} from 'express';
import cors from 'cors';
import {rateLimit} from 'express-rate-limit';
import {z,ZodError} from 'zod';
import {randomUUID} from 'node:crypto';
import env from './config.js';
import {db,type Account,type Pet} from './db.js';
import {encrypt,hashToken,newToken} from './crypto.js';
import {login} from './bluesky.js';
import {generatePost} from './ai.js';
import {submitPost} from './post.js';
import {runDuePosts} from './scheduler.js';
const app=express();
app.disable('x-powered-by');
app.use(cors({origin:env.FRONTEND_ORIGIN.split(',').map(s=>s.trim())}));
app.use(express.json({limit:'20kb'}));
type Authed=Request&{account:Account};
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};
function auth(req:Request,res:Response,next:NextFunction){
 const token=req.header('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 const account=token?db.prepare('SELECT * FROM accounts WHERE token_hash=?').get(hashToken(token)) as Account|undefined:undefined;
 if(!account){res.status(401).json({error:'Invalid or missing bearer token'});return;}
 (req as Authed).account=account;next();
}
function ownPet(req:Request):Pet|undefined {return db.prepare('SELECT * FROM pets WHERE id=? AND account_id=?').get(req.params.id,(req as Authed).account.id) as Pet|undefined;}
function publicPet(p:Pet){const {account_id,...fields}=p;return {...fields,enabled:!!p.enabled};}
const petData=z.object({name:z.string().trim().min(1).max(40),personality:z.string().trim().min(1).max(500),topics:z.string().max(300).default(''),style:z.string().max(300).default(''),intervalMinutes:z.number().int().min(30).max(10080).default(120),enabled:z.boolean().default(false)});
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.post('/api/auth/connect',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false}),asyncRoute(async(req,res)=>{
 const body=z.object({identifier:z.string().min(1).max(256),password:z.string().min(1).max(256)}).parse(req.body);
 // Never return/log the app password.
 const session=await login(body.identifier,body.password);
 const existing=db.prepare('SELECT * FROM accounts WHERE did=?').get(session.did) as Account|undefined;
 const id=existing?.id??randomUUID();const token=newToken();
 db.prepare(`INSERT INTO accounts(id,did,handle,secret,token_hash) VALUES(?,?,?,?,?)
 ON CONFLICT(did) DO UPDATE SET handle=excluded.handle,secret=excluded.secret,token_hash=excluded.token_hash`).run(id,session.did,session.handle,encrypt(body.password),hashToken(token));
 res.json({token,account:{id,did:session.did,handle:session.handle}});
}));
app.get('/api/account',auth,(req,res)=>{const {id,did,handle}=(req as Authed).account;res.json({id,did,handle});});
app.get('/api/pets',auth,(req,res)=>{const rows=db.prepare('SELECT * FROM pets WHERE account_id=? ORDER BY created_at DESC').all((req as Authed).account.id) as Pet[];res.json(rows.map(publicPet));});
app.post('/api/pets',auth,(req,res)=>{
 const p=petData.parse(req.body);const id=randomUUID();
 const next=p.enabled?new Date(Date.now()+p.intervalMinutes*60000).toISOString():null;
 db.prepare('INSERT INTO pets(id,account_id,name,personality,topics,style,interval_minutes,enabled,next_run_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,(req as Authed).account.id,p.name,p.personality,p.topics,p.style,p.intervalMinutes,Number(p.enabled),next);
 const created=db.prepare('SELECT * FROM pets WHERE id=?').get(id) as Pet;
 res.status(201).json(publicPet(created));
});
app.patch('/api/pets/:id',auth,(req,res)=>{
 const prev=ownPet(req);if(!prev){res.status(404).json({error:'Pet not found'});return;}
 const p=petData.partial().parse(req.body);
 const enabled=p.enabled??!!prev.enabled;const minutes=p.intervalMinutes??prev.interval_minutes;
 const next=enabled?(prev.enabled && p.intervalMinutes===undefined && p.enabled===undefined?prev.next_run_at:new Date(Date.now()+minutes*60000).toISOString()):null;
 db.prepare('UPDATE pets SET name=?,personality=?,topics=?,style=?,interval_minutes=?,enabled=?,next_run_at=? WHERE id=?').run(p.name??prev.name,p.personality??prev.personality,p.topics??prev.topics,p.style??prev.style,minutes,Number(enabled),next,prev.id);
 res.json(publicPet(ownPet(req)!));
});
app.delete('/api/pets/:id',auth,(req,res)=>{const p=ownPet(req);if(!p){res.status(404).json({error:'Pet not found'});return;}db.prepare('DELETE FROM pets WHERE id=?').run(p.id);res.status(204).end();});
app.post('/api/pets/:id/generate',auth,asyncRoute(async(req,res)=>{const p=ownPet(req);if(!p){res.status(404).json({error:'Pet not found'});return;}res.json({text:await generatePost(p)});}));
app.post('/api/pets/:id/publish',auth,rateLimit({windowMs:60*1000,limit:5}),asyncRoute(async(req,res)=>{
 const p=ownPet(req);if(!p){res.status(404).json({error:'Pet not found'});return;}
 const {text}=z.object({text:z.string().trim().min(1).max(300).optional()}).parse(req.body??{});
 res.status(201).json(await submitPost((req as Authed).account,p,text));
}));
app.get('/api/pets/:id/posts',auth,(req,res)=>{const p=ownPet(req);if(!p){res.status(404).json({error:'Pet not found'});return;}res.json(db.prepare('SELECT * FROM posts WHERE pet_id=? ORDER BY created_at DESC LIMIT 100').all(p.id));});
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
 if(err instanceof ZodError){res.status(400).json({error:'Invalid input',details:err.issues});return;}
 console.error(err instanceof Error?err.message:err);
 res.status(502).json({error:'An upstream or server error occurred'});
});
app.listen(env.PORT,env.HOST,()=>console.log(`AI pet backend http://${env.HOST}:${env.PORT}`));
if(env.ENABLE_SCHEDULER==='true'){
 console.log('Scheduler enabled (60s polling)');
 setInterval(()=>{void runDuePosts();},60000);
 void runDuePosts();
}
