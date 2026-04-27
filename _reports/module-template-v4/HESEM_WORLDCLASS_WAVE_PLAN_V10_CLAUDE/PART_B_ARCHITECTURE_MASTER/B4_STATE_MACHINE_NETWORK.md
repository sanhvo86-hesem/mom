# B4 — State Machine Network

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B4 (high-level SM descriptions without transition tables)  
**Cross-references:** B1 L3, B2, B3, B6 C1+C2, B7, D1..D14, L1 §4, H4, M3, M4

---

## §1 State Machine Inventory

The 14 core state machines govern every authoritative root in the M3 catalog.
Each SM is Tier-classified per H9 risk, has explicit banned-decision touchpoints
per L1, and is realised in L3 (Workflow & Command Bus) with L4 domain root
mutations as side-effects. Pack-specific SMs (≥ 30, per §20) extend the core
network without modifying core SM transition logic.

| SM | Name | Owner Domain | Roots | Tier | Banned-Decision Touchpoints |
|---|---|---|---|---|---|
| SM-1 | Order Lifecycle | Commercial & Customer | QUO, CPO, SO, SHIPMENT, INVOICE | T2 | BD-3 (write-off), BD-5 (shipment to uncertified customer) |
| SM-2 | Procurement | Procurement & Supplier Quality | PO, RECEIPT, SUPPLIER_EVAL | T2 | BD-6 (approve unevaluated supplier), BD-7 (waive incoming inspection) |
| SM-3 | Work Order Execution | MES Execution | JO, WO, OPER, STEP | T1 | BD-1 (sign-off own work), BD-8 (skip mandatory step) |
| SM-4 | Inspection & Receipt | Quality Improvement | INSP, IQC, IPC, OQC | T1 | BD-2 (accept out-of-spec without MRB), BD-7 (waive) |
| SM-5 | Disposition | Quality Improvement | DISPOSITION, MRB | T1 | BD-2 (accept without evidence), BD-9 (pharma release without QP) |
| SM-6 | NC / CAPA | Quality Improvement | NQCASE, CAPA, SCAR, DEVIATION | T1 | BD-1 (self-close), BD-10 (close without effectiveness check) |
| SM-7 | Document Lifecycle | Quality Improvement | CDOC, ECO, SOP, FORM | T1 | BD-4 (supersede without review), BD-11 (release without training close-out) |
| SM-8 | Training Qualification | Quality Improvement | TRAIN_COURSE, TRAIN_RECORD, COMP_MATRIX | T2 | BD-11 (qualification without assessment) |
| SM-9 | Maintenance & Calibration | Maintenance & EHS | MWO, PMSCH, CAL, MSA | T1 | BD-12 (use out-of-cal instrument), BD-13 (defer mandatory PM) |
| SM-10 | Batch Release | Quality Improvement | BREL, BATCH_RECORD | T1 | BD-9 (pharma: QP release), BD-2 (accept without full evidence) |
| SM-11 | Recall Management | Quality Improvement | RECALL, COMPLAINT, FSCA | T1 | BD-14 (close recall without scope confirmation), BD-15 (downgrade to market withdrawal without authority) |
| SM-12 | Audit Finding | Quality Improvement | AUDIT_FINDING, AUDIT_PLAN | T2 | BD-10 (close finding without CAPA) |
| SM-13 | Risk Assessment | Quality Improvement | RISK_ASSESSMENT, FMEA, CONTROL_PLAN | T2 | BD-16 (approve high-residual-risk without sign-off) |
| SM-14 | Validation Lifecycle | Quality Improvement | URS, RTM, IQ_PROTOCOL, OQ_PROTOCOL, PQ_PROTOCOL, VMP, VALIDATION_REPORT | T1 | BD-17 (release system without completed PQ), BD-18 (modify validated process without re-validation) |

Tier classification per H9: Tier-1 = regulated, directly impacts patient/consumer safety or regulatory submission; Tier-2 = regulated, business-critical; Tier-3 = advisory.

---

## §2 SM-1 — Order Lifecycle

**Roots:** QUO (Quotation), CPO (Customer PO), SO (Sales Order), SHIPMENT, INVOICE  
**Tier:** T2 | **Banned decisions:** BD-3 (write-off without approval), BD-5 (ship to uncertified customer)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `submit_quote` | Customer exists; pricing approved by L2 Tier-3 authority | SUBMITTED | Notify customer; OTG ACTED_BY edge | EC-22 access_audit | 2s |
| SUBMITTED | `win_quote` | CPO received; credit check passed | WON | Create SO in DRAFT; OTG LINKED edge (QUO→SO) | EC-16 change | 5s |
| SUBMITTED | `lose_quote` | None | LOST | Archive quote; notify sales | EC-22 | 2s |
| WON | `confirm_so` | SO signed by customer; payment terms set; inventory reserved | CONFIRMED | Trigger MRP run (SM-3 cascade); OTG COMMITTED | EC-16 change | 5s |
| CONFIRMED | `allocate_so` | Lot(s) allocated from inventory; lot status = RELEASED | ALLOCATED | Lot reservation in inventory; OTG CONSUMED_LOT edge | EC-2 allocation | 5s |
| ALLOCATED | `start_production` | JO created in SM-3; BOM matched | IN_PRODUCTION | JO → RELEASED cascade; OTG TRIGGERED_BY | EC-22 | 2s |
| IN_PRODUCTION | `production_complete` | All WOs closed; yield meets threshold | READY_TO_SHIP | QC inspection triggered (SM-4); OTG ACTED_BY | EC-16 | 5s |
| READY_TO_SHIP | `ship` | BREL released (SM-10 complete); export docs attached; customer not on restricted list (BD-5 guard) | SHIPPED | Shipment created; DSCSA/EDI event emitted via outbox; OTG RELEASED_TO_MARKET | EC-2 shipment | 10s |
| SHIPPED | `invoice` | Delivery confirmed; POD received | INVOICED | Invoice created in DRAFT; OTG LINKED | EC-16 | 5s |
| INVOICED | `close_so` | Invoice paid or payment terms met | CLOSED | Final audit log; OTG ACTED_BY | EC-22 | 2s |
| ANY | `put_on_hold` | Quality hold triggered by SM-5 or SM-6 cascade | ON_HOLD_QUALITY | Shipment blocked; notify customer; OTG ACTED_BY | EC-16 hold | 2s |
| ON_HOLD_QUALITY | `lift_hold` | Disposition released by SM-5; L2 Tier-2 authority | PRIOR_STATE | Resume from hold point; OTG COMPENSATED_BY if prior action voided | EC-16 lift | 5s |
| ANY | `cancel` | Customer request or credit failure; L2 Tier-2 authority | CANCELLED | Lot allocations released; WOs cancelled; invoice voided; OTG ACTED_BY | EC-16 cancel | 10s |

