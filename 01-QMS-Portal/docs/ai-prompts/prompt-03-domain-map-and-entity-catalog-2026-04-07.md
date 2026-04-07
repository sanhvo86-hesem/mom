# Prompt 03 -- Domain Map and Entity Catalog

> Generated: 2026-04-07
> Source of truth: `qms-data/registry/table-registry.json` (528 tables, 48 domains),
> `relation-map.json` (2 440 FK edges), `domain-architecture.json`, `status-options.json`,
> `workflow-library.json`.

---

## 1. Canonical Entity Catalog

Every entity follows the HESEM canonical conventions:

| Convention | Rule |
|---|---|
| Primary key | `<entity_singular>_id  UUID DEFAULT gen_random_uuid()` |
| Row version | `row_version  INTEGER NOT NULL DEFAULT 1` -- optimistic-lock counter |
| Audit columns | `created_at / updated_at / created_by / updated_by` -- always present |
| Status field | Maps to a `status_set` in `status-options.json`; drives workflow FSM |
| Soft delete | `is_deleted BOOLEAN DEFAULT FALSE` on master entities |
| Multilingual | `_tl` suffix tables when label localization is required |
| JSONB payload | `metadata JSONB` for semi-structured extension; `payload_schema_version` tracks shape |

### 1.1 Foundation Governance (master_data_governance -- 18 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Organization | `organizations` | `organization_id` UUID | draft -> active -> suspended -> archived | Part 11 audit trail |
| Party | `parties` | `party_id` UUID | draft -> active -> inactive | Change log |
| Calendar | `calendars` | `calendar_id` UUID | draft -> published -> archived | Revision history |
| Approval Group | `approval_groups` | `approval_group_id` UUID | draft -> active -> suspended | Decision audit, e-sig |
| Attachment | `attachments` | `attachment_id` UUID | uploaded -> verified -> archived | Hash verification, vault |
| Site | `sites` | `site_id` UUID | draft -> active -> decommissioned | Audit trail |
| Plant | `plants` | `plant_id` UUID | draft -> active -> decommissioned | Audit trail |
| Company Code | `company_codes` | `company_code_id` UUID | draft -> active -> closed | Audit trail |
| Legal Entity | `legal_entities` | `legal_entity_id` UUID | draft -> active -> dissolved | Regulatory audit |
| UOM | `units_of_measure` | `uom_id` UUID | active -> deprecated | Change log |
| Currency | `currencies` | `currency_code` CHAR(3) | active -> suspended | Change log |
| Exchange Rate | `exchange_rates` | `exchange_rate_id` UUID | active -> expired | Temporal versioning |
| Status Profile | `status_profiles` | `status_profile_id` UUID | draft -> active | Change log |
| Numbering Scheme | `numbering_schemes` | `scheme_id` UUID | active -> deprecated | Audit trail |
| Custom Field Def | `custom_field_definitions` | `field_def_id` UUID | draft -> active -> retired | Schema audit |
| Lookup Table | `lookup_tables` | `lookup_table_id` UUID | active -> deprecated | Change log |
| Lookup Value | `lookup_values` | `lookup_value_id` UUID | active -> inactive | Change log |
| Address | `addresses` | `address_id` UUID | active -> archived | Change log |

### 1.2 MES Execution (mes_execution -- 49 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Production Order | `production_orders` | `production_order_id` UUID | planned -> released -> started -> completed -> closed | Full Part 11, e-sig at release |
| Work Order | `work_orders` | `work_order_id` UUID | planned -> released -> in_progress -> completed | Part 11 |
| Job | `jobs` | `job_id` UUID | created -> scheduled -> dispatched -> running -> complete | Execution trace |
| Operation | `operations` | `operation_id` UUID | pending -> in_progress -> complete -> rework | Step-level trace |
| Work Center | `work_centers` | `work_center_id` UUID | active -> inactive -> decommissioned | Change log |
| Machine | `machines` | `machine_id` UUID | active -> maintenance -> decommissioned | Telemetry audit |
| Machine State | `machine_states` | `machine_state_id` UUID | running -> idle -> alarm -> off | Real-time event log |
| Dispatch | `dispatches` | `dispatch_id` UUID | queued -> dispatched -> acknowledged -> completed | Operator trace |
| WIP Transaction | `wip_transactions` | `wip_txn_id` UUID | open -> posted -> reversed | Financial audit |
| Labor Booking | `labor_bookings` | `labor_booking_id` UUID | clocked_in -> clocked_out -> approved | Payroll audit |
| Material Issue | `material_issues` | `material_issue_id` UUID | requested -> issued -> consumed | Lot traceability |
| Genealogy Record | `genealogy_records` | `genealogy_id` UUID | active -> finalized | Traceability immutable |
| CNC Program | `cnc_programs` | `cnc_program_id` UUID | draft -> approved -> released -> obsolete | Version control, e-sig |
| Shift Schedule | `shift_schedules` | `shift_schedule_id` UUID | draft -> published | Change log |
| Downtime Event | `downtime_events` | `downtime_event_id` UUID | open -> acknowledged -> closed | OEE audit |

