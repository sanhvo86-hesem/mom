# 00 — Nghiên cứu repo hiện tại và rủi ro còn lại

Ngày rà: 2026-05-22  
Repo: `sanhvo86-hesem/mom`, branch `main`

## 1. Trạng thái hiện tại cần coi là baseline v2

Các prompt gốc trong `00_ORIGINAL_UPLOADED_BASELINE/` mô tả một hệ KPI còn sơ khai hơn. Khi rà repo `main`, hệ thống hiện đã có nhiều hạng mục đã triển khai:

### 1.1 Registry đã tiến hóa

`mom/data/registry/kpi-authority-registry.json` hiện có:

- `registry_id = KPI-AUTHORITY-CNC-OPS`
- `version = 2026-05-21`
- `schema_version = 16`
- `runtime_calculated_metrics` gồm 28 mã: OEE, OTD, DPMO, COPQ, FPY, SCRAP_RATE, REWORK_RATE, MACHINE_UTIL, SETUP_RATIO, NCR_RATE, CAPA_CLOSURE, CAL_COMPLIANCE, TRAINING_COMP, SUPPLIER_OTD, SUPPLIER_QUAL, COMPLAINT_RATE, INV_TURNS, LABOR_EFF, PUT_THRU, PLAN_ADHERENCE, WIP_AGING, NCR_CLOSURE_AGING, ECO_CLOSURE_AGING, MATERIAL_AVAILABILITY_PLAN, INVENTORY_ACCURACY, DSO, INVOICE_RFT, INCIDENT_ACTION_CLOSURE_AGING.
- `legacy_aliases` khá rộng.
- `executive_scorecard` đã có 15 mã, trong đó nhiều mã vẫn có thể staged/manual.
- `annex122_governance_kpis` đã có schema đầy đủ: `formula`, `thresholds`, `data_source`, `owner_role`, `decision_action`, `attribution_rule`, `counter_metric`, `reward_eligible`, `calculation_status`, `applicable_jds`.

Hàm ý: Prompt v2 không được yêu cầu “thêm schema_version” như prompt gốc nữa, mà phải **audit schema_version gate có hoạt động thật không** và **không làm rollback registry về dạng cũ**.

### 1.2 KpiEngine đã mở rộng

`mom/api/services/KpiEngine.php` hiện:

- Định nghĩa 28 runtime metrics trong `ALL_METRICS`.
- Có runtime overlay path `kpi-authority-registry.runtime.json`.
- Có `CONSOLE_EDITABLE_FIELDS`.
- `calculateKpi()` chuyển KPI không runtime sang `calculateFromManualInput()`.
- Có insufficient-data gate dựa vào `sample_size` và `formula.min_sample`.
- `getMetricCatalog()` gom runtime, governance, proposed, dashboard_core, gate_control.
- Có `counterMetricCodes()`, `kpiThresholdBadges()`, `jdScorecards()`.
- `getKpiTarget()` ưu tiên registry thresholds trước DB default.

Hàm ý: không được viết lại engine theo hướng phá các API này. Mọi calculator mới phải bám đúng kiểu trả về hiện tại và phải report `sample_size` khi là tỷ lệ.

### 1.3 KPI Admin Console đã tồn tại

Repo đã có:

- `mom/api/services/KpiRegistryAdminService.php`
- `mom/scripts/portal/00o-admin-kpi-registry.js`
- route `admin_kpi_registry_get/save` trong `core-routes.php`

Console hiện hỗ trợ:

- Dashboard/library KPI.
- Sửa field có cấu trúc, không lộ JSON thô.
- Save overlay runtime.
- Add/retire KPI qua overlay.
- Regenerate ANNEX-122 marker regions theo comment: §4/§5/§6.

Hàm ý: Prompt v2 tập trung **hardening** thay vì “xây console từ đầu”.

### 1.4 Manual input endpoint đã tồn tại

`core-routes.php` hiện có:

- `kpi_input_save`
- `kpi_input_list`
- `kpi_threshold_badges`
- `kpi_jd_scorecards`

Hàm ý: KPI staged/manual và counter-metric cần workflow nhập liệu thực chiến, không chỉ endpoint backend.

