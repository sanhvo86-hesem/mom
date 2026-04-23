# End-To-End Simulation Test Plan

This plan records workflow simulations from code/schema/API review and defines tests needed to prove remediation. Simulations do not require frontend. Existing endpoint names are current runtime surfaces where found; target command APIs are the replacement contract.

## Simulation Row Contract

Every implementation test derived from this plan must record:

- API/endpoint or target command.
- Table/store written.
- Workflow state before/after.
- Gate checked.
- Whether the gate is enforced or decorative.
- Transaction and idempotency behavior.
- Audit/evidence behavior.
- Mismatch found.
- Documentation/spec section updated.
- Regression test ID.

The tables below are the reviewed baseline. Implementation tickets must expand each row into executable API/DB tests using this contract.

## Runtime Mitigation Evidence Added On 2026-04-13

| Evidence | Verified behavior | Remaining simulation requirement |
| --- | --- | --- |
| `GenericCrudControllerRuntimeSafetyTest` | Governed Generic CRUD mutation is rejected with `409 domain_command_required` even for admin; read remains allowed; internal override requires env+header. | Replace legacy mutation surfaces with command APIs and generated OpenAPI deny markers. |
| `LogisticsControllerQualityGateTest` | OQC fail creates a legacy JSONL NCR and active SO hold; shipment gate config accepts `gate_items` by normalizing to `gates`. | Move OQC/NCR/hold to canonical PostgreSQL command transaction and dashboard projection. |
| `QuoteServiceConversionTest` | Quote conversion retry returns the same SO and repairs stale accepted/converted quote state instead of creating duplicates. | Move conversion to PostgreSQL transaction with unique `source_quote_id` and command idempotency table. |
| Quote/logistics counter lock review | Quote/SO and logistics document counters are now protected by file locks around read-increment-write. | Replace JSON counters with PostgreSQL sequence/`record_counters` row lock tests. |
| `OrderWorkflowEngineeringReadinessTest` / `OrderServiceEngineeringGateTest` | SO transition to `engineering_ready` requires release package fields and explicit released/approved/complete release status; JO creation rejects confirmed-only SO; completed JO/WO cannot be directly cancelled. | Replace field-presence checks with released BOM/routing/control plan/inspection plan version locks and generated transition authority. |
| `FinanceControlServicePeriodPolicyTest` | AP/AR memo posting into a closed period fails unless a matching approved backdate exception is supplied and consumed. | Apply the same period policy to every inventory/AP/AR/GL/COPQ/payment posting command. |
| `SupplierQualityServiceScorecardTest` | Supplier scorecard includes PPM, OTD, SCAR severity/open/overdue including still-open prior-period SCARs, supplier audit, and ASL/cert expiry risk. | Compute scorecard from canonical PO receipt/IQC/SCAR/audit/cert/COPQ tables and enforce supplier release gates. |
| `IdempotencyServiceTest` | PostgreSQL replay ledger rejects conflicting fingerprints, rejects active and expired `in_progress`, preserves non-reexecution after completion persist failure, and supports scope keys over 255 chars through `scope_key_hash`. | Run real PostgreSQL integration in CI and add operator recovery workflow for stale `in_progress` rows. |
| `WorkflowEngineEventBusTest` plus full suite load order | `OrderWorkflowService` and `WorkflowEngine` can now load in the same PHP process without redeclaring `MOM\Services\TransitionResult`. | Move result DTOs to explicit files/namespaces when command framework is introduced. |
| Backend smoke | Registry manifest now registers governance wave assets required by smoke tests. | Keep registry manifest generated from source artifacts and fail CI on missing entries. |
| Runtime authority audit | Drift tool now runs without fatal error in `JSON_ONLY` mode. | Expand drift coverage to quality, supplier-quality, finance controls, status authority, and readiness master data. |

## Simulation A - Quote To Cash

