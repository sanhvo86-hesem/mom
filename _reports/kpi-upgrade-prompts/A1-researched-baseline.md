# A1 — Dữ liệu nền đã nghiên cứu sẵn (để AI KHÔNG phải đoán)

File tham chiếu cho mọi prompt 01→09. Mọi con số/bảng/đường dẫn dưới đây đã được
khảo sát trực tiếp trong repo ngày 2026-05-21. AI thực thi **dùng dữ liệu này
làm điểm xuất phát**, chỉ cần `verify` lại bằng `.ai/db-map/` chứ không tự dò
từ đầu.

---

## A1.1 — KpiEngine hiện TÍNH ĐƯỢC 28 metric (không phải 19)

`mom/api/services/KpiEngine.php` có 28 hàm `calc*` thật + 1 hàm
`calculateFromManualInput`. Nhưng `runtime_calculated_metrics` trong registry
**chỉ liệt kê 19** → registry STALE. Đây là drift P0 đầu tiên prompt 02 phải sửa.

Bảng 28 metric engine tính được — mã, target mặc định (`DEFAULT_TARGETS`),
đơn vị, hàm, bảng nguồn:

| Mã | Target | Đơn vị | Hàm calc | Bảng nguồn |
|----|--------|--------|----------|------------|
| OEE | 85 | % | calcOee | equipment_logs, items, job_orders |
| OTD | 95 | % | calcOtd | shipments |
| DPMO | 3400 | ppm | calcDpmo | inspection_results |
| COPQ | 0 (min) | $ | calcCopq | ncr_records, records |
| FPY | 95 | % | calcFpy | inspection_results |
| SCRAP_RATE | 2 | % | calcScrapRate | job_orders |
| REWORK_RATE | 3 | % | calcReworkRate | job_orders |
| MACHINE_UTIL | 80 | % | calcMachineUtil | equipment_logs |
| SETUP_RATIO | 10 | % | calcSetupRatio | equipment_logs |
| NCR_RATE | 5 | % | calcNcrRate | job_orders, ncr_records, records |
| CAPA_CLOSURE | 90 | % | calcCapaClosure | capa_records |
| CAL_COMPLIANCE | 100 | % | calcCalCompliance | calibration_records, equipment |
| TRAINING_COMP | 95 | % | calcTrainingCompletion | training_records |
| SUPPLIER_OTD | 90 | % | calcSupplierOtd | vendor_ratings |
| SUPPLIER_QUAL | 98 | % | calcSupplierQuality | vendor_ratings |
| COMPLAINT_RATE | 100 | ppm | calcComplaintRate | ncr_records, records, shipments |
| INV_TURNS | 6 | turns | calcInventoryTurns | kpi_definitions, kpi_snapshots |
| LABOR_EFF | 85 | % | calcLaborEfficiency | items, job_orders |
| PUT_THRU | 0 | $/hr | calcPutThru | job_orders |
| PLAN_ADHERENCE | 90 | % | calcPlanAdherence | job_orders |
| WIP_AGING | 5 | % | calcWipAging | job_orders |
| NCR_CLOSURE_AGING | 10 | % | calcNcrClosureAging | ncr_records |
| ECO_CLOSURE_AGING | 10 | % | calcEcoClosureAging | engineering_change_requests |
| MATERIAL_AVAILABILITY_PLAN | 95 | % | calcMaterialAvailabilityPlan | job_orders |
| INVENTORY_ACCURACY | 98 | % | calcInventoryAccuracy | wms_cycle_count_results |
| DSO | 45 | day | calcDso | ap_ar_invoices |
| INVOICE_RFT | 98 | % | calcInvoiceRft | ap_ar_invoices |
| INCIDENT_ACTION_CLOSURE_AGING | 10 | % | calcIncidentActionClosureAging | ehs_incidents |

Hàm `calc*` mẫu (khuôn cho mọi hàm mới): nhận `DateRange $period, array
$filters`; trả mảng `['value'=>float, 'unit'=>..., '<breakdown fields>'=>...]`;
xử lý chia 0 (`$total > 0 ? ... : 0`); lọc kỳ bằng `BETWEEN :s AND :e`.

---

## A1.2 — Governance KPI hiện tại: cái nào ĐÃ tính, cái nào CHƯA

