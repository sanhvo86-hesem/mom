# Canonical ERP + MES + eQMS 7-Layer Architecture

Date: 2026-04-05

Status: Canonical target architecture for HESEM enterprise platform

Scope: Foundation for a standardized, execution-grade schema across ERP, MES, and eQMS, aligned to current HESEM migration waves and world-class manufacturing platform patterns.

## 1. Research basis

This canonical model is not based on a single vendor schema. It synthesizes patterns repeatedly found in the strongest production systems and standards:

- ISA-95 manufacturing operations model and ERP/MES boundary:
  [ISA-95 standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- SAP S/4HANA centralized party master:
  [SAP Business Partner](https://learning.sap.com/courses/configuring-master-data-and-basic-functions-in-sap-s-4-hana-sales/using-business-partner-master-data-in-sales)
- SAP quality object integration:
  [SAP inspection lot](https://help.sap.com/docs/SAP_ERP/250374f0514e4e0f9057066374265eba/a7e4b65334e6b54ce10000000a174cb4.html)
- Oracle work definition and work order execution patterns:
  [Oracle work definitions](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/how-you-create-work-definitions.html)
  [Oracle work orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/overview-of-work-orders.html)
- Microsoft Dynamics production, quality, and batch traceability:
  [Dynamics production orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/create-production-orders)
  [Dynamics quality orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quality-management-processes)
  [Dynamics electronic batch record](https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/quality-electronic-batch-record)
- Regulated eQMS controls:
  [FDA QMSR](https://www.fda.gov/medical-devices/postmarket-requirements-devices/quality-management-system-regulation-qmsr)
  [FDA Part 11 guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
  [21 CFR 820.198 complaint files](https://www.law.cornell.edu/cfr/text/21/820.198)

## 2. Core design decisions

### 2.1 One canonical model, many bounded execution packs

The strongest systems do not let ERP, MES, and eQMS diverge into isolated data islands. They use one canonical object model, then let modules implement bounded execution behavior on top of it.

HESEM should use:

- one party master
- one item master
- one organization hierarchy
- one approval and electronic signature model
- one audit trail model
- one event and lineage contract

### 2.2 Snapshot, not join-back

Any manufacturing or quality execution object must preserve the exact released definition used at execution time.

Examples:

- production orders keep BOM and route snapshots
- work orders keep the operation definition used at release
- inspection lots keep the inspection plan revision used at creation
- complaints and CAPA keep the product, lot, serial, and document revision context as of the event

### 2.3 Event-first MES

MES must not overwrite master data to represent shop-floor reality. MES writes events and transactions:

- `job_event`
- `machine_event`
- `downtime_event`
- `material_consumption`
- `production_completion`
- `scrap`
- `rework`

Current state is always reconstructed from event history plus derived projections.

### 2.4 Ledger-first inventory and cost

Inventory and cost are not maintained as only “current balance” tables.

Required pattern:

- write every movement to `inventory_ledger`
- publish periodic balances to `inventory_balance_snapshot`
- trace WIP through `wip_ledger`
- trace financial impact through `cost_ledger`

### 2.5 eQMS is a peer layer, not a side module

Quality, compliance, complaint, CAPA, audit, document control, and training must directly connect to ERP and MES objects:

- sales orders
- purchase orders
- production orders
- work orders
- lots
- serials
- genealogy links
- suppliers
- customers
- operators

## 3. Canonical 7-layer model

## 3.1 Layer 1: Foundation

Purpose: organization, parties, time, code lists, and universal governance.

### Backbone tables

- `org_enterprise`
- `org_company`
- `org_site`
- `org_plant`
- `org_warehouse`
- `org_work_center`
- `org_work_unit`
- `party`
- `party_role`
- `party_site`
- `party_contact`
- `uom`
- `calendar`
- `shift`
- `reason_code`
- `status_code`

### Mandatory rules

- every transactional table must carry organization scope
- `party` is the canonical human or business entity
- role tables define whether a party is supplier, customer, employee, approver, auditor, operator, or carrier
- calendar and shift must be reusable across planning, MES, quality, maintenance, and labor

## 3.2 Layer 2: Master Data

Purpose: reusable product and traceability definitions.

### Backbone tables

- `item`
- `item_revision`
- `item_site`
- `item_variant`
- `item_class`
- `item_attr`
- `item_spec`
- `lot_policy`
- `serial_policy`
- `shelf_life_policy`

### Recommended extension tables

- `item_substitution_rule`
- `item_packaging_spec`
- `item_label_profile`
- `item_customer_crossref`
- `item_supplier_crossref`
- `item_quality_profile`

### Mandatory rules

- `item` is stable and cross-enterprise
- `item_revision` is effectivity-controlled
- specifications belong to item revision, not the generic item
- lot and serial behavior must be policy-driven, not hardcoded per screen

## 3.3 Layer 3: Engineering / Manufacturing Definition

Purpose: what to build and how to build it.

### Backbone tables

- `bom`
- `bom_version`
- `bom_line`
- `bom_substitute`
- `work_definition`
- `work_definition_version`
- `operation`
- `operation_resource`
- `operation_material`
- `operation_output`
- `work_instruction`
- `attachment`
- `approval`
- `electronic_signature`

### Recommended extension tables

- `control_plan_link`
- `pfmea_link`
- `machine_program_link`
- `tooling_requirement`
- `setup_matrix`
- `critical_characteristic_link`

### Mandatory rules

- a released work definition version must be immutable
- operations must support multiple resource types: work center, machine, tool, labor, fixture
- work instructions must link to a controlled document revision
- approval and e-signature must be separate reusable objects

## 3.4 Layer 4: Planning / ERP Orchestration

Purpose: demand shaping, supply planning, purchasing, and released production intent.

### Backbone tables

- `demand`
- `forecast`
- `sales_order`
- `purchase_order`
- `mrp_signal`
- `planned_supply`
- `allocation`
- `pegging`
- `production_order`
- `production_order_bom_snapshot`
- `production_order_route_snapshot`

### Recommended extension tables

- `aps_planning_scenario`
- `aps_capacity_bucket`
- `aps_schedule_block`
- `aps_schedule_conflict`
- `supplier_commitment`
- `customer_allocation_rule`

### Mandatory rules

- production orders freeze BOM and route into snapshots
- allocation and pegging remain explicit, not implicit
- forecasting and actual demand must coexist cleanly
- purchase and production supply objects must remain distinguishable downstream

## 3.5 Layer 5: MES / Shop Floor Execution

Purpose: execute, capture, and reconstruct what actually happened on the shop floor.

### Backbone tables

- `work_order`
- `job`
- `dispatch_queue`
- `job_event`
- `machine_event`
- `downtime_event`
- `process_param_capture`
- `labor_capture`
- `tool_usage`
- `genealogy_link`
- `material_consumption`
- `production_completion`
- `scrap`
- `rework`

### Recommended extension tables

- `alarm_event`
- `track_in`
- `track_out`
- `pause_resume`
- `operator_instruction_ack`
- `energy_capture`
- `oee_snapshot`

### Mandatory rules

- MES uses event history, never only mutable status fields
- genealogy must connect lots, serials, work orders, and consumed material
- machine events must remain queryable independent of job transactions
- shop-floor data must survive later engineering changes

## 3.6 Layer 6: Inventory / Cost / Traceability

Purpose: authoritative material, serial, location, and valuation history.

### Backbone tables

- `inventory_ledger`
- `inventory_balance_snapshot`
- `lot`
- `serial`
- `container`
- `location_balance`
- `cost_ledger`
- `wip_ledger`

### Recommended extension tables

- `warehouse_task`
- `warehouse_wave`
- `quarantine_hold`
- `cycle_count_result`
- `country_of_origin_trace`
- `shipment_genealogy_link`

### Mandatory rules

- inventory must be transaction-driven
- lot and serial must be first-class entities, not text fields only
- WIP must be financially reconcilable
- traceability must connect receipt, conversion, move, completion, and shipment

## 3.7 Layer 7: eQMS / Compliance

Purpose: controlled quality execution, deviations, CAPA, audits, complaints, documents, and competence.

### Backbone tables

- `inspection_lot`
- `inspection_plan`
- `inspection_characteristic`
- `inspection_result`
- `quality_order`
- `quality_case_link`
- `nonconformance`
- `deviation`
- `capa`
- `complaint`
- `audit_program`
- `audit`
- `finding`
- `document`
- `document_revision`
- `change_control`
- `training_matrix`
- `training_record`
- `competency`
- `supplier_quality_case`
- `risk_register`
- `audit_trail`

### Recommended extension tables

- `effectiveness_check`
- `document_distribution`
- `training_requirement_exception`
- `complaint_medical_device_event`
- `supplier_8d_case`
- `regulatory_commitment`

### Mandatory rules

- every quality case must link to its source business object
- document control must be versioned and approval-controlled
- complaint and CAPA must retain lot, serial, and shipment context
- audit trail and electronic signature must satisfy regulated record expectations

## 4. Cross-layer contracts

Every backbone table should follow these standards unless explicitly justified otherwise.

### Identity

- surrogate primary key: `uuid`
- stable business key: `*_code`, `*_no`, or `*_id` business reference
- technical lineage: `source_system`, `source_record_id`

### Organization scope

- `enterprise_id`
- `company_id`
- `site_id`
- `plant_id`

Use the narrowest valid scope, but never lose the lineage to the higher scope.

### Lifecycle

- `status_code`
- `approval_state`
- `effective_from`
- `effective_to`
- `is_active`

### Audit and change

- `row_version`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- `approved_at`
- `approved_by`
- `signature_id`

### Retention and data class

- `retention_class`
- `data_sensitivity`
- `legal_hold_flag`

## 5. End-to-end canonical execution flow

### 5.1 Quote-to-cash and make-to-order

1. `party` with customer role exists.
2. `sales_order` is created.
3. `demand` and `allocation` are generated.
4. `production_order` is released with BOM and route snapshots.
5. `work_order` and `job` are dispatched.
6. MES records `job_event`, `material_consumption`, `production_completion`.
7. `inventory_ledger` and `wip_ledger` are updated.
8. `inspection_lot` and `inspection_result` validate output.
9. If failure occurs, `quality_order`, `nonconformance`, or `deviation` are raised.
10. Shipment and complaint feedback remain linked to lot, serial, and genealogy.

### 5.2 Supplier quality and incoming inspection

1. supplier exists as `party` + `party_role`
2. `purchase_order` is issued
3. receipt creates `lot` or `serial`
4. incoming `inspection_lot` is triggered
5. failure opens `supplier_quality_case`
6. escalation may create `nonconformance`, `capa`, and complaint artifacts

## 6. Current HESEM crosswalk

The canonical model is meant to standardize and converge the current HESEM platform, not replace it blindly.

### Current migration anchors already aligned

- `006_erp_master_data.sql`
- `009_inventory.sql`
- `010_production.sql`
- `011_quality.sql`
- `025` to `031` MES expansions
- `061_quality_lab_compliance.sql`
- `064_master_data_governance.sql`
- `066_traceability_serialization.sql`
- `070_enterprise_governance_uplift.sql`
- `071_mes_identity_hardening.sql`

### Immediate convergence opportunities

- unify `customers`, `vendors`, `employees`, and supplier-facing roles onto canonical `party` governance
- freeze engineering and planning snapshots more consistently at release time
- standardize genealogy and traceability under common keys
- converge quality issue objects under `quality_order` + `quality_case_link`
- converge document, approval, and electronic signature semantics across engineering and eQMS

## 7. What “world-class” means in implementation

HESEM should reject these anti-patterns:

- one giant table per module
- status-only MES without event history
- inventory current balance without movement ledger
- BOM and routing without effectivity and approval state
- complaint, CAPA, deviation, and audit stored as isolated records with no business linkage
- document revisions stored without immutable approval evidence

HESEM should enforce these patterns:

- canonical master data
- released snapshots
- event-driven execution history
- ledger-driven material and cost
- first-class genealogy
- regulated quality linkage
- explicit audit trail and signature model

## 8. Repository artifacts created from this architecture

This architecture pack is accompanied by:

- `database/canonical-erp-mes-eqms-7-layer-blueprint.sql`
- `docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `qms-data/schema-studio/designs/canonical_erp_mes_eqms_7layer_core.json`

The SQL blueprint defines the core backbone DDL.

The schema map translates the architecture into source-of-truth, snapshot, event, ledger, and compliance responsibilities.

The Schema Studio design provides a canonical visual core slice for review and iteration.
