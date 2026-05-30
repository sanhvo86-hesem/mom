# v3-G25c — CSS Class-Hardcode → Token Wiring + Catalog Over-list Trim

**Date:** 2026-05-30
**Cache:** `?v=20260530a` (orders-v3.css) · `20260529-mm29` (admin assets)
**Branch:** `codex/mda-platform-isolated-20260529b`
**Commit:** `45bf20d83` fix(v3-G25c): wire class-hardcoded Module Master dock props to dedicated tokens

---

## 1. THE PROBLEM — 5 dock knobs that were live no-ops

The v3-G19..G24 inline-binding pass fixed all **inline HTML** hardcoded styles. But 5
dock properties remained no-ops because the value was hardcoded inside a **CSS component
class** (not inline HTML), which that pass could not reach:

| Dock knob | Dock CSS var target (broken) | Class hardcode | Expected target |
|---|---|---|---|
| Ô KPI → "Cỡ giá trị" | `--o3-font-size-2xl` | `.o3-kpi__value { font-size: var(--o3-font-size-3xl) }` (read 3xl, dock wrote 2xl) | `--o3-kpi-value-size` |
| Chip → "Padding ngang" | `--o3-space-sm` | `.o3-chip { padding: 0 10px }` | `--o3-chip-pad-x` |
| Chip → "Cỡ chữ chip" | `--o3-font-size-xs` | `.o3-chip { font-size: 12px }` | `--o3-chip-font-size` |
| Chip → "Độ đậm" | `--o3-font-weight-medium` | `.o3-chip { font-weight: 500 }` | `--o3-chip-font-weight` |
| Bảng → "Cỡ chữ cell" | `--o3-font-size-md` | `.o3-table { font-size: var(--o3-font-size-sm) }` (read sm, dock wrote md) | `--o3-table-cell-size` |

Also 2 catalog over-lists (props with nothing to drive):
- **Stepper "Gap step-step"** (`--o3-space-md`): stepper lays out via `flex:1` steps + connectors, no `gap` property.
- **Ô KPI "Cỡ hero"** (`--o3-font-size-3xl`): only one value element per tile; a second font-size knob was redundant once a dedicated `--o3-kpi-value-size` knob exists.

---

## 2. FIX APPROACH — dedicated component-scoped tokens

Chose **dedicated tokens** (not existing-token rebind) because every existing-token
candidate caused either a regression (default mismatch) or cross-component coupling
(editing chip padding would shift table/panel spacing). One knob ↔ one component.

Each token defaults to the **exact prior rendered value** → zero visual regression.

| New token | CSS variable | Default | Prior value |
|---|---|---|---|
| `components.kpi.valueSize` | `--o3-kpi-value-size` | `28px` | `var(--o3-font-size-3xl)` = 28px ✓ |
| `components.chip.paddingX` | `--o3-chip-pad-x` | `10px` | literal `10px` ✓ |
| `components.chip.fontSize` | `--o3-chip-font-size` | `12px` | literal `12px` ✓ |
| `components.chip.fontWeight` | `--o3-chip-font-weight` | `500` | literal `500` ✓ |
| `components.table.cellFontSize` | `--o3-table-cell-size` | `12px` | `var(--o3-font-size-sm)` = 12px ✓ |

---

## 3. FILES CHANGED

| File | Change |
|---|---|
| `mom/styles/orders-v3.css` | 5 new `:root` vars; `.o3-kpi__value`, `.o3-chip`, `.o3-table` class rebound |
| `mom/scripts/portal/00c-admin-appearance-module-sample.js` | KPI "Cỡ giá trị" → `--o3-kpi-value-size`; chip Padding/Font/Weight → dedicated vars; table "Cỡ chữ cell" → `--o3-table-cell-size`; "Cỡ hero" trimmed; "Gap step-step" trimmed |
| `mom/database/migrations/255_graphics_module_master_component_tokens.sql` | SSOT registration in `graphics_token_catalog` (5 rows) + `graphics_component_contract` upsert |
| `mom/portal.html` | orders-v3.css cache `?v=20260528a` → `?v=20260530a`; admin assets mm28 → mm29 |
| `mom/scripts/portal/00c-admin-appearance.js` | version constant mm28 → mm29 |
| `mom/scripts/portal/02-state-auth-ui.js` | `ADMIN_RUNTIME_ASSET_VERSION` mm28 → mm29 |

---

## 4. LIVE VERIFICATION (Chrome, VPS eqms.hesemeng.com, mm29)

