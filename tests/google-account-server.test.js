import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStorage} from '../src/storage.js';
import {fresh} from '../src/game.js';
import {issueSession,tokenHash} from '../src/auth-session.js';

test('Google-only accounts can create a password after fresh Google login; changes revoke other sessions and deletion cleans identities',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'cyper-google-account-')),port=42000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
  let server,cookie,other,stale;const password='new-password-123',second='changed-password-123';
  const storage=await createStorage({directory,databaseUrl:'',production:false});
  await storage.transaction(async tx=>{
    const u={id:'google-user',username:'gg_testuser',identities:{google:{sub:'private-google-id'}},state:fresh()};
    u.state.credits=9876;u.state.name='Google Runner';tx.data.users.push(u);
    cookie=issueSession(tx.data,u,'google',false).split(';')[0];other=issueSession(tx.data,u,'google',false).split(';')[0];
    stale=issueSession(tx.data,u,'google',false).split(';')[0];tx.data.sessions[tokenHash(stale.split('=')[1])].authenticatedAt=Date.now()-6*60000;
    tx.data.oauthFlows={pendingLink:{linkUserId:u.id,expires:Date.now()+60000},readyGoogle:{identity:{sub:u.identities.google.sub},expires:Date.now()+60000}};tx.dirty=true;
  });await storage.close();
  const start=async()=>{
    server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),CYPER_DATA_DIR:directory,DATABASE_URL:'',NODE_ENV:'development',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});
    await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw new Error('Server startup failed');})]);
  };
  const stop=async()=>{if(server){const done=once(server,'exit');server.kill();await done;server=null;}};
  const request=async(route,body,session=cookie)=>{
    const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(session?{Cookie:session}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
  };
  try{
    await start();assert.deepEqual((await request('/api/auth/providers')).data,{google:{enabled:false,native:false}});
    assert.equal((await request('/api/auth/google/start')).status,503);
    assert.equal((await request('/api/login',{username:'gg_testuser',password})).status,401);
    const me=(await request('/api/me')).data;assert.deepEqual(me.user.auth,{password:false,google:true});assert.equal(me.user.username,'gg_testuser');assert(!JSON.stringify(me).includes('private-google-id'));
    for(const route of ['/api/rank','/api/world','/api/profile/google-user']){
      const publicData=JSON.stringify((await request(route,undefined,'')).data);
      assert(!publicData.includes('private-google-id'));assert(!publicData.includes('gg_testuser'));assert(!publicData.includes('"auth"'));
    }
    for(const route of ['/src/google-auth.js','/src/auth-session.js','/.env'])assert.equal((await request(route)).status,404);
    const body={newPassword:password,confirmPassword:password};
    assert.equal((await request('/api/account/password',body,stale)).status,403);
    assert.equal((await request('/api/account/password',{...body,confirmPassword:'different'})).status,400);
    assert.equal((await request('/api/account/delete',{password,confirm:true,confirmName:'Google Runner'})).status,403);
    const created=await request('/api/account/password',body);assert.equal(created.status,200);assert.equal(created.data.user.auth.password,true);assert.equal(created.data.state.credits,9876);
    assert.equal((await request('/api/me',undefined,other)).status,401);assert.equal((await request('/api/me',undefined,stale)).status,401);assert.equal((await request('/api/me')).status,200);
    let db=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8'));
    assert(!db.oauthFlows.pendingLink);assert(!db.oauthFlows.readyGoogle);assert.equal(db.users[0].identities.google.sub,'private-google-id');assert(!JSON.stringify(db).includes(password));
    const login=await request('/api/login',{username:'gg_testuser',password},'');assert.equal(login.status,200);assert.equal(login.data.user.id,'google-user');
    assert.equal((await request('/api/account/password',{currentPassword:'incorrect-password',newPassword:second,confirmPassword:second})).status,403);
    const changed=await request('/api/account/password',{currentPassword:password,newPassword:second,confirmPassword:second});assert.equal(changed.status,200);
    assert.equal((await request('/api/me',undefined,login.cookie)).status,401);
    await stop();await start();assert.equal((await request('/api/me')).status,200);
    assert.equal((await request('/api/login',{username:'gg_testuser',password},'')).status,401);
    assert.equal((await request('/api/login',{username:'gg_testuser',password:second},'')).status,200);
    assert.equal((await request('/api/account/delete',{password:second,confirm:true,confirmName:'Google Runner'})).status,200);
    assert.equal((await request('/api/me')).status,401);
    db=JSON.parse(await readFile(path.join(directory,'players.json'),'utf8'));assert.equal(db.users.length,0);assert.equal(Object.keys(db.sessions).length,0);assert(!JSON.stringify(db).includes('private-google-id'));
  }finally{await stop();await rm(directory,{recursive:true,force:true});}
});
