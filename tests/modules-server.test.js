import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {gear} from '../src/content.js';
import {makeModule} from '../src/modules.js';
import {itemStats} from '../src/equipment.js';

test('module API serializes copies, ignores forged stats and persists graded stacks and gifted fitted gear',{timeout:30000},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-modules-')),port=54600+Math.floor(Math.random()*200),base=`http://127.0.0.1:${port}`,env={...process.env,CYPER_DATA_DIR:directory,DATABASE_URL:'',NODE_ENV:'development',PORT:String(port)};let server;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',n=>reject(new Error('Server exit '+n)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,cookie){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 try{
  await start();const a=await req('/api/register',{username:'module_alpha',password:'module-test-password'}),b=await req('/api/register',{username:'module_beta',password:'module-test-password'});
  const targets=gear.filter(g=>g.level===25).slice(0,2),m=makeModule('health',4,25);await stop();const file=path.join(directory,'players.json'),db=JSON.parse(await readFile(file,'utf8'));Object.assign(db.users[0].state,{level:50,stacks:{[m.id]:1},inventory:['gear0','gear1',...targets.map(v=>v.id)],credits:100000,scrap:1000,hashProcessors:1000,craftingSkills:{material:{rank:25,xp:0,total:0}}});await writeFile(file,JSON.stringify(db));await start();
  const act=p=>req('/api/action',p,a.cookie),state=async cookie=>(await req('/api/me',null,cookie)).data.state;
  for(const asset of ['/src/modules.js','/src/module-view.js','/src/modules.css'])assert.equal((await fetch(base+asset)).status,200);assert.equal((await fetch(base+'/src/social.js')).status,404);
  assert.equal((await act({action:'module',id:'gear0',slot:0,module:m.id,level:1})).status,400);
  const fitted=await Promise.all(targets.map(g=>act({action:'module',id:g.id,slot:0,module:m.id,stats:{health:99999999},rarity:5,level:1})));assert.deepEqual(fitted.map(v=>v.status).sort(),[200,400]);let s=await state(a.cookie),id=targets.find(g=>s.calibration?.[g.id]?.modules[0]===m.id).id;
  assert.equal(s.stacks[m.id],0);assert.equal(itemStats(s,id).health,(gear.find(g=>g.id===id).health||0)+m.stats.health);
  const removed=await Promise.all([act({action:'module-remove',id:id+':0'}),act({action:'module-remove',id:id+':0'})]);assert.deepEqual(removed.map(v=>v.status).sort(),[200,400]);assert.equal((await state(a.cookie)).stacks[m.id],1);
  assert.equal((await act({action:'craft',id:'craft:'+m.id,count:2,stats:{health:1e8},credits:0})).status,200);assert.equal((await state(a.cookie)).stacks[m.id],3);assert.equal((await act({action:'module',id,slot:0,module:m.id})).status,200);
  const gift={action:'social-gift',target:b.data.user.id,item:'gear:'+id,amount:1,requestId:crypto.randomUUID(),issuedAt:Date.now()};assert.equal((await act(gift)).status,200);assert.equal((await act(gift)).status,200);let bs=await state(b.cookie);assert.equal(bs.calibration[id].modules[0],m.id);assert.equal(itemStats(bs,id).health,(gear.find(g=>g.id===id).health||0)+m.stats.health);
  await stop();await start();s=await state(a.cookie);bs=await state(b.cookie);assert.equal(s.stacks[m.id],2);assert.equal(bs.calibration[id].modules[0],m.id);assert(!s.inventory.includes(id));assert.equal((await act({action:'module',id:targets.find(g=>g.id!==id).id,slot:0,module:'mod-health-r9-l25'})).status,400);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
