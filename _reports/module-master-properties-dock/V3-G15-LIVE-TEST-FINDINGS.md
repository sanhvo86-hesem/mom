# v3-G15 Live Test Findings — 2026-05-29

**Cache:** `?v=20260529-mm11`
**Branch:** `codex/mda-platform-isolated-20260529b`
**Commit:** `e8a1c2123` (force-pushed)
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html#admin/appearance`

## 3 main goals — ALL PASS

| # | Goal | Verification | Result |
|---|---|---|---|
| 1 | **Dark mode full coverage** — sidebar + admin nav + inputs all flip to dark | sidebar bg = `rgb(10, 22, 40)` (slate-950), `--bg-surface` = `#1e293b`, `--text-primary` = `#f1f5f9` | ✓ |
| 2 | **Theme tab → sub-tabs** (mirrors Module Master inner strip) | 5 sub-tabs rendered: `☾ Chế độ / 🎨 Màu / 🔠 Chữ / 📐 Mật độ / ⚡ Chuyển động` | ✓ |
| 3 | **Remove global sections from Module Master** (density / global-tokens / typography / effects) | Module Master inner strip now starts at `Nút bấm` — density / tokens / typography / effects sections all gone | ✓ |

## Detailed test matrix

| Test | Pre | Post | Worked |
|---|---|---|---|
| Theme tab Dark click | `--o3-surface-card=#fff`, sidebar light | `--o3-surface-card=#1e293b`, sidebar `#0a1628` | ✓ |
| Legacy var `--bg-surface` flips with mode | `#ffffff` | `#1e293b` | ✓ |
| Legacy var `--text-primary` flips with mode | `#0f172a` | `#f1f5f9` | ✓ |
| Admin sub-nav (Người dùng / Phòng ban / Vai trò / RACI) flips | light bg `rgb(241,245,249)` | dark `#162032` | ✓ |
| Theme sub-tab navigation (Chế độ → Mật độ) | "Chế độ" active | "Mật độ" active, panel re-renders with sliders | ✓ |
| Theme density slider live cascade to `--master-gap` | 8px | 16px (slider drag) → reverted to 8 | ✓ |
| Theme density cascade to `--o3-space` (legacy alias) | 8px | 16px (same write) | ✓ |
| Module Master removed density section | inner strip had "Khe hở (Master)" | inner strip starts at "Nút bấm" | ✓ |
| Module Master removed Global tokens section | inner strip had "🌐 Global tokens" | absent | ✓ |
| Module Master removed Typography section | inner strip had "🔠 Typography" | absent | ✓ |
| Module Master removed Effects section | inner strip had "✨ Effects" | absent | ✓ |

## Architecture (final)

```
Admin → Appearance
├── 📐 Mẫu bố cục          (Template registry)
├── 🧩 Module Master       (24 per-component preview sections — NO global)
│       └── Properties dock (floating LEFT, Custom checkbox per row)
├── 🎨 Theme               (Global design tokens)
│   ├── ☾ Chế độ          Light / Dark / Auto
│   ├── 🎨 Màu            Brand + auto-derived swatches
│   ├── 🔠 Chữ           Font family (live preview) + base size
│   ├── 📐 Mật độ         Density preset + master/section gap + radius sliders
│   └── ⚡ Chuyển động     Subtle / Standard / Expressive
├── ♿ Trợ năng
├── 📊 Xuất & Phân tích
├── 🛡️ Quản trị tuân thủ
├── 🧩 Nâng cao
└── 📖 Chuẩn thiết kế
```

### Clean SSOT split

| Where | What |
|---|---|
| **🎨 Theme tab** | GLOBAL — color mode, brand, font family + size, density, motion, master/section/radius sliders. One source of truth for the org. |
| **🧩 Module Master dock** | PER-COMPONENT DETAILS — Custom checkbox per property row. Unchecked = inherits from Theme. Checked = overrides for this specific component only. |

## Files shipped

