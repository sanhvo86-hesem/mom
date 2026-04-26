# D1 — Order to Cash

```
workflow_id:    D1
workflow_name:  Order to Cash (sometimes "Quote to Cash")
owner_role:     Commercial Lead
participants:   Logistics Lead, Production Lead, Quality Lead, Finance Lead
```

---

## 1. Purpose

Order to Cash is the workflow that turns a customer demand signal into
delivered goods and collected revenue. It is the most-used commercial
workflow in HESEM and the first one most customers encounter.

---

## 2. Trigger

Order to Cash begins with one of:
- A prospect requests a quotation (RFQ)
- A customer issues a Purchase Order (CPO arrives via EDI, email, portal,
  or phone capture)
- A pre-existing contract triggers a release (blanket order release)

---

## 3. Actors

Roles involved across the workflow:

```
Sales Engineer / Commercial   Authors quotation, owns customer relationship
Customer (external)           Issues CPO, receives goods, pays invoice
Pricing Analyst               Reviews quote pricing, applies tier rules
Production Planner            Confirms capacity for the order
Procurement Buyer             Issues POs for sourced components
QA Inspector                  Inspects goods at relevant gates
Production Operator           Executes operations
Warehouse Operator            Picks, packs, ships
Logistics Coordinator         Manages carrier and delivery
Finance / AR                  Generates invoice, tracks payment
Quality Director              Approves Batch Release (regulated)
```

---

## 4. Steps

### Step 1 — Quotation

(When demand starts as RFQ.)

The customer sends a Request For Quote (RFQ). The Sales Engineer drafts
a Quotation in HESEM, specifying items, quantities, prices, terms, and
validity dates. The Quotation is internally reviewed: Pricing Analyst
verifies pricing rules; Planning verifies capacity feasibility for the
proposed delivery dates. The Quote is submitted to the customer.

If won, the Quotation transitions to "won" state and converts to a
Customer Purchase Order acknowledgment, which becomes the basis of a
Sales Order.

### Step 2 — Customer Purchase Order Capture

The customer's PO arrives. HESEM ingests it (via EDI 850, portal upload,
email parser, or manual entry). The Customer PO is validated:
- Item codes match HESEM Item Master
- Quantities are reasonable (no obvious typos)
- Prices match agreed pricing (within tolerance per customer)
- Dates are feasible (not impossibly soon, not impossibly far)
- Customer is in good standing (not on credit hold)

Validation discrepancies route to a human review queue. Validated POs
proceed to Sales Order generation.

### Step 3 — Sales Order Confirmation

A Sales Order is generated from the validated CPO. It enters the
"draft" state initially, then is confirmed by Commercial after final
review (e.g., to apply customer-specific terms, add specific delivery
instructions). Confirmation transitions the SO to "confirmed."

Confirmation is the trigger for downstream workflows:
- D3 Plan to Produce begins (if items are made-to-order or low-stock)
- D2 Procurement to Pay begins (if components must be purchased)

### Step 4 — Allocation

The system attempts to allocate inventory against the Sales Order. If
sufficient on-hand inventory exists, the SO transitions to "allocated"
and the inventory is reserved. If not, the SO waits for production
completion.

### Step 5 — Production (handoff to D3)

(When SO requires manufacturing.) D3 Plan to Produce takes over: MRP
runs, jobs are released, work orders flow to the floor, operations
execute, finished goods accumulate.

When production produces enough finished goods to fulfill the SO, the
SO transitions to "ready-to-ship." For regulated batches, Batch Release
(D10) gates the transition to "ready-to-ship."

### Step 6 — Quality Hold (conditional)

(If quality findings affect this order.) If a Nonconformance Case raises
quality concerns about the inventory allocated to the SO, the SO may
transition to "on-hold-quality" until the case is dispositioned.

### Step 7 — Picking and Packing

The Warehouse Operator picks the specific lots/serials per the
fulfillment instructions. Picking generates inventory transactions
recording consumption. Packing prepares the shipment. A shipment record
is created.

### Step 8 — Shipment

The carrier picks up. The Shipment record transitions through
"picked" → "packed" → "in-transit" → "delivered" (or "exception").
Delivery confirmation may come from carrier API or customer signature.

The genealogy edge from Lot/Serial to Shipment to Customer is recorded
in the OTG (PART_B3) for traceability and recall coverage.

### Step 9 — Invoicing

(Often immediately upon shipment, or per customer terms.) Finance
generates an invoice from the shipment data. Tax rules are applied per
jurisdiction. The invoice is sent to the customer (email, EDI 810, or
portal). The invoice is posted to the customer's primary financial
system via GL Integration.

### Step 10 — Payment Tracking

