import {stats} from './game.js';
import {printing} from './services.js';
import {craftSkill} from './crafting.js';
import {bagSize,bagCapacity} from './inventory-state.js';
import {gear,maps} from './content.js';
import {calibration,itemStats,slots} from './equipment.js';
import {equipmentSlots,playerMark,slotLabels} from './gear-rules.js';
import {privacy} from './assets.js';
export function careerRows(s){
 const p=printing(s),row=(id,name,skill,cap,step)=>({id,name,rank:skill.rank,xp:skill.xp,target:skill.rank*step,cap,percent:Math.min(100,Math.floor(skill.xp/(skill.rank*step)*100)),capped:skill.rank>=cap});
 return [row('printing','Kỹ thuật in',p,50,50),row('mining','Khai thác',craftSkill(s,'mining'),100,40),row('gathering','Thu thập',craftSkill(s,'gathering'),100,40),row('ammo','Chế tạo đạn',craftSkill(s,'ammo'),100,40),row('medical','Y học',craftSkill(s,'medical'),100,40)];
}
export function profileStatRows(s){
 const st=stats(s),mark=playerMark(s),number=n=>n.toLocaleString('vi'),percent=n=>`${Math.round(n*100)}%`;
 return [
  {name:'Máu tối đa',value:number(st.maxHp),description:'Giới hạn sinh lực từ cấp nhân vật, trang bị và module.'},
  {name:'Giáp',value:number(st.defense),description:'Giảm sát thương nhận từ địch; mỗi đòn dùng một nửa giá trị giáp.'},
  {name:'Hồi phục',value:number(st.regen)+' HP / lượt',description:'Hồi sinh lực sau lượt giao tranh khi nhân vật còn sống.'},
  {name:'Sát thương',value:number(st.attack),description:'Sức mạnh vũ khí chính trước giáp đối thủ và lợi thế phe.'},
  {name:'Vũ khí đặc biệt',value:number(st.specialAttack),description:'Sức mạnh vũ khí đặc biệt; hiệu suất 120% khi đánh lá chắn.'},
  {name:'Vũ khí hủy diệt',value:number(st.destructiveAttack),description:'Sức mạnh vũ khí hủy diệt; hiệu suất 50% khi đánh lá chắn.'},
  {name:'Tỉ lệ chí mạng',value:percent(st.crit),limit:'Tối đa 50%',description:'Xác suất gây đòn chí mạng.'},
  {name:'Sát thương chí mạng',value:'150%',description:'Đòn chí mạng nhân sát thương với 1,5 trước khi trừ giáp địch.'},
  {name:'Tỉ lệ gây choáng',value:percent(st.stun),limit:'Tối đa 50%',description:'Địch bị choáng bỏ lượt phản công. Địch phản xạ có thể giảm hiệu quả.'},
  {name:'Rút lui',value:percent(st.escape),limit:'Tối đa 100%',description:'Xác suất rút lui trong dungeon khó; không phải tỉ lệ né đòn.'},
  {name:'Lá chắn',value:number(st.maxShield),description:'Hấp thụ sát thương trước sinh lực.'},
  {name:'Túi đồ',value:`${bagSize(s)} / ${bagCapacity(s)} ô`,description:'Trang bị và mỗi loại vật phẩm xếp chồng chiếm một ô.'},
  {name:'Dấu trang bị',value:mark?.name||'Cân bằng',description:mark?`+10% sát thương với ${mark.prey}; nhận thêm 10% sát thương từ ${mark.weak}.`:'Không có dấu chiếm đa số; không áp dụng lợi thế phe.'}
 ];
}
export function playerProfileData(s){
 const p=privacy(s);
 return {name:s.settings?.hideHandler?'Runner ẩn danh':s.name,level:s.level,createdAt:s.createdAt||null,reputation:s.reputation||0,location:maps.find(v=>v.id===s.map)?.name||'Chưa rõ',status:s.combat?'Giao tranh':s.dungeon?'Dungeon':s.work?'AFK':'Idle',
  levelProgress:{rank:s.level,xp:s.xp,target:s.level*60,percent:Math.min(100,Math.floor(s.xp/(s.level*60)*100))},
  skills:p.skills?careerRows(s):null,statistics:p.stats?profileStatRows(s):null,
  equipment:p.equipment?equipmentSlots.map(slot=>{const g=gear.find(g=>g.id===s.equipped[slot]);return g?{id:g.id,name:g.name,slot:slotLabels[slot],level:g.level,rarity:g.rarity,quality:itemStats(s,g.id).quality,calibration:calibration(s,g.id).level,sockets:slots(s,g.id),fitted:calibration(s,g.id).modules.filter(Boolean).length}:null;}).filter(Boolean):null};
}
