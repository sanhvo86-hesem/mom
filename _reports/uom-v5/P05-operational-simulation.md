# P05 Operational Simulation

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

## Required P05 Simulations

- SIM-P05-01: `9007199254740993e0 kg -> g` preserves exact decimal string.
  - TEST_EVIDENCE: `testSimP0501LargeScientificKgToGPreservesExactDecimalString`.
  - Result: PASS, output `9007199254740993000`.

- SIM-P05-02: `98.6 degF -> Cel` equals `37.0`, not `54.8`.
  - TEST_EVIDENCE: `testSimP0502AffineFahrenheitToCelsiusIsNotFactorOnly`.
  - Result: PASS.

- SIM-P05-03: pH/logarithmic conversion rejects.
  - TEST_EVIDENCE: `testSimP0503LogarithmicCategoryRejectsDeterministically`.
  - Result: PASS, `UOM_CATEGORY_NOT_SUPPORTED`.

- SIM-P05-04: `density_based` before P08 rejects deterministically.
  - TEST_EVIDENCE: `testSimP0504DensityBasedCategoryRejectsBeforeP08`.
  - Result: PASS, `UOM_CATEGORY_NOT_SUPPORTED`.

- SIM-P05-05: overflow magnitude rejects before DB/write.
  - TEST_EVIDENCE: `testSimP0505OverflowRejectsBeforeDbRead`.
  - Result: PASS, zero fake DB queries.

## Additional Simulations

- Reverse affine:
  - TEST_EVIDENCE: `testReverseAffineUsesOffsetFormula`.
  - Result: PASS, `37 Cel -> degF` returns `98.6`, with `reversed=true`.

- Category matrix coverage:
  - TEST_EVIDENCE: `testCategoryDispatchMatrixContainsEveryDbCategory`.
  - Result: PASS.

## Generic Simulation Matrix

- Golden case pass: SIM-P05-01 and SIM-P05-02 PASS.
- Negative case fail đúng lỗi: SIM-P05-03 and SIM-P05-04 PASS.
- Boundary precision/overflow: SIM-P05-05 PASS.
- Permission denied: Not touched in P05; P04 owns manifest permission.
- Stale cache/effective date: Engine now forwards as-of/context hash; cache observability remains P13.
- Audit hash replay: MEASVAL hash still recomputes and now includes richer evidence payload.
- External alias quarantine: P06.
- UI/API parity: P10/P11.

Simulation result: PASS_WITH_WARNINGS.