**Per-pack overlay:** PHARMA — ship requires QP release (SM-10 complete + BD-9); DSCSA T3 event emitted. AUTO — ship requires OEM delivery order acknowledgment. FOOD — ship emits FSMA §204 CTE_COMPLETED event.

---

## §3 SM-2 — Procurement

**Roots:** PO (Purchase Order), RECEIPT, SUPPLIER_EVAL  
**Tier:** T2 | **Banned decisions:** BD-6 (approve unevaluated supplier), BD-7 (waive incoming inspection)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `submit_po` | Supplier on approved list; buyer authority (L2 Tier-3) | SUBMITTED | Supplier notified; OTG ACTED_BY | EC-22 | 2s |
| SUBMITTED | `acknowledge_po` | Supplier acceptance received | ACKNOWLEDGED | Confirmed delivery date recorded | EC-16 | 5s |
| ACKNOWLEDGED | `goods_in_transit` | Shipment tracking number received | IN_TRANSIT | Logistics tracking record created | EC-22 | 2s |
| IN_TRANSIT | `receive_goods` | Physical count matches PO quantity (tolerance ±2%); receiving clerk action | RECEIVED | RECEIPT created; IQC triggered (SM-4 cascade); OTG SOURCED_FROM edge | EC-16 receipt | 5s |
| RECEIVED | `pass_inspection` | SM-4 INSP → ACCEPTED; IQC result attached | ACCEPTED | Lot created in inventory; OTG PRODUCED_LOT; DISPOSITION = ACCEPT | EC-2 lot-create | 5s |
| RECEIVED | `fail_inspection` | SM-4 INSP → REJECTED or CONDITIONAL | UNDER_MRB | MRB workflow triggered (SM-5 sub-state); supplier deviation created (SM-6 cascade) | EC-16 reject | 5s |
| UNDER_MRB | `mrb_accept` | MRB decision = use-as-is or rework; quorum per BD-2 policy; L2 Tier-1 authority | ACCEPTED | Lot conditionally accepted; derogation record created; OTG DISPOSITIONED_AS CONDITIONAL | EC-2 mrb | 10s |
| UNDER_MRB | `mrb_reject` | MRB decision = return-to-vendor | REJECTED | Return-to-vendor initiated; supplier SCAR created (SM-6); OTG DISPOSITIONED_AS REJECT | EC-2 reject | 10s |
| ACCEPTED | `close_po` | All line items received or waived; invoice matched | CLOSED | AP invoice matching; audit log closed | EC-22 | 2s |

**Per-pack overlay:** PHARMA — supplier must hold GDP certificate; BD-6 applies. AERO — ITAR supplier must have DDTC authorisation on file before PO submission allowed.

---

## §4 SM-3 — Work Order Execution

**Roots:** JO (Job Order), WO (Work Order), OPER (Operation), STEP  
**Tier:** T1 | **Banned decisions:** BD-1 (sign-off own work), BD-8 (skip mandatory step)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `release_jo` | BOM and routing available; materials allocated; L2 Tier-3 authority | RELEASED | WOs created for each routing step; OTG COMMITTED | EC-16 | 5s |
| RELEASED | `start_jo` | All materials available at workcenter; equipment CAL valid (SM-9 guard) | IN_PROGRESS | MES step-by-step prompts activated; OTG TRIGGERED_BY | EC-22 | 2s |
| IN_PROGRESS | `complete_step` | Step completion confirmed by operator; mandatory readings recorded; BD-1 guard (operator ≠ reviewer for Tier-1 steps) | STEP_COMPLETE | Next step activated; OTG ACTED_BY; SPC data point inserted | EC-22 step | 2s |
| STEP_COMPLETE | `sign_off_step` | Independent reviewer (not the operator); reviewer holds Tier-2 authority; reason text >= 20 chars | SIGNED_OFF | OTG SIGNED_BY edge; step locked | EC-2 signature | 5s |
| IN_PROGRESS | `record_deviation` | Operator identifies process deviation | DEVIATION_OPEN | Deviation record created; SM-6 NC cascade | EC-16 deviation | 5s |
| DEVIATION_OPEN | `disposition_deviation` | QA disposition; SM-5 outcome | DEVIATION_CLOSED | Resume production or hold; OTG LINKED (deviation → JO) | EC-2 disposition | 10s |
| ALL_STEPS_SIGNED | `complete_wo` | All steps signed off; yield within tolerance; SPC stable | WO_COMPLETE | Output lot created; OTG PRODUCED_LOT | EC-16 complete | 5s |
| WO_COMPLETE | `complete_jo` | All WOs complete; QC inspection passed (SM-4) | JO_COMPLETE | Lot available for BREL (SM-10 trigger); OTG ACTED_BY | EC-16 | 5s |
| ANY | `put_on_hold` | Equipment failure or NC triggered | ON_HOLD | Materials quarantined; notify planning; OTG ACTED_BY | EC-16 hold | 2s |
| ON_HOLD | `resume` | Hold cause resolved; L2 Tier-2 authority | PRIOR_STATE | MES prompts re-activated | EC-16 resume | 5s |

**Per-pack overlay:** PHARMA — batch record electronic form attached per 21 CFR Part 11 at each step sign-off. AERO — step sign-off requires First Article Inspection (FAI) completion before first production run of any new part number.

---

## §5 SM-4 — Inspection & Receipt