`registry.annex122_governance_kpis` HIỆN có 33 KPI — đây là *tồn kho hiện tại*,
KHÔNG phải bộ cố định. Đợt nâng cấp được thêm/gộp/khai tử (xem 00 §F.0). Bảng
dưới đối soát 33 KPI hiện có với 28 hàm engine:

**14/33 ĐÃ có hàm engine** (graduate dễ — chỉ cần thêm vào
`runtime_calculated_metrics` + điền data contract):
OTD, COMPLAINT_RATE, PLAN_ADHERENCE, WIP_AGING, SUPPLIER_OTD, DSO,
ECO_CLOSURE_AGING, NCR_CLOSURE_AGING, CAL_COMPLIANCE,
MATERIAL_AVAILABILITY_PLAN, INVENTORY_ACCURACY, INVOICE_RFT, TRAINING_COMP,
INCIDENT_ACTION_CLOSURE_AGING.

**19/33 CHƯA có hàm engine** (cần data contract + viết `calc*` mới, hoặc
`manual`, hoặc `retired`) — kèm bảng nguồn ứng viên (verify trong `.ai/db-map/`):

| KPI chưa tính | Bảng nguồn ứng viên | Ghi chú |
|---------------|---------------------|---------|
| FINAL_RELEASE_RFT | inspection_results, shipments | final inspection pass không reopen; FRM-642 |
| GROSS_MARGIN_JOB_FAMILY | ap_ar_invoices, job_orders | cần cột chi phí job; có thể thiếu → staged |
| RECORDABLE_INCIDENT_RATE | ehs_incidents | đếm sự cố recordable / giờ công |
| BCP_READINESS | (manual) | từ diễn tập BCP → manual input |
| RFQ_TURNAROUND_TIME | quotes | thời gian RFQ đủ → báo giá |
| ORDER_REVIEW_RFT | job_orders, quotes | đơn vào SX không mở lại vì thiếu review |
| FAI_FIRST_PASS | inspection_results | lọc loại inspection = FAI |
| SHIP_READY_TO_INVOICE_LT | shipments, ap_ar_invoices | LT ship-ready → invoice |
| SCHEDULE_RECOVERY_EFFECTIVENESS | job_orders | hiệu quả kế hoạch phục hồi sau trễ |
| FOD_LINE_CLEARANCE_COMPLIANCE | (audit/observation log) | có thể manual |
| ENGINEERING_RELEASE_ON_TIME | engineering_change_requests | release đúng hạn |
| QUOTE_HIT_RATE | quotes | đơn thắng / RFQ đủ điều kiện |
| CUSTOMER_COMM_CLOSURE_OT | ncr_records / complaint log | đóng liên lạc khách đúng hạn |
| MONTH_END_CLOSE_OT | (finance close log) | có thể manual |
| CRITICAL_ROLE_BACKUP_COVERAGE | training_records + ANNEX-123 deputy | % vai trò trọng yếu có phó được chứng nhận |
| SAFETY_ONBOARDING_COMPLIANCE | training_records | lọc khóa safety onboarding |
| SERVICE_TICKET_SLA | svc tickets (verify tên bảng) | đóng ticket trong SLA |
| CRITICAL_SYSTEM_AVAILABILITY | (IT monitoring) | có thể manual / system_health |
| MASTER_DATA_EXCEPTION_AGING | (data exception table — verify) | tuổi tồn đọng ngoại lệ master data |

→ Mục tiêu prompt 04: graduate càng nhiều càng tốt; cái không thật sự đo được
thì `manual` hoặc `retired` — KHÔNG để mập mờ.

---

## A1.3 — Bảng DB liên quan KPI (đã xác nhận trong .ai/db-map/index.json)

Có thật: `job_orders`, `ncr_records`, `inspection_results`, `shipments`,
`capa_records`, `calibration_records`, `training_records`, `vendor_ratings`,
`ap_ar_invoices`, `wms_cycle_count_results`, `ehs_incidents`,
`engineering_change_requests`, `kpi_snapshots`, `kpi_definitions`, `quotes`,
`aps_kpi_snapshots`, `dw_kpi_scorecards`, `mes_production_kpi_daily`,
`svc_service_kpi_snapshots`.

KpiEngine còn truy vấn `equipment_logs`, `equipment`, `items`, `records`,
`kpi_manual_inputs` — các bảng này tồn tại (engine query thật) nhưng chưa nằm
trong `index.json`; khi cần cột, tra `.ai/db-map/<domain>.json` hoặc
`SHOW COLUMNS`.

