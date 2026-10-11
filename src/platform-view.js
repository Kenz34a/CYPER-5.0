import {appVersion} from './settings.js';
import {platformStatus} from './platform.js';

export function platformView({online, esc, button, unsafeUpdate}) {
  const p = platformStatus();
  const versions=versionDetails(p,esc,button);
  if (p.native) return `<section class="platform-panel"><div class="section-label">KẾT NỐI ỨNG DỤNG / ${esc(p.name.toUpperCase())}</div><p>Chơi khách ngay trên máy. Đăng nhập cùng tài khoản khi đã có server để tiếp tục nhân vật online trên web, Android và iOS.</p><form id="platform-server-form"><label>Địa chỉ server<input name="server" type="url" inputmode="url" autocomplete="url" placeholder="https://ten-game.onrender.com" value="${esc(p.server)}" ${online?'disabled':''}></label><button ${online?'disabled':''}>Lưu địa chỉ server</button></form><p class="hint">${online?'Đăng xuất trước khi đổi server.':p.server?'Giao diện nằm sẵn trong app; kết nối mạng dùng để đăng nhập và chơi online.':'Chưa có server? Tiếp tục chơi khách; thêm địa chỉ tại đây sau khi triển khai Render.'}</p>${versions}</section>`;
  return `<section class="platform-panel"><div class="section-label">ỨNG DỤNG WEB</div><p>${p.installed?'Bạn đang mở ứng dụng đã cài.':'Cài game vào màn hình chính để mở nhanh, chơi khách khi mất mạng và dùng giao diện toàn màn hình.'}</p><div class="actions">${p.installed?'':button(p.canInstall?'Cài CYPER ZERO':'Cách cài lên màn hình chính','platform-install')}${p.update?button('Cập nhật phiên bản mới','platform-update','',unsafeUpdate):''}</div>${p.update&&unsafeUpdate?'<p class="hint">Kết thúc giao tranh hoặc công việc, đóng hộp thoại rồi cập nhật.</p>':''}${versions}</section>`;
}

function versionDetails(p,esc,button){
 return `<div class="version-details"><p>Giao diện <b>v${appVersion}</b> · Server <b>${p.serverVersion?'v'+esc(p.serverVersion):p.versionChecked?'Chưa xác định':'Đang kiểm tra…'}</b></p>${button(p.checkingUpdate?'Đang kiểm tra…':'Kiểm tra cập nhật','platform-check','',p.checkingUpdate||p.native&&!p.server)}${p.updateError?`<p class="hint">${esc(p.updateError)}</p>`:''}</div>`;
}
export function versionNoticeView({unsafeUpdate,esc,button}){
 const p=platformStatus(),mismatch=p.serverVersion&&p.serverVersion!==appVersion;
 let text=p.native?`Giao diện app v${appVersion} · server v${p.serverVersion}. Cài bản app mới để cập nhật giao diện.`:p.update?`Có bản giao diện mới. Bạn đang dùng v${appVersion}${p.serverVersion?' · server v'+p.serverVersion:''}.`:mismatch?`Giao diện v${appVersion} · server v${p.serverVersion}. Kiểm tra cập nhật; nếu server cũ, khởi động lại từ thư mục game mới.`:'';
 return `<section class="version-notice" role="status" ${p.update||mismatch?'':'hidden'}><div><b>PHIÊN BẢN GAME</b><p>${esc(text)}</p>${p.update&&unsafeUpdate?'<small>Kết thúc giao tranh hoặc công việc, đóng hộp thoại rồi cập nhật.</small>':''}</div>${p.native?'':p.update?button('Cập nhật giao diện','platform-update','',unsafeUpdate):button(p.checkingUpdate?'Đang kiểm tra…':'Kiểm tra cập nhật','platform-check','',p.checkingUpdate)}</section>`;
}
