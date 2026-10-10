import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';

export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export const passwordHash = (password, salt) => scryptSync(password, salt, 64).toString('hex');
export const hasPassword = u => typeof u?.salt === 'string' && /^[a-f0-9]{128}$/.test(u?.password || '');
export function passwordMatches(u, password) {
  return hasPassword(u) && typeof password === 'string' && password.length >= 8 && password.length <= 128 &&
    timingSafeEqual(Buffer.from(passwordHash(password, u.salt), 'hex'), Buffer.from(u.password, 'hex'));
}
export function cookie(req, name) {
  return (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function sessionKey(req) {
  const value = cookie(req, 'cyper_session');
  return /^[a-f0-9]{64}$/.test(value) ? tokenHash(value) : '';
}
export function sessionUser(req, db) {
  const entry = db.sessions?.[sessionKey(req)];
  if (!entry || entry.expires <= Date.now()) return null;
  return db.users.find(u => u.id === entry.id) || null;
}
export function issueSession(db, u, method = 'password', secure = process.env.COOKIE_SECURE === '1' || process.env.NODE_ENV === 'production') {
  db.sessions ||= {};
  for (const [key, entry] of Object.entries(db.sessions)) if (!entry || entry.expires <= Date.now()) delete db.sessions[key];
  const own = Object.entries(db.sessions).filter(([,v]) => v.id === u.id).sort((a,b) => a[1].expires - b[1].expires);
  for (const [key] of own.slice(0, Math.max(0, own.length - 31))) delete db.sessions[key];
  const token = randomBytes(32).toString('hex');
  db.sessions[tokenHash(token)] = {id: u.id, expires: Date.now() + 7 * 86400000, authenticatedAt: Date.now(), method};
  return `cyper_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure ? '; Secure' : ''}`;
}
