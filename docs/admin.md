# Quản trị CYPER // ZERO

## Cấp quyền khi test trên máy

1. Đăng ký tài khoản của bạn trong Hồ sơ → Tài khoản. Đăng ký không tự cấp admin, kể cả tài khoản đầu tiên.
2. Dừng server bằng Ctrl+C. Với file JSON, luôn dừng server trước khi dùng lệnh sửa quyền.
3. Trong thư mục game, chạy (thay `ten_tai_khoan` bằng tên đăng nhập chữ thường, không phải bí danh):

```sh
npm run admin -- grant ten_tai_khoan
npm start
```

4. Đăng nhập lại, mở **Hồ sơ → Bảng quản trị** hoặc **Menu → Quản trị**.

Chỉ cấp quyền cho tài khoản đã tồn tại; không tạo tài khoản/mật khẩu mặc định. Quyền nằm ở tài khoản server `role`, không nằm trong nhân vật/localStorage.

## Render + Neon

Đăng ký tài khoản ở URL HTTPS của game, rồi dùng **Render Shell** của đúng Web Service có `DATABASE_URL`:

```sh
npm run admin -- grant ten_tai_khoan
```

Với PostgreSQL, chạy được khi server đang hoạt động vì dùng transaction. Nếu gói Render không có Shell, dùng checkout trên máy với `.env` riêng trỏ đúng Neon và chạy cùng lệnh. Không đưa connection string vào GitHub/chat. Không cần khóa admin hoặc danh sách tên admin trong frontend.

Thu hồi quyền bằng `npm run admin -- revoke ten_tai_khoan`. Thay đổi quyền thu hồi toàn bộ phiên của tài khoản đó; cần đăng nhập lại. Không thu hồi admin cuối cùng; cấp quyền cho admin khác trước. CLI yêu cầu quyền truy cập máy chủ/database, không phải API người chơi được gọi.

## Các chức năng

| Mục | Thao tác |
| --- | --- |
| Người chơi | Tìm tài khoản/bí danh/ID, 20 người/trang; xem cấp, tài nguyên, khu vực, trạng thái bận/khóa/cấm chat. |
| Khóa | 1–8760 giờ hoặc 0 để khóa vô thời hạn, thu hồi toàn bộ phiên và chặn đăng nhập; có gỡ khóa, tự hết hiệu lực khi hết hạn. Bỏ khỏi bảng xếp hạng khi đang bị khóa. |
| Cấm chat | 1–720 giờ; chặn chat toàn cầu/tập đoàn và gửi thư, vẫn cho chơi; có gỡ cấm. |
| Hỗ trợ | Cộng 1–1.000.000 credits/linh kiện hoặc xác nhận nạp Unit; runner cần kết thúc combat/dungeon. Credits/linh kiện cần kết thúc công việc; Unit có thể nạp khi đang chờ. Ghi số dư trước/sau và báo trong nhật ký nhân vật. |
| Chat | 100 tin toàn cầu/tập đoàn gần nhất; xóa tin và bỏ đoạn trích liên quan. Không đọc thư riêng. |
| Chợ | 100 tin rao mới nhất; thu hồi về người bán, giữ hiệu chuẩn/module. Túi đầy chuyển hộp thư không hết hạn. Người bán cần kết thúc combat/dungeon. |
| Server | Kiểu lưu trữ, số hồ sơ, phiên còn hạn, tin rao, phòng dungeon; thông báo tối đa 500 ký tự (trống để gỡ); bật/tắt bảo trì. Số phiên không phải số người đang online. |
| Nhật ký | 100 thao tác gần nhất; giữ tối đa 1.000 bản ghi về người thực hiện, giờ, đích, lý do và thay đổi. |

Không khóa/cấm chat admin khác; chủ máy chủ thu hồi quyền qua CLI trước. Không có nút xóa vĩnh viễn nhân vật, xem mật khẩu/token hoặc chỉnh chỉ số chiến đấu tùy ý.

Mỗi thao tác ghi cần mật khẩu admin, lý do 5–200 ký tự và xác nhận. Server kiểm tra quyền/phiên/mật khẩu; ẩn menu chỉ là giao diện. Mật khẩu không lưu vào localStorage hoặc audit. Thao tác và nhật ký được lưu nguyên tử bằng JSON/PostgreSQL; lỗi ghi không trả thành công.

Mã chống gửi trùng có thời hạn năm phút: cùng mã/nội dung chỉ xử lý một lần, đổi nội dung bị từ chối. Giao diện giữ mã khi lỗi mạng/lưu để thử lại cùng nội dung trong năm phút; sau đó kiểm tra nhật ký trước khi tạo thao tác mới. Tối đa 2.000 mã còn hạn; đầy thì từ chối yêu cầu mới. Giới hạn thử mật khẩu chung với đăng nhập: 15 lần/phút/IP/tiến trình.

## Bảo trì và giới hạn

Thông báo hiển thị cho mọi người qua polling khoảng năm giây, luôn là văn bản được escape. Bảo trì chặn đăng ký và hành động game của tài khoản thường; admin vẫn thao tác. Người chơi vẫn đăng nhập, xem dữ liệu và đăng xuất. Thời gian công việc, hạn vật phẩm và mốc ngày vẫn trôi; khách cục bộ vẫn chơi.

Khóa giữ nhân vật/tài sản/lịch sử cũ; không tự giải tán tập đoàn/phòng dungeon hoặc hủy tin rao. Thu hồi tin ở mục Chợ khi cần. Audit có giới hạn lưu, chưa có kho nhật ký dài hạn hoặc báo cáo vi phạm từ người chơi.

Kiểm thử dùng tài khoản và dữ liệu tạm, không cấp quyền cho người chơi thật. `npm test` kiểm tra phân quyền, CLI, chống gửi trùng, bảo trì, cấm chat/khóa, thu hồi phiên, audit qua restart và XSS.

## Unit và nạp thủ công

Unit là tiền tệ nạp: tài khoản mới có 0 Unit, không nhận qua gameplay hoặc đổi từ credits. Số dư đã có được giữ nguyên khi nâng phiên bản. Cổng thanh toán tự động chưa được tích hợp; không có API cho người chơi tự cộng Unit.

Sau khi kiểm tra giao dịch thực tế, admin mở **Người chơi → Hỗ trợ → Unit · nạp đã xác nhận**, nhập số lượng và mã giao dịch trong lý do, rồi xác nhận bằng mật khẩu admin. Audit ghi `source: confirmed-topup`, người xác nhận, lý do và số dư trước/sau. Nạp Unit vẫn được phép khi runner đang chờ công việc để họ có thể bỏ qua hàng chờ. Cùng mã yêu cầu chỉ cộng một lần trong thời hạn chống gửi trùng hiện có.

Bỏ qua công việc tính **1 Unit / phút còn lại, làm tròn lên**, tối thiểu 1 Unit khi chưa xong. Giao diện hiển thị phí và có bước xác nhận. Server dùng thời gian và số dư thật, ràng buộc yêu cầu với đúng công việc, thu không quá phí đã hiển thị, hoàn thành và phát thưởng một lần trong cùng transaction. Công việc đã xong nhận miễn phí bằng **Nhận thưởng**; Unit không được hoàn lại sau khi bỏ qua.
