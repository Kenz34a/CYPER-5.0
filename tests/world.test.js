import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,buy} from '../src/game.js';
import {worldAction,worldView,shopDiscount,initWorld} from '../src/world.js';
import {cityAction} from '../src/city.js';
import {printPlan} from '../src/services.js';
const clock=Date.parse('2026-10-09T01:00:00Z'); // 08:00 Vietnam
function fixture(){const db={users:['seller','buyer','third'].map(id=>({id,state:fresh()}))};initWorld(db);return db;}

test('escrow transfers calibrated gear exactly once, credits both parties, and cancellation restores ownership',()=>{
 const db=fixture(),[a,b,c]=db.users;a.state.credits=1000;b.state.credits=1000;c.state.credits=1000;
 assert(buy(a.state,'gear2'));a.state.calibration={gear2:{level:2,modules:['damage','health']}};
 const before=a.state.credits;
 assert.equal(worldAction(db,a,{action:'market-list',id:'gear0',price:100}),false);
 assert.equal(worldAction(db,a,{action:'market-list',id:'gear2',price:.5}),false);
 assert(worldAction(db,a,{action:'market-list',id:'gear2',price:150}));
 assert(!a.state.inventory.includes('gear2'));assert(!buy(a.state,'gear2'));assert(!printPlan(a.state,'implant').pool.some(g=>g.id==='gear2'));
 const id=db.market[0].id;
 assert.equal(worldAction(db,a,{action:'market-buy',id}),false);
 assert.equal(worldAction(db,c,{action:'market-cancel',id}),false);
 assert(worldAction(db,b,{action:'market-buy',id}));
 assert.equal(a.state.credits,before+150);assert.equal(b.state.credits,850);
 assert.deepEqual(b.state.calibration.gear2,{level:2,modules:['damage','health']});assert(!a.state.escrow.includes('gear2'));
 assert.equal(worldAction(db,c,{action:'market-buy',id}),false);assert.equal(a.state.credits,before+150);
 assert(worldAction(db,b,{action:'market-list',id:'gear2',price:100}));
 const listing=db.market[0].id;b.state.combat={};assert.equal(worldAction(db,b,{action:'market-cancel',id:listing}),false);b.state.combat=null;
 assert(worldAction(db,b,{action:'market-cancel',id:listing}));assert.equal(b.state.credits,850);assert.equal(b.state.calibration.gear2.level,2);assert.equal(db.market.length,0);
});

test('a runner with the same model already in escrow cannot buy a second copy, but can cancel their listing',()=>{
 const db=fixture(),[a,b]=db.users;
 for(const u of [a,b]){u.state.credits=1000;assert(buy(u.state,'gear2'));assert(worldAction(db,u,{action:'market-list',id:'gear2',price:100}));}
 const other=db.market.find(m=>m.seller===a.id),own=db.market.find(m=>m.seller===b.id);
 assert.equal(worldAction(db,b,{action:'market-buy',id:other.id}),false);
 assert(worldAction(db,b,{action:'market-cancel',id:own.id}));assert(b.state.inventory.includes('gear2'));
 assert.equal(db.market.length,1);assert.equal(b.state.credits,936);
});

