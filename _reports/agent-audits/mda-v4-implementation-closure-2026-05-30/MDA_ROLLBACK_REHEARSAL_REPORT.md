# P59 Rollback Rehearsal Report

## Decision

Rollback rehearsal is conditionally PASS for code/artifact rollback, but not sufficient for `POSTGRES_ONLY`.

## Evidence

- Rollback mode: `POSTGRES_PRIMARY_WITH_JSON_COMPATIBILITY_READS`
- Restore point hash: `3ba17850403b832655c4dd36ffa4a48d0400a72670d533be178964c99b057b4b`
- Operator banner required: yes
- Banner text: `MDA cutover is not complete. Fallback/drift controls are active; POSTGRES_ONLY is disabled.`

## Risk

Schema/data rollback was not exercised because no clean PostgreSQL restore target is configured. This is acceptable only for a NO-GO rehearsal, not for production or `POSTGRES_ONLY`.

## Required Repair Before GO

- Run rollback after a real PostgreSQL restore rehearsal.
- Verify no command idempotency, audit/evidence, outbox, ledger or workflow rows are lost.
- Verify the operator/admin warning banner is visible in the live app.

P59_NO_GO_CONTROLLED_BLOCKERS
