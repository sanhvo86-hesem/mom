# D4 — Receive to Inspect

```
workflow_id:    D4
workflow_name:  Receive to Inspect
owner_role:     Logistics Lead
participants:   Procurement Lead, Quality Lead
```

---

## 1. Purpose

Receive to Inspect is the workflow from physical receipt of incoming
material at the dock through quality clearance. It is the discipline
that prevents non-conforming material from entering production.

---

## 2. Trigger

A supplier shipment arrives at the receiving dock.

---

## 3. Actors

```
Carrier Driver            Delivers physical goods
Receiving Operator        Records receipt
QA Inspector              Performs IQC
QA Manager                Dispositions held material
Buyer                     Notified of any discrepancies
```

---

## 4. Steps

### Step 1 — Physical Receipt

Carrier delivers goods. Receiving Operator counts and verifies against
the PO and packing list. Discrepancies (count, item, condition) flagged
immediately.

### Step 2 — Receipt Record

Receiving Operator creates a Receipt record in HESEM, linked to the PO.
The receipt creates inventory transactions (with received material in
quarantine status).

### Step 3 — Inspection Plan Selection

The Item Master determines what inspection plan applies. Inspection
plan defines AQL (Acceptable Quality Level), sample size, check items,
required equipment.

### Step 4 — Sampling

QA Inspector samples per the plan. Equipment used is verified for
calibration currency.

### Step 5 — Inspection Execution

Each check item is performed and recorded. Out-of-tolerance results
flag the inspection.

### Step 6 — Inspection Disposition

Per inspection results:
- All passed: lot released from quarantine (CAP-C5-04 release)
- Some failed but within AQL: lot accepted with documentation
- AQL breached: lot fails inspection
- Critical defect: 100% inspection or full rejection

### Step 7 — Failure Disposition

For failed inspections, QA Manager dispositions:
- Reject and return to supplier (RTV)
- Reject and scrap
- Concession (use with documentation)
- Rework (in-house or supplier)

Failed inspections trigger SCAR (D6 NC to CAPA flows).

### Step 8 — Material Available

Accepted material transitions to "available" in inventory and is
visible to MRP for allocation.

---

## 5. Decision points

```
DP1  Inspection plan:    which plan applies for this item / supplier?
DP2  Sampling:           AQL / sample size per plan
DP3  Disposition:         accept / reject / rework / concession
DP4  Failed handling:    RTV / scrap / concession / rework
```

---

## 6. Cross-domain footprint

D-05 Inventory (primary), D-04 Procurement (PO, supplier), D-07 Quality
(IQC), D-09 Maintenance (calibration).

---

## 7. State machines

SM-3 Inspection, SM-2 Material, SM-9 Procurement.

---

## 8. Evidence captured

Receipt record, inspection plan version, sample results, disposition
record with signer, lot quarantine state changes.

---

## 9. Wave target

L4 by W3 (eQMS Core); L5 by W3.

---

## 10. Failure modes

```
- Wrong item received:  receipt held; supplier notified; PO adjusted
- Quantity short:       partial receipt; expedite remaining
- Damage in transit:    claim against carrier; supplier notified
- Inspection equipment OOT:  inspection invalidated; recalibration; re-inspect
```

---

## 11. Decision phrase

```
D4_RECEIVE_TO_INSPECT_BASELINE_LOCKED
NEXT: D5_INSPECT_TO_DISPOSITION.md
```
