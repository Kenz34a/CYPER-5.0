# Test trên máy rồi đưa game lên Neon + Render

## 1. Test trên máy

Cài Node.js 24. Tải ZIP từ GitHub rồi giải nén, hoặc clone repository. Mở Terminal/PowerShell trong thư mục có `package.json`:

```sh
npm ci
npm start
```

Giữ cửa sổ lệnh mở và nhập `localhost:3000` trong trình duyệt trên cùng máy. Chưa cần Neon, Render hoặc file `.env`. Nếu dùng `.env`, sao chép từ `.env.example` và để `DATABASE_URL` trống. Node tự đọc `.env` khi chạy `npm start`.

- **Khách**: nhân vật lưu trong trình duyệt đó; không có tài khoản để dùng trên thiết bị khác.
- **Tài khoản**: đăng ký ở Hồ sơ → Tài khoản. Tiến trình lưu vào `.data/players.json`, phiên đăng nhập cũng được lưu; restart vẫn giữ tài khoản.
- Test nhiều người: dùng hai trình duyệt hoặc một cửa sổ ẩn danh, đăng ký hai tài khoản khác nhau. Thử chat, bảng xếp hạng, rao/mua đồ và phòng dungeon phối hợp. Thử đồng thời nhận điểm danh hai lần: chỉ một yêu cầu được nhận thưởng.
- Dừng bằng Ctrl+C. Không xóa `.data` nếu muốn giữ nhân vật.
- `npm test` chạy kiểm thử với dữ liệu tạm, tách khỏi nhân vật đang chơi.

## 2. Tạo Neon

1. Tạo project và database PostgreSQL **riêng cho game** trong Neon. Chọn vùng gần vùng Render.
2. Lấy connection string từ **Connect**, bật connection pooling. Giữ tùy chọn TLS của URL Neon.
3. Giữ connection string trong `.env` riêng khi test Neon trên máy, hoặc biến môi trường bí mật của Render. Không đưa vào mã nguồn, chat hoặc GitHub.

Game tự tạo bảng `cyper_state` ở lần chạy đầu; role cần quyền tạo bảng, đọc và cập nhật. Kết nối từ xa bắt buộc TLS và kiểm tra chứng chỉ; không dùng `rejectUnauthorized=false`.

Có `DATABASE_URL` → dùng PostgreSQL cho tài khoản, tiến trình, chat, chợ, tập đoàn, phòng dungeon và phiên đăng nhập. Không có URL → dùng file JSON ở chế độ development. Production thiếu URL sẽ dừng, không tự chuyển sang ổ đĩa tạm của Render. Khách vẫn lưu trên trình duyệt.

## 3. Đưa lên Render

Dùng **Blueprint** với repository `Kenz34a/CYPER-5.0`; file `render.yaml` đã có cấu hình. Cung cấp `DATABASE_URL` khi Render yêu cầu. Blueprint đang chọn free và tắt auto deploy; xem điều kiện/gói hiện tại của Render trước khi tạo dịch vụ.

Nếu tạo **Web Service** thủ công:

| Mục | Giá trị |
| --- | --- |
| Repository / Branch | `Kenz34a/CYPER-5.0` / `main` |
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/healthz` |
| `NODE_VERSION` | `24.19.0` |
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `1` |
| `TRUST_PROXY` | `1` (chỉ dùng sau reverse proxy Render) |
| `DATABASE_URL` | Neon pooled URL, lưu dưới dạng secret |

Không đặt `PORT=3000` trên Render; game dùng cổng Render cung cấp và lắng nghe `0.0.0.0`. `/healthz` trả 200 khi server kết nối được database, 503 khi kết nối lỗi. Deploy xong, mở URL HTTPS do Render cấp để chơi trên máy tính/điện thoại. Đăng ký tài khoản cho mỗi người; game không chuyển nhân vật khách sang tài khoản tự động.

Gói miễn phí có thể ngủ khi không dùng; lần mở đầu và Neon wake-up có thể chậm. Tài khoản vẫn nằm trong Neon. Dùng một instance để bắt đầu; chưa có kiểm thử tải để cam kết số người đồng thời.

## 4. Giữ tài khoản đã test trên máy (tùy chọn)

Database Neon mới mặc định bắt đầu một thế giới mới. Nếu muốn chuyển tài khoản đã test:

1. Dừng server trên máy; chưa mở bản Render cho người chơi.
2. Sao lưu `.data/players.json` vào nơi riêng an toàn.
3. Thêm Neon `DATABASE_URL` vào `.env` riêng của thư mục game.
4. Chạy:

```sh
npm run db:import
```

Chỉ nhập khi database hoàn toàn trống. Lệnh giữ ID/tài khoản/mật khẩu băm/tiến trình/chợ/phòng, giữ file gốc và không sao chép phiên đăng nhập. Database có dữ liệu sẽ bị từ chối, không ghi đè. Nếu Render đã được người chơi sử dụng, không dùng lệnh này để ghép hai thế giới. Nhân vật khách trong localStorage không nằm trong file tài khoản.

Để xuất bản sao lưu riêng của thế giới Neon:

```sh
npm run db:export
```

File được ghi vào `.data/backups/`, có tài khoản và mật khẩu băm; không commit/chia sẻ. Có thể chỉ định file khác bằng `npm run db:export -- .data/backups/my-backup.json`; lệnh không ghi đè file có sẵn. Kết hợp với backup/restore của Neon và thử khôi phục trên database test riêng.

## Giới hạn của backend hiện tại

PostgreSQL lưu toàn bộ thế giới trong một hàng JSONB. Mỗi yêu cầu game đọc thế giới trong transaction và khóa hàng đó; phản hồi thành công chỉ gửi sau COMMIT. Cách này giữ giao dịch chợ, thưởng dungeon và phiên nhất quán qua restart hoặc giữa hai tiến trình. Thất bại lưu sẽ rollback và trả lỗi; không xác nhận thưởng chưa lưu.

Đây là bước triển khai ban đầu, **chưa phải kiến trúc MMO tải lớn**. Các yêu cầu API nối hàng trên cùng một khóa, kích thước thế giới và số phiên tăng theo người chơi. Trước khi mở rộng lớn cần đo tải, tách bảng tài khoản/phiên/chat/chợ/dungeon, giới hạn theo tài khoản và bổ sung quản trị cộng đồng. Giới hạn thử đăng nhập hiện theo IP, ở bộ nhớ từng tiến trình; nhiều instance không dùng chung bộ đếm. PvP vẫn là đấu với bản sao phòng thủ, chưa phải đấu trực tiếp hai người.

## Cấp quyền admin

Xem [hướng dẫn quản trị](admin.md). Đăng ký tài khoản, dùng Render Shell chạy `npm run admin -- grant ten_tai_khoan` (hoặc chạy trên máy với `.env` riêng trỏ Neon), rồi đăng nhập lại. Với JSON phải dừng server trước khi thay đổi quyền.
