import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {fresh} from '../src/game.js';
import {gear} from '../src/content.js';
import {receiveGear,receiveStack,inboxLifetime} from '../src/inventory-state.js';

test('server clock, automatic inbox receipt, batch authority, ammo rank and rail access persist across restart',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-logistics-test-')),port=44000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;let server,cookie;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',n=>reject(new Error('Exit '+n)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 const act=b=>req('/api/action',b);
 try{
  await start();await req('/api/register',{username:'logistics_runner',password:'logistics-test-password'});await stop();
  // Deliberate saved-state fixture: full bag, one expired loot item, one permanent return and a future parcel.
  const file=path.join(directory,'players.json'),db=JSON.parse(await readFile(file,'utf8')),s=fresh();s.level=29;s.hp=380;s.credits=10000;s.scrap=500;s.inventory=gear.slice(0,57).map(v=>v.id);s.stacks={balm:3,stim:1,'ammo-material':1};s.craftingSkills={ammo:{rank:9,xp:0,total:0}};
  receiveGear(s,'gear60',{now:Date.now()-8*86400000});receiveGear(s,'gear61',{permanent:true});receiveGear(s,'gear70');receiveStack(s,'nitron',100);s.calibration={gear60:{level:2,modules:['health']},gear61:{level:2,modules:['health']}};db.users[0].state=s;await writeFile(file,JSON.stringify(db));await start();
  let login=await req('/api/login',{username:'logistics_runner',password:'logistics-test-password'});cookie=login.cookie;assert(!login.data.state.itemInbox.includes('gear60'));assert.equal(login.data.state.calibration.gear60,undefined);
  assert.equal((await act({action:'inbox-claim',id:'gear70',now:Date.now()+100*inboxLifetime})).status,400);assert((await req('/api/me')).data.state.itemInbox.includes('gear70'));
  assert.equal((await act({action:'craft',id:'nitron',rank:10})).status,400);assert.equal((await act({action:'craft',id:'ammo-stock',count:101})).status,400);
  assert.equal((await act({action:'craft',id:'ammo-stock',count:36,credits:99999999})).status,200);let state=(await req('/api/me')).data.state;assert.equal(state.craftingSkills.ammo.rank,10);assert.equal(state.credits,9640);assert.equal(state.stacks['ammo-material'],37);
  assert.equal((await act({action:'sell',id:'gear55'})).status,200);const snapshots=await Promise.all(Array.from({length:5},()=>req('/api/me')));for(const v of snapshots)assert.equal(v.data.state.stacks.nitron,100);
  assert.equal((await act({action:'craft',id:'nitron'})).status,200);assert.equal((await req('/api/me')).data.state.stacks.nitron,102);
  assert.equal((await act({action:'sell',id:'gear56'})).status,200);assert.equal((await act({action:'sell',id:'gear54'})).status,200);state=(await req('/api/me')).data.state;assert.equal(state.itemInbox.length,0);assert(state.inventory.includes('gear61'));assert.deepEqual(state.calibration.gear61,{level:2,modules:['health']});
  assert.equal((await act({action:'inbox-claim-all'})).status,200);assert.equal((await act({action:'inbox-claim-all'})).status,400);assert.equal((await act({action:'move',id:'map30',fragments:3})).status,400);
  for(const id of ['map20','map24','map29']){assert.equal((await act({action:'move',id})).status,200);let r=await act({action:'fight'});for(let i=0;r.data.state.combat&&i<100;i++)r=await act({action:'attack'});assert.equal(r.data.state.combat,null);assert.equal((await act({action:'rest'})).status,200);}
  assert.equal((await act({action:'move',id:'map30'})).status,400);assert.equal((await act({action:'key-assemble',id:'red',fragments:3})).status,400);
  // Saved dungeon proof fixture complements unit tests that traverse all three exit floors.
  await stop();const proof=JSON.parse(await readFile(file,'utf8'));proof.users[0].state.keyFragments.red=['map20','map24','map29'];await writeFile(file,JSON.stringify(proof));await start();login=await req('/api/login',{username:'logistics_runner',password:'logistics-test-password'});cookie=login.cookie;
  assert.equal((await act({action:'move',id:'map30'})).status,400);assert.equal((await act({action:'key-assemble',id:'red'})).status,200);assert.equal((await act({action:'key-assemble',id:'red'})).status,400);
  assert.equal((await act({action:'move',id:'map30'})).status,200);await stop();await start();login=await req('/api/login',{username:'logistics_runner',password:'logistics-test-password'});cookie=login.cookie;state=login.data.state;assert.equal(state.map,'map30');assert.equal(state.stacks.nitron,102);assert.equal(state.stacks.balm,5);assert.equal(state.craftingSkills.ammo.total,37);assert(!state.itemInbox.some(id=>['gear61','gear70'].includes(id)));assert(state.inventoryWelcomeClaimed);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
