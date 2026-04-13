# HESEM Backend World-Class Remediation Plan

Generated from direct runtime/code/schema/registry review on 2026-04-13. Scope is backend only: PHP API, services, controllers, database migrations, runtime JSON stores, registry/config, workflow contracts, sync tooling, and API safety. The current frontend is sample and is not assessed.

## Executive Summary

The backend is broad and ambitious, but today it is not yet a domain-driven ERP/MOM/MES/EQMS runtime. It is a hybrid of JSON-first dedicated services, PostgreSQL schema/projections, registry-generated Generic CRUD, workflow metadata, and several service islands. Many controls exist in schema, registry, or documentation but are not enforced by the runtime command path. Those controls must be classified as `schema-only/decorative control` until a dedicated command service enforces them inside a database transaction with idempotency, audit/evidence, and ledger postings.

The main architectural gap is authority fragmentation:

- Sales order, job order, work order, quote, NCR, CAPA, MRB, and SCAR states are split between PHP constants, JSON config, registry status sets, workflow-library states, database enums/checks, and runtime JSON values.
- Generic CRUD exposes mutation paths for business tables without domain invariants such as contract review, engineering readiness, inventory ledger posting, period close, quality hold, shipment block, IQC putaway block, 3-way match, or Part 11 e-signature.
- PostgreSQL has many canonical tables, but several first-class processes still write JSON as the primary store, while sync tools are incomplete or failing.
- Quality, finance, inventory, MES, and supplier quality have partial services, but important enforcement points are not closed-loop.

Target state: one command layer per business transaction, one status/workflow source generated into PHP/registry/OpenAPI/frontend options/DB constraints, PostgreSQL as the transactional authority for governed records, JSON only as cache/import/export where explicitly classified, and Generic CRUD limited to admin/read-only support surfaces.

## Runtime Mitigations Applied On 2026-04-13

These fixes reduce the most dangerous P0 bypasses, but they do not complete the target architecture because the canonical command layer, PostgreSQL transaction boundary, e-signature policy, ledger posting, and full migration authority are still required.

| Area | Runtime change | Remaining gap |
| --- | --- | --- |
| Generic CRUD governed mutations | `GenericCrudController` now rejects create/update/delete/transition for governed domains/tables with `409 domain_command_required` even for admin unless an internal backfill override env+header is present. | Command APIs and generated endpoint quarantine/OpenAPI policy are still required. |
| Quote conversion retry safety | `QuoteController::convertToSo()` now uses idempotency, and `QuoteService::convertToSalesOrder()` takes a file lock and repairs stale accepted/converted quote state by returning the already-created SO instead of creating a duplicate. | This is JSON-level atomicity mitigation; canonical `ConvertQuoteToSalesOrder` still needs one PostgreSQL transaction and unique `source_quote_id`. |
| Quote/SO/logistics counters | Quote/SO and logistics sequential numbers now use file locks around read-increment-write. | PostgreSQL sequences or `record_counters` row locks must become the command authority. |
| Idempotency replay ledger | PostgreSQL idempotency uses `scope_key_hash` for long scopes and refuses to reclaim `in_progress` rows automatically, including expired rows. | Real PostgreSQL CI coverage and operator stale-row recovery workflow remain required. |
| SO engineering readiness | `so_jo_wo_config.json`, `OrderWorkflowService`, and `OrderService::createJobOrder()` now include/enforce `engineering_ready`; transition to `engineering_ready` requires engineering release, BOM, routing, control plan, inspection plan references, and explicit released/approved/complete release status. | Release package validation still checks field presence/status only; canonical release must verify released master-data versions in PostgreSQL. |
| OQC fail containment | `LogisticsController::oqc_update` now ignores fake client `ncr_reference` on fail, creates/reuses an OQC-sourced JSONL NCR, writes the governed `ncr_reference`, and creates an active SO quality hold in `data/orders/holds.json`. | This is legacy JSON/JSONL containment, not canonical `ncr_records`/`quality_holds` in one PostgreSQL transaction. |
| Shipment bypass closure | `packing_update(status=shipped)` and `delivery_confirm` now call `ShipmentGateService::checkReadiness()` before writing shipment/delivery state. | `ConfirmPacking` and `ConfirmDelivery` command APIs must still own the transaction, audit, evidence, and SO state transition. |
| Shipment gate config drift | `ShipmentGateService` now normalizes config key `gate_items` into runtime `gates`. | Contract review, NCR/CAPA, and quality stores remain fragmented until canonical quality/order records exist. |
| Finance closed-period memo posting | `FinanceControlService::createMemo()` now checks closed period controls and consumes a matching approved backdate exception under the finance-control lock before writing AP/AR debit/credit memos, with rollback attempt if memo persistence fails. | Other posting paths still need the same central period policy in inventory/AP/AR/GL commands. |
| Supplier scorecard formula | `SupplierQualityService::calculateScorecard()` now includes rejected quantity/defect PPM, OTD evidence, SCAR count/open/overdue/severity penalty including still-open prior-period SCARs, supplier audit penalty, and ASL/cert expiry penalty. | Scorecard remains JSON primary and is not yet linked to PO approval/payment release gates or canonical receipt/IQC/COPQ ledgers. |
| Workflow result class collision | `OrderWorkflowService` now uses `OrderTransitionResult`, avoiding the fatal namespace collision with `WorkflowEngine::TransitionResult` when both workflow services load in one runtime. | Workflow result classes should still move to separate files/namespaces or shared value-object contracts during command framework cleanup. |
| Drift audit fatal | `mom/tools/audit_runtime_authority_consistency.php` now calls `audit_collection($domain, $collection, ...)` correctly and runs in current `JSON_ONLY` mode. | Coverage must expand to quality, supplier-quality, finance controls, status authority, and required master-data keys before cutover. |

