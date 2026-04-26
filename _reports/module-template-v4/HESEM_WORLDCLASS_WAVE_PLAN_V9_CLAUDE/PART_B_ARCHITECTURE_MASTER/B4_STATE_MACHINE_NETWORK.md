# B4 — State Machine Network (the 14 coupled state machines)

This chapter describes the network of state machines that govern HESEM's
operational records. Each authoritative root that participates in
mutation lives in exactly one state machine; mutations between roots
sometimes trigger transitions in other roots (these are the "couplings"
described later in this chapter).

The 14 state machines are presented at the planning level — what each
machine governs, what its principal states are, and what couplings flow
between machines. Specific transition definitions are described per-root
in PART_C and per-workflow in PART_D.

---

## 1. The 14 state machines

```
SM-1   Order machine               (QUO, CPO, SO, SHIPMENT, INVOICE)
SM-2   Material machine            (LOT, IREV, GENEALOGY)
SM-3   Inspection machine          (INSP, IQC, IPC, OQC, MRB)
SM-4   NC + CAPA + SCAR machine    (NQCASE, CAPA, SCAR)
SM-5   Document machine            (CDOC, ECO)
SM-6   Release machine             (BREL)
SM-7   Maintenance machine         (MWO, PMSCH)
SM-8   Equipment machine           (EQP, CAL, SPC, FMEA, VAL)
SM-9   Procurement machine         (PO, RECEIPT)
SM-10  Job and Work Order machine  (JO, WO, OPER)
SM-11  Training machine            (TRAIN_COURSE, TRAIN_RECORD, COMP_MATRIX)
SM-12  Complaint and Recall machine (COMPLAINT, RECALL, SAFETY_REPORT)
SM-13  Calibration machine         (CAL, MSA, GR&R)
SM-14  Validation machine          (URS, RTM, IQ, OQ, PQ, VMP)
```

These 14 machines are not independent. The "network" terminology
emphasizes that transitions in one machine can trigger transitions in
others (the couplings). The discipline is that all couplings are explicit
and declared, never implicit.

---

## 2. SM-1 — Order machine

**What this machine governs.** The lifecycle of a sales order from
quotation through fulfillment. Roots: Quotation, Customer Purchase Order,
Sales Order, Shipment, Invoice.

**Principal states (per root, sketched).**
- Quotation: draft, submitted, won, lost, expired, superseded
- Customer PO: received, acknowledged, in-fulfillment, fulfilled, closed
- Sales Order: draft, confirmed, allocated, in-production, ready-to-ship,
  shipped, invoiced, closed, on-hold-quality, cancelled
- Shipment: planned, picked, packed, in-transit, delivered, exception
- Invoice: draft, sent, paid, overdue, written-off

**Couplings to other machines.**
- SO confirmation triggers MRP run (Planning) — coupling to SM-10.
- Shipment requires lot release (BREL) — coupling to SM-6.
- Quality hold on a lot quarantines SO — coupling from SM-2 and SM-4.
- Customer complaint on a shipped lot triggers complaint workflow —
  coupling to SM-12.

**Owner.** Commercial Lead with Logistics Lead.

---

## 3. SM-2 — Material machine

**What this machine governs.** The lifecycle of material lots and item
revisions, including genealogy. Roots: Lot, Item Revision, Lot Genealogy
edges.

**Principal states.**
- Lot: in-quarantine, available, allocated, consumed, rejected, scrapped,
  released-for-shipment, shipped
- Item Revision: draft, in-review, released, superseded, obsolete
- Lot Genealogy: an edge (not a state); created at consumption-or-production
  events

**Couplings.**
- NC on a lot triggers quarantine — coupling from SM-4.
- Rejection of a lot triggers CAPA candidate — coupling to SM-4.
- Lot consumption triggers inventory transaction — internal to lot lifecycle.
- Lot release authorization comes from BREL — coupling from SM-6.

**Owner.** Logistics Lead with Quality Lead.

---

## 4. SM-3 — Inspection machine

**What this machine governs.** The lifecycle of inspection records,
including incoming, in-process, outgoing inspections, and Material
Review Board actions. Roots: Inspection, IQC, IPC, OQC, MRB.

