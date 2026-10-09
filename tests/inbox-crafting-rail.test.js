import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,move,startFight,turn,rest} from '../src/game.js';
import {enterDungeon,stepDungeon,leaveDungeon} from '../src/dungeon.js';
import {gear} from '../src/content.js';
import {receiveGear,receiveStack,settleInbox,inboxLifetime,bagSize,stacks,inboxEntries} from '../src/inventory-state.js';
import {inventoryAction} from '../src/inventory.js';
import {craftPlan,executeCraft,craftSkill} from '../src/crafting.js';
import {fragments,railAccess,stationPlan,railAction,migrateRail} from '../src/rail.js';

test('new parcels expire at seven days; separate stack batches keep their deadlines, legacy and market returns remain',()=>{
 const s=fresh(),now=100000;s.inventory=gear.slice(0,58).map(v=>v.id);s.calibration={gear60:{level:2,modules:['health']}};
 assert(receiveGear(s,'gear60',{now}));assert(receiveGear(s,'gear61',{now,permanent:true}));assert(receiveStack(s,'nitron',100,now));assert(receiveStack(s,'nitron',20,now+1000));
 assert.equal(inboxEntries(s).find(v=>v.id==='nitron').mixed,true);assert.equal(settleInbox(s,{now:now+inboxLifetime-1,collect:false}).expired,0);
 const r=settleInbox(s,{now:now+inboxLifetime,collect:false});assert.equal(r.expired,101);assert.equal(s.calibration.gear60,undefined);assert.deepEqual(s.itemInbox,['gear61']);assert.equal(s.stackInbox.nitron,20);assert.equal(s.inboxBatches[0].expiresAt,now+1000+inboxLifetime);
 s.stackInbox.balm=5;s.inventory.pop();const received=settleInbox(s,{now:now+inboxLifetime}).received;assert.equal(received,25);assert.equal(stacks(s).balm,8);assert.equal(stacks(s).nitron,20);assert.deepEqual(s.itemInbox,['gear61']);assert.equal(bagSize(s),60);assert.equal(settleInbox(s,{now:now+inboxLifetime}).received,0);
 s.inventory.pop();assert.equal(settleInbox(s,{now:now+inboxLifetime}).received,1);assert(s.inventory.includes('gear61'));
});

test('automatic receipt waits for combat/dungeon, claim-all is partial and welcome reward cannot repeat',()=>{
 const s=fresh();s.inventoryWelcomeClaimed=true;s.inventory=gear.slice(0,58).map(v=>v.id);receiveGear(s,'gear60');receiveGear(s,'gear61');s.inventory.pop();s.combat={};assert.equal(settleInbox(s).received,0);s.combat=null;s.dungeon={};assert.equal(settleInbox(s).received,0);s.dungeon=null;
 assert(inventoryAction(s,{action:'inbox-claim-all'}));assert(s.inventory.includes('gear60'));assert.deepEqual(s.itemInbox,['gear61']);assert.equal(inventoryAction(s,{action:'inbox-claim-all'}),false);assert.equal(bagSize(s),60);
 const legacy=fresh();legacy.itemInbox=['gear60'];assert.equal(settleInbox(legacy,{now:Date.now()+99*inboxLifetime}).received,1);const before=legacy.credits;assert(inventoryAction(legacy,{action:'inbox-claim-all'}));assert.equal(legacy.credits,before+50);assert.equal(inventoryAction(legacy,{action:'inbox-claim-all'}),false);
});

test('craft batch is atomic, rejects invalid amounts and reports the same deficits used by execution',()=>{
 const s=fresh();s.credits=10;s.scrap=1;assert.equal(craftPlan(s,'balm').times,1);const before=structuredClone(s);assert.equal(executeCraft(s,'balm',2),false);assert.deepEqual(s,before);
 for(const n of [0,-1,1.5,101,'2'])assert.equal(executeCraft(s,'balm',n),false);assert(executeCraft(s,'balm'));assert.equal(s.credits,0);assert.equal(s.scrap,0);assert.equal(stacks(s).balm,4);assert.equal(craftSkill(s,'medical').total,1);
 const plan=craftPlan(s,'nano');assert(plan.missing.some(v=>v.includes('Bộ xử lý Hash')));assert.equal(plan.can,false);assert.equal(craftPlan(s,'forged'),null);
});

