import {stats} from './game.js';
import {enemyVariants,enemyProfile,playerMark} from './gear-rules.js';
import {enemies} from './content.js';
import {stacks,supplies} from './inventory-state.js';
import {quickSlots} from './inventory.js';
import {enemySilhouette,weaponSilhouette} from './combat-visuals.js';
import {settings} from './settings.js';

function vital(value,max,label,kind) {
 const current=Math.max(0,Math.min(max,value||0)),percent=max>0?current/max*100:0;
 return `<div class="battle-vital ${kind}"><span>${label}</span><div role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.max(1,max)}" aria-valuenow="${current}" aria-valuetext="${current} / ${max}"><i style="width:${percent}%"></i><b>${current} / ${max}</b></div></div>`;
}
export function combatView({s,online,esc,button}) {
 const f=s.combat;if(!f)return '';
 const st=stats(s),bag=stacks(s),hit=s.lastHit,variant=enemyVariants.find(v=>v.id===f.variant);
 const journal=f.log?.length?f.log:[`Chạm trán ${f.name}.`];
 const weapon=(slot,action,label,power,ammo)=>{
  const count=ammo?bag[ammo]||0:0,missing=!s.equipped[slot],disabled=slot!=='weapon'&&missing||!!ammo&&count<=0;
  const status=missing?slot==='weapon'?'Tay không':'Chưa trang bị':ammo?count>0?`×${count} ${slot==='special'?'pin':'đạn'}`:`Hết ${slot==='special'?'pin':'đạn'}`:'Miễn phí';
  const hint=slot==='special'?'Sát thương lên khiên ×1,2. Dùng 1 pin mỗi lượt.':slot==='destructive'?'Sát thương lên khiên ×0,5. Dùng 1 đạn mỗi lượt.':'Tấn công bằng vũ khí chính, không tốn đạn.';
  return `<div class="battle-weapon-slot"><span>${label}</span><button class="battle-weapon" data-action="${action}" title="${hint}" aria-label="${label}: ${power} sát thương. ${status}" ${disabled?'disabled':''}><small>DMG <b>${power}</b></small><div>${weaponSilhouette(slot)}<em>${status}</em></div></button></div>`;
 };
 const quick=quickSlots(s).map((id,i)=>{
  const item=supplies.find(v=>v.id===id),count=item?bag[item.id]||0:0;
  const disabled=!item||count<=0||(!item.hp||s.hp>=st.maxHp)&&(!item.energy||s.energy>=st.maxEnergy);
  return `<button class="battle-quick-slot" data-action="item-use" data-id="${item?.id||''}" ${disabled?'disabled':''} title="${item?`+${item.hp} HP / +${item.energy} EN. Dùng một lượt; quái sẽ phản công.`:'Chọn vật phẩm trong tab Đang mặc của Túi đồ.'}"><span>${item?esc(item.name):`Khe nhanh ${i+1}`}</span><small>${item?'×'+count:'Chưa gán'}</small></button>`;
 }).join('');
 const lastHit=!settings(s).hideDamageMeter&&hit?.name===f.name?`<div class="battle-last-hit" role="status"><span>ĐÒN VỪA ĐÁNH <b>${hit.damage}${hit.critical?' · CHÍ MẠNG':''}</b></span><small>${hit.healthDamage??hit.damage} HP · ${hit.shieldDamage||0} lá chắn</small><div class="battle-impact"><i style="width:${Math.min(100,hit.damage/f.hp*100)}%"></i></div></div>`:'';
 return `<section class="combat combat-view" aria-label="Chiến đấu">
 <div class="battle-heading">${button('← Chạy thoát','escape')}<small>${f.pvp?(online?'PVP BẤT ĐỒNG BỘ':'ĐỐI THỦ MÔ PHỎNG'):s.dungeon?`PHÓ BẢN · TẦNG ${s.dungeon.floor}`:'PVE'} / LƯỢT ${f.turn+1}</small></div>
 <div class="battle-tags"><span>LEVEL ${f.level}</span>${f.faction?`<span>${esc(f.faction)}</span>`:''}<span>${f.boss?'BOSS':variant?.name||'RUNNER'}</span></div><h2>${esc(f.name)}</h2>
 <div class="battle-enemy-vitals">${vital(f.currentShield,f.shield||0,'LÁ CHẮN ĐỊCH','shield')}${vital(f.currentHp,f.hp,'MÁU ĐỊCH','health')}</div>
 <div class="battle-stage">${enemySilhouette(f)}<div class="battle-log"><div class="battle-log-title">NHẬT KÝ GIAO TRANH <span>ATK ${f.attack} / DEF ${f.defense}</span></div><div class="battle-log-entries" role="log" aria-label="Nhật ký giao tranh" aria-live="polite" tabindex="0">${journal.slice(0,16).reverse().map(text=>`<p>${esc(text)}</p>`).join('')}</div></div><div class="battle-stage-footer"><span>${f.boss&&((f.turn+1)%3===0)?'⚠ Đòn tiếp theo: xung điện ×2':variant?.description||'Không có biến thể.'}</span>${s.dungeon?.instance?`<span>Đóng góp ${f.contribution||0}% / cần 20%${s.level>f.level+12?' · vượt cấp nhận thưởng':''}</span>`:''}</div></div>
 ${lastHit}<div class="combat-command-anchor"><div class="combat-command-deck" role="group" aria-label="Điều khiển chiến đấu">
 <div class="battle-player-vitals">${vital(s.shield,st.maxShield,'LÁ CHẮN CỦA BẠN','shield')}${vital(s.hp,st.maxHp,'MÁU CỦA BẠN','health')}</div>
 <div class="battle-quick-slots" role="group" aria-label="Vật phẩm nhanh">${quick}</div>
 <div class="battle-weapons" role="group" aria-label="Vũ khí">${weapon('weapon','attack','CHÍNH',st.attack)}${weapon('special','special','ĐẶC BIỆT',st.specialAttack,'energy-cell')}${weapon('destructive','destructive','HỦY DIỆT',st.destructiveAttack,'antimatter')}</div>
 <div class="battle-utilities">${button('Xung · 3 EN','skill','',s.energy<3)}${button('Tiêm · 25 ₡','heal','',s.credits<25||s.hp>=st.maxHp)}${button('Rút lui','escape')}</div><small class="battle-turn-hint">${s.energy} / ${st.maxEnergy} EN · Mỗi đòn đánh hoặc vật phẩm dùng một lượt</small></div></div>
 <details class="combat-help" data-ui-panel="combat-help"><summary>Chi tiết chiến đấu</summary><p class="hint">Vũ khí đặc biệt và hủy diệt dùng một viên mỗi phát; mua hoặc chế tạo ở Túi đồ. ${st.stun?`Choáng ${Math.round(st.stun*100)}% · `:''}${st.regen?`Tái sinh ${st.regen} HP/lượt · `:''}${s.dungeon?.mode&&s.dungeon.mode!=='normal'?`Rút lui: ${Math.round(st.escape*100)}% thành công.`:'Rút lui luôn thành công ở chế độ hiện tại.'}</p></details></section>`;
}
export function nearbyView({s,esc,button}){
 const source=enemies.find(e=>e.map===s.map),mark=playerMark(s);
 return `<div class="section-label">ĐỊCH GẦN ĐÂY <span>${mark?mark.name:'KHÔNG CÓ DẤU CHỦ ĐẠO'}</span></div><p class="hint">Dấu trên bộ trang bị được chọn theo đa số: Xuyên thấu khắc Helix, Phân rã khắc Bóng Mờ, Chết chóc khắc Liên Minh Tro (+10% sát thương). Khi bằng nhau không có dấu chủ đạo.</p><div class="nearby-enemies">${enemyVariants.map(v=>{const f=enemyProfile(source,v.id);return `<article class="card"><h3>${esc(f.name)}</h3><p>${esc(f.faction)} · ${f.hp} HP / ${f.shield} khiên · ${f.attack} ATK</p><p>${v.description}</p><p class="reward">+${f.xp} XP / +${f.credits} ₡</p>${button('Giao tranh · 2 EN','fight',v.id,!!s.work||!!s.combat||!!s.dungeon||s.energy<2)}</article>`;}).join('')}</div>`;
}
