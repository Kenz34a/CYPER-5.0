import test from 'node:test';
import assert from 'node:assert/strict';
import {content,gear,maps,quests,npcs,enemies,bosses} from '../src/content.js';
import {fresh,stats,gain,move,startFight,pvp,turn,buy,equip,sell,accept,claim,questProgress,rest} from '../src/game.js';
test('original 500 IDs preserved, 80 expansion records unique with valid relationships',()=>{
 const records=Object.values(content).flat();assert.equal(records.length,580);assert.equal(new Set(records.map(r=>r.id)).size,580);
 for(const [list,prefix,count] of [[maps,'map',40],[gear,'gear',200],[npcs,'npc',80],[enemies,'enemy',40],[bosses,'boss',40],[quests,'quest',100]])for(let i=0;i<count;i++)assert.equal(list[i].id,prefix+i);
 for(const q of quests){assert(maps.some(m=>m.id===q.map));assert(npcs.some(n=>n.id===q.npc));assert(q.count>0);}
 for(const m of maps){assert(enemies.some(e=>e.map===m.id));assert(bosses.some(e=>e.map===m.id));assert(npcs.some(n=>n.map===m.id));}
});
test('complete early mission, reward once, level up, buy and equip',()=>{
 const s=fresh(),q=quests[0];assert(accept(s,q.id));
 for(let i=0;i<q.count;i++){assert(startFight(s));while(s.combat)assert(turn(s,'attack',()=>0.8));}
 assert.equal(questProgress(s,q),q.count);const credits=s.credits;assert(claim(s,q.id));assert.equal(s.credits,credits+q.credits);assert.equal(s.level,2);assert(!claim(s,q.id));
 const g=gear.find(g=>g.level<=s.level&&!g.black&&!s.inventory.includes(g.id));assert(buy(s,g.id));assert(!buy(s,g.id));assert(equip(s,g.id));assert(!sell(s,g.id));assert(rest(s));assert.equal(s.hp,stats(s).maxHp);
});
test('travel limits, energy and combat restrictions',()=>{
 const s=fresh();assert(!move(s,'map39'));assert(move(s,'map1'));assert.equal(s.energy,29);assert(startFight(s));assert(!move(s,'map0'));assert(!rest(s));assert(!equip(s,'gear0'));assert(turn(s,'escape'));assert(move(s,'map0'));s.energy=0;assert(!startFight(s));assert(!pvp(s));assert(!move(s,'map1'));assert(rest(s));
});
test('quest counts only kills after acceptance and maximum five active',()=>{
 const s=fresh();gain(s,100000);s.progress['map0:enemy']=10;assert(accept(s,'quest0'));assert.equal(questProgress(s,quests[0]),0);assert(!claim(s,'quest0'));for(let i=1;i<5;i++)assert(accept(s,`quest${i}`));assert(!accept(s,'quest5'));
});
test('boss pulse, death recovery and PvP outcome',()=>{
 const s=fresh();assert(startFight(s,'boss'));s.combat.attack=100;s.combat.currentHp=10000;s.hp=1;turn(s,'attack',()=>0.8);assert.equal(s.combat,null);assert.equal(s.hp,50);assert.equal(s.credits,162);
 rest(s);assert(pvp(s));s.combat.currentHp=1;turn(s,'attack',()=>0.8);assert.equal(s.wins,1);assert.equal(s.combat,null);
 assert(startFight(s,'boss'));s.combat.currentHp=10000;s.combat.turn=2;const hp=s.hp,atk=s.combat.attack,def=stats(s).defense;turn(s,'attack',()=>0.8);assert.equal(hp-s.hp,Math.max(1,atk*2-Math.floor(def/2)));
});
test('healing spends credits and a turn; skills require energy',()=>{
 const s=fresh();startFight(s);s.hp=30;const credit=s.credits;turn(s,'heal',()=>0.8);assert.equal(s.credits,credit-25);assert(s.hp>30);assert.equal(s.combat.turn,1);s.energy=2;assert(!turn(s,'skill'));assert.equal(s.combat.turn,1);
});
test('level-50 expansion gear, NPC area, boss combat and final contract form a playable progression',()=>{
 const s=fresh();s.level=50;s.railKeys=['red','summit'];s.credits=12000;rest(s);assert(move(s,'map49'));for(const id of ['gear227','gear228','gear229']){assert(buy(s,id,true));assert(equip(s,id));}rest(s);assert.equal(stats(s).attack,262);assert(accept(s,'quest109'));assert(startFight(s,'boss'));assert.equal(s.combat.id,'boss49');for(let i=0;s.combat&&i<20;i++)assert(turn(s,'attack',()=>0));assert.equal(s.combat,null);assert.equal(s.progress['map49:boss'],1);assert.equal(questProgress(s,quests.find(v=>v.id==='quest109')),1);assert(claim(s,'quest109'));assert(!claim(s,'quest109'));
});
