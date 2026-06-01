# P59 PostgreSQL Restore Drill Report

## Decision

`NO_GO` for any `POSTGRES_ONLY` or production-readiness claim.

## Evidence Run

- Command: `php mom/tools/release/run_mda_v4_operational_drill.php`
- Result: expected gate failure with `P59_NO_GO_CONTROLLED_BLOCKERS`
- Branch at run: `codex/mda-v4-implementation-closure-recovery-20260530`
- SHA at run: `8c5e6cdc3`
- Evidence JSON: `mom/data/registry/mda-v4-p59-operational-drill.latest.json`

## What Passed

- Artifact restore drill passed for P58 scenario evidence.
- Source root hash: `3ba17850403b832655c4dd36ffa4a48d0400a72670d533be178964c99b057b4b`
- Restore target: `/var/folders/qw/t3y_yhp55vn9rx6172_v5d240000gn/T/mda-v4-p59-restore-3ba17850403b`
- Restored artifact hash matched source artifact hash.

## What Is Blocked

- PostgreSQL restore to clean target was not executed because no isolated PostgreSQL restore target is configured in this local workspace.
- Ledger/outbox/audit/evidence parity against a restored PostgreSQL target is therefore blocked.
- This explicitly blocks `POSTGRES_ONLY` and production-readiness claims.

## Required Repair Before GO

1. Provision isolated PostgreSQL restore target.
2. Run backup from authoritative database.
3. Restore into clean target.
4. Compare root hashes for governed MDA roots, ledger facts, audit/evidence, outbox and command idempotency rows.
5. Re-run P58 command-stack scenarios against restored target, not only sandbox.

P59_NO_GO_CONTROLLED_BLOCKERS