| Step | Current API/endpoint | Current store/table | Current gate | Enforced or decorative | Transaction/idempotency | Audit/evidence | Mismatch/remediation | Test ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create quote | `quote_create`, `/api/quotes` | `data/quotes/quotes.json`, PG schema exists | Role permission | Partial | No command transaction | Controller audit only | Move to command-backed quote create or read-only legacy | QTC-001 |
| Internal review | `quote_transition` | quote JSON | Runtime transition | Partial | No command idempotency | Audit log | Registry uses `review`, runtime uses `internal_review` | QTC-002 |
| Send quote | `quote_transition` | quote JSON | Runtime transition | Partial | No command idempotency | Audit log | Align status source | QTC-003 |
| Accept quote | `quote_transition` | quote JSON | Runtime transition | Partial | No command idempotency | Audit log | Registry `won` vs runtime `accepted` | QTC-004 |
| Convert quote to SO | `quote_convert_to_so`, `/api/quotes/{id}/convert` | quote JSON, orders JSON, customer PO JSON | Quote must be accepted | JSON-level retry mitigation | Idempotency + conversion lock; no DB transaction | Partial audit | Implement `ConvertQuoteToSalesOrder` with unique source quote | QTC-005 |
| Link customer PO | conversion/customer PO service | customer PO JSON | PO status partial | Partial | Separate write | Partial | Include in conversion transaction | QTC-006 |
| Contract review | `order_contract_review` | `data/orders/reviews/{SO}.json` | Separate checklist | Decorative for shipment gate | No SO transaction | Audit log | Gate expects embedded SO `contract_review` | QTC-007 |
| Confirm SO | `order_transition` to `confirmed` or update | orders JSON | Role transition | Partial | No idempotency | Order transition hash-chain | Must require contract review + PO | QTC-008 |
| Engineering readiness | SO transition to `engineering_ready` | orders JSON + release package fields | Engineering release/BOM/routing/CP/IP fields required | Partial runtime enforcement | No DB transaction | Hash-chain order transition audit | Implement `ReleaseSalesOrderToProduction` with released master-data version locks | QTC-009 |
| Create JO | `order_jo_create`, `/api/orders/jobs` | orders JSON | Parent SO must be `engineering_ready` or `in_production` | Partial runtime enforcement | No transaction | Audit log | Add release package snapshot and PG transaction | QTC-010 |
| Create WO | `order_wo_create`, `/api/orders/work` | orders JSON | Parent JO exists only | Incomplete | No transaction | Audit log | Must require JO released and routing operation | QTC-011 |
| Release WO | `order_transition` | orders JSON | Role transition | Partial | No idempotency | Hash-chain | Must check material/tool/gage/operator/NC program | QTC-012 |
| Issue material | Generic/MES stores possible | `mes_material_consumption`, inventory schema | None found | Decorative | Not transactional | Not sufficient | Implement `IssueMaterialToWorkOrder` | QTC-013 |
| Start operation | mobile clock-in/start task | mobile JSON | Assigned operator only partial | Partial | No command idempotency | Audit log | Mobile signature mismatch for clock-out path discovered | QTC-014 |
| Complete operation | mobile complete/clock-out | mobile JSON/orders maybe | Qty checks partial | Decorative for ledger/quality | No transaction | Audit log | Implement `CompleteOperation` with WIP/inspection | QTC-015 |
| OQC | `oqc_create`, `oqc_update` | `data/logistics/oqc.json`, `data/quality/ncr/ncr_log.jsonl`, `data/orders/holds.json` | Result fail creates legacy NCR/hold | Partial runtime mitigation | No DB transaction or command idempotency | Audit log + JSONL/hold evidence | Implement canonical `RecordOqcResult` auto NCR/hold in one transaction | QTC-016 |
| Pack | `packing_create/update` | `data/logistics/packing.json` | `packing_update(status=shipped)` calls shipment gate | Partial runtime mitigation | No command transaction | Audit log | Implement `ConfirmPacking` gate/evidence transaction | QTC-017 |
| Ship | `delivery_confirm` or SO transition | logistics JSON/orders JSON | `delivery_confirm` and SO ship path call shipment gate | Partial runtime mitigation | No command transaction | Audit log | Implement `ConfirmDelivery` gate/evidence/SO transition | QTC-018 |
| Invoice | Finance/AP/AR schema/generic | finance schema | Period close not enforced | Decorative | No posting engine | Partial | Add AR invoice/posting command | QTC-019 |
| Close SO | order transition | orders JSON | Role only | Partial | No | Hash-chain | Require shipment/invoice/no open quality/ledger recon | QTC-020 |

