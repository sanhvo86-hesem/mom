# P07 — Adversarial Coverage Matrix

**Prompt:** HESEM UoM V3 — P07  
**Generated:** 2026-05-29

Every V3 hard blocker has at least one executable test that exercises
real service code and would fail (not silently pass) if the blocker
reopened.

| HB | Test method | Status |
|---|---|---|
| HB-01 | `UomStandardLibraryManifestTest::testApproveManifestRefusesRetiredManifest` + `UomWorkflowService` widened activate path (existing UomWorkflow tests stay green) | CLOSED_BY_CODE_AND_TEST |
| HB-02 | `UomStandardLibraryManifestTest::*` (5 cases) + migration 231 audit-event row | CLOSED_BY_CODE_AND_TEST |
| HB-03 | `check_uom_safety_gate.php` (new) + `UomAdversarialConversionTest` (14 cases) | CLOSED_BY_CODE_AND_TEST |
| HB-04 | `DecimalStringTest` (14 cases), in particular SIM-006 round-trip + SIM-008 overflow + SIM-009 NaN/INF/hex reject | CLOSED_BY_CODE_AND_TEST |
| HB-05 | `MeasurementEvidenceVerifierTest::testSim002_100Cel_to_degF_canonical_is_373_15_K` | CLOSED_BY_CODE_AND_TEST |
| HB-06 | `MeasurementEvidenceVerifierTest::testReplayVerifierRejectsTampered*` (3 tamper cases) | CLOSED_BY_CODE_AND_TEST |
| HB-07 | `ContextualConversionPlannerTest` (6 cases) + new ProblemDetails codes | CLOSED_BY_CODE_AND_TEST |
| HB-08 | `OpcUaUnitIdTest::testPackCommonCodeMatchesOpcUaReference` (dataProvider, 5 cases) | CLOSED_BY_CODE_AND_TEST |
| HB-09 | `UomOpenApiContractTest` (2 cases) | CLOSED_BY_CODE_AND_TEST (contract half); runtime Feature-test layer deferred — STILL_OPEN as documented residual |
| HB-10 | `check_uom_pr_diff_truth.php` (P00 deliverable) + disclosed in P00-final-diff-auditor.md | CLOSED_BY_EXPLICIT_DESCOPING_WITH_APPROVED_RISK — P10 owns reversion |
| HB-11 | `uom_cr_effective_window` CHECK constraint (migration 231) | CLOSED_BY_CODE_AND_TEST (insert-time); resolution-time enforcement P05 forwarded to engine wiring |
| HB-12 | Existing `ExactLinearConverterTest` + V3 `category` field preserved in MEASVAL hash | CLOSED_BY_CODE_AND_TEST (current scope) — column promotion residual to P08 |
| HB-13 | Existing `BcMathRounderTest` (28 cases, all PASS) | CLOSED_BY_CODE_AND_TEST |
| HB-14 | Existing `MeasurementValueFactory::buildWrapOnly` unchanged in P03; canonical-aware wrap deferred to P08 | STILL_OPEN_BLOCKS_NEXT → P08 |

## PHPUnit summary at P07

```
Tests: 129, Assertions: 216, Skipped: 1, Errors: 0, Failures: 0.
```

## Decision token

```text
UOM_V3_P07_PASS_NEGATIVE_TEST_GATE_HARDENED
```
