# Runtime Authority Map

Generated from direct backend review on 2026-04-13. This file defines the intended single source of truth and records current documentation-runtime mismatches. Frontend is sample-only and must not be used as runtime evidence.

## Authority Rule

No governed domain may have multiple conflicting authorities. The target rule is:

1. PostgreSQL is the transactional authority for governed records.
2. Domain command services are the only mutation authority.
3. Workflow/status definitions are generated from one canonical workflow source.
4. JSON files are only allowed as `JSON_ONLY`, `SHADOW_WRITE`, import/export, local cache, or legacy compatibility when explicitly classified.
5. Registry/OpenAPI/frontend options are generated artifacts, not independent business authorities.
6. Generic CRUD is not business logic and cannot own governed state transitions.

## Current Runtime Authority Table

| Domain | Tables/stores | Primary runtime store now | Controller/service | Generic or dedicated | Workflow ID/status set | Existing gate | Missing gate | Runtime-safe | Frontend direct use | Direct-use risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sales/Quote/SO | JSON `data/quotes/quotes.json`, `data/orders/orders.json`, `data/orders/reviews/*.json`; PG `quotes`, `sales_orders`, `sales_order`, `sales_order_lines`, `customer_purchase_orders` | JSON primary + PG schema/shadow | `QuoteController/QuoteService`, `OrderController/OrderService/OrderWorkflowService`, `CustomerPurchaseOrderService` | Dedicated JSON plus Generic CRUD conflict | `wf_quote_lifecycle`, `wf_sales_order`; runtime quote statuses differ from registry; SO runtime `status` differs from `status_code/so_status` | Quote transition role guards; SO transition guards; shipment gate only on SO->shipped | Atomic conversion, engineering readiness, contract review binding, customer PO link transaction, shipment gate everywhere | No | Only future process APIs; current dedicated reads with caution; no generic mutation | Duplicate SO, invalid status, production release without engineering, ship bypass |
| Job Order/Work Order/MES execution | JSON orders `job_orders/work_orders`; PG `job_orders`, `work_order`, `work_orders`, `job_operations`, `mes_operation_execution`, mobile JSON stores | JSON primary + PG projections | `OrderController`, `OrderService`, `OrderWorkflowService`, `MobileController/MobileWorkQueueService`, MES services | Dedicated partial plus Generic CRUD | `wf_job_order`, `wf_work_order_execution`; runtime JO/WO states mismatch registry/config | Role transition guards; limited WO completion qty check | JO release readiness, WO routing/control plan/traveler, material availability, calibration/tooling/operator qualification, operation command | No | No direct generic; future `Create/Release/Complete` commands only | Start/complete work without readiness, ledger or inspection proof |
| Inventory/WMS | PG `inventory_transactions`, `inventory_ledger`, `stock_balances`, `location_balance`, `container`, WMS tables; possible JSON projections | Mostly PG schema/generic | No complete dedicated inventory command service found | Generic CRUD/schema-heavy | Many registry workflows; not bound to business posting commands | Registry status validation only | Receipt/issue/putaway/scrap/rework postings, stock balance, WIP, valuation, period close | No | No | Inventory can be written without ledger or period controls |
| Purchasing/Receiving/IQC | PG `purchase_orders`, `purchase_order_lines`, `purchase_receipts`, `purchase_receipt_lines`, `ap_invoices`, `ap_invoice_lines`; JSON supplier incoming | PG schema + supplier-quality JSON | `SupplierController/SupplierQualityService`, finance controls | Partial dedicated supplier-quality; P2P generic/schema-heavy | PO/AP/IQC workflow metadata exists in registry | SCAR transition checks; incoming inspection record | ASL approval in PO, receive transaction, IQC hold/block, putaway, AP invoice, 3-way match, payment | No | No | Accept/reject/putaway/AP can bypass match and quality gates |
| Supplier Quality/SCAR/ASL | JSON `data/supplier-quality/*.json`; PG `scar_records`, `approved_supplier_list`, supplier scorecard tables | JSON primary for service | `SupplierController/SupplierQualityService` | Dedicated partial plus Generic CRUD | `wf_scar_record`, ASL workflows; JSON SCAR state separate | SCAR 8D transition fields | SCAR severity/count in scorecard, ASL block on SCAR/audit/cert, PPM/OTD | Partial/no | Dedicated supplier APIs read/create only until command policy; no generic | Supplier appears approved despite severe SCAR/PPM/OTD risk |
| NCR/MRB/CAPA/COPQ/OQC | JSON `data/exceptions/*.json`, `data/logistics/oqc.json`, JSONL `data/quality/*`, PG `ncr_records`, `capa_records`, `mrb`, `oqc_inspections`, COPQ tables | Multiple JSON authorities + PG schema | `ExceptionController/ExceptionService`, `LogisticsController`, `QualityIntegrationService`, `CopqEngine` | Dedicated fragmented plus Generic CRUD | `wf_ncr`, `wf_capa`, MRB/SCAR workflows; JSONL uses unregistered states | Exception transitions; OQC flag only | Auto NCR, hold/quarantine, MRB disposition ledger, CAPA trigger/effectiveness, COPQ posting, shipment/putaway block | No | No | Failed quality can ship or enter stock; dashboards miss records |
| Finance/AP/AR/GL/period close | JSON finance controls; PG finance/AP/AR/GL/valuation tables | JSON controls + PG schema | `FinanceController/FinanceControlService` | Dedicated controls; posting generic/schema-heavy | Finance workflows in registry | Idempotency for finance control records | Posting policy, GL/AP/AR/inventory ledger, 3-way match, payment approval, SoD | No | Finance control APIs only for admin; no generic posting | Closed periods do not block transactions |
| Master Data/BOM/Routing/Control Plan/Inspection Plan | JSON `data/master-data/master-data.json`; PG `items`, `item_revisions`, `bill_of_materials`, `bom`, `routing`, `control_plans`, `inspection_plans` | JSON primary with incomplete PG rebuild | `MasterDataController/MasterDataService`, `DataLayer`, sync tools | Dedicated partial plus Generic CRUD | Master-data workflows in registry | Master data delete dependency check | Released BOM/routing/CP/IP required before SO/JO/WO release; complete sync | No | Read-only approved projections; no mutation | Production release can use stale/missing engineering data |
| Traceability/Lot/Serial/Genealogy/DPP | JSON `data/passports/*.json`; PG `lot`, `serial`, `mes_part_genealogy`, `dpp_passports`, trace tables | DPP JSON primary; trace schema | `ProductPassportController`, DataLayer MES rebuild | Dedicated DPP partial plus Generic CRUD | DPP workflow/event metadata partial | Duplicate passport by part/serial | Lot split/merge, issue/consume/produce genealogy, recall simulation, DPP auto-create from shipment | No | DPP read only; no manual event mutation except controlled QA/admin | Recall/DPP evidence incomplete or manually inconsistent |
| Maintenance/Calibration | PG `equipment`, `maintenance_work_orders`, `calibration_records`, `calibration_oot_investigations`; scheduled alert logic | PG schema + partial scheduled jobs | `ScheduledJobs`, maintenance/calibration registry | Generic/schema-heavy plus alerts | Calibration/maintenance workflows in registry | Scheduled calibration/training alerts | WO release checks equipment/tool/gage valid and OOT impact contained | Partial/no | Read-only dashboards only | Work can run on invalid machine/tool/gage |
| Machine Connectivity/MTConnect/OPC-UA | JSON `data/mes/mes-runtime.json`, OEE JSONL; PG `mes_equipment_extended`, `mes_machine_*`, `mes_oee_*` | JSON primary with shadow sync | `MtconnectPollingService`, `EdgeConnectorService`, `MesAdapterService`, `OeeService`, `MesAlarmService` | Dedicated partial plus Generic CRUD | Machine status registry partial | MTConnect timestamp replay guard; adapter/machine/WO/operator checks | Immutable raw event stream, quality code, OPC-UA ingestion, derived production events, NCR on quality signal | Partial/no | No direct mutation from frontend | Machine data can be latest-state only, not audit-grade event evidence |
| Notifications/Email/WebPush/SSE | JSONL queues under notifications/email-queue; PG notifications optional | JSON/PG partial | `NotificationService`, `NotificationGateway`, `ScheduledJobs` | Dedicated queue; no email sender found | N/A | Queue creation | Sender/worker, delivery receipts, retry/dead-letter, WebPush/SSE contracts | No | Read-only user notifications only | Critical alerts may never leave queue |
| Audit/Evidence/E-signature/Approval | JSON/PG audit trail, evidence vault, workflow engine, approval groups; PG `electronic_signature` | Mixed JSON/PG partial | `AuditTrail`, `EvidenceVaultService`, `WorkflowEngine`, `ApprovalGroupController` | Dedicated partial plus Generic CRUD | Many approval workflows | Hash-chain audit/evidence partial | Unified e-signature service with re-auth/TOTP replay protection, meaning, record hash, SoD | Partial/no | No direct generic | Regulatory evidence not Part 11 enforceable |
| Security/Auth/RBAC/Session/TOTP/Upload | PHP session, JSON users/config, RBAC permissions, upload quarantine | JSON users/session | `AuthController`, `AuthMiddleware`, `UploadHardeningService`, user/admin controllers | Dedicated partial | N/A | Idle timeout, CSRF, upload quarantine/mime checks, login rate limit | Absolute session lifetime, TOTP replay protection, role escalation policy, SoD, privileged action re-auth | Partial | Product UI only through hardened auth APIs | Session/MFA can be accepted beyond regulated policy |