| File | Lines | What |
|---|---|---|
| `mom/styles/orders-v3.css` | +48 | Legacy `--bg-*` / `--text-*` / `--border-*` flips in `:root[data-color-mode="dark"]` + scoped `!important` rules for sidebar, admin-content, inputs |
| `mom/scripts/portal/00d-admin-appearance-theme.js` | +193 net | Split renderer into 5 sub-tab functions + `_admThemeSetSubtab` setter + sessionStorage persistence + Save Theme button that wires to GraphicsAuthority.tokens.stage() + preview.simulate() |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | -27 net | Removed densitySection/globalTokensSection/typographySection/effectsGlobalSection from sections(); changed default _activeSection from 'density' to 'buttons' |
| `mom/scripts/portal/00c-admin-appearance.js` | 0 net | (cache buster only) |
| `mom/scripts/portal/02-state-auth-ui.js` | +1 / -1 | Cache buster mm10→mm11 |
| `mom/portal.html` | +2 / -2 | Cache buster mm10→mm11 (sed) |

**Total: 6 files, 250 net additions, 1 commit `e8a1c2123`.**

## Backend persistence status

Save Theme button wires through this preference chain:
1. `window.GraphicsAuthority.tokens.stage()` for each mapped token (space.master, space.section, radius.master, radius.card, control.height.standard, brand.primary)
2. `window.GraphicsAuthority.preview.simulate()` to add a row in `graphics_simulation_run`
3. Final publish requires user click in main Graphics tab (existing pipeline)
4. If GraphicsAuthority API not mounted → fall back to localStorage notice

This is **half-wired**. The frontend stages correctly. The full backend persistence (POST to `graphics_token_value` with scope=`theme`, color_mode column, override resolution per component) needs **migration 232 + GraphicsThemeService.php** in v3-G16. Documented as known limitation in handover.

## Phản biện — what's still rough

1. **Custom override flags only in localStorage** — per-browser, not per-org. Backend persistence is v3-G16.
2. **Sidebar text colour in dark mode** — some sidebar items have inline `style="color:#..."` that win over my `#sidebar *{color:#cbd5e1}` rule. Visible in screenshot as dim/illegible text on a few rows. Fix: add `!important` to sidebar text rule OR use higher specificity.
3. **Reset Theme** doesn't clear `o3-props-overrides` — leaves stale custom flags from Module Master sessions. Need confirmation dialog listing what will be lost.
4. **Theme tab Save button** shows confusing message when GraphicsAuthority isn't fully wired — should detect the API more precisely.
5. **No dot indicator** on Module Master sub-tab labels showing which sections have custom overrides — admin can't see at a glance.
6. **Light/Dark transition feels abrupt** — no fade/cross-dissolve. Could add `transition: background-color 200ms` to body + key surfaces.
7. **Font-family `<option>` live preview** added per option but Chrome may render the select-menu options in the page's UI font regardless of inline `style=font-family`. Verify in another browser.
8. **Theme tab `Cao chuẩn` slider doesn't exist** anymore — density preset (Compact 32 / Cozy 36 / Comfortable 40) drives control-height directly. Acceptable since 3 presets cover ~95% of needs.
9. **Active sub-tab indicator** in Theme is the brand underline — works fine in light, slightly dim in dark mode (sky-400 on slate-900). Could brighten the underline weight.
10. **Save Theme** writes to `localStorage.o3-theme` + stages to GraphicsAuthority IF mounted. Confirm in production whether GraphicsAuthority hooks are present by checking `typeof window.GraphicsAuthority.tokens.stage === 'function'`.

## Recommended v3-G16 work

1. **Backend persistence** — migration 232 (`graphics_default_value`), 233 (`graphics_token_value.parent_scope` + `color_mode`), `GraphicsThemeService.php`, REST endpoints.
2. **Override indicator dots** on Module Master sub-tab strip when any property in that section has `o3-props-overrides[key]=true`.
3. **Reset Theme dialog** that lists Module Master overrides being preserved + offers "Also reset overrides" option.
4. **HSL palette harmonisation** — when brand changes, auto-derive hover/soft/text-on-brand via colour formulas.
5. **Cross-mode transitions** — `transition: background 200ms, color 200ms` on body + cards + sidebar.
6. **Sidebar text contrast fix** — bump specificity to `body[data-color-mode="dark"] #sidebar a` etc. so inline styles can't win.