Negative tests:

- QTC-N01: retry conversion after simulated crash between SO create and quote update returns same SO, no duplicate. Covered by `QuoteServiceConversionTest`; repeat at API/DB command level.
- QTC-N02: SO confirmed cannot create JO until `engineering_ready`. Covered by `OrderServiceEngineeringGateTest`; repeat at API/DB command level.
- QTC-N03: `delivery_confirm` with failed OQC is rejected.
- QTC-N04: `/api/runtime/sales/sales_orders` mutation rejected for frontend role.
- QTC-N05: `oqc_update(result=fail, ncr_reference="FAKE")` overwrites the client-supplied reference with the governed OQC NCR and creates an active hold.

### Quote To Cash Target State Before/After

| Command | Before | After | Mandatory gate |
| --- | --- | --- | --- |
| `ConvertQuoteToSalesOrder` | Quote `accepted` | Quote `converted`, SO `draft`, customer PO linked | unique source quote, idempotency |
| `ConfirmSalesOrder` | SO `draft/quoted` | SO `confirmed` | contract review + customer PO |
| `ReleaseSalesOrderToProduction` | SO `confirmed` | SO `engineering_ready` | released BOM/routing/control plan/inspection plan |
| `CreateJobOrder` | SO `engineering_ready` | JO `planned` | release package snapshot |
| `ReleaseJobOrder` | JO `planned` | JO `released` | material/routing readiness |
| `CreateWorkOrder` | JO `released` | WO `scheduled` | route operation exists |
| `ReleaseWorkOrder` | WO `scheduled` | WO `setup/running` | machine/tool/gage/operator/NC release |
| `IssueMaterialToWorkOrder` | lot `available`, WO released | inventory issued, WIP debited | stock, lot hold, period open |
| `CompleteOperation` | WO `running/setup` | WO `inspection/completed` | inspection/material/WIP reconciliation |
| `RecordOqcResult` pass | OQC `pending` | OQC `accepted` | plan and inspector qualification |
| `RecordOqcResult` fail | OQC `pending` | OQC `rejected`, NCR/hold active | auto NCR/hold |
| `ConfirmPacking` | SO in production, OQC accepted | packing `confirmed` | no open quality hold |
| `ConfirmDelivery` | packing `confirmed` | SO `shipped` | shipment readiness gate |

## Simulation B - Procure To Pay

| Step | Current API/endpoint | Current store/table | Gate | Enforced/decorative | Remediation | Test ID |
| --- | --- | --- | --- | --- | --- | --- |
| Create supplier | supplier/master data endpoints/generic | supplier JSON/PG vendors | Role | Partial | MDM command/approval | P2P-001 |
| ASL approval | supplier ASL endpoints/PG `approved_supplier_list` | JSON/PG | ASL status | Partial | ASL command blocks PO if not approved | P2P-002 |
| Create PO | Generic/schema | `purchase_orders` | None found | Decorative | `CreatePurchaseOrder` or approved PO command | P2P-003 |
| Receive goods | Generic/schema | `purchase_receipts` | None found | Decorative | `ReceivePurchaseOrder` | P2P-004 |
| IQC | supplier incoming inspection JSON | `incoming.json`, IQC schema | Result only | Decorative for inventory | `RecordIqcResult` | P2P-005 |
| Reject/accept lot | supplier incoming status | JSON | Not linked to lot availability | Decorative | Lot status/quality hold command | P2P-006 |
| Putaway | Generic/schema | WMS/inventory tables | None found | Decorative | `PutawayInventory` blocks failed IQC | P2P-007 |
| AP invoice | Finance/generic | `ap_invoices` | Period not enforced | Decorative | `PostApInvoice` | P2P-008 |
| 3-way match | Schema fields | AP/PO/receipt tables | None found | Decorative | `RunThreeWayMatch` | P2P-009 |
| Payment | Schema/generic | finance tables | SoD/period missing | Decorative | `PostPayment` | P2P-010 |
| Scorecard | supplier scorecard API/service | supplier-quality JSON | PPM/OTD/SCAR/audit/ASL/cert formula now enforced in JSON service | Partial runtime enforcement | Canonical scorecard projection and supplier release gates | P2P-011 |

