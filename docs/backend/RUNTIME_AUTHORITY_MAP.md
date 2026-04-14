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

## Runtime Mitigations Applied On 2026-04-13

| Control | Runtime status now | Authority note |
| --- | --- | --- |
| Governed Generic CRUD mutation | `GenericCrudController` blocks create/update/delete/transition for governed domains and high-risk tables with `409 domain_command_required`; internal backfill requires `HESEM_ALLOW_GOVERNED_GENERIC_MUTATION` and `X-HESEM-Internal-Generic-Override: domain-command-backfill`. | This is a safety guard, not a replacement for command APIs. |
| Quote conversion retry safety | `QuoteController::convertToSo()` applies idempotency, and `QuoteService::convertToSalesOrder()` serializes conversion with a lock and returns an already-created SO when quote state is stale. | JSON runtime is safer, but PostgreSQL `ConvertQuoteToSalesOrder` remains the target authority. |
| Quote/SO/logistics counters | Quote/SO and logistics document counters now use file locks around read-increment-write. | Still compatibility-only; command APIs must use PostgreSQL sequence or `record_counters` row locks. |
| Idempotency replay authority | PostgreSQL idempotency ledger now uses `scope_key_hash` for long scopes and rejects both active and expired `in_progress` rows instead of reclaiming them. | Command framework must expose monitored stale-row recovery; automatic retry must not double-execute side effects. |
| SO engineering readiness | Runtime SO config includes `engineering_ready`; `OrderWorkflowService` requires release package fields plus explicit released/approved/complete `engineering_release_status` before transition; `OrderService::createJobOrder()` blocks confirmed-only SOs. | This converts the former orphan state into a partial runtime gate; canonical release must still verify released master-data rows. |
| SO workflow/status authority | `mom/contracts/table-registry.json` now points SO header tables using `wf_sales_order` to `sales_order_status_runtime`; SO line support tables no longer inherit the header workflow; migrations `115` and `116` migrate old aliases and add DB checks; `WorkflowStatusAuthorityService` and `check_workflow_status_authority.php` fail promotion on stale `sales_order_status`/`sales_order_status_code` references. | This closes the `wf_sales_order` P0 drift. Broader all-domain status generation remains hardening, not a live SO P0. |
| JO/WO workflow/status authority | `job_orders` now references `job_order_status_runtime` for `wf_job_order`; production `work_orders` and singular MES `work_order` now reference `work_order_status_runtime` for `wf_work_order_execution`; migrations `117`-`120` add JO/WO runtime status constraints and alias mapping. | This closes the order-hierarchy workflow/status P0 drift for SO, JO, production WO, and the singular MES WO spine. Service/maintenance WO remains a separate lifecycle. |
| Shipment gate on legacy logistics routes | `LogisticsController` calls `ShipmentGateService` before `delivery_confirm` and before `packing_update` can set `status=shipped`. | Legacy routes are still compatibility surfaces; final authority must be `ConfirmPacking` and `ConfirmDelivery`. |
| OQC failure containment | `oqc_update(result=fail)` ignores client-supplied fake `ncr_reference`, creates/reuses an OQC-sourced JSONL NCR, writes the governed NCR reference, and creates an active order quality hold that shipment gate reads. | This closes the immediate shipment bypass but remains JSON/JSONL multi-authority until canonical quality commands exist. |
| Shipment gate config | Runtime accepts `gate_items` by normalizing it into `gates`. | Removes one documentation-runtime mismatch, while contract review/NCR/CAPA store fragmentation remains. |
| Finance closed-period memo posting | Debit/credit memo creation now rejects closed AP/AR periods unless a matching approved backdate exception is supplied; period check, exception consume, and memo write run under a finance-control lock with rollback attempt if memo persistence fails. | Other posting domains must reuse the same policy. |
| Supplier scorecard formula | Scorecard calculation now includes PPM, OTD, SCAR severity/open/overdue including still-open prior-period SCARs, supplier audit, and ASL/cert expiry risk. | Scorecard is still JSON primary and does not yet own ASL/PO/payment release decisions. |
| Workflow result class collision | `OrderWorkflowService` no longer declares the same `MOM\Services\TransitionResult` class as `WorkflowEngine`; the order service result is now `OrderTransitionResult`. | Removes a runtime fatal; target command framework should publish typed results from dedicated files. |
| Runtime drift audit | Fatal call signature mismatch is fixed and the tool runs in `JSON_ONLY` mode. | Coverage must expand before any PostgreSQL cutover decision. |

## Current Runtime Authority Table

