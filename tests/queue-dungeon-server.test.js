import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {dungeonTarget,dungeonPath} from '../src/dungeon.js';
import {remainingMonsters} from '../src/dungeon-layout.js';

async function fixture(){
 const directory=await mkdtemp('/tmp/cyper-queue-dungeon-'),port=52000+Math.floor(Math.random()*1500),base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:String(port),CYPER_DATA_DIR:directory,DATABASE_URL:'',NODE_ENV:'development'};let server;
 const start=async()=>{server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});await once(server.stdout,'data');};
 const stop=async()=>{if(server){const done=once(server,'exit');server.kill();await done;server=null;}};
 const request=async(route,payload,cookie)=>{const r=await fetch(base+route,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};};
 return {directory,env,start,stop,request,close:async()=>{await stop();await rm(directory,{recursive:true,force:true});}};
}

test('only authorized confirmed top-ups fund skips; quotes, concurrent requests and restart preserve money and rewards',async()=>{
 const f=await fixture(),password='premium-test-password';let admin,runner;
 const act=payload=>f.request('/api/action',payload,runner.cookie);
 try{
  await f.start();admin=await f.request('/api/register',{username:'premium_owner',password});runner=await f.request('/api/register',{username:'premium_runner',password,units:999999,credits:999999});
  assert.equal(runner.data.state.units,0);
  assert.equal((await act({action:'exchange',direction:'buy',amount:1,units:99})).status,400);
  assert.equal((await act({action:'daily-checkin',units:99})).data.state.units,0);
  const started=await act({action:'work-start',id:'printing',endsAt:0});let s=started.data.state;const key=s.work.key;
  assert.equal((await act({action:'work-skip',id:key,amount:1,units:99,now:9999999999999})).status,400);
  const topup={action:'grant',id:runner.data.user.id,resource:'units',amount:3,password,confirm:true,reason:'Xác nhận giao dịch nạp kiểm thử #001',requestId:randomUUID(),issuedAt:Date.now()};
  assert.equal((await f.request('/api/admin/action',topup,runner.cookie)).status,403);
  await f.stop();const role=spawn(process.execPath,['scripts/admin-role.js','grant','premium_owner'],{cwd:new URL('..',import.meta.url),env:f.env,stdio:'ignore'});assert.equal((await once(role,'exit'))[0],0);await f.start();admin=await f.request('/api/login',{username:'premium_owner',password});
  assert.equal((await f.request('/api/admin/action',topup,admin.cookie)).status,200);
  assert.equal((await f.request('/api/admin/action',topup,admin.cookie)).status,200);
  s=(await f.request('/api/me',null,runner.cookie)).data.state;assert.equal(s.units,3);assert.equal(s.work.key,key);
  const audit=(await f.request('/api/admin?section=audit',null,admin.cookie)).data;
  assert(JSON.stringify(audit).includes('confirmed-topup'));
  const skips=await Promise.all([act({action:'work-skip',id:key,amount:1,xp:99999}),act({action:'work-skip',id:key,amount:1})]);assert.deepEqual(skips.map(r=>r.status).sort(),[200,400]);
  s=(await f.request('/api/me',null,runner.cookie)).data.state;assert.equal(s.units,2);assert.equal(s.work,null);assert.equal(s.printing.xp,25);assert.equal(s.printing.total,0);assert.equal(s.activity.workCompleted,1);
  await f.stop();await f.start();s=(await f.request('/api/me',null,runner.cookie)).data.state;assert.equal(s.units,2);assert.equal(s.activity.workCompleted,1);
  s=(await act({action:'work-start',id:'mine'})).data.state;assert.equal((await act({action:'work-skip',id:key,amount:2})).status,400);
  assert.equal((await act({action:'work-skip',id:s.work.key,amount:1,cost:0,endsAt:0,now:9999999999999})).status,400);
  const paid=await act({action:'work-skip',id:s.work.key,amount:2,credits:999999});assert.equal(paid.status,200);assert.equal(paid.data.state.units,0);assert.equal(paid.data.state.credits,252);assert.equal(paid.data.state.activity.workCompleted,2);
  s=(await act({action:'work-start',id:'printing'})).data.state;
  await f.stop();const file=f.directory+'/players.json',db=JSON.parse(await readFile(file,'utf8'));db.users.find(u=>u.id===runner.data.user.id).state.work.endsAt=Date.now()-1000;await writeFile(file,JSON.stringify(db));await f.start();
  assert.equal((await act({action:'work-skip',id:s.work.key,amount:1})).status,400);const free=await act({action:'work-claim'});assert.equal(free.status,200);assert.equal(free.data.state.units,0);assert.equal(free.data.state.printing.rank,2);assert.equal(free.data.state.activity.workCompleted,3);
 }finally{await f.close();}
});

