# P27 PostgreSQL MasterData Repository and JSON Cutover Bridge

## 1. Executive Verdict

`P27_PASS_WITH_CONTROLLED_GAPS`

P27 repaired the largest runtime authority defect in this prompt: `MasterDataService` and Master Data controller reads now have a DataLayer-backed cutover repository, and JSON fallback is blocked when PostgreSQL authority is required. The work is not runtime-complete because this environment still reports `JSON_ONLY`, live PostgreSQL is not configured, history/pending/archive remain JSON bridge stores, and native command/audit/outbox authority is still P31/P32 work.

## 2. Source Truth Audit

| Evidence | Finding | P27 action |
|---|---|---|
| `MDA_EXTERNAL_REDTEAM_REPORT.md` | V1/V2 planning was not runtime-complete authority. | Did not claim enterprise-ready; implemented runtime bridge only. |
| `MDA_CONTROLLED_GAP_LEDGER.csv` | JSON-primary and compatibility-only paths were open implementation gaps. | Repaired active repository wiring and PG-required fallback block. |
| `MDA_FINAL_MASTER_BUILD_PLAN.md` | Target is PostgreSQL authority, domain commands, generated workflow/status, audit/evidence/outbox. | Added repository cutover bridge; deferred command/audit/event spine to P31/P32. |
| `docs/backend/RUNTIME_AUTHORITY_MAP.md` | Modes are `JSON_ONLY`, `SHADOW_WRITE`, `POSTGRES_PRIMARY`, `POSTGRES_ONLY`. | `DataLayerMasterDataRepository` implements explicit behavior for each mode. |
| `docs/backend/DOMAIN_COMMAND_SPEC.md` | Governed mutation must be command-authority, not generic/raw write. | P26 hard stop retained; P27 repository is a bridge, not a command bypass. |
| `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | Cutover requires shadow sync, drift detection, rollback, restore drill. | Added bridge map and drift test plan; live restore drill remains open. |
| `JsonMasterDataRepository.php` | Default active/history/pending/archive are JSON files and probe says JSON. | Kept as compatibility adapter; new DataLayer repository wraps it. |
| `MasterDataService.php` | Repository boundary existed but defaulted to JSON. | Wired runtime repository when rootDir is supplied. |
| `MasterDataController.php` | list/detail read directly from JSON. | Routed list/detail through `MasterDataService`. |
| `DataLayer.php` / `RuntimeShadowSync.php` | Existing PG rebuild covered core subset but not BOM/routing/CP/IP headers. | Added BOM/routing/control plan/inspection plan header sync and rebuild. |

## 3. Runtime Evidence Probe

| Probe | Result |
|---|---|
| `pwd` | `/Users/a10/Documents/mom-mda-v3-runtime-20260529` |
| `git rev-parse --short HEAD` before P27 | `da5682804` |
| Required report directory listing | Found P00-P21 outputs plus red-team/build-plan/gap ledgers. |
| Required grep: runtime-complete/JSON primary/compatibility | Confirmed current reports identify JSON primary and compatibility-only gaps. |
| Required grep: repository/mode symbols | Confirmed `DataLayer`, `MigrationStageManager`, `RuntimeShadowSync`, `JsonMasterDataRepository`, `authorityProbe`. |
| `php -l mom/api/services/MasterDataService.php` | PASS |
| `php -l mom/database/DataLayer.php` | PASS |
| `php -l mom/database/RuntimeShadowSync.php` | PASS |
| `php -l mom/api/services/DataLayerMasterDataRepository.php` | PASS |
| `php -l mom/api/controllers/MasterDataController.php` | PASS |
| `php -l mom/api.php` | PASS |
| `php -l mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php` | PASS |
| Direct smoke: repository in `JSON_ONLY` | PASS: `compatibility_only`, create/find works through service. |
| Direct smoke: PG authority with unreachable PG | PASS: `load_master_data_store()` throws `master_data_postgres_authority_unavailable`; no stale JSON authority fallback. |
| `composer test -- --filter MasterDataRepositoryBoundaryTest || true` | BLOCKED: root Composer has no `test` command. |
| `composer --working-dir=mom test -- --filter MasterDataRepositoryBoundaryTest || true` | BLOCKED: `vendor/bin/phpunit` missing. |
| `php mom/tools/audit_runtime_authority_consistency.php || true` | RAN: runtime remains `JSON_ONLY`, database unconfigured/unreachable. |
| `php mom/tools/release/check_user_identity_ssot.php || true` | PASS: `user identity ssot clean`. |

## 4. Files Changed

Created:

- `mom/api/services/DataLayerMasterDataRepository.php`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_MASTERDATA_PG_REPOSITORY_SPEC.md`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_JSON_CUTOVER_BRIDGE_MAP.csv`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_DRIFT_RECONCILIATION_TEST_PLAN.md`

Modified:

- `mom/api/services/MasterDataService.php`
- `mom/api/controllers/MasterDataController.php`
- `mom/api.php`
- `mom/database/DataLayer.php`
- `mom/database/RuntimeShadowSync.php`
- `mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`

Intentionally not changed:

- Original checkout `/Users/a10/Documents/mom`.
- Runtime data files under `mom/data`.
- User identity stores.
- UOM work in other sessions.

