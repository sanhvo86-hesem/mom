# Pass 2 Agent 6 - Defect Hunter & Inherited Backlog Closure Audit

Date: 2026-04-14  
Branch: `codex/tranche14-zero-trust-closure-20260414`  
Worktree: `/Users/a10/Documents/mom-tranche14-integration`

## Executive summary

Pass 2 confirms that most inherited tranche-13 / tranche-14 code-fixable backlog is closed and verified. The current branch passes `php -l` on touched PHP files, `php mom/tests/backend_smoke.php`, and `python3 mom/tools/registry/verify_publication_truth.py` (`241/241`).

What still blocks merge is narrower but real:

1. stale test drift in `RegistryBootstrapPathTest`;
2. two generated registry artifacts that are explicitly allowlisted in `.gitignore` but still untracked;
3. one remaining blank-scope SQL helper in `AiSchedulingController`;
4. cleanup blockers from still-mounted helper worktrees / branches.

External proof gaps and product decisions remain separate and are not being misrepresented as code bugs.

## Closure ledger

| Source | Expected outcome | Current verified status | Evidence | Why open | Code-fixable now | Action required in this run |
|---|---|---|---|---|---|---|
| `mom/tests/Unit/Services/RegistryBootstrapPathTest.php`; `mom/api/services/RegistryService.php`; `mom/docs/system/agent-reports/tranche14/pass2-agent1-repo-reality.md` | Bootstrap-path proof should match the current runtime overlay contract, not an absent-runtime-file assumption. | `FIX_NOW` | `RegistryService.php:29-68, 207-217` loads runtime `mom/data/registry/table-registry.json` first and overlays controlled contracts; `RegistryBootstrapPathTest.php:12-25` now returns early when runtime registry exists; pass-2 agent1 recorded a PHPUnit failure on this test in the current branch. | The test is stale against the current runtime layout and no longer proves the intended bootstrap/path contract. | Yes | Rewrite the test to assert the current runtime-overlay contract explicitly, or move the assertion to the actual bootstrap invariant that still matters. |
| `.gitignore`; `mom/data/registry/api-params.json`; `mom/data/registry/schema-library.json`; `mom/tools/registry/generate-registry-v3.mjs`; `mom/tools/registry/generate-table-architecture.mjs` | Generated registry artifacts should be tracked or intentionally excluded, not left as dangling untracked outputs. | `FIX_NOW` | `git status --short` shows `?? mom/data/registry/api-params.json` and `?? mom/data/registry/schema-library.json`; `.gitignore:71-79` explicitly unignores both files; generator scripts read both paths by name. | Generated-artifact drift and untracked outputs are a merge blocker and cleanup blocker. | Yes | Stage and commit the generated artifacts, or regenerate them through the same controlled publication path before merge. |
| `mom/api/controllers/AiSchedulingController.php` | Security-sensitive plant-scoped queries should fail closed when plant scope is absent. | `FIX_NOW` | `AiSchedulingController.php:180` still returns `WHERE 1=1` from `plantWhereClause()` when `plant_id` is blank; `AiSchedulingController.php:2449-2458` still uses `WHERE 1=1` for schedule metrics when `$plantId === ''`. | A broad predicate still survives in a zero-trust surface; this is a hardening gap, not a finished closure. | Yes | Replace the blank-scope fallback with fail-closed behavior or an explicit admin-only branch, and add a regression test for the required scoping rule. |
| `git worktree list`; `git branch --list 'codex/tranche14-*' 'codex/worldclass-*' 'agent-*'` | Helper worktrees and helper branches should be removed after merge readiness is reached. | `FIX_NOW` | `git worktree list` still shows tranche14 helper worktrees plus older `mom-v7-*` / `codex/worldclass-*` surfaces; `git branch --list` still shows the corresponding helper branches. | Final cleanup has not happened yet, so merge hygiene is still incomplete. | Yes | Remove the tranche14 helper worktrees/branches in the final git cleanup phase, then re-check status on `main`. |
| `mom/data/registry/registry-quality-report.json`; `mom/data/registry/publication-truth-summary.json` | Publishability truth must stay honest about remaining blocker state. | `BLOCKED_EXTERNAL` | `python3 mom/tools/registry/verify_publication_truth.py` passes `241/241`, but Gate K still reports `truth_publishability_blocked_by_graphics`; the current summary JSON still shows `publishability.ready=false`, `status=review_required`, and `graphics_release_blockers_active`. | This is a live release / graphics-governance blocker, not a local code defect. | No | Clear the graphics-governance blocker and regenerate the truth artifacts before claiming publishability. |
| `mom/docs/system/world-class-swarm-closure-tranche14.md`; `mom/docs/system/unresolved-backlog-ledger-tranche14.md`; `mom/docs/system/world-benchmark-dossier-tranche14.md` | Live OT segmentation/recovery, live OpenTelemetry collector/exporter proof, WORM/immutable storage evidence, and deployment validation evidence should not be claimed without target-environment proof. | `BLOCKED_EXTERNAL` | Current tranche docs and pass-2 agent 2/5 evidence keep these as external proof gaps; local code can only prove the local path, not the real deployment target. | Requires environment evidence and owner sign-off outside the repo. | No | Gather deployment evidence and operational sign-off in the real target environment. |
| `mom/docs/system/unresolved-backlog-ledger-tranche14.md` | Part 11 scope, multisite thresholds, authority consolidation, digital-thread taxonomy, and vendor parity roadmap must be decided before closure claims. | `PRODUCT_DECISION_REQUIRED` | The tranche14 backlog ledger still marks these as product / compliance decisions rather than code defects. | These are scope and policy decisions, not local patches. | No | Get the responsible product/compliance decisions before trying to call them closed. |
| `mom/api/services/OrderService.php`; `mom/tests/Unit/Services/OrderServiceEngineeringGateTest.php`; `mom/tests/backend_smoke.php` | Sales orders without explicit `total_value` should derive from lines and still reject zero-value orders. | `ALREADY_FIXED` | `OrderService.php:478-550` derives `total_value` from lines and throws on zero; `OrderServiceEngineeringGateTest.php:104-145` covers both the derivation and zero-amount rejection; `backend_smoke.php:1407-1426` exercises the live path. | No current open defect in this slice. | No | No action. |
| `mom/api/services/FinanceControlService.php`; `mom/tests/Unit/Services/FinanceControlServicePeriodPolicyTest.php`; `mom/tests/backend_smoke.php` | Period closes should be org-scoped, and memos should carry approved status after governed consumption. | `ALREADY_FIXED` | `FinanceControlService.php:47-107, 114-135, 488-520, 682-708` scopes `period_close` by org and sets memo status to `approved`; `FinanceControlServicePeriodPolicyTest.php:28-78` and `backend_smoke.php:1260-1323` verify the behavior. | No current open defect in this slice. | No | No action. |
| `mom/api/services/CustomerPurchaseOrderService.php`; `mom/tests/backend_smoke.php` | Canonical customer PO records should persist `org_id` and stay synchronized with legacy Sales Orders. | `ALREADY_FIXED` | `CustomerPurchaseOrderService.php:109-150` writes `org_id` and canonical PO fields; `backend_smoke.php:1380-1432` proves backfill and synchronization against legacy Sales Order data. | No current open defect in this slice. | No | No action. |
| `mom/docs/ai-prompts/legacy-source-prompts/*`; `.gitignore` | Root prompt-source hygiene should be moved into a governed docs lane. | `ALREADY_FIXED` | `git ls-files mom/docs/ai-prompts/legacy-source-prompts/*` shows the legacy prompt sources now live under `mom/docs/ai-prompts/legacy-source-prompts/`; `.gitignore` now covers the root prompt lanes. | No current open defect in this slice. | No | No action. |
| `mom/api/services/ShopfloorExecutionService.php`; `mom/api/controllers/DispatchController.php`; `mom/tests/Unit/Services/ShopfloorExecutionServiceTest.php` | Dispatch production-report projection should return an explicit status and dead-letter on failure instead of silently succeeding. | `ALREADY_FIXED` | Pass-2 agent 5 evidence shows `ShopfloorExecutionService.php:1050-1157` now returns `projection_status = dead_letter` and writes a manufacturing-event projection dead-letter record; the dispatch controller captures the result. | No current open defect in this slice. | No | No action. |
| `mom/api/services/MobileWorkQueueService.php`; `mom/tests/Unit/Services/MobileWorkQueueServiceTest.php` | Mobile task completion should roll back and dead-letter if the append-only event journal fails. | `ALREADY_FIXED` | Pass-2 agent 5 evidence shows `MobileWorkQueueService.php:1138-1224` now restores the queue on failure and writes explicit dead-letter records; the unit test verifies the explicit-start and double-completion behavior. | No current open defect in this slice. | No | No action. |
| `mom/api/services/Evidence/AuditPackExporter.php`; `mom/api/controllers/EqmsControlPlaneController.php`; `mom/tests/Unit/Services/WorldClassControlPlaneExecutionTest.php` | Audit-pack export should be a retrievable bundle with receipt and hash readback, not manifest-only proof. | `ALREADY_FIXED` | Pass-2 agent 5 evidence shows the exporter now writes a bundle and receipt and verifies readback integrity; the unit test covers durable export/readback. | No current open defect in this slice. | No | No action. |

