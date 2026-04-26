# C1 — Commercial & Customer

```
domain_code:    D-01
domain_name:    Commercial & Customer
owner_role:     Commercial Lead (with Logistics Lead for shipment, Finance Lead for invoice)
primary_state_machine: SM-1 Order machine
```

This chapter describes the business capabilities by which HESEM serves
the customer-facing side of manufacturing operations: from quotation
through fulfillment to complaint handling.

---

## 1. Purpose

The Commercial & Customer domain owns every interaction between the
manufacturer and its customers. It is the demand side of the business.
This domain answers questions like:
- Who are our customers and what is the legal terms of our relationship?
- What did we promise to make and ship?
- What did we actually ship, and was it on time, in full, and to spec?
- What did we charge, and did the customer pay?
- What did the customer complain about, and what did we do?

This domain is the interface where the manufacturer's brand promise
meets reality.

---

## 2. The roots within this domain

```
Customer Master              The system of record for who the customer is,
                             their billing terms, their sites, their
                             compliance posture, their preferred contact.

Quotation                    The record of pricing offered to a prospect or
                             customer for a specific scope and time-bound
                             validity.

Customer Purchase Order       The legally binding intent from the customer
                             to buy, often arriving via EDI, email, portal
                             upload, or phone capture.

Sales Order                  The manufacturer's commitment to fulfill — what
                             we will make, when we will ship, and at what
                             price. The Sales Order is the authoritative
                             linkage between Commercial and the rest of the
                             operations.

Shipment                     The record of physical goods leaving the plant
                             en route to a customer site.

Invoice                      The financial claim sent to the customer for
                             goods or services rendered.

Customer Complaint           Any feedback from a customer indicating the
                             product or service did not meet expectations
                             — quality issue, delivery issue, documentation
                             issue, billing issue.

Customer Field Return (RMA)  The Return Material Authorization record
                             when a customer returns physical goods.
```

Each root has its own scope contract following the template in V9
templates (planning shape only, not code).

---

## 3. The capabilities within this domain

### CAP-C1-01 — Customer Master Management

**Purpose.** Maintain the authoritative record of each customer, their
sites, their legal terms, their compliance requirements (e.g., specific
documentation customers require), and their preferred contacts.

**Lifecycle.** A customer record begins when a prospect is created
(typically synced from CRM). It transitions to "qualified customer"
when sales-side qualification completes. Active customers are subject
to quarterly relationship reviews. Customers can be marked inactive but
not deleted (audit retention applies).

**Cross-domain connections.**
- Procurement may verify customer compliance posture for specific orders.
- Finance bills customers per the legal terms.
- Quality tracks complaints per customer.
- Document Control ships specific documents per customer-required
  template.

**Wave target.** L4 by W4 (live read-only available); L5 by W5 (full
mutation through Customer Master state machine).

