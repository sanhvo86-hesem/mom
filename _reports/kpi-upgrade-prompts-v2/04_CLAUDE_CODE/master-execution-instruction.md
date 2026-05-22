# Master instruction để chạy Claude Code trong repo MOM

Dán toàn bộ instruction này vào Claude Code khi bắt đầu nâng cấp KPI.

---

Bạn đang làm trong repo `sanhvo86-hesem/mom`. Mục tiêu là nâng cấp hệ KPI cho công ty gia công CNC thành KPI thực chiến: tính được từ dữ liệu thật hoặc manual-governed có evidence, có ngưỡng, action, owner, counter-metric, công bằng, chống gaming, bảo vệ giao hàng/chất lượng/tiến độ/hiệu quả/rủi ro.

## 1. Đọc trước

Mở theo thứ tự:

1. `_reports/kpi_cnc_practical_upgrade_prompt_pack_v2/README.md` hoặc thư mục prompt pack v2 tương ứng nếu đã copy vào repo.
2. `02_PROMPTS_V2/00-ground-rules-v2.md`
3. Toàn bộ `01_RESEARCH/`
4. `00_ORIGINAL_UPLOADED_BASELINE/README.md`
5. Repo files:
   - `.ai/AI-WORKFLOW.md`
   - `.ai/CONVENTIONS.md`
   - `AGENTS.md`
   - `CLAUDE.md`
   - `.ai/repo-map.json`
   - `mom/data/registry/kpi-authority-registry.json`
   - `mom/api/services/KpiEngine.php`
   - `mom/api/services/KpiRegistryAdminService.php`
   - `mom/api/controllers/AdminController.php`
   - `mom/api/controllers/DashboardController.php`
   - `mom/api/routes/core-routes.php`
   - `mom/scripts/portal/00o-admin-kpi-registry.js`
   - `mom/tools/release/check_kpi_integrity.php` hoặc `tools/release/check_kpi_integrity.php`
   - ANNEX-121/-122/-127/-128/-129/-110
   - WI-202
   - representative JD files.

## 2. Preflight

Chạy:

```bash
bash tools/ai/preflight.sh || true
git status --short
```

Nếu preflight không tồn tại hoặc lỗi môi trường, ghi vào report và tiếp tục an toàn.

## 3. Không làm theo baseline cũ một cách máy móc

Baseline gốc nói nhiều việc “cần xây”; repo hiện có thể đã có:
- registry schema_version;
- 28 runtime metrics;
- KPI Admin Console;
- manual input route;
- CI guard.

Luôn audit file thật trước. Nếu việc đã xong, không xây lại; hãy harden/đóng gap còn lại.

## 4. Thứ tự thực thi

Thực hiện prompts trong `02_PROMPTS_V2/`:

1. `01-current-state-audit-and-gap-map.md`
2. `02-metric-taxonomy-and-scorecard-rationalization.md`
3. `03-registry-ssot-and-console-change-control-hardening.md`
4. `04-data-contract-and-db-map-verification.md`
5. `05-runtime-calculator-graduation-for-cnc-operations.md`
6. `06-gate-cdr-quality-and-customer-escape-hardening.md`
7. `07-fair-reward-role-measures-and-jd-scorecards.md`
8. `08-dashboard-tier-meeting-manual-input-and-admin-ux.md`
9. `09-ci-integrity-guard-hardening.md`
10. `10-vietnamese-rewrite-and-audit-readiness.md`
11. `11-final-deploy-live-verify-training.md`

Nếu chạy song song, dùng `03_PARALLEL_TRACKS/`.

## 5. Quy tắc code

- Không đoán tên bảng/cột. Verify `.ai/db-map/`.
- Không hardcode thresholds trong engine nếu registry là SSOT.
- Không đưa staged KPI vào scorecard active.
- Không để overlay add/retire KPI official ngoài change-control.
- Không sửa VPS trực tiếp ngoài quy trình repo/deploy.
- Không xóa alias cũ nếu dashboard/docs còn tham chiếu.
- Không đổi số/mã trong Vietnamese rewrite.

## 6. Validation

Sau mỗi stage:

```bash
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php || php tools/release/check_kpi_integrity.php
php -l <PHP files changed>
node --check <JS files changed>
```

Nếu fail, sửa nguyên nhân gốc. Không nới guard để pass.

## 7. Reports

Mỗi stage tạo report trong `_reports/kpi/`, gồm:
- file đã đọc;
- thay đổi;
- command output;
- tự phản biện;
- P0/P1/P2;
- next actions.

## 8. Commit/deploy

Theo `CLAUDE.md` và repo workflow. Tối thiểu:
- commit code/registry;
- commit docs nếu hook yêu cầu `ALLOW_DOC_COMMIT=1`;
- push;
- chờ CI/deploy xanh;
- browser/API verify.

## 9. Definition of Done cuối

- Không KPI chính thức mập mờ trạng thái.
- Executive scorecard không tính staged.
- Gate G0→G7 có metric linked CDR.
- Runtime calculators chỉ dùng data verified.
- Manual metrics có input/evidence/audit.
- Counter-metric visible và enforced for reward.
- CI guard bắt drift.
- Tài liệu tiếng Việt sạch.
- Final summary report đầy đủ.