### 1.3 Quality Management (quality_management -- 22 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Inspection Lot | `inspection_lots` | `inspection_lot_id` UUID | created -> sampling -> in_inspection -> ud_pending -> closed | Full Part 11, e-sig |
| Inspection Plan | `inspection_plans` | `inspection_plan_id` UUID | draft -> approved -> active -> obsolete | Version control |
| Characteristic | `characteristics` | `characteristic_id` UUID | active -> deprecated | Change log |
| Sample | `samples` | `sample_id` UUID | collected -> tested -> dispositioned | CoA, Part 11 |
| Result Record | `result_records` | `result_record_id` UUID | open -> recorded -> reviewed -> approved | Part 11, e-sig |
| Nonconformance | `nonconformances` | `ncr_id` UUID | created -> investigation -> disposition -> closed | CAPA link, Part 11 |
| CAPA | `capas` | `capa_id` UUID | opened -> root_cause -> action_plan -> implemented -> verified -> closed | Full regulatory audit |
| Gauge / Instrument | `gauges` | `gauge_id` UUID | active -> calibration_due -> out_of_service | Calibration cert |
| Calibration Event | `calibration_events` | `calibration_event_id` UUID | scheduled -> in_progress -> passed -> failed | Certificate, Part 11 |

### 1.4 Supplier Relationship (supplier_relationship -- 19 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Supplier | `suppliers` | `supplier_id` UUID | prospect -> qualified -> approved -> suspended -> blocked | Qualification audit |
| Supplier Evaluation | `supplier_evaluations` | `evaluation_id` UUID | draft -> submitted -> approved | Scorecard history |
| Purchase Order | `purchase_orders` | `po_id` UUID | draft -> approved -> sent -> acknowledged -> received -> closed | Procurement audit |
| Receiving Inspection | `receiving_inspections` | `recv_insp_id` UUID | pending -> inspected -> accepted -> rejected | Part 11 |
| Supplier NCR | `supplier_ncrs` | `supplier_ncr_id` UUID | opened -> investigation -> resolved -> closed | CAPA link |
| Supplier Certificate | `supplier_certificates` | `supplier_cert_id` UUID | valid -> expiring -> expired -> renewed | Expiry monitoring |

### 1.5 EHS and Sustainability (ehs_sustainability -- 17 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Incident | `ehs_incidents` | `incident_id` UUID | reported -> investigation -> corrective_action -> closed | Regulatory filing |
| Risk Assessment | `risk_assessments` | `risk_assessment_id` UUID | draft -> reviewed -> approved -> active -> archived | Change log, e-sig |
| Permit to Work | `permits_to_work` | `permit_id` UUID | requested -> approved -> active -> closed | E-sig, Part 11 |
| Waste Record | `waste_records` | `waste_record_id` UUID | generated -> manifested -> disposed | Manifest audit |
| Emission Record | `emission_records` | `emission_id` UUID | measured -> reported -> verified | Regulatory proof |

### 1.6 Advanced Planning (advanced_planning -- 16 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Demand Forecast | `demand_forecasts` | `forecast_id` UUID | draft -> approved -> active -> expired | Approval audit |
| MRP Run | `mrp_runs` | `mrp_run_id` UUID | initiated -> running -> completed -> accepted | Computation log |
| Planned Order | `planned_orders` | `planned_order_id` UUID | generated -> firmed -> converted | Conversion trace |
| Capacity Plan | `capacity_plans` | `capacity_plan_id` UUID | draft -> simulated -> approved | Scenario audit |
| APS Schedule | `aps_schedules` | `schedule_id` UUID | draft -> published -> frozen -> archived | Version history |

