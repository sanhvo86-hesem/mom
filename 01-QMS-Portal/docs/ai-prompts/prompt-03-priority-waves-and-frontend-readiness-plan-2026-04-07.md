# Prompt 03 -- Priority Waves and Frontend Readiness Plan

> Generated: 2026-04-07
> Inputs: `frontend-foundation-catalog.json`, `endpoint-catalog.json`, `table-registry.json`,
> `domain-architecture.json`, implemented services in `api/services/`, smoke tests in `tests/`.

---

## Overview

The 528-table, 48-domain QMS Portal is built in three priority waves. Each wave
has strict prerequisites: an entity may only enter a wave when its dependencies
from prior waves are frontend-safe (verdict = READY, score >= 80, zero blockers).

```
P0  Foundation (frontend-safe NOW)       ---- 5 entities ready, ~15 more in wave
P1  Manufacturing Digital Thread         ---- ~25 core entities, depends on P0
P2  Extended Enterprise                  ---- ~30 entities, depends on P0 + P1
```

---

## 1. P0 Wave -- Frontend-Safe First

### 1.1 Objective

Deliver the foundational entities that every other domain depends on. These entities
have real backend services, real database schema (migration 072 + 079 hardening),
real API endpoints, real smoke tests, and passing readiness gates.

### 1.2 Already Ready (5 Entities)

These entities are fully implemented and have passed all readiness gates:

| # | Entity | Table | Service | Controller | Score | Verdict |
|---|---|---|---|---|---|---|
| 1 | Organization | `organizations` | `FoundationGovernanceService` | `MasterDataController` | 98 | READY |
| 2 | Party | `parties` | `FoundationGovernanceService` | `MasterDataController` | 96 | READY |
| 3 | Calendar | `calendars` | `FoundationGovernanceService` | `MasterDataController` | 94 | READY |
| 4 | Approval Group | `approval_groups` | `ApprovalGroupService` | `ApprovalGroupController` | 98 | READY |
| 5 | Attachment | `attachments` | `EvidenceVaultService` | `EvidenceController` | 92 | READY |

**What makes them ready:**
- Database schema deployed and hardened (migrations 072 + 079)
- Service layer with cursor pagination, ETag, optimistic concurrency
- OTel observability events on every action
- Workflow bridge (ApprovalWorkflowAdapter) validates FSM transitions
- Smoke test in `tests/foundation_governance_contract_smoke.php`
- Field definitions complete in `data-fields.json`
- Domain field packs assigned in `domain-field-packs.json`
- Endpoint catalog entries with full parameter definitions

### 1.3 P0 Remaining Entities

| # | Entity | Table | Est. Score | Blockers | Work Required |
|---|---|---|---|---|---|
| 6 | Site | `sites` | 60 | SERVICE_MISSING | Create SiteService, add endpoints to MasterDataController |
| 7 | Plant | `plants` | 58 | SERVICE_MISSING | Create PlantService, add plant hierarchy queries |
| 8 | Company Code | `company_codes` | 55 | SERVICE_MISSING | Create CompanyCodeService |
| 9 | Legal Entity | `legal_entities` | 55 | SERVICE_MISSING | Create LegalEntityService |
| 10 | UOM | `units_of_measure` | 65 | NO_SMOKE_TEST | Add smoke test, verify field pack completeness |
| 11 | Currency | `currencies` | 62 | NO_SMOKE_TEST | Add smoke test, verify enum coverage |
| 12 | Address | `addresses` | 58 | SERVICE_MISSING | Create AddressService with geocoding hooks |
| 13 | User | `users` | 70 | Partial permissions | Complete RBAC gate definitions |
| 14 | Role | `roles` | 68 | Partial permissions | Complete permission-to-role mapping |
| 15 | Permission | `permissions` | 65 | NO_SMOKE_TEST | Add smoke test for permission evaluation |
| 16 | Document | `documents` | 55 | SERVICE_MISSING for revision model | Implement revision lifecycle in DocumentService |
| 17 | Document Revision | `document_revisions` | 50 | Depends on Document | Implement after Document service |
| 18 | Lookup Table | `lookup_tables` | 72 | NO_SMOKE_TEST | Add smoke test |
| 19 | Lookup Value | `lookup_values` | 70 | NO_SMOKE_TEST | Add smoke test |
| 20 | Status Profile | `status_profiles` | 68 | NO_SMOKE_TEST | Add smoke test, validate against status-options.json |

