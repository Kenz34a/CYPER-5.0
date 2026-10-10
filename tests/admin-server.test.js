import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';

test('admin CLI, server authorization, reauthentication, mute/ban, maintenance and durable audit', {timeout: 30000}, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cyper-admin-')), port = 52000 + Math.floor(Math.random() * 500);
  const env = {...process.env, DATABASE_URL: '', NODE_ENV: 'development', CYPER_DATA_DIR: directory, PORT: String(port)};
  let server;
  async function start() {server = spawn(process.execPath, ['server.js'], {cwd: new URL('..', import.meta.url), env, stdio: ['ignore', 'pipe', 'pipe']}); await new Promise((resolve, reject) => {server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Server exited ' + code)));});}
  async function stop() {if (server) {const done = once(server, 'exit'); server.kill(); await done; server = null;}}
  async function role(command, username) {const child = spawn(process.execPath, ['scripts/admin-role.js', command, username], {cwd: new URL('..', import.meta.url), env, stdio: 'ignore'}); return (await once(child, 'exit'))[0];}
  async function req(route, data, cookie, headers = {}) {const r = await fetch(`http://127.0.0.1:${port}${route}`, {method: data ? 'POST' : 'GET', headers: {...headers, ...(cookie ? {Cookie: cookie} : {}), ...(data ? {'Content-Type': 'application/json'} : {})}, ...(data ? {body: JSON.stringify(data)} : {})}); return {status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], data: await r.json()};}
  const password = 'admin-test-password';
  const body = (action, extra = {}) => ({action, password, confirm: true, reason: 'Kiểm thử admin API', requestId: randomUUID(), issuedAt: Date.now(), ...extra});
  try {
    await start(); const a = await req('/api/register', {username: 'owner', password, role: 'admin', admin: true}), b = await req('/api/register', {username: 'runner', password});
    assert.equal(a.data.user.admin, false); assert.equal((await req('/api/admin', null, a.cookie)).status, 403);
    assert.equal((await req('/api/admin/action', body('grant', {id: b.data.user.id, resource: 'credits', amount: 100}), b.cookie)).status, 403);
    await stop(); assert.equal(await role('grant', 'unknown'), 1); assert.equal(await role('grant', 'owner'), 0); assert.equal(await role('revoke', 'owner'), 1); await start();
    assert.equal((await req('/api/me', null, a.cookie)).status, 401);
    a.cookie = (await req('/api/login', {username: 'owner', password})).cookie;
    assert.equal((await req('/api/me', null, a.cookie)).data.user.admin, true);
    for (const source of ['/src/admin.js', '/src/storage.js', '/scripts/admin-role.js']) assert.equal((await fetch(`http://127.0.0.1:${port}${source}`)).status, 404);
    const payload = body('grant', {id: b.data.user.id, resource: 'credits', amount: 100});
    assert.equal((await req('/api/admin/action', {...payload, password: 'wrong-password'}, a.cookie)).status, 403);
    assert.equal((await req('/api/admin/action', payload, a.cookie, {Origin: 'https://evil.invalid'})).status, 403);
    const claims = await Promise.all([req('/api/admin/action', payload, a.cookie), req('/api/admin/action', payload, a.cookie)]);
    assert(claims.every(v => v.status === 200)); assert.equal(claims.filter(v => v.data.duplicate).length, 1);
    assert.equal((await req('/api/me', null, b.cookie)).data.state.credits, 280);
    assert.equal((await req('/api/action', {action: 'role', role: 'admin'}, b.cookie)).status, 400);
    assert.equal((await req('/api/admin/action', body('mute', {id: b.data.user.id, hours: 1}), a.cookie)).status, 200);
    assert.equal((await req('/api/action', {action: 'chat', text: 'blocked'}, b.cookie)).status, 403);
    assert.equal((await req('/api/action', {action: 'mail-send', id: a.data.user.id, text: 'blocked'}, b.cookie)).status, 403);
    assert.equal((await req('/api/action', {action: 'rest'}, b.cookie)).status, 200);
    assert.equal((await req('/api/admin/action', body('ban', {id: b.data.user.id, hours: 0}), a.cookie)).status, 200);
    assert.equal((await req('/api/me', null, b.cookie)).status, 401);
    assert.equal((await req('/api/login', {username: 'runner', password})).status, 403);
    assert.equal((await req('/api/rank')).data.players.length, 1);
    assert.equal((await req('/api/admin/action', body('unban', {id: b.data.user.id}), a.cookie)).status, 200);
    b.cookie = (await req('/api/login', {username: 'runner', password})).cookie;
    assert.equal((await req('/api/admin/action', body('announce', {text: '<script>alert(1)</script>'}), a.cookie)).status, 200);
    assert.equal((await req('/api/admin/action', body('maintenance', {enabled: true}), a.cookie)).status, 200);
    assert.equal((await req('/api/action', {action: 'rest'}, b.cookie)).status, 503);
    assert.equal((await req('/api/action', {action: 'rest'}, a.cookie)).status, 200);
    assert.equal((await req('/api/register', {username: 'blocked_register', password})).status, 503);
    const world = (await req('/api/world')).data; assert.equal(world.management.maintenance, true); assert(!JSON.stringify(world).includes('Kiểm thử admin API'));
    const view = (await req('/api/admin?section=audit', null, a.cookie)).data;
    assert.equal(view.audit.filter(v => v.action === 'grant').length, 1); assert(!JSON.stringify(view).includes(password));
    await stop(); await start(); assert.equal((await req('/api/me', null, a.cookie)).data.user.admin, true);
    assert.equal((await req('/api/admin', null, a.cookie)).data.maintenance, true);
    assert.equal((await req('/api/admin/action', body('maintenance', {enabled: false}), a.cookie)).status, 200);
    assert.equal((await req('/api/action', {action: 'rest'}, b.cookie)).status, 200);
    await stop(); assert.equal(await role('grant', 'runner'), 0); assert.equal(await role('revoke', 'owner'), 0); await start();
    assert.equal((await req('/api/me', null, a.cookie)).status, 401);
    a.cookie = (await req('/api/login', {username: 'owner', password})).cookie; assert.equal((await req('/api/admin', null, a.cookie)).status, 403);
    const stored = JSON.parse(await readFile(path.join(directory, 'players.json'), 'utf8')); assert.equal(stored.users[1].role, 'admin'); assert.equal(stored.users[1].state.credits, 280);
  } finally {await stop(); await rm(directory, {recursive: true, force: true});}
});