## Current State Confirmed From Runtime

| Area | Current runtime finding | Classification | Immediate impact |
| --- | --- | --- | --- |
| Quote conversion | Runtime now has idempotency and a conversion lock that recovers an existing SO for stale accepted/converted quote state. | P0 mitigated in JSON runtime; command/PG transaction gap remains | Retry no longer duplicates through this service path, but DB unique constraint/transaction authority is still missing. |
| SO/JO/WO status | `engineering_ready` is now present in runtime SO config/service, JO/WO `cancelled` is now present in runtime config, but PHP/config/registry/workflow/DB still disagree on states such as `quoted`, `released`, `in_progress`, and WO `quality_hold`. | P0 documentation-runtime mismatch | Frontend/backend can still transition/report using wrong status vocabulary outside patched paths. |
| SO engineering readiness | Runtime SO transition to `engineering_ready` now requires release package fields plus explicit released/approved/complete release status, and JO creation requires SO `engineering_ready` or `in_production`. | P0 partial runtime enforcement; master-data authority gap remains | Production release is blocked on missing release package fields/status, but released BOM/routing/CP/IP versions are not yet transactionally verified. |
| JO/WO cancelled | Runtime constants/service/config support `cancelled`, but registry/workflow/DB generated artifacts are not unified. | P0 partially registered runtime state | Reporting and workflow registry cannot trust terminal state until generated authority is complete. |
| `wf_sales_order` | Workflow states use `draft, confirmed, engineering_ready, in_production, shipped, closed`; statusSet points to `sales_order_status_code` with different values. | P0 workflow mismatch | Generic transition validation can validate against the wrong vocabulary. |
| Shipment gate | Legacy `delivery_confirm` and `packing_update(status=shipped)` now call `ShipmentGateService`; SO transition gate also exists. | P0 bypass mitigated; command gap remains | Shipment route is now blocked by readiness failure, but no command transaction/evidence package owns shipment. |
| Shipment gate inputs | Gate now normalizes `gate_items` to `gates` and OQC-created holds use `so_number/status=active`; contract review and NCR/CAPA stores remain separate. | P0 partial fix; documentation-runtime mismatch remains | Gate can block OQC holds, but cannot prove all quality/contract evidence from one authority. |
| OQC fail | `LogisticsController::oqc_update` now sets `ncr_required`, rejects fake client NCR ownership by overwriting with governed OQC NCR, stores `ncr_reference`, and creates an active SO quality hold. | P0 partial runtime enforcement; canonical quality command gap | Failed OQC now blocks shipment via hold, but NCR/MRB/CAPA/COPQ are not canonical or transactional. |
| Material issue | MES/mobile can record time/inspection/consumption-like events; no enforced inventory transaction, stock balance, WIP ledger posting found on material issue. | P0 ledger gap | Inventory and WIP are not financially reliable. |
| Period close | `FinanceControlService` creates period close/backdate control records; debit/credit memo posting now checks closed periods and consumes approved exceptions under a lock. | P0 partial runtime enforcement | Inventory, AP invoice, AR invoice, GL, COPQ, and payment posting paths still need the same policy. |
| Master-data sync | JSON has BOM/routing/control plan/inspection plan; `DataLayer::loadRuntimeMasterDataFromPg()` omits these from PG rebuild. | P0 sync incompleteness | Runtime can lose engineering/quality readiness inputs during PG cutover. |
| Drift audit tool | Fatal TypeError fixed; tool now emits JSON report in current `JSON_ONLY` mode. | P0 fatal fixed; coverage gap remains | Report is runnable but not yet sufficient for governed cutover. |
| NCR/CAPA/MRB/SCAR stores | Exception JSON, supplier-quality JSON, quality JSONL, registry tables, and workflow library all store state independently. | P0 multi-authority quality | Quality gates cannot prove complete containment. |
| Auto NCR/CAPA/COPQ | `QualityIntegrationService` appends JSONL events, including unregistered states such as `open` and `pending_review`. | P1 orphan/unconsumed automation | Dashboards/gates do not consume quality triggers consistently. |
| Supplier scorecard | `SupplierQualityService::calculateScorecard()` now computes PPM, OTD, SCAR severity/count/open/overdue including still-open prior-period SCARs, audit, and ASL/cert risk. | P1 partial runtime enforcement | Scorecard still does not block PO/payment or consume canonical PG receipt/IQC/COPQ sources. |
| Purchasing/receiving/IQC/AP | PostgreSQL schema exists; no dedicated command engine found for PO receipt, IQC, putaway, AP invoice, 3-way match, payment. | P0 schema-only/decorative control | P2P cannot be runtime-safe. |
| Generic CRUD | 658 table-registry tables, 297 workflow-bound tables, generic REST/action mutations exist; governed create/update/delete/transition are now blocked by runtime guard. | P0 mitigation in code; registry/API policy gap remains | UI cannot use guarded governed mutations, but endpoint catalog/quarantine/OpenAPI still need generated deny markers. |
| Hard delete quarantine | `destructive-endpoint-quarantine.json` has `endpointCount: 0` despite many destructive routes. | P0 API policy gap | Builders/tools lack a machine-readable denylist. |
| E-signature | Audit/evidence hash chains exist; no unified e-signature service with re-auth, meaning, signer identity, record binding, and TOTP replay protection. | P0 Part 11 gap | Regulated approvals are not enforceable evidence. |
| Notification | Notification queues exist; no actual email sender found. Epicor outbox worker exists, but notification email queue is not dispatched. | P2 operational gap | Alerts may remain queued only. |
| MES/mobile | MTConnect poller has replay guard and JSON primary; OEE queues quality alert only. Mobile controller/service signatures mismatch for clock-out/offline/resolve conflict; inspection fail does not auto NCR. | P1 runtime bug + decorative control | MES data can fail or fail to gate quality. |
| DPP/trace | Product passport is JSON CRUD and trace by same lot/SO only. No enforced genealogy ledger or shipment auto-create. | P1 schema/service gap | Recall/DPP proof is incomplete. |

