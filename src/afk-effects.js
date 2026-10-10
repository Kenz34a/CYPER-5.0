// Public rules for previews. Online purchases and job rewards are computed by the server.
export const afkOffers = [
 {id:'skip',name:'Bỏ qua toàn server',cost:10,seconds:900,description:'Giảm 15 phút cho mọi công việc đang chờ, kể cả người chơi ngoại tuyến. Không tự nhận thưởng.'},
 {id:'speed',name:'Giảm thời gian',cost:5,duration:1200000,description:'Giảm 40% thời gian các lượt bắt đầu trong 20 phút. Cộng dồn hai lần, tối đa 80%.'},
 {id:'reward',name:'Tăng phần thưởng',cost:8,duration:1200000,description:'Nhân 4 tài nguyên, credits và XP của các lượt bắt đầu trong 20 phút. Chi phí đầu vào giữ nguyên.'},
 {id:'xp',name:'Buff XP',cost:5,duration:1200000,description:'Thêm 80% XP cho các lượt bắt đầu trong 20 phút; kết hợp được với tăng phần thưởng.'}
];
export function afkBoostState(db={},now=Date.now()){
 const buffs=(db.afk?.buffs||[]).filter(v=>v.expiresAt>now);
 const speed=buffs.filter(v=>v.id==='speed').slice(-2);
 const expiry=id=>Math.max(0,...buffs.filter(v=>v.id===id).map(v=>v.expiresAt));
 return {speed:Math.min(80,speed.length*40),reward:expiry('reward')?4:1,xp:expiry('xp')?80:0,
  speedExpiresAt:speed.length?Math.min(...speed.map(v=>v.expiresAt)):0,rewardExpiresAt:expiry('reward'),xpExpiresAt:expiry('xp')};
}
export function afkEventText(event){
 const who=event.name||'Runner';
 return event.id==='skip'?`${who} đã dùng bỏ qua toàn server: giảm 15 phút cho ${event.affected} người đang chờ.`:
  `${who} đã kích hoạt ${afkOffers.find(v=>v.id===event.id)?.name||'buff AFK'} cho toàn server trong 20 phút.`;
}