The invoice transitions through "sent" → "paid" (or "overdue"). Payment
is tracked, often integrated with the customer's primary AR system.

### Step 11 — Closure

When all order lines are shipped and invoiced, the SO transitions to
"closed." The customer's PO is acknowledged as fulfilled.

---

## 5. Decision points

```
DP1   Quote review:         pricing acceptable / capacity feasible?
DP2   CPO validation:       items / quantities / dates / customer OK?
DP3   Quality hold:         NC findings affect this SO? Hold or release.
DP4   Allocation:           sufficient inventory on hand?
DP5   Batch release (regulated): evidence chain complete? Release or hold.
DP6   Shipment exception:   delivery failed? Reroute or escalate.
DP7   Invoice payment:      customer paid? On time? Pursue collection.
```

---

## 6. Data flow

```
RFQ → Quotation (created, won/lost/expired)
Customer PO → CPO (received, validated)
CPO → Sales Order (confirmed)
Sales Order → MRP run (D3)
Sales Order → Allocation transaction (D5 inventory)
Sales Order → Job Order (D3 if make-to-order)
Job Order → Work Order → OPER (D6)
OPER completion → Finished good lot
Finished good lot → BREL (D10 for regulated)
BREL release → Allocation confirmed for ready-to-ship
Ready-to-ship → Pick + pack → Shipment
Shipment → Inventory transaction (consume)
Shipment → Genealogy edge in OTG
Shipment → Invoice generation
Invoice → Customer's primary AR
Payment → Invoice paid → SO closed
```

---

## 7. Evidence captured

```
- Quotation history with version
- CPO ingestion record (which channel, what validation results)
- Sales Order audit trail (state changes with actors, timestamps)
- Allocation transaction (which lots / serials reserved)
- Shipment record with manifest and tracking
- Invoice with tax breakdown and applied rules
- Payment confirmation
- All as cross-linked records in the OTG
```

For regulated industries: BREL release packet, audit pack export ready.

---

## 8. Cross-domain footprint

```
D-01 Commercial      (primary)
D-02 Engineering     (item master, BOM, routing references)
D-03 Planning        (MRP, schedule)
D-04 Procurement    (sourced components)
D-05 Inventory       (allocation, picking)
D-06 Production     (operations execution)
D-07 Quality         (in-process and outgoing inspection; quality hold)
D-08 Traceability   (genealogy, BREL release for regulated)
D-09 Maintenance    (equipment availability)
D-10 Workforce      (operator eligibility)
D-11 Finance         (cost capture, invoice generation)
D-12 Integration    (EDI, customer portal, partner connectors)
```

---

## 9. State machines involved

```
SM-1 Order machine (primary)
SM-2 Material machine
SM-3 Inspection machine
SM-6 Release machine (regulated only)
SM-9 Procurement machine
SM-10 Job and Work Order machine
SM-11 Training machine (eligibility)
```

---

## 10. APIs invoked

(Detailed in PART_E.) Headlines:
- Quotation API (CRUD + lifecycle)
- Customer PO API (intake, validation)
- Sales Order API (lifecycle + holds)
- Allocation API (reserve / release)
- Shipment API (lifecycle + tracking)
- Invoice API (generation + status)
- Webhook subscriptions for partners

---

## 11. Frontend surfaces involved

(Detailed in PART_F.) Headlines:
- Quotation Workspace + Record Shell
- Sales Order Workspace + Record Shell
- Allocation View
- Shipment Workspace + Record Shell
- Invoice Workspace + Record Shell
- Customer 360 (cross-cutting)

---

## 12. Regulatory considerations

```
- Customer-specific requirements (CSR, e.g., Ford Q1, GM BIQS) must
  be respected in shipment documentation.
- Tax compliance per jurisdiction.
- Pharma DSCSA serialization on shipment for US drug manufacturers.
- AS9102 First Article Inspection on first article per aerospace customer.
- Customer audit pack on demand.
```

---

## 13. Wave target

This workflow reaches L4 (live read-only) by Wave 4 and L5 (controlled
mutation) by Wave 5. Vertical pack extensions in W10.

---

## 14. Failure modes and recovery

```
- CPO validation fails: route to human review; alert sales engineer.
- Capacity insufficient: notify customer of revised delivery date.
- Quality hold: SO status visible; root cause investigation begins.
- Shipment exception: carrier issue routed to logistics; customer notified.
- Invoice payment overdue: AR tracks; collection process begins per terms.
- BREL release blocked: evidence chain visible; missing items identified.
```

---

## 15. Decision phrase

```
D1_ORDER_TO_CASH_BASELINE_LOCKED
NEXT: D2_PROCUREMENT_TO_PAY.md
```
