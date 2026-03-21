# HESEM QMS — Server Delivery Rollout Baseline V0

## Mục tiêu
Khóa đúng hành vi **download-only** cho toàn bộ thư viện FRM workbook trong môi trường thật.

## Checklist bắt buộc
1. MIME type đúng cho `.xlsx`, `.xlsm`, `.xls`.
2. Response header trả workbook là `Content-Disposition: attachment`.
3. Có `X-Content-Type-Options: nosniff`.
4. Reverse proxy hoặc CDN không được strip header attachment.
5. Không có rewrite nào chuyển workbook sang inline preview.
6. Portal và link HTML nội bộ tải cùng đúng file workbook active.
7. Không có đường dẫn operational nào quay lại FRM HTML cũ.

## Evidence tối thiểu
- 01 capture header response cho `.xlsx`.
- 01 click test từ portal.
- 01 click test từ SOP/WI/Manual.
- 01 xác nhận file tải về mở bằng desktop Excel.