Negative tests:

- P2P-N01: PO creation fails for blocked/unapproved supplier.
- P2P-N02: Putaway fails for rejected IQC lot.
- P2P-N03: AP invoice post fails in closed period.
- P2P-N04: 3-way match over tolerance creates dispute and blocks payment.
- P2P-N05: severe/open/overdue SCAR or expired cert lowers scorecard and blocks new PO approval by supplier policy.

### Procure To Pay Target State Before/After

| Command | Before | After | Mandatory gate |
| --- | --- | --- | --- |
| `ReceivePurchaseOrder` | PO approved/open | receipt posted, lot `pending_iqc` | supplier ASL, PO open, period open |
| `RecordIqcResult` pass | lot `pending_iqc` | lot `iqc_accepted` | released inspection plan |
| `RecordIqcResult` fail | lot `pending_iqc` | lot `quality_hold/rejected`, NCR/SCAR created | containment |
| `PutawayInventory` | lot `iqc_accepted` | lot `available`, stock balance updated | no hold, period open |
| `PostApInvoice` | invoice received | AP invoice `posted` | period open/backdate exception |
| `RunThreeWayMatch` | AP invoice `posted` | `matched` or `disputed` | PO/receipt/invoice tolerance |
| `PostPayment` | AP invoice `matched` | payment posted | SoD, approval, period open |

## Simulation C - Quality Nonconformance

| Step | Current API/endpoint | Current store/table | Gate | Current issue | Target command/test |
| --- | --- | --- | --- | --- | --- |
| OQC fail | `oqc_update` | logistics OQC JSON + quality JSONL + holds JSON | Legacy NCR/hold | Not canonical, not transactional | QNC-001 `RecordOqcResult` creates canonical NCR/hold |
| NCR creation | exception/quality JSONL/generic | exceptions JSON, quality JSONL, `ncr_records` | Multiple | Multi-authority | QNC-002 canonical NCR |
| Containment/quarantine | `ExceptionService::quarantineOnNcr()` exists | holds JSON | Not auto-called | Store shape mismatch | QNC-003 auto hold canonical |
| MRB disposition | exception MRB | exceptions JSON | Partial transitions | No ledger | QNC-004 `ApproveMrbDisposition` posts ledger |
| Rework/scrap/use-as-is/RTS | MRB JSON fields | exceptions/inventory schema | None | Decorative | QNC-005 disposition-specific postings |
| CAPA trigger | quality JSONL | `auto_capa_triggers.jsonl` | Queue only | Not canonical | QNC-006 `CreateCapaFromTrigger` |
| Root cause/action | CAPA workflow/generic | `capa_records`/JSON | Fragmented | Multi-authority | QNC-007 canonical CAPA |
| 30/60/90 effectiveness | Mentioned in design comments | none enforced | None | Decorative | QNC-008 scheduled checks required |
| Closure | CAPA/NCR transitions | fragmented | Partial | no e-sign policy | QNC-009 closure requires evidence/e-sign |
| COPQ posting | JSONL/CopqEngine | `copq_log.jsonl` | none | Not ledger | QNC-010 COPQ ledger |
| Dashboard reflection | dashboard services | mixed stores | incomplete | misses JSONL/PG | QNC-011 canonical projections |

