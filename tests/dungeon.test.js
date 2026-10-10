import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,turn,rest,move,pvp,startFight,accept} from '../src/game.js';
import {enterDungeon,leaveDungeon,stepDungeon} from '../src/dungeon.js';
import {createFloor,index,WIDTH,HEIGHT} from '../src/dungeon-layout.js';
import {lootAction} from '../src/loot.js';

test('all 50 areas and 3 floors have connected paths to every object and sealed borders',()=>{
 for(let map=0;map<50;map++)for(let floor=1;floor<=3;floor++){
  const d=createFloor(`map${map}`,1,floor),queue=[index(d.x,d.y)],seen=new Set(queue);
  for(let p=0;p<queue.length;p++){const i=queue[p],x=i%WIDTH,y=Math.floor(i/WIDTH);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=index(nx,ny);if(nx>=0&&nx<WIDTH&&ny>=0&&ny<HEIGHT&&d.cells[n]!=='#'&&!seen.has(n)){seen.add(n);queue.push(n);}}}
  d.cells.forEach((cell,i)=>{if(cell!=='#')assert(seen.has(i));const x=i%WIDTH,y=Math.floor(i/WIDTH);if(x===0||y===0||x===WIDTH-1||y===HEIGHT-1)assert.equal(cell,'#');});assert.equal(d.cells.filter(c=>c==='B').length,1);assert.equal(d.cells.filter(c=>c==='C').length,3);assert.deepEqual(d,createFloor(`map${map}`,1,floor));
 }
});
test('entry, one-step movement, chest rewards once, and blocked shortcuts',()=>{
 const s=fresh();assert(enterDungeon(s));assert.equal(s.energy,27);assert(!enterDungeon(s));assert(!rest(s));assert(!move(s,'map1'));assert(!pvp(s));assert(!startFight(s));assert(!stepDungeon(s,'down'));assert(!stepDungeon(s,'teleport'));assert.equal(s.dungeon.steps,0);
 assert(stepDungeon(s,'left',()=>0.8));assert.equal(s.credits,205);assert.equal(s.scrap,8);assert.equal(s.dungeon.chests,1);assert(stepDungeon(s,'right'));assert(stepDungeon(s,'left',()=>0.8));assert.equal(s.credits,205);
 s.dungeon.x=12;s.dungeon.y=1;assert(!stepDungeon(s,'right'));assert(s.log[0].includes('bị khóa'));assert(leaveDungeon(s));assert.equal(s.dungeon,null);assert(rest(s));
});
test('encounters resolve through combat, retreat restores position and kills count for missions',()=>{
 const s=fresh();accept(s,'quest0');enterDungeon(s);stepDungeon(s,'left',()=>0.8);assert(stepDungeon(s,'left'));assert(s.combat);assert.equal(s.dungeon.x,5);assert(!stepDungeon(s,'right'));assert(!leaveDungeon(s));turn(s,'escape');assert.equal(s.dungeon.x,6);assert.equal(s.dungeon.cells[index(5,15)],'M');assert(stepDungeon(s,'left'));
 while(s.combat)turn(s,'attack',()=>0.8);assert.equal(s.dungeon.cells[index(5,15)],'.');assert.equal(s.dungeon.defeated,1);assert.equal(s.progress['map0:enemy'],1);
});
test('boss opens exit, floor progression and completion reward cannot repeat',()=>{
 const s=fresh();enterDungeon(s);s.dungeon.x=13;s.dungeon.y=3;assert(stepDungeon(s,'up'));assert(s.combat.boss);s.combat.currentHp=1;turn(s,'attack',()=>0.8);assert(s.dungeon.bossDefeated);assert(lootAction(s,{action:'loot-take',id:s.pendingLoot.id}));assert.equal(s.stacks.balm,6);assert(stepDungeon(s,'up'));assert.equal(s.dungeon.floor,2);
 for(let floor=2;floor<=3;floor++){s.dungeon.bossDefeated=true;s.dungeon.x=13;s.dungeon.y=2;const credits=s.credits;assert(stepDungeon(s,'up'));if(floor===3){assert.equal(s.credits,credits+110);assert.equal(s.dungeon,null);assert.equal(s.dungeonClears,1);assert(lootAction(s,{action:'loot-take',id:s.pendingLoot.id}));assert.equal(s.stacks.nitron,2);assert(!stepDungeon(s,'up'));assert.equal(s.stacks.nitron,2);}}
});
test('defeat closes the expedition; depleted energy blocks encounters without moving',()=>{
 const s=fresh();enterDungeon(s);stepDungeon(s,'left',()=>0.8);s.energy=1;assert(!stepDungeon(s,'left'));assert.equal(s.dungeon.x,6);s.energy=5;stepDungeon(s,'left');s.hp=1;s.combat.attack=100;s.combat.currentHp=10000;turn(s,'attack',()=>0.8);assert.equal(s.dungeon,null);assert.equal(s.combat,null);assert(s.hp>0);assert(s.inventory.includes('gear0'));assert(rest(s));
});
