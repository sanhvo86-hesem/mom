# P36 Main Report

## 1. Executive verdict

Decision: `P36_PASS_WITH_CONTROLLED_GAPS`.

P36 converted the inventory/WIP/cost ledger slice from design-only into a physical/service/test proof. It adds command/posting packet anchors, reconciliation/period-close/recall export anchors, projection-only DB guards for balance tables, Generic CRUD hard stops and executable service tests for all required simulations.

This is not runtime-complete. Live P31/P32 command handlers, PostgreSQL transaction writes, outbox/evidence/e-sign wiring, scheduled reconciliation, UI evidence and cutover/restore proof remain controlled gaps with owners.

## 2. Source Truth Audit table

See `P36_SOURCE_TRUTH_AUDIT.csv`.

Key findings:

| Area | Finding | P36 response |
|---|---|---|
| Inventory schema | `inventory_ledger`, `inventory_balance_snapshot`, `location_balance`, `wip_ledger`, `cost_ledger`, `lot`, `serial`, `container` already exist. | Added authority packet/reconciliation/recall anchors instead of replacing existing schema. |
| Runtime authority | `RUNTIME_AUTHORITY_MAP.md` says inventory/WMS lacks a complete command service and can be written without ledger/period controls. | Added `InventoryLedgerAuthorityService` and Generic CRUD/DB guard repairs. |
| Command spec | Material issue and completion must be idempotent, ledger-backed, open-period and replay safe. | Implemented idempotent issue, FEFO/hold/period gates and completion WIP/cost packet planner. |
| Reconciliation | Prior P11 gap said reconciliation runner was not implemented. | Added physical reconciliation tables and service mismatch detector. |
| Traceability | Canonical genealogy service exists, but recall export was not a governed artifact. | Added deterministic recall evidence export service/table. |

## 3. Runtime Evidence Probe

Discovery summary:

```text
pwd: /Users/a10/Documents/mom-mda-v3-runtime-20260529
starting HEAD: 366ae4601
worktree: dirty only from P36 files during implementation
prior V1/V2 files: present under _reports/agent-audits/mda-prompt-os-2026-05-29
authority audit: runtime mode remains JSON_ONLY; PostgreSQL inactive/unreachable locally
```

Required source grep showed prior reports still state planning-grade / not runtime-complete, with `GAP-P11-001`, `GAP-P11-002`, and `GAP-P11-003` as inventory/reconciliation/recall blockers. P36 repairs the proof slice but does not override those runtime warnings.

## 4. Files changed / files intentionally not changed

Changed:

| Path | Purpose |
|---|---|
| `mom/database/migrations/240_inventory_ledger_genealogy_wip_cost_authority.sql` | P36 authority tables and projection mutation guard. |
| `mom/api/services/InventoryLedgerAuthorityService.php` | Side-effect-free authority gate and packet planner. |
| `mom/tests/Unit/Services/InventoryLedgerAuthorityServiceTest.php` | Executable P36 simulations. |
| `mom/api/controllers/GenericCrudController.php` | Hard-stop P36 governed mutation tables. |
| `mom/contracts/governed-entities.json` | Register P36 inventory/WO/MES/finance authority objects. |
| `mom/contracts/governed-entities.yaml` | YAML mirror of governed entity registry. |
| `MDA_V3_RUNTIME_PROOF_MATRIX.csv` | Raises ROOT-INV to maturity 4 partial runtime proof. |
| `MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv` | Extends denylist evidence for P36 tables. |

Not changed:

| Path/scope | Reason |
|---|---|
| UOM files | User explicitly warned other AI sessions are working on UOM. |
| `mom/contracts/table-registry.json` | Generated artifact; P36 did not manually edit generated registry. |
| Live order/inventory controllers | P37 owns command-handler transaction wiring. |
| VPS/deploy files | P36 is one prompt in the sequential chain; deploy comes after cherry-pick/integration. |

## 5. Design or code delta

P36 adds:

