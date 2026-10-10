import {record,activity} from './journal.js';
import {gainPrintXP} from './services.js';
import {gainCraftXP,craftSkill} from './crafting.js';
import {maps} from './content.js';
import {gain} from './game.js';
import {receiveStack} from './inventory-state.js';
export const jobs=[
 {id:'printing',name:'Làm việc ở xưởng in',icon:'⬡',description:'Học vận hành máy in để mở trang bị mạnh hơn. Không tiêu hao credits hoặc linh kiện.',tag:'Đào tạo in ấn',seconds:60,energy:2,xp:25,skill:'printing'},
 {id:'medical',name:'Hack cơ sở dữ liệu y tế',icon:'⚕',description:'Giải mã dữ liệu trong mạng mô phỏng để nâng nghề y học và chế tạo bot cứu thương.',tag:'Đào tạo y tế',seconds:60,energy:2,xp:30,skill:'medical'},
 {id:'ammo',name:'Nâng cấp đạn dược',icon:'ϟ',description:'Thử nghiệm cấu trúc pin để tìm cách chế tạo hiệu quả hơn. Nghề cấp 10 mở công thức Nitron.',tag:'Luyện đạn',seconds:60,energy:2,xp:30,skill:'ammo'},
 {id:'recycle',name:'Tái chế phế liệu',icon:'♲',description:'Tháo phế liệu công nghệ để cải thiện kỹ thuật in. Tiêu thụ một linh kiện mỗi lượt.',tag:'Đào tạo in ấn',seconds:30,energy:2,scrap:1,xp:50,skill:'printing'},
 {id:'mine',name:'Khai thác credits',icon:'◈',description:'Cho bộ xử lý giải khối dữ liệu trong thế giới game để kiếm credits.',tag:'Thu nhập',seconds:120,energy:3},
 {id:'bot',name:'Triển khai bot',icon:'⬡',description:'Bot thám hiểm khu vực để kiếm XP, credits và vật tư. Mỗi lượt dùng một lõi AI.',tag:'Nâng XP khi AFK',seconds:900,energy:0,aiCores:1,area:true},
 {id:'gather',name:'Thu thập',icon:'♲',description:'Thu thập linh kiện và vật liệu đạn dược. Cấp nghề thu thập phải đạt cấp khu vực.',tag:'Thu thập tài nguyên khi AFK',seconds:300,energy:2,skill:'gathering',area:true}
];
export function workPlan(s,id,count=1,{boosts={}}={}){
 const j=jobs.find(v=>v.id===id);if(!j)return null;
 const missing=[],valid=Number.isSafeInteger(count)&&count>=1&&count<=1000,n=valid?count:1;
 const area=maps.find(v=>v.id===s.map),level=area?.level||1;
 const inputs=[{field:'energy',name:'EN',need:j.energy*n,have:s.energy},...(j.scrap?[{field:'scrap',name:'Linh kiện công nghệ',need:j.scrap*n,have:s.scrap??6}]:[]),...(j.aiCores?[{field:'aiCores',name:'Lõi AI',need:j.aiCores*n,have:s.aiCores||0}]:[])].filter(v=>v.need>0);
 if(!valid)missing.push('Chọn số lượt nguyên từ 1 đến 1.000.');
 if(s.work)missing.push('Đang có một công việc. Nhận thưởng hoặc hủy trước.');
 if(s.combat||s.dungeon)missing.push('Rời giao tranh và dungeon trước khi làm việc.');
 if(s.hp<=0)missing.push('Cần hồi sinh lực.');
 if(j.area&&!area)missing.push('Khu vực không hợp lệ.');
 if(id==='gather'&&craftSkill(s,'gathering').rank<level)missing.push(`Cần nghề thu thập LV ${level} (hiện tại ${craftSkill(s,'gathering').rank}).`);
 for(const v of inputs)if(v.have<v.need)missing.push(`Còn thiếu ${v.need-v.have} ${v.name}.`);
 const maxCount=Math.max(0,Math.min(1000,...inputs.map(v=>Math.floor(v.have/(v.need/n)))));
 const speed=Math.max(0,Math.min(80,Number(boosts.speed)||0)),multiplier=boosts.reward===4?4:1,xpBonus=boosts.xp===80?1.8:1;
 const scaled=v=>Math.floor(v*n*multiplier),xp=v=>Math.floor(v*n*multiplier*xpBonus);
 const reward={skill:j.skill||null,xp:xp(j.xp||(id==='gather'?20+level*2:0)),credits:scaled(id==='mine'?30+s.level*2:id==='bot'?20+level*4:0),characterXP:xp(id==='bot'?30+level*6:0),fields:{},stacks:{}};
 if(id==='bot'){reward.fields.scrap=scaled(1);reward.stacks={'ammo-material':scaled(2),'energy-cell':scaled(1),balm:scaled(1)};if(level>=11)reward.stacks.antimatter=scaled(1);if(level>=21)reward.stacks.nitron=scaled(1);}
 if(id==='gather'){reward.fields.scrap=scaled(1);reward.stacks={'ammo-material':scaled(3)};}
 return {...j,count:n,baseSeconds:j.seconds*n,seconds:Math.max(1,Math.ceil(j.seconds*n*(100-speed)/100)),energy:j.energy*n,scrap:(j.scrap||0)*n,aiCores:(j.aiCores||0)*n,credits:reward.credits,xp:reward.xp,reward,inputs,maxCount,area:area?.name,areaLevel:level,boosts:{speed,reward:multiplier,xp:xpBonus===1.8?80:0},missing,can:!missing.length};
}
export const workRemaining=(s,now=Date.now())=>s.work?Math.max(0,Math.ceil((s.work.endsAt-now)/1000)):0;
export const workKey=s=>s.work?(s.work.key||`${s.work.id}:${s.work.startedAt}`):'';
export function workSkipPlan(s,now=Date.now()){
 const remaining=workRemaining(s,now),cost=Math.ceil(remaining/60),units=s.units??0;
 return {key:workKey(s),remaining,cost,units,can:!!s.work&&cost>0&&!s.combat&&!s.dungeon&&Number.isSafeInteger(units)&&units>=cost};
}
function finishWork(s,now){
 const {reward,id,count=1}=s.work;s.work=null;
 if(reward.skill==='printing')gainPrintXP(s,reward.xp);else if(reward.skill)gainCraftXP(s,reward.skill,reward.xp,{crafted:false});
 s.credits+=reward.credits;
 for(const [field,value] of Object.entries(reward.fields||{}))s[field]=(s[field]||0)+value;
 for(const [id,value] of Object.entries(reward.stacks||{}))receiveStack(s,id,value,now);
 if(reward.characterXP)gain(s,reward.characterXP);
 activity(s,'workCompleted');activity(s,`training-${id}`);
 record(s,`Hoàn thành ${jobs.find(v=>v.id===id)?.name||id} ×${count}: +${reward.xp||reward.characterXP||0} XP · +${reward.credits} ₡${Object.keys(reward.stacks||{}).length?' · Đã nhận vật tư (túi đầy chuyển vào hộp thư)':''}.`);
}
export function workAction(s,b,now=Date.now(),options={}){
 if(b.action==='work-start'){
  const p=workPlan(s,b.id,b.count===undefined?1:b.count,options);if(!p?.can)return false;
  for(const input of p.inputs)s[input.field]=input.have-input.need;
  s.workSequence=(s.workSequence||0)+1;
  s.work={id:p.id,key:`work-${s.workSequence}`,count:p.count,map:s.map,startedAt:now,endsAt:now+p.seconds*1000,baseSeconds:p.baseSeconds,boosts:p.boosts,reward:p.reward};
  record(s,`Bắt đầu ${p.name.toLowerCase()} ×${p.count} · ${p.seconds} giây.`);return true;
 }
 if(b.action==='work-cancel'){if(!s.work)return false;s.work=null;record(s,'Đã hủy công việc. Tài nguyên đã dùng không được hoàn lại.');return true;}
 if(b.action==='work-claim'){if(!s.work||workRemaining(s,now)>0)return false;finishWork(s,now);return true;}
 if(b.action==='work-skip'){
  const p=workSkipPlan(s,now);
  // Bind approval to this job and cap the charge at the displayed quote. Client time/rewards are ignored.
  if(!p.can||b.id!==p.key||!Number.isSafeInteger(b.amount)||b.amount<p.cost)return false;
  s.units=p.units-p.cost;finishWork(s,now);
  record(s,`Đã dùng ${p.cost} Unit để bỏ qua hàng chờ và nhận thưởng ngay.`);return true;
 }
 return false;
}