**Principal states.**
- Inspection: scheduled, in-progress, completed, dispositioned-accept,
  dispositioned-reject, dispositioned-rework, dispositioned-concession,
  dispositioned-needs-MRB
- MRB: case-open, in-review, decision-made, action-assigned, closed

**Couplings.**
- Inspection failure raises NC — coupling to SM-4.
- Inspection of a lot drives lot disposition — coupling to SM-2.
- Out-of-tolerance in calibration triggers review of affected
  inspections — coupling from SM-13.
- SPC violation may trigger inspection — coupling from SM-8.

**Owner.** Quality Lead.

---

## 5. SM-4 — NC + CAPA + SCAR machine

**What this machine governs.** The full nonconformance lifecycle:
nonconformance opening, investigation, disposition, CAPA spawning, CAPA
execution, effectiveness check, supplier corrective action requests.
Roots: Nonconformance Case, CAPA, Supplier Corrective Action Request.

**Principal states.**
- NQCASE: draft, open, in-investigation, in-disposition,
  dispositioned-accept, dispositioned-concession, dispositioned-rework,
  dispositioned-reject, awaiting-CAPA, closed, reopened
- CAPA: draft, open, investigation-in-progress, root-cause-identified,
  corrective-action-in-progress, effectiveness-check-pending,
  closed-effective, reopened
- SCAR: draft, opened, acknowledged-by-supplier, containment-in-place,
  root-cause-identified, corrective-action-complete, effectiveness-check,
  closed

**Couplings.**
- NC opening triggers lot quarantine — coupling to SM-2.
- NC disposition rejecting triggers CAPA auto-create — internal.
- CAPA close requires effectiveness check — internal with timer.
- CAPA close on supplier issue may trigger SCAR — internal.
- SCAR close affects supplier scorecard — coupling to SM-9.

**Owner.** Quality Lead.

---

## 6. SM-5 — Document machine

**What this machine governs.** Controlled documents and engineering
change orders. Roots: Controlled Document, Engineering Change Order.

**Principal states.**
- CDOC: draft, in-review, approved, released, superseded, withdrawn
- ECO: draft, impact-analysis-in-progress, impact-analyzed, in-review,
  approved, implementing, verified, closed, rejected

**Couplings.**
- CDOC release triggers training assignment — coupling to SM-11.
- ECO approval releases linked CDOCs — internal.
- ECO approval may schedule training assignment — coupling to SM-11.
- ECO impact assessment may identify impact on equipment — coupling
  to SM-8.

**Owner.** Document Control Lead with Engineering Lead.

---

## 7. SM-6 — Release machine

**What this machine governs.** The lifecycle of batch / build releases.
Root: Batch Release (BREL).

**Principal states.**
- BREL: draft, in-review, ready-for-release, released, withdrawn

**Couplings.**
- BREL approval requires evidence chain from inspection (SM-3),
  quality (SM-4 closed CAPAs and no open critical NCs), training
  (SM-11 compliance), validation (SM-14 fresh evidence), and lot
  status (SM-2 quarantine clear) — many couplings inbound.
- BREL release commits lot release — coupling to SM-2.
- BREL release notifies customer of release — coupling to SM-1.

**Owner.** Quality Lead with Production Lead.

---

## 8. SM-7 — Maintenance machine

**What this machine governs.** Maintenance work orders and PM
schedules. Roots: Maintenance Work Order, PM Schedule.

**Principal states.**
- MWO: scheduled, in-progress, completed, deferred, cancelled
- PMSCH: active, due, overdue, completed-in-cycle, suspended

**Couplings.**
- PMSCH due triggers MWO auto-create — internal.
- MWO on equipment that has open NC may extend NC review — coupling
  from SM-4.
- MWO completion on calibration equipment requires CAL update —
  coupling to SM-13.

**Owner.** Maintenance Lead.

---

## 9. SM-8 — Equipment machine

**What this machine governs.** Equipment, calibrations, SPC, FMEA,
validation. Roots: Equipment, Calibration, SPC, FMEA, Validation Run.

**Principal states.**
- EQP: active, in-maintenance, calibration-due, calibration-overdue,
  decommissioned
