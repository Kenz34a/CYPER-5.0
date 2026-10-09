import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,move,startFight,rest,pvp} from '../src/game.js';
import {workAction,workPlan,workRemaining} from '../src/work.js';
import {printing,printItem} from '../src/services.js';
import {craftSkill,executeCraft} from '../src/crafting.js';
import {enterDungeon} from '../src/dungeon.js';
import {workAllows} from '../src/work-rules.js';

test('work consumes displayed resources, enforces one activity and blocks combat/travel/crafting',()=>{
 const s=fresh(),now=10000;assert.equal(workPlan(s,'forged'),null);s.scrap=0;assert(!workAction(s,{action:'work-start',id:'recycle'},now));assert(workAction(s,{action:'work-start',id:'printing'},now));assert.equal(s.energy,28);assert.equal(s.credits,180);assert.equal(s.scrap,0);const before=structuredClone(s);
 assert(!workAction(s,{action:'work-start',id:'medical'},now));assert(!move(s,'map1'));assert(!startFight(s));assert(!pvp(s));assert(!rest(s));assert(!enterDungeon(s));assert(!printItem(s,'weapon'));assert(!executeCraft(s,'balm'));assert.deepEqual(s,before);
 for(const action of ['medical','core-recharge','item-use','claim','calibrate','housing-rest','key-assemble'])assert(!workAllows(s,action));assert(workAllows(s,'bank'));assert(workAllows(s,'chat'));
 assert.equal(workRemaining(s,now+59000),1);assert(!workAction(s,{action:'work-claim',now:now+60000,reward:999},now+59999));assert(workAction(s,{action:'work-claim'},now+60000));assert.equal(printing(s).xp,25);assert.equal(printing(s).total,0);assert.equal(s.activity.workCompleted,1);assert(!workAction(s,{action:'work-claim'},now+60001));assert(rest(s));
});
test('training advances skills without fabricated printing/crafting totals; saved rewards survive reload',()=>{
 let s=fresh();s.craftingSkills={ammo:{rank:9,xp:350,total:4}};assert(workAction(s,{action:'work-start',id:'ammo'},100));s=JSON.parse(JSON.stringify(s));assert(workAction(s,{action:'work-claim'},60100));assert.equal(craftSkill(s,'ammo').rank,10);assert.equal(craftSkill(s,'ammo').xp,20);assert.equal(craftSkill(s,'ammo').total,4);
 rest(s);assert(workAction(s,{action:'work-start',id:'medical'},70000));assert(workAction(s,{action:'work-claim'},130000));assert.equal(craftSkill(s,'medical').xp,30);assert.equal(craftSkill(s,'medical').total,0);
 rest(s);const scrap=s.scrap;assert(workAction(s,{action:'work-start',id:'recycle'},140000));assert.equal(s.scrap,scrap-1);assert(workAction(s,{action:'work-claim'},170000));assert.equal(printing(s).rank,2);assert.equal(printing(s).total,0);
 rest(s);assert(workAction(s,{action:'work-start',id:'mine'},200000));s.level=50;assert(workAction(s,{action:'work-claim'},320000));assert.equal(s.credits,212);
});
test('cancel keeps upfront costs, gives no reward and capped printing rank handles expansion',()=>{
 const s=fresh();s.printing={rank:49,xp:2440,total:7};assert(workAction(s,{action:'work-start',id:'recycle'},0));assert(workAction(s,{action:'work-cancel'},10000));assert.equal(s.energy,28);assert.equal(s.scrap,5);assert.equal(printing(s).xp,2440);assert(!workAction(s,{action:'work-claim'},999999));assert(!workAction(s,{action:'work-cancel'},999999));
 rest(s);assert(workAction(s,{action:'work-start',id:'recycle'},0));assert(workAction(s,{action:'work-claim'},30000));assert.equal(printing(s).rank,50);assert.equal(printing(s).xp,40);assert.equal(printing(s).total,7);
});