## Remediation Roadmap

### P0 - Stop Unsafe Mutation And Close Business Authority

| ID | Root cause | Target design | Files/modules affected | Migration/update requirement | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| P0-01 Status/workflow authority | Status vocabularies are manually duplicated. | Create one canonical workflow/status spec and generate PHP constants, `so_jo_wo_config.json`, `status-options.json`, `workflow-library.json`, OpenAPI enums, and DB checks. | `OrderService`, `OrderWorkflowService`, `QuoteService`, `workflow-library.json`, `status-options.json`, `so_jo_wo_config.json`, status migrations. | Data migration maps legacy states to canonical states and rejects unknown states. | No status exists in runtime that is missing from registry; no workflow references a statusSet with different states. |
| P0-02 Command layer | Generic CRUD and JSON services mutate business records directly. | Implement dedicated command APIs with DB transaction, idempotency key, row locks, domain gates, audit/evidence, and outbox. | New command services/controllers; deprecate Generic CRUD mutations for governed tables. | Use `idempotency_replay_ledger` with `scope_key_hash`, add `command_audit`, `domain_events`, `outbox_events`, generated OpenAPI. | Every P0 business mutation in `DOMAIN_COMMAND_SPEC.md` is executable only through command API. |
| P0-03 Atomic quote-to-SO | Quote, SO, customer PO, and status are separate writes. | `ConvertQuoteToSalesOrder` in one PostgreSQL transaction with unique converted quote constraint and idempotency. | `QuoteService`, `OrderService`, `CustomerPurchaseOrderService`, sales migrations. | Add unique index `sales_orders.source_quote_id`, quote `converted_sales_order_id`, command idempotency record. | Retrying after simulated crash returns same SO; no duplicate SO for one quote. |
| P0-04 Shipment gate closure | Gate is attached only to SO transition and reads mismatched evidence. | `ConfirmPacking`, `ConfirmDelivery`, and `ShipSalesOrder` all call one shipment readiness policy using canonical holds, OQC, NCR/CAPA/MRB, contract review, invoice/export/packing evidence. | `ShipmentGateService`, `LogisticsController`, `OrderWorkflowService`, quality/inventory stores. | Normalize hold table/store and gate config key (`gate_items` vs `gates`). | Delivery and packing fail if OQC failed, open NCR/hold exists, or contract review incomplete. |
| P0-05 OQC/IQC quality enforcement | Failures set flags only. | `RecordOqcResult`/`RecordIqcResult` auto-create NCR, apply hold/quarantine, block shipment/putaway, open CAPA trigger if threshold met. | `LogisticsController`, `SupplierController`, `ExceptionService`, `QualityIntegrationService`, quality migrations. | Add canonical `quality_holds`, `lot_status`, `ncr_records`, event links. | OQC/IQC fail immediately visible in NCR list, hold list, gate result, and dashboard. |
| P0-06 Inventory/WIP/finance ledger | MES/receiving events do not post ledgers. | `IssueMaterialToWorkOrder`, `ReceivePurchaseOrder`, `PutawayInventory`, `ApproveMrbDisposition`, scrap/rework commands post immutable inventory/WIP/cost ledgers and update balances. | Inventory/finance command services, `FinanceControlService`, migrations `009`, `077`, `083`, `088`. | Add posting-period check, stock balance constraints, WIP ledger linkage. | Stock cannot go negative unless approved; closed period blocks all postings. |
| P0-07 Period close enforcement | Period close is a standalone control record. | Every posting command calls `PeriodControlPolicy` before write; only approved unexpired backdate exception can override. | `FinanceControlService`, AP/inventory/GL command services. | Add `posting_date`, `period_code`, `ledger_scope` indexes and FK to exception/audit evidence. | Attempt to post into closed period returns deterministic error with audit evidence. |
| P0-08 Master-data sync | JSON/PG rebuild omits required readiness keys. | Master-data sync includes BOM, routing, control plan, inspection plan, quality gate profile, traveler, customer/supplier approvals, machine/operator qualifications. | `DataLayer`, `RuntimeShadowSync`, bootstrap/sync/audit tools. | Add mapping and reconciliation reports for every required collection. | Drift audit passes and reports counts/diffs for all readiness collections. |
| P0-09 Generic CRUD deny policy | Runtime exposes raw business mutation endpoints. | Default-deny mutation for governed domains; frontend allowed only process command APIs and read projections. | `GenericCrudController`, `runtime-access-policy.json`, endpoint catalog, destructive quarantine. | Populate quarantine/denylist and CI check. | Frontend contract test proves `/api/runtime/*` POST/PUT/DELETE/transition is blocked for governed tables. |
| P0-10 Part 11/evidence service | E-sign is fragmented or schema-only. | `CreateElectronicSignature` with password/MFA re-auth, signature meaning, reason, record hash, timestamp, signer identity, and immutable audit chain. | `WorkflowEngine`, `AuditTrail`, `EvidenceVaultService`, approval services, finance/quality commands. | Add `electronic_signatures` canonical table and hash-chain verification job. | Regulated command cannot complete without valid e-signature and re-auth event. |

