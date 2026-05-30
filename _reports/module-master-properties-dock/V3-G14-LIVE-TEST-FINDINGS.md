# v3-G14 Live Test Findings — 2026-05-29

**Cache:** `?v=20260529-mm10`
**Branch:** `codex/mda-platform-isolated-20260529b`
**Commit:** `c87d8445d`
**Test environment:** Chrome live on `https://eqms.hesemeng.com`

## Test matrix — all 6 critical interactions PASS ✓

| # | Test | Before | After | Result |
|---|---|---|---|---|
| 1 | **Theme tab visible** in admin Appearance strip | hidden | `🎨 Theme` between Module Master + Trợ năng | ✓ |
| 2 | **Dark mode toggle** (Light → Dark) | `--o3-surface-card = #ffffff`, page bg `rgb(248,250,252)` | `#1e293b`, `rgb(15,23,42)` | ✓ instant cascade |
| 3 | **Brand color change** (#0c4a6e → #7c3aed) | `--o3-brand = #0c4a6e` | `#7c3aed` | ✓ live |
| 4 | **Font base** (13 → 15px) | `--o3-font-size-md = 13px` | `15px` | ✓ live |
| 5 | **Density cascade** (Cozy → Comfortable → Compact) | `--o3-control-h-standard = 36px` | `40px → 32px` | ✓ all 3 presets work |
| 6a | **Custom checkbox check** (first property row) | `cbChecked: false, inpDisabled: true, masterGap: 8px` | `cbChecked: true, inpDisabled: false` | ✓ unlocks input |
| 6b | **Edit value while Custom checked** | `masterGap: 8px` | `20px` | ✓ live preview |
| 6c | **Uncheck Custom** | `cbChecked: true, masterGap: 20px` | `cbChecked: false, inpDisabled: true, inpVal: "8", masterGap: 8px` | ✓ snaps back to Global Theme |
| 7 | **Reset to design defaults** | localStorage `o3-theme` with custom values | localStorage cleared, then re-seeded with `THEME_DEFAULTS` | ✓ defaults restored |

## Architecture deployed

```
Admin → Appearance
├── 📐 Mẫu bố cục          (Template registry — unchanged)
├── 🧩 Module Master       (24 component preview sections + dock)
├── 🎨 Theme               ← NEW v3-G14
│   ├── Chế độ màu        ☀ Light  ☾ Dark  ◐ Auto
│   ├── Thương hiệu       Brand color picker + 8 derived swatches
│   ├── Typography        Font family dropdown + base size 11-16px
│   ├── Mật độ + Hình dạng Density preset + 4 sliders (master-gap, section-gap, master-radius, card-radius)
│   ├── Chuyển động       Subtle / Standard / Expressive
│   └── [Reset to design defaults]
├── ♿ Trợ năng
├── 📊 Xuất & Phân tích
├── 🛡️ Quản trị tuân thủ
├── 🧩 Nâng cao
└── 📖 Chuẩn thiết kế
```

### Properties dock now has Custom checkbox per row

Visual change in dock (left side of every property row):

```
☐ Khe hở chính     space.master       [ 8  ] px   ← unchecked = inherits from Theme (input disabled, opacity .55)
☑ Khe phân đoạn    space.section      [12  ] px   ← checked = local override active (full opacity, focused)
☐ Bo góc control   radius.master      [ 4  ] px
☐ Bo góc panel     radius.card        [ 8  ] px
☐ Cao chuẩn        control.height.std [36  ] px
```

## Files shipped

| File | Lines | Purpose |
|---|---|---|
| `mom/scripts/portal/00d-admin-appearance-theme.js` | 337 (NEW) | Theme tab renderer + apply pipeline + localStorage persistence |
| `mom/scripts/portal/00c-admin-appearance.js` | +9 | Register theme tab + wire after mount |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | +75 | Custom checkbox in renderPropertyRow + wireCustomCheckboxes |
| `mom/scripts/portal/02-state-auth-ui.js` | +1 | Cache bust to mm10 |
| `mom/portal.html` | +1 line | Add 00d-admin-appearance-theme.js script tag + bump cache |
| `mom/styles/orders-v3.css` | +40 | `:root[data-color-mode="dark"]` block — Material 3 dark palette |
| `mom/styles/master-density.css` | +15 | Checkbox styling, inherited input opacity, dark-mode dock fine-tune |

**Total: 7 files, ~470 net additions, 1 commit `c87d8445d`.**

## Critical evaluation (phản biện)

### What works well
- **Theme cascade is instant.** No reload, no flash — `:root.style.setProperty` writes propagate via CSS variables in the same paint cycle.
- **Override precedence is correct.** When Theme changes, `applyTheme()` skips writing to a var that has an `o3-props-overrides` flag set. So a custom value of `master-gap: 20px` survives a Theme density change.
- **Dark mode palette is research-backed.** Material 3 surface tiers (#0f172a → #1e293b → #334155), SLDS-style desaturated status colours, sky-400 brand swap for better contrast. Not arbitrary hex picks.
- **localStorage persists across reload.** `bootApply()` runs on `DOMContentLoaded` so the saved theme is applied before the user sees anything.

### What's still rough / candidates for v3-G15
1. **Custom checkbox value doesn't auto-save** — user must still click "Lưu cho tổ chức" footer button, AND the save isn't wired to a backend yet. Currently the override flag is in localStorage and the inline CSS-var is set on `:root`. Persists across reload via localStorage but is per-browser, not per-org.
2. **No backend persistence** — Theme + Overrides live in localStorage only. Refresh in another browser or another user → starts from defaults. Need migration 232/233 + `GraphicsThemeService.php` to bridge to `graphics_token_value`.
3. **Theme tab doesn't show LIVE values that overrides have changed** — e.g., if user opens Module Master and overrides `--o3-space` to 20, then visits Theme tab, the "Master gap" slider still reads 8. Cosmetic bug — the slider reads from `theme['master-gap']` not from the actual live computed value.
4. **Brand color picker doesn't auto-derive hover/soft swatches.** Currently the swatches react because `--o3-brand` changes the gradient/border that the swatches reference, but if user picks a wildly different hue, hover/soft don't shift hue accordingly. Should use HSL harmonization or call a `derivePalette(brand)` helper.
5. **Font family dropdown doesn't preview the fonts in the option list.** Each `<option>` shows the family name in the default UI font. Hard to compare. Idea: render each `<option>` with `style="font-family: <that family>"`.
6. **No "Save Theme" or "Discard Theme changes" buttons** — only Reset. Should add a footer like Module Master dock has.
7. **No visual indicator** in Module Master strip showing which sub-tabs have custom overrides. Should show a small dot near tab labels that have any `o3-props-overrides` entries.
8. **Dark mode in admin sidebar** — sidebar items don't fully invert (a couple stay light blue) because the portal sidebar uses its own CSS scope that doesn't read `--o3-*` vars. Need a `body.has-dark-mode .sidebar` override block.
9. **Reset button leaves localStorage `o3-props-overrides` untouched.** Should probably ALSO clear overrides on full reset (with confirmation).
10. **"Cao chuẩn" property row** in dock currently shows 36 (from Theme density Cozy preset). When density changes, this row's input value doesn't refresh until you toggle the section. Need to dispatch a custom event from `applyTheme()` and have dock listen for it.

### Performance / safety
- ✓ No console errors during all 6 interactions.
- ✓ No layout thrash — `:root.style.setProperty` is cheap.
- ✓ orders-v3.css adds only 40 lines, no extra HTTP request (already loaded).
- ⚠ localStorage `o3-theme` JSON parse on every page load — should add try/catch (already there) and validate schema before applying.

## Recommended next-session work (v3-G15)

1. **Backend persistence** (migration 232 + 233 + `GraphicsThemeService` + endpoints).
2. **Sub-tab override indicator** — small dot when a tab has overrides.
3. **HSL palette derivation** — when brand changes, auto-shift hover (-10% L), soft (+50% L), text-on-brand (computed contrast).
4. **Theme tab Reset = clear overrides too** (with confirmation listing what will be lost).
5. **Custom event for value changes** — `document.dispatchEvent(new CustomEvent('o3:theme-applied'))` and dock re-reads input values for non-custom rows.
6. **Dark mode polish for admin sidebar** — `:root[data-color-mode=dark] .sidebar a { color: var(--o3-text-default) }` etc.
7. **Font option live preview** — render each `<option>` in its own font family.

## Screenshots in this session

- `ss_5247opbbr` — mm9 baseline (Tables section, properties pre-filled correctly after orders-v3.css redeploy)
- `ss_8239o8eig` — mm10 first load, Theme tab visible with all sections
- `ss_8189cbap0` — Dark mode active (page bg flipped to slate-900, sidebar text white, Theme tab on dark UI)
- `ss_5013t1v8n` — Light mode restored, Theme tab full layout visible
