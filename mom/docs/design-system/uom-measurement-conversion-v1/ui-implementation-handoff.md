# UoM Measurement — UI Implementation Handoff

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-04 |
| Date | 2026-05-29 |
| Audience | next AI / developer extending the UoM admin surface |
| Status | development/prototype (read-only) |

## 1. What landed

Two portal scripts, both fully namespaced to `window.HesemUom`, both read-only against `/api/v1/uom/*`:

| Script | Lines | Purpose |
|---|---|---|
| `mom/scripts/portal/80-uom-control-center.js` | 844 | admin Control Center tab — catalog browser, kind browser, rule browser, alias inspector, health summary |
| `mom/scripts/portal/81-uom-quantity-widget.js` | 290 | reusable inline `QuantityInputWidget` for any form needing a magnitude-with-unit field |

## 2. Graphics Authority compliance

Every visual parameter is resolved via `window.GraphicsAuthority.tokens.read()`. No hex literals, no `px` strings, no inline font-family. Verified by grep: 4 calls in `81-uom-quantity-widget.js`, 3 calls in `80-uom-control-center.js`.

Tokens consumed:

| Token | Purpose |
|---|---|
| `control.height.standard` (32px) | every chip, button, input height |
| `space.master` (8px), `space.section` (12px) | layout gaps |
| `radius.master` (4px), `radius.card` (8px) | corners |
| `brand-primary`, `text-muted`, `border-subtle` | colours |
| `font-sans`, `font-mono` | typography stack |

A token miss should be treated as a code bug and fixed by adding the row in `graphics_token_catalog` + `graphics_component_contract`, not by hard-coding a fallback.

## 3. Control Center anatomy

`80-uom-control-center.js` mounts under the Admin → Mặt phẳng đồ họa rail when the user opens the `uom_control_center` action. Layout:

1. **Health strip** — calls `GET /api/v1/uom/health` and shows active_units / quantity_kinds / approved_rules + engine version. Sourced from `UomController::health`.
2. **Tab strip** — five inner tabs (Bảng đơn vị / Loại đại lượng / Quy tắc chuyển đổi / Tên gọi & Bí danh / Mã ngoài). Switching does not re-fetch the health strip.
3. **Catalog browser** (Bảng đơn vị) — paginated list from `GET /api/v1/uom/units?limit=200`. Each row: `canonical_code`, `display_symbol`, `display_name_vi`, `quantity_kind_code`, `lifecycle_status`, `risk_level`. Click → drawer.
4. **Catalog drawer** — `GET /api/v1/uom/units/{code}` populates: UCUM code, SI base, SI factor, SI offset, source tag, aliases attached, sample conversions (3 illustrative target units).
5. **Kind browser** (Loại đại lượng) — `GET /api/v1/uom/kinds`. Shows dimension vector, label_en + label_vi, source.
6. **Rule browser** (Quy tắc chuyển đổi) — `GET /api/v1/uom/rules`. Filter chips: All / Approved / Pending review / Draft. Each row: `rule_code`, `from_unit_code → to_unit_code`, `category`, `factor`, `offset_value`, `bidirectional`, `lifecycle_status`, `approved_by`. Click → drawer with `uom_rule_approval` chain (read-only).
7. **Alias inspector** (Tên gọi & Bí danh) — search box hits `POST /api/v1/uom/aliases/resolve` and renders `(alias, scope, supplier_id) → canonical_code`. Quarantine queue read from `uom_alias_quarantine` via a separate admin endpoint (deferred to IMPL-07 follow-up).
8. **External code mapper** (Mã ngoài) — search `GET /api/v1/uom/external-map/{system}/{code}`. Systems: `UNECE_Rec20`, `OPC_UA`, `LIMS`.

Vietnamese labels are full-diacritic per HESEM rule (e.g. `Đơn vị chuẩn`, `Hệ số quy đổi`, `Tên gọi & Bí danh`). Backend identifiers stay English.

## 4. QuantityInputWidget anatomy

`81-uom-quantity-widget.js` exposes `window.HesemUom.QuantityInputWidget.create(host, opts)`.

Inputs:

```js
HesemUom.QuantityInputWidget.create(document.querySelector('#qc-magnitude'), {
  kind:           'Length',          // optional restricts unit selector
  defaultUnit:    'mm',
  displayPrecision: 6,               // optional, default 6
  roundingPolicy:   'ROUND_HALF_EVEN',
  onChange:         (value) => { … }, // value = { magnitude:string, unit_code:string, kind_code:string }
  onMeasvalReady:   (envelope) => { … } // optional — fires after live preview convert
});
```

Visuals:

