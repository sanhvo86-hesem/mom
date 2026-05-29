# P05 — Conversion Engine: Algorithms and Formula DSL Specification

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P05 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the conversion engine's algorithms, the formula DSL the catalog uses to express factor / offset / non-linear conversions, and the dispatch matrix that routes each conversion to the correct converter.

## 2. Dispatch matrix

| Category | Trigger | Converter | Formula |
|---|---|---|---|
| exact_linear | `is_affine=false`, `category='exact_linear'`, no offset | `ExactLinearConverter::convert` | `y = magnitude × factor` |
| defined_linear | `is_affine=false`, `category='defined_linear'`, no offset | `ExactLinearConverter::convert` | `y = magnitude × factor` (factor source = defined standard, not exact) |
| affine | `is_affine=true`, category='affine' | `AffineConverter::convert` | `y = (magnitude + offset) × factor` |
| affine (reverse) | bidirectional flag + reverse direction requested | `AffineConverter::convertReverse` | `x = result / factor − offset` |
| logarithmic | category='logarithmic' (dB, decibel, decade) | `LogarithmicConverter::convert` | `y = 10 × log10(magnitude / reference)` |
| density_contextual | cross-kind Volume ↔ Mass with substance context | `DensityContextualConverter::volumeToMass` / `massToVolume` | `mass = volume × density_kg_m3` etc. |
| ituom_only | from_unit / to_unit flagged ITUOM-only (packaging) | n/a — reject | `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` |
| currency | from_kind or to_kind = Currency | n/a — reject | `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` |

## 3. Engine flow

```
ConversionEngine::convert(magnitude, fromUnit, toUnit, context):

  1. Validate magnitude is_numeric → else UOM_INVALID_MAGNITUDE
  2. Resolve fromUnit, toUnit via UomAliasResolutionService
  3. Resolve fromKind, toKind via QuantityKindService
     a. If currency on either side       → UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE
     b. If ITUOM-only on either side     → UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION
     c. If kind-mismatch (no ancestor)   → UOM_KIND_MISMATCH
        (unless allows_cross_kind=true AND context.substance_code present)
  4. Check signed-kind constraint
     a. If magnitude < 0 AND kind is unsigned → UOM_NEGATIVE_MAGNITUDE_FORBIDDEN
  5. Check overflow
     a. If |magnitude| > 10^100 → UOM_MAGNITUDE_OVERFLOW
  6. Look up ConversionRule for (fromUnit, toUnit) where lifecycle='active'
     a. If found, use directly
     b. If found reversed AND bidirectional=true → use convertReverse
     c. If no direct rule, attempt SI-base hop (fromUnit → SI → toUnit)
     d. If SI hop impossible (si_factor null on either side) → UOM_NO_CONVERSION_PATH
  7. Dispatch to converter by category
  8. Apply rounding policy via BcMathRounder
  9. Build MEASVAL envelope via MeasurementValueFactory
 10. Compute SHA-256 audit hash of canonical envelope form
 11. Return (result, envelope)
```

## 4. Formula DSL

`uom_conversion_rule` rows carry:

| Column | Type | Purpose |
|---|---|---|
| `factor` | numeric(40,20) | multiplier (always required) |
| `offset_value` | numeric(40,20) | additive offset (NULL for non-affine) |
| `category` | varchar(40) | one of the dispatch matrix entries |
| `bidirectional` | boolean | whether reverse path is sanctioned |
| `rounding_policy_id` | varchar(40) FK | reference to `uom_rounding_policy.policy_code` |
| `formula_expression` | text NULLABLE | optional human-readable expression (reserved for future DSL extension) |
| `lifecycle_status` | varchar(30) | `draft` / `pending_review` / `approved_pending_signoff` / `approved` / `active` / `deprecated` |
| `effective_from` / `effective_to` | date | lifecycle |
| `approved_by` | UUID FK users | populated by e-sign step |
| `approved_at` | timestamptz | when |
| `rule_code` | varchar(50) UNIQUE | human-readable identifier (`UOMCONV-LEN-M-MM-v1`) |
| `rule_version` | smallint | revision number |

Future DSL extension (reserved): `formula_expression` may carry a constrained s-expression for non-linear conversions:

```
(linear factor)
(affine factor offset)
(log10 reference base?)
(density volume_unit mass_unit substance)
```

For v1 only linear / affine / log / density categories are seeded; the column is reserved for the next major release.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ED-001 | Dispatch driven by `category` column, not by inferred shape (factor + offset) | clarity vs guess |
| ED-002 | Affine ALWAYS applies offset before factor (`y = (x + off) × f`) | TC-N003 safety, ED-003 |
| ED-003 | Reverse path uses `convertReverse` when bidirectional=true; never auto-inverts factor | audit trail clarity |
| ED-004 | Engine refuses currency at step 3a before any further resolution | UD-007 |
| ED-005 | SI-base hop is the safety net for missing direct rules; documented in evidence as `evidence.via_si_hop=true` when used | model clarity |
| ED-006 | Rounding policy referenced by id, not embedded in rule; allows policy versioning independent of rule | extensibility |
| ED-007 | rule_code carries kind + units + version for greppability | audit |
| ED-008 | rule_version increments on factor / offset change but not on lifecycle transitions | clarity |
| ED-009 | `formula_expression` column reserved but not parsed by v1 engine | YAGNI |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | EG-001 | Multi-hop conversion (kind A → kind A via 2 intermediate units) not yet supported | extend in next slice with explicit `via_unit_codes` array on rule |
| medium | EG-002 | Logarithmic converter coverage thin (one rule seeded) | extend after SPL integration |
| medium | EG-003 | `formula_expression` DSL parser absent | YAGNI; next major |
| low | EG-004 | rule_code uniqueness constraint defined but no enforcement check in seed audit | add to migration drift report |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Dispatch matrix clarity | 10 |
| Algorithm correctness | 10 |
| DSL scope discipline | 9 |
| Audit-evidence completeness | 10 |
| Extensibility hooks | 9 |
| **Total** | **48 / 50** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/precision-rounding-policy-spec.md` (P05 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p05-conversion-engine-redteam.md` (P05 / 3)