### P1 - Close Process Depth And Automation

| ID | Remediation | Acceptance criteria |
| --- | --- | --- |
| P1-01 Supplier quality scorecard | Runtime formula now includes PPM, OTD, SCAR count/open/overdue/severity, audit findings/status, and ASL/cert expiry. Remaining acceptance: compute from canonical PO receipt/IQC/SCAR/audit/COPQ tables and block ASL/PO/payment release by policy. |
| P1-02 Quality automation ingestion | JSONL auto NCR/CAPA/COPQ becomes canonical records/events consumed by dashboards and gates; no unregistered runtime state remains. |
| P1-03 MES event spine | MTConnect/OPC-UA raw events stored immutably with source timestamp, quality code, adapter identity, replay key, and derived production events. |
| P1-04 Mobile MES hardening | Fix controller/service signature mismatches; inspection fail creates NCR/hold; offline sync has idempotency and conflict policy. |
| P1-05 DPP/traceability | Lot split/merge, genealogy, shipment, recall simulation, and DPP generation run from canonical trace ledger, not ad hoc passport JSON. |
| P1-06 Maintenance/calibration | Work order release and inspection commands check calibration/equipment/tool status. |
| P1-07 Notification delivery | Email/WebPush/SSE have real workers, retries, dead-letter, delivery evidence, and escalation. |

