# CYPER // ZERO

RPG văn bản cyberpunk bằng tiếng Việt với thế giới riêng. Chạy bằng Node.js 24. Test trên máy với file JSON; có chế độ PostgreSQL để triển khai Neon + Render.

```sh
npm ci
npm start
```

Chạy các lệnh trong thư mục có `package.json`. Server mặc định dùng cổng 3000; có thể đặt `PORT`. Chạy kiểm thử bằng `npm test`. Xem [hướng dẫn test trên máy và triển khai Neon + Render](docs/neon-render.md); `render.yaml` đã chuẩn bị Web Service, cần tự cấu hình secret `DATABASE_URL`.

## Quản trị

Có bảng quản trị người chơi, khóa/cấm chat, thu hồi tin rao, hỗ trợ tài nguyên, thông báo, bảo trì và nhật ký. Đăng ký tài khoản trước, dừng server JSON, chạy `npm run admin -- grant ten_tai_khoan`, rồi khởi động và đăng nhập lại. Xem [hướng dẫn admin](docs/admin.md) cho Neon/Render và giới hạn. Quyền không được cấp từ trình duyệt.

## Vòng chơi

Nhận nhiệm vụ → khám phá và chiến đấu theo lượt → nhận thưởng → mua và trang bị → mở khu vực mới. Nghỉ ở trạm hồi đầy HP và năng lượng. Hạ boss, nâng cấp nhân vật và thử đấu trường mô phỏng. Tiến trình tự lưu vào localStorage của trình duyệt; có thể đổi tên hoặc bắt đầu lại trong Kho dữ liệu.

## Nội dung

880 hồ sơ: 530 trang bị, 90 NPC, 50 khu vực, 110 nhiệm vụ, 50 địch, 50 boss. Giữ nguyên 500 hồ sơ ban đầu và thêm 80 hồ sơ Thiên Đỉnh cùng 300 món cho sáu khe trang bị mới. Nội dung được sinh theo các mẫu, phe phái và cấp độ; chưa phải 500 câu chuyện viết riêng. Có shop thường, chợ đen bán trang bị hiếm, loot, bán đồ, XP, chỉ số trang bị và nhật ký chiến đấu.

## Trang bị và xưởng

Trang bị có màn hình chi tiết, chất lượng, hiệu chuẩn +0 đến +5 và tối đa 3 khe module. Bộ chiến đấu có chín khe, gồm ba vũ khí, mũ, giáp thân, giáp chân, giày, cấy ghép và ba lô. Mỗi lần hiệu chuẩn cộng 2 sức mạnh; mở thêm khe ở +2 và +4. Module tăng sát thương, sinh lực, phòng thủ, chí mạng, khiên, choáng, hồi HP hoặc sức chứa túi. Lắp ưu tiên module rời trong túi; nếu không có thì mua bằng credits. Chỉ trang bị đang dùng mới cộng chỉ số cho nhân vật. Có thể tháo module để giữ trong túi nếu còn chỗ. Thay trực tiếp không hoàn lại module cũ. Chất lượng là thông số hiển thị tăng theo hiệu chuẩn, không có cơ chế hao mòn trong phiên bản này. Tài khoản online lưu nâng cấp trên server; chế độ khách lưu trong trình duyệt.

Giao diện điện thoại có thanh điều hướng dưới; mở menu ☰ để vào shop, chợ đen và các mục khác. Shop có tab mua/bán. Hình thợ vũ khí là SVG riêng của dự án, không sử dụng hình nhân vật trong ảnh tham khảo.

## Trung tâm thành phố và dịch vụ

Nút Bản đồ trên thanh dưới mở Trung tâm Neon với shop, chợ đen, máy in, trạm hiệu chuẩn, sàn đổi Unit, ngân hàng và bảng nhiệm vụ. Có lối di chuyển tới các khu vực vừa cấp. Các cảnh thành phố và phòng thí nghiệm là SVG riêng của dự án.

Máy in dùng 2 linh kiện và `40 + cấp nghề × 10` credits cho mỗi món, tạo một trang bị chưa sở hữu thuộc loại đã chọn. Mỗi bản in cho 25 XP nghề; lên cấp nghề cần `cấp nghề × 50` XP. Cấp nghề in độc lập với cấp nhân vật và mở mẫu trang bị đến cấp nghề +2. Địch PvE cho 1 linh kiện, boss cho 3; nhân vật được cấp 6 linh kiện và 3 Unit để khởi đầu. Tiến trình cũ chưa có các trường này cũng được dùng mức khởi đầu khi mở dịch vụ.

Trạm hiệu chuẩn là lựa chọn tiết kiệm có rủi ro, với phí 65% của nâng cấp bảo đảm trong chi tiết trang bị. Ở +0 luôn thành công; các mức sau giảm tỉ lệ thành công 8 điểm phần trăm mỗi mức và có 2.5–4% nguy cơ phá hủy. Dùng 1 Unit để tăng thành công 10 điểm phần trăm hoặc 2 Unit để ngăn phá hủy. UI hiển thị chính xác xác suất và chi phí trước mỗi lần thử. Phí vẫn bị tiêu thụ khi thất bại. Phá hủy xóa món đồ, module và vị trí đang trang bị; bảo vệ ngăn hoàn toàn kết quả này. Nâng tối đa +5.

