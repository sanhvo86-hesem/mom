# v3-G20 Live Test Findings — Three-Layered Root Cause

**Cache:** `?v=20260529-mm18`
**Commits:** `ce62c5f81`, `6e83ef931`, `24a934516`, `adbbc7ad9`, `3052cf180`
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html?nocache=mm18#admin/appearance`

## Root cause — the bug had THREE layers

User's complaint ("chiều cao tăng lên 50 chỉ thay đổi một tí, giảm xuống thì không đổi") looked like one bug. Diagnostic in Chrome DevTools peeled back **three independent CSS conflicts** that all silently broke the Graphics Authority bridge:

### Layer 1 (v3-G19): mobile.css unconditional touch-target rule

```css
/* mobile.css — fires on EVERY device including desktop */
button, a, input[type=submit], ..., select, .btn, [role=button] {
  min-height: var(--touch-min);  /* 48px */
  min-width:  var(--touch-min);  /* 48px */
}
```

**Impact**: every button on desktop clamped to 48px regardless of Authority token. Affects entire portal, not just Module Master.

**Fix**: wrap in `@media (pointer: coarse)` — touch devices still get accessibility clamp, mouse users get the SSOT control height.

### Layer 2 (v3-G19b + v3-G20a): inline hardcoded styles in preview HTML

```js
// Module Sample button section (before):
'<div style="gap:8px;...">'                       // hardcoded gap
+ '<button class="o3-btn">...</button>'           // .o3-btn rule uses tokens ✓
                                                  
// .o3-btn rule itself (orders-v3.css, before):
.o3-btn { padding: 0 12px; font-size: 13px; gap: 6px; ... }
// ↑ hardcoded literals, doesn't read tokens
```

**Impact**: Module Master catalog claimed properties were editable, but the underlying component CSS used literals instead of vars. Sliders moved tokens nobody read.

**Fix**: 
- `.o3-btn` now reads `var(--o3-space-md)`, `var(--o3-font-size-md)`, `var(--o3-space-xs)`, `var(--o3-font-weight-medium)`
- Buttons container `gap:8px` → `gap:var(--o3-space-sm,8px)`
- Form fields preview rewritten — every inline literal replaced with `var(--o3-*)` binding
- Removed FAKE properties from catalog (Padding dọc — meaningless on fixed-height controls)
- Added missing TOKEN_CSS_VAR mappings (`colorsLight.borderDefault`, `colorsLight.textMuted`)

### Layer 3 (v3-G20b): global admin authority bridge !important rules

```css
/* portal.main.css — applies to EVERY input in admin area */
#admin-content input...:not([type="file"]),
#admin-content select,
#admin-content textarea {
  min-height: var(--admin-object-min-h, var(--hds-control-h)) !important;
  padding:    var(--input-padding-y, 0px) var(--hds-control-px) !important;
  font-size:  var(--hds-control-font) !important;
  border-radius: var(--hds-control-radius) !important;
}
```

`--admin-object-min-h = 34px`, `--hds-control-px = 10px`, `--hds-control-font = 13px` — none read Graphics Authority tokens. So Properties dock writes `--o3-*`, but admin inputs read `--hds-*`. Two parallel SSOTs that never talk to each other.

**Impact**: form preview inputs in Module Sample were FROZEN at 34px/10px/13px regardless of slider value.

**Fix**: master-density.css adds a higher-cascade-order override scoped to `#adm-appearance-panel-module-sample`:

```css
#adm-appearance-panel-module-sample input...:not([type="file"]),
#adm-appearance-panel-module-sample select,
#adm-appearance-panel-module-sample textarea {
  min-height: var(--o3-control-h-standard, 32px) !important;
  height:     var(--o3-control-h-standard, 32px) !important;
  padding:    0 var(--o3-space-md, 10px) !important;
  font-size:  var(--o3-font-size-md, 13px) !important;
  border-radius: var(--o3-radius, 4px) !important;
  border:     1px solid var(--o3-border-subtle, #e5e7eb) !important;
  background: var(--o3-surface-card, #fff) !important;
  color:      var(--o3-text-strong, #0f172a) !important;
  line-height: 1.25 !important;
  box-sizing: border-box !important;
}
```

