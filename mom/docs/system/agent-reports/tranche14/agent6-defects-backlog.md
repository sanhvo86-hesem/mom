# Tranche 14 Agent 6 Defects Backlog Audit

Date: 2026-04-14  
Branch: `codex/tranche14-a6-defects-backlog`  
Worktree: `/Users/a10/Documents/mom-tranche14-a6`

## Executive summary

- The inherited tranche-13 code-fixable defects that were still relevant in this tree are closed in code and tests: publication truth / registry drift, AI plant-scope leakage, explicit mobile completion gating, Loki health truthfulness, strict runtime authority surfacing, and stale workspace revision handling.
- `python3 mom/tools/registry/verify_publication_truth.py` passes 244/244 gates in the current tree.
- The remaining open items are external evidence gaps, product-scope decisions, or repo hygiene / cleanup debt.
- The source tree still contains tracked prompt files, and the repo still carries a large stale worktree / branch surface from prior closures.

## Closure ledger

| Source | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action required in this run |
|---|---|---|---|---|---|---|
| Tranche 12 / 13 registry blocker threads; `mom/docs/schema-authority-model.md`; `mom/tools/registry/verify_publication_truth.py` | Runtime and publication tools must consume the same authority path, and publication proof must be truthful on the current branch. | `ALREADY_FIXED` | `verify_publication_truth.py` now passes 244/244 gates; `mom/docs/schema-authority-model.md:5-13` points runtime consumers at `mom/data/registry`; required artifacts exist in the consumed path. | No current open defect in this slice. | No | No action; keep the verifier as the gate. |
| `mom/api/controllers/AiSchedulingController.php`; `mom/tests/Unit/Controllers/SecurityHardeningRegressionTest.php` | Plant-scoped AI results must not leak blank-plant rows into a nonblank plant scope. | `ALREADY_FIXED` | `AiSchedulingController.php:190-201` now returns `return $rowPlant === $plantId;`; `SecurityHardeningRegressionTest.php:79-90` asserts the blank-plant leak path is absent. | No current open defect in this slice. | No | No action. |
| `mom/api/services/MobileWorkQueueService.php`; `mom/tests/Unit/Services/MobileWorkQueueServiceTest.php` | Task completion must require an explicit start and reject double completion. | `ALREADY_FIXED` | `MobileWorkQueueService.php:288-294` throws `task_not_started` unless the task is already started; `MobileWorkQueueServiceTest.php:124-145` covers explicit-start and double-completion behavior. | No current open defect in this slice. | No | No action. |
| `mom/api/controllers/HealthController.php`; `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`; `mom/tests/Unit/Services/LogTransportHealthTest.php` | Readiness must not count configured Loki healthy unless it is verified, and runtime authority strictness must be surfaced honestly. | `ALREADY_FIXED` | `HealthController.php:270-295` exposes `runtime_authority_strict` and fails configured Loki unless `loki_available` and `loki_verified` are both true; `HealthControllerRuntimeAuthorityTest.php:60-63,106-140` and `LogTransportHealthTest.php:51` assert the behavior. | No current open defect in this slice. | No | No action. |
| `mom/api/controllers/AdminMetadataStudioController.php`; `mom/tests/data_schema_admin_smoke.php` | Stale workspace saves must fail with a structured conflict instead of silently clobbering server state. | `ALREADY_FIXED` | `AdminMetadataStudioController.php:429` returns `stale_workspace_revision`; `mom/tests/data_schema_admin_smoke.php:597` asserts the conflict. | No current open defect in this slice. | No | No action. |
| `mom/docs/backend/WORLD_CLASS_CLOSURE_20260414.md:103-104`; `mom/docs/system/world-class-swarm-closure-tranche13.md:74` | Production immutable storage / WORM-style retention should not be claimed until the real storage target and legal-hold path are proven. | `BLOCKED_EXTERNAL` | The closure register still records `Immutable storage remains local adapter plus abstraction, not cloud WORM/Object Lock`; tranche-13 closure still lists live deployment proof as unproven. | Requires a real production storage target and retention/legal-hold evidence outside this repo. | No | Gather environment evidence and owner sign-off. |
| `mom/docs/system/world-class-swarm-closure-tranche13.md:74`; `mom/docs/backend-process-coverage-reaudit-2026-04-10.md:16,39` | OT readiness claims must be backed by real segmentation / recovery evidence, not local code-path health only. | `BLOCKED_EXTERNAL` | The tranche-13 closure still lists live OT segmentation/recovery evidence as unproven; the backend reaudit explicitly warns not to claim deployment readiness from local proof alone. | Requires target-environment OT evidence and recovery drills. | No | Collect deployment evidence in the target environment. |
| `mom/docs/system/world-class-swarm-closure-tranche13.md:74` | OpenTelemetry / collector / exporter readiness should not be claimed without live infrastructure proof. | `BLOCKED_EXTERNAL` | The tranche-13 closure still lists live OpenTelemetry / Loki infrastructure proof as unproven. | Requires live collector/exporter / endpoint evidence outside the repo. | No | Collect live observability proof. |
| `mom/docs/system/world-class-swarm-closure-tranche13.md:74`; `mom/docs/backend/WORLD_CLASS_CLOSURE_20260414.md:49` | Regulated electronic record/signature scope must be decided explicitly before claiming Part 11 readiness. | `PRODUCT_DECISION_REQUIRED` | The closure docs keep formal Part 11 validation scope unproven; the benchmark docs only claim local structural support, not regulated validation proof. | This is a regulated-scope decision, not a pure code defect. | No | Get the owner / compliance scope decision. |
| `mom/docs/system/world-class-swarm-closure-tranche13.md:74` | Multisite rollout thresholds and site-scoped readiness must be defined before claiming world-class rollout posture. | `PRODUCT_DECISION_REQUIRED` | The tranche-13 closure still lists multisite rollout thresholds as unproven. | This is a rollout policy / product threshold decision. | No | Define rollout thresholds and readiness criteria. |
| `mom/docs/system/world-class-swarm-closure-tranche13.md`; `mom/docs/backend/WORLD_CLASS_CLOSURE_20260414.md:111-114` | Vendor-suite parity claims should not be made until the specific parity target is decided. | `PRODUCT_DECISION_REQUIRED` | The benchmark docs keep SAP / Siemens / Critical / ETQ / MasterControl parity explicitly unproven; the closure register keeps UI/browser and durable export work in roadmap status. | This is roadmap prioritization, not a current code regression. | No | Keep benchmark wording honest and decide priority. |
| `mom/docs/backend/WORLD_CLASS_CLOSURE_20260414.md:28,110`; tracked source files from `git ls-files prompts standards/prompts tools/prompts` | Prompt / tmp artifacts should not remain tracked in controlled source. | `FIX_NOW` | `git ls-files` shows tracked `prompts/PROMPT-BACKEND-AI.md`, `prompts/PROMPT-FRONTEND-AI.md`, `standards/prompts/module-builder-world-class-prompts.md`, and `tools/prompts/*`; the closure register still lists prompt/tmp sprawl as deferred hygiene. | This is source-tree hygiene debt and is code/process-fixable now. | Yes | Move or remove the tracked prompt/tmp artifacts. |
| `mom/docs/backend/WORLD_CLASS_CLOSURE_20260414.md:74,103-114` | Audit-pack export should produce a retrievable bundle and receipt, not only a manifest-grade proof. | `FIX_NOW` | The closure register says the exporter is still only manifest-grade and the durable bundle remains P2 roadmap; there is no persisted bundle / receipt path in the audited slice. | This is a code-fixable backlog item still open in the docs. | Yes | Implement the persisted bundle, retrieval endpoint, and retry receipt tests. |
| `git worktree list`; `git branch --list 'codex/tranche14-*' 'codex/worldclass-*' 'agent-*'` | The repository should not retain stale helper worktrees / branches once the merge gate is satisfied. | `FIX_NOW` | `git worktree list` shows many stale `agent-*`, `codex/worldclass-*`, and `codex/tranche14-*` worktrees; `git branch --list` shows the matching branch surface is still present. | Cleanup is process-fixable but not yet executed. | Yes | Delete stale helper worktrees / branches in the final git cleanup phase. |

## Repo hygiene and cleanup blockers

- No ignored runtime residue was present in `git status --short --ignored=matching` during this audit.
- The hygiene debt that remains is tracked source, not ignored debris: the prompt files listed above are committed source files and should be treated as a controlled-source cleanup item.
- The branch / worktree surface is still large. The current repo has tranche14 helper branches plus older v7 / worldclass worktrees still mounted, so final cleanup must explicitly remove stale worktrees and branches after the merge gate.

## Verification evidence

- `php -l mom/api/controllers/AiSchedulingController.php`
- `php -l mom/api/services/MobileWorkQueueService.php`
- `php -l mom/api/controllers/HealthController.php`
- `python3 mom/tools/registry/verify_publication_truth.py`
- `git worktree list`
- `git branch --list 'codex/tranche14-*' 'codex/worldclass-*' 'agent-*'`
- `git ls-files prompts standards/prompts tools/prompts mom/docs/tmp`

## Test notes

- `vendor/bin/phpunit` was not available in this worktree, so I did not run the focused PHPUnit slice here.
- The publication-truth verifier is the strongest local proof for the registry/publication slice in this branch and passed cleanly.