### 1.4 P0 Frontend-Safe Criteria

An entity is P0-frontend-safe when ALL of the following are true:

- [ ] Database table exists with canonical PK (UUID), row_version, audit columns
- [ ] Service class implements list (cursor pagination), detail (ETag), create, update, soft-delete
- [ ] Endpoints registered in `endpoint-catalog.json` with full parameter definitions
- [ ] Field definitions complete in `data-fields.json` or `data-fields-part2.json`
- [ ] Domain field pack entry exists in `domain-field-packs.json` with section assignments
- [ ] Status set defined in `status-options.json` (if entity has status column)
- [ ] Workflow transitions defined in `workflow-library.json` (if entity has FSM)
- [ ] Smoke test exists and passes
- [ ] OTel events emitted for list, detail, create, update, delete
- [ ] Readiness score >= 80 in `frontend-foundation-catalog.json`
- [ ] Zero blockers

### 1.5 P0 Estimated Timeline

| Milestone | Entities | Estimated Effort |
|---|---|---|
| P0-A: Foundation 5 (done) | organization, party, calendar, approval_group, attachment | Complete |
| P0-B: Org hierarchy | site, plant, company_code, legal_entity, address | 3-4 days |
| P0-C: Identity and Auth | user, role, permission | 2-3 days |
| P0-D: Reference data | uom, currency, lookup_table, lookup_value, status_profile | 2 days |
| P0-E: Document control | document, document_revision | 3-4 days |

---

## 2. P1 Wave -- Manufacturing Digital Thread

### 2.1 Objective

Build the core manufacturing execution chain: from item/material master through
BOM/route engineering, into production orders, dispatch, WIP, and quality inspection.
This is the primary value chain for a discrete/process manufacturing QMS.

### 2.2 Dependencies on P0

P1 entities cannot begin frontend work until these P0 entities are READY:

| P1 Entity | Required P0 Entity | Relationship |
|---|---|---|
| Item / Material | Organization, UOM, Lookup | Item belongs to org, has UOM, uses lookups for type/class |
| BOM | Item, Organization | BOM header references item, owned by org |
| Route | Item, Organization | Route for item, operations in work centers |
| Work Center | Plant, Calendar | Work center in plant, uses calendar for capacity |
| Machine | Work Center, Plant | Machine assigned to work center |
| Production Order | Item, BOM, Route, Organization | Order to produce item using BOM + route |
| Work Order | Production Order | Child of production order |
| Dispatch | Work Order, Machine, Party | Dispatch work to machine, operator |
| Inspection Lot | Production Order, Item | Quality gate on production |
| Inspection Plan | Item, Characteristic | Plan defines what to inspect |

### 2.3 P1 Entity Roster

