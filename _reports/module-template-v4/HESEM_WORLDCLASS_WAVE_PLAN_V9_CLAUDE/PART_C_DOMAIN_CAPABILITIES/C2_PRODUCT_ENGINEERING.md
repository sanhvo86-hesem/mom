# C2 — Product & Engineering

```
domain_code:    D-02
domain_name:    Product & Engineering
owner_role:     Engineering Lead (with Quality Engineer for FMEA)
primary_state_machine: SM-5 Document machine (for ECO); SM-2 Material (for IREV)
```

---

## 1. Purpose

The Product & Engineering domain owns the description of what the
manufacturer makes. Without an authoritative engineering specification,
nothing else in the platform has anything to refer to. This domain
answers: what is the part, what is its current revision, what does it
take to make, what could go wrong, and how do we change it under control.

This domain is the source-of-truth dependency for nearly every other
domain. The Item Master and Item Revision are referenced by Procurement,
Planning, Inventory, Production, Quality, and Traceability.

---

## 2. The roots within this domain

```
Item Master                   The system of record for each product, sub-
                              assembly, raw material, consumable, kit, or
                              packaging item.

Item Revision                 The versioned engineering specification of an
                              item: dimensions, tolerances, materials,
                              process notes, effectivity dates.

Bill of Materials (BOM)       The recipe of components and quantities that
                              make up a parent item, version-bound to an
                              item revision.

Routing                       The sequence of operations required to make
                              an item, version-bound to an item revision,
                              referencing equipment families and standard
                              operation times.

Engineering Change Order (ECO) The record of a controlled change to an
                              item, item revision, BOM, routing, or
                              controlled document.

CAD Drawing Link              The reference to the authoritative
                              engineering drawing in the customer's PLM
                              system (PTC Windchill, Siemens Teamcenter,
                              Dassault ENOVIA, Arena PLM, etc.).

Failure Mode and Effects
   Analysis (FMEA)             The worksheet identifying potential failure
                              modes for an item or process, their effects,
                              and the controls in place. Per AIAG-VDA 2019
                              for automotive; per ISO 14971 risk file in
                              medical device.

Process Flow Diagram          The high-level diagram of how an item is
                              produced, linking process steps to FMEA and
                              Control Plan.
```

---

## 3. The capabilities within this domain

### CAP-C2-01 — Item Master Management

**Purpose.** Maintain the authoritative record of every item the
manufacturer touches: products, sub-assemblies, raw materials,
consumables, packaging, kits.

**Lifecycle.** New item creation is governed by the New Item Introduction
workflow (PART_D as part of Plan to Produce). Items have a lifecycle
state: in-development, qualified-for-production, active, restricted, or
retired. Item retirement requires zero-pending-orders and zero-on-hand
inventory.

**Cross-domain connections.** Procurement issues POs against Item Master.
Planning runs MRP against Item Master. Inventory tracks lots of items.
Shopfloor runs operations on items. Quality inspects per-item check
items.

**Wave target.** L4 by W0.5 (master data ratification); L5 by W2 (full
mutation through ECO).

**Acceptance evidence.** Items can be created, qualified, activated,
restricted, retired with full ECO trail. Cross-domain references all
respect lifecycle state.

### CAP-C2-02 — Item Revision Management

**Purpose.** Version-control item specifications. Track which revision
is in effect for which date range, and propagate revision changes
through ECO.

**Lifecycle (per state machine).** Draft → in-review → released →
superseded → obsolete. Revision changes flow through ECO. Effectivity
dates govern which revision is in use at a given moment.

**Cross-domain connections.** Sales Order references item revision at
order time. Production runs against item revision active when the job
was released. Inspection check items per item revision.

**Wave target.** L4 by W1; L5 by W3.

**Acceptance evidence.** Revision history complete and queryable. Each
production job traceable to specific revision. Effectivity windows
respected.

### CAP-C2-03 — Bill of Materials Authoring

