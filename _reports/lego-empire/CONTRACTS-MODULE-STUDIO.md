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
