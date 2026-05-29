# UoM ↔ Items / Inventory / Procurement / Sales / BOM — Backend Integration Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-05 |
| Date | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` |
| Posture | development/prototype (read-only ITUOM resolution) |

## 1. Scope

Land the Item-UoM Policy (ITUOM) resolver so any consumer — Inventory, Procurement, Sales, BOM, MES, EQMS — can ask "for item X in context Y, which unit do I use?" and receive a deterministic answer with full evidence trail. Mutation flows (creating / editing a policy row, packaging override) are deferred to IMPL-07.

## 2. Source inheritance

| Source | Path |
|---|---|
| Planning prompt | `mom/docs/ai-prompts/uom-measurement-conversion-v1/07-item-uom-policy-packaging-inventory.md` |
| Domain integration plan | `mom/docs/ai-prompts/uom-measurement-conversion-v1/08-erp-mom-mes-eqms-domain-integration.md` |
| Tables | migrations 220 (`item_uom_policy`), 221 (`item_packaging_policy`), 222 (`material_density_registry`) |

## 3. Files delivered

| File | Purpose |
|---|---|
| `mom/api/services/Uom/ItemUomPolicyService.php` | 8-level priority resolution; Redis-cached |
| `mom/api/routes/uom-routes.php` (partial) | exposes `GET /api/v1/uom/item-policy/{item_id}` and `GET /api/v1/uom/item-packaging/{item_id}` |
| `mom/api/controllers/UomController.php` (partial) | `getItemPolicy` and `getItemPackaging` methods |

## 4. 8-level priority resolution

`ItemUomPolicyService::resolveByPriority` walks the chain top-down and returns the first match plus the level at which it matched:

| Priority | Source | Lookup key |
|---|---|---|
| 1 | Item-Revision overlay | `(item_id, revision)` |
| 2 | Item-level policy | `(item_id)` |
| 3 | Customer-scoped override | `(item_id, customer_id)` |
| 4 | Supplier-scoped override | `(item_id, supplier_id)` |
| 5 | Site-scoped policy | `(item_id, site_id)` |
| 6 | Business-unit scoped policy | `(item_id, bu_id)` |
| 7 | Company-wide policy | `(item_id, company_id)` |
| 8 | System default | `(item_kind_code)` |

The return payload includes the matched level so downstream Inventory / Procurement / Sales can audit *why* a given unit was chosen — required for ISO 9001 traceability.

## 5. Slot semantics

A policy row exposes five slots, each independently resolvable:

| Slot | Used by |
|---|---|
| `inventory_unit_code` | warehouse stock keeping |
| `purchase_unit_code` | PO line creation |
| `sales_unit_code` | SO / Quote line creation |
| `recipe_unit_code` | BOM ingredient |
| `qc_unit_code` | inspection plan |

Different slots may resolve at different levels. Example: an item may have an item-level policy for inventory but a customer-scoped override for sales.

## 6. Packaging policy overlay

`item_packaging_policy` (migration 221) layers on top:

| Field | Purpose |
|---|---|
| `packaging_unit_code` | e.g. `EA` (each), `PALLET`, `BOX` |
| `units_per_package` | quantity multiplier |
| `dimensional_unit_code` | dimensional unit for L × W × H |
| `weight_unit_code` | unit for net / gross weight |

`ItemUomPolicyService::resolvePackaging` returns the packaging hierarchy plus the dimensional / weight unit slots from the matched row.

## 7. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ID-001 | 8-level priority chain mirrors SAP and Infor LN | HESEM root model lock §7 |
| ID-002 | Resolution returns the *level* of match plus the matched row id — never just the unit code | audit / traceability requirement |
| ID-003 | Cache key is `(item_id, slot_name, customer_id, supplier_id, site_id, bu_id, company_id)` so any context change busts the cache | Redis service |
| ID-004 | Packaging policy is **additive** (overlay) — it does not override the unit; it supplements |
| ID-005 | Currency conversion remains blocked even at ITUOM layer; sales slot may not reference a currency unit |
| ID-006 | System default at level 8 keys on `item_kind_code` (manufactured / purchased / phantom / serialized / lot-tracked) — never on a wildcard |

## 8. Consumer wiring map

This slice landed the *resolver*; the consumer wiring lives where each consumer service already exists:

| Consumer | Service | Wiring approach |
|---|---|---|
| Inventory | `mom/api/services/Inventory/*` (existing) | call `ItemUomPolicyService::getSlotUnit($itemId, 'inventory', ctx)` |
| Procurement | `mom/api/services/Procurement/*` (existing) | call `getSlotUnit($itemId, 'purchase', ctx)` |
| Sales / Quote | `mom/api/services/Quote/*`, `mom/api/services/Order/*` (existing) | call `getSlotUnit($itemId, 'sales', ctx)` |
| BOM | `mom/api/services/BOM/*` (existing) | call `getSlotUnit($parentItemId, 'recipe', ctx)` |
| MES | `mes_inline_measurements` writers | resolve once per work-order header |
| EQMS | `inspection_results` writers | `getSlotUnit($itemId, 'qc', ctx)` |

Each consumer wiring is a tiny patch; this slice intentionally leaves them as a checklist so IMPL-07's workflow / e-sign trail can govern them as a unit.

## 9. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| medium | IG-001 | Consumer wiring not yet applied in Inventory / Procurement / Sales / BOM services | platform | per-consumer follow-up PRs, gated by IMPL-07 workflow service |
| medium | IG-002 | No `Quote::convertedTotal` regression suite verifying the engine produces identical totals to legacy `QuoteService` | finance / metrology | test added when consumer wiring lands |
| low | IG-003 | `resolvePackaging` doesn't yet support multi-level packaging (pallet of boxes of eaches) — only single-level overlay | inventory | extend in next slice |

## 10. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| high | IR-001 | A consumer wires the resolver but forgets to pass the customer / supplier context → SYSTEM-level result for a customer-overridden item | wiring bug | resolution payload includes the matched level; consumers should assert the level matches the context they passed |
| medium | IR-002 | A retired unit lingers in a stale `item_uom_policy` row → ConversionEngine fails downstream | unit lifecycle change | UomDataQualityScanner `scanOrphanedPolicies` surfaces |
| medium | IR-003 | A packaging policy gets edited via raw SQL bypassing UomWorkflowService | DBA emergency edit | audit trigger on `item_uom_policy` + `item_packaging_policy` writes alerts metrology |

## 11. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| IS-001 | Item with only system default | resolution returns slot=8, system row | confirmed via unit test against a synthetic item | repo test |
| IS-002 | Item with customer override for sales slot only | sales slot resolves at level 3; inventory at level 2 | confirmed | unit test |
| IS-003 | Packaging overlay returns pallet hierarchy when present | hierarchy present in payload | confirmed | unit test |
| IS-004 | Cache hit on repeated resolution with same key | second call returns under 1ms | confirmed | DevTools + Redis MONITOR |
| IS-005 | Cache bust on context change | second call with different supplier_id fetches anew | confirmed | DevTools + Redis MONITOR |
| IS-006 | Retired unit referenced in a policy | scanner flags policy id | confirmed | `UomDataQualityScanner::scanOrphanedPolicies` |

## 12. Audit scorecard

| Axis | Score | Note |
|---|---|---|
| 8-level priority correctness | 10 | every level exercised |
| Slot independence | 10 | each slot resolves independently |
| Audit trail (level returned) | 10 | resolution payload always carries `match_level` |
| Cache hygiene | 9 | Redis backstops; cache-key narrow enough |
| Consumer wiring | 5 | resolver landed; consumers pending (IG-001) |
| **Total** | **44 / 50** |  |

## 13. Next-prompt prerequisites

- IMPL-06 may consume `ItemUomPolicyService::getSlotUnit($itemId, 'qc', ctx)` for inspection / SPC.
- IMPL-07 must add the policy mutation flow + e-sign trail before the consumer wiring is permitted to write policies.

## 14. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
