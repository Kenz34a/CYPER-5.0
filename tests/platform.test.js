import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {apiRequest, configureNative, validateServerURL, saveServerURL, serverURL} from '../src/platform.js';
import {publicAssets} from '../src/public-assets.js';

test('native server selection accepts HTTPS and limits development HTTP to local hosts', () => {
  assert.equal(validateServerURL(' https://game.onrender.com/ '), 'https://game.onrender.com');
  for (const url of ['http://game.onrender.com', 'https://user:password@game.example', 'https://game.example/api', 'https://game.example/?token=x', 'https://game.example/#x', 'javascript:alert(1)', 'file:///etc/passwd'])
    assert.throws(() => validateServerURL(url));
  assert.equal(validateServerURL('http://10.0.2.2:3000', true), 'http://10.0.2.2:3000');
  assert.equal(validateServerURL('http://192.168.1.20:3000', true), 'http://192.168.1.20:3000');
  assert.throws(() => validateServerURL('http://game.example', true));
  assert.throws(() => validateServerURL('http://172.32.1.1', true));
});

test('native transport preserves server authority, cookie session, logout and POST origin protection', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cyper-platform-'));
  const port = 49000 + Math.floor(Math.random() * 900), base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {cwd: new URL('..', import.meta.url),
    env: {...process.env, PORT: String(port), CYPER_DATA_DIR: directory, DATABASE_URL: '', NODE_ENV: 'development'}, stdio: ['ignore', 'pipe', 'pipe']});
  let cookie = '', calls = [];
  const values = new Map();
  globalThis.localStorage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  try {
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => {throw new Error('Server did not start');})]);
    // Adapter simulates OS HTTP/cookie persistence; actual bridge requires device testing.
    configureNative({defaultURL: base, allowLocalHTTP: true, http: {request: async options => {
      calls.push(options);
      const response = await fetch(options.url, {method: options.method, headers: {...options.headers, ...(cookie ? {Cookie: cookie} : {})},
        ...(options.data ? {body: JSON.stringify(options.data)} : {}), redirect: 'manual'});
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return {status: response.status, data: await response.json()};
    }}});
    const registered = await apiRequest('/api/register', {username: 'native_runner', password: 'platform-test-password'});
    assert.equal((await apiRequest('/api/me')).user.id, registered.user.id);
    await assert.rejects(apiRequest('/api/action', {action: 'settings', values: {admin: true}}), error => error.status === 400);
    await apiRequest('/api/action', {action: 'name', id: 'Điện thoại'});
    assert.equal((await apiRequest('/api/me')).state.name, 'Điện thoại');
    assert(calls.every(c => c.disableRedirects && !Object.hasOwn(c.headers, 'Origin')));
    assert.equal((await fetch(base + '/api/action', {method: 'POST', headers: {Cookie: cookie, Origin: 'https://foreign.example', 'Content-Type': 'application/json'}, body: '{"action":"rest"}'})).status, 403);
    await apiRequest('/api/logout', {});
    await assert.rejects(apiRequest('/api/me'), error => error.status === 401);
    saveServerURL('');
    assert.equal(serverURL(), '', 'empty selection overrides a compiled-in URL');
    await assert.rejects(apiRequest('/api/me'), /Chưa chọn server/);
    for (const route of ['/src/backend.js', '/src/storage.js', '/.data/players.json', '/.env.mobile', '/capacitor.config.json'])
      assert.equal((await fetch(base + route)).status, 404);
    for (const route of ['/sw.js', '/manifest.webmanifest', '/icons/icon-192.png', '/src/platform.js'])
      assert.equal((await fetch(base + route)).status, 200);
    const manifest = await (await fetch(base + '/manifest.webmanifest')).json();
    assert.equal(manifest.display, 'standalone');
    const png = await readFile(new URL('../icons/icon-192.png', import.meta.url));
    assert.equal(png.readUInt32BE(16), 192); assert.equal(png.readUInt32BE(20), 192);
    assert(publicAssets.every(p => !/backend|storage|\.env|\.data|native-entry/.test(p)));
  } finally {
    configureNative(null); delete globalThis.localStorage;
    const stopped = once(child, 'exit'); child.kill(); await stopped;
    await rm(directory, {recursive: true, force: true});
  }
});
