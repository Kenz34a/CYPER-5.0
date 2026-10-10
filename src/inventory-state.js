import {gear} from './content.js';
export const capacity=60;
export const bagCapacity=s=>capacity+Object.values(s.equipped).reduce((n,id)=>n+(gear.find(g=>g.id===id)?.pocket||0)+(s.calibration?.[id]?.modules||[]).filter(v=>v==='pocket').length*2,0);
export const supplies=[
 {id:'balm',name:'Thuốc giảm đau',icon:'✚',hp:40,energy:0,price:20,scrap:1,hash:0,cost:10},
 {id:'nano',name:'Nanobot sửa chữa',icon:'⬡',hp:80,energy:15,price:75,scrap:3,hash:1,cost:25},
 {id:'stim',name:'Pin xung năng lượng',icon:'ϟ',hp:0,energy:10,price:30,scrap:2,hash:0,cost:15},
 {id:'nitron',name:'Pin Nitron',icon:'▤',hp:0,energy:12,price:60,category:'ammo'}
];
export const materials=[...['damage','health','armor','crit','shield','stun','regen','pocket'].map(id=>({id:'mod-'+id,name:({damage:'Lõi xung kích',health:'Mạch sinh học',armor:'Lưới phòng thủ',crit:'Bộ ngắm lượng tử',shield:'Mạch khiên',stun:'Lõi gây choáng',regen:'Mạch tái sinh',pocket:'Khoang mở rộng'})[id]+' · module rời',icon:'▣',rarity:2})),{id:'ammo-material',name:'Vật liệu đạn dược',icon:'▰',rarity:0}];
export const blueprints=Array.from({length:18},(_,i)=>{const slot=['weapon','armor','implant'][i%3],rarity=Math.floor(i/3);return {id:`bp-${slot}-${rarity}`,name:`Bản vẽ ${ {weapon:'vũ khí',armor:'giáp',implant:'cấy ghép'}[slot]}`,slot,rarity,cost:50+rarity*80,scrap:2+rarity};});
for(const slot of ['special','destructive','helmet','legs','boots','backpack'])for(let rarity=0;rarity<6;rarity++)blueprints.push({id:`bp-${slot}-${rarity}`,name:'Bản vẽ '+({special:'vũ khí đặc biệt',destructive:'vũ khí hủy diệt',helmet:'mũ',legs:'giáp chân',boots:'giày',backpack:'ba lô'})[slot],slot,rarity,cost:50+rarity*80,scrap:2+rarity});
export const ammunition=[{id:'energy-cell',name:'Pin vũ khí đặc biệt',icon:'ϟ',price:18},{id:'antimatter',name:'Đạn phản vật chất',icon:'✹',price:35}];
materials.push(...ammunition.map(v=>({...v,rarity:1,ammo:true})));
// Old saves receive the same starter supplies once, on their first inventory action.
export const stacks=s=>s.stacks??{balm:3,stim:1};
export const bagSize=s=>s.inventory.length+Object.values(stacks(s)).filter(n=>n>0).length;
export const hasRoom=(s,id)=>stacks(s)[id]>0||bagSize(s)<bagCapacity(s);
export const ownsGear=(s,id)=>s.inventory.includes(id)||!!s.housing?.storage?.includes(id)||!!s.escrow?.includes(id)||!!s.itemInbox?.includes(id)||!!s.pendingLoot?.items.some(v=>v.kind==='gear'&&v.id===id);
export function addStack(s,id,n=1){if(!hasRoom(s,id)||!Number.isSafeInteger(n)||n<1)return false;s.stacks??={...stacks(s)};s.stacks[id]=(s.stacks[id]||0)+n;return true;}
export const inboxLifetime=7*86400000;
export function receiveGear(s,id,{now=Date.now(),permanent=false}={}){if(!gear.some(g=>g.id===id)||ownsGear(s,id))return false;if(bagSize(s)<bagCapacity(s))s.inventory.push(id);else{(s.itemInbox??=[]).push(id);if(!permanent)(s.inboxGearExpiry??={})[id]=now+inboxLifetime;}return true;}
export function receiveStack(s,id,count=1,now=Date.now()){
 if(![...supplies,...blueprints,...materials].some(v=>v.id===id)||!Number.isSafeInteger(count)||count<1)return false;
 if(addStack(s,id,count))return true;s.stackInbox??={};s.stackInbox[id]=(s.stackInbox[id]||0)+count;(s.inboxBatches??=[]).push({item:id,count,expiresAt:now+inboxLifetime});return true;
}
export function blueprintDrop(s,slot='weapon',rarity=0){const id=`bp-${slot}-${rarity}`;receiveStack(s,id);return id;}
export function clearInboxEntry(s,id){if(s.itemInbox?.includes(id)){s.itemInbox=s.itemInbox.filter(v=>v!==id);if(s.inboxGearExpiry)delete s.inboxGearExpiry[id];}if(s.stackInbox?.[id]){delete s.stackInbox[id];if(s.inboxBatches)s.inboxBatches=s.inboxBatches.filter(v=>v.item!==id);}}
export function inboxEntries(s){return [
 ...(s.itemInbox||[]).map(id=>({id,kind:'gear',count:1,name:gear.find(g=>g.id===id)?.name||id,icon:'▣',expiresAt:s.inboxGearExpiry?.[id]||null})),
 ...Object.entries(s.stackInbox||{}).filter(([,n])=>n>0).map(([id,count])=>{const item=[...supplies,...blueprints,...materials].find(v=>v.id===id),batches=(s.inboxBatches||[]).filter(v=>v.item===id);return {id,kind:'stack',count,name:item?.name||id,icon:item?.icon||'▰',expiresAt:batches.length?Math.min(...batches.map(v=>v.expiresAt)):null,mixed:batches.some(v=>v.expiresAt!==batches[0].expiresAt)||batches.reduce((n,v)=>n+v.count,0)<count};})
 ];}
// Maintenance is independent of UI and uses server time for online accounts.
export function settleInbox(s,{now=Date.now(),collect=true}={}){
 let changed=false,received=0,expired=0;
 for(const id of [...(s.itemInbox||[])])if(s.inboxGearExpiry?.[id]<=now){clearInboxEntry(s,id);if(s.calibration&&!s.inventory.includes(id)&&!s.housing?.storage?.includes(id)&&!s.escrow?.includes(id))delete s.calibration[id];changed=true;expired++;}
 const batches=s.inboxBatches||[];
 for(const b of batches)if(b.expiresAt<=now){const n=Math.min(s.stackInbox?.[b.item]||0,b.count);if(n){s.stackInbox[b.item]-=n;if(!s.stackInbox[b.item])delete s.stackInbox[b.item];expired+=n;}changed=true;}
 if(changed&&s.inboxBatches)s.inboxBatches=batches.filter(b=>b.expiresAt>now);
 if(collect&&!s.combat&&!s.dungeon){
  // Stacks that already occupy a bag slot can be received even when the bag is full.
  for(const [id,count] of Object.entries(s.stackInbox||{}))if(count>0&&addStack(s,id,count)){clearInboxEntry(s,id);received+=count;changed=true;}
  for(const id of [...(s.itemInbox||[])])if(bagSize(s)<bagCapacity(s)&&!s.inventory.includes(id)){s.inventory.push(id);clearInboxEntry(s,id);received++;changed=true;}
 }
 return {changed,received,expired};
}
