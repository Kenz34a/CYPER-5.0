import {activity,record} from './journal.js';
import {stacks,addStack} from './inventory-state.js';
import {gear} from './content.js';
import {moduleTypes,moduleItem,fittedModuleStats} from './modules.js';

export const modules=moduleTypes.filter(v=>!v.newOnly).map(v=>({...v,label:moduleItem(v.id).label}));
export function calibration(s,id){return s.calibration?.[id]||{level:0,modules:[]};}
export function slots(s,id){return 1+Math.floor(calibration(s,id).level/2);}
export function upgradeCost(s,id){const g=gear.find(g=>g.id===id);return g?Math.ceil(g.price*0.5)+calibration(s,id).level*40:0;}
export function itemStats(s,id){
  const g=gear.find(g=>g.id===id);if(!g)return {power:0,critDamage:0,health:0,damage:0,armor:0,crit:0,quality:0,shield:0,stun:0,regen:0,escape:0,pocket:0};
  const c=calibration(s,id),mods=fittedModuleStats(c.modules);
  return {power:g.power+c.level*2,critDamage:mods.critDamage||0,health:(g.health||0)+(mods.health||0),damage:(mods.damage||0),armor:(mods.armor||0),crit:(mods.crit||0),shield:(g.shield||0)+(mods.shield||0),stun:(mods.stun||0),regen:(g.regen||0)+(mods.regen||0),escape:g.escape||0,pocket:(g.pocket||0)+(mods.pocket||0),quality:Math.min(100,70+g.rarity*5+c.level*2)};
}
export function upgrade(s,id){
  const g=gear.find(g=>g.id===id),c=calibration(s,id),cost=upgradeCost(s,id);
  if(s.work||s.combat||!g||!s.inventory.includes(id)||g.level>s.level||c.level>=5||s.credits<cost)return false;
  s.credits-=cost;s.calibration??={};s.calibration[id]={level:c.level+1,modules:[...c.modules]};activity(s,'calibrations');record(s,`Nâng cấp ${g.name} +${c.level+1}.`);return true;
}
export function installModule(s,id,index,moduleId){
  const g=gear.find(g=>g.id===id),m=moduleItem(moduleId),c=calibration(s,id);
  if(s.work||s.combat||!g||!m||!s.inventory.includes(id)||g.level>s.level||!Number.isInteger(index)||index<0||index>=slots(s,id)||c.modules[index]===m.fittedId||m.level>g.level||m.level>s.level||(!m.legacy&&!(stacks(s)[m.id]>0))||(m.legacy&&s.credits<m.price&&!(stacks(s)[m.id]>0)))return false;
  if(stacks(s)[m.id]>0){s.stacks??={...stacks(s)};s.stacks[m.id]--;}else s.credits-=m.price;s.calibration??={};const fitted=[...c.modules];fitted[index]=m.fittedId;s.calibration[id]={level:c.level,modules:fitted};
  clampVitals(s);return true;
}

export function clampVitals(s){s.hp=Math.min(s.hp,90+s.level*10+Object.values(s.equipped).reduce((n,id)=>n+itemStats(s,id).health,0));if(s.shield!==undefined)s.shield=Math.min(s.shield,Object.values(s.equipped).reduce((n,id)=>n+itemStats(s,id).shield,0));}
export function removeModule(s,id,index){
 const c=calibration(s,id),module=moduleItem(c.modules[index]);
 if(s.work||s.combat||s.dungeon||!s.inventory.includes(id)||!Number.isInteger(index)||index<0||index>=slots(s,id)||!module)return false;
 const draft=structuredClone(s),fitted=[...c.modules];fitted[index]=null;(draft.calibration??={})[id]={level:c.level,modules:fitted};
 if(!addStack(draft,module.id))return false;
 Object.assign(s,draft);clampVitals(s);record(s,'Đã tháo module: '+module.name);return true;
}