### Quality Target State Before/After

| Command | Before | After | Mandatory gate |
| --- | --- | --- | --- |
| `CreateNcrFromQualityFailure` | source failure event | NCR `containment_active`, hold active | duplicate check, severity |
| `ApproveMrbDisposition` scrap | NCR `under_review`, MRB pending | MRB disposition approved/executed, lot scrapped | e-sign, inventory/COPQ ledger |
| `ApproveMrbDisposition` rework | NCR `under_review`, MRB pending | rework WO created, hold remains | route/reinspection plan |
| `CreateCapaFromTrigger` | trigger threshold met | CAPA `initiated` | duplicate CAPA check |
| CAPA effectiveness | CAPA implementation complete | 30/60/90 checks complete | no recurrence, evidence |
| CAPA close | CAPA effectiveness passed | CAPA `closed` | QA e-sign and audit |

## Simulation D - Inventory And Traceability

| Step | Current state | Gap | Target/test |
| --- | --- | --- | --- |
| Receive lot | P2P schema/generic | no receipt command | INV-001 `ReceivePurchaseOrder` creates pending IQC lot |
| Split lot | Trace schema likely present | no command found | INV-002 `SplitLot` preserves genealogy/hold/cost |
| Merge lot | Trace schema likely present | no command found | INV-003 `MergeLot` blocks held parent |
| Issue to WO | MES/inventory schema | no ledger command | INV-004 issue posts inventory/WIP |
| Produce output lot/serial | MES/DPP schemas | no completion command | INV-005 output links inputs/WO/inspection |
| Genealogy chain | DPP trace by same lot/SO only | incomplete | INV-006 canonical forward/backward genealogy |
| Shipment | logistics JSON | legacy gate now blocks active SO hold, but no trace shipment ledger | INV-007 shipment links lot/serial |
| Recall simulation | no authoritative recall command found | incomplete | INV-008 affected shipments returned |
| DPP/passport | manual JSON controller | not auto-created | INV-009 shipment/production generates DPP |

## Simulation E - Finance Control

| Step | Current API/endpoint | Gap | Target/test |
| --- | --- | --- | --- |
| Open period | Finance controls can create/reopen records | no central posting policy | FIN-001 period state service |
| Post inventory transaction | Generic/schema | no period check | FIN-002 open period allowed |
| Post AP invoice | finance/generic | no period check | FIN-003 open period allowed |
| Close period | `finance_period_close_create/transition` | creates control only | FIN-004 close locks scope |
| Try posting closed period | Debit/credit memo posting now rejects closed periods; other postings still bypass | P0 partial | FIN-005 all posting commands reject |
| Backdate exception | `finance_backdate_exception_create/transition` | consumed by memo posting only | FIN-006 single-use exception consumed by every posting policy |
| Audit evidence | Finance controller idempotency/audit partial | not linked to ledgers | FIN-007 audit/e-sign package |

### Finance Target State Before/After

| Command | Before | After | Mandatory gate |
| --- | --- | --- | --- |
| `CloseFinancePeriod` | period open | period closed | reconciliations, no unposted blockers, e-sign |
| posting command with closed period | period closed | rejected | no valid backdate exception |
| posting command with approved exception | period closed | posted and exception consumed | scope/date/expiry/use-count |

## Simulation F - Machine/MES

