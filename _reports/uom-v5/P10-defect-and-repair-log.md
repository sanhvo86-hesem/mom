# P10 Defect And Repair Log

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Defects Found And Repaired

| ID | Finding | Repair | Status |
|---|---|---|---|
| P10-D01 | REPO_EVIDENCE: `mom/api/openapi.yaml` had no `/api/v1/uom` paths while routes existed in `uom-routes.php`. | Added all UoM route paths under OpenAPI 3.1.2 and a static parity test. | Fixed |
| P10-D02 | REPO_EVIDENCE: Problem Details helpers lacked P10-required `code`, `trace_id`, `field_errors`, and `remediation` fields. | Added fields and remediation mapping in `UomController`. | Fixed |
| P10-D03 | REPO_EVIDENCE: alias quarantine semantics were not documented in OpenAPI. | Added alias response contract with `ambiguous` and `quarantine_id`. | Fixed |
| P10-D04 | REPO_EVIDENCE: UoM event payload contracts were not tracked. | Added `mom/data/registry/uom-event-contracts.json`. | Fixed |

## Not Repaired In P10

| ID | Finding | Classification |
|---|---|---|
| P10-G01 | Full `composer check` fails at `KpiEngineAuthorityRegistryTest` expecting 142 while catalog has 148. | OUT_OF_SCOPE_BLOCKER for KPI stream; existing warning repeated from earlier UoM phases. |
| P10-G02 | Full integration permission/idempotency harness for HTTP runtime is not present in this prompt. | CONTROLLED_GAP; static tests and contract forwarding are in place. |

## Repair Loop Result

IMPLEMENT -> STATIC AUDIT -> ADVERSARIAL CRITIQUE -> OPERATIONAL SIMULATION -> DEFECT LIST -> REPAIR -> RETEST -> REPORT -> DECISION TOKEN completed for P10.
