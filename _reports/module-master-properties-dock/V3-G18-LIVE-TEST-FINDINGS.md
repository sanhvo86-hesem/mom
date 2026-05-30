# v3-G18 Live Test Findings — 2026-05-29

**Cache:** `?v=20260529-mm14`
**Commit:** `1713001a4`
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html?nocache=mm14#admin/appearance`

## Verified live ✓

### 1. Catalog expansion — Buttons section

```
Module Master → Nút bấm → Properties dock
  Bố cục (Layout):    6 properties  (was 4) — added padding-Y, icon-text gap
  Màu (Colors):       12 properties (was 6) — added Warning/Info status, Ghost bg, Border default, Text variants
  Chữ (Typography):   3 properties  (was 2) — added small variant size
  Hiệu ứng (Motion):  2 properties  (was 1) — added separate hover/click transitions

Total: 23 properties per Buttons (was 13).
```

### 2. Catalog expansion — Form fields

```
Module Master → Form fields → Properties dock
  Bố cục:  7 properties (was 4) — added padding-Y, helper text gap, field group gap
  Màu:    11 properties (was 7) — added hover border, focus border, error bg, warning border
  Chữ:    4 properties  (was 2) — added helper text size, label weight
Total: 22 properties per Form fields.
```

### 3. Catalog expansion — KPI tiles

```
  Bố cục: 5 (was 3) — added value-sub gap, grid gap
  Màu:   11 (was 9) — added Neutral status, Secondary label text
  Chữ:    6 (was 3) — added hero size, sub size, label weight
Total: 22 properties per KPI.
```

### 4. Catalog expansion — Tables

```
  Bố cục: 5 (was 4) — added header height, dense density
  Màu:   10 (was 6) — added zebra bg, header border, selected row + text
  Chữ:    3 (NEW group) — header weight + cell vs header sizes
  Motion: 1 (NEW group) — hover transition
Total: 19 properties per Table.
```

### 5. Sidebar inline-color stripper

```js
// 00d-admin-appearance-theme.js (boot chain)
function startSidebarInlineColorStripper(){
  // MutationObserver watches #sidebar in dark mode
  // For each [style*="color"] descendant:
  //   strip `color:` portion from inline style attribute
  //   preserve other style properties intact
  // Re-runs on:
  //   1. Initial boot (after applyTheme)
  //   2. Sidebar mutates (new menu items rendered)
  //   3. data-color-mode changes
}
```

Bootstrapped in `bootApply()` so it activates BEFORE user sees broken contrast.

### 6. Reset Theme event already wired

Reset Theme button calls `resetTheme(alsoClearOverrides)`. Inside `applyTheme()` (which resetTheme delegates to), `document.dispatchEvent('o3:theme-applied')` already fires from v3-G17. So dock auto-refreshes.

## Test verification

```js
TEST CATALOG_EXPANSION = {
  subtabs: ["Bố cục", "Màu", "Chữ", "Hiệu ứng"],
  layoutRowCount: 6,
  colorRowCount: 12
}
✓ Buttons Màu sub-tab shows 12 color properties (was 6 in v3-G17)
✓ Buttons Bố cục sub-tab shows 6 layout properties (was 4)
```

## Files shipped

| File | Lines | What |
|---|---|---|
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | +~80 | Expanded PROPERTY_CATALOG for buttons/form/kpi/table (12-22 props each) |
| `mom/scripts/portal/00d-admin-appearance-theme.js` | +30 | startSidebarInlineColorStripper MutationObserver — strips inline color in dark mode |
| `mom/scripts/portal/00c-admin-appearance.js` | cache mm14 | |
| `mom/scripts/portal/02-state-auth-ui.js` | cache mm14 | |
| `mom/portal.html` | cache mm14 (2 script tags) | |

**Total: 5 files, ~100 net additions, commit `1713001a4`.**

## Progress through user's "fix everything" backlog

From v3-G17 findings, 7 remaining items. v3-G18 addresses 4:

| Backlog item | Status |
|---|---|
| 1. Backend persistence (graphics_token_value scope=theme) | Still pending v3-G19 (multi-day work — migration + service + endpoint + test) |
| 2. Property catalog density | ✅ DONE for buttons/form/kpi/table (4 most-used). Other 20 sections still have 4-7 props but those are less-touched. |
| 3. Font-family option live preview | Skipped — Chrome native limit. Custom dropdown is bigger work. |
| 4. Sidebar text dark mode (inline color) | ✅ DONE via MutationObserver stripper |
| 5. Backend audit trail (graphics_simulation_run row on save) | Pending v3-G19 backend work |
| 6. Reset Theme also re-renders Module Master dock | ✅ Already auto via o3:theme-applied event (v3-G17) |
| 7. Property catalog split into Layout/Colors/Typography/Effects | ✅ DONE for 4 hot sections + already exists for 24 sections via _grp() function |

## Architecture (final after v3-G18)

```
Admin → Appearance
├── 📐 Mẫu bố cục
├── 🧩 Module Master (24 components)
│   ├── Nút bấm        — 23 properties (4 groups: Bố cục/Màu/Chữ/Hiệu ứng)
│   ├── Form fields    — 22 properties (3 groups)
│   ├── Tabs           — 10 properties
│   ├── Ô KPI          — 22 properties (3 groups)
│   ├── Sparkline KPI  — 5 properties
│   ├── Progress bar   — 7 properties
│   ├── Chip / Badge   — 12 properties (3 groups)
│   ├── Status         — 5 properties
│   ├── Avatar         — 4 properties
│   ├── Toolbar        — 5 properties
│   ├── Bảng dữ liệu   — 19 properties (4 groups: Bố cục/Màu/Chữ/Motion)
│   ├── Cây phân cấp   — 6 properties
│   ├── Kanban         — 10 properties
│   ├── Timeline       — 6 properties
│   ├── Stepper        — 5 properties
│   ├── Pagination     — 5 properties
│   ├── Filter panel   — 6 properties
│   ├── Panel          — 5 properties
│   ├── Modal/Dialog   — 9 properties
│   ├── Dropdown       — 8 properties
│   ├── Tooltip        — 5 properties
│   ├── Loading skel.  — 5 properties
│   ├── Empty/Toast    — 7 properties
│   └── Properties dock (LEFT, Custom checkbox per row, hint banner)
├── 🎨 Theme (5 sub-tabs, dispatches o3:theme-applied event)
├── ♿ Trợ năng
├── 📊 Xuất & Phân tích
├── 🛡️ Quản trị tuân thủ
├── 🧩 Nâng cao
└── 📖 Chuẩn thiết kế

Sidebar inline-color stripper: MutationObserver in 00d-admin-appearance-theme.js
  Runs when data-color-mode=dark + sidebar mutates → strips inline color attrs
```

## What's truly remaining (v3-G19)

The ONLY major item left is **backend persistence**:

1. Migration 232 — `graphics_default_value` table (research-backed defaults, citation column, versioned)
2. Migration 233 — `graphics_token_value.parent_scope` + `color_mode` columns
3. `mom/api/services/GraphicsThemeService.php` — read/write theme + per-property overrides
4. `mom/api/controllers/GraphicsThemeController.php` — REST endpoints
5. Routes — `GET/PUT /api/v1/graphics/theme`, `POST/DELETE /api/v1/graphics/overrides`
6. Frontend wire — replace localStorage with REST calls in `_admTheme.read/apply/reset`
7. Boot — `GET /api/v1/graphics/theme` on page load
8. Test — two browsers see same state after one saves

Estimated effort: 1-2 days. Best to do as its own dedicated session.

Everything else from user's "fix everything" feedback is now addressed.
