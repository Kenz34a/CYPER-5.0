# Web, Android và iOS (v0.12)

Cả ba dùng cùng mã game và API. App Android/iOS đóng gói giao diện bằng Capacitor 8, có icon, màn hình khởi động, hỗ trợ vùng tai thỏ/thanh hệ thống và nút Back trên Android. Không cần server để chơi khách. Tài khoản, chat, chợ người chơi, PvP, phòng phó bản và admin cần kết nối server.

Tiến trình **khách lưu riêng trên từng trình duyệt/app**, không tự chuyển thành nhân vật online. Đăng nhập **cùng tài khoản trên cùng server** để tiếp tục nhân vật online trên thiết bị khác. Cài lại/xóa dữ liệu app có thể mất nhân vật khách. Không thể chơi nhân vật online khi mất mạng.

## 1. Bản web và ứng dụng web cài được

Trên máy có Node.js 24, mở terminal trong thư mục dự án:

```sh
npm ci
npm start
```

Mở `http://localhost:3000` trên chính máy chạy server. Điện thoại cùng Wi-Fi có thể mở `http://IP_LAN_CUA_MAY:3000`; cho phép cổng 3000 trong firewall khi cần.

Bản web có manifest và service worker. Sau lần tải đầu hoàn tất, có thể mở và chơi khách khi mất mạng. Cache chỉ chứa giao diện công khai, không chứa dữ liệu API/tài khoản. Khi có phiên bản mới, mở **Hồ sơ → Cài đặt → Ứng dụng web → Cập nhật phiên bản mới** sau khi kết thúc giao tranh/công việc. Khi sửa tài nguyên frontend, tăng phiên bản cache trong `sw.js` để cập nhật đồng bộ.

Để cài từ điện thoại cần trang **HTTPS** (ví dụ Render). HTTP qua IP LAN chỉ dành cho thử trong trình duyệt; không bật PWA ngoại tuyến/cài đặt trên điện thoại.

- Android/Chrome: mở game → Hồ sơ → Cài đặt → Cài CYPER ZERO, hoặc menu Chrome → Cài đặt ứng dụng.
- iPhone/iPad: mở URL game bằng Safari → Chia sẻ → Thêm vào Màn hình chính.
- Desktop Chrome/Edge: biểu tượng cài ứng dụng ở thanh địa chỉ.

PWA trên iPhone dùng được khi chưa có bản ký từ Xcode. Đây là bản web cài trên màn hình chính; dự án iOS bên dưới là app native riêng.

## 2. Cấu hình server cho app

Hiện chưa có Render: app mở ở **chế độ khách**, không cần nhập URL. Sau khi triển khai theo [Neon + Render](neon-render.md), mở **Hồ sơ → Cài đặt → Kết nối ứng dụng**, nhập địa chỉ gốc HTTPS của Web Service, lưu rồi đăng nhập. Đăng xuất trước khi đổi server. Chỉ nhập URL công khai của backend; **DATABASE_URL của Neon luôn ở server**.

Cũng có thể đặt mặc định khi build: sao chép `.env.mobile.example` thành `.env.mobile`, điền `CYPER_SERVER_URL` rồi build lại. File này được gitignore. Không chứa mật khẩu hoặc khóa ký.

```dotenv
CYPER_SERVER_URL=https://TEN_WEB_SERVICE.onrender.com
CYPER_DEV_HTTP=0
```

Không đặt `server.url` trong `capacitor.config.json`: giao diện nằm sẵn trong app. API web dùng fetch cùng origin; API native dùng CapacitorHttp và kho cookie của hệ điều hành. Backend giữ cookie HttpOnly và kiểm tra Origin cho trình duyệt; không cần bật CORS cho mọi domain.

## 3. Android: chạy thử và tạo APK

Cần **Node.js 24, JDK 21 có javac, Android Studio**, Android SDK **36**, Build Tools **35.0.0 và 36.0.0**. Android tối thiểu 7.0/API 24; dùng WebView đã cập nhật. Thiết lập SDK theo Android Studio; `android/local.properties` là cấu hình riêng của máy, không commit.

```sh
npm ci
npm run mobile:sync
npm run android:open
```

Trong Android Studio chọn emulator/điện thoại rồi bấm Run. Android dùng nút Back để đóng hộp thoại/chi tiết/menu, quay về trung tâm, sau đó hỏi trước khi thoát.

Để thử online với server trên máy trước khi có Render, chạy `npm start` ở terminal thứ nhất. Trong `.env.mobile`:

