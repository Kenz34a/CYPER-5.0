import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminAction, adminView, banned, muted, isAdmin, publicManagement} from '../src/admin.js';
import {fresh} from '../src/game.js';
import {initWorld} from '../src/world.js';
import {adminView as renderAdmin} from '../src/admin-view.js';

const now = 1700000000000;
function fixture() {
  const db = {users: [{id: 'admin', username: 'owner', role: 'admin', state: fresh(), password: 'secret-hash', salt: 'secret-salt'},
    {id: 'runner', username: 'runner', state: fresh()}], sessions: {tokenHash: {id: 'runner', expires: now + 86400000}}};
  initWorld(db); return db;
}
const payload = (action, extra = {}) => ({action, id: 'runner', password: 'must-not-persist',
  confirm: true, reason: 'Kiểm thử quản trị', requestId: randomUUID(), issuedAt: now, ...extra});

test('admin bans revoke sessions, protect administrators and respect real expiry', () => {
  const db = fixture(), admin = db.users[0], user = db.users[1];
  const before = structuredClone(db);
  assert.equal(adminAction(db, user, payload('ban', {hours: 24}), now).status, 403);
  assert.deepEqual(db, before);
  assert.equal(adminAction(db, admin, payload('ban', {id: 'admin', hours: 0}), now).status, 400);
  assert.deepEqual(db, before);
  assert(adminAction(db, admin, payload('ban', {hours: 24}), now).ok);
  assert(banned(user, now)); assert(!banned(user, now + 86400000)); assert.equal(Object.keys(db.sessions).length, 0);
  assert(adminAction(db, admin, payload('unban'), now).ok); assert(!banned(user, now));
  assert(adminAction(db, admin, payload('ban', {hours: 0}), now).ok); assert(banned(user, now + 99999999999));
  assert.equal(db.management.audit.length, 3); assert(!JSON.stringify(db.management).includes('must-not-persist'));
});

test('admin compensation validates before mutation and cannot replay after receipt eviction', () => {
  const db = fixture(), admin = db.users[0], grant = payload('grant', {resource: 'credits', amount: 100});
  for (const extra of [{amount: -1}, {amount: 1.5}, {amount: 1000001}, {resource: 'role'}, {confirm: false}, {reason: 'x'}]) {
    const before = structuredClone(db); assert.equal(adminAction(db, admin, {...grant, ...extra}, now).status, 400); assert.deepEqual(db, before);
  }
  assert(adminAction(db, admin, grant, now).ok); assert.equal(db.users[1].state.credits, 280);
  assert.equal(adminAction(db, admin, grant, now).duplicate, true); assert.equal(db.users[1].state.credits, 280);
  assert.equal(adminAction(db, admin, {...grant, amount: 200}, now).status, 409);
  assert.equal(adminAction(db, admin, grant, now + 300000).status, 400);
  db.management.receipts = Array.from({length: 2000}, (_, i) => ({id: 'other-' + i, actor: 'admin', expiresAt: now + 300000}));
  assert.equal(adminAction(db, admin, payload('grant', {resource: 'units', amount: 1}), now).status, 429);
  assert.equal(db.users[1].state.units, 3);
  db.users[1].state.role = 'admin'; assert(!isAdmin(db.users[1]));
});

test('moderation removes quoted chat without reading mail, and timed mute expires', () => {
  const db = fixture(), admin = db.users[0], user = db.users[1];
  db.messages = [{id: 'bad', author: 'runner', text: 'deleted'}, {id: 'reply', author: 'admin', text: 'reply', reply: {id: 'bad', text: 'deleted'}}];
  db.mail = [{id: 'private', text: 'private secret', sender: 'runner', recipient: 'admin'}];
  assert(adminAction(db, admin, payload('delete-message', {id: 'bad'}), now).ok);
  assert.equal(db.messages.length, 1); assert.equal(db.messages[0].reply, undefined); assert.equal(db.mail[0].text, 'private secret');
  assert(adminAction(db, admin, payload('mute', {hours: 2}), now).ok); assert(muted(user, now)); assert(!muted(user, now + 7200000));
  assert.equal(adminAction(db, admin, payload('mute', {hours: 721}), now).status, 400);
  assert(adminAction(db, admin, payload('unmute'), now).ok); assert(!muted(user, now));
  const view = JSON.stringify(adminView(db, {section: 'chat', now}));
  for (const secret of ['private secret', 'secret-hash', 'secret-salt', 'tokenHash']) assert(!view.includes(secret));
});

test('admin cancellation returns calibrated escrow to a full bag as permanent inbox loot', () => {
  const db = fixture(), u = db.users[1];
  u.state.inventory = Array.from({length: 60}, (_, i) => 'gear' + (i + 3));
  u.state.escrow = ['gear2'];
  db.market = [{id: 'listing', gear: 'gear2', seller: u.id, price: 100, calibration: {level: 2, modules: ['health']}}];
  u.state.combat = {id: 'busy'};
  assert.equal(adminAction(db, db.users[0], payload('cancel-listing', {id: 'listing'}), now).status, 400);
  assert.equal(db.market.length, 1); u.state.combat = null;
  assert(adminAction(db, db.users[0], payload('cancel-listing', {id: 'listing'}), now).ok);
  assert.equal(db.market.length, 0); assert(u.state.itemInbox.includes('gear2'));
  assert.deepEqual(u.state.calibration.gear2, {level: 2, modules: ['health']}); assert.equal(u.state.credits, 180);
});

test('public management contains only announcement/maintenance; admin search is paginated and HTML escaped', () => {
  const db = fixture(), admin = db.users[0];
  assert(adminAction(db, admin, payload('announce', {text: '<img src=x onerror=alert(1)>'}), now).ok);
  assert(adminAction(db, admin, payload('maintenance', {enabled: true}), now).ok);
  assert.deepEqual(Object.keys(publicManagement(db)).sort(), ['announcement', 'maintenance']);
  for (let i = 0; i < 43; i++) db.users.push({id: 'u' + i, username: 'test' + i, state: fresh()});
  const data = adminView(db, {query: 'test', page: 1, now}); assert.equal(data.matches, 43); assert.equal(data.pages, 3); assert.equal(data.players.length, 20);
  const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const html = renderAdmin({online: {admin: true, name: 'Owner'}, data: adminView(db, {section: 'system', now}), section: 'system', query: '', pending: {action: 'announce'}, esc, button: () => ''});
  assert(!html.includes('<img src=x')); assert(html.includes('&lt;img')); assert(html.includes('type="password"'));
  assert(!renderAdmin({online: {admin: false}}).includes('admin-action-form'));
});
