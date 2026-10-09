# Đối chiếu CyberCode Online

Đối chiếu ngày 09/10/2026 với repository [DexterHuang/CyberCodeOnline](https://github.com/DexterHuang/CyberCodeOnline/tree/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf), commit `473ed6f`. Đây là tài liệu về những gì quan sát được trong repository, không khẳng định mọi hướng dẫn đều còn đúng trên dịch vụ đang chạy. Repository công khai chứa hướng dẫn, bản dịch, nội dung cộng đồng, hình ảnh và công cụ kiểm tra dữ liệu; không chứa toàn bộ backend/client để chạy lại game.

[LICENSE.md](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/LICENSE.md) không cho dùng tài nguyên của repository trong dự án khác. CYPER viết lại cơ chế bằng mã riêng, với tên, văn bản và SVG riêng. Không nhập hình, bố cục dungeon, bản dịch hay truyện từ repository đó.

## Cơ chế đã có trong CYPER v0.10

| Hạng mục / hướng dẫn tham chiếu | CYPER hiện có | Khác biệt đáng chú ý |
| --- | --- | --- |
| [Equipment](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/equipment.md) | Vũ khí chính, đặc biệt, hủy diệt; mũ, giáp thân, giáp chân, giày; thêm cấy ghép và ba lô. 530 mẫu trang bị cấp 1–50. | Giữ các món và bản lưu cũ. Chỉ số và độ hiếm riêng; chưa có đồ độc lập nhiều bản sao cùng mẫu hoặc cache in ngẫu nhiên các affix. |
| [Combat](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/combat.md) | Khiên riêng với HP; đạn tiêu hao cho hai vũ khí phụ; hiệu suất 120%/50% khi đánh khiên; choáng, tái sinh, biến thể địch. | Giữ xung điện và thuốc mua nhanh của CYPER. Thua mất 10% credits và hồi 50% HP; chưa có flatline timer/phạt XP như tài liệu. |
| [Equipment mark](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/enemy-gangs-and-equipment-mark.md) | Ba dấu, đa số bộ trang bị, lợi thế +10% và điểm yếu +10% theo phe địch. | Tên phe riêng; dấu xác định theo mẫu đồ, chưa quay ngẫu nhiên từng món. |
| [Inventory](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/inventory.md) | Túi, stack, khe nhanh, lọc từng loại, 54 bản vẽ, chế tạo thuốc/đạn/vật liệu, hộp thư có hạn, loadout, ba lô/pocket, tháo module và tái chế. | Túi cơ bản 60 ô; tháo ba lô không xóa đồ vượt ô. Module rời xếp chồng theo loại, chưa có level/rarity riêng. Tái chế hoàn module khi đủ chỗ, khác với việc hủy module của bản tham chiếu. |
| [Dungeon](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/dungeon.md) | Ba độ khó; ASCII ba tầng; phòng phối hợp bốn tài khoản, mật khẩu, HP địch chung, rương riêng, thưởng địch theo đóng góp ≥20%, đồng đội trên bản đồ. Lưu qua restart. | Mỗi tầng có bố cục riêng; chưa có mạng các phòng nối bằng cửa. Giới hạn thưởng khi cao hơn địch quá 12 cấp; chưa có vật phẩm hồi máu AOE và minigame giải mã. Dungeon solo vẫn có sẵn cho khách. |
| [Quests](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/quests.md) | 110 hợp đồng, hai hướng dẫn tiến trình, ba hợp đồng ngày; NPC `?` đổi linh kiện lấy buff 10 phút; hồ sơ ký ức `!`. | Buff cùng loại thay thời hạn, không cộng nhiều cấp buff. Hồ sơ ký ức là văn bản riêng của CYPER. |
| [Locations/Keys](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/keys.md) | Trung tâm, khu thương mại, chợ, bờ biển, năm ga/tuyến cấp 1–50, khóa ghép từ ba dungeon khác nhau. | Thế giới riêng; chưa mở các địa điểm cuối game cấp 100–500. |
| [Calibration](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/calibration.md) | Nâng cấp bảo đảm hoặc trạm có xác suất; tùy chọn tăng thành công/ngăn phá hủy. | Tối đa +5, dùng credits/Unit; chưa có core chờ 30 phút, +10, buff toàn server và reset shard. |
| Chợ, shop, hồ sơ, chat | NPC shop/chợ đen; chợ người chơi với escrow; bảng xếp hạng thật; profile, skin, huy hiệu, thư riêng, chat tập đoàn, uy tín. | Chợ người chơi chỉ giao dịch trang bị; chưa giao dịch stack nguyên liệu. PvP là bản sao phòng thủ bất đồng bộ. |
| AFK và cộng đồng | Năm công việc có đồng hồ server, ba nghề chế tạo + nghề in; quỹ thực và giảm shop; điểm danh, đổi token. | Chưa có hàng đợi Global Skip, hệ thống quỹ hiệu chuẩn hoặc nghề khai thác riêng. |

## Phần chưa triển khai

Các hướng dẫn còn lại chỉ ra những hệ thống lớn cần thiết kế thêm, không thể coi là đã có vì chỉ xuất hiện nút hoặc dữ liệu mẫu:

- [Gangs](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/gangs.md): cấp tập đoàn, tài nguyên chung, duy trì hằng tuần, kiểm soát khu vực, nhiệm vụ tập đoàn và phân quyền quản lý. CYPER hiện có thành viên, trưởng nhóm, chat và dungeon cùng tập đoàn.
- [Pets](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/pets.md): nhận nuôi, thức ăn, vệ sinh, hạnh phúc, sức khỏe và hồi sinh. Ba thú cưng CYPER hiện là trang trí.
- [Furniture](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/furniture.md): căn hộ nhiều hạng, nội thất, nghề thu vật liệu cấp 300+, kích hoạt bằng đạn. CYPER hiện chỉ có nhà/kho/nghỉ và kệ trưng bày.
- [Handlers](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/handlers.md): quan hệ hướng dẫn người mới và kiểm tra điều kiện thưởng. Chưa có hệ thống này hoặc chống tài khoản phụ.
- [Reclamation depot](https://github.com/DexterHuang/CyberCodeOnline/blob/473ed6f1ce96cccf077fa0729a29a9f1320cc6cf/contribution/mobile/en/tutorial/reclamation-depot.md), community raffle, giới thiệu, kết hôn, gửi quà, dịch chat và quản trị/báo cáo.

Backend hiện vẫn là một tiến trình Node và file JSON. Chơi phối hợp đã thực hiện thật trên server, nhưng để vận hành MMO lớn cần database giao dịch, quản lý phiên bền vững, chống spam, giám sát và nhiều nội dung viết riêng. Bản đối chiếu này không tuyên bố CYPER giống CyberCode Online 100%.

## Kiểm chứng

`npm test` bao gồm kiểm tra bảo toàn bản lưu cũ, tài nguyên/đạn, overflow khiên, module/tái chế, mốc ngày Việt Nam, buff/token và dungeon phối hợp. Kiểm thử API tạo nhiều tài khoản trong thư mục dữ liệu tạm, gửi đòn đánh đồng thời, kiểm tra thưởng một lần, restart giữa trận, mật khẩu phòng và việc giữ bí mật backend. Kiểm tra trình duyệt riêng dùng Chromium ở 360/390/1366 px và hai phiên người chơi; không sửa dữ liệu tài khoản thật.