Sàn đổi dùng tỉ giá 100 credits = 1 Unit theo cả hai chiều. Ngân hàng cho gửi/rút credits; tiền gửi không chịu phạt mất 10% khi nhân vật thua trận. Tất cả dịch vụ bị khóa trong giao tranh và tài khoản online được kiểm tra tài nguyên trên server.

## Dungeon ký tự

Vào Dungeon từ Terminal, menu hoặc Trung tâm Neon. Mỗi lượt gồm ba tầng được sinh theo khu vực và số lượt vào. Đường đi nối thông tới mọi rương, điểm cứu trợ và boss. `@` là nhân vật, `#` là tường, `♟` là địch, `Ω` là boss, `▤` là rương, `+` là trạm cứu trợ, `!` là terminal, `△` là cửa tầng.

Di chuyển bằng phím mũi tên/WASD, nút hướng hoặc chạm ô liền kề. Vào dungeon tốn 3 EN; giao tranh tốn 2 EN, di chuyển không tốn EN. Rương chỉ nhận một lần mỗi tầng; trạm cứu trợ và terminal chỉ dùng một lần. Địch và boss được dọn sau khi thắng, vẫn tính tiến trình nhiệm vụ hiện có. Rút lui quay về ô trước và giữ địch; thua trận đóng dungeon theo cơ chế phạt hiện tại. Hạ boss để mở cửa, hoàn thành tầng ba có thưởng thêm. Không thể nghỉ, chuyển khu vực hoặc vào PvP khi còn trong dungeon.

Rời dungeon ngoài giao tranh giữ loot và đóng lượt, lần vào sau tạo lượt mới. Tiến trình dungeon và trận đấu đang diễn ra được lưu trong trình duyệt cho khách, trên server cho tài khoản online. Đồng đội và phòng phối hợp lưu trên server. Ngoài dungeon cá nhân còn có phòng phối hợp tối đa bốn tài khoản với HP địch dùng chung, rương riêng và đồng đội hiện trên bản đồ; xem phần v0.10 bên dưới.

## Tài khoản và multiplayer

Có hai chế độ: khách lưu cục bộ với đối thủ mô phỏng; tài khoản lưu trên server với bảng xếp hạng người chơi thật và PvP bất đồng bộ. Đăng ký/đăng nhập trong mục Tài khoản. Mật khẩu băm bằng scrypt với salt riêng; cookie phiên HttpOnly, SameSite=Strict. Khi triển khai qua HTTPS, đặt `COOKIE_SECURE=1`. Logic chiến đấu online và phần thưởng xử lý trên server; client không gửi chỉ số hoặc tiến trình tùy ý.

PvP đấu với bản sao trang bị của nhân vật người chơi khác, do máy điều khiển; chưa có đấu trực tiếp hai người. Có chat toàn cầu và chợ người chơi. Chợ đen vẫn là NPC vendor. Khi test trên máy không có `DATABASE_URL`, dữ liệu tài khoản nằm trong `.data/players.json` (được gitignore); không commit hoặc xóa nếu muốn giữ nhân vật. Khi cấu hình `DATABASE_URL`, backend lưu toàn bộ thế giới bằng PostgreSQL/Neon với giao dịch khóa hàng; phản hồi thành công chỉ gửi sau khi lưu. Phiên đăng nhập lưu bền vững bằng hash token, giữ qua restart, thu hồi khi đăng xuất/xóa tài khoản. Production bắt buộc PostgreSQL và cookie Secure. Backend hiện dùng một hàng JSONB cho thế giới, phù hợp triển khai ban đầu; chưa có kiểm thử tải để cam kết số người đồng thời. Xem [Neon + Render](docs/neon-render.md) để cấu hình, chuyển tài khoản JSON và sao lưu.

Thế giới, tên và văn bản trong game là nội dung riêng; không sử dụng tài sản hoặc dữ liệu của CyberCode Online.


## Cộng đồng, chợ và tập đoàn

Thanh dưới: Bản đồ (trung tâm thành phố), Túi đồ, Nhiệm vụ, Trò chuyện, Hồ sơ. Thẻ du hành mở bản đồ, khu thương mại, chợ người chơi, tập đoàn, căn hộ và dungeon. Các thẻ hiển thị điều kiện khóa; chỉ dịch vụ đủ điều kiện mới thực hiện được. Trung tâm và Nhiệm vụ có HUD cấp/XP, HP, năng lượng và dòng chat gần nhất.

Chat toàn cầu cập nhật mỗi 5 giây, giữ 100 tin gần nhất trên server. Chỉ tài khoản đăng nhập được gửi; tối đa 256 ký tự và cách nhau ít nhất 2 giây. Tin nhắn được hiển thị dưới dạng văn bản, không thực thi HTML. Chế độ khách được đọc chat. Có kênh tập đoàn và thư riêng. Có công cụ quản trị xóa tin, cấm chat và khóa tài khoản; chưa có luồng báo cáo tin nhắn từ người chơi.