### 1.7 Quality Lab (quality_lab -- 16 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Lab Request | `lab_requests` | `lab_request_id` UUID | submitted -> assigned -> in_testing -> completed | Chain of custody |
| Lab Test | `lab_tests` | `lab_test_id` UUID | pending -> in_progress -> completed -> reviewed | Part 11, e-sig |
| Test Method | `test_methods` | `test_method_id` UUID | draft -> validated -> active -> retired | Method validation |
| Certificate of Analysis | `certificates_of_analysis` | `coa_id` UUID | draft -> approved -> issued | E-sig, regulatory |
| Lab Equipment | `lab_equipment` | `lab_equipment_id` UUID | active -> maintenance -> decommissioned | Calibration link |

### 1.8 Commercial Contracts (commercial_contracts -- 15 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Contract | `contracts` | `contract_id` UUID | draft -> negotiation -> approved -> active -> expired -> terminated | E-sig, legal audit |
| Contract Line | `contract_lines` | `contract_line_id` UUID | draft -> active -> amended | Amendment history |
| Pricing Agreement | `pricing_agreements` | `pricing_agreement_id` UUID | draft -> effective -> expired | Change log |
| Terms Template | `terms_templates` | `template_id` UUID | draft -> approved -> active | Version control |

### 1.9 Sales (sales -- 15 tables)

| Entity | Canonical Table | PK | Lifecycle | Evidence |
|---|---|---|---|---|
| Sales Order | `sales_orders` | `so_id` UUID | draft -> confirmed -> in_production -> shipped -> invoiced -> closed | Financial audit |
| Quote | `quotes` | `quote_id` UUID | draft -> submitted -> won -> lost -> expired | Approval chain |
| Customer | `customers` | `customer_id` UUID | prospect -> active -> dormant -> blocked | Qualification audit |
| Delivery Note | `delivery_notes` | `delivery_note_id` UUID | created -> picked -> shipped -> delivered | Proof of delivery |

### 1.10 Additional Domains (summary)

| Domain | Table Count | Key Entities |
|---|---|---|
| outsource_execution | 15 | Outsource Order, Subcontract PO, Outsource WIP |
| plant_maintenance | 15 | Work Request, PM Order, Asset, Failure Code, Spare Part |
| bi_datawarehouse | 14 | Fact Table, Dimension, ETL Job, KPI Definition, Dashboard |
| mfg_engineering | 14 | BOM, Route, Engineering Change, Process Spec |
| tooling_lifecycle | 14 | Tool, Tool Group, Tool Maintenance, Tool Issue/Return |
| hcm_workforce | 14 | Employee, Skill Matrix, Training Record, Competency |
| finance | 13 | GL Account, Journal, AP/AR Invoice, Cost Center, Budget |
| logistics | 13 | Shipment, Carrier, Freight, Packing List, ASN |
| inventory_management | 12 | Item, Lot, Serial, Stock, Reservation, Cycle Count |
| document_management | 12 | Document, Revision, Distribution, Approval, Template |
| project_management | 11 | Project, Task, Milestone, Resource Allocation, Timesheet |
| iot_telemetry | 10 | Sensor, Reading, Alert, Device, Threshold |
| customer_returns | 9 | RMA, Return Line, Credit Memo, Replacement Order |
| cost_accounting | 8 | Cost Element, Activity Type, Cost Object, Variance |
| warranty_claims | 7 | Warranty, Claim, Resolution, Part Replacement |
| regulatory_compliance | 7 | Regulation, Obligation, Evidence, Audit Finding |
| field_service | 6 | Service Order, Technician, Service Report |
| fmea | 6 | FMEA Study, Failure Mode, Risk Priority, Mitigation |
| apqp | 5 | APQP Plan, Phase Gate, PPAP Element, Deliverable |
| knowledge_management | 5 | Article, Category, FAQ, Search Index |

---

## 2. Bounded Context Ownership

Each bounded context is owned by exactly one service/controller pair. Cross-context queries go through the owning service API -- never direct DB access across boundaries.

