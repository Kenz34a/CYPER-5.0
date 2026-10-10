import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

test('server owns batch rewards and global charges across concurrent requests and restart',async()=>{
 const directory=await mkdtemp('/tmp/cyper-afk-api-'),port=54000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
 let server;
 const start=async()=>{server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory,DATABASE_URL:'',NODE_ENV:'development'},stdio:['ignore','pipe','pipe']});await once(server.stdout,'data');};
 const stop=async()=>{if(server){const done=once(server,'exit');server.kill();await done;server=null;}};
 const req=async(route,payload,cookie)=>{const r=await fetch(base+route,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};};
 try{
  await start();const a=await req('/api/register',{username:'afk_buyer',password:'afk-test-password'}),b=await req('/api/register',{username:'afk_offline',password:'afk-test-password'});
  const act=body=>req('/api/action',body,a.cookie),me=()=>req('/api/me',null,a.cookie);
  assert.equal((await req('/api/action',{action:'afk-global',id:'speed'})).status,401);
  assert.equal((await act({action:'work-start',id:'bot',count:2,aiCores:999})).status,400);
  const forged=await act({action:'work-start',id:'printing',count:2,boosts:{speed:80,reward:4,xp:80},reward:{units:99999},endsAt:0,now:9999999999999});assert.equal(forged.status,200);assert.equal(forged.data.state.work.endsAt-forged.data.state.work.startedAt,120000);assert.equal(forged.data.state.work.reward.xp,50);assert.equal(forged.data.state.energy,26);
  await act({action:'work-cancel'});await stop();
  const file=directory+'/players.json',db=JSON.parse(await readFile(file,'utf8'));
  for(const u of db.users){u.state.units=u.id===a.data.user.id?100:0;u.state.aiCores=10;u.state.work={id:'bot',key:'offline-fixture',startedAt:Date.now(),endsAt:Date.now()+3600000,reward:{skill:null,xp:0,credits:24}};}
  await writeFile(file,JSON.stringify(db));await start();
  const buy=id=>({action:'afk-global',id,amount:({skip:10,speed:5,reward:8,xp:5})[id],requestId:randomUUID(),issuedAt:Date.now()});
  const quote=buy('skip'),before=(await me()).data.state.work.endsAt,otherBefore=(await req('/api/me',null,b.cookie)).data.state.work.endsAt;
  const concurrent=await Promise.all([act(quote),act(quote)]);assert.deepEqual(concurrent.map(v=>v.status),[200,200]);
  let s=(await me()).data.state;assert.equal(s.units,90);assert.equal(s.work.endsAt,before-900000);assert.equal((await req('/api/me',null,b.cookie)).data.state.work.endsAt,otherBefore-900000);
  await stop();await start();assert.equal((await act(quote)).status,200);assert.equal((await me()).data.state.units,90);
  assert.equal((await act({...quote,id:'xp',amount:5})).status,400);
  const privateSkip=await act({action:'work-skip',id:s.work.key,amount:45});assert.equal(privateSkip.status,200);assert.equal(privateSkip.data.state.units,45);assert.equal(privateSkip.data.state.work,null);
  assert.equal((await act(buy('speed'))).status,200);assert.equal((await act(buy('speed'))).status,200);assert.equal((await act(buy('speed'))).status,400);
  assert.equal((await act(buy('reward'))).status,200);assert.equal((await act(buy('xp'))).status,200);
  const invalidBefore=(await me()).data.state;assert.equal((await act({action:'work-start',id:'bot',count:11})).status,400);assert.deepEqual((await me()).data.state,invalidBefore);
  const bot=await act({action:'work-start',id:'bot',count:2,boosts:{speed:99},reward:{units:99999}});assert.equal(bot.status,200);s=bot.data.state;assert.equal(s.work.endsAt-s.work.startedAt,360000);assert.equal(s.work.reward.characterXP,518);assert.equal(s.work.reward.credits,192);assert.equal(s.aiCores,8);assert.equal(s.units,22);
  const paid=buy('skip');assert.equal((await act(paid)).status,200);assert.equal((await act(paid)).status,200);assert.equal((await me()).data.state.units,12);
  await stop();await start();const claimed=await act({action:'work-claim'});assert.equal(claimed.status,200);assert.equal(claimed.data.state.units,12);assert.equal(claimed.data.state.credits,396);assert.equal(claimed.data.state.stacks['ammo-material'],16);assert.equal((await act({action:'work-claim'})).status,400);
  const world=(await req('/api/world',null,a.cookie)).data;assert.equal(world.afk.events.filter(v=>v.id==='skip').length,2);assert.equal(world.afk.speed,80);assert(!Object.hasOwn(world.afk,'receipts'));assert(!Object.hasOwn(world.afk,'buffs'));
  assert.equal((await fetch(base+'/src/afk-world.js')).status,404);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
