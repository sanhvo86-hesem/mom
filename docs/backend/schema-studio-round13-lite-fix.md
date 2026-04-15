# Schema Studio Round 13 Lite Fix

Mục tiêu của bản vá này:

- loại bỏ tình trạng canvas bị nặng do card bảng quá cao và label liên kết phủ kín màn hình
- khóa studio vào `HESEM System Registry` để bỏ danh sách schema khác khỏi selector hiện tại
- thêm nút `Tùy chọn` trên toolbar để điều khiển mức chi tiết của đối tượng và nhãn liên kết

## Thay đổi chính

1. `Schema selector` chỉ còn `HESEM System Registry [Hệ thống]`.
2. Tắt `Create new schema` và `Load from DB` ở selector/runtime điều hướng.
3. Thêm `Tùy chọn` với 2 nhóm:
   - `Mức chi tiết đối tượng trên canvas`: `Tối giản`, `Chuẩn`, `Đầy đủ`
   - `Nhãn liên kết`: `Tắt`, `Theo chọn`, `Tất cả`
4. `Tối giản` làm table card chỉ còn tên bảng + số cột.
5. `Chuẩn` chỉ hiện tối đa 8 cột đầu, ẩn type/badge phụ.
6. `Theo chọn` chỉ hiện label của relation đang chọn hoặc relation gắn với bảng đang chọn.
7. Nút `Lưu` trong chế độ system registry lưu vào local draft thay vì tạo schema selector mới.

## Lưu ý vận hành

- Bản vá này **ẩn các schema khác khỏi giao diện**; không xóa vật lý dữ liệu cũ trên server.
- Local draft của `HESEM System Registry` được lưu bằng khóa local storage riêng của schema system.
- Nếu cần quay lại chế độ đầy đủ, chuyển `Tùy chọn > Mức chi tiết đối tượng > Đầy đủ`.
