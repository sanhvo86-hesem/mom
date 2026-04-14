# Tranche 16 Agent 5 - Reliability, Security, Observability, Compliance, VPS

Date: 2026-04-15

## Pass-1 Critical Findings

| Finding | Classification | Action |
| --- | --- | --- |
| Rate-limit file fallback could fail open when state dir/file/lock was unavailable | FIX_NOW | Implemented fail-closed 503 `rate_limit_unavailable` path with headers and logs. |
| Cache fallback write/rename failures were silent | FIX_NOW | Added fallback health fields and error logs for JSON, write, and rename failure. |
| Postdeploy runtime directories were treated too softly | FIX_NOW | Sessions, rate-limit, and cache dirs are now critical writable gates. |
| OTel/live collector proof absent | BLOCKED_EXTERNAL | Requires deployed collector/exporter and operational telemetry backend. |
| WORM/Part 11 validation package absent | BLOCKED_EXTERNAL | Requires SOPs, validation, retention, identity proof, and audit review process. |

## VPS Gate

Local code now contains stronger deploy-time gates. VPS deployment and verification must run after merge to `main` so production DB and frontend receive the same migration/proof state.

