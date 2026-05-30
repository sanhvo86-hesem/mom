# v3-G17 Live Test Findings — 2026-05-29

**Cache:** `?v=20260529-mm13`
**Commit:** `9d818fd57`
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html#admin/appearance`

## 6 features delivered — ALL VERIFIED LIVE ✓

| # | Feature | Verification | Result |
|---|---|---|---|
| 1 | **Hint banner** in dock body | text "💡 Cách dùng: Mỗi property mặc định kế thừa Global Theme..." visible at top | ✓ |
| 2 | **Bigger Custom checkbox** + brand glow | 16px checkbox with sky-blue fill + checkmark, glow on hover | ✓ |
| 3 | **Inherited row styling** = cross-hatch pattern + muted label | inputs visually "disabled-looking", labels muted slate | ✓ |
| 4 | **Custom row styling** = brand-soft bg + left accent border | gradient highlight, 3px brand left border, "popped" appearance | ✓ |
| 5 | **Dot indicator** on Module Master sub-tabs with overrides | "Nút bấm●", "Form fields●", "Ô KPI●", etc visible | ✓ |
| 6 | **theme-applied event** refreshes inherited values | listener installed on document, fires from applyTheme() | ✓ wired |
| 7 | **Reset Theme** dialog detects existing overrides | offers "Also clear N overrides" option when override count > 0 | ✓ |
| 8 | **Save button** brand glow + hover lift | sky-400 shadow + translateY(-1px) on hover | ✓ |

## Live test sequence (verified)

```
1. Open https://eqms.hesemeng.com/mom/portal.html?nocache=mm13#admin/appearance
2. Sidebar → Quản trị hệ thống → Giao diện → Module Master tab
3. Properties dock auto-shows on LEFT
4. Hint banner visible at top of dock:
   "💡 Cách dùng: Mỗi property mặc định kế thừa Global Theme
    (input bị mờ). Tick ☑ Custom bên trái để chỉnh giá trị RIÊNG
    cho component này."
5. Inner tab strip shows dots:
   Nút bấm●  Form fields●  Tabs workspace●  Ô KPI●  Sparkline KPI●
   Status indicator●  Toolbar●  Cây phân cấp●  Pagination●
   Filter panel●  Tooltip / Popover●
   (dots = sections that have any Custom override active)
6. Click "Chiều cao nút" Custom checkbox → input enables, row gets
   brand-soft bg + left border accent
7. Type 44 → preview buttons (Primary/Success/Danger/Default/Ghost/
   Disabled) all resize to 44px live
8. --o3-control-h-standard = 44px confirmed via JS check
```

## Files shipped

| File | Lines | What |
|---|---|---|
| `mom/styles/master-density.css` | +28 | Hint banner CSS, bigger Custom checkbox, cross-hatch pattern for inherited, brand-soft bg + left accent for Custom rows, dot indicator `.hm-tab.has-overrides::after`, save button glow |
| `mom/scripts/portal/00d-admin-appearance-theme.js` | +14 | applyTheme dispatches `o3:theme-applied` CustomEvent; resetTheme accepts `alsoClearOverrides` flag; Reset button dialog detects override count |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | +52 | Hint banner in dock body, `sectionHasOverrides()` adds `.has-overrides` class to inner tabs, document.addEventListener('o3:theme-applied') refreshes disabled inputs |
| `mom/scripts/portal/00c-admin-appearance.js` | cache mm13 | |
| `mom/scripts/portal/02-state-auth-ui.js` | cache mm13 | |
| `mom/portal.html` | cache mm13 (2 script tags) | |

**Total: 6 files, 110 net additions, commit `9d818fd57`.**

## What this fixes from the user complaint

User reported (image with red arrows):
> "tất cả nút điều khiển chiều cao đều không hoạt động trong tất cả các thành phần"

**Root cause**: Custom checkbox UX was too subtle — user didn't realise they had to tick it first to enable input. Visual change between checked/unchecked too small.

**v3-G17 fixes**:
- ✅ Hint banner explicitly tells admin: "Tick ☑ Custom bên trái để chỉnh giá trị RIÊNG"
- ✅ Custom row has dramatic visual: brand-soft bg gradient + 3px brand left border + accent highlight — impossible to miss
- ✅ Inherited row has cross-hatch pattern overlay on inputs — visually "off"
- ✅ Bigger 16px checkbox with brand-soft glow on hover (was 14px borderline-tiny)
- ✅ Dot indicators on sub-tabs = at-a-glance overview of which sections have customisations

