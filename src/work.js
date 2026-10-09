import {record,activity} from './journal.js';
import {gainPrintXP} from './services.js';
import {gainCraftXP} from './crafting.js';
export const jobs=[
 {id:'printing',name:'Làm việc ở xưởng in',icon:'⬡',description:'Học vận hành máy in để mở trang bị mạnh hơn. Không tiêu hao credits hoặc linh kiện.',tag:'Đào tạo in ấn',seconds:60,energy:2,xp:25,skill:'printing'},
 {id:'medical',name:'Hack cơ sở dữ liệu y tế',icon:'⚕',description:'Giải mã dữ liệu trong mạng mô phỏng để nâng nghề y học và chế tạo bot cứu thương.',tag:'Đào tạo y tế',seconds:60,energy:2,xp:30,skill:'medical'},
 {id:'ammo',name:'Nâng cấp đạn dược',icon:'ϟ',description:'Thử nghiệm cấu trúc pin để tìm cách chế tạo hiệu quả hơn. Nghề cấp 10 mở công thức Nitron.',tag:'Luyện đạn',seconds:60,energy:2,xp:30,skill:'ammo'},
 {id:'recycle',name:'Tái chế phế liệu',icon:'♲',description:'Tháo phế liệu công nghệ để cải thiện kỹ thuật in. Tiêu thụ một linh kiện mỗi lượt.',tag:'Đào tạo in ấn',seconds:30,energy:2,scrap:1,xp:50,skill:'printing'},
 {id:'mine',name:'Khai thác credits',icon:'◈',description:'Cho bộ xử lý giải khối dữ liệu trong thế giới game để kiếm credits.',tag:'Thu nhập',seconds:120,energy:3}
];
export function workPlan(s,id){const j=jobs.find(v=>v.id===id);if(!j)return null;const missing=[];if(s.work)missing.push('Đang có một công việc. Nhận thưởng hoặc hủy trước.');if(s.combat||s.dungeon)missing.push('Rời giao tranh và dungeon trước khi làm việc.');if(s.hp<=0)missing.push('Cần hồi sinh lực.');if(s.energy<j.energy)missing.push(`Cần ${j.energy} EN.`);if((s.scrap??6)<(j.scrap||0))missing.push('Cần 1 linh kiện công nghệ.');return {...j,credits:id==='mine'?30+s.level*2:0,missing,can:!missing.length};}
export const workRemaining=(s,now=Date.now())=>s.work?Math.max(0,Math.ceil((s.work.endsAt-now)/1000)):0;
export function workAction(s,b,now=Date.now()){
 if(b.action==='work-start'){const p=workPlan(s,b.id);if(!p?.can)return false;s.energy-=p.energy;if(p.scrap)s.scrap=(s.scrap??6)-p.scrap;s.work={id:p.id,startedAt:now,endsAt:now+p.seconds*1000,reward:{skill:p.skill||null,xp:p.xp||0,credits:p.credits}};record(s,`Bắt đầu ${p.name.toLowerCase()} · ${p.seconds} giây.`);return true;}
 if(b.action==='work-cancel'){if(!s.work)return false;s.work=null;record(s,'Đã hủy công việc. Năng lượng và linh kiện đã dùng không được hoàn lại.');return true;}
 if(b.action==='work-claim'){if(!s.work||workRemaining(s,now)>0)return false;const {reward,id}=s.work;s.work=null;if(reward.skill==='printing')gainPrintXP(s,reward.xp);else if(reward.skill)gainCraftXP(s,reward.skill,reward.xp,{crafted:false});s.credits+=reward.credits;activity(s,'workCompleted');activity(s,`training-${id}`);record(s,`Hoàn thành ${jobs.find(v=>v.id===id).name}: ${reward.xp?`+${reward.xp} XP nghề`:`+${reward.credits} ₡`}.`);return true;}
 return false;
}
