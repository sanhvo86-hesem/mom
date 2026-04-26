# D2 — Procurement to Pay

```
workflow_id:    D2
workflow_name:  Procurement to Pay
owner_role:     Procurement Lead
participants:   Logistics Lead, Quality Lead, Finance Lead
```

---

## 1. Purpose

Procurement to Pay is the workflow by which HESEM acquires goods and
services from suppliers, verifies they meet specification, and pays
the supplier per terms. It is the mirror of D1 Order to Cash on the
supply side.

---

## 2. Trigger

The workflow begins when a purchase requisition is generated — most
commonly from MRP (D3) when materials are needed. Manual purchase
requisitions are also supported (e.g., for non-recurring items).

---

## 3. Actors

```
MRP / Planner           Generates purchase requisitions
Procurement Buyer       Issues PO, manages supplier relationship
Supplier (external)     Receives PO, ships goods, sends invoice
Receiving Operator      Records receipt at the dock
QA Inspector            Performs IQC
QA Manager              Dispositions failed receipts
Finance / AP            Matches invoice, pays supplier
```

---

## 4. Steps

### Step 1 — Purchase Requisition

MRP generates a requisition for components needed to fulfill production.
Manual requisitions are also possible. Requisitions are reviewed by
Procurement.

### Step 2 — Purchase Order Issuance

The Buyer issues a Purchase Order to the Supplier (often the preferred
supplier per Item Master + Supplier Master qualification). PO is sent
via EDI 850, email, portal, or fax (rare). Supplier acknowledges per
EDI 855 or email reply.

### Step 3 — Receipt at Dock

When the supplier ships, goods arrive at the dock. Receiving Operator
records the Receipt, linking to the originating PO. The received
material enters quarantine status pending IQC.

### Step 4 — Incoming Quality Control (IQC)

QA Inspector performs IQC per inspection plan for the item. Inspection
findings determine disposition: accept (release from quarantine),
reject (return or scrap), rework (sometimes possible at supplier's
expense), concession (use with documented exception).

### Step 5 — Disposition Action

Per the IQC disposition:
- Accept: lot released from quarantine; available for production.
- Reject: SCAR raised; supplier notified; goods returned per agreement.
- Rework: depends on agreement; may go back to supplier or be reworked
  in-house with cost recovery.
- Concession: lot released with documentation of exception; may trigger
  CDOC concession addendum.

### Step 6 — Invoice Match

Supplier sends invoice (typically EDI 810). HESEM matches invoice to PO
to receipt — known as 3-way match. If all three agree (within tolerance),
invoice is approved.

### Step 7 — Payment

Per agreed terms (Net 30, Net 60, etc.), Finance pays the supplier.
Payment is posted to the customer's primary financial system via GL
Integration.

### Step 8 — Closure

When PO is fully received and all invoices paid, PO transitions to
"closed."

---

## 5. Decision points

```
DP1  PO source: best supplier per qualification + price + lead time
DP2  IQC disposition: accept / reject / rework / concession
DP3  Invoice 3-way match: tolerance for variance
DP4  Payment timing: per terms
```

---

## 6. Cross-domain footprint

D-04 Procurement (primary), D-05 Inventory (receipts), D-07 Quality
(IQC + SCAR), D-11 Finance (invoice + payment), D-02 Engineering (BOM
drives demand), D-03 Planning (MRP generates requisitions).

---

## 7. State machines

SM-9 Procurement, SM-3 Inspection (for IQC), SM-4 NC (for SCAR).

---

## 8. Evidence captured

PO, Receipt record, IQC results, supplier scorecard updates, SCAR
records, payment posting.

---

## 9. Wave target

L4 by W4 (read-only); L5 by W5.

---

## 10. Failure modes

```
- Supplier ships wrong item or wrong quantity → Receipt discrepancy → review
- IQC fails → SCAR raised → supplier corrective action
- Invoice variance beyond tolerance → routed to Buyer for resolution
- Late delivery → impact on production schedule → expedite or substitute
```

---

## 11. Decision phrase

```
D2_PROCUREMENT_TO_PAY_BASELINE_LOCKED
NEXT: D3_PLAN_TO_PRODUCE.md
```