```dotenv
# Android Emulator truy cập máy host qua 10.0.2.2.
# Điện thoại thật: thay bằng IP LAN của máy chạy Node, cùng Wi-Fi.
CYPER_SERVER_URL=http://10.0.2.2:3000
CYPER_DEV_HTTP=1
```

Build/sync lại rồi Run. HTTP chỉ chấp nhận localhost/IP nội bộ trong build thử; manifest debug cho phép HTTP, manifest release chặn HTTP. iOS vẫn dùng HTTPS. Khi có Render, đổi `CYPER_DEV_HTTP=0` và dùng HTTPS trước khi tạo bản phát hành.

Tạo APK debug để cài trực tiếp trên Android:

```sh
# macOS/Linux
npm run android:debug

# Windows PowerShell (sau npm ci)
npm run mobile:build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Kết quả: `android/app/build/outputs/apk/debug/app-debug.apk`. Chép APK sang điện thoại, cho phép cài từ nguồn đó rồi mở **CYPER ZERO**. APK debug ký bằng khóa thử của máy build, không phải bản phát hành Play Store; APK từ máy build khác có thể cần gỡ bản cũ trước khi cài, làm mất dữ liệu khách.

Phát hành Google Play: dùng Android Studio → Build → Generate Signed App Bundle, tạo/chọn khóa ký riêng và build release AAB. Mỗi lần phát hành tăng `versionCode` trong `android/app/build.gradle`. Giữ khóa ký bên ngoài Git; chưa cấu hình tài khoản Play Console hay xuất bản cửa hàng.

## 4. iOS: chạy thử trên Mac

Cần **macOS, Xcode 26+**, Node.js 24. Dự án dùng Swift Package Manager, không cần CocoaPods. iOS tối thiểu 15.4. Windows/Linux không build hoặc ký được IPA iOS.

```sh
npm ci
npm run mobile:build
npx cap sync ios
npm run ios:open
```

Trong Xcode chọn scheme **App**, simulator iPhone và Run. Để thử online, dùng URL HTTPS của backend; khi chưa có server vẫn chơi khách được. Để chạy iPhone thật, chọn Signing & Capabilities → Team của bạn, kiểm tra Bundle Identifier rồi chọn thiết bị. Dự án chưa chứa Team ID hoặc chứng chỉ ký của người dùng.

Đưa lên TestFlight/App Store cần tài khoản Apple Developer, hồ sơ app và ký bản Archive bằng Xcode. Chọn Generic iOS Device → Product → Archive → Distribute App. Bản simulator `.app` không cài được lên iPhone thật; IPA có thể cài được còn phụ thuộc chữ ký và cách phân phối của Apple. Chưa có IPA đã ký trong kho này.

## 5. Build và kiểm tra sau mỗi thay đổi

```sh
npm test
npm run mobile:sync
```

`mobile:build` chỉ chép các file frontend có trong allowlist công khai, tạo bundle JS và không đóng gói backend, dữ liệu người chơi hoặc secret. `dist` và các thư mục build native được gitignore. Luôn sync lại sau khi sửa game; app đã cài không tự lấy giao diện mới từ server. Phân phối bản APK/IPA mới để cập nhật app native.

GitHub Actions **Build apps** có thể chạy thủ công ở tab Actions: chọn Android, iOS simulator hoặc cả hai. Artifact Android là APK debug; artifact iOS là `.app` cho simulator, không có chữ ký phân phối. Build iOS trên GitHub vẫn cần runner macOS có Xcode 26+. Các workflow không triển khai Render, không ký release và không xuất bản cửa hàng.

Trước khi đưa ra cửa hàng, chọn app ID riêng của bạn (hiện `com.kenz34a.cyperzero`), cấu hình quyền sở hữu/chữ ký, chính sách riêng tư, URL hỗ trợ, ảnh chụp và thử trên thiết bị thật. Thay app ID phải cập nhật đồng bộ cấu hình Capacitor, Android namespace/applicationId và Bundle Identifier iOS.

## Đăng nhập Google

v0.13 hỗ trợ Google qua trình duyệt hệ thống trên app. Cấu hình OAuth ở server HTTPS, app dùng cùng Web client với bản web; không đưa Client secret vào bản build. Xem [hướng dẫn bật Google](google-login.md). Dự án Android/iOS đã có scheme quay lại game; nếu đổi app ID cần đổi scheme đồng bộ.
