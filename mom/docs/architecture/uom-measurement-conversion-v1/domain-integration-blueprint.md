# P08 — ERP / MOM / MES / EQMS Domain Integration Blueprint

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P08 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Map every HESEM domain that consumes UoM and specify the exact integration surface — service to call, data shape exchanged, audit thread written.

## 2. Domain × root × surface integration matrix

| Domain | Module / service | Read | Write | UoM surface used |
|---|---|---|---|---|
| Master Data | `MasterDataService` | Item kinds | Item kinds | n/a (UoM is its own domain) |
| Inventory | `InventoryService` (existing) | `inventory_unit_code` slot | stock balances | `ItemUomPolicyService::getSlotUnit(item, 'inventory', ctx)` |
| Procurement | `ProcurementService` | `purchase_unit_code` slot | PO lines | `getSlotUnit(item, 'purchase', ctx)` |
| Sales / Commercial | `SalesService`, `QuoteService` | `sales_unit_code` slot | SO / quote lines | `getSlotUnit(item, 'sales', ctx)` |
| BOM (Engineering) | `BomService` (existing) | `recipe_unit_code` slot | BOM rows | `getSlotUnit(parent, 'recipe', ctx)` |
| Planning | `PlanningService` | inventory + recipe slots | production plan | composes inventory + recipe units |
| MES Execution | `MesService`, `MesInlineMeasurement*` | OPC UA / streaming + canonical | `mes_inline_measurements` + MEASVAL | `QualityMeasurementBridge::wrapInlineMeasurement` |
| Quality (EQMS) | `QualityService`, `InspectionService` | inspection plan unit | `inspection_results` + MEASVAL | `wrapInspectionResult` |
| Traceability | `TraceabilityService` | `uom_measurement_thread` | n/a (read-only) | thread query |
| Maintenance / EHS | `MaintenanceService` | sensor readings (future) | maintenance records (future) | reserved |
| Finance | `FinanceService` | currency (separate engine) | n/a | UoM blocks currency |
| Analytics | `AnalyticsService` | rolled-up KPIs | n/a | reads display + canonical from MEASVAL |
| Core Infrastructure | `Connection`, `CacheService`, `EventBus` | engine + cache | n/a | infrastructure |

## 3. Event catalog (subscribed to from `EventBus`)

| Event | Producer | Subscribers | Effect |
|---|---|---|---|
| `uom.rule.activated` | UomWorkflowService | ConversionRuleService cache, scanner dashboard | bust Redis rule cache; refresh scanner |
| `uom.unit.lifecycle_changed` | UomWorkflowService | scanner | re-run orphan check |
| `uom.alias.activated` | UomWorkflowService | UomAliasResolutionService cache | bust alias cache for that scope |
| `uom.alias.quarantined` | UomAliasResolutionService | scanner | bump quarantine count |
| `uom.measurement.recorded` | QualityMeasurementBridge | (future) SPC analytics | analytics fan-out |
| `uom.measval.tamper_detected` | bridge re-verify | scanner + admin notification | surface in admin dashboard |
| `uom.policy.changed` | ITUOM admin path | cache + scanner | bust ITUOM cache |

## 4. Data shapes exchanged

| Producer | Consumer | Payload |
|---|---|---|
| `getSlotUnit` | Inventory / Procurement / Sales / BOM | `{ canonical_code, match_level, policy_id }` |
| `wrapInspectionResult` | QC | `{ inspection_result_id, measval_envelope, thread_id }` |
| `ConversionEngine::convert` | UI / form host / bridge | full MEASVAL envelope |
| `UomAliasResolutionService::resolve` | OT / EDI / LIMS adapters | `{ canonical_code, scope_matched }` |
| `UomDataQualityScanner::fullScan` | admin dashboard | `{ overall_status, findings: {...}, totals: {...} }` |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| DI-001 | Per-domain wiring uses the lightweight resolver / bridge surface, not the full engine | scope envelope |
| DI-002 | EventBus is read-and-cache invalidation only; never a mutation channel | UD-013 |
| DI-003 | Finance currency conversion is an entirely separate engine; UoM domain never converts USD↔VND | UD-007 |
| DI-004 | MES / EQMS write-through is opt-in (bridge call after insert), not automatic on insert | additive evolution |
| DI-005 | Domain consumers must persist `match_level` from ITUOM resolution for audit | DI-004 |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | DG-001 | Consumer wiring (5 modules) deferred per-PR | per-module follow-up |
| medium | DG-002 | EventBus subscriber for `uom.measval.tamper_detected` not yet wired to admin notification | follow-up |
| low | DG-003 | Maintenance domain reserved but no integration plan yet | future scope |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Domain coverage | 9 |
| Event catalog clarity | 9 |
| Data-shape discipline | 10 |
| Currency separation | 10 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/uom-digital-thread-map.md` (P08 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p08-domain-regression-surface.md` (P08 / 3)
