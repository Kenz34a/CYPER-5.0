import {gear,rarities} from './content.js';
import {blueprints,materials,supplies,bagSize,bagCapacity} from './inventory-state.js';

const actionIcon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${kind==='take'?'<path d="M4 17v-5a2 2 0 0 1 4 0V7a2 2 0 0 1 4 0v4-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v8l-3 5H8z"/>':'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10l4 6m0-6-4 6"/>'}</svg>`;

export function lootView({s,esc,button,icon,discard=false}){
 const loot=s.pendingLoot;if(!loot)return '';
 return `<section class="loot-screen" aria-labelledby="loot-title">
  <div class="loot-heading"><h1 id="loot-title">${esc(loot.source)}</h1><span>TÚI ${bagSize(s)} / ${bagCapacity(s)}</span></div>
  <blockquote>${esc(loot.description)}</blockquote>
  <div class="loot-list">${loot.items.map(entry=>{
   const g=entry.kind==='gear'?gear.find(v=>v.id===entry.id):null,item=g||[...blueprints,...materials,...supplies].find(v=>v.id===entry.id);
   return `<article class="loot-row tier${item?.rarity??0}"><span class="loot-icon" aria-hidden="true">${g?icon(g.slot):item?.icon||'⬡'}</span><div>${g?button(esc(item.name),'detail',g.id):`<b>${esc(item?.name||entry.id)}</b>`}${g?`<small>${rarities[g.rarity]} · Cấp ${g.level}</small>`:''}</div><span class="loot-count">×${entry.count}</span></article>`;
  }).join('')}</div>
  <p class="loot-capacity-hint">Đồ được lấy sẽ vào túi. Nếu túi đầy, phần còn lại được giữ trong hộp thư 7 ngày.</p>
  <div class="loot-command-deck">${discard?`<div class="loot-discard-confirm" role="alert"><p>Hủy toàn bộ đồ đang chờ nhận? Bạn sẽ mất các vật phẩm trong danh sách này.</p><div>${button('Giữ lại','loot-discard-cancel')}${button('Xác nhận hủy','loot-discard',loot.id)}</div></div>`:`${button(actionIcon('take')+'LẤY TẤT CẢ','loot-take',loot.id,!!s.work||!!s.combat)}${button(actionIcon('discard')+'HỦY VẬT PHẨM','loot-discard-ask',loot.id,!!s.work||!!s.combat)}`}</div>
 </section>`;
}
