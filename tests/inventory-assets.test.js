import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,buy,startFight,turn,stats} from '../src/game.js';
import {gear} from '../src/content.js';
import {printItem} from '../src/services.js';
import {inventoryAction} from '../src/inventory.js';
import {bagSize,receiveGear,stacks,blueprintDrop} from '../src/inventory-state.js';
import {assetAction,publicAssets} from '../src/assets.js';
import {initWorld,worldAction,worldView} from '../src/world.js';

test('starter supplies migrate once; replenishment, crafting and welcome parcel consume/award real resources',()=>{
 const s=fresh();assert.equal(stacks(s).balm,3);assert(inventoryAction(s,{action:'inbox-claim',id:'welcome'}));assert.equal(stacks(s).balm,5);assert.equal(s.credits,230);
 assert.equal(inventoryAction(s,{action:'inbox-claim',id:'welcome'}),false);assert(inventoryAction(s,{action:'supply-buy',id:'balm',amount:999}));assert.equal(stacks(s).balm,6);assert.equal(s.credits,210);
 const scrap=s.scrap;assert(inventoryAction(s,{action:'craft',id:'balm'}));assert.equal(s.scrap,scrap-1);assert.equal(s.credits,200);assert.equal(stacks(s).balm,7);
 const before=structuredClone(s);assert.equal(inventoryAction(s,{action:'craft',id:'nano'}),false);assert.deepEqual(s,before);
 blueprintDrop(s,'weapon',0);assert(inventoryAction(s,{action:'craft',id:'bp-weapon-0'}));assert.equal(s.inventory.at(-1),'gear3');assert.equal(stacks(s)['bp-weapon-0'],0);
 assert.equal(inventoryAction(s,{action:'craft',id:'bp-weapon-0'}),false);
});

test('quick consumables heal with caps, cost one combat turn, cannot be fabricated or consumed at full vitality',()=>{
 const s=fresh();assert.equal(inventoryAction(s,{action:'item-use',id:'balm'}),false);assert.equal(s.stacks,undefined);
 assert(startFight(s));s.hp=50;const enemy=s.combat.currentHp,damage=Math.max(1,s.combat.attack-Math.floor(stats(s).defense/2));assert(inventoryAction(s,{action:'item-use',id:'balm'}));
 assert.equal(s.hp,90-damage);assert.equal(s.combat.currentHp,enemy);assert.equal(s.combat.turn,1);assert.equal(s.stacks.balm,2);assert.equal(s.credits,180);
 assert.equal(inventoryAction(s,{action:'item-use',id:'nano',hp:99999}),false);assert.equal(s.combat.turn,1);
 assert.equal(inventoryAction(s,{action:'quick-set',id:'gear0',slot:0}),false);assert.equal(inventoryAction(s,{action:'quick-set',id:'balm',slot:3}),false);
 assert(inventoryAction(s,{action:'quick-set',id:'stim',slot:0}));assert.equal(s.quickSlots[0],'stim');
 s.hp=1;s.combat.attack=999;assert(inventoryAction(s,{action:'item-use',id:'balm'}));assert.equal(s.combat,null);assert.equal(s.stacks.balm,1);assert.equal(s.hp,50);
});

test('full bags reject paid acquisitions before spending, overflow loot stays unique and can be claimed later',()=>{
 const s=fresh();s.level=100;s.credits=10000;s.inventory=gear.slice(0,58).map(g=>g.id);assert.equal(bagSize(s),60);
 const credits=s.credits,scrap=s.scrap;assert.equal(buy(s,'gear60',false),false);assert.equal(printItem(s,'weapon'),false);assert.equal(s.credits,credits);assert.equal(s.scrap,scrap);
 assert(receiveGear(s,'gear60'));assert.deepEqual(s.itemInbox,['gear60']);assert.equal(receiveGear(s,'gear60'),false);assert.equal(buy(s,'gear60',false),false);
 blueprintDrop(s,'implant',0);assert.equal(s.stackInbox['bp-implant-0'],1);assert.equal(inventoryAction(s,{action:'inbox-claim',id:'gear60'}),false);
 s.inventory.pop();assert(inventoryAction(s,{action:'inbox-claim',id:'gear60'}));assert.equal(s.itemInbox.length,0);assert.equal(inventoryAction(s,{action:'inbox-claim',id:'gear60'}),false);
 s.inventory.pop();assert(inventoryAction(s,{action:'inbox-claim',id:'bp-implant-0'}));assert.equal(stacks(s)['bp-implant-0'],1);assert.equal(inventoryAction(s,{action:'inbox-claim',id:'bp-implant-0'}),false);
 // A sole blueprint frees its own slot before a craft creates gear.
 s.credits=10000;s.inventory[s.inventory.indexOf('gear2')]='gear99';assert(inventoryAction(s,{action:'craft',id:'bp-implant-0'}));assert.equal(bagSize(s),60);
});

