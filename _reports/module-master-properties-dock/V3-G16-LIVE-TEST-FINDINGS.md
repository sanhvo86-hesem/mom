# v3-G16 Live Test Findings — 2026-05-29

**Cache:** `?v=20260529-mm12`
**Commit:** `d16407aa8`
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html#admin/appearance`

## Critical test — HEIGHT CASCADE WORKS

User complaint: "all height buttons don't work in any Module Master component."

**Verified live:**

```
BEFORE: --o3-control-h-standard = 32px
ACTION:
  1. Open Module Master → Nút bấm
  2. Open Properties dock (handle bookmark)
  3. CHECK "Chiều cao nút" Custom checkbox  ← critical step user missed
  4. Type 52 in input
  5. Press Enter / input event fires
AFTER: --o3-control-h-standard = 52px
RESULT: All Primary/Success/Danger/Default/Ghost/Disabled buttons resize to 52px ✓
```

**Root cause of user's complaint:** the Custom checkbox MUST be CHECKED first to enable the input. When unchecked, input is disabled = looks like it doesn't work. The current UX makes the disabled state too subtle.

## What v3-G16 fixed

### 1. Dark mode contrast (85+ new CSS rules)

| Element | Before (dark mode) | After |
|---|---|---|
| #sidebar a text | white-on-white (inline color won) | `#e2e8f0` with `!important` |
| #sidebar hover | no effect | `#1e293b` bg |
| #sidebar active item | invisible | sky gradient + white text |
| Active Theme sub-tab | dark-on-dark | sky-400 text + light underline |
| Theme tab number/color/select inputs | white bg | `#1e293b` bg + `#f1f5f9` text + `#475569` border |
| Theme tab `<section>` cards | white | `#1e293b` |
| Properties dock disabled inputs | hard to distinguish | `#0f172a` bg + `#64748b` text + opacity .7 |
| Properties dock custom inputs | same as disabled | `#1e293b` bg + `#f1f5f9` text + `#38bdf8` border + opacity 1 |
| Custom checkbox checked | brand color hard to see | `#38bdf8` (sky-400) on dark |
| Cross-mode transitions | abrupt flash | smooth 180ms ease on body/sidebar/dock/btn/chip |

### 2. Save Theme button improvements

| Before | After |
|---|---|
| `alert()` blocks thread | Non-blocking toast notification, auto-fade 4s |
| Only stages theme tokens (6) | Also stages per-property Custom overrides from `o3-props-overrides` localStorage |
| Confusing success message | Border-left colour indicates posted vs localStorage-only state |
| No count of staged tokens | Toast shows "staged N tokens" |

### 3. Verified working (live Chrome test)

| Feature | Verified | Result |
|---|---|---|
| Theme tab loads with 5 sub-tabs | clicked Theme | ✓ Chế độ / Màu / Chữ / Mật độ / Chuyển động |
| Module Master tab strip clean | clicked Module Master | ✓ 24 component sections, no density/global/typography/effects |
| Properties dock dark mode | switched to Dark | ✓ panel/header/footer/inputs all flip |
| Module Master tab clean | clicked into Nút bấm | ✓ defaults to Buttons section |
| **Height cascade** | checked Custom + typed 52 | ✓ `--o3-control-h-standard: 32px → 52px`, buttons resize live |
| Toast on Save | clicked Lưu Theme | ✓ non-blocking toast, auto-fade |
| Sidebar dark mode | switched to Dark | ✓ `rgb(10, 22, 40)` bg, all text `#e2e8f0` |

## Phản biện — what's still rough (v3-G17 backlog)

1. **Custom checkbox UX too subtle** — disabled state of input visually similar to enabled (just slight opacity). Should add:
   - Tooltip on Custom checkbox: "Bật để override Global Theme"
   - Bigger visual difference: disabled = greyed out box, enabled = bordered with brand accent
   - Hint text in dock: "Tick Custom để chỉnh giá trị riêng cho component này"

2. **Properties per section too sparse** — Module Master Buttons section only has 4 layout properties (height, padding-x, radius, gap). User wants more. Need to add per-section comprehensive property catalog (~10 properties per section minimum: layout/colors/typography/motion/state).

3. **Save Theme button toast** — works but doesn't actually persist to backend `graphics_token_value` table (need migration 232 + GraphicsThemeService).

4. **Custom override flag display** — Module Master sub-tab strip doesn't show indicator dots for which sections have any custom overrides. Hard to remember.

5. **Reset Theme** doesn't ALSO clear `o3-props-overrides` localStorage. Reset should offer "Also reset Custom overrides" with confirmation listing what gets lost.

6. **Sidebar items appearing/disappearing** — some sidebar text was reported invisible in dark mode. My CSS targets `#sidebar a *, #sidebar [onclick] *` with `!important` but some legacy sidebar items may use `<span style="color:#...">` inline that wins specificity. Need broader selector `#sidebar [style*="color"]` override.

7. **Font picker `<option>` font-family preview** doesn't render in Chrome's native select dropdown. Need custom dropdown component to actually show typeface preview.

8. **Theme Mật độ slider value display** sometimes shows lagging value when user drags fast. Add `requestAnimationFrame` throttle.

9. **Module Master not detecting Theme changes mid-session** — if user changes density in Theme then visits Module Master Nút bấm without Custom override, the Chiều cao nút input still reads stale 32px. Need to dispatch `o3:theme-applied` custom event and have dock re-read input values.

10. **Backend persistence** — `graphics_token_value` writes need migration 232 + 233 + GraphicsThemeService + REST endpoint POST `/api/v1/graphics/theme`.

## Files shipped (v3-G16)

| File | Lines | What |
|---|---|---|
| `mom/styles/orders-v3.css` | +85 | Dark mode contrast block — sidebar/inputs/dock/cross-mode transition |
| `mom/scripts/portal/00d-admin-appearance-theme.js` | +27 | Save button stages Custom overrides too + toast notification |
| `mom/scripts/portal/00c-admin-appearance.js` | cache | mm11→mm12 |
| `mom/scripts/portal/02-state-auth-ui.js` | cache | mm11→mm12 |
| `mom/portal.html` | cache | mm11→mm12 (2 script tags) |

**Total: 5 files, 110 net additions, commit `d16407aa8`.**

## Recommended v3-G17 work (next session)

1. **Custom checkbox UX clarity** — bigger visual difference, tooltip, hint banner
2. **Property catalog expansion** — minimum 10 properties per section (currently 4-7)
3. **Backend persistence** — migration 232 + 233 + GraphicsThemeService + REST endpoints
4. **Sub-tab override dot indicator** — small dot when section has overrides
5. **Cross-mode value refresh** — `o3:theme-applied` event + dock re-read

## Final live URL

https://eqms.hesemeng.com/mom/portal.html?nocache=mm12#admin/appearance

User test flow:
1. Click 🎨 Theme → switch Dark → entire UI (sidebar, admin nav, theme tab, dock) flips
2. Click ☾Chế độ / 🎨Màu / 🔠Chữ / 📐Mật độ / ⚡Chuyển động sub-tabs
3. Drag slider in Mật độ → all Module Master previews scale
4. Click brand color picker → entire palette shifts
5. Click 🧩 Module Master → click Nút bấm → open Properties dock
6. **CHECK Custom checkbox** for any property → input enables → change value → preview updates live
7. Click "Lưu Theme cho tổ chức" → toast confirms count of staged tokens