Chợ người chơi giữ món đồ khi rao bán, lấy khỏi túi và giữ nguyên hiệu chuẩn/module. Người bán đặt giá 1–1.000.000 credits, tối đa 10 tin; không thu phí. Người mua phải đủ cấp, đủ credits và chưa có cùng mẫu trong túi hoặc kho. Mỗi mẫu chỉ có một bản sao trong tài khoản, bao gồm đồ đang rao. Không thể mua lại chính tin của mình; có thể thu hồi miễn phí. Giao dịch mua chuyển đồ và tiền một lần trên server, kể cả khi có hai người mua đồng thời. Giao dịch/cất đồ/rao bán bị khóa trong dungeon và giao tranh. Chợ có tối đa 1.000 tin mở cho demo này.

Tập đoàn cho lập nhóm với 500 credits hoặc gia nhập miễn phí, tối đa 20 thành viên. Trụ sở hiển thị danh sách thành viên thật, cấp và người đứng đầu. Rời nhóm chuyển vai trò đứng đầu cho thành viên còn lại; nhóm trống được xóa. Chưa có nhiệm vụ nhóm hoặc chiến tranh tập đoàn.

## Mục tiêu cộng đồng và căn hộ

Nhiệm vụ hiển thị mục tiêu dữ liệu từ tổng số địch/boss PvE đã hạ trên server (không tính PvP hoặc số đếm lúc nhận nhiệm vụ). Các quỹ dùng credits thực, hiển thị người đóng góp và bắt đầu lại lúc 00:00 Việt Nam (UTC+7). Không thể đóng góp quá số còn thiếu hoặc trong dungeon/giao tranh. Đủ quỹ toàn cầu 10.000 credits giảm shop 5%; quỹ 07:00 đạt 3.000 giảm thêm 2% từ 07:00; quỹ 19:00 đạt 3.000 giảm thêm 3% từ 19:00. Hiệu lực đến hết ngày, cộng dồn tối đa 10%, được server tính lại khi mua. Chỉ shop thường/chợ đen của tài khoản online hưởng giảm giá; giá chợ người chơi giữ nguyên. Mục tiêu và đóng góp là dữ liệu thật, không có số liệu cộng đồng giả lập.

Căn hộ mở ở cấp 100, phí một lần 2.500 credits, kho 20 món và nghỉ miễn phí. Đồ trong kho giữ hiệu chuẩn/module, cần lấy ra để trang bị; không thể cất món đang dùng. Nhân vật có thể vượt cấp 40 bằng XP, nhưng nội dung bản đồ hiện có đến cấp 50. Cyberwear là màu trang trí chân dung/huy hiệu, mua một lần và đổi lại miễn phí, không tăng chỉ số. Trinoky hồi đầy HP ngoài giao tranh với 15 credits; Terminal vẫn cho nghỉ hồi đầy HP và EN miễn phí. Các tính năng cá nhân này có trong cả chế độ khách và tài khoản.


## Nhiệm vụ hướng dẫn, lõi AI và hồ sơ

Ngoài 500 hồ sơ nội dung chính, có hai nhiệm vụ hướng dẫn tích lũy trong mục **Thông thường**. MOLECULAR PRINTING yêu cầu in hai món bất kỳ, thưởng 100 credits, 40 XP và 2 linh kiện. PROGRESSION-20 yêu cầu cấp 20 và đã hạ boss khu vực 20 (Chợ Dưới / Trung tâm), thưởng 800 credits, 500 XP và 5 linh kiện. Chìa khóa là bằng chứng tiến trình hạ boss, không thể mua hoặc tự cấp. Mỗi thưởng nhận một lần, ngoài giao tranh/dungeon. Trang chi tiết hiển thị điều kiện và dẫn tới dịch vụ cần dùng. 110 hợp đồng PvE hiện có tiếp tục hoạt động riêng.

Lõi AI: mỗi ba địch/boss PvE hạ được cho 1 lõi; mỗi boss còn cho 1 bộ xử lý Hash. Lục tìm mỗi khu vực một lần, tốn 2 EN, nhận 1 Hash và 1 linh kiện. Chế tạo dùng 2 Hash + 3 linh kiện để nhận 1 lõi. Dùng một lõi hồi 30 HP/20 EN, không vượt giới hạn. Các thao tác công nghệ bị khóa trong giao tranh và dungeon; tiến trình cũ dùng 0 cho tài nguyên chưa tồn tại.

Hồ sơ có tab Hồ sơ, Tài sản, Cập nhật và Hướng dẫn; đăng nhập/đăng ký nằm trong Hồ sơ. Cấp trang bị là trung bình cấp các món đang dùng. Huy hiệu mở bằng tiến trình thật: hai bản in, mười địch PvE, một boss, một trận PvP thắng, một dungeon hoàn thành, hoặc cấp 20. Có sáu khe ghim, không cho ghim trùng; danh hiệu chỉ chọn từ huy hiệu đã mở. Ngày tạo lấy từ bản lưu thực tế; bản cũ thiếu ngày sẽ được ghi rõ.

