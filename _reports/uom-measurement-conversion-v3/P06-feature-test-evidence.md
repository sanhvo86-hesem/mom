# P06 — Feature Test Evidence

**Prompt:** HESEM UoM V3 — P06  
**Generated:** 2026-05-29  
**Cross-reference:** `P06-openapi-contract-report.md`

## Coverage today

- `UomOpenApiContractTest` (2 cases) — route drift + ProblemDetails enum.
- Existing `VRS001ValidationTest` (12 cases) — engine pipeline.
- `MeasurementEvidenceVerifierTest` (5 cases) — MEASVAL replay (P03).
- `UomStandardLibraryManifestTest` (5 cases) — manifest authority (P01).
- `ContextualConversionPlannerTest` (6 cases) — planner routing (P05).
- `OpcUaUnitIdTest` (14 cases) — Common Code algorithm (P04).
- `DecimalStringTest` (14 cases) — scientific notation parser (P02).

Total V3-added unit/contract tests: **46** cases all PASS. Full UoM
suite as of P06: **101 / 101** (1 skipped).

## Gap — full Feature test layer

The V3 prompt requests Feature tests that boot the Router and exercise
real controller paths against a live database. The existing PR #74
prototype does not yet stand up a database fixture in CI, so the
HB-09 closure is documented as **partial**: contract + drift tests
PASS at P06; runtime Feature tests deferred to P09/P13 with an
owner.

## Decision token

```text
UOM_V3_P06_PASS_API_CONTRACT_HARDENED
```