## Merge and cleanup risks

- `git status --short` still shows the two generated registry artifacts as untracked.
- `git worktree list` still shows tranche14 helper worktrees plus older helper surfaces; this is a hard cleanup blocker before final `main` merge.
- The AI scheduling blank-scope helper is still present in the controller and should be closed before merge, or the zero-trust posture is weakened.

## Verification evidence

- `php -l mom/api/services/OrderService.php`
- `php -l mom/api/services/FinanceControlService.php`
- `php -l mom/api/services/CustomerPurchaseOrderService.php`
- `php -l mom/tests/Unit/Services/OrderServiceEngineeringGateTest.php`
- `php -l mom/tests/Unit/Services/FinanceControlServicePeriodPolicyTest.php`
- `php -l mom/tests/backend_smoke.php`
- `php mom/tests/backend_smoke.php` -> `backend smoke tests passed`
- `python3 mom/tools/registry/verify_publication_truth.py` -> `241/241` passed
- `git status --short`
- `git worktree list`
- `git branch --list 'codex/tranche14-*' 'codex/worldclass-*' 'agent-*'`

## Final verdict

The branch is stronger than pass 1: the inherited closure items I could verify are mostly fixed, and the repository truth layer is internally consistent. The remaining issues are narrower but real. Merge is still blocked until the stale bootstrap test is corrected, the two generated registry artifacts are tracked or otherwise resolved, the blank-scope AI SQL helper is tightened, and the helper worktree/branch surface is removed.

What is actually stronger now:

- publication truth verifies cleanly at current scale;
- sales-order, period-close, customer-PO, mobile queue, dispatch projection, and audit-pack paths are more truthful and testable;
- prompt-source hygiene has been moved into a governed docs lane.

What still blocks true world-class positioning:

- live deployment proof for OT, OpenTelemetry, WORM/immutable storage, and regulated validation;
- product decisions for Part 11, multisite thresholds, authority consolidation, and vendor parity;
- final repo hygiene and merge cleanup.