- SPC: stable, alert, out-of-control
- FMEA: draft, in-review, approved, in-revision

**Couplings.**
- Calibration out-of-tolerance triggers review of affected lots —
  coupling to SM-2.
- SPC out-of-control may trigger inspection — coupling to SM-3.
- FMEA update may trigger SPC re-evaluation — internal.
- Equipment failure may pause production — coupling to SM-10.

**Owner.** Maintenance Lead with Quality Engineer.

---

## 10. SM-9 — Procurement machine

**What this machine governs.** Purchase orders and receiving. Roots:
Purchase Order, Receipt.

**Principal states.**
- PO: draft, sent, acknowledged-by-supplier, partially-received, fully-
  received, closed, cancelled
- RECEIPT: pending-inspection, IQC-passed, IQC-rejected, partially-passed

**Couplings.**
- PO requires Item Master and Supplier Master — coupling to dependency
  roots.
- Receipt triggers IQC — coupling to SM-3.
- IQC rejection triggers SCAR candidate — coupling to SM-4.

**Owner.** Procurement Lead.

---

## 11. SM-10 — Job and Work Order machine

**What this machine governs.** Job orders and work orders for production
execution. Roots: Job Order, Work Order, Operation Execution.

**Principal states.**
- JO: planned, released, in-production, completed, cancelled
- WO: planned, dispatched, in-progress, completed, paused
- OPER: pending, in-progress, completed, paused, scrap

**Couplings.**
- JO requires Item Revision and Routing — coupling to dependency roots.
- WO requires operator eligibility (training) — coupling to SM-11.
- WO requires equipment eligibility (calibration, MWO status) —
  coupling to SM-8.
- WO requires material eligibility (lot status, quarantine) —
  coupling to SM-2.
- OPER completion produces output lot — coupling to SM-2.

**Owner.** Production Lead.

---

## 12. SM-11 — Training machine

**What this machine governs.** Training courses, training records, and
competency matrices. Roots: Training Course, Training Record, Competency
Matrix.

**Principal states.**
- TRAIN_COURSE: draft, in-review, released, superseded, retired
- TRAIN_RECORD: assigned, in-progress, completed-not-certified,
  certified, expired

**Couplings.**
- TRAIN_RECORD certify requires e-signature per Part 11 — internal.
- COMP_MATRIX requires courses for roles — internal.
- Operator dispatch requires certified training — coupling from SM-10.
- ECO release on a CDOC may trigger TRAIN_COURSE update — coupling
  from SM-5.

**Owner.** HR Lead with Quality Lead.

---

## 13. SM-12 — Complaint and Recall machine

**What this machine governs.** Customer complaints, safety reports
(ICSRs), and product recalls. Roots: Complaint, Recall, Safety Report.

**Principal states.**
- COMPLAINT: received, triaged, classified, investigation-in-progress,
  root-cause-identified, corrective-action-in-progress, resolved, closed
- RECALL: identified, classified-I-II-III, notified-FDA, notified-customer,
  in-progress, effectiveness-check, closed
- SAFETY_REPORT: drafted, submitted, follow-up-required, closed

**Couplings.**
- COMPLAINT investigation may trigger NC — coupling to SM-4.
- COMPLAINT classified high-risk may trigger RECALL workflow.
- RECALL identification triggers genealogy traversal of affected
  lots — uses OTG materialized view from B3.

**Owner.** Quality Lead with Regulatory Lead.

---

## 14. SM-13 — Calibration machine

**What this machine governs.** Calibration records, measurement system
analysis (Gauge R&R), bias and linearity studies. Roots: Calibration
Record, MSA Study.

**Principal states.**
- CAL: scheduled, in-progress, completed-passed, completed-failed-OOT,
  re-calibrated
- MSA: planned, in-progress, completed, passed, failed

**Couplings.**
- CAL out-of-tolerance triggers review of all measurements made by the
  equipment since the last passing calibration — coupling to SM-3 and
  SM-2.
- MSA failure blocks measurement device from authoritative use — internal.

**Owner.** Metrology Lead.

---

## 15. SM-14 — Validation machine

**What this machine governs.** The validation lifecycle: User Requirements
Specification, Requirements Traceability Matrix, Installation Qualification,
Operational Qualification, Performance Qualification, Validation Master Plan.