**Acceptance evidence.** Customer Master records can be queried by
external CRM via documented connector. Site-level addresses
geocoded. Compliance flags (e.g., "this customer requires Certificate
of Analysis with each shipment") visible to operations and respected
in the workflow.

### CAP-C1-02 — Quotation Generation and Management

**Purpose.** Produce a quotation in response to a customer's request.
Track its status through win, loss, or expiry. Convert won quotations
to Sales Orders.

**Lifecycle.** Quote is drafted, internally reviewed (for pricing,
margin, capacity), submitted to customer, tracked through customer
decision, and either won (converted to SO), lost (recorded with reason),
or expired.

**Cross-domain connections.**
- Engineering provides item revisions and BOMs to compute the quote.
- Planning verifies capacity feasibility before quote submission.
- Finance applies pricing rules (per-customer discount, volume tiers,
  currency conversion).

**Wave target.** L4 by W4; L5 by W5.

**Acceptance evidence.** Quote can be generated, reviewed, sent,
tracked, and converted to SO with full audit trail. Pricing rules
correctly applied. Margin and capacity reviewed before submission.

### CAP-C1-03 — Customer Purchase Order Capture

**Purpose.** Receive customer purchase orders through multiple channels
and convert to internal Sales Orders with validation.

**Lifecycle.** A CPO arrives via EDI 850, email attachment, portal
upload, or manual entry. It is validated (item codes match HESEM's Item
Master, quantities, prices, dates). Discrepancies trigger review.
Validated CPOs convert to Sales Orders.

**Cross-domain connections.**
- Item Master validates each line.
- Customer Master validates the customer's standing.
- Finance validates pricing and credit limits.

**Wave target.** L4 by W4; L5 by W5.

**Acceptance evidence.** CPOs from all configured channels (EDI 850,
portal, email, manual) successfully convert with validation reporting.
Discrepancies route to human review. Audit trail captured.

### CAP-C1-04 — Sales Order Lifecycle

**Purpose.** Manage the Sales Order from confirmation through allocation,
production scheduling, fulfillment, shipping, and closure.

**Lifecycle (per state machine SM-1).** Draft → confirmed → allocated
(material reserved) → in-production (jobs released) → ready-to-ship →
shipped → invoiced → closed. Alternative paths: on-hold-quality,
cancelled.

**Cross-domain connections.**
- Planning consumes confirmed SOs to drive MRP.
- Inventory allocates material against SOs.
- Production receives released jobs from SOs.
- Quality may place SOs on hold based on quality findings.
- Logistics ships against ready-to-ship SOs.
- Finance generates invoices.

**Wave target.** L4 by W4 (live read-only); L5 by W5 (controlled
mutation including SO confirm, SO change, SO close).

**Acceptance evidence.** SO state machine transitions correctly. SO
holds applied when quality flags raised. SO ship-line traceable to
specific lots and serials. SO close evidence chain complete.

### CAP-C1-05 — Shipment Execution

**Purpose.** Execute the physical shipment of goods to customers and
record the shipment as evidence of delivery promise.

**Lifecycle (per shipment record).** Planned → picked → packed →
in-transit → delivered (or exception). Delivery confirmation may come
from carrier tracking integration or from customer signature.

**Cross-domain connections.**
- Inventory consumes specific lots and serials at picking time.
- Quality verifies BREL release before allowing pick.
- Traceability records the genealogy edge from lot to shipment to
  customer.
- Document Control includes mandatory documents (CoA, packing slip,
  hazard documentation).

**Wave target.** L4 by W4; L5 by W5.

**Acceptance evidence.** Shipment record traceable to specific lots
and serials. Mandatory documents attached per customer requirement.
Delivery confirmation captured.

### CAP-C1-06 — Invoice Generation

**Purpose.** Generate invoices to customers for shipped goods or
rendered services. Integrate with the customer's primary financial
system for posting.

**Lifecycle.** Invoice drafted from shipment data, internally reviewed
(typically Finance), sent to customer (via email, EDI 810, portal
upload), tracked through payment.

**Cross-domain connections.**
- Shipment data drives invoice line generation.
- Customer Master provides billing terms.
- Finance integrates with customer's primary accounting system for GL
  posting.

**Wave target.** L4 by W5; L5 by W5.

**Acceptance evidence.** Invoice generated correctly per shipment.
Tax rules applied per jurisdiction. Currency conversion accurate.
Payment status tracked.

### CAP-C1-07 — Customer Complaint Handling

**Purpose.** Receive, classify, investigate, and resolve customer
complaints with regulatory reportability evaluation.

**Lifecycle (per state machine SM-12).** Received → triaged → classified
(severity, category, regulatory reportable yes/no) → investigation in
progress → root cause identified → corrective action in progress →
resolved → closed.

**Cross-domain connections.**
- Inspection or NC may be raised based on complaint findings.
- CAPA may be opened to address systemic issues.
- Recall workflow may be triggered for high-severity complaints.
- Safety Report (ICSR) may be generated for med device or pharma.
- Field Return (RMA) may be authorized for the customer's return.

**Wave target.** L4 by W7; L5 by W7. Reportability evaluator (auto-
classify against regulatory thresholds) added by W7.

**Acceptance evidence.** Complaints classified consistently. Critical
complaints escalate within SLA. Reportability decisions documented.
Complaint trends visible by product, by customer, by defect mode.

### CAP-C1-08 — Field Return / RMA Authorization

**Purpose.** Authorize the return of physical goods from customers and
track the returned material through receipt, inspection, and disposition.

**Lifecycle.** Customer requests return. Internal review. RMA issued.
Goods received back. Inspected. Disposition (return-to-stock if
acceptable; destroy or rework if not; credit issued if appropriate).

**Cross-domain connections.**
- Inventory receives returned goods.
- Quality inspects returned goods (which may raise NCs).
- Finance processes credit memos.
- Traceability documents the material's journey back.

**Wave target.** L4 by W7; L5 by W7.

**Acceptance evidence.** RMA workflow tracked end-to-end. Returned
material disposition consistent with quality findings. Credit
processing aligned with customer agreement.

---

## 4. Workflows the domain participates in

This domain is the primary participant in:
- D1 Order to Cash (PART_D)
- D11 Release to Trace (PART_D)
- D12 Complaint to Recall (PART_D)

This domain is a participant (not primary) in:
- D2 Procurement to Pay (when customer-driven sourcing)
- D3 Plan to Produce (when SO drives MPS/MRP)

---

## 5. APIs the domain exposes

This domain exposes the following API families (full descriptions in
PART_E):

```
- Customer Master API           (read, mutate, search)
- Quotation API                  (full lifecycle)
- Customer Purchase Order API   (intake, validation, conversion)
- Sales Order API                (full lifecycle, hold management)
- Shipment API                   (planning, execution, tracking)
- Invoice API                    (generation, status)
- Complaint API                  (intake, investigation, classification)
- Return / RMA API               (authorization, tracking)
- Customer Activity API          (read-only, customer 360)
```

Plus webhook subscriptions per topic for partner notifications.

---

## 6. Frontend surfaces the domain renders

This domain renders these UI surfaces (full descriptions in PART_F):

```
- Customer 360 Workspace          (projection: per-customer order, ship,
                                   invoice, complaint history)
- Customer Master Record Shell    (authoritative: customer detail, sites,
                                   contacts, compliance flags)
- Quotation Workspace             (projection: quotes by status, by stage)
- Quotation Record Shell          (authoritative: quote detail with
                                   pricing breakdown)
- Sales Order Workspace            (projection: open orders by status,
                                   late risks)
- Sales Order Record Shell        (authoritative: order detail, lines,
                                   allocation, fulfillment)
- Shipment Workspace               (projection: shipments today / this
                                   week, exceptions)
- Shipment Record Shell           (authoritative: shipment detail,
                                   manifest, tracking)
- Invoice Workspace                (projection: open invoices, aging)
- Invoice Record Shell             (authoritative: invoice detail)
- Complaint Workspace              (projection: open complaints, severity,
                                   age)
- Complaint Record Shell          (authoritative: complaint detail,
                                   investigation, classification, response)
- RMA Workspace                    (projection: RMA status)
- RMA Record Shell                (authoritative: RMA detail, returned
                                   material disposition)
```

---

## 7. Cross-cutting concerns most relevant

```
C1 Audit Chain         Every Sales Order mutation, every Shipment, every
                       Invoice, every Complaint logged.

C3 i18n / l10n         Multi-locale customer-facing data: address
                       formatting per country, currency per customer,
                       date / time per customer time zone.

C4 Tenant Isolation    Customer data strictly per-tenant; never cross-
                       tenant.

C5 Idempotency         CPO intake idempotent (same EDI 850 received
                       twice → one Sales Order, not two).

C7 Problem Details     Order failures (e.g., insufficient inventory,
                       customer over credit limit) returned in RFC 9457.

C8 Observability       Per-route SLO; trace per Sales Order through
                       fulfillment.
```

---

## 8. Wave assignments

```
Customer Master      L4 by W4; L5 by W5
Quotation            L4 by W4; L5 by W5
Customer PO          L4 by W4; L5 by W5
Sales Order          L4 by W4; L5 by W5
Shipment             L4 by W5; L5 by W5
Invoice              L4 by W5; L5 by W5
Complaint            L4 by W7; L5 by W7
Field Return / RMA   L4 by W7; L5 by W7
```

The Commercial domain is mostly mature by W5; complaint and RMA mature
in W7 along with the Digital Thread / Genealogy / Release wave.

---

## 9. Standards governing this domain

```
- ISO 9001:2015 §8 (Operation; customer-related processes)
- IATF 16949 §10 (Improvement; complaint handling for automotive)
- 21 CFR Part 803 (Med Device complaint reporting)
- EU MDR Article 87 (Med Device manufacturer incident reporting)
- ICH E2B(R3) (Pharma ICSR exchange format)
- UCC e-commerce standards (EDI 810, 850, 856, 860, etc.)
- Per-customer specific requirements (CSR, e.g., Ford Q1, GM BIQS)
```

Pharma-specific standards apply when this domain is configured for a
Pharma tenant (PART_J).

---

## 10. Boundary with adjacent domains

- **Boundary with D-02 Product & Engineering**: Quotation and Sales Order
  consume Item Master and Item Revision. Engineering changes (ECO) may
  affect the items shipped, requiring customer notification.

- **Boundary with D-03 Planning & Production**: Sales Order confirmation
  drives MRP. Production schedule attainment affects shipment dates.

- **Boundary with D-05 Inventory & Logistics**: Shipment consumes
  inventory at picking. Allocation at SO confirmation reserves inventory.

- **Boundary with D-07 Quality**: Complaints feed quality investigation.
  Quality holds halt shipment.

- **Boundary with D-08 Traceability**: Shipment records the genealogy
  edge from lot/serial to customer for recall traceability.

- **Boundary with D-11 Finance**: Invoice generation hands financial
  postings to the customer's primary accounting system. Pricing is
  defined here; cost is in Finance.

---

## 11. Acceptance evidence (the whole domain)

The domain reaches L7 (productized) when:
- Sales Order can be created from a quote, allocated, scheduled,
  produced, shipped, invoiced, and closed end-to-end with a
  pre-production-quality customer.
- Complaint workflow handles a real complaint from a real customer
  through resolution with proper reportability classification.
- All eight capabilities (CAP-C1-01 through CAP-C1-08) reach L5 minimum.
- Customer 360 workspace renders correctly for a real customer.
- Customer EDI integration tested with at least one real customer.
- Customer Audit pack export (per PART_J) produces evidence chain for
  any sampled order.

---

## 12. Decision phrase

```
C1_COMMERCIAL_CUSTOMER_BASELINE_LOCKED
NEXT: C2_PRODUCT_ENGINEERING.md
```