Biểu đồ hoạt động sáu trục, thang 0–100: in (5 điểm/bản), chiến đấu (1 điểm/PvE và 3 điểm/thắng PvP), chế tạo (5 điểm/hiệu chuẩn thành công, lõi hoặc vật phẩm chế tạo), giao thương (4 điểm/giao dịch mua/bán), khám phá (2,5 điểm/khu lục tìm và 10 điểm/dungeon hoàn thành), y học (5 điểm/lần điều trị). Không cộng chỉ số chiến đấu. Bộ đếm hoạt động mới không suy đoán các lần làm trong bản cũ.

## Kênh liên lạc và uy tín

Chat có bốn tab: Chat toàn cầu, Tập đoàn, Thư và Thông báo. Chỉ thành viên hiện tại được đọc/gửi chat tập đoàn. Trả lời giữ một đoạn trích của tin gốc; server từ chối trích tin riêng sang kênh khác. Mỗi kênh giữ 100 tin gần nhất. Có thể chia sẻ trang bị đang trong túi bằng nút đính kèm: gửi ảnh chụp dữ liệu tên/cấp/hiệu chuẩn/module, không chuyển sở hữu và không tải file tùy ý. Nội dung chat và thư luôn được hiển thị dưới dạng văn bản.

Thư riêng chỉ trả về cho người gửi/người nhận đã đăng nhập. Tối đa 1.000 ký tự, mỗi thư cách nhau ít nhất 5 giây; mỗi hộp nhận giữ 100 thư gần nhất. Chỉ người nhận được đánh dấu đã đọc. Thông báo lưu 100 hoạt động gần nhất của nhân vật từ khi có tính năng này, với giờ thật và trạng thái đọc. Các bản lưu cũ không được dựng lịch sử thông báo giả. Bản nháp chat toàn cầu/tập đoàn và thư được giữ trong phiên trình duyệt khi cập nhật dữ liệu; đăng xuất xóa bản nháp riêng.

Tặng danh tiếng cộng 1 uy tín cho một tài khoản khác, mỗi tài khoản tặng một lần/ngày Việt Nam; không thể tự tặng hoặc gửi số điểm tùy ý. Uy tín và giới hạn ngày được lưu trên server. Đây là tính năng demo, chưa có cơ chế chống nhiều tài khoản để tự tăng uy tín.


## Túi đồ, vật phẩm và chế tạo

Túi đồ có bốn tab: Đang mặc, Túi đồ, Hộp thư và Chế tạo. Bộ trang bị gồm ba vũ khí, mũ, giáp thân, giáp chân, giày, cấy ghép và ba lô. Túi có 60 ô cơ bản, cộng ô từ ba lô/module pocket đang dùng; mỗi trang bị hoặc chồng vật phẩm dương chiếm một ô. Đồ đang mặc cũng nằm trong túi. Bản lưu cũ vượt 60 ô vẫn giữ toàn bộ đồ, nhưng cần dọn túi trước khi mua/in/nhận thêm.

Khởi đầu có 3 thuốc giảm đau và 1 pin năng lượng. Bản lưu cũ thiếu trường vật phẩm nhận cùng mức khởi đầu, chỉ áp dụng khi chưa có trường này. Thuốc hồi 40 HP; pin hồi 10 EN; nanobot hồi 80 HP và 15 EN. Ba khe nhanh tự chọn; dùng thuốc trong giao tranh tốn một lượt và địch phản công. Không dùng được khi các chỉ số mà vật phẩm hồi đã đầy. Mua từng đơn vị trong Túi đồ; có thể chế tạo từ linh kiện, credits và Hash. Giá/công thức hiển thị trước thao tác.

Mỗi ba địch/boss PvE hạ được nhận một bản vẽ; độ hiếm theo khu vực và loại xoay vòng chín khe trang bị. Mỗi rương dungeon có thêm một bản vẽ thường. Có 54 mẫu bản vẽ, nằm ngoài 500 hồ sơ ban đầu. Chế tạo dùng một bản vẽ, `2 + độ hiếm` linh kiện và `50 + độ hiếm × 80` credits; nhận mẫu đầu tiên chưa sở hữu, đúng loại/độ hiếm, không vượt cấp nhân vật. Không tính chế tạo bản vẽ là in phân tử; nghề in và nhiệm vụ in vẫn yêu cầu Máy in 3D.

Chiến lợi phẩm vượt sức chứa chuyển vào Hộp thư; trang bị giữ hiệu chuẩn/module. Chồng bản vẽ chờ nhận cũng được giữ nguyên số lượng. Vật phẩm tự nhận khi còn ô ngoài dungeon và giao tranh; có nút lấy tất cả và nhận từng món. Chiến lợi phẩm mới khi tràn túi có hạn 7 ngày. Kiện cũ không có hạn dùng và trang bị thu hồi từ chợ không hết hạn. Có một kiện tiếp tế nhận một lần gồm 2 thuốc, 50 credits và 2 linh kiện. Các giao dịch mua/in/rút kho bị từ chối khi thiếu ô, trước khi trừ tài nguyên. Thu hồi tin chợ khi túi đầy gửi vào hộp thư. Mẫu trang bị trong hộp thư vẫn tính là đã sở hữu.

