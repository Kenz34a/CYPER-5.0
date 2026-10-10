import {equipmentSlots,enemyProfile,markBonus,absorbShield} from './gear-rules.js';
import {stacks} from './inventory-state.js';
import {areaAccess} from './rail.js';
import {bagSize,bagCapacity,ownsGear,receiveGear,receiveStack,blueprintDrop} from './inventory-state.js';
import {record,activity} from './journal.js';
import {pveKills} from './achievements.js';
import {gear,maps,enemies,bosses,quests} from './content.js';
import {itemStats} from './equipment.js';
import {resolveDungeonCombat} from './dungeon-layout.js';
export function fresh(){return{version:1,railVersion:1,keyFragments:{},railKeys:[],createdAt:new Date().toISOString(),name:'Runner',level:1,xp:0,credits:180,units:3,scrap:6,bank:0,hp:100,energy:30,map:'map0',inventory:['gear0','gear1'],equipped:{weapon:'gear0',armor:'gear1',implant:null},active:[],completed:[],progress:{},wins:0,losses:0,kills:0,combat:null,log:['Kết nối thành công. Chào mừng đến thành phố tro.']};}
export function stats(s){
 const weapon=itemStats(s,s.equipped.weapon),armor=itemStats(s,s.equipped.armor),implant=itemStats(s,s.equipped.implant),special=itemStats(s,s.equipped.special),destructive=itemStats(s,s.equipped.destructive);
 const fitted=equipmentSlots.map(k=>itemStats(s,s.equipped[k])),sum=k=>fitted.reduce((n,g)=>n+(g[k]||0),0),extraArmor=['helmet','legs','boots'].reduce((n,k)=>n+itemStats(s,s.equipped[k]).power,0);
 const buffs=(s.buffs||[]).filter(b=>b.expiresAt>Date.now()),mult=k=>1+buffs.filter(b=>b.kind===k).reduce((n,b)=>n+b.value,0),attack=8+s.level*2+weapon.power+Math.floor(implant.power/2)+sum('damage');
 return {maxHp:90+s.level*10+sum('health'),attack:Math.floor(attack*mult('attack')),specialAttack:s.equipped.special?Math.floor((8+s.level*2+special.power+sum('damage'))*mult('attack')):0,destructiveAttack:s.equipped.destructive?Math.floor((8+s.level*2+destructive.power+sum('damage'))*mult('attack')):0,defense:Math.floor((2+s.level+armor.power+extraArmor+sum('armor'))*mult('defense')),crit:Math.min(.5,.15+sum('crit')),maxShield:Math.floor(sum('shield')*mult('shield')),stun:Math.min(.5,sum('stun')),regen:sum('regen'),escape:Math.min(1,.75+sum('escape')),maxEnergy:30};
}
export function note(s,t){record(s,t);if(s.combat){(s.combat.log??=[]).unshift(t);s.combat.log=s.combat.log.slice(0,16);}}
export function gain(s,xp){s.xp+=xp;while(s.xp>=s.level*60){s.xp-=s.level*60;s.level++;s.hp=stats(s).maxHp;s.energy=30;note(s,`Lên cấp ${s.level}! Sinh lực và năng lượng hồi đầy.`);}}
export function move(s,id){const m=maps.find(m=>m.id===id);if(s.work||s.dungeon||s.combat||!m||!areaAccess(s,m)||m.level>s.level+2||s.energy<1)return false;s.map=id;s.energy--;note(s,`Đã đến ${m.name}.`);return true;}
export function startFight(s,type='enemy',inDungeon=false,variant='plain'){
 if(s.dungeon&&!inDungeon)return false;if(s.work||s.combat||s.hp<=0||s.energy<2)return false;
 const foe=enemyProfile((type==='boss'?bosses:enemies).find(e=>e.map===s.map),variant);if(!foe)return false;
 s.energy-=2;s.shield=stats(s).maxShield;s.lastHit=null;s.combat={...foe,turn:0,pvp:false};note(s,`Chạm trán ${foe.name}.`);return true;
}
export function pvp(s){if(s.work||s.dungeon||s.combat||s.hp<=0||s.energy<3)return false;s.energy-=3;s.shield=stats(s).maxShield;s.lastHit=null;const lv=Math.max(1,s.level+(s.wins%3)-1);s.combat={id:'arena',name:['Ghost','Raven','Kite','Circuit'][s.wins%4],level:lv,hp:65+lv*10,currentHp:65+lv*10,attack:6+lv*3,defense:2+lv,xp:20+lv*4,credits:30+lv*10,turn:0,pvp:true};return true;}
export function turn(s,action,random=Math.random,{rewards=true}={}){
 const f=s.combat;if(!f||!['attack','skill','special','destructive','heal','escape','consumable'].includes(action))return false;
 const st=stats(s),bonus=f.pvp?{attack:1,incoming:1}:markBonus(s,f.faction);let stunned=false,escapedFailed=false;
 if(action==='escape'){
  if(s.dungeon?.mode&&s.dungeon.mode!=='normal'&&random()>=st.escape){escapedFailed=true;note(s,'Rút lui thất bại; đối thủ phản công.');}
  else{resolveDungeonCombat(s,f,'escape');s.combat=null;note(s,'Bạn rút lui.');return true;}
 }
 if(action==='heal'){if(s.credits<25)return false;s.credits-=25;s.hp=Math.min(st.maxHp,s.hp+45);activity(s,'heals');note(s,'Tiêm thuốc: +45 HP.');}
 else if(action!=='consumable'&&!escapedFailed){
  if(action==='skill'&&s.energy<3)return false;
  const ammo=action==='special'?'energy-cell':action==='destructive'?'antimatter':null;
  if(ammo&&(!s.equipped[action]||!(stacks(s)[ammo]>0)))return false;
  if(action==='skill')s.energy-=3;if(ammo){s.stacks??={...stacks(s)};s.stacks[ammo]--;}
  const crit=random()<st.crit,power=action==='special'?st.specialAttack:action==='destructive'?st.destructiveAttack:st.attack;
  const damage=Math.max(1,Math.floor(power*(action==='skill'?1.8:1)*(crit?1.5:1)*bonus.attack)-f.defense),hit=absorbShield(damage,f.currentShield,action==='special'?1.2:action==='destructive'?.5:1);
  f.currentShield=hit.shield;f.currentHp-=hit.healthDamage;
  stunned=st.stun>0&&random()<st.stun*(1-(f.stunEvade||0));
  s.lastHit={damage,shieldDamage:hit.shieldDamage,healthDamage:hit.healthDamage,critical:crit,name:f.name,maxHp:f.hp,time:Date.now()};
  note(s,`${({attack:'Tấn công',skill:'Xung điện',special:'Vũ khí đặc biệt',destructive:'Vũ khí hủy diệt'})[action]}${crit?' chí mạng':''}: ${hit.healthDamage} HP${hit.shieldDamage?` / ${hit.shieldDamage} khiên`:''}${stunned?' · gây choáng':''}.`);
 }
if(f.currentHp<=0){resolveDungeonCombat(s,f,'victory');if(rewards)awardVictory(s,f,random);s.combat=null;return true;}
 s.shield=Math.min(s.shield||0,st.maxShield);f.turn++;
 if(!stunned){const damage=Math.max(1,Math.floor(f.attack*(f.boss&&f.turn%3===0?2:1)*bonus.incoming)-Math.floor(st.defense/2)),hit=absorbShield(damage,s.shield);s.shield=hit.shield;s.hp=Math.max(0,s.hp-hit.healthDamage);note(s,`${f.name} gây ${hit.healthDamage} HP${hit.shieldDamage?` / ${hit.shieldDamage} khiên`:''}.`);}
 else note(s,'Đối thủ bị choáng và bỏ lượt phản công.');
 if(s.hp===0){resolveDungeonCombat(s,f,'defeat');if(f.pvp)s.losses++;s.credits=Math.max(0,s.credits-Math.floor(s.credits*.1));s.hp=Math.ceil(st.maxHp*.5);s.shield=0;s.combat=null;note(s,'Bạn được cứu về trạm y tế. Mất 10% credits, hồi 50% HP.');}
 else if(st.regen){const healed=Math.min(st.regen,st.maxHp-s.hp);s.hp+=healed;if(healed)note(s,`Tái sinh: +${healed} HP.`);}
 return true;
}
export function shopPrice(item,discount=0){return Math.ceil(item.price*(1-Math.max(0,Math.min(.1,discount))));}
export function buy(s,id,black=false,discount=0){const item=gear.find(g=>g.id===id);if(s.combat||!item||bagSize(s)>=bagCapacity(s)||item.black!==black||ownsGear(s,id)||s.credits<shopPrice(item,discount)||item.level>s.level)return false;s.credits-=shopPrice(item,discount);s.inventory.push(id);activity(s,'trades');note(s,`Mua ${item.name}.`);return true;}
export function equip(s,id){const g=gear.find(g=>g.id===id);if(s.combat||!g||!s.inventory.includes(id)||g.level>s.level)return false;s.equipped[g.slot]=id;s.hp=Math.min(s.hp,stats(s).maxHp);return true;}
export function sell(s,id){const g=gear.find(g=>g.id===id);if(s.combat||!g||!s.inventory.includes(id)||Object.values(s.equipped).includes(id))return false;s.inventory=s.inventory.filter(x=>x!==id);if(s.calibration)delete s.calibration[id];s.hp=Math.min(s.hp,stats(s).maxHp);s.credits+=Math.floor(g.price*0.4);activity(s,'trades');return true;}
export function accept(s,id){const q=quests.find(q=>q.id===id);if(!q||q.level>s.level+2||s.active.includes(id)||s.completed.includes(id)||s.active.length>=5)return false;s.active.push(id);s.progress[`start:${id}`]=s.progress[`${q.map}:${q.target}`]||0;return true;}
export function questProgress(s,q){return Math.min(q.count,Math.max(0,(s.progress[`${q.map}:${q.target}`]||0)-(s.progress[`start:${q.id}`]||0)));}
export function claim(s,id){const q=quests.find(q=>q.id===id);if(s.work||s.combat||!q||!s.active.includes(id)||questProgress(s,q)<q.count)return false;s.active=s.active.filter(x=>x!==id);s.completed.push(id);s.credits+=q.credits;gain(s,q.xp);note(s,`Hoàn thành ${q.name}.`);return true;}
export function rest(s){if(s.work||s.dungeon||s.combat)return false;s.hp=stats(s).maxHp;s.energy=30;note(s,'Nghỉ tại trạm an toàn. HP và năng lượng hồi đầy.');return true;}