| # | Entity | Domain | Table | Est. Score | Key Blockers |
|---|---|---|---|---|---|
| 1 | Item / Material | inventory_management | `items` | 45 | SERVICE_MISSING, NO_SMOKE_TEST |
| 2 | Item Category | inventory_management | `item_categories` | 40 | SERVICE_MISSING |
| 3 | BOM Header | mfg_engineering | `boms` | 42 | SERVICE_MISSING, NO_SMOKE_TEST |
| 4 | BOM Line | mfg_engineering | `bom_lines` | 38 | Depends on BOM Header |
| 5 | Route Header | mfg_engineering | `routes` | 42 | SERVICE_MISSING |
| 6 | Route Operation | mfg_engineering | `route_operations` | 38 | Depends on Route, Work Center |
| 7 | Work Center | mes_execution | `work_centers` | 48 | SERVICE_MISSING, field pack incomplete |
| 8 | Machine | mes_execution | `machines` | 44 | SERVICE_MISSING |
| 9 | Machine State | mes_execution | `machine_states` | 40 | SERVICE_MISSING, telemetry integration |
| 10 | Production Order | mes_execution | `production_orders` | 45 | SERVICE_MISSING, NO_SMOKE_TEST |
| 11 | Work Order | mes_execution | `work_orders` | 42 | Depends on Production Order |
| 12 | Operation (exec) | mes_execution | `operations` | 40 | Depends on Work Order |
| 13 | Dispatch | mes_execution | `dispatches` | 48 | Partial endpoint, field pack incomplete |
| 14 | WIP Transaction | mes_execution | `wip_transactions` | 35 | Financial integration required |
| 15 | Labor Booking | mes_execution | `labor_bookings` | 38 | SERVICE_MISSING |
| 16 | Material Issue | mes_execution | `material_issues` | 38 | Depends on Item, lot traceability |
| 17 | Genealogy Record | mes_execution | `genealogy_records` | 35 | Complex graph model, SERVICE_MISSING |
| 18 | CNC Program | mes_execution | `cnc_programs` | 52 | Partial -- CncProgramController exists |
| 19 | Inspection Lot | quality_management | `inspection_lots` | 44 | SERVICE_MISSING, Part 11 requirements |
| 20 | Inspection Plan | quality_management | `inspection_plans` | 42 | SERVICE_MISSING |
| 21 | Characteristic | quality_management | `characteristics` | 50 | Partial endpoint exists |
| 22 | Sample | quality_management | `samples` | 38 | SERVICE_MISSING |
| 23 | Result Record | quality_management | `result_records` | 36 | Part 11 e-sig required, SERVICE_MISSING |
| 24 | Shift Schedule | mes_execution | `shift_schedules` | 45 | SERVICE_MISSING |
| 25 | Downtime Event | mes_execution | `downtime_events` | 42 | SERVICE_MISSING |

### 2.4 P1 Internal Dependencies (Build Order)

The P1 entities must be built in this specific order due to FK dependencies:

```
Tier 1 (no P1 internal deps):
  Item/Material, Item Category, Work Center, Machine, CNC Program, Shift Schedule

Tier 2 (depends on Tier 1):
  BOM Header (needs Item)
  Route Header (needs Item)
  Machine State (needs Machine)
  Inspection Plan (needs Item)
  Characteristic (standalone, but used by Inspection Plan)

Tier 3 (depends on Tier 2):
  BOM Line (needs BOM Header + Item)
  Route Operation (needs Route Header + Work Center)
  Production Order (needs Item + BOM + Route)
  Inspection Lot (needs Item, links to Production Order)

Tier 4 (depends on Tier 3):
  Work Order (needs Production Order)
  Dispatch (needs Work Order + Machine)
  Sample (needs Inspection Lot)

Tier 5 (depends on Tier 4):
  Operation (needs Work Order)
  Labor Booking (needs Operation)
  Material Issue (needs Operation + Item)
  Result Record (needs Sample + Characteristic)
  WIP Transaction (needs Operation)
  Downtime Event (needs Machine + Work Center)
  Genealogy Record (needs Production Order + Item + lot/serial)
```

### 2.5 P1 Frontend-Safe Criteria

Same as P0 criteria, plus:

- [ ] All P0 dependency entities are READY (score >= 80)
- [ ] FK lookups to P0 entities use the standard autocomplete pattern
- [ ] Part 11 audit trail integration for Tier 1 regulated entities
- [ ] E-signature dialog for workflow transitions that require it
- [ ] Manufacturing-specific OTel spans (production.order.release, dispatch.acknowledge, etc.)

### 2.6 P1 Estimated Timeline

