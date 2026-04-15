# Backend Readiness Gap Analysis Before Broad Frontend Build

Date: 2026-04-09
Workspace: `mom`
Scope: backend schema, workflow, API, endpoint, and canonical process readiness for the operating flows requested by the business

## Executive Verdict

The backend is broad, but not yet uniformly enterprise-ready.

- The platform schema is large enough to support a world-class ERP/MES/eQMS direction.
- The runtime registry and generic CRUD surface give wide endpoint coverage, but that does not mean process closure is complete.
- Several critical processes are still only partially normalized: they have tables and endpoints, but not a sufficiently governed lifecycle, not enough cross-object linkage, or they are split across duplicate masters and legacy/custom write paths.
- Do not scale frontend implementation across all requested processes until the P0 backend normalization work in this document is completed.

## What Was Verified Locally

Primary local evidence used in this audit:

- `mom/data/registry/table-registry.json`
- `mom/data/registry/domain-architecture.json`
- `mom/data/registry/endpoint-catalog.json`
- `mom/data/registry/publication-truth-summary.json`
- `mom/data/registry/api-params.json`
- `mom/api/controllers/OrderController.php`
- `mom/api/services/OrderService.php`
- `mom/api/services/OrderWorkflowService.php`
- `mom/api/controllers/GenericCrudController.php`
- `mom/api/services/GenericCrudService.php`

Key local facts:

- Schema authority currently reports `628` database tables.
- Only `528` tables currently have full field definitions and endpoint catalog coverage.
- `100` entities still require review before they are truly ready for broad frontend exposure.
- Workflow engine bridge summary currently reports `116` persisted workflow entities ready, `415` unneeded, `0` blocked.
- Generic runtime auto-generates `list/detail/create/update/delete/transition` surfaces for onboarded tables, so endpoint existence is much wider than business-process maturity.

Implication:

- Backend coverage is strong at the registry/runtime layer.
- Backend readiness is uneven at the process-control layer.

## Process Verdict Scale

- `Strong`: tables, endpoints, lifecycle, and critical cross-object controls are mostly present.
- `Partial`: major tables and endpoints exist, but lifecycle, master-data normalization, or cross-object closure is incomplete.
- `Thin`: basic CRUD exists, but the business object model is too shallow for world-class control.
- `Gap`: a required canonical object or governed lifecycle is missing.

## Process Matrix

### 1. Factory Master Control

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| Machine control in factory | `equipment`, `mes_machine_state_events`, `mes_machine_telemetry`, `mes_machine_snapshot`, `pm_equipment_master`, `pm_work_orders` | Partial | `equipment` has `workflowId=wf_equipment` but no `statusColumn`, so it has no governed lifecycle endpoint. Machine identity is split between calibration/equipment, MES, and PM. |
| Tooling / tool crib / tooling lifecycle | `tools`, `tool_transactions`, `tooling_*`, `mes_tool_*` | Partial | `tools` has `workflowId=wf_tool_life` but no `statusColumn`; most tooling lifecycle objects are only `generic_status_only` or have no lifecycle state at all. |
| Asset control | `fin_fixed_assets`, `equipment`, `pm_equipment_master`, `svc_customer_assets` | Partial | Asset identity is fragmented across finance fixed assets, plant equipment, shopfloor equipment, and customer installed assets. No single canonical `asset_master` or clear ownership/depreciation-maintenance-service lineage. |
| Measuring equipment / calibration / expiry / MSA | `calibration_records`, `calibration_grr_studies`, `calibration_oot_investigations`, `tooling_calibration_links`, `employee_certifications`, `ehs_permit_register` | Partial | GRR and OOT exist, but explicit MSA program/study governance is still thin. Expiry control is split across unrelated objects. `equipment` and `tools` themselves are not lifecycle-governed. |

### 2. Master Data and External Obligations

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| Customer control | `customers`, `customer_sites`, `crm_accounts`, `crm_contacts` | Partial | Customer master is split between Sales and CRM. `customers` is still `generic_status_only`. Canonical party model is not fully adopted. |
| Supplier control | `vendors`, `approved_supplier_list`, `srm_*`, `supplier_scorecards`, `supplier_audit_schedule` | Partial | Supplier master is split between Purchasing and SRM. `vendors` is `generic_status_only`. Supplier identity is not consolidated around one canonical vendor/party backbone. |
| Employee control | `employees`, `hcm_employees`, `training_records`, `employee_certifications`, `hcm_employee_certifications` | Partial | Employee data is duplicated across `training_hr` and `hcm_workforce`. Some HCM objects have transitions, but several critical employee/qualification records remain generic or unguarded. |
| External production factors: authority, permits, environment, fire safety, obligations | `ehs_permit_register`, `ehs_regulatory_submissions`, `qual_compliance_obligations`, `ehs_incidents`, `ehs_hazardous_materials`, `ehs_material_safety_data` | Gap / Partial | `qual_compliance_obligations` has `workflowId` but no `statusColumn`. `ehs_incidents` has `workflowId=wf_ehs_incident` but no transition endpoint. There is no explicit backend object graph for lease/government-authority/fire-certificate lifecycle. |

