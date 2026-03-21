# Portal Scan Sanitization Register — Phase 2E

## Mục tiêu
Cô lập file placeholder, redirect legacy và stray draft khỏi portal search/navigation mà không xóa bằng chứng lịch sử khỏi repository.

## Đối tượng đang bị loại khỏi scan
- `ref-*.html` — redirect legacy đã được thay bằng ANNEX active
- `proc-0024-hai-ba-bon.html` — placeholder training page
- `sdfsdf-sdfsdf.html` — stray test/draft WI page

## Nguyên tắc
- **Active-over-legacy:** người dùng portal chỉ thấy tài liệu active có giá trị vận hành.
- **Historical-but-not-discoverable:** file lịch sử vẫn tồn tại trong repo nếu cần đối chiếu, nhưng không được chen vào search/navigation hiện hành.
- **No silent deletion:** nếu cần xóa hẳn, phải làm bằng quyết định riêng có inventory và backup.
