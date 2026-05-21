# 05 — Gắn Gate Control Metric §9 với cổng G0→G7 và CDR

**Loại:** sửa ANNEX-122 §9 + registry + ANNEX-121 (chỉ thêm cột tham chiếu).
**Stage 4.**
**Tiên quyết:** prompt 02–04 xong.

## Bối cảnh
ANNEX-122 §9 "Gate Control Metrics" có ~18 metric KPI-G0-01…KPI-G7-xx, mỗi
metric gắn 1 cổng G0–G7 (vd KPI-G0-01 RFQ Turnaround ≤4h, KPI-G1-01 Engineering
First-Time-Right ≥95%). Đợt RACI vừa nâng cấp ma trận cổng G0→G7 trong ANNEX-121
(46→50 CDR, thêm B8 Control Plan, D10 IQC, D11 escape, D12 FAI/PPAP…). Gate
metric và CDR hiện CHƯA liên kết — đây là khe hở: cổng có quyết định (CDR) nhưng
không rõ metric nào đo cổng đó pass hay không.

## Mục tiêu
Mỗi cổng G0→G7 phải có metric đo **điều kiện pass cổng**, và mỗi gate metric
phải trỏ về CDR mà nó đo. Đây là cách KPI "đảm bảo các gate hệ thống đã đề ra".

## Việc phải làm

### 1. Đọc mô hình cổng hiện tại
- `ANNEX-121` §5 ma trận cổng (50 CDR, các mã A1–A7, B1–B8, C1–C7, D1–D12,
  E1–E7, F1–F6). `ANNEX-120` §3 sổ đăng ký CDR (ngưỡng L1/L2/L3).
- ANNEX-122 §9 bảng gate metric hiện tại.

### 2. Đối soát cổng ↔ metric
Lập bảng: mỗi cổng G0–G7 → các CDR thuộc cổng đó → gate metric đang đo. Tìm:
- Cổng/CDR nào **không có** gate metric đo điều kiện pass? (vd CDR mới B8 Control
  Plan, D10 IQC — có metric đo first-pass của chúng chưa?)
- Gate metric nào **mồ côi** (không trỏ CDR nào)?

### 3. Thêm cột liên kết
- ANNEX-122 §9 bảng gate metric: thêm cột **"CDR liên quan"** (mã CDR trong
  ANNEX-121) và cột **"Điều kiện pass cổng"** (định lượng).
- Mỗi gate metric trong registry: thêm field `gate`, `linked_cdr` (mảng mã CDR),
  `gate_pass_condition`.

### 4. Bổ sung gate metric còn thiếu
Với cổng/CDR chưa có metric đo pass, đề xuất metric mới (qua checklist
ANNEX-129 §8), ví dụ:
- B8 Control Plan → metric "Control Plan/PFMEA approved before baseline %".
- D10 IQC → metric "Incoming inspection first-pass %" + "Mill-cert verification
  completeness %".
- D11 escape → metric "Customer escape notification lead time".
Mỗi metric mới: data contract (prompt 04 logic), ngưỡng, owner = chủ chữ A của
CDR tương ứng.

### 5. Liên kết hai chiều
Tùy chọn: thêm cột "Gate metric" vào ANNEX-121 §5 (chỉ thêm cột tham chiếu,
KHÔNG đổi cấu trúc RACI 16 cột). Nếu rủi ro cao cho ma trận RACI → chỉ liên kết
một chiều từ ANNEX-122 §9 sang, ghi rõ lý do.

### 6. Regenerate ANNEX-128 + audit.

## Tự phản biện bắt buộc
- Cổng nào vẫn "đi qua" mà không có metric định lượng chứng minh đã đủ điều
  kiện? Đó là khe hở audit khách hàng.
- Gate metric có trùng KPI value-stream không (vd FAI_FIRST_PASS vs gate G4)?
  Nếu trùng → một mã chuẩn, tham chiếu chéo, không nhân đôi.
- Owner gate metric có đúng là chủ chữ A của CDR không?

## Tình huống & cách xử lý
- CDR có nhiều gate (vd CDR dùng lại ở G0 và G7) → gate metric tách theo cổng,
  không gộp.
- Gate metric đo điều kiện pass nhưng dữ liệu nằm ở form chưa số hóa → để
  `manual` + ghi form, không bịa runtime.

## Definition of Done
- Mọi cổng G0–G7 có ≥1 gate metric đo điều kiện pass, định lượng.
- Mọi gate metric trỏ `linked_cdr` hợp lệ trong ANNEX-121.
- Không gate metric mồ côi; không trùng mã với KPI value-stream.
- ANNEX-122 §9 có 2 cột mới; registry có field gate/linked_cdr.
- 3 audit script PASS; commit cặp; deploy xanh; verify Chrome.