| Step | Current API/service | Current behavior | Gap | Target/test |
| --- | --- | --- | --- | --- |
| MTConnect ingestion | `MtconnectPollingService`, `EdgeConnectorService` | Polls current XML, normalizes latest signal, has stale timestamp guard | No immutable raw event authority/quality code | MES-001 raw event stored with source timestamp/hash |
| OPC-UA ingestion | `EdgeConnectorService` normalizes OPC-UA payload shape | No full OPC-UA client/worker found | partial/schema-only | MES-002 adapter client or ingestion API |
| Raw event storage | latest signal/connectivity event JSON | not append-only raw stream | incomplete | MES-003 raw stream replay |
| Production derivation | MES projections/DataLayer | partial | no deterministic derived event engine | MES-004 derive cycle/downtime/alarm |
| OEE calculation | `OeeService` JSONL and optional PG shadow | manual calculation inputs; quality alert queue only | not closed-loop | MES-005 OEE from event spine |
| Downtime/alarm escalation | `MesAlarmService`, OEE queue | partial queues | no confirmed dispatch evidence | MES-006 escalation delivery proof |
| Quality signal creates NCR/hold | OEE quality alert only | recommendation, not record | decorative | MES-007 creates NCR/hold on configured threshold |
| Idempotency/replay | MTConnect stale timestamp guard | no event replay key | partial | MES-008 duplicate raw event ignored |
| Mobile MES | `MobileController/MobileWorkQueueService` | clock-out/offline/resolve signatures mismatch; inspection fail does not NCR | runtime bug | MES-009 controller-service contract tests |

### Machine/MES Target State Before/After

| Command | Before | After | Mandatory gate |
| --- | --- | --- | --- |
| `RecordMachineEvent` | adapter active | raw event appended | adapter identity, source timestamp, quality code, replay key |
| `DeriveProductionEvent` | raw event unprocessed | derived cycle/downtime/alarm event | idempotent derivation |
| `CompleteOperation` from machine/manual evidence | WO running | operation complete or quality hold | material, inspection, qty reconciliation |
| Quality signal threshold | derived quality alert | NCR/hold active | configured threshold and defect evidence |

## Gate Bypass Tests

| Test ID | Bypass attempt | Expected result after remediation |
| --- | --- | --- |
| BYPASS-001 | `delivery_confirm` after OQC fail | Legacy route now rejects through `ShipmentGateService`; target `ConfirmDelivery` also rejects. |
| BYPASS-002 | `packing_update` to shipped without SO transition | Legacy route now rejects through `ShipmentGateService`; target `ConfirmPacking` also rejects. |
| BYPASS-003 | Generic CRUD update `sales_orders.so_status=shipped` | Rejected with `409 domain_command_required` for authorized/admin caller; unprivileged product role remains `403`. |
| BYPASS-004 | Generic CRUD insert `inventory_transactions` | Rejected with `409 domain_command_required`; use posting command. |
| BYPASS-005 | Generic CRUD close `ncr_records` | Rejected with `409 domain_command_required`; use quality command/e-sign. |
| BYPASS-006 | `schema_studio_table_row_save` used by product role | Rejected; admin-only. |
| BYPASS-007 | `oqc_update(result=fail)` with fake `ncr_reference` | Runtime OQC mitigation ignores the fake reference; target command returns canonical NCR/hold IDs from the transaction. |

## Additional Command Acceptance Tests

