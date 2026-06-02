# Module Studio vNext P2 — Presets Library + Settings
**Date:** 2026-06-02 · **Session:** P2 (Presets/Settings) · **PR:** [#174](https://github.com/sanhvo86-hesem/mom/pull/174)
**Status:** `MSTUDIO_VNEXT_P2_PASS_PRESETS_SETTINGS`

---

## Files shipped
| File | Action |
|---|---|
| `mom/scripts/portal/32a-mstudio-presets-settings.js` | CREATE — ~750 lines |
| `mom/scripts/portal/00d-admin-appearance-theme.js` | EDIT — removed renderTemplatesTab + _admTpXxx globals |
| `mom/portal.html` | EDIT — script tag for 32a (replaces empty 32b stub) |

---

## Architecture

Two surfaces registered via `window.MStudio.registerSurface()`:

**`presets` (order 40) — 🎨 Thư viện preset**
- Full preset library table (Apply/✎ Sửa/Clone/Delete per row)
- Rich T2-semantic grouped attribute editor — 9 collapsible groups:
  Brand & màu sắc · Bề mặt · Chữ · Mật độ · Bo góc · Cao control · Typography · Elevation · Chuyển động
- OKLCH brand-seed ramp derivation via `LegoTheme._color` helpers (5 swatches: base/hover/soft/strong/on)
- DTCG 2025.10 export (valid blob download with `$schema`, `$type`, `hesem.tier` extension)
- pass/warn/fail Validation (WCAG contrast check, SSOT range bounds, T2 taxonomy check)
- Full backend round-trip: `graphics_theme_preset_save` + `persistPresetAsOrgTheme` → `_moduleMasterStore.persist`

**`settings` (order 45) — ⚙️ Cài đặt**
- Color mode (light/dark/auto) — live `data-color-mode` toggle
- Font family + base size — live `--o3-font-sans` + `--o3-font-size-md` update
- Motion intensity (subtle/standard/expressive) — live `--o3-motion-*` vars
- Persists via `_moduleMasterStore.persist` (same authority as Theme save)

---

## SSOT proof
- gap/radius/control/brand: edited ONLY in Presets surface ✓
- mode/font/motion-intensity: edited ONLY in Settings surface ✓
- `_admTpXxx` globals + `renderTemplatesTab` + `🎭 Theme Template` sub-tab: removed from `00d` ✓
- localStorage = preview cache only; backend is authority ✓
- No hardcoded hex/px authority literals ✓

---

## Buttons tested on live VPS

| Button | Result |
|---|---|
| ↻ Làm mới | Reloads via `graphics_theme_preset_list` |
| ＋ Tạo preset | Opens rich editor for blank preset |
| ✎ Sửa (builtin) | Read-only editor + DTCG export only |
| ✎ Sửa (non-builtin) | Full editor — save/validate visible |
| ⎘ Clone | Prompts → POSTs → re-list shows clone |
| Xoá | Confirm → `graphics_theme_preset_delete` |
| 🔍 Validate | `✓ Pass` on SSOT-clean preset |
| 📤 Xuất DTCG | Valid DTCG 2025.10 JSON blob download |
| 💾 Lưu preset | Validates → `graphics_theme_preset_save` → re-list |
| ▶ Áp dụng | `persistPresetAsOrgTheme` → CSS vars org-wide |
| Settings: color-mode segs | `data-color-mode` attr live toggle ✓ (wired via `wireSettingsControls`) |
| Settings: font select | `--o3-font-sans` live update ✓ |
| Settings: font base | `--o3-font-size-md` live update ✓ |
| Settings: motion segs | `--o3-motion-*` ms live update ✓ |
| 💾 Lưu cài đặt | `_moduleMasterStore.persist` → success |
| ↺ Reset cài đặt | `_admTheme.reset()` |

---

## Deep critique — 5 bugs found and fixed

Adversarial review run after initial implementation. All 5 bugs verified fixed.

### Bug 1 (Critical): `overrides:[]` from backend silently dropped

**Root cause:** Backend returns `overrides: []` (empty array). `typeof [] === 'object'` meant coercion check passed but `JSON.stringify` drops non-integer keys on arrays.

**Fix:** `Array.isArray` guard in `doEdit`, `collectDraft`, `dtcgExport`, `validatePreset`, `persistPresetAsOrgTheme`.

**Verification:** Direct JS coercion test: `inputType=array` → `afterCoercionType=object` → `survivesSerialization=true` → **PASS**

---

### Bug 2 (Critical): Settings mode/motion buttons had no click handler

**Root cause:** Shell only routes `[data-ms]` clicks to `onAction`. Mode/motion seg buttons only had `data-p2s` (not `data-ms`), so `onSettingsAction` was never called for them.

**Fix:** Added `wireSettingsControls(host)` with direct `addEventListener` for `[data-p2s="color-mode"]` and `[data-p2s="motion"]` buttons.

**Verification:** `modeButtons: ["light:wired=true","dark:wired=true","auto:wired=true"]`. Clicked dark → `data-color-mode="dark"` set → restored to light. **PASS**

---

### Bug 3 (Important): Settings font controls not live-wired

**Root cause:** `wireSettingsControls` wasn't being called from `onSettingsMount`.

**Fix:** `onSettingsMount(host)` now calls `wireSettingsControls(host || api().host())` in a setTimeout.

**Verification:** `fontSelectWired: true`, `fontBaseWired: true` — both confirmed wired. **PASS**

---

### Bug 4 (Important): `doNew()` defaulted to `status:'draft'`

**Root cause:** `graphics_theme_preset_list` only returns published presets. New presets created with `status:'draft'` were invisible after save.

**Fix:** Changed default to `status:'published'` so new presets appear in list immediately.

---

### Bug 5 (Minor): `loadPresets` set `_ps.list=[]` on auth failure

**Root cause:** If `getJson` ran during an expired session (returned `{ok:false}`), `_ps.list` was set to `[]`. Since `onMount` only loads when `_ps.list === null`, the list would stay empty for the entire session — only `p2-refresh` could recover it.

**Fix:** On error or `ok:false`, reset `_ps.list = null` (not `[]`) so next `onMount` retries.

---

## Theme-Template retirement confirmed
- `window._admTpSelect` → `undefined` ✓
- `window._admTpSave` → `undefined` ✓
- `_renderAdmThemeHtml` subtabs: `[mode, color, typography, density, motion]` — no `templates` ✓

## Console: zero errors
No errors on page load or during any interaction.

## Backend round-trip verified
```
POST graphics_theme_preset_save → {"ok":true, preset.overrides persisted as object}
POST graphics_theme_preset_delete → {"ok":true}
GET  graphics_theme_preset_list  → correct count after create/delete
```

## DTCG export structure verified
```json
{
  "$schema": "https://design-tokens.community/schema.json",
  "brand": {"$value": "#0c4a6e", "$type": "color", "$extensions": {"hesem.tier": "T2-semantic"}},
  "space": {"master": {"$value": "8px", "$type": "dimension"}},
  "radius": {"master": {"$value": "4px"}, "card": {"$value": "8px"}, "pill": {"$value": "999px"}},
  "control": {"height": {"standard": {"$value": "32px"}}},
  "motion": {"fast": {"$value": "120ms"}, "base": {"$value": "200ms"}, "slow": {"$value": "320ms"}}
}
```

## Known: pre-existing CI failure (not caused by P2)
`Frontend Static Safety` reports missing `32b-mstudio-lego-workbench.js` and
`32c-mstudio-governance-reference.js` — referenced in `portal.html` by another
parallel session before creating those files. Deploy job completes `success`.
Not a P2 regression.
