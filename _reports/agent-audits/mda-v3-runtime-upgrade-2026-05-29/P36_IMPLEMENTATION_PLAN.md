# P36 Implementation Plan

## Scope

Implement the smallest safe runtime-proof slice for inventory/WIP/cost authority without claiming production completeness.

Included:
- Add physical P36 authority anchors for inventory command packets, posting packets, reconciliation, period-close gate and recall evidence export.
- Guard balance tables as projections, not mutation authority.
- Add a side-effect-free service proving idempotent issue, FEFO, quality hold, period, direct balance mutation, WIP/cost completion, reconciliation and recall behavior.
- Extend governed entity registry and Generic CRUD hard stop for P36 tables.
- Convert required P36 simulations into executable service tests or direct smoke evidence.

Excluded:
- Live inventory command controller/handler registration in P31 gateway.
- Real PostgreSQL transaction writes, because local runtime remains `JSON_ONLY` and DB probe is not reachable.
- Generated `table-registry.json` regeneration, because P36 is an authority patch and generated registry should be refreshed by the generator/cutover workflow.
- UOM work, per concurrent-agent constraint.

## File-by-file delta

| Path | Delta |
|---|---|
| `mom/database/migrations/240_inventory_ledger_genealogy_wip_cost_authority.sql` | Adds command packet, posting packet, reconciliation, period-close and recall export tables; adds projection mutation trigger for `inventory_balance_snapshot`, `location_balance`, `stock_balances`. |
| `mom/api/services/InventoryLedgerAuthorityService.php` | Adds side-effect-free P36 authority gates and evidence packet builders. |
| `mom/tests/Unit/Services/InventoryLedgerAuthorityServiceTest.php` | Adds tests for double-scan replay, direct balance block, FEFO/expired lot block, completion WIP/cost, recall trace. |
| `mom/api/controllers/GenericCrudController.php` | Adds P36 tables and cost ledgers to domain-command-required table hard stop. |
| `mom/contracts/governed-entities.json` | Extends inventory, WO, MES and finance roots with P36 tables/service/commands. |
| `mom/contracts/governed-entities.yaml` | Mirrors governed entity registry changes. |
| `MDA_V3_RUNTIME_PROOF_MATRIX.csv` | Updates ROOT-INV to maturity 4 and records P36 proof for related roots. |
| `MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv` | Updates inventory denylist row for P36 tables. |

## Repair choices

1. Direct stock balance mutation is repaired at two layers: Generic CRUD hard stop and DB trigger guard. Projection refresh commands must explicitly set `app.inventory_projection_refresh=on`.
2. Double-scan issue is repaired in service proof through `(scope_key_hash, idempotency_key, request_hash_sha256)` replay semantics. Live handler must persist `inventory_ledger_command_packet`.
3. FEFO and expired lot risk is repaired in service proof. Live handler must provide locked lot availability rows.
4. Completion WIP/cost parity is repaired by a posting packet plan tying WIP and cost ledger entries to one command decision.
5. Reconciliation and period close are repaired by physical run/discrepancy/gate tables and service mismatch detection.
6. Recall export is repaired by a physical export table and service-generated evidence package hash.

## Remaining owner path

P37 must wire live command handlers to P31/P32 transaction/audit/outbox/evidence, and P39 must prove PostgreSQL cutover/restore/drift. Until then P36 remains `ledger_authority_gate_partial`.
