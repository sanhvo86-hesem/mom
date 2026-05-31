# V4 Runtime Merge Readiness Decision

## Decision

`P60_NO_GO_REPAIR_REQUIRED`

## Merge Readiness

Blocked. Do not merge this branch as a runtime-closure claim.

## What Can Be Reviewed

The P58 scenario runner and P59/P60 evidence tools can be reviewed as controlled pre-production improvements. They should not be marketed as complete runtime authority closure.

## Why Merge Is Blocked

- P0 PostgreSQL restore target is missing.
- P0 live VPS Chrome smoke is missing or failed.
- P1 PHPUnit/PHPStan full suites are blocked by missing vendor binaries.

## Allowed Next Integration Path

Cherry-pick only reviewed commits into a staging branch after deciding whether to accept the P58/P59/P60 tooling despite NO-GO. Do not delete compatibility/fallback paths, do not switch `POSTGRES_ONLY`, and do not claim production readiness.

P60_NO_GO_REPAIR_REQUIRED
