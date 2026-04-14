# Tranche 14 Unresolved Backlog Ledger

Date: 2026-04-14

This ledger is synthesized from the six pass-1 agent reports, current code, tests, generated registry artifacts, and prior tranche documents. `FIX_NOW` items are code/process-fixable in this run. External deployment proof and explicit product-scope decisions are kept separate from code backlog.

## Ledger

| Source prompt / tranche / doc | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action required in this run |
|---|---|---|---|---|---|---|
| Tranche 13 registry/publication closure docs; Agent 1 | Generated registry/system-contract tests match current artifacts, not stale historical counts. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `verify_publication_truth.py` passes 244/244; current endpoint count is 22, relation count is 0, workflow count is 0. Tests still asserted `>=3000` endpoints/relations and `>=250` workflows. | Test drift created false failures and false expectations. | Yes | Update tests/smokes to assert consistency with current generated artifacts instead of obsolete size floors. |
| Agent 4 architecture authority | Schema Studio source labels match actual runtime/controlled contract paths. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `SchemaStudioController` labeled source metadata as `data/registry/table-registry.json`, while runtime consumes `mom/data/registry` and fallback contracts under `mom/contracts`. | Generated-artifact path drift erodes proof-layer trust. | Yes | Update source labels and add regression assertions that root `data/registry` is not reported. |
| Agent 5 reliability/security | Dispatch production reports leave durable projection evidence if manufacturing-event projection fails. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `DispatchController::recordProductionReport()` called `appendProductionReportEvent()` after state mutation; `ShopfloorExecutionService` caught `Throwable` and only logged. | A successful report could lack event projection proof. | Yes | Return projection status, write durable manufacturing-event projection dead-letter JSONL, and include the status in the response. |
| Agent 5 reliability/security | Mobile work queue task state is not completed without the append-only task-event journal. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `MobileWorkQueueService::completeTask()` saved `work_queue.json` before appending `mobile.task_completed`. | Snapshot and event truth could diverge on journal failure. | Yes | Persist queue mutation and event journal as one guarded operation; rollback snapshot and write dead-letter if the journal fails. |
| Agent 6 defects backlog; `WORLD_CLASS_CLOSURE_20260414.md` | Audit-pack export creates a retrievable bundle and receipt, not only a manifest. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `AuditPackExporter` only built a manifest; route was `POST /api/v1/eqms/audit-packs/manifest` with no durable readback. | Release/eQMS evidence remained manifest-grade. | Yes | Add durable bundle write, receipt write, hash readback, retrieval route, and regression test. |
| Agent 6 repo hygiene | Prompt/source artifacts do not remain tracked in root operational lanes. | `FIX_NOW -> CLOSED_BY_IMPLEMENTATION` | `git ls-files prompts standards/prompts tools/prompts` showed tracked prompt files. | Controlled source tree carried prompt artifacts outside a governed docs lane. | Yes | Move tracked prompt files into `mom/docs/ai-prompts/legacy-source-prompts/` and ignore root prompt lanes. |
| Agent 6 cleanup | Helper branches/worktrees are removed after final merge. | `FIX_NOW -> FINAL_PHASE_PENDING` | `git worktree list` and branch listing showed tranche 14 helper worktrees plus older helper surfaces. | Cleanup must happen only after merge gate passes. | Yes | Delete tranche 14 helper worktrees/branches and safe stale helper surfaces in final phase. |
| Agent 1/4 runtime authority | Strict runtime authority across all governed slices. | `PRODUCT_DECISION_REQUIRED` / `MIGRATION_ROLLOUT_REQUIRED` | `RuntimeAuthorityService` reports `mixed_authority=true` and `strict_authority_ready=false`; trusted release and connected governance still expose file fallback modes. | Full authority consolidation needs migration/rollout decisions beyond a local patch. | No | Keep claims partial; do not call this world-class complete. |
| Agent 1/4 traceability/digital thread | End-to-end event-to-edge coverage across all operational event families. | `PRODUCT_DECISION_REQUIRED` | Genealogy graph service is strong, but runtime posture still classifies some traceability modes as partial/read-model. | Event taxonomy and coverage breadth are not a narrow code defect. | No | Define product taxonomy and rollout scope before claiming full digital-thread parity. |
| Agent 5 observability | Live OpenTelemetry / Loki exporter proof. | `BLOCKED_EXTERNAL` | Local trace/log envelopes exist, but live collector/exporter proof was not exercised. | Requires target infrastructure and endpoint evidence. | No | Collect live observability proof outside local repo. |
| Agent 5 / generated publication truth | Release readiness blocked by graphics governance. | `BLOCKED_EXTERNAL` / `PRODUCT_DECISION_REQUIRED` | Generated registry quality/readiness artifacts report blocked graphics governance posture. | Requires graphics governance release evidence or owner decision. | No | Preserve blocker wording; do not hide it in green docs. |
| Agent 2 standards | FDA Part 11 applicability and validation scope. | `PRODUCT_DECISION_REQUIRED` | Repo has structural controls, but no formal regulated-scope decision or validation package. | Part 11 scope is predicate-rule/compliance ownership, not a code-only patch. | No | Document scope decision before claiming Part 11 readiness. |
| Agent 2/5 standards | Live OT segmentation, incident response, recovery evidence. | `BLOCKED_EXTERNAL` | NIST SP 800-82 requires OT operational proof; local app code cannot prove target network segmentation or recovery drills. | Requires deployed environment evidence. | No | Gather deployment/runbook evidence. |
| Agent 3 vendor benchmark | SAP/Siemens/Critical/ETQ/MasterControl suite parity. | `PRODUCT_DECISION_REQUIRED` | Agent 3 found foundations but not vendor-suite parity. | Requires roadmap and breadth decisions. | No | Keep benchmark gaps explicit and choose future slices through the matrix. |

## Code-Fixable Closure Summary

Closed in implementation before pass-2:

- stale generated-count test expectations;
- Schema Studio source-label drift;
- silent dispatch projection failure;
- non-atomic mobile task completion journal;
- manifest-only audit-pack export;
- tracked root prompt-source hygiene.

Pending until final phase:

- branch/worktree cleanup after merge to `main`.

## Remaining Non-Code Blockers

- Live OT segmentation/recovery proof.
- Live OpenTelemetry/Loki collector/exporter proof.
- Production WORM/Object Lock or equivalent immutable-storage evidence.
- Formal Part 11 applicability/validation scope.
- Graphics governance release proof.

## Remaining Product Decisions

- Multisite rollout thresholds.
- Full authority consolidation rollout scope.
- Full digital-thread event taxonomy coverage.
- Vendor-suite parity roadmap and priority order.
