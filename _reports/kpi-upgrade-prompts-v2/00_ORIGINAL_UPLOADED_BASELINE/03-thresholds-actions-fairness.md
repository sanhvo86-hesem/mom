# 03 — Ngưỡng định lượng + Action rule + Counter-metric + Khen thưởng

**Loại:** sửa registry + ANNEX-122/-129 + tài liệu. **Stage 2.**
**Tiên quyết:** prompt 02 xong (registry có schema đầy đủ).

## Mục tiêu
Biến mỗi KPI thành **tín hiệu ra quyết định công bằng**: ngưỡng định lượng sát
thực tiễn xưởng CNC, action rule rõ "đỏ thì ai làm gì", counter-metric chống
gaming, và quy tắc khen thưởng/cải tiến — KHÔNG để KPI thành công cụ đổ lỗi.

## Việc phải làm

### 1. Ngưỡng xanh–vàng–đỏ cho TỪNG KPI
Với mỗi KPI trong registry, đặt `thresholds.green/yellow/red` định lượng, có
căn cứ. Căn cứ ưu tiên: (a) benchmark trong ANNEX-127 §9 / ANNEX-129 §7,
(b) lịch sử thật từ `kpi_snapshots` nếu có, (c) yêu cầu hợp đồng khách hàng,
(d) chuẩn ngành CNC. Ghi căn cứ vào field `thresholds.basis`.
- Quy tắc: green = mức chấp nhận vận hành; yellow = cảnh báo, cần chú ý;
  red = phải hành động. KHÔNG đặt ngưỡng "đẹp không tưởng" gây gaming.
- KPI dạng aging (NCR_CLOSURE_AGING, ECO_CLOSURE_AGING, WIP_AGING…): ngưỡng
  theo SỐ NGÀY, đếm từ ngày MỞ (chống trò hoãn đóng cho số đẹp).
- KPI tỷ lệ (FPY, OTD…): kèm `min_sample` — dưới cỡ mẫu thì hiển thị
  "không đủ dữ liệu", không tô đỏ/xanh.

### 2. Action rule — "đỏ thì ai làm gì, hạn nào"
Mỗi KPI điền `decision_action` cụ thể, ví dụ:
- OTD đỏ → PD mở daily recovery review, lập kế hoạch phục hồi trong 24h.
- NCR_CLOSURE_AGING đỏ → QA leo thang CAPA, CEO review nếu quá L2.
- FAI_FIRST_PASS đỏ → ENG rà DFM/program trước lô kế.
Action rule phải trỏ về một CDR trong ANNEX-121 hoặc một bước SOP/WI cụ thể.
KPI không có action rule khả thi → hạ xuống `health_indicator`.

### 3. Counter-metric — chống gaming (bắt buộc cho KPI đánh giá/thưởng)
Với mọi KPI `reward_eligible: true`, gán `counter_metric` là một KPI bảo vệ
chiều ngược, để không thể "ăn gian" KPI này mà hại mặt khác:
- OTD ↔ counter: COMPLAINT_RATE / FINAL_RELEASE_RFT (giao nhanh nhưng lỗi).
- PUT_THRU / throughput ↔ counter: SCRAP_RATE / NCR_RATE (chạy nhiều nhưng hỏng).
- SETUP_RATIO (giảm thời gian setup) ↔ counter: FAI_FIRST_PASS (setup ẩu).
- COPQ giảm ↔ counter: RECORDABLE_INCIDENT_RATE (cắt chi phí kiểu mất an toàn).
KPI `reward_eligible: true` mà không tìm được counter-metric hợp lý →
`reward_eligible: false` (chỉ dùng theo dõi, không gắn thưởng).

### 4. Quy tắc khen thưởng / cải tiến / khắc phục
Cập nhật ANNEX-129 §7 (scoring) + ANNEX-127 §7 (performance governance) cho rõ:
- KPI **xanh bền vững** (≥3 kỳ) → ghi nhận đội nhóm, đưa vào management review.
- KPI **đỏ** → KHÔNG phạt cá nhân; mở CAPA / điều chỉnh nguồn lực / đào tạo /
  điều chỉnh Hoshin. Phân định: đỏ do hệ thống vs do tuân thủ.
- KPI gắn thưởng chỉ khi: owner kiểm soát được kết quả, có counter-metric, có
  bằng chứng trace. Cấm dùng KPI cho cá nhân khi kết quả phụ thuộc yếu tố ngoài
  tầm kiểm soát của họ.
- Attribution công bằng: nếu KPI đỏ do bộ phận khác (vd OTD đỏ do supplier),
  KPI phải tách `breakdown` theo nguyên nhân, không quy hết cho owner.

### 5. Đồng bộ tài liệu
Ngưỡng + action rule + counter-metric đổ vào ANNEX-122 (cột tương ứng), JD §9
của các vai trò owner, WI-202 (tier meeting). Regenerate ANNEX-128.

## Tự phản biện bắt buộc
- Ngưỡng nào "đẹp ảo" → người ta sẽ gaming kiểu gì? Counter-metric chặn được chưa?
- KPI nào owner không kiểm soát được mà vẫn `reward_eligible`? Sửa.
- Action rule nào không khả thi (không ai có thẩm quyền/nguồn lực)? Sửa.
- Có KPI nào, khi đỏ, sẽ khiến 2 bộ phận đổ lỗi nhau? Thêm rule attribution.

## Tình huống & cách xử lý
- Khách ép giao gấp, owner OTD ép xưởng bỏ bước kiểm → counter COMPLAINT_RATE/
  FINAL_RELEASE_RFT phải đồng thời lên scorecard cùng OTD, review chung.
- Cuối tháng dồn đóng NCR cho số đẹp → aging đếm từ ngày mở đã chặn; thêm
  finding nếu phát hiện cụm đóng bất thường.
- Lô prototype 1–2 chi tiết kéo FPY xuống → `min_sample` ẩn KPI khỏi đánh giá.
- Máy hỏng ngoài tầm WKM → OEE breakdown tách "downtime đột xuất" để không quy
  trách nhiệm sai.

## Definition of Done
- Mọi KPI có `thresholds` định lượng + `basis`; KPI tỷ lệ có `min_sample`.
- Mọi KPI có `decision_action` khả thi trỏ CDR/SOP.
- Mọi KPI `reward_eligible:true` có `counter_metric`.
- ANNEX-129 §7 + ANNEX-127 §7 nêu rõ quy tắc thưởng/cải tiến/khắc phục công bằng.
- 3 audit script PASS; commit cặp; deploy xanh; verify Chrome.