### P2 - Optimization, Analytics, And Hardening

| ID | Remediation | Acceptance criteria |
| --- | --- | --- |
| P2-01 OEE/energy aggregation | OEE/energy snapshots are derived from event spine with replay and quality-code filtering. |
| P2-02 Observability | Correlation ID flows through command, audit, outbox, evidence, and API response. |
| P2-03 Reporting projections | Dashboards read versioned projections with lineage from command events. |
| P2-04 OT security | Machine connectors use zone/conduit identity, credential rotation, TLS policy, and adapter allowlist. |

## P0 Implementation Package Closure

Each P0 item is implementable only when the package below is satisfied. This section exists to avoid leaving P0 as a backlog slogan.

| P0 | Root cause | Target design | Files/modules affected | Migration/update | API/command spec | Acceptance test | Rollback/compatibility note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-01 status/workflow authority | Manual status duplication across PHP/config/registry/workflow/DB. | One generated workflow-status authority. | `OrderService`, `OrderWorkflowService`, `QuoteService`, `so_jo_wo_config.json`, `status-options.json`, `workflow-library.json`, DB checks/OpenAPI. | Status mapping migration with unknown-state hold report. | Generated command transition guards. | WF-001..WF-008. | Keep legacy aliases read-only; reject unknown writes; rollback via pre-migration status snapshot. |
| P0-02 command layer | Direct business mutations through JSON services and Generic CRUD. | Dedicated transactional command framework. | New command controllers/services; `GenericCrudController`; OpenAPI. | Use `idempotency_replay_ledger` with `scope_key_hash`; add command/audit/outbox tables. | All commands in `DOMAIN_COMMAND_SPEC.md`. | FE-001..FE-006, IDEMP suite including expired `in_progress` and long scope keys. | Legacy endpoints remain read-only or 403/410 with replacement command links. |
| P0-03 quote-to-SO atomicity | Quote, SO, customer PO, and conversion status are separate writes. | One `ConvertQuoteToSalesOrder` transaction with unique source quote. | `QuoteService`, `OrderService`, `CustomerPurchaseOrderService`, sales DB tables. | Add `source_quote_id`, `converted_sales_order_id`, unique indexes. | `ConvertQuoteToSalesOrder`. | QTC-005, IDEMP-001. | Existing converted quotes imported with reconciliation; duplicate legacy SOs flagged, not deleted. |
| P0-04 shipment gate closure | Gate is only SO transition and reads mismatched evidence stores. | Gate policy called by packing, delivery, and SO shipment command. | `ShipmentGateService`, `LogisticsController`, `OrderWorkflowService`, quality/hold services. | Normalize hold records and gate config from `gate_items`; migrate contract review links. | `ConfirmPacking`, `ConfirmDelivery`. | BYPASS-001..BYPASS-003. | Legacy logistics endpoints disabled for mutation; historical deliveries imported as evidence. |
| P0-05 OQC/IQC quality enforcement | Failures create flags/JSON records but no canonical hold/NCR. | Fail commands auto-create NCR/hold/block. | `LogisticsController`, `SupplierController`, `ExceptionService`, `QualityIntegrationService`, quality DB. | Add canonical `quality_holds`, `quality_events`, linked NCR import. | `RecordOqcResult`, `RecordIqcResult`, `CreateNcrFromQualityFailure`. | QTC-016, QNC-001..QNC-003, P2P-005..P2P-007. | Legacy OQC/IQC JSON imported; unresolved fail rows start in hold state. |
| P0-06 inventory/WIP/finance ledger | Event capture is separate from inventory and WIP accounting. | Immutable inventory/WIP/cost ledger with balance update in command transaction. | Inventory/finance command services, migrations `009`, `077`, `083`, `088`, MES consumption. | Add ledger/balance constraints and reconciliation views. | `IssueMaterialToWorkOrder`, `ReceivePurchaseOrder`, `PutawayInventory`, `ApproveMrbDisposition`. | LEDGER-001..LEDGER-010. | Ledger migration runs from opening balance; legacy movements reconciled to adjustment entries. |
| P0-07 period close enforcement | Period close records are not called by posting paths. | Central `PeriodControlPolicy` in all posting commands. | `FinanceControlService`, AP/inventory/GL command services. | Add posting indexes and backdate usage table. | `CloseFinancePeriod`, posting commands. | FIN-001..FIN-007. | Pre-enforcement postings remain historical; new postings after feature flag require policy. |
| P0-08 master-data sync | PG rebuild omits readiness keys in JSON master data and supplier-quality shadow projections are still best-effort. | Complete JSON<->PG round-trip for readiness and supplier-quality collections. | `DataLayer`, `RuntimeShadowSync`, bootstrap/sync/audit tools, `SupplierQualityService`. | Add mapping for BOM/routing/CP/IP/traveler/gates/approvals and supplier-quality SCAR/ASL/audit/scorecard projections. | MDM sync jobs plus release commands. | PG-001..PG-012. | Keep JSON snapshot as import fallback until drift report passes. |
| P0-09 Generic CRUD deny policy | Runtime table mutations are exposed broadly. | Default-deny governed mutations; allow only commands. | `GenericCrudController`, `runtime-access-policy.json`, endpoint catalog/quarantine. | Populate deny/quarantine registry and CI tests. | Command APIs only. | FE-001..FE-006. | Admin data repair remains behind separate break-glass workflow with e-signature. |
| P0-10 Part 11/evidence service | Audit/evidence exists but e-signature is not central or replay-safe. | Re-authenticated signature service with record hash and audit chain. | `WorkflowEngine`, `AuditTrail`, `EvidenceVaultService`, auth/TOTP/session. | Add signature/replay guard tables and chain verifier. | `CreateElectronicSignature`. | SEC-001..SEC-008. | Existing approvals imported as legacy evidence, not upgraded to Part 11 signature without re-signing. |

