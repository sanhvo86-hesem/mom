# A3 — Domain Scope (the 14 domains)

This chapter names the 14 business domains HESEM covers and gives a
one-paragraph orientation to each. Full per-domain capability descriptions
live in PART_C, one chapter per domain. This chapter exists so a reader can
quickly see the entire scope without opening 14 files.

The domains are grouped into four orientations:

```
Orientation 1 — Customer-facing demand and supply        (D-01, D-02, D-03)
Orientation 2 — Manufacturing reality                     (D-04, D-05, D-06)
Orientation 3 — Regulated discipline                      (D-07, D-08, D-09, D-10)
Orientation 4 — Platform-enabling and analytic            (D-11, D-12, D-13, D-14)
```

These orientations are pedagogical only; in the actual plan the domains are
peers, not hierarchical.

---

## Orientation 1 — Customer-facing demand and supply

### D-01 — Commercial & Customer

The Commercial domain owns the interaction with the customer. It contains
the Customer Master (the system of record for who the customer is, their
sites, their billing terms, their compliance posture), the Quotation (the
record of pricing offered to a prospect or customer), the Customer Purchase
Order (the legally binding intent from the customer to buy), the Sales
Order (the manufacturer's commitment to fulfill), the Shipment (the record
of physical goods leaving the plant), the Invoice (the financial claim
sent to the customer), and the Customer Complaint (any feedback indicating
the product or service did not meet expectations). This domain also owns
the Customer Field Return (RMA records, Return Material Authorization).

The Commercial domain interacts heavily with: Procurement (when the
customer's order requires purchased components), Planning (when the order
must be scheduled into production), and Quality (when the customer has
quality holds or specific inspection requirements).

Full capability description: PART_C / C1.

### D-02 — Product & Engineering

The Product & Engineering domain owns the description of what the
manufacturer makes. It contains the Item Master (the system of record for
each product, sub-assembly, raw material, and consumable), the Item
Revision (the versioned engineering specification of an item), the Bill of
Materials (the recipe of components and quantities that make up an item),
the Routing (the sequence of operations required to make an item), the
Engineering Change Order (the record of a controlled change to an item,
revision, BOM, or routing), the CAD Drawing Link (the reference to the
authoritative engineering drawing in PLM or document management), and the
Failure Mode and Effects Analysis (the worksheet identifying potential
failure modes and their controls).

The Product & Engineering domain is the source of truth for "what a part
is." Every other domain (procurement, production, quality, traceability,
maintenance) references the Item Master and Item Revision.

Full capability description: PART_C / C2.

### D-03 — Planning & Production

The Planning & Production domain owns the answer to "what should we make,
when, on which equipment." It contains the Master Production Schedule
(the plan of what is produced when), the Material Requirements Planning
(the calculation of what materials are needed when), the Capacity Plan
(the assessment of available production capacity vs demand), the
Schedule (the finite-capacity scheduled timeline for jobs and work
orders), the Dispatch List (the projection that tells the floor what to
run today), and the Kit (the gathered set of components ready for an
operation).

Planning & Production is the bridge from Commercial (what the customer
ordered) to Shopfloor (what the operator will run). Mistakes in planning
propagate to lateness in shipment.

Full capability description: PART_C / C3.

---

## Orientation 2 — Manufacturing reality

### D-04 — Procurement & Supplier Quality