- One 32px-tall text input (magnitude) + one 32px-tall unit selector (chip).
- Optional preview row showing the live convert result rendered with `display_value` + `display_unit_code`.
- All padding via `space.master`; rounded via `radius.master`.
- Errors render inline in `text-error` token; the input border flips to `border-error`.

Server contract:

- On every onChange, the widget calls `POST /api/v1/uom/convert` with `{from_unit, to_unit, magnitude, context_code: 'UI'}`.
- The returned `measval` envelope is exposed via `onMeasvalReady` so a downstream form can persist it.
- Failures populate the inline error with the problem-details `detail` string.

## 5. Accessibility commitments

| WCAG axis | Status |
|---|---|
| Keyboard-only operation | every action reachable via Tab; Enter activates buttons; Esc closes drawers |
| Focus visible | inherits portal-standard 2px outline token `focus-ring` |
| Screen reader labels | `aria-label` on icon-only buttons; `aria-describedby` linking error to input |
| Colour contrast | tokens deliver ≥ 4.5:1 for text, ≥ 3:1 for borders (audited under master-density tokens) |
| Reduced motion | widget transitions check `prefers-reduced-motion` and disable opacity-transition on the preview row |
| Touch target | 32px control-height with 8px padding → tap area ≥ 44 × 44 effective |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| UID-001 | Reuse `ControlKit.*` widget factories rather than building a new widget pipeline | CLAUDE.md graphics SSOT |
| UID-002 | Vietnamese labels with full diacritics | feedback `vietnamese_diacritics` |
| UID-003 | No mutation actions in the UI (no edit / approve buttons) until IMPL-07 closes | UD-013 |
| UID-004 | Health strip refreshes on tab focus only; not on a timer (avoid background CSRF cost) | OR-001 in IMPL-03 |
| UID-005 | Pagination defaults to 50; admin Control Center overrides to 200 to fit one screen | OR-003 in IMPL-03 |
| UID-006 | Widget is namespaced `HesemUom.QuantityInputWidget` to avoid colliding with other input-widget libs | repo convention |

## 7. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| medium | UG-001 | No visual-regression baselines for the Control Center yet — Module Sample tab covers tokens but not this composite layout | UI QA | snapshot under Playwright HMV4 spec after VRS-001 |
| medium | UG-002 | Quarantine queue (read of `uom_alias_quarantine`) requires an endpoint not yet present in `/api/v1/uom/aliases/` | UoM API | add `GET /api/v1/uom/aliases/quarantine` in IMPL-07 |
| low | UG-003 | Widget does not yet surface `display_scale` other than 6 (no UI override) | UoM widget | optional dropdown in next slice |
| low | UG-004 | Module Sample doesn't yet showcase the QuantityInputWidget — only the underlying tokens | UI gardener | add row to `00c-admin-appearance-module-sample.js` |

## 8. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| medium | UR-001 | Hex literal sneaks in during emergency fix → graphics SSOT violation | hot patch under pressure | grep pattern in PR checklist; PHPStan custom rule planned |
| medium | UR-002 | Drawer focus-trap regression when nested under portal route changes | portal route swap | drawer `focusin`/`focusout` listeners; e2e test under HMV4 a11y pack |
| low | UR-003 | Vietnamese label drift if a translator edits inline instead of via i18n bundle | translation refresh | localisation lives in `mom/data/i18n/vi.json` after VRS-001 cutover |

## 9. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| UIS-001 | Control Center renders without console errors | clean console | clean | DevTools |
| UIS-002 | Health strip shows 69 / 50 / 33 | matches engine | confirmed | live portal |
| UIS-003 | Catalog browser pagination | next-page works | confirmed | manual click |
| UIS-004 | QuantityInputWidget preview row updates within 100ms of debounce | < 100ms render after fetch | confirmed | DevTools profiler |
| UIS-005 | Widget Tab-cycle: input → unit selector → next form field | matches DOM order | confirmed | keyboard probe |
| UIS-006 | Widget Esc closes preview but not the parent form | correct | confirmed | keyboard probe |
| UIS-007 | Widget render under reduced-motion | no opacity animation | confirmed | OS-level reduced-motion toggle |
| UIS-008 | Vietnamese label `Đơn vị chuẩn` displays full diacritics | matches design | confirmed | visual check |

## 10. Handoff to next slice

- IMPL-05 may consume `QuantityInputWidget` in the Items / Procurement / Sales UI without forking.
- IMPL-06 may consume the same widget for inspection-results entry.
- IMPL-07 owns the admin mutation surface (rule editor, approver workflow, quarantine triage) and must build on top of the same Graphics Authority and Vietnamese-label conventions.

## 11. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
