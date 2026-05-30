# P05 Defect And Repair Log

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

| ID | Severity | Tag | Finding | Repair | Retest |
|---|---:|---|---|---|---|
| P05-D01 | P0 | REPO_EVIDENCE | Unsupported categories fell through to generic no-conversion behavior. | Added `UomCategoryNotSupportedException` and explicit `CATEGORY_DISPATCH`. | SIM-P05-03/04 PASS. |
| P05-D02 | P0 | REPO_EVIDENCE | Engine did not include every DB category in dispatch contract. | Added full category matrix and runtime constant. | Matrix test PASS. |
| P05-D03 | P1 | REPO_EVIDENCE | MEASVAL lacked effective window, factor exactness, and explicit precision envelope. | Added effective fields, factor exactness, input/calculation/output precision fields. | SIM-P05-01 PASS. |
| P05-D04 | P1 | REPO_EVIDENCE | Engine did not pass as-of/context hash to rule resolution. | Added context `as_of`/`effective_date` and `context_hash` forwarding. | UoM focused suite PASS. |
| P05-D05 | P1 | REPO_EVIDENCE | Contextual temperature used PHP floating-point parsing. | Replaced with `DecimalString::parse()` and SQL numeric cast. | Float grep clean; contextual planner tests PASS. |
| P05-D06 | P2 | TEST_EVIDENCE | Full `composer check` still fails on unrelated KPI count drift. | Logged as warning; not repaired in P05 scope. | Known failure persists. |

Repair loop result: PASS_WITH_WARNINGS.