| Domain | Tables/stores | Primary runtime store now | Controller/service | Generic or dedicated | Workflow ID/status set | Existing gate | Missing gate | Runtime-safe | Frontend direct use | Direct-use risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sales/Quote/SO | JSON `data/quotes/quotes.json`, `data/orders/orders.json`, `data/orders/reviews/*.json`; PG `quotes`, `sales_orders`, `sales_order`, `sales_order_lines`, `customer_purchase_orders` | JSON primary + PG schema/shadow | `QuoteController/QuoteService`, `OrderController/OrderService/OrderWorkflowService`, `CustomerPurchaseOrderService` | Dedicated JSON plus Generic CRUD mutation guard | `wf_quote_lifecycle`, `wf_sales_order`; runtime quote statuses differ from registry; SO workflow/status authority is aligned to `sales_order_status_runtime` | Quote transition role guards; quote conversion idempotency/lock; SO transition guards; engineering readiness package-field gate; JO creation requires SO `engineering_ready`/`in_production`; shipment gate now called by legacy delivery/packing ship actions | PostgreSQL conversion transaction, all-domain status generation, contract review binding, canonical shipment command | Partial/no | Only future process APIs; current dedicated reads with caution; no generic mutation | Quote/status generator debt, incomplete contract/engineering evidence, shipment evidence not transactional |
| Job Order/Work Order/MES execution | JSON orders `job_orders/work_orders`; PG `job_orders`, `work_order`, `work_orders`, `job_operations`, `mes_operation_execution`, mobile JSON stores | JSON primary + PG projections | `OrderController`, `OrderService`, `OrderWorkflowService`, `MobileController/MobileWorkQueueService`, MES services | Dedicated partial plus Generic CRUD | `wf_job_order` uses `job_order_status_runtime`; `wf_work_order_execution` uses `work_order_status_runtime` for `work_orders` and `work_order`; service WO lifecycle remains separate | Role transition guards; limited WO completion qty check; workflow/status authority gate | JO release readiness, WO routing/control plan/traveler, material availability, calibration/tooling/operator qualification, operation command | Partial/no | No direct generic; future `Create/Release/Complete` commands only | Start/complete work without readiness, ledger or inspection proof |
| Inventory/WMS | PG `inventory_transactions`, `inventory_ledger`, `stock_balances`, `location_balance`, `container`, WMS tables; possible JSON projections | Mostly PG schema/generic | No complete dedicated inventory command service found | Generic CRUD/schema-heavy | Many registry workflows; not bound to business posting commands | Registry status validation only | Receipt/issue/putaway/scrap/rework postings, stock balance, WIP, valuation, period close | No | No | Inventory can be written without ledger or period controls |
| Purchasing/Receiving/IQC | PG `purchase_orders`, `purchase_order_lines`, `purchase_receipts`, `purchase_receipt_lines`, `ap_invoices`, `ap_invoice_lines`; JSON supplier incoming | PG schema + supplier-quality JSON | `SupplierController/SupplierQualityService`, finance controls | Partial dedicated supplier-quality; P2P generic/schema-heavy | PO/AP/IQC workflow metadata exists in registry | SCAR transition checks; incoming inspection record | ASL approval in PO, receive transaction, IQC hold/block, putaway, AP invoice, 3-way match, payment | No | No | Accept/reject/putaway/AP can bypass match and quality gates |
| Supplier Quality/SCAR/ASL | JSON `data/supplier-quality/*.json`; PG `scar_records`, `approved_supplier_list`, supplier scorecard tables | JSON primary for service | `SupplierController/SupplierQualityService` | Dedicated partial plus Generic CRUD | `wf_scar_record`, ASL workflows; JSON SCAR state separate | SCAR 8D transition fields; scorecard now includes PPM, OTD, SCAR severity/open/overdue, audit, ASL/cert risk | ASL block on SCAR/audit/cert, PO/payment block, canonical PG receipt/IQC/SCAR/COPQ sources | Partial/no | Dedicated supplier APIs read/create only until command policy; no generic | Supplier score can be more accurate, but procurement can still ignore it without command gates |
| NCR/MRB/CAPA/COPQ/OQC | JSON `data/exceptions/*.json`, `data/logistics/oqc.json`, JSONL `data/quality/*`, PG `ncr_records`, `capa_records`, `mrb`, `oqc_inspections`, COPQ tables | Multiple JSON authorities + PG schema | `ExceptionController/ExceptionService`, `LogisticsController`, `QualityIntegrationService`, `CopqEngine` | Dedicated fragmented plus Generic CRUD mutation guard | `wf_ncr`, `wf_capa`, MRB/SCAR workflows; JSONL uses unregistered states | Exception transitions; OQC fail now creates legacy JSONL NCR + active SO hold; shipment gate blocks active holds | Canonical NCR/hold table, MRB disposition ledger, CAPA trigger/effectiveness, COPQ posting, IQC putaway block | Partial/no | No | Legacy OQC fail blocks shipment, but dashboards/MRB/CAPA/COPQ can still miss records |
| Finance/AP/AR/GL/period close | JSON finance controls; PG finance/AP/AR/GL/valuation tables | JSON controls + PG schema | `FinanceController/FinanceControlService` | Dedicated controls; posting generic/schema-heavy | Finance workflows in registry | Idempotency for finance control records; debit/credit memo posting checks closed period and consumes approved backdate exception | Posting policy for inventory/AP invoice/AR invoice/GL/COPQ/payment, 3-way match, payment approval, SoD | Partial/no | Finance control APIs only for admin; no generic posting | Memo path is guarded, but most postings can still bypass closed periods |
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
| Transaction and idempotency | Command framework | PostgreSQL `idempotency_replay_ledger`, transaction envelope, deterministic replay response | Platform backend |
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
| SO | Runtime/config includes `engineering_ready`; registry now exposes `sales_order_status_runtime` for SO workflow tables. Old `sales_order_status` and `sales_order_status_code` are legacy aliases only. | Closed for SO by contract update, migrations `115`/`116`, and workflow-status authority release gate. |
| `wf_sales_order` | Header tables now reference `sales_order_status_runtime`; support line tables no longer inherit the header workflow. | Closed. Promotion fails if stale `sales_order_status` or `sales_order_status_code` references return. |
| JO | Runtime config/service supports `planned, released, active, on_hold, completed, closed, cancelled`; registry workflow now uses `job_order_status_runtime`; DB constrained by `117`/`118`. | Closed for JO. Full generator/OpenAPI output remains hardening. |
| WO | Runtime config/service supports `scheduled, setup, running, inspection, completed, on_hold, cancelled`; production `work_orders` and singular MES `work_order` now use `work_order_status_runtime`; service/maintenance WO remains separate. | Closed for production WO by `119` and singular MES WO by `120`; completed WOs still require reversal/rework/MRB correction in command layer. |
| NCR | Registry has `draft/submitted/...`; JSONL auto NCR uses `open`. | Map `open` to `submitted` or `containment_active`; reject unregistered states. |
| CAPA | Registry has `draft/initiated/action_planning/...`; JSONL trigger uses `pending_review`. | Add formal trigger state or map to `initiated`. |
| OQC/IQC | OQC result status and logistics result strings are not a command-owned quality state. | `RecordOqcResult` and `RecordIqcResult` own the result and linked hold/NCR state. |