**Roots:** INSP (Inspection), IQC (Incoming QC), IPC (In-Process QC), OQC (Outgoing QC)  
**Tier:** T1 | **Banned decisions:** BD-2 (accept out-of-spec without MRB), BD-7 (waive inspection)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| PENDING | `initiate` | Triggering lot or receipt exists; inspector assigned | INITIATED | Inspection plan loaded from CDOC (SM-7 GOVERNS edge); OTG VALIDATES edge created | EC-22 | 2s |
| INITIATED | `record_result` | All mandatory test parameters entered; calibrated instrument referenced (SM-9 guard); values within specification | IN_REVIEW | Results locked; reviewer notified | EC-16 result | 5s |
| INITIATED | `record_oos_result` | Parameter value outside specification | OOS_INVESTIGATION | OOS investigation triggered; SM-6 NC cascade; OTG ACTED_BY | EC-16 OOS | 5s |
| OOS_INVESTIGATION | `close_oos_assignable` | Assignable cause identified and documented; re-test passed | IN_REVIEW | OOS closed; re-test result appended | EC-16 | 5s |
| OOS_INVESTIGATION | `escalate_to_mrb` | Assignable cause not found or confirmed failure | UNDER_MRB | MRB convened (SM-5 sub-state); CAPA triggered (SM-6) | EC-16 escalate | 10s |
| IN_REVIEW | `approve_inspection` | Reviewer (≠ inspector, BD-1); all results within spec or justified; L2 Tier-2 authority | ACCEPTED | Lot disposition = ACCEPT; OTG DISPOSITIONED_AS; SM-10 notified | EC-2 approval | 5s |
| IN_REVIEW | `reject_inspection` | One or more critical parameters OOS confirmed | REJECTED | Lot disposition = REJECT; OTG DISPOSITIONED_AS REJECT; supplier SCAR if IQC (SM-6) | EC-2 reject | 5s |
| UNDER_MRB | `mrb_decision` | MRB quorum per BD-2 policy; L2 Tier-1 authority | ACCEPTED or REJECTED | Disposition per MRB; OTG DISPOSITIONED_AS with MRB metadata | EC-2 mrb | 10s |
| ACCEPTED | `waive_reinspection` | Only if BD-7 waiver authority granted (rare; emergency); L2 Tier-1; audit note required | ACCEPTED_WAIVED | Waiver record created; audit flag set; OTG ANNOTATED_BY | EC-16 waiver | 10s |

---

## §6 SM-5 — Disposition

**Roots:** DISPOSITION record, MRB (Material Review Board) sub-state  
**Tier:** T1 | **Banned decisions:** BD-2 (accept without evidence), BD-9 (QP release without MRB for pharma)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| PENDING | `open_disposition` | Triggering inspection or NC exists; material segregated | OPEN | Lot quarantine flag set in inventory; OTG ACTED_BY | EC-22 | 2s |
| OPEN | `convene_mrb` | Multiple disciplines required (QA, Engineering, Supplier); at least 3 members | UNDER_MRB | MRB record created; quorum members notified | EC-16 | 5s |
| UNDER_MRB | `mrb_accept_use_as_is` | Evidence reviewed; concession justified; quorum met per BD-2 policy; L2 Tier-1 | ACCEPTED | Lot released with concession; OTG DISPOSITIONED_AS CONDITIONAL; CAPA triggered (SM-6) | EC-2 mrb-accept | 10s |
| UNDER_MRB | `mrb_accept_rework` | Rework plan documented; no patient safety risk; quorum met | REWORK_REQUIRED | Rework WO created (SM-3 cascade); lot held | EC-2 mrb-rework | 10s |
| REWORK_REQUIRED | `rework_complete` | Rework WO closed; re-inspection passed (SM-4) | OPEN | Re-enter disposition with rework evidence | EC-16 | 5s |
| UNDER_MRB | `mrb_reject` | Material non-conforming; quorum met | REJECTED | Lot disposition = REJECT; return-to-vendor or scrap; OTG DISPOSITIONED_AS REJECT | EC-2 reject | 10s |
| OPEN | `accept_disposition` | Inspection ACCEPTED (SM-4); axiom A-03 evidence complete; L2 Tier-2 authority | ACCEPTED | Lot released; OTG DISPOSITIONED_AS ACCEPT | EC-2 disposition | 5s |
| ACCEPTED | `supersede_disposition` | Re-inspection reveals new NC; recall workflow triggered | REJECTED | Compensation chain created; OTG COMPENSATED_BY; axiom A-12 recall guard | EC-2 supersede | 10s |

---

## §7 SM-6 — NC / CAPA

**Roots:** NQCASE (Nonconformance Case), CAPA, SCAR (Supplier Corrective Action), DEVIATION  
**Tier:** T1 | **Banned decisions:** BD-1 (self-close), BD-10 (close without effectiveness check)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `submit_nc` | NC description complete; root category assigned; lot/batch reference attached | SUBMITTED | OTG ACTED_BY; assignee notified | EC-22 | 2s |
| SUBMITTED | `accept_nc` | QA accepts the NC as valid; within classification criteria | ACCEPTED | Disposition triggered (SM-5 cascade); investigation assigned | EC-16 | 5s |
| SUBMITTED | `reject_nc` | Duplicate or not a true NC; L2 Tier-2 authority | REJECTED | Closed with rejection rationale; OTG ACTED_BY | EC-22 | 2s |
| ACCEPTED | `complete_investigation` | Root cause identified; 5-Why or Ishikawa attached; evidence referenced | UNDER_REVIEW | CAPA triggered if systemic; OTG LINKED (NC → CAPA) | EC-16 | 5s |
| UNDER_REVIEW | `approve_investigation` | Reviewer (≠ investigator, BD-1); root cause plausible; L2 Tier-2 | INVESTIGATION_APPROVED | CAPA plan required if systemic; regulatory report if required | EC-2 approval | 5s |
| INVESTIGATION_APPROVED | `open_capa` | CAPA plan documented; owner assigned; due date set | CAPA_IN_PROGRESS | CAPA record created; OTG LINKED; SM-12 audit if audit-originated | EC-16 capa | 5s |
| CAPA_IN_PROGRESS | `complete_capa` | All CAPA actions closed; evidence attached | CAPA_COMPLETED | Effectiveness check scheduled (30/60/90 day per risk) | EC-16 | 5s |
| CAPA_COMPLETED | `verify_effectiveness` | Effectiveness check evidence reviewed; recurrence data checked; BD-10 guard (cannot skip) | EFFECTIVENESS_VERIFIED | OTG ACTED_BY; document update triggered (SM-7) if SOP change | EC-2 effectiveness | 10s |
| EFFECTIVENESS_VERIFIED | `close_nc` | All actions verified; effectiveness confirmed; L2 Tier-2 | CLOSED | OTG ACTED_BY; lot traceability records linked | EC-22 close | 5s |
| ANY | `escalate` | Risk threshold exceeded; repeat NC; L2 Tier-1 required | ESCALATED | Management review notified; SLO-breach flag | EC-16 escalate | 2s |

