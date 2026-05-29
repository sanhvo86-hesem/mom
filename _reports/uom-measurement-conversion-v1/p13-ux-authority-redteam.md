# P13 — UX Authority and Hidden-Authority Red-team Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P13 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarial audit of the UoM admin UI for hidden authority surfaces, disabled-state bypass, accessibility regressions, and Graphics Authority drift.

## 2. Threat model

| Threat | Path | Mitigation |
|---|---|---|
| Hidden mutation surface | a button labelled "Activate" silently bypasses workflow | mutation buttons disabled in v1 read-only mode; surface gated to IMPL-07 |
| Disabled-state bypass | user double-clicks a disabled button before opacity update | server-side workflow gate is the truth |
| Hex literal sneak | dev hard-codes `#FFA500` for a one-off | grep pattern in PR review + planned PHPStan rule |
| Px literal sneak | dev hard-codes `padding: 16px` | grep pattern in PR review |
| Vietnamese diacritic loss | translator paste drops diacritics | grep against missing-diacritic patterns |
| Tab trap in drawer | drawer focus-trap leaks to body | `focusin`/`focusout` listeners |
| Esc-key conflict | Esc closes both drawer and parent form | document precedence; v1 drawer closes first |
| Reduced-motion ignored | opacity transition still runs on `prefers-reduced-motion: reduce` | widget checks the media query |
| Display label as authority | user trusts a display unit string instead of canonical | tooltip surfaces canonical + UCUM |
| Dark-mode hard-coded light | colour token resolves to light value even in dark mode | tokens are mode-aware via portal theme |
| Module Sample drift | a one-off CSS rule shipped in a module's stylesheet | Module Sample is the SSOT for component visuals; one-off rules forbidden |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| medium | UA-001 | Module Sample does not yet showcase QuantityInputWidget; risk of drift between widget and the rest of the sample suite | UI gardener add row |
| medium | UA-002 | No automated check for hex/px in `mom/scripts/portal/8*-uom-*.js`; grep passes manually | add PHPStan / ESLint custom rule planned |
| medium | UA-003 | Convert preview row hides on disabled state but error state is ambiguous (no preview + no error text) | render placeholder text on disabled |
| low | UA-004 | Dark-mode contrast not yet measured per token | a11y follow-up |
| low | UA-005 | Esc-precedence between drawer and parent form documented but not enforced; risk if a future deeper-nested drawer changes assumptions | add `data-esc-target` attribute pattern |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-UA001 | UA-001 | add Module Sample row in `00c-admin-appearance-module-sample.js` showcasing the widget with three sample kinds |
| RP-UA002 | UA-002 | custom ESLint rule + CI workflow scan |
| RP-UA003 | UA-003 | placeholder rendering on disabled state |
| RP-UA004 | UA-004 | dark-mode contrast scan via axe + manual verification |
| RP-UA005 | UA-005 | `data-esc-target` convention + drawer manager updates |

## 5. Simulation result table

| Case | Probe | Expected | Actual |
|---|---|---|---|
| UAS-001 | Disabled-state double-click | server gate refuses; UI ignores second click | confirmed (debounce + server) |
| UAS-002 | Hex literal grep on `80-uom-control-center.js` | zero hits | confirmed |
| UAS-003 | Hex literal grep on `81-uom-quantity-widget.js` | zero hits | confirmed |
| UAS-004 | Vietnamese label diacritic scan | zero missing | confirmed |
| UAS-005 | Drawer focus trap | focus does not leak to body | confirmed |
| UAS-006 | Esc on drawer + parent form | drawer closes first | confirmed |
| UAS-007 | Reduced-motion preview animation | disabled | confirmed |
| UAS-008 | Tooltip displays canonical + UCUM + kind | yes | confirmed |
| UAS-009 | Dark-mode token resolves to dark value | yes | confirmed (via DevTools force-mode) |
| UAS-010 | Module Sample render after master-density change | both UoM scripts re-render | confirmed |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Hidden-authority safety | 9 (UA-001 open) |
| Token discipline | 9 (UA-002 manual) |
| Disabled-state UX | 9 (UA-003 open) |
| A11y | 9 |
| Dark-mode | 8 (UA-004 measurement) |
| Drawer/keyboard discipline | 9 (UA-005 open) |
| **Total** | **53 / 60** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
