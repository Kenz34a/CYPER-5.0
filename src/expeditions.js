// Server-only shared dungeon state. No password material is exposed to clients.
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {areaAccess} from './rail.js';
import {maps} from './content.js';
import {createFloor} from './dungeon-layout.js';
import {enterDungeon,leaveDungeon,stepDungeon,moveDungeon} from './dungeon.js';
import {turn,awardVictory,note} from './game.js';
import {dungeonModes} from './dungeon-events.js';

const lifetime=2*3600000;
const uid=()=>randomBytes(12).toString('hex');
const digest=(password,salt)=>scryptSync(password,salt,32);
const modeOf=id=>dungeonModes.find(m=>m.id===id);
const sessionOf=(db,s)=>db.expeditions?.find(e=>e.id===s.dungeon?.instance);
const activeMembers=(db,e)=>db.users.filter(u=>u.state.dungeon?.instance===e.id);
function prune(db,now){for(const u of db.users)stopExpired(db,u,now);db.expeditions=(db.expeditions||[]).filter(e=>activeMembers(db,e).length>0||now-e.touchedAt<lifetime);}
function foeKey(d,tile){return `${d.floor}:${tile}`;}
function stopExpired(db,u,now){
 const d=u.state.dungeon;if(!d?.instance)return false;const e=sessionOf(db,u.state);
 if(e&&now-e.touchedAt<lifetime)return false;
 u.state.dungeon=null;if(u.state.combat?.dungeonTile!==undefined)u.state.combat=null;
 if(e&&!e.departed.includes(u.id))e.departed.push(u.id);note(u.state,'Phiên dungeon đã hết hạn sau hai giờ không hoạt động. Loot đã nhận được giữ lại.');return true;
}
export function syncExpedition(db,u,now=Date.now()){
 if(stopExpired(db,u,now))return true;
 const d=u.state.dungeon,e=sessionOf(db,u.state);if(!e)return false;let changed=false;
 for(const [key,room] of Object.entries(e.foes)){
  if(!key.startsWith(d.floor+':'))continue;
  const tile=Number(key.split(':')[1]);
  if(room.hp<=0){if(d.cells[tile]!=='.'){d.cells[tile]='.';d.defeated++;changed=true;}if(room.foe.boss&&!d.bossDefeated){d.bossDefeated=true;changed=true;}}
 }
 const f=u.state.combat;if(f?.dungeonTile!==undefined){
  const room=e.foes[foeKey(d,f.dungeonTile)];if(room){
   if(room.hp<=0){u.state.combat=null;changed=true;}
   else if(f.currentHp!==room.hp||f.currentShield!==room.shield||f.contribution!==Math.min(100,Math.floor((room.damage[u.id]||0)/(room.foe.hp+(room.foe.shield||0))*100))){f.currentHp=room.hp;f.currentShield=room.shield;f.contribution=Math.min(100,Math.floor((room.damage[u.id]||0)/(room.foe.hp+(room.foe.shield||0))*100));changed=true;}
  }
 }
 return changed;
}
export function expeditionList(db,viewer,now=Date.now()){
 return (db.expeditions||[]).filter(e=>now-e.touchedAt<lifetime&&activeMembers(db,e).length&&(!e.corporation||e.corporation===viewer?.corporation)).map(e=>({id:e.id,name:e.name,map:e.map,mode:e.mode,ownerName:db.users.find(u=>u.id===e.owner)?.state.name||'Runner',count:activeMembers(db,e).length,limit:4,protected:!!e.password,startedAt:e.startedAt,joined:e.members.includes(viewer?.id),departed:e.departed.includes(viewer?.id)}));
}
export function expeditionParty(db,u){const e=sessionOf(db,u?.state||{});return e?activeMembers(db,e).map(v=>({name:v.state.name,level:v.state.level,hp:v.state.hp,floor:v.state.dungeon.floor,x:v.state.dungeon.x,y:v.state.dungeon.y})):[];}
export const expeditionHandles=(s,action)=>!!s.dungeon?.instance&&['dungeon-step','dungeon-move','leave-dungeon','attack','skill','special','destructive','heal','escape','item-use'].includes(action);