export function awardVictory(s,f,random=Math.random){s.credits+=f.credits;gain(s,f.xp);s.kills++;s.lastVictory={id:String(s.kills)+':'+Date.now(),name:f.name,xp:f.xp,credits:f.credits,pvp:f.pvp};if(f.pvp)s.wins++;else{s.scrap=(s.scrap??6)+(f.boss?3:1);const key=`${s.map}:${f.boss?'boss':'enemy'}`;s.progress[key]=(s.progress[key]||0)+1;if(f.boss){receiveStack(s,'balm',3);note(s,'Chiến lợi phẩm: 3 thuốc giảm đau; túi đầy sẽ gửi vào hộp thư.');s.hashProcessors=(s.hashProcessors||0)+1;note(s,'Nhặt được 1 bộ xử lý Hash.');if(s.map==='map19')note(s,'Thu được Chìa khóa bí mật Neon.');}if(pveKills(s)%3===0){blueprintDrop(s,equipmentSlots[Math.floor(pveKills(s)/3)%equipmentSlots.length],Math.min(5,Math.floor(Number(s.map.slice(3))/8)));s.aiCores=(s.aiCores||0)+1;note(s,'Nhặt được 1 lõi AI.');}const pool=gear.filter(g=>g.level<=s.level+2);if(random()<0.45&&pool.length){const item=pool[Math.floor(random()*pool.length)];if(receiveGear(s,item.id)){note(s,`${s.itemInbox?.includes(item.id)?'Túi đầy, gửi vào hộp thư:':'Nhặt được'} ${item.name}.`);}}}note(s,`Hạ ${f.name}: +${f.xp} XP, +${f.credits}₡.`);}
