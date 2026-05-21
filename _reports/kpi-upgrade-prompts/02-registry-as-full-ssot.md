# 02 — Registry trở thành SSOT đầy đủ của KPI

**Loại:** sửa registry + service + tài liệu. **Stage 1.**
**Tiên quyết:** prompt 01 đã tạo `kpi-deep-audit-<ngày>.md`.

## Vấn đề
Hiện `annex122_governance_kpis` trong registry mỗi mục chỉ có
`{no, canonical_code, name, tier, status}`. Định nghĩa thật (công thức, ngưỡng,
owner, nguồn dữ liệu) nằm rải rác trong ANNEX-122 dạng văn bản → không máy đọc
được, dễ drift. Registry phải là **SSOT đầy đủ, máy đọc được** giống vai trò
`raci_matrix.bootstrap.json` của đợt RACI.

## Việc phải làm

### 1. Thiết kế schema KPI đầy đủ
Mỗi KPI trong registry phải mang đủ field (đặt trong `annex122_governance_kpis`,
`proposed_operating_metrics`, `dashboard_core_kpis` — dùng chung schema):
```
{
  "canonical_code": "OTD",
  "name": "On-Time Delivery",
  "name_vi": "Giao hàng đúng hạn",
  "tier": "company|value_stream|department|gate",
  "layer": "bsc_monthly|toc_weekly|lean_daily|qms_mes_gate",
  "purpose": "Đo để quyết định gì — 1 câu.",
  "formula": {
    "numerator": "...", "denominator": "...", "unit": "%|h|day|ppm|VND|count",
    "rounding": "...", "exclusions": "...", "direction": "higher_is_better|lower_is_better",
    "min_sample": 0
  },
  "thresholds": { "green": "...", "yellow": "...", "red": "..." },
  "data_source": { "system": "ERP|MOM|MES|EQMS|form",
    "tables": ["..."], "columns": ["..."], "evidence": "FRM-xxx / log" },
  "owner_role": "...", "data_stewardship_role": "...",
  "cadence": "per-event|daily|weekly|monthly",
  "lead_or_lag": "lead|lag", "paired_metric": "<code đối ứng>",
  "decision_action": "Đỏ thì ai làm gì, hạn nào.",
  "counter_metric": "<code> hoặc null",
  "reward_eligible": true|false,
  "calculation_status": "runtime_calculated|staged_data_contract|manual|retired",
  "status": "retained|new|retired"
}
```
Schema này phải được KpiEngine `enrichCatalogGovernance` đọc được — kiểm
`applyDataContract / applyConsequence / applyScorecardRules` để khớp tên field;
nếu lệch, đổi field name cho khớp engine (đừng đổi engine trừ khi cần).

### 2. Điền đầy đủ 33 governance KPI
Lấy nội dung định nghĩa từ ANNEX-122 §1–§9 + report audit prompt 01. Với mỗi
KPI: copy công thức/ngưỡng/owner/nguồn từ ANNEX-122 vào registry. Nếu ANNEX-122
thiếu (nhiều KPI sẽ thiếu) → đánh dấu `calculation_status: staged_data_contract`
và ghi `data_source` còn trống — prompt 04 sẽ hoàn tất. KHÔNG bịa số.
- KPI runtime (19 mã trong `runtime_calculated_metrics`): `calculation_status`
  = `runtime_calculated`; công thức phải KHỚP đúng hàm `calc*` tương ứng trong
  KpiEngine. Đọc hàm để chép đúng tử/mẫu, đừng tự nghĩ.
- KPI không có hàm `calc*`: `staged_data_contract` hoặc `manual`.

### 3. Bump `version` và `schema_version`
Thêm field `schema_version` (số nguyên) vào registry. Tăng nó (ví dụ 1→2). Đây
là khóa để KpiEngine bỏ qua runtime snapshot cũ khi schema đổi — copy cơ chế
"schema-version gate" từ `RaciMatrixService::load()` (so `schema_version` của
seed với runtime; seed mới hơn thì bỏ runtime cũ). Nếu KpiEngine chưa có cơ chế
này, thêm vào chỗ load registry/snapshot.

### 4. Đồng bộ ANNEX-122
Sửa các bảng §4/§5/§6/§9 trong ANNEX-122 để TỪNG ô khớp 100% registry. Bọc mỗi
bảng KPI bằng cặp marker để về sau sinh tự động được (giống RACI):
`<!-- KPI-COMPANY:START --> ... <!-- KPI-COMPANY:END -->`,
tương tự `KPI-VALUESTREAM`, `KPI-DEPARTMENT`, `KPI-GATE`.

### 5. Regenerate ANNEX-128 + chạy audit
`php tools/scripts/kpi/audit-kpi-system-matrix.php` (sinh lại ANNEX-128) +
2 audit script còn lại. Tất cả PASS.

## Tự phản biện bắt buộc
- Có KPI nào sau khi điền field vẫn không có `data_source` thật? → đánh dấu để
  prompt 04, đừng giả vờ đủ.
- Công thức registry có khớp 100% hàm `calc*` của KpiEngine không? Lệch = drift.
- `schema_version` đã tăng và KpiEngine có gate xử lý chưa?
- ANNEX-122 sau sửa có còn ô nào lệch registry không?

## Tình huống & cách xử lý
- ANNEX-122 và registry mâu thuẫn target → registry thắng nếu khớp KpiEngine;
  nếu cả hai lệch engine → engine là sự thật runtime, ghi finding cho prompt 04.
- KPI có alias cũ → giữ trong `legacy_aliases`, không xóa (dashboard cũ còn dùng).
- Field schema mới làm KpiEngine catalog vỡ → sửa engine đọc field mới, có
  fallback giá trị mặc định, `php -l` sạch.

## Definition of Done
- Registry: mọi KPI có đủ field schema; `schema_version` tăng.
- KpiEngine đọc được schema mới; `php -l` sạch; `kpi_catalog` API trả đúng.
- ANNEX-122 khớp registry, có marker vùng; ANNEX-128 regenerated.
- 3 audit script PASS.
- Commit cặp (code+registry; docs) → push → deploy xanh → verify
  `GET /api/kpi/catalog` trên Chrome trả schema mới.
