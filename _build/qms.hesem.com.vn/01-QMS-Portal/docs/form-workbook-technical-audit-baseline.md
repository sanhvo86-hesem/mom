# HESEM QMS — Workbook Technical Audit Baseline V0

## Kết luận nhanh
- Audit ID: **HESEM-FRM-TECH-AUDIT-V0-2026-03-21**
- Workbook active audited: **111**
- Files OK: **111/111**
- Macro / VBA detected: **0**
- External links detected: **0**
- Files with data validation: **111**
- Files with formulas: **95**
- Files with comments: **22**
- Files with workbook protection flag: **70**
- Files with hidden sheets: **74**
- Files with veryHidden sheets: **37**
- Size range: **36.7 KB → 106.8 KB**
- Median size: **61.3 KB**

## Phạm vi scan
- Mở từng workbook dưới dạng gói ZIP OOXML.
- Scan `vbaProject.bin`, `externalLinks`, `pivot`, `charts`, `comments`.
- Đọc `workbook.xml` để kiểm sheet visibility, defined names và workbook protection.
- Đọc từng worksheet XML để đếm data validations và công thức.

## Nhận định
- Baseline V0 hiện **sạch macro/VBA** và **sạch external links**.
- Toàn bộ workbook active đều có **data validation**, phù hợp với định hướng dùng workbook như controlled form thay cho HTML.
- Một tỷ lệ lớn workbook có **hidden / veryHidden sheets** hoặc **workbook protection**, cho thấy pack source đã được thiết kế có lớp điều khiển tốt thay vì chỉ là bảng trống.

## Top files theo kích thước
- Largest: **FRM-311**
- Smallest: **FRM-406**

## Bước kế tiếp
- Dùng kết quả này làm baseline cho quarterly spot-check và on-change release.
- Khi có workbook mới hoặc thay đổi workbook, phải chạy lại scan kỹ thuật cùng checksum update.