**Principal states.**
- VMP: drafted, in-review, approved, executing, complete
- IQ: planned, in-execution, passed, failed
- OQ: planned, in-execution, passed, failed (per slice)
- PQ: planned, in-execution, in-observation, passed, failed (continuous)
- URS: drafted, in-review, approved, superseded
- RTM: in-progress, complete, audited

**Couplings.**
- IQ pass enables OQ. OQ pass enables PQ. PQ pass enables L6 promotion.
  This is described in PART_H Validation Feedback Loop.
- Stale validation evidence (per axiom A18 in B3) triggers automatic
  demotion of the affected root.

**Owner.** Validation Lead.

---

## 16. The coupling matrix

When a transition in one state machine fires, it can trigger transitions
in other state machines. These couplings are explicit and declared, never
implicit. The complete coupling matrix is described in PART_D (Workflow
Catalog). A summary:

```
Origin transition                Target machine    Effect
--------------------------------- ----------------- -------------------------
nqcase.open                       SM-2              lot quarantine_state := 'quarantined'
nqcase.dispose_accept              SM-2              if no open NCs on lot, lot quarantine cleared
nqcase.dispose_reject              SM-4              CAPA auto-create or assign
nqcase.dispose_concession          SM-5              CDOC concession_required flag
capa.action_complete               SM-4              effectiveness check schedule (NOW + 90d)
capa.effectiveness_check_pass      SM-4              CAPA closed
capa.effectiveness_check_fail      SM-4              CAPA reopened
brel.attempt_release               SM-2 + SM-3 + SM-4 + SM-8 + SM-11 + SM-14   evidence chain
brel.release_committed             SM-2              lot.released
cdoc.release                       SM-5              ECO requirement check
eco.approve                        SM-5 + SM-11      CDOC release + training assignment
fmea.update                        SM-8              SPC re-evaluation
spc.violation                      SM-3              inspection.required + notify
calibration.oot                    SM-3 + SM-2 + SM-14    review affected lots/inspections/validations
val.fail                           per affected root  requalification_required; release blocked
```

These are 14 coupling rules at the headline level. PART_D contains the
full enumeration with payload templates.

---

## 17. State machine completeness rules

Every state machine in HESEM honors these rules:

```
Rule SM-1   Every state must be reachable from a designated start state.
            No orphan states.
Rule SM-2   Every state must have at least one outbound transition or
            be marked terminal.
Rule SM-3   Every transition must have non-empty guards or an explicit
            zero-guard justification.
Rule SM-4   Every regulated transition must have e-signature obligation
            per the validation scope.
Rule SM-5   Every transition must emit at least one workflow_event and
            one audit_event.
Rule SM-6   For every transition with rollback model 'compensating
            command', there must be a compensating transition that
            returns to the prior state.
Rule SM-7   Coupling targets must exist (the target machine and
            transition must be defined).
```

These rules are verified by a state-machine consistency check that runs
in CI when state machine definitions change.

---

## 18. State machine ownership

Each state machine has a named lead who reviews any change to the machine.
The lead is also the primary author of the corresponding chapter in PART_D
(workflow catalog) where that state machine's principal workflow is
described.

| Machine | Owner role |
|---|---|
| SM-1 Order | Commercial Lead |
| SM-2 Material | Logistics Lead |
| SM-3 Inspection | Quality Lead |
| SM-4 NC + CAPA + SCAR | Quality Lead |
| SM-5 Document | Document Control Lead |
| SM-6 Release | Quality Lead |
| SM-7 Maintenance | Maintenance Lead |
| SM-8 Equipment | Maintenance Lead with Quality Engineer |
| SM-9 Procurement | Procurement Lead |
| SM-10 Job/Work Order | Production Lead |
| SM-11 Training | HR Lead |
| SM-12 Complaint/Recall | Quality Lead with Regulatory Lead |
| SM-13 Calibration | Metrology Lead |
| SM-14 Validation | Validation Lead |

---

## 19. Decision phrase

```
B4_STATE_MACHINE_NETWORK_BASELINE_LOCKED
NEXT: B5_DATA_FLOW_AND_LINEAGE.md
```
