# KPI Stage 04 — Data Contracts & Real Compute (2026-05-21)

**Prompt:** `_reports/kpi-upgrade-prompts/04-data-contracts-and-compute.md`
**Kết quả:** 9 governance KPI được TÍNH THẬT từ DB; trạng thái tính của cả 33
KPI trung thực end-to-end.

## Phát hiện nền tảng

DB live (`/var/www/eqms.hesemeng.com`) hiện gần như rỗng — hệ ở giai đoạn
prototype/pre-production: `job_orders=3`, `equipment=4`, `records=3`,
`mes_downtime_events=1`, mọi bảng nghiệp vụ khác = 0. Theo đúng prompt
("bảng nguồn có nhưng dữ liệu rỗng → KPI vẫn graduate, trả empty_result có
nhãn 'đang tích lũy dữ liệu', không tô đỏ"), Stage 4 graduate KPI khi **bảng
nguồn + cột tồn tại và schema xác nhận**, không phụ thuộc việc bảng đã có dữ
liệu hay chưa.

## 9 KPI graduate → `runtime_calculated`

Mỗi KPI có hàm `calc*` trong KpiEngine, SQL đã chạy thử trực tiếp trên DB live
(0 lỗi), test tích hợp qua `calculateKpi()` ra giá trị hợp lý:

| KPI | Hàm | Bảng nguồn (đã xác nhận) |
|-----|-----|--------------------------|
| PLAN_ADHERENCE | calcPlanAdherence | job_orders |
| WIP_AGING | calcWipAging | job_orders |
| NCR_CLOSURE_AGING | calcNcrClosureAging | ncr_records |
| ECO_CLOSURE_AGING | calcEcoClosureAging | engineering_change_requests |
| MATERIAL_AVAILABILITY_PLAN | calcMaterialAvailabilityPlan | job_orders |
| INVENTORY_ACCURACY | calcInventoryAccuracy | wms_cycle_count_results |
| DSO | calcDso | ap_ar_invoices |
| INVOICE_RFT | calcInvoiceRft | ap_ar_invoices |
| INCIDENT_ACTION_CLOSURE_AGING | calcIncidentActionClosureAging | ehs_incidents |

KPI dạng aging đếm ngày từ `created_at` (ngày MỞ) — không thể hoãn đóng cho
số đẹp. SQL khớp enum thật của DB (`job_status_enum`, `ncr_status_enum`,
`ecr_status_enum`, `match_status_enum`).

## Insufficient-data gate

`calculateKpi()` thêm cổng: calculator trả `sample_size`; nếu dưới
`formula.min_sample` (registry, Stage 3) → status **GREY "insufficient
data"**, không bao giờ tô đỏ/xanh giả. Bao trùm cả nhiễu lô nhỏ lẫn nguồn
prototype đang tích lũy dữ liệu. 5 KPI runtime cũ (OTD, COMPLAINT_RATE,
CAL_COMPLIANCE, SUPPLIER_OTD, TRAINING_COMP) cũng trả `sample_size` để
min_sample của chúng có hiệu lực.

## Trạng thái tính — trung thực 100%

33 governance KPI: **14 runtime_calculated** (5 cũ + 9 graduate),
**18 staged_data_contract**, **1 manual** (BCP_READINESS — bản chất là diễn
tập định kỳ, không có dòng giao dịch). `runtime_calculated_metrics` registry:
19 → 28 mã. schema_version 3 → 4.

## Verify

- 9 SQL chạy trực tiếp psql trên DB live: 0 lỗi.
- Test tích hợp `calculateKpi()` 9 KPI trên VPS: ra giá trị, GREY khi thiếu dữ liệu.
- PHPUnit: `KpiEngineAuthorityRegistryTest` PASS (sửa assert 19→28).
- 3 audit PASS (0 P0/P1). Migration drift: không thêm migration.
- Deploy GitHub Actions HEAD `396d73f8` XANH.
- VPS live: `schema_version=4`, `runtime_calculated_metrics=28`, 9 KPI tính được.

## Tự phản biện (3 vòng)

**Vòng 1 — KPI nào "giả vờ runtime"?**
Không. 9 KPI graduate đều có bảng+cột xác nhận qua `information_schema` và
SQL chạy thật. Cổng insufficient-data đảm bảo nguồn rỗng hiện GREY, không
phải số 0 giả. 18 KPI còn lại giữ `staged_data_contract` trung thực — bảng
nguồn chưa tồn tại hoặc cần migration.

**Vòng 2 — calc* xử lý kỳ rỗng / chia 0 / cỡ mẫu nhỏ?**
Mọi hàm guard `denominator > 0 ? ... : 0`. Cỡ mẫu nhỏ xử lý qua cổng
`min_sample` → GREY. Enum NULL xử lý `(col IS NULL OR col NOT IN ...)`.

**Vòng 3 — Dashboard còn staged KPI? CEO có biết số rỗng?**
18 governance KPI vẫn staged. Chúng KHÔNG tô màu giả: ANNEX-122 hiển thị badge
"Chờ hợp đồng dữ liệu"; KPI runtime nguồn rỗng hiển thị GREY "insufficient
data". CEO thấy rõ đâu là số thật, đâu là chưa có dữ liệu.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S04-01 | `breakdown` chưa tách theo khách hàng/cổng/máy để tìm nút thắt — mới có count tổng. | 06 (console) |
| S04-02 | 18 KPI staged cần bảng nguồn mới hoặc tích hợp Epicor: RFQ_TURNAROUND_TIME, FAI_FIRST_PASS, FINAL_RELEASE_RFT, ENGINEERING_RELEASE_ON_TIME, CRITICAL_ROLE_BACKUP_COVERAGE (cần migration role_backup_certifications), v.v. | sau |
| S04-03 | Proposed metrics TOC (OEE_BOTTLENECK, THROUGHPUT_PER_CONSTRAINT_HOUR…) + bảo trì (MTBF/MTTR) chưa graduate — cần constraint register + machine event aggregation. | sau |
| S04-04 | `calcOee` query bảng `equipment_logs` KHÔNG tồn tại trên DB → OEE luôn fail về emptyResult. Bug tồn đọng cần sửa nguồn (equipment_logs vs mes_machine_state_events/downtime_event). | sau |
| S04-05 | 11 P2 `LEGACY_ALIAS_USED`. | 07 |

---
*Stage 04 hoàn tất. Tiếp theo: Prompt 05 — `05-gate-kpi-cdr-linkage.md`.*