test('AI cluster compression charges exactly 1000 cores and 50000 credits; split returns 1000 without farmable profession XP',()=>{
 const s=fresh();s.aiCores=1000;s.credits=49999;assert.equal(craftPlan(s,'ai-cluster').times,0);assert.equal(executeCraft(s,'ai-cluster'),false);s.credits=50000;assert(executeCraft(s,'ai-cluster'));assert.equal(s.aiCores,0);assert.equal(s.aiClusters,1);assert.equal(s.credits,0);assert.equal(s.craftingSkills,undefined);
 assert(executeCraft(s,'ai-split'));assert.equal(s.aiClusters,0);assert.equal(s.aiCores,1000);assert.equal(executeCraft(s,'ai-split'),false);assert.equal(executeCraft(s,'ai-cluster'),false);
});

test('ammo profession unlocks Nitron at rank 10; two output cells can replace the last input stack in a full bag',()=>{
 const s=fresh();s.scrap=500;s.credits=10000;assert(executeCraft(s,'ammo-stock',90));assert.equal(craftSkill(s,'ammo').rank,10);assert.equal(stacks(s)['ammo-material'],90);assert.equal(craftPlan(s,'nitron').times,90);assert(executeCraft(s,'nitron',5));assert.equal(stacks(s).nitron,10);assert.equal(stacks(s)['ammo-material'],85);assert(craftSkill(s,'ammo').rank>10);
 const full=fresh();full.inventory=gear.slice(0,57).map(v=>v.id);full.stacks={balm:3,stim:1,'ammo-material':1};full.craftingSkills={ammo:{rank:9,xp:0,total:0}};assert.equal(bagSize(full),60);assert.equal(executeCraft(full,'nitron'),false);full.craftingSkills.ammo.rank=10;assert(executeCraft(full,'nitron'));assert.equal(stacks(full).nitron,2);assert.equal(bagSize(full),60);
 const blocked=fresh();blocked.inventory=gear.slice(0,57).map(v=>v.id);blocked.stacks={balm:3,stim:1,'ammo-material':2};blocked.craftingSkills={ammo:{rank:10,xp:0,total:0}};assert(craftPlan(blocked,'nitron').missing.some(v=>v.includes('ô trống')));assert.equal(executeCraft(blocked,'nitron'),false);
});

test('blueprint batches create unique eligible gear and consume actual drawings; missing blueprint recipes stay visible but unavailable',()=>{
 const s=fresh();s.level=2;s.credits=1000;s.scrap=20;s.stacks={balm:3,stim:1,'bp-weapon-0':2};assert(executeCraft(s,'bp-weapon-0',2));assert.deepEqual(s.inventory.slice(-2),['gear3','gear6']);assert.equal(stacks(s)['bp-weapon-0'],0);assert.equal(new Set(s.inventory).size,s.inventory.length);assert.equal(craftPlan(s,'bp-weapon-0').can,false);assert(craftPlan(s,'bp-armor-4').missing.length>0);
});

test('five rail tiers require distinct completed dungeons and Terminal assembly; legacy access stays intact',()=>{
 const s=fresh();assert.equal(stationPlan(s,'glass').can,false);assert(stationPlan(s,'neon').can);s.level=39;rest(s);assert(!move(s,'map30'));
 for(const id of ['map20','map24','map29']){assert(move(s,id));assert(startFight(s));s.combat.currentHp=1;assert(turn(s,'attack',()=>1));rest(s);}
 assert.equal(fragments(s).length,0);assert(!railAction(s,{action:'key-assemble',id:'red',fragments:3}));
 const clear=id=>{s.map=id;rest(s);assert(enterDungeon(s));for(let floor=1;floor<=3;floor++){s.dungeon.bossDefeated=true;s.dungeon.x=13;s.dungeon.y=2;assert(stepDungeon(s,'up'));}};
 s.map='map20';assert(enterDungeon(s));assert(leaveDungeon(s));assert.equal(fragments(s).length,0);
 clear('map20');clear('map20');assert.equal(fragments(s).length,1);clear('map24');clear('map29');assert.equal(fragments(s).length,3);assert(!railAccess(s));assert(!move(s,'map30'));
 assert(railAction(s,{action:'key-assemble',id:'red'}));assert(!railAction(s,{action:'key-assemble',id:'red'}));assert(move(s,'map30'));assert(!move(s,'map40'));assert(!stationPlan(s,'summit').can);
 for(const id of ['map30','map34','map39'])clear(id);assert.equal(fragments(s,'summit').length,3);assert(railAction(s,{action:'key-assemble',id:'summit'}));assert(move(s,'map40'));assert(!move(s,'map49'));s.dungeon={};assert(!stationPlan(s,'neon').can);
 const veteran=fresh();delete veteran.railVersion;veteran.level=40;veteran.progress['map35:enemy']=1;assert(migrateRail(veteran));assert(railAccess(veteran));assert(move(veteran,'map39'));assert(!railAccess(veteran,'summit'));assert(!migrateRail(veteran));assert.equal(stationPlan(veteran,'made-up'),null);
});