| Bounded Context | Controller | Service | Schema Prefix | Notes |
|---|---|---|---|---|
| Foundation Governance | `MasterDataController`, `ApprovalGroupController` | `FoundationGovernanceService`, `ApprovalGroupService` | `qms_` | Core master data, org hierarchy, calendars, approval workflows |
| Evidence Vault | `EvidenceController` | `EvidenceVaultService` | `qms_` | Attachment storage, hash verification, Part 11 evidence chain |
| Identity and Auth | `AuthController`, `UserController` | `AuthService`, `UserService` | `qms_` | JWT, RBAC, ABAC, session management |
| Quality Management | `FormController` (inspection forms) | `InspectionService`, `CAPAService` | `qms_` | Inspection lots, NCR, CAPA, sampling |
| MES Execution | `DispatchController`, `OrderController` | `DispatchService`, `ProductionService` | `qms_` | Production orders, jobs, WIP, genealogy |
| CNC / Machine | `CncProgramController` | `CncProgramService` | `qms_` | Program lifecycle, DNC transfer, versioning |
| Supplier Relationship | `SupplierController` | `SupplierService` | `qms_` | Supplier qualification, evaluation, certificates |
| Advanced Planning | `AiSchedulingController`, `AllocationController` | `SchedulingService`, `AllocationService` | `qms_` | MRP, APS, capacity, demand forecasting |
| Document Control | `DocumentController`, `FileController` | `DocumentService` | `qms_` | Document lifecycle, revision control, distribution |
| Plant Maintenance | (GenericCrudController delegate) | `MaintenanceService` | `qms_` | PM orders, calibration, spare parts |
| Logistics | `LogisticsController` | `LogisticsService` | `qms_` | Shipping, freight, ASN, carrier management |
| Commercial / Sales | `QuoteController`, `OrderController` | `QuoteService`, `SalesService` | `qms_` | Quotes, sales orders, pricing, contracts |
| EHS | `EnergyController` | `EHSService` | `qms_` | Incidents, risk, permits, waste, emissions |
| Analytics / BI | `DashboardController` | `DashboardService`, `KPIService` | `qms_` | KPIs, dashboards, ETL jobs, data warehouse |
| Customer Portal | `CustomerPortalController` | `CustomerPortalService` | `qms_` | External-facing views, RMA, self-service |
| FMEA | `FmeaController` | `FmeaService` | `qms_` | Failure mode analysis, risk prioritization |
| APQP | `ApqpController` | `ApqpService` | `qms_` | Advanced product quality planning, PPAP |
| Compliance / Reporting | `ComplianceReportController` | `ComplianceService` | `qms_` | Regulatory obligations, audit findings |
| Knowledge Base | `KnowledgeController` | `KnowledgeService` | `qms_` | Articles, FAQ, tribal knowledge capture |
| Product Passport | `ProductPassportController` | `ProductPassportService` | `qms_` | DPP, material composition, sustainability |
| Registry / Metadata | `RegistryController`, `ModuleSchemaController`, `AdminMetadataStudioController` | `RegistryService` | `qms_` | Schema introspection, field definitions, module builder |
| Admin | `AdminController`, `SchemaStudioController` | `AdminService` | `qms_` | System config, tenant settings, audit viewer |
| Continuous Improvement | `CiController` | `CIService` | `qms_` | Kaizen, suggestions, improvement tracking |

---

## 3. Entity Relationships (Key FK Edges)

The relation-map.json contains 2 440 FK edges. Below are the most architecturally significant cross-context relationships.

### 3.1 Foundation -> Everything

```
organizations.organization_id  ->  (nearly all transactional tables via org_plant_id, org_site_id)
parties.party_id               ->  suppliers.party_id, customers.party_id, employees.party_id
calendars.calendar_id          ->  work_centers.calendar_id, plants.calendar_id, aps_schedules.calendar_id
approval_groups.approval_group_id -> document_approvals, engineering_changes, purchase_orders
attachments.attachment_id      ->  (polymorphic: entity_type + entity_id on attachment_links)
```

### 3.2 Manufacturing Digital Thread

```
items.item_id                  ->  boms.item_id, routes.item_id, production_orders.item_id
boms.bom_id                    ->  bom_lines.bom_id -> items.item_id (recursive)
routes.route_id                ->  route_operations.route_id -> work_centers.work_center_id
production_orders.prod_order_id -> work_orders.prod_order_id -> operations.work_order_id
operations.operation_id        ->  labor_bookings, material_issues, result_records
work_centers.work_center_id    ->  machines.work_center_id -> machine_states
dispatches.dispatch_id         ->  operations.operation_id, machines.machine_id
genealogy_records              ->  production_orders, items, lots, serials (full traceability graph)
```

