import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fresh,stats} from '../src/game.js';
import {gear} from '../src/content.js';
import {careerRows,profileStatRows,playerProfileData} from '../src/profile-data.js';
import {socialAction,publicPlayerProfile,socialView,settleSocial,cleanupSocial} from '../src/social.js';
import {initWorld,worldAction,worldView} from '../src/world.js';
import {adminAction,adminView} from '../src/admin.js';
import {assetAction} from '../src/assets.js';
import {workAction} from '../src/work.js';
import {careerProgressView} from '../src/profile-details-view.js';
const now=1700000000000;
function fixture(){const db={users:['a','b','c'].map(id=>({id,state:{...fresh(),name:id}}))};initWorld(db);db.users[0].state.inventory.push('gear3');db.users[1].state.inventory.push('gear4');return db;}
const gift=(target,item='field:credits',amount=10)=>({action:'social-gift',target,item,amount,requestId:randomUUID(),issuedAt:now});
test('profile reads five real careers and combat stats; public privacy never exposes currency or inventory',()=>{
 const db=fixture(),[a,b]=db.users,s=a.state;s.craftingSkills={ammo:{rank:50,xp:100,total:8}};
 const rows=careerRows(s);assert.equal(rows.length,5);assert.equal(rows.find(v=>v.id==='ammo').rank,50);
 assert.equal(profileStatRows(s).find(v=>v.name==='Máu tối đa').value,stats(s).maxHp.toLocaleString('vi'));
 assert.equal(profileStatRows(s).find(v=>v.name==='Sát thương chí mạng').value,'150%');
 assert(workAction(s,{action:'work-start',id:'mine'},now));assert(workAction(s,{action:'work-claim'},now+120000));assert.equal(careerRows(s).find(v=>v.id==='mining').xp,20);assert.equal(s.craftingSkills.mining.total,0);
 const pub=publicPlayerProfile(db,a,b,now);for(const key of ['credits','units','inventory','stacks','password','calibration'])assert.equal(pub[key],undefined);
 for(const id of ['skills','stats','equipment'])assert(assetAction(s,{action:'privacy',id,visible:false}));const hidden=playerProfileData(s);assert.equal(hidden.skills,null);assert.equal(hidden.statistics,null);assert.equal(hidden.equipment,null);
 assert.equal(publicPlayerProfile(db,a,null,now).relation,null);assert.equal(socialView(db,null,now),null);
 assert(careerProgressView({skills:rows,level:{rank:1,xp:0,target:60,percent:0},esc:String}).includes('viewBox="0 0 360 350"'));
});
test('gifts validate ownership, opt-out, blocks and Unit; retries charge once and altered receipts fail',()=>{
 const db=fixture(),[a,b]=db.users;
 for(const p of [gift('b','field:units'),gift('b','field:credits',-1),gift('b','field:credits',1.5),gift('a'),gift('b','field:credits:extra'),gift('b','gear:gear0'),gift('b','stack:not-real')]){const before=structuredClone(db);assert(!socialAction(db,a,p,now));assert.deepEqual(db,before);}
 const p=gift('b');assert(socialAction(db,a,p,now));assert(socialAction(db,a,p,now));assert.equal(a.state.credits,170);assert.equal(b.state.credits,190);
 assert(!socialAction(db,a,{...p,amount:20},now));assert(!socialAction(db,a,p,now+300001));
 b.state.settings={rejectGifts:true};assert(!socialAction(db,a,gift('b'),now));b.state.settings.rejectGifts=false;
 b.social={blocked:['a'],friends:[]};assert(!socialAction(db,a,gift('b'),now));assert(!worldAction(db,a,{action:'mail-send',id:'b',text:'blocked'},now));assert(!worldAction(db,a,{action:'rep-give',id:'b'},now));
});
test('calibrated gear and stack overflow go to recipient inbox without duplicate ownership or loss',()=>{
 const db=fixture(),[a,b]=db.users;b.state.inventory=gear.slice(4,62).map(v=>v.id);a.state.calibration={gear3:{level:4,modules:['health','crit']}};
 assert(socialAction(db,a,gift('b','gear:gear3',1),now));assert(b.state.itemInbox.includes('gear3'));assert.deepEqual(b.state.calibration.gear3,{level:4,modules:['health','crit']});assert(!a.state.inventory.includes('gear3'));assert.equal(a.state.calibration.gear3,undefined);
 a.state.stacks={nano:3};assert(socialAction(db,a,gift('b','stack:nano',2),now));assert.equal(a.state.stacks.nano,1);assert.equal(b.state.stackInbox.nano,2);
 a.state.inventory.push('gear3');assert(!socialAction(db,a,gift('b','gear:gear3',1),now));
});
test('cosmetic gifts use canonical credits prices and cannot duplicate or transfer Unit',()=>{
 const db=fixture(),[a,b]=db.users;const p={...gift('b','cyan',100),action:'social-cosmetic'};
 assert(!socialAction(db,a,{...p,amount:1},now));assert(socialAction(db,a,p,now));assert(socialAction(db,a,p,now));assert.equal(a.state.credits,80);assert.deepEqual(b.state.cosmetics,['cyan']);assert.equal(a.state.units,0);assert(!socialAction(db,a,{...p,requestId:randomUUID()},now));
});
test('friendship requires recipient consent and partnership is mutual and exclusive',()=>{
 const db=fixture(),[a,b,c]=db.users;
 assert(socialAction(db,a,{action:'social-request',target:'b',kind:'friend'},now));const q=db.socialRequests[0];assert.equal(a.social.friends.length,0);
 assert(!socialAction(db,c,{action:'social-accept',id:q.id},now));assert(!socialAction(db,a,{action:'social-accept',id:q.id},now));assert.equal(socialView(db,c,now).requests.length,0);
 assert(socialAction(db,b,{action:'social-accept',id:q.id},now));assert.deepEqual(a.social.friends,['b']);assert.deepEqual(b.social.friends,['a']);
 assert(socialAction(db,a,{action:'social-request',target:'b',kind:'partner'},now));assert(socialAction(db,c,{action:'social-request',target:'b',kind:'partner'},now));const first=db.socialRequests.find(v=>v.from==='a');assert(socialAction(db,b,{action:'social-accept',id:first.id},now));assert.equal(a.social.partner,'b');assert.equal(b.social.partner,'a');assert.equal(db.socialRequests.length,0);assert(!socialAction(db,c,{action:'social-request',target:'b',kind:'partner'},now));
 assert(socialAction(db,a,{action:'social-separate',id:'b'},now));assert.equal(b.social.partner,null);assert.deepEqual(a.social.friends,['b']);
});
test('trades atomically swap both calibrated items and agreed credits; foreign or repeated accept cannot spend',()=>{
 const db=fixture(),[a,b,c]=db.users;a.state.calibration={gear3:{level:2,modules:['crit']}};b.state.calibration={gear4:{level:3,modules:['armor']}};
 assert(socialAction(db,a,{action:'social-trade-create',target:'b',gear:'gear3',wanted:'gear4',price:50},now));const t=db.privateTrades[0];assert(!a.state.inventory.includes('gear3'));assert(a.state.escrow.includes('gear3'));assert.equal(socialView(db,c,now).trades.length,0);assert.equal(socialView(db,b,now).trades[0].calibration,undefined);
 assert(!socialAction(db,c,{action:'social-trade-accept',id:t.id},now));b.state.equipped.weapon='gear4';const before=structuredClone(db);assert(!socialAction(db,b,{action:'social-trade-accept',id:t.id},now));assert.deepEqual(db,before);b.state.equipped.weapon='gear0';
 assert(socialAction(db,b,{action:'social-trade-accept',id:t.id},now));assert.equal(a.state.credits,230);assert.equal(b.state.credits,130);assert(a.state.inventory.includes('gear4'));assert(b.state.inventory.includes('gear3'));assert.deepEqual(a.state.calibration.gear4,{level:3,modules:['armor']});assert.deepEqual(b.state.calibration.gear3,{level:2,modules:['crit']});assert(!socialAction(db,b,{action:'social-trade-accept',id:t.id},now));assert(!socialAction(db,a,{action:'social-trade-cancel',id:t.id},now));
});
test('cancel, expiry, block and account deletion return escrow permanently, including full bags',()=>{
 for(const mode of ['cancel','expire','block','delete']){const db=fixture(),[a,b]=db.users;a.state.calibration={gear3:{level:2,modules:['health']}};assert(socialAction(db,a,{action:'social-trade-create',target:'b',gear:'gear3',price:10},now));const t=db.privateTrades[0];a.state.inventory=gear.slice(4,62).map(v=>v.id);
  if(mode==='cancel')assert(socialAction(db,a,{action:'social-trade-cancel',id:t.id},now));if(mode==='expire')assert(settleSocial(db,now+86400000));if(mode==='block')assert(socialAction(db,b,{action:'social-block',id:'a'},now));if(mode==='delete')cleanupSocial(db,'b');
  assert(a.state.itemInbox.includes('gear3'));assert.equal(a.state.inboxGearExpiry?.gear3,undefined);assert.deepEqual(a.state.calibration.gear3,{level:2,modules:['health']});assert.equal(db.privateTrades.length,0);assert.equal(a.state.credits,180);
 }
});
test('blocking removes mutual relationships and pending requests, hides chat and quoted blocked text',()=>{
 const db=fixture(),[a,b,c]=db.users;a.social={friends:['b'],blocked:[],partner:'b'};b.social={friends:['a'],blocked:[],partner:'a'};
 assert(socialAction(db,a,{action:'social-request',target:'c',kind:'friend'},now));db.messages=[{id:'hidden',author:'b',text:'hidden payload',time:now},{id:'quote',author:'c',text:'visible',reply:{id:'hidden',text:'hidden payload'},time:now}];
 assert(socialAction(db,a,{action:'social-block',id:'b'},now));assert.equal(a.social.partner,null);assert.equal(b.social.partner,null);assert.deepEqual(b.social.friends,[]);assert(!JSON.stringify(worldView(db,a,now).messages).includes('hidden payload'));assert(JSON.stringify(worldView(db,null,now).messages).includes('hidden payload'));
 assert(!worldAction(db,b,{action:'mail-send',id:'a',text:'blocked'},now));assert(socialAction(db,a,{action:'social-unblock',id:'b'},now));assert(worldAction(db,b,{action:'mail-send',id:'a',text:'allowed'},now));
});
test('reports are private and limited; only admins resolve with audited reason and no automatic punishment',()=>{
 const db=fixture(),[a,b,c]=db.users;const p={action:'social-report',target:'b',category:'abuse',reason:'Quấy rối trong chat'};assert(socialAction(db,a,p,now));assert(!socialAction(db,a,p,now));const report=db.playerReports[0];assert.equal(socialView(db,c,now).reports.length,0);assert.equal(b.moderation,undefined);
 const resolution={action:'report-resolve',id:report.id,confirm:true,reason:'Đã xem nội dung chat',requestId:randomUUID(),issuedAt:now};assert.equal(adminAction(db,c,resolution,now).status,403);c.role='admin';assert.equal(adminView(db,{section:'reports',now}).reports[0].reason,p.reason);assert(adminAction(db,c,resolution,now).ok);assert.equal(db.playerReports[0].status,'resolved');assert.equal(db.management.audit.at(-1).target,'b');assert.equal(b.moderation,undefined);
 for(let i=0;i<5;i++)db.users.push({id:'extra'+i,state:fresh()});for(let i=0;i<4;i++)assert(socialAction(db,a,{...p,target:'extra'+i},now));assert(!socialAction(db,a,{...p,target:'extra4'},now));
});
test('gift receipt retention covers allowed clock skew and cannot be evicted while replay is valid',()=>{
 const db=fixture(),[a,b]=db.users,p={...gift('b'),issuedAt:now+30000};assert(socialAction(db,a,p,now));
 assert(socialAction(db,a,{...gift('b'),issuedAt:now+300001},now+300001));assert(socialAction(db,a,p,now+300001));assert.equal(a.state.credits,160);assert.equal(b.state.credits,200);
 assert(!socialAction(db,a,p,now+330000));
 a.social.receipts=Array.from({length:2000},(_,i)=>({id:'other'+i,expiresAt:now+600000}));const before=structuredClone(db);assert(!socialAction(db,a,gift('b'),now));assert.deepEqual(db,before);
});
test('admin report pagination prioritizes all open reports and search matches runner or reason',()=>{
 const db=fixture();db.playerReports=Array.from({length:50},(_,i)=>({id:'r'+i,author:'a',target:'b',reason:'Nội dung '+i,time:now+i,status:i<25?'open':'dismissed'}));
 const first=adminView(db,{section:'reports',now}),second=adminView(db,{section:'reports',page:1,now});assert.equal(first.matches,50);assert.equal(first.pages,3);assert.equal(first.reports.length,20);assert(first.reports.every(v=>v.status==='open'));assert.equal(second.reports.filter(v=>v.status==='open').length,5);
 assert.equal(adminView(db,{section:'reports',query:'Nội dung 49',now}).reports[0].id,'r49');assert.equal(adminView(db,{section:'reports',query:'b',now}).matches,50);
});
