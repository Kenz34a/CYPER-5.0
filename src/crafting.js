import {gear,rarities} from './content.js';
import {supplies,blueprints,stacks,bagSize,capacity,ownsGear,addStack} from './inventory-state.js';
import {activity,record} from './journal.js';
const names={credits:'Credits',scrap:'Linh kiện',hashProcessors:'Bộ xử lý Hash',aiCores:'Lõi AI',aiClusters:'Cụm lõi AI','ammo-material':'Vật liệu đạn dược'};
export const craftPool=(s,b)=>gear.filter(g=>g.slot===b.slot&&g.rarity===b.rarity&&g.level<=s.level&&!ownsGear(s,g.id));
export const craftSkill=(s,id)=>s.craftingSkills?.[id]??{rank:1,xp:0,total:0};
const priority={'ai-cluster':0,'ai-split':1,nitron:2,'ai-core':3,balm:4,nano:5,stim:6,'ammo-stock':7};
export const recipes=[
 ...supplies.filter(v=>v.id!=='nitron').map(v=>({id:v.id,name:v.name,icon:v.icon,category:v.id==='stim'?'ammo':'medical',rarity:0,fields:{credits:v.cost,scrap:v.scrap,...(v.hash?{hashProcessors:v.hash}:{})},stackOut:{[v.id]:1},skill:v.id==='stim'?'ammo':'medical',level:1,xp:25})),
 {id:'ai-cluster',name:'Cụm lõi AI',icon:'⬢',category:'material',rarity:2,fields:{aiCores:1000,credits:50000},fieldOut:{aiClusters:1}},
 {id:'ai-split',name:'Lõi AI · tách cụm',icon:'⬡',category:'material',rarity:0,fields:{aiClusters:1},fieldOut:{aiCores:1000}},
 {id:'ai-core',name:'Lõi AI · chế tạo',icon:'⬡',category:'material',rarity:0,fields:{hashProcessors:2,scrap:3},fieldOut:{aiCores:1}},
 {id:'ammo-stock',name:'Vật liệu đạn dược',icon:'▰',category:'ammo',rarity:0,fields:{scrap:2,credits:10},stackOut:{'ammo-material':1},skill:'ammo',level:1,xp:20},
 {id:'nitron',name:'Pin Nitron',icon:'▤',category:'ammo',rarity:1,stackIn:{'ammo-material':1},stackOut:{nitron:2},skill:'ammo',level:10,xp:160},
 ...blueprints.map(b=>({id:b.id,name:`${b.name} · ${rarities[b.rarity]}`,icon:'▰',category:'material',rarity:b.rarity,fields:{credits:b.cost,scrap:b.scrap},stackIn:{[b.id]:1},blueprint:b,skill:'material',level:1,xp:40}))
].sort((a,b)=>(priority[a.id]??100)-(priority[b.id]??100));
const fieldAmount=(s,id)=>id==='scrap'?s.scrap??6:s[id]||0;
const itemName=id=>names[id]||supplies.find(v=>v.id===id)?.name||blueprints.find(v=>v.id===id)?.name||id;
export function craftPlan(s,id){
 const r=recipes.find(v=>v.id===id);if(!r)return null;
 const inputs=[...Object.entries(r.fields||{}).map(([key,need])=>({kind:'field',id:key,name:itemName(key),need,have:fieldAmount(s,key)})),...Object.entries(r.stackIn||{}).map(([key,need])=>({kind:'stack',id:key,name:itemName(key),need,have:stacks(s)[key]||0}))];
 const pool=r.blueprint?craftPool(s,r.blueprint):[],g=pool[0],skill=r.skill?craftSkill(s,r.skill):null;
 const outputs=[...Object.entries(r.fieldOut||{}),...Object.entries(r.stackOut||{})].map(([key,count])=>({name:itemName(key),count}));if(r.blueprint)outputs.push({name:g?.name||'Trang bị đúng loại và độ hiếm',count:1});
 const missing=inputs.filter(v=>v.have<v.need).map(v=>`Còn thiếu ${(v.need-v.have).toLocaleString('vi')} ${v.name}`);
 if(skill&&skill.rank<r.level)missing.push(`Cần cấp nghề ${r.skill==='ammo'?'Đạn dược':r.skill==='medical'?'Y học':'Vật liệu'} ${r.level} (hiện tại ${skill.rank})`);
 if(r.blueprint&&!g)missing.push('Chưa có mẫu trang bị đúng cấp và chưa sở hữu.');
 let times=Math.min(...inputs.map(v=>Math.floor(v.have/v.need)),r.blueprint?pool.length:1000000);
 if(r.blueprint){let fit=0;for(let i=1;i<=Math.min(times,capacity);i++){if(bagSize(s)+i-((stacks(s)[id]||0)===i?1:0)>capacity)break;fit=i;}times=fit;}
 else if(Object.keys(r.stackOut||{}).length){const freed=inputs.filter(v=>v.kind==='stack'&&v.have===v.need).length,newSlots=Object.keys(r.stackOut).filter(key=>!(stacks(s)[key]>0)).length;if(bagSize(s)-freed+newSlots>capacity)times=0;}
 if(!times&&!missing.length)missing.push('Túi đồ không đủ ô trống.');
 if(s.work)missing.push('Nhận thưởng hoặc hủy công việc trước khi chế tạo.');
 if(s.combat||s.dungeon)missing.push('Kết thúc giao tranh và rời dungeon để chế tạo.');
 if(missing.length)times=0;
 return {...r,inputs,outputs,missing,times,gear:g,skill,skillId:r.skill,can:times>0};
}
export function gainCraftXP(s,skill,xp,{crafted=true}={}){s.craftingSkills??={};const p={...craftSkill(s,skill)};if(crafted)p.total++;p.xp+=xp;while(p.rank<100&&p.xp>=p.rank*40){p.xp-=p.rank*40;p.rank++;}if(p.rank===100)p.xp=Math.min(p.xp,4000);s.craftingSkills[skill]=p;}
export function executeCraft(s,id,count=1){
 if(!Number.isSafeInteger(count)||count<1||count>100||s.combat||s.dungeon||s.work)return false;
 const draft=structuredClone(s);let result;
 for(let i=0;i<count;i++){
  const p=craftPlan(draft,id);if(!p?.can)return false;result=p;
  for(const v of p.inputs){if(v.kind==='field')draft[v.id]=v.have-v.need;else{draft.stacks??={...stacks(draft)};draft.stacks[v.id]=v.have-v.need;}}
  for(const [key,n] of Object.entries(p.fieldOut||{}))draft[key]=fieldAmount(draft,key)+n;
  for(const [key,n] of Object.entries(p.stackOut||{}))if(!addStack(draft,key,n))return false;
  if(p.gear)draft.inventory.push(p.gear.id);if(p.skillId)gainCraftXP(draft,p.skillId,p.xp);
  activity(draft,id==='ai-core'?'coresCrafted':'crafted');
 }
 Object.assign(s,draft);record(s,`Chế tạo ${result.gear?.name||result.name} ×${count}${result.xp?` · +${result.xp*count} XP nghề`:''}.`);return true;
}