### 3.3 Quality Chain

```
inspection_lots.inspection_lot_id -> production_orders, purchase_orders, receiving_inspections
inspection_lots                   -> inspection_plans.plan_id -> characteristics
samples.sample_id                 -> inspection_lots.inspection_lot_id
result_records                    -> samples, characteristics, gauges
nonconformances.ncr_id            -> inspection_lots, suppliers, production_orders
capas.capa_id                     -> nonconformances.ncr_id (root cause chain)
calibration_events                -> gauges.gauge_id
```

### 3.4 Supply Chain

```
suppliers.supplier_id             -> purchase_orders.supplier_id
purchase_orders.po_id             -> po_lines -> items, receiving_inspections
supplier_evaluations              -> suppliers.supplier_id, supplier_ncrs
contracts.contract_id             -> contract_lines -> items, pricing_agreements
sales_orders.so_id                -> so_lines -> items, delivery_notes, production_orders
```

### 3.5 Document and Evidence

```
documents.document_id             -> document_revisions -> attachments (via evidence vault)
document_approvals                -> approval_groups.approval_group_id, parties.party_id
attachments.attachment_id         -> evidence_vault (hash chain, Part 11 proof)
```

---

## 4. Lifecycle and Revision Logic

### 4.1 Status-Driven FSM

Every entity with a `status` column maps to a **status set** defined in `status-options.json`. The workflow engine in `workflow-library.json` governs transitions:

```
Status Set: "production_order_status"
States: planned -> released -> started -> completed -> closed
Transitions:
  planned  -> released   (requires: e-sig by planner, BOM verified)
  released -> started    (requires: dispatch acknowledged)
  started  -> completed  (requires: all operations complete, inspection passed)
  completed -> closed    (requires: financial postings reconciled)
  ANY      -> cancelled  (requires: supervisor override + reason code)
```

### 4.2 Optimistic Concurrency

All entities use `row_version INTEGER`:

1. Client reads entity, receives `row_version = N`
2. Client sends update with `If-Match: N` (ETag)
3. Server executes `UPDATE ... SET row_version = N+1 WHERE row_version = N`
4. If zero rows affected, return `409 Conflict`

The `FoundationGovernanceService` computes ETags as `SHA-256(canonical_json_snapshot)`.

### 4.3 Revision Control (Document Pattern)

Entities requiring formal revision control (documents, inspection plans, CNC programs, BOMs, routes):

1. Each revision creates a new `_revision` row linked to the parent entity
2. Only one revision can be in `approved` or `active` state at a time
3. Previous revisions move to `superseded`
4. Revision numbering: `major.minor` (e.g., `1.0`, `1.1`, `2.0`)
5. Major revision = requires full re-approval via approval group
6. Minor revision = editorial, requires single approver

### 4.4 Temporal Versioning

Master data entities (exchange rates, pricing) use temporal validity:

```sql
valid_from  TIMESTAMPTZ NOT NULL,
valid_to    TIMESTAMPTZ,  -- NULL = currently effective
```

Queries use `WHERE valid_from <= NOW() AND (valid_to IS NULL OR valid_to > NOW())` for point-in-time lookup.

### 4.5 Soft Delete Convention

Master entities carry `is_deleted BOOLEAN DEFAULT FALSE` and `deleted_at TIMESTAMPTZ`. Transactional entities are never soft-deleted -- they move to terminal states (`closed`, `cancelled`, `archived`).

---

## 5. Evidence and Audit Requirements

### 5.1 Part 11 Compliance Tiers

| Tier | Requirement | Entities |
|---|---|---|
| **Tier 1 -- Full Part 11** | Immutable audit trail, electronic signatures, reason codes, tamper-evident hash chain | Production orders, inspection lots, result records, CAPAs, calibration events, permits to work |
| **Tier 2 -- E-Signature** | Electronic signature on approve/reject transitions, recorded in `e_signatures` table | Document approvals, engineering changes, BOM release, approval group decisions |
| **Tier 3 -- Audit Trail** | Row-level change log (who, when, old value, new value) via `audit_trail` table | All master data entities, supplier records, customer records |
| **Tier 4 -- Change Log** | Summary change entries, no field-level granularity | Lookup tables, custom fields, calendar entries, shift schedules |

### 5.2 Electronic Signature Model

