import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';

test('server creates, persists and consumes chest drops once, ignoring forged item payloads',async()=>{
 const directory=await mkdtemp('/tmp/cyper-loot-server-'),port=49000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;let server,cookie;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),DATABASE_URL:'',CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await once(server.stdout,'data');}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,payload){const r=await fetch(base+route,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,data:await r.json()};}
 const act=payload=>req('/api/action',payload);
 try{
  await start();assert.equal((await req('/api/register',{username:'loot_runner',password:'loot-test-password'})).status,200);
  await act({action:'enter-dungeon'});const chest=await act({action:'dungeon-step',id:'left'});assert.equal(chest.status,200);
  const loot=chest.data.state.pendingLoot;assert(loot.items.some(v=>v.id==='ammo-material'&&v.count===3));assert.equal(chest.data.state.stacks?.['ammo-material'],undefined);
  await stop();await start();assert.deepEqual((await req('/api/me')).data.state.pendingLoot,loot);
  assert.equal((await act({action:'loot-take',id:'forged-batch'})).status,400);
  const payload={action:'loot-take',id:loot.id,items:[{kind:'gear',id:'gear529',count:999}],count:999},attempts=await Promise.all([act(payload),act(payload)]);
  assert.deepEqual(attempts.map(v=>v.status).sort(),[200,400]);const taken=attempts.find(v=>v.status===200);
  assert.equal(taken.data.state.stacks['ammo-material'],3);assert(!taken.data.state.inventory.includes('gear529'));assert.equal(taken.data.state.pendingLoot,null);
  assert.equal((await act({action:'loot-take',id:loot.id})).status,400);assert.equal((await act({action:'loot-discard',id:loot.id})).status,400);
  await stop();await start();const saved=(await req('/api/me')).data.state;assert.equal(saved.pendingLoot,null);assert.equal(saved.stacks['ammo-material'],3);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
