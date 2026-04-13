# Backend Authority Closure Tranche 2

## Verified Findings

| Area | Classification | Finding |
|---|---|---|
| Standards / instructions | VERIFIED COMPLETE | No `AGENTS.md` exists. Required standards were read from root `standards/README.md`, `standards/01-immutable-rules.md`, `standards/32-module-architecture-v2.md`, and `standards/33-api-mapping-per-module.md`. |
| Idempotency repository files | VERIFIED COMPLETE | `IdempotencyService`, `IdempotencyReplayRepository`, `PostgresIdempotencyReplayRepository`, `CacheIdempotencyReplayRepository`, `FileIdempotencyReplayRepository`, `CacheService`, and `RecordConflictException` exist. |
| Idempotency namespace / autoload | VERIFIED COMPLETE | Composer and test bootstrap autoload resolve both `MOM\Api\Services\...` and legacy `MOM\Services\...` idempotency aliases. |
| Idempotency DB schema path | VERIFIED COMPLETE | Migration `097_idempotency_replay_ledger.sql` exists, is included in `schema.sql`, and migration README documents `001` through `097`. |
| Idempotency behavior tests | VERIFIED COMPLETE | Unit and gated integration tests cover first mutation, replay, conflict, failure, DB-disabled fallback, long scope hash authority, namespace sanity, and active backend probe reporting. |
| Idempotency docs | VERIFIED COMPLETE | Tranche 1 doc now reflects `scope_key_hash` authority and fail-closed in-progress semantics. |
| Idempotency registry generation | VERIFIED COMPLETE | `generate-table-architecture.mjs` now maps `idempotency_replay_ledger` to `system_infrastructure`; publication pipeline can regenerate table, endpoint, workflow, and system-contract artifacts with `659` registry tables. |
| Data Schema operational gate | VERIFIED COMPLETE | Data Schema smoke returns zero operational risks after artifact refresh and a root-scope exception for the platform idempotency replay ledger; PostgreSQL migration backlog evidence now includes exact pending/extra migration IDs. |
| Order workflow authority | VERIFIED COMPLETE | `OrderWorkflowService` now uses `OrderWorkflowRepository`; JSON layout, audit JSONL, notification JSONL, users config, and PostgreSQL shadow-write mechanics live in `JsonOrderWorkflowRepository`. |
| Master-data authority | VERIFIED COMPLETE | `MasterDataService` now uses `MasterDataRepository`; active/history/pending/archive stores plus order/MES reference-store reads live in `JsonMasterDataRepository`. |
| Route registration | VERIFIED COMPLETE | `mom/api/index.php` is now bootstrap/middleware/dispatch only; route declarations live in ordered modules under `mom/api/routes/`, and a route snapshot comparison matched the previous `4051` action routes and `153` REST routes. |
| Local runtime artifacts | DEFERRED BUT ACCEPTABLE | `.DS_Store`, `.phpunit.cache/test-results`, and `data/php_error.log` are runtime/local artifacts and are excluded from closure commits. |

## Closure Scope

Priority A closes idempotency evidence gaps only:

- Add a lightweight `IdempotencyService` backend probe for runtime/health verification.
- Test DB-enabled default wiring without opening a live database connection.
- Update tranche documentation to match current `scope_key_hash` and lock behavior.
- Add the new PostgreSQL replay ledger to registry/domain generation so schema authority artifacts can be regenerated without manual patches.

Priority B closes order workflow persistence ownership:

- Introduce an `OrderWorkflowRepository` boundary.
- Move JSON file layout, audit JSONL append, notification JSONL append, users config loading, and PostgreSQL shadow-write mechanics behind the repository.
- Keep workflow business rules in `OrderWorkflowService`.

Priority C closes master-data persistence ownership:

- Introduce a `MasterDataRepository` boundary.
- Move active store, history, pending approvals, archive, order references, and MES runtime file layout behind the repository.
- Keep duplicate detection, lifecycle transitions, approvals, referential checks, and archive decisions in `MasterDataService`.

Priority D route modularization is closed as a follow-up after the authority slices:

- Move route declarations out of `mom/api/index.php` into ordered modules under `mom/api/routes/`.
- Keep middleware registration and dispatch in `mom/api/index.php`.
- Preserve action alias precedence and REST matching order.

Authority artifact closure is included because the reaudit found the new ledger table was present in migrations but missing from generated registry authority.

## Exact Missing Or Broken Pieces From Tranche 1

- Missing explicit active repository probe for idempotency runtime observability.
- Tranche 1 docs stale against current DB schema: raw `scope_key` uniqueness is no longer the authority; `scope_key_hash` plus `idempotency_key` is.
- Tranche 1 docs understate current fail-closed semantics: non-terminal `in_progress` rows are not reclaimed by retry-window timestamp; they require completion/failure or controlled operational remediation.
- Registry generator could not map `idempotency_replay_ledger`, causing `canonical_publication_orchestrator.py` to fail at the table architecture step.
- Data Schema authority smoke reported stale generated artifacts and then a governance gap for `idempotency_replay_ledger` because the platform replay ledger is not an org-scoped business aggregate.
- Order workflow service still knows the file layout and file append formats.
- Master-data service still knows the file layout for active/history/pending/archive stores.
- Route registration remained monolithic in `mom/api/index.php`.
- PostgreSQL migration backlog reporting exposed only counts, making operational remediation less auditable than the live ledger data allowed.