**Purpose.** Author the BOM for a given item revision: child components,
quantities, alternates, scrap factors. Support multi-level BOMs.

**Lifecycle.** BOM authored as part of new item introduction or
revision change. Reviewed for completeness and feasibility (Planning
verifies that components are available; Procurement verifies that
suppliers exist). Released through ECO.

**Cross-domain connections.** Planning consumes BOM for MRP. Production
consumes BOM during operation execution (kitting). Quality references
BOM for inspection planning.

**Wave target.** L4 by W2; L5 by W3.

**Acceptance evidence.** BOM trees correct and queryable to depth N.
Alternates respected at MRP time. Scrap factors applied correctly.

### CAP-C2-04 — Routing Authoring

**Purpose.** Author the routing for a given item revision: the sequence
of operations, the equipment families they require, the standard times,
the work instructions referenced.

**Lifecycle.** Routing authored alongside BOM. Reviewed for capacity
feasibility. Released through ECO. Shopfloor configurations align to
routing.

**Cross-domain connections.** Planning consumes routing for finite
schedule. Production consumes routing at job release. Maintenance
considers routing when planning equipment availability.

**Wave target.** L4 by W2; L5 by W3.

**Acceptance evidence.** Routing references correct equipment families.
Standard times defensible against historical actuals. Routing changes
trigger schedule re-evaluation.

### CAP-C2-05 — Engineering Change Order Workflow

**Purpose.** Govern any controlled change to item, revision, BOM,
routing, or controlled document. Provide impact analysis, multi-party
approval, and traceable release.

**Lifecycle (per state machine SM-5 ECO).** Draft → impact-analysis-in-
progress → impact-analyzed → in-review → approved → implementing →
verified → closed. Alternative path: rejected.

**Cross-domain connections.** Affects every domain that references the
changed item / revision / BOM / routing / document. Triggers training
assignments via SM-11 when documentation is involved.

**Wave target.** L4 by W3; L5 by W3.

**Acceptance evidence.** Impact analysis complete for every ECO. Multi-
party approval (typically Engineering, Quality, Production, Document
Control) captured. Changes implemented per approved scope. Verification
recorded.

### CAP-C2-06 — CAD Drawing Linkage

**Purpose.** Link each item revision to its authoritative CAD drawing in
the customer's PLM system. Provide read access without owning the CAD
asset.

**Lifecycle.** Linkage created when a new item revision is introduced.
PLM system is the system of record for the CAD file; HESEM holds the
reference and the metadata (revision, effectivity, custodian).

**Cross-domain connections.** Inspection references drawing for visual
inspection. AS9102 First Article Inspection (Aerospace) generates
bubbled drawings from CAD via integration.

**Wave target.** L4 by W3; L5 by W3.

**Acceptance evidence.** Drawing link resolves to CAD file in PLM.
Drawing version correct per item revision. Bubble drawing generation
works for AS9102 (aerospace pack).

### CAP-C2-07 — FMEA Authoring (DFMEA, PFMEA, FMEA-MSR)

**Purpose.** Identify potential failure modes for products (DFMEA) and
processes (PFMEA), assess severity and occurrence and detection, and
determine action priority per AIAG-VDA 2019 (replacing legacy RPN-only
methodology).

**Lifecycle.** FMEA worksheet drafted by quality engineer with cross-
functional team. Reviewed. Released. Updated when failure modes are
discovered in field or in production.

**Cross-domain connections.** Failure modes flagged in PFMEA must appear
in Control Plan. Failure modes appearing in NCs but not in PFMEA flag
a planning gap; PFMEA must be updated.

**Wave target.** L4 by W6; L5 by W6.

**Acceptance evidence.** FMEA structure tree (system → subsystem →
component → failure mode) complete and queryable. Action priority
calculated per AIAG-VDA 2019 lookup. New failure modes from NCs trigger
PFMEA review.

### CAP-C2-08 — Process Flow Diagram

