import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startFight,turn} from '../src/game.js';
import {settings,settingsAction,appVersion} from '../src/settings.js';
import {assetAction,publicAssets} from '../src/assets.js';
import {worldAction,worldView,initWorld} from '../src/world.js';
import {removeAccountData} from '../src/account-data.js';
import {createAudio} from '../src/audio.js';
test('settings validate atomically and change presentation/privacy without spending gameplay resources',()=>{
 const s=fresh(),original=structuredClone(s);for(const values of [{credits:999},{music:'false'},{uiSize:'huge'},{language:'xx'},{musicVolume:-1},{musicVolume:101},{musicVolume:1.5},{translateChat:true},{showOriginal:false},{__proto__:null,unknown:true},[]]){assert(!settingsAction(s,{action:'settings',values}));assert.deepEqual(s,original);}
 assert(settingsAction(s,{action:'settings',values:{language:'en',uiSize:'large',music:true,musicVolume:0,hideHandler:true,privateBadges:false,disableTutorial:true,hideUpdates:true}}));assert.equal(settings(s).musicVolume,0);assert.equal(s.privacy.badges,true);assert.equal(publicAssets(s).name,'Runner ẩn danh');assert.equal(s.credits,original.credits);assert.equal(s.energy,original.energy);assert.equal(s.xp,original.xp);
 assert(assetAction(s,{action:'privacy',id:'badges',visible:false}));assert.equal(settings(s).privateBadges,true);assert(settingsAction(s,{action:'tutorial-dismiss'}));assert(settingsAction(s,{action:'updates-dismiss'}));assert.equal(s.seenUpdateVersion,appVersion);
});
test('donation privacy hides contributor details while retaining totals and discounts; combat settings cannot alter damage/rewards',()=>{
 const a={id:'a',state:fresh()},db={users:[a]};initWorld(db);assert(worldAction(db,a,{action:'donate',id:'global',amount:10}));assert.equal(worldView(db,a).funds[0].contributors.length,1);assert(settingsAction(a.state,{action:'settings',values:{hideDonations:true}}));const fund=worldView(db,a).funds[0];assert.equal(fund.total,10);assert.deepEqual(fund.contributors,[]);
 const s=fresh(),t=fresh();settingsAction(t,{action:'settings',values:{disableVictory:true,hideDamageMeter:true}});for(const player of [s,t]){assert(startFight(player));assert(turn(player,'attack',()=>1));assert.equal(player.lastHit.damage,13);player.combat.currentHp=1;assert(turn(player,'attack',()=>1));assert.equal(player.lastVictory.name,'Drone truy sát / 1');assert.equal(player.lastVictory.credits,15);assert.equal(player.lastVictory.xp,12);}assert.equal(s.credits,t.credits);assert.equal(s.hp,t.hp);assert.equal(s.xp,t.xp);
});
test('account cleanup preserves other players/items, transfers corporation leadership and removes private messages and dangling quotes',()=>{
 const a={id:'a',corporation:'guild',state:fresh()},b={id:'b',corporation:'guild',state:fresh(),commended:{day:'2026-10-09',id:'a'}};const db={users:[a,b],market:[{id:'one',seller:'a'},{id:'two',seller:'b'}],mail:[{sender:'a',recipient:'b',text:'secret'},{sender:'b',recipient:'c',text:'keep'}],messages:[{id:'m1',author:'a',text:'secret'},{id:'m2',author:'b',reply:{id:'m1',text:'secret'},text:'keep'}],corporations:[{id:'guild',leader:'a'}],community:{donations:{global:{a:100,b:20}}}};
 const next=removeAccountData(db,'a');assert.equal(db.users.length,2);assert.deepEqual(next.users.map(v=>v.id),['b']);assert.equal(next.corporations[0].leader,'b');assert.deepEqual(next.market,[{id:'two',seller:'b'}]);assert.equal(next.mail.length,1);assert.equal(next.messages[0].reply,undefined);assert.equal(next.users[0].commended.day,'2026-10-09');assert.equal(next.users[0].commended.id,null);assert.equal(next.community.donations.global.a,100);
 assert.equal(removeAccountData(next,'b').corporations.length,0);
});
test('audio respects mute, volume and category flags with one audio context',async()=>{
 const oldContext=globalThis.AudioContext,oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval;let contexts=0,tones=0,scheduled;const gains=[];
 class Context{constructor(){contexts++;this.state='running';this.currentTime=0;this.destination={};}createGain(){const gain={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};gains.push(gain);return {gain,connect(){}};}createOscillator(){return {type:'',frequency:{value:0},connect(){},start(){tones++;},stop(){}};}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}}
 try{globalThis.AudioContext=Context;globalThis.setInterval=fn=>{scheduled=fn;return 1;};globalThis.clearInterval=()=>{scheduled=null;};const audio=createAudio();audio.configure({music:false,musicVolume:65,soundEffects:false,soundMail:true});await audio.unlock();await audio.unlock();assert.equal(contexts,1);audio.play('effect');assert.equal(tones,0);audio.play('mail');assert.equal(tones,1);audio.configure({music:true,musicVolume:25});assert.equal(gains[0].value,.25);assert.equal(tones,4);audio.configure({music:false,musicVolume:25});assert.equal(gains[0].value,0);assert.equal(scheduled,null);audio.dispose();}finally{globalThis.AudioContext=oldContext;globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;}
});
