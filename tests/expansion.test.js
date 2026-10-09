import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,stats,startFight,turn,buy,equip} from '../src/game.js';
import {gear} from '../src/content.js';
import {bagCapacity,bagSize,stacks,receiveGear,receiveStack} from '../src/inventory-state.js';
import {upgrade,installModule,removeModule,itemStats} from '../src/equipment.js';
import {inventoryAction} from '../src/inventory.js';
import {executeCraft} from '../src/crafting.js';
import {enemyProfile,absorbShield,playerMark,markBonus,equipmentSlots} from '../src/gear-rules.js';
import {prepareDaily,rewardAction,dailyStatus,checkInStatus,vietnamDay} from '../src/rewards.js';
import {enterDungeon,stepDungeon} from '../src/dungeon.js';
import {dungeonEventAction} from '../src/dungeon-events.js';
import {expeditionAction,syncExpedition,expeditionList,expeditionParty} from '../src/expeditions.js';
import {removeAccountData} from '../src/account-data.js';

const roll=()=>.8;
function equippedRunner(){const s=fresh();s.credits=10000;for(let i=230;i<236;i++){assert(buy(s,'gear'+i));assert(equip(s,'gear'+i));}return s;}
test('new equipment slots contribute independently, old loadouts remain valid, backpack capacity affects every receipt',()=>{
 const s=equippedRunner(),st=stats(s);assert.equal(equipmentSlots.length,9);assert(st.specialAttack>0&&st.destructiveAttack>st.specialAttack);assert(st.maxHp>100&&st.maxShield>0&&st.regen>0);assert.equal(bagCapacity(s),65);
 assert(inventoryAction(s,{action:'loadout-save',id:'0'}));s.equipped.special=null;assert(inventoryAction(s,{action:'loadout-apply',id:'0'}));assert.equal(s.equipped.special,'gear230');
 const old=fresh();old.loadouts=[{weapon:'gear0',armor:'gear1',implant:null}];assert(inventoryAction(old,{action:'loadout-apply',id:'0'}));assert.equal(stats(old).attack,13);
 s.inventory=gear.slice(0,63).map(g=>g.id);s.inventory.push('gear235');s.stacks={};assert.equal(bagSize(s),64);assert(receiveGear(s,'gear100'));assert.equal(bagSize(s),65);assert(receiveGear(s,'gear101'));assert(s.itemInbox.includes('gear101'));assert(receiveStack(s,'antimatter',2));assert.equal(s.stackInbox.antimatter,2);
 s.equipped.backpack=null;assert.equal(bagCapacity(s),60);assert.equal(bagSize(s),65);assert(!buy(s,'gear102')); // Shrinking never destroys owned items.
});
test('shield weapon multipliers carry through overflow, ammunition validates before spending a turn',()=>{
 assert.deepEqual(absorbShield(100,60,1.2),{shield:0,shieldDamage:60,healthDamage:60});assert.deepEqual(absorbShield(100,20,.5),{shield:0,shieldDamage:20,healthDamage:30});assert.deepEqual(absorbShield(100,0,.5),{shield:0,shieldDamage:0,healthDamage:100});
 const s=equippedRunner();assert(startFight(s,'enemy',false,'shielded'));assert(s.combat.currentShield>0&&s.shield>0);const before=structuredClone(s);assert(!turn(s,'special',roll));assert.deepEqual(s,before);
 s.stacks={...stacks(s),'energy-cell':2,antimatter:2};s.combat.currentHp=s.combat.hp=1000;s.combat.currentShield=s.combat.shield=200;
 assert(turn(s,'special',roll));assert.equal(s.stacks['energy-cell'],1);assert.equal(s.lastHit.shieldDamage,Math.floor(Math.floor(stats(s).specialAttack*markBonus(s,s.combat.faction).attack)*1.2));assert.equal(s.lastHit.healthDamage,0);
 assert(turn(s,'destructive',roll));assert.equal(s.stacks.antimatter,1);assert.equal(s.lastHit.shieldDamage,Math.floor(Math.floor(stats(s).destructiveAttack*markBonus(s,s.combat.faction).attack)*.5));
 assert(!startFight(fresh(),'enemy',false,'invented'));assert.equal(enemyProfile({hp:20,attack:10,defense:5,xp:10,credits:10,map:'map0',name:'Test'},'rage').attack,12);
});
test('stun skips retaliation, regeneration restores living characters, dominant marks have both benefits and weaknesses',()=>{
 const s=fresh();s.credits=10000;assert(installModule(s,'gear0',0,'stun'));assert(installModule(s,'gear1',0,'regen'));assert(startFight(s));s.hp=50;s.combat.currentHp=10000;const hp=s.hp;assert(turn(s,'attack',()=>0));assert.equal(s.hp,hp+2);assert(s.log.some(v=>v.includes('bỏ lượt')));
 s.equipped.armor='gear4';s.inventory.push('gear4'); // two different marks still tie
 assert.equal(playerMark(s),null);s.equipped.weapon='gear3';s.equipped.armor='gear6';assert.equal(playerMark(s).id,'pierce');assert.deepEqual(markBonus(s,'Helix'),{attack:1.1,incoming:1});assert.deepEqual(markBonus(s,'Bóng Mờ'),{attack:1,incoming:1.1});
});
test('module removal conserves ownership, reinstall uses inventory, recycling is atomic and returns attached modules',()=>{
 const s=fresh();s.credits=10000;assert(installModule(s,'gear0',0,'shield'));const credits=s.credits;assert(removeModule(s,'gear0',0));assert.equal(s.stacks['mod-shield'],1);assert.equal(itemStats(s,'gear0').shield,0);assert(installModule(s,'gear0',0,'shield'));assert.equal(s.credits,credits);assert.equal(s.stacks['mod-shield'],0);
 s.inventory.push('gear3');assert(installModule(s,'gear3',0,'damage'));const snapshot=structuredClone(s);assert(!inventoryAction(s,{action:'bulk-scrap',ids:['gear3','gear0']}));assert.deepEqual(s,snapshot);
 assert(inventoryAction(s,{action:'scrap-gear',id:'gear3'}));assert(!s.inventory.includes('gear3'));assert.equal(s.calibration.gear3,undefined);assert.equal(s.stacks['mod-damage'],1);assert.equal(s.scrap,7);assert(!inventoryAction(s,{action:'scrap-gear',id:'gear3'}));
 const full=fresh();full.inventory=gear.slice(0,59).map(g=>g.id);full.stacks={};full.calibration={gear3:{level:2,modules:['damage','health']}};full.inventory.push('gear61');const before=structuredClone(full);assert(!removeModule(full,'gear3',0));assert.deepEqual(full,before);assert(!inventoryAction(full,{action:'scrap-gear',id:'gear3'}));assert.deepEqual(full,before);
});
test('ammo and expanded blueprint crafting consume their real inputs and reject forged quantities',()=>{
 const s=fresh();s.credits=10000;s.scrap=100;s.stacks={'ammo-material':4,'bp-helmet-0':1};assert(executeCraft(s,'energy-cell',2));assert.equal(s.stacks['energy-cell'],6);assert.equal(s.stacks['ammo-material'],2);assert(!executeCraft(s,'antimatter'));s.craftingSkills.ammo.rank=5;assert(executeCraft(s,'antimatter'));assert.equal(s.stacks.antimatter,2);assert(executeCraft(s,'bp-helmet-0'));assert(s.inventory.some(id=>gear.find(g=>g.id===id)?.slot==='helmet'));assert(!executeCraft(s,'energy-cell',-1));
});
test('daily rewards reset at Vietnam midnight, streak skips reset, contracts count only new activity, rewards claim once',()=>{
 const s=fresh(),now=Date.parse('2026-10-09T16:59:59Z');s.progress['map0:enemy']=20;assert(prepareDaily(s,now));assert.equal(dailyStatus(s,now)[0].value,0);assert(rewardAction(s,{action:'daily-checkin',credits:99999},now));assert.equal(s.credits,220);assert(!rewardAction(s,{action:'daily-checkin'},now));
 s.progress['map0:enemy']+=5;assert(rewardAction(s,{action:'daily-claim',id:'hunt'},now));assert(!rewardAction(s,{action:'daily-claim',id:'hunt'},now));
 const next=now+1000;assert.notEqual(vietnamDay(now),vietnamDay(next));assert.equal(checkInStatus(s,next).index,1);assert(prepareDaily(s,next));assert.equal(dailyStatus(s,next)[0].value,0);assert(rewardAction(s,{action:'daily-checkin'},next));assert.equal(checkInStatus(s,next+2*86400000).index,0);
 s.combat={};assert(!rewardAction(s,{action:'daily-checkin'},next+86400000));
});
test('dungeon modes gate membership, quest trades once for an expiring buff, lore yields no currency, tokens spend once',()=>{
 const s=fresh();assert(!enterDungeon(s,'unknown'));assert(!enterDungeon(s,'corporation',{corporation:true}));s.level=10;assert(!enterDungeon(s,'corporation'));assert(enterDungeon(s,'corporation',{corporation:true}));assert.equal(s.energy,25);
 const d=s.dungeon;d.questFound=true;const now=Date.now();assert(dungeonEventAction(s,{action:'dungeon-quest'},now));assert.equal(s.scrap,4);assert.equal(s.buffs[0].expiresAt,now+600000);assert(!dungeonEventAction(s,{action:'dungeon-quest'},now));
 const index=d.cells.indexOf('T');d.x=index%d.width+1;d.y=Math.floor(index/d.width);const credits=s.credits;assert(stepDungeon(s,'left'));assert.equal(s.credits,credits);assert(s.loreFound.includes(s.map));assert.equal(s.lastLore.id,'lore-map0');
 s.dungeon=null;s.dungeonTokens=3;assert(rewardAction(s,{action:'token-redeem',id:'ammo'}));assert.equal(s.dungeonTokens,0);assert.equal(s.stacks['energy-cell'],6);assert(!rewardAction(s,{action:'token-redeem',id:'ammo'}));
});

