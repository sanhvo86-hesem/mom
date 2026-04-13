# Backend Authority Upgrade Tranche 1

## Current state

- No `AGENTS.md` exists in the repository tree. Repository standards were checked through `standards/README.md`, `standards/01-immutable-rules.md`, `standards/32-module-architecture-v2.md`, and `standards/33-api-mapping-per-module.md`.
- The active API surface is hybrid: `mom/api/index.php` is the MVC/router entrypoint, while `mom/api.php?action=...` remains a live compatibility entrypoint.
- The data layer has a real migration ladder: `JSON_ONLY`, `SHADOW_WRITE`, `POSTGRES_PRIMARY`, and `POSTGRES_ONLY`, driven by the existing `mom/database/config.php` env surface.
- PostgreSQL migrations are authoritative under `mom/database/migrations/`, applied by `mom/database/migrate.php`, and snapshotted into `mom/database/schema.sql` by `mom/database/build_schema_snapshot.php`.
- Before this tranche, `IdempotencyService` was Redis-first with file fallback under `data/idempotency`. After Priority A, DB-enabled runtime uses the PostgreSQL replay ledger as the authoritative path; DB-disabled runtime keeps Redis-capable cache compatibility when a `CacheService` is available and otherwise falls back to explicit file replay storage.
- After closure tranche 2, `OrderWorkflowService` uses an `OrderWorkflowRepository` boundary for order aggregate persistence, immutable audit append, notification append, user-role lookup, and PostgreSQL shadow-write mechanics. The default adapter is still JSON-compatible; full PostgreSQL order authority remains deferred.
- After closure tranche 2, `MasterDataService` uses a `MasterDataRepository` boundary for active store, history, pending approvals, archive, and reference-store reads. The default adapter is still JSON-compatible; full PostgreSQL master-data authority remains deferred.
- The practical harness is mixed: PHPUnit unit tests exist, but backend assurance is still strongly represented by custom PHP smoke scripts, especially `mom/tests/backend_smoke.php`.

## Target state

- Priority A: idempotency replay state becomes PostgreSQL authoritative whenever the existing DB mode enables PostgreSQL.
- DB-enabled idempotency must use a durable replay ledger with uniqueness on `(scope_key_hash, idempotency_key)`, transactional claim/update semantics, explicit in-progress markers, success replay, conflict detection, and failure persistence.
- DB-disabled idempotency keeps the existing Redis-capable cache path when available and an explicit file-backed fallback so local/legacy JSON-only runtime remains backward compatible.
- No new DB/config env surface is introduced. Existing `USE_POSTGRES`, `SHADOW_WRITE`, and `JSON_FALLBACK` determine whether PostgreSQL is active.

## Exact files touched

Implemented for Priority A:

- `mom/api/services/IdempotencyService.php`
- `mom/api/services/IdempotencyReplayRepository.php`
- `mom/api/services/CacheIdempotencyReplayRepository.php`
- `mom/api/services/FileIdempotencyReplayRepository.php`
- `mom/api/services/PostgresIdempotencyReplayRepository.php`
- `mom/database/migrations/097_idempotency_replay_ledger.sql`
- `mom/database/migrations/README.md`
- `mom/database/schema-authority-summary.json`
- `mom/database/schema-authority-summary.md`
- `mom/database/schema.sql`
- `mom/data/registry/schema-authority-summary.json`
- `mom/data/registry/table-registry.json`
- `mom/data/registry/system-contract-*.json`
- `mom/tools/registry/generate-table-architecture.mjs`
- `mom/tests/Integration/IdempotencyPostgresIntegrationTest.php`
- `mom/tests/Unit/Services/IdempotencyServiceTest.php`
- `mom/docs/system/backend-authority-upgrade-tranche1.md`

Priority B/C closure continued in `backend-authority-closure-tranche2.md` after Priority A was verified.

## DB changes