## Domain Gap Matrix

| Domain | Runtime authority today | Dedicated service | Generic CRUD present | Major missing gate | Runtime-safe today |
| --- | --- | --- | --- | --- | --- |
| Sales/Quote/SO | JSON primary for quote/order, PG schema/projection also exists | Yes, JSON-level conversion and engineering mitigations now present | Yes | PostgreSQL quote conversion transaction, complete status unification, contract review binding | Partial/no |
| JO/WO/MES execution | JSON primary order store + mobile/MES JSON | Partial | Yes | release readiness, material ledger, operation completion, inspection plan | No |
| Inventory/WMS | Mostly PostgreSQL schema/generic | No complete command engine found | Yes | stock/WIP ledger, negative stock, period close | No |
| Purchasing/Receiving/IQC | PG schema + supplier-quality JSON | Partial supplier-quality only | Yes | receive/IQC/putaway/AP/3-way match | No |
| Supplier Quality/SCAR/ASL | Supplier-quality JSON + PG tables | Partial; scorecard formula now includes PPM/SCAR/audit/cert risk | Yes | SCAR/audit/cert risk must block ASL/PO/payment release from canonical tables | Partial/no |
| NCR/MRB/CAPA/COPQ/OQC | Multiple JSON, JSONL, PG tables | Partial fragmented | Yes | unified quality hold and canonical state | No |
| Finance/AP/AR/GL/period close | Finance controls JSON + PG schema | Partial finance controls; memo posting checks closed period | Yes | central policy across inventory/AP/AR/GL/COPQ/payment posting | Partial/no |
| Master Data/BOM/Routing/CP/IP | JSON has broad data, PG rebuild omits key readiness sets | Partial | Yes | complete sync and runtime release freeze | No |
| Traceability/Lot/Serial/Genealogy/DPP | DPP JSON + trace schema | Partial DPP | Yes | canonical genealogy, split/merge, recall | No |
| Maintenance/Calibration | PG schema + scheduled alert logic | Partial alerts | Yes | release gate for gage/equipment/tool validity | Partial/no |
| Machine Connectivity | MTConnect poller JSON primary, OEE JSONL | Partial | Yes | immutable raw stream, OPC-UA ingestion, quality-code enforcement | Partial/no |
| Notifications | JSON/PG notification queues | Partial | No sender found | dispatch worker, delivery evidence | No |
| Audit/Evidence/E-signature | Audit/evidence services exist; e-sign not unified | Partial | Yes | re-auth, signature meaning, record hash policy | No |
| Security/Auth/RBAC/Upload | Auth middleware, CSRF, upload hardening exist | Partial | N/A | absolute session lifetime, TOTP replay, SoD | Partial |

