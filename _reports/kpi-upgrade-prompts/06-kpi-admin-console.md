# 06 — Xây KPI Admin Console trong portal

**Loại:** xây service + controller + module portal mới. **Stage 5.**
**Tiên quyết:** prompt 02–05 xong (registry đã là SSOT đầy đủ).

## Mục tiêu
Một Console quản trị KPI trong module "Quản trị hệ thống", mô phỏng đúng RACI
Console — để xem và biên tập KPI (ngưỡng, owner, action rule, counter-metric,
trạng thái) mà không phải sửa JSON tay, và đồng bộ ra ANNEX-122 khi lưu.

## Tham chiếu bắt buộc đọc trước
- `mom/scripts/portal/00n-admin-raci-matrix.js` — RACI Console (dashboard,
  thẻ thống kê, tab section, sửa tại chỗ WYSIWYG, KHÔNG lộ JSON thô).
- `mom/api/services/RaciMatrixService.php` — load() (schema-version gate +
  bootstrap-as-SSOT merge), save(), publish(), validate().
- `mom/api/controllers/AdminController.php` — `raciMatrixGet/raciMatrixSave`
  (RBAC admin+ceo+general_director, CSRF, audit_events).
- `mom/scripts/portal/02-state-auth-ui.js` — đăng ký section:
  `moduleAccessAdminTabCatalog()` (~dòng 667), dispatch (~9488), loader (~9548).
- `mom/api/routes/core-routes.php` — cách khai báo route.

## Việc phải làm

### 1. Service `mom/api/services/KpiRegistryAdminService.php`
- `load()`: đọc `kpi-authority-registry.json` làm SSOT cấu trúc; nếu có runtime
  override thì merge theo schema-version gate (copy đúng cơ chế
  RaciMatrixService). Trả về catalog đầy đủ: 33 governance + proposed +
  dashboard + gate metric, kèm thống kê (tổng KPI, theo tier, theo
  `calculation_status`, % có đủ ngưỡng, % có counter-metric, drift status).
- `save(array $incoming, array $actor, string $reason)`: validate (xem mục 4)
  → ghi runtime store → regenerate vùng marker trong ANNEX-122 (các vùng
  `KPI-COMPANY/VALUESTREAM/DEPARTMENT/GATE` tạo ở prompt 02) → bump revision
  DCC tài liệu đổi → ghi `audit_events`.
- `validate()`: mỗi KPI có canonical_code duy nhất; ngưỡng định lượng;
  `reward_eligible:true` ⇒ có counter_metric; `runtime_calculated` ⇒ mã có
  trong KpiEngine.

### 2. Controller + route
- `AdminController`: `kpiRegistryGet()` / `kpiRegistrySave()` — RBAC
  `admin_roles() + ceo + general_director`, `requireCsrf()`, ghi audit.
- `core-routes.php`: `admin_kpi_registry_get` / `admin_kpi_registry_save`.

### 3. Module portal `mom/scripts/portal/00o-admin-kpi-registry.js`
IIFE, đăng ký `window._renderAdminKpiRegistry`. Console dạng **dashboard**:
- Trang tổng quan: thẻ thống kê (tổng KPI, số runtime/staged/manual/retired,
  % đủ ngưỡng, % có counter-metric, số drift), lưới thẻ theo nhóm
  (KPI công ty / value-stream / phòng ban / gate metric / proposed).
- Vào từng nhóm: bảng KPI hiển thị nội dung THẬT (tên, ngưỡng màu, owner,
  trạng thái tính). Sửa tại chỗ ngưỡng/owner/cadence/action/counter-metric
  bằng widget có cấu trúc (input số, dropdown role, dropdown KPI cho
  counter-metric) — **KHÔNG để lộ JSON/HTML thô** (bài học từ RACI Console
  giai đoạn đầu).
- Mỗi KPI hiển thị badge `calculation_status` + nếu `staged` thì nhãn đỏ
  "chưa có data contract".
- Nút "Lưu & đồng bộ tài liệu" → gọi `admin_kpi_registry_save`.
- Bám Graphics Authority tokens (var(--accent), --surface, --border, --text-1…).

### 4. Đăng ký section
Trong `02-state-auth-ui.js` thêm section `kpi_registry` vào nhóm governance,
ngay dưới `raci_matrix`. Thêm loader gọi `_renderAdminKpiRegistry`.

## Tự phản biện bắt buộc
- Console có để lộ JSON thô ở bất kỳ tab nào không? Phải là widget có cấu trúc.
- Lưu từ Console có chạy đúng change-control (cập nhật ANNEX-122 + audit) không?
- RBAC có chặn vai trò không phải admin/ceo không?
- Có hardcode màu/size nào không? Phải qua Graphics Authority.
- save() có schema-version gate để runtime cũ không ghi đè seed mới không?

## Tình huống & cách xử lý
- Phiên Chrome đang là tài khoản không phải admin → verify bằng cách inject
  script `00o-admin-kpi-registry.js` (kỹ thuật ở prompt 09); API tự enforce RBAC.
- save() đụng KPI runtime → KHÔNG cho đổi công thức từ Console (chỉ đổi
  ngưỡng/owner/action); đổi công thức phải qua KpiEngine + prompt 04.
- Console và registry lệch sau deploy → schema-version gate xử lý; nếu vẫn
  lệch, reseed runtime từ registry.

## Definition of Done
- 3 file mới: service, module JS; controller + route cập nhật.
- Console render dashboard + sửa tại chỗ; không lộ JSON thô.
- Lưu chạy đúng change-control + audit_events.
- `php -l`, `node --check` sạch; 3 audit script PASS.
- Deploy xanh; verify Chrome: Console hiển thị đủ KPI, sửa thử 1 ngưỡng + lưu
  + xác nhận ANNEX-122 cập nhật, rồi hoàn tác.
