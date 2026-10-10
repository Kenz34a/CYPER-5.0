import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, mkdir, rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStorage, databaseOptions} from '../src/storage.js';

test('JSON transactions serialize claims, rollback on failure and recover the queue', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cyper-storage-'));
  const options = {directory, databaseUrl: '', production: false};
  let storage = await createStorage(options);
  try {
    await storage.transaction(async tx => {tx.data.users.push({id: 'test', claims: 0}); tx.dirty = true;});
    const claimed = await Promise.all(Array.from({length: 10}, () => storage.transaction(async tx => {
      const user = tx.data.users[0];
      await new Promise(resolve => setTimeout(resolve, 2));
      if (user.claims) return false;
      user.claims++; tx.dirty = true; return true;
    })));
    assert.equal(claimed.filter(Boolean).length, 1);
    await assert.rejects(storage.transaction(async tx => {tx.data.users[0].claims = 99; tx.dirty = true; throw new Error('rollback');}));
    // A failed rename must not change the in-memory world either.
    const file = path.join(directory, 'players.json');
    const before = await readFile(file, 'utf8');
    await rm(file); await mkdir(file);
    await assert.rejects(storage.transaction(async tx => {tx.data.users[0].claims = 42; tx.dirty = true;}));
    assert.equal(await storage.transaction(async tx => tx.data.users[0].claims), 1);
    await rmdir(file);
    await storage.transaction(async tx => {tx.dirty = true;});
    assert.equal(await readFile(file, 'utf8'), before);
    await storage.close(); storage = await createStorage(options);
    assert.equal(await storage.transaction(async tx => tx.data.users[0].claims), 1);
  } finally {await storage.close(); await rm(directory, {recursive: true, force: true});}
});

test('production requires PostgreSQL and remote TLS verifies certificates', async () => {
  await assert.rejects(createStorage({databaseUrl: '', production: true}), /DATABASE_URL/);
  const options = databaseOptions('postgresql://user:password@database.example/db?sslmode=require&channel_binding=require');
  assert.deepEqual(options.ssl, {rejectUnauthorized: true});
  assert(!options.connectionString.includes('sslmode'));
  assert.throws(() => databaseOptions('postgres://user:password@database.example/db?sslmode=disable'), /TLS/);
  assert.throws(() => databaseOptions('https://database.example/db'), /PostgreSQL/);
  assert.equal(databaseOptions('postgres://postgres:test@127.0.0.1/db?sslmode=disable').ssl, false);
});
