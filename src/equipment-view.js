import {rarities} from './content.js';
import {calibration,itemStats,modules,slots,upgradeCost} from './equipment.js';
import {gearMark} from './gear-rules.js';
import {hasRoom,stacks} from './inventory-state.js';
import {shopPrice} from './game.js';

const number=value=>new Intl.NumberFormat('vi-VN').format(value);

export function equipmentDetailView({s,g,esc,button,icon,slotName,online,world}){
 const c=calibration(s,g.id),v=itemStats(s,g.id),mark=gearMark(g),available=slots(s,g.id);
 const owned=s.inventory.includes(g.id),equipped=Object.values(s.equipped).includes(g.id);
 const pending=s.pendingLoot?.items.some(v=>v.kind==='gear'&&v.id===g.id);
 const reserved=s.housing?.storage?.includes(g.id)||s.escrow?.includes(g.id)||pending;
 const active=!!s.combat||!!s.work,underLevel=g.level>s.level,maxed=c.level>=5;
 const cost=upgradeCost(s,g.id),price=shopPrice(g,online?world?.discount||0:0);
 const next=maxed?v:itemStats({...s,calibration:{...s.calibration,[g.id]:{...c,level:c.level+1}}},g.id);
 const primary=['weapon','special','destructive'].includes(g.slot)?'SÁT THƯƠNG':['armor','helmet','legs','boots'].includes(g.slot)?'GIÁP':'SỨC MẠNH';
 const attributes=[
  [primary,'power',false],['MÁU','health',false],['SÁT THƯƠNG MODULE','damage',false],
  ['GIÁP MODULE','armor',false],['TỈ LỆ CHÍ MẠNG','crit',true],['LÁ CHẮN','shield',false],
  ['HỒI MÁU / LƯỢT','regen',false],['TỈ LỆ CHOÁNG','stun',true],
  ['CƠ HỘI RÚT LUI','escape',true],['Ô TÚI BỔ SUNG','pocket',false]
 ].filter(([,key])=>v[key]||next[key]);
 const value=(stats,key,percent)=>number(percent?Math.round(stats[key]*100):stats[key])+(percent?'%':'');
 const upgradeReason=pending?'Quay lại danh sách và lấy trang bị để nâng cấp hoặc lắp module.':!owned?'Mua trang bị để nâng cấp và lắp module.':underLevel?`Cần đạt cấp ${g.level} để nâng cấp và lắp module.`:active?'Hoàn tất giao tranh hoặc công việc trước khi nâng cấp.':maxed?'Đã đạt mức hiệu chuẩn tối đa +5.':s.credits<cost?`Còn thiếu ${number(cost-s.credits)} ₡ để nâng cấp.`:`Mỗi lần nâng cấp cộng 2 sức mạnh. Khe 2 mở ở +2, khe 3 mở ở +4.`;
 return `<section class="item-detail equipment-detail tier${g.rarity}">
  <div class="detail-top">${button('‹ Quay lại','close-detail')}<span>${equipped?'ĐANG TRANG BỊ':owned?'TRONG TÚI ĐỒ':pending?'CHIẾN LỢI PHẨM':g.black?'CHỢ ĐEN':'CỬA HÀNG'}</span></div>
  <div class="equipment-hero">
   <div class="equipment-watermark ${g.slot==='boots'?'equipment-pair':''}" aria-hidden="true">${icon(g.slot)}${g.slot==='boots'?icon(g.slot):''}</div>
   <h1>${esc(g.name)}${c.level?` <span class="equipment-rank">+${c.level}</span>`:''}</h1>
   <div class="item-strip"><span>CẤP ĐỘ ${g.level}</span><span>${esc(slotName(g.slot))}</span><span>${mark.name}</span></div>
   <div class="quality-heading"><span>CHẤT LƯỢNG</span><span><b>${number(v.quality)} / 100</b><small>${maxed?'Hiệu chuẩn tối đa':`+${number(next.quality-v.quality)} sau nâng cấp`}</small></span></div>
   <div class="equipment-quality"><div class="quality-track" role="progressbar" aria-label="Chất lượng trang bị" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.quality}"><i style="width:${v.quality}%"></i></div><b>${v.quality}%</b></div>
   <div class="calibration-row"><div><span>SỐ LẦN NÂNG CẤP <b>${c.level} / 5</b></span><div class="calibration-boxes" aria-label="Hiệu chuẩn +${c.level} trên tối đa +5">${Array.from({length:5},(_,i)=>`<i class="${i<c.level?'filled':''}"></i>`).join('')}</div></div>${button(maxed?'ĐÃ TỐI ĐA':`NÂNG CẤP · ${number(cost)} ₡`,'upgrade',g.id,!owned||underLevel||active||maxed||s.credits<cost)}</div>
   <dl class="item-attributes">${attributes.map(([label,key,percent])=>`<div data-stat="${key}"><dt>${label}</dt><dd>+${value(v,key,percent)}</dd>${!maxed&&next[key]!==v[key]?`<dd class="equipment-next" aria-label="Sau nâng cấp: ${value(next,key,percent)}"><span>↗ ${value(next,key,percent)}</span><small>+${value({[key]:next[key]-v[key]},key,percent)}</small></dd>`:''}</div>`).join('')}</dl>
   <blockquote>${esc(g.description)}</blockquote>
   <p class="equipment-mark">${mark.name} <span>Khắc ${mark.prey} · yếu trước ${mark.weak}</span></p>
  </div>
  <p class="equipment-upgrade-hint">${upgradeReason}</p>
  <div class="detail-controls">${owned?button(equipped?'Đang trang bị':'Trang bị','equip',g.id,equipped||underLevel||active)+button(`Bán · ${number(Math.floor(g.price*.4))} ₡`,'sell',g.id,equipped||active):button(pending?'Chưa nhận':reserved?'Đang ở kho / chợ':`Mua · ${number(price)} ₡`,'buy',g.id,reserved||underLevel||s.credits<price||active)}${owned?button('Tái chế · '+(1+g.rarity)+' linh kiện','scrap-gear',g.id,equipped||active||!!s.dungeon):''}${button('Trạm hiệu chuẩn ↗','nav','station')}</div>
  <div class="module-panel">
   <div class="section-label">NÂNG CẤP KHE <span>${available} / 3 ĐÃ MỞ</span></div>
   ${Array.from({length:3},(_,i)=>{
    const m=modules.find(mod=>mod.id===c.modules[i]),locked=i>=available;
    return `<article class="module-slot ${locked?'locked':m?'module-filled':'module-empty'}" aria-label="Khe module ${i+1}${locked?' đã khóa':''}">
     <div class="module-tag">KHE ${i+1}</div>
     <div class="module-body"><span class="module-icon" aria-hidden="true">${icon('implant')}</span><div><h3>${locked?'ĐÃ KHÓA':m?esc(m.name):'TRỐNG'}</h3><p>${locked?`Mở khi hiệu chuẩn +${i*2}`:m?m.label:'Sẵn sàng lắp module'}</p></div>${m?'<span class="module-status">ĐÃ LẮP</span>':''}</div>
     ${locked?'':`<details class="module-editor" data-ui-panel="module-${g.id}-${i}"><summary>${m?'Thay module':'Lắp module'} <span>+</span></summary><form class="module-form" data-slot="${i}"><label for="gear-module-${i}">Chọn module</label><div><select id="gear-module-${i}" name="module" aria-label="Module khe ${i+1}">${modules.map(mod=>`<option value="${mod.id}" ${mod.id===m?.id?'selected':''}>${esc(mod.name)} · ${mod.label} · ${stacks(s)['mod-'+mod.id]>0?`có ${number(stacks(s)['mod-'+mod.id])} trong túi`:number(mod.price)+' ₡'}</option>`).join('')}</select><button ${!owned||underLevel||active?'disabled':''}>${m?'Thay':'Lắp'}</button></div></form>${m?'<p class="module-warning">Thay trực tiếp sẽ mất module cũ. Tháo trước để giữ lại.</p>':'<p class="hint">Dùng module trong túi trước; nếu chưa có sẽ mua bằng credits.</p>'}</details>${m?`<div class="module-remove-row">${button('Tháo và giữ module','module-remove',g.id+':'+i,!owned||active||!!s.dungeon||!hasRoom(s,'mod-'+m.id))}</div>`:''}`}
    </article>`;
   }).join('')}
   <p class="equipment-module-hint">Module chỉ cộng chỉ số khi đang dùng trang bị. Tháo module cần chỗ trống trong túi và phải ở ngoài phó bản.</p>
  </div>
 </section>`;
}
