# MDA Migration Test Protocol

## Core sequence

1. Freeze governed generic mutations.
2. Take JSON snapshot and PostgreSQL backup.
3. Run collection crosswalk validation.
4. Run drift detection and status authority checks.
5. Enable `SHADOW_WRITE`.
6. Execute command replay pack.
7. Reconcile counts, hashes, statuses, ledger sums, and fallback reads.
8. Switch to `POSTGRES_PRIMARY`.
9. Monitor stability window.
10. Switch to `POSTGRES_ONLY`.

## Test cases

- `PG-101`: missing governed record blocks cutover.
- `PG-102`: unknown legacy status blocks migration batch.
- `PG-103`: same idempotency key same fingerprint replays safely after cutover.
- `PG-104`: same idempotency key different fingerprint returns conflict.
- `PG-105`: fallback read in primary mode raises alert and blocks final switch.
- `PG-106`: reconciliation age older than SLO blocks switch.
- `PG-107`: restore drill proves rollback package can recreate authoritative state.
