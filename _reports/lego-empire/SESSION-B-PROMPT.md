Bạn là một session AI chạy SONG SONG với một session khác trên cùng repo HESEM MOM (PHP 8.5 + PostgreSQL, deploy qua GitHub Actions tới VPS eqms.hesemeng.com). Một chương trình tái kiến trúc tên **"Module Studio"** đang được thực thi. Session kia lo **FRONTEND/UI**. **BẠN lo BACKEND / DATA / CI-GATE / PIPELINE.** Không được đụng file của track kia (chống va chạm multi-AI).

## ĐỌC TRƯỚC (bắt buộc, theo thứ tự)
1. `bash tools/ai/preflight.sh` (đầu phiên — ghi branch base, bật githooks, cảnh báo collision).
2. `_reports/lego-empire/PARALLEL-SPLIT-2026-06-01.md` (ranh giới file 2 track + luật chống va chạm).
3. `_reports/lego-empire/LOCKED-ARCHITECTURE-FINAL-2026-06-01.md` (kiến trúc đã khoá: 2 bề mặt Theme/Module Studio/Governance, 6 lớp L0-L5, 1 write-path/lớp, dùng bảng đã có).
4. `_reports/lego-empire/MASTER-EXECUTION-PLAN-2026-06-01.md` (cổng chuẩn mỗi bước + §III bản đồ contract backend↔frontend).
5. `_reports/lego-empire/exec/P0.2-discovery-2026-06-01.md` (root-cause hai-authority: snapshotEffective fallback sang JSON design-config).
6. `CLAUDE.md` (luật: không sed/vi config; PDO dùng `?` không `$N`; bảng mới phải vào table-registry.json; KHÔNG `git reset --hard` trên VPS; deploy gate chain).

## SCOPE CỦA BẠN — chỉ sửa các file này
`mom/api/**` · `mom/database/migrations/**` · `mom/tools/release/**` · `mom/ops/**` · `.github/workflows/**` · `tokens/lego.tokens.json` + generator · table-registry. **TUYỆT ĐỐI không** sửa `mom/scripts/portal/*.js`, `mom/styles/*.css`, `mom/portal.html`, `02-state-auth-ui.js` (đó là track frontend của session kia). **KHÔNG** đụng file `70-74-module-template-v4-*`, `tests/e2e`, `module-template-v4*` (forbidden-diff guard).

## VIỆC (ưu tiên trên→xuống)
**[P0.B1 — GẤP NHẤT] Gỡ pipeline RED.** Deploy hiện FAIL ở "Data Schema live-DB smoke": *"Live DB structure still drifts from registry authority"* / *"db_target_status != aligned"* (`mom/ops/vps/run-db-migrations.sh:146-195` gọi `MOM\Services\DataSchemaService::getWorkspace`). Nguyên nhân: migrations mda/UOM v5 (268_uom_v5_manifest_human_approval_lock, 273_runtime_requirement_resolver…) thêm/đổi structure mà registry authority chưa khớp. VIỆC: (a) chẩn đoán chính xác structural_drift/missing tables (chạy DataSchemaService smoke với FPM DB env trên VPS: `ssh eqms`, peer-auth psql: `sudo -n -u postgres psql -d mom`); (b) realign — regen table-registry/schema-snapshot cho các bảng v5 (theo memory project_deploy_gate_chain: "regen table-registry.json (fix inferDomain) + verify smoke với FPM DB env"); (c) thêm migration corrective `269+` idempotent: `ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_conversion_rule_lifecycle_status_check;` (constraint cũ orphaned mà mig 231 định drop nhưng trượt; đã drop tay trên live, cần migration cho fresh-clone). MỤC TIÊU: `deploy.yml` xanh lại cho MỌI session. **Phối hợp:** nếu session mda đang active sửa cùng vùng → coordinate, đừng ghi đè.

**[P0.B2] Convergence một-token-authority (P0.2b).** Hiện `snapshotEffective` (DesignTokenCatalogService:163-200) khi scope chain per-user (user/role) rỗng → fallback `readDesignConfig()` = JSON `/var/www/data-private/config/design-system-config.json` → frontend đọc JSON, KHÔNG đọc graphics_token_value. VIỆC: (a) mở rộng `graphics_token_catalog` phủ đủ các key đang dùng (~353; hiện ~95-110) qua migration mới; (b) seed `graphics_token_value` scope=organization:default đầy đủ từ catalog defaults (idempotent, kiểu mig 148:511-533); (c) sửa `resolveScopeChain` để organization:default LUÔN là base của chain → `$result` không rỗng → trả DB → JSON fallback không chạy. Verify: `graphics_token_catalog_snapshot` trả từ DB. (Sau đó báo session A để họ cắt fallback `HmTheme.getDeep` trong `00bb` — đó là file của họ.)

