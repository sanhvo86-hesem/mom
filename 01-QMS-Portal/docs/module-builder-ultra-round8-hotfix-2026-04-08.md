# Module Builder Ultra — Round 8 Hotfix

Date: 2026-04-08
Target root: `qms.hesem.com.vn/`

## Mục tiêu

Hotfix này vá đúng lỗi runtime/UI phát sinh sau khi deploy bản cumulative round 7:

- thanh công cụ thật của builder bị mất do core builder bị bọc trong `mb-r5-shell` rồi bị round 6 gán `display:none!important`
- panel round 7 bị render ra ngoài shell, dùng palette sáng trên nền trắng nên gây chói/nhạt/khó đọc
- nhiều deck cũ (round 3/4/5/6) chồng tầng lên nhau làm trải nghiệm builder rối và nặng

## Thay đổi kỹ thuật

### `01-QMS-Portal/scripts/portal/31-module-builder.js`

Bổ sung patch **Round 8 Hotfix**:

- restore `mb-r5-shell` về trạng thái hiển thị
- remove `mb-r6-shell`, `mb-r5-deck`, `mb-r4-deck`, `mb-r3-superdock`, `mb-ultra-dock`
- move `mb-r7-panel-grid` vào trong `mb-r7-shell` để shell/panel dùng chung visual container
- thêm compact styling `mb-r8-shell` / `mb-r8-panel-grid`
- ép toolbar chính của builder hiển thị lại và sticky ở đầu khu vực làm việc

## Kết quả kỳ vọng sau khi overwrite

- tạo module mới sẽ thấy lại toolbar thật của builder
- edit module cũ vẫn có toolbar thật
- không còn block `ROUND 6 · EXPERIENCE OS` chen vào trên builder
- visual round 7 vẫn còn nhưng gọn hơn, dễ đọc hơn và không làm chói nội dung

## Ghi chú triển khai

Gói này là **cumulative overwrite**. Có thể copy đè trực tiếp lên hệ thống hiện tại để đồng thời giữ toàn bộ thay đổi từ các vòng trước và bổ sung hotfix round 8.
