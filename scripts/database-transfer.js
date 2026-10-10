import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createStorage} from '../src/storage.js';

const [command, filename] = process.argv.slice(2);
let storage;
try {
  if (!process.env.DATABASE_URL) throw new Error('Cần cấu hình DATABASE_URL trong .env riêng.');
  if (!['import', 'export'].includes(command)) throw new Error('Dùng db:import hoặc db:export.');
  storage = await createStorage();
  const file = path.resolve(filename || (command === 'import' ? '.data/players.json' : `.data/backups/players-${Date.now()}.json`));
  if (command === 'import') {
    const data = JSON.parse(await readFile(file, 'utf8'));
    if (!data || !Array.isArray(data.users)) throw new Error('File nhân vật không hợp lệ.');
    // Moving worlds never copies browser sessions to the new host.
    delete data.sessions;
    await storage.transaction(async tx => {
      // Only initialize a completely empty world. Never overwrite live Neon data.
      const populated = Object.entries(tx.data).some(([key, value]) => key !== 'sessions' &&
        (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined));
      if (populated) throw new Error('Database đã có dữ liệu. Import bị từ chối để giữ nhân vật hiện có.');
      tx.data = data;
      tx.dirty = true;
    });
    console.log(`Đã nhập ${data.users.length} tài khoản. Giữ nguyên file gốc.`);
  } else {
    const data = await storage.transaction(async tx => structuredClone(tx.data));
    delete data.sessions;
    await mkdir(path.dirname(file), {recursive: true, mode: 0o700});
    await writeFile(file, JSON.stringify(data, null, 2), {mode: 0o600, flag: 'wx'});
    console.log(`Đã xuất ${data.users.length} tài khoản vào ${file}. File chứa dữ liệu riêng; không chia sẻ hoặc commit.`);
  }
} catch {
  // Never echo a connection URI, password, or raw SQL parameters in logs.
  console.error('Chuyển dữ liệu thất bại. Kiểm tra DATABASE_URL/TLS, file và quyền database. Import chỉ cho database trống; export không ghi đè file có sẵn.');
  process.exitCode = 1;
} finally {if (storage) await storage.close();}