function party(){const users=['alpha','beta','observer','delta','fifth'].map(id=>({id,state:fresh()}));users.forEach(u=>u.state.name=u.id);return {users,messages:[],mail:[],market:[],corporations:[],community:{day:'',donations:{}}};}
function enterShared(db,withPassword=''){
 const [a,b,c]=db.users;assert(expeditionAction(db,a,{action:'expedition-create',text:'Neon team',password:withPassword}));const id=a.state.dungeon.instance;
 assert(expeditionAction(db,b,{action:'expedition-join',id,password:withPassword}));assert(expeditionAction(db,c,{action:'expedition-join',id,password:withPassword}));return {a,b,c,id};
}
function encounter(db,u){u.state.dungeon.x=6;u.state.dungeon.y=15;assert(expeditionAction(db,u,{action:'dungeon-step',id:'left'},{random:roll}));}
test('shared dungeon HP and contribution rewards are authoritative, spectators get no enemy rewards, chests remain personal',()=>{
 const db=party(),{a,b,c}=enterShared(db);encounter(db,a);encounter(db,b);assert(expeditionAction(db,a,{action:'attack'},{random:roll}));assert.equal(b.state.combat.currentHp,a.state.combat.currentHp);assert(expeditionAction(db,b,{action:'attack'},{random:roll}));
 assert.equal(a.state.combat,null);assert.equal(b.state.combat,null);assert.equal(a.state.kills,1);assert.equal(b.state.kills,1);assert.equal(c.state.kills,0);assert.equal(a.state.dungeon.cells[230],'.');assert.equal(c.state.dungeon.cells[230],'.');
 const before=structuredClone(b.state);assert(!expeditionAction(db,b,{action:'attack'},{random:roll}));assert.deepEqual(b.state,before);
 c.state.dungeon.x=7;c.state.dungeon.y=15;assert(expeditionAction(db,c,{action:'dungeon-step',id:'left'},{random:roll}));assert.equal(c.state.dungeon.cells[231],'.');assert.equal(a.state.dungeon.cells[231],'C');assert.equal(expeditionParty(db,a).length,3);
 const resumed=JSON.parse(JSON.stringify(db));assert(syncExpedition(resumed,resumed.users[0])===false);assert.equal(resumed.expeditions[0].foes['1:230'].rewarded.length,2);
});
test('room password, membership, capacity, no rejoining, level eligibility and expiration cannot be bypassed',()=>{
 const db=party(),[a,b,c,d,f]=db.users;assert(expeditionAction(db,a,{action:'expedition-create',text:'Secret team',password:'abcd'}));const id=a.state.dungeon.instance,list=expeditionList(db,b);assert(list[0].protected);assert(!JSON.stringify(list).includes('salt'));assert(!JSON.stringify(list).includes(db.expeditions[0].password));assert(!expeditionAction(db,b,{action:'expedition-join',id,password:'wrong'}));
 for(const u of [b,c,d])assert(expeditionAction(db,u,{action:'expedition-join',id,password:'abcd'}));assert(!expeditionAction(db,f,{action:'expedition-join',id,password:'abcd'}));assert(expeditionAction(db,d,{action:'leave-dungeon'}));assert(!expeditionAction(db,d,{action:'expedition-join',id,password:'abcd'}));
 a.state.level=100;encounter(db,a);assert(expeditionAction(db,a,{action:'attack'},{random:roll}));assert.equal(a.state.kills,0);assert.equal(a.state.xp,0);
 const expired=db.expeditions[0].touchedAt+2*3600000;assert(syncExpedition(db,b,expired));assert.equal(b.state.dungeon,null);assert.equal(expeditionList(db,c,expired).length,0);
 const corp=party();corp.users[0].corporation='c';corp.corporations=[{id:'c',leader:corp.users[0].id}];corp.users[0].state.level=10;assert(expeditionAction(corp,corp.users[0],{action:'expedition-create',text:'Corp only',mode:'corporation'}));assert.equal(expeditionList(corp,corp.users[1]).length,0);assert(!expeditionAction(corp,corp.users[1],{action:'expedition-join',id:corp.expeditions[0].id}));
});
test('account cleanup removes room identity and transfers ownership without altering other characters',()=>{
 const db=party(),{a,b}=enterShared(db);encounter(db,a);assert(expeditionAction(db,a,{action:'attack'},{random:roll}));const before=structuredClone(b.state),next=removeAccountData(db,a.id);assert.deepEqual(next.users.find(u=>u.id===b.id).state,before);assert.equal(next.expeditions[0].owner,b.id);assert(!next.expeditions[0].members.includes(a.id));assert.equal(next.expeditions[0].foes['1:230'].damage[a.id],undefined);
});
