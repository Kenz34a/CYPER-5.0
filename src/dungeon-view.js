import {expeditionLobby,partyPanel} from './expedition-view.js';
import {dungeonModes,modePlan,dungeonQuestView} from './dungeon-events.js';
import {maps} from './content.js';
import {stats} from './game.js';
import {directions} from './dungeon.js';

const legend = `<div class="dungeon-legend"><span><b>@</b> Bạn</span><span><b>#</b> Tường</span><span><b>♟</b> Địch</span><span><b>Ω</b> Boss</span><span><b>▤</b> Rương</span><span><b>+</b> Hồi phục</span><span><b>!</b> Ký ức</span><span><b>?</b> Nhiệm vụ</span><span><b>△</b> Cửa tầng</span></div>`;

export function dungeonView({s,esc,button,combat,online,world}) {
  const d=s.dungeon;
  if (!d) return `<section class="dungeon-lobby"><div class="eyebrow">EXPEDITION / ${s.dungeonClears||0} LƯỢT HOÀN THÀNH</div><h1>Hầm tín hiệu</h1><p>Khám phá ba tầng dưới ${esc(maps.find(m=>m.id===s.map).name)}. Mở rương, tìm trạm cứu trợ và hạ boss để mở cửa tầng tiếp theo.</p><div class="expedition-facts"><span>03 <small>TẦNG</small></span><span>04 <small>RUNNER / ĐỘI</small></span><span>02 <small>EN / GIAO TRANH</small></span></div><div class="dungeon-mode-list">${dungeonModes.map(m=>`<article class="card"><div class="eyebrow">${m.energy} EN / LƯỢT VÀO</div><h3>${m.name}</h3><p>HP địch ×${m.hp} · ATK ×${m.attack}<br>Thưởng ×${m.reward} · ${m.tokens} token khi hoàn thành</p>${m.id==='corporation'?'<p class="hint">Cần đăng nhập, thành viên tập đoàn và cấp 10.</p>':''}${button('Vào '+m.name.toLowerCase(),'enter-dungeon',m.id,!!s.work||!!s.combat||s.energy<m.energy||m.id==='corporation'&&(!online||!world?.corporation||s.level<10))}</article>`).join('')}</div><details class="dungeon-details" data-ui-panel="dungeon-guide"><summary>Cách khám phá & ký hiệu</summary><p>Chạm ô liền kề, dùng các nút mũi tên hoặc phím WASD. Di chuyển không tốn EN; giao tranh tốn 2 EN. Rời phó bản giữ loot và kết thúc lượt hiện tại.</p>${legend}</details>${expeditionLobby({s,world,online,esc,button})}</section>`;

  const teammates=(world?.party||[]).filter(v=>v.floor===d.floor),st=stats(s);
  const glyph={'#':'#','.':'·',E:'▥',X:'△',B:'Ω',M:'♟',C:'▤',H:'+',T:'!',Q:'?'};
  const labels={'#':'Tường','.':'Sàn',E:'Lối vào',X:'Cửa tầng',B:'Boss',M:'Địch',C:'Rương',H:'Trạm cứu trợ',T:'Hồ sơ ký ức',Q:'Người giữ hầm'};
  const moveButton=(dir,arrow,label)=> {
    const [dx,dy]=directions[dir],x=d.x+dx,y=d.y+dy;
    const blocked=!!s.combat||x<0||y<0||x>=d.width||y>=d.height||d.cells[y*d.width+x]==='#';
    return button(arrow,'dungeon-step',dir,blocked).replace('<button ',`<button aria-label="Di chuyển ${label}" title="Di chuyển ${label}" `);
  };
  const extra = partyPanel({s,world,esc}) + (s.lastLore?.id==='lore-'+d.map?`<article class="card"><h3>! ${esc(s.lastLore.title)}</h3><p>${esc(s.lastLore.text)}</p></article>`:'') + dungeonQuestView(s,button);
  return `<section class="dungeon-screen ${s.combat?'is-fighting':''}">
    <div class="dungeon-top"><div><div class="eyebrow">${modePlan(d).name.toUpperCase()} / LV ${s.level}</div><h1>Hầm tín hiệu <span>Tầng ${d.floor}<small> / 3</small></span></h1></div>${button('Rời hầm','leave-dungeon','',!!s.combat)}</div>
    <div class="dungeon-health"><span>HP</span><div><i style="width:${Math.max(0,s.hp/st.maxHp*100)}%"></i><b>${s.hp} / ${st.maxHp}</b></div><span class="dungeon-energy">${s.energy} EN</span></div>
    <div class="dungeon-workspace"><div class="dungeon-navigation">
      <div class="dungeon-grid-wrap"><div class="dungeon-map-meta"><span>♟ ${d.cells.filter(c=>c==='M').length} · Ω ${d.bossDefeated?0:1} · ▤ ${d.cells.filter(c=>c==='C').length}</span><span>${teammates.length||1} RUNNER</span></div><div class="dungeon-grid" role="group" aria-label="Bản đồ dungeon" style="--columns:${d.width}">${d.cells.map((cell,i)=> {
        const x=i%d.width,y=Math.floor(i/d.width),player=x===d.x&&y===d.y;
        const ally=teammates.find(v=>v.x===x&&v.y===y&&!player),near=Math.abs(x-d.x)+Math.abs(y-d.y)===1;
        const dir=Object.entries(directions).find(([,v])=>d.x+v[0]===x&&d.y+v[1]===y)?.[0];
        return `<button class="tile tile-${cell==='#'?'wall':cell==='.'?'floor':cell} ${player?'player-tile':ally?'ally-tile':''} ${d.visited.includes(i)?'visited':''} ${near&&cell!=='#'?'adjacent':''}" data-action="dungeon-step" data-id="${dir||''}" ${!near||cell==='#'||s.combat?'disabled':''} aria-label="${player?'Bạn':ally?esc(ally.name):labels[cell]}, cột ${x+1}, hàng ${y+1}">${player?'@':ally?'◉':glyph[cell]}</button>`;
      }).join('')}</div><div class="dungeon-player-name"><span>${esc(s.name)}</span><span>${d.x}, ${d.y}</span></div></div>
      <div class="dungeon-status" role="status"><i class="${d.bossDefeated?'unlocked':''}"></i>${d.bossDefeated?'Cửa đã mở · đến △ để tiếp tục':'Hạ boss Ω để mở cửa tầng'}</div>
      <div class="dungeon-control-dock"><div class="dungeon-dock-label"><b>${s.combat?'Giao tranh':'Di chuyển'}</b><small>${s.combat?`${s.hp} HP · ${s.energy} EN`:'WASD / MŨI TÊN'}</small></div><div class="dungeon-controls" role="group" aria-label="Di chuyển">${moveButton('left','←','trái')}${moveButton('up','↑','lên')}${moveButton('down','↓','xuống')}${moveButton('right','→','phải')}</div>${s.combat?`<div class="dungeon-quick-combat" role="group" aria-label="Thao tác chiến đấu nhanh">${button('Tấn công','attack')}${button('Thuốc','heal','',s.credits<25)}${button('Rút lui','escape')}</div>`:''}</div>
    </div><div class="dungeon-battle">${combat()}<div class="dungeon-last-log" role="status">${esc(s.log[0]||'')}</div>${extra?`<details class="dungeon-details" data-ui-panel="dungeon-events"><summary>Thông tin tầng${d.questFound&&!d.questClaimed?' · Có trao đổi mới':''}${d.instance?' · Đội phối hợp':''}</summary>${extra}</details>`:''}<details class="dungeon-details" data-ui-panel="dungeon-legend"><summary>Ký hiệu & hướng dẫn</summary>${legend}<p class="hint">Chạm ô sát @ hoặc dùng nút mũi tên. Di chuyển miễn phí, mỗi giao tranh cần 2 EN. Hạ Ω rồi đến △ để xuống tầng.</p><p class="hint">${esc(maps.find(m=>m.id===d.map).name)}</p></details></div></div>
  </section>`;
}
