# Tranche 13 Agent 1 - Repo Reality Audit

Date: 2026-04-14
Branch: `codex/tranche13-a1-repo-reality`

## Scope

Audit of current repo reality against prior tranche claims. No code changes were made. Evidence is limited to current code, current docs, current generated artifacts, and current command output from this worktree.

## Commands run

- `git status --short --branch`
- `find data/registry mom/data/registry -maxdepth 2 -type f | sort`
- `php -r '...count(data/registry/table-registry.json)...'`
- `php -r '...count(data/registry/endpoint-catalog-index.json)...'`
- `php -r '...schema-authority-summary.json...'`
- `php -l mom/api/services/LogTransport.php`
- `php -l mom/api/services/QueueService.php`
- `php -l mom/api/services/SliceObservability.php`
- `php -l mom/api/controllers/HealthController.php`
- `php -l mom/api/controllers/BaseController.php`
- `composer test -- --filter RuntimeAuthorityServiceTest`

## High-signal findings

1. The repo now contains generated registry bootstrap artifacts at the repo root:
   - `data/registry/table-registry.json` contains 661 tables.
   - `data/registry/endpoint-catalog-index.json` contains 604 rows.
   - `data/registry/schema-authority-summary.json` reports `{"total":661,"domains":1}`.
   - `data/registry/relation-map.json` exists as a small bootstrap map.

2. The app subtree runtime mirror is still missing:
   - `find data/registry mom/data/registry -maxdepth 2 -type f | sort`
   - result: files under `data/registry/` only; `mom/data/registry` does not exist.
   - This is the key contradiction: root bootstrap artifacts exist, but `mom/` runtime code still points at `mom/data/registry`.

3. Current repo status is clean on the helper branch:
   - `git status --short --branch` shows only `## codex/tranche13-a1-repo-reality`.

4. Syntax checks for the inspected core files pass:
   - `LogTransport.php`
   - `QueueService.php`
   - `SliceObservability.php`
   - `HealthController.php`
   - `BaseController.php`

5. PHPUnit is not runnable in this worktree:
   - `composer test -- --filter RuntimeAuthorityServiceTest`
   - failure: `Could not open input file: vendor/bin/phpunit`
   - So test claims remain unproven here even though unit tests exist in the tree.

## Classification by area

| Area | Status | Evidence | Assessment |
|---|---|---|---|
| Authority core | PARTIAL | `mom/api/services/CanonicalManufacturingSpineService.php:354-370`, `mom/api/services/RuntimeAuthorityService.php`, `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:29-63` | Registry-backed authority exists for some slices, but multiple slices still report `compatibility_only` / `authority_partial`, and the app runtime registry mirror is missing. |
| Planning / execution core | PARTIAL | `mom/api/services/OrderWorkflowService.php:193-223`, `mom/api/services/PlanningScenarioService.php`, `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:29-63` | Order workflow is still JSON-primary in current entrypoints; planning scenarios are not fully authoritative. |
| Traceability / genealogy core | PARTIAL | `mom/api/services/TraceabilityGenealogyService.php:346-365`, `mom/api/services/ProductionHistoryReadModelService.php:55-70` | Event-ledger read models exist, but the traceability slice still reports `compatibility_only` in runtime authority tests. |
| Trusted release / record core | PARTIAL | `mom/api/services/FileTrustedReleaseRecordRepository.php:90-105`, `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php:29-63` | File fallback remains `compatibility_only/json_fallback`; this is not full trusted-record authority. |
| Connected governance / training / qualification core | PARTIAL | `mom/api/services/FileConnectedGovernanceRepository.php:87-104`, `mom/api/services/WorkforceQualificationGateService.php:125-140` | Governance is still file-backed fallback; qualification gate is only authoritative when requirements exist. |
| Route / control surface | PARTIAL | `mom/api/routes/generic-runtime-routes.php:9-26`, `mom/api/controllers/RegistryController.php:19-49` | Runtime route discovery still prefers `$dataDir/registry/table-registry.json` and falls back to contracts. With `mom/data/registry` missing, runtime wiring is incomplete. |
| Observability surfaces | PARTIAL | `mom/api/services/LogTransport.php:294-314`, `mom/api/services/SliceObservability.php`, `mom/api/index.php:271-285`, `mom/tests/Unit/Services/LogTransportHealthTest.php:43-55` | Request-scoped context and explicit health probes are present, but this is still local observability, not full OpenTelemetry SDK / propagator proof. |
| Tests | TEST_DRIFT | `composer test -- --filter RuntimeAuthorityServiceTest` fails because `vendor/bin/phpunit` is missing; unit test files exist under `mom/tests/Unit/...` | Test intent is present, but the suite cannot be executed in this worktree, so any green claim is unverified here. |
| Generated registry / system-contract artifacts | PARTIAL | `data/registry/table-registry.json`, `data/registry/endpoint-catalog-index.json`, `data/registry/schema-authority-summary.json`, `find data/registry mom/data/registry ...` | Bootstrap artifacts now exist at repo root, but the app-local runtime mirror still does not exist, so the app cannot treat registry publication as fully landed. |
| Prior world-class docs | DOC_DRIFT | `mom/docs/system/world-class-swarm-closure-tranche12.md:5-20`, `mom/docs/system/branch-strategy-tranche12.md`, `mom/docs/system/unresolved-backlog-ledger-tranche12.md`, `mom/docs/system/world-benchmark-dossier-tranche12.md`, `mom/contracts/README.md:3-9` | Several tranche-12 docs are historical snapshots or still describe the app-local registry gap; they do not serve as current closure proof. |

## Contradictions and false confidence

- Any claim that the repository has a fully wired runtime registry is false. The root-level bootstrap artifacts exist, but `mom/data/registry` is still absent and runtime code still looks for that path.
- Any claim that the current test suite is verified green is false in this worktree. The PHPUnit runner is missing, so the suite cannot be reproduced here.
- `mom/docs/system/world-class-swarm-closure-tranche12.md` reads like a live worklog, but its merge/cleanup state is stale relative to current main history.
- `mom/contracts/README.md` is still accurate about the app-local registry mirror being absent, but it does not account for the newer root-level bootstrap artifacts, so it is only partially current.

## Repo hygiene

- No unexpected file drift was introduced by this audit.
- Worktree is clean before commit.
- The only environment drift observed is the missing `vendor/bin/phpunit` executable in this worktree.

## Bottom line

The repo has moved forward on proof-layer and registry-bootstrap work, but the app-local runtime registry mirror is still missing, several core domains remain mixed-authority or fallback-backed, and current test claims are not reproducible in this worktree.
