// Web uses same-origin fetch. Native apps use the OS HTTP client and cookie store.
let native = null;
let connected = typeof navigator === 'undefined' || navigator.onLine !== false;
let reachable = true;
let installPrompt = null;
let waitingWorker = null;
let changed = () => {};
let googlePending = null;
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

const googleErrors = {
  invalid:'Phiên Google đã hết hạn hoặc không hợp lệ. Hãy thử lại.', denied:'Đã hủy đăng nhập Google.',
  disabled:'Server chưa bật Google.', unavailable:'Không xác minh được Google. Hãy thử lại.',
  conflict:'Google này đã liên kết với một nhân vật khác.', banned:'Tài khoản đang bị khóa.',
  maintenance:'Game đang bảo trì; đăng ký tạm dừng.', session:'Đăng nhập lại tài khoản cũ trước khi liên kết Google.'
};
export function googleReturnNotice() {
  const url = new URL(location.href), error = url.searchParams.get('auth_error'), success = url.searchParams.get('auth');
  if (!error && !success) return '';
  url.searchParams.delete('auth_error'); url.searchParams.delete('auth');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  return error ? googleErrors[error] || googleErrors.unavailable : 'Đã kết nối Google.';
}
export async function cancelGoogleLogin() {
  const pending = googlePending;
  if (!pending || pending.phase === 'finishing') return;
  pending.phase = 'cancelled';
  pending.reject(new Error('Đã hủy đăng nhập Google.'));
  apiRequest('/api/auth/google/native/cancel', {flow:pending.flow,verifier:pending.verifier}).catch(() => {});
  native?.browser.close().catch(() => {});
}
export async function handleGoogleReturn(value) {
  let url;
  try { url = new URL(value); } catch { return; }
  const pending = googlePending;
  if (url.protocol !== 'com.kenz34a.cyperzero:' || url.host !== 'auth' || url.pathname !== '/google' ||
    !pending || pending.phase !== 'waiting' || url.searchParams.getAll('flow').length !== 1 || url.searchParams.get('flow') !== pending.flow) return;
  pending.phase = 'finishing';
  try {
    if (url.searchParams.has('error')) throw new Error(googleErrors[url.searchParams.get('error')] || googleErrors.unavailable);
    if (url.searchParams.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code') || '')) throw new Error(googleErrors.invalid);
    const result = await apiRequest('/api/auth/google/native/finish', {flow:pending.flow,verifier:pending.verifier,code:url.searchParams.get('code')});
    pending.resolve(result);
  } catch (error) {
    apiRequest('/api/auth/google/native/cancel', {flow:pending.flow,verifier:pending.verifier}).catch(() => {});
    pending.reject(error);
  } finally { native.browser.close().catch(() => {}); }
}
export async function startGoogleLogin(password) {
  if (!native) {
    const target = password === undefined ? '/api/auth/google/start' :
      (await apiRequest('/api/auth/google/link/start', {password,channel:'web'})).url;
    location.assign(target); return null;
  }
  if (googlePending) throw new Error('Một phiên Google đang chờ hoàn tất.');
  if (!serverURL()) throw new Error('Thêm địa chỉ server HTTPS trong Cài đặt trước.');
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const prepared = await apiRequest(password === undefined ? '/api/auth/google/native/start' : '/api/auth/google/link/start',
    {verifier,channel:'native',...(password === undefined ? {} : {password})});
  const target = new URL(prepared.url);
  if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/api/auth/google/start' ||
    !/^[A-Za-z0-9_-]{43}$/.test(prepared.flow || '') || target.searchParams.get('flow') !== prepared.flow) throw new Error('Địa chỉ đăng nhập Google không hợp lệ.');
  let finish, fail, listener, timer;
  const completed = new Promise((resolve,reject) => {finish=resolve;fail=reject;});
  // Attach a rejection handler before the browser can close during open().
  completed.catch(() => {});
  googlePending = {flow:prepared.flow,verifier,phase:'waiting',resolve:finish,reject:fail};
  try {
    listener = await native.browser.addListener('browserFinished', () => {if(googlePending?.phase==='waiting')cancelGoogleLogin();});
    timer = setTimeout(() => {if(googlePending?.phase==='waiting')cancelGoogleLogin();}, 10*60000);
    await native.browser.open({url:target.href});
    return await completed;
  } catch (error) {
    if (googlePending?.phase === 'waiting') await cancelGoogleLogin();
    throw error;
  } finally { clearTimeout(timer); await listener?.remove().catch(() => {}); googlePending = null; }
}

export function startPlatform({onChange, onBack, onResume}) {
  changed = onChange;
  const connection = value => { connected = value; changed(); };
  if (native) {
    native.app.addListener('appUrlOpen', ({url}) => handleGoogleReturn(url));
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