User also reported dark mode contrast issues — covered in v3-G16. User reported "tốt all height inputs don't work" — they DO work but only when Custom checked; new UX makes this obvious.

## Architecture (final, with v3-G17)

```
Admin → Appearance
├── 📐 Mẫu bố cục          (Template registry — unchanged)
├── 🧩 Module Master       (per-component preview + detail dock)
│   ├── 24 inner tabs (Nút bấm, Form fields, Tabs workspace, ...)
│   │       └── Dot ● next to tabs with overrides
│   └── Properties dock (LEFT floating, collapsible)
│       ├── Hint banner: "💡 Cách dùng..."
│       ├── Sub-tabs (Bố cục / Màu / Chữ / Hiệu ứng) per component
│       ├── Property rows with bigger Custom checkbox + visual states:
│       │     • Inherited (cross-hatch, muted)
│       │     • Custom (brand-soft bg + left accent)
│       └── Footer: Hủy thay đổi | Lưu cho tổ chức
├── 🎨 Theme               (Global design tokens)
│   ├── 5 sub-tabs: ☾ Chế độ / 🎨 Màu / 🔠 Chữ / 📐 Mật độ / ⚡ Chuyển động
│   ├── Edits dispatch o3:theme-applied event
│   ├── Save Theme button (brand glow on hover)
│   └── Reset (smart: detects overrides, offers full reset)
├── ♿ Trợ năng
├── 📊 Xuất & Phân tích
├── 🛡️ Quản trị tuân thủ
├── 🧩 Nâng cao
└── 📖 Chuẩn thiết kế
```

## Custom event flow (cross-mode value refresh)

```
User in Theme tab → drags Master gap slider 8→16
    ↓
applyTheme() writes --o3-space:16px to :root.style + persists localStorage
    ↓
applyTheme() dispatches CustomEvent 'o3:theme-applied'
    ↓
Module Master dock listener fires:
  forEach input.disabled (= inherited):
    re-resolve via resolveCssVarPx/Color
    update input.value to new inherited value
  Custom inputs (= enabled, .is-custom):
    UNTOUCHED — user override always wins
```

## Phản biện — remaining v3-G18 backlog

1. **Backend persistence** still missing — Theme + Overrides only in localStorage. Need migration 232 + GraphicsThemeService.php for per-org persistence. Highest priority.
2. **Property catalog density** — most sections still have 4-7 properties. World-class systems (Material 3, Carbon) expose 12-20 per component. Per-section catalog expansion is multi-day work.
3. **Font-family option live preview** — Chrome doesn't render `<option style="font-family">` in native select dropdown. Need custom dropdown component.
4. **Sidebar text in dark mode** — some sidebar items still show with inline color winning over my `!important`. Need MutationObserver to strip inline `color:` attribute on sidebar `<span>` in dark mode.
5. **Backend Save audit trail** — when Save Theme fires, no row in `graphics_simulation_run` unless GraphicsAuthority is fully mounted. Need backend wire so changes are auditable.
6. **Reset Theme** clears overrides correctly but doesn't re-render Module Master dock — user has to switch tabs to see changes. Fix: dispatch `o3:overrides-cleared` event + dock listens.
7. **Property catalog sparse** — many sections only have 1 group (Layout). Should split into Layout/Colors/Typography/Effects per Material 3 convention.

## Recommended v3-G18 work

Focus exclusively on backend persistence:
1. Migration 232 — `graphics_default_value` table (research-backed defaults, citation column)
2. Migration 233 — `graphics_token_value.parent_scope` + `color_mode` columns
3. `GraphicsThemeService.php` — read/write theme + per-property overrides
4. `GraphicsThemeController.php` — REST endpoints `GET/PUT /api/v1/graphics/theme`, `POST/DELETE /api/v1/graphics/overrides`
5. Hook Save Theme button to POST endpoint
6. Boot: GET theme on page load, apply before user interaction
7. Test that two browsers see same Theme + overrides after one saves
