import test from 'node:test';
import assert from 'node:assert/strict';
import {configureNative,startGoogleLogin,handleGoogleReturn,cancelGoogleLogin,saveServerURL} from '../src/platform.js';

test('native Google opens system browser, ignores foreign links, redeems with an in-memory verifier and handles cancellation',async()=>{
  const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const flow='a'.repeat(43),code='b'.repeat(43),requests=[],browserCalls=[];let finishListener;
  configureNative({defaultURL:'https://game.example',name:'android',http:{request:async options=>{
    requests.push(options);
    const route=new URL(options.url).pathname;
    if(route.endsWith('/start'))return {status:200,data:{flow,url:'https://game.example/api/auth/google/start?flow='+flow}};
    if(route.endsWith('/finish'))return {status:200,data:{user:{id:'runner'},state:{name:'Google'}}};
    return {status:200,data:{cancelled:true}};
  }},browser:{addListener:async(_,cb)=>{finishListener=cb;return {remove:async()=>{}};},open:async options=>{browserCalls.push(options);},close:async()=>{finishListener?.();}}});
  const ready=async()=>{for(let i=0;i<20&&!browserCalls.length;i++)await new Promise(resolve=>setImmediate(resolve));assert(browserCalls.length);};
  try{
    let login=startGoogleLogin();await ready();
    const verifier=requests[0].data.verifier;assert.match(verifier,/^[A-Za-z0-9_-]{43}$/);
    assert(!browserCalls[0].url.includes(verifier));assert(![...values.values()].includes(verifier));
    for(const url of ['https://evil.example/auth/google?flow='+flow+'&code='+code,'com.kenz34a.cyperzero://auth/google?flow=foreign&code='+code])await handleGoogleReturn(url);
    assert(!requests.some(r=>r.url.endsWith('/finish')));
    await handleGoogleReturn('com.kenz34a.cyperzero://auth/google?flow='+flow+'&code='+code);
    assert.equal((await login).user.id,'runner');assert.deepEqual(requests.find(r=>r.url.endsWith('/finish')).data,{flow,verifier,code});
    await handleGoogleReturn('com.kenz34a.cyperzero://auth/google?flow='+flow+'&code='+code);
    assert.equal(requests.filter(r=>r.url.endsWith('/finish')).length,1);
    browserCalls.length=0;login=startGoogleLogin();const rejected=assert.rejects(login,/Đã hủy/);await ready();await cancelGoogleLogin();await rejected;
    assert(requests.some(r=>r.url.endsWith('/cancel')));
    saveServerURL('');await assert.rejects(startGoogleLogin(),/địa chỉ server HTTPS/);
  }finally{configureNative(null);delete globalThis.localStorage;}
});