test('loadout application and bulk sale validate all selected gear before mutating any state',()=>{
 const s=fresh();s.inventory.push('gear3','gear4');assert(inventoryAction(s,{action:'loadout-save',id:'0'}));s.equipped.weapon='gear3';assert(inventoryAction(s,{action:'loadout-apply',id:'0'}));assert.equal(s.equipped.weapon,'gear0');
 const before=structuredClone(s);assert.equal(inventoryAction(s,{action:'bulk-sell',ids:['gear3','gear0']}),false);assert.deepEqual(s,before);assert.equal(inventoryAction(s,{action:'bulk-sell',ids:['gear3','gear3']}),false);
 s.calibration={gear3:{level:2,modules:['health']}};assert(inventoryAction(s,{action:'bulk-sell',ids:['gear3','gear4']}));assert(!s.inventory.includes('gear3'));assert.equal(s.calibration.gear3,undefined);
 s.inventory=s.inventory.filter(id=>id!=='gear0');const equipped={...s.equipped};assert.equal(inventoryAction(s,{action:'loadout-apply',id:'0'}),false);assert.deepEqual(s.equipped,equipped);
});

test('showcases enforce level, price and ownership; pets are decorative and public assets obey privacy',()=>{
 const s=fresh();s.credits=10000000;assert.equal(assetAction(s,{action:'shelf-unlock',id:'0'}),false);s.level=100;assert(assetAction(s,{action:'shelf-unlock',id:'0'}));assert.equal(s.credits,9000000);assert.equal(assetAction(s,{action:'shelf-unlock',id:'0'}),false);
 assert.equal(assetAction(s,{action:'shelf-set',slot:1,id:'gear0'}),false);assert.equal(assetAction(s,{action:'shelf-set',slot:0,id:'gear99'}),false);assert(assetAction(s,{action:'shelf-set',slot:0,id:'gear0'}));
 const st=stats(s);assert(assetAction(s,{action:'pet-buy',id:'orb'}));assert.deepEqual(stats(s),st);assert.equal(assetAction(s,{action:'pet-buy',id:'orb'}),false);
 assert.equal(assetAction(s,{action:'pet-select',id:'cat'}),false);assert.equal(assetAction(s,{action:'chat-skin',id:'gold'}),false);s.cosmetics=['gold'];assert(assetAction(s,{action:'chat-skin',id:'gold'}));
 let pub=publicAssets(s);assert.equal(pub.showcases[0].id,'gear0');assert.equal(pub.pets[0].id,'orb');assert.equal(pub.badges,null);assert.equal(pub.chatSkin,null);assert.equal(pub.credits,undefined);assert.equal(pub.inventory,undefined);
 for(const id of ['showcases','pets'])assert(assetAction(s,{action:'privacy',id,visible:false}));assert(assetAction(s,{action:'privacy',id:'badges',visible:true}));assert(assetAction(s,{action:'privacy',id:'chatSkin',visible:true}));
 pub=publicAssets(s);assert.equal(pub.showcases,null);assert.equal(pub.pets,null);assert.equal(pub.badges[0].id,'veteran');assert.equal(pub.chatSkin,'gold');
 assert.equal(assetAction(s,{action:'privacy',id:'credits',visible:true}),false);assert.equal(assetAction(s,{action:'privacy',id:'badges',visible:'false'}),false);
});

test('market cancellation at capacity preserves calibration in inbox; chat skin privacy applies to existing messages',()=>{
 const s=fresh();s.inventory.push('gear3');s.calibration={gear3:{level:2,modules:['health']}};const u={id:'a',state:s},db={users:[u]};initWorld(db);
 assert(worldAction(db,u,{action:'market-list',id:'gear3',price:50}));s.inventory=gear.filter(g=>g.id!=='gear3').slice(0,58).map(g=>g.id);assert.equal(bagSize(s),60);
 assert(worldAction(db,u,{action:'market-cancel',id:db.market[0].id}));assert.deepEqual(s.itemInbox,['gear3']);assert.deepEqual(s.calibration.gear3,{level:2,modules:['health']});assert.equal(db.market.length,0);
 s.cosmetics=['pink'];s.chatSkin='pink';assert(worldAction(db,u,{action:'chat',text:'hello'}));assert.equal(worldView(db).messages[0].chatSkin,null);
 assert(assetAction(s,{action:'privacy',id:'chatSkin',visible:true}));assert.equal(worldView(db).messages[0].chatSkin,'pink');assert(assetAction(s,{action:'privacy',id:'chatSkin',visible:false}));assert.equal(worldView(db).messages[0].chatSkin,null);
});
