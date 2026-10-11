import test from 'node:test';
import assert from 'node:assert/strict';
import {appVersion} from '../src/settings.js';
import {checkForUpdates,platformStatus} from '../src/platform.js';
import {versionNoticeView} from '../src/platform-view.js';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),button=(label,action,id,disabled)=>`<button data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
test('version checks share a request, bypass cache and expose mismatched versions without touching saved game data',async()=>{
 const original=globalThis.fetch;let resolve,calls=[];
 try{
  globalThis.fetch=(path,options)=>{calls.push({path,options});return new Promise(r=>resolve=r);};
  const first=checkForUpdates(),second=checkForUpdates();assert.equal(first,second);assert(platformStatus().checkingUpdate);await Promise.resolve();assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/version');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.redirect,'error');
  resolve({ok:true,json:async()=>({version:appVersion})});assert((await first).includes(appVersion));assert.equal(platformStatus().serverVersion,appVersion);assert(!platformStatus().checkingUpdate);assert(versionNoticeView({esc,button,unsafeUpdate:false}).includes('hidden'));
  globalThis.fetch=async()=>({ok:true,json:async()=>({version:'0.21.0'})});await checkForUpdates();const html=versionNoticeView({esc,button,unsafeUpdate:false});assert(html.includes('server v0.21.0'));assert(!html.includes(' hidden'));assert(html.includes('platform-check'));
 }finally{globalThis.fetch=original;}
});
test('failed or malformed version probes remain retryable and never display an untrusted version',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [{ok:false},{ok:true,json:async()=>({version:'<img src=x onerror=alert(1)>'})}]){globalThis.fetch=async()=>response;assert((await checkForUpdates()).includes('Chưa kiểm tra'));assert.equal(platformStatus().serverVersion,null);assert(!platformStatus().checkingUpdate);}
  globalThis.fetch=()=>{throw new Error('offline');};await checkForUpdates();assert(!platformStatus().checkingUpdate);
  globalThis.fetch=async()=>({ok:true,json:async()=>({version:appVersion})});await checkForUpdates();assert.equal(platformStatus().serverVersion,appVersion);assert.equal(platformStatus().updateError,'');
 }finally{globalThis.fetch=original;}
});