test('donations have real contributors, timed discounts and daily Vietnam rollover; client cannot set discount',()=>{
 const db=fixture(),u=db.users[0];u.state.credits=20000;
 assert.equal(worldAction(db,u,{action:'donate',id:'global',amount:-1},clock),false);
 assert.equal(worldAction(db,u,{action:'donate',id:'global',amount:10001},clock),false);
 assert(worldAction(db,u,{action:'donate',id:'global',amount:10000},clock));
 assert(worldAction(db,u,{action:'donate',id:'morning',amount:3000},clock));
 assert(worldAction(db,u,{action:'donate',id:'evening',amount:3000},clock));
 assert.equal(shopDiscount(db,clock),.07);assert.equal(shopDiscount(db,Date.parse('2026-10-09T12:00:00Z')),.1);
 const initial=u.state.credits;assert(buy(u.state,'gear2',false,shopDiscount(db,clock)));assert.equal(u.state.credits,initial-Math.ceil(64*.93));
 u.state.progress={'map0:enemy':3,'map0:boss':2,'start:quest0':100};u.state.kills=20;
 const view=worldView(db,u,clock);assert.equal(view.kills,5);assert.equal(view.funds[0].contributors[0].value,10000);
 assert.equal(shopDiscount(db,Date.parse('2026-10-09T17:00:00Z')),0);
 assert.equal(worldView(db,u,Date.parse('2026-10-09T17:00:00Z')).funds[0].total,0);
 assert(worldAction(db,u,{action:'donate',id:'morning',amount:1},Date.parse('2026-10-09T17:00:00Z')));assert.equal(db.community.day,'2026-10-10');
});

test('corporation membership gates headquarters and leadership transfers or removes an empty group',()=>{
 const db=fixture(),[a,b,c]=db.users;a.state.credits=1000;
 assert(worldAction(db,a,{action:'corp-create',text:'Neon Crew'}));const id=a.corporation;
 assert.equal(a.state.credits,500);assert.equal(worldAction(db,a,{action:'corp-create',text:'Another'}),false);
 assert(worldAction(db,b,{action:'corp-join',id}));assert.equal(worldAction(db,b,{action:'corp-join',id}),false);
 assert.equal(worldView(db,c).corporation,null);assert.equal(worldView(db,b).corporation,id);
 assert(worldAction(db,a,{action:'corp-leave'}));assert.equal(db.corporations[0].leader,b.id);
 assert(worldAction(db,b,{action:'corp-leave'}));assert.equal(db.corporations.length,0);
});

test('chat validates length and throttles per account, stores literal text and limits history',()=>{
 const db=fixture(),u=db.users[0];
 assert.equal(worldAction(db,u,{action:'chat',text:'   '},clock),false);
 assert.equal(worldAction(db,u,{action:'chat',text:'x'.repeat(301)},clock),false);
 assert(worldAction(db,u,{action:'chat',text:'<script>alert(1)</script>'},clock));
 assert.equal(worldAction(db,u,{action:'chat',text:'again'},clock+1000),false);
 for(let i=1;i<=100;i++)assert(worldAction(db,u,{action:'chat',text:String(i)},clock+i*2000));
 assert.equal(db.messages.length,100);assert.equal(db.messages[0].text,'1');
 assert(!JSON.stringify(worldView(db,u)).includes('password'));
});

test('housing level gate, storage ownership and cosmetics prevent duplicate purchases',()=>{
 const s=fresh();s.credits=5000;
 assert.equal(cityAction(s,{action:'housing-rent'}),false);s.level=100;
 assert(cityAction(s,{action:'housing-rent'}));assert.equal(cityAction(s,{action:'housing-rent'}),false);
 assert.equal(cityAction(s,{action:'housing-deposit',id:'gear0'}),false);
 assert(buy(s,'gear2'));s.calibration={gear2:{level:3,modules:['health']}};
 assert(cityAction(s,{action:'housing-deposit',id:'gear2'}));assert(!buy(s,'gear2'));assert(!printPlan(s,'implant').pool.some(g=>g.id==='gear2'));
 assert(cityAction(s,{action:'housing-withdraw',id:'gear2'}));assert.equal(s.calibration.gear2.level,3);
 assert.equal(cityAction(s,{action:'housing-withdraw',id:'gear2'}),false);
 const before=s.credits;assert(cityAction(s,{action:'cosmetic',id:'pink'}));assert(cityAction(s,{action:'cosmetic',id:'pink'}));assert.equal(s.credits,before-150);
 s.hp=1;assert(cityAction(s,{action:'housing-rest'}));assert.equal(s.hp,1090);
 s.dungeon={};assert.equal(cityAction(s,{action:'housing-deposit',id:'gear2'}),false);assert.equal(cityAction(s,{action:'medical'}),false);
});
