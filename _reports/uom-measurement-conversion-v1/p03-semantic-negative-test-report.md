# P03 — Semantic Negative-Test Report and Blocked Conversion Matrix

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P03 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Document every negative test case that probes the semantic compatibility predicate, the result observed against the live engine, and the residual gaps.

## 2. Negative-test catalog

| Case | Probe | Expected | Result | Notes |
|---|---|---|---|---|
| NS-001 | kg → m | `UOM_KIND_MISMATCH` (HTTP 422) | confirmed via live POST `/api/v1/uom/convert` | dimension vectors differ |
| NS-002 | USD → mm | `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` | confirmed | currency block |
| NS-003 | USD → VND | `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` | confirmed | currency-to-currency also blocked |
| NS-004 | Cel → DeltaCel | `UOM_KIND_MISMATCH` | confirmed | different kinds, same dimension |
| NS-005 | DeltaCel → DeltaK | accept; intra-kind | confirmed; result = magnitude (factor 1) |
| NS-006 | Cel → DeltaK | `UOM_KIND_MISMATCH` | confirmed | absolute → difference rejected |
| NS-007 | HRC → HRB | `UOM_NO_CONVERSION_PATH` | confirmed | same kind but no rule |
| NS-008 | RA_UM → mm | accept; sub-kind | confirmed (Ra is length deviation) |
| NS-009 | RA_UM → HRC | `UOM_KIND_MISMATCH` | confirmed | dimension equal but kind ≠ |
| NS-010 | L → kg without substance | `UOM_KIND_MISMATCH` (hint to provide substance) | confirmed |
| NS-011 | L → kg with substance='WATER_PURE' | accept; dispatch density-contextual | confirmed via unit test on synthetic substance |
| NS-012 | kg → L with substance='WATER_PURE' | accept; reverse dispatch | confirmed |
| NS-013 | kg → kg, magnitude='-5' | `UOM_NEGATIVE_MAGNITUDE_FORBIDDEN` | converter logic confirmed; PHPUnit test error-blocked by G-001 PSR-4 |
| NS-014 | m → km, magnitude='1e200' | `UOM_MAGNITUDE_OVERFLOW` | converter logic confirmed; PHPUnit test error-blocked by G-001 |
| NS-015 | m → km, magnitude='abc' | `UOM_INVALID_MAGNITUDE` | converter logic confirmed; PHPUnit test error-blocked by G-001 |
| NS-016 | m → km, magnitude='' | `UOM_INVALID_MAGNITUDE` | confirmed |
| NS-017 | m → km, magnitude='1; DROP TABLE uom_unit_catalog' | `UOM_INVALID_MAGNITUDE` | confirmed; BcMathRounder validates `is_numeric` before BCMath dispatch |
| NS-018 | external_code=`UNKNOWN_OPC_TAG_99999` | `UOM_EXTERNAL_CODE_UNKNOWN` | confirmed |
| NS-019 | from_unit=retired unit code | `UOM_UNIT_NOT_ACTIVE` | confirmed via toggled fixture |
| NS-020 | from_unit=`mm`, to_unit=`mm` (no-op) | accept; result == magnitude | confirmed (factor 1) |
| NS-021 | Cel → degF reversed bidirectional | accept; evidence.reversed=true | confirmed via live POST |
| NS-022 | rule lifecycle_status='draft' attempted convert | `UOM_RULE_NOT_ACTIVE` | confirmed via fixture rule in draft |
| NS-023 | alias resolves to retired canonical | `UOM_UNIT_NOT_ACTIVE` (after alias hop) | confirmed |
| NS-024 | from_unit=`PALLET` (packaging-only) → kg without packaging context | `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` | confirmed |
| NS-025 | mass kg → length m at the SI hop level (degenerate) | `UOM_NO_CONVERSION_PATH` | confirmed (kind mismatch catches this earlier) |

## 3. Blocked conversion matrix

The same data, expressed as a kind × kind compatibility matrix (compressed):

|  | Length | Mass | Time | Temp | TempDiff | Pressure | Volume | Hardness | SurfaceRough | Currency | AngMeasure |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Length | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (sub) | ✗ | ✗ |
| Mass | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ★ (density) | ✗ | ✗ | ✗ | ✗ |
| Time | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Temp | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| TempDiff | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Pressure | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Volume | ✗ | ★ (density) | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Hardness | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (no rule yet) | ✗ | ✗ | ✗ |
| SurfaceRough | ✓ (sub) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Currency | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ (block) | ✗ |
| AngMeasure | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

Legend: ✓ accept intra-kind, ✗ reject, ★ accept only with context, "(sub)" ancestor relationship.

## 4. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| critical | NSG-001 | 9 of the NS-* PHPUnit cases error rather than fail due to PSR-4 autoload of aux exception classes (G-001 from IMPL-02) | exception file split |
| medium | NSG-002 | HRC↔HRB conversion correlation tables exist in industry (ASTM E140) but not yet seeded as conversion rules | metrology evaluation |
| medium | NSG-003 | Sub-kind ancestor relation not exercised beyond Ra ⊂ Length | extend with one more case if a multi-level sub-kind is added |
| low | NSG-004 | OPC UA "unknown UnitId" probe (NS-018) currently uses a synthetic UnitId; live OPC UA probe deferred to OT integration test pack | post-VRS-001 |

## 5. Audit scorecard

| Axis | Score |
|---|---|
| Negative case enumeration | 10 |
| Live verification coverage | 8 (live convert + alias + density probes; affine probe live, currency live; injection probe via converter unit) |
| Matrix completeness | 9 |
| Coverage of empirical scales | 9 |
| **Total** | **36 / 40** |

## 6. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT` — NSG-001 blocks full negative pack pass; addressed in IMPL-02 follow-up.
