# Quality Enforcement Spec

This spec unifies NCR, CAPA, MRB, SCAR, OQC, IQC, holds, quarantine, COPQ, and supplier quality into one runtime enforcement model.

## Current Findings

| Finding | Runtime evidence | Classification |
| --- | --- | --- |
| OQC fail only sets `ncr_required` | `LogisticsController::oqc_update` writes logistics JSON and sets flag when result is `fail`. | schema-only/decorative control |
| Quality gate reads wrong stores | `ShipmentGateService` expects SO-embedded review/holds and `orders['ncrs']`; actual records are separate JSON/JSONL/exception stores. | documentation-runtime mismatch |
| NCR/CAPA/MRB/SCAR multi-authority | Exceptions JSON, supplier-quality JSON, quality JSONL, and PG registry tables all store quality state. | P0 multi-authority |
| Auto quality events are unconsumed | `QualityIntegrationService` writes JSONL NCR/CAPA/COPQ triggers; not canonical records/gates. | orphan automation |
| IQC does not block putaway | Supplier incoming inspection records are separate from PO receipt/lot availability. | decorative IQC |
| Supplier scorecard incomplete | Scorecard uses incoming inspection records only. | business logic gap |

## Target Unified Model

Canonical tables/services:

- `quality_events`: source event, severity, source type/id, lot/WO/SO/PO/receipt references.
- `quality_holds`: canonical hold for lot, serial, SO, WO, receipt, location, shipment.
- `ncr_records`: one NCR authority.
- `mrb_records`: disposition authority.
- `capa_records`: CAPA authority with effectiveness schedule.
- `scar_records`: supplier corrective action authority.
- `copq_ledger`: cost-of-poor-quality posting authority.
- `oqc_inspections` and `iqc_inspections`: inspection result authority.
- `supplier_scorecard_snapshots`: computed from canonical receipt, IQC, SCAR, delivery, audit, and certification sources.

Command owners:

- `RecordOqcResult`
- `RecordIqcResult`
- `CreateNcrFromQualityFailure`
- `ApproveMrbDisposition`
- `CreateCapaFromTrigger`
- `ApplyQualityHold`
- `ReleaseQualityHold`
- `PostCopqEntry`

## Quality Hold And Quarantine Rules

| Trigger | Required immediate action | Blocks |
| --- | --- | --- |
| OQC fail | Create NCR, apply hold to SO/WO/lot/shipment candidate, require MRB or reinspection path | Packing, delivery, SO ship, close SO |
| IQC fail | Create NCR, apply hold to receipt/lot, create SCAR if supplier-caused or threshold exceeded | Putaway, issue to WO, AP match release if policy requires |
| In-process inspection fail | Create NCR or contained defect event, hold WO/operation/lot per severity | WO completion, output lot release |
| Customer complaint/product escape | Create NCR/CAPA, hold affected lots/shipments if recall risk | Shipment of affected families/lots |
| Calibration OOT affecting product | Create quality event and hold affected WOs/lots until impact assessment | Shipment/closeout |
| MRB scrap/rework/use-as-is/RTS | Post inventory/WIP/COPQ ledger, update lot state, create tasks | Release until executed |
| CAPA overdue/effectiveness failed | Escalate hold or supplier/customer process block by rule | Closure and release by severity |

Hold release requires:

- Authorized role.
- Evidence of disposition/inspection/rework.
- E-signature for regulated/high-risk release.
- Audit reason.
- No dependent open child hold.

## OQC Failure Enforcement

`RecordOqcResult(result=fail)` must execute in one transaction:

1. Insert OQC result with inspection plan version, inspector, measurements, evidence.
2. Insert `quality_events` source `OQC_FAIL`.
3. Create or reuse canonical NCR for source.
4. Apply hold to affected `lot_id`, `work_order_id`, `sales_order_id`, and shipment candidate.
5. Mark shipment readiness projection as blocked.
6. Create COPQ placeholder if scrap/rework/sort expected.
7. Emit outbox `quality.oqc_failed`.

Acceptance tests:

- OQC fail creates NCR and hold.
- `ConfirmPacking` fails while OQC hold is active.
- `ConfirmDelivery` fails if packing endpoint tries to bypass SO transition.
- OQC pass after reinspection cannot release hold without MRB/rework evidence where required.

## IQC Failure Enforcement

`RecordIqcResult(result=fail)` must:

