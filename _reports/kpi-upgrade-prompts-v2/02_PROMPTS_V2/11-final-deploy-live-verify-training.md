# 11 — Deploy cuối, live verify và gói bàn giao huấn luyện

**Loại:** kiểm chứng toàn diện + tài liệu bàn giao.  
**Mục tiêu:** Chứng minh hệ KPI sau nâng cấp dùng được trong vận hành thật.

## 1. Re-audit toàn hệ

Chạy:
```bash
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
php -l <PHP changed>
node --check <JS changed>
```

Lưu output.

## 2. API verify

Trên môi trường local/staging/live theo quy trình repo:
- `kpi_catalog`
- `kpi_get` cho 5–10 KPI runtime mới/quan trọng.
- `kpi_trend`.
- `kpi_threshold_badges`.
- `kpi_jd_scorecards`.
- `kpi_input_save/list` cho 1 manual/counter metric test, rồi cleanup/void nếu quy trình cho phép.

Verify:
- runtime KPI trả số/breakdown;
- empty period grey;
- min_sample grey;
- staged badge;
- manual pending/approved behavior;
- counter metric visible.

## 3. Browser verify

Trong portal:
- Executive dashboard: không có staged KPI tính score.
- Daily/tier dashboard: đỏ/yellow có action.
- Gate dashboard/ANNEX-122 §9: linked CDR, pass condition.
- KPI Admin Console: edit allowed field, save reason, audit event, ANNEX sync; revert test.
- JD scorecard: role measures đúng.

Nếu user session không admin, dùng kỹ thuật inject module chỉ để render UI; API vẫn phải enforce RBAC.

## 4. Simulation tình huống vận hành

Test 5 tình huống:

1. Job gấp khách chen ngang: PLAN_ADHERENCE có approved resequence/attribution.
2. Máy hỏng: OEE/MTTR tách planned vs unplanned downtime.
3. NCR cuối kỳ: aging đếm open/due, không đóng cuối kỳ cho đẹp.
4. Lô nhỏ: FPY/FAI min_sample grey cho scoring nhưng gate per-event vẫn pass/hold.
5. Customer escape: notification LT bắt đầu từ detection, có containment/counter.

Ghi kết quả.

## 5. Training package

Tạo:
- one-page “KPI thực chiến là gì” cho quản lý;
- hướng dẫn đọc dashboard;
- hướng dẫn nhập manual/counter KPI;
- hướng dẫn tier meeting khi KPI đỏ;
- hướng dẫn owner viết action;
- danh sách KPI scorecard cuối cùng và role measures.

## 6. Summary report

Tạo `_reports/kpi/kpi-upgrade-final-summary-<date>.md`:

- Before/after count:
  - runtime;
  - manual governed;
  - staged with backlog;
  - retired;
  - scorecard active;
  - gate metrics covered.
- KPI graduated.
- Gate/CDR coverage.
- Dashboard/Console status.
- CI guard status.
- Khe hở còn lại + lý do.
- Tự phản biện cuối:
  - KPI nào vẫn có thể bị gaming?
  - KPI nào vẫn quá manual?
  - Dữ liệu nào cần tích hợp kỳ sau?
  - Hệ thống có thật sự giúp giao hàng/chất lượng/hiệu quả không?

## 7. Definition of Done

- Audit/guard PASS.
- Live/API/browser evidence.
- Training docs.
- Final summary.
- Git status clean.
- Không P0 remaining.