### 3. Commercial and Customer Flows

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| Quotation control | `quotes`, `quote_lines`, `quote_history`, `QuoteController` | Strong / Partial | Quote header lifecycle is strong and persisted. Supporting quote history/analytics structures are still not fully normalized. |
| Customer care and quote effectiveness | `crm_customer_touchpoints`, `crm_quotes_pipeline`, `customer_complaints`, `svc_service_requests`, `svc_return_authorizations` | Partial | Customer touchpoints exist, but `crm_customer_touchpoints` has `workflowId` without `statusColumn`. There is no explicit closed-loop quote effectiveness model joining touchpoint -> quote -> SO -> complaint/return/retention outcome. |
| Customer PO control | `sales_orders.customer_po_number`, quote-to-SO conversion, `sales_orders.customer_po_line` | Thin | Customer PO is stored as attributes on SO, not as a standalone governed business object with revision, acknowledgement, line matching, or change history. |
| SO control | `sales_orders` registry contract plus custom `OrderController` / `OrderService` / `OrderWorkflowService` | Strong functionally / architecture debt | SO workflow exists in canonical registry, but live order operations still run through custom `orders.json` with shadow sync. This is operationally usable, but not yet the highest-standard backend pattern. |
| JO control | `job_orders` registry contract plus custom order runtime | Strong functionally / architecture debt | JO lifecycle is strong, but runtime still depends on custom/file-backed order services and shadow sync instead of one canonical DB write model. |
| WO control | custom `work_orders` in order runtime, `job_operations`, `work_order`, `maintenance_work_orders`, `svc_service_work_orders` | Partial | WO semantics are split across production order WO, job operations, maintenance WO, and service WO. Backend needs one canonical manufacturing work-order model or a strict typed model separating execution/maintenance/service. |

### 4. Procurement, Incoming, Warehouse, and Planning

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| Supplier PO control | `purchase_orders`, `purchase_order_lines`, `vendors`, persisted PO workflow | Strong / Partial | Purchase order lifecycle is good. Procurement backbone is still missing complete requisition -> PO -> ASN/receipt -> inspection -> invoice-match closure. |
| IQC / incoming inspection | `incoming_inspections`, `incoming_inspection_results`, `inspection_plans`, `ncr_records` | Strong | IQC workflow is one of the better-governed areas. Remaining gap is deeper integration to receiving, inventory release, and finance acceptance matching. |
| Warehouse control | `inventory_*`, `wms_*`, `warehouse_management` domain, `wms_transfer_orders`, `wms_pick_lists`, `wms_quarantine_holds` | Partial | WMS table breadth is good, but many persisted workflows are unguarded, and WMS is not yet uniformly governed by quality/hold/release controls. |
| Production planning | `advanced_planning`, `AiSchedulingController`, `mrp_planned_orders`, `production_schedule`, `aps_*` | Partial | Planning breadth is strong, but many planning objects have `workflowId` without lifecycle fields or use `generic_status_only`. Freeze/commit/replan governance is not strong enough yet. |
| IPQC | no explicit `ipqc_*` tables; only `mes_inline_measurements`, `inspection_results`, `mobile_submit_inprocess` style actions | Gap | There is no explicit canonical IPQC inspection order/result model. World-class WIP quality cannot stay implicit. |

### 5. Quality, Shipping, Returns

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| NCR / CAPA / MSA | `ncr_records`, `capa_records`, `capa_8d_steps`, `capa_effectiveness_checks`, `calibration_grr_studies`, `calibration_oot_investigations` | Partial / Strong | NCR/CAPA are comparatively mature. MSA remains thin because explicit MSA governance beyond GRR/OOT is not modeled as a first-class process family. |
| OQC / FQC | `oqc_inspections`, `shipping_compliance`, `quality_management` | Gap / Partial | `oqc_inspections` has `workflowId=wf_oqc_inspection` but no `statusColumn`, so no governed transition endpoint exists. Explicit FQC canonical entities are absent. |
| Shipping / logistics | `shipments`, `shipment_releases`, `packing_lists`, `tms_shipments`, `tms_routes`, `tms_freight_audits` | Partial | Shipping compliance is stronger than transportation. `tms_shipments`, `tms_routes`, and related transportation objects are still `generic_status_only`. Shipment models are split across shipping and transportation domains. |
| Customer care / returns / RMA | `rma_orders`, `svc_return_authorizations`, `svc_warranty_claims`, `svc_service_work_orders` | Partial | Returns and warranty processes exist, but most status handling is still generic and not backed by strong approval/inspection/disposition closure. |

