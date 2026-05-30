# P09 Operational Simulation

Prompt: P09
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

## Required Simulations

- SIM-P09-01: 98.6 degF IQC keeps original 98.6 degF and display 37.0 Cel.
  - TEST_EVIDENCE: `MeasurementValueP09Test::testSimP0901FahrenheitIqcKeepsOriginalAndCanonicalDisplay`.
  - Result: PASS.
- SIM-P09-02: Hash replay same payload passes.
  - TEST_EVIDENCE: `testSimP0902HashReplaySamePayloadPasses`.
  - Result: PASS.
- SIM-P09-03: Change rule version changes hash.
  - TEST_EVIDENCE: `testSimP0903ChangingRuleVersionChangesHash`.
  - Result: PASS.
- SIM-P09-04: Naked `temperature: 37` fixture flagged.
  - TEST_EVIDENCE: `testSimP0904NakedTemperatureFixtureIsFlagged`.
  - Result: PASS.
- SIM-P09-05: AI advisory reference stored but no AI decision authority.
  - TEST_EVIDENCE: `testSimP0905AiAdvisoryReferenceIsStoredWithoutAuthority`.
  - Result: PASS.

## Result

PASS_WITH_WARNINGS due unrelated full-suite KPI registry count drift.
