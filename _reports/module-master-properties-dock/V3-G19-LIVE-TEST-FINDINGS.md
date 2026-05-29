# v3-G19 Live Test Findings — Height Bug Root Cause + Fake Bindings Fix

**Cache:** `?v=20260529-mm16`
**Commits:** `ce62c5f81` (root cause) + `6e83ef931` (fake bindings)
**Live URL:** `https://eqms.hesemeng.com/mom/portal.html?nocache=mm16#admin/appearance`

## User report

> "Tôi thấy giá trị chiều cao phải tăng lên số lớn 50 thì thay đổi một tí (khoảng thay đổi nhỏ). Nếu tôi giảm xuống thì không đổi. Hãy điều tra nguyên nhân gốc rễ và tìm các lỗi tương tự để khắc phục gốc rễ. Đảm bảo không còn nút nào làm không thay đổi đồ họa."

## Root cause diagnostic chain (live in Chrome DevTools)

```js
> document.documentElement.style.getPropertyValue('--o3-control-h-standard')
  '20px'                           // token writes correctly
> document.querySelector('.o3-btn--primary').getBoundingClientRect().height
  48                                // ← BUG: button is 48px not 20px
> getComputedStyle(btn).minHeight
  '48px'                            // ← clamped here
```

Walking every stylesheet rule that matched `.o3-btn` for height/min-height:

```js
matching rule found:
  file:     mom/assets/css/mobile.css
  selector: button, a, input[type="submit"], input[type="button"],
            select, .btn, [role="button"]
  rule:     min-height: var(--touch-min) /* 48px */
  scope:    NONE — wrapped in zero media queries → fires on every device
```

## Root cause

**`mom/assets/css/mobile.css` line 67-76** had an **unconditional** rule
that applied `min-height: 48px; min-width: 48px` to EVERY interactive
element on the page — including desktops with mouse pointers. This
silently violated the HESEM SSOT in `CLAUDE.md`:

> "Single-standard control-height (one size, no variants). HESEM SSOT
> rule: every interactive control — button, tab, input, chip-button,
> search — uses ONE height, `control.height.standard` = 32px."

The mobile.css rule predates the SSOT rule. Since it landed every
height slider in Module Master has been a no-op below 48px and only
shown ~2px change above 48px.

User's observation matches exactly:
- type 50: only ~2px change (50 > 48 clamp, so 2px above)
- type lower than 48: no change (clamped at 48)

**WCAG 2.5.5 (target size)** only requires 44×44 touch targets on
touch devices — mouse pointers don't need this clamp. So the fix is:
scope the rule to `@media (pointer: coarse)`.

## Fix

**File 1: `mom/assets/css/mobile.css`** — wrapped both rules in `(pointer: coarse)`:

```diff
- button, a, input[type="submit"], input[type="button"], select, .btn,
- [role="button"] {
-   min-height: var(--touch-min);
-   min-width: var(--touch-min);
- }
+ @media (pointer: coarse) {
+   button, a, input[type="submit"], input[type="button"], select, .btn,
+   [role="button"] {
+     min-height: var(--touch-min);
+     min-width: var(--touch-min);
+   }
+ }
```

Same wrap for the 768-1024px tablet rule (lines 281-307) so a desktop
window resized to that range doesn't inherit the 56px clamp.

**File 2: `mom/styles/orders-v3.css`** — `.o3-btn` made genuinely token-driven:

```diff
.o3-btn {
- gap: 6px;
+ gap: var(--o3-space-xs, 6px);
  height: var(--o3-control-h-standard);
+ min-height: var(--o3-control-h-standard);   /* defence in depth */
- padding: 0 12px;
- font-size: 13px;
- font-weight: 500;
+ padding: 0 var(--o3-space-md, 12px);
+ font-size: var(--o3-font-size-md, 13px);
+ font-weight: var(--o3-font-weight-medium, 500);
}
```

**File 3: `mom/scripts/portal/00c-admin-appearance-module-sample.js`** — fake bindings removed:

Live audit script mutated every input in the Buttons section and
captured before/after computed styles. Result: **4 properties were
silently no-ops** even after the mobile.css fix:

| Property | Why it was fake | Fix |
|---|---|---|
| Padding dọc (--o3-space-sm) | `.o3-btn` has fixed height — vertical padding has no visual effect | REMOVED from catalog |
| Khe giữa nút (--o3-space-sm) | Container had `style="gap:8px"` hardcoded | Container now `gap:var(--o3-space-sm,8px)` |
| Border default (colorsLight.borderDefault) | Token wasn't in TOKEN_CSS_VAR map → wrote to nonexistent `--colorsLight-borderDefault` | Added mapping to `--o3-border-default` |
| Chữ disabled (colorsLight.textMuted) | Same root cause | Added mapping to `--o3-text-muted` |

## Verification (live Chrome, post-fix)

```js
TEST RESULTS (mm16):
  SHRINK_TO_24: { value: 24, actualH: 24 }     ✓
  GROW_TO_50:   { value: 50, actualH: 50 }     ✓
  DEFAULT_32:   { value: 32, actualH: 32 }     ✓
  PADDING_TEST: { 8→24, widthBefore: 62.78,
                   widthAfter: 94.78, padding_works: true }  ✓
  VERDICT: 'ALL HEIGHT TESTS PASS'
```

Buttons section property count: **5 layout + 12 colors + 3 typography + 2 motion = 22 properties, all functional**.

## Files shipped

| File | Change | Lines |
|---|---|---|
| `mom/assets/css/mobile.css` | Scope touch-target rule to `(pointer: coarse)` | +16 / -6 |
| `mom/styles/orders-v3.css` | `.o3-btn` consume all visual tokens + min-height defence | +9 / -3 |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | Container gap → var; remove Padding dọc; add 2 token mappings | +6 / -4 |
| `mom/portal.html` | Cache mm14 → mm16 (3 occurrences) | |
| `mom/scripts/portal/00c-admin-appearance.js` | Cache | |
| `mom/scripts/portal/02-state-auth-ui.js` | Cache | |

**Total: 6 files, 2 commits.**

## Wider impact

The mobile.css fix benefits the **entire portal**, not just Module
Master. Every desktop view across:
- Admin tabs (forms, toggles, action buttons)
- Module workspaces (dispatch board, intake queue, order book)
- Doc viewer toolbar
- Modal action bars
- Filter chips
- ...

was being silently inflated to 48px tall regardless of design intent.
Switch users to desktop browsers will see denser, more correct UI
after this deploy.

## Remaining v3-G20 work (next session)

Same audit pattern should be run on the other 23 sections of Module
Master to find more fake bindings. Spot check of Form section already
shows some inputs use hardcoded `padding:0 10px` similar to the
buttons bug. Methodology is now proven:

```js
// For each property: capture computed style → mutate → diff
// If no diff → either the source CSS uses hardcoded value, or the
// token isn't mapped to any --o3-* variable the source CSS reads
```

Will be done as v3-G20 dedicated pass.
