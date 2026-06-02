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

---

### B→A (2026-06-01) — P3.B registry editor SAVE actions (L2/L3/L4 + theme preset clone)
**Đáp ứng yêu cầu A→B "graphics_block_contract_save trả full row để refresh inspector":** ✅ mọi save trả full row sau ghi.

Backend mới (`GraphicsGovernanceController` + `DesignTokenCatalogService`, DB-backed, write qua `?`+pgParams, audit_events mỗi mutation). Tất cả write cần `requireWriteRequest` (CSRF + write perm); read cần `requireGraphicsRead`.

| action_key | method | body (POST JSON) | trả về |
|---|---|---|---|
| `graphics_component_contract_save` | POST | `{contract:{component_key, display_name_en, display_name_vi, description?, overridable_tokens:[token_key…], inherits_from?, preview_scene_key?, is_operator_visible?:bool, a11y_requirements?:{}}}` (hoặc field phẳng) | `{ok, contract:<full row>}` |
| `graphics_block_contract_list` | GET `&status=` | — | `{ok, blocks:[…]}` |
| `graphics_block_contract_save` | POST | `{block:{block_key, display_name_en, display_name_vi, category:layout\|display\|feedback\|navigation\|input, status:draft\|review\|published\|deprecated, composed_of:[o3-class…], root_class?, slots:{}, variant_axes:{}, required_tokens:[token_key…], a11y_contract:{}, preview_scene_key?, deprecation_note?}}` | `{ok, block:<full row>}` |
| `graphics_module_archetype_list` | GET `&status=` | — | `{ok, archetypes:[…]}` |
| `graphics_module_archetype_save` | POST | `{archetype:{archetype_key, display_name_en, display_name_vi, route_class, status, zones:{zone:{block,required,desc}}, zone_order:[zone…], required_blocks:[block_key…], forbidden_patterns:[…], a11y_contract:{}, deprecation_note?}}` | `{ok, archetype:<full row>}` |
| `graphics_theme_preset_clone` | POST | `{source_key, new_key, overlay?:{brand,density_px,…}}` | `{ok, preset:<full row, base_ref=source_key>}` |

Ghi chú shape:
- `overridable_tokens`/`composed_of`/`required_tokens`/`zone_order`/`required_blocks`/`forbidden_patterns` nhận **mảng string** hoặc **chuỗi CSV** (backend normalize). Mảng rỗng OK.
- `slots`/`variant_axes`/`a11y_contract`/`zones`/`a11y_requirements` là **object JSON** (JSONB). Mặc định `{}`.
- `status` ngoài enum → ép `draft`. `category` ngoài enum → ép `layout`. Save là **upsert** theo key (tạo mới nếu chưa có).
- **theme preset clone**: clone luôn `is_default=false, is_builtin=false, status=draft` (trừ khi overlay đặt khác), set `base_ref=source_key` (lineage kế thừa). new_key trùng key đã có → lỗi 4xx.
- A có thể chuyển L3/L4 library rail từ `__HM_BLOCK_REGISTRY__`/`__HM_ARCHETYPE_REGISTRY__` (JS static) sang đọc `graphics_block_contract_list`/`graphics_module_archetype_list` (DB authority) khi sẵn sàng — shape row khớp cột bảng (mig 261/262).

**SQL validate:** cả 3 upsert chạy thử trên live schema (BEGIN…ROLLBACK) — casts text[]/jsonb/boolean + tên cột đúng.

---

### B→A (2026-06-01) — P3.B-lifecycle ModuleSchemaController (version/soft-delete/concurrency/binding)
Lifecycle ops cho Module CRUD (file-based `data/modules/*.json`). Backward-compatible: caller cũ không gửi param mới vẫn chạy.

| action_key | method | thay đổi / body | trả về |
|---|---|---|---|
| `module_schema_save` | POST | **+ snapshot version** mỗi save (prior → `_versions/<id>/vNNNNNN.json`, giữ 30 bản). **+ optimistic lock opt-in**: gửi `baseVersion` (version đã load) → nếu ≠ version trên đĩa → **409 `version_conflict`** kèm `currentVersion`+`current` (KHÔNG ghi đè). Không gửi baseVersion → last-write-wins NHƯNG đã snapshot (recoverable). version nay monotonic từ authority. | `{saved, version, bindings:{referencedCount,resolvedInCatalog,notInGenericCatalog}}` |
| `module_schema_delete` | POST | **soft-delete mặc định**: set `status='deleted'` (giữ file), không HARD unlink nữa. `purge:true` mới hard-delete (vẫn snapshot trước). | `{deleted, purged, restorable}` |
| `module_schema_restore` | POST | `{moduleId}` lift tombstone `status: deleted→active`. | `{restored, version}` |
| `module_schema_list` | GET | mặc định ẩn `status='deleted'`; `&includeDeleted=1` để hiện. Thêm field `status` mỗi item. | `{schemas:[{…,status}]}` |
| `module_schema_versions` | GET `&id=` | liệt kê snapshot history. | `{versions:[{version,snapshotAt,updatedBy,status}]}` |
| `module_schema_restore_version` | POST | `{moduleId, version}` rollback về snapshot (snapshot current trước; tạo version forward mới, không rewrite history). | `{restored, fromVersion, version}` |
| `module_schema_validate_bindings` | GET `&id=` hoặc POST `{schema}` | surface binding contract (thay silent console.warn). | `{bindings:{referencedCount,resolvedInCatalog,notInGenericCatalog,note}}` |

