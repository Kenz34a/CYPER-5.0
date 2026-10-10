import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {Pool} from 'pg';
import {databaseOptions, createStorage} from '../src/storage.js';
import {fresh} from '../src/game.js';

// Use ONLY a disposable PostgreSQL database: this test resets its game table.
const databaseUrl = process.env.CYPER_TEST_DATABASE_URL;
test('PostgreSQL: two servers share accounts/sessions, atomic rewards, rollback, imports and backups',
 {skip: !databaseUrl, timeout: 60000}, async () => {
  const pool = new Pool(databaseOptions(databaseUrl));
  const directory = await mkdtemp(path.join(tmpdir(), 'cyper-pg-'));
  const ports = [49000 + Math.floor(Math.random() * 400), 49500 + Math.floor(Math.random() * 400)];
  const servers = [];
  const env = {...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'production', COOKIE_SECURE: '1', CYPER_DATA_DIR: directory};
  async function start(i) {
    const child = spawn(process.execPath, ['server.js'], {cwd: new URL('..', import.meta.url), env: {...env, PORT: String(ports[i])}, stdio: ['ignore', 'pipe', 'pipe']});
    servers[i] = child;
    await new Promise((resolve, reject) => {child.stdout.once('data', resolve); child.once('error', reject); child.once('exit', code => reject(new Error('Server exited ' + code)));});
  }
  async function stop(i) {const child = servers[i]; if (child) {const done = once(child, 'exit'); child.kill(); await done; servers[i] = null;}}
  async function req(i, route, data, cookie) {
    const r = await fetch(`http://127.0.0.1:${ports[i]}${route}`, {method: data ? 'POST' : 'GET', headers: {...(data ? {'Content-Type': 'application/json'} : {}), ...(cookie ? {Cookie: cookie} : {})}, ...(data ? {body: JSON.stringify(data)} : {})});
    return {status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0], rawCookie: r.headers.get('set-cookie'), data: await r.json()};
  }
  async function transfer(command, file) {
    const child = spawn(process.execPath, ['scripts/database-transfer.js', command, file], {cwd: new URL('..', import.meta.url), env, stdio: 'ignore'});
    return (await once(child, 'exit'))[0];
  }
  let storage;
  try {
    storage = await createStorage({databaseUrl, production: true});
    await pool.query('UPDATE cyper_state SET data = $1::jsonb WHERE id = 1', [JSON.stringify({users: []})]);
    // Import preserves IDs/state, refuses a populated target, exports privately.
    const fixture = path.join(directory, 'fixture.json');
    await writeFile(fixture, JSON.stringify({users: [{id: 'fixture', username: 'fixture', state: fresh()}], sessions: {raw: {id: 'fixture', expires: Date.now() + 100000}}}));
    assert.equal(await transfer('import', fixture), 0);
    assert.equal(await transfer('import', fixture), 1);
    const backup = path.join(directory, 'backup.json');
    assert.equal(await transfer('export', backup), 0); assert.equal(await transfer('export', backup), 1);
    const exported = JSON.parse(await readFile(backup, 'utf8'));
    assert.equal(exported.users[0].id, 'fixture'); assert.equal(exported.sessions, undefined);
    await pool.query('UPDATE cyper_state SET data = $1::jsonb WHERE id = 1', [JSON.stringify({users: []})]);
    await start(0); await start(1);
    assert.equal((await req(0, '/healthz')).status, 200);
    const password = 'postgres-test-password';
    const registrations = await Promise.all([req(0, '/api/register', {username: 'pg_runner', password}), req(1, '/api/register', {username: 'pg_runner', password})]);
    assert.deepEqual(registrations.map(v => v.status).sort(), [200, 409]);
    const a = registrations.find(v => v.status === 200), cookie = a.cookie;
    assert.match(a.rawCookie, /HttpOnly/); assert.match(a.rawCookie, /Secure/);
    assert.equal((await req(1, '/api/me', null, cookie)).data.user.id, a.data.user.id);
    const claims = await Promise.all([req(0, '/api/action', {action: 'daily-checkin'}, cookie), req(1, '/api/action', {action: 'daily-checkin'}, cookie)]);
    assert.deepEqual(claims.map(v => v.status).sort(), [200, 400]);
    assert.equal((await req(0, '/api/me', null, cookie)).data.state.credits, 220);
    const before = (await req(1, '/api/me', null, cookie)).data.state;
    await assert.rejects(storage.transaction(async tx => {tx.data.users[0].state.credits = 999999; tx.dirty = true; throw new Error('rollback');}));
    assert.deepEqual((await req(1, '/api/me', null, cookie)).data.state, before);
    const row = (await pool.query('SELECT data FROM cyper_state WHERE id = 1')).rows[0].data;
    assert(!JSON.stringify(row).includes(cookie.split('=')[1])); assert(!JSON.stringify(row).includes(password));
    // PostgreSQL rejected writes must not produce a successful action response.
    await pool.query("ALTER TABLE cyper_state ADD CONSTRAINT cyper_test_reject CHECK ((data #>> '{users,0,state,name}') <> 'should_fail')");
    assert.equal((await req(0, '/api/action', {action: 'name', id: 'should_fail'}, cookie)).status, 503);
    assert.deepEqual((await req(1, '/api/me', null, cookie)).data.state, before);
    await pool.query('ALTER TABLE cyper_state DROP CONSTRAINT cyper_test_reject');
    await stop(0); await start(0);
    assert.equal((await req(0, '/api/me', null, cookie)).status, 200);
    assert.equal((await req(1, '/api/logout', {}, cookie)).status, 200);
    assert.equal((await req(0, '/api/me', null, cookie)).status, 401);
    assert.equal((await req(0, '/api/rank')).data.players.length, 1);
    await assert.rejects(readFile(path.join(directory, 'players.json')), {code: 'ENOENT'});
  } finally {
    await stop(0); await stop(1);
    await pool.query('ALTER TABLE cyper_state DROP CONSTRAINT IF EXISTS cyper_test_reject').catch(() => {});
    if (storage) await storage.close(); await pool.end(); await rm(directory, {recursive: true, force: true});
  }
});
