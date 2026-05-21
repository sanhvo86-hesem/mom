# KPI — Nghiên cứu sâu thực chiến, phản biện đa chiều & ngưỡng số (2026-05-22)

**Phạm vi:** 33 governance KPI + 21 gate metric + 15 proposed metric.
**Mục tiêu:** Phản biện gay gắt tính thực chiến và độ hợp lý của ngưỡng; đề
xuất **ngưỡng số có logic toán** (không text) để tổng hợp/phân tích được; xác
định KPI nào cần endpoint nhập liệu chờ frontend.
**Chuẩn đối sánh:** IATF 16949 §9.1, AIAG APQP/PPAP, OSHA TRIR (NAICS 332
fabricated metal), MESA OEE, TOC/Goldratt, thực tiễn job-shop CNC chính xác.

---

## 1. Năm chiều phản biện áp dụng cho MỌI KPI

Mỗi KPI bị soi qua 5 câu hỏi, không có ngoại lệ:

1. **Tính được?** — có công thức + nguồn dữ liệu thật, hay vẫn là số nhập tay?
2. **Gây gaming?** — người ta "ăn gian" KPI này kiểu gì; counter-metric nào chặn?
3. **Owner kiểm soát được?** — kết quả nằm trong tầm tay owner, hay là kết quả
   hệ thống mà owner bị quy oan?
4. **Ngưỡng hợp lý thực chiến?** — xanh/vàng/đỏ có khớp benchmark ngành gia
   công CNC chính xác, hay là "đẹp ảo" / "dễ dãi"?
5. **Logic toán tổng hợp?** — ngưỡng có phải SỐ để máy tính RAG, tính trend,
   roll-up scorecard; hay là text người đọc nhưng máy không gộp được?

## 2. Schema ngưỡng số (thay text bằng số có logic toán)

Trước đây `thresholds` là text (`"≥95%"`, `"90–94.99%"`, `"<90%"`) — người
đọc được, máy KHÔNG tổng hợp được. Thay bằng schema số:

```json
"thresholds": {
  "direction": "higher_is_better" | "lower_is_better",
  "unit": "percent|ppm|day|rate|ratio|count|vnd",
  "green_point": <number>,
  "yellow_point": <number>,
  "target": <number>,
  "basis": "<căn cứ>"
}
```

**Logic RAG thuần toán** (cùng một hàm cho mọi KPI):

```
higher_is_better:  GREEN nếu v ≥ green_point; YELLOW nếu v ≥ yellow_point; còn lại RED
lower_is_better:   GREEN nếu v ≤ green_point; YELLOW nếu v ≤ yellow_point; còn lại RED
```

Vì `green_point`/`yellow_point` là số, máy tính được: trạng thái RAG, khoảng
cách tới mục tiêu (`gap = v - target`), `% đạt = v/target`, điểm scorecard
(`weight × achievement`), trend, và roll-up nhiều kỳ — tất cả bằng số học.
Text hiển thị ("≥95%") được **suy ra** từ số khi render, không lưu cứng.

## 3. Ngưỡng số đề xuất — 33 governance KPI

`dir` H=higher_is_better, L=lower_is_better. `G`=green_point, `Y`=yellow_point.