| Test ID | Command | Preconditions | Steps | Expected DB/API/workflow result |
| --- | --- | --- | --- | --- |
| CMD-QT-001 | `CreateQuote` | Active customer and released item revision | Submit two concurrent creates | Two unique quote numbers, two quote rows, no counter collision |
| CMD-QT-002 | `SubmitQuoteForInternalReview` | Quote `draft` with full costing | Submit review command | Quote `internal_review`; review tasks/evidence linked |
| CMD-QT-003 | `SendQuote` | Quote `internal_review` with all approvals | Send with PDF evidence | Quote `sent`; immutable sent package recorded |
| CMD-QT-004 | `AcceptQuote` | Quote `sent` not expired | Accept with customer evidence | Quote `accepted`; conversion is now allowed |
| CMD-SO-001 | `RecordContractReview` | SO draft/quoted and customer PO linked | Complete checklist and sign | Canonical review row linked to SO; `ConfirmSalesOrder` can read it |
| CMD-PO-001 | `CreatePurchaseOrder` | Supplier ASL approved for item/process | Create PO | PO `draft`; blocked supplier returns policy error |
| CMD-PO-002 | `ApprovePurchaseOrder` | PO submitted and approval route complete | Approve with signer not buyer | PO `approved`; SoD violation fails |
| CMD-TRACE-001 | `SplitLot` | Available parent lot with qty 10 | Split into qty 4 and 6 | Child lots inherit parent genealogy/cost/hold status |
| CMD-TRACE-002 | `MergeLot` | Two same-item lots, one active hold | Try merge without QA release | Merge fails and no genealogy edge is written |
| CMD-TRACE-003 | `ProduceOutputLotSerial` | WO running with input lot issued | Record output lot/serial | Output links WO, inputs, operation, inspection evidence |
| CMD-TRACE-004 | `GenerateDppFromShipment` | Shipment confirmed with complete genealogy | Generate DPP | DPP `issued` with shipment/genealogy/evidence package |
| CMD-TRACE-005 | `SimulateRecall` | Shipped lot with parent input lots | Simulate backward/forward | Returns suppliers, receipts, WOs, shipments, customers, evidence |
| CMD-MES-001 | `RecordMachineEvent` | Valid adapter identity | Replay same source timestamp/node/value | One raw event stored; duplicate replay returns same event |
| CMD-MES-002 | `DeriveProductionEvent` | Raw event recorded | Run derivation twice | Exactly one derived cycle/downtime/alarm event |
| CMD-HOLD-001 | `ApplyQualityHold` | NCR source exists | Apply hold to SO/lot | Hold active; shipment/putaway/issue gates block subject |
| CMD-HOLD-002 | `ReleaseQualityHold` | MRB/reinspection evidence complete | Release with e-sign | Hold released; subject projection updated; unsigned release fails |
| CMD-COPQ-001 | `PostCopqEntry` | NCR/MRB exists and period closed | Post without exception | Rejected; with matching exception posts and consumes exception |
| CMD-AR-001 | `PostArInvoice` | SO shipped and period open | Post invoice | AR invoice posted; duplicate shipment invoice rejected |
| CMD-SO-002 | `CloseSalesOrder` | SO shipped, invoiced, no holds | Close SO | SO `closed`; open hold or missing invoice blocks close |
| CMD-FIN-001 | `OpenFinancePeriod` | Period not open | Open AP period | Period state authority returns open for posting policy |
| CMD-AP-001 | `PostPayment` | AP invoice matched | Pay invoice | Payment posted; disputed invoice or closed period rejected |

## Race/Retry/Idempotency Tests

| Test ID | Race/retry | Expected result |
| --- | --- | --- |
| IDEMP-001 | Two concurrent quote conversions same quote, different keys | One SO created; second returns duplicate/source locked conflict or same SO by quote constraint. |
| IDEMP-002 | Same idempotency key, same command payload | Same response replayed. |
| IDEMP-003 | Same idempotency key, different payload | `409 idempotency_conflict`. |
| IDEMP-004 | Concurrent material issue same lot causing shortage | One commits, other fails stock lock/insufficient stock. |
| IDEMP-005 | Closed period while AP post in flight | Serializable/row lock ensures deterministic allow-before-close or reject-after-close. |
| IDEMP-006 | Duplicate MTConnect raw event | Raw event ignored/replayed idempotently; derived event not duplicated. |
| IDEMP-007 | Expired PostgreSQL `in_progress` command row retried by another worker | Retry is rejected, not reclaimed; operator recovery process must resolve stale row. |
| IDEMP-008 | Idempotency `scope_key` longer than 255 chars | DB insert succeeds by unique `scope_key_hash`; raw `scope_key` remains available for audit. |

## Frontend Unsafe Endpoint Tests