| Milestone | Entities | Estimated Effort | P0 Prereq |
|---|---|---|---|
| P1-A: Material master | item, item_category | 4-5 days | P0-B (org hierarchy), P0-D (UOM, lookups) |
| P1-B: Engineering | bom, bom_line, route, route_operation | 5-6 days | P1-A |
| P1-C: Work centers | work_center, machine, machine_state, shift_schedule | 4-5 days | P0-B (plant) |
| P1-D: Execution | production_order, work_order, operation, dispatch | 6-8 days | P1-A, P1-B, P1-C |
| P1-E: Quality | inspection_lot, inspection_plan, characteristic, sample, result_record | 6-8 days | P1-A, P1-D |
| P1-F: Traceability | labor_booking, material_issue, wip_transaction, genealogy, downtime, cnc_program | 5-7 days | P1-D |

---

## 3. P2 Wave -- Extended Enterprise

### 3.1 Objective

Extend the platform to cover procurement, supplier quality, advanced scheduling,
maintenance, calibration, analytics, and AI-assisted features. These domains
build on the P0 foundation and P1 manufacturing thread.

### 3.2 Dependencies on P0 + P1

| P2 Domain | Required P0 | Required P1 |
|---|---|---|
| Procurement / Supplier | Organization, Party, Document | Item, BOM (for spec refs) |
| Advanced Scheduling | Calendar, Organization | Work Center, Machine, Production Order, Route |
| Maintenance / Calibration | Plant, Organization | Machine, Work Center, Inspection (for gauges) |
| Analytics / KPI | Organization, User, Role | Production Order, Inspection Lot, WIP (for metrics) |
| EHS | Organization, Party, Document | Machine (for incidents), Work Center (for permits) |
| Customer Returns | Organization, Party | Item, Sales Order, Inspection Lot |
| Commercial / Sales | Organization, Party | Item (for quoting) |

### 3.3 P2 Entity Roster

#### 3.3.1 Procurement and Supplier Quality (~12 entities)

| # | Entity | Table | Est. Score | Key Blockers |
|---|---|---|---|---|
| 1 | Supplier | `suppliers` | 40 | SERVICE_MISSING, qualification workflow |
| 2 | Supplier Evaluation | `supplier_evaluations` | 35 | SERVICE_MISSING, scorecard model |
| 3 | Purchase Order | `purchase_orders` | 38 | SERVICE_MISSING, 3-way match |
| 4 | PO Line | `po_lines` | 35 | Depends on PO + Item |
| 5 | Receiving Inspection | `receiving_inspections` | 36 | Part 11, depends on PO + Inspection |
| 6 | Supplier NCR | `supplier_ncrs` | 34 | Depends on Supplier + NCR pattern |
| 7 | Supplier Certificate | `supplier_certificates` | 38 | Expiry monitoring, document link |
| 8 | Approved Supplier List | `approved_supplier_list` | 40 | SERVICE_MISSING |
| 9 | Supplier Audit | `supplier_audits` | 32 | SERVICE_MISSING |
| 10 | Goods Receipt | `goods_receipts` | 36 | Depends on PO, inventory integration |
| 11 | RFQ | `rfqs` | 34 | SERVICE_MISSING |
| 12 | Vendor Scorecard | `vendor_scorecards` | 30 | Analytics integration |

#### 3.3.2 Advanced Scheduling (~6 entities)

| # | Entity | Table | Est. Score | Key Blockers |
|---|---|---|---|---|
| 1 | Demand Forecast | `demand_forecasts` | 38 | AI model integration |
| 2 | MRP Run | `mrp_runs` | 35 | Computation engine required |
| 3 | Planned Order | `planned_orders` | 34 | Depends on MRP Run |
| 4 | Capacity Plan | `capacity_plans` | 32 | Simulation engine |
| 5 | APS Schedule | `aps_schedules` | 36 | AiSchedulingController partial |
| 6 | Scheduling Constraint | `scheduling_constraints` | 30 | SERVICE_MISSING |