Quy trình tra cột bắt buộc trước khi viết `calc*`:
`Grep "<table>" .ai/db-map/index.json` → lấy domain → đọc
`.ai/db-map/<domain>.json` → lấy danh sách cột thật. KHÔNG đoán tên cột.

---

## A1.4 — Registry: trạng thái hiện tại từng key

`mom/data/registry/kpi-authority-registry.json`:
- `runtime_calculated_metrics`: 19 mã — **STALE**, thực tế engine tính 28.
- `annex122_governance_kpis`: 33 mục, mỗi mục CHỈ
  `{no, canonical_code, name, tier, status}` — thiếu formula/threshold/owner/
  data_source/decision_action/counter_metric. Prompt 02 phải bổ sung.
- `proposed_operating_metrics`: 15, 14 `staged_data_contract` + 1
  `retained_from_annex122` (FAI_FIRST_PASS).
- `dashboard_core_kpis`: 12, chỉ KPI-01 OTD / KPI-05 FPY `runtime_calculated`,
  KPI-10 SUPPLIER_OTD `runtime_calculated_partial`, **9/12 còn lại
  `staged_data_contract`** → dashboard điều hành đang hiển thị số rỗng.
- `executive_scorecard`: 15 mã; nhiều mã (OEE_BOTTLENECK,
  THROUGHPUT_PER_CONSTRAINT_HOUR, SETUP_FIRST_PASS, REPEAT_NCR_RATE,
  CAPA_EFFECTIVENESS, SUPPLIER_READINESS, CRITICAL_ROLE_CERT_COVERAGE) là
  proposed `staged` → scorecard CEO phần lớn chưa có dữ liệu.
- `legacy_aliases`: bản đồ alias cũ → mã chuẩn (giữ nguyên, đừng xoá).
- `authority_rule`, `change_control_policy`: giữ, là luật.
- **Chưa có** `schema_version` → prompt 02 phải thêm.

---

## A1.5 — Mâu thuẫn / drift đã thấy sẵn (đưa thẳng vào audit prompt 01)

1. `runtime_calculated_metrics` (19) ≠ số hàm engine thật (28). P0.
2. `dashboard_core_kpis`: 9/12 `staged` → dashboard điều hành rỗng. 🔴
3. `executive_scorecard` trỏ ~7 metric `staged` → scorecard CEO ảo. 🔴
4. 19/33 governance KPI không có hàm engine. 🔴
5. `annex122_governance_kpis` thiếu mọi field định nghĩa → registry chưa phải
   SSOT thật. 🔴
6. FAI_FIRST_PASS xuất hiện 2 nơi (governance §5 + proposed) — trùng. 🟠
7. Mã trùng vai trò: SUPPLIER_OTD vừa governance vừa runtime — cần 1 mã chuẩn,
   tham chiếu chéo. 🟠
8. Engine có target mặc định (A1.1) nhưng ANNEX-122/registry có thể ghi target
   khác → drift target. Đối soát từng dòng. 🟠
9. ANNEX-122 chứa tiếng Việt máy dịch nặng. 🟡

---

## A1.6 — Đường dẫn chuẩn (dùng nguyên văn, không tự suy)

```
Registry   mom/data/registry/kpi-authority-registry.json
Engine     mom/api/services/KpiEngine.php
Routes     mom/api/routes/core-routes.php  (kpi_catalog/kpi_get/kpi_trend/kpi_alerts)
Controller mom/api/controllers/DashboardController.php
Audit      tools/scripts/kpi/audit-html-kpis.php
           tools/scripts/kpi/audit-kpi-performance-governance.php
           tools/scripts/kpi/audit-kpi-system-matrix.php
ANNEX 12x  mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/
           annex-122-kpi-cascade-dictionary.html
           annex-125 / annex-126 / annex-127 / annex-128 / annex-129 (cùng thư mục)
ANNEX-110  mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/
           annex-110-dashboard-kpi-dictionary-and-data-model.html
WI-202     mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html
Reports    _reports/kpi/
RACI mẫu   mom/api/services/RaciMatrixService.php (schema-version gate, load/save/publish)
           mom/scripts/portal/00n-admin-raci-matrix.js (Console mẫu)
           mom/tools/release/check_raci_integrity.php (CI guard mẫu)
```
