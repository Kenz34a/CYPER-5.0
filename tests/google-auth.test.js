import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {generateKeyPairSync, sign, randomBytes, createHash} from 'node:crypto';
import {googleConfig, createGoogleClient, verifyGoogleCode, createGoogleAuth} from '../src/google-auth.js';
import {createStorage} from '../src/storage.js';
import {fresh} from '../src/game.js';
import {passwordHash, issueSession, tokenHash} from '../src/auth-session.js';

const config = googleConfig({PUBLIC_URL:'https://game.example',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-only-secret'});
const random = () => randomBytes(32).toString('base64url');
const serializeUser = u => ({id:u.id,username:u.username,auth:{google:!!u.identities?.google,password:!!u.password}});
test('Google configuration stays optional and only accepts a canonical HTTPS origin or development loopback', () => {
  assert.equal(googleConfig({}), null);
  for (const PUBLIC_URL of ['http://game.example','https://user:secret@game.example','https://game.example/api','https://game.example/?x=1','javascript:alert(1)'])
    assert.equal(googleConfig({PUBLIC_URL,GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'secret'}),null);
  const local = {PUBLIC_URL:'http://localhost:3000',GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'secret'};
  assert.equal(googleConfig(local).native,false);
  assert.equal(googleConfig({...local,NODE_ENV:'production'}),null);
  const authURL = new URL(createGoogleClient(config).generateAuthUrl({scope:['openid','profile','email']}));
  assert.equal(authURL.hostname,'accounts.google.com');
  assert.equal(authURL.searchParams.get('redirect_uri'),config.redirectUri);
  assert(!authURL.href.includes(config.clientSecret));
});

test('official Google verifier checks the RSA signature, audience, issuer, expiry and our nonce', async () => {
  const {privateKey,publicKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  const client = createGoogleClient(config), now = Math.floor(Date.now()/1000), nonce = random();
  // Inject certificates, never replace verifyIdToken: real signature and claim validation runs here.
  client.getFederatedSignonCertsAsync = async () => ({certs:{test:publicKey.export({type:'spki',format:'pem'})}});
  const payload = {iss:'https://accounts.google.com',aud:config.clientId,sub:'google-subject',nonce,name:'Tên Google',iat:now,exp:now+3600};
  const jwt = p => {
    const value = [Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url'),Buffer.from(JSON.stringify(p)).toString('base64url')].join('.');
    return value+'.'+sign('RSA-SHA256',Buffer.from(value),privateKey).toString('base64url');
  };
  let idToken = jwt(payload);
  client.getToken = async options => {assert.equal(options.codeVerifier,'server-pkce');assert.equal(options.redirect_uri,config.redirectUri);return {tokens:{id_token:idToken}};};
  const flow = {nonce,codeVerifier:'server-pkce'};
  assert.equal((await verifyGoogleCode(client,config,flow,'authorization-code')).sub,payload.sub);
  for (const change of [{aud:'other-client'},{iss:'https://evil.example'},{exp:now-3600},{exp:now-1},{nonce:random()},{sub:''}]) {
    idToken=jwt({...payload,...change});await assert.rejects(verifyGoogleCode(client,config,flow,'code'));
  }
  idToken = jwt(payload).split('.');idToken[1]=Buffer.from(JSON.stringify({...payload,sub:'forged'})).toString('base64url');idToken=idToken.join('.');
  await assert.rejects(verifyGoogleCode(client,config,flow,'code'));
});

async function harness(t) {
  const directory = await mkdtemp(path.join(tmpdir(),'cyper-google-'));
  let storage = await createStorage({directory,databaseUrl:'',production:false});
  let calls=0;
  const profiles = new Map();
  const client = createGoogleClient(config);
  client.getToken = async ({code,codeVerifier}) => {
    calls++;const profile=profiles.get(code);
    if (!profile) throw new Error('Provider credentials must not appear in the response');
    assert.equal(codeVerifier,profile.verifier);return {tokens:{id_token:code}};
  };
  client.verifyIdToken = async ({idToken,audience}) => {
    assert.equal(audience,config.clientId);return {getPayload:()=>profiles.get(idToken).payload};
  };
  let handler = createGoogleAuth({storage,config,client,serializeUser});
  const server = createServer(async (req,res) => {
    try {
      if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;req.parsedBody=JSON.parse(body||'{}');}
      if(!await handler(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}
    } catch {res.writeHead(503);res.end();}
  }).listen(0,'127.0.0.1');
  await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{server.close();await once(server,'close');await storage.close();await rm(directory,{recursive:true,force:true});});
  const request=async(route,body,cookie)=>{
    const r=await fetch(base+route,{redirect:'manual',method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,location:r.headers.get('location'),cookies:r.headers.getSetCookie(),body:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
  };
  const read=()=>storage.transaction(async tx=>tx.data);
  const mutate=fn=>storage.transaction(async tx=>{fn(tx.data);tx.dirty=true;});
  const start=async prepared=>{
    const r=await request('/api/auth/google/start'+(prepared?'?flow='+prepared.flow:''));
    assert.equal(r.status,303);const url=new URL(r.location),id=url.searchParams.get('state');
    const f=(await read()).oauthFlows[id];
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('nonce'),f.nonce);
    assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(f.codeVerifier).digest('base64url'));
    assert(r.cookies[0].includes('HttpOnly; SameSite=Lax'));
    return {id,f,cookie:r.cookies[0].split(';')[0]};
  };
  const callback=async(flow,sub='google-1',extra={})=>{
    const code=random();profiles.set(code,{verifier:flow.f.codeVerifier,payload:{sub,nonce:flow.f.nonce,name:'same_name',exp:Math.floor(Date.now()/1000)+3600,email:'private@example.com',...extra}});
    return request('/api/auth/google/callback?state='+flow.id+'&code='+code,undefined,flow.cookie);
  };
  return {request,read,mutate,start,callback,calls:()=>calls,restart:async()=>{await storage.close();storage=await createStorage({directory,databaseUrl:'',production:false});handler=createGoogleAuth({storage,config,client,serializeUser});}};
}

test('web Google binds the browser, consumes state once, persists across restart and never merges matching names/emails', async t => {
  const h=await harness(t);
  await h.mutate(db=>db.users.push({id:'old',username:'same_name',state:fresh(),salt:'salt',password:passwordHash('old-password','salt')}));
  const flow=await h.start();await h.restart();
  const bad=await h.request('/api/auth/google/callback?state='+flow.id+'&code=invalid');
  assert.equal(new URL(bad.location).searchParams.get('auth_error'),'invalid');assert.equal(h.calls(),0);
  const result=await h.callback(flow);
  assert.equal(new URL(result.location).searchParams.get('auth'),'google');
  assert(result.cookies.some(c=>c.startsWith('cyper_session=')&&c.includes('HttpOnly; SameSite=Strict')&&c.includes('Secure')));
  const db=await h.read();assert.equal(db.users.length,2);assert(!db.users[1].password);assert.match(db.users[1].username,/^gg_[a-f0-9]{16}$/);
  assert.deepEqual(db.users[1].identities,{google:{sub:'google-1'}});
  assert(!JSON.stringify(db).includes('private@example.com'));assert(!db.oauthFlows[flow.id]);
  await h.callback(flow);assert.equal(h.calls(),1,'replay must not reach Google');
  await h.callback(await h.start());assert.equal((await h.read()).users.length,2,'same Google subject resolves to same character');
});

test('native redemption requires both app verifier and one-time browser grant, then is atomic under concurrent requests', async t=>{
  const h=await harness(t),verifier=random();
  const prepared=(await h.request('/api/auth/google/native/start',{verifier})).body;
  assert(!prepared.url.includes(verifier));
  const flow=await h.start(prepared),response=await h.callback(flow);
  assert.equal((await h.read()).users.length,0,'browser callback alone cannot mint a game account/session');
  const link=new URL(response.body.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'));
  assert.equal(link.protocol,'com.kenz34a.cyperzero:');const code=link.searchParams.get('code');assert.equal(code.length,43);
  assert(!response.body.includes(verifier));assert(!response.body.includes('cyper_session='));
  for(const body of [{flow:flow.id,verifier},{flow:flow.id,verifier,code:random()},{flow:flow.id,verifier:random(),code}])
    assert.equal((await h.request('/api/auth/google/native/finish',body)).status,400);
  const results=await Promise.all([h.request('/api/auth/google/native/finish',{flow:flow.id,verifier,code}),h.request('/api/auth/google/native/finish',{flow:flow.id,verifier,code})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);const success=results.find(r=>r.status===200);
  assert.deepEqual(success.body.user.auth,{google:true,password:false});assert(!JSON.stringify(success.body).includes('google-1'));
  assert.equal((await h.read()).users.length,1);assert.equal(Object.keys((await h.read()).sessions).length,1);
});

test('linking requires password and a live original session, preserves progress, and rejects another character’s Google',async t=>{
  const h=await harness(t);let cookie;
  await h.mutate(db=>{const u={id:'old',username:'old_name',state:fresh(),salt:'salt',password:passwordHash('old-password','salt')};u.state.credits=12345;db.users.push(u);cookie=issueSession(db,u).split(';')[0];});
  assert.equal((await h.request('/api/auth/google/link/start',{password:'wrong-password'},cookie)).status,403);
  const prepare=async()=> (await h.request('/api/auth/google/link/start',{password:'old-password'},cookie)).body;
  const linked=await h.callback(await h.start(await prepare()));
  assert.equal(new URL(linked.location).searchParams.get('auth'),'google');let db=await h.read();assert.equal(db.users.length,1);assert.equal(db.users[0].state.credits,12345);
  assert.equal(db.users[0].identities.google.sub,'google-1');assert(db.users[0].password);
  await h.mutate(db=>db.users.push({id:'another',username:'another',state:fresh(),identities:{google:{sub:'different-google'}}}));
  const conflict=await h.callback(await h.start(await prepare()),'different-google');assert.equal(new URL(conflict.location).searchParams.get('auth_error'),'conflict');
  const pending=await h.start(await prepare());await h.mutate(db=>delete db.sessions[tokenHash(cookie.split('=')[1])]);
  const revoked=await h.callback(pending);assert.equal(new URL(revoked.location).searchParams.get('auth_error'),'session');
  db=await h.read();assert.equal(db.users[0].identities.google.sub,'google-1');assert.equal(db.users[0].state.credits,12345);
});

test('cancellation, expiry, provider failure, bans and maintenance cannot create a session',async t=>{
  const h=await harness(t);
  let f=await h.start();let r=await h.request('/api/auth/google/callback?state='+f.id+'&error=access_denied',undefined,f.cookie);
  assert.equal(new URL(r.location).searchParams.get('auth_error'),'denied');assert.equal(h.calls(),0);
  f=await h.start();r=await h.request('/api/auth/google/callback?state='+f.id+'&code=bad',undefined,f.cookie);
  assert.equal(new URL(r.location).searchParams.get('auth_error'),'unavailable');assert(!JSON.stringify(r).includes('Provider credentials'));
  f=await h.start();await h.mutate(db=>db.oauthFlows[f.id].expires=Date.now()-1);r=await h.callback(f);
  assert.equal(new URL(r.location).searchParams.get('auth_error'),'invalid');
  await h.mutate(db=>{db.management={maintenance:true};});
  r=await h.callback(await h.start());assert.equal(new URL(r.location).searchParams.get('auth_error'),'maintenance');
  await h.mutate(db=>{db.management.maintenance=false;db.users.push({id:'banned',username:'banned',state:fresh(),identities:{google:{sub:'banned-google'}},moderation:{ban:{until:Date.now()+60000}}});});
  r=await h.callback(await h.start(),'banned-google');assert.equal(new URL(r.location).searchParams.get('auth_error'),'banned');
  const verifier=random(),prepared=(await h.request('/api/auth/google/native/start',{verifier})).body;
  assert.equal((await h.request('/api/auth/google/native/cancel',{flow:prepared.flow,verifier:random()})).status,400);
  assert.equal((await h.request('/api/auth/google/native/cancel',{flow:prepared.flow,verifier})).status,200);
  assert.equal((await h.request('/api/auth/google/native/finish',{flow:prepared.flow,verifier,code:random()})).status,400);
  assert.equal(Object.keys((await h.read()).sessions||{}).length,0);
});