#### 3.3.3 Maintenance and Calibration (~8 entities)

| # | Entity | Table | Est. Score | Key Blockers |
|---|---|---|---|---|
| 1 | PM Work Request | `pm_work_requests` | 38 | SERVICE_MISSING |
| 2 | PM Order | `pm_orders` | 36 | SERVICE_MISSING, PM workflow |
| 3 | Asset | `assets` | 42 | Partial, GenericCrudController |
| 4 | Failure Code | `failure_codes` | 45 | Lookup pattern, close to ready |
| 5 | Spare Part | `spare_parts` | 38 | Depends on Item |
| 6 | Gauge / Instrument | `gauges` | 40 | SERVICE_MISSING |
| 7 | Calibration Event | `calibration_events` | 36 | Part 11, certificate generation |
| 8 | Preventive Schedule | `pm_schedules` | 34 | Calendar integration |

#### 3.3.4 Analytics, KPI, and AI Assistive (~6 entities)

| # | Entity | Table | Est. Score | Key Blockers |
|---|---|---|---|---|
| 1 | KPI Definition | `kpi_definitions` | 42 | DashboardController partial |
| 2 | Dashboard | `dashboards` | 40 | DashboardController partial |
| 3 | ETL Job | `etl_jobs` | 30 | Background job infrastructure |
| 4 | Report Template | `report_templates` | 35 | ComplianceReportController partial |
| 5 | AI Recommendation | `ai_recommendations` | 25 | ML model integration |
| 6 | Anomaly Alert | `anomaly_alerts` | 28 | IoT + ML pipeline |

#### 3.3.5 Other P2 Domains

| Domain | Key Entities | Est. Score Range | Notes |
|---|---|---|---|
| EHS / Sustainability | Incident, Risk Assessment, Permit, Waste, Emission | 30-38 | Regulatory filing integration |
| Commercial / Sales | Quote, Sales Order, Customer, Contract, Pricing | 35-42 | QuoteController exists partial |
| Customer Returns | RMA, Return Line, Credit Memo | 30-36 | SERVICE_MISSING |
| Logistics | Shipment, Carrier, ASN, Packing List | 32-38 | LogisticsController exists partial |
| Field Service | Service Order, Technician, Service Report | 28-34 | MobileController exists partial |
| FMEA | FMEA Study, Failure Mode, Risk Priority | 34-40 | FmeaController exists |
| APQP | APQP Plan, Phase Gate, PPAP Element | 32-38 | ApqpController exists |
| Knowledge Base | Article, Category, FAQ | 36-42 | KnowledgeController exists |
| Product Passport | DPP, Material Composition | 30-35 | ProductPassportController partial |

### 3.4 P2 Frontend-Safe Criteria

Same as P1 criteria, plus:

- [ ] All P0 AND P1 dependency entities are READY
- [ ] Cross-domain queries go through service APIs (never cross-boundary DB access)
- [ ] Analytics entities have defined refresh cadence and staleness rules
- [ ] AI-assistive features clearly marked as "AI-suggested" in UI (no auto-decision)
- [ ] Regulatory entities (EHS, compliance) have jurisdictional metadata

### 3.5 P2 Estimated Timeline

| Milestone | Entities | Estimated Effort | Prereqs |
|---|---|---|---|
| P2-A: Supplier core | supplier, supplier_eval, approved_list | 5-6 days | P0 + P1-A (item) |
| P2-B: Procurement | PO, PO line, receiving inspection, goods receipt | 6-8 days | P2-A |
| P2-C: Maintenance | PM request, PM order, asset, failure code, spare part | 5-6 days | P1-C (work center, machine) |
| P2-D: Calibration | gauge, calibration_event, pm_schedule | 4-5 days | P2-C |
| P2-E: Scheduling | demand forecast, MRP, planned order, APS | 6-8 days | P1-D (production order) |
| P2-F: Sales | quote, sales order, customer, contract | 5-7 days | P0 + P1-A |
| P2-G: Quality ext | CAPA, NCR (full), supplier NCR | 5-6 days | P1-E (inspection) |
| P2-H: Analytics | KPI, dashboard, report template | 4-5 days | P0 + P1 (data available) |
| P2-I: EHS | incident, risk, permit, waste, emission | 5-7 days | P0 + P1-C |
| P2-J: Remaining | logistics, field service, FMEA, APQP, knowledge, DPP, returns | 8-12 days | P0 + P1 |

