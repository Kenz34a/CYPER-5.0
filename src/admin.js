// Server only. Roles are assigned by the trusted CLI, never by browser payloads.
import {randomBytes} from 'node:crypto';
import {gear, contentCount} from './content.js';
import {note} from './game.js';
import {worldAction} from './world.js';

export const isAdmin = u => u?.role === 'admin';
export const banned = (u, now = Date.now()) => !!u?.moderation?.ban &&
  (u.moderation.ban.until === 0 || u.moderation.ban.until > now);
export const muted = (u, now = Date.now()) => (u?.moderation?.muteUntil || 0) > now;
const management = db => db.management || {maintenance: false, announcement: null, audit: []};
export const publicManagement = db => ({maintenance: management(db).maintenance,
  announcement: management(db).announcement});
const player = (u, now) => ({id: u.id, username: u.username, name: u.state.name,
  admin: isAdmin(u), level: u.state.level, credits: u.state.credits,
  units: u.state.units ?? 3, scrap: u.state.scrap ?? 6, map: u.state.map,
  createdAt: u.state.createdAt || null, banned: banned(u, now),
  banUntil: u.moderation?.ban?.until ?? null, muteUntil: u.moderation?.muteUntil || 0,
  busy: !!(u.state.combat || u.state.dungeon || u.state.work)});

export function adminView(db, {query = '', page = 0, section = 'players', mode = 'json', now = Date.now()} = {}) {
  const search = query.trim().toLocaleLowerCase('vi').slice(0, 80);
  const users = db.users.filter(u => [u.username, u.state.name, u.id].some(v => String(v).toLocaleLowerCase('vi').includes(search)));
  const pages = Math.max(1, Math.ceil(users.length / 20));
  page = Math.min(Math.max(0, Number.isSafeInteger(page) ? page : 0), pages - 1);
  const m = management(db);
  return {section, query: search, page, pages, matches: users.length, now,
    stats: {players: db.users.length, banned: db.users.filter(u => banned(u, now)).length,
      sessions: Object.values(db.sessions || {}).filter(s => s.expires > now).length,
      listings: db.market.length, rooms: (db.expeditions || []).length, content: contentCount, mode},
    maintenance: m.maintenance, announcement: m.announcement,
    players: section === 'players' ? users.slice(page * 20, page * 20 + 20).map(u => player(u, now)) : [],
    // Global/guild moderation only; never expose private mail or passwords.
    messages: section === 'chat' ? db.messages.slice(-100).reverse().map(v => ({id: v.id,
      author: v.author, name: db.users.find(u => u.id === v.author)?.state.name || 'Runner',
      text: v.text, channel: v.channel || 'global', time: v.time, item: v.item?.name || ''})) : [],
    listings: section === 'market' ? db.market.slice(-100).reverse().map(v => ({id: v.id,
      name: gear.find(g => g.id === v.gear)?.name || v.gear, seller: v.seller,
      sellerName: db.users.find(u => u.id === v.seller)?.state.name || 'Runner', price: v.price})) : [],
    audit: section === 'audit' ? m.audit.slice(-100).reverse() : []};
}

export function audit(db, actor, action, target, reason, details, requestId = null, now = Date.now()) {
  db.management ||= {maintenance: false, announcement: null, audit: []};
  db.management.audit.push({id: randomBytes(12).toString('hex'), actor: actor.id,
    actorName: actor.username, action, target, reason, details, requestId, time: now});
  db.management.audit = db.management.audit.slice(-1000);
}

