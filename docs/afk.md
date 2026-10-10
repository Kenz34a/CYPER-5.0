# AFK và Unit (v0.18)

Ở **Terminal**, chọn **Triển khai bot** hoặc **Thu thập**. Các nghề đào tạo và khai thác credits ở **Khu thương mại** cũng có màn chọn số lượt. Chọn số bằng ô nhập, thanh kéo, tối thiểu/tối đa hoặc các nút ±10/100/1.000. Số lượt hợp lệ từ 1 đến 1.000; server kiểm tra tổng tài nguyên trước khi trừ.

Màn chuẩn bị hiển thị tổng thời gian, yêu cầu và phần thưởng. Một nhân vật có một công việc; nhận thưởng hoặc hủy trước khi bắt đầu tiếp. Thời gian vẫn chạy khi đóng game. Hủy không hoàn lại chi phí. Công việc và phần thưởng đã chốt lưu cùng nhân vật qua khởi động lại server.

## Công việc ở khu vực

- **Bot:** 15 phút, 1 lõi AI mỗi lượt. Nhận XP nhân vật, credits, linh kiện, vật liệu đạn, pin vũ khí đặc biệt và thuốc giảm đau; khu vực LV 11+ có đạn phản vật chất, LV 21+ có Nitron. Phần thưởng theo cấp khu vực hiện tại, không tính là hạ quái hoặc dọn dungeon.
- **Thu thập:** 5 phút, 2 EN mỗi lượt. Cần nghề thu thập đạt cấp khu vực. Nhận XP nghề, linh kiện và vật liệu đạn. Bắt đầu ở khu vực LV 1 để nâng nghề trước khi đến khu vực cao hơn.

Vật tư nhận được chuyển vào hộp thư 7 ngày khi túi đầy. Bot và thu thập không cho Unit. Lõi AI có thể chế tạo từ Hash và linh kiện hoặc nhận theo các nguồn PvE hiện có.

## Bỏ qua và buff

| Dịch vụ | Phí | Tác dụng |
| --- | --- | --- |
| Bỏ qua cá nhân | 1 Unit/phút còn lại, làm tròn lên | Hoàn thành và nhận thưởng ngay; phí thực tế không vượt mức đã xác nhận. |
| Bỏ qua toàn server | 10 Unit | Giảm 15 phút cho mọi công việc đang chờ, kể cả người ngoại tuyến. Công việc xong vẫn cần nhận thưởng; không có ai chờ thì không trừ Unit. |
| Giảm thời gian toàn server | 5 Unit | Giảm 40%, cộng dồn tối đa 80%. Mỗi lần có hiệu lực 20 phút riêng. |
| Tăng thưởng toàn server | 8 Unit | Nhân 4 tài nguyên, credits và XP trong 20 phút; không tăng chi phí đầu vào. |
| Buff XP toàn server | 5 Unit | Thêm 80% XP trong 20 phút, kết hợp được với tăng thưởng. |

Buff áp dụng cho công việc **bắt đầu khi buff đang có hiệu lực**. Thời gian và thưởng được chốt lúc bắt đầu; buff hết hạn hoặc được mua sau đó không đổi lượt đã chốt. Ví dụ: bot 2 lượt tốn 2 lõi AI, thời gian gốc 30 phút; giảm 80% còn 6 phút. Buff tăng thưởng chưa hết không thể mua chồng thêm; giảm thời gian đã đạt 80% cũng không trừ thêm tiền.

Mua dịch vụ toàn server có màn xác nhận. Server trừ Unit và cập nhật mọi người trong cùng giao dịch lưu trữ. Mã yêu cầu chống trừ lặp khi gửi đồng thời hoặc gửi lại sau khi mất kết nối; dùng **Thử lại cùng giao dịch** nếu phản hồi chưa chắc chắn. Chat và mục tiêu cộng đồng hiển thị sự kiện kích hoạt.

Unit chỉ có từ nạp do admin xác nhận giao dịch và cấp bằng công cụ quản trị. Chưa tích hợp cổng thanh toán tự động hoặc đăng ký định kỳ. Người chơi khách thử AFK cục bộ miễn phí; dịch vụ toàn server cần tài khoản online. Xem [quản trị](admin.md) và [Neon/Render](neon-render.md).
