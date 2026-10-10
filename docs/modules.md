# Module có phẩm chất (v0.20)

Module có sáu phẩm chất như trang bị: **Phổ thông, Cải tiến, Hiếm, Sử thi, Huyền thoại, Di sản**. Mỗi module có cấp, màu, chất lượng và chỉ số riêng. Mở module từ túi đồ, chiến lợi phẩm hoặc khe đã khảm để xem chi tiết.

Có chín loại: sát thương, máu, giáp, chí mạng, lá chắn, choáng, hồi máu mỗi lượt, ô túi và sát thương chí mạng. Module cùng loại, phẩm chất và cấp có cùng chỉ số và xếp thành một chồng; mỗi chồng chiếm một ô. Chất lượng hiện cố định theo phẩm chất (70%, 75%, 80%, 85%, 90%, 95%). Đây chưa phải cơ chế quay chỉ số ngẫu nhiên từng bản sao.

Chỉ số chính tăng theo cấp và phẩm chất. Từ Cải tiến có thêm máu hoặc giáp; từ Hiếm có thêm sát thương nếu chỉ số chính không phải sát thương. Công thức chỉ số chính là chỉ số gốc × `(1 + phẩm chất × 0,25)` × `(1 + (cấp − 1) × 0,025)`, sau đó làm tròn theo loại chỉ số. Phẩm chất được đánh số từ 0 đến 5. Server tự tính chỉ số từ mã module; giá trị do client gửi không được dùng.

## Nhận và chế tạo

- Boss PvE và rương đã mở khóa luôn có một module. Quái thường có xác suất 15%; PvP không rơi module.
- Phẩm chất tăng theo khu vực: mỗi tám khu vực tăng một bậc, tối đa Di sản. Cấp theo khu vực hoặc quái bị hạ.
- Đồ rơi chờ trong danh sách chiến lợi phẩm. Chọn **Lấy tất cả**; túi đầy sẽ chuyển phần dư vào hộp thư bảy ngày.
- **Túi đồ → Chế tạo → MODULE** có công thức cho chín loại và sáu phẩm chất. Cấp công thức bằng mức thấp hơn giữa cấp nhân vật và cấp nghề Vật liệu. Phẩm chất cao yêu cầu cấp nghề và tài nguyên cao hơn; xem chi phí trước khi chế tạo. Chế tạo nhận XP nghề Vật liệu.

## Khảm và tháo

Mở module trong túi để chọn trang bị và khe trống, hoặc mở chi tiết trang bị để lắp/thay module. Cấp module không vượt cấp trang bị và nhân vật. Module có phẩm chất mới phải có sẵn trong túi; thao tác khảm dùng một bản sao.

Trang bị hiện có tối đa ba khe: khe đầu mở sẵn, khe hai ở hiệu chuẩn +2, khe ba ở +4; hiệu chuẩn tối đa +5. Chỉ module trong trang bị đang dùng mới cộng chỉ số. Sát thương chí mạng cơ bản 150%, cộng module tối đa 200%; các giới hạn chiến đấu khác giữ luật hiện tại.

**Tháo và giữ module** hoàn đúng loại, cấp và phẩm chất. Cần đủ ô túi sau khi mất hiệu ứng module ô túi; rời dungeon và kết thúc công việc/giao tranh trước khi tháo. Thay trực tiếp hủy module cũ: tháo trước để giữ lại. Tái chế trang bị trả module nếu túi đủ chỗ; bán trang bị hủy module theo cơ chế bán hiện có.

Tặng module rời hoặc tặng/trao đổi trang bị đã khảm giữ nguyên mã module và chỉ số. Giao dịch giữa người chơi cần tài khoản trên cùng server.

## Bản lưu cũ và nền tảng

Tám module cơ bản từ bản lưu cũ giữ nguyên chỉ số và mã khảm cũ; tháo trả về chồng module cũ. Chúng hiển thị phẩm chất Hiếm, cấp 1, chất lượng 80% để giữ giao diện trước đây; việc bổ sung phẩm chất không tự tăng sức mạnh. Module cơ bản vẫn có thể mua bằng credits trong bộ chọn khe.

Web, Android và mã nguồn iOS dùng chung cơ chế. Ảnh nhân vật top 1 dùng để tham khảo giao diện và phẩm chất; không thay cấp, tiền hay chỉ số tài khoản bằng số trong ảnh.
