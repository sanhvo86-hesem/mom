# Backend EQMS Plural-Form REST Aliases Report

## Summary
- 54 plural-form routes registered across 7 EQMS roots.
- 7 additive `query()` wrapper methods added to controllers.
- OpenAPI spec extended with `EQMS Plural Aliases` paths.
- Endpoint catalog and compact endpoint index regenerated for the 54 ADR-0008 aliases only.

## Branch and working tree
- Branch: `codex/backend-eqms-aliases`
- Base: `origin/main` at `8d3aaf5cc11fa83111b09b647b53b1e32d2f3b95`
- Implementation committed from isolated worktree: `/tmp/mom-backend-eqms`

## Routes added
| Root | Plural path | Routes added | Methods skipped and why |
|---|---|---:|---|
| NQCASE | `/api/v1/nonconformance-cases` | 13 | None |
| CAPA | `/api/v1/capas` | 12 | None |
| CDOC | `/api/v1/controlled-documents` | 11 | None |
| INSP | `/api/v1/inspections` | 2 | Generic `create`, `detail`, `update`, and `audit` were not registered because `EqmsInspectionController` only exposes subtype-specific methods (`iqc*`, `inprocess*`) and this slice permits only one new `query()` wrapper. |
| BREL | `/api/v1/batch-releases` | 4 | No missing target methods for the registered route set. Create/update/audit were left untouched because the locked route block scoped BREL to list/detail plus release actions. |
| ECO | `/api/v1/engineering-changes` | 5 | None |
| TRAIN | `/api/v1/training-records` | 7 | None |

## Controller wrappers added
- `EqmsNcrController::query()` delegates to `search()`.
- `EqmsCapaController::query()` delegates to `search()`.
- `EqmsDocumentsController::query()` delegates to `search()`.
- `EqmsInspectionController::query()` delegates to existing inspection projections; default is `iqcQuery()`, with `subtype/type=inprocess|in-process|in_process` delegated to `inprocessQuery()`.
- `EqmsBatchReleaseController::query()` delegates to `search()`.
- `EqmsEngineeringChangeController::query()` delegates to `search()`.
- `EqmsTrainingController::query()` delegates to `search()`.

Note: `BaseController` already has a protected `query(string $key, ?string $default): ?string` helper, so wrappers use a compatible public signature and proxy keyed helper calls to `parent::query()`.

## Validation
### Alias vs canonical response equivalence
- Runtime curl smoke through `php -S 127.0.0.1:8090 -t mom` required `/api/index.php/...` routing in the local dev server.
- All 7 singular list roots and all 7 plural list aliases reached middleware and returned matching `401 unauthorized` without an authenticated session.
- Initial direct `/api/v1/...` smoke returned `400 unknown_action` because the bare PHP dev server was not using a router script; `/api/index.php/api/v1/...` was the valid local smoke form.
- Data equivalence was not asserted by curl because auth blocked unauthenticated list responses; structural equivalence is covered by the contract test.

### OpenAPI spec
- `mom/api/openapi.yaml` adds tag `EQMS Plural Aliases`.
- Plural paths were added for every registered alias with descriptions pointing back to the singular EQMS path and ADR-0008.
- YAML parse check passed via Ruby `YAML.load_file`.

### Endpoint catalog regeneration
- `mom/data/registry/endpoint-catalog.json`: 54 entries with `source=rest-routes.php+ADR-0008`.
- `mom/data/registry/endpoint-catalog-index.json`: 54 compact rows with `source=rest-routes.php+ADR-0008`.
- Per-root catalog counts: NQCASE 13, CAPA 12, CDOC 11, INSP 2, BREL 4, ECO 5, TRAIN 7.
- AI index regenerated with `php tools/scripts/ai-index/generate.php --verbose`.

### PHPUnit and static checks
- `php -l` passed for all 7 touched controllers, `mom/api/routes/rest-routes.php`, and `mom/tests/contract/EqmsPluralAliasTest.php`.
- Targeted contract test passed: `./vendor/bin/phpunit tests/contract/EqmsPluralAliasTest.php --testdox` -> 60 tests, 276 assertions.
- Full test suite passed with repo memory setting: `php -d memory_limit=1G vendor/bin/phpunit --testdox` -> 562 tests, 4883 assertions, 1 skipped.
- Focused PHPStan passed for touched controllers/routes.
- Full `./composer analyse -- --memory-limit=1G` failed with 20 pre-existing EQMS PHPStan errors in controllers outside this slice: `EqmsAmlController`, `EqmsCsatController`, `EqmsEventsController`, `EqmsFaiController`, `EqmsLessonsLearnedController`, and `EqmsSamplingPlansController`.
- `./composer check` failed at the same PHPStan gate before running tests.

## Rollback notes
`git revert <this-commit>` reverts cleanly because changes are additive route/catalog/spec/test/report updates with no schema migration.

## Remaining warnings
- Full PHPStan/check remains blocked by unrelated legacy EQMS static-analysis debt outside the touched alias files.
- Inspection alias coverage is intentionally narrower because generic inspection CRUD methods do not exist and adding more wrapper methods was forbidden.
- Local unauthenticated curl could only prove route reachability to auth middleware, not data equivalence.

## Decision
EQMS_ALIASES_PASS_WITH_WARNINGS