Túi đồ có tìm kiếm, lọc trang bị/bản vẽ/thuốc, sắp xếp trang bị theo sức mạnh/cấp/tên và tab chìa khóa. Chọn nhiều trang bị để bán cùng lúc; nếu bất kỳ món nào không hợp lệ hoặc đang mặc, toàn bộ thao tác bị từ chối. Có hai bộ trang bị lưu nhanh; áp dụng chỉ khi tất cả món còn trong túi, đúng loại và đủ cấp, ngoài dungeon/giao tranh.

## Kệ trưng bày, thú cưng và tài sản công khai

Tài sản có ba kệ trưng bày, mở lần lượt ở cấp 100/200/300 với 1/5/25 triệu credits. Mỗi kệ hiển thị một mẫu đang sở hữu trong túi hoặc kho căn hộ; không chuyển món đồ và không cộng chỉ số. Đồ đã bán hoặc rao lên chợ sẽ không xuất hiện trong kệ công khai.

Có ba thú cưng trang trí: Drone Mắt Quỹ Đạo (LV1, 120 credits), Mèo máy Pixel (LV10, 500 credits) và Sứa ánh sáng (LV20, 1.500 credits). Mua một lần, chọn một thú cưng đi cùng hoặc cho nghỉ; không cộng sức mạnh chiến đấu. Skin chat chọn từ cyberwear đã mua.

Tùy chọn riêng tư độc lập cho kệ, thú cưng, huy hiệu và skin chat. Mặc định công khai kệ/thú cưng, ẩn huy hiệu/skin. API `GET /api/profile/:id` chỉ trả về những tài sản được cho phép, không trả ví, nguyên liệu, túi đồ hoặc dữ liệu tài khoản. Skin chỉ được trả về trong chat khi cho phép; thay đổi quyền riêng tư áp dụng cả tin cũ ở lần tải tiếp theo. Xem tài sản công khai từ trang Uy tín hoặc nút xem trong hồ sơ của mình. Chế độ khách có bản xem trước tại chỗ; chỉ tài khoản server có hồ sơ chia sẻ cho người khác.


## Hộp thư tự nhận và catalog chế tạo

Server dùng thời gian của mình để xử lý hộp thư khi đăng nhập, đọc nhân vật và sau mỗi hành động thành công. Khách xử lý khi giao diện cập nhật. Hết hạn đúng mốc bảy ngày, trang bị chờ nhận và module đi kèm bị xóa; vật phẩm đã chuyển vào túi không hết hạn. Các lô cùng loại giữ hạn riêng, không kéo dài hạn khi có lô mới. Dòng xếp chồng hiển thị hạn sớm nhất nếu có nhiều lô. Bản lưu cũ chưa có thời hạn không bị thêm hạn dùng. Hàng thu hồi từ chợ là tài sản đã mua, được giữ không hạn.

Tự nhận ưu tiên chồng vật phẩm trước, sau đó trang bị theo thứ tự chờ; chồng đã có trong túi không cần ô mới. Tạm dừng tự nhận trong dungeon/giao tranh, nhưng thời hạn vẫn được tính. Nút lấy tất cả nhận phần còn chỗ; phần dư vẫn nằm trong hộp thư. Gói tiếp tế khởi đầu vẫn yêu cầu nhận một lần. Hộp thư phân trang 20 kiện, không xóa kiện vì vượt số hiển thị.

Chế tạo có các bộ lọc ALL/MEDICAL/AMMO/MATERIAL và tùy chọn ẩn công thức không thể tạo. Hiển thị cả công thức thiếu bản vẽ, nguyên liệu, tiền, cấp nghề hoặc ô trống. Số lần khả dụng và lý do thiếu dùng cùng phép tính với hành động server. Có thể chế tạo 1–100 lần một thao tác; nếu bất kỳ lần nào không hợp lệ, toàn bộ lô không trừ tài nguyên.

Có ba nghề chế tạo riêng: Y học, Đạn dược và Vật liệu. Lên cấp cần `cấp nghề × 40` XP, tối đa cấp 100. Thuốc/nanobot/pin thường cho 25 XP; vật liệu đạn cho 20 XP; bản vẽ cho 40 XP. Chế tạo lõi và nén/tách cụm không cho XP nghề. Nghề in và cấp nhân vật không thay đổi bởi XP nghề chế tạo.

Cụm lõi AI dùng 1.000 lõi + 50.000 credits, tách cụm trả 1.000 lõi và không hoàn phí. Lõi AI thông thường vẫn tạo từ 2 Hash + 3 linh kiện. Vật liệu đạn dược dùng 2 linh kiện + 10 credits. Pin Nitron yêu cầu nghề Đạn dược cấp 10, dùng 1 vật liệu đạn, nhận 2 pin và 160 XP nghề; mỗi pin hồi 12 EN để dùng kỹ năng. Pin có thể mua hoặc nhận từ loot mà không cần cấp nghề chế tạo. Boss thưởng 3 thuốc giảm đau, hoàn thành dungeon thưởng 2 pin Nitron; nếu thiếu ô, tiếp tế chuyển vào hộp thư có hạn.

## Ga tàu và mảnh khóa

Ga tàu trung tâm có năm tuyến, mỗi tuyến mười điểm đến: Ngoại Vi Neon 1–10, Tháp Kính 11–20, Tín Hiệu 21–30, Vành Đai Đỏ 31–40, Thiên Đỉnh 41–50. Di chuyển tốn 1 EN, tối đa cao hơn nhân vật 2 cấp, ngoài dungeon/giao tranh/công việc.

