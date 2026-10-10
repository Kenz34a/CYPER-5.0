// Server only: transactions, blocks and pending requests never come from client state.
import {randomUUID} from 'node:crypto';
import {gear} from './content.js';
import {cosmetics} from './city.js';
import {stacks,receiveGear,receiveStack,ownsGear,supplies,materials,blueprints} from './inventory-state.js';
import {record} from './journal.js';
import {playerProfileData} from './profile-data.js';
const idle=s=>!s.combat&&!s.dungeon;
const positive=n=>Number.isSafeInteger(n)&&n>0&&n<=1000000;
const unavailable=(u,now)=>u?.moderation?.ban&&(u.moderation.ban.until===0||u.moderation.ban.until>now);
export const blocked=(a,b)=>!!a?.social?.blocked?.includes(b?.id)||!!b?.social?.blocked?.includes(a?.id);
export const canInteract=(a,b,now=Date.now())=>!!a&&!!b&&a.id!==b.id&&!blocked(a,b)&&!unavailable(a,now)&&!unavailable(b,now);
const user=(db,id)=>db.users.find(v=>v.id===id);
const social=u=>{const v=u.social??={};v.friends??=[];v.blocked??=[];v.partner??=null;return v;};
const ownGear=(s,id)=>gear.some(g=>g.id===id)&&s.inventory.includes(id)&&!Object.values(s.equipped).includes(id);
function takeGear(s,id){s.inventory=s.inventory.filter(v=>v!==id);if(s.calibration)delete s.calibration[id];s.showcases=(s.showcases||[]).map(v=>v===id?null:v);}
function putGear(s,id,calibration,permanent=false){receiveGear(s,id,{permanent});(s.calibration??={})[id]=structuredClone(calibration);}
function returnTrade(db,t){const from=user(db,t.from);if(from){from.state.escrow=(from.state.escrow||[]).filter(v=>v!==t.gear);if(!ownsGear(from.state,t.gear))putGear(from.state,t.gear,t.calibration,true);}db.privateTrades=db.privateTrades.filter(v=>v.id!==t.id);}
export function settleSocial(db,now=Date.now()){
 let changed=false;
 for(const t of [...(db.privateTrades||[])])if(t.expiresAt<=now||!user(db,t.from)||!user(db,t.to)){returnTrade(db,t);changed=true;}
 const requests=db.socialRequests||[],live=requests.filter(v=>v.expiresAt>now&&user(db,v.from)&&user(db,v.to));if(requests.length!==live.length){db.socialRequests=live;changed=true;}
 return changed;
}
export function socialView(db,viewer,now=Date.now()){
 if(!viewer)return null;
 const card=id=>{const u=user(db,id);return u?{id:u.id,name:u.state.settings?.hideHandler?'Runner ẩn danh':u.state.name,level:u.state.level}:null;};
 return {friends:(viewer.social?.friends||[]).map(card).filter(Boolean),blocked:(viewer.social?.blocked||[]).map(card).filter(Boolean),partner:card(viewer.social?.partner),
  requests:(db.socialRequests||[]).filter(v=>v.expiresAt>now&&(v.from===viewer.id||v.to===viewer.id)).map(v=>({...v,fromName:card(v.from)?.name||'Runner',toName:card(v.to)?.name||'Runner'})),
  trades:(db.privateTrades||[]).filter(v=>v.expiresAt>now&&(v.from===viewer.id||v.to===viewer.id)).map(({calibration,...v})=>({...v,gearName:gear.find(g=>g.id===v.gear)?.name||v.gear,wantedName:gear.find(g=>g.id===v.wanted)?.name||'',fromName:card(v.from)?.name||'Runner',toName:card(v.to)?.name||'Runner'})),
  reports:(db.playerReports||[]).filter(v=>v.author===viewer.id).sort((a,b)=>b.time-a.time).slice(0,20).map(v=>({id:v.id,target:v.target,targetName:card(v.target)?.name||'Runner',category:v.category,status:v.status,time:v.time}))};
}
export function publicPlayerProfile(db,target,viewer,now=Date.now()){
 const corp=db.corporations.find(v=>v.id===target.corporation);
 return {...playerProfileData(target.state),id:target.id,corporation:corp?{name:corp.name,members:db.users.filter(v=>v.corporation===corp.id).length}:null,
  relation:viewer?{self:viewer.id===target.id,blocked:viewer.social?.blocked?.includes(target.id)||false,friend:viewer.social?.friends?.includes(target.id)||false,partner:viewer.social?.partner===target.id,available:canInteract(viewer,target,now),canPropose:!viewer.social?.partner&&!target.social?.partner,requests:(db.socialRequests||[]).filter(v=>v.expiresAt>now&&(v.from===viewer.id&&v.to===target.id||v.to===viewer.id&&v.from===target.id)).map(v=>({id:v.id,kind:v.kind,outgoing:v.from===viewer.id})),rejectGifts:!!target.state.settings?.rejectGifts}:null};
}
export function socialAction(db,u,b,now=Date.now()){
 if(!b.action?.startsWith('social-'))return false;
 const target=user(db,b.target||b.id),s=u.state;
 if(b.action==='social-gift'||b.action==='social-cosmetic'){
  if(typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId)||!Number.isSafeInteger(b.issuedAt)||b.issuedAt>now+30000||now-b.issuedAt>=300000)return false;
  const fingerprint=JSON.stringify([b.action,b.target,b.item,b.amount,b.issuedAt]),previous=u.social?.receipts?.find(v=>v.id===b.requestId);
  if(previous)return previous.fingerprint===fingerprint;
  if((u.social?.receipts||[]).filter(v=>v.expiresAt>now).length>=2000)return false;
  if(!canInteract(u,target,now)||!idle(s)||!idle(target.state)||target.state.settings?.rejectGifts)return false;
  const r=target.state;
  if(b.action==='social-cosmetic'){
   const c=cosmetics.find(v=>v.id===b.item);if(!c||r.cosmetics?.includes(c.id)||b.amount!==c.price||s.credits<c.price)return false;
   s.credits-=c.price;(r.cosmetics??=[]).push(c.id);record(r,`${s.name} tặng bạn cyberwear ${c.name}.`);
  }else{
   if(typeof b.item!=='string'||!positive(b.amount))return false;
   const parts=b.item.split(':');if(parts.length!==2)return false;const [kind,id]=parts;
   if(kind==='field'){
    if(!['credits','scrap','hashProcessors','aiCores'].includes(id))return false;
    const have=s[id]??(id==='scrap'?6:0),received=r[id]??(id==='scrap'?6:0);
    if(have<b.amount||!Number.isSafeInteger(received+b.amount))return false;s[id]=have-b.amount;r[id]=received+b.amount;
   }else if(kind==='stack'){
    if((stacks(s)[id]||0)<b.amount||!Number.isSafeInteger((stacks(r)[id]||0)+(r.stackInbox?.[id]||0)+b.amount))return false;
    // Validate the catalog before deducting; receiveStack routes overflow to inbox.
    if(!receiveStack(r,id,b.amount,now))return false;s.stacks??={...stacks(s)};s.stacks[id]-=b.amount;
   }else if(kind==='gear'){
    if(b.amount!==1||!ownGear(s,id)||ownsGear(r,id))return false;
    const calibration=s.calibration?.[id]||{level:0,modules:[]};takeGear(s,id);putGear(r,id,calibration);
   }else return false;
   const name=kind==='field'?({credits:'credits',scrap:'linh kiện',hashProcessors:'bộ xử lý Hash',aiCores:'lõi AI'})[id]:kind==='gear'?gear.find(v=>v.id===id).name:[...supplies,...materials,...blueprints].find(v=>v.id===id).name;record(r,`${s.name} tặng bạn ${b.amount} × ${name}.`);
  }
  const state=social(u);state.receipts=(state.receipts||[]).filter(v=>v.expiresAt>now);state.receipts.push({id:b.requestId,fingerprint,expiresAt:b.issuedAt+300000});record(s,`Đã gửi quà cho ${r.name}.`);return true;
 }
 if(b.action==='social-request'){
  if(!canInteract(u,target,now)||!['friend','partner'].includes(b.kind))return false;
  const a=social(u),r=social(target);db.socialRequests??=[];
  if(db.socialRequests.filter(v=>v.from===u.id).length>=20||db.socialRequests.filter(v=>v.to===target.id).length>=50||db.socialRequests.some(v=>v.kind===b.kind&&(v.from===u.id&&v.to===target.id||v.from===target.id&&v.to===u.id)))return false;
  if(b.kind==='friend'&&(a.friends.includes(target.id)||a.friends.length>=200||r.friends.length>=200)||b.kind==='partner'&&(a.partner||r.partner))return false;
  db.socialRequests.push({id:randomUUID(),from:u.id,to:target.id,kind:b.kind,expiresAt:now+7*86400000});record(target.state,`${s.name} gửi lời mời ${b.kind==='friend'?'kết bạn':'kết đôi'}. Mở Liên hệ để trả lời.`);record(s,'Đã gửi lời mời.');return true;
 }
 if(['social-accept','social-decline','social-cancel'].includes(b.action)){
  const q=(db.socialRequests||[]).find(v=>v.id===b.id&&v.expiresAt>now);if(!q||(b.action==='social-cancel'?q.from!==u.id:q.to!==u.id))return false;
  const from=user(db,q.from),to=user(db,q.to);
  if(b.action==='social-accept'){
   if(!canInteract(from,to,now))return false;const a=social(from),r=social(to);
   if(q.kind==='friend'){if(a.friends.length>=200||r.friends.length>=200)return false;a.friends=[...new Set([...a.friends,to.id])];r.friends=[...new Set([...r.friends,from.id])];}
   else{if(a.partner||r.partner)return false;a.partner=to.id;r.partner=from.id;db.socialRequests=db.socialRequests.filter(v=>v.kind!=='partner'||![from.id,to.id].some(id=>v.from===id||v.to===id));}
   record(from.state,`${to.state.name} đồng ý ${q.kind==='friend'?'kết bạn':'kết đôi'}.`);record(to.state,`Đã ${q.kind==='friend'?'kết bạn':'kết đôi'} với ${from.state.name}.`);
  }
  db.socialRequests=db.socialRequests.filter(v=>v.id!==q.id);return true;
 }
 if(['social-unfriend','social-separate','social-block','social-unblock'].includes(b.action)){
  if(!target||target.id===u.id)return false;const a=social(u),r=social(target);
  if(b.action==='social-unblock'){if(!a.blocked.includes(target.id))return false;a.blocked=a.blocked.filter(v=>v!==target.id);return true;}
  if(b.action==='social-block'){if(a.blocked.includes(target.id)||a.blocked.length>=200)return false;a.blocked.push(target.id);}
  if(b.action==='social-unfriend'&&!a.friends.includes(target.id)||b.action==='social-separate'&&a.partner!==target.id)return false;
  if(b.action!=='social-separate'){a.friends=a.friends.filter(v=>v!==target.id);r.friends=r.friends.filter(v=>v!==u.id);}
  if(b.action!=='social-unfriend'){if(a.partner===target.id)a.partner=null;if(r.partner===u.id)r.partner=null;}
  if(b.action==='social-block'){
   db.socialRequests=(db.socialRequests||[]).filter(v=>!(v.from===u.id&&v.to===target.id||v.from===target.id&&v.to===u.id));
   for(const t of [...(db.privateTrades||[])])if(t.from===u.id&&t.to===target.id||t.from===target.id&&t.to===u.id)returnTrade(db,t);
  }
  record(s,'Đã cập nhật quan hệ với runner.');return true;
 }
 if(b.action==='social-trade-create'){
  const price=b.price,wanted=b.wanted||null;
  if(!canInteract(u,target,now)||!idle(s)||!idle(target.state)||!ownGear(s,b.gear)||ownsGear(target.state,b.gear)||!Number.isSafeInteger(price)||price<0||price>1000000||!wanted&&!price||wanted&&(!gear.some(v=>v.id===wanted)||!target.state.inventory.includes(wanted)||ownsGear(s,wanted)))return false;
  db.privateTrades??=[];if(db.privateTrades.filter(v=>v.from===u.id).length>=10||db.privateTrades.filter(v=>v.to===target.id).length>=20)return false;
  const calibration=structuredClone(s.calibration?.[b.gear]||{level:0,modules:[]});takeGear(s,b.gear);(s.escrow??=[]).push(b.gear);
  db.privateTrades.push({id:randomUUID(),from:u.id,to:target.id,gear:b.gear,calibration,wanted,price,time:now,expiresAt:now+86400000});record(target.state,`${s.name} gửi đề nghị trao đổi. Mở Liên hệ để xem và xác nhận.`);record(s,'Đã gửi đề nghị; trang bị được giữ đến khi người nhận đồng ý, từ chối hoặc hết hạn.');return true;
 }
 if(['social-trade-accept','social-trade-decline','social-trade-cancel'].includes(b.action)){
  const t=(db.privateTrades||[]).find(v=>v.id===b.id&&v.expiresAt>now);if(!t||(b.action==='social-trade-cancel'?t.from!==u.id:t.to!==u.id))return false;
  if(b.action!=='social-trade-accept'){returnTrade(db,t);return true;}
  const from=user(db,t.from),to=user(db,t.to);if(!canInteract(from,to,now)||!idle(from.state)||!idle(to.state)||ownsGear(to.state,t.gear)||to.state.credits<t.price||!Number.isSafeInteger(from.state.credits+t.price)||t.wanted&&(!ownGear(to.state,t.wanted)||ownsGear(from.state,t.wanted)))return false;
  const fitted=t.wanted?structuredClone(to.state.calibration?.[t.wanted]||{level:0,modules:[]}):null;
  if(t.wanted){takeGear(to.state,t.wanted);putGear(from.state,t.wanted,fitted);}
  from.state.escrow=(from.state.escrow||[]).filter(v=>v!==t.gear);putGear(to.state,t.gear,t.calibration);to.state.credits-=t.price;from.state.credits+=t.price;db.privateTrades=db.privateTrades.filter(v=>v.id!==t.id);record(from.state,`${to.state.name} hoàn tất trao đổi · +${t.price} credits.`);record(to.state,`Đã hoàn tất trao đổi với ${from.state.name}.`);return true;
 }
 if(b.action==='social-report'){
  const reason=typeof b.reason==='string'?b.reason.trim():'';
  if(!target||target.id===u.id||!['abuse','spam','cheating','other'].includes(b.category)||reason.length<5||reason.length>500)return false;
  db.playerReports??=[];if(db.playerReports.filter(v=>v.author===u.id&&v.time>now-86400000).length>=5||db.playerReports.some(v=>v.author===u.id&&v.target===target.id&&v.status==='open')||db.playerReports.filter(v=>v.status==='open').length>=2000)return false;
  db.playerReports.push({id:randomUUID(),author:u.id,target:target.id,category:b.category,reason,time:now,status:'open'});db.playerReports=[...db.playerReports.filter(v=>v.status==='open'),...db.playerReports.filter(v=>v.status!=='open'&&v.time>now-90*86400000).slice(-1000)];record(s,'Đã gửi báo cáo cho admin xem xét.');return true;
 }
 return false;
}
export function cleanupSocial(db,id){
 for(const t of [...(db.privateTrades||[])])if(t.from===id||t.to===id)returnTrade(db,t);
 db.socialRequests=(db.socialRequests||[]).filter(v=>v.from!==id&&v.to!==id);db.playerReports=(db.playerReports||[]).filter(v=>v.author!==id&&v.target!==id);
 for(const u of db.users){if(u.social){u.social.friends=(u.social.friends||[]).filter(v=>v!==id);u.social.blocked=(u.social.blocked||[]).filter(v=>v!==id);if(u.social.partner===id)u.social.partner=null;}}
}
