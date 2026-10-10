import {createStorage} from '../src/storage.js';
import {audit, isAdmin, banned} from '../src/admin.js';

const [command, username, ...extra] = process.argv.slice(2);
let storage;
try {
  if (!['grant', 'revoke'].includes(command) || !/^[a-z0-9_]{3,24}$/.test(username || '') || extra.length)
    throw new Error('Dùng npm run admin -- grant|revoke tên_tài_khoản (chữ thường).');
  storage = await createStorage();
  await storage.transaction(async tx => {
    const u = tx.data.users.find(v => v.username === username);
    if (!u) throw new Error('Đăng ký tài khoản này trong game trước khi cấp quyền.');
    if (command === 'grant' && banned(u)) throw new Error('Gỡ khóa tài khoản trước khi cấp admin.');
    if (command === 'revoke' && isAdmin(u) && tx.data.users.filter(isAdmin).length <= 1)
      throw new Error('Cấp quyền cho admin khác trước khi thu hồi admin cuối cùng.');
    if (isAdmin(u) === (command === 'grant')) {console.log('Tài khoản đã có trạng thái quyền này.'); return;}
    u.role = command === 'grant' ? 'admin' : 'player';
    for (const [key, session] of Object.entries(tx.data.sessions || {})) if (session.id === u.id) delete tx.data.sessions[key];
    audit(tx.data, {id: 'server-cli', username: 'Server CLI'}, `role-${command}`, u.id,
      'Thay đổi quyền bằng công cụ quản trị server.', {role: u.role});
    tx.dirty = true;
  });
  console.log('Đã xử lý quyền. Tài khoản cần đăng nhập lại. Dừng server trước khi dùng lệnh với file JSON.');
} catch (error) {
  const known = ['Dùng npm', 'Đăng ký', 'Gỡ khóa', 'Cấp quyền'];
  console.error(known.some(v => error.message.startsWith(v)) ? error.message : 'Không thể lưu quyền. Kiểm tra cấu hình lưu trữ và quyền database.');
  process.exitCode = 1;
} finally {if (storage) await storage.close();}
