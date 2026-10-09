import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('private communications, profile customization, milestones and technology persist with server authority',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-comms-test-')),port=36000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
 let server;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,cookie){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 try{
 await start();const password='comms-test-password',accounts=[];for(const username of ['comms_alpha','comms_beta','comms_outside'])accounts.push(await req('/api/register',{username,password}));
 const [a,b,c]=accounts,act=(payload,cookie=a.cookie)=>req('/api/action',payload,cookie);
 assert.equal((await act({action:'milestone-claim',id:'printing',total:99})).status,400);
 for(const id of ['implant','weapon'])assert.equal((await act({action:'print',id})).status,200);
 assert.equal((await act({action:'milestone-claim',id:'printing'})).status,200);assert.equal((await act({action:'milestone-claim',id:'printing'})).status,400);
 assert.equal((await act({action:'pin-badge',id:'printer',slot:0})).status,200);assert.equal((await act({action:'title',id:'printer'})).status,200);assert.equal((await act({action:'pin-badge',id:'veteran',slot:1})).status,400);
 assert.equal((await act({action:'exchange',direction:'sell',amount:3})).status,200);
 for(let i=0;i<2;i++){let r=await act({action:'fight'});assert.equal(r.status,200);while(r.data.state.combat)r=await act({action:'attack'});}
 assert.equal((await act({action:'corp-create',text:'Private Signal'})).status,200);let world=(await req('/api/world',null,a.cookie)).data;assert.equal((await act({action:'corp-join',id:world.corporation},b.cookie)).status,200);
 assert.equal((await act({action:'chat',channel:'guild',text:'private guild payload'})).status,200);world=(await req('/api/world',null,a.cookie)).data;const message=world.guildMessages[0];
 assert.equal((await req('/api/world')).data.guildMessages.length,0);assert.equal((await req('/api/world',null,c.cookie)).data.guildMessages.length,0);assert.equal((await act({action:'chat',channel:'global',text:'leak',replyId:message.id},c.cookie)).status,400);assert.equal((await act({action:'chat',channel:'guild',text:'intrusion'},c.cookie)).status,400);
 assert.equal((await act({action:'chat',channel:'guild',text:'private reply',replyId:message.id},b.cookie)).status,200);
 assert.equal((await act({action:'mail-send',id:b.data.user.id,text:'private mail payload'})).status,200);world=(await req('/api/world',null,b.cookie)).data;const letter=world.mail[0];
 assert.equal((await act({action:'mail-read',id:letter.id},c.cookie)).status,400);assert.equal((await act({action:'mail-read',id:letter.id})).status,400);assert.equal((await act({action:'mail-read',id:letter.id},b.cookie)).status,200);assert.equal((await req('/api/world',null,c.cookie)).data.mail.length,0);
 assert.equal((await act({action:'rep-give',id:b.data.user.id,reputation:999})).status,200);assert.equal((await act({action:'rep-give',id:c.data.user.id})).status,400);
 assert.equal((await act({action:'core-craft',hashProcessors:999,aiCores:999})).status,400);assert.equal((await act({action:'scavenge'})).status,200);assert.equal((await act({action:'scavenge'})).status,400);assert.equal((await act({action:'move',id:'map1'})).status,200);assert.equal((await act({action:'scavenge'})).status,200);assert.equal((await act({action:'core-craft'})).status,200);
 await stop();await start();const loginA=await req('/api/login',{username:'comms_alpha',password}),loginB=await req('/api/login',{username:'comms_beta',password});assert.equal(loginA.data.state.pinnedBadges[0],'printer');assert.equal(loginA.data.state.title,'printer');assert.deepEqual(loginA.data.state.milestoneClaims,['printing']);assert.equal(loginA.data.state.aiCores,1);assert.equal(loginB.data.state.reputation,1);
 world=(await req('/api/world',null,loginB.cookie)).data;assert.equal(world.guildMessages.length,2);assert.equal(world.mail[0].read,true);assert.equal(world.guildMessages[1].reply.text,'private guild payload');assert.equal((await act({action:'rep-give',id:c.data.user.id},loginA.cookie)).status,400);
 assert(!JSON.stringify((await req('/api/world')).data).includes('private guild payload'));assert(!JSON.stringify((await req('/api/world')).data).includes('private mail payload'));
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
