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
| Data Schema operational gate | VERIFIED COMPLETE | Data Schema smoke returns zero operational risks after artifact refresh and a root-scope exception for the platform idempotency replay ledger. |
| Order workflow authority | VERIFIED COMPLETE | `OrderWorkflowService` now uses `OrderWorkflowRepository`; JSON layout, audit JSONL, notification JSONL, users config, and PostgreSQL shadow-write mechanics live in `JsonOrderWorkflowRepository`. |
| Master-data authority | VERIFIED COMPLETE | `MasterDataService` now uses `MasterDataRepository`; active/history/pending/archive stores plus order/MES reference-store reads live in `JsonMasterDataRepository`. |
| Route registration | DEFERRED BUT ACCEPTABLE | `mom/api/index.php` remains large at more than 1,100 lines with many route registrations. It is broad compatibility work and is deferred until the authority slices are closed and verified. |
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

Priority D route modularization is not in this closure pass.

Authority artifact closure is included because the reaudit found the new ledger table was present in migrations but missing from generated registry authority.

## Exact Missing Or Broken Pieces From Tranche 1

- Missing explicit active repository probe for idempotency runtime observability.
- Tranche 1 docs stale against current DB schema: raw `scope_key` uniqueness is no longer the authority; `scope_key_hash` plus `idempotency_key` is.
- Tranche 1 docs understate current fail-closed semantics: non-terminal `in_progress` rows are not reclaimed by retry-window timestamp; they require completion/failure or controlled operational remediation.
- Registry generator could not map `idempotency_replay_ledger`, causing `canonical_publication_orchestrator.py` to fail at the table architecture step.
- Data Schema authority smoke reported stale generated artifacts and then a governance gap for `idempotency_replay_ledger` because the platform replay ledger is not an org-scoped business aggregate.
- Order workflow service still knows the file layout and file append formats.
- Master-data service still knows the file layout for active/history/pending/archive stores.

## Files Touched

Planned closure files:

- `mom/api/services/IdempotencyService.php`
- `mom/api/services/DataSchemaService.php`
- `mom/api/services/OrderWorkflowService.php`
- `mom/api/services/OrderWorkflowRepository.php`
- `mom/api/services/JsonOrderWorkflowRepository.php`
- `mom/api/services/MasterDataService.php`
- `mom/api/services/MasterDataRepository.php`
- `mom/api/services/JsonMasterDataRepository.php`
- `mom/tests/Unit/Services/IdempotencyServiceTest.php`
- `mom/tests/Unit/Services/OrderWorkflowRepositoryBoundaryTest.php`
- `mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`
- `mom/tests/order_runtime_governance_smoke.php`
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

## Migration / Test Plan

- No new migration is planned. Existing migration `097_idempotency_replay_ledger.sql` remains the DB authority path.
- Verify migration authority with `python3 tools/verify_schema_authority.py`.
- Verify registry publication with `python3 tools/registry/canonical_publication_orchestrator.py`.
- Verify Data Schema authority with `php tests/data_schema_admin_smoke.php`.
- Run focused PHPUnit tests for idempotency, order workflow, and master data.
- Run full PHPUnit and `tests/backend_smoke.php`.
- Run PHPStan on touched services/tests.

## Compatibility Plan

- Preserve `IdempotencyService::execute()` response shape and conflict exception.
- Preserve DB-disabled idempotency fallback behavior.
- Preserve legacy `MOM\Services\...` namespace compatibility.
- Preserve `OrderWorkflowService` constructor compatibility and controller usage.
- Preserve `MasterDataService` constructor compatibility and controller usage.
- Preserve Data Schema release gate behavior; the idempotency ledger is treated as root-scope infrastructure rather than weakening the governance check globally.
- Do not change public routes or middleware order.

## Deferred Items With Reason

- Route modularization is deferred because it touches a broad compatibility surface and should follow after repository authority closure.
- Full PostgreSQL-native order workflow and master-data persistence is deferred because current closure focuses on repository boundaries without a big-bang migration.
- Live PostgreSQL idempotency integration remains gated by `MOM_TEST_POSTGRES_IDEMPOTENCY=1` to avoid mutating an arbitrary local database by default.
- PHPStan on the full `DataSchemaService.php` file still reports pre-existing strictness issues unrelated to the three-line idempotency root-scope exception; syntax and Data Schema smoke cover this touched path in the closure pass.
