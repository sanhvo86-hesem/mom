# D5 — Inspect to Disposition

```
workflow_id:    D5
workflow_name:  Inspect to Disposition
owner_role:     Quality Lead
participants:   Production Lead, Logistics Lead, MRB members
```

---

## 1. Purpose

Inspect to Disposition is the workflow from inspection (IQC, IPC, or
OQC) through to a final accept/reject/concession/rework decision for
material. When standard disposition is unclear, it escalates to MRB
(Material Review Board) for multi-party decision.

This is the bridge between Quality finding a problem and Operations
acting on it.

---

## 2. Trigger

An inspection result is available — either:
- IQC (Incoming) per D4
- In-Process Inspection (IPC) during D3 production
- OQC (Outgoing) before D11 release

---

## 3. Actors

```
QA Inspector             Performs the inspection
QA Engineer              Investigates findings, drafts disposition
QA Manager               Approves standard dispositions
MRB members              Multi-party (Quality + Engineering + Production)
                          for borderline cases
Production Supervisor    Acts on disposition (rework / scrap)
Logistics Operator       Executes physical actions (move, scrap)
```

---

## 4. Steps

### Step 1 — Inspection Results Available

The inspection completes (per D4 or in-process). Results are recorded
in the inspection record.

### Step 2 — Standard vs Borderline Classification

If results clearly pass (within all tolerances) → automatic accept
disposition. If results clearly fail outside any tolerance → standard
fail handling. If results are borderline or unusual → escalate to MRB.

### Step 3 — Standard Pass Path

Lot quarantine cleared. Material moves to "available" status. Genealogy
edges may be created.

### Step 4 — Standard Fail Path

If outright failure:
- Open NC (D6)
- Lot remains in quarantine or moves to "rejected"
- Disposition decision: scrap, return to supplier, rework

### Step 5 — MRB Path (when escalation needed)

Multi-party review:
- Quality presents findings
- Engineering assesses impact (does the deviation affect form, fit,
  function?)
- Production assesses recovery options
- Discussion and decision with multi-signer e-signature
- Disposition: accept-as-is, accept-with-concession, rework, reject

Recorded in MRB record with full multi-party signoff.

### Step 6 — Disposition Action

Per the decision:
- **Accept**: lot transitions to available; downstream operations or
  shipment proceed.
- **Accept with concession**: lot transitions to available; CDOC
  concession addendum may be required for documentation.
- **Rework**: MWO created (D9 if equipment-side); WO routing modified
  if shopfloor rework.
- **Reject**: lot scrapped or returned; SCAR if supplier-source
  (D6 + D2).

### Step 7 — Closure

Inspection record transitions to its terminal disposition state. NC
records (if any) flow to D6 (NC to CAPA).

---

## 5. Decision points

```
DP1  Pass / fail / borderline classification
DP2  MRB escalation needed?
DP3  Accept / concession / rework / reject decision
DP4  Concession requires CDOC update?
DP5  Rework feasibility?
DP6  SCAR if supplier-source
```

---

## 6. Cross-domain footprint

D-07 Quality (primary), D-05 Inventory (lot status changes), D-06
Production (rework execution), D-04 Procurement (SCAR if supplier),
D-08 Traceability (genealogy of dispositions).

---

## 7. State machines

SM-3 Inspection, SM-4 NC + CAPA + SCAR, SM-2 Material.

---

## 8. Evidence captured

Inspection record with all check item results, disposition record with
signers, MRB decision record with multi-party signoffs, NC if raised,
SCAR if supplier-fault, genealogy update.

---

## 9. Wave target

L4 by W3 (eQMS Core); L5 by W3.

---

## 10. Failure modes

```
- Inspection inconclusive:    repeat inspection or escalate to MRB
- MRB cannot reach decision:  escalate to higher authority (VP Quality)
- Disposition incompatible with regulation: alternative path; RA notified
- Rework not feasible:        scrap; cost variance posted
```

---

## 11. Decision phrase

```
D5_INSPECT_TO_DISPOSITION_BASELINE_LOCKED
NEXT: D6_NC_TO_CAPA.md
```
