# V4 Inventory Ledger Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Prompt: P54 - Inventory, Lot, Serial, Genealogy, WIP, and Cost Ledger Runtime Closure
Posture: pre-production runtime-readiness evidence; not production-ready

## 1. Executive Decision

P54 closes the live command-stack gap for ledger-only inventory authority on the implemented command paths. Inventory commands now write append-only `inventory_ledger`, optional `wip_ledger`/`cost_ledger`, and `genealogy_edge_facts`; balance tables are protected as projections.

## 2. Source Truth Audit

- Existing `inventory_ledger`, `wip_ledger`, `cost_ledger`, `stock_balances`, `inventory_balance_snapshot`, `location_balance`, and `genealogy_edge_facts` existed before P54.
- `PostInventoryLedgerTransactionCommand` was registered but not implemented.
- `IssueMaterialToWorkOrderCommand` previously routed through MES command code; DomainCommandGateway now routes it through `InventoryCommandHandler` so the inventory mutation path is ledger-first.
- UOM remains direct: `InventoryCommandHandler -> UomCommandQuantityNormalizer -> UomRuntimeAuthorityService`.
- Quality hold remains canonical: `InventoryCommandHandler -> QualityHoldService`.

## 3. Runtime Evidence Probe

Manual probe:

```json
{"held_lot":{"problem":"quality_hold_active","ledger_writes":0,"uom_writes":0},"expired_lot":{"problem":"inventory_lot_expired","ledger_writes":0},"split_lot":{"ledger_rows":2,"genealogy_writes":1,"projection_writes":0},"period_close":{"problem":"inventory_reconciliation_mismatch","mismatch_writes":1,"period_close_writes":0}}
```

## 4. Blocker / Gap Map

Closed:

- Balance projection mutation has a PostgreSQL trigger guard.
- Inventory commands use direct UOM authority before ledger quantities.
- Canonical quality hold blocks inventory issue/move before mutation.
- Expired lot without deviation blocks before ledger write.
- Period close blocks on reconciliation mismatch.

Controlled:

- Real DB migration execution and browser smoke remain deployment tasks.
- Vendor binaries are missing locally, so PHPUnit/PHPStan remain blocked.

## 5. Design Delta

- Added `InventoryCommandHandler` for receive, putaway, move, issue material, split, merge, complete-to-stock, scrap, rework, adjustment, reconciliation, period close, ledger post, and recall trace export.
- Added migration 279 with idempotency columns, projection write guard, reconciliation tables, period close table, recall trace export table, generic CRUD registry rows, and regulated action policies.
- Added UOM command policies for P54 inventory commands.
- Added unit tests and runtime probe.

## 6. Implementation Plan

Implemented in one logical unit after P53. The next prompts must extend this ledger authority into shipment, MES runtime event spine, scenario runner, and final acceptance.

## 7. Files To Edit

- `mom/database/migrations/279_inventory_ledger_runtime_authority.sql`
- `mom/api/services/DomainCommand/InventoryCommandHandler.php`
- `mom/api/services/DomainCommand/DomainCommandGateway.php`
- `mom/api/services/DomainCommand/CommandRegistry.php`
- `mom/api/services/DomainCommand/RegulatedActionPolicy.php`
- `mom/api/services/Uom/UomRuntimeAuthorityService.php`
- `mom/tests/Unit/Services/DomainCommandInventoryCommandHandlerTest.php`

## 8. Files Forbidden Or High-risk

- UOM branch-owned implementation internals beyond command policy matrix.
- Legacy JSON inventory stores, if any, because they must not become authority.
- `stock_balances`, `inventory_balance_snapshot`, and `location_balance` direct writers.

## 9. Code / Schema / Contract Changes

- `inventory_ledger`, `wip_ledger`, and `cost_ledger` now have command/idempotency lineage columns.
- Projection tables now reject direct writes unless `hesem.inventory_projection_writer=1`.
- `inventory_reconciliation_run` and `inventory_reconciliation_mismatch` provide close gate evidence.
- `inventory_period_close` records signed close evidence.
- `inventory_recall_trace_export` stores recall trace evidence.

## 10. Test Plan

- Lint all changed PHP.
- Run `/private/tmp/inventory_probe.php`.
- Validate proof pack JSON.
- Run `git diff --check`.
- Run composer test/analyse/check; record vendor blocker if still missing.

## 11. Operational Simulation Matrix

| scenario_id | command/action | expected_gate | data_written | expected_result |
|---|---|---|---|---|
| V4-SIM-054-001 | duplicate material issue scan | DomainCommandGateway idempotency + ledger unique index | one inventory ledger line per idempotency/role | no double ledger |
| V4-SIM-054-002 | direct stock balance update | projection trigger guard | none | blocked `ledger_only_projection` |
| V4-SIM-054-003 | issue held lot | canonical quality hold query | readiness hold evidence + audit | blocked `quality_hold_active` |
| V4-SIM-054-004 | issue expired lot without deviation | lot expiry gate | none | blocked `inventory_lot_expired` |
| V4-SIM-054-005 | split lot | UOM + ledger-only + genealogy | source/child ledger lines + genealogy edge | split recorded |
| V4-SIM-054-006 | complete operation to stock | UOM + WIP/inventory/cost path | inventory ledger, WIP ledger, cost ledger if amount provided | output recorded |
| V4-SIM-054-007 | ledger/projection mismatch | reconciliation close gate | run + mismatch evidence | period close blocked |
| V4-SIM-054-008 | recall lot | genealogy edge query | recall trace export evidence | trace packet exported |

## 12. Multi-role Adversarial Audit

- Inventory lead: PASS for ledger-only mutation and projection write guard.
- Quality lead: PASS for canonical hold before issue/move.
- UOM lead: PASS for direct UOM authority; no bridge introduced.
- Finance lead: PARTIAL because cost ledger writes only when cost context is provided.
- Traceability lead: PASS for split/merge/consume/produce/scrap/ship edge writer, controlled gap for full recursive trace runner.
- SRE lead: PARTIAL until migration is exercised on VPS and telemetry dashboards are wired in P58/P60.

## 13. Rollback / Restore / Recovery Plan

- Roll back code by reverting this commit on the isolated branch.
- Migration rollback requires dropping P54 trigger/function and runtime tables only after exporting reconciliation/close evidence.
- Projection guard can be disabled only by controlled session setting for projection refresh, not by Generic CRUD.

## 14. Telemetry / Control Tower Evidence

- Audit events use aggregate type `inventory_ledger_command`.
- Outbox events use schema `inventory_ledger_command.v1`.
- Reconciliation run/mismatch rows provide operator-facing close gate evidence.

## 15. Generated Artifacts

- `V4_INVENTORY_LEDGER_CLOSURE_REPORT.md`
- `V4_INVENTORY_LEDGER_PROOF_PACK.json`
- `V4_P54_GAP_LEDGER_UPDATE.csv`
- `V4_PROMPT_HANDOFF_P54.md`

## 16. Gap Ledger Update

See `V4_P54_GAP_LEDGER_UPDATE.csv`.

## 17. Decision Token

P54_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P55

## 18. Handoff Packet For Next Prompt

P55 must consume `InventoryCommandHandler` outputs and avoid writing inventory balance projections as truth. Shipment and runtime event paths must call canonical hold and ledger gates before mutation.
