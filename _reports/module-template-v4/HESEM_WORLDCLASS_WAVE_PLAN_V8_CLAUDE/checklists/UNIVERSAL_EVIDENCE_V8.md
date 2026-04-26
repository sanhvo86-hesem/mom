# Universal Evidence Checklist V8

Per V7 §UNIVERSAL_EVIDENCE_CHECKLIST + V8 file 02 binding. 18 items, each binary + executable check.

```text
[ ] U-V8-01  source state verified (git status --short clean before slice work)
[ ] U-V8-02  branch + HEAD recorded (git log --oneline -1)
[ ] U-V8-03  allowed/forbidden files stated (per V8 file 13 ratified)
[ ] U-V8-04  authority root named (matches data/root_backlog_v8.json entry)
[ ] U-V8-05  route grammar validated (file 11 §3 + V7 grammar)
[ ] U-V8-06  WS/AR authority data attributes validated (linter LINT-V8-005)
[ ] U-V8-07  node syntax passed (node --check on touched JS files)
[ ] U-V8-08  JSON fixture parse passed (validate_fixtures.py)
[ ] U-V8-09  no forbidden diff (per V8 file 13 schemas/forbidden_diff_v8.yaml)
[ ] U-V8-10  74-fixtures.js NOT loaded by mom/portal.html (grep == 0)
[ ] U-V8-11  HMV4 inert defaults verified (per V8 file 14)
[ ] U-V8-12  OpenAPI 3.1.1 / problem-detail / event / data contracts present (or explicitly out-of-scope)
[ ] U-V8-13  E2E PASS or fail classified (must_fix_now / schedule / accept)
[ ] U-V8-14  rollback procedure exists (per V8 templates/SLICE_REPORT_V8.md ART)
[ ] U-V8-15  warnings have owner + deadline + defer rationale
[ ] U-V8-16  V8 invariants INV-1..12 status checked (per file 02)
[ ] U-V8-17  authority ledger entry present (data/authority_ledger_seed_v8.json)
[ ] U-V8-18  decision phrase emitted (exact phrase from V8 file 27 wave plan)
```

V8 advance: each binary item has automation_status pointing to mechanism in V8 file 02 §4.
