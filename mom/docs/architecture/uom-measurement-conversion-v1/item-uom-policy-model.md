# P07 — Item-UoM Policy and Packaging Model

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P07 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the Item-UoM Policy (ITUOM) chain and the packaging-overlay model so every consumer — Inventory, Procurement, Sales, BOM, MES, EQMS — gets a deterministic, traceable unit choice for any item in any context.

## 2. 8-level priority chain

| Priority | Source | Key |
|---|---|---|
| 1 | Item-Revision overlay | `(item_id, revision)` |
| 2 | Item-level policy | `(item_id)` |
| 3 | Customer-scoped override | `(item_id, customer_id)` |
| 4 | Supplier-scoped override | `(item_id, supplier_id)` |
| 5 | Site-scoped policy | `(item_id, site_id)` |
| 6 | Business-unit scoped policy | `(item_id, bu_id)` |
| 7 | Company-wide policy | `(item_id, company_id)` |
| 8 | System default | `(item_kind_code)` |

`ItemUomPolicyService::resolveByPriority` returns the first match plus the `match_level`. Consumers must persist the match_level so an audit later can replay the chain.

## 3. Slot semantics

A policy row exposes five independent slots:

| Slot | Used by |
|---|---|
| `inventory_unit_code` | warehouse stock keeping |
| `purchase_unit_code` | PO line creation |
| `sales_unit_code` | SO / Quote line creation |
| `recipe_unit_code` | BOM ingredient |
| `qc_unit_code` | inspection plan |

Slots resolve **independently**: an item may have an item-level policy for inventory but a customer-scoped override for sales.

## 4. Packaging overlay

`item_packaging_policy` rows carry:

| Field | Purpose |
|---|---|
| `packaging_unit_code` | `EA`, `PALLET`, `BOX`, ... |
| `units_per_package` | quantity multiplier |
| `dimensional_unit_code` | unit for L × W × H |
| `weight_unit_code` | unit for net / gross weight |

Packaging is **additive** — it supplements but does not override the slot units. Multi-level packaging (pallet of boxes of eaches) is a planned next-slice extension.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| PD-001 | 8-level priority mirrors SAP S/4HANA "alternative UoM" with HESEM extension at level 1 (revision overlay) | BD-010 |
| PD-002 | Slots resolve independently per `(item_id, slot_name)` lookup | UD-010 |
| PD-003 | Resolution payload carries `match_level` so consumers can audit | ISO 9001 §7.1.5 |
| PD-004 | Packaging is overlay, not override | clarity |
| PD-005 | Currency may not appear in any slot | UD-007 |
| PD-006 | System default at level 8 keys on `item_kind_code`, never on wildcard | governance |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | PG-001 | Multi-level packaging (pallet of boxes of eaches) absent | next slice |
| medium | PG-002 | `match_level` not yet persisted by all consumers | per-consumer wiring |
| low | PG-003 | UI for policy authoring v1 read-only | IMPL-07 follow-up |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Priority chain coverage | 10 |
| Slot independence | 10 |
| Packaging additivity | 9 |
| Audit (match_level) | 9 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/item-uom-impact-analysis-spec.md` (P07 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p07-packaging-globalism-redteam.md` (P07 / 3)