test('server walks to destinations, locks rewards until every monster dies and rejects old-floor requests',async()=>{
 const f=await fixture();let runner,s;const act=payload=>f.request('/api/action',payload,runner.cookie);
 const collect=async()=>{if(s.pendingLoot)s=(await act({action:'loot-take',id:s.pendingLoot.id})).data.state;};
 try{
  await f.start();runner=await f.request('/api/register',{username:'destination_runner',password:'destination-test-password'});
  s=(await act({action:'enter-dungeon'})).data.state;assert.equal(remainingMonsters(s.dungeon),4);
  let r=await act({action:'dungeon-move',id:dungeonTarget(s.dungeon,231),bossDefeated:true,defeated:999,cells:[]});assert.equal(r.status,200);s=r.data.state;assert.equal(s.credits,180);assert.equal(s.dungeon.chests,0);assert.equal(s.pendingLoot,undefined);
  for(const id of [dungeonTarget(s.dungeon,28),dungeonTarget(s.dungeon,0),'1:2:22','1:1:9999'])assert.equal((await act({action:'dungeon-move',id,teleport:true,bossDefeated:true})).status,400);
  r=await act({action:'dungeon-move',id:dungeonTarget(s.dungeon,226)});assert.equal(r.status,200);s=r.data.state;assert.equal(s.dungeon.x,5);assert(s.combat);assert.equal(s.dungeon.steps,2);
  assert.equal((await act({action:'dungeon-move',id:dungeonTarget(s.dungeon,22)})).status,400);
  for(let fights=0;remainingMonsters(s.dungeon)>0&&fights<12;fights++){
   if(!s.combat){const tile=s.dungeon.cells.findIndex(c=>['M','B'].includes(c));r=await act({action:'dungeon-move',id:dungeonTarget(s.dungeon,tile)});assert.equal(r.status,200);s=r.data.state;}
   while(s.combat){r=await act(s.hp<30?{action:'item-use',id:'balm'}:{action:'attack'});assert.equal(r.status,200);s=r.data.state;}
   assert(s.dungeon);await collect();
  }
  assert.equal(remainingMonsters(s.dungeon),0);assert.equal(s.dungeon.defeated,4);
  const chestTile=s.dungeon.cells.map((c,i)=>c==='C'?i:-1).filter(i=>i>=0).sort((a,b)=>dungeonPath(s.dungeon,dungeonTarget(s.dungeon,a)).length-dungeonPath(s.dungeon,dungeonTarget(s.dungeon,b)).length)[0];
  const chestId=dungeonTarget(s.dungeon,chestTile),credits=s.credits;
  const chests=await Promise.all([act({action:'dungeon-move',id:chestId}),act({action:'dungeon-move',id:chestId})]);assert.deepEqual(chests.map(v=>v.status).sort(),[200,400]);s=chests.find(v=>v.status===200).data.state;assert.equal(s.dungeon.chests,1);assert.equal(s.credits,credits+25);await collect();
  const exit=dungeonTarget(s.dungeon,28);r=await act({action:'dungeon-move',id:exit});assert.equal(r.status,200);s=r.data.state;assert.equal(s.dungeon.floor,2);assert.equal(remainingMonsters(s.dungeon),4);assert.equal((await act({action:'dungeon-move',id:exit})).status,400);
  await f.stop();await f.start();s=(await f.request('/api/me',null,runner.cookie)).data.state;assert.equal(s.dungeon.floor,2);assert.equal(remainingMonsters(s.dungeon),4);
 }finally{await f.close();}
});