Specificity `(0,1,0,1)` matches the global rule but later in cascade wins. Scoped to Module Sample only so it doesn't change normal admin form behaviour elsewhere.

## Verification (live Chrome mm18)

### Buttons section
```
SHRINK_TO_24: { value: 24, actualH: 24 } ✓ (was 48)
GROW_TO_50:   { value: 50, actualH: 50 } ✓ (was 48)
DEFAULT_32:   { value: 32, actualH: 32 } ✓ (was 48)
PADDING_TEST: { 8→24, widthBefore: 62.78, widthAfter: 94.78,
                padding_works: true } ✓
```

### Form fields section (post v3-G20b)
```
Set --o3-control-h-standard=24, --o3-space-md=20, --o3-font-size-md=17
inputH:    '24px'      ✓ (was '34px' clamped)
inputMinH: '24px'      ✓ (was '34px' clamped)
inputPad:  '0px 20px'  ✓ (was '3px 7px' UA default)
inputFont: '17px'      ✓ (was '13px' clamped)
```

## Architecture lesson

**The Graphics Authority promise** (per CLAUDE.md SSOT rule):
> "Every UI module resolves visual parameters through the Graphics Authority. Never hardcode colors, font stacks, font sizes, spacing, radius, shadows..."

**The reality before this fix**: at least THREE layers of CSS were quietly defying that promise:
1. mobile.css forced 48px on every interactive element
2. Preview HTML used literal `padding:0 10px` strings
3. portal.main.css forced 34px+10px+13px on every admin input

Each layer had a different "right intent" (touch accessibility, theme defaults, density consistency). Combined, they made the Properties dock pretend to control visuals while controlling literally nothing.

**Future Graphics Authority audits should**:
1. Walk every CSS rule that matches a previewable component
2. Test that mutating each registered token actually changes computed style
3. Flag any `!important` rule that uses non-Graphics-Authority variables
4. Treat hardcoded literals in `.o3-*` components as bugs

The audit pattern that found these:

```js
function snap(el){ return JSON.stringify({...all-computed-styles}); }
inputs.forEach(async input => {
  const before = snap(previewEl);
  input.value = newValue;
  input.dispatchEvent('change');
  const after = snap(previewEl);
  if (before === after) console.warn('FAKE BINDING:', input.token);
});
```

## Files shipped (v3-G19 + v3-G20 combined)

| File | Change | Lines |
|---|---|---|
| `mom/assets/css/mobile.css` | Scope touch-target rule to `(pointer: coarse)` | +16 / -6 |
| `mom/styles/orders-v3.css` | `.o3-btn` consumes all visual tokens + min-height defence | +9 / -3 |
| `mom/styles/master-density.css` | Module Sample admin-bridge override | +20 / 0 |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | Container gap → var; remove Padding dọc (2x); rewrite formFieldsSection inline styles | +35 / -30 |
| `mom/portal.html` | Cache mm14 → mm18 (4 occurrences) | |
| `mom/scripts/portal/00c-admin-appearance.js` | Cache | |
| `mom/scripts/portal/02-state-auth-ui.js` | Cache | |

**Total: 7 files, 5 commits across v3-G19+G20.**

## Wider impact

Layer 1 fix benefits **every page on desktop** — admin tabs, module workspaces, doc viewer, filter chips. Cleaner UI density across portal.

Layer 2 fix benefits **every reusable .o3-* component** — they now respect the Authority tokens that the Graphics Authority promised they would.

Layer 3 fix is **scoped to Module Sample only** — doesn't disturb normal admin form behaviour (which other modules depend on).

## Remaining work (v3-G21+)

User backlog from CLAUDE.md and previous findings:
1. **Backend persistence** (graphics_token_value scope=theme + migration 232/233) — still pending, ~1-2 days.
2. **Apply audit pattern to other sections** — KPI, Tables, Toolbar, Chips, etc still have hardcoded inline styles. Same `_grp` pattern as Form needs to spread to all 24 sections.
3. **Adopt `--admin-object-min-h: var(--o3-control-h-standard, 32px)`** in portal.main.css `:root` block so the legacy admin authority bridge globally reads Graphics Authority — would let us delete the Module-Sample-scoped override. Bigger blast radius — needs careful regression test in every admin tab.