## 5. Design / Code Delta

- `DataLayerMasterDataRepository` maps active master-data reads/writes to DataLayer mode semantics.
- `JSON_ONLY`: JSON remains compatibility primary.
- `SHADOW_WRITE`: JSON remains primary with PostgreSQL shadow sync and bridge telemetry.
- `POSTGRES_PRIMARY`: active writes sync PostgreSQL first, then JSON cache.
- `POSTGRES_ONLY`: active writes do not update JSON cache.
- `MasterDataService::authorityProbe()` now distinguishes compatibility, shadow, PG-primary-with-fallback, and PG-only states.
- `load_master_data_store()` and `load_master_data_active_store()` now fail closed when PostgreSQL authority is required but PG read fails.
- `RuntimeShadowSync` and `DataLayer` now round-trip BOM/routing/control plan/inspection plan headers, not only customers/suppliers/items/revisions/resources.

## 6. Operational Simulation Matrix

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|
| SIM-P27-001 | `POSTGRES_PRIMARY`, PG lacks released revision | release service | read master data for WO release | DataLayer PG read + drift gate | none | primary read fallback/drift | retry after PG sync | fail closed | WO releases with stale JSON item | P34 release gate test |
| SIM-P27-002 | JSON BOM newer than PG BOM | planner | reconcile BOM | hash/row-count comparison | drift record | blocker drift | resync or rollback | fatal drift | wrong BOM released | P38 scenario |
| SIM-P27-003 | `authorityProbe=compatibility_only` | release service | release/readiness check | authority probe gate | none | blocked release evidence | switch to PG mode after sync | fail closed | JSON-primary governs release | P30/P34 tests |
| SIM-P27-004 | `POSTGRES_ONLY` without restore drill | admin | mode promotion | restore drill gate | none | promotion denied | run restore drill | blocked | unrecoverable cutover | P41 red-team |
| SIM-P27-005 | JSON import changes hash | data steward | import/export bridge | reconciliation gate | cache only after PG write | drift report | rollback JSON/PG snapshot | drift report required | silent source divergence | P38 DSL |
| SIM-P27-006 | PG authority configured but unreachable | runtime | `load_master_data_store()` | fail-closed PG authority | none | primary-read blocked | fix DB/rollback mode | exception | stale JSON fallback | direct smoke passed |

## 7. Multi-role Adversarial Audit

| Role | Objection | Resolution |
|---|---|---|
| Data architect | Repository exists but not wired. | Wired `MasterDataService` and controller list/detail to DataLayer repository when rootDir exists. |
| MES owner | Release/readiness could still use JSON. | `load_master_data_store()` and active store fail closed when PG authority is required. |
| QA/eQMS | Pending approvals and history remain JSON. | Classified as controlled bridge gap; P31/P32 must move to audit/workflow/evidence spine. |
| Migration lead | BOM/routing/CP/IP were missing from PG round-trip. | Added header sync/rebuild for these collections. |
| SRE | Fallback needs observability. | Existing `observe_primary_read` is used; repository emits bridge events for JSON bridge writes. |
| Security | JSON cache under PG mode could become authority. | `POSTGRES_ONLY` no longer writes active JSON cache; `POSTGRES_PRIMARY` labels JSON as cache after PG write. |
| DBA | No live PG proof. | Report keeps live PG reconciliation as open controlled gap, not a readiness claim. |
| Product owner | Existing UI reads should not break. | JSON_ONLY smoke passed; controller list/detail still return same records through service. |
| Red team | Stop rule on stale JSON fallback. | Direct smoke proves PG-required fallback is blocked. |

## 8. Gap Ledger Update

| gap_id | previous_severity | p27_status | evidence | next_owner |
|---|---|---|---|---|
| P27-G01 MasterDataService defaults to JSON repository | P0 | REPAIRED | `DataLayerMasterDataRepository`; constructor wiring with rootDir | P31 command service |
| P27-G02 Controller list/detail bypass repository | P1 | REPAIRED | `MasterDataController` now reads through service | Regression test when PHPUnit available |
| P27-G03 Release/readiness can silently fallback to JSON under PG authority | P0 | REPAIRED | direct smoke blocks unreachable PG authority fallback | P30/P34 gate tests |
| P27-G04 BOM/routing/CP/IP missing PG round-trip headers | P0 | PARTIAL_REPAIR | `RuntimeShadowSync` and `DataLayer` header sync/rebuild added | P30 package physicalization |
| P27-G05 History/pending/archive still JSON | P1 | CONTROLLED_GAP | bridge event classification in repository | P31/P32 |
| P27-G06 Live PG restore drill absent | P0 | OPEN | runtime probe still `JSON_ONLY` | P38/P41 |
| P27-G07 Full PHPUnit unavailable | P2 | CONTROLLED_GAP | `vendor/bin/phpunit` missing | Dev environment |

## 9. Decision Token

`P27_PASS_WITH_CONTROLLED_GAPS`

P27 unlocks P28 because the repository/cutover path is no longer only narrative: code now routes active master-data through DataLayer mode semantics, blocks stale JSON fallback when PG authority is required, and expands round-trip coverage for core engineering headers. It remains controlled-gap, not ready, until a live PostgreSQL reconciliation and restore drill exist.
