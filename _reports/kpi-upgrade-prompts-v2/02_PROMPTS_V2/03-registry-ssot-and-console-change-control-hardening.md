# 03 — Gia cố registry SSOT và change-control của KPI Admin Console

**Loại:** sửa backend service + console + registry/docs nếu cần.  
**Mục tiêu:** Registry seed là SSOT cấu trúc; runtime overlay chỉ là chỉnh vận hành được kiểm soát. Console không được tạo drift hoặc biến KPI draft thành KPI chính thức ngoài change-control.

## 1. Đọc trước

- `KpiRegistryAdminService.php`
- `KpiEngine.php` phần load registry/runtime overlay
- `00o-admin-kpi-registry.js`
- `AdminController.php`
- `core-routes.php`
- `check_kpi_integrity.php`
- RACI service/console để so mẫu
- Gap report prompt 01.

## 2. Kiểm và chuẩn hóa registry schema

Đảm bảo mọi nhóm metric dùng chung schema tối thiểu:
- `canonical_code`, `name`, `name_vi`
- `metric_type`, `tier`, `layer`
- `purpose`
- `formula`
- `thresholds`
- `data_source`
- `owner_role`, `data_stewardship_role`
- `cadence`
- `lead_or_lag`, `paired_metric`
- `decision_action`, `action_reference`, `attribution_rule`
- `counter_metric`
- `reward_eligible`
- `calculation_status`
- `status`

Nếu section gate/proposed/position thiếu field nhưng vẫn là governed metric, bổ sung.

## 3. Schema-version gate

Verify:
- seed registry có `schema_version`.
- runtime overlay có `schema_version`.
- khi seed schema_version > overlay schema_version, overlay bị bỏ qua hoặc migrate an toàn.
- overlay không ghi đè field cấu trúc ngoài allowlist.
- load path của KpiEngine và AdminService dùng cùng logic.

Nếu thiếu, triển khai.

## 4. Harden Console add/retire

Vấn đề cần soi: Console hiện có thể add/retire KPI qua overlay. Điều này hữu ích cho draft nhưng nguy hiểm nếu trở thành chính thức.

Thiết kế lại:

### Option A — nghiêm ngặt nhất
- Console chỉ cho sửa fields allowlist.
- Nút “Thêm KPI” tạo `kpi_change_requests`/draft report, không đưa vào registry effective.
- Nút “Ngừng KPI” cũng tạo change request.
- Official add/retire phải qua code change: registry seed + ANNEX + matrix + guard.

### Option B — nếu cần workflow nhanh
- Overlay-added KPI có `status=draft_change_request`, `is_official_kpi=false`, `scorecard_applicable=false`.
- Không regenerate ANNEX official tables, chỉ hiển thị phần “đề xuất chờ duyệt”.
- Phải có approval state và audit.
- CI guard P0 nếu overlay-added KPI xuất hiện trong scorecard/ANNEX official.

Chọn option phù hợp với kiến trúc hiện tại. Ghi lý do trong report.

## 5. Regenerate ANNEX-122 đủ vùng

Kiểm AdminService hiện regenerate những marker nào:
- `KPI-COMPANY`
- `KPI-VALUESTREAM`
- `KPI-DEPARTMENT`
- `KPI-GATE`

Nếu chỉ §4/§5/§6 mà thiếu §9 gate, bổ sung.
Nếu chưa có marker §9, thêm marker an toàn.
Bảo đảm save từ Console không làm mất tiếng Việt chuyên gia.

## 6. Validate save()

`save()` phải kiểm:
- canonical_code duy nhất.
- thresholds numeric/order.
- reward_eligible cần counter_metric.
- runtime_calculated code phải trong KpiEngine.
- calculation_status không đổi từ Console nếu không phải admin change-control.
- formula/data_source không đổi từ Console.
- owner_role thuộc role catalog.
- cadence hợp lệ.
- gate metrics có linked_cdr hợp lệ.
- action/counter không rỗng.

## 7. Audit events

Mỗi save ghi audit_events:
- actor;
- reason;
- changed fields;
- before/after;
- overlay schema_version;
- annex regenerated flag.

Không ghi raw sensitive tokens.

## 8. Portal UI

UI phải:
- không lộ JSON;
- clearly badge runtime/manual/staged/retired/draft;
- add/retire nếu còn thì ghi “draft change request”, không “lưu chính thức”;
- show warnings if scorecard contains staged;
- show counter_metric next to KPI;
- show data_source/evidence summary read-only;
- use Graphics Authority tokens.

## 9. CI guard bổ sung

- P0: runtime overlay contains structural fields outside allowlist.
- P0: overlay-added official KPI without registry seed.
- P0: ANNEX-122 gate marker missing if gate metrics exist.
- P0: Console editable fields mismatch KpiEngine allowlist.
- P1: Console JS contains raw JSON textarea for KPI edit.

## 10. Tự phản biện

- Có cách nào người dùng admin tạo KPI chính thức nhưng không qua docs/audit không?
- Console save có thể làm ANNEX-122 lệch registry không?
- Runtime overlay stale có thể đè seed mới không?
- Người đọc UI có nhầm KPI draft/staged là KPI scorecard không?

## 11. Definition of Done

- Overlay không thể phá SSOT cấu trúc.
- Console add/retire an toàn theo option chọn.
- ANNEX-122 §9 được sync nếu cần.
- Save validate chặt.
- Audit/guard PASS.
- Report `_reports/kpi/kpi-registry-console-hardening-<date>.md`.
