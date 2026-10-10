import {readFile, mkdir, writeFile, rename} from 'node:fs/promises';
import path from 'node:path';

const empty = () => ({users: []});
const valid = data => data && typeof data === 'object' && Array.isArray(data.users);

// Never fall back to an ephemeral Render disk when PostgreSQL is unavailable.
export function databaseOptions(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL phải là PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const disable = url.searchParams.get('sslmode') === 'disable';
  if (disable && !local) throw new Error('Kết nối database từ xa phải dùng TLS.');
  for (const name of ['sslcert', 'sslkey', 'sslrootcert']) {
    if (url.searchParams.has(name)) throw new Error('Dùng trust store của Node cho chứng chỉ database.');
  }
  for (const name of ['sslmode', 'uselibpqcompat']) url.searchParams.delete(name);
  return {connectionString: url.toString(), ssl: local && disable ? false : {rejectUnauthorized: true},
    max: 4, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000,
    statement_timeout: 15000, idle_in_transaction_session_timeout: 20000};
}

export async function createStorage({databaseUrl = process.env.DATABASE_URL,
  directory = process.env.CYPER_DATA_DIR || new URL('../.data/', import.meta.url),
  production = process.env.NODE_ENV === 'production'} = {}) {
  if (production && !databaseUrl) throw new Error('Production cần DATABASE_URL; không dùng file JSON trên Render.');
  if (!databaseUrl) {
    const file = directory instanceof URL ? new URL('players.json', directory) : path.join(directory, 'players.json');
    const temp = directory instanceof URL ? new URL('players.tmp', directory) : path.join(directory, 'players.tmp');
    let data = empty();
    try {data = JSON.parse(await readFile(file, 'utf8'));} catch (error) {if (error.code !== 'ENOENT') throw error;}
    if (!valid(data)) throw new Error('Dữ liệu nhân vật không hợp lệ.');
    let queue = Promise.resolve();
    const run = callback => {
      const pending = queue.then(async () => {
        const tx = {data: structuredClone(data), dirty: false};
        const result = await callback(tx);
        if (tx.dirty) {
          if (!valid(tx.data)) throw new Error('Dữ liệu nhân vật không hợp lệ.');
          await mkdir(directory, {recursive: true, mode: 0o700});
          await writeFile(temp, JSON.stringify(tx.data), {mode: 0o600});
          await rename(temp, file);
          data = tx.data;
        }
        return result;
      });
      queue = pending.catch(() => {});
      return pending;
    };
    return {mode: 'json', transaction: run, health: async () => true, close: async () => {await queue;}};
  }
  const {Pool} = await import('pg');
  const pool = new Pool(databaseOptions(databaseUrl));
  pool.on('error', () => console.error('Database connection interrupted.'));
  const setup = await pool.connect();
  try {
    await setup.query('BEGIN');
    await setup.query('SELECT pg_advisory_xact_lock(1129926738)');
    await setup.query(`CREATE TABLE IF NOT EXISTS cyper_state (
      id smallint PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now())`);
    await setup.query('INSERT INTO cyper_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(empty())]);
    await setup.query('COMMIT');
  } catch (error) {await setup.query('ROLLBACK').catch(() => {}); setup.release(); await pool.end(); throw error;}
  setup.release();
  return {
    mode: 'postgres',
    health: async () => {await pool.query('SELECT 1'); return true;},
    close: () => pool.end(),
    transaction: async callback => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // One world transaction also protects trades and shared dungeon rewards
        // when requests arrive through different Node processes.
        const {rows} = await client.query('SELECT data FROM cyper_state WHERE id = 1 FOR UPDATE');
        if (!valid(rows[0]?.data)) throw new Error('Dữ liệu nhân vật không hợp lệ.');
        const tx = {data: rows[0].data, dirty: false};
        const result = await callback(tx);
        if (tx.dirty) {
          if (!valid(tx.data)) throw new Error('Dữ liệu nhân vật không hợp lệ.');
          await client.query('UPDATE cyper_state SET data = $1::jsonb, updated_at = now() WHERE id = 1', [JSON.stringify(tx.data)]);
        }
        await client.query('COMMIT');
        return result;
      } catch (error) {await client.query('ROLLBACK').catch(() => {}); throw error;}
      finally {client.release();}
    }
  };
}
