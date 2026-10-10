# Hồ sơ và liên hệ (v0.19)

Mở **Hồ sơ** để xem nhân vật của mình. Biểu đồ năm trục dùng cấp nghề thật: kỹ thuật in, khai thác, thu thập, chế tạo đạn và y học. Mỗi trục tính theo giới hạn của nghề: in cấp 50, bốn nghề còn lại cấp 100. Thanh XP bên dưới cho biết tiến độ lên cấp tiếp theo; MAX là đã tới giới hạn. Công việc khai thác credits mới cho thêm 20 XP nghề mỗi lượt; các công việc đã bắt đầu trước cập nhật giữ phần thưởng đã lưu.

Bảng chỉ số lấy trực tiếp từ trang bị, module và buff đang dùng. Tỉ lệ chí mạng/choáng tối đa 50%; sát thương chí mạng cơ bản 150%, cộng module tối đa 200%. Rút lui là xác suất thoát khỏi dungeon khó, không phải né đòn. Dấu trang bị cho biết lợi thế và điểm yếu với phe địch. Các giá trị theo luật CYPER, không sử dụng con số trong ảnh tham chiếu.

Nhấn tên runner trong chat, bảng xếp hạng hoặc **Uy tín → Hồ sơ** để xem hồ sơ công khai. Ba tab hiển thị thống kê, trang bị đang mặc và tài sản. **Hồ sơ → Tài sản** có tùy chọn ẩn riêng chỉ số, nghề và trang bị, bên cạnh kệ/thú cưng/huy hiệu/skin. Ví, nguyên liệu, túi đồ, thư và dữ liệu tài khoản không nằm trong API hồ sơ công khai.

## Thao tác với runner

| Thao tác | Hoạt động |
| --- | --- |
| Gửi tin nhắn | Mở soạn thư riêng, chọn sẵn người nhận. |
| Tặng quà | Chuyển credits, linh kiện, Hash, lõi AI, vật phẩm xếp chồng hoặc trang bị chưa mặc. Không chuyển Unit. |
| Trao đổi | Giữ món của người gửi tối đa 24 giờ; người nhận xem và xác nhận giá credits và món muốn đổi. Hai bên phải kết thúc dungeon/giao tranh; món đem đổi phải được tháo. |
| Quà trang trí | Người gửi mua cyberwear bằng credits; người nhận tự chọn hiệu ứng trong hồ sơ. Không tặng loại đã có. |
| Thêm bạn | Cần người nhận đồng ý. Mỗi người tối đa 200 bạn; 20 lời mời gửi và 50 lời mời nhận đang chờ. |
| Uy tín | Một lần mỗi ngày Việt Nam theo luật đã có. |
| Kết hôn | Lời mời miễn phí, cần đồng ý; mỗi runner một người. Không tăng chỉ số hay phần thưởng. Có thể kết thúc từ hồ sơ người kia. |
| Báo cáo | Chọn loại và mô tả 5–500 ký tự. Tối đa 5 báo cáo/24 giờ, một báo cáo đang mở cho mỗi cặp; chỉ người gửi và admin thấy trạng thái. |
| Chặn | Chặn thư/quà/yêu cầu trực tiếp, ẩn chat và nội dung trích dẫn của runner; gỡ kết bạn/kết đôi, hoàn trả trao đổi giữa hai bên. Bỏ chặn không tự khôi phục quan hệ. |

**Liên hệ** trong menu hoặc cuối hồ sơ của mình có lời mời, trao đổi, bạn bè, người kết đôi, danh sách chặn và trạng thái báo cáo. Lời mời hết hạn sau bảy ngày. Báo cáo không tự xử phạt: admin phải xem xét và dùng thao tác quản trị riêng.

Quà và trao đổi giữ nguyên nâng cấp/module. Túi nhận đầy chuyển quà vào hộp thư bảy ngày theo luật hiện có; món hoàn trả do hủy/hết hạn trao đổi nằm trong hộp thư vĩnh viễn nếu túi đầy. Quà chỉ gửi được khi hai bên ở ngoài dungeon/giao tranh. **Cài đặt → Bảo mật → Tắt nhận quà** chặn quà thường và trang trí; trao đổi vẫn cần người nhận xác nhận.

Server kiểm tra quyền sở hữu, số lượng, quan hệ và số dư trong cùng giao dịch. Gửi lại cùng yêu cầu quà trong năm phút không trừ thêm; sửa nội dung với cùng mã bị từ chối. Chấp nhận trao đổi chỉ thực hiện một lần. Khi mất kết nối, nút thử lại giữ đúng nội dung đã xác nhận; quay lại để bắt đầu yêu cầu mới.

## Admin và nền tảng

**Quản trị → Báo cáo** tìm theo tên, mã hoặc nội dung; ưu tiên báo cáo đang chờ, 20 mục/trang. Đánh dấu đã xử lý/đóng cần lý do và mật khẩu admin, có audit. Có nút khóa/cấm chat riêng. Server giữ tối đa 2.000 báo cáo đang mở và 1.000 báo cáo đóng trong 90 ngày; không phải kho hồ sơ dài hạn.

Web và app Android/iOS dùng cùng server và giao dịch. Khách xem hồ sơ, biểu đồ của mình và thông tin được công khai; cần đăng nhập để kết bạn, tặng quà hoặc trao đổi. Chưa có server HTTPS vẫn chơi khách; xem [hướng dẫn nền tảng](platforms.md).