### 6. Finance, Improvement, Performance, Maintenance, Safety

| Process | Current backend evidence | Verdict | Main backend issue before frontend |
|---|---|---|---|
| Finance and accounting | `ap_ar_invoices`, `gl_transactions`, `job_costing`, `fin_*` trade and treasury tables | Thin / Partial | Core finance is too thin for enterprise close. `ap_ar_invoices` is still `generic_status_only`. 3-way/4-way match, subledger controls, and deeper close governance are incomplete. |
| Audit / CI / improvement | `audits`, `audit_actions`, `management_reviews`, `risk_register`, `improvement_projects`, `CiController` | Partial | Audit objects exist, but core audit/risk tables still show workflow/state contract drift. Improvement projects are still `generic_status_only`. |
| Overall plant performance | `mes_oee_snapshots`, `mes_oee_loss_events`, `mes_production_kpi_daily`, `EnergyController`, `OeeService` | Partial | OEE/KPI capture exists, but some services still mix file-based runtime with DB shadow writes. Backend should move to one canonical event and metric write model. |
| Equipment maintenance | `pm_*`, `maintenance_work_orders`, `equipment`, `pm_equipment_master` | Partial | PM work orders are relatively good, but equipment identity remains split, and several PM master objects have persisted workflows without guards. |
| Labor safety / 5S / lean discipline | `ehs_*`, `lean_5s_audits`, `lean_andon_events`, `lean_gemba_walks`, `lean_qrqc_events` | Partial | Lean objects exist, but they are mostly unguarded persisted workflows. EHS incidents and safety obligation objects are not normalized enough for regulated operation. |

## Cross-Cutting Root Causes

### 1. Endpoint breadth is being mistaken for process maturity

The generic runtime creates broad endpoint coverage for onboarded tables:

- `list`
- `detail`
- `create`
- `update`
- `delete`
- `transition`

That is useful infrastructure. It is not sufficient proof that the process is backend-complete.

### 2. Workflow contract drift is widespread

There are many important tables where `workflowId` exists but `statusColumn` does not.

Examples verified locally:

- `equipment`
- `tools`
- `qual_compliance_obligations`
- `oqc_inspections`
- `ehs_incidents`
- `crm_customer_touchpoints`

This means the registry says these are workflow-controlled objects, but the runtime cannot expose a normal governed state transition path.

### 3. `generic_status_only` is overused on business-critical objects

This pattern is still applied to many objects that should have explicit business transitions, role guards, prerequisites, and actions.

Examples:

- `vendors`
- `customers`
- `crm_leads`
- `tms_shipments`
- `rma_orders`
- `fin_fixed_assets`
- `ap_ar_invoices`
- `hcm_employees`

For world-class manufacturing control, these should not be treated as "any valid status value is acceptable."

### 4. Master data is still duplicated across domains

Duplicated or fragmented masters verified locally:

- Customer: `customers` plus CRM account/contact layer
- Supplier: `vendors` plus SRM supplier objects
- Employee: `employees` plus `hcm_employees`
- Asset: `equipment`, `pm_equipment_master`, `fin_fixed_assets`, `svc_customer_assets`

This prevents clean backend ownership, lifecycle control, and API contract stability.

### 5. Several critical process chains are incomplete

Important missing or weak chains:

- customer PO -> acknowledgment -> SO line control
- requisition -> approval -> PO -> receipt -> acceptance -> invoice match -> payment
- WIP/IPQC -> NCR -> containment -> disposition -> release
- final inspection / OQC / FQC -> shipment release -> delivered feedback
- incident / obligation / permit -> corrective action -> evidence -> closure

### 6. Order backbone still carries legacy/custom runtime debt

The platform now supports SO/JO/WO functionally, but the live order runtime still uses:

- `mom/api/services/OrderService.php`
- `mom/api/services/OrderWorkflowService.php`
- `data/orders/orders.json`

with shadow synchronization into canonical tables.

This is much better than split-brain runtime, but it is still not the final enterprise backend shape.

## International Standard Direction Derived From Current Official References