```sql
CREATE TABLE e_signatures (
    signature_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      VARCHAR(100) NOT NULL,
    entity_id        UUID NOT NULL,
    action           VARCHAR(50) NOT NULL,   -- 'approve', 'reject', 'release', 'close'
    signer_id        UUID NOT NULL REFERENCES parties(party_id),
    signer_role      VARCHAR(100) NOT NULL,
    meaning          TEXT NOT NULL,           -- "I approve this document for production use"
    reason_code      VARCHAR(50),
    comment          TEXT,
    signature_hash   VARCHAR(128) NOT NULL,  -- SHA-512 of (entity_snapshot + signer + timestamp)
    signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address       INET,
    user_agent       TEXT
);
```

### 5.3 Evidence Vault Integration

The `EvidenceVaultService` manages:

- File hash computation (SHA-256) at upload time
- Immutable storage reference (object storage path)
- Hash chain linking (each evidence record references the previous hash)
- Tamper detection on retrieval (recompute hash vs. stored)
- Retention policy enforcement (per regulatory requirement)

### 5.4 Observability and OTel Events

Every state transition emits an OTel-compatible event:

```json
{
  "event": "entity.state_transition",
  "timestamp": "2026-04-07T10:30:00.000Z",
  "attributes": {
    "entity_type": "production_order",
    "entity_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_state": "released",
    "to_state": "started",
    "actor_id": "user-uuid",
    "reason_code": "dispatch_ack"
  },
  "service": "mes_execution",
  "component": "ProductionService"
}
```

---

## 6. Foundation Governance Slice Entities -- Full Detail

These 5 entities are **fully implemented** with real backend, real metadata, real smoke tests, and passing readiness gates.

### 6.1 Organization

- **Table**: `organizations`
- **PK**: `organization_id UUID`
- **Controller**: `MasterDataController`
- **Service**: `FoundationGovernanceService`
- **Schema migration**: 072 (canonical), hardened by 079
- **Status set**: `master_data_status` (draft -> active -> suspended -> archived)
- **Key columns**: `org_code`, `org_name`, `org_type` (company / plant / site / warehouse / cost_center), `parent_org_id` (self-referential hierarchy), `legal_entity_code`, `timezone`, `default_currency`, `is_deleted`, `row_version`
- **API endpoints**: `GET /api/organizations` (list, cursor pagination), `GET /api/organizations/{id}` (detail), `POST /api/organizations` (create), `PUT /api/organizations/{id}` (update), `DELETE /api/organizations/{id}` (soft delete)
- **ETag**: SHA-256 of canonical JSON snapshot via `FoundationGovernanceService`
- **Cursor pagination**: Keyset-based, opaque Base64url cursor (version 1 format)
- **Observability**: `org.list`, `org.detail`, `org.create`, `org.update`, `org.delete` events
- **Evidence tier**: Tier 3 (audit trail on all changes)
- **Smoke test**: `tests/foundation_governance_contract_smoke.php`

### 6.2 Party

- **Table**: `parties`
- **PK**: `party_id UUID`
- **Controller**: `MasterDataController`
- **Service**: `FoundationGovernanceService`
- **Status set**: `master_data_status` (draft -> active -> inactive)
- **Key columns**: `party_code`, `party_name`, `party_type` (person / organization / department / team), `email`, `phone`, `organization_id` (FK -> organizations), `is_deleted`, `row_version`
- **API endpoints**: `GET /api/parties` (list), `GET /api/parties/{id}` (detail), `POST`, `PUT`, `DELETE`
- **Relationships**: Links to `suppliers`, `customers`, `employees` as specializations; referenced by `e_signatures.signer_id`, `document_approvals.approver_id`
- **Evidence tier**: Tier 3

### 6.3 Calendar

- **Table**: `calendars`
- **PK**: `calendar_id UUID`
- **Controller**: `MasterDataController`
- **Service**: `FoundationGovernanceService`
- **Status set**: `master_data_status` (draft -> published -> archived)
- **Key columns**: `calendar_code`, `calendar_name`, `calendar_type` (production / shipping / maintenance / office), `timezone`, `organization_id` (FK), child table `calendar_entries` for day-level overrides (shifts, holidays)
- **API endpoints**: `GET /api/calendars`, `GET /api/calendars/{id}`, `POST`, `PUT`, `DELETE`
- **Consumers**: Work centers, plants, APS scheduler, shift planning
- **Evidence tier**: Tier 4