---

## 4. Per-Wave Summary

### 4.1 Table Counts by Wave

| Wave | Entities | Approx Tables | % of Total 528 |
|---|---|---|---|
| P0 | 20 | ~35 (including child/support tables) | 6.6% |
| P1 | 25 | ~80 (MES alone is 49) | 15.2% |
| P2 | 30+ | ~413 (remaining domains) | 78.2% |

### 4.2 Readiness Progression Target

| Milestone | Date Target | Entities READY | Cumulative |
|---|---|---|---|
| P0-A (done) | 2026-04-07 | 5 | 5 |
| P0-B + P0-C | 2026-04-14 | 9 | 14 |
| P0-D + P0-E | 2026-04-21 | 7 | 21 |
| P1-A + P1-C | 2026-05-05 | 8 | 29 |
| P1-B + P1-D | 2026-05-19 | 10 | 39 |
| P1-E + P1-F | 2026-06-02 | 12 | 51 |
| P2-A through P2-D | 2026-06-30 | 16 | 67 |
| P2-E through P2-J | 2026-07-31 | 25+ | 92+ |

---

## 5. Recommended Frontend Slice Order

This is the exact order in which frontend screens should be built, optimized for
maximum value delivery and minimum dependency risk.

### Slice 1: Foundation Governance UI (build NOW)

Build frontend for the 5 READY entities immediately:

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 1.1 | Organization | List + Detail + Form | Every other entity references org; admin setup first |
| 1.2 | Party | List + Detail + Form | Users, suppliers, customers all extend party |
| 1.3 | Calendar | List + Detail + Form | Required before work centers and scheduling |
| 1.4 | Approval Group | List + Detail + Form + Commands | Workflow approvals are cross-cutting concern |
| 1.5 | Attachment | Upload + List + Verify | Evidence vault used by all entities |

**Estimated frontend effort:** 5-7 days for all 5 entities (screens are registry-driven, so generation is mostly automated by module builder).

### Slice 2: Identity and Reference Data UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 2.1 | User | List + Detail + Form | Admin must manage users before any other flow |
| 2.2 | Role | List + Detail + Assignment | Permission management |
| 2.3 | Lookup Table + Value | List + Detail + Inline Edit | Reference data used everywhere |
| 2.4 | UOM | List + Detail | Required before item master |
| 2.5 | Currency | List + Detail | Required before pricing |

**Prereq:** P0-C and P0-D backend work complete.

### Slice 3: Org Hierarchy and Document Control UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 3.1 | Site | List + Detail + Tree View | Org hierarchy visualization |
| 3.2 | Plant | List + Detail + Tree View | Plant within site |
| 3.3 | Document | List + Detail + Revision Timeline | Document control is regulatory requirement |
| 3.4 | Document Revision | Detail + Approval Workflow | Linked from document detail |
| 3.5 | Address | Inline on Org/Party detail | Not a standalone screen |

**Prereq:** P0-B and P0-E backend work complete.

### Slice 4: Material Master and Engineering UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 4.1 | Item / Material | List + Detail + Form | Core manufacturing entity |
| 4.2 | Item Category | List + Inline Edit | Reference data for items |
| 4.3 | BOM Header + Lines | List + Detail + Tree View | Bill of materials is critical |
| 4.4 | Route Header + Operations | List + Detail + Sequence View | Manufacturing route |
| 4.5 | Characteristic | List + Detail + Form | Quality characteristics for inspection |