| Test ID | Endpoint | Expected result for product frontend role |
| --- | --- | --- |
| FE-001 | `POST /api/runtime/sales/sales_orders` | `403 forbidden` for unprivileged product role; `409 domain_command_required` for otherwise authorized/admin caller. |
| FE-002 | `PUT /api/runtime/inventory/inventory_transactions/{id}` | `403 forbidden` for unprivileged product role; `409 domain_command_required` for otherwise authorized/admin caller. |
| FE-003 | `DELETE /api/runtime/quality_management/ncr_records/{id}` | `403 forbidden` for unprivileged product role; `409 domain_command_required` for otherwise authorized/admin caller. |
| FE-004 | `POST /api/runtime/finance/ap_invoices/{id}/transition` | `403 forbidden` for unprivileged product role; `409 domain_command_required` for otherwise authorized/admin caller. |
| FE-005 | `schema_studio_apply_migration` | `403 admin_only` for product role. |
| FE-006 | `admin_git_status` | `403 admin_only` for product role. |

## Regression Checklist

- Status artifacts generated from one source.
- No unknown runtime state in JSON or PG.
- Generic CRUD mutation default-deny for governed tables.
- Quote conversion JSON runtime is retry-safe/idempotent; command/PG version is atomic.
- Engineering readiness enforced before JO/WO, with command/PG version verifying released master-data rows.
- OQC fail creates legacy NCR/hold and blocks shipment; command/PG version creates canonical NCR/hold. IQC canonical hold remains required.
- Packing/delivery cannot bypass shipment gate.
- Material issue posts inventory/WIP ledger.
- Period close blocks memo posting now; all posting commands must call the same policy.
- Backdate exception is consumed atomically for memos now; all posting commands must consume through the same policy.
- Drift tool runs without fatal error.
- Master-data sync includes BOM/routing/control plan/inspection plan.
- E-signature requires re-auth and rejects TOTP replay.
- Machine raw event stream is append-only and replayable.
- Mobile MES controller-service signatures covered by tests.

## Residual Risk Register

| Risk ID | Residual risk | Severity | Mitigation before implementation |
| --- | --- | --- | --- |
| RR-001 | Existing JSON data may contain statuses that cannot be automatically mapped. | High | Migration hold report and manual disposition workflow. |
| RR-002 | Singular/plural duplicate tables may contain divergent production data. | High | Table-pair reconciliation and canonical mapping. |
| RR-003 | Some domain services bypass `DataLayer`; dual-write may be incomplete during cutover. | High | Command rewrite before PG cutover. |
| RR-004 | Generic CRUD remains broad for admin use and can be misconfigured. | High | Default-deny governed mutation and CI contract tests. |
| RR-005 | Quality JSONL automation may contain historical triggers not imported. | Medium | Import/reconciliation job with legacy trigger evidence. |
| RR-006 | Notification email queue has no sender. | Medium | Worker implementation and dead-letter dashboard. |
| RR-007 | MTConnect current-state polling may miss transient events. | Medium | Raw event stream/agent history support and quality code policy. |
| RR-008 | PostgreSQL constraints may initially be `NOT VALID` during migration. | Medium | Cutover checklist blocks `POSTGRES_ONLY` until validated. |
| RR-009 | Part 11 scope may vary by customer/regulatory product. | Medium | Record retention/e-sign policy matrix by product/customer. |
| RR-010 | Existing OpenAPI may advertise endpoints that policy now blocks. | Medium | Regenerate OpenAPI with runtime-safe tags and deprecation markers. |
| RR-011 | P0 legacy mitigations use JSON/JSONL stores, not canonical PostgreSQL command transactions. | High | Implement command APIs and import legacy mitigation records into canonical quality/hold tables before regulated release. |
| RR-012 | JSON/file idempotency fallback can fail closed if final completion state cannot persist after a side effect. | High | Use PostgreSQL idempotency for governed commands; provide operator recovery for stale `in_progress` rows; do not certify JSON fallback for regulated mutation. |
| RR-013 | Real PostgreSQL idempotency integration may be skipped where no test database is configured. | Medium | CI must run `IdempotencyPostgresIntegrationTest` against PostgreSQL before promoting DB-backed command runtime. |