**Per-pack overlay:** PHARMA — Pharmaceutical Technical Agreement required for supplier SCAR. MD — field safety corrective action (FSCA) triggered if NC relates to distributed device (SM-11 cascade).

---

## §8 SM-7 — Document Lifecycle

**Roots:** CDOC (Controlled Document), ECO (Engineering Change Order), SOP, FORM  
**Tier:** T1 | **Banned decisions:** BD-4 (supersede without review), BD-11 (release without training close-out)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `submit_for_review` | Author complete; peer review assigned | UNDER_REVIEW | Reviewers notified; OTG ACTED_BY | EC-22 | 2s |
| UNDER_REVIEW | `approve_document` | All required reviewers signed; L2 Tier-1 for GMP-critical; reason text ≥ 30 chars | APPROVED | Training requirement created (SM-8 cascade); OTG SIGNED_BY (quorum) | EC-2 signature | 5s |
| UNDER_REVIEW | `return_for_revision` | Reviewer identifies deficiency; comment attached | DRAFT | Version incremented; author notified | EC-16 | 5s |
| APPROVED | `release_document` | Training close-out confirmed (BD-11 guard); effective date reached | EFFECTIVE | Prior version superseded; OTG SUPERSEDED_BY edge; GOVERNS edges updated | EC-2 release | 5s |
| EFFECTIVE | `initiate_revision` | Change request submitted; change justification documented | REVISION_IN_PROGRESS | ECO created; OTG LINKED (CDOC → ECO) | EC-16 | 5s |
| REVISION_IN_PROGRESS | `submit_revision` | Revised content complete; impact assessment attached | UNDER_REVIEW | Back to review cycle; version incremented | EC-22 | 2s |
| EFFECTIVE | `supersede` | New version released (BD-4 guard: new version must complete review) | SUPERSEDED | OTG SUPERSEDED_BY; GOVERNS effective_to set to supersession date | EC-16 supersede | 5s |
| EFFECTIVE | `withdraw` | Document recalled for safety or regulatory; L2 Tier-1; reason documented | WITHDRAWN | All GOVERNS edges closed; training records flagged; SM-6 NC if GMP impact | EC-2 withdraw | 10s |

---

## §9 SM-8 — Training Qualification

**Roots:** TRAIN_COURSE, TRAIN_RECORD, COMP_MATRIX (Competency Matrix)  
**Tier:** T2 | **Banned decisions:** BD-11 (mark competent without assessment)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| NOT_STARTED | `assign_training` | Document SM-7 EFFECTIVE or role-based curriculum assignment; target employee identified | ASSIGNED | Employee notified; due date set; OTG GOVERNED_BY edge (employee → CDOC) | EC-22 | 2s |
| ASSIGNED | `start_training` | Employee acknowledges assignment; training material accessed | IN_PROGRESS | Time tracking started | EC-22 | 2s |
| IN_PROGRESS | `complete_training` | All learning modules completed; assessment passed (score ≥ threshold); BD-11 guard (self-assessment prohibited for critical qualifications) | COMPLETED | Training record created; OTG SIGNED_BY (employee acknowledgment) | EC-2 completion | 5s |
| COMPLETED | `assess_competency` | Supervisor or qualified assessor observes performance; competency criteria met | COMPETENT | Competency Matrix updated; authorised task list updated | EC-2 competency | 5s |
| COMPETENT | `trigger_requalification` | Document revised (SM-7 cascade) or periodic interval reached | REQUALIFICATION_DUE | Employee notified; temporary restriction on related SM-3 steps | EC-16 | 5s |
| REQUALIFICATION_DUE | `complete_requalification` | Retraining and re-assessment complete | COMPETENT | Competency Matrix refreshed | EC-2 | 5s |
| COMPETENT | `suspend_qualification` | Employee leaves role or disciplinary action; L2 Tier-2 authority | SUSPENDED | Immediate restriction on authorised tasks; SM-3 step guard activated | EC-16 suspend | 2s |

---

## §10 SM-9 — Maintenance & Calibration

**Roots (Maintenance):** MWO (Maintenance Work Order), PMSCH (PM Schedule)  
**Roots (Calibration):** CAL (Calibration Record), MSA (Measurement System Analysis)  
**Tier:** T1 | **Banned decisions:** BD-12 (use out-of-cal instrument), BD-13 (defer mandatory PM past due date without approval)

**SM-9a Maintenance transitions:**

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| SCHEDULED | `trigger_mwo` | PM schedule due date reached or corrective maintenance request | OPEN | MWO created; equipment tagged OUT_OF_SERVICE; SM-3 step guard activated | EC-22 | 2s |
| OPEN | `assign_technician` | Qualified technician available; L2 Tier-3 | ASSIGNED | Parts reservation; OTG ACTED_BY | EC-22 | 2s |
| ASSIGNED | `complete_maintenance` | All checklist items done; parts used recorded; technician sign-off | PENDING_VERIFICATION | Verification inspector notified | EC-16 complete | 5s |
| PENDING_VERIFICATION | `verify_maintenance` | Inspector (≠ technician); function test passed; BD-1 guard | CLOSED | Equipment status = IN_SERVICE; PMSCH next date set; OTG SIGNED_BY | EC-2 verify | 5s |
| OPEN | `defer_pm` | BD-13 guard: PM may not be deferred past 30 days without L2 Tier-1 + documented risk | DEFERRED | Deferral logged; risk assessment attached; alert to quality | EC-16 defer | 5s |

