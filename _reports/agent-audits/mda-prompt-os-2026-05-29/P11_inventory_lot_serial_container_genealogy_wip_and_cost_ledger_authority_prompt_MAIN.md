# P11 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P11-CLAIM-001 | inventory authority must be ledger-derived, not direct balance mutation. | REPO_EVIDENCE | `mom/contracts/objects/inventory_logistics--inventory-movements/contract.json`; `mom/contracts/objects/inventory_logistics--stock-balances/contract.json`; `mom/database/migrations/077_canonical_inventory_cost_traceability.sql` | High | silent quantity corruption | keep balance as projection only | verified |
| P11-CLAIM-002 | genealogy and traceability already have canonical direction in repo schema. | REPO_EVIDENCE | `mom/contracts/objects/traceability_serialization--lot-genealogy/contract.json`; `mom/database/migrations/121_genealogy_runtime_ontology_constraints.sql`; `mom/database/migrations/130_genealogy_scope_identity_and_5m_gate.sql` | High | recall chain incomplete | anchor recall model to current ontology | verified |
| P11-CLAIM-003 | finance/inventory value hooks exist and must stay period-governed. | REPO_EVIDENCE | `mom/database/migrations/088_canonical_finance_inventory_valuations.sql`; `docs/backend/DOMAIN_COMMAND_SPEC.md` | High | inventory value drift and backdate abuse | bind cost hooks to ledger events and period policy | verified |
| P11-CLAIM-004 | ISA-95 continues to justify L3-L4 material and production history interfaces. | CURRENT_OFFICIAL_REFERENCE | [ISA-95](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | High | execution and ERP data boundaries blur | keep transaction history and enterprise handoff separate | verified |
| P11-CLAIM-005 | MTConnect and OPC UA support event-context collection but are not mutation authority. | CURRENT_OFFICIAL_REFERENCE | [MTConnect](https://www.mtconnect.org/); [OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/) | High | OT events may be mistaken for direct business authority | keep adapters event-only and command-gated | verified |

## Authority decisions

1. `InventoryLedger` and `WipLedger` are the only mutation roots for stock and WIP quantity/value truth.
2. `InventoryBalanceSnapshot` and `LocationBalance` are projections rebuilt from ledger, never directly edited.
3. `Lot`, `Serial`, and `Container` are governed identity carriers; their availability derives from status plus hold plus ledger parity.
4. `GenealogyLink` must connect supplier receipt through execution through shipment and complaint without depending on mutable master joins.

## Repair pass applied in P11

1. Locked a canonical recall graph in `MDA_TRACEABILITY_RECALL_MODEL.md`.
2. Added explicit ledger invariants in `MDA_LEDGER_INVARIANT_TESTS.csv`.
3. Bound cost hooks to issue, completion, scrap, rework, and adjustment events.
4. Defined hold-aware FEFO, serial uniqueness, and container-child parity as non-negotiable reconciliation gates.

## Decision token

`P11_PASS_WITH_CONTROLLED_GAPS`
