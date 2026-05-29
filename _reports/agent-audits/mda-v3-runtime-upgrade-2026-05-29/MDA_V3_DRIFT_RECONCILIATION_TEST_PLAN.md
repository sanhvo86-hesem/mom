# MDA V3 Drift Reconciliation Test Plan

## Objective

Prove that governed master-data JSON and PostgreSQL mirrors can be compared, reconciled, and safely cut over without silent stale release data.

## Required Test Gates

| gate_id | mode | input | expected_result | current_status |
|---|---|---|---|---|
| PG-RT-001 | `JSON_ONLY` | `MasterDataService` constructed with rootDir | `authorityProbe.readiness_state=compatibility_only` | direct smoke passed |
| PG-RT-002 | `POSTGRES_PRIMARY` with unreachable PG | `load_master_data_store()` | throws `master_data_postgres_authority_unavailable`; no JSON authority fallback | direct smoke passed |
| PG-RT-003 | `POSTGRES_PRIMARY` with reachable PG | JSON fixture for customers/suppliers/items/revisions/BOM/routing/CP/IP | `syncMasterDataStore()` then `getRuntimeMasterDataStore()` returns row-count and hash parity | blocked until live PG test DB available |
| PG-RT-004 | `POSTGRES_PRIMARY` drift | JSON BOM newer than PG BOM | reconciliation reports blocker drift and release/readiness cannot proceed | test to add with live PG fixture |
| PG-RT-005 | `POSTGRES_ONLY` without restore drill | mode switch request | blocked before runtime claim | test to add in P38/P41 |
| PG-RT-006 | import/export bridge | JSON export changes row count/hash | drift report required before cache update accepted | test to add in P38 |

## Collection Hashing

For each governed collection:

1. Normalize records by natural key.
2. Remove volatile fields: `updated_at`, `updated_by`, runtime `_meta.updated`.
3. JSON-encode with stable key order.
4. Hash with SHA-256.
5. Compare JSON source hash vs PostgreSQL rebuilt hash.

Blocker drift:

- Missing natural-key row in either source.
- Status/revision/effectivity mismatch.
- Released BOM/routing/control plan/inspection plan mismatch.
- UOM or quantity conversion mismatch.

Warning drift:

- Non-authority labels/descriptions differ while natural key, lifecycle, effectivity, and required links match.

## Release/Readiness Consumers

P30 and P34 must consume this evidence:

- `MasterDataService::authorityProbe()`
- `runtime_data_layer_summary()`
- `primary_read_fallbacks` observability queue
- reconciliation row-count/hash summary
- restore-drill packet for `POSTGRES_ONLY`

Fail-closed conditions:

- `compatibility_only`
- `shadow_write_bridge`
- `json_fallback` read source during release/readiness
- unresolved blocker drift
- missing restore drill for `POSTGRES_ONLY`

## Current Evidence

- P27 direct smoke proves JSON fallback is blocked when PostgreSQL authority is required and unreachable.
- P27 code adds round-trip metadata extraction for routing, BOM, control plan, and inspection plan headers.
- Live DB reconciliation remains blocked because current runtime probe reports `JSON_ONLY`, `database_configured=false`, `postgres_reachable=false`.
