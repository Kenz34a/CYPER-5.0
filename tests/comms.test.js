import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/game.js';
import {initWorld,worldAction,worldView} from '../src/world.js';
const clock=Date.parse('2026-10-09T03:00:00Z');
function fixture(){const db={users:['alpha','beta','outside'].map(id=>({id,state:fresh()}))};initWorld(db);db.users[0].state.credits=1000;assert(worldAction(db,db.users[0],{action:'corp-create',text:'Signal Crew'},clock));assert(worldAction(db,db.users[1],{action:'corp-join',id:db.users[0].corporation},clock));return db;}

test('guild chat and replies never cross membership boundaries or leak into public chat',()=>{
 const db=fixture(),[a,b,c]=db.users;
 assert(worldAction(db,a,{action:'chat',channel:'guild',text:'private guild secret',corporation:'forged'},clock));const secret=db.messages[0].id;
 assert.equal(worldView(db).messages.length,0);assert.equal(worldView(db,c).guildMessages.length,0);assert.equal(worldView(db,b).guildMessages[0].text,'private guild secret');
 assert.equal(worldAction(db,c,{action:'chat',channel:'guild',text:'intrusion'},clock),false);
 assert.equal(worldAction(db,c,{action:'chat',channel:'global',text:'quote',replyId:secret},clock),false);
 assert.equal(worldAction(db,a,{action:'chat',channel:'global',text:'quote',replyId:secret},clock+2000),false);
 assert(worldAction(db,b,{action:'chat',channel:'guild',text:'reply',replyId:secret},clock));assert.equal(worldView(db,b).guildMessages[1].reply.text,'private guild secret');
 assert(worldAction(db,a,{action:'corp-leave'},clock+2000));assert.equal(worldView(db,a).guildMessages.length,0);
 assert(worldAction(db,a,{action:'corp-create',text:'Other Crew'},clock+2000));assert.equal(worldAction(db,a,{action:'chat',channel:'guild',text:'cross group quote',replyId:secret},clock+4000),false);
 assert(worldAction(db,c,{action:'chat',text:'public'},clock));assert.equal(worldView(db).messages[0].text,'public');assert(!JSON.stringify(worldView(db)).includes('private guild secret'));
});

test('mail is visible only to sender/recipient, only recipient marks read, and limits are enforced',()=>{
 const db=fixture(),[a,b,c]=db.users;
 assert.equal(worldAction(db,a,{action:'mail-send',id:a.id,text:'self'},clock),false);
 assert.equal(worldAction(db,a,{action:'mail-send',id:b.id,text:'x'.repeat(1001)},clock),false);
 assert(worldAction(db,a,{action:'mail-send',id:b.id,text:'private letter <script>hello</script>'},clock));const id=db.mail[0].id;
 assert.equal(worldView(db,a).mail.length,1);assert.equal(worldView(db,b).mail.length,1);assert.equal(worldView(db,c).mail.length,0);assert.equal(worldView(db).mail.length,0);
 assert.equal(worldAction(db,a,{action:'mail-read',id},clock),false);assert.equal(worldAction(db,c,{action:'mail-read',id},clock),false);
 assert.equal(worldAction(db,a,{action:'mail-send',id:b.id,text:'spam'},clock+1000),false);
 assert(worldAction(db,b,{action:'mail-read',id},clock));assert(worldView(db,a).mail[0].read);assert(b.state.notifications.some(n=>n.text.includes('Nhận thư riêng')));
 for(let i=1;i<=100;i++)assert(worldAction(db,a,{action:'mail-send',id:b.id,text:String(i)},clock+i*5000));assert.equal(worldView(db,b).mail.length,100);
});

test('gear sharing is an authoritative snapshot, replies keep quoted text and reputation is once per Vietnam day',()=>{
 const db=fixture(),[a,b,c]=db.users;a.state.calibration={gear0:{level:2,modules:['health']}};
 assert.equal(worldAction(db,a,{action:'chat',item:'gear199'},clock),false);
 assert(worldAction(db,a,{action:'chat',item:'gear0',calibration:{level:99}},clock));assert.equal(db.messages[0].item.calibration.level,2);a.state.calibration.gear0.level=3;assert.equal(db.messages[0].item.calibration.level,2);
 assert(worldAction(db,b,{action:'chat',text:'Nice gear',replyId:db.messages[0].id},clock));assert.equal(db.messages[1].reply.name,a.state.name);
 assert.equal(worldAction(db,a,{action:'rep-give',id:a.id},clock),false);assert(worldAction(db,a,{action:'rep-give',id:b.id,reputation:999},clock));assert.equal(b.state.reputation,1);
 assert.equal(worldAction(db,a,{action:'rep-give',id:c.id},clock+2000),false);assert.equal(worldAction(db,a,{action:'rep-give',id:b.id},clock+2000),false);
 assert(worldAction(db,a,{action:'rep-give',id:c.id},Date.parse('2026-10-09T17:00:00Z')));assert.equal(c.state.reputation,1);
});
