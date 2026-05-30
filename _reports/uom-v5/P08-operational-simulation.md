# P08 Operational Simulation

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Required Simulations

- SIM-P08-01: 1 L water at density 1 kg/L with lot context -> 1 kg.
  - TEST_EVIDENCE: `ContextualConversionP08Test::testSimP0801OneLWaterWithLotDensityConvertsToOneKg`.
  - Result: PASS.
- SIM-P08-02: 1 L solvent without density.
  - TEST_EVIDENCE: `testSimP0802OneLSolventWithoutDensityRejectsContextRequired`.
  - Result: PASS, rejects `UOM_CONTEXT_REQUIRED`.
- SIM-P08-03: 1000 IU vitamin with lot potency.
  - TEST_EVIDENCE: `testSimP0803OneThousandIuVitaminConvertsToMgWithLotPotency`.
  - Result: PASS, returns 10.00 mg with `potency_assay` evidence.
- SIM-P08-04: 1 BOX item A=10 EA, item B=24 EA.
  - TEST_EVIDENCE: `testSimP0804PackagingPolicyIsItemSpecific`.
  - Result: PASS.
- SIM-P08-05: Packaging policy expired.
  - TEST_EVIDENCE: `testSimP0805ExpiredPackagingPolicyRejects`.
  - Result: PASS, rejects `UOM_MISSING_PACKAGING_POLICY`.

## Additional Prompt Simulations

- Golden case pass: lot density conversion.
- Negative case: missing direct density evidence ref rejects.
- Boundary precision/overflow: P05 decimal parser remains in front of contextual execution.
- Permission denied: P08 reads approved/effective context and creates no approval path.
- Stale cache/effective date: expired packaging policy rejects.
- Audit hash replay: MEASVAL includes contextual evidence.
- External alias quarantine: P06 remains precondition for non-canonical unit strings.
- UI/API parity: API titles include contextual error codes; UI remediation remains P11.

## Result

PASS_WITH_WARNINGS due unrelated full-suite KPI registry count drift.