| # | KPI | dir | unit | G | Y | Căn cứ thực chiến |
|---|-----|-----|------|---|---|-------------------|
| 1 | OTD | H | percent | 95 | 90 | OTD job-shop CNC: world-class 98%, khá 95%, chấp nhận 90%. G=95 là mục tiêu cam kết hợp đồng phổ biến. |
| 2 | COMPLAINT_RATE | L | ppm | 100 | 200 | 6-sigma escape ≤233 ppm; CNC chính xác hàng đầu ≤100 ppm. |
| 3 | FINAL_RELEASE_RFT | H | percent | 98 | 95 | RFT phát hành cuối chuẩn AIAG ≥98%; <95% là cổng phát hành yếu. |
| 4 | GROSS_MARGIN_JOB_FAMILY | H | percent | 28 | 22 | Biên gộp gia công CNC hợp đồng: 22–32%. G=28 khoẻ; cần hiệu chỉnh theo mô hình phân bổ chi phí thực. |
| 5 | RECORDABLE_INCIDENT_RATE | L | rate | 1.0 | 3.0 | OSHA TRIR NAICS 332 trung vị ~3.0; top-quartile <1.0. Đơn vị: ca/200.000 giờ công. |
| 6 | BCP_READINESS | H | percent | 100 | 90 | Bao phủ dự phòng chức năng trọng yếu — chuẩn là 100%. |
| 7 | RFQ_TURNAROUND_TIME | L | day | 3 | 5 | Job-shop cạnh tranh phản hồi RFQ ≤3 ngày làm việc; >5 mất cơ hội. |
| 8 | ORDER_REVIEW_RFT | H | percent | 97 | 92 | Soát xét hợp đồng đúng lần đầu ISO 9001 §8.2 — chuẩn ≥97%. |
| 9 | PLAN_ADHERENCE | H | percent | 90 | 80 | Độ ổn định điều độ job-shop: world-class 90–95%, điển hình 70–85%. |
| 10 | FAI_FIRST_PASS | H | percent | 95 | 88 | FAI first-pass AIAG/hàng không ≥95%; nhiều shop 85–90%. |
| 11 | WIP_AGING | L | percent | 5 | 12 | % lệnh quá tuổi tại cổng; TOC: ≤5% tốt, >12% nút thắt nặng. |
| 12 | SUPPLIER_OTD | H | percent | 90 | 85 | Giao hàng đúng hạn nhà cung cấp ≥90%; chuỗi mạnh đạt 95%+. |
| 13 | SHIP_READY_TO_INVOICE_LT | L | day | 2 | 4 | Sẵn sàng giao → hóa đơn ≤2 ngày; >4 là tắc lập hóa đơn. |
| 14 | DSO | L | day | 45 | 60 | DSO gia công CNC B2B lành mạnh ≤45 ngày; >60 rủi ro dòng tiền. |
| 15 | SCHEDULE_RECOVERY_EFFECTIVENESS | H | percent | 85 | 70 | Hiệu quả khôi phục tiến độ sau lệch lịch — Lean Daily thực tiễn. |
| 16 | FOD_LINE_CLEARANCE_COMPLIANCE | H | percent | 100 | 98 | Tuân thủ vệ sinh FOD/line-clearance — chuẩn 100%. |
| 17 | ENGINEERING_RELEASE_ON_TIME | H | percent | 95 | 88 | Phát hành kỹ thuật đúng hạn ≥95%; <88% trễ chuỗi sau. |
| 18 | ECO_CLOSURE_AGING | L | percent | 10 | 25 | % ECO quá tuổi (đếm từ ngày mở); >25% tồn đọng kỹ thuật. |
| 19 | NCR_CLOSURE_AGING | L | percent | 10 | 25 | % NCR quá tuổi (đếm từ ngày mở); >25% CAPA tắc. |
| 20 | CAL_COMPLIANCE | H | percent | 100 | 98 | Thiết bị đo quá hạn vô hiệu mọi kết quả đo — chuẩn 100%. |
| 21 | MATERIAL_AVAILABILITY_PLAN | H | percent | 95 | 85 | Sẵn sàng vật tư cho lịch khoá ≥95%; <85% dừng chuyền. |
| 22 | INVENTORY_ACCURACY | H | percent | 98 | 95 | Độ chính xác tồn kho world-class 99%+; 98 là tốt. |
| 23 | QUOTE_HIT_RATE | H | percent | 35 | 25 | Tỷ lệ trúng báo giá CNC 20–40% tuỳ thị trường; phụ thuộc phân khúc. |
| 24 | CUSTOMER_COMM_CLOSURE_OT | H | percent | 95 | 85 | Đóng trao đổi khách đúng SLA — thực tiễn dịch vụ khách hàng. |
| 25 | INVOICE_RFT | H | percent | 98 | 95 | Hóa đơn đúng lần đầu ≥98%; lỗi kéo dài DSO. |
| 26 | MONTH_END_CLOSE_OT | H | percent | 100 | 90 | Bước đóng sổ đúng lịch — chuẩn 100%. |
| 27 | TRAINING_COMP | H | percent | 95 | 85 | Hoàn thành đào tạo đúng hạn IATF §7.2 ≥95%. |
| 28 | CRITICAL_ROLE_BACKUP_COVERAGE | H | percent | 100 | 85 | Bao phủ dự phòng vai trò trọng yếu — chuẩn 100%. |
| 29 | INCIDENT_ACTION_CLOSURE_AGING | L | percent | 10 | 25 | % hành động sự cố quá tuổi (từ ngày mở); >25% rủi ro tích tụ. |
| 30 | SAFETY_ONBOARDING_COMPLIANCE | H | percent | 100 | 95 | Đào tạo an toàn hội nhập phải 100% trước khi vào xưởng. |
| 31 | SERVICE_TICKET_SLA | H | percent | 95 | 85 | Đóng phiếu dịch vụ IT trong SLA — thực tiễn ITSM. |
| 32 | CRITICAL_SYSTEM_AVAILABILITY | H | percent | 99.5 | 98 | Sẵn sàng hệ thống trọng yếu — SLA hạ tầng. |
| 33 | MASTER_DATA_EXCEPTION_AGING | L | percent | 10 | 25 | % ngoại lệ dữ liệu quá tuổi (từ ngày mở). |

