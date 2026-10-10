import {gear} from './content.js';
import {blueprints,materials,supplies,ownsGear,receiveGear,receiveStack} from './inventory-state.js';
import {record} from './journal.js';

const stackItems=new Set([...blueprints,...materials,...supplies].map(v=>v.id));
// Only the game creates drops. Clients send the batch ID, never item IDs or quantities.
export function queueLoot(s,entries,{source='Chiến lợi phẩm',description='Bạn tìm thấy những vật phẩm còn sử dụng được.'}={}){
 const valid=entries.filter(v=>v.kind==='gear'?gear.some(g=>g.id===v.id)&&!ownsGear(s,v.id):v.kind==='stack'&&stackItems.has(v.id)&&Number.isSafeInteger(v.count)&&v.count>0);
 if(!valid.length)return false;
 const items=[...(s.pendingLoot?.items||[])].map(v=>({...v}));
 for(const entry of valid){const old=items.find(v=>v.id===entry.id&&v.kind===entry.kind);if(old){if(old.kind==='stack')old.count+=entry.count;}else items.push({kind:entry.kind,id:entry.id,count:entry.kind==='gear'?1:entry.count});}
 s.lootSequence=(s.lootSequence||0)+1;
 s.pendingLoot={id:'loot-'+s.lootSequence,source:s.pendingLoot?'Chiến lợi phẩm chưa nhận':source,description:s.pendingLoot?'Những vật phẩm bạn tìm được trong các lần khám phá đang chờ nhận.':description,items};
 return true;
}

export function lootAction(s,b,{now=Date.now()}={}){
 if(!['loot-take','loot-discard'].includes(b.action)||!s.pendingLoot||b.id!==s.pendingLoot.id||s.combat||s.work)return false;
 if(b.action==='loot-discard'){const count=s.pendingLoot.items.reduce((n,v)=>n+v.count,0);s.pendingLoot=null;record(s,`Đã hủy ${count} vật phẩm chưa nhận.`);return true;}
 const draft=structuredClone(s),items=draft.pendingLoot.items;draft.pendingLoot=null;
 for(const entry of items){const ok=entry.kind==='gear'?receiveGear(draft,entry.id,{now}):receiveStack(draft,entry.id,entry.count,now);if(!ok)return false;}
 const count=items.reduce((n,v)=>n+v.count,0);record(draft,`Đã lấy ${count} vật phẩm. Túi đầy sẽ chuyển vào hộp thư.`);Object.assign(s,draft);return true;
}
