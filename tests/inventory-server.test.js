import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('inventory, pets and privacy use authoritative actions, expose only permitted assets, and survive restart',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-inventory-test-')),port=41000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;let server,cookie;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',n=>reject(new Error('Server exit '+n)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,auth=true){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(auth&&cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 const act=b=>req('/api/action',b);
 try{
  await start();const auth=await req('/api/register',{username:'inventory_runner',password:'inventory-test-password'});cookie=auth.cookie;const id=auth.data.user.id;
  assert.equal((await act({action:'inbox-claim',id:'welcome',credits:99999999})).data.state.credits,230);assert.equal((await act({action:'inbox-claim',id:'welcome'})).status,400);
  assert.equal((await act({action:'pet-buy',id:'orb',price:0})).data.state.credits,110);assert.equal((await act({action:'pet-buy',id:'orb'})).status,400);
  assert.equal((await act({action:'shelf-unlock',id:'0',level:100,credits:99999999})).status,400);assert.equal((await act({action:'shelf-set',slot:0,id:'gear0'})).status,400);
  assert.equal((await act({action:'cosmetic',id:'cyan'})).status,200);assert.equal((await act({action:'chat-skin',id:'cyan'})).status,200);assert.equal((await act({action:'exchange',direction:'sell',amount:3})).status,400);
  // Admin credit-support fixture replaces the retired Unit exchange.
  await stop();const supported=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8'));supported.users[0].state.credits+=300;await writeFile(path.join(directory,'players.json'),JSON.stringify(supported));await start();
  for(const slot of ['weapon','implant'])assert.equal((await act({action:'print',id:slot})).status,200);
  assert.equal((await act({action:'loadout-save',id:'0'})).status,200);assert.equal((await act({action:'quick-set',slot:0,id:'stim'})).status,200);
  const gearId=(await req('/api/me')).data.state.inventory.find(v=>!['gear0','gear1'].includes(v));const before=(await req('/api/me')).data.state;
  assert.equal((await act({action:'bulk-sell',ids:[gearId,'gear0']})).status,400);assert.deepEqual((await req('/api/me')).data.state,before);
  assert.equal((await act({action:'chat',text:'skin visibility'})).status,200);assert.equal((await req('/api/world',null,false)).data.messages[0].chatSkin,null);
  let pub=(await req('/api/profile/'+id,null,false)).data.assets;assert.equal(pub.pets[0].id,'orb');assert.equal(pub.badges,null);assert.equal(pub.credits,undefined);assert.equal(pub.stacks,undefined);
  for(const [field,visible] of [['pets',false],['badges',true],['chatSkin',true]])assert.equal((await act({action:'privacy',id:field,visible})).status,200);
  pub=(await req('/api/profile/'+id,null,false)).data.assets;assert.equal(pub.pets,null);assert.equal(pub.badges[0].id,'printer');assert.equal(pub.chatSkin,'cyan');assert.equal((await req('/api/world',null,false)).data.messages[0].chatSkin,'cyan');
  await stop();await start();const login=await req('/api/login',{username:'inventory_runner',password:'inventory-test-password'});cookie=login.cookie;assert(login.data.state.inventoryWelcomeClaimed);assert.equal(login.data.state.stacks.balm,before.stacks.balm);assert.equal(login.data.state.quickSlots[0],'stim');assert.equal(login.data.state.pet,'orb');assert.deepEqual(login.data.state.loadouts[0],{weapon:'gear0',armor:'gear1',implant:null});
  assert.equal((await req('/api/profile/'+id,null,false)).data.assets.pets,null);assert.equal((await req('/api/profile/not-a-runner',null,false)).status,404);
  assert.equal((await act({action:'privacy',id:'chatSkin',visible:false})).status,200);assert.equal((await req('/api/world',null,false)).data.messages[0].chatSkin,null);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