Vành Đai Đỏ cần hoàn thành dungeon ba tầng tại khu vực 21, 25, 30; Thiên Đỉnh cần dungeon khu vực 31, 35, 40. Mỗi nguồn cho một mảnh duy nhất; hạ địch ngoài dungeon không cho mảnh. Đủ ba mảnh phải đến giao diện Terminal ở Trung tâm để ghép chìa khóa. Mảnh không bán được, không chiếm ô túi và giữ lại làm bằng chứng. Lệnh di chuyển trực tiếp cũng kiểm tra chìa khóa. Bản lưu cũ giữ mảnh đã kiếm bằng PvE và quyền tuyến Vành Đai Đỏ từng mở; phần nâng cấp chỉ thực hiện một lần.

## Công việc khu thương mại

Năm công việc có thời gian cố định: xưởng in 60 giây/2 EN/+25 XP in; dữ liệu y tế 60 giây/2 EN/+30 XP y học; luyện đạn 60 giây/2 EN/+30 XP đạn; tái chế 30 giây/2 EN/1 linh kiện/+50 XP in; khai thác credits 120 giây/3 EN/`30 + cấp nhân vật × 2` credits. Khai thác là hoạt động trong game, không kết nối mạng tiền mã hóa. Hiển thị chi phí, thưởng và điều kiện trước thao tác.

Một công việc mỗi lần. Thời hạn và phần thưởng online do server tính khi bắt đầu, lưu cùng nhân vật, tiếp tục qua khởi động lại và đăng nhập lại. Hết thời gian cần bấm Nhận thưởng; chỉ nhận một lần. Hủy không hoàn EN/linh kiện. Trong lúc công việc còn chờ, di chuyển, PvP/PvE, dungeon, nghỉ, chế tạo, in, hiệu chuẩn, hồi năng lượng và ghép khóa bị chặn; vẫn xem kho, mua bán và trò chuyện được. Chế độ khách dùng đồng hồ thiết bị.

Đào tạo tăng XP nghề mà không tăng số món đã in/chế tạo hay tiến trình nhiệm vụ in. Nghề in tối đa cấp 50, nghề y học/đạn/vật liệu tối đa 100. Thanh đếm giờ cập nhật mỗi giây, có thông báo công việc trên trang khác. Nhóm nội dung Thiên Đỉnh có bản đồ, NPC, địch, boss, nhiệm vụ và trang bị Di sản cấp 41–50; toàn bộ dungeon ba tầng dùng cùng cơ chế khám phá.

## Khu chợ Neon

Thẻ du hành Đến chợ Neon mở trang khu chợ với cảnh SVG riêng, bốn điểm tương tác và hai lối vào riêng: Thăm thị trường người chơi và Gian hàng của tôi. Chợ đen dùng shop trang bị hiện có. Hẻm thông tin đọc lời thoại NPC của khu vực hiện tại, không cấp XP hoặc tiền; lục tìm dùng cơ chế Hash/linh kiện một lần mỗi khu vực và tốn 2 EN. Neon Paws cho mua, chọn hoặc cho nghỉ ba thú cưng hiện có, giữ cùng dữ liệu với Hồ sơ → Tài sản. Partyline dẫn đến chat toàn cầu và các quỹ cộng đồng hiện có.

Thị trường chỉ hiện tin từ runner khác; gian hàng riêng chỉ hiện tin của tài khoản đã đăng nhập và có form rao bán. Có tìm theo tên trang bị/người bán, lọc vũ khí/giáp/cấy ghép, sắp xếp mới nhất/giá tăng/giá giảm, cập nhật thủ công và cập nhật khi danh sách đổi ngoài lúc nhập liệu. Bộ lọc và giá đang nhập được giữ khi giao diện cập nhật. Tin vẫn giới hạn 10 mỗi tài khoản, trang bị gửi vào escrow với hiệu chuẩn/module, mua được xử lý trên server một lần; thu hồi khi túi đầy gửi vào hộp thư không hết hạn. Chế độ khách xem giá và cảnh chợ, phải đăng nhập để mua/rao/thu hồi hoặc góp quỹ.

Thẻ bờ biển mở cảnh bến cảng, sau đó có nút đi Cảng Tro (khu vực cấp 2 hiện có) với 1 EN; mở cảnh/dịch vụ không tự đổi vị trí hay tốn năng lượng. Năm nút điều hướng dưới cùng được giữ nguyên. Khu thương mại và thẻ du hành dùng các biểu tượng SVG để đồng bộ nét và màu trên điện thoại.

## Cài đặt cá nhân (v0.9)

Mở bằng bánh răng ở HUD, menu Cài đặt hoặc nút trong Hồ sơ. Trang giữ bản nháp; bấm **Áp dụng** mới lưu vào nhân vật khách hoặc tài khoản server. Server kiểm tra khóa, kiểu dữ liệu và miền giá trị trước khi cập nhật cả bộ; cài đặt không cấp tiền, XP hoặc đổi sức mạnh. Cỡ UI auto/nhỏ/vừa/lớn phóng phần nội dung; menu và cài đặt có Việt/Anh, nội dung thế giới/lời thoại vẫn bằng tiếng Việt.

