import {activity,record} from './journal.js';
import {gear} from './content.js';

export const modules = [
  {id:'damage',name:'Lõi xung kích',label:'Sát thương +3',price:60},
  {id:'health',name:'Mạch sinh học',label:'Sinh lực +15',price:65},
  {id:'armor',name:'Lưới phòng thủ',label:'Phòng thủ +3',price:60},
  {id:'crit',name:'Bộ ngắm lượng tử',label:'Chí mạng +2%',price:80},
];
export function calibration(s,id){return s.calibration?.[id]||{level:0,modules:[]};}
export function slots(s,id){return 1+Math.floor(calibration(s,id).level/2);}
export function upgradeCost(s,id){const g=gear.find(g=>g.id===id);return g?Math.ceil(g.price*0.5)+calibration(s,id).level*40:0;}
export function itemStats(s,id){
  const g=gear.find(g=>g.id===id);if(!g)return {power:0,health:0,damage:0,armor:0,crit:0,quality:0};
  const c=calibration(s,id),count=type=>c.modules.filter(m=>m===type).length;
  return {power:g.power+c.level*2,health:count('health')*15,damage:count('damage')*3,armor:count('armor')*3,crit:count('crit')*0.02,quality:Math.min(100,70+g.rarity*5+c.level*2)};
}
export function upgrade(s,id){
  const g=gear.find(g=>g.id===id),c=calibration(s,id),cost=upgradeCost(s,id);
  if(s.work||s.combat||!g||!s.inventory.includes(id)||g.level>s.level||c.level>=5||s.credits<cost)return false;
  s.credits-=cost;s.calibration??={};s.calibration[id]={level:c.level+1,modules:[...c.modules]};activity(s,'calibrations');record(s,`Nâng cấp ${g.name} +${c.level+1}.`);return true;
}
export function installModule(s,id,index,moduleId){
  const g=gear.find(g=>g.id===id),m=modules.find(m=>m.id===moduleId),c=calibration(s,id);
  if(s.work||s.combat||!g||!m||!s.inventory.includes(id)||g.level>s.level||!Number.isInteger(index)||index<0||index>=slots(s,id)||c.modules[index]===moduleId||s.credits<m.price)return false;
  s.credits-=m.price;s.calibration??={};const fitted=[...c.modules];fitted[index]=moduleId;s.calibration[id]={level:c.level,modules:fitted};
  const maxHp=90+s.level*10+Object.values(s.equipped).reduce((total,item)=>total+itemStats(s,item).health,0);s.hp=Math.min(s.hp,maxHp);return true;
}