The following principles are consistent across current SAP, Oracle, Microsoft Dynamics, and IFS materials reviewed on 2026-04-09:

### A. Lifecycle must control business transactions, not just labels

World-class systems treat lifecycle states as transaction controls.

What this means for HESEM:

- no critical object should rely only on `generic_status_only`
- state models must define allowed transitions
- role guards, preconditions, and action hooks must be explicit
- state must govern whether scheduling, completion, release, receipt, payment, or shipment is allowed

### B. Inspection is not a single stage; it must span receiving, WIP, inventory, and asset maintenance

Current world references explicitly support:

- receiving inspections
- inventory inspections
- work-in-process inspections
- maintenance/asset inspections

What this means for HESEM:

- IQC alone is not enough
- IPQC and FQC must become first-class backend processes
- inspection plans must be typed by stage and applicable context
- inspection outcomes must feed inventory release, NCR, and completion gates

### C. Procurement must close the document chain through finance

World-class procurement is not just PO header/line.

The normal chain is:

- requisition
- approval
- purchase order
- receipt
- inspection / acceptance
- invoice match
- payment

What this means for HESEM:

- add requisition and receipt backbone objects
- add supplier ASN / shipment notice and acceptance linkage
- add explicit 3-way/4-way matching controls
- tie IQC acceptance to AP invoice validation and inventory release

### D. Warehouse quality must actively reroute inventory

Current world references show warehouse quality models that:

- block inventory during inspection
- divert failed receipts to alternate locations
- create quality orders from failed checks

What this means for HESEM:

- WMS, IQC, and quarantine must be one backend chain
- transfer/pick/putaway should not remain isolated from quality disposition logic

### E. Asset, maintenance, and finance must share identity

Current world references show unified control of:

- operational asset identity
- work order lifecycle
- fixed asset acquisition and depreciation
- procurement and maintenance linkage

What this means for HESEM:

- unify equipment/PM asset/fixed asset/customer installed asset identity
- create canonical cross-reference model instead of parallel masters
- link PO/invoice acquisition, asset capitalization, PM strategy, and reliability metrics

### F. Compliance obligations and incidents require traceable closure

World-class safety and compliance backends keep:

- obligation / permit register
- incident records
- corrective actions
- evidence packages
- retention-ready inspection records

What this means for HESEM:

- `qual_compliance_obligations` and `ehs_incidents` must get governed lifecycles
- authority-issued permits and safety certificates need typed objects and expiry governance
- EHS incidents must feed actions, evidence, and management review

### G. API surface should align to bounded business functions

IFS and other enterprise platforms emphasize self-contained business functions and a single platform data model.

What this means for HESEM:

- domain endpoints should be business-bounded
- custom controllers and registry runtime should converge on one canonical contract per object
- avoid long-term coexistence of parallel write models for the same process

## P0 Remediation Required Before Broad Frontend Expansion

### 1. Normalize workflow contracts

For every backend object with `workflowId`, do one of these only:

- make it a true lifecycle owner:
  - add `statusColumn`
  - define status set
  - expose transition endpoint
  - define role guards and preconditions
- or reclassify it as a non-lifecycle child/detail record and remove workflow ownership semantics

Immediate candidates:

- `equipment`
- `tools`
- `qual_compliance_obligations`
- `oqc_inspections`
- `ehs_incidents`
- `crm_customer_touchpoints`

### 2. Canonicalize the commercial-production backbone

Move SO/JO/WO from custom/file operational write model toward canonical DB-backed write ownership.

Required target:

- one canonical write model
- projections/read models allowed
- no long-term dual-write ambiguity

### 3. Introduce missing first-class process objects

At minimum:

- `customer_purchase_orders`
- `purchase_requisitions`
- `purchase_receipts`
- `supplier_asn` or equivalent supplier shipment notice
- `ipqc_inspections`
- `fqc_inspections`
- unified `asset_master` or strict canonical asset cross-reference model
- authority/permit/certificate records for fire-safety and external obligations where legally required

### 4. Unify master-data identity

Backend must converge on canonical identities for:

- customer
- supplier
- employee
- asset
- site / plant / warehouse / work center

### 5. Strengthen procurement-finance-quality closure

Before full frontend:

- receipt must feed IQC
- IQC acceptance must feed inventory release
- receipt and acceptance must feed invoice match
- AP invoice should not stay `generic_status_only`

### 6. Make WIP and final quality explicit

Create explicit lifecycle-governed IPQC and FQC models rather than leaving them implicit in:

- `mes_inline_measurements`
- generic `inspection_results`
- shipping-stage OQC only

