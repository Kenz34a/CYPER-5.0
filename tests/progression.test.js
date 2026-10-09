import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startFight,turn,move} from '../src/game.js';
import {printItem} from '../src/services.js';
import {progressionAction} from '../src/progression.js';
import {milestoneStatus,earnedBadges,skillValues} from '../src/achievements.js';

test('printing milestone counts actual prints and awards once; earned badges/title cannot be forged or duplicated',()=>{
 const s=fresh();s.credits=1000;
 assert.equal(progressionAction(s,{action:'milestone-claim',id:'printing'}),false);
 assert(printItem(s,'implant',()=>0));assert.equal(milestoneStatus(s,'printing').value,1);
 assert(printItem(s,'weapon',()=>0));assert.equal(milestoneStatus(s,'printing').value,2);
 const before=s.credits;assert(progressionAction(s,{action:'milestone-claim',id:'printing'}));assert.equal(s.credits,before+100);
 assert.equal(progressionAction(s,{action:'milestone-claim',id:'printing'}),false);
 assert.equal(progressionAction(s,{action:'pin-badge',id:'veteran',slot:0}),false);
 assert.equal(progressionAction(s,{action:'pin-badge',id:'printer',slot:6}),false);
 assert(progressionAction(s,{action:'pin-badge',id:'printer',slot:0}));assert.equal(progressionAction(s,{action:'pin-badge',id:'printer',slot:1}),false);
 assert(progressionAction(s,{action:'title',id:'printer'}));assert.equal(progressionAction(s,{action:'title',id:'hunter'}),false);
 assert(progressionAction(s,{action:'pin-badge',id:'',slot:0}));assert.equal(s.pinnedBadges[0],null);
 assert.equal(earnedBadges(s).length,1);assert.equal(skillValues(s)[0].value,10);
});

test('progression key requires the area-20 boss and level 20; combat/dungeon cannot claim or scavenge',()=>{
 const s=fresh();s.level=20;s.map='map19';s.hp=10000;s.energy=30;
 assert.equal(progressionAction(s,{action:'milestone-claim',id:'progression20'}),false);
 assert(startFight(s,'boss'));s.combat.currentHp=1;assert(turn(s,'attack',()=>1));assert.equal(milestoneStatus(s,'progression20').value,1);
 s.level=19;assert.equal(progressionAction(s,{action:'milestone-claim',id:'progression20'}),false);s.level=20;s.dungeon={};
 assert.equal(progressionAction(s,{action:'milestone-claim',id:'progression20'}),false);assert.equal(progressionAction(s,{action:'scavenge'}),false);s.dungeon=null;
 assert(progressionAction(s,{action:'milestone-claim',id:'progression20'}));assert.equal(progressionAction(s,{action:'milestone-claim',id:'progression20'}),false);
});

test('salvage is once per map, crafting/recharge consume real resources and PvE alone drops cores',()=>{
 const s=fresh();assert(progressionAction(s,{action:'scavenge'}));assert.equal(s.energy,28);assert.equal(progressionAction(s,{action:'scavenge'}),false);
 assert(move(s,'map1'));assert(progressionAction(s,{action:'scavenge'}));assert.equal(s.hashProcessors,2);
 const scrap=s.scrap;assert(progressionAction(s,{action:'core-craft'}));assert.equal(s.hashProcessors,0);assert.equal(s.scrap,scrap-3);assert.equal(s.aiCores,1);
 assert.equal(progressionAction(s,{action:'core-craft'}),false);s.energy=0;s.hp=50;assert(progressionAction(s,{action:'core-recharge'}));assert.equal(s.energy,20);assert.equal(s.hp,80);assert.equal(s.aiCores,0);
 s.map='map0';for(let i=0;i<3;i++){assert(startFight(s));s.combat.currentHp=1;assert(turn(s,'attack',()=>1));}assert.equal(s.aiCores,1);
 s.combat={id:'arena',currentHp:1,hp:1,attack:1,defense:0,credits:1,xp:1,name:'Opponent',pvp:true};assert(turn(s,'attack',()=>1));assert.equal(s.aiCores,1);
 assert(progressionAction(s,{action:'notifications-read'}));assert(s.notifications.every(n=>n.read));
});
