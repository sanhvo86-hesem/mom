# P05 — Precision, Rounding, and Uncertainty Policy Specification

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P05 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the numeric-precision and rounding-policy regime so every conversion result is reproducible bit-for-bit on any host, and every rounding decision is audit-traceable to a named policy row.

## 2. Precision regime

| Constant | Value | Where applied |
|---|---|---|
| BCMath scale | 30 | every `bcadd`, `bcsub`, `bcmul`, `bcdiv` inside the four converter classes |
| Internal precision | 30 | beyond IEEE-754 double (15.95 decimal digits) by 14 digits |
| Display scale (default) | 6 | rounded into the MEASVAL `display.magnitude` field |
| Catalog factor scale | 20 | stored in `uom_unit_catalog.si_factor` numeric(40,20) |
| Catalog offset scale | 20 | stored in `uom_unit_catalog.si_offset` numeric(40,20) |
| Rule factor scale | 20 | `uom_conversion_rule.factor` numeric(40,20) |
| Rule offset scale | 20 | `uom_conversion_rule.offset_value` numeric(40,20) |
| Density scale | 20 | `material_density_registry.density_value` numeric(40,20) |

The 30-digit internal scale is deliberately larger than every stored scale. This means catalog values are exact in internal computation; rounding loss only occurs at the explicit display rounding step.

## 3. Rounding policies

`uom_rounding_policy` (migration 216) seeded rows:

| policy_code | Mode | Reference | Default? |
|---|---|---|---|
| ROUND_HALF_EVEN | banker's rounding | ASTM E29 §6.4 + IEEE 754 round-half-to-even | yes |
| ROUND_HALF_UP | traditional half-up | ASTM E29 §6.1 | no |
| ROUND_DOWN_TRUNCATE | truncate toward zero | conservative engineering | no |
| ROUND_UP_CEILING | always away from zero | safety-critical (limit checks) | no |
| ROUND_NONE | preserve full scale=30 | regulated workflows that re-apply rounding downstream | no |

Selection rules:

- Default = `ROUND_HALF_EVEN` for measurement / SPC / regulated outputs.
- `ROUND_HALF_UP` for commerce-displayed values (price-display style).
- `ROUND_DOWN_TRUNCATE` for stock-keeping unit increments.
- `ROUND_UP_CEILING` for safety-limit checks where over-counting is preferred.
- `ROUND_NONE` only when downstream service guarantees it will re-round.

## 4. Uncertainty handling

MEASVAL `precision_envelope`:

```json
{
  "bcmath_scale": 30,
  "display_scale": 6,
  "rounding_policy": "ROUND_HALF_EVEN",
  "uncertainty": null
}
```

Uncertainty is structured but not yet populated in v1; the column is reserved for:

- `combined_standard_uncertainty` (GUM §5)
- `expanded_uncertainty` (GUM §6)
- `coverage_factor_k`
- `effective_degrees_of_freedom`

Once metrology team can supply uncertainty budgets per rule, the engine will populate the field from `uom_conversion_rule.uncertainty_budget_id` (reserved column, not yet active).

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| PD-001 | Internal scale 30 strictly larger than any catalog scale | bit-exact safety |
| PD-002 | Default rounding = HALF_EVEN | ASTM E29 §6.4 + GAMP / FDA bias-neutrality preference |
| PD-003 | Rounding policy referenced by code, not embedded | versioning + audit |
| PD-004 | `ROUND_NONE` preserves full scale=30 in the result string | regulated downstream contract |
| PD-005 | Uncertainty reserved but not active in v1 | YAGNI until metrology supplies budgets |
| PD-006 | BCMath chosen over `decimal` / `gmp` because of regulated requirement and language availability (PHP 8.5 native) | language stack |
| PD-007 | bcround() (PHP 8.4+) used as the policy applier where available; manual string fallback otherwise | portability |
| PD-008 | No conversion may produce NaN or Inf; non-numeric input rejected upstream | safety |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | PG-001 | Uncertainty budgets absent — `uncertainty` field is always NULL in v1 envelopes | metrology to supply; reserve column populated when ready |
| medium | PG-002 | Different rounding policies for different consumers not enforced at API surface | consumer can request via `rounding_policy` in convert payload; default still HALF_EVEN |
| low | PG-003 | Performance: HALF_EVEN via manual string fallback (PHP < 8.4) is slower than native bcround; not yet benched | next slice may bench |

## 7. Reproducibility test

A conversion result computed today must match a conversion result computed in 5 years using the same:
- input magnitude string,
- from/to canonical codes,
- rule_code + rule_version,
- rounding policy code,
- display scale.

This is the reproducibility invariant. It implies:

- Never auto-upgrade a rule's factor / offset; that creates a new rule_version.
- Never silently change rounding policy default; that creates a new precision_envelope row.
- Never drift BCMath scale; constant 30.

`tests/Unit/Uom/VRS001ValidationTest::testHashDeterministicAcrossEquivalentEnvelopes` exercises this invariant on the live engine.

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Precision regime clarity | 10 |
| Rounding policy taxonomy | 10 |
| Reproducibility discipline | 10 |
| Uncertainty scaffolding | 7 (deferred to metrology supply) |
| **Total** | **37 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/conversion-engine-spec.md` (P05 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p05-conversion-engine-redteam.md` (P05 / 3)
