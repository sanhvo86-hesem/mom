# Exec Report — Module Studio vNext P1: Shell IA + Modules Lifecycle + Archive Fix

**Date:** 2026-06-02  
**Session:** P1 (shell IA + Modules)  
**PRs:** [#173](https://github.com/sanhvo86-hesem/mom/pull/173) + [#176](https://github.com/sanhvo86-hesem/mom/pull/176) (curly-quote hotfix)  
**Branch:** `cherry/20260602-vnext-p1-shell-ia` → `cherry/20260602-vnext-p1-modalfix`  
**Status:** MSTUDIO_VNEXT_P1_PASS_20260602

---

## Changes Shipped

### 1. SURFACE_META — 6-tab IA
- **Before:** 5 tabs (`lego / tokens / modules / theme / reference`), no governance/settings/presets
- **After:** 6 visible tabs (`lego / modules / presets / settings / governance / reference`)
- `theme` → hidden alias redirecting to `presets` via `SURFACE_META[key].redirectTo`
- `tokens` → hidden alias redirecting to `lego`
- `surfaceList()` filter respects both `extSurface(k).hidden` AND `SURFACE_META[k].hidden`
- P2's registered labels override fallback (`🎨 Thư viện preset`, `⚙️ Cài đặt`) — correct by design

### 2. MStudio.api extensions
Added to `window.MStudio.api`:
- `selectSurface(key)` — follows redirect aliases, loads data for the surface
- `openModuleContent(id)` — P3 handoff point (placeholder until 32c ships)
- `openModuleMetadata(id)` — delegates to `doEditModule(id)`
- `validateModule(schema)` — structural validation (moduleId + title required)

### 3. Script tags + stubs
- Added `<script>` tags for `32a/32b/32c-mstudio-*.js` in `portal.html` after shell tag
- Created minimal IIFE stubs to prevent 404 console errors
- P2's `32a-mstudio-presets-settings.js` has already replaced the stub; P3 stub in place

### 4. Modules — rich create modal (replaces `prompt()`)
Fields: Tên (VI)*, Tên (EN), Phụ đề (VI), Icon, Route (auto-slug from Tên VI), Roles, Archetype (L4 select), Theme preset (select), Domain  
- Auto-slug: `input` event on Tên VI fills Route; user edits Route to prevent further auto-fill
- Validation: Tên VI required (border turns danger-red, focus on empty submit)
- Submit: `module_schema_save` → toast + close + `loadModules(state.includeDeleted)`
- Cancel / backdrop-click both close the modal
- CSS: `mstudio__mback` / `__modal` / `__modal-hd` / `__modal-ft` — all token-bound

### 5. Two-path edit buttons
- Old: single `✎ Sửa` (`mod-edit`)
- New: `✎ Thông tin` (`mod-edit-meta`) → metadata modal; `🧩 Nội dung` (`mod-edit-content`) → `openModuleContent(id)` (P3 handoff)
- `mod-edit` still handled as legacy compat

### 6. Archive checkbox bug — root cause + fix
**Root cause:** `loadModules(inc)` never set `state.includeDeleted`; checkbox was rendered without `checked` binding; on repaint the checkbox lost its state; `doArchive/doRestore` read DOM `.checked` (already stale).

**Fix:**
- `state.includeDeleted: false` added to state object (SSOT)
- `loadModules(inc)` sets `state.includeDeleted = !!inc` as FIRST line before repaint
- `renderModules()` renders checkbox with `checked` attribute from `state.includeDeleted`
- `doArchive` / `doRestore` / `doSaveModuleEdit` / `mod-refresh` all use `state.includeDeleted`
- `incDelChecked()` now just returns `state.includeDeleted`
- `change` handler still reads `t.checked` once to call `loadModules(t.checked)`

---

## DoD Gate Results (Chrome-verified on live VPS `eqms.hesemeng.com`)

| Gate | Result | Evidence |
|------|--------|----------|
| `node --check` | ✅ PASS | `SYNTAX OK` |
| Zero console errors | ✅ PASS | `No console errors or exceptions found` |
| 6 tabs render, no theme/tokens | ✅ PASS | `["🧱 Lego","📦 Modules","🎨 Thư viện preset","⚙️ Cài đặt","🏛 Governance","📖 Tham chiếu"]` |
| Create modal (not prompt) | ✅ PASS | `opened: true, fields: [9 fields], slug: "/kim-tra"` |
| Two edit buttons per row | ✅ PASS | `editMetaCount: 11, editContentCount: 11` |
| Archive checkbox 4-state | ✅ PASS | initial→tick→load→tab-switch→untick all correct |
| Existing list/save/archive/restore | ✅ PASS | 11 modules loaded, operations tested |
| SSOT grep (no hardcode) | ✅ PASS | All hex in `var(--o3-token,#fallback)` form |

---

## Known Issues Fixed
- **Curly-quote corruption (PR #176):** Edit tool inserted Unicode right double quotes (U+201D) in HTML template attributes inside `doCreateModule`. Browser's HTML parser set `id` to `"ms-create-back"` (including curly-quote chars), causing `getElementById` to return null. Fixed by Python script replacing all U+201C/U+201D in the function scope with ASCII `"`.

---

## Handoff for P2/P3
- P2 has already shipped `32a-mstudio-presets-settings.js` (surfaces: `theme`/`settings`)
- P3 stub `32c-mstudio-modules.js` is in place; when P3 ships, call `window.MStudio.registerSurface('modules', ...)` and/or override `window.MStudio.api.openModuleContent`
- `SURFACE_META.governance.order = 47` placeholder is present; P3 can register `governance` surface

**MSTUDIO_VNEXT_P1_PASS_20260602**