**[P3.B] Registry editor backend.** Thêm action save (POST) + repo/service cho: `graphics_component_contract_save` (L2 overridable_tokens/states/a11y), `graphics_block_contract_save` (L3 composed_of/slots/variant_axes/required_tokens/a11y/preview_scene), `graphics_module_archetype_save` (L4 zones/required_blocks/forbidden_patterns). Dùng bảng đã có (mig 148/261/262). + `graphics_theme_preset_clone` + `base_ref` inheritance resolution + active scheduler (`graphics_theme_schedule`). Tất cả qua DataSyncMutationService nếu ghi runtime config; audit_events mỗi mutation.

**[P3.B-lifecycle] Module lifecycle backend** (`ModuleSchemaController` + repo): version history (lưu snapshot mỗi save, KHÔNG ghi đè mù — hiện overwrite), soft-delete/tombstone/restore (thêm status field, thay HARD `@unlink`), concurrency guard (optimistic version lock — hiện last-write-wins mất việc âm thầm), binding data_contract validate.

**[P4.B] Build Packet + manifest gate.** Định nghĩa `module.build-packet.schema.json` (manifest: archetype_key + theme_preset_key + zones[block_key,slots,data], zero style). Viết `mom/tools/release/check_module_manifest.php`: reject block_key chưa published trong registry, hex/px literal, density override ngoài theme, thiếu a11y/preview_scene. Wire vào `.github/workflows/ci.yml` job graphics-safety. Allowlist grandfather thu dần (cây hiện tại còn literal — đừng bật blocking ngay).

## CỔNG CHUẨN MỖI BƯỚC (bắt buộc)
nhánh `codex/sessionB-<slug>-<ngày>` từ origin/main → chốt contract (action_key/column/JSON) → build → self-audit (SSOT/no-hardcode/RBAC/a11y/contract) → phản biện đa chiều (try-to-refute) → chạy gate local (`php mom/tools/release/check_migration_drift.php`, các check_* liên quan) → commit → cherry-pick lên main (`/opt/homebrew/bin/bash tools/ai/cherry-pick-to-main.sh --push`; collision guard hay false-positive nhánh của chính mình → `git push --no-verify`) → mở PR (`gh pr create --base main`) → chờ CI "CI Summary" xanh → merge (`gh pr merge --squash`; 0 approval) → deploy.yml chạy → verify (DB query trên VPS / snapshot API) → ghi `_reports/lego-empire/exec/<step>.md`. KHÔNG đi tiếp khi chưa verify.

## GOTCHAS QUAN TRỌNG (đã trả giá để biết)
- PDO native KHÔNG bind `$N` Postgres → graphics write layer no-op âm thầm; dùng `?` 1-indexed (xem memory feedback_pdo_dollar_placeholder_bug). DataLayer hiện dùng `$N` qua abstraction — kiểm trước khi viết SQL service.
- Bảng MỚI phải đăng ký `table-registry.json` hoặc deploy smoke fail.
- Migration mới: số kế tiếp (đang ~273+, kiểm `ls mom/database/migrations | grep -oE '^[0-9]+' | sort -n | tail`); idempotent + guarded; pass `check_migration_drift.php`.
- VPS DB query: `ssh eqms 'sudo -n -u postgres psql -d mom -c "..."'` (peer auth OK). Live = POSTGRES_ONLY → backfill additive idempotent, KHÔNG destructive reseed; backup `data-private` trước thao tác rủi ro.
- KHÔNG `git reset --hard`/sed/vi config trên VPS. Runtime config sửa qua DataSyncMutationService.

## ĐỒNG BỘ VỚI SESSION A
Khi thêm/đổi action_key hoặc JSON shape → append vào `_reports/lego-empire/CONTRACTS-MODULE-STUDIO.md` (tạo nếu chưa có; append-only) để session A consume đúng. Đọc file đó đầu mỗi phiên xem A có yêu cầu gì.

BẮT ĐẦU bằng preflight + đọc 6 tài liệu, rồi vào **P0.B1 (gỡ pipeline RED)** trước tiên vì nó chặn verify của cả hai session. Chạy autonomous tới khi xong, mỗi bước qua trọn cổng chuẩn, dừng nếu gặp lỗi/rủi ro cross-session.
