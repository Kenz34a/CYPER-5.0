import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('authenticated market race, untrusted fields, shared chat and donation survive restart',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-world-test-')),port=34000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
 let server;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,cookie){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 try{
 await start();assert.equal((await req('/api/world')).status,200);assert.equal((await req('/api/action',{action:'chat',text:'guest'})).status,401);
 const password='world-test-password';const accounts=[];
 for(const username of ['world_seller','world_buyer','world_third'])accounts.push(await req('/api/register',{username,password}));
 const seller=accounts[0],act=(b,c=seller.cookie)=>req('/api/action',b,c);
 assert.equal((await act({action:'buy',id:'gear2',discount:1,credits:99999})).data.state.credits,116);
 assert.equal((await act({action:'upgrade',id:'gear2'})).data.state.calibration.gear2.level,1);
 assert.equal((await act({action:'module',id:'gear2',slot:0,module:'health'})).status,200);
 assert.equal((await act({action:'market-list',id:'gear2',price:100,calibration:{level:99},seller:accounts[1].data.user.id})).status,200);
 let world=(await req('/api/world')).data;const listing=world.market[0];assert.equal(listing.calibration.level,1);assert.equal(listing.seller,seller.data.user.id);
 assert.equal((await act({action:'market-cancel',id:listing.id},accounts[1].cookie)).status,400);
 const race=await Promise.all(accounts.slice(1).map(a=>act({action:'market-buy',id:listing.id,price:0},a.cookie)));
 assert.deepEqual(race.map(r=>r.status).sort(),[200,400]);const winner=accounts[1+race.findIndex(r=>r.status===200)];
 assert.equal(race.find(r=>r.status===200).data.state.credits,80);assert.equal((await req('/api/me',null,seller.cookie)).data.state.credits,119);
 assert.equal((await act({action:'market-buy',id:listing.id},winner.cookie)).status,400);
 const repost=await act({action:'market-list',id:'gear2',price:50},winner.cookie);assert.equal(repost.status,200);
 world=(await req('/api/world')).data;
 const cancel=await act({action:'market-cancel',id:world.market[0].id},winner.cookie);assert.equal(cancel.data.state.credits,80);assert.deepEqual(cancel.data.state.calibration.gear2,{level:1,modules:['health']});
 const message='<img src=x onerror=alert(1)> Xin chào';assert.equal((await act({action:'chat',text:message})).status,200);assert.equal((await act({action:'chat',text:'too fast'})).status,400);
 assert.equal((await act({action:'donate',id:'global',amount:10},winner.cookie)).status,200);
 world=(await req('/api/world')).data;assert.equal(world.messages[0].text,message);assert.equal(world.funds[0].total,10);assert(!JSON.stringify(world).includes(password));assert(!JSON.stringify(world).includes('salt'));
 await stop();await start();const restored=await req('/api/login',{username:winner.data.user.name,password});assert.equal(restored.status,200);assert.equal(restored.data.state.credits,70);assert.equal(restored.data.state.calibration.gear2.modules[0],'health');
 const restoredWorld=(await req('/api/world')).data;assert.equal(restoredWorld.market.length,0);assert.equal(restoredWorld.messages[0].text,message);assert.equal(restoredWorld.funds[0].total,10);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
