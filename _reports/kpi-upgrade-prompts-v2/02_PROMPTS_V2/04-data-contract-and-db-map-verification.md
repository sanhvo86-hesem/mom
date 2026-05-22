# 04 — Verify data contract và DB map cho toàn bộ KPI

**Loại:** nghiên cứu + registry/data-contract update; chỉ viết code/migration khi được xác nhận cần.  
**Mục tiêu:** Không còn KPI mập mờ. Mỗi metric có trạng thái dữ liệu trung thực và backlog rõ.

## 1. Đọc trước

- Gap report prompt 01.
- Taxonomy prompt 02.
- `01_RESEARCH/03-data-contract-catalog.md`.
- `.ai/db-map/`.
- `KpiEngine.php`.
- registry.

## 2. Lập bảng data contract toàn bộ

Với mỗi metric official KPI, operating metric quan trọng, gate metric, role measure quan trọng:

| Code | Type | Decision | Formula | Tables | Columns | Verified? | Evidence | Runtime/manual/staged/retired | Missing | Next action |
|---|---|---|---|---|---|---|---|---|---|---|

## 3. Verify source thật

Quy trình từng KPI:
1. Đọc formula trong registry.
2. Tìm bảng trong `.ai/db-map/index.json`.
3. Mở file domain để xác nhận cột.
4. Nếu engine đang query bảng/cột không có trong db-map, kiểm migration/schema thật nếu có.
5. Ghi kết luận:
   - verified;
   - partial;
   - absent;
   - external ERP not integrated;
   - manual form only.

## 4. Quyết định trạng thái

- `runtime_calculated`: đủ source + calc function + trend/snapshot.
- `manual_governed`: có form/log/audit trail; không có transaction tự nhiên.
- `staged_data_contract`: thiếu bảng/cột/hệ tích hợp/hàm.
- `retired`: không quyết định hoặc không đáng đo.
- `health_indicator`: theo dõi awareness, không score.

Không để `calculation_status` trống hoặc mơ hồ.

## 5. Ưu tiên staged backlog

Gắn `data_contract_backlog` cho staged:
- missing_table;
- missing_columns;
- external_integration_needed;
- form_needed;
- owner;
- target_date;
- expected_runtime/manual;
- P0/P1/P2.

P0 nếu ảnh hưởng:
- gate pass/fail;
- executive scorecard;
- delivery/quality/safety;
- dashboard core.

## 6. Manual input governance

Nếu manual:
- có `input_endpoint`;
- có form/schema hoặc `kpi_manual_inputs`;
- có evidence_ref;
- có approval/review status;
- có cadence;
- có owner nhập và owner duyệt khác nhau nếu dùng reward;
- dashboard hiển thị manual badge;
- CI guard không coi manual là thiếu calc.

## 7. Migration decision

Chỉ tạo migration khi:
- KPI thật sự quan trọng;
- bảng/cột thiếu có nghiệp vụ rõ;
- không phá dữ liệu cũ;
- có default/null an toàn;
- có rollback/compatibility;
- đã kiểm `check_migration_drift.php`.

Nếu integration ERP/Epicor ngoài MOM: không tạo cột giả để “cho có”; để staged và ghi integration contract.

## 8. Đồng bộ registry/docs

Cập nhật:
- registry status/backlog/evidence;
- ANNEX-122 notes nếu KPI staged/manual;
- dashboard badges;
- ANNEX-128 regenerate.

## 9. Tự phản biện

- Có KPI nào bị đánh runtime chỉ vì có bảng gần giống?
- Có source nào chỉ là snapshot cũ, không phải transaction thật?
- Manual KPI có trở thành đường tắt né runtime không?
- Có KPI P0 gate/scorecard còn staged không? Vì sao?

## 10. Definition of Done

- Data contract matrix đầy đủ.
- Không calculation_status mập mờ.
- Staged có backlog thật.
- Manual có governance.
- Audit/guard PASS.
- Report `_reports/kpi/kpi-data-contract-verification-<date>.md`.
