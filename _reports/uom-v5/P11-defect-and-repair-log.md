# P11 Defect And Repair Log

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

## Defects Found And Repaired

| ID | Finding | Repair | Status |
|---|---|---|---|
| P11-D01 | REPO_EVIDENCE: control center did not declare projection authority metadata. | Added `data-authority-class`, `data-route-class`, and fixture/live API marker. | Fixed |
| P11-D02 | REPO_EVIDENCE: calculator could attempt conversion without quantity kind/source binding. | Added required kind/source fields and disabled-submit validation. | Fixed |
| P11-D03 | REPO_EVIDENCE: widget returned magnitude/unit only. | Added quantity kind, source system, context, validity, and errors to widget state/value. | Fixed |
| P11-D04 | REPO_EVIDENCE: widget did not expose alias quarantine flow. | Added optional external alias input and quarantine-safe handling. | Fixed |
| P11-D05 | REPO_EVIDENCE: live fetch was default. | Added fixture-default mode and explicit live opt-in. | Fixed |

## Not Repaired In P11

| ID | Finding | Classification |
|---|---|---|
| P11-G01 | `npm --prefix mom test -- uom` cannot run due missing `mom/package.json`. | CONTROLLED_GAP: no npm test harness exists. |
| P11-G02 | full `composer check` fails at KPI registry count drift. | OUT_OF_SCOPE_BLOCKER for KPI stream, pre-existing. |
| P11-G03 | legacy domain forms still have quantity fields outside the widget. | OUT_OF_SCOPE_BLOCKER for P12/P15 domain integration/backfill. |

## Repair Loop Result

IMPLEMENT -> STATIC AUDIT -> ADVERSARIAL CRITIQUE -> OPERATIONAL SIMULATION -> DEFECT LIST -> REPAIR -> RETEST -> REPORT -> DECISION TOKEN completed for P11.
