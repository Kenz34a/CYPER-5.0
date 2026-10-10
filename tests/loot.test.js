import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startFight,turn} from '../src/game.js';
import {gear} from '../src/content.js';
import {enterDungeon,stepDungeon} from '../src/dungeon.js';
import {queueLoot,lootAction} from '../src/loot.js';
import {inboxLifetime,ownsGear} from '../src/inventory-state.js';

test('chest drops wait for collection and cannot be collected again on revisiting the tile',()=>{
 const s=fresh();enterDungeon(s);stepDungeon(s,'left',()=>.9);
 assert.equal(s.pendingLoot.source,'Rương tiếp tế');assert.equal(s.stacks,undefined);
 assert.equal(s.credits,205);assert.equal(s.scrap,8);
 const id=s.pendingLoot.id;assert(lootAction(s,{action:'loot-take',id}));
 assert.equal(s.stacks['ammo-material'],3);assert.equal(s.stacks['bp-special-0'],1);
 assert(!lootAction(s,{action:'loot-take',id}));stepDungeon(s,'right');stepDungeon(s,'left');assert.equal(s.pendingLoot,null);
});
test('PvE drops can be inspected and discarded without deleting owned gear or undoing XP',()=>{
 const s=fresh();startFight(s);s.combat.currentHp=1;turn(s,'attack',()=>.1);
 assert(s.pendingLoot.items.some(v=>v.kind==='gear'));const dropped=s.pendingLoot.items.find(v=>v.kind==='gear').id;
 assert(!s.inventory.includes(dropped));assert(ownsGear(s,dropped));
 const inventory=[...s.inventory],xp=s.xp,credits=s.credits;
 assert(lootAction(s,{action:'loot-discard',id:s.pendingLoot.id}));
 assert.deepEqual(s.inventory,inventory);assert.equal(s.xp,xp);assert.equal(s.credits,credits);assert(!ownsGear(s,dropped));
});
test('full bags send collected drops to the inbox with expiry and repeat requests grant nothing',()=>{
 const s=fresh();s.inventory=gear.slice(0,60).map(v=>v.id);s.stacks={};
 queueLoot(s,[{kind:'gear',id:'gear100',count:1},{kind:'stack',id:'ammo-material',count:3}]);
 const id=s.pendingLoot.id,now=1000;assert(lootAction(s,{action:'loot-take',id},{now}));
 assert.equal(s.inventory.length,60);assert.deepEqual(s.itemInbox,['gear100']);assert.equal(s.stackInbox['ammo-material'],3);
 assert.equal(s.inboxGearExpiry.gear100,now+inboxLifetime);assert.equal(s.inboxBatches[0].expiresAt,now+inboxLifetime);
 const before=structuredClone(s);assert(!lootAction(s,{action:'loot-take',id}));assert.deepEqual(s,before);
});
test('merged drops reject stale batch IDs, unknown items and collection during combat or work',()=>{
 const s=fresh();assert(!queueLoot(s,[{kind:'stack',id:'not-a-real-item',count:10},{kind:'stack',id:'balm',count:-1}]));
 queueLoot(s,[{kind:'stack',id:'balm',count:3},{kind:'gear',id:'gear3',count:1}]);const old=s.pendingLoot.id;
 queueLoot(s,[{kind:'stack',id:'balm',count:2},{kind:'gear',id:'gear3',count:1}]);
 assert.equal(s.pendingLoot.items.length,2);assert.equal(s.pendingLoot.items[0].count,5);
 assert(!lootAction(s,{action:'loot-take',id:old}));const id=s.pendingLoot.id;
 for(const field of ['combat','work']){s[field]={};const snapshot=structuredClone(s);assert(!lootAction(s,{action:'loot-discard',id}));assert(!lootAction(s,{action:'loot-take',id}));assert.deepEqual(s,snapshot);s[field]=null;}
 assert(lootAction(s,{action:'loot-take',id}));assert.equal(s.stacks.balm,8);assert.equal(s.inventory.filter(v=>v==='gear3').length,1);
});
