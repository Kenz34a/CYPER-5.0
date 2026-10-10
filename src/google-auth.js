import {OAuth2Client} from 'google-auth-library';
import {randomBytes, createHash, timingSafeEqual} from 'node:crypto';
import {fresh} from './game.js';
import {banned, publicManagement} from './admin.js';
import {cookie, sessionKey, sessionUser, passwordMatches, issueSession} from './auth-session.js';

const lifetime = 10 * 60000;
const browserCookie = 'cyper_google_browser';
export const nativeReturnURL = 'com.kenz34a.cyperzero://auth/google';
const random = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('base64url');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const messages = {
  disabled: 'Server chưa cấu hình đăng nhập Google.',
  invalid: 'Phiên Google không hợp lệ hoặc đã hết hạn. Hãy thử lại.',
  denied: 'Đã hủy đăng nhập Google.',
  unavailable: 'Không xác minh được Google. Hãy thử lại.',
  conflict: 'Google này đã liên kết với một nhân vật khác. Không tự gộp tài khoản.',
  banned: 'Tài khoản đang bị khóa.',
  maintenance: 'Game đang bảo trì; đăng ký tạm dừng.',
  session: 'Phiên tài khoản cũ đã hết hạn. Đăng nhập lại trước khi liên kết Google.'
};
class AuthError extends Error {
  constructor(code, status = 400) { super(messages[code]); this.code = code; this.status = status; }
}
export function googleConfig(env = process.env) {
  try {
    const url = new URL(env.PUBLIC_URL);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && url.protocol === 'http:' && local)) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      !env.GOOGLE_CLIENT_ID?.trim() || !env.GOOGLE_CLIENT_SECRET?.trim()) return null;
    return {clientId: env.GOOGLE_CLIENT_ID.trim(), clientSecret: env.GOOGLE_CLIENT_SECRET.trim(),
      publicURL: url.origin, redirectUri: url.origin + '/api/auth/google/callback', native: url.protocol === 'https:',
      secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE === '1' || url.protocol === 'https:'};
  } catch { return null; }
}
export function createGoogleClient(config) {
  return new OAuth2Client({clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri,
    transporterOptions: {timeout: 10000, retry: false}});
}
export async function verifyGoogleCode(client, config, flow, code) {
  const {tokens} = await client.getToken({code, codeVerifier: flow.codeVerifier, redirect_uri: config.redirectUri});
  if (!tokens.id_token) throw new AuthError('unavailable');
  const ticket = await client.verifyIdToken({idToken: tokens.id_token, audience: config.clientId});
  const payload = ticket.getPayload();
  if (!payload || !equal(payload.nonce, flow.nonce) || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
    !Number.isInteger(payload.exp) || payload.exp * 1000 <= Date.now())
    throw new AuthError('invalid');
  return {sub: payload.sub, name: typeof payload.name === 'string' ? payload.name.trim().slice(0, 24) : '', expires: payload.exp * 1000};
}
function json(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'});
  res.end(JSON.stringify(data));
}
function redirect(res, url, cookies) {
  res.writeHead(303, {'Location': url, 'Set-Cookie': cookies, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'});
  res.end();
}
function browserBinding(value, secure, clear = false) {
  return `${browserCookie}=${value}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=${clear ? 0 : 600}${secure ? '; Secure' : ''}`;
}
function nativeResult(res, success, returnURL = nativeReturnURL) {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff'});
  res.end(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CYPER ZERO · Google</title><style>body{margin:0;background:#0c121a;color:#d5e5ef;font:16px/1.7 system-ui;display:grid;min-height:100svh;place-items:center}main{max-width:380px;padding:28px}h1{font-size:26px}a{display:block;background:#72e2c0;color:#0c121a;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:650}p{color:#a0b6c6}</style><main><small>CYPER // ZERO</small><h1>${success ? 'Google đã xác nhận.' : 'Chưa hoàn tất đăng nhập.'}</h1><p>${success ? 'Quay lại game để hoàn tất kết nối tài khoản.' : 'Quay lại game để xem kết quả và thử lại.'}</p><a href="${returnURL.replaceAll('&', '&amp;')}">Quay lại CYPER ZERO</a><p>Nếu game chưa mở, đóng tab này rồi mở lại app.</p></main></html>`);
}
function clean(db) {
  db.oauthFlows ||= {};
  for (const [id, flow] of Object.entries(db.oauthFlows)) if (!flow || flow.expires <= Date.now()) delete db.oauthFlows[id];
}
function live(db, id) {
  const flow = db.oauthFlows?.[id];
  if (!flow || flow.expires <= Date.now()) throw new AuthError('invalid');
  return flow;
}
function owner(db, flow, identity) {
  const existing = db.users.find(u => u.identities?.google?.sub === identity.sub);
  if (flow.linkUserId) {
    const session = db.sessions?.[flow.linkSession];
    const u = db.users.find(u => u.id === flow.linkUserId);
    if (!u || session?.id !== u.id || session.expires <= Date.now()) throw new AuthError('session', 401);
    if (banned(u)) throw new AuthError('banned', 403);
    if (existing && existing.id !== u.id || u.identities?.google && u.identities.google.sub !== identity.sub) throw new AuthError('conflict', 409);
    u.identities ||= {};
    u.identities.google = {sub: identity.sub};
    return u;
  }
  if (existing) {
    if (banned(existing)) throw new AuthError('banned', 403);
    return existing;
  }
  if (publicManagement(db).maintenance) throw new AuthError('maintenance', 503);
  let username;
  do { username = 'gg_' + randomBytes(8).toString('hex'); } while (db.users.some(u => u.username === username));
  const u = {id: randomBytes(12).toString('hex'), username, identities: {google: {sub: identity.sub}}, state: fresh()};
  u.state.name = identity.name || username;
  db.users.push(u);
  return u;
}

// Network calls happen outside storage transactions; no provider override is accepted from HTTP or env.
export function createGoogleAuth({storage, serializeUser, config = googleConfig(), client = config && createGoogleClient(config), throttle = () => true}) {
  return async (req, res, pathname) => {
    if (pathname === '/api/auth/providers' && req.method === 'GET') {
      json(res, 200, {google: {enabled: !!config, native: !!config?.native}}); return true;
    }
    if (!pathname.startsWith('/api/auth/google/')) return false;
    if (!config) { json(res, 503, {error: messages.disabled}); return true; }
    const q = new URL(req.url, 'http://localhost').searchParams;
    let flowId, callbackFlow;
    try {
      if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
        json(res, 403, {error: 'Nguồn yêu cầu không hợp lệ.'}); return true;
      }
      if (['/api/auth/google/native/start', '/api/auth/google/link/start'].includes(pathname) && req.method === 'POST') {
        if (!throttle(req)) { json(res, 429, {error: 'Thử quá nhiều lần. Chờ một phút.'}); return true; }
        const b = req.parsedBody || {};
        const channel = pathname.includes('/native/') || b.channel === 'native' ? 'native' : 'web';
        if (channel === 'native' && (!config.native || !/^[A-Za-z0-9_-]{43}$/.test(b.verifier || ''))) throw new AuthError('invalid');
        flowId = random();
        await storage.transaction(async tx => {
          const db = tx.data; clean(db);
          if (Object.keys(db.oauthFlows).length >= 512) throw new AuthError('unavailable', 429);
          const u = sessionUser(req, db);
          const linking = pathname.includes('/link/');
          if (linking && (!u || banned(u) || !passwordMatches(u, b.password))) throw new AuthError('session', 403);
          if (!linking && u) throw new AuthError('session', 409);
          db.oauthFlows[flowId] = {channel, phase: 'prepared', expires: Date.now() + lifetime,
            ...(channel === 'native' ? {challenge: digest(b.verifier)} : {}), ...(linking ? {linkUserId: u.id, linkSession: sessionKey(req)} : {})};
          tx.dirty = true;
        });
        json(res, 200, {flow: flowId, url: config.publicURL + '/api/auth/google/start?flow=' + flowId}); return true;
      }
      if (pathname === '/api/auth/google/start' && req.method === 'GET') {
        if (!throttle(req)) { json(res, 429, {error: 'Thử quá nhiều lần. Chờ một phút.'}); return true; }
        if (q.getAll('flow').length > 1) throw new AuthError('invalid');
        const binding = random(); flowId = q.get('flow') || random();
        const flow = await storage.transaction(async tx => {
          const db = tx.data; clean(db);
          if (!q.has('flow')) {
            if (sessionUser(req, db)) throw new AuthError('session', 409);
            if (Object.keys(db.oauthFlows).length >= 512) throw new AuthError('unavailable', 429);
            db.oauthFlows[flowId] = {channel: 'web', phase: 'prepared', expires: Date.now() + lifetime};
          }
          const f = live(db, flowId);
          if (f.phase !== 'prepared') throw new AuthError('invalid');
          Object.assign(f, {phase: 'started', binding: digest(binding), codeVerifier: random(), nonce: random()});
          tx.dirty = true; return structuredClone(f);
        });
        const url = client.generateAuthUrl({scope: ['openid', 'profile', 'email'], prompt: 'select_account', state: flowId,
          nonce: flow.nonce, code_challenge: digest(flow.codeVerifier), code_challenge_method: 'S256'});
        redirect(res, url, browserBinding(binding, config.secure)); return true;
      }
      if (pathname === '/api/auth/google/callback' && req.method === 'GET') {
        if (q.getAll('state').length !== 1 || q.getAll('code').length > 1 || q.getAll('error').length > 1) throw new AuthError('invalid');
        flowId = q.get('state');
        callbackFlow = await storage.transaction(async tx => {
          const f = live(tx.data, flowId);
          if (f.phase !== 'started' || !equal(f.binding, digest(cookie(req, browserCookie)))) throw new AuthError('invalid');
          f.phase = 'verifying'; tx.dirty = true; return structuredClone(f);
        });
        if (q.has('error')) throw new AuthError('denied');
        if (!q.get('code') || q.get('code').length > 4096) throw new AuthError('invalid');
        let identity;
        try { identity = await verifyGoogleCode(client, config, callbackFlow, q.get('code')); }
        catch (error) { throw error instanceof AuthError ? error : new AuthError('unavailable'); }
        const result = await storage.transaction(async tx => {
          const f = live(tx.data, flowId);
          if (f.phase !== 'verifying') throw new AuthError('invalid');
          if (f.channel === 'native') {
            const code = random();
            f.identity = identity; f.grant = digest(code); f.phase = 'ready'; f.expires = Math.min(f.expires, identity.expires, Date.now() + 60000);
            delete f.codeVerifier; delete f.nonce; delete f.binding;
            tx.dirty = true; return {code};
          }
          const u = owner(tx.data, f, identity);
          const sessionCookie = issueSession(tx.data, u, 'google', config.secure);
          delete tx.data.oauthFlows[flowId]; tx.dirty = true; return {sessionCookie};
        });
        if (callbackFlow.channel === 'native') {
          res.setHeader('Set-Cookie', browserBinding('', config.secure, true));
          nativeResult(res, true, nativeReturnURL + '?flow=' + flowId + '&code=' + result.code);
        } else redirect(res, config.publicURL + '/?auth=google', [browserBinding('', config.secure, true), result.sessionCookie]);
        return true;
      }
      if (['/api/auth/google/native/finish', '/api/auth/google/native/cancel'].includes(pathname) && req.method === 'POST') {
        const b = req.parsedBody || {};
        if (!/^[A-Za-z0-9_-]{43}$/.test(b.verifier || '')) throw new AuthError('invalid');
        const result = await storage.transaction(async tx => {
          const f = live(tx.data, b.flow);
          if (f.channel !== 'native' || !equal(f.challenge, digest(b.verifier))) throw new AuthError('invalid');
          if (pathname.endsWith('/cancel')) { delete tx.data.oauthFlows[b.flow]; tx.dirty = true; return {cancelled: true}; }
          if (f.phase !== 'ready' || !/^[A-Za-z0-9_-]{43}$/.test(b.code || '') || !equal(f.grant, digest(b.code))) throw new AuthError('invalid');
          if (!f.identity || f.identity.expires <= Date.now()) throw new AuthError('invalid');
          const u = owner(tx.data, f, f.identity);
          const sessionCookie = issueSession(tx.data, u, 'google', config.secure);
          delete tx.data.oauthFlows[b.flow]; tx.dirty = true;
          return {sessionCookie, state: u.state, user: serializeUser(u)};
        });
        if (result.sessionCookie) res.setHeader('Set-Cookie', result.sessionCookie);
        json(res, 200, result.cancelled ? result : {state: result.state, user: result.user}); return true;
      }
      json(res, 405, {error: 'Phương thức hoặc đường dẫn Google không hỗ trợ.'}); return true;
    } catch (error) {
      const known = error instanceof AuthError ? error : new AuthError('unavailable', 503);
      if (pathname === '/api/auth/google/callback') {
        if (callbackFlow?.channel === 'native') {
          await storage.transaction(async tx => {
            const f = tx.data.oauthFlows?.[flowId]; if (f) { f.phase = 'error'; f.error = known.code; delete f.codeVerifier; delete f.nonce; delete f.binding; tx.dirty = true; }
          }).catch(() => {});
          res.setHeader('Set-Cookie', browserBinding('', config.secure, true));
          nativeResult(res, false, nativeReturnURL + '?flow=' + flowId + '&error=' + known.code);
        } else {
          if (callbackFlow) await storage.transaction(async tx => {delete tx.data.oauthFlows[flowId]; tx.dirty = true;}).catch(() => {});
          redirect(res, config.publicURL + '/?auth_error=' + known.code, browserBinding('', config.secure, true));
        }
      } else json(res, known.status, {error: known.message});
      return true;
    }
  };
}
