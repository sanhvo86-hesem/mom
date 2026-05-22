# 01 — Audit trạng thái hiện tại và bản đồ khe hở KPI CNC

**Loại:** nghiên cứu/audit sâu, không sửa code/tài liệu trừ report.  
**Mục tiêu:** Xác định repo hiện tại đã đi tới đâu so với prompt pack cũ, còn hở gì để KPI trở thành thực chiến.

## 1. Đọc bắt buộc

Đọc:
- `02_PROMPTS_V2/00-ground-rules-v2.md`
- toàn bộ `01_RESEARCH/`
- baseline gốc trong `00_ORIGINAL_UPLOADED_BASELINE/`
- repo files:
  - `mom/data/registry/kpi-authority-registry.json`
  - `mom/api/services/KpiEngine.php`
  - `mom/api/services/KpiRegistryAdminService.php`
  - `mom/api/controllers/AdminController.php`
  - `mom/api/controllers/DashboardController.php`
  - `mom/api/routes/core-routes.php`
  - `mom/scripts/portal/00o-admin-kpi-registry.js`
  - `mom/scripts/portal/02-state-auth-ui.js`
  - `mom/tools/release/check_kpi_integrity.php` hoặc `tools/release/check_kpi_integrity.php`
  - `tools/scripts/kpi/*.php`
  - ANNEX-121/-122/-127/-128/-129/-110
  - WI-202
  - 8–12 JD đại diện: CEO, PD, WKM, PPL, QA, QC, ENGM/CAM, SCM, FIN, HR, IT/EHS.
- `.ai/db-map/` cho các bảng KPI.

## 2. Lệnh kiểm nhanh

Chạy và lưu output:

```bash
git status --short
grep -R "33 governance" -n mom tools _reports .github 2>/dev/null || true
grep -R "staged_data_contract" -n mom/data/registry/kpi-authority-registry.json mom/docs | head -200
grep -R "data-kpi-code=" -n mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html | wc -l
grep -n "ALL_METRICS" -A80 mom/api/services/KpiEngine.php
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
```

Nếu command path khác, tìm đúng path thay vì bỏ qua.

## 3. Audit registry

Lập bảng cho từng nhóm trong registry:

- `runtime_calculated_metrics`
- `annex122_governance_kpis`
- `gate_control_metrics`
- `proposed_operating_metrics`
- `dashboard_core_kpis`
- `executive_scorecard`
- `jd_kpi_scorecards`
- `role/position metrics` nếu có

Với mỗi metric, ghi:
- code;
- tên;
- classification/tier/layer;
- owner/data steward;
- calculation_status;
- có formula?
- có thresholds numeric?
- có data_source thật?
- có action?
- có counter_metric?
- có min_sample nếu tỷ lệ?
- có paired_metric nếu lag?
- có source trong DB/form không?
- có nằm trong dashboard/scorecard/JD/gate?
- phán quyết: `production-ready`, `manual-governed`, `staged`, `retire/hạ cấp`, `needs reclassification`.

## 4. Audit KpiEngine

Đối soát:
- `ALL_METRICS` vs `runtime_calculated_metrics`.
- `getCalculator()` có đủ map cho từng metric.
- từng `calc*` có:
  - period filter rõ;
  - chia 0;
  - `sample_size`;
  - breakdown hành động được;
  - không hardcode threshold trái registry;
  - source tables/cột thật trong `.ai/db-map`;
  - status grey cho period rỗng/min_sample.
- `calculateFromManualInput()` có đủ evidence/approval chưa.
- `saveSnapshot()` và trend có bao phủ metric mới không.

## 5. Audit Admin Console

Kiểm:
- Console có hiển thị KPI thật, không JSON thô?
- Add/retire KPI trong overlay có đang biến runtime overlay thành SSOT cấu trúc không?
- Save có regenerate ANNEX-122 §9 gate metrics chưa hay chỉ §4/§5/§6?
- Save có audit_events không?
- RBAC/CSRF đúng không?
- Counter-metric/manual input có UX rõ không?
- Staged KPI có nhãn đỏ “chưa đủ data contract” không?
- Có cho đổi formula/data_source/calculation_status từ UI không? Nếu có, rủi ro.

## 6. Audit CI guard

Kiểm:
- Guard có còn tư duy “33 governance KPIs” không?
- Có kiểm `unit: "percent"` hay chỉ `%`?
- Có kiểm `gate_control_metrics` đủ `gate`, `linked_cdr`, `gate_pass_condition`, threshold/counter?
- Có kiểm ANNEX-122 §9 marker/link?
- Có kiểm `dashboard_core_kpis.primary_endpoint` route thật?
- Có kiểm `executive_scorecard` không tính staged/manual chưa approved?
- Có kiểm overlay-added KPI không bypass SSOT?
- Có chạy trong `.github/workflows/deploy.yml` khi changeset đụng KPI không?

## 7. Audit gate G0→G7

Tạo ma trận:

| Gate | CDR thuộc gate | Gate metric hiện có | Điều kiện pass | Owner A của CDR | Data source/evidence | Khe hở |
|---|---|---|---|---|---|---|

Tìm:
- gate nào thiếu metric;
- CDR nào không được đo;
- metric nào linked_cdr không tồn tại;
- owner metric không phải A/owner có quyền;
- condition không định lượng;
- metric trùng mã nhưng không cross-reference đúng.

## 8. Audit dashboard / scorecard / JD

Tạo bảng:
- Executive scorecard KPI nào `runtime_calculated`, `manual`, `staged`, `retired`.
- Dashboard KPI nào hiển thị số thật, số manual, staged.
- JD role nào có quá nhiều measures, role measures nào đang bị gọi nhầm “KPI chính thức”.
- WI-202 có hành động cụ thể khi đỏ không.

## 9. Audit tiếng Việt

Liệt kê câu máy dịch, thuật ngữ không nhất quán, câu khó hiểu cho quản đốc. Không sửa ở stage này.

## 10. Output

Tạo `_reports/kpi/kpi-current-state-gap-map-<YYYY-MM-DD>.md` gồm:

1. Executive summary: đã production-ready đến đâu.
2. Bảng metric từng code.
3. Drift map registry ↔ engine ↔ ANNEX-122 ↔ ANNEX-128 ↔ dashboard ↔ JD.
4. Bảng gate/CDR.
5. Risk register P0/P1/P2.
6. Đề xuất stage tiếp theo theo thứ tự ưu tiên.
7. Tự phản biện 3 vòng.

## 11. Không làm

- Không sửa registry/engine/docs ở stage này.
- Không “fix nhanh” audit fail.
- Không xóa KPI vì thấy nhiều; chỉ đề xuất.

## 12. Definition of Done

- Report tồn tại, đủ bảng và phán quyết từng KPI/metric.
- Có bằng chứng command output.
- Có phân biệt việc đã xong trong repo và việc prompt cũ còn yêu cầu.
- Không có file khác bị sửa.
