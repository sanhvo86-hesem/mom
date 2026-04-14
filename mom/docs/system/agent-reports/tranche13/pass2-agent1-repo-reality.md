# Tranche 13 Agent 1 - Pass 2 Repo Reality Audit

Date: 2026-04-14
Branch: `codex/tranche13-a1-repo-reality`
Worktree: `/Users/a10/Documents/mom-tranche13-a1`

## Commands run

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git worktree list`
- `find data/registry mom/data/registry -maxdepth 2 -type f | sort`
- `php -l mom/api/services/RegistryService.php`
- `php -l mom/api/services/DataSchemaService.php`
- `php -l mom/api/services/CanonicalManufacturingSpineService.php`
- `php -l mom/api/services/RuntimeAuthorityService.php`
- `php -l mom/api/controllers/HealthController.php`
- `composer test -- --filter RuntimeAuthorityServiceTest`
- `python3 mom/tools/registry/verify_publication_truth.py`
- `python3 mom/tools/registry/canonical_publication_orchestrator.py --dry-run`

## Pass-2 findings

| Area | Status | Evidence | Conclusion |
|---|---|---|---|
| Runtime registry path | VERIFIED_COMPLETE | `find data/registry mom/data/registry -maxdepth 2 -type f | sort` returns `mom/data/registry/endpoint-catalog-index.json`, `relation-map.json`, `schema-authority-summary.json`, and `table-registry.json` only; `RuntimeAuthorityService::baseDir()` checks `dirname($this->dataDir) . '/data/registry/table-registry.json'` and returns that base when present; `RegistryService` loads from `$dataDir/registry` first, then falls back to `contracts/`. | The app now consumes the checked-in runtime registry path instead of the old root bootstrap path drift. |
| Registry overlay behavior | VERIFIED_COMPLETE | `RegistryService::loadTableRegistry()` merges runtime registry metadata with authored contract metadata; `CanonicalManufacturingSpineServiceTest::testRuntimeBootstrapSkeletonUsesContractColumnsForValidation()` copies the runtime registry, blanks `columns`, and still validates `true`. | Canonical-spine validation now overlays authored contract columns when the runtime bootstrap is skeletal. |
| Runtime authority strict health surface | VERIFIED_COMPLETE | `HealthController::evaluateComponents()` adds `runtime_authority_strict`; `HealthControllerRuntimeAuthorityTest::testStatusPayloadIncludesRuntimeAuthorityReport()` asserts `strict_authority_ready` is `false` in JSON-only mode and that the `runtime_authority_strict` check exists; `RuntimeAuthorityService::report()` emits `mixed_authority` and `strict_authority_ready`. | The strict authority surface is present, explicit, and honest. It does not pretend mixed-authority runtime is strict-ready. |
| Publication verifier truthfulness | VERIFIED_COMPLETE | `mom/tools/registry/verify_publication_truth.py` resolves `PORTAL/data/registry` / `qms-data/registry`, checks required artifacts, and skips later gates when the required set is missing; the run failed with `41` failures and reported the missing `endpoint-catalog.json`, `frontend-foundation-catalog.json`, `registry-manifest.json`, and related artifacts. `canonical_publication_orchestrator.py --dry-run` ended with `Overall: DRY-RUN (NOT VERIFIED)`. | The verifier is truthful now. It fails on the real missing publication inputs instead of emitting a false green or a traceback. |
| Repo hygiene cleanup | PARTIAL | `git status --short --branch` is clean in this helper worktree, but `git worktree list` still shows the integration worktree plus tranche13 helper worktrees. | Local worktree hygiene is clean here, but repo-wide cleanup/deletion is not finished yet. |
| Doc/code/test drift | TEST_DRIFT; DOC_ALIGNED | Current tranche13 docs (`mom/docs/system/world-class-swarm-closure-tranche13.md`, `mom/docs/system/branch-strategy-tranche13.md`, `mom/docs/system/unresolved-backlog-ledger-tranche13.md`, `mom/docs/system/world-benchmark-dossier-tranche13.md`, `mom/docs/schema-authority-model.md`, `mom/contracts/README.md`) now describe bootstrap-aligned-but-partial publication truth and no longer overclaim full closure. `composer test -- --filter RuntimeAuthorityServiceTest` still fails because `vendor/bin/phpunit` is absent in this worktree. | Documentation is broadly aligned with code reality, but the PHPUnit suite remains non-runnable in this worktree. |

## Notes on code-fixable defects

- No new code-fixable pass-2 defect was identified in the inspected surfaces.
- Remaining blocker is the publication source-input set, which `verify_publication_truth.py` reports as absent; that is a real blocker, but not something this pass can safely fabricate away.
- Repo cleanup remains open as a git/worktree operation, not a PHP code defect.

## Bottom line

Pass 2 confirms the implementation commit repaired the runtime registry path, preserved overlay-based canonical-spine validation, added a strict authority health surface, and made the publication verifier truthful. The remaining gaps are external publication inputs, non-code repo cleanup, and the absent PHPUnit runner in this worktree.