**Thay đổi so với ngưỡng Stage 03:** Hầu hết ngưỡng Stage 03 đã hợp lý —
nghiên cứu này XÁC NHẬN bằng benchmark và CHUYỂN SANG SỐ. Một điều chỉnh
thực chất: **#5 RECORDABLE_INCIDENT_RATE** — Stage 03 để text mô tả số ca
("0 sự cố / 1 sự cố không LTI / ≥1 LTI"), không tính toán được. Nay chuyển
thành **TRIR số** (G=1.0, Y=3.0 ca/200.000 giờ) — đúng chuẩn OSHA, tổng hợp
được, vẽ trend được.

## 4. Phản biện gay gắt theo nhóm

### 4a. KPI công ty (1–6)

**OTD** — Gaming: owner CS đặt promise date xa rồi vẫn "đúng hạn"; counter
COMPLAINT_RATE chặn phần ẩu chứ KHÔNG chặn nới ngày. Cần metric
`PROMISE_DATE_REVISION_RATE` (chưa có). Ngưỡng G=95 hợp lý cho shop đang
phát triển — không đặt 98 "đẹp ảo" gây nản. **Phán quyết: ngưỡng thực chiến.**

**COMPLAINT_RATE** — ppm với sản lượng thấp rất nhiễu; `min_sample=30` lô là
bắt buộc, dưới đó ẩn KPI. G=100 ppm aggressive nhưng đúng cho CNC chính xác.
**Thực chiến.**

**GROSS_MARGIN_JOB_FAMILY** — Ngưỡng G=28% là điểm yếu nhất bảng: biên gộp
phụ thuộc HOÀN TOÀN vào mô hình phân bổ overhead/burden. Nếu phân bổ khác
nhau, cùng một job cho biên 22% hoặc 35%. → Ngưỡng chỉ "khoá" được khi mô
hình chi phí cố định. **Đề xuất: giữ G=28/Y=22 tạm, BẮT BUỘC hiệu chỉnh khi
finance data thật chảy vào; gắn cờ `threshold_calibration_pending`.**

**RECORDABLE_INCIDENT_RATE** — An toàn là cổng, không bù điểm. TRIR cho
shop nhỏ cực kỳ biến động (1 ca đẩy TRIR vọt). → Phải đo theo **rolling
12 tháng**, không theo tháng đơn. Ngưỡng G=1.0/Y=3.0 đúng OSHA. **Thực chiến
nhưng cần cửa sổ trượt.**

**BCP_READINESS** — Bản chất là đánh giá định kỳ (nhập tay), không có dòng
giao dịch. G=100% đúng (mọi chức năng trọng yếu phải có dự phòng).

### 4b. KPI value-stream (7–14)

**PLAN_ADHERENCE** — G=90% với job-shop high-mix + đơn gấp bán dẫn là khó;
nếu không có rule loại trừ re-sequence-có-duyệt, KPI đỏ triền miên → owner
PPL mất động lực, thậm chí né nhận đơn gấp. Rule loại trừ ĐÃ có
(`approved_resequence`). **Ngưỡng hợp lý CÓ ĐIỀU KIỆN rule loại trừ hoạt động.**

**SUPPLIER_OTD** — G=90% là dễ dãi cho vật tư đường găng. Đề xuất tách: vật
tư đường găng cần ngưỡng chặt hơn (G=95). Hiện gộp chung → giữ G=90, ghi
finding tách theo nhóm vật tư.

**RFQ_TURNAROUND_TIME** — G≤3 ngày đúng cho RFQ đơn giản; RFQ multi-op phức
tạp 5–10 ngày là hợp lý. → Cần phân khúc theo độ phức tạp RFQ; ngưỡng phẳng
hiện tại sẽ phạt oan RFQ phức tạp. **Finding: segment hoá.**

