# P10 Operational Simulation

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P10-01 kind mismatch returns 422 Problem Details with trace_id | PASS | Controller problem detail contains `status`, `trace_id`, `code`, `field_errors`, and `remediation`; OpenAPI documents 422 problem response. |
| SIM-P10-02 unauthorized approve rule returns 403 | PASS_WITH_SCOPE_NOTE | No approve/activate route is exposed in UoM routes; static test rejects accidental exposure. |
| SIM-P10-03 duplicate idempotency key returns same result/no double audit | PASS_WITH_SCOPE_NOTE | `Idempotency-Key` is accepted and forwarded. P10 does not add a mutating approve/submit endpoint that would create double audit risk. |
| SIM-P10-04 route exists but OpenAPI missing fails parity gate | PASS | `testSimP1004EveryUomRouteExistsInOpenApi` parses routes and fails if OpenAPI lacks any UoM path. |
| SIM-P10-05 external alias ambiguous returns structured quarantine result | PASS | OpenAPI alias response documents `ambiguous` and `quarantine_id`; event registry includes `uom.alias.quarantined`. |

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: focused P10 test suite passed 7 tests / 176 assertions.
- Negative case fail correctly: TEST_EVIDENCE: static parity and route-deny assertions fail closed if contract drift appears.
- Boundary precision/overflow: REPO_EVIDENCE: no decimal arithmetic was changed in P10; P05/P08 focused arithmetic handlers remain authority.
- Permission denied: REPO_EVIDENCE: UoM approval routes remain absent from this controller route set.
- Stale cache/effective date: REPO_EVIDENCE: P10 forwards `effective_date` and `as_of` context fields to the conversion engine.
- Audit hash replay: REPO_EVIDENCE: P10 adds event contract registry; P09 MEASVAL evidence remains unchanged.
- External alias quarantine: REPO_EVIDENCE: documented and tested through OpenAPI content assertions.
- UI/API parity: CONTROLLED_GAP: P10 is API-only; UI control center parity is assigned to P11.

## Simulation Result

PASS_WITH_WARNINGS.