- Add `idempotency_replay_ledger` as the authoritative replay table.
- Required columns include:
  - `scope_key`
  - `scope_key_hash`
  - `idempotency_key`
  - `fingerprint_hash`
  - `status`
  - `status_code`
  - `response_payload`
  - `metadata`
  - `lock_owner`
  - `error_class`
  - `error_message`
  - `created_at`
  - `updated_at`
  - `completed_at`
  - `expires_at`
- Add a unique authority index on `(scope_key_hash, idempotency_key)` so long process-scope keys do not exceed index key limits.
- Add indexes for expiry cleanup and in-progress observability.
- `in_progress` rows are fail-closed. They cannot be reclaimed by retry-window timestamp alone; completion, failure marking, or controlled operational remediation must clear the non-terminal state. This avoids duplicate callback execution if a slow worker outlives the retry window or if business execution succeeds but ledger completion fails.

## Compatibility strategy

- Public `IdempotencyService::execute()` return shape remains unchanged:
  - `status_code`
  - `payload`
  - `replayed`
  - `stored_at`
- Existing conflict behavior remains `RecordConflictException`.
- Same key plus same fingerprint replays a completed success response.
- Same key plus different fingerprint fails before executing the callback.
- Failed attempts are persisted but not replayed as success; matching retry can execute again after the failed marker is recorded.
- JSON-only runtime keeps Redis-capable cache compatibility when Redis is available and the file fallback path when Redis is unavailable.
- Legacy `MOM\Services\...` autoload requests for the idempotency service and repository types are preserved by aliases to the `MOM\Api\Services\...` classes.
- DB-enabled runtime does not silently fall back to file persistence on primary ledger failures.
- `IdempotencyService::backendProbe()` exposes the active repository class and backend mode for health/diagnostic checks.
- If the business callback throws and the failure marker cannot be written, the original business exception is preserved and logged; the failure-marker write failure does not mask the application error.

## Rollback strategy

- Code rollback: revert the Priority A service/repository/test changes to the pre-ledger implementation.
- DB rollback:
  - `DROP TABLE IF EXISTS idempotency_replay_ledger CASCADE;`
  - Remove migration `097_idempotency_replay_ledger.sql` from the applied migration ledger only in a controlled rollback window.
- Runtime rollback without DDL rollback: set `USE_POSTGRES=false` to use the explicit DB-disabled fallback path while preserving the ledger table for forensic review.

## Test plan

- Syntax checks:
  - `php -l mom/api/services/IdempotencyService.php`
  - `php -l` for all new repository files
  - `php -l mom/tests/backend_smoke.php`
- Unit tests:
  - `cd mom && ./vendor/bin/phpunit tests/Unit/Services/IdempotencyServiceTest.php`
- Optional PostgreSQL integration:
  - `cd mom && MOM_TEST_POSTGRES_IDEMPOTENCY=1 ./vendor/bin/phpunit tests/Integration/IdempotencyPostgresIntegrationTest.php`
  - This is gated to avoid mutating an arbitrary developer database during the default test suite.
- Smoke tests:
  - `php mom/tests/backend_smoke.php`
- Regression suite:
  - `cd mom && ./vendor/bin/phpunit`
- Migration/snapshot checks:
  - `php mom/database/build_schema_snapshot.php`
  - inspect migration status command shape through existing `mom/database/migrate.php --status` when a PostgreSQL profile is available.

## Known deferred items

- Closure tranche 2 added repository boundaries for Priority B/C while keeping JSON adapters as compatibility stores.
- Full DB-first authority for `OrderWorkflowService` and `MasterDataService` remains deferred until PostgreSQL aggregate schemas and migration/backfill contracts are closed.
- Priority D route modularization is deferred because it changes a broad compatibility surface and should not be mixed into the idempotency authority slice.
- Outbox/integration backbone hardening is deferred; `OutboxWorker` remains file-backed via Epicor runtime helpers in this tranche.
