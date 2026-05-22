# 09 — Gia cố CI integrity guard chống drift KPI

**Loại:** sửa `check_kpi_integrity.php` + CI workflow + docs.  
**Mục tiêu:** Mọi drift KPI tương lai bị chặn trước deploy. Guard phải bắt đúng lỗi thực chiến, không giữ tư duy “33 KPI”.

## 1. Đọc trước

- `mom/tools/release/check_kpi_integrity.php` hoặc `tools/release/check_kpi_integrity.php`
- `check_raci_integrity.php`
- `.github/workflows/deploy.yml`
- registry, ANNEX-122/-121/-128, KpiEngine, routes.

## 2. Sửa các vấn đề đã biết

- Xóa/đổi comment “33 governance KPIs” thành “governed KPI set; count is not fixed”.
- P1 min_sample: kiểm cả `%`, `percent`, `percentage`.
- Path base: guard phải chạy đúng từ CI và local.
- Nếu guard nằm trong `mom/tools/release`, workflow gọi đúng path.

## 3. P0 bắt buộc

Guard phải fail nếu:

1. Registry JSON invalid.
2. Duplicate `canonical_code` trong cùng official scope hoặc alias conflict.
3. Governance official KPI thiếu:
   - formula;
   - thresholds numeric/order;
   - owner_role;
   - data_source;
   - calculation_status;
   - decision_action;
   - counter_metric.
4. `runtime_calculated` không có trong KpiEngine `ALL_METRICS`/calculator.
5. KpiEngine runtime metric thiếu registry row hoặc không declared.
6. ANNEX-122 official tables lệch registry.
7. ANNEX-122 §9 gate metrics thiếu marker/render so với registry.
8. Gate metric `linked_cdr` trỏ CDR không có trong ANNEX-121.
9. Gate G0→G7 thiếu ít nhất một metric.
10. Gate metric thiếu `gate_pass_condition` định lượng.
11. Executive scorecard active chứa `staged_data_contract`.
12. `reward_eligible=true` thiếu counter_metric/min_sample/data/evidence.
13. Legacy alias target unknown.
14. Dashboard core endpoint trỏ route không tồn tại.
15. Runtime overlay có field ngoài allowlist hoặc official add/retire bypass.
16. ANNEX-128 stale nếu hash/timestamp mechanism có.

## 4. P1 cảnh báo

- Lag KPI thiếu lead paired metric.
- Percent KPI min_sample 0.
- Manual KPI thiếu evidence/input endpoint.
- Proposed/staged KPI hiển thị dashboard điều hành.
- Role/JD có quá nhiều measures.
- Gate owner lệch CDR A mà không có justification.
- KPI không có breakdown/attribution rule.

## 5. Test drift giả

Tạo và revert các drift:
- đổi registry code không đổi ANNEX-122 → fail.
- set runtime_calculated cho code không có engine → fail.
- xóa counter_metric → fail.
- thêm linked_cdr fake → fail.
- đưa staged vào executive active → fail.
- unit percent min_sample 0 → P1.
- overlay structural field → fail nếu có overlay test fixture.

Không commit drift giả.

## 6. CI workflow

Trong deploy/validation job:
- chạy guard khi changeset đụng:
  - registry;
  - KpiEngine;
  - KPI service/controller/routes;
  - ANNEX-12x/110/WI-202/JD scorecards;
  - tools/scripts/kpi;
  - dashboard/admin KPI JS.
- Không chạy thừa cho frontend thuần nếu classify job hỗ trợ, nhưng ưu tiên an toàn hơn tối ưu.

## 7. Docs

Update:
- CLAUDE.md mandatory section;
- ANNEX-127 coverage;
- README dev/checklist nếu có.

## 8. Tự phản biện

- Guard có false positive với manual hợp lệ không?
- Guard có bỏ sót `percent`/gate/overlay không?
- Có nới guard để pass thay vì sửa data không?
- Guard có chạy nhanh đủ CI không?

## 9. Definition of Done

- Guard PASS trạng thái sạch.
- Drift giả FAIL đúng, revert, PASS lại.
- Workflow gọi guard.
- Docs cập nhật.
- Report `_reports/kpi/kpi-ci-guard-hardening-<date>.md`.
