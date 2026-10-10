import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startFight,turn} from '../src/game.js';
import {resources,printing,printPlan,printItem,calibrationPlan,calibrateItem,exchange,bankTransfer} from '../src/services.js';
import {calibration,installModule} from '../src/equipment.js';

test('printing consumes materials, produces correct slot, gains independent rank and rejects missing resources',()=>{
 const s=fresh(),before=s.inventory.length;const cost=printPlan(s,'weapon').cost;assert(printItem(s,'weapon',()=>0));assert.equal(s.inventory.length,before+1);assert.equal(s.credits,180-cost);assert.equal(s.scrap,4);assert.equal(printing(s).xp,25);assert(printItem(s,'armor',()=>0));assert.equal(printing(s).rank,2);assert.equal(printing(s).xp,0);assert.equal(s.level,1);s.scrap=0;assert(!printItem(s,'implant'));assert(!printItem(s,'invalid'));assert.deepEqual(printing(fresh()),{rank:1,xp:0,total:0});
});
test('calibration preview and deterministic success/failure branches consume fees once',()=>{
 const s=fresh();s.units=3;s.credits=1000;const plan=calibrationPlan(s,'gear0');assert.equal(plan.success,1);assert.equal(plan.destruction,0);assert(calibrateItem(s,'gear0',{},()=>0.5));assert.equal(calibration(s,'gear0').level,1);assert.equal(s.credits,1000-plan.cost);const next=calibrationPlan(s,'gear0');assert(calibrateItem(s,'gear0',{},()=>0.999));assert.equal(calibration(s,'gear0').level,1);assert.equal(s.lastCalibration.result,'failed');assert.equal(s.credits,1000-plan.cost-next.cost);const safer=calibrationPlan(s,'gear0',{boost:true,protect:true});assert.equal(safer.destruction,0);assert.equal(safer.units,3);assert.equal(safer.success,1);assert(calibrateItem(s,'gear0',{boost:true,protect:true},()=>0.999));assert.equal(s.units,0);assert.equal(calibration(s,'gear0').level,2);assert(!calibrateItem(s,'gear0',{protect:true}));
});
test('destruction removes item, modules and equipped references; protection prevents it',()=>{
 const s=fresh();s.credits=1000;assert(installModule(s,'gear0',0,'health'));assert(calibrateItem(s,'gear0',{},()=>0.5));s.hp=115;assert(calibrateItem(s,'gear0',{},()=>0));assert(!s.inventory.includes('gear0'));assert.equal(s.equipped.weapon,null);assert.equal(s.calibration.gear0,undefined);assert.equal(s.hp,100);assert.equal(s.lastCalibration.result,'destroyed');
 const protectedState=fresh();protectedState.credits=1000;protectedState.units=3;calibrateItem(protectedState,'gear0',{},()=>0.5);assert(calibrateItem(protectedState,'gear0',{protect:true},()=>0));assert(protectedState.inventory.includes('gear0'));assert.equal(protectedState.units,1);
});
test('bank preserves totals and premium Unit cannot be exchanged; deposit protects funds from defeat',()=>{
 const s=fresh();assert(bankTransfer(s,'deposit',100));assert.equal(s.credits,80);assert.equal(resources(s).bank,100);assert(!bankTransfer(s,'withdraw',101));assert(!bankTransfer(s,'deposit',-1));assert(!bankTransfer(s,'deposit',0.5));assert.equal(s.units,0);const before=structuredClone(s);for(const direction of ['buy','sell','invalid'])for(const amount of [1,2,Infinity,-1,.5])assert(!exchange(s,direction,amount));assert.deepEqual(s,before);assert(startFight(s));assert(!bankTransfer(s,'withdraw',10));assert(!printItem(s,'weapon'));assert(!calibrateItem(s,'gear1'));s.hp=1;s.combat.attack=100;turn(s,'attack',()=>0.8);assert.equal(resources(s).bank,100);assert(bankTransfer(s,'withdraw',100));assert.equal(resources(s).bank,0);
});
test('PvE drops materials and maxed items cannot consume calibration fees',()=>{
 const s=fresh();startFight(s);s.combat.currentHp=1;turn(s,'attack',()=>0.8);assert.equal(s.scrap,7);s.calibration={gear0:{level:5,modules:[]}};const credits=s.credits;assert(!calibrateItem(s,'gear0'));assert.equal(s.credits,credits);const plan=calibrationPlan(s,'gear0');assert.equal(plan.after.power,plan.before.power);
});
