import {maps} from './content.js';
import {record} from './journal.js';
export const stations=[
 {id:'neon',name:'Trạm Ngoại Vi Neon',from:1,to:10},
 {id:'glass',name:'Trạm Tháp Kính',from:11,to:20},
 {id:'signal',name:'Trạm Tín Hiệu',from:21,to:30},
 {id:'red',name:'Trạm Vành Đai Đỏ',from:31,to:40},
 {id:'summit',name:'Trạm Thiên Đỉnh',from:41,to:50}
];
export const keyRoutes={red:['map20','map24','map29'],summit:['map30','map34','map39']};
export const fragmentMaps=keyRoutes.red;
const legacyFragments=s=>fragmentMaps.filter(id=>(s.progress?.[`${id}:enemy`]||0)>0);
export function migrateRail(s){
 if(s.railVersion===1)return false;
 s.keyFragments??={};s.keyFragments.red=[...new Set([...(s.keyFragments.red||[]),...legacyFragments(s)])];s.railKeys??=[];
 if(legacyFragments(s).length===3||Number(s.map.slice(3))>=30||Object.entries(s.progress||{}).some(([key,n])=>/^map(3\d):(enemy|boss)$/.test(key)&&n>0))if(!s.railKeys.includes('red'))s.railKeys.push('red');
 s.railVersion=1;return true;
}
export const fragments=(s,id='red')=>(keyRoutes[id]||[]).filter(map=>(s.keyFragments?.[id]||[]).includes(map));
export function railAccess(s,id='red'){migrateRail(s);return (s.railKeys||[]).includes(id);}
export function areaAccess(s,map){return map.level<=30||railAccess(s,map.level<=40?'red':'summit');}
export function awardDungeonFragment(s,map){migrateRail(s);for(const [id,sources] of Object.entries(keyRoutes))if(sources.includes(map)&&!fragments(s,id).includes(map)){s.keyFragments[id]??=[];s.keyFragments[id].push(map);record(s,`Thu được mảnh khóa ${stations.find(v=>v.id===id).name}: ${fragments(s,id).length}/3. Mang về Terminal để ghép.`);return true;}return false;}
export function railAction(s,b){migrateRail(s);if(b.action!=='key-assemble'||!keyRoutes[b.id]||railAccess(s,b.id)||fragments(s,b.id).length!==3||s.combat||s.dungeon||s.work)return false;s.railKeys.push(b.id);record(s,`Ghép thành công chìa khóa ${stations.find(v=>v.id===b.id).name}. Tuyến đã mở.`);return true;}
export function stationPlan(s,id){const v=stations.find(v=>v.id===id);if(!v)return null;const missing=[];if(s.level+2<v.from)missing.push(`Cần cấp ${v.from-2} để đến tuyến này.`);if(keyRoutes[id]&&!railAccess(s,id))missing.push(`Thu thập 3 mảnh khóa từ dungeon ở khu vực ${keyRoutes[id].map(m=>Number(m.slice(3))+1).join(', ')} của trạm trước (${fragments(s,id).length}/3). Đến Terminal ở Trung tâm để ghép chìa khóa.`);if(s.combat||s.dungeon||s.work)missing.push('Kết thúc giao tranh, dungeon và công việc trước khi du hành.');if(s.energy<1)missing.push('Cần 1 EN để di chuyển.');return {...v,missing,can:missing.length===0,maps:maps.filter(m=>m.level>=v.from&&m.level<=v.to)};}