**SM-9b Calibration transitions:**

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DUE | `initiate_cal` | Calibration due date reached; reference standard traceable to NIST/SI | IN_PROGRESS | Instrument quarantined; BD-12 guard activates on SM-3/SM-4 steps | EC-22 | 2s |
| IN_PROGRESS | `record_cal_result` | All measurement points recorded against reference; uncertainty budget documented | PENDING_REVIEW | Cal data locked; reviewer notified | EC-16 | 5s |
| PENDING_REVIEW | `approve_cal_pass` | Reviewer (≠ technician); all points within tolerance; OTG VALIDATES edge to instrument | CALIBRATED | Instrument status = CALIBRATED; CAL certificate generated; next due date set | EC-2 cal-cert | 5s |
| PENDING_REVIEW | `approve_cal_fail` | One or more points out of tolerance | OUT_OF_TOLERANCE | Instrument quarantined; SM-6 NC triggered; all measurements since last cal reviewed (lookback) | EC-2 OOT | 10s |
| OUT_OF_TOLERANCE | `repair_and_recal` | Repair completed; recalibration passed | CALIBRATED | Lookback assessment closed; OTG COMPENSATED_BY if prior data impacted | EC-2 repair | 10s |

---

## §11 SM-10 — Batch Release

**Roots:** BREL (Batch Release Record), BATCH_RECORD  
**Tier:** T1 | **Banned decisions:** BD-9 (pharma: release without QP review), BD-2 (accept without full evidence)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| PENDING | `compile_batch_record` | All WOs closed (SM-3); all inspections passed (SM-4); deviations closed (SM-6) | UNDER_REVIEW | Batch record PDF compiled; OTG EVIDENCE_COMPOSITION_COMPLETE axiom A-03 checked | EC-22 | 5s |
| UNDER_REVIEW | `qc_review` | QC reviewer confirms analytical results; CoA reviewed; out-of-trends justified | QC_APPROVED | QC approval signature; OTG SIGNED_BY | EC-2 signature | 5s |
| QC_APPROVED | `qa_review` | QA reviewer confirms GMP compliance; all deviations and CAPAs acceptable | QA_APPROVED | QA approval signature; OTG SIGNED_BY | EC-2 signature | 5s |
| QA_APPROVED | `qp_certify` | QP (Pharma pack only; BD-9 guard); QP is not QA reviewer (BD-1); QP holds current certification | CERTIFIED | QP electronic signature; OTG RELEASED_BY; 2-person quorum confirmed | EC-2 qp-release | 10s |
| CERTIFIED | `release_to_market` | Export/import docs attached; customer-specific requirements met | RELEASED | SO shipment unblocked (SM-1); OTG RELEASED_TO_MARKET (P-27) | EC-2 release | 5s |
| UNDER_REVIEW | `put_on_hold` | Review identifies critical issue; L2 Tier-1 | HOLD | All downstream shipments blocked; NC triggered (SM-6) | EC-16 hold | 2s |

**Per-pack overlay:** NON-PHARMA — QP_CERTIFY step skipped; QA_APPROVED transitions directly to CERTIFIED. AUTO — OEM delivery order must be acknowledged before RELEASED. MD — regulatory submission reference attached if first commercial batch.

---

## §12 SM-11 — Recall Management

**Roots:** RECALL, COMPLAINT, FSCA (Field Safety Corrective Action)  
**Tier:** T1 | **Banned decisions:** BD-14 (close recall without scope confirmation), BD-15 (downgrade classification without authority)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `assess_signal` | Signal source documented (complaint, NC, regulatory, proactive); urgency classified | SIGNAL_ASSESSED | Lot genealogy scope initiated (MV-07); OTG ACTED_BY | EC-22 | 2s |
| SIGNAL_ASSESSED | `open_recall` | Risk assessment confirms patient/consumer risk; L2 Tier-1 + QA Director; 48h regulatory notification window starts | OPEN | Regulatory authority notified; downstream customers notified; OTG ACTED_BY | EC-2 open | 10s |
| OPEN | `confirm_scope` | Genealogy walk complete (MV-07); all affected lot/serial numbers identified; BD-14 guard (scope must be confirmed before closure) | SCOPE_CONFIRMED | Scope record locked; OTG ACTED_BY; affected SOs put on hold (SM-1 cascade) | EC-16 scope | 10s |
| SCOPE_CONFIRMED | `execute_recall` | Customer returns initiated; effectiveness check plan documented | IN_EXECUTION | Return tracking records created per lot/serial | EC-16 execute | 5s |
| IN_EXECUTION | `effectiveness_check` | Return rate within acceptable range; corrective action implemented; BD-14 guard (check required before close) | EFFECTIVENESS_CHECKED | Evidence package compiled for regulator | EC-2 effectiveness | 10s |
| EFFECTIVENESS_CHECKED | `close_recall` | Regulator confirmation received (where required); all actions complete; L2 Tier-1 | CLOSED | Recall record archived; CAPA linked (SM-6); OTG ACTED_BY | EC-22 close | 10s |
| OPEN | `downgrade_to_withdrawal` | Risk re-assessed as lower class (BD-15 guard: requires L2 Tier-1 + regulatory authority approval) | MARKET_WITHDRAWAL | Narrower notification scope; original recall record retained with downgrade rationale | EC-2 downgrade | 10s |

---

## §13 SM-12 — Audit Finding