### 7. Normalize EHS/compliance closure

Create governed backend path:

- obligation / permit
- due / expiry
- incident / breach
- corrective action
- evidence
- review / closure

## P1 Remediation Next

- unify transportation and shipping into one shipment execution model
- add quote effectiveness and commercial conversion analytics as first-class backend objects
- strengthen returns / warranty authorization and disposition workflow guards
- normalize finance close, bank rec, revenue schedule, and fixed-asset transaction orchestration
- move OEE and KPI writes toward canonical event-driven DB models
- add stronger role guards to WMS, PM, HCM, lean, and audit objects that currently use persisted workflows without effective guard rails

## Processes Safe For Controlled Frontend Pilot After P0

These areas are closest to being frontend-safe once P0 contract normalization is completed:

- quoting
- supplier PO
- IQC
- NCR / CAPA
- shipment release / shipping compliance
- selected WMS execution flows

## Processes That Should Stay Backend-First For Now

- customer PO management
- full SO/JO/WO canonicalization
- IPQC
- FQC
- unified asset management
- EHS incident / permit / compliance obligation flows
- finance close and procurement-to-pay orchestration
- customer care and quote effectiveness closed loop

## Selected Official Reference Points Reviewed On 2026-04-09

- SAP S/4HANA quality inspection lot: an inspection lot is the request to perform a quality inspection, reinforcing that quality control should be modeled as a first-class transactional object.
  - https://help.sap.com/doc/e2048712f0ab45e791e6d15ba5e20c68/2020.latest/en-US/FSD_OP2020_latest.pdf
- Oracle Quality Management: inspection plans explicitly cover Receiving, Inventory, Work in Process, and Asset contexts.
  - https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/fauqm/inspection-plan-criteria.html
- Oracle Manufacturing / Quality: work order completion can be blocked until required inspection is performed.
  - https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/faumm/report-work.html
- Oracle Procurement / Receiving / Payables: approved requisitions can create purchase orders; 3-way and 4-way matching are standard controls.
  - https://docs.oracle.com/cd/G49759_01/trans/G46404-01/using-procurement.pdf
  - https://docs.oracle.com/cd/G49759_01/trans/G46465-01/using-receiving.pdf
  - https://docs.oracle.com/cd/E18727_01/doc.121/e12797/T295436T366808.htm
- Microsoft Dynamics 365 quality management: quality orders can be generated from PO receipt, and failed dock checks can create quality orders and redirect putaway.
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/tasks/inspect-quality-goods
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/warehousing/quality-check
- Microsoft Dynamics 365 asset management: work orders can only be scheduled if lifecycle state allows scheduling.
  - https://learn.microsoft.com/en-us/dynamics365/supply-chain/asset-management/work-order-scheduling/schedule-work-orders
- Microsoft Dynamics 365 finance: fixed assets integrate with purchasing and invoicing; reconciliation across subledgers and GL is explicit.
  - https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/set-up-fixed-assets
  - https://learn.microsoft.com/en-us/dynamics365/finance/fixed-assets/acquire-assets-procurement
  - https://learn.microsoft.com/en-us/dynamics365/finance/general-ledger/account-reconciliation
- Oracle / PeopleSoft HCM safety incident reporting confirms incident records are formal business objects with employee acknowledgement and reporting flow.
  - https://docs.oracle.com/cd/F88037_01/hcm92pbr48/eng/hcm/hhhs/ReportingIncidentsAsEmployees.html
- IFS Cloud public materials reinforce a single-platform, single-data-model direction spanning ERP, asset management, manufacturing, finance, service, and sustainability.
  - https://www.ifs.com/en/assets/cloud/ifs-cloud-brochure
  - https://www.ifs.com/en/ifs-cloud
  - https://www.ifs.com/en/assets/cloud/enterprise-financial-operations-software
  - https://docs.ifs.com/techdocs/Foundation1/040_administration/220_user_interface/020_custom_objects/040_custom_fields/
- OSHA/EPA current official materials continue to reinforce record retention, incident records, permits, manifests, and inspection evidence as formal compliance objects.
  - https://www.osha.gov/sites/default/files/enforcement/directives/ADM_03-01-006.pdf
  - https://www.epa.gov/e-manifest

## Bottom Line

Backend coverage is already broad enough to justify a backend-first normalization wave instead of starting blind frontend build-out.

The correct next move is not "build all screens now."

The correct next move is:

1. normalize lifecycle ownership
2. unify canonical master identities
3. close the missing object chains
4. move critical operational flows to one canonical write model
5. only then scale frontend across all requested processes
