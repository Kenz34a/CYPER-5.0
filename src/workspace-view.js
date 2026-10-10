import {navIcon} from './ui-shell.js';

export function inventoryPane(content, online) {
  return `<section class="workspace-pane workspace-inventory" aria-label="Túi đồ bên trái"><div class="workspace-heading"><span>${navIcon('inventory')} TÚI ĐỒ</span><small>${online?'NHÂN VẬT ONLINE':'KHÁCH CỤC BỘ'}</small></div><div class="workspace-inventory-body" tabindex="-1">${content}</div></section>`;
}
export function communicationsPane(content, mode) {
  return `<section class="workspace-pane workspace-comms" data-mode="${mode}" aria-label="Trò chuyện bên phải" tabindex="-1">${content}</section>`;
}
