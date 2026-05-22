# 08 — CI guard chống drift KPI

**Loại:** xây script kiểm tra + gắn vào CI. **Stage 7.**
**Tiên quyết:** prompt 02–07 xong.

## Mục tiêu
Một guard chặn deploy khi hệ KPI bị drift, giống `check_raci_integrity.php` của
đợt RACI. Đây là cách bảo đảm "không lỗi hệ thống" về lâu dài: mọi thay đổi KPI
sau này không thể lọt lưới.

## Việc phải làm

### 1. Viết `tools/release/check_kpi_integrity.php`
Tham chiếu `mom/tools/release/check_raci_integrity.php` về cấu trúc (P0 chặn
deploy, P1 cảnh báo, exit code).

**P0 — chặn deploy:**
- Mã KPI trong ANNEX-122 không có trong registry, hoặc ngược lại.
- KPI thiếu một trong: `formula`, `thresholds`, `owner_role`, `data_source`,
  `calculation_status`, `decision_action`.
- `calculation_status: runtime_calculated` nhưng mã không có hàm `calc*` trong
  KpiEngine (hoặc không có trong `runtime_calculated_metrics`).
- `dashboard_core_kpis[].primary_endpoint` trỏ route không tồn tại trong
  `core-routes.php`.
- `canonical_code` trùng lặp; alias trỏ mã không tồn tại.
- Gate metric §9 có `linked_cdr` trỏ CDR không tồn tại trong ANNEX-121.
- ANNEX-128 cũ hơn lần sửa registry gần nhất (so timestamp hoặc hash nội dung).
- KPI `reward_eligible: true` thiếu `counter_metric`.

**P1 — cảnh báo:**
- KPI `staged_data_contract` xuất hiện trên dashboard điều hành (≤15 KPI).
- KPI lag không có `paired_metric` lead.
- KPI không có `min_sample` mà đơn vị là `%`.

In thống kê: tổng KPI, số runtime/staged/manual/retired, số P0/P1.

### 2. Gắn vào CI
- `.github/workflows/deploy.yml`: thêm bước chạy `check_kpi_integrity.php` ở
  job validation khi changeset đụng KPI (registry, `ANNEX-12x`, `KpiEngine.php`,
  `tools/scripts/kpi/**`). Theo dõi job `classify` để không chạy thừa khi
  changeset frontend thuần.
- Đặt cùng nhóm với `check_raci_integrity.php`.

### 3. Ghi nhận guard
- Thêm 1 dòng vào ANNEX-127 §10 (API/backend coverage) ghi nhận guard mới.
- Cập nhật `CLAUDE.md` mục "MANDATORY" nếu phù hợp (giống cách RACI đã ghi
  `check_raci_integrity.php`).

## Tự phản biện bắt buộc
- Guard có bắt được đúng các drift mà prompt 01 đã liệt kê không? Test bằng cách
  cố tình tạo 1 drift giả → guard phải fail → revert.
- Guard có chạy quá chậm / quét sai phạm vi không?
- Có false positive nào (vd KPI `manual` hợp lệ bị báo thiếu hàm `calc*`)? Sửa
  điều kiện cho đúng.

## Tình huống & cách xử lý
- Guard fail ngay lần đầu vì dữ liệu hiện tại còn drift → đó là đúng; sửa drift
  (quay lại prompt tương ứng) cho đến khi guard PASS, KHÔNG nới lỏng guard để
  cho qua.
- ANNEX-128 timestamp khó so → dùng hash nội dung bảng matrix lưu trong 1 file
  `_reports/kpi/.matrix-hash` và so.

## Definition of Done
- `check_kpi_integrity.php` chạy local PASS trên trạng thái hiện tại.
- Test drift giả → guard FAIL đúng → revert → PASS.
- `deploy.yml` chạy guard; `php -l` sạch.
- ANNEX-127 §10 + CLAUDE.md ghi nhận guard.
- Commit; deploy xanh (CI tự chạy guard).
