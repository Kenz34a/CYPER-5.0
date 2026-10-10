import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fresh,stats,equip,turn,awardVictory,pvp} from '../src/game.js';
import {gear} from '../src/content.js';
import {moduleItem,makeModule,moduleDrop,fittedModuleStats} from '../src/modules.js';
import {installModule,removeModule,itemStats} from '../src/equipment.js';
import {bagCapacity,receiveStack,settleInbox,inboxEntries,stackItem} from '../src/inventory-state.js';
import {inventoryAction} from '../src/inventory.js';
import {craftPlan,executeCraft,craftRecipes} from '../src/crafting.js';
import {queueLoot,lootAction} from '../src/loot.js';
import {enterDungeon,stepDungeon} from '../src/dungeon.js';
import {initWorld} from '../src/world.js';
import {socialAction} from '../src/social.js';
const highGear=gear.find(g=>g.level===25&&g.slot==='weapon');
function runner(){const s=fresh();s.level=50;s.credits=100000;s.scrap=1000;s.hashProcessors=1000;s.inventory.push(highGear.id);s.stacks={};return s;}
test('module IDs derive six grades, levels and multiple stats without accepting forged attributes',()=>{
 const common=makeModule('damage',0,1),legend=makeModule('damage',4,25);
 assert.equal(common.stats.damage,3);assert.equal(common.quality,70);assert(legend.stats.damage>common.stats.damage);assert(legend.stats.health>0);assert.equal(legend.quality,90);
 assert.equal(new Set(Array.from({length:6},(_,r)=>makeModule('health',r,25).id)).size,6);
 for(const id of ['mod-damage-r6-l25','mod-damage-r4-l0','mod-damage-r4-l025','mod-damage-r4-l1001','mod-fake-r4-l25',{},null])assert.equal(moduleItem(id),null);
 assert.equal(stackItem('health'),null);assert.equal(moduleItem('health').stats.health,15);assert.equal(moduleItem('mod-pocket').stats.pocket,2);
 assert.equal(moduleDrop(25,4,()=>.999),makeModule('crit-damage',4,25).id);
});
test('graded modules require an owned copy, unlocked socket and eligible gear and character levels',()=>{
 const s=runner(),m=makeModule('health',4,25);s.stacks[m.id]=1;let before=structuredClone(s);
 assert(!installModule(s,'gear0',0,m.id));assert(!installModule(s,highGear.id,1,m.id));assert.deepEqual(s,before);
 s.level=24;assert(!installModule(s,highGear.id,0,m.id));s.level=50;
 assert(installModule(s,highGear.id,0,m.id));assert.equal(s.stacks[m.id],0);assert.equal(s.calibration[highGear.id].modules[0],m.id);assert.equal(itemStats(s,highGear.id).health,(highGear.health||0)+m.stats.health);
 assert.equal(stats(s).maxHp,590);assert(equip(s,highGear.id));assert.equal(stats(s).maxHp,590+(highGear.health||0)+m.stats.health);
 before=structuredClone(s);assert(!installModule(s,highGear.id,0,m.id));assert(!installModule(s,highGear.id,0,makeModule('armor',4,25).id));assert.deepEqual(s,before);
 assert(removeModule(s,highGear.id,0));assert.equal(s.stacks[m.id],1);assert.equal(s.calibration[highGear.id].modules[0],null);assert(!removeModule(s,highGear.id,0));
});
test('old bare module saves keep exact stats and return the old stack item',()=>{
 const s=fresh();s.credits=1000;s.calibration={gear0:{level:4,modules:['health','crit','pocket']}};
 assert.equal(stats(s).maxHp,115);assert(Math.abs(stats(s).crit-.17)<1e-10);assert.equal(bagCapacity(s),62);
 assert(removeModule(s,'gear0',0));assert.equal(s.stacks['mod-health'],1);assert(installModule(s,'gear0',0,'mod-health'));assert.equal(s.stacks['mod-health'],0);assert.equal(s.calibration.gear0.modules[0],'health');
 assert.deepEqual(fittedModuleStats(['health',null,'mod-armor','fake']),{health:15,armor:3});
});
test('critical damage is applied to real hits and capped at 200 percent',()=>{
 const s=runner(),m=makeModule('crit-damage',4,25);s.stacks[m.id]=1;assert(installModule(s,highGear.id,0,m.id));assert(equip(s,highGear.id));
 const st=stats(s);assert(st.critDamage>1.5);s.combat={name:'Fixture',currentHp:10000,hp:10000,currentShield:0,defense:0,attack:1,turn:0,pvp:true};assert(turn(s,'attack',()=>0));assert.equal(s.lastHit.damage,Math.floor(st.attack*st.critDamage));
 s.combat=null;s.calibration[highGear.id]={level:4,modules:Array(3).fill(makeModule('crit-damage',5,1000).id)};assert.equal(stats(s).critDamage,2);
});
test('pocket capacity uses graded stats and full-bag removal or salvage rolls back without loss',()=>{
 const s=runner(),p=makeModule('pocket',4,25);s.stacks[p.id]=1;assert(installModule(s,highGear.id,0,p.id));assert(equip(s,highGear.id));assert.equal(bagCapacity(s),60+p.stats.pocket);
 s.inventory=gear.slice(0,60).map(v=>v.id);if(!s.inventory.includes(highGear.id))s.inventory[59]=highGear.id;s.stacks={};let before=structuredClone(s);assert(!removeModule(s,highGear.id,0));assert.deepEqual(s,before);
 s.equipped.weapon='gear0';s.calibration[highGear.id]={level:2,modules:[makeModule('health',3,25).id,makeModule('damage',4,25).id]};before=structuredClone(s);assert(!inventoryAction(s,{action:'scrap-gear',id:highGear.id}));assert.deepEqual(s,before);
 s.inventory=s.inventory.filter(id=>id!=='gear2');assert(inventoryAction(s,{action:'scrap-gear',id:highGear.id}));assert.equal(s.stacks[makeModule('health',3,25).id],1);assert.equal(s.stacks[makeModule('damage',4,25).id],1);
});
test('module crafting enforces grade, profession, level and capacity; batches charge exact costs',()=>{
 const s=runner(),m=makeModule('health',4,25),id='craft:'+m.id;s.craftingSkills={material:{rank:24,xp:0,total:0}};
 assert(!craftPlan(s,id).can);s.craftingSkills.material.rank=25;const p=craftPlan(s,id),credits=s.credits,scrap=s.scrap,hash=s.hashProcessors;assert(p.can);assert(executeCraft(s,id,2));assert.equal(s.stacks[m.id],2);
 assert.equal(s.credits,credits-2*p.fields.credits);assert.equal(s.scrap,scrap-2*p.fields.scrap);assert.equal(s.hashProcessors,hash-2*p.fields.hashProcessors);assert.equal(s.craftingSkills.material.total,2);
 assert.equal(craftRecipes(s).filter(v=>v.category==='module').length,54);
 s.level=24;const before=structuredClone(s);assert(!executeCraft(s,id));assert(!executeCraft(s,'craft:mod-health-r9-l25'));assert(!executeCraft(s,'craft:mod-health'));assert.deepEqual(s,before);
 const full=runner();full.inventory=gear.slice(0,60).map(g=>g.id);assert(!craftPlan(full,'craft:mod-health-r0-l1').can);
});
test('bosses and unlocked chests drop modules; loot overflow preserves IDs and expires once',()=>{
 const s=runner();s.map='map24';awardVictory(s,{name:'Boss',level:25,boss:true,credits:1,xp:1},()=>.9);let drop=s.pendingLoot.items.find(v=>moduleItem(v.id));assert(drop);assert.equal(moduleItem(drop.id).level,25);assert.equal(moduleItem(drop.id).rarity,3);
 s.inventory=gear.slice(0,60).map(g=>g.id);const id=s.pendingLoot.id;assert(lootAction(s,{action:'loot-take',id},{now:1000}));assert.equal(s.stackInbox[drop.id],1);assert(inboxEntries(s).some(v=>v.id===drop.id&&v.level===25));assert(!lootAction(s,{action:'loot-take',id}));settleInbox(s,{now:1000+7*86400000,collect:false});assert(!s.stackInbox[drop.id]);
 const chest=fresh();assert(enterDungeon(chest));chest.dungeon.cells=chest.dungeon.cells.map(c=>['M','B'].includes(c)?'.':c);stepDungeon(chest,'left',()=>.9);assert(chest.pendingLoot.items.some(v=>moduleItem(v.id)));
 const arena=fresh();assert(pvp(arena));arena.combat.currentHp=1;assert(turn(arena,'attack',()=>0));assert.equal(arena.pendingLoot,undefined);
 const invalid=fresh();assert(!queueLoot(invalid,[{kind:'stack',id:'mod-health-r6-l1',count:1}]));
});
test('gifts and escrow preserve graded module IDs, fitted stats and overflow without duplication',()=>{
 const m=makeModule('health',4,25),db={users:[{id:'a',state:runner()},{id:'b',state:runner()}]};initWorld(db);const [a,b]=db.users;b.state.inventory=['gear0','gear1'];a.state.stacks[m.id]=2;
 const gift={action:'social-gift',target:'b',item:'stack:'+m.id,amount:1,requestId:randomUUID(),issuedAt:1000};assert(socialAction(db,a,gift,1000));assert(socialAction(db,a,gift,1000));assert.equal(a.state.stacks[m.id],1);assert.equal(b.state.stacks[m.id],1);
 assert(installModule(a.state,highGear.id,0,m.id));assert(socialAction(db,a,{action:'social-trade-create',target:'b',gear:highGear.id,price:50},1000));const trade=db.privateTrades[0];assert.equal(trade.calibration.modules[0],m.id);assert(socialAction(db,b,{action:'social-trade-accept',id:trade.id},1000));assert.equal(b.state.calibration[highGear.id].modules[0],m.id);assert.equal(itemStats(b.state,highGear.id).health,(highGear.health||0)+m.stats.health);
 b.state.inventory=gear.slice(0,60).map(g=>g.id);b.state.stacks={};a.state.stacks[m.id]=1;assert(socialAction(db,a,{...gift,requestId:randomUUID()},1000));assert.equal(b.state.stackInbox[m.id],1);
});
