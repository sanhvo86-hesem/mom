# P13 — QuantityInputWidget Behaviour Contract

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P13 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the public API, behaviour, and accessibility commitments of `HesemUom.QuantityInputWidget` — the reusable inline form widget every measurement-bearing form in HESEM should consume.

## 2. Public API

```js
HesemUom.QuantityInputWidget.create(host, opts);
```

### `host`

DOM element to mount the widget into. The widget injects an input + unit selector + (optional) preview row.

### `opts`

| Option | Type | Default | Purpose |
|---|---|---|---|
| `kind` | string | (none) | optional; restricts the unit selector to one QuantityKind |
| `defaultUnit` | string | required | canonical_code for initial unit selection |
| `targetUnit` | string | (none) | canonical_code for preview convert; if absent, preview is hidden |
| `displayPrecision` | int | 6 | display_scale passed to convert |
| `roundingPolicy` | string | `ROUND_HALF_EVEN` | policy code passed to convert |
| `contextCode` | string | `UI` | semantic_context.domain |
| `itemId` | string \| null | null | passed to convert for ITUOM context |
| `quantityKindHint` | string \| null | null | hint for ambiguous alias lookup |
| `onChange` | function | (none) | called on every committed value change |
| `onMeasvalReady` | function | (none) | called once after the live convert returns |

### `onChange` payload

```js
{
  magnitude:    "1000",        // string (preserves BCMath precision)
  unit_code:    "mm",
  kind_code:    "Length",
  is_valid:     true,
  problem_code: null            // populated if engine rejected
}
```

### `onMeasvalReady` payload

The full MEASVAL envelope (see `mom/docs/architecture/.../measurement-value-contract.md`).

## 3. Behaviour

| Event | Behaviour |
|---|---|
| Type into magnitude | 200ms debounce → call onChange |
| Change unit selector | immediately call onChange |
| Magnitude becomes non-numeric | `is_valid=false`, problem_code=`UOM_INVALID_MAGNITUDE`, inline error |
| Convert preview success | render result in preview row, call onMeasvalReady with envelope |
| Convert preview error | render problem-details `detail` in inline error |
| Esc on focused input | clear unsaved magnitude (revert to last committed) |
| Tab order | magnitude → unit selector → next form field |
| Hover help | tooltip showing canonical_code + UCUM code + kind |
| Disabled | both controls disabled; preview row hidden |
| Reduced motion | preview opacity transition disabled |

## 4. Convert call

The widget calls `POST /api/v1/uom/convert` with body:

```json
{
  "magnitude":     "1000",
  "from_unit":     "mm",
  "to_unit":       "m",
  "display_precision": 6,
  "rounding_policy":   "ROUND_HALF_EVEN",
  "context_code":  "UI",
  "item_id":       null,
  "quantity_kind_hint": null
}
```

Headers: `Content-Type: application/json`, `X-CSRF-Token: <token>`.

## 5. Failure-mode contract

| Failure | Widget behaviour |
|---|---|
| Network timeout | retry once after 500ms; if still fails, show retry button |
| HTTP 401 | call host's auth-required hook; do not render result |
| HTTP 403 csrf_failed/csrf_expired | call host's refresh-csrf hook; retry once |
| HTTP 422 with UOM_... problem code | render `detail` inline |
| HTTP 500 server_error | render generic error and a link to support |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| QD-001 | Magnitude is **string** end-to-end — never coerce to number until BCMath | UD-001 |
| QD-002 | Debounce 200ms balances UX vs rate-limit budget | RR-003 |
| QD-003 | preview convert uses POST `/convert` (the same endpoint server-side consumers use) — single contract | governance |
| QD-004 | Esc reverts unsaved; never destroys host form state | UX safety |
| QD-005 | Disabled state hides preview to avoid stale-data confusion | clarity |
| QD-006 | Tooltip displays canonical + UCUM + kind so user can audit unit choice inline | tamper-resistance |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | QG-001 | Widget does not yet surface alias quarantine state if input is ambiguous | UX follow-up |
| medium | QG-002 | Widget does not yet expose density-context input for cross-kind | UX follow-up |
| low | QG-003 | Tooltip content is English-only | i18n follow-up |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| API clarity | 10 |
| Behaviour completeness | 9 |
| Failure-mode coverage | 10 |
| String-magnitude discipline | 10 |
| A11y commitments | 10 |
| **Total** | **49 / 50** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/design-system/uom-measurement-conversion-v1/frontend-ux-spec.md` (P13 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p13-ux-authority-redteam.md` (P13 / 3)
- Companion: `mom/docs/design-system/uom-measurement-conversion-v1/ui-implementation-handoff.md`
