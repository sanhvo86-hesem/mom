# V4 Runtime Merge Readiness Decision

## Decision

`P60_PASS_READY_FOR_CONTROLLED_INTEGRATION`

## Merge Readiness

Controlled integration review is allowed. Do not treat this as a production-ready or formally validated release claim.

## What Can Be Reviewed

The P58 scenario runner, P59 restore/browser drill, and P60 scorecard can be reviewed as controlled pre-production runtime-closure evidence.

## Remaining Claim Boundaries

- `POSTGRES_ONLY` remains a separate cutover decision.
- Production readiness remains blocked until formal release/validation evidence exists.
- The live smoke used a VPS preview branch served outside the dirty production worktree.

## Allowed Next Integration Path

Cherry-pick reviewed commits into a clean staging/integration branch. Do not delete compatibility/fallback paths, do not switch `POSTGRES_ONLY`, and do not claim production readiness based only on this V4 evidence.

P60_PASS_READY_FOR_CONTROLLED_INTEGRATION