**Roots:** AUDIT_FINDING, AUDIT_PLAN  
**Tier:** T2 | **Banned decisions:** BD-10 (close finding without CAPA linkage for critical findings)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `raise_finding` | Auditor documents observation; area and standard clause referenced | RAISED | Auditee notified; finding classified (critical/major/minor/obs) | EC-22 | 2s |
| RAISED | `accept_finding` | Auditee agrees finding is valid; response due date committed | ACCEPTED | CAPA required for critical/major (SM-6 cascade, BD-10 guard) | EC-16 | 5s |
| RAISED | `contest_finding` | Auditee disputes finding; rationale provided | UNDER_DISPUTE | Lead auditor review; escalation to audit committee if unresolved | EC-16 dispute | 5s |
| UNDER_DISPUTE | `uphold_finding` | Audit committee confirms finding; L2 Tier-2 | ACCEPTED | Dispute rationale appended; finding confirmed | EC-16 | 5s |
| ACCEPTED | `complete_response` | Corrective action plan submitted; root cause identified | RESPONSE_RECEIVED | Auditor review notified | EC-16 | 5s |
| RESPONSE_RECEIVED | `verify_closure` | Auditor verifies corrective actions implemented; effectiveness evidence reviewed; BD-10 guard for critical | CLOSED | Audit report updated; OTG ACTED_BY | EC-2 close | 5s |
| CLOSED | `reopen` | Repeat finding at re-audit; L2 Tier-2 | RAISED | Escalation flag set; management review triggered | EC-16 reopen | 5s |

---

## §14 SM-13 — Risk Assessment

**Roots:** RISK_ASSESSMENT, FMEA, CONTROL_PLAN  
**Tier:** T2 | **Banned decisions:** BD-16 (approve high-residual-risk without L2 Tier-1 sign-off)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `submit_risk` | Scope defined; team assigned; failure modes documented | UNDER_REVIEW | Reviewers notified; OTG ACTED_BY | EC-22 | 2s |
| UNDER_REVIEW | `score_risks` | All failure modes scored (severity × probability × detectability); RPN calculated | SCORED | Control plan updated; high-RPN items flagged | EC-16 score | 5s |
| SCORED | `approve_residual` | Residual risk within acceptable threshold; BD-16 guard (high-residual requires L2 Tier-1); sign-off quorum met | APPROVED | OTG SIGNED_BY; linked to process validation (SM-14) | EC-2 approval | 5s |
| APPROVED | `trigger_review` | Periodic review due; NC or CAPA linked; process change | UNDER_REVIEW | Version incremented; prior version superseded (SM-7 analogue) | EC-16 | 5s |
| APPROVED | `close_assessment` | All risks mitigated below threshold; regulatory submission attached where required | CLOSED | Archived; OTG ACTED_BY | EC-22 | 2s |
| SCORED | `escalate_high_risk` | RPN above threshold; BD-16 guard triggers; L2 Tier-1 convened | ESCALATED | Management review; additional controls required | EC-16 escalate | 5s |

---

## §15 SM-14 — Validation Lifecycle

**Roots:** URS, RTM, IQ_PROTOCOL, OQ_PROTOCOL, PQ_PROTOCOL, VMP, VALIDATION_REPORT  
**Tier:** T1 | **Banned decisions:** BD-17 (release system without PQ), BD-18 (modify validated process without change control)

| Source State | Event | Guards | Target State | Side-effects | Evidence Emit | SLO |
|---|---|---|---|---|---|---|
| DRAFT | `approve_urs` | User requirements complete; traceability to risk assessment (SM-13); L2 Tier-2 sign-off | URS_APPROVED | RTM created; qualification protocols scoped; OTG SIGNED_BY | EC-2 signature | 5s |
| URS_APPROVED | `approve_iq` | IQ protocol executed; installation verified against DQ; Tier-1 sign-off | IQ_COMPLETE | OQ protocol released; OTG VALIDATES (IQ → equipment node) | EC-2 iq | 5s |
| IQ_COMPLETE | `approve_oq` | OQ protocol executed; all acceptance criteria met; no critical deviations open; Tier-1 | OQ_COMPLETE | PQ protocol released; OTG VALIDATES (OQ → process) | EC-2 oq | 5s |
| OQ_COMPLETE | `approve_pq` | PQ executed; process capability confirmed (Cpk ≥ 1.33 or equivalent); BD-17 guard enforced; Tier-1 quorum | PQ_COMPLETE | System released for production; OTG SIGNED_BY multi-party | EC-2 pq | 10s |
| PQ_COMPLETE | `validate_system` | VMP approved; all protocols complete; regulatory submission ready | VALIDATED | System enters production with validation status; OTG GOVERNED_BY (process → VMP) | EC-2 validated | 10s |
| VALIDATED | `trigger_revalidation` | Process change (BD-18 guard; change control required); period interval; NC | REVALIDATION_IN_PROGRESS | Change control opened (SM-7 ECO); affected lots quarantined | EC-16 | 5s |
| VALIDATED | `periodic_review` | Annual review due | UNDER_PERIODIC_REVIEW | Review team assigned; VMP updated | EC-22 | 2s |
| UNDER_PERIODIC_REVIEW | `confirm_validated` | All review items closed; process still within validated state | VALIDATED | Periodic review record closed; OTG ACTED_BY | EC-16 | 5s |
| REVALIDATION_IN_PROGRESS | `complete_revalidation` | All revalidation protocols passed; new VMP approved | VALIDATED | Previous validation superseded; OTG SUPERSEDED_BY | EC-2 | 10s |

---

## §16 Hard Couplings (Cascade Transitions)

Hard couplings are synchronous or near-synchronous cascades where a transition in a source SM directly triggers a required transition in a target SM within the same saga.