## Single Source Of Truth Targets

| Authority subject | Target source | Generated outputs | Runtime owner |
| --- | --- | --- | --- |
| Status/workflow vocabulary | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` as design, then a machine-readable `workflow-status-authority.json` | PHP constants, `so_jo_wo_config.json`, `status-options.json`, `workflow-library.json`, DB checks/enums, OpenAPI, frontend options | Workflow/status generator + CI |
| Business mutation | Domain command service | OpenAPI command endpoints, command audit, outbox events | Domain service owner |
| Transaction and idempotency | Command framework | `idempotency_keys`, transaction envelope, deterministic replay response | Platform backend |
| Ledger posting | Inventory/finance ledger services | Inventory/WIP/cost/AP/GL ledgers, balances, projections | Finance/inventory backend |
| Regulatory evidence | Evidence/e-signature service | Audit event, evidence link, e-signature record, hash chain | QMS/platform backend |
| Master data | PostgreSQL after cutover; JSON import/export only | JSON runtime cache, registry metadata, read projections | MDM backend |

## JSON vs PostgreSQL Authority

| Mode | Meaning | Allowed use | Required controls |
| --- | --- | --- | --- |
| `JSON_ONLY` | JSON is temporary primary | Prototype-only or legacy compatibility domains | Explicit risk owner, no regulated claim |
| `SHADOW_WRITE` | JSON read primary, write JSON+PG | Migration bridge | Reconciliation report and rollback plan |
| `POSTGRES_PRIMARY` | PG read primary with JSON fallback | Cutover period | Drift detection and fallback audit |
| `POSTGRES_ONLY` | PG only | Target for governed domains | Backup/restore, migrations, constraints, RLS where applicable |

Current target: Sales/Quote/SO, JO/WO, quality, inventory, purchasing, finance, traceability, e-signature, and machine event spine must move to `POSTGRES_PRIMARY`/`POSTGRES_ONLY` before being called enterprise-ready.

## Status And Workflow Mismatches

| Item | Runtime/config/registry mismatch | Required action |
| --- | --- | --- |
| Quote | Runtime `draft, internal_review, sent, accepted, rejected, expired, revised, converted`; registry `draft, review, sent, won, lost, expired`. | Canonicalize to runtime/DB enum; map `review->internal_review`, `won->accepted`, `lost->rejected`. |
| SO | Runtime/config `draft, quoted, confirmed, in_production, shipped, closed, cancelled`; registry `sales_order_status` includes `engineering_ready` but omits `quoted/cancelled`; `sales_order_status_code` has unrelated `released/in_progress/completed`. | Canonical SO lifecycle includes `engineering_ready`; align status sets and table columns. |
| `wf_sales_order` | `statusSet=sales_order_status_code` does not match workflow states. | Point workflow to canonical SO status set and migrate columns. |
| JO | Runtime supports `planned, released, active, on_hold, completed, closed, cancelled`; config/registry omit `cancelled` and registry omits `on_hold` in places. | Add canonical JO status set and migrate unknowns. |
| WO | Runtime supports `scheduled, setup, running, inspection, completed, on_hold, cancelled`; registry workflow has `draft, planned, released, in_production, quality_hold, closed, cancelled`. | Split production WO lifecycle from service/maintenance WO or rename clearly. |
| NCR | Registry has `draft/submitted/...`; JSONL auto NCR uses `open`. | Map `open` to `submitted` or `containment_active`; reject unregistered states. |
| CAPA | Registry has `draft/initiated/action_planning/...`; JSONL trigger uses `pending_review`. | Add formal trigger state or map to `initiated`. |
| OQC/IQC | OQC result status and logistics result strings are not a command-owned quality state. | `RecordOqcResult` and `RecordIqcResult` own the result and linked hold/NCR state. |

## Orphan And Unregistered State List

| State | Location | Classification |
| --- | --- | --- |
| `engineering_ready` | Registry/workflow SO, not runtime-enforced | orphan workflow state until enforced |
| `cancelled` JO/WO | Runtime constants/cancel transition, not config/workflow | unregistered runtime state |
| `open` NCR | Quality JSONL auto NCR | unregistered runtime state |
| `pending_review` CAPA trigger | Quality JSONL auto CAPA trigger | unregistered runtime state |
| `quality_hold` WO | Registry WO workflow, not runtime WO constants | orphan workflow state for production WO |
| `released/in_progress/completed` SO status code | `sales_order_status_code` status set | wrong status authority for `wf_sales_order` |

## Duplicate/Singular-Plural Table Conflicts

The registry currently contains 658 tables and at least these conflicting pairs. Each pair must be assigned one canonical authority and one compatibility/deprecated mapping.

| Pair | Required decision |
| --- | --- |
| `sales_order` / `sales_orders` | Canonicalize sales order header; map legacy singular/plural. |
| `sales_order_line` / `sales_order_lines` | Canonicalize line item table and FK. |
| `work_order` / `work_orders` | Split service work order vs production work order or rename. |
| `purchase_order` / `purchase_orders` | Canonicalize P2P command model. |
| `purchase_order_line` / `purchase_order_lines` | Canonicalize line table. |
| `item` / `items` | Canonicalize MDM item. |
| `item_revision` / `item_revisions` | Canonicalize revision. |
| `inspection_plan` / `inspection_plans` | Canonicalize quality planning. |
| `electronic_signature` / `electronic_signatures` | Canonicalize Part 11 signature table. |
| `document` / `documents` | Keep document-control compatibility mapping. |
| `deviation` / `deviations` | Canonicalize exception state machine. |
| `allocation` / `allocations` | Canonicalize record allocation. |

## Route Bypass Map

| Route/action | Bypassed gate | Required policy |
| --- | --- | --- |
| `delivery_confirm`, `/api/logistics/delivery/confirm` equivalent action | Shipment readiness gate | Replace with `ConfirmDelivery` command that calls shipment gate. |
| `packing_create`, `packing_update` | Shipment readiness/OQC/NCR/hold checks | Replace with `ConfirmPacking` command. |
| `/api/runtime/*` POST/PUT/DELETE/transition for `sales_orders`, `job_orders`, `work_orders`, `inventory_transactions`, `ncr_records`, `capa_records`, `ap_invoices`, `purchase_receipts` | Domain command gates | Deny frontend and default-deny governed mutations. |
| `schema_studio_table_row_save` | Domain business gates | Admin-only data repair with reason/e-signature, never product workflow. |
| `master_data_delete` | Engineering release references may be incomplete | Keep dependency check but add release-freeze and e-signature. |
| `exception_transition` and direct exception update actions | Unified quality command gates | Migrate NCR/MRB/CAPA/SCAR to canonical commands. |

## Drift Detection Requirements

`mom/tools/audit_runtime_authority_consistency.php` currently fails with a fatal TypeError because `audit_domain()` calls `audit_collection($collection, $jsonRows, $pgRows)` instead of passing `$domain` first. Until fixed, no runtime drift report can be treated as reliable.

The fixed tool must:

- Compare JSON and PG counts and keyed rows for `master_data`, `orders`, `mes`, and `epicor`.
- Include BOM, routing, control plan, inspection plan, quality gate profile, traveler template, customer item approvals, supplier process approvals, warehouse locations, defect catalog, machine/operator/tool qualification.
- Fail CI on missing required collections, unkeyed governed collections, unknown status values, and runtime states not registered in workflow authority.