### 6.4 Approval Group

- **Table**: `approval_groups`
- **PK**: `approval_group_id UUID`
- **Controller**: `ApprovalGroupController`
- **Service**: `ApprovalGroupService`
- **Schema migration**: 072 + 079 hardening
- **Status set**: `approval_group_status` (draft -> active -> suspended)
- **Key columns**: `group_code`, `group_name`, `approval_type` (sequential / parallel / quorum), `quorum_count`, `organization_id` (FK), child table `approval_group_members` (member_id FK -> parties), `row_version`
- **API endpoints**: `GET /api/approval-groups` (list with ETag), `GET /api/approval-groups/{id}` (detail with snapshot ETag), `POST /api/approval-groups/{id}/request-approval` (command: triggers workflow)
- **Workflow bridge**: `ApprovalWorkflowAdapter` validates FSM transitions before persistence (`WORKFLOW_BRIDGE_READY = true`)
- **Decision bridge**: Records approve/reject decisions with e-signature integration
- **Timeline projection**: Projects expected completion based on group type and member response history
- **Observability**: `approval_group.list`, `approval_group.detail`, `approval_group.request_approval`, `approval_group.decision` events
- **Evidence tier**: Tier 2 (e-signature on decisions)

### 6.5 Attachment

- **Table**: `attachments`
- **PK**: `attachment_id UUID`
- **Controller**: `EvidenceController`
- **Service**: `EvidenceVaultService`
- **Key columns**: `file_name`, `file_size`, `mime_type`, `storage_path`, `hash_sha256`, `entity_type`, `entity_id` (polymorphic FK), `uploaded_by` (FK -> parties), `upload_verified_at`, `row_version`
- **API endpoints**: `POST /api/evidence/upload`, `GET /api/evidence/{id}`, `GET /api/evidence/{id}/download`, `DELETE /api/evidence/{id}`
- **Hash verification**: SHA-256 computed at upload, re-verified on every download
- **Storage**: Object storage backend with immutable write policy
- **Retention**: Configurable per entity_type (default 7 years for regulatory, 3 years for operational)
- **Evidence tier**: Tier 1 (immutable hash chain, tamper detection)

### 6.6 Readiness Summary

| Entity | Backend | Metadata | Smoke Test | ETag | Cursor | OTel | Readiness |
|---|---|---|---|---|---|---|---|
| Organization | PASS | PASS | PASS | PASS | PASS | PASS | READY |
| Party | PASS | PASS | PASS | PASS | PASS | PASS | READY |
| Calendar | PASS | PASS | PASS | PASS | PASS | PASS | READY |
| Approval Group | PASS | PASS | PASS | PASS | PASS | PASS | READY |
| Attachment | PASS | PASS | PASS | PASS | N/A | PASS | READY |

All 5 entities pass the frontend-safe readiness gate: real database schema, real service layer, real API endpoints, real smoke tests, real observability events.

---

## Appendix A: Domain Table Count Reference

| # | Domain | Tables |
|---|---|---|
| 1 | mes_execution | 49 |
| 2 | quality_management | 22 |
| 3 | supplier_relationship | 19 |
| 4 | master_data_governance | 18 |
| 5 | ehs_sustainability | 17 |
| 6 | advanced_planning | 16 |
| 7 | quality_lab | 16 |
| 8 | commercial_contracts | 15 |
| 9 | sales | 15 |
| 10 | outsource_execution | 15 |
| 11 | plant_maintenance | 15 |
| 12 | bi_datawarehouse | 14 |
| 13 | mfg_engineering | 14 |
| 14 | tooling_lifecycle | 14 |
| 15 | hcm_workforce | 14 |
| 16 | finance | 13 |
| 17 | logistics | 13 |
| 18 | inventory_management | 12 |
| 19 | document_management | 12 |
| 20 | project_management | 11 |
| 21 | iot_telemetry | 10 |
| 22 | customer_returns | 9 |
| 23 | cost_accounting | 8 |
| 24 | warranty_claims | 7 |
| 25 | regulatory_compliance | 7 |
| 26 | field_service | 6 |
| 27 | fmea | 6 |
| 28 | apqp | 5 |
| 29 | knowledge_management | 5 |
| 30-48 | (remaining 18 domains) | 1-4 each |
| **Total** | **48 domains** | **528 tables** |
