# 04 — Hoàn tất data contract — KPI được TÍNH THẬT

**Loại:** sửa KpiEngine + registry + migration nếu cần. **Stage 3 — trọng tâm.**
**Tiên quyết:** prompt 02–03 xong.

## Vấn đề cốt lõi
~26/33 governance KPI, 14/15 proposed metric, 8/12 dashboard KPI hiện KHÔNG
được tính — chúng là KPI giấy / `staged_data_contract`. Một KPI không ai tính
từ dữ liệu thật chỉ là khẩu hiệu. Stage này biến KPI thành **thực chiến**: mỗi
KPI hoặc được KpiEngine tính từ dữ liệu thật, hoặc bị khai tử trung thực.

## Việc phải làm — lặp cho TỪNG KPI chưa `runtime_calculated`

### 1. Lập data contract 5 bước (ANNEX-127 §5)
- **Định nghĩa:** mã, tên, mục đích quyết định, chiều tốt.
- **Công thức:** tử/mẫu/filter/kỳ/loại trừ/đơn vị — định lượng tuyệt đối.
- **Nguồn dữ liệu:** bảng + cột THẬT. Tra `.ai/db-map/<domain>.json`. Các bảng
  ứng viên: `kpi_snapshots`, `mes_production_kpi_daily`, `aps_kpi_snapshots`,
  `dw_kpi_scorecards`, `svc_service_kpi_snapshots`, và bảng nghiệp vụ (job,
  order, NCR, CAPA, calibration, training, PO…). Nếu KPI cần cột chưa tồn tại
  → quyết định: (a) thêm migration cột/bảng, hoặc (b) hoãn KPI.
- **Evidence:** form/log/record chứng minh số (FRM-xxx).
- **Runtime:** test, migration/seed, dashboard contract, rollback.

### 2. Quyết định số phận mỗi KPI (trung thực, không giả vờ)
- **GRADUATE → runtime:** đủ nguồn dữ liệu → viết hàm `calc<Name>()` trong
  KpiEngine theo đúng mẫu 19 hàm `calc*` hiện có (đọc `calcOtd`, `calcFpy`,
  `calcNcrRate` làm khuôn: nhận `DateRange $period, array $filters`, trả
  `['value'=>..,'unit'=>..,'breakdown'=>..]`). Thêm mã vào
  `runtime_calculated_metrics` của registry; map trong `getCalculator()`;
  đặt `calculation_status: runtime_calculated`.
- **STAGED có lộ trình:** thiếu 1–2 cột → ghi migration cần làm vào data
  contract, giữ `staged_data_contract`, KHÔNG đưa lên dashboard điều hành.
- **MANUAL hợp lệ:** bản chất phải nhập tay (vd BCP_READINESS từ diễn tập) →
  `calculation_status: manual`, chỉ rõ form nhập + chu kỳ + người nhập.
- **KHAI TỬ:** KPI không đo được và không đáng đo → `status: retired`, ghi lý
  do; gỡ khỏi scorecard/dashboard; ghi vào ANNEX-128.

### 3. Ưu tiên graduate (theo giá trị thực chiến cho xưởng CNC)
Ưu tiên cao — KPI điều hành hằng ngày/tuần:
- `PLAN_ADHERENCE`, `WIP_AGING`, `SCHEDULE_RECOVERY_EFFECTIVENESS`,
  `FAI_FIRST_PASS`, `ENGINEERING_RELEASE_ON_TIME`, `NCR_CLOSURE_AGING`,
  `ECO_CLOSURE_AGING`, `MATERIAL_AVAILABILITY_PLAN`, `INVENTORY_ACCURACY`.
- TOC tuần: `OEE_BOTTLENECK`, `BOTTLENECK_BUFFER_STATUS`,
  `THROUGHPUT_PER_CONSTRAINT_HOUR`, `CONSTRAINT_LOST_HOURS`.
- Bảo trì: `MTBF`, `MTTR`, `CYCLE_TIME_VARIANCE`.
- Chất lượng: `REPEAT_NCR_RATE`, `CAPA_EFFECTIVENESS`, `FINAL_RELEASE_RFT`.
Mỗi KPI graduate phải có test thực tế (period mẫu, kết quả hợp lý, breakdown).

### 4. Snapshot + trend
Bảo đảm `saveSnapshot()` ghi mọi KPI runtime vào `kpi_snapshots`; cron
`runDailyKpiSnapshot` bao phủ KPI mới. `getKpiTrend()` đọc được.

### 5. Migration (nếu cần cột mới)
Theo `.ai/CONVENTIONS.md`: file `mom/database/migrations/NNN_*.sql`, không
trùng id (chạy `php mom/tools/release/check_migration_drift.php`). Cột mới phải
có default an toàn, không phá dữ liệu cũ.

## Tự phản biện bắt buộc
- KPI nào mình vừa "giả vờ runtime" nhưng nguồn dữ liệu không thật? Quay lại STAGED.
- Hàm `calc*` mới có xử lý kỳ rỗng / chia 0 / cỡ mẫu nhỏ không?
- `breakdown` có tách theo khách hàng/cổng/máy để tìm nút thắt không?
- KPI khai tử — có chắc không đáng đo, hay chỉ lười cấp nguồn?
- Dashboard điều hành sau stage này còn KPI `staged` nào không? Nếu còn, CEO
  có biết đó là số rỗng không (phải hiển thị nhãn "chưa có data contract")?

## Tình huống & cách xử lý
- Bảng nguồn có nhưng dữ liệu lịch sử rỗng → KPI vẫn graduate nhưng trả
  `empty_result` có nhãn "đang tích lũy dữ liệu", không tô đỏ.
- 2 nguồn cho 1 KPI lệch nhau → chọn 1 SoR, ghi `data_source.system`, rule khi
  lệch (ANNEX-122 §3 "one nguồn sự thật").
- Migration đụng bảng lớn → cột nullable + backfill nền, không khóa bảng.
- KPI cần dữ liệu từ Epicor/ERP ngoài MOM → nếu chưa có tích hợp, để
  `staged_data_contract` + ghi rõ phụ thuộc, không bịa.

## Definition of Done
- Mọi KPI có `calculation_status` chính xác (`runtime_calculated` /
  `staged_data_contract` / `manual` / `retired`) — không còn KPI mập mờ.
- Mỗi KPI graduate có hàm `calc*` + test period mẫu chạy ra số hợp lý.
- `GET /api/kpi/<code>` trả giá trị thật cho mọi KPI runtime mới.
- Dashboard điều hành: KPI `staged` được gắn nhãn rõ ràng, không giả số.
- 3 audit script PASS; `php -l` sạch; migration drift PASS.
- Commit cặp; deploy xanh; verify `GET /api/kpi/...` trên Chrome ra số thật.