## Schema-Only vs Service-Backed Matrix

| Control/table family | Current classification | Required service-backed proof |
| --- | --- | --- |
| `inventory_ledger`, `wip_ledger`, `cost_ledger`, `stock_balances` | schema-only/decorative for MES material issue | `IssueMaterialToWorkOrder` posts ledger rows and balances in one transaction. |
| `purchase_receipts`, `ap_invoices`, 3-way match fields | schema-only/decorative | `ReceivePurchaseOrder`, `RecordIqcResult`, `PutawayInventory`, `PostApInvoice`, `RunThreeWayMatch`. |
| `ncr_records`, `capa_records`, `scar_records` | multi-authority | One quality command service owns state and writes records/events. |
| `electronic_signature` | schema-only/partial | `CreateElectronicSignature` service is mandatory for regulated transitions. |
| `bill_of_materials`, `bom`, `routing_library`, `control_plans`, `inspection_plans` | present but not enforced in SO/JO/WO release | Engineering readiness gate validates released versions before production release. |
| `mes_material_consumption` | schema/projection | Material issue command consumes stock and posts WIP. |
| `mes_oee_snapshots`, `mes_oee_loss_events` | partial OEE service | Event spine replay can regenerate OEE and reconcile with snapshots. |
| `dpp_passports`, `mes_part_genealogy` | partial/ad hoc | DPP auto-created from genealogy and shipment events. |
| `period_closes`, `backdate_exceptions` | partially service-backed; debit/credit memo posting enforces and consumes exceptions, other postings still decorative | Period policy is called by every posting command. |