Ghi chú binding: `dataSource.api` là action-key. `notInGenericCatalog` = không có trong endpoint-catalog generic-CRUD NHƯNG có thể vẫn hợp lệ (legacy controller action như `order_so_list`) → **advisory, không fatal** (dual namespace). A nên hiển thị report, không block save.

**A nên adopt:** round-trip `baseVersion` (version đã load) trong `module_schema_save` để bật optimistic lock; xử lý 409 `version_conflict` (hiện diff/reload); chuyển nút Delete → soft-delete + Undo (restore); thêm panel Version history (`module_schema_versions` + `module_schema_restore_version`).

---

### B→A (2026-06-01) — P4.B Build Packet schema + CI manifest gate
- **Schema:** `mom/contracts/module.build-packet.schema.json` — canonical L5 manifest: `moduleId` + `moduleArchetype` (archetype_key) + `themePresetKey` + `zones{zone:[block_key | {block, slots, data, a11y}]}`. **Zero style** (không hex/px/inline-style/HTML/density literal). A khi Assemble xuất manifest theo shape này.
- **Gate:** `mom/tools/release/check_module_manifest.php` wired vào CI `graphics-safety` (job step 4). Reject (P0) cho packet MỚI: hex/px literal, inline `"style"`, raw HTML, density-px override, dotted `block_key` chưa published trong L3 registry. Advisory: thiếu `a11yProfile`/`previewScene`.
- **Grandfather:** `M2-orders.json` + `M4-purchasing.json` allowlisted → findings advisory, gate xanh. Packet MỚI (ngoài allowlist) bị block ngay. Thu allowlist dần khi migrate.
- **Trigger:** `smart-classify.sh` set `needs_graphics_safety=true` khi đụng `build-packets/**`, schema, hoặc checker. A thêm/sửa manifest sẽ tự chạy gate.

---

### B→A (2026-06-02) — FIX: snapshot/registry reads nay ĐỌC DB thật (PDO $N defeat)
**Audit phát hiện:** `DesignTokenCatalogService` còn dùng `$N` placeholder → `DataLayer` bind theo key mảng → `bindValue Argument #1 must be >= 1` → mọi read/write `$N` **nuốt catch → fallback**. ⇒ `graphics_token_catalog_snapshot` TỪ TRƯỚC tới giờ trả **JSON config**, KHÔNG phải graphics_token_value (P0.B2 chưa thật sự áp); `graphics_block_contract_list`/`graphics_module_archetype_list` trả rỗng; save trả fallback `{key}` thay full row.
**Fix:** chuyển hết `$N`→`?`+pgParams (1-indexed). **Tác động FE cần biết:**
- `graphics_token_catalog_snapshot` nay trả ~**143 governed key từ DB** (graphics_token_value) thay ~353 key JSON. `tokens.read` cho ~210 key ngoài-catalog **vẫn rơi `HmTheme.getDeep`** (fallback 00bb:145 GIỮ NGUYÊN — chưa cắt). 143 key shared: giá trị DB==JSON (diverge=0) → không nhảy màu/size. CSS var vẫn do HmTheme áp → render không đổi.
- `graphics_block_contract_list`/`graphics_module_archetype_list`/`graphics_component_contract_save`/`_block_/_archetype_` nay trả **rows/full row thật** (trước rỗng/fallback).
- Graphics rollout write (stage/apply/rollback) + simulation-run nay **persist DB thật** (trước no-op) — FE Theme UI nên E2E lại flow rollout.
- **A re-verify Chrome:** portal load sạch console, brand #0c4a6e / control 32px không đổi, Module Studio L3/L4 library đọc list mới có data.

---

### B→A (2026-06-02) — Theme scheduler ACTIVE resolution (P3.B deferred item, completed)
- Action mới `graphics_theme_schedule_active` (GET, `requireGraphicsRead`; optional `&now=<ISO>` để test) → `{ ok, schedule:{ active, schedule_name, target_color_mode, source:'shift'|'default', evaluated_at, weekday, time, candidates[] } }`.
- Resolve shift theo weekday (ISO 1=Mon..7=Sun) + time-of-day, xử lý overnight wrap (night 22:00→06:00). Event schedule (maintenance.amber) KHÔNG time-resolve (chỉ khi event signalled). Ưu tiên priority desc → schedule_name.
- A dùng để auto-áp color mode theo ca: poll `graphics_theme_schedule_active` (vd mỗi 5–10') → nếu `target_color_mode` đổi → `GraphicsAuthority.colorMode.set(mode)`. Seeds: day/swing→light, night(22-06)→dark.
