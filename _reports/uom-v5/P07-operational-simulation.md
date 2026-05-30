# P07 Operational Simulation

Prompt: P07
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Required Simulations

- SIM-P07-01: `N_m` torque to `J` energy.
  - TEST_EVIDENCE: `QuantityKindCompatibilityP07Test::testSimP0701TorqueToEnergyRejectsByDefault`.
  - Result: PASS. Rejects with reason `same_dimension_semantic_trap`.
- SIM-P07-02: `10 DeltaCel` to `DeltaK`.
  - TEST_EVIDENCE: `QuantityKindCompatibilityP07Test::testSimP0702DeltaCelToDeltaKAllowsLinearOneToOne`.
  - Result: PASS. Result is `10`.
- SIM-P07-03: `10 Cel` to `K`.
  - TEST_EVIDENCE: `QuantityKindCompatibilityP07Test::testSimP0703AbsoluteCelToKAllowsAffine`.
  - Result: PASS. Result is `283.15`.
- SIM-P07-04: Yield 95% to concentration 95%.
  - TEST_EVIDENCE: `QuantityKindCompatibilityP07Test::testSimP0704YieldPercentToConcentrationPercentRejects`.
  - Result: PASS. Rejects with reason `dimensionless_subtype_trap`.
- SIM-P07-05: pH 7 to hydrogen concentration.
  - TEST_EVIDENCE: `QuantityKindCompatibilityP07Test::testSimP0705PhToHydrogenConcentrationRejectsWithoutChemistryHandler`.
  - Result: PASS. Rejects with reason `logarithmic_requires_chemistry_handler`.

## Additional Prompt Simulations

- Golden case pass: explicit same-kind temperature conversion succeeds.
- Negative case: same-dimension Energy/Torque rejects.
- Boundary precision/overflow: P07 does not alter decimal arithmetic; P05 guards remain.
- Permission denied: P07 adds no approval path; new DeltaDegF rule is `pending_review`.
- Stale cache/effective date: compatibility lookup uses effective window and occurs before conversion-rule cache lookup.
- Audit hash replay: successful conversions still use MEASVAL evidence; mismatches include trace id.
- External alias quarantine: P06 remains the canonical precondition before P07.
- UI/API parity: API Problem Details now carries semantic mismatch extension fields; broader API contract remains P10.

## Result

PASS_WITH_WARNINGS due unrelated full-suite KPI registry count drift.
