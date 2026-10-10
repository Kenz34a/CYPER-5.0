// Web uses same-origin fetch. Native apps use the OS HTTP client and cookie store.
let native = null;
let connected = typeof navigator === 'undefined' || navigator.onLine !== false;
let reachable = true;
let installPrompt = null;
let waitingWorker = null;
let changed = () => {};
const serverKey = 'cyper-server-url';

export function validateServerURL(value, allowLocalHTTP = false) {
  if (!value?.trim()) return '';
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Nhập địa chỉ server HTTPS hợp lệ.'); }
  const host = url.hostname;
  const privateHost = host === 'localhost' || host === '[::1]' || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (url.protocol !== 'https:' && !(allowLocalHTTP && url.protocol === 'http:' && privateHost))
    throw new Error('Server phải dùng HTTPS. HTTP nội bộ chỉ có trong bản build thử.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Chỉ nhập địa chỉ gốc của server, không kèm mật khẩu, đường dẫn hay tham số.');
  return url.origin;
}

export function configureNative(options) { native = options; }
export function serverURL() {
  if (!native) return '';
  try { return validateServerURL(localStorage.getItem(serverKey) ?? native.defaultURL ?? '', native.allowLocalHTTP); }
  catch { return ''; }
}
export function saveServerURL(value) {
  if (!native) throw new Error('Bản web dùng server của trang đang mở.');
  const url = validateServerURL(value, native.allowLocalHTTP);
  localStorage.setItem(serverKey, url);
  reachable = true;
  return url;
}
export function platformStatus() {
  return {native: !!native, name: native?.name || 'web', server: serverURL(), connected, reachable,
    installed: !!native || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) || !!globalThis.navigator?.standalone,
    canInstall: !!installPrompt, update: !!waitingWorker};
}

export async function apiRequest(path, body) {
  if (!/^\/api\/(?!\/)/.test(path) || path.includes('..') || path.includes('#')) throw new Error('Đường dẫn API không hợp lệ.');
  let status, data;
  if (native && !serverURL()) throw new Error('Chưa chọn server. Mở Cài đặt → Kết nối ứng dụng để nhập URL; bạn vẫn có thể chơi khách.');
  try {
    if (native) {
      const response = await native.http.request({url: serverURL() + path, method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : {'Content-Type': 'application/json'}, ...(body === undefined ? {} : {data: body}),
        responseType: 'json', connectTimeout: 10000, readTimeout: 15000, disableRedirects: true});
      status = response.status;
      data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(path, {credentials: 'same-origin', cache: 'no-store', redirect: 'error',
          signal: controller.signal, ...(body === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})});
        status = response.status;
        data = await response.json();
      } finally { clearTimeout(timeout); }
    }
  } catch {
    if (reachable) { reachable = false; changed(); }
    throw new Error('Không kết nối được server. Kiểm tra mạng và địa chỉ server rồi thử lại.');
  }
  if (!reachable) { reachable = true; changed(); }
  if (status < 200 || status >= 300) {
    const error = new Error(data?.error || 'Server từ chối yêu cầu.');
    error.status = status;
    throw error;
  }
  return data;
}

export async function installWebApp() {
  if (!installPrompt) return 'Trên iPhone/iPad: mở Safari → Chia sẻ → Thêm vào Màn hình chính. Trên Android/desktop: dùng mục Cài đặt ứng dụng của trình duyệt (cần HTTPS).';
  const prompt = installPrompt;
  installPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  changed();
  return choice.outcome === 'accepted' ? 'Đã yêu cầu cài ứng dụng.' : 'Bạn có thể cài lại từ menu trình duyệt.';
}
export function applyWebUpdate() { waitingWorker?.postMessage({type: 'ACTIVATE_UPDATE'}); }

export function startPlatform({onChange, onBack, onResume}) {
  changed = onChange;
  const connection = value => { connected = value; changed(); };
  if (native) {
    native.network.getStatus().then(s => connection(s.connected)).catch(() => {});
    native.network.addListener('networkStatusChange', s => connection(s.connected));
    if (native.name === 'android') native.app.addListener('backButton', async () => { if (!onBack() && confirm('Thoát CYPER ZERO? Tiến trình đã được lưu.')) await native.app.exitApp(); });
    native.app.addListener('appStateChange', ({isActive}) => { if (isActive) onResume(); });
    return;
  }
  window.addEventListener('online', () => connection(true));
  window.addEventListener('offline', () => connection(false));
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; changed(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; changed(); });
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) location.reload();
    controlled = true;
  });
  navigator.serviceWorker.register('/sw.js', {type: 'module'}).then(registration => {
    const check = () => { if (registration.waiting && navigator.serviceWorker.controller) { waitingWorker = registration.waiting; changed(); } };
    check();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', check));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) registration.update().catch(() => {}); });
  }).catch(() => {});
}
