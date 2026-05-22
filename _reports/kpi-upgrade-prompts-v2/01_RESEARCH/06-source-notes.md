# Source notes — repo, prompt pack, và nghiên cứu bên ngoài

Tài liệu này ghi nguồn để Claude Code biết phải kiểm lại ở đâu. Khi thực thi trong repo, không được chỉ dựa vào file nghiên cứu này; phải mở file thật và verify.

## 1. Repo MOM đã kiểm tra

Repository: `sanhvo86-hesem/mom`.

Các file trọng yếu đã quan sát:

- `mom/api/services/KpiEngine.php`
  - Có 28 runtime metrics trong `ALL_METRICS`.
  - Có `KPI_AUTHORITY_REGISTRY_PATH` và `KPI_AUTHORITY_REGISTRY_RUNTIME_PATH`.
  - `calculateKpi()` route non-runtime sang `calculateFromManualInput()`.
  - Có insufficient-data gate dựa trên `sample_size` và `formula.min_sample`.
  - `getMetricCatalog()` merge runtime/governance/proposed/dashboard/gate.
  - `getKpiTarget()` ưu tiên registry threshold target.
- `mom/data/registry/kpi-authority-registry.json`
  - Có `schema_version` 16.
  - `runtime_calculated_metrics` đã liệt kê 28 metric.
  - Governance KPI có schema đầy đủ: formula, thresholds, data_source, owner, cadence, action, counter_metric.
  - Có nhiều position/role metrics `POS_*`, chủ yếu manual.
  - Có `gate_control_metrics` với `gate`, `linked_cdr`, `gate_pass_condition`.
- `mom/api/services/KpiRegistryAdminService.php`
  - Console backend dùng seed registry là SSOT cấu trúc.
  - Runtime overlay chỉ chứa editable fields.
  - Có thêm/ngừng KPI qua overlay; đây là điểm cần harden để không biến overlay thành SSOT cấu trúc ngầm.
  - Regenerate ANNEX-122 marker regions hiện mô tả §4/§5/§6; cần kiểm §9.
- `mom/scripts/portal/00o-admin-kpi-registry.js`
  - KPI Admin Console đã tồn tại.
  - Sửa bằng widget có cấu trúc, không lộ JSON.
  - Có add/retire KPI draft.
- `mom/tools/release/check_kpi_integrity.php`
  - CI guard đã tồn tại.
  - Comment vẫn còn cụm “33 governance KPIs”; cần sửa để không khóa tư duy.
  - P1 `unit === '%'` có thể bỏ sót registry dùng `"percent"`.
- `mom/api/routes/core-routes.php`
  - Có admin KPI routes và KPI input/catalog/trend/badge/scorecard routes.

## 2. Uploaded prompt pack

Các file baseline trong `00_ORIGINAL_UPLOADED_BASELINE/` là bản gốc người dùng đã gửi. Bản v2 không thay thế nội dung đó; nó bổ sung lớp nghiên cứu mới, cập nhật theo trạng thái repo hiện tại và tạo prompt chi tiết hơn cho Claude Code.

Điểm bắt buộc giữ:
- Không cố định số KPI.
- Không tính được thì không giả KPI.
- Mỗi KPI phải có action, owner, counter-metric, lead/lag, dữ liệu/evidence.
- Change-control phải đồng bộ registry, ANNEX-122, ANNEX-128, tài liệu liên quan, engine/data contract, reports.
- Gate metrics phải bảo vệ G0→G7.

## 3. External research principles

Nguồn public đã dùng để xây framework:

- NIST Baldrige Excellence Framework:
  - Dùng làm khung quản trị hiệu suất tổng thể: leadership, strategy, customers, measurement, workforce, operations, results.
  - Bài học: KPI không chỉ đo số; phải liên kết với agility, risk management, supply-chain resilience, workforce, sustainability và kết quả.
- ISO 9000 / ISO 9001 public page:
  - Dùng cho nguyên tắc QMS: customer focus, leadership/top management, process approach, continual improvement.
- ISA-95:
  - Dùng làm tư duy phân lớp ERP/MOM/MES và không trộn mọi KPI vào một tầng.
- NIST Engineering Statistics Handbook:
  - Dùng để nhấn mạnh capability/quality KPI cần process stable và cỡ mẫu đủ; tránh tô màu đỏ/xanh với mẫu quá nhỏ.
- OEE.com:
  - Dùng cho cách tách OEE thành Availability, Performance, Quality; downtime planned/unplanned/changeover phải tách để action được.
- APQP/PPAP/FAI public references:
  - Dùng cho gate engineering/control plan/PFMEA/FAI/PPAP; prompt phải yêu cầu xác minh trong tài liệu và DB/form thật, không copy tiêu chuẩn.

## 4. Không làm

- Không chép nội dung tiêu chuẩn bản quyền.
- Không tự bịa benchmark thành “chuẩn chính thức”.
- Không dùng KPI count làm mục tiêu.
- Không cho Claude Code sửa production/VPS trực tiếp bằng tay ngoài git/deploy.
