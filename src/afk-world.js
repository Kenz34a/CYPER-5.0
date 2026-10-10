import {afkOffers,afkBoostState} from './afk-effects.js';
import {record} from './journal.js';
export function afkWorldView(db,now=Date.now()){
 return {...afkBoostState(db,now),events:(db.afk?.events||[]).slice(-20).map(({author,...event})=>event),waiting:db.users.filter(u=>u.state.work?.endsAt>now).length};
}
export function afkWorldAction(db,u,b,now=Date.now()){
 if(b.action!=='afk-global')return false;
 const offer=afkOffers.find(v=>v.id===b.id),s=u.state;
 if(!offer||typeof b.requestId!=='string'||!/^[-a-zA-Z0-9_]{16,80}$/.test(b.requestId||'')||!Number.isSafeInteger(b.issuedAt)||b.issuedAt>now+30000||now-b.issuedAt>300000||b.amount!==offer.cost)return false;
 // A receipt remains valid longer than the allowed request age. Replays cannot spend again,
 // including after a restart or a concurrent retry of a long queue skip.
 const fingerprint=JSON.stringify([b.id,b.amount,b.issuedAt]);
 const receipts=db.afk?.receipts||[],old=receipts.find(v=>v.actor===u.id&&v.id===b.requestId);
 if(old)return old.fingerprint===fingerprint;
 const boost=afkBoostState(db,now);
 if(s.combat||s.dungeon||!Number.isSafeInteger(s.units)||s.units<offer.cost)return false;
 if(b.id==='speed'&&boost.speed>=80||b.id==='reward'&&boost.reward>1||b.id==='xp'&&boost.xp>0)return false;
 const waiting=db.users.filter(v=>v.state.work?.endsAt>now);
 if(b.id==='skip'&&!waiting.length)return false;
 db.afk??={};db.afk.buffs??=[];db.afk.events??=[];
 db.afk.buffs=db.afk.buffs.filter(v=>v.expiresAt>now);
 s.units-=offer.cost;
 if(b.id==='skip')for(const player of waiting){player.state.work.endsAt=Math.max(now,player.state.work.endsAt-offer.seconds*1000);record(player.state,`${s.name} giảm 15 phút hàng chờ cho toàn server.`);}
 else db.afk.buffs.push({id:b.id,expiresAt:now+offer.duration});
 db.afk.events.push({id:b.id,author:u.id,name:s.name,time:now,affected:b.id==='skip'?waiting.length:db.users.length});
 db.afk.events=db.afk.events.slice(-20);
 db.afk.receipts=receipts.filter(v=>v.expiresAt>now);
 db.afk.receipts.push({actor:u.id,id:b.requestId,fingerprint,expiresAt:now+86400000});
 record(s,`Dùng ${offer.cost} Unit · ${offer.name} cho toàn server.`);
 return true;
}
