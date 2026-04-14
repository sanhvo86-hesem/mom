# Tranche 14 Unresolved Backlog Ledger

Date: 2026-04-14

This ledger is synthesized from pass-1/pass-2 agent reports, current code, tests, generated artifacts, and tranche documents. Code-fixable findings identified in pass 1 and pass 2 are closed on the integration branch unless explicitly listed as final-phase git cleanup.

## Closure Ledger

| Source prompt / tranche / doc | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action required in this run |
|---|---|---|---|---|---|---|
| Agent 1 / tranche13 generated tests | Generated tests match current artifacts. | `CLOSED_BY_IMPLEMENTATION` | `verify_publication_truth.py` passes 241/241; `composer check` passes 414 tests. | Not open. | No | None. |
| Agent 4 / Schema Studio source labels | Source labels match consumed paths. | `CLOSED_BY_IMPLEMENTATION` | Schema Studio/Data Schema tests pass; fallback test expects controlled contract source where appropriate. | Not open. | No | None. |
| Agent 5 / dispatch projection | Projection failure is observable and durable. | `CLOSED_BY_IMPLEMENTATION` | Shopfloor tests assert `projection_status=dead_letter`; dispatch response includes `manufacturing_event_projection`. | Not open. | No | None. |
| Agent 5 / mobile task journal | Snapshot and append-only event do not diverge silently. | `CLOSED_BY_IMPLEMENTATION` | Mobile queue test covers rollback/dead-letter on journal failure. | Not open. | No | None. |
| Agent 6 / audit-pack export | Export writes retrievable bundle and receipt. | `CLOSED_BY_IMPLEMENTATION` | World-class control-plane test covers bundle, receipt, and hash readback. | Not open. | No | None. |
| Agent 6 / prompt hygiene | Prompt sources are governed under docs, not root lanes. | `CLOSED_BY_IMPLEMENTATION` | `.gitignore`; `mom/docs/ai-prompts/legacy-source-prompts/`. | Not open. | No | None. |
| Pass-2 Agent 6 / registry bootstrap test | Test proves actual bootstrap invariant. | `CLOSED_BY_IMPLEMENTATION` | `RegistryBootstrapPathTest` now allows full overlay and rejects root pollution; `composer check` passes. | Not open. | No | None. |
| Pass-2 Agent 6 / untracked generated inputs | Allowlisted generator inputs are tracked or resolved. | `CLOSED_BY_IMPLEMENTATION` | `api-params.json` and `schema-library.json` are restored and will be staged. | Not open after staging. | No | Stage/commit in integration branch. |
| Pass-2 Agent 6 / AI blank-scope SQL | Blank plant scope fails closed. | `CLOSED_BY_IMPLEMENTATION` | `SecurityHardeningRegressionTest` asserts no `WHERE 1=1`, sentinel scope, and empty JSON fallback. | Not open. | No | None. |
| Pass-2 Agent 4 / finance org authority | Governed org-scoped finance actions use authenticated org scope. | `CLOSED_BY_IMPLEMENTATION` | Finance tests cover rejection of caller-supplied org without session plus org propagation into backdate exception and memo. | Not open. | No | None. |
| Pass-2 Agent 4 / object-index action guidance | Authored command guidance survives publication. | `CLOSED_BY_IMPLEMENTATION` | `generate_business_contract_bundle.py` derives `recommendedActions` from workflow commands; object index has non-empty actions for authored command resources. | Not open. | No | None. |
| Pass-2 smoke / Data Schema freshness | Derived artifact drift does not flag downstream manifest patches as upstream drift. | `CLOSED_BY_IMPLEMENTATION` | `data_schema_admin_smoke.php` passes after removing circular manifest dependencies for reports that patch the manifest. | Not open. | No | None. |
| Final git cleanup | Helper and integration worktrees/branches are removed after merge. | `FINAL_PHASE_PENDING` | `git worktree list` still contains tranche14 helper worktrees before final phase. | Cleanup must happen after merge gate and integration commit. | Yes | Remove helper worktrees/branches and integration branch after merge to `main`. |
| Strict runtime authority across all slices | Uniform production authority. | `PRODUCT_DECISION_REQUIRED` / `MIGRATION_ROLLOUT_REQUIRED` | Runtime authority still reports mixed-authority modes where compatibility paths remain. | Requires rollout/migration decisions. | No | Keep claims partial. |
| Full publication equals schema authority | Registry publication covers every schema table. | `PRODUCT_DECISION_REQUIRED` / `MIGRATION_ROLLOUT_REQUIRED` | Schema authority reports 772 schema tables and 758 registry tables. | Requires migration/publication scope decision. | No | Keep explicit delta. |
| Graphics publication blocker | Generated publishability can be true. | `PRODUCT_DECISION_REQUIRED` | Publication truth remains `ready=false` because graphics release blockers are active. | Owner disposition needed. | No | Do not claim publishable. |
| Live OTel/OT/WORM/validation proof | Deployment evidence exists. | `BLOCKED_EXTERNAL` | Local tests cannot prove target collectors, network segmentation, immutable storage, or validation package. | Needs external environment proof. | No | Gather deployment evidence outside local repo. |
| FDA Part 11 scope | Predicate-rule scope and validation status are decided. | `PRODUCT_DECISION_REQUIRED` | Code has record/signature controls but no compliance-owner scope decision. | Compliance ownership required. | No | Decide and validate before claiming readiness. |

## Code-Fixable Closure Summary

Closed in this tranche: generated-count drift, source-label drift, missing generator inputs, fake publication bridge truth, dispatch/mobile dead-letter gaps, audit-pack manifest-only export, prompt hygiene, AI blank-scope broad SQL, finance org authority, object-index action guidance, registry bootstrap test drift, and Data Schema circular freshness drift.

## Remaining Non-Code Blockers

- Live OT segmentation/recovery proof.
- Live OpenTelemetry collector/exporter proof.
- Production WORM/immutable storage evidence.
- Formal validation package and Part 11 scope.
- Graphics publication release blocker evidence.

## Remaining Product Decisions

- Multisite rollout and system-job claim model.
- Full authority consolidation scope.
- Full digital-thread taxonomy coverage.
- Registry/schema publication delta plan.
- Vendor-suite parity roadmap.
