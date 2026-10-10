# Đăng nhập Google · v0.13

Web, Android và iOS dùng Google thông qua server game. Đăng nhập bằng tên tài khoản/mật khẩu vẫn hoạt động. Google được bật khi server có đủ ba biến dưới đây; khi chưa cấu hình, giao diện giải thích và khóa nút Google.

## Cấu hình Google và server

1. Mở [Google Cloud Console](https://console.cloud.google.com/), tạo/chọn project rồi mở **Google Auth Platform** (hoặc **APIs & Services → OAuth consent screen**).
2. Điền tên ứng dụng, email hỗ trợ và thông tin liên hệ. Chọn audience **External** nếu cho người chơi ngoài tổ chức dùng. Khi ứng dụng ở trạng thái **Testing**, thêm tài khoản Google thử vào **Test users**. Khi mở cho cộng đồng, chuyển trạng thái xuất bản theo yêu cầu của Google.
3. Tạo OAuth client có loại **Web application**. Server thực hiện đổi mã và xác minh danh tính cho cả ba nền tảng; không tạo client Android/iOS cho luồng này.
4. Trong **Authorized redirect URIs**, thêm địa chỉ callback đúng từng ký tự:
   - Test web trên máy: `http://localhost:3000/api/auth/google/callback`.
   - Render: URL HTTPS thực của game + `/api/auth/google/callback`.
5. Sao chép Client ID và Client secret vào `.env` riêng trên máy hoặc **Environment** của Render. Không gửi secret trong chat, không đưa vào GitHub, frontend hay `.env.mobile`.

| Biến server | Giá trị |
| --- | --- |
| `PUBLIC_URL` | Địa chỉ gốc thực của game, không kèm đường dẫn/tham số; khi test web là `http://localhost:3000`, khi triển khai là HTTPS. |
| `GOOGLE_CLIENT_ID` | Client ID của Web application vừa tạo. |
| `GOOGLE_CLIENT_SECRET` | Client secret tương ứng, lưu riêng trên server. |

Khởi động lại server sau khi cấu hình. Khi test local, mở web bằng đúng `http://localhost:3000` đã đăng ký; đổi cổng phải đổi cả `PUBLIC_URL` và redirect URI. Production vẫn cần `DATABASE_URL`, `COOKIE_SECURE=1`, `TRUST_PROXY=1` theo [hướng dẫn Neon/Render](neon-render.md). OAuth hoạt động sau proxy TLS của Render; `PUBLIC_URL` quyết định callback, không lấy từ header do client gửi.

Nếu chưa có Render, bạn có thể test Google trên web local trước. Google trên app Android/iOS cần server HTTPS truy cập được; `http://10.0.2.2:3000` chỉ hỗ trợ tài khoản/mật khẩu trong bản thử. Không cần build lại app khi bật Google trên server đã chọn; mở lại mục đăng nhập để cập nhật nút.

## Giữ nhân vật cũ và tạo mật khẩu

- **Nhân vật mới:** chọn **Tiếp tục với Google**. Lần đầu tạo nhân vật online mới; những lần sau vào đúng nhân vật đã gắn với Google đó. Khách cục bộ vẫn có tiến trình riêng.
- **Nhân vật đang chơi:** đăng nhập bằng tài khoản/mật khẩu cũ trước, mở **Cài đặt → Đăng nhập và bảo mật → Liên kết Google**, xác nhận mật khẩu rồi chọn Google. Tiến trình, đồ và quyền hiện có được giữ. Google đã gắn với nhân vật khác sẽ bị từ chối; tên/email giống nhau không tự gộp tài khoản.
- **Tài khoản Google chưa có mật khẩu:** mở **Tạo mật khẩu** trong năm phút sau khi đăng nhập Google. Ghi lại tên đăng nhập được hiển thị. Sau đó có thể dùng cả Google và mật khẩu; thao tác xóa tài khoản và quản trị vẫn xác nhận bằng mật khẩu.
- **Đổi mật khẩu:** nhập mật khẩu hiện tại và xác nhận mật khẩu mới. Các phiên khác và yêu cầu liên kết đang chờ bị thu hồi, phiên đang dùng được giữ.
- Google không tự cấp admin. Tài khoản Google muốn làm admin cần tạo mật khẩu trước, rồi được cấp bằng công cụ server theo [hướng dẫn admin](admin.md).

Chưa có chức năng gỡ liên kết, gộp hai nhân vật hoặc quên mật khẩu qua email. Tài khoản có Google đã liên kết có thể đăng nhập Google để vào game, nhưng đổi mật khẩu đã tồn tại vẫn cần mật khẩu hiện tại.

## Luồng app và dữ liệu được lưu

App mở Google bằng trình duyệt hệ thống, rồi quay lại qua `com.kenz34a.cyperzero://auth/google`. Trang callback có nút **Quay lại CYPER ZERO**. App đổi mã dùng một lần cùng một mã xác nhận giữ trong bộ nhớ để lấy cookie phiên; mật khẩu/token phiên/Google token không nằm trong URL quay lại. Mã quay lại hết hạn sau tối đa 60 giây. Nếu app bị đóng hoàn toàn lúc đăng nhập, mở lại và bắt đầu một lần mới.

Server dùng Authorization Code, PKCE, `state`, cookie liên kết trình duyệt và `nonce`. Thư viện chính thức của Google xác minh chữ ký, audience, issuer và thời hạn ID token. Server chỉ lưu Google subject (`sub`) riêng trong tài khoản, cùng tên hiển thị ban đầu; không lưu email, ảnh, access token hay refresh token. ID token chỉ được xử lý trong bộ nhớ để xác minh. Phiên game có thời hạn bảy ngày và cookie HttpOnly. Luồng đang chờ lưu trong storage riêng để có thể tiếp tục sau restart.

Nếu thay app ID, cập nhật đồng bộ scheme trong `src/google-auth.js`, `src/platform.js`, AndroidManifest và Info.plist, rồi sync/build lại app. URL callback được đăng ký với Google vẫn là HTTPS của server.

Trong môi trường cloud bị giới hạn mạng, cho phép `accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com`; secret `GOOGLE_CLIENT_SECRET` chỉ cần được cấp cho `oauth2.googleapis.com`. Bản nháp cấu hình cloud đã khai báo các yêu cầu này, cần lưu/xuất bản cấu hình và thêm thông tin OAuth của bạn để thử đăng nhập thật. Trên Render, cấu hình ba biến server trực tiếp trong dashboard.

## Kiểm tra

`npm test` kiểm tra chữ ký RSA thực với thư viện Google, lỗi nonce/audience/issuer/hết hạn, chống phát lại, ràng buộc trình duyệt, liên kết nhân vật, đổi mật khẩu/thu hồi phiên và luồng app với adapter. Các thử nghiệm không dùng Google thật hoặc tài khoản người dùng. Sau khi có credentials, thử lần đầu, đăng nhập lại, hủy chọn Google, liên kết tài khoản cũ và quay lại app trên thiết bị thật.
