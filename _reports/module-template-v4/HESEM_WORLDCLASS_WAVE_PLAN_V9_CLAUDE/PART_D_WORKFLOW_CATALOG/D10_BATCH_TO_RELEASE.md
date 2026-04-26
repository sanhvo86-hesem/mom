# D10 — Batch to Release (Pharma Vertical Pack)

```
workflow_id:    D10
workflow_name:  Batch to Release
owner_role:     Quality Lead with Pharma Lead
participants:   Production Lead, Compliance Lead, Qualified Person (EU)
                or QA Director (US)
vertical_pack:  Pharma (this workflow is pharma-specific)
```

---

## 1. Purpose

Batch to Release is the pharmaceutical-specific workflow from a Master
Batch Record being executed through formal batch release for shipment.
This workflow has the strictest regulatory discipline in HESEM (per 21
CFR Part 211, EU GMP Annex 13/16, ICH Q7, ICH Q10).

---

## 2. Trigger

A Master Batch Record (MBR) is selected for execution. A new batch is
initiated.

---

## 3. Actors

```
Production Operator         Executes batch operations
Production Supervisor       Oversees batch execution
QC Analyst                  Performs in-process and final QC tests
QC Manager                  Reviews QC results
QA Reviewer                 Reviews executed batch record
QA Manager / Director       Approves batch release (US)
Qualified Person (QP)       Certifies batch release (EU per Annex 16)
Pharma Lead                 Owns the program
Regulatory Affairs          Handles regulatory submissions
```

---

## 4. Steps

### Step 1 — Master Batch Record Selection

Pharma Lead selects the MBR to execute. MBR is the validated recipe
for the product. Each batch instance becomes an Executed Batch Record
(EBR) per ISA-88 procedure model.

### Step 2 — Batch Initiation

EBR is created from MBR template. Operator scans, batch is initiated.
Each phase, each step is captured with parameters, signatures, and
observations.

### Step 3 — In-Process Phases

Per ISA-88, the procedure decomposes:
- Procedure
- Unit Procedure (e.g., "wet granulation")
- Operation (e.g., "mix")
- Phase (e.g., "add water at 30 RPM for 5 minutes")

Each phase records:
- Parameter values (setpoints actually used)
- Operator signature
- Equipment used
- Material consumed (specific lots)
- Output produced
- Deviations (if any) with reason

### Step 4 — In-Process QC

QC Analyst samples per the in-process control plan. Tests performed:
visual, dimensional, chemical, microbiological. Results recorded.

### Step 5 — Deviation Handling (when applicable)

Any deviation from the MBR is captured as a Deviation record.
Investigated. Dispositioned. May trigger CAPA (D6).

### Step 6 — Final QC

When the batch is complete, final QC tests:
- Final assay
- Impurity profile
- Dissolution
- Microbiological burden
- Container/closure integrity (sterile)

Results recorded against specification.

### Step 7 — EBR Review

QA Reviewer reviews the entire EBR for:
- Completeness (all phases captured)
- Conformance (all parameters in spec)
- Deviation handling (all deviations documented and dispositioned)
- QC results (all pass or appropriately handled)

### Step 8 — Annual Product Review Linkage

The batch and its data feed into the Annual Product Review (CAP-C7-09).

### Step 9 — Batch Release Decision

Per regulatory framework:

**United States (FDA)**:
- QA Manager / Director reviews the EBR
- Two-person e-signature on release decision
- Per 21 CFR 211.165 (testing and release for distribution)

**European Union (EMA)**:
- Qualified Person (QP) certifies the batch per Annex 16
- QP's certification is the formal release
- Single QP signature with HSM-backed key (per Annex 16 §1)

**Other jurisdictions**: per local regulation.

### Step 10 — Batch Release

If approved:
- BREL transitions to "released"
- Lot's status transitions to "released-for-shipment"
- DSCSA serialization events generated (US, per CAP-C8-05)
- EPCIS events exchanged with trading partners

If rejected:
- Investigation
- Disposition (rework if possible, scrap if not)
- CAPA opened

### Step 11 — Distribution Authorization

Released batch is now authorized for shipment. D11 Release to Trace
takes over.

---

## 5. Decision points

```
DP1  Master Batch Record:    which validated recipe to use
DP2  Phase parameter:        in-spec / out-of-spec
DP3  Deviation handling:     accept / investigate / scrap
DP4  In-process QC:          pass / fail
DP5  Final QC:               pass / fail / OOS investigation
DP6  EBR review:              complete / incomplete / deficient
DP7  Release decision:        release / hold / reject
DP8  QP certification (EU):  certify / withhold
```

---

## 6. Cross-domain footprint

This workflow uses many domains:
- D-06 Production (EBR execution)
- D-07 Quality (in-process QC, deviations, final QC, EBR review, BREL)
- D-08 Traceability (BREL, DSCSA, lot genealogy)
- D-05 Inventory (lot status changes)
- D-09 Maintenance (equipment validation, calibration)
- D-10 Workforce (operator and QC analyst eligibility)
- D-12 Integration (EPCIS partner exchange)

---

## 7. State machines

SM-6 Release (BREL primary), SM-3 Inspection (QC), SM-4 NC + CAPA (for
deviations), SM-2 Material (lot status), SM-12 Complaint/Recall
(potential post-release).

---

## 8. Evidence captured

```
- Executed Batch Record (immutable post-release)
- Phase-by-phase parameter records
- Operator signatures per phase
- In-process and final QC results
- Deviation records with investigation and disposition
- BREL release decision with two-person e-signature (US) or QP
  certification (EU)
- DSCSA serialization events
- Annual Product Review aggregation
- WORM storage permanent
```

---

## 9. Regulatory considerations

```
- 21 CFR Part 211 §211.165 (US batch release)
- EU GMP Annex 13 (investigational medicinal products)
- EU GMP Annex 16 (QP certification)
- ICH Q7 (API GMP)
- ICH Q9 (Quality risk management)
- ICH Q10 (Pharmaceutical quality system)
- DSCSA (US Drug Supply Chain Security Act)
- EPCIS (Track-and-trace event exchange)
- 21 CFR Part 11 (e-records, e-signatures, two-person)
- USP / Ph.Eur. monographs (final test specifications)
```

---

## 10. Wave target

L0 currently. L7 by Wave 10 (Pharma vertical pack).

---

## 11. Failure modes

```
- Phase parameter OOS:      deviation; investigate; possibly continue
                             or reject batch
- Final QC OOS:              full investigation; OOS investigation
                             follows formal protocol
- Deviation root cause unclear: extended investigation; CAPA
- QP unavailable:            delegate per EU GMP Annex 16 procedure
- DSCSA event not exchanged: follow up with trading partner;
                             documented exception per FDA
```

---

## 12. Decision phrase

```
D10_BATCH_TO_RELEASE_BASELINE_LOCKED
NEXT: D11_RELEASE_TO_TRACE.md
```