1. Insert IQC result linked to `purchase_receipt_line` and `lot_id`.
2. Set lot status `quality_hold` or `rejected`.
3. Create NCR.
4. Create SCAR if supplier-caused, repeated defect, critical severity, counterfeit risk, or customer/regulatory requirement.
5. Block `PutawayInventory`.
6. Feed supplier scorecard PPM and SCAR metrics.
7. Block AP payment/release if policy requires unresolved quality disposition.

Acceptance tests:

- Rejected lot cannot be put away.
- Rejected lot cannot be issued to WO through `IssueMaterialToWorkOrder`.
- SCAR severity affects supplier scorecard.

## CAPA Trigger Rules

CAPA is required when any rule is true:

- Critical/safety NCR.
- Repeat NCR same part/process/defect within configured window.
- Supplier SCAR severe or repeated.
- Customer complaint/product escape.
- OEE quality factor below threshold with confirmed defects.
- Audit finding major/critical.
- Calibration OOT with product impact.
- COPQ threshold exceeded.

CAPA lifecycle includes 30/60/90-day effectiveness:

- `effectiveness_30`: early evidence and containment stability.
- `effectiveness_60`: recurrence check and KPI trend.
- `effectiveness_90`: final effectiveness evidence.
- `effectiveness_review`: QA validates closure criteria.

CAPA cannot close until all effectiveness checks pass or a documented extension is signed.

## MRB Disposition Rules

| Disposition | Required transaction | Ledger/evidence |
| --- | --- | --- |
| `scrap` | Reduce stock/WIP, move lot to scrap, close hold after execution | Inventory ledger, WIP/cost ledger, COPQ scrap entry, e-sign |
| `rework` | Create rework WO or operation, hold remains until rework OQC passes | WIP movement, rework cost, NCR link |
| `use_as_is` | Requires QA/customer approval where applicable | E-sign, concession/deviation link, shipment release evidence |
| `return_to_supplier` | Create RTS/shipping/supplier debit or claim | Inventory movement, SCAR link, supplier scorecard |
| `sort_reinspect` | Create inspection task and sampling plan | Inspection evidence, hold remains until accept |

## COPQ Ledger

COPQ must be a ledger, not a JSONL-only log.

Required fields:

- `copq_entry_id`
- `source_type/source_id`
- `ncr_id/mrb_id/capa_id/scar_id`
- `cost_category`: scrap, rework_labor, reinspection, downtime, premium_freight, supplier_chargeback, warranty, concession
- `amount`, `currency`, `posting_date`, `period_code`
- `ledger_status`
- `evidence_id`
- `created_by/approved_by`

Period close policy applies to COPQ postings.

## Supplier SCAR Scorecard Impact

Scorecard formula must include:

- Incoming lots received/rejected.
- Defect PPM = rejected quantity or defect count per million received quantity.
- OTD from PO promised/receipt dates.
- SCAR count and severity weighting.
- Open overdue SCAR penalty.
- Supplier audit status and expiry.
- Certification expiry and special process approval.
- Counterfeit/material-cert risk.
- Cost impact from COPQ/supplier chargebacks.

Acceptance: a severe SCAR reduces supplier score even if incoming inspection count is low.

## FMEA To Control Plan Enforcement

Before `ReleaseSalesOrderToProduction`, `ReleaseJobOrder`, and `ReleaseWorkOrder`:

- Active FMEA exists for part/process family where required.
- Control plan is released and references FMEA failure modes/controls.
- Inspection plan covers required control plan characteristics.
- Special characteristics have sampling/reaction plan.
- Reaction plan maps to hold/NCR/CAPA triggers.

If any link is missing, release fails with `engineering_quality_plan_incomplete`.

## Inspection Plan Enforcement

`RecordOqcResult`, `RecordIqcResult`, and mobile inspection capture must:

- Reference released inspection plan version.
- Validate characteristic IDs and tolerances.
- Validate inspector qualification.
- Store raw measurement evidence.
- Block pass if mandatory characteristic missing.
- Create NCR for failed mandatory characteristic unless waiver/e-signature exists.

## Regulatory Evidence Requirements

| Requirement | Enforcement |
| --- | --- |
| Part 11 audit trail | Immutable audit entry for creation, update, status change, hold release, disposition, CAPA closure. |
| Part 11 e-signature | Re-auth signature for MRB disposition, use-as-is, hold release, CAPA closure, shipment release override. |
| ISO 13485/QMSR | NCR/CAPA linkage, supplier control, process validation evidence. |
| AS9100/IATF | Traceability, nonconformance, production control, supplier quality, contract/quality release evidence. |
| Record retention | Evidence vault link and retention class for all regulated quality records. |

