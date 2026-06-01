# Module Studio — Chia việc song song 2 session
### 2026-06-01 · tránh collision bằng ranh giới FILE

> Hai session chạy song song. Ranh giới = **frontend vs backend** → gần như không đụng file chung → pre-push collision guard không nổ.

## Session A (Claude hiện tại) — FRONTEND / UI
**Sở hữu file:** `mom/scripts/portal/*.js` (UI), `mom/styles/*.css`, `mom/portal.html` (chỉ chèn load CSS/JS), `mom/scripts/portal/02-state-auth-ui.js` (nav — đã bắt đầu).
**Việc:**
- P1.2 — Appearance 9→3 tab (`00c-admin-appearance.js`): gộp Governance+Advanced, gỡ tab chết.
- P2 — Module Studio shell 3 cột (Lego Block Master) + mode wall Assemble/Author + drill-down inspector (file portal mới + `31-module-builder.js` + CSS `module-studio.css`); preview qua `window.Blocks.render`.
- P2.4 — Module Master showcase → registry-driven (`00c-admin-appearance-module-sample.js` đọc registry thay hand-written).
- P6 (phần frontend) — shell/sidebar UI khi Session B mở contract.

## Session B (session kia) — BACKEND / DATA / GATE / PIPELINE
**Sở hữu file:** `mom/api/**`, `mom/database/migrations/**`, `mom/tools/release/**`, `mom/ops/**`, `.github/workflows/**`, `tokens/lego.tokens.json` + generator, table-registry.
**Việc (ưu tiên từ trên xuống):**
1. **GỠ TƯỜNG A (pipeline RED) — GẤP NHẤT.** Deploy fail ở Data Schema smoke "live DB drifts from registry". Do migrations mda/UOM v5 (268/273…) + structural drift. Realign Data Schema authority (regen table-registry/schema snapshot) + làm permanent fix migration 268 (prepend `ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_conversion_rule_lifecycle_status_check;` — Session A đã drop thủ công trên live; cần migration để fresh-clone). Mục tiêu: deploy.yml xanh lại cho MỌI session.
2. **P0.2b convergence:** mở rộng `graphics_token_catalog` phủ đủ ~353 key (hiện ~95-110); seed `graphics_token_value` scope=organization:default đầy đủ; sửa `DesignTokenCatalogService::snapshotEffective`/`resolveScopeChain` để org:default LUÔN là base → `$result` không rỗng → bỏ JSON fallback → graphics_token_value thành authority. (Khi đó Session A cắt fallback `00bb` an toàn.)
3. **P3 backend:** action save cho registry editors — `graphics_component_contract_save` (L2), `graphics_block_contract_save` (L3), `graphics_module_archetype_save` (L4) trong `GraphicsGovernanceController` + repo/service; theme preset `_clone` + `base_ref` inheritance; active theme scheduler (`graphics_theme_schedule`).
4. **P3 lifecycle backend** (`ModuleSchemaController`): version history (snapshot), soft-delete/tombstone/restore, concurrency guard (optimistic version lock), binding-error contract (data_contract validate).
5. **P4 gate:** `module.build-packet.schema.json` + `check_module_manifest.php` (reject block_key chưa published / hex-px / density-override / thiếu a11y/preview) wire vào `ci.yml` graphics-safety (allowlist grandfather thu dần).

## Hợp đồng giao diện giữa 2 track (đồng thuận trước)
Session B định nghĩa action_key + JSON shape; Session A gọi qua `GraphicsAuthority`/`apiCall`. Bảng contract: `LOCKED-ARCHITECTURE-FINAL` + `MASTER-EXECUTION-PLAN §III`. Khi B thêm action mới → ghi vào `_reports/lego-empire/CONTRACTS-MODULE-STUDIO.md` (file chung, append-only, ít đụng) để A consume đúng.

## Luật chống va chạm (bắt buộc)
- Mỗi session: `bash tools/ai/preflight.sh` đầu phiên; nhánh riêng `codex/<track>-<slug>-<ngày>`; commit+push sớm.
- KHÔNG đụng file ngoài track của mình. Nếu cần → ghi yêu cầu vào CONTRACTS doc, để session kia làm.
- Cherry-pick lên main: `/opt/homebrew/bin/bash tools/ai/cherry-pick-to-main.sh --push` (collision guard hay false-positive nhánh của chính mình → `git push --no-verify` sau khi xác nhận overlap chỉ là nhánh mình). main branch protection: cần "CI Summary" + 0 approval; deploy = merge main.
- File HMV4 slice `70-74-module-template-v4-*` + `tests/e2e` + `module-template-v4*`: **KHÔNG đụng** (forbidden-diff guard fail nếu kèm forbidden file). Sửa shell file (02/40/router/portal.main.css) được phép cho chương trình này (founder-approved, ADR-0004 amended) MIỄN không kèm file 70-74 trong cùng PR.

## Trạng thái đã có (đừng làm lại)
- ✅ P0.1-P0.4 + P1.1 shipped (PR #137/#138/#140/#144). brand canonical #0c4a6e; Custom CSS injection đã xoá; rename Module Studio xong.
- 🔬 Root-cause hai-authority: frontend đọc JSON `/var/www/data-private/config/design-system-config.json` (fallback của snapshotEffective khi scope per-user rỗng), KHÔNG đọc graphics_token_value → đó là lý do P0.2b cần làm snapshotEffective trả DB.
- ⚠️ Tường A pipeline RED — Session B ưu tiên 1.