export function expeditionAction(db,u,b,{now=Date.now(),random=Math.random,useItem=null}={}){
 const s=u.state;db.expeditions??=[];
 if(b.action==='expedition-create'){
  prune(db,now);const mode=b.mode||'normal',plan=modeOf(mode),name=typeof b.text==='string'?b.text.trim():'',password=b.password??'';
  if(!plan||name.length<3||name.length>40||typeof password!=='string'||password.length>64||password&&password.length<4||db.expeditions.length>=100||u.corporation&&!db.corporations.some(c=>c.id===u.corporation))return false;
  if(!enterDungeon(s,mode,{corporation:!!u.corporation}))return false;
  const salt=password?randomBytes(16).toString('hex'):null,e={id:uid(),name,map:s.map,run:s.dungeon.run,mode,corporation:mode==='corporation'?u.corporation:null,owner:u.id,members:[u.id],departed:[],foes:{},startedAt:now,touchedAt:now,...(password?{salt,password:digest(password,salt).toString('hex')}:{})};
  db.expeditions.push(e);s.dungeon.instance=e.id;note(s,'Đã mở dungeon phối hợp: '+name+'. Tối đa bốn runner, loot riêng.');return true;
 }
 if(b.action==='expedition-join'){
  const e=db.expeditions.find(e=>e.id===b.id),m=e&&maps.find(m=>m.id===e.map),password=b.password??'';
  if(!e||!m||now-e.touchedAt>=lifetime||!activeMembers(db,e).length||s.work||s.combat||s.dungeon||s.map!==e.map||!areaAccess(s,m)||m.level>s.level+2||activeMembers(db,e).length>=4||e.members.includes(u.id)||e.departed.includes(u.id)||e.corporation&&e.corporation!==u.corporation||typeof password!=='string'||password.length>64)return false;
  if(e.password&&!timingSafeEqual(digest(password,e.salt),Buffer.from(e.password,'hex')))return false;
  if(!enterDungeon(s,e.mode,{corporation:!!u.corporation}))return false;
  s.dungeon=createFloor(e.map,e.run,1,e.mode);s.dungeon.instance=e.id;e.members.push(u.id);e.touchedAt=now;syncExpedition(db,u,now);note(s,'Đã gia nhập '+e.name+'. Chỉ nhận thưởng địch nếu đóng góp ít nhất 20% HP + khiên và không cao hơn địch quá 12 cấp.');return true;
 }
 const e=sessionOf(db,s);if(!e||now-e.touchedAt>=lifetime)return false;
 syncExpedition(db,u,now);
 if(b.action==='dungeon-move'){
  const ok=moveDungeon(s,b.id,random,dir=>expeditionAction(db,u,{action:'dungeon-step',id:dir},{now,random,useItem}));
  if(ok)e.touchedAt=now;return ok;
 }
 if(b.action==='leave-dungeon'){
  if(!leaveDungeon(s))return false;e.touchedAt=now;e.departed.push(u.id);return true;
 }
 if(b.action==='dungeon-step'){
  const ok=stepDungeon(s,b.id,random);if(!ok)return false;e.touchedAt=now;
  if(!s.dungeon){e.departed.push(u.id);return true;}
  const f=s.combat;if(f){const key=foeKey(s.dungeon,f.dungeonTile);e.foes[key]??={foe:structuredClone(f),hp:f.hp,shield:f.shield||0,damage:{},rewarded:[]};const room=e.foes[key];f.currentHp=room.hp;f.currentShield=room.shield;}
  return true;
 }
 if(!s.combat||s.combat.dungeonTile===undefined)return false;
 const d=s.dungeon,f=s.combat,key=foeKey(d,f.dungeonTile),room=e.foes[key];if(!room||room.hp<=0)return false;
 const before=room.hp+room.shield;
 // Consumables use the same item validation and one retaliatory turn, with rewards disabled.
 const ok=b.action==='item-use'?useItem?.(s,b,{rewards:false}):turn(s,b.action,random,{rewards:false});if(!ok)return false;
 e.touchedAt=now;room.hp=Math.max(0,f.currentHp);room.shield=Math.max(0,f.currentShield||0);
 const damage=Math.max(0,before-room.hp-room.shield);if(damage)room.damage[u.id]=(room.damage[u.id]||0)+damage;
 if(!s.dungeon){e.departed.push(u.id);return true;}
 if(room.hp<=0){
  for(const member of activeMembers(db,e))if(!room.rewarded.includes(member.id)&&member.state.level<=room.foe.level+12&&(room.damage[member.id]||0)>=(room.foe.hp+(room.foe.shield||0))*.2){
   room.rewarded.push(member.id);awardVictory(member.state,room.foe,random);
  }
  if(!room.rewarded.includes(u.id))note(s,'Địch đã bị hạ. Không nhận thưởng vì chưa đủ 20% đóng góp hoặc vượt giới hạn cấp.');
 }
 for(const member of activeMembers(db,e))syncExpedition(db,member,now);
 return true;
}
