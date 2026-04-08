# Overwrite package — Schema Studio Round 13 Lite Fix

Package root: `qms.hesem.com.vn/`

## Gói này sửa gì

- thêm nút `Tùy chọn` trên toolbar của Schema Studio
- cho phép ẩn/hiện chi tiết object trên canvas theo 3 mức: `Tối giản`, `Chuẩn`, `Đầy đủ`
- cho phép ẩn/hiện label quan hệ theo 3 mức: `Tắt`, `Theo chọn`, `Tất cả`
- khóa selector chỉ còn `HESEM System Registry [Hệ thống]`
- ẩn các schema khác khỏi UI hiện tại
- chặn `Load from DB` và `Create new schema` trong flow hiện tại để tránh phát sinh thêm selector không dùng
- chuyển `Lưu` của system registry sang local draft để không đẻ thêm schema phụ trong selector

## Cách overwrite

1. Giải nén package.
2. Ghi đè vào đúng root `qms.hesem.com.vn/` trên môi trường của bạn.
3. Hard refresh trình duyệt.
4. Mở lại `Schema Studio`.
5. Bấm `Tùy chọn` để chọn mức hiển thị phù hợp.

## File có trong gói

- `01-QMS-Portal/scripts/portal/32-schema-studio.js`
- `01-QMS-Portal/docs/schema-studio-round13-lite-fix.md`
- `01-QMS-Portal/qms-data/registry/schema-studio-round13-lite-report.json`
