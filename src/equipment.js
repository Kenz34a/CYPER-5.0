import {activity,record} from './journal.js';
import {stacks,addStack} from './inventory-state.js';
import {gear} from './content.js';

export const modules = [
  {id:'damage',name:'Lõi xung kích',label:'Sát thương +3',price:60},
  {id:'health',name:'Mạch sinh học',label:'Sinh lực +15',price:65},
  {id:'armor',name:'Lưới phòng thủ',label:'Phòng thủ +3',price:60},
  {id:'crit',name:'Bộ ngắm lượng tử',label:'Chí mạng +2%',price:80},
  {id:'shield',name:'Mạch khiên',label:'Khiên +20',price:75},
  {id:'stun',name:'Lõi gây choáng',label:'Choáng +5%',price:90},
  {id:'regen',name:'Mạch tái sinh',label:'Hồi HP +2/lượt',price:80},
  {id:'pocket',name:'Khoang mở rộng',label:'Túi +2 ô',price:100},
];
export function calibration(s,id){return s.calibration?.[id]||{level:0,modules:[]};}
export function slots(s,id){return 1+Math.floor(calibration(s,id).level/2);}
export function upgradeCost(s,id){const g=gear.find(g=>g.id===id);return g?Math.ceil(g.price*0.5)+calibration(s,id).level*40:0;}
export function itemStats(s,id){
  const g=gear.find(g=>g.id===id);if(!g)return {power:0,health:0,damage:0,armor:0,crit:0,quality:0,shield:0,stun:0,regen:0,escape:0,pocket:0};
  const c=calibration(s,id),count=type=>c.modules.filter(m=>m===type).length;
  return {power:g.power+c.level*2,health:(g.health||0)+count('health')*15,damage:count('damage')*3,armor:count('armor')*3,crit:count('crit')*0.02,shield:(g.shield||0)+count('shield')*20,stun:count('stun')*.05,regen:(g.regen||0)+count('regen')*2,escape:g.escape||0,pocket:(g.pocket||0)+count('pocket')*2,quality:Math.min(100,70+g.rarity*5+c.level*2)};
}
export function upgrade(s,id){
  const g=gear.find(g=>g.id===id),c=calibration(s,id),cost=upgradeCost(s,id);
  if(s.work||s.combat||!g||!s.inventory.includes(id)||g.level>s.level||c.level>=5||s.credits<cost)return false;
  s.credits-=cost;s.calibration??={};s.calibration[id]={level:c.level+1,modules:[...c.modules]};activity(s,'calibrations');record(s,`Nâng cấp ${g.name} +${c.level+1}.`);return true;
}
export function installModule(s,id,index,moduleId){
  const g=gear.find(g=>g.id===id),m=modules.find(m=>m.id===moduleId),c=calibration(s,id);
  if(s.work||s.combat||!g||!m||!s.inventory.includes(id)||g.level>s.level||!Number.isInteger(index)||index<0||index>=slots(s,id)||c.modules[index]===moduleId||s.credits<m.price&&!(stacks(s)['mod-'+moduleId]>0))return false;
  if(stacks(s)['mod-'+moduleId]>0){s.stacks??={...stacks(s)};s.stacks['mod-'+moduleId]--;}else s.credits-=m.price;s.calibration??={};const fitted=[...c.modules];fitted[index]=moduleId;s.calibration[id]={level:c.level,modules:fitted};
  clampVitals(s);return true;
}

export function clampVitals(s){s.hp=Math.min(s.hp,90+s.level*10+Object.values(s.equipped).reduce((n,id)=>n+itemStats(s,id).health,0));if(s.shield!==undefined)s.shield=Math.min(s.shield,Object.values(s.equipped).reduce((n,id)=>n+itemStats(s,id).shield,0));}
export function removeModule(s,id,index){
 const c=calibration(s,id),module=c.modules[index];
 if(s.work||s.combat||s.dungeon||!s.inventory.includes(id)||!Number.isInteger(index)||index<0||index>=slots(s,id)||!modules.some(v=>v.id===module))return false;
 const draft=structuredClone(s),fitted=[...c.modules];fitted[index]=null;(draft.calibration??={})[id]={level:c.level,modules:fitted};
 if(!addStack(draft,'mod-'+module))return false;
 Object.assign(s,draft);clampVitals(s);record(s,'Đã tháo module: '+modules.find(v=>v.id===module).name);return true;
}
