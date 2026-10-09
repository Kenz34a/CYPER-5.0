import {gear} from './content.js';

// Keep the original three keys so older characters and saved loadouts still work.
export const equipmentSlots=['weapon','special','destructive','helmet','armor','legs','boots','implant','backpack'];
export const slotLabels={weapon:'Vũ khí chính',special:'Vũ khí đặc biệt',destructive:'Vũ khí hủy diệt',helmet:'Mũ',armor:'Giáp thân',legs:'Giáp chân',boots:'Giày',implant:'Cấy ghép',backpack:'Ba lô'};
export const marks=[{id:'pierce',name:'Xuyên thấu',prey:'Helix',weak:'Bóng Mờ'},{id:'disrupt',name:'Phân rã',prey:'Bóng Mờ',weak:'Liên Minh Tro'},{id:'lethal',name:'Chết chóc',prey:'Liên Minh Tro',weak:'Helix'}];
export const gearMark=g=>marks[Number(g.id.replace('gear',''))%3];
export function playerMark(s){
 const fitted=equipmentSlots.filter(k=>!['implant','backpack'].includes(k)).map(k=>gear.find(g=>g.id===s.equipped[k])).filter(Boolean);
 const counts=marks.map(m=>fitted.filter(g=>gearMark(g).id===m.id).length),largest=Math.max(...counts);
 return largest>0&&counts.filter(n=>n===largest).length===1?marks[counts.indexOf(largest)]:null;
}
export const combatFaction=map=>['Helix','Bóng Mờ','Liên Minh Tro'][Number(map.replace('map',''))%3];
export const markBonus=(s,faction)=>{const mark=playerMark(s);return {attack:mark?.prey===faction?1.1:1,incoming:mark?.weak===faction?1.1:1};};

export const enemyVariants=[
 {id:'plain',name:'Tiêu chuẩn',description:'Không có biến thể.',hp:1,attack:1,defense:1,shield:0,reward:1},
 {id:'rage',name:'Cuồng nộ',description:'Tấn công +20%, thưởng +10%.',hp:1,attack:1.2,defense:1,shield:0,reward:1.1},
 {id:'fortified',name:'Thiết giáp',description:'HP +30%, phòng thủ +20%, thưởng +20%.',hp:1.3,attack:1,defense:1.2,shield:0,reward:1.2},
 {id:'shielded',name:'Khiên quang',description:'Khiên bằng 60% HP. Súng đặc biệt phá khiên nhanh hơn.',hp:1,attack:1,defense:1,shield:.6,reward:1.3},
 {id:'agile',name:'Phản xạ',description:'Khiên bằng 25% HP; giảm 20% khả năng bị choáng.',hp:1,attack:1.1,defense:1,shield:.25,reward:1.2,stunEvade:.2},
 {id:'overclock',name:'Quá tải',description:'HP +50%, tấn công +25%, khiên 50% HP; thưởng +50%.',hp:1.5,attack:1.25,defense:1,shield:.5,reward:1.5}
];
export function enemyProfile(foe,id='plain'){
 const v=enemyVariants.find(v=>v.id===id);if(!foe||!v)return null;
 const hp=Math.ceil(foe.hp*v.hp),shield=Math.ceil(hp*v.shield);
 return {...foe,name:(v.id==='plain'?'':v.name+' · ')+foe.name,hp,currentHp:hp,attack:Math.ceil(foe.attack*v.attack),defense:Math.ceil(foe.defense*v.defense),shield,currentShield:shield,variant:v.id,stunEvade:v.stunEvade||0,faction:combatFaction(foe.map),xp:Math.ceil(foe.xp*v.reward),credits:Math.ceil(foe.credits*v.reward)};
}

// A hit against an active shield keeps the weapon multiplier through overflow.
export function absorbShield(damage,currentShield=0,multiplier=1){
 const shield=Math.max(0,currentShield),adjusted=shield>0?Math.floor(damage*multiplier):damage,used=Math.min(shield,adjusted);
 return {shield:shield-used,shieldDamage:used,healthDamage:Math.max(0,adjusted-used)};
}
