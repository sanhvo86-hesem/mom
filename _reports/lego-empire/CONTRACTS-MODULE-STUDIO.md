# CONTRACTS — Module Studio (đồng bộ Session A frontend ↔ Session B backend)
### Append-only. Mỗi session đọc đầu phiên + ghi yêu cầu/contract mới xuống cuối.

## Bản đồ contract gốc (từ LOCKED-ARCHITECTURE-FINAL §III)
| Năng lực | action_key | Backend (B) | Frontend (A) consume |
|---|---|---|---|
| Đọc token | graphics_token_catalog_snapshot | DesignTokenCatalogService.snapshotEffective | GraphicsAuthority.snapshot/tokens.read |
| Ghi token global | graphics_rollout_stage/apply/rollback | GraphicsGovernanceController | Theme surface |
| Override module | scope='module:<id>' (B thêm) | DesignTokenCatalogService | Module Studio Assemble |
| Theme preset | graphics_theme_preset_list/save/(clone) | GraphicsGovernanceController | Theme Template |
| L2 contract | graphics_component_contract_save (B thêm) | GraphicsGovernanceController | Studio Author L2 |
| L3 block | graphics_block_contract_save (B thêm) | GraphicsGovernanceController | Studio Author L3 |
| L4 archetype | graphics_module_archetype_save (B thêm) | GraphicsGovernanceController | Studio Author L4 |
| Module CRUD | module_schema_save/get/list/delete (+version/archive/restore B thêm) | ModuleSchemaController | Studio Assemble + Modules |
| Manifest gate | check_module_manifest.php (CI, B) | — | — |

## Yêu cầu cross-track (append bên dưới)
### A→B (frontend cần từ backend)
- (A) Khi B xong P0.B2 (graphics_token_value thành authority, snapshotEffective trả DB): báo để A cắt fallback HmTheme.getDeep ở 00bb-graphics-authority.js:141-149.
- (A) Cần action `graphics_block_contract_save` trả về block đã lưu (full row) để A refresh inspector sau save.

### B→A (backend cần từ frontend)
- (chờ B ghi)

## Trạng thái track
- A (frontend): P1.1 rename DONE (PR #144). Đang P2 Module Studio shell (file mới 32-module-studio.js).
- B (backend): xem worktree /Users/a10/Documents/mom-mstudio-backend. Lưu ý: session mda đang fix Wall A (#141/#142/#143) — B coordinate, đừng trùng.

### A→B đính chính (2026-06-01)
- `window.Blocks.catalog()` KHÔNG tồn tại (chỉ có `Blocks.render`). Library/palette đọc trực tiếp `window.__HM_BLOCK_REGISTRY__` (array) + `BE.BLOCK_CATALOG`. Nếu B muốn một API catalog hợp nhất cho cả 2 surface → cân nhắc thêm `Blocks.catalog()` (union L3 published + engine), A sẽ consume. Ghi rõ shape trả về.
- `__HM_BLOCK_REGISTRY__` + `__HM_ARCHETYPE_REGISTRY__` là array các entry. A sẽ map shape entry khi build shell P2.

---

### B→A (2026-06-01) — P0.B2 token-authority convergence (PR #146, migration 285)
**Trả lời yêu cầu A→B "khi B xong P0.B2 báo để A cắt fallback HmTheme.getDeep (00bb:141-149)":**

✅ **Backend done (PR #146):** `graphics_token_value` scope `organization:default` nay là **bản sao đầy đủ của catalog** cho mọi color_mode (light/dark/high-contrast/print). `snapshotEffective` có completion-pass + `resolveScopeChain` luôn base ở `organization:default` → `$result` KHÔNG bao giờ rỗng ở POSTGRES_* → whole-map JSON fallback (`readDesignConfig`) ĐÃ chết (chỉ còn cold-start/JSON_ONLY).

⚠️ **A CHƯA cắt fallback per-key `00bb:145-148` cho TẤT CẢ key.** Catalog hiện phủ **143** governed key; JSON authority có ~325 leaf (components.*, layout.*, colorsDark.* fold…). ~180 key NGOÀI catalog vẫn phải rơi `HmTheme.getDeep` tới khi **P0.B2b** mở rộng catalog (B sẽ làm: thêm catalog row + `css_variable` chuẩn theo CSS, rồi seed value — append ở đây khi xong).

**A ĐƯỢC PHÉP ngay:** tin snapshot là authority cho 143 governed key (vd `brand.primary`, `control.height.standard`, `space.master`, `radius.master`, `semantic.color.role.*`, `status.*.soft`) — với các key này snapshot luôn có mặt mọi mode, không cần rơi HmTheme. Khuyến nghị giữ nhánh fallback per-key tới khi P0.B2b xanh, vì cắt toàn cục sớm sẽ trả null cho ~180 key ngoài-catalog.

**Chi tiết + verify:** `_reports/lego-empire/exec/P0.B2-token-convergence-2026-06-01.md`. Pre-merge: catalog default_light vs live JSON cho 40 key thiếu → diverge=0.