| Source SM | Source Transition | Target SM | Target Transition Triggered | Timing | Failure Mode | Cross-Tenant |
|---|---|---|---|---|---|---|
| SM-4 INSP → REJECTED | Inspection rejection | SM-5 Disposition | Open MRB sub-state | Synchronous (same saga) | SM-5 unavailable: SM-4 rolls back via TCC compensation | Prohibited |
| SM-4 INSP → OOS_INVESTIGATION | OOS detected | SM-6 NC | Create NQCASE | Synchronous | SM-6 fails: saga holds SM-4 in OOS state | Prohibited |
| SM-6 NC closed with effectiveness | CAPA effectiveness verified | SM-7 Document | Trigger document revision if SOP change required | Eventual (outbox event, < 30s) | SM-7 unavailable: event retained in outbox; retry | Prohibited |
| SM-7 Document EFFECTIVE | New document released | SM-8 Training | Create training assignment for all role-holders | Eventual (< 30s) | SM-8 fails: training assignment queued; retry | Prohibited |
| SM-9 CAL → OUT_OF_TOLERANCE | Instrument out-of-tolerance | SM-6 NC | Create NC for lookback investigation | Synchronous | SM-6 unavailable: SM-9 raises alert; manual NC creation required | Prohibited |
| SM-3 WO IN_PROGRESS | Equipment failure | SM-9 Maintenance | Trigger corrective MWO | Synchronous | SM-9 unavailable: equipment flagged manually; WO held | Prohibited |
| SM-10 BREL → HOLD | Batch put on hold | SM-1 SO | Block shipment (ON_HOLD_QUALITY) | Synchronous | SM-1 unavailable: hold persists; shipment system alert | Prohibited |
| SM-11 Recall OPEN | Recall opened | SM-1 SO | Put affected SOs on hold | Eventual (< 10s) | SM-1 unavailable: recall holds all shipping; retry | Prohibited |
| SM-6 NC → CAPA_COMPLETED | CAPA completed | SM-12 Audit Finding | Update finding status if NC originated from audit | Eventual (< 60s) | SM-12 unavailable: finding remains ACCEPTED; retry | Prohibited |
| SM-14 VALIDATED → REVALIDATION | Process change triggers revalidation | SM-3 WO | Quarantine active WOs for affected process | Synchronous | SM-3 unavailable: WOs halted manually | Prohibited |

---

## §17 Soft Couplings (Advisory)

Soft couplings are advisory signals where a source SM transition informs a target SM but does not require an immediate response. The target SM may act asynchronously or ignore the signal.

| Source SM | Source Transition | Target SM | Advisory Signal | Timing | Notes |
|---|---|---|---|---|---|
| SM-1 SO → CONFIRMED | New SO confirmed | SM-3 Work Order | MRP run advisory (capacity check) | Eventual, < 5 min | Planning may re-schedule; no mandatory cascade |
| SM-6 NC → ACCEPTED | NC accepted by QA | SM-13 Risk Assessment | Risk re-evaluation advisory | Eventual, < 24h | Risk owner notified; review discretionary |
| SM-8 Training → SUSPENDED | Employee qualification suspended | SM-3 Work Order | Step authorization removal advisory | Synchronous-ish, < 5s | MES step guards re-evaluated; advisory rather than hard block for historical records |
| SM-9 PMSCH | PM due date approaching (72h) | SM-3 Work Order | Upcoming maintenance advisory to planning | Eventual, < 1h | Planning may reschedule production; not mandatory |
| SM-12 Audit → CLOSED | Finding closed | SM-13 Risk Assessment | Risk position update advisory | Eventual, < 24h | Risk owner reviews if finding related to a risk |
| SM-5 Disposition → ACCEPTED | MRB accept with concession | SM-13 Risk Assessment | Risk advisory for concession tracking | Eventual | Risk log updated to record concession acceptance |

---

## §18 Saga Discipline

Multi-SM transactions that must complete atomically are implemented as Sagas using
the TCC (Try-Confirm-Cancel) pattern (per B1 L3). The L3 Saga Coordinator manages
the saga ledger and drives compensation.

**Saga structure per multi-SM operation:**

1. **Try phase:** Each participating SM registers a reservation (tentative state). The saga coordinator records all participants in the `saga_ledger` table with status = `TRY`.
2. **Confirm phase:** If all Try phases succeed, the coordinator issues Confirm to all participants simultaneously. Each SM transitions to the committed state. Saga status = `CONFIRMED`.
3. **Cancel phase:** If any Try phase fails or times out, the coordinator issues Cancel to all participants that completed Try. Each SM executes its compensation function to revert the reservation. Saga status = `CANCELLED`.

**Saga ledger fields:** `saga_id`, `tenant_id`, `saga_kind` (e.g. `BATCH_RELEASE`, `RECALL_SCOPE`), `participants` (JSON array of SM IDs and their states), `status` (TRY/CONFIRMED/CANCELLED/TIMED_OUT), `started_at`, `timeout_at`, `last_updated_at`, `compensation_log` (JSON).

**Saga timeout:** Default 300s for automated sagas; 86400s (24h) for human-in-the-loop sagas (e.g. MRB convening). Timeout triggers Cancel phase.

**Manual recovery path:** If Cancel phase fails (e.g. a SM is offline during compensation), the saga is marked `TIMED_OUT` and added to the `saga_stuck_queue`. The L8 operations team processes stuck sagas manually via the admin API (E14). Manual recovery always creates a COMPENSATED_BY OTG edge to document the human intervention.

**Example: Batch Release saga (SM-10 + SM-1 + SM-3):**
- Try: SM-10 tentatively marks batch as PENDING_RELEASE; SM-1 SO tentatively sets shipment_allowed = true; SM-3 all WOs confirmed closed.
- Confirm: SM-10 → RELEASED; SM-1 → ALLOCATED_FOR_SHIPMENT; OTG RELEASED_TO_MARKET emitted.
- Cancel (if QP signature fails): SM-10 reverts to QA_APPROVED; SM-1 resets shipment_allowed = false; OTG COMPENSATED_BY edge created.

---

## §19 Banned-Decision Integration (L1 §4 Triple-Defense)

Every banned decision (BD-1..BD-36) has three enforcement layers:
1. **CI gate:** Pull request CI checks that the command handler for the BD-classified action requires quorum authority assertion (per B2 §4 quorum_policy table).
2. **Runtime middleware (L2):** The `decide()` function (B2 §5) rejects any BD-classified action where the principal is AI (axiom A-05) or quorum is not met (axiom A-04) before the SM transition is invoked.
3. **OTG axiom (offline integrity):** The daily reconciliation verifies that no BD-classified event was committed without the required SIGNED_BY edges (axioms A-01, A-04, A-05).

