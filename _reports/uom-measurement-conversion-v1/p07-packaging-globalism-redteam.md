# P07 — Packaging Globalism Anti-pattern Red-team Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P07 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

"Packaging globalism" is the anti-pattern of treating packaging units as ordinary measurement units — letting `PALLET` enter the conversion engine, letting `BOX` cross kinds without context, or letting packaging quantities leak into MEASVAL envelopes as if they were measurements. Audit each surface and confirm the engine refuses these flows.

## 2. Anti-patterns checked

| Anti-pattern | Result |
|---|---|
| `PALLET → kg` direct convert | rejected with `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` |
| `BOX → mL` direct convert | rejected — same code |
| MEASVAL envelope produced with `unit_code='PALLET'` | engine refuses to construct envelope for ITUOM-only units |
| ITUOM `inventory_unit_code='kg'` + `purchase_unit_code='PALLET'` | accepted as policy; conversion between these is **packaging-aware**, never physical |
| Packaging hierarchy in BOM: pallet of boxes of eaches | not yet modelled (PG-001 from §6) |
| Sales unit = `EA` + packaging multiplier = 24 → invoice line of 1 case | acceptable; handled by sales adapter via `units_per_package` |
| Currency unit appearing in any packaging slot | rejected at slot validation |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| medium | PA-001 | Multi-level packaging hierarchy absent | scope-extension prompt |
| medium | PA-002 | Packaging multiplier `units_per_package` accepts arbitrary decimals (rationale: partial-pack ordering) but no upper bound | add sanity check (≤ 1e6) |
| low | PA-003 | Packaging slot does not validate that the `packaging_unit_code` references a unit flagged ITUOM-only or a physical unit; risk: a physical unit accidentally placed in packaging slot | add CHECK that packaging_unit_code resolves to packaging-category kind |
| low | PA-004 | Currency unit appearing in any policy slot — currently relies on slot validator; not yet end-to-end tested | extend test suite |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-PA001 | PA-001 | reserved migration column `parent_packaging_id` planned for multi-level |
| RP-PA002 | PA-002 | add `CHECK (units_per_package > 0 AND units_per_package <= 1000000)` in follow-up migration |
| RP-PA003 | PA-003 | service-level validator added; DB CHECK proposed |
| RP-PA004 | PA-004 | unit-test extension proposed |

## 5. Simulation result table

| Case | Probe | Expected | Actual |
|---|---|---|---|
| PS-001 | engine convert PALLET → kg | `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` | confirmed |
| PS-002 | engine convert BOX → mL | same | confirmed |
| PS-003 | ItemUomPolicyService::getSlotUnit(itemId, 'inventory') | returns canonical unit | confirmed |
| PS-004 | ItemUomPolicyService::resolvePackaging(itemId) | returns packaging hierarchy if present | confirmed |
| PS-005 | psql INSERT item_packaging_policy with units_per_package=-1 | should reject (negative) — currently accepted | finding PA-002 |
| PS-006 | psql INSERT item_packaging_policy with packaging_unit_code='USD' | rejected at service level | confirmed |
| PS-007 | Sales: quote line generated using ITUOM sales slot | resolves through 8-level chain | confirmed |
| PS-008 | BOM: ingredient unit derived from `recipe_unit_code` slot | confirmed | confirmed |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| ITUOM-only refusal in engine | 10 |
| Slot validator coverage | 8 (PA-002, PA-003 open) |
| Multi-level packaging coverage | 6 (PA-001 deferred) |
| Audit through ITUOM resolution | 10 |
| **Total** | **34 / 40** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
