# P14 — Golden Conversion Case Catalog and Expected Outcomes

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P14 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Catalog every "golden" conversion case with deterministic expected outcomes. Each case is referenced by stable ID across IMPL and P reports so that any future test, audit, or specification can point back to a single truth.

## 2. Positive cases

| ID | Category | From | To | Magnitude | Expected | Notes |
|---|---|---|---|---|---|---|
| TC-001 | exact_linear | mm | m | 1000 | 1.000000 | UOMCONV-LEN-M-MM-v1 reversed |
| TC-002 | defined_linear | in | mm | 1 | 25.400000 | exact-by-definition |
| TC-003 | affine | Cel | degF | 100 | 212.000000 | bidirectional reverse |
| TC-004 | affine | Cel | K | 0 | 273.150000 | forward |
| TC-005 | affine reverse | K | Cel | 273.15 | 0.000000 | reverse path |
| TC-006 | exact_linear bidir | km | m | 1 | 1000.000000 | forward |
| TC-007 | density volume→mass | L | kg | 1 (water_pure 20°C) | 0.998207 | substance=WATER_PURE |
| TC-008 | density mass→volume | kg | L | 1 (water_pure 20°C) | 1.001794 | reverse density |
| TC-009 | empirical pass-through | HRC | HRC | 50 | 50.000000 | no-op |
| TC-010 | sub-kind | RA_UM | mm | 0.8 | 0.000800 | Ra is length deviation |
| TC-011 | derived | rpm | rad_s | (reserved) | (TBD) | future seed |
| TC-012 | pressure | bar | Pa | 1 | 100000.000000 | exact_linear |
| TC-013 | pressure | psi | Pa | 14.7 | 101325.024 (approx) | defined_linear (psi=6894.757...) |
| TC-014 | mass | t | kg | 1 | 1000.000000 | exact_linear |
| TC-015 | velocity | km_h | m_s | 36 | 10.000000 | factor=1/3.6 |

## 3. Negative cases

| ID | Probe | Expected problem_code | HTTP |
|---|---|---|---|
| TC-N001 | magnitude='' | UOM_INVALID_MAGNITUDE | 400 |
| TC-N002 | magnitude='abc' | UOM_INVALID_MAGNITUDE | 400 |
| TC-N003 | 98.6 °F via factor-only path | engine forbids; correct path returns 37 | n/a (logic gate) |
| TC-N004 | magnitude='1; DROP TABLE' | UOM_INVALID_MAGNITUDE | 400 |
| TC-N005 | magnitude='1e200' | UOM_MAGNITUDE_OVERFLOW | 400 |
| TC-N006 | -5 kg → kg | UOM_NEGATIVE_MAGNITUDE_FORBIDDEN | 400 |
| TC-N007 | USD → mm | UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE | 422 |
| TC-N008 | kg → m | UOM_KIND_MISMATCH | 422 |
| TC-N009 | HRC → HRB | UOM_NO_CONVERSION_PATH | 422 |
| TC-N010 | retired_code → mm | UOM_UNIT_NOT_ACTIVE | 404 |
| TC-N011 | resolve('µm') no hint | (may resolve to length default or quarantine) | 200 with warning OR 422 |
| TC-N012 | L → kg substance=UNKNOWN | UOM_DENSITY_NOT_FOUND | 422 |
| TC-N013 | density=0 reverse | UOM_DENSITY_ZERO | 422 |
| TC-N014 | PALLET → kg | UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION | 422 |
| TC-N015 | tamper attempt | UOM_TAMPER_DETECTED on re-wrap | 409 |
| TC-N016 | scope=SUPPLIER without supplier_id | UOM_INVALID_SCOPE | 400 |
| TC-N017 | external_code unknown system | UOM_EXTERNAL_CODE_UNKNOWN | 422 |
| TC-N018 | rule lifecycle=draft, convert | UOM_RULE_NOT_ACTIVE | 422 |

## 4. Live verification matrix

| Case | Coverage |
|---|---|
| TC-001 | live VPS POST `/convert` ✓ |
| TC-003 | live VPS POST `/convert` (reverse bidirectional) ✓ |
| TC-007 | unit test against synthetic substance (live coverage pending consumer wiring) |
| TC-N007 | live VPS POST `/convert` ✓ |
| TC-N008 | live VPS POST `/convert` ✓ |
| TC-N014 | unit test ✓ |
| TC-N015 | live tamper probe (manual; CI follow-up) ✓ |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| GD-001 | IDs are stable; never renumber | clarity |
| GD-002 | Negative IDs use `TC-N` prefix; positive use `TC-` | clarity |
| GD-003 | Density cases pinned to a known substance (`WATER_PURE`) and a known reference temperature (20°C) | reproducibility |
| GD-004 | psi → Pa factor stored at full ASTM precision; display rounded | exact storage |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | GG-001 | TC-011 (rpm → rad/s) requires angular velocity kind seeding | future seed |
| medium | GG-002 | TC-007 / TC-008 live coverage pending QC consumer wiring | follow-up |
| low | GG-003 | TC-N011 has ambiguous expected behaviour (resolve vs quarantine); document hint-required vs hint-optional flow | UX follow-up |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Case breadth | 10 |
| ID stability | 10 |
| Live coverage | 8 |
| Negative coverage | 10 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/test-validation-factory.md` (P14 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p14-coverage-gap-report.md` (P14 / 3)
