import {gain,note} from './game.js';
import {pveKills} from './achievements.js';
import {gear} from './content.js';
import {ownsGear,receiveGear,receiveStack} from './inventory-state.js';

export const vietnamDay=(now=Date.now())=>new Date(now+7*3600000).toISOString().slice(0,10);
const counters=s=>({hunt:pveKills(s),print:s.printing?.total||0,dungeon:s.dungeonClears||0});
export function prepareDaily(s,now=Date.now()){
 const day=vietnamDay(now);if(s.daily?.day===day)return false;
 s.daily={day,start:counters(s),claimed:[]};return true;
}
export const dailyContracts=[{id:'hunt',name:'Tuần tra Neon',target:5,credits:100,xp:60,scrap:2},{id:'print',name:'Kiểm định máy in',target:2,credits:80,xp:40,scrap:3},{id:'dungeon',name:'Tín hiệu từ tầng sâu',target:1,credits:200,xp:100,scrap:4}];
export function dailyStatus(s,now=Date.now()){
 const current=counters(s),same=s.daily?.day===vietnamDay(now);
 return dailyContracts.map(q=>({...q,value:same?Math.min(q.target,Math.max(0,current[q.id]-s.daily.start[q.id])):0,claimed:same&&s.daily.claimed.includes(q.id)}));
}
export function checkInStatus(s,now=Date.now()){
 const day=vietnamDay(now),previous=vietnamDay(now-86400000),r=s.checkIn||{},streak=r.day===day?r.streak:r.day===previous?r.streak+1:1;
 const index=(streak-1)%7;return {day,claimed:r.day===day,streak,index,credits:40+index*20,scrap:1+Math.floor(index/2),medicine:1+(index===6?2:0)};
}
export function rewardAction(s,b,now=Date.now()){
 if(s.work||s.combat||s.dungeon)return false;
 if(b.action==='daily-checkin'){
  const r=checkInStatus(s,now);if(r.claimed)return false;
  s.checkIn={day:r.day,streak:r.streak};s.credits+=r.credits;s.scrap=(s.scrap??6)+r.scrap;receiveStack(s,'balm',r.medicine,now);note(s,`Điểm danh ngày ${r.index+1}: +${r.credits} ₡, +${r.scrap} linh kiện, +${r.medicine} thuốc.`);return true;
 }
 if(b.action==='daily-claim'){
  prepareDaily(s,now);const q=dailyStatus(s,now).find(q=>q.id===b.id);if(!q||q.claimed||q.value<q.target)return false;
  s.daily.claimed.push(q.id);s.credits+=q.credits;s.scrap=(s.scrap??6)+q.scrap;gain(s,q.xp);note(s,`Hoàn thành hợp đồng ngày: ${q.name}.`);return true;
 }
 if(b.action==='token-redeem'){
  const tokens=s.dungeonTokens||0;
  if(b.id==='ammo'){if(tokens<3)return false;s.dungeonTokens=tokens-3;receiveStack(s,'energy-cell',6,now);receiveStack(s,'antimatter',3,now);note(s,'Đổi 3 token: 6 pin đặc biệt và 3 đạn phản vật chất.');return true;}
  if(b.id==='gear'){const pool=gear.filter(g=>g.rarity>=2&&g.level<=s.level&&!ownsGear(s,g.id));if(tokens<10||!pool.length)return false;const g=pool[0];s.dungeonTokens=tokens-10;receiveGear(s,g.id,{now});note(s,'Đổi 10 token: '+g.name+'.');return true;}
 }
 return false;
}
export function rewardsView({s,esc,button,now=Date.now()}){
 const r=checkInStatus(s,now),blocked=!!(s.work||s.combat||s.dungeon);
 return `<section class="rewards-screen"><div class="eyebrow">RUNNER / DAILY SIGNAL</div><h1>Tiếp tế hằng ngày</h1><p>Mốc ngày 00:00 Việt Nam (UTC+7). Thưởng chỉ nhận một lần; bỏ một ngày sẽ bắt đầu lại chuỗi điểm danh.</p><div class="checkin-days">${Array.from({length:7},(_,i)=>`<div class="${i===r.index?'current':''}"><small>NGÀY ${i+1}</small><b>${40+i*20} ₡</b><span>${1+Math.floor(i/2)} linh kiện</span></div>`).join('')}</div><p>Chuỗi: ${r.streak} ngày · ${r.credits} ₡ / ${r.scrap} linh kiện / ${r.medicine} thuốc</p>${button(r.claimed?'Đã điểm danh hôm nay':'Nhận tiếp tế hôm nay','daily-checkin','',blocked||r.claimed)}<div class="section-label">HỢP ĐỒNG HẰNG NGÀY</div>${dailyStatus(s,now).map(q=>`<article class="card"><h3>${esc(q.name)}</h3><p>${q.id==='hunt'?'Hạ địch PvE':q.id==='print'?'In trang bị':'Hoàn thành dungeon'}: ${q.value} / ${q.target}</p><div class="bar"><i style="width:${q.value/q.target*100}%"></i></div><p class="reward">+${q.credits} ₡ / +${q.xp} XP / +${q.scrap} linh kiện</p>${button(q.claimed?'Đã nhận':'Nhận thưởng','daily-claim',q.id,blocked||q.claimed||q.value<q.target)}</article>`).join('')}<p class="hint">Tiến trình tính từ lúc kết nối đầu tiên trong ngày. PvP, huấn luyện nghề và các lượt đã làm trước đó không được tính.</p><div class="section-label">ĐỔI TOKEN DUNGEON <span>${s.dungeonTokens||0} TOKEN</span></div><p>Hoàn thành dungeon thường / thử thách / tập đoàn cho 1 / 2 / 3 token. Thiếu ô sẽ gửi thưởng vào hộp thư.</p><div class="actions">${button('6 pin + 3 đạn · 3 token','token-redeem','ammo',blocked||(s.dungeonTokens||0)<3)}${button('Trang bị hiếm trở lên · 10 token','token-redeem','gear',blocked||(s.dungeonTokens||0)<10||!gear.some(g=>g.rarity>=2&&g.level<=s.level&&!ownsGear(s,g.id)))}</div></section>`;
}
