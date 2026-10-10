import {expeditionAction,expeditionHandles,syncExpedition} from './expeditions.js';
import {prepareDaily,rewardAction} from './rewards.js';
import {dungeonEventAction} from './dungeon-events.js';
import {settingsAction} from './settings.js';
import {removeAccountData} from './account-data.js';
import {migrateRail,railAction} from './rail.js';
import {workAction} from './work.js';
import {workAllows} from './work-rules.js';
import {settleInbox} from './inventory-state.js';
import {inventoryAction} from './inventory.js';
import {assetAction,publicAssets} from './assets.js';
import {createStorage} from './storage.js';
import {isIP} from 'node:net';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {fresh,stats,note,move,startFight,turn,buy,equip,sell,accept,claim,rest} from './game.js';
import {npcs} from './content.js';
import {enterDungeon,leaveDungeon,stepDungeon} from './dungeon.js';
import {upgrade,installModule,removeModule} from './equipment.js';
import {printItem,calibrateItem,bankTransfer,exchange} from './services.js';
import {initWorld,worldView,worldAction,shopDiscount} from './world.js';
import {progressionAction} from './progression.js';
import {cityAction} from './city.js';
export const storage=await createStorage();
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
function hash(password,salt){return scryptSync(password,salt,64).toString('hex');}
const safe=u=>({id:u.id,name:u.state.name,level:u.state.level,wins:u.state.wins,losses:u.state.losses,reputation:u.state.reputation||0,score:Math.max(0,u.state.wins*25-u.state.losses*10)});
function user(req,db){const match=(req.headers.cookie||'').match(/(?:^|;\s*)cyper_session=([a-f0-9]+)/);const session=match&&db.sessions[tokenHash(match[1])];if(!session||session.expires<Date.now())return null;return db.users.find(u=>u.id===session.id);}
async function body(req){if(req.parsedBody!==undefined)return req.parsedBody;let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw new Error('Yêu cầu quá lớn.');}return JSON.parse(text||'{}');}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const attempts=new Map();
function throttle(req){const forwarded=process.env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim():'';const key=isIP(forwarded)?forwarded:req.socket.remoteAddress;const now=Date.now();let entry=attempts.get(key);if(!entry||entry.until<now){entry={n:0,until:now+60000};attempts.set(key,entry);}return ++entry.n<=15;}
export async function api(req,res,pathname){
 if(!pathname.startsWith('/api/'))return false;
 if(req.method==='POST'){
  try{req.parsedBody=await body(req);if(!req.parsedBody||typeof req.parsedBody!=='object'||Array.isArray(req.parsedBody))throw new Error();}
  catch{send(res,400,{error:'Yêu cầu JSON không hợp lệ hoặc quá lớn.'});return true;}
 }
 try{
  // Bodies are read before taking the database lock.
  const response=await storage.transaction(async tx=>{
   const output={status:200,headers:{},body:''};
   const buffered={setHeader:(key,value)=>{output.headers[key]=value;},writeHead:(status,headers)=>{output.status=status;Object.assign(output.headers,headers);},end:value=>{output.body=value;}};
   await handle(req,buffered,pathname,tx);
   return output;
  });
  res.writeHead(response.status,response.headers);res.end(response.body);
 }catch{send(res,503,{error:'Không thể xử lý hoặc lưu dữ liệu. Vui lòng thử lại.'});}
 return true;
}
async function handle(req,res,pathname,tx){
 let db=tx.data;initWorld(db);db.sessions ||= {};
 const persist=async()=>{tx.data=db;tx.dirty=true;};
 let cleaned=false;
 for(const [key,session] of Object.entries(db.sessions))if(!session||session.expires<=Date.now()||!db.users.some(u=>u.id===session.id)){delete db.sessions[key];cleaned=true;}
 if(cleaned)await persist();
 if(!['GET','POST'].includes(req.method)){send(res,405,{error:'Phương thức không hỗ trợ.'});return true;}
 if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){send(res,403,{error:'Nguồn yêu cầu không hợp lệ.'});return true;}
 if(pathname==='/api/register'||pathname==='/api/login'){
 if(req.method!=='POST'){send(res,405,{error:'Dùng POST.'});return true;}if(!throttle(req)){send(res,429,{error:'Thử quá nhiều lần. Chờ một phút.'});return true;}
 const b=await body(req);const username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');
 if(!/^[a-z0-9_]{3,24}$/.test(username)||password.length<8||password.length>128){send(res,400,{error:'Tên tài khoản 3–24 ký tự a-z, số, _. Mật khẩu 8–128 ký tự.'});return true;}
 let u=db.users.find(u=>u.username===username);
 if(pathname==='/api/register'){if(u){send(res,409,{error:'Tên tài khoản đã được sử dụng.'});return true;}const salt=randomBytes(16).toString('hex');u={id:randomBytes(12).toString('hex'),username,salt,password:hash(password,salt),state:fresh()};u.state.name=username;db.users.push(u);await persist();}
 else if(!u||!timingSafeEqual(Buffer.from(hash(password,u.salt),'hex'),Buffer.from(u.password,'hex'))){send(res,401,{error:'Tài khoản hoặc mật khẩu không đúng.'});return true;}
 if(syncExpedition(db,u)|migrateRail(u.state)|prepareDaily(u.state)|settleInbox(u.state).changed)await persist();
 const own=Object.entries(db.sessions).filter(([,v])=>v.id===u.id).sort((a,b)=>a[1].expires-b[1].expires);for(const [key] of own.slice(0,Math.max(0,own.length-31)))delete db.sessions[key];const token=randomBytes(32).toString('hex');db.sessions[tokenHash(token)]={id:u.id,expires:Date.now()+7*86400000};await persist();res.setHeader('Set-Cookie',`cyper_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'||process.env.NODE_ENV==='production'?'; Secure':''}`);send(res,200,{state:u.state,user:safe(u)});return true;
 }
 if(pathname==='/api/rank'&&req.method==='GET'){send(res,200,{players:db.users.map(safe).sort((a,b)=>b.score-a.score||b.level-a.level).slice(0,100)});return true;}
 if(pathname.startsWith('/api/profile/')&&req.method==='GET'){const target=db.users.find(v=>v.id===pathname.slice('/api/profile/'.length));send(res,target?200:404,target?{assets:publicAssets(target.state)}:{error:'Không tìm thấy runner.'});return true;}
 const u=user(req,db);
 if(pathname==='/api/world'&&req.method==='GET'){send(res,200,worldView(db,u));return true;}
 if(!u){send(res,401,{error:'Cần đăng nhập.'});return true;}
 if(pathname==='/api/me'&&req.method==='GET'){if(syncExpedition(db,u)|migrateRail(u.state)|prepareDaily(u.state)|settleInbox(u.state).changed)await persist();send(res,200,{state:u.state,user:safe(u)});return true;}
 if(pathname==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/cyper_session=([a-f0-9]+)/)?.[1];if(token)delete db.sessions[tokenHash(token)];await persist();res.setHeader('Set-Cookie','cyper_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(res,200,{ok:true});return true;}
 if(pathname==='/api/account/delete'&&req.method==='POST'){
 if(!throttle(req)){send(res,429,{error:'Thử quá nhiều lần. Chờ một phút.'});return true;}
 const b=await body(req);if(b.confirm!==true||typeof b.confirmName!=='string'||b.confirmName!==u.state.name||typeof b.password!=='string'||b.password.length<8||b.password.length>128){send(res,400,{error:'Nhập đúng bí danh hiện tại, mật khẩu và xác nhận xóa.'});return true;}
 if(!timingSafeEqual(Buffer.from(hash(b.password,u.salt),'hex'),Buffer.from(u.password,'hex'))){send(res,403,{error:'Mật khẩu hiện tại không đúng.'});return true;}
 if(u.state.combat||u.state.dungeon||u.state.work){send(res,400,{error:'Kết thúc công việc, giao tranh và dungeon trước khi xóa.'});return true;}
 if(!db.users.some(v=>v.id===u.id)){send(res,401,{error:'Tài khoản đã được xóa.'});return true;}
 const previous=db;db=removeAccountData(db,u.id);try{await persist();}catch(error){db=previous;throw error;}
 for(const [key,session] of Object.entries(db.sessions))if(session.id===u.id)delete db.sessions[key];await persist();
 res.setHeader('Set-Cookie','cyper_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(res,200,{ok:true});return true;
 }
 if(pathname==='/api/action'&&req.method==='POST'){
 const b=await body(req),s=u.state;if(b.action==='expedition-join'&&!throttle(req)){send(res,429,{error:'Thử gia nhập quá nhiều lần. Chờ một phút.'});return true;}const migrated=syncExpedition(db,u)|migrateRail(s)|prepareDaily(s);let ok=false;const maintenance=settleInbox(s,{collect:false});const before=s.combat&&{...s.combat};
 if(!workAllows(s,b.action)){if(migrated||maintenance.changed)await persist();send(res,400,{error:'Nhận thưởng hoặc hủy công việc trước khi thực hiện hành động này.',state:s});return true;}
 if(expeditionHandles(s,b.action))ok=expeditionAction(db,u,b,{useItem:inventoryAction});else switch(b.action){case 'move':ok=move(s,b.id);break;case 'fight':ok=startFight(s,'enemy',false,b.id||'plain');break;case 'boss':ok=startFight(s,'boss');break;case 'attack':case 'skill':case 'special':case 'destructive':case 'heal':case 'escape':ok=turn(s,b.action);break;case 'rest':ok=rest(s);break;case 'buy':ok=buy(s,b.id,!!b.black,shopDiscount(db));break;case 'equip':ok=equip(s,b.id);break;case 'sell':ok=sell(s,b.id);break;case 'accept':ok=accept(s,b.id);break;case 'claim':ok=claim(s,b.id);break;
 case 'enter-dungeon':ok=enterDungeon(s,b.id||'normal',{corporation:!!db.corporations.find(c=>c.id===u.corporation)});break;
 case 'leave-dungeon':ok=leaveDungeon(s);break;
 case 'dungeon-step':ok=stepDungeon(s,b.id);break;
 case 'upgrade':ok=upgrade(s,b.id);break;
 case 'print':ok=printItem(s,b.id);break;
 case 'calibrate':ok=calibrateItem(s,b.id,{boost:b.boost===true,protect:b.protect===true});break;
 case 'bank':ok=bankTransfer(s,b.direction,b.amount);break;
 case 'exchange':ok=exchange(s,b.direction,b.amount);break;
 case 'module-remove':{if(typeof b.id==='string'){const [id,index]=b.id.split(':');ok=removeModule(s,id,Number(index));}break;}
 case 'module':ok=installModule(s,b.id,b.slot,b.module);break;
 case 'name':{const name=String(b.id||'').trim().slice(0,24);if(name){s.name=name;ok=true;}break;}
 case 'talk':{const n=npcs.find(n=>n.id===b.id);if(n&&n.map===s.map&&!s.combat){note(s,`${n.name}: ${n.dialogue}`);ok=true;}break;}
 case 'pvp':{const opponent=db.users.find(v=>v.id===b.id&&v.id!==u.id);if(opponent&&!s.dungeon&&!s.combat&&s.energy>=3){const st=stats(opponent.state);s.energy-=3;s.shield=stats(s).maxShield;s.lastHit=null;s.combat={id:'arena',opponent:opponent.id,name:opponent.state.name,level:opponent.state.level,hp:st.maxHp,currentHp:st.maxHp,shield:st.maxShield,currentShield:st.maxShield,attack:st.attack,defense:st.defense,xp:20+opponent.state.level*4,credits:30+opponent.state.level*10,turn:0,pvp:true};ok=true;}break;}
 default:ok=expeditionAction(db,u,b,{useItem:inventoryAction})||rewardAction(s,b)||dungeonEventAction(s,b)||settingsAction(s,b)||railAction(s,b)||workAction(s,b)||worldAction(db,u,b)||cityAction(s,b)||progressionAction(s,b)||inventoryAction(s,b)||assetAction(s,b);
 }
 if(!ok){if(migrated||maintenance.changed)await persist();send(res,400,{error:'Chưa đủ điều kiện thực hiện hành động này.',state:s});return true;}
 if(before?.opponent&&s.combat===null&&b.action!=='escape'){const opponent=db.users.find(v=>v.id===before.opponent);if(opponent){note(opponent.state,`${s.name} vừa kết thúc trận đấu bất đồng bộ với bản sao phòng thủ của bạn.`);}}
 settleInbox(s);await persist();send(res,200,{state:s,user:safe(u)});return true;
 }
 send(res,404,{error:'Không tìm thấy API.'});
 return true;
}
