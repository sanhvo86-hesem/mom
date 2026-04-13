# Backend Authority Upgrade Tranche 1

## Current state

- No `AGENTS.md` exists in the repository tree. Repository standards were checked through `standards/README.md`, `standards/01-immutable-rules.md`, `standards/32-module-architecture-v2.md`, and `standards/33-api-mapping-per-module.md`.
- The active API surface is hybrid: `mom/api/index.php` is the MVC/router entrypoint, while `mom/api.php?action=...` remains a live compatibility entrypoint.
- The data layer has a real migration ladder: `JSON_ONLY`, `SHADOW_WRITE`, `POSTGRES_PRIMARY`, and `POSTGRES_ONLY`, driven by the existing `mom/database/config.php` env surface.
- PostgreSQL migrations are authoritative under `mom/database/migrations/`, applied by `mom/database/migrate.php`, and snapshotted into `mom/database/schema.sql` by `mom/database/build_schema_snapshot.php`.
- `IdempotencyService` is currently Redis-first with file fallback under `data/idempotency`. It serializes file fallback with file locks and replays completed success payloads, but it is not DB authoritative.
- `OrderWorkflowService` still performs core persistence itself: it loads/writes `orders.json`, appends immutable audit JSONL, writes notification JSONL, and shadow-writes PostgreSQL from inside the business service.
- `MasterDataService` still performs core persistence itself: it loads/writes active, history, pending, and archive JSON files directly from the business service.
- The practical harness is mixed: PHPUnit unit tests exist, but backend assurance is still strongly represented by custom PHP smoke scripts, especially `mom/tests/backend_smoke.php`.

## Target state

- Priority A: idempotency replay state becomes PostgreSQL authoritative whenever the existing DB mode enables PostgreSQL.
- DB-enabled idempotency must use a durable replay ledger with uniqueness on `(scope_key, idempotency_key)`, transactional claim/update semantics, explicit in-progress markers, success replay, conflict detection, and failure persistence.
- DB-disabled idempotency keeps an explicit file-backed fallback so local/legacy JSON-only runtime remains backward compatible.
- No new DB/config env surface is introduced. Existing `USE_POSTGRES`, `SHADOW_WRITE`, and `JSON_FALLBACK` determine whether PostgreSQL is active.

## Exact files touched

Planned for Priority A:

- `mom/api/services/IdempotencyService.php`
- `mom/api/services/IdempotencyReplayRepository.php`
- `mom/api/services/FileIdempotencyReplayRepository.php`
- `mom/api/services/PostgresIdempotencyReplayRepository.php`
- `mom/database/migrations/097_idempotency_replay_ledger.sql`
- `mom/database/migrations/README.md`
- `mom/database/schema.sql`
- `mom/tests/Unit/Services/IdempotencyServiceTest.php`
- `mom/docs/system/backend-authority-upgrade-tranche1.md`

No Priority B/C files will be modified unless Priority A is fully implemented and verified first.

## DB changes

- Add `idempotency_replay_ledger` as the authoritative replay table.
- Required columns include:
  - `scope_key`
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
- Add a unique constraint on `(scope_key, idempotency_key)`.
- Add indexes for expiry cleanup and in-progress observability.

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
- JSON-only runtime keeps the file fallback path for backward compatibility.
- DB-enabled runtime does not silently fall back to file persistence on primary ledger failures.

## Rollback strategy

- Code rollback: revert the Priority A service/repository/test changes and return to the previous Redis/file implementation.
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
- Smoke tests:
  - `php mom/tests/backend_smoke.php`
- Regression suite:
  - `cd mom && ./vendor/bin/phpunit`
- Migration/snapshot checks:
  - `php mom/database/build_schema_snapshot.php`
  - inspect migration status command shape through existing `mom/database/migrate.php --status` when a PostgreSQL profile is available.

## Known deferred items

- Priority B is deferred until Priority A is green: `OrderWorkflowService` needs an `OrderRepository` boundary that owns aggregate loading, status/change history persistence, notification persistence, and audit persistence.
- Priority C is deferred until A and B are green: `MasterDataService` needs a repository boundary for active store, history, pending approvals, archive, and referential checks.
- Priority D route modularization is deferred because it changes a broad compatibility surface and should not be mixed into the idempotency authority slice.
- Outbox/integration backbone hardening is deferred; `OutboxWorker` remains file-backed via Epicor runtime helpers in this tranche.