### 4a. CSS binding proof (JS computed-style, transition-neutralized)

```
Probe method: createElement, kill transition, setProperty(var, testVal),
              void offsetHeight (force reflow), getComputedStyle(el).fontSize

KPI Cỡ giá trị  (--o3-kpi-value-size):  28px → 40px   ok:true  ✓
Chip Padding ngang (--o3-chip-pad-x):   10px → 19px   ok:true  ✓
Chip Cỡ chữ chip (--o3-chip-font-size): 12px → 14px   ok:true  ✓
Chip Độ đậm (--o3-chip-font-weight):    500  → 800    ok:true  ✓
Bảng Cỡ chữ cell (--o3-table-cell-size):12px → 17px   ok:true  ✓
```

### 4b. Dock UI → preview live change (human-observable)

Tested via Admin → Mặt phẳng điều khiển đồ họa → Module Master:

| Section | Knob | Before | Input | Visual result | Pass |
|---|---|---|---|---|---|
| Ô KPI → Chữ | Cỡ giá trị | 28px | set 20 → computed=20px | Values visibly smaller | ✓ |
| Ô KPI → Chữ | Cỡ giá trị | set 36 → computed=36px | Values visibly larger vs 20 | ✓ |
| Chip → Bố cục | Padding ngang | 10px | set 20 | Chips noticeably wider | ✓ |
| Chip → Chữ | Độ đậm | 500 | set 700 | Chip text visibly bold | ✓ |
| Bảng → Chữ | Cỡ chữ cell | 12px | set 18 | Table text visibly larger | ✓ |
| Stepper → Bố cục | (dock list) | — | — | Only "Cao step" shown; "Gap step-step" absent | ✓ |

### 4c. Transition diagnosis (important footnote for future auditors)

`.o3-kpi__value` has `transition: all`. Under `prefers-reduced-motion: reduce` (active
on this test device), Chrome forces duration to `1e-05s`, which appears instant but
is still async — a synchronous `getComputedStyle` read right after `setProperty` catches
the element mid-transition and reports the OLD value. This was initially misdiagnosed as
an `!important` override from `FORM-DESIGN-SYSTEM-SPEC.css` (whose CORS-blocked status
confused the cssRules enumeration). The real mechanism: neutralize the transition
(`el.style.transition='none'`) before the probe → all 5 bindings confirmed working.

**Future audit harness** should add `el.style.transition='none'` before any font-size
or dimension probe on `.o3-*` elements.

### 4d. Asset version verified live
```
orders-v3.css   → https://eqms.hesemeng.com/mom/styles/orders-v3.css?v=20260530a  ✓
module-sample   → .../00c-admin-appearance-module-sample.js?v=20260529-mm29       ✓
sha256 match    → local == VPS for both files                                     ✓
```

---

## 5. MIGRATION 255 — SQL validation

Dry-run against `eqms_test` PostgreSQL (ROLLBACK transaction):

```
INSERT 0 5 rows into graphics_token_catalog
INSERT 0 3 contracts (v3.kpi / v3.chip / v3.table)
ON CONFLICT merge-append: v3.chip original 5 tokens + 3 new = 8 (DISTINCT/sorted) ✓
Migration drift check: 0 P1 + 3 P2 (pre-existing historical collisions, not mine)
```

Note: `origin/main` is at migration 212; migrations 213–255 are all on AI branches
and will be sequenced at cherry-pick time. The live dock delivery is via the JS
`_vn` direct-setProperty path — the migration is the SSOT governance registration.

---

## 6. WHAT'S SOLID vs WHAT'S NEXT

**Solid + live-verified (mm29):**
- All 5 previously-no-op dock knobs now drive their component live ✓
- 2 over-list entries trimmed (Stepper gap, KPI hero) ✓
- Dedicated tokens decouple component controls from the global ramp ✓
- Zero visual regression (defaults = exact prior rendered values) ✓
- Migration 255 SQL validated against real PG in rollback txn ✓

**Remaining known items (out of scope for this slice):**
- Add `transition`/`animation` guard to the audit harness JS (flip `el.style.transition='none'` before each computed-style probe) so the `transition:all` on `.o3-kpi__value` doesn't produce false audit failures.
- FORM-DESIGN-SYSTEM-SPEC.css loads globally on every admin page — its CORS-blocked status prevents CSS-rules enumeration. Consider adding a `crossorigin` attribute or moving to a same-origin path so the admin audit harness can introspect it.
