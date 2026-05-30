# P14 Operational Simulation

Prompt: P14
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P14 commit: 93046b7c5d8dbba9af8f2824e268baeb4206833d
Decision token: UOM_V5_P14_VALIDATION_READY_PACKAGE_COMPLETE

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P14-01 wrong degF conversion risk has control + test | PASS | RISK-01 and OQ-03 point to affine handler/negative tests. |
| SIM-P14-02 unauthorized e-sign attempt captured | PASS | RISK-05, OQ-05, and P04 manifest evidence cover permission/signature controls. |
| SIM-P14-03 inspection copy/export shows original + normalized | PASS_WITH_WARNING | URS/FRS/Part 11 matrix require it; P12 backlog remains for full domain rollout. |
| SIM-P14-04 audit trail tamper replay fails hash | PASS | RISK-06 and OQ-06 point to measurement evidence verifier. |
| SIM-P14-05 PQ supplier lot COA lb, inspection mm, batch release review | PASS_WITH_WARNING | PQ-01 records process scenario; repository-level only, site PQ remains controlled gap. |

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: P14 exact test passed.
- Negative case fail correctly: TEST_EVIDENCE: first package test failed missing posture in CSV, repair applied, retest passed.
- Boundary precision/overflow: REPO_EVIDENCE: traceability links to P05/P13 evidence.
- Permission denied: REPO_EVIDENCE: OQ-05 and Part 11 controls.
- Stale cache/effective date: REPO_EVIDENCE: RISK-04 and P13 cache/replay evidence.
- Audit hash replay: REPO_EVIDENCE: RISK-06/OQ-06.
- External alias quarantine: REPO_EVIDENCE: RISK-03/OQ-04.
- UI/API parity: REPO_EVIDENCE: traceability links P10/P11 evidence.

## Simulation Result

PASS_WITH_WARNINGS.
