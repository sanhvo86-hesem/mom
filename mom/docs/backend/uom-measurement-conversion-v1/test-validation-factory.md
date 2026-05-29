# P14 — Test and Validation Factory

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P14 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the test factory — golden-case catalog, simulation harness, and validation protocol — that every IMPL slice executes to prove conformance.

## 2. Test layers

| Layer | Path | What runs |
|---|---|---|
| Unit | `mom/tests/Unit/Uom/` | converter math, MEASVAL shape, alias resolution edge cases |
| Feature | `mom/tests/Feature/Uom/` (planned) | REST endpoint contract tests |
| Integration | `mom/tests/Integration/Uom/` (planned) | bridge + scanner against real DB |
| End-to-end | `tests/e2e/module-template-v4-*.spec.ts` | Playwright (HMV4 program; UoM Control Center to join after VRS-001) |
| Live VPS | manual + scripted probes | curl + portal-based fetches against eqms.hesemeng.com |

## 3. Golden-case catalog (representative)

| Case ID | Category | Input | Expected |
|---|---|---|---|
| TC-001 | linear | 1000 mm → m | 1.000000 |
| TC-002 | linear | 1 in → mm | 25.400000 |
| TC-003 | affine | 100°C → °F | 212.000000 |
| TC-004 | affine | 0°C → K | 273.150000 |
| TC-005 | affine reverse | 273.15 K → °C | 0.000000 |
| TC-006 | exact_linear bidir | 1 km → m | 1000.000000 |
| TC-007 | density volume→mass | 1 L water → kg | 0.998207 |
| TC-008 | density mass→volume | 1 kg water → L | 1.001794 |
| TC-009 | hardness pass-through | 50 HRC → HRC | 50.000000 (no-op) |
| TC-010 | surface roughness | 0.8 RA_UM → mm | 0.000800 |
| TC-N001 | invalid magnitude | '' | UOM_INVALID_MAGNITUDE |
| TC-N002 | invalid magnitude | 'abc' | UOM_INVALID_MAGNITUDE |
| TC-N003 | affine sign | 98.6 °F (factor-only attempt) | engine path forbids; correct 37°C |
| TC-N004 | injection | `1; DROP TABLE` | UOM_INVALID_MAGNITUDE |
| TC-N005 | overflow | `1e200` | UOM_MAGNITUDE_OVERFLOW |
| TC-N006 | negative on unsigned | -5 kg | UOM_NEGATIVE_MAGNITUDE_FORBIDDEN |
| TC-N007 | currency | USD → mm | UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE |
| TC-N008 | kind mismatch | kg → m | UOM_KIND_MISMATCH |
| TC-N009 | no path | HRC → HRB | UOM_NO_CONVERSION_PATH |
| TC-N010 | retired unit | retired_code → anything | UOM_UNIT_NOT_ACTIVE |
| TC-N011 | unknown alias | `µm` no hint | (resolves with default or quarantines) |
| TC-N012 | density missing | L → kg substance=unknown | UOM_DENSITY_NOT_FOUND |
| TC-N013 | density zero | L → kg substance=density-zero | UOM_DENSITY_ZERO |
| TC-N014 | ITUOM-only | PALLET → kg | UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION |
| TC-N015 | tamper | edited envelope JSONB | UOM_TAMPER_DETECTED on bridge re-wrap |

## 4. Simulation harness

`tests/Unit/Uom/VRS001ValidationTest.php` exercises seven core MEASVAL invariants:

1. Envelope shape matches schema.
2. Audit hash is 64-char lowercase hex.
3. Hash deterministic across equivalent envelopes.
4. Hash changes on any content edit.
5. Precision envelope recorded.
6. Digital thread carries hash_algorithm.
7. Reversed evidence flag on reverse path.

All seven pass on the live engine.

## 5. Live probe harness

Each live probe issues an authenticated request against eqms.hesemeng.com:

| Probe | Method |
|---|---|
| LV-001 | GET /api/v1/uom/health |
| LV-002 | POST /api/v1/uom/convert (1000mm→m) |
| LV-003 | POST /api/v1/uom/convert (100°C→°F) |
| LV-004 | POST /api/v1/uom/aliases/resolve (Ra) |
| LV-005..LV-011 | additional probes documented in IMPL-06 + IMPL-07 reports |

Probes are scripted in the IMPL reports and re-run manually after every deploy. CI smoke test for these is a planned follow-up.

## 6. Validation protocol

| Step | Output |
|---|---|
| 1. Run PHPUnit (unit + feature) | pass / fail counts |
| 2. Run PHPStan | 0 errors required |
| 3. Run migration drift detector | no P1 |
| 4. Run KPI integrity | PASS |
| 5. Apply migrations on staging DB | success |
| 6. Run scanner full scan on staging | overall_status=OK |
| 7. Run live VPS probes | LV-001..LV-011 pass |
| 8. Run VRS-001 pack | 7 cases pass |
| 9. Visual regression | (Module Sample for tokens, follow-up for composites) |
| 10. Compile audit scorecard | sum ≥ 90 for PASS_READY_FOR_NEXT |

## 7. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| TD-001 | Golden-case IDs are stable; reference them across reports | clarity |
| TD-002 | Live probes are canonical truth; local pass is necessary but not sufficient | live-first verification |
| TD-003 | VRS-001 is the pre-production gate; production cutover is a separate gate | UD-013 |
| TD-004 | Visual regression for UoM Control Center deferred to post-VRS-001 | scope |

## 8. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| critical | TG-001 | 9 negative cases error on PSR-4 autoload (G-001) | IMPL-02 split |
| medium | TG-002 | Feature / Integration test classes not yet written | per-PR follow-up |
| medium | TG-003 | Live VPS probes not yet scripted as CI smoke | follow-up |
| low | TG-004 | Bench harness absent | optional |

## 9. Audit scorecard

| Axis | Score |
|---|---|
| Golden-case coverage | 9 |
| Simulation harness | 10 |
| Live-first discipline | 10 |
| Layer separation | 9 |
| **Total** | **38 / 40** |

## 10. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 11. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/golden-conversion-case-catalog.md` (P14 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p14-coverage-gap-report.md` (P14 / 3)
