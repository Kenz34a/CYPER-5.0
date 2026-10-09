import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
test('online work uses server deadlines, denies forged rewards and survives restart with once-only claim',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-work-test-')),port=45000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`,file=path.join(directory,'players.json');let server,cookie;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',n=>reject(new Error('Exit '+n)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 const act=b=>req('/api/action',b),login=async()=>{const r=await req('/api/login',{username:'work_runner',password:'work-test-password'});cookie=r.cookie;return r.data.state;};
 try{
  await start();cookie=(await req('/api/register',{username:'work_runner',password:'work-test-password'})).cookie;
  const before=Date.now();let r=await act({action:'work-start',id:'recycle',now:0,endsAt:0,xp:999999,credits:999999});assert.equal(r.status,200);let s=r.data.state;assert(s.work.startedAt>=before);assert.equal(s.work.endsAt-s.work.startedAt,30000);assert.equal(s.work.reward.xp,50);assert.equal(s.scrap,5);assert.equal(s.energy,28);const snapshot=s.work;
  assert.equal((await act({action:'work-start',id:'mine'})).status,400);assert.equal((await act({action:'work-claim',now:Date.now()+99999999})).status,400);
  for(const b of [{action:'move',id:'map1'},{action:'rest'},{action:'fight'},{action:'pvp',id:'forged'},{action:'craft',id:'balm'},{action:'module',id:'gear0',slot:0,module:'health'}])assert.equal((await act(b)).status,400);
  await stop();await start();s=await login();assert.deepEqual(s.work,snapshot);assert.equal((await act({action:'work-claim',now:9999999999999})).status,400);
  // Advancing the persisted deadline is an isolated test fixture; API receives no privileged time input.
  await stop();const db=JSON.parse(await readFile(file,'utf8'));db.users[0].state.work.startedAt=Date.now()-31000;db.users[0].state.work.endsAt=Date.now()-1000;await writeFile(file,JSON.stringify(db));await start();await login();
  const claims=await Promise.all([act({action:'work-claim',xp:99999}),act({action:'work-claim'})]);assert.deepEqual(claims.map(v=>v.status).sort(),[200,400]);s=(await req('/api/me')).data.state;assert.equal(s.work,null);assert.deepEqual(s.printing,{rank:2,xp:0,total:0});assert.equal(s.activity.workCompleted,1);assert.equal(s.credits,180);
  await stop();await start();s=await login();assert.equal(s.activity.workCompleted,1);assert.equal((await act({action:'work-claim'})).status,400);assert.equal((await act({action:'rest'})).status,200);
  assert.equal((await act({action:'work-start',id:'mine',credits:99999999})).status,200);r=await act({action:'work-cancel'});assert.equal(r.status,200);assert.equal(r.data.state.credits,180);assert.equal(r.data.state.energy,27);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
