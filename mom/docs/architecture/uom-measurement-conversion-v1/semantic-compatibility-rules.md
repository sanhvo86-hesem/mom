# P03 — Semantic Compatibility and Rejection Rules

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P03 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Define the exact rules under which two units are "compatible" for conversion, and the exact rules under which the engine **rejects** a conversion. Compatibility is necessary; correctness still depends on the conversion category (linear / affine / log / density-contextual).

## 2. Compatibility predicate

```
isCompatible(fromUnit, toUnit, context?) =
   fromKind = resolveKind(fromUnit)
   toKind   = resolveKind(toUnit)

   if fromKind == toKind:                                  ALLOW   (intra-kind)
   if fromKind.dimension_vector == toKind.dimension_vector
      AND ancestor(fromKind, toKind):                      ALLOW   (sub-kind, e.g. Ra ⊂ Length)
   if fromKind.allows_cross_kind
      AND toKind.allows_cross_kind
      AND context.token is supplied (substance | packaging | potency):
                                                           ALLOW   (cross-kind with context)
   else:                                                   REJECT
```

## 3. Blocked conversion matrix

Reject categories and the codes the engine emits:

| Reject category | Examples | Problem code |
|---|---|---|
| Kind mismatch (different dimension vectors) | kg → m, s → Pa | `UOM_KIND_MISMATCH` |
| Currency in physical engine | USD → mm, USD → VND | `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` |
| Cross-kind without context | L → kg with no substance | `UOM_KIND_MISMATCH` (with hint "supply substance_code") |
| ITUOM-only unit (packaging-only) in physical convert | PALLET → kg without packaging context | `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` |
| Inactive / retired unit | any conversion using `lifecycle_status != 'active'` | `UOM_UNIT_NOT_ACTIVE` |
| Negative magnitude on unsigned kind | -5 kg, -10 L | `UOM_NEGATIVE_MAGNITUDE_FORBIDDEN` |
| Overflow | 10^200 m → km | `UOM_MAGNITUDE_OVERFLOW` |
| Non-numeric magnitude | "abc" m → mm, "" m → mm, SQL inject | `UOM_INVALID_MAGNITUDE` |
| Unknown external code | OPC UA UnitId not seeded | `UOM_EXTERNAL_CODE_UNKNOWN` |
| No conversion path | two units of same kind but no rule + no SI hop | `UOM_NO_CONVERSION_PATH` |

## 4. Compatibility examples (positive)

| From | To | Kind | Compatible? | Notes |
|---|---|---|---|---|
| mm | m | Length | yes | intra-kind |
| in | mm | Length | yes | intra-kind |
| Cel | K | Temperature | yes | intra-kind, affine |
| Cel | degF | Temperature | yes | intra-kind, affine, bidirectional |
| DeltaCel | DeltaK | TemperatureDifference | yes | intra-kind |
| Cel | DeltaCel | (different kind) | no | absolute vs difference are different kinds |
| RA_UM | mm | sub-kind of Length | yes | Ra is a length deviation; ancestor allowed |
| RA_UM | HRC | dimensionless but different kinds | no | dimensional equality not sufficient |
| HRC | HRB | same kind (Hardness) | no rule | HRC↔HRB is empirically distinct; engine emits `UOM_NO_CONVERSION_PATH` rather than silently coercing |
| L | kg | cross-kind | only with substance | needs context.substance_code |
| kg | L | cross-kind | only with substance | reverse via density |
| USD | mm | currency vs length | no | currency block |
| USD | VND | currency vs currency | no | currency block |

## 5. Compatibility examples (negative — must reject)

| Probe | Expected outcome |
|---|---|
| `from_unit='kg', to_unit='m'` | reject with `UOM_KIND_MISMATCH` |
| `from_unit='USD', to_unit='mm'` | reject with `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` |
| `from_unit='Cel', to_unit='DeltaCel'` | reject with `UOM_KIND_MISMATCH` (different kinds) |
| `from_unit='RA_UM', to_unit='HRC'` | reject with `UOM_KIND_MISMATCH` |
| `from_unit='L', to_unit='kg'` without substance | reject with `UOM_KIND_MISMATCH` |
| `from_unit='L', to_unit='kg'` substance='WATER_PURE' | accept; dispatch to `DensityContextualConverter::volumeToMass` |
| `from_unit='kg', to_unit='kg', magnitude='-5'` | reject with `UOM_NEGATIVE_MAGNITUDE_FORBIDDEN` |
| `from_unit='m', to_unit='km', magnitude='1e200'` | reject with `UOM_MAGNITUDE_OVERFLOW` |
| `from_unit='m', to_unit='km', magnitude='abc'` | reject with `UOM_INVALID_MAGNITUDE` |
| `from_unit='m', to_unit='km', magnitude='1; DROP TABLE'` | reject with `UOM_INVALID_MAGNITUDE` |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| SCD-001 | Identical dimension_vector is **necessary but not sufficient** for compatibility; kind_code equality (or ancestor relationship) is required | UD-003 |
| SCD-002 | Sub-kind compatibility (Ra ⊂ Length) honoured via `parent_kind_code`; allows MM↔RA_UM | model clarity |
| SCD-003 | Cross-kind requires `allows_cross_kind=true` AND a context token (substance / packaging / potency) | UD-007 |
| SCD-004 | Currency vs physical kinds → always rejected, regardless of dimension | UD-007 |
| SCD-005 | Negative magnitude allowed only on signed kinds (TemperatureDifference, signed coordinates); rejected on Mass, Volume, AmountOfSubstance, Count, Force magnitude | safety |
| SCD-006 | Magnitude overflow threshold: |value| > 10^100 → reject | BCMath safety bound |
| SCD-007 | Empty / non-numeric / regex-flagged input → reject before BCMath touches it | injection safety |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | SCG-001 | Sub-kind ancestor relation honoured only one level deep (parent_kind_code); transitive ancestry not yet computed | tighten compatibility resolver if multi-level kinds are introduced |
| medium | SCG-002 | Force / Torque distinction not yet codified as separate kinds; both are M^1L^1T^-2 but Torque is M^1L^2T^-2 — currently torque is its own kind | confirm via integration test |
| low | SCG-003 | Compatibility table not auto-rendered in admin UI | UI follow-up |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Predicate clarity | 10 |
| Negative coverage | 9 |
| Cross-kind safety | 9 |
| Empirical-scale isolation | 9 |
| **Total** | **37 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/quantity-kind-dimension-model.md` (P03 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p03-semantic-negative-test-report.md` (P03 / 3)