**Prereq:** Slice 2 (UOM, lookups) + P1-A and P1-B backend.

### Slice 5: Shop Floor Execution UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 5.1 | Work Center | List + Detail + Capacity View | Foundation for dispatch |
| 5.2 | Machine | List + Detail + State Dashboard | Real-time machine view |
| 5.3 | Production Order | List + Detail + Workflow + Timeline | Core execution entity |
| 5.4 | Dispatch | Queue View + Acknowledge Action | Operator-facing screen |
| 5.5 | CNC Program | List + Detail + Version History | Program management for CNC ops |

**Prereq:** Slice 4 (item, BOM, route) + P1-C and P1-D backend.

### Slice 6: Quality Execution UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 6.1 | Inspection Plan | List + Detail + Characteristic Assignment | Define what to inspect |
| 6.2 | Inspection Lot | List + Detail + Workflow + Timeline | Triggered from production |
| 6.3 | Sample | List + Detail (within lot context) | Linked to inspection lot |
| 6.4 | Result Record | Data Entry Form + E-Signature | Part 11 regulated |
| 6.5 | Nonconformance | List + Detail + CAPA Link | Quality containment |

**Prereq:** Slice 5 (production order) + P1-E backend.

### Slice 7: Supply Chain UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 7.1 | Supplier | List + Detail + Scorecard | Vendor management |
| 7.2 | Purchase Order | List + Detail + Workflow | Procurement flow |
| 7.3 | Receiving Inspection | Detail + Accept/Reject + Link to Supplier | Quality gate |
| 7.4 | Quote / Sales Order | List + Detail + Workflow | Revenue chain |

**Prereq:** Slice 4 (item) + P2-A and P2-B backend.

### Slice 8: Maintenance and Analytics UI

| Order | Entity | Screen Priority | Rationale |
|---|---|---|---|
| 8.1 | Asset | List + Detail + Maintenance History | Asset register |
| 8.2 | PM Order | List + Detail + Workflow | Maintenance execution |
| 8.3 | Gauge / Calibration | List + Detail + Certificate | Instrument management |
| 8.4 | KPI Dashboard | Dashboard Layout + Drill-down | Executive visibility |
| 8.5 | Report Template | List + Generate + Export | Compliance reporting |

**Prereq:** Slice 5 (machine, work center) + P2-C, P2-D, P2-H backend.

---

## 6. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| P0 entities take longer than estimated | Delays entire P1 wave | Parallelize P0-B and P0-C; they have no mutual dependency |
| Part 11 compliance for P1 quality entities | Extended review cycles | Start compliance documentation during P1-A/B while not yet needed |
| Machine telemetry integration complexity | Machine State entity stuck in BLOCKED | Implement with mock telemetry first; real integration in P2 |
| GenericCrudController entities need migration to dedicated services | Scattered ownership | Prioritize high-dependency entities first (Asset, Failure Code) |
| Field pack completeness for 528 tables | Majority of P2 entities have incomplete packs | Batch-generate packs from table-registry.json; review domain-by-domain |
| AI/ML entities (recommendations, anomalies) have no model infrastructure | Permanently blocked | Defer to P2-J; build analytics dashboard without ML first |

---

## 7. Success Metrics

| Metric | P0 Target | P1 Target | P2 Target |
|---|---|---|---|
| Entities with verdict READY | 20 | 45 | 75+ |
| Average readiness score | >= 90 | >= 85 | >= 80 |
| Smoke test coverage | 100% of P0 | 100% of P1 | 90% of P2 |
| OTel event coverage | 100% | 100% | 95% |
| Zero blockers | All P0 | All P1 | All P2 critical path |
| Frontend screens deployed | 15 | 40 | 70+ |
| API endpoint coverage | 100% of P0 entities | 100% of P1 entities | 95% of P2 entities |
