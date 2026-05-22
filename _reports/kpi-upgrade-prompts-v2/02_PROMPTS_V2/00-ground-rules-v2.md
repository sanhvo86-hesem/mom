# 00 — Ground rules v2 cho nâng cấp KPI CNC thực chiến

Đọc file này trước mọi prompt trong thư mục `02_PROMPTS_V2/`. Bản v2 kế thừa prompt pack gốc nhưng cập nhật theo repo hiện tại: nhiều hạng mục prompt gốc đã được triển khai một phần hoặc toàn phần. Không được làm lại máy móc; phải audit trạng thái hiện tại trước khi sửa.

## A. Mục tiêu tối hậu

Biến hệ KPI thành công cụ vận hành sống trong xưởng CNC:

- Dự báo và ngăn rủi ro giao hàng, chất lượng, an toàn, tiền mặt.
- Giúp quản đốc, điều độ, QA, engineering, SCM, finance ra quyết định hằng ngày/tuần.
- Bảo vệ cổng G0→G7 bằng evidence định lượng.
- Gắn công bằng với JD/role measures, không biến KPI thành công cụ phạt.
- Chống KPI giấy, chống dashboard rỗng, chống gaming.

## B. Không cố định số KPI

Không có mục tiêu “giữ 33 KPI”. Số KPI cuối cùng là kết quả phân tích. Được phép:
- giữ KPI có quyết định thật;
- thêm KPI còn thiếu cho flow/TOC/gate/quality/risk;
- gộp mã trùng;
- khai tử hoặc hạ cấp KPI vô dụng thành operating metric / role measure / health indicator.

Một KPI tồn tại vì nó giúp một quyết định tốt hơn. Nếu không, bỏ.

## C. Current-state first

Trước mọi stage:

