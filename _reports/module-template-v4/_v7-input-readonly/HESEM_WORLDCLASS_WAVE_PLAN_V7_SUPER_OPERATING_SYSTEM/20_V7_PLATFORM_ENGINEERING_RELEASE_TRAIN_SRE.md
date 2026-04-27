# 20 — Platform Engineering, Release Train and SRE
## Release principle

A wave is not complete when code merges. A wave is complete when evidence package, rollback rehearsal, observability, report outputs and decision phrase exist.

## Release train artifacts

| Artifact | Purpose |
| --- | --- |
| Implementation report | what changed, allowed/forbidden files, commits |
| QA report | tests run, pass/warn/fail, screenshots/logs if applicable |
| Rollback procedure | how to revert or disable safely |
| E2E report | Playwright/browser reality check |
| Static guard report | syntax/JSON/forbidden diff/no fixture load |
| Contract report | OpenAPI/problem/event/data diff |
| SRE report | latency/error/fallback/trace/SLO |
| Decision log | PASS/PASS_WITH_WARNINGS/FAIL_BLOCK_NEXT with rationale |

## DORA/SRE metrics

- Lead time for changes.
- Deployment frequency for controlled environments.
- Change failure rate.
- Failed deployment recovery time / MTTR.
- Reliability/SLO error budget.
- For HESEM, add: evidence completeness, rollback rehearsal success, live API fallback rate, workflow command rejection distribution.