export function adminAction(db, actor, b, now = Date.now()) {
  if (!isAdmin(actor)) return {status: 403, error: 'Chỉ admin được sử dụng.'};
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (b.confirm !== true || reason.length < 5 || reason.length > 200 ||
      typeof b.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(b.requestId) ||
      !Number.isSafeInteger(b.issuedAt) || b.issuedAt > now + 30000 || b.issuedAt + 300000 <= now)
    return {status: 400, error: 'Cần xác nhận, lý do 5–200 ký tự và mã yêu cầu hợp lệ.'};
  // Persist a separate bounded idempotency ledger so frequent CLI audit entries
  // cannot evict compensation receipts. A replay with different data is denied.
  const fingerprint = JSON.stringify([b.action, b.id, b.amount, b.resource, b.hours, b.text, b.enabled, reason, b.issuedAt]);
  const previous = (db.management?.receipts || []).find(v => v.actor === actor.id && v.id === b.requestId);
  if (previous) return previous.fingerprint === fingerprint ? {ok: true, duplicate: true} : {status: 409, error: 'Mã yêu cầu đã được dùng cho thao tác khác.'};
  if ((db.management?.receipts || []).filter(v => v.expiresAt > now).length >= 2000)
    return {status: 429, error: 'Có quá nhiều thao tác quản trị. Chờ năm phút.'};
  const target = db.users.find(u => u.id === b.id);
  let details = {}, targetId = target?.id || null;
  if (['ban', 'unban', 'mute', 'unmute', 'grant'].includes(b.action)) {
    if (!target) return {status: 404, error: 'Không tìm thấy tài khoản.'};
    if (isAdmin(target) && ['ban', 'mute'].includes(b.action)) return {status: 400, error: 'Không khóa hoặc cấm chat tài khoản admin.'};
  }
  switch (b.action) {
    case 'ban': {
      if (!Number.isSafeInteger(b.hours) || b.hours < 0 || b.hours > 8760) return {status: 400, error: 'Thời hạn 0–8760 giờ; 0 là vô thời hạn.'};
      const until = b.hours ? now + b.hours * 3600000 : 0;
      (target.moderation ||= {}).ban = {until, reason, by: actor.id, time: now};
      for (const [key, s] of Object.entries(db.sessions || {})) if (s.id === target.id) delete db.sessions[key];
      details = {until}; break;
    }
    case 'unban': if (!target.moderation?.ban) return {status: 400, error: 'Tài khoản chưa bị khóa.'}; delete target.moderation.ban; break;
    case 'mute': {
      if (!Number.isSafeInteger(b.hours) || b.hours < 1 || b.hours > 720) return {status: 400, error: 'Cấm chat 1–720 giờ.'};
      (target.moderation ||= {}).muteUntil = now + b.hours * 3600000;
      details = {until: target.moderation.muteUntil}; break;
    }
    case 'unmute': if (!target.moderation?.muteUntil) return {status: 400, error: 'Tài khoản chưa bị cấm chat.'}; delete target.moderation.muteUntil; break;
    case 'grant': {
      if (!['credits', 'units', 'scrap'].includes(b.resource) || !Number.isSafeInteger(b.amount) || b.amount < 1 || b.amount > 1000000)
        return {status: 400, error: 'Chọn credits/Unit/linh kiện và số lượng 1–1.000.000.'};
      if (target.state.combat || target.state.dungeon || target.state.work) return {status: 400, error: 'Runner cần kết thúc giao tranh, dungeon hoặc công việc trước.'};
      const before = target.state[b.resource] ?? (b.resource === 'units' ? 3 : b.resource === 'scrap' ? 6 : 0);
      if (!Number.isSafeInteger(before + b.amount)) return {status: 400, error: 'Số dư vượt giới hạn.'};
      target.state[b.resource] = before + b.amount;
      note(target.state, `Admin hỗ trợ +${b.amount} ${b.resource}.`);
      details = {resource: b.resource, amount: b.amount, before, after: before + b.amount}; break;
    }
    case 'delete-message': {
      const message = db.messages.find(v => v.id === b.id);
      if (!message) return {status: 404, error: 'Tin nhắn không còn tồn tại.'};
      targetId = message.author; details = {message: message.id, channel: message.channel || 'global'};
      db.messages = db.messages.filter(v => v.id !== message.id).map(v => {if (v.reply?.id === message.id) delete v.reply; return v;}); break;
    }
    case 'cancel-listing': {
      const listing = db.market.find(v => v.id === b.id), seller = listing && db.users.find(u => u.id === listing.seller);
      if (!listing || !seller) return {status: 404, error: 'Tin rao không còn tồn tại.'};
      if (!worldAction(db, seller, {action: 'market-cancel', id: listing.id}, now)) return {status: 400, error: 'Người bán cần kết thúc giao tranh hoặc dungeon trước khi thu hồi.'};
      targetId = seller.id; details = {listing: listing.id, gear: listing.gear}; break;
    }
    case 'announce': {
      if (typeof b.text !== 'string' || b.text.trim().length > 500) return {status: 400, error: 'Thông báo tối đa 500 ký tự; để trống để gỡ.'};
      db.management ||= {maintenance: false, announcement: null, audit: []};
      db.management.announcement = b.text.trim() ? {text: b.text.trim(), time: now} : null;
      details = {text: b.text.trim()}; break;
    }
    case 'maintenance': {
      if (typeof b.enabled !== 'boolean') return {status: 400, error: 'Trạng thái bảo trì không hợp lệ.'};
      db.management ||= {maintenance: false, announcement: null, audit: []};
      db.management.maintenance = b.enabled; details = {enabled: b.enabled}; break;
    }
    default: return {status: 400, error: 'Thao tác admin không hợp lệ.'};
  }
  audit(db, actor, b.action, targetId, reason, details, b.requestId, now);
  (db.management.receipts ||= []).push({actor: actor.id, id: b.requestId, fingerprint, expiresAt: b.issuedAt + 300000});
  db.management.receipts = db.management.receipts.filter(v => v.expiresAt > now);
  return {ok: true};
}
