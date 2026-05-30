# P16 Defect And Repair Log

Prompt: P16  
Branch: `codex/uom-v5-no-guess-20260530`  
Current SHA before P16 commit: `7ce0f8539`  
Decision token: `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

| ID | Finding | Repair | Status |
|---|---|---|---|
| P16-D01 | TEST_EVIDENCE: report wording scan found earlier UoM reports using a disallowed legacy posture phrase. | Reworded those posture lines to "not a live regulated release" while preserving the intended posture. | Fixed |
| P16-D02 | TEST_EVIDENCE: full `composer check` still fails on unrelated KPI registry count drift. | Classified as OUT_OF_SCOPE_WARNING because UoM focused tests and PHPStan pass and the same failure existed before P16. | Warning |
| P16-D03 | CONTROLLED_GAP: case library file contains 40 JSONL cases despite the filename in the prompt implying 92. | Logged all 40 actual cases and recorded exact source file. | Fixed |
| P16-D04 | CONTROLLED_GAP: domain-spanning P16 dry-run cannot prove customer/site PQ from repo evidence alone. | Marked domain-spanning simulations PASS_WITH_WARNING and documented next owner path in readiness packet. | Controlled gap |

## Retest

- The forbidden-posture wording scan returned no matches after P16-D01 repair.
- UoM focused tests passed.
- PHPStan passed.
- Full check warning remains unrelated KPI drift.

## Decision

PASS_WITH_WARNINGS. No hard UoM gate remains red.