1. Chạy preflight theo repo:
   - đọc `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `AGENTS.md`, `CLAUDE.md`, `.ai/repo-map.json`;
   - chạy `bash tools/ai/preflight.sh` nếu có.
2. Mở trực tiếp các file hiện tại:
   - `mom/data/registry/kpi-authority-registry.json`
   - `mom/api/services/KpiEngine.php`
   - `mom/api/services/KpiRegistryAdminService.php`
   - `mom/scripts/portal/00o-admin-kpi-registry.js`
   - `mom/tools/release/check_kpi_integrity.php`
   - `mom/api/routes/core-routes.php`
   - ANNEX-122/-127/-128/-129/-110, ANNEX-121, WI-202, JD liên quan
3. Không tin baseline cũ nếu repo đã thay đổi. Baseline chỉ là lịch sử; file thật là nguồn sự thật.

## D. Change-control KPI

Mọi thay đổi KPI phải đồng bộ trong cùng change:

1. Registry `mom/data/registry/kpi-authority-registry.json`.
2. `ANNEX-122` vùng bảng liên quan, kể cả §9 gate metrics.
3. `ANNEX-128` regenerate.
4. SOP/WI/JD/ANNEX/training liên quan.
5. `KpiEngine` / data contract / migration nếu tính toán thay đổi.
6. Dashboard/Admin Console nếu cách hiển thị/thao tác thay đổi.
7. Audit report `_reports/kpi/`.
8. CI guard nếu rule mới cần bắt drift.

Không commit “xong” nếu chỉ sửa một bề mặt.

## E. Luật KPI thực chiến

Mỗi KPI chính thức phải có:

- `canonical_code` duy nhất;
- `metric_type` hoặc classification rõ: KPI / operating metric / gate metric / role performance measure / health indicator;
- formula định lượng: tử, mẫu, filter, unit, rounding, direction, min_sample;
- source of record: bảng/cột thật hoặc form/log thật;
- owner có quyền xử lý, không chỉ nhập số;
- cadence và review forum;
- thresholds numeric green/yellow/red với basis;
- decision_action: đỏ thì ai làm gì, trong bao lâu, tại cổng/SOP nào;
- counter_metric chống gaming;
- attribution_rule công bằng;
- calculation_status trung thực: runtime/manual/staged/retired;
- evidence audit.

Không có data/action/counter thì không dùng làm KPI thưởng.

## F. Runtime không được giả

`runtime_calculated` chỉ được dùng khi:

- có hàm `calc*` được wire trong `KpiEngine`;
- có bảng/cột thật đã verify;
- hàm xử lý period rỗng, chia 0, min_sample;
- trả breakdown đủ để hành động;
- API/trend/snapshot hoạt động;
- có test hoặc command kiểm period mẫu.

Nếu thiếu cột/hệ tích hợp: `staged_data_contract`.
Nếu bản chất là diễn tập/checklist định kỳ: `manual_governed` / `manual`.
Nếu không đáng đo: `retired`.

## G. Console không được biến overlay thành SSOT cấu trúc ngầm

Runtime overlay chỉ nên chứa field vận hành có thể chỉnh:
- thresholds;
- owner/data steward;
- cadence;
- decision_action/action_reference;
- counter_metric;
- maybe display grouping.

Không cho overlay tự ý thêm/retire KPI chính thức mà không có change request, registry seed, ANNEX, matrix và audit. Nếu UI có tính năng add/retire, phải:
- ghi rõ là draft change request;
- không được đẩy vào ANNEX chính thức nếu chưa approved;
- không được tính scorecard;
- có audit_events.

## H. Gate G0→G7

Mỗi cổng phải có ít nhất một gate metric định lượng đo điều kiện pass. Mỗi gate metric phải có:

- `gate`;
- `linked_cdr`;
- `gate_pass_condition`;
- owner đúng người có quyền pass/hold cổng;
- threshold/pass rule;
- action nếu không đạt;
- counter metric/evidence integrity guard;
- không trùng mã sai với KPI value-stream; nếu cùng mã thì cross-reference một mã canonical.

## I. Ngôn ngữ và UI

- Backend, SQL identifier, log, comment code, commit: English.
- Tài liệu, nhãn UI, `name_vi`: tiếng Việt có dấu, chuyên gia vận hành xưởng CNC.
- Giữ thuật ngữ chuẩn: OEE, FPY, DPMO, OTD, takt, gate, FAI, PPAP, CAPA, NCR, COPQ, WIP, DSO, MTBF, MTTR, TOC, BSC, Hoshin.
- Không hardcode màu/font/size/spacing; dùng Graphics Authority tokens.

## J. Audit bắt buộc sau mỗi stage

Chạy tối thiểu:

```bash
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
php -l <mọi file PHP sửa>
node --check <mọi file JS sửa>
```

Nếu path `check_kpi_integrity.php` thực tế nằm ở `mom/tools/release/`, dùng đúng path hiện tại.

Audit fail: sửa nguyên nhân gốc, không nới guard để qua.

## K. Báo cáo bắt buộc

Mỗi stage phải tạo report trong `_reports/kpi/`:

- việc đã đọc;
- phát hiện;
- thay đổi;
- tự phản biện 3 vòng;
- audit output;
- rủi ro còn lại;
- việc chưa làm và lý do.

## L. Tự phản biện 3 vòng

Mỗi stage tự hỏi:

1. KPI này có vào đời sống sản xuất hay chỉ làm đẹp tài liệu?
2. Nó có thể bị gaming như thế nào?
3. Nó có làm một bộ phận bị đỏ oan không?
4. Đỏ thì ai có quyền xử lý? Hạn bao lâu?
5. Có counter-metric đủ mạnh chưa?
6. Có nguồn dữ liệu thật chưa?
7. Gate nào vẫn pass không có evidence định lượng?
8. Dashboard/scorecard có số staged hoặc manual chưa được phê duyệt không?
9. UI có làm người dùng tưởng số chưa thật là số thật không?
10. CI guard có bắt được drift tương lai không?

Ghi câu trả lời trong report.

## M. Definition of Done chung

Một stage chỉ hoàn thành khi:

- Git diff đúng phạm vi.
- Registry/ANNEX/matrix/engine/docs đồng bộ nếu đụng KPI.
- 3 audit script PASS.
- KPI integrity guard PASS hoặc ghi rõ P1 warnings.
- `php -l`/`node --check` sạch.
- Nếu có UI/API: verify bằng browser/API.
- Report stage đầy đủ.
- Không còn phát hiện P0 chưa giải quyết trong phạm vi stage.