### 1.5 CI guard đã tồn tại

`mom/tools/release/check_kpi_integrity.php` hiện bắt nhiều P0/P1:

- ANNEX-122 vs registry drift.
- missing formula/data_source/owner/calculation_status/decision_action.
- runtime_calculated nhưng không có trong runtime list hoặc engine.
- duplicate canonical_code.
- alias target unknown.
- gate linked_cdr invalid.
- counter_metric thiếu/không unique.
- scorecard staged warning.
- lag thiếu paired metric.
- percent KPI min_sample 0.

Hàm ý: Prompt v2 không tạo guard mới từ đầu, mà **làm guard sắc hơn và giảm false negative/false positive**.

## 2. Rủi ro còn lại cần Prompt v2 xử lý

### R1 — Comment/logic còn kẹt ở tư duy “33 KPI”

`check_kpi_integrity.php` vẫn có comment nói “33 governance KPIs”. Đây có thể chỉ là comment, nhưng là triệu chứng của rủi ro lớn: code/doc có thể vẫn hardcode số lượng KPI. V2 phải grep toàn repo:

- `"33 governance"`
- `"33 KPI"`
- `"33 governance KPIs"`
- `"annex122_governance_kpis ... 33"`
- mọi validator dựa vào count cố định.

Kết quả mong muốn: không còn bất kỳ ràng buộc số lượng KPI cố định. Chỉ có ràng buộc chất lượng KPI.

### R2 — Admin Console cho phép thêm/retire KPI qua runtime overlay

KpiRegistryAdminService hiện nhận `added_kpis` và `retired_codes` trong overlay. Đây rất nguy hiểm nếu một KPI official có thể được thêm/retire ngoài git/change-control. Runtime overlay chỉ nên chứa field vận hành được phép sửa: thresholds, owner, cadence, action, counter-metric. Tạo mới/retire/đổi công thức/đổi calculation_status phải đi qua git, review, audit script, deploy.

Prompt v2 phải quyết định:

- Hoặc chuyển add/retire trong Console thành **draft change request**, không có hiệu lực official.
- Hoặc giữ overlay add/retire nhưng gắn cờ `draft_only` và chặn `is_official_kpi=true`.
- Hoặc chỉ cho admin tạo “candidate metric” với trạng thái `proposal`, không render vào ANNEX-122 official.

Đề xuất: chặn add/retire official qua overlay. Console có thể tạo file `_reports/kpi/change-requests/*.md` hoặc runtime draft, nhưng official registry chỉ đổi qua git.

### R3 — ANNEX-122 §9 gate metrics có thể chưa regenerate cùng Console save

Cả service và JS comment đều nhắc regenerate §4/§5/§6. Trong khi registry có `gate_control_metrics` và ANNEX-122 §9 là vùng cực kỳ quan trọng để nối CDR/Gate. Nếu gate metrics được sửa hoặc thêm mà §9 không regenerate, drift sẽ quay lại.

Prompt v2 phải:

- Xác minh marker `KPI-GATE:START/END` có tồn tại trong ANNEX-122.
- Xác minh `KpiRegistryAdminService` regenerate §9.
- Nếu gate/proposed là read-only thì save không cho override gate/proposed; nếu editable thì phải regenerate §9 và matrix.
- CI guard phải bắt gate metric trong registry không render ở ANNEX-122 §9 và ngược lại.

### R4 — `min_sample` guard có thể bỏ sót vì unit dùng `percent` thay vì `%`

Guard hiện cảnh báo unit === `%`, nhưng registry formula nhiều nơi dùng `"percent"`. Đây là false negative. Prompt v2 phải sửa mọi validator để coi `%`, `percent`, `percentage`, `ppm`, `rate` là nhóm nhạy thống kê và yêu cầu min_sample hoặc lý do miễn trừ.

### R5 — Proposed/position metrics đang phình to

Registry hiện có rất nhiều `POS_*` role-level/manual measures. Nếu gọi toàn bộ là KPI official sẽ làm loãng hệ thống. V2 phải phân loại:

