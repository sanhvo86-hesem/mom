# P15 Operational Simulation

Prompt: P15
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P15 commit: 89b07a7cce1eb279a63cd03c08e419e37f4cf240
Decision token: UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P15-01 `weight=12` no unit | PASS | classified `cannot_infer_unit`; no shadow proposal; quarantine reason recorded. |
| SIM-P15-02 supplier `LB` with contract | PASS_AS_PROPOSAL | classified `needs_measval_wrapper`; shadow proposal requires alias review. |
| SIM-P15-03 item A box=10, item B unknown | PASS | A proposes packaging conversion; B quarantines due missing policy. |
| SIM-P15-04 pharma IU no potency | PASS | classified `ambiguous_alias`; quarantine until lot potency evidence. |
| SIM-P15-05 rollback | PASS | sample rollback deletes shadow only and keeps original. |

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: focused P15 test passed.
- Negative case fail correctly: REPO_EVIDENCE: missing unit and missing packaging policy quarantine.
- Boundary precision/overflow: REPO_EVIDENCE: P15 does not perform arithmetic; P13/P05 remain authority.
- Permission denied: REPO_EVIDENCE: P15 adds no mutation endpoint.
- Stale cache/effective date: REPO_EVIDENCE: no active rule/cache mutation.
- Audit hash replay: REPO_EVIDENCE: shadow policy requires unit evidence before MEASVAL proposal.
- External alias quarantine: REPO_EVIDENCE: supplier LB requires alias review; unknowns quarantine.
- UI/API parity: REPO_EVIDENCE: P15 does not change UI/API surfaces.

## Simulation Result

PASS_WITH_WARNINGS.