## Files Touched

Planned closure files:

- `mom/api/services/IdempotencyService.php`
- `mom/api/services/DataSchemaService.php`
- `mom/api/index.php`
- `mom/api/routes/auth-routes.php`
- `mom/api/routes/core-routes.php`
- `mom/api/routes/operations-routes.php`
- `mom/api/routes/platform-routes.php`
- `mom/api/routes/generic-runtime-routes.php`
- `mom/api/routes/frontend-alias-routes.php`
- `mom/api/routes/rest-routes.php`
- `mom/api/services/OrderWorkflowService.php`
- `mom/api/services/OrderWorkflowRepository.php`
- `mom/api/services/JsonOrderWorkflowRepository.php`
- `mom/api/services/MasterDataService.php`
- `mom/api/services/MasterDataRepository.php`
- `mom/api/services/JsonMasterDataRepository.php`
- `mom/tests/Unit/Services/IdempotencyServiceTest.php`
- `mom/tests/Unit/Services/OrderWorkflowRepositoryBoundaryTest.php`
- `mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`
- `mom/tests/data_schema_admin_smoke.php`
- `mom/tests/order_runtime_governance_smoke.php`
- `mom/database/migrate.php`
- `mom/scripts/portal/32-admin-metadata-studio.js`
- `mom/tools/registry/generate-table-architecture.mjs`
- `mom/contracts/registry-authority-standard.json`
- `mom/data/registry/*` generated authority artifacts refreshed by `canonical_publication_orchestrator.py`, `enterprise_registry_doctor.py`, and `enterprise_frontend_simulator.py`
- `mom/contracts/*index.json`, `mom/contracts/ai-authority-chain.json`, and `_reports/publication-proof-latest.json` generated authority artifacts refreshed by the same pipeline
- `mom/database/schema-authority-summary.json`
- `mom/database/schema-authority-summary.md`
- `mom/docs/system/backend-authority-upgrade-tranche1.md`
- `mom/docs/system/backend-authority-closure-tranche2.md`

## Implemented Closure

- Added `IdempotencyService::backendProbe()` to report active repository class, backend mode, authoritative flag, and fallback-only flag.
- Added registry generation support for `idempotency_replay_ledger` and refreshed authority artifacts; publication proof now passes with `659` tables and `3616` endpoints.
- Added a Data Schema root-scope exception for the platform idempotency ledger so operational governance does not require org/source columns that do not apply to this infrastructure table.
- Added `OrderWorkflowRepository` and `JsonOrderWorkflowRepository`; the workflow service now owns validation/guards/side-effect decisions while the repository owns persistence mechanics.
- Added `MasterDataRepository` and `JsonMasterDataRepository`; the master-data service now owns governance rules while the repository owns active/history/pending/archive/reference store persistence.
- Added focused repository-boundary tests for order workflow transitions, quantity guard behavior, master-data duplicate rejection, pending approval, referential delete block, and archive flow.
- Updated order runtime smoke setup to create the parent SO in `engineering_ready`, matching the current JO creation gate.
- Added exact PostgreSQL migration backlog evidence (`pending_migrations`, `pending_migration_ids`, `applied_migration_ids`, and `extra_applied_migration_ids`) to Data Schema operational output, smoke coverage, and the admin metadata studio alert.
- Refined endpoint-catalog freshness dependencies to track registry inputs, the generator, and `GenericCrudController` instead of the API bootstrap file; route modularization no longer creates false source-vs-artifact drift.
- Made the migration runner force an eager PDO connection before reporting a successful PostgreSQL connection.
- Moved route declarations into ordered route modules and verified the new module stack matches the previous route map exactly.
- Cleaned touched `DataSchemaService` PHPStan strictness issues; focused PHPStan now reports no errors.

## Migration / Test Plan

- No new migration is planned. Existing migration `097_idempotency_replay_ledger.sql` remains the DB authority path.
- Verify migration authority with `python3 tools/verify_schema_authority.py`.
- Verify registry publication with `python3 tools/registry/canonical_publication_orchestrator.py`.
- Verify Data Schema authority with `php tests/data_schema_admin_smoke.php`.
- Run focused PHPUnit tests for idempotency, order workflow, and master data.
- Verify route modularization with a snapshot comparison against `HEAD:mom/api/index.php`.
- Run full PHPUnit and `tests/backend_smoke.php`.
- Run PHPStan on `mom/api/services/DataSchemaService.php`.

## Compatibility Plan

- Preserve `IdempotencyService::execute()` response shape and conflict exception.
- Preserve DB-disabled idempotency fallback behavior.
- Preserve legacy `MOM\Services\...` namespace compatibility.
- Preserve `OrderWorkflowService` constructor compatibility and controller usage.
- Preserve `MasterDataService` constructor compatibility and controller usage.
- Preserve Data Schema release gate behavior; the idempotency ledger is treated as root-scope infrastructure rather than weakening the governance check globally.
- Preserve public route behavior and middleware order; route module order is explicitly fixed and snapshot-verified against the previous monolithic registration.

## Deferred Items With Reason

- Full PostgreSQL-native order workflow and master-data persistence is deferred because current closure focuses on repository boundaries without a big-bang migration.
- Live PostgreSQL idempotency integration remains gated by `MOM_TEST_POSTGRES_IDEMPOTENCY=1` to avoid mutating an arbitrary local database by default.
