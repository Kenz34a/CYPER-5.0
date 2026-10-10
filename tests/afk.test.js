import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/game.js';
import {workPlan,workAction} from '../src/work.js';
import {craftSkill} from '../src/crafting.js';
import {afkBoostState,afkOffers} from '../src/afk-effects.js';
import {afkWorldAction,afkWorldView} from '../src/afk-world.js';
import {initWorld} from '../src/world.js';
import {removeAccountData} from '../src/account-data.js';

test('AFK batches validate all inputs before consumption and gate gathering by region',()=>{
 const s=fresh();s.aiCores=2;
 for(const count of [-1,0,1.5,1001,'2',NaN]){const before=structuredClone(s);assert(!workAction(s,{action:'work-start',id:'bot',count},0));assert.deepEqual(s,before);}
 assert(!workAction(s,{action:'work-start',id:'bot',count:3},0));assert.equal(s.aiCores,2);
 assert.equal(workPlan(s,'printing',15).energy,30);assert(!workPlan(s,'printing',16).can);
 assert(workAction(s,{action:'work-start',id:'bot',count:2},0));assert.equal(s.aiCores,0);assert.equal(s.work.endsAt,1800000);assert.equal(s.energy,30);
 assert(workAction(s,{action:'work-cancel'},1));assert.equal(s.aiCores,0);assert.equal(s.credits,180);
 s.map='map20';assert(!workPlan(s,'gather').can);s.craftingSkills={gathering:{rank:21,xp:0,total:7}};assert(workAction(s,{action:'work-start',id:'gather',count:2},10));assert.equal(s.energy,26);
 assert(workAction(s,{action:'work-claim'},600010));assert.equal(s.scrap,8);assert.equal(s.stacks['ammo-material'],6);assert.equal(craftSkill(s,'gathering').xp,124);assert.equal(craftSkill(s,'gathering').total,7);assert.equal(s.kills,0);assert.equal(s.units,0);
});
test('stacked boosts expire independently; started bot rewards survive reload and a full bag',()=>{
 const db={afk:{buffs:[{id:'speed',expiresAt:1000},{id:'speed',expiresAt:2000},{id:'reward',expiresAt:2000},{id:'xp',expiresAt:2000}]}};
 assert.equal(afkBoostState(db,0).speed,80);assert.equal(afkBoostState(db,1000).speed,40);assert.equal(afkBoostState(db,2000).reward,1);
 let s=fresh();s.aiCores=2;s.inventory=Array.from({length:60},(_,i)=>`gear${i}`);s.stacks={};
 const boosts=afkBoostState(db,0),p=workPlan(s,'bot',2,{boosts});assert.equal(p.seconds,360);assert.equal(p.reward.characterXP,518);assert.equal(p.reward.credits,192);
 assert(workAction(s,{action:'work-start',id:'bot',count:2},0,{boosts}));s=JSON.parse(JSON.stringify(s));
 assert(!workAction(s,{action:'work-claim'},359999));assert(workAction(s,{action:'work-claim',reward:{units:1000}},360000));
 assert.equal(s.credits,372);assert.equal(s.scrap,14);assert.equal(s.stackInbox['ammo-material'],16);assert.equal(s.stackInbox.balm,8);assert.equal(s.stackInbox['energy-cell'],8);
 assert.equal(s.level,4);assert.equal(s.xp,158);assert.equal(s.units,0);assert.equal(s.kills,0);assert.equal(s.activity.workCompleted,1);assert(!workAction(s,{action:'work-claim'},360001));
});
test('global skip reaches offline queues, is idempotent, and refuses empty or unaffordable purchases',()=>{
 const u={id:'buyer',state:{...fresh(),name:'Buyer',units:40,aiCores:10}},v={id:'offline',state:{...fresh(),name:'Offline',aiCores:10}},db={users:[u,v]};
 workAction(u.state,{action:'work-start',id:'bot',count:4},0);workAction(v.state,{action:'work-start',id:'bot',count:1},0);
 const b={action:'afk-global',id:'skip',amount:10,requestId:'1234567890123456',issuedAt:0};
 assert(afkWorldAction(db,u,b,100));assert.equal(u.state.units,30);assert.equal(u.state.work.endsAt,2700000);assert.equal(v.state.work.endsAt,100);assert.equal(v.state.activity?.workCompleted,undefined);
 assert(afkWorldAction(db,u,b,200));assert.equal(u.state.units,30);assert.equal(u.state.work.endsAt,2700000);assert.equal(db.afk.events.length,1);
 const saved=JSON.parse(JSON.stringify(db));assert(afkWorldAction(saved,saved.users[0],b,300));assert.equal(saved.users[0].state.units,30);
 assert(!afkWorldAction(db,u,{...b,amount:9},100));assert(!afkWorldAction(db,u,{...b,id:'xp',amount:5},100));
 assert(!afkWorldAction(db,u,{...b,requestId:'new-12345678901234'},300001));
 u.state.units=0;assert(!afkWorldAction(db,u,{...b,requestId:'new-12345678901234'},100));assert.equal(u.state.work.endsAt,2700000);
 u.state.units=40;u.state.work.endsAt=0;assert(!afkWorldAction(db,u,{...b,requestId:'new-12345678901234'},200));assert.equal(u.state.units,40);
});
test('global buffs enforce caps and costs, and retries never charge twice',()=>{
 const u={id:'a',state:{...fresh(),units:100}},db={users:[u]};let seq=0;
 const buy=(id,now=0)=>afkWorldAction(db,u,{action:'afk-global',id,amount:afkOffers.find(v=>v.id===id).cost,requestId:`receipt-${String(++seq).padStart(16,'0')}`,issuedAt:now},now);
 assert(buy('speed'));assert(buy('speed'));assert(!buy('speed'));assert.equal(u.state.units,90);assert.equal(afkWorldView(db,0).speed,80);
 assert(buy('reward'));assert(!buy('reward'));assert(buy('xp'));assert(!buy('xp'));assert.equal(u.state.units,77);
 const s={...fresh(),aiCores:2};assert(workAction(s,{action:'work-start',id:'bot',count:2},0,{boosts:afkBoostState(db,0)}));assert.equal(s.work.endsAt,360000);
 assert.equal(afkBoostState(db,1200000).speed,0);assert.equal(afkBoostState(db,1200000).xp,0);assert(buy('speed',1200000));assert.equal(u.state.units,72);
 u.state.combat={};assert(!buy('xp',1200000));assert.equal(u.state.units,72);
});

test('malformed premium requests do not spend; account deletion removes event identities and receipts while keeping community buffs',()=>{
 const u={id:'donor',state:{...fresh(),units:10}},v={id:'other',state:fresh()},db={users:[u,v]};initWorld(db);
 const b={action:'afk-global',id:'speed',amount:5,requestId:'delete-receipt-123456',issuedAt:0};
 assert(!afkWorldAction(db,u,{...b,requestId:{toString:null}},0));assert.equal(u.state.units,10);
 assert(afkWorldAction(db,u,b,0));assert(!Object.hasOwn(afkWorldView(db,0).events[0],'author'));
 const cleaned=removeAccountData(db,u.id);assert.equal(cleaned.afk.events.length,0);assert.equal(cleaned.afk.receipts.length,0);assert.equal(afkBoostState(cleaned,0).speed,40);assert.equal(db.afk.events.length,1);
});