**Per BD, the SM touchpoint:**
BD-1 (self-close / self-sign): Enforced in SM-3, SM-4, SM-6, SM-10; guard = `actor_id ≠ author_id`.
BD-2 (accept without evidence): Enforced in SM-4, SM-5, SM-10; guard = `axiom_A03_evidence_complete = true`.
BD-3 (write-off without approval): Enforced in SM-1; guard = `L2 Tier-1 authority`.
BD-4 (supersede document without review): Enforced in SM-7; guard = `review_cycle_complete = true`.
BD-8 (skip mandatory step): Enforced in SM-3 MES step sequencer; guard = `step.mandatory = false OR waiver_authority_present`.
BD-9 (pharma release without QP): Enforced in SM-10 for pharma-pack tenants; guard = `qp_signature_present AND qp_not_reviewer`.
BD-10 (close without effectiveness check): Enforced in SM-6, SM-12; guard = `effectiveness_record_exists`.
BD-11 (release doc without training close-out): Enforced in SM-7; guard = `training_assignments_closed`.
BD-12 (use out-of-cal instrument): Enforced in SM-4, SM-3 step guard; guard = `instrument.cal_status = CALIBRATED`.
BD-13 (defer PM past limit): Enforced in SM-9; guard = `defer_days ≤ 30 OR Tier1_authority`.
BD-14 (close recall without scope): Enforced in SM-11; guard = `scope_confirmed = true`.
BD-17 (release system without PQ): Enforced in SM-14; guard = `pq_complete = true`.
BD-18 (modify validated process without change control): Enforced in SM-14; guard = `change_control_reference_exists`.

---

## §20 Per-Pack Overlay — Pack-Specific State Machines (≥ 30)

Pack-specific SMs are defined in the M4 directory under each pack namespace (J1..J5).
They share the same saga and axiom infrastructure as core SMs.

**J1 Pharma (per M4 §J1):**
- SM-J1-01: QP Batch Certification (extends SM-10; adds QP sub-states per EU GMP Chapter 5)
- SM-J1-02: DSCSA Transaction Exchange (T1/T2/T3 tracking event lifecycle)
- SM-J1-03: EU FMD Serialisation (pack-level activation, decommission, alert management)
- SM-J1-04: GDP Deviation Management (extends SM-6 for distribution deviations)
- SM-J1-05: Pharmaceutical Technical Agreement Lifecycle (supplier agreement states)
- SM-J1-06: Annual Product Review Compilation

**J2 Auto (per M4 §J2):**
- SM-J2-01: per-VIN Assembly Release (PPAP submission states)
- SM-J2-02: OEM EDI Order Acknowledgment (830/850 EDI transaction lifecycle)
- SM-J2-03: Customer-Specific Requirement Compliance Verification
- SM-J2-04: IMDS Material Data Submission Lifecycle
- SM-J2-05: Automotive Supplier Quality Incident (extends SM-6 for 8D response)
- SM-J2-06: Production Part Approval Process (PPAP level 1..5)

**J3 Aero (per M4 §J3):**
- SM-J3-01: AS9100D First Article Inspection
- SM-J3-02: ITAR Export Authorisation Lifecycle (DDTC licence states)
- SM-J3-03: Certificate of Conformance Issuance (per AS9120B)
- SM-J3-04: Designated Engineering Representative Approval
- SM-J3-05: Airworthiness Directive Compliance Tracking
- SM-J3-06: Surplus Material Verification (AS6081 authentication)

**J4 Medical Device (per M4 §J4):**
- SM-J4-01: UDI Activation Lifecycle (EUDAMED / GUDID submission states)
- SM-J4-02: Field Safety Corrective Action (extends SM-11; per MDR Article 83)
- SM-J4-03: Vigilance Reporting Lifecycle (serious incident notification per MDR Article 87)
- SM-J4-04: Post-Market Surveillance Report Compilation
- SM-J4-05: Clinical Investigation Protocol Lifecycle (per MDR Annex XV)
- SM-J4-06: PRRC Review Lifecycle (Person Responsible for Regulatory Compliance sign-offs)

**J5 Food (per M4 §J5):**
- SM-J5-01: FSMA §204 Critical Tracking Event (KDE recording per FDA supply chain)
- SM-J5-02: HACCP Plan Verification Lifecycle (CCP monitoring states)
- SM-J5-03: Sanitary Transport Compliance Verification (21 CFR Part 1 Subpart O)
- SM-J5-04: Food Allergen Changeover Verification
- SM-J5-05: Foreign Material Control Lifecycle
- SM-J5-06: Process Authority Review (for thermally processed / acidified foods)

Total pack SMs: 6+6+6+6+6 = 30, meeting the M4 requirement.

---

## §21 Cross-References

- **B1 L3:** Saga Coordinator and Command Bus are the execution substrate for all SM transitions
- **B2:** Authority Ledger decide() is called before every SM transition; quorum policies per BD are the source of the SM guards documented in §19
- **B3:** Every SM transition emits an OTG event; `sm_transition_id` is carried on `otg_event`; ACTED_BY, SIGNED_BY, DISPOSITIONED_AS predicates are the primary OTG side-effects
- **B6 C1:** Every evidence emit in the transition tables is an H4 audit event; the audit chain anchors SM transition evidence
- **B6 C2:** OTG axioms enforce SM guard integrity post-commit (offline verification)
- **B7:** SM deployment is co-located with L4 domain roots in the modular monolith; no separate SM service
- **D1..D14:** Each Part-D workflow chapter maps to one or more SM transitions; D-level specs provide the per-use-case guard details
- **H4:** Evidence classes EC-2 (signature), EC-16 (change), EC-22 (access_audit) are defined in H4; all evidence emit rows reference these classes
- **L1 §4:** Banned decisions BD-1..BD-36 referenced in §19; triple-defense enforcement across CI, runtime middleware, and OTG axiom
- **M3:** Every SM root (QUO, CPO, SO, LOT, INSP, NQCASE, etc.) is in the M3 root catalog
- **M4:** Pack-specific SM directory (§20) is owned by M4; this chapter is the implementation reference

---

```
S1-04_B4_STATE_MACHINE_NETWORK_V10_DEEP_UPGRADE_COMPLETE
```
