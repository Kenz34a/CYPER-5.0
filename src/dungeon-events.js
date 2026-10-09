import {maps} from './content.js';
import {note,gain} from './game.js';

const notes=[
 'Nhật ký kỹ sư: Chúng tôi giữ điện cho khu dân cư bằng một đường dây không nằm trên sơ đồ. Nếu đọc được tin này, xin đừng tắt nó.',
 'Bản ghi drone: Mệnh lệnh cuối cùng là bảo vệ con người. Cơ sở dữ liệu nhận diện con người đã bị xóa.',
 'Thư không gửi: Mẹ vẫn để đèn ngoài cửa. Dù con chỉ còn là một tín hiệu, cứ trở về.',
 'Thông báo lưu trữ: Ký ức được thu hồi không thuộc về tập đoàn. Mỗi bản sao vẫn mang tên người đã sống cùng nó.',
 'Mẩu giấy dưới máy chủ: Có một thành phố khác bên kia đường ray. Không ai nhớ ai là người đầu tiên nhìn thấy nó.'
];
export const loreFor=map=>({id:'lore-'+map,title:'Hồ sơ '+maps.find(m=>m.id===map).name,text:notes[Number(map.slice(3))%notes.length]});
export const dungeonModes=[{id:'normal',name:'Thường',energy:3,hp:1,attack:1,reward:1,tokens:1},{id:'challenge',name:'Thử thách',energy:4,hp:1.4,attack:1.2,reward:1.5,tokens:2},{id:'corporation',name:'Tập đoàn',energy:5,hp:2.5,attack:1.6,reward:2.5,tokens:3}];
export const modePlan=d=>dungeonModes.find(m=>m.id===(d?.mode||'normal'))||dungeonModes[0];
export function dungeonQuest(d){const kind=['attack','defense','shield'][(d.run+d.floor)%3];return {id:`${d.map}:${d.run}:${d.floor}`,kind,name:{attack:'Tăng áp xung lực',defense:'Gia cố khung giáp',shield:'Khuếch đại khiên'}[kind],scrap:2,credits:30,xp:20,value:.1,seconds:600};}
export function dungeonEventAction(s,b,now=Date.now()){
 const d=s.dungeon;if(!d||s.combat||s.work)return false;
 if(b.action==='dungeon-quest'){
  const q=dungeonQuest(d);if(!d.questFound||d.questClaimed||(s.scrap??6)<q.scrap)return false;
  d.questClaimed=true;s.scrap=(s.scrap??6)-q.scrap;s.credits+=q.credits;gain(s,q.xp);
  s.buffs=(s.buffs||[]).filter(v=>v.expiresAt>now&&v.kind!==q.kind);s.buffs.push({kind:q.kind,value:q.value,expiresAt:now+q.seconds*1000});note(s,`Đổi 2 linh kiện với người giữ hầm: ${q.name} +10% trong 10 phút, +30 ₡ / +20 XP.`);return true;
 }
 return false;
}
export function dungeonQuestView(s,button){
 const d=s.dungeon;if(!d?.questFound)return '';const q=dungeonQuest(d);
 return `<article class="card dungeon-offer"><h3>? Người giữ hầm</h3><p>“Bộ tiếp sóng sắp hỏng. Mang cho tôi hai linh kiện, tôi sẽ cấp quyền dùng mạch tăng cường.”</p><p>${q.name} +10% trong 10 phút / +30 ₡ / +20 XP · cần 2 linh kiện</p>${button(d.questClaimed?'Đã trao đổi':'Đổi 2 linh kiện','dungeon-quest','',d.questClaimed||!!s.combat||(s.scrap??6)<2)}</article>`;
}
export function loreView({s,esc,button}){const entries=(s.loreFound||[]).map(loreFor);return `<div class="eyebrow">ARCHIVE / ${entries.length} HỒ SƠ</div><h1>Mảnh ký ức Neon</h1><p>Chạm dấu ! trong dungeon để đọc. Hồ sơ không cấp tài nguyên và được giữ sau khi rời hầm.</p>${entries.map(v=>`<article class="card"><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></article>`).join('')||'<p class="hint">Chưa tìm thấy bản ghi nào.</p>'}${button('Đến dungeon','nav','dungeon')}`;}