The Procurement & Supplier Quality domain owns the supplier side. It
contains the Supplier Master (the system of record for who supplies the
manufacturer, their qualification, their performance), the Purchase Order
(the manufacturer's commitment to buy from a supplier), the Receiving
Record (the record of physical goods arriving from a supplier), the
Incoming Quality Control (the inspection of received goods), the Supplier
Qualification (the formal qualification record), the Supplier Corrective
Action Request (when a supplier delivered defective goods), and (for
automotive customers) the Production Part Approval Process (the formal
acceptance of a new part from a supplier).

The Procurement domain is the mirror image of Commercial: where Commercial
manages outbound goods to customers, Procurement manages inbound goods
from suppliers. Quality is the same domain on both sides.

Full capability description: PART_C / C4.

### D-05 — Inventory & Logistics

The Inventory & Logistics domain owns the physical location of materials
and finished goods. It contains the Inventory Transaction (every move of
material in or out of any location), the Lot or Batch (the grouping of
material with shared origin), the Serial Number (the unique identifier
of a single physical unit), the Work in Process (material that is between
operations), the Warehouse Task (a discrete work item for a warehouse
operator), the Cycle Count (the periodic verification of inventory
accuracy), the Reservation (the soft allocation of material to a future
order), and the Quarantine (the held status of material that cannot be
used until released).

Inventory is the hardest domain to keep accurate because the digital
state must mirror the physical state, and physical state changes
constantly. HESEM's discipline is that inventory transactions are
authoritative and irreversible (compensating transactions only).

Full capability description: PART_C / C5.

### D-06 — Shopfloor / MES Execution

The Shopfloor domain owns the actual making of things. It contains the
Job Order (the per-product per-quantity work to be done), the Work Order
(a step within a Job Order, often per operation), the Operation Execution
(the actual record of an operator performing an operation), the Work
Instruction (the version-controlled procedure the operator follows), the
Electronic Batch Record (in pharma) or Electronic Device History Record
(in medical device) — both are step-by-step capture of regulated batch
production, the OEE Event (the equipment state events that drive Overall
Equipment Effectiveness), the Andon Signal (the floor's call for help),
and the Statistical Process Control sample (the in-process measurement
of critical characteristics).

Shopfloor is where digital meets physical. Edge gateway integration to
PLCs lives here. Connected Worker apps live here. ISA-95 Level 3 lives
here.

Full capability description: PART_C / C6.

---

## Orientation 3 — Regulated discipline

### D-07 — Quality Improvement (eQMS)

The Quality Improvement domain owns the formal quality discipline. It
contains the Inspection (the discrete record of a check that was
performed, including the result), the Nonconformance Case (the formal
record that something failed quality), the Corrective and Preventive
Action (the formal program to address a nonconformance and prevent
recurrence), the Controlled Document (the version-controlled, approved,
released document that governs how work is performed), the Engineering
Change Order (when a controlled document or design changes, this is
the workflow that releases the change), the Audit Finding (issues raised
during internal or external audits), the Material Review Board action
(the formal disposition of held material), and the Risk Item (per ISO
14971 for medical device, the analyzed risk in a product or process).

The eQMS is the heart of regulated trust. The Pharma, Medical Device,
Automotive, and Aerospace industries all require formal eQMS programs
with documented evidence. HESEM's eQMS is contract-first, evidence-first,
and fully audit-pack-ready.

Full capability description: PART_C / C7.

### D-08 — Traceability & Genealogy

The Traceability domain owns the chain that connects raw material to
finished product to customer. It contains the Lot Genealogy Edge (the
formal link from a parent lot to a child lot), the Batch or Build
Release (the formal authorization that a finished lot may be shipped),
the Recall Record (the formal program when a released product must be
retrieved from the field), and the Release Packet (the assembled
collection of evidence that justifies a release).

When an FDA inspector asks "show me the genealogy of this lot from raw
material to customer," the answer comes from this domain. When a recall
is initiated, this domain identifies the affected scope. When a
serialization regulation (DSCSA in US pharma, UDI in medical device)
must be met, this domain owns the unique identification.

Full capability description: PART_C / C8.

### D-09 — Maintenance & EHS (Environment, Health, Safety)

The Maintenance domain owns the upkeep of equipment and the safety of
personnel. It contains the Equipment record (every machine, tool, and
fixture identified), the Maintenance Work Order (the formal record of
work done on equipment), the PM Schedule (the calendar of preventive
maintenance), the Calibration record (the record of measurement-system
calibration), the Measurement System Analysis record (Gauge R&R studies),
the EHS Incident (any safety event), and the Lockout / Tagout record
(the safety procedure for work on de-energized equipment).

This domain is the bridge between IT and OT. Equipment cannot run
without maintenance. Maintenance evidence is part of the regulated
record.

Full capability description: PART_C / C9.

### D-10 — Workforce & Training

The Workforce domain owns the people. It contains the User record (an
identifiable person who can act in the system), the Role (a named set
of capabilities), the Training Course (the curriculum the workforce
must complete), the Training Record (the record of an individual
completing a course), the Competency Matrix (the requirement that role
X must hold competency Y to perform action Z), the Shift Definition
(the calendar of when work happens), and the Labor Reporting (the
record of labor consumed against orders).

The Workforce domain enforces eligibility. An operator cannot be
dispatched to a work order that requires a training they have not
completed. A supplier qualification cannot be granted by an unqualified
QA engineer. A document cannot be approved by an untrained approver.
This is the basis of regulated trust: the right people doing the right
work with the right training.

Full capability description: PART_C / C10.

---

## Orientation 4 — Platform-enabling and analytic

### D-11 — Finance

The Finance domain owns the financial perspective. It contains the
Standard Cost (the planned cost of an item), the Actual Cost (the
incurred cost of producing an item), the WIP Cost (the cost accumulated
during in-process manufacturing), the Variance (the difference between
standard and actual), the Inventory Valuation (the financial value of
on-hand inventory), and (eventually) the General Ledger integration
(the connection to the customer's primary financial system).

HESEM does not aim to replace SAP S/4 Finance or Oracle Financials.
HESEM owns operations cost (cost of poor quality, cost variance,
inventory valuation) and integrates financial postings into the
customer's primary ERP.

Full capability description: PART_C / C11.

### D-12 — Integration

The Integration domain owns the boundary between HESEM and other
systems. It contains the API Gateway (the front door for external
calls), the Event Bus (the asynchronous message backbone), the
Idempotency Service (the replay-protection store), the Live API Toggle
Registry (the per-tenant per-root flag system that controls which APIs
are live), the Change Data Capture pipeline (the consumer of database
mutations that materializes the Operational Truth Graph), and the
Partner Integration Connectors (specific connectors to Salesforce,
SAP, Oracle, PTC Windchill, Siemens NX, MS 365, Slack/Teams, MS
Dynamics 365, plus any customer-specific connectors).

This domain is the platform's nervous system: messages flow through
it, contracts gate it, and observability traces it.

Full capability description: PART_C / C12.

### D-13 — Analytics & AI

The Analytics & AI domain owns insight. It contains the OEE Analytics
(equipment performance), the Quality Analytics (defect trends, FPY,
COPQ), the Throughput Analytics (production rate, schedule attainment),
the Predictive Maintenance Model (the ML model that predicts equipment
failure), the AI Advisory Feature (the discrete advisory features
exposed to users), and the Data Product (the contract-bound,
freshness-controlled data sets exposed for analytic and BI use).

This domain is governed by a strict discipline: AI is advisory only.
The eight banned regulated decisions (described in PART_L) are never
executed by AI without human authority. Analytics surfaces information;
AI suggests; humans decide.

Full capability description: PART_C / C13.

### D-14 — Core Platform

The Core Platform domain owns the substrate that every other domain
depends on. It contains the Identity & Access Management subsystem
(authentication, authorization, session management), the Workflow
Engine (the state machine runtime), the Evidence Engine (the audit
chain and evidence record store), the Audit Engine (the detailed audit
trail per object), the Notification Service (the delivery of events
to humans via email, in-app, SMS), the Graphics Authority (the design
token registry and simulation modal that protects visual consistency),
the Design System (the reusable UI primitives and components), the
Site Reliability stack (deployment, observability, DR, capacity,
cost), and the Observability stack (OpenTelemetry collector, metrics,
logs, traces, dashboards, alerts).

This domain is the most concentrated source of cross-cutting value.
Investment in Core Platform pays off in every other domain.

Full capability description: PART_C / C14.

---

## How the 14 domains relate

The 14 domains are not isolated. Most workflows span several. PART_D
(Workflow Catalog) makes the cross-domain interactions explicit. As a
preview:

- A customer order (D-01 Commercial) triggers MRP (D-03 Planning) which
  triggers PO (D-04 Procurement) which triggers Receiving (D-04) and
  Incoming Quality (D-04 + D-07).

- An incoming quality failure (D-04 + D-07) raises a nonconformance
  (D-07) which can trigger a CAPA (D-07), a SCAR to the supplier (D-04),
  and a quarantine of the lot (D-05).

- A maintenance calibration (D-09) finding the equipment was out of
  tolerance triggers review of all measurements made by that equipment
  (D-07) which may raise nonconformances (D-07) and quarantine lots
  (D-05).

- A document release (D-07 CDOC) flows through ECO (D-07) which schedules
  training assignments (D-10) and updates instructions (D-06).

- A lot release (D-08 BREL) requires evidence chain from D-04, D-05,
  D-06, D-07, D-09, and D-10. It is the most cross-cutting workflow.

PART_D enumerates the 14 end-to-end workflows formally.

---

## Domain ownership

Each domain has a named lead in the HESEM organization. The lead is the
primary author of the corresponding PART_C chapter and the reviewer of
any change that touches that domain.

| Domain | Internal owner role | PART_C chapter |
|---|---|---|
| D-01 Commercial | Commercial Lead | C1 |
| D-02 Product & Engineering | Engineering Lead | C2 |
| D-03 Planning & Production | Planning Lead | C3 |
| D-04 Procurement | Procurement Lead | C4 |
| D-05 Inventory & Logistics | Logistics Lead | C5 |
| D-06 Shopfloor / MES | Production Lead | C6 |
| D-07 Quality (eQMS) | Quality Lead | C7 |
| D-08 Traceability | Quality Lead (with Logistics) | C8 |
| D-09 Maintenance & EHS | Maintenance Lead | C9 |
| D-10 Workforce & Training | HR Lead | C10 |
| D-11 Finance | Finance Lead | C11 |
| D-12 Integration | Platform Lead | C12 |
| D-13 Analytics & AI | Data Platform Lead + AI Lead | C13 |
| D-14 Core Platform | Platform Lead | C14 |

If the engineering organization does not yet have a named lead for a
domain, the domain lead role is assumed by the engineering lead until
a named lead is hired or appointed.

---

## Domain scope frozen for V9

The 14 domains in this chapter are the V9 scope. Adding a 15th domain
requires an ADR ratified by the user and a corresponding update to V9
through PART_M (Planning Gap Log) followed by a new PART_C chapter.

Adding sub-domains within an existing domain (e.g., adding "Recall" as
a sub-domain of D-08 Traceability) is not a structural change and does
not require ratification, only PART_C chapter update.

---

## Decision phrase

```
A3_DOMAIN_SCOPE_BASELINE_LOCKED
NEXT: A4_STANDARDS_REGULATORY_SCOPE.md
```
