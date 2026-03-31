# WI/ANNEX Content Regression Audit — 2026-03-31

- Baseline so sánh toàn kho: `f9f3e288`
- Anchor phục hồi nội dung ANNEX-802: `ccb38939:02-Tai-Lieu-He-Thong/03-Organization/05-Labor-Relations/annex-hr-lab-001-collective-bargaining-agreement.html`

## Kết quả tổng

- Tài liệu audit: `97`
- Match phần thân so với baseline: `96`
- Expanded/phục hồi so với baseline: `1`
- Shrunk so với baseline: `0`
- Changed nhẹ so với baseline: `0`
- Corruption signal còn tồn tại ở bản hiện tại: `0`

## Kết luận

- Không phát hiện suy yếu nội dung hàng loạt sau đợt cập nhật header/SSOT.
- Case mất nội dung thật được xác nhận là `ANNEX-802`; file hiện đã được phục hồi đầy đủ từ nguồn sạch lịch sử.
- Nếu một tài liệu bị flag `SHRUNK` hoặc có corruption signal, đó là mục cần đọc sâu bằng tay; nếu report sạch thì có thể coi là không có thất thoát nội dung do batch update gần đây.

## ANNEX-802 Anchor Check

- Current status vs baseline chung: `EXPANDED`
- Current status vs anchor sạch: `MATCH`
- Marker completeness: `COMPLETE`
- Ghi chú: Anchor markers found=5/5, current delta vs anchor=0