- Official KPI: dùng trong scorecard/chỉ đạo quản trị, có hệ quả rõ.
- Operating metric: dùng điều hành ca/ngày.
- Gate control metric: dùng hold/release.
- Role performance measure: dùng JD/OJT/review, không phải KPI cấp công ty.
- Health indicator: theo dõi, không thưởng/phạt.

Mục tiêu không phải xóa `POS_*`, mà đưa chúng về đúng lớp và không đẩy lên dashboard điều hành.

### R6 — Counter-metric hiện là manual input, nhưng chưa chắc có UX sống

KpiEngine biết counter metrics (`<KPI>-CTR`) và trả input endpoint. Nhưng xưởng cần:

- Ai nhập?
- Khi nào nhập?
- Form nào?
- Evidence nào?
- KPI đỏ/counter đỏ xử lý ra sao?
- Counter metric hiển thị cạnh KPI chính không?
- CI guard có bắt counter metric thiếu endpoint/evidence không?

Prompt v2 phải biến counter metric thành workflow vận hành, không chỉ metadata.

### R7 — Runtime calculator mới phải có dữ liệu thật, không bịa bảng/cột

Một số `data_source` trong registry vẫn ghi bảng như `trusted_release_records`, `incident_logs`, `rfq_records`, `invoices`. Cần verify với `.ai/db-map/` hoặc migration. Nếu không có bảng/cột:

- chuyển staged với migration/data-contract backlog;
- hoặc tạo migration nếu business chấp nhận;
- hoặc manual nếu bản chất là audit/form;
- không “giả runtime”.

### R8 — Dashboard scorecard có thể còn staged/manual đóng vai “ảo”

`executive_scorecard` có các mã như `GROSS_MARGIN_JOB_FAMILY`, `THROUGHPUT_PER_CONSTRAINT_HOUR`, `OEE_BOTTLENECK`, `SETUP_FIRST_PASS`, `FAI_FIRST_PASS`, `REPEAT_NCR_RATE`, `CAPA_EFFECTIVENESS`, `SUPPLIER_READINESS`, `CRITICAL_ROLE_CERT_COVERAGE`. Cần re-audit:

- Mã nào runtime?
- Mã nào manual nhưng có form?
- Mã nào staged?
- Scorecard có tính điểm staged không? Nếu có, sai.
- Có nhãn rõ trong UI không?

### R9 — Thiếu KPI constraint/TOC runtime thật

CNC job-shop không thể chỉ đo OEE trung bình. Cần đo constraint:

- `OEE_BOTTLENECK`
- `THROUGHPUT_PER_CONSTRAINT_HOUR`
- `CONSTRAINT_LOST_HOURS`
- `BOTTLENECK_BUFFER_STATUS`
- `CONSTRAINT_STARVATION_BLOCKAGE_TIME`
- `PROMISE_DATE_RISK`

Nếu chưa có dữ liệu, phải tạo data contract và staged rõ, không biến thành khẩu hiệu.

### R10 — Gate CDR cần pass/fail định lượng, không chỉ metric trang trí

Gate metrics hiện có `linked_cdr`, `gate_pass_condition`, nhưng cần audit:

- Mọi CDR quan trọng A/B/C/D/E/F đã có ít nhất một pass metric?
- Các CDR mới B8, D10, D11, D12 có metric đủ chưa?
- Owner metric có đúng chủ chữ A của CDR không?
- Gate metric trùng KPI runtime thì dùng cùng canonical code và cross-reference, không nhân đôi.

## 3. Hướng đi v2

Prompt v2 chia thành 11 prompt:

1. Audit hiện trạng repo và loại bỏ giả định cũ.
2. Phân loại KPI/metric/role measure/gate/health.
3. Harden registry SSOT và change-control.
4. Data contracts + DB verification.
5. Runtime calculator graduation.
6. Gate CDR + QMS/APQP/FAI/PPAP/IQC/customer escape.
7. Fair reward/JD/role measures.
8. Dashboard/Admin Console/manual/counter UX.
9. CI guard hardening.
10. Vietnamese rewrite + audit readiness.
11. Deploy/verify/live training.

Các track song song chỉ được bắt đầu sau prompt 01–02 để tránh mỗi phiên sửa schema khác nhau.