**Purpose.** Maintain the high-level diagram of how an item is produced,
linking process steps to FMEA and Control Plan.

**Lifecycle.** Diagram drafted with PFMEA. Updated through ECO when
process changes.

**Cross-domain connections.** Production references the diagram for
operator orientation. Inspection plans reference the diagram for sample
points.

**Wave target.** L4 by W6; L5 by W10 (vertical packs may add depth).

---

## 4. Workflows the domain participates in

Primary participant in:
- D3 Plan to Produce (BOM, Routing drive MRP)
- D5 Inspect to Disposition (FMEA references)

Participant in:
- D1 Order to Cash (Item Revision references)
- D6 NC to CAPA (FMEA review trigger)
- D7 Document to Release (ECO drives CDOC release)

---

## 5. APIs the domain exposes

```
- Item Master API
- Item Revision API
- BOM API (with multi-level traversal)
- Routing API
- Engineering Change Order API
- CAD Drawing Link API
- FMEA API
- Process Flow Diagram API
```

---

## 6. Frontend surfaces

```
- Item Master Workspace            (projection: items by status, by family)
- Item Master Record Shell        (authoritative: item detail with BOM /
                                   routing / FMEA cross-links)
- BOM Workspace                   (projection: BOM tree visualization)
- Routing Workspace               (projection: routing sequence, capacity)
- ECO Workspace                   (projection: open ECOs, in-impact-analysis,
                                   awaiting approval)
- ECO Record Shell                (authoritative: ECO detail, impact,
                                   approval chain)
- FMEA Workspace                  (projection: FMEAs by item / process)
- FMEA Record Shell               (authoritative: failure mode detail,
                                   action priority, controls)
- Process Flow Diagram Workspace   (projection: visual flow with linked FMEA)
```

---

## 7. Cross-cutting concerns most relevant

- C1 Audit chain on every ECO and FMEA mutation
- C2 E-signature on ECO approval (regulated)
- C8 Observability per route
- C10 Retention: ECO and FMEA records retained per regulatory class
- C11 AI advisory governance: AI may suggest FMEA failure modes from
  prior NCs but never autonomously update FMEA (human owner approves)

---

## 8. Wave assignments

```
Item Master              L4 W0.5; L5 W2
Item Revision            L4 W1; L5 W3
BOM                      L4 W2; L5 W3
Routing                  L4 W2; L5 W3
ECO                      L4 W3; L5 W3
CAD Drawing Link         L4 W3; L5 W3
FMEA                     L4 W6; L5 W6
Process Flow Diagram     L4 W6; L5 W10
```

---

## 9. Standards governing this domain

```
- ISO 9001:2015 §8.3 (Design and development)
- ISO 13485:2016 §7.3 (Med device design control)
- IATF 16949:2016 §8.3 (Automotive design and development)
- AS9100D §8.3 (Aerospace design and development)
- 21 CFR Part 820 §820.30 (Med device design controls)
- AIAG-VDA FMEA Handbook 2019
- AIAG APQP 2nd Edition (for automotive)
- ISO 14971:2019 (Med device risk management; FMEA-MSR linkage)
```

---

## 10. Boundary with adjacent domains

- **D-01 Commercial**: Customer-required revisions and customer-specific
  variants live here; sales order references Item Revision active at
  order time.

- **D-03 Planning**: BOM and Routing drive MRP. Capacity planning
  consumes routing equipment families.

- **D-04 Procurement**: BOM components drive PO requirements. Supplier
  Master qualifies suppliers per item.

- **D-06 Production**: Routing drives operation execution. Work
  instructions per routing.

- **D-07 Quality**: FMEA failure modes drive Control Plan check items.
  Inspection references item revision for tolerance.

- **D-09 Maintenance**: Equipment families per routing. Calibration
  required for measurement devices used in inspection of items.

---

## 11. Decision phrase

```
C2_PRODUCT_ENGINEERING_BASELINE_LOCKED
NEXT: C3_PLANNING_PRODUCTION.md
```
