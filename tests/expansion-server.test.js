import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('online expansion, concurrent shared kills and restart conserve rewards and hide server internals',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-expansion-')),port=40000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;let server;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,cookie){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:(r.headers.get('content-type')||'').includes('json')?await r.json():await r.text()};}
 const act=(u,b)=>req('/api/action',b,u.cookie),password='expansion-password';
 try{
  await start();const a=await req('/api/register',{username:'expansion_a',password}),b=await req('/api/register',{username:'expansion_b',password}),c=await req('/api/register',{username:'expansion_c',password});
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.equal((await req('/src/expeditions.js')).status,404);assert.equal((await req('/src/backend.js')).status,404);assert.equal((await req('/src/expedition-view.js')).status,200);
  assert.equal((await act(a,{action:'daily-checkin',credits:999999,now:99999999999999})).data.state.credits,220);assert.equal((await act(a,{action:'daily-checkin'})).status,400);
  assert.equal((await act(a,{action:'special',damage:999999})).status,400);assert.equal((await act(a,{action:'enter-dungeon',id:'corporation',corporation:true})).status,400);
  assert.equal((await act(a,{action:'buy',id:'gear230'})).status,200);assert.equal((await act(a,{action:'equip',id:'gear230'})).status,200);assert.equal((await act(a,{action:'ammo-buy',id:'energy-cell',amount:100})).data.state.stacks['energy-cell'],1);
  let battle=await act(a,{action:'fight',id:'shielded'});assert.equal(battle.status,200);assert(battle.data.state.combat.shield>0);battle=await act(a,{action:'special'});assert.equal(battle.data.state.stacks['energy-cell'],0);assert.equal((await act(a,{action:'special'})).status,400);await act(a,{action:'escape'});await act(a,{action:'rest'});
  const created=await act(a,{action:'expedition-create',text:'API shared room',password:'room-pass',seed:1});assert.equal(created.status,200);const id=created.data.state.dungeon.instance;
  assert.equal((await act(b,{action:'expedition-join',id,password:'wrong'})).status,400);assert.equal((await act(b,{action:'expedition-join',id,password:'room-pass'})).status,200);assert.equal((await act(c,{action:'expedition-join',id,password:'room-pass'})).status,200);
  const world=(await req('/api/world',null,b.cookie)).data;assert.equal(world.party.length,3);assert.equal(world.expeditions[0].count,3);assert(!JSON.stringify(world).includes('salt'));assert(!JSON.stringify(world).includes('room-pass'));
  for(const u of [a,b]){assert.equal((await act(u,{action:'dungeon-step',id:'left'})).status,200);assert.equal((await act(u,{action:'dungeon-step',id:'left'})).status,200);}
  await stop();await start();a.cookie=(await req('/api/login',{username:'expansion_a',password})).cookie;b.cookie=(await req('/api/login',{username:'expansion_b',password})).cookie;c.cookie=(await req('/api/login',{username:'expansion_c',password})).cookie;
  const room=(await req('/api/me',null,a.cookie)).data.state.dungeon;assert.equal(room.instance,id);assert.equal((await req('/api/me',null,b.cookie)).data.state.combat.currentHp,24);
  const results=await Promise.all([act(a,{action:'attack',currentHp:0,rewarded:true}),act(b,{action:'attack',currentHp:0,rewarded:true})]);assert(results.every(v=>v.status===200));
  const sa=(await req('/api/me',null,a.cookie)).data.state,sb=(await req('/api/me',null,b.cookie)).data.state,sc=(await req('/api/me',null,c.cookie)).data.state;
  assert.equal(sa.combat,null);assert.equal(sb.combat,null);assert.equal(sa.kills,1);assert.equal(sb.kills,1);assert.equal(sc.kills,0);assert.equal(sc.dungeon.cells[230],'.');assert.equal((await act(a,{action:'attack'})).status,400);
  assert.equal((await act(b,{action:'leave-dungeon'})).status,200);assert.equal((await act(b,{action:'expedition-join',id,password:'room-pass'})).status,400);
  const saved=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8'));assert.equal(saved.expeditions[0].foes['1:230'].rewarded.length,2);assert.notEqual(saved.expeditions[0].password,'room-pass');
  await stop();await start();a.cookie=(await req('/api/login',{username:'expansion_a',password})).cookie;assert.equal((await req('/api/me',null,a.cookie)).data.state.kills,sa.kills);assert.equal((await act(a,{action:'daily-checkin'})).status,400);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