Âm thanh dùng Web Audio với nhạc nền tổng hợp riêng và âm báo ngắn, không tải nhạc ngoài. Nhạc mặc định tắt; chỉ khởi chạy audio sau thao tác người dùng, dùng một AudioContext, tạm dừng khi tab ẩn. Volume 0–100 điều khiển nhạc; có cờ riêng cho hiệu ứng, thông báo, @nhắc tên và thư. Thông báo tập đoàn chỉ theo dõi tin mới trong nhóm hiện tại; buff thế giới báo khi quỹ chuyển sang hoạt động. Quyền thông báo trình duyệt chỉ được xin bằng nút riêng sau khi đã áp dụng lựa chọn cho phép; không tự bật popup xin quyền. Khi đã cấp quyền, có thể nhận thông báo ngoài tab, tùy hỗ trợ của trình duyệt.

Hoạt ảnh NPC áp dụng cho minh họa shop/xưởng; Ẩn NPC ẩn minh họa, giữ nút và lời thoại. Hoạt ảnh chờ áp dụng cho thanh công việc; chế độ giảm chuyển động của hệ điều hành luôn được tôn trọng. Tắt hiệu ứng chat dùng màu mặc định của mọi tin. Tắt thanh sát thương chỉ ẩn đòn vừa đánh; màn hình chiến thắng có thể tắt, mọi phần thưởng vẫn do server tính và cộng đúng một lần. Reload không mở lại chiến thắng cũ. Thẻ hướng dẫn tân thủ và ghi chú phiên bản có nút bỏ qua; các cờ cài đặt có thể ẩn thẻ đó.

Huy hiệu riêng tư đồng bộ với Hồ sơ → Tài sản. Ẩn bí danh thay tên trong hồ sơ công khai bằng “Runner ẩn danh”; tên dùng trong chat và giao dịch vẫn là danh tính nhân vật. Ẩn quyên góp bỏ tên/mức đóng góp khỏi danh sách công khai, giữ tổng quỹ và giảm giá. Các mục dịch chat, bản dịch của tôi, ẩn tin gốc, quảng cáo/Skip, gửi quà và tường căn hộ được khóa với giải thích vì chưa có dịch vụ/cơ chế tương ứng; tin gốc luôn hiện.

**Xóa tài khoản** là luồng riêng, không xảy ra khi bấm Áp dụng. Phải nhập đúng bí danh hiện tại và mật khẩu, sau đó xác nhận trong hộp thoại thứ hai. Server xác minh phiên, nguồn yêu cầu, mật khẩu và tên; yêu cầu kết thúc combat/dungeon/công việc. Xóa nhân vật, tin rao, thư liên quan và tin chat của tài khoản, bỏ trích dẫn vào tin đã xóa, chuyển trưởng tập đoàn cho thành viên còn lại hoặc xóa nhóm trống; thu hồi mọi phiên của tài khoản. Khoản đóng góp trong sổ tổng quỹ được giữ dưới ID không còn liên kết danh tính. Các tài khoản khác và nhân vật khách trên thiết bị được giữ lại. Mật khẩu xác nhận chỉ ở bộ nhớ giao diện đến khi gửi hoặc hủy, không ghi vào localStorage hoặc dữ liệu nhân vật. Kiểm thử xóa dùng tài khoản tạm trong thư mục dữ liệu riêng.


## Mở rộng sau đối chiếu CyberCode Online (v0.10)

Bản đối chiếu chi tiết, nguồn tham khảo và các phần còn thiếu nằm trong [docs/reference-comparison.md](docs/reference-comparison.md). Repository tham chiếu không chứa toàn bộ game để chạy lại; CYPER dùng mã, văn bản và SVG riêng, không sao chép dữ liệu/hình ảnh của repository đó.

**Trang bị và chiến đấu:** thêm 300 món cấp 1–50: vũ khí đặc biệt, hủy diệt, mũ, giáp chân, giày và ba lô. Giữ 230 món cũ và mọi ID; loadout ba khe cũ vẫn áp dụng được. Mũ tăng HP, giáp chân tạo khiên, giày cộng phòng thủ/hồi HP, ba lô thêm 5–20 ô. Tháo ba lô giữ toàn bộ đồ; nếu quá sức chứa thì chặn nhận thêm.

Vũ khí chính không tốn đạn. Vũ khí đặc biệt dùng một Pin vũ khí đặc biệt/phát; hủy diệt dùng một Đạn phản vật chất/phát. Khi địch còn khiên, toàn đòn đánh dùng hệ số 1,2 hoặc 0,5; sát thương dư sau khiên giữ hệ số này khi tràn vào HP. Nếu khiên đã hết trước đòn đánh thì dùng 100% sát thương. Thiếu đạn hoặc vũ khí bị từ chối trước khi tốn lượt. Pin/đạn mua bằng 18/35 credits; chế tạo pin từ một vật liệu đạn nhận ba pin, chế tạo đạn ở nghề cấp 5 từ hai vật liệu và một linh kiện nhận hai viên. Pin Nitron cũ tiếp tục dùng để hồi EN, khác với đạn vũ khí.

