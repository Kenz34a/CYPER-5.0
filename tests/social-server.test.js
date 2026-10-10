import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
test('social API persists consent, serialized gifts/trades, privacy and admin reports across restart',{timeout:30000},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cyper-social-')),port=54000+Math.floor(Math.random()*500),base=`http://127.0.0.1:${port}`,env={...process.env,CYPER_DATA_DIR:directory,DATABASE_URL:'',NODE_ENV:'development',PORT:String(port)};
 let server;
 async function start(){server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});}
 async function stop(){if(server){const done=once(server,'exit');server.kill();await done;server=null;}}
 async function req(route,data,cookie,headers={}){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...headers,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:await r.json()};}
 const password='social-api-test-password',accounts=[];
 try{
  await start();for(const username of ['social_alpha','social_beta','social_admin'])accounts.push(await req('/api/register',{username,password}));const [a,b,c]=accounts,aid=a.data.user.id,bid=b.data.user.id;
  await stop();const file=path.join(directory,'players.json'),db=JSON.parse(await readFile(file,'utf8'));db.users[0].state.inventory.push('gear3');db.users[0].state.calibration={gear3:{level:2,modules:['health']}};db.users[1].state.inventory.push('gear4');db.users[2].role='admin';await writeFile(file,JSON.stringify(db));await start();
  const act=(payload,cookie=a.cookie)=>req('/api/action',payload,cookie),view=async cookie=>(await req('/api/world',null,cookie)).data;
  assert.equal((await fetch(base+'/src/social.js')).status,404);assert.equal((await req('/api/profile/'+bid)).data.profile.relation,null);assert.equal((await view()).social,null);
  assert.equal((await act({action:'social-request',target:bid,kind:'friend',friends:[bid]})).status,200);let request=(await view(a.cookie)).social.requests[0];assert.equal((await view(c.cookie)).social.requests.length,0);assert.equal((await act({action:'social-accept',id:request.id},c.cookie)).status,400);assert.equal((await act({action:'social-accept',id:request.id},b.cookie)).status,200);
  const gift={action:'social-gift',target:bid,item:'field:credits',amount:10,requestId:randomUUID(),issuedAt:Date.now()};const retries=await Promise.all([act(gift),act(gift)]);assert(retries.every(v=>v.status===200));assert.equal((await req('/api/me',null,a.cookie)).data.state.credits,170);assert.equal((await req('/api/me',null,b.cookie)).data.state.credits,190);
  assert.equal((await act({...gift,amount:20})).status,400);assert.equal((await act({...gift,requestId:randomUUID(),item:'field:units'})).status,400);assert.equal((await req('/api/action',{...gift,requestId:randomUUID()},a.cookie,{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await act({action:'privacy',id:'skills',visible:false},b.cookie)).status,200);assert.equal((await act({action:'privacy',id:'equipment',visible:false},b.cookie)).status,200);const hidden=(await req('/api/profile/'+bid,null,a.cookie)).data.profile;assert.equal(hidden.skills,null);assert.equal(hidden.equipment,null);assert.equal(hidden.credits,undefined);
  assert.equal((await act({action:'social-trade-create',target:bid,gear:'gear3',wanted:'gear4',price:40})).status,200);const trade=(await view(b.cookie)).social.trades[0];assert.equal((await view(c.cookie)).social.trades.length,0);
  await stop();await start();assert.equal((await act(gift)).status,200);assert.equal((await req('/api/me',null,a.cookie)).data.state.credits,170);assert.equal((await view(b.cookie)).social.friends[0].id,aid);
  const accepted=await Promise.all([act({action:'social-trade-accept',id:trade.id},b.cookie),act({action:'social-trade-accept',id:trade.id},b.cookie)]);assert.deepEqual(accepted.map(v=>v.status).sort(),[200,400]);assert.equal((await req('/api/me',null,a.cookie)).data.state.credits,210);const bs=(await req('/api/me',null,b.cookie)).data.state;assert.equal(bs.credits,150);assert.deepEqual(bs.calibration.gear3,{level:2,modules:['health']});
  assert.equal((await act({action:'social-report',target:bid,category:'abuse',reason:'Báo cáo test riêng tư'})).status,200);const report=(await view(a.cookie)).social.reports[0];assert.equal((await req('/api/admin?section=reports',null,a.cookie)).status,403);const admin=(await req('/api/admin?section=reports',null,c.cookie)).data;assert.equal(admin.reports[0].id,report.id);assert.equal(admin.stats.reports,1);
  const resolution={action:'report-dismiss',id:report.id,password,confirm:true,reason:'Đã kiểm tra nội dung',requestId:randomUUID(),issuedAt:Date.now()};assert.equal((await req('/api/admin/action',{...resolution,password:'wrong-password'},c.cookie)).status,403);assert.equal((await req('/api/admin/action',resolution,c.cookie)).status,200);assert.equal((await view(a.cookie)).social.reports[0].status,'dismissed');assert.equal((await req('/api/me',null,b.cookie)).status,200);
  assert.equal((await act({action:'social-block',id:bid})).status,200);assert.equal((await act({action:'mail-send',id:aid,text:'blocked'},b.cookie)).status,400);assert.equal((await view(b.cookie)).social.friends.length,0);
  await stop();await start();assert.equal((await view(a.cookie)).social.blocked[0].id,bid);assert.equal((await act({action:'social-unblock',id:bid})).status,200);assert.equal((await act({action:'mail-send',id:aid,text:'allowed'},b.cookie)).status,200);
 }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