## Orphan And Unregistered State List

| State | Location | Classification |
| --- | --- | --- |
| `engineering_ready` | Runtime SO config/service and registry/workflow SO | partially enforced runtime state; still requires canonical generated status authority and released master-data validation |
| `cancelled` JO/WO | Runtime constants, `so_jo_wo_config.json`, table registry workflow status sets, and DB constraints | closed for order-hierarchy workflows; all-domain generator still required |
| `open` NCR | Quality JSONL auto NCR | unregistered runtime state |
| `pending_review` CAPA trigger | Quality JSONL auto CAPA trigger | unregistered runtime state |
| `quality_hold` WO | Legacy production WO alias mapped to `on_hold` by migration `119` | deprecated compatibility alias, not production workflow authority |
| `released/in_progress/completed` SO status code | Legacy alias values migrated by `115`/`116` | deprecated compatibility alias, not workflow authority |

## Duplicate/Singular-Plural Table Conflicts

The registry currently contains 658 tables and at least these conflicting pairs. Each pair must be assigned one canonical authority and one compatibility/deprecated mapping.

| Pair | Required decision |
| --- | --- |
| `sales_order` / `sales_orders` | Canonicalize sales order header; map legacy singular/plural. |
| `sales_order_line` / `sales_order_lines` | Canonicalize line item table and FK. |
| `work_order` / `work_orders` | Both are aligned to `work_order_status_runtime`; future consolidation should pick one canonical table and one compatibility projection. |
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
| `delivery_confirm`, `/api/logistics/delivery/confirm` equivalent action | Shipment readiness gate | P0 runtime guard now calls shipment readiness; replace with `ConfirmDelivery` command for transaction/evidence authority. |
| `packing_create`, `packing_update` | Shipment readiness/OQC/NCR/hold checks | `packing_update(status=shipped)` now calls shipment readiness; replace with `ConfirmPacking` command and keep `packing_create` non-shipping. |
| `/api/runtime/*` POST/PUT/DELETE/transition for `sales_orders`, `job_orders`, `work_orders`, `inventory_transactions`, `ncr_records`, `capa_records`, `ap_invoices`, `purchase_receipts` | Domain command gates | Runtime now returns `409 domain_command_required` for governed mutation; keep frontend deny and generate OpenAPI/quarantine markers. |
| `schema_studio_table_row_save` | Domain business gates | Admin-only data repair with reason/e-signature, never product workflow. |
| `master_data_delete` | Engineering release references may be incomplete | Keep dependency check but add release-freeze and e-signature. |
| `exception_transition` and direct exception update actions | Unified quality command gates | Migrate NCR/MRB/CAPA/SCAR to canonical commands. |

## Drift Detection Requirements

`mom/tools/audit_runtime_authority_consistency.php` no longer fatals on the `audit_collection()` call signature and can produce a JSON report in the current `JSON_ONLY` environment. The report is still not a cutover authority because it does not yet cover every governed quality, finance, status, supplier-quality, and master-data readiness collection.

The fixed tool must:

- Compare JSON and PG counts and keyed rows for `master_data`, `orders`, `mes`, and `epicor`.
- Include BOM, routing, control plan, inspection plan, quality gate profile, traveler template, customer item approvals, supplier process approvals, warehouse locations, defect catalog, machine/operator/tool qualification.
- Fail CI on missing required collections, unkeyed governed collections, unknown status values, and runtime states not registered in workflow authority.
