import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,stats,equip,startFight,turn,sell} from '../src/game.js';
import {upgrade,installModule,calibration,slots,upgradeCost,itemStats} from '../src/equipment.js';

test('calibration costs credits, affects equipped attack and opens sockets at +2/+4',()=>{
 const s=fresh();s.credits=10000;const attack=stats(s).attack,cost=upgradeCost(s,'gear0'),credits=s.credits;
 assert(upgrade(s,'gear0'));assert.equal(s.credits,credits-cost);assert.equal(stats(s).attack,attack+2);assert.equal(slots(s,'gear0'),1);
 assert(upgrade(s,'gear0'));assert.equal(slots(s,'gear0'),2);assert(upgrade(s,'gear0'));assert(upgrade(s,'gear0'));assert.equal(slots(s,'gear0'),3);assert(upgrade(s,'gear0'));assert.equal(calibration(s,'gear0').level,5);assert(!upgrade(s,'gear0'));assert.equal(itemStats(s,'gear0').quality,80);
});
test('modules enforce ownership, socket availability and funds; health/armor/crit affect combat',()=>{
 const s=fresh();s.credits=1000;const base=stats(s);
 assert(!installModule(s,'gear0',1,'health'));assert(!installModule(s,'gear199',0,'health'));assert(!installModule(s,'gear0',0,'invalid'));assert(!installModule(s,'gear0',NaN,'health'));
 assert(installModule(s,'gear0',0,'health'));assert.equal(stats(s).maxHp,base.maxHp+15);s.hp=115;assert(!installModule(s,'gear0',0,'health'));assert(installModule(s,'gear0',0,'damage'));assert.equal(stats(s).maxHp,base.maxHp);assert.equal(s.hp,100);assert.equal(stats(s).attack,base.attack+3);
 assert(installModule(s,'gear1',0,'armor'));assert.equal(stats(s).defense,base.defense+3);
 assert(installModule(s,'gear0',0,'crit'));assert(Math.abs(stats(s).crit-0.17)<1e-10);assert(startFight(s));s.combat.currentHp=10000;turn(s,'attack',()=>0.16);assert(s.log.some(l=>l.includes('chí mạng')));assert(!upgrade(s,'gear0'));assert(!installModule(s,'gear0',0,'health'));turn(s,'escape');s.credits=0;assert(!upgrade(s,'gear0'));assert(!installModule(s,'gear0',0,'damage'));
});
test('old saves work, only equipped items affect stats, sell removes calibration',()=>{
 const s=fresh();assert.equal(s.calibration,undefined);s.inventory.push('gear3');s.credits=1000;assert(upgrade(s,'gear3'));assert.equal(stats(s).attack,13);assert(installModule(s,'gear3',0,'health'));assert.equal(stats(s).maxHp,100);assert(equip(s,'gear3'));assert.equal(stats(s).maxHp,115);s.hp=115;assert(equip(s,'gear0'));assert.equal(s.hp,100);assert(sell(s,'gear3'));assert.equal(s.calibration.gear3,undefined);
});