## Generic CRUD Exposure Risk

Generic CRUD is useful for admin/projection maintenance but must not be treated as business logic. It validates table metadata, status sets, idempotency, optimistic concurrency, and some delete policy, but it does not enforce domain invariants.

Frontend policy:

- Block all frontend mutation to `/api/runtime/{domain}/{table}`, `{domain}.{table}.create`, `{domain}.{table}.update`, `{domain}.{table}.delete`, and `{domain}.{table}.transition` for governed domains.
- Allow read-only projections only after table-level owner review and contract classification.
- Block all destructive legacy/admin endpoints from product UI unless an admin-only console with explicit permission, CSRF, correlation ID, audit, and break-glass reason is used.
- Any command that changes business state must require `Idempotency-Key`, `X-Correlation-Id`, permission, audit, and deterministic error contract.

## Benchmark Alignment

| Benchmark | Required target | Current gap |
| --- | --- | --- |
| ISA-95 / IEC 62264 | Separate ERP Level 4 planning/finance from MOM/MES Level 3 execution with governed transactions and integration events. | JSON runtime and generic CRUD mix Level 3/4 records without command ownership. |
| MESA Smart Manufacturing | Connected operations, closed-loop quality, production, maintenance, and supply chain. | OQC/IQC, MES, supplier, inventory, finance loops are not closed. |
| FDA 21 CFR Part 11 | Audit trail, authority checks, e-signature, record integrity, re-authentication. | Audit/evidence partial; e-signature not unified; TOTP replay and absolute lifetime missing. |
| FDA QMSR / ISO 13485 | CAPA, supplier controls, process validation, traceable records. | CAPA/SCAR/supplier scorecards fragmented; validation evidence decorative. |
| AS9100 / IATF 16949 | Contract review, traceability, nonconformance, supplier quality, production control. | Contract review not bound to SO gate; traceability/genealogy incomplete. |
| NIST SP 800-82 / ISA/IEC 62443 | OT zones/conduits, machine identity, event integrity. | Machine adapter identity exists; zone/conduit and immutable raw stream incomplete. |
| OPC UA / MTConnect | Source timestamp, quality code, immutable raw event stream. | MTConnect parser stores latest signal; raw immutable stream and quality codes incomplete. |
| ERP best practice | Period close, inventory/WIP ledger, 3-way match, approval segregation. | Closed-period policy is enforced only for AP/AR memos; inventory/AP invoice/AR invoice/GL/payment/P2P remain schema-heavy. |

## Acceptance Criteria

P0 is complete only when every row in the P0 roadmap has:

- Root cause recorded.
- Target design recorded.
- Files/modules affected recorded.
- Migration/update requirement recorded.
- API/command spec recorded.
- Acceptance tests recorded in `END_TO_END_SIMULATION_TEST_PLAN.md`.
- Rollback/compatibility note recorded.
- CI gate proving Generic CRUD cannot mutate governed business tables from frontend contracts.

No domain may be described as complete unless it has a dedicated service-backed command path, enforced gates, transaction boundary, idempotency, audit/evidence, and tests that simulate retry, race, and bypass attempts.
