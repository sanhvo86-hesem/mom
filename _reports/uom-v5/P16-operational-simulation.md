# P16 Operational Simulation

Prompt: P16  
Branch: `codex/uom-v5-no-guess-20260530`  
Current SHA before P16 commit: `7ce0f8539`  
Decision token: `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

## Case Library

TEST_EVIDENCE: `_reports/uom-v5/P16-simulation-case-log.jsonl` logs all 40 cases in `92_SIMULATION_CASE_LIBRARY.jsonl`.

## Required P16 Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P16-01 supplier lb -> inventory kg -> inspection mm -> NQCASE -> CAPA -> BREL evidence | PASS_WITH_WARNING | `mom/data/registry/uom-domain-integration-contracts.json` includes PO, INSP, NQCASE, CAPA, BREL roots; live domain rollout remains controlled backlog. |
| SIM-P16-02 malicious alias and magnitude injection rejected | PASS | `UomOperabilityP13Test`, `DecimalStringTest`, `UomAliasResolutionP06Test`. |
| SIM-P16-03 regulated e-sign manifestation and audit trail export | PASS | `UomStandardLibraryManifestTest`, `UomWorkflowService`, validation Part 11/Annex 11 matrix. |
| SIM-P16-04 stale cache with active rule version change and historical replay | PASS | `ConversionRuleService` effective-date filters, P13 cache contract, `MeasurementValueP09Test`. |
| SIM-P16-05 AI tries to approve rule | PASS | `UomStandardLibraryManifestTest::testApproveManifestRejectsAiOrSystemActor`. |

## Minimum Simulation Set

- Golden case pass: TEST_EVIDENCE via UoM focused test suite.
- Negative case fail correctly: TEST_EVIDENCE via negative/operability tests.
- Boundary precision/overflow: TEST_EVIDENCE via `DecimalStringTest` and `ConversionEngineP05Test`.
- Permission denied: TEST_EVIDENCE via manifest approval tests.
- Stale cache/effective date: REPO_EVIDENCE via rule query filters and P13 cache contract.
- Audit hash replay: TEST_EVIDENCE via MEASVAL hash replay tests.
- External alias quarantine: TEST_EVIDENCE via P06 alias and P11 UI tests.
- UI/API parity: TEST_EVIDENCE via P10 API contract and P11 UI projection tests.

## Result

PASS_WITH_WARNINGS. Domain-wide dry-run scenarios pass as readiness evidence, while customer/site PQ and full domain enforcement remain controlled gaps.