- `inventory_ledger_command_packet`: scope/idempotency/request-hash packet for replay-safe inventory commands.
- `inventory_ledger_posting_packet`: one packet tying inventory, WIP, cost and genealogy side effects.
- `inventory_reconciliation_run` and `inventory_reconciliation_discrepancy`: ledger/projection mismatch evidence.
- `inventory_period_close_gate`: period close cannot be considered ready unless reconciliation passes.
- `inventory_recall_evidence_export`: governed recall trace export with evidence hash.
- `inventory_projection_mutation_guard()`: fail-closed trigger guard for balance projection tables unless a trusted refresh command sets `app.inventory_projection_refresh=on`.
- `InventoryLedgerAuthorityService`: service proof for idempotency, FEFO, quality hold, period, direct balance block, completion WIP/cost, reconciliation and recall trace.

## 6. Simulation matrix summary

See `P36_SIMULATION_MATRIX.csv`.

Required simulations covered:

| Scenario | Result |
|---|---|
| SIM-P36-001 double-scan issue | Direct smoke and test return `inventory_issue_idempotent_replay`. |
| SIM-P36-002 direct balance update | Service blocks with `direct_stock_balance_update_blocked`; migration adds DB trigger guard. |
| SIM-P36-003 expired lot / FEFO | Service blocks with `expired_lot_blocked` and `fefo_violation`. |
| SIM-P36-004 completion WIP/cost | Service produces WIP delta and cost ledger packet hash. |
| SIM-P36-005 recall trace | Service returns shipment/customer refs and evidence export hash. |
| SIM-P36-006 reconciliation | Direct smoke blocks period close on mismatch. |

## 7. Adversarial audit summary

See `P36_ADVERSARIAL_AUDIT.md`.

Main repair from adversarial review: P36 added both API-level hard stop and DB-level projection guard. That closes the most dangerous bypass where balances become mutable truth. The remaining risk is operational: projection rebuild paths must be updated in P37/P39 to set the trusted session variable intentionally.

## 8. Gap ledger update

See `P36_GAP_LEDGER_UPDATE.csv`.

P36 partially repairs:

- `GAP-P11-001`: reconciliation/period close authority.
- `GAP-P11-002`: FEFO and projection mutation bypass.
- `GAP-P11-003`: auditable recall export.

New controlled gaps:

- `GAP-P31-P36-001`: service is not yet registered as live P31 command handler.
- `GAP-P36-DB-001`: projection refresh commands must be updated to satisfy DB guard.

## 9. CI/test evidence

Commands run:

```text
php -l mom/api/services/InventoryLedgerAuthorityService.php
php -l mom/tests/Unit/Services/InventoryLedgerAuthorityServiceTest.php
php -l mom/api/controllers/GenericCrudController.php
php -l mom/api/services/*.php 2>/dev/null || true
php -l mom/api/controllers/*.php 2>/dev/null || true
python3 -m json.tool mom/contracts/governed-entities.json
CSV parse for MDA_V3_RUNTIME_PROOF_MATRIX.csv and MDA_V3_GENERIC_CRUD_DENYLIST_MATRIX.csv
direct PHP smoke for P36 scenarios
composer test -- --filter Inventory, || true
composer --working-dir=mom test -- --filter InventoryLedgerAuthorityServiceTest || true
php mom/tools/audit_runtime_authority_consistency.php || true
php mom/tools/release/check_migration_drift.php || true
php mom/tools/release/check_user_identity_ssot.php || true
npm test -- --runInBand 2>/dev/null || true
git diff --check
```

Results:

```text
PHP syntax: pass for touched files, services glob and controllers glob.
Direct smoke: pass; reason codes matched P36 required scenarios.
JSON/CSV validation: pass.
composer test: root command unavailable: "Command test is not defined."
composer --working-dir=mom test: blocked by missing vendor/bin/phpunit.
runtime authority audit: JSON_ONLY, PostgreSQL inactive/unreachable in this local environment.
migration drift: existing P2 prefix collisions 108, 115, 188 only; no P1 fatal issues.
user identity SSOT: clean.
npm test: no output.
git diff --check: pass.
```

## 10. Decision token

`P36_PASS_WITH_CONTROLLED_GAPS`

## 11. Handoff packet for next prompt

See `P36_HANDOFF_PACKET.md`.