Module khiên cộng 20 khiên, choáng cộng 5%, tái sinh cộng 2 HP/lượt, pocket cộng hai ô. Choáng tối đa 50%, khiến địch bỏ lượt phản công; địch Phản xạ giảm 20% cơ hội bị choáng. Tái sinh chỉ khi còn sống sau lượt, không hồi sinh. Khiên của nhân vật được nạp khi bắt đầu trận; HP và đạn không tự hồi. Sáu biến thể địch có chỉ số và thưởng khác nhau, xem trước ở Terminal. Ba dấu Xuyên thấu/Phân rã/Chết chóc xác định theo mẫu đồ và đa số bảy món chiến đấu; bỏ qua cấy ghép/ba lô. Hòa thì không có dấu chủ đạo. Dấu tăng 10% sát thương lên một phe và nhận thêm 10% từ một phe khác. Không áp dụng lợi thế phe lên PvP.

**Module và tái chế:** tháo module chuyển thành stack rời; lắp lại dùng stack trước khi mua bằng credits. Tháo hoặc tái chế bị từ chối toàn bộ nếu không đủ ô. Tái chế một món hoặc lô đã chọn cho `1 + độ hiếm` linh kiện/món và trả module vào túi; không cho tái chế đồ đang mặc. Bán đồ vẫn giữ quy tắc cũ: module mất theo món. Bản vẽ của mọi khe được mở trong catalog và rơi từ PvE/rương.

**Dungeon:** thường/thử thách/tập đoàn dùng 3/4/5 EN. Nhân vật tập đoàn cần thành viên thật và cấp 10. HP địch nhân 1/1,4/2,5, tấn công nhân 1/1,2/1,6, thưởng trận nhân 1/1,5/2,5 trước hệ số tầng. Chế độ thử thách/tập đoàn có biến thể địch; rút lui có xác suất 75% cộng chỉ số giày (tối đa 100%), thất bại bị phản công. Solo thường giữ rút lui bảo đảm và cân bằng cũ.

Dấu `?` mỗi tầng mở lời đề nghị đổi hai linh kiện lấy 30 credits, 20 XP và một buff +10% tấn công/phòng thủ/khiên trong mười phút. Nhận một lần/tầng, buff cùng loại thay thời hạn, các loại khác nhau cùng có hiệu lực. Dấu `!` lưu một hồ sơ ký ức cho khu vực, không cấp tiền/XP. Xem lại ở menu Ký ức Neon. Hoàn thành dungeon nhận 1/2/3 token theo độ khó; đổi ba token lấy sáu pin và ba đạn, hoặc mười token lấy mẫu hiếm trở lên chưa sở hữu, đủ cấp. Loot tràn túi vào hộp thư theo cơ chế cũ.

**Phối hợp thật:** tài khoản mở phòng trong cửa dungeon, đặt tên 3–40 ký tự và mật khẩu tùy chọn 4–64 ký tự. Mật khẩu băm scrypt trên server, không gửi qua API đọc. Runner phải ở cùng khu vực, đủ điều kiện đường tàu/cấp và còn EN; tối đa bốn người đang trong phòng. Phòng tập đoàn chỉ cùng thành viên mới xem/gia nhập. Địch dùng HP/khiên chung; mỗi người có HP, vị trí, rương và phần thưởng hoàn thành riêng. Thưởng một địch chỉ cấp một lần cho từng thành viên vẫn trong phòng, đóng góp ít nhất 20% tổng HP + khiên và không cao hơn địch quá 12 cấp. Server cộng đóng góp từ sát thương thực, không nhận số từ client. Một địch chết mở đường/boss cho mọi người, kể cả người không nhận thưởng. Đồng đội hiển thị bằng `◉`, cập nhật tối đa mỗi năm giây.

Rời, thua hoặc hoàn thành sẽ không thể vào lại cùng phòng. Phòng hết hạn sau hai giờ không có hành động dungeon thành công, giữ loot đã nhận. Người vào muộn bắt đầu tầng một của cùng lượt, boss đã hạ vẫn được dọn; rương còn riêng. Các phòng, HP, sổ thưởng và phiên đăng nhập lưu qua restart. Nhiều người có thể ở các tầng khác nhau; đây chưa phải mạng phòng nhiều cửa của CCO hoặc mô hình MMO nhiều tiến trình. Chưa có hồi máu đồng đội AOE.

**Điểm danh và hợp đồng ngày:** ngày mới lúc 00:00 Việt Nam. Điểm danh một lần/ngày theo chu kỳ bảy ngày: 40–160 credits, 1–4 linh kiện, 1 thuốc (ngày bảy là 3 thuốc). Bỏ ngày đặt lại chuỗi. Ba hợp đồng yêu cầu năm địch PvE, hai bản in và một lượt dungeon; tiến trình tính từ lần kết nối/hành động đầu ngày, không tính lại lịch sử. Phải nhận thưởng ngoài giao tranh/dungeon/công việc; server tính ngày và phần thưởng. Chế độ khách dùng đồng hồ thiết bị. Tất cả thưởng tràn túi giữ cùng quy tắc hộp thư bảy ngày.
