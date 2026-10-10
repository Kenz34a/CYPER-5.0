// Shared navigation and runner HUD. Icons are local SVGs, so the UI works offline.
const shapes = {
  hub: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/>',
  dungeon: '<path d="M4 21V9a8 8 0 0 1 16 0v12Z"/><path d="M9 21v-9h6v9M8 5h8"/>',
  inventory: '<rect x="5" y="6" width="14" height="15" rx="3"/><path d="M9 6V3h6v3M5 13h14M9 11v4M15 11v4"/>',
  missions: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9ZM9 12h6M9 16h6"/>',
  chat: '<path d="M21 14a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"/><path d="M7 8h10M7 12h6"/>',
  account: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  shop: '<path d="M4 8h16l-1 13H5ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  settings: '<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  combat: '<path d="m4 3 7 7-3 3-5-7ZM20 3l-7 7 3 3 5-7ZM4 21l6-6M14 15l6 6M3 16l5 5M16 21l5-5"/>',
  rank: '<path d="M8 3h8v5a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 5 4M16 5h4v3a4 4 0 0 1-5 4M12 12v6M7 21h10M9 18h6"/>',
  tech: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4Z"/>',
  rail: '<rect x="5" y="3" width="14" height="16" rx="4"/><path d="M5 11h14M8 7h8M8 22l2-3M16 22l-2-3M8 15h1M15 15h1"/>',
  group: '<circle cx="9" cy="7" r="3"/><path d="M2 20v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M19 13a5 5 0 0 1 3 5v2"/>',
  bank: '<path d="m3 8 9-5 9 5ZM5 11v7M12 11v7M19 11v7M3 21h18"/>',
  rewards: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3ZM12 8h4a3 3 0 1 0-3-3Z"/>',
};
const aliases = {
  black:'shop', market:'shop', bazaar:'shop', medical:'shop',
  station:'tech', printer:'tech', cores:'tech', cosmetics:'tech', terminal:'tech', admin:'settings',
  boss:'combat', arena:'combat', corporation:'group', headquarters:'group', npc:'account', reputation:'rank',
  exchange:'bank', housing:'hub', commercial:'hub', coast:'map', pets:'rewards', tavern:'chat',
  lore:'missions', codex:'missions', alley:'map',
};
export function navIcon(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[aliases[id] || id] || shapes.map}</svg>`;
}

const groups = [
  ['Khám phá', ['hub','map','rail','dungeon','missions','boss','arena']],
  ['Trang bị & dịch vụ', ['inventory','shop','black','station','printer','medical','cores','terminal','commercial','bank','exchange']],
  ['Thành phố', ['bazaar','market','alley','pets','tavern','coast','housing','cosmetics','npc']],
  ['Cộng đồng', ['chat','corporation','headquarters','rank','reputation','rewards']],
  ['Hồ sơ & dữ liệu', ['account','lore','codex','settings','admin']],
];
export function navigation({tabs,tab,admin,activeCount,label}) {
  return groups.map(([name,ids]) => `<section class="nav-group"><p>${name}</p>${ids.map(id => {
    const entry = tabs.find(t => t[0] === id);
    if (!entry || id === 'admin' && !admin) return '';
    return `<button class="nav ${tab===id?'active':''}" data-action="nav" data-id="${id}" ${tab===id?'aria-current="page"':''}>${navIcon(id)}<span class="nav-label">${label(entry[2])}</span>${id==='missions'&&activeCount?`<small>${activeCount}</small>`:''}</button>`;
  }).join('')}</section>`).join('');
}

export function runnerHUD({s,st,esc}) {
  const hp=Math.max(0,Math.min(100,s.hp/st.maxHp*100));
  const xp=Math.max(0,Math.min(100,s.xp/(s.level*60)*100));
  return `<section class="runner-hud" aria-label="Chỉ số nhân vật"><div class="runner-identity"><div class="runner-level"><small>LV</small><b>${s.level}</b></div><div><b>${esc(s.name)}</b><small>${s.xp.toLocaleString('vi')} / ${(s.level*60).toLocaleString('vi')} XP</small><div class="runner-xp"><i style="width:${xp}%"></i></div></div></div><div class="runner-vitals"><div><label><span>HP</span><b>${s.hp} <small>/ ${st.maxHp}</small></b></label><div class="bar"><i style="width:${hp}%"></i></div></div><div class="hud-energy"><label><span>EN</span><b>${s.energy} <small>/ 30</small></b></label><div class="bar"><i style="width:${s.energy/30*100}%"></i></div></div></div><button class="hud-settings" data-action="settings-open" aria-label="Mở cài đặt">${navIcon('settings')}</button></section>`;
}