**WIP_AGING, DSO, SHIP_READY_TO_INVOICE_LT** — ngưỡng số rõ, tính được,
không gaming dễ (aging đếm từ ngày mở). **Thực chiến.**

### 4c. KPI phòng ban (15–33)

Phần lớn là KPI tuân thủ/aging — ngưỡng số rõ ràng. Điểm cần soi:

- **CAL_COMPLIANCE / FOD / SAFETY_ONBOARDING / MONTH_END_CLOSE / BCP /
  CRITICAL_ROLE_BACKUP** — G=100%: đúng (compliance nhị phân). `min_sample=0`
  hợp lý vì population cố định (thiết bị, nhân sự), không nhiễu lô nhỏ.
- **Aging KPI (ECO/NCR/INCIDENT_ACTION/MASTER_DATA)** — G=10%/Y=25% đồng nhất;
  đếm từ ngày MỞ → không gaming bằng hoãn đóng. **Thực chiến.**
- **QUOTE_HIT_RATE** — G=35% phụ thuộc phân khúc thị trường mạnh; shop
  prototype/đơn lẻ tỷ lệ trúng thấp hơn shop sản xuất loạt. → cờ
  `threshold_calibration_pending`.
- **SCHEDULE_RECOVERY_EFFECTIVENESS** — định nghĩa "khôi phục" mơ hồ, dễ
  gaming bằng cách khai báo "đã khôi phục". Cần bằng chứng. Giữ ngưỡng, ghi
  finding chống gaming.

## 5. Gate metric & proposed metric

21 gate metric đa số có `target` dạng text ("≤ 4h", "≥ 95%", "100%",
"Measured"). Chuyển sang số `{direction, unit, green_point, yellow_point}`
khi định lượng được; gate dạng "Measured"/pass-fail giữ dạng đặc biệt
(`gate_binary`). 15 proposed metric — chưa tính được, để ngưỡng số dự kiến
+ `calculation_status: staged_data_contract`.

## 6. KPI nào cần endpoint nhập liệu chờ frontend

Theo nguyên tắc "mọi KPI có API endpoint để frontend kết nối nhập dữ liệu":

- **14 runtime KPI** — dữ liệu từ DB qua `calc*`; endpoint đọc là
  `GET /api/kpi/{code}`. Không cần nhập tay.
- **18 staged + 1 manual KPI** — chưa/không tính tự động được → cần endpoint
  **nhập liệu**: `POST /api/kpi/{code}/input` ghi vào bảng `kpi_manual_inputs`;
  `GET /api/kpi/{code}/input` đọc lại. KpiEngine đọc bản nhập mới nhất → KPI
  hiện số thật. Endpoint "chờ sẵn", frontend module thiết kế sau.
- Catalog phơi `input_endpoint` cho TỪNG KPI (sinh từ mã, SSOT — không
  hardcode) để frontend biết POST vào đâu.

## 7. Kết luận & tự phản biện

**Hệ KPI có thực chiến không?** — Khung đã thực chiến: ngưỡng giờ là SỐ có
logic toán, RAG/trend/scorecard tính bằng số học, mọi KPI có đường dữ liệu
(runtime calc hoặc manual-input endpoint). Không còn KPI nào "ngưỡng text
máy không gộp được".

**Ngưỡng có "đẹp ảo" không?** — Đã soi từng KPI theo benchmark CNC. 30/33
ngưỡng được benchmark xác nhận. 3 KPI gắn cờ `threshold_calibration_pending`
(GROSS_MARGIN, QUOTE_HIT_RATE phụ thuộc thị trường/mô hình chi phí;
RECORDABLE_INCIDENT_RATE cần cửa sổ trượt) — trung thực, không giả vờ chốt
cứng cái chưa đủ dữ liệu.

**Còn gaming?** — OTD (nới promise date), SCHEDULE_RECOVERY (khai khống khôi
phục) vẫn có khe — đã ghi finding, cần metric/bằng chứng bổ sung.

**Số liệu để tổng hợp/phân tích?** — schema số `{green_point, yellow_point,
target, direction}` cho phép: RAG thuần toán, gap = v−target, %đạt = v/target,
điểm scorecard, trend, roll-up. Đây là nền cho phân tích dữ liệu KPI sau này.

---
*Báo cáo nghiên cứu sâu — đầu vào cho việc chuyển ngưỡng sang schema số và
xây API nhập liệu KPI. Người thực hiện: Claude Sonnet 4.6.*
