# C8 — Traceability & Genealogy

```
domain_code:    D-08
domain_name:    Traceability & Genealogy
owner_role:     Quality Lead with Logistics Lead
primary_state_machine: SM-6 Release machine
```

---

## 1. Purpose

The Traceability & Genealogy domain owns the chain that connects raw
material to finished product to customer. When a regulator asks "show
me the genealogy of this lot from raw material to customer," the answer
comes from this domain. When a recall is initiated, this domain
identifies the affected scope. When DSCSA serialization is required
(US pharma), this domain owns the unique unit identification.

This domain is enabled by the Operational Truth Graph (PART_B3); without
the OTG's GENEALOGY edges, this domain would be slow and fragile.

---

## 2. The roots within this domain

```
Lot Genealogy Edge          The formal link from a parent lot to a child
                             lot (typically created at consumption /
                             production events).

Batch / Build Release        The formal authorization that a finished lot
   (BREL)                    may be shipped. The most cross-cutting root in
                             HESEM; depends on evidence from many domains.

Recall Record                The formal program when a released product
                             must be retrieved from the field.

Release Packet               The assembled collection of evidence that
                             justifies a release; a projection from BREL +
                             contributing roots.

DSCSA Transaction            US pharma DSCSA serialization transaction
                             record (vertical pack).

Serialized Unit              A specific physical unit identified by GTIN +
                             lot + serial + expiration date (vertical
                             pack: pharma DSCSA, med device UDI).
```

---

## 3. The capabilities within this domain

### CAP-C8-01 — Lot Genealogy Tracking

**Purpose.** Maintain the GENEALOGY edges in the OTG that link parent
lots to child lots. Created at every consume / produce event during
operation execution.

**Lifecycle.** Edge created automatically at OPER completion when an
output lot is produced from input lots. Edges are append-only; lot
relationships do not change after creation.

**Wave target.** L4 by W7; L5 by W7.

**Acceptance evidence.** Genealogy queryable up to depth 20 within
performance budget. Cycles prevented (axiom A14). Multi-parent / multi-
child relationships supported (M:N).

### CAP-C8-02 — Batch / Build Release (BREL)

**Purpose.** The cross-cutting workflow that authorizes a finished lot
for shipment. Depends on evidence from inspection (CAP-C7-01), quality
(no open critical NCs), CAPA (closed effectively, none pending),
training (compliance), validation (fresh evidence), calibration
(equipment status valid).

**Lifecycle (per state machine SM-6).** Draft → in-review → ready-for-
release → released (or withdrawn).

**Pre-release evidence chain.** All of:
- All required inspections passed
- Lot quarantine cleared (no open NCs blocking)
- Relevant CAPAs closed effectively (or scheduled effectiveness check)
- Training compliance confirmed
- Equipment validation evidence fresh
- Calibration status valid
- Master batch / build record adherence verified
- 21 CFR Part 11 e-signature captured (two-person for regulated)
- Audit chain extension confirmed

**Wave target.** L4 by W7; L5 by W7; L7 by W10 (per vertical pack).

**Acceptance evidence.** BREL release with full evidence chain visible
in audit pack. All guards enforced; failure returns 422 with itemized
list.

### CAP-C8-03 — Release Packet Assembly

**Purpose.** Per BREL release, assemble a downloadable release packet
containing the full evidence chain.

**Lifecycle.** Generated on demand; signed; archived per retention
class.

**Wave target.** L4 by W7; L7 by W10.

### CAP-C8-04 — Recall Workflow

**Purpose.** Manage the formal recall program.

**Lifecycle (per state machine SM-12 Recall).** Identified → classified
(I, II, III) → notified-FDA → notified-customer → in-progress →
effectiveness-check → closed.

**Genealogy-driven scope identification.** Recall scope determined by
walking GENEALOGY edges from affected lot through all downstream
shipments and customers.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C8-05 — DSCSA Serialization (Pharma vertical)

**Purpose.** US pharma DSCSA: unique product identifier (NDC + serial
number) per saleable unit; aggregation (case ↔ pallet ↔ shipment); EPCIS
event exchange.

**Lifecycle.** Serial assigned at batch packaging. Aggregation events
recorded. EPCIS events exchanged with trading partners.

**Wave target.** L0 currently; L7 by W10 (Pharma pack).

### CAP-C8-06 — UDI Management (Med Device vertical)

**Purpose.** Unique Device Identification per FDA UDI rule and EU MDR
requirements.

**Lifecycle.** UDI generated at production per device class. Linked to
device history record. Submitted to GUDID (FDA) or EUDAMED (EU).

**Wave target.** L0 currently; L7 by W10 (Med Device pack).

---

## 4. Workflows

Primary in: D10 Batch to Release, D11 Release to Trace, D12 Complaint to
Recall.

---

## 5. APIs

```
- Lot Genealogy API (with depth-N traversal)
- BREL API (with full evidence chain)
- Recall API
- Release Packet API
- DSCSA API (pharma; EPCIS exchange)
- UDI API (med device)
```

---

## 6. Frontend surfaces

```
- Lot Genealogy Tree Workspace (visual graph)
- BREL Workspace + Record Shell
- Recall Workspace + Record Shell (with affected scope visualization)
- Release Packet Generator Wizard
- DSCSA Transaction Workspace (pharma)
- UDI Generation Workspace (med device)
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on BREL release (most regulated)
- C2 Two-person e-signature on regulated BREL release
- C8 Observability per BREL release
- C10 Retention: BREL records retained per regulatory class (often
  permanent for pharma)

---

## 8. Wave assignments

```
Lot Genealogy Edge   L4 W7; L5 W7
BREL                 L4 W7; L5 W7; L7 W10 (per pack)
Recall               L4 W7; L5 W7
Release Packet       L4 W7; L7 W10
DSCSA                L7 W10 (pharma pack)
UDI                  L7 W10 (med device pack)
```

---

## 9. Standards

```
- 21 CFR Part 211 §211.165 (Pharma batch release)
- EU GMP Annex 16 (QP certification of batches)
- 21 CFR Part 7 (recall program)
- EU MDR Article 87 (med device reporting)
- DSCSA (US Drug Supply Chain Security Act)
- EPCIS (Electronic Product Code Information Services)
- ICH Q10 (Pharmaceutical Quality System)
- AS9145 (Aerospace APQP/PPAP including release)
- ISA-95 (operational genealogy)
```

---

## 10. Boundary with adjacent domains

- D-01 Commercial: Shipment uses lot genealogy for traceability;
  complaint may trigger recall.
- D-04 Procurement: Supplier batch is a parent in genealogy.
- D-05 Inventory: Lot management feeds genealogy edges.
- D-06 Production: Operations consume / produce lots; edges created
  per OPER.
- D-07 Quality: BREL evidence chain depends on Quality.
- D-09 Maintenance: Calibration evidence required for BREL.
- D-10 Workforce: Training compliance required for BREL.

---

## 11. Decision phrase

```
C8_TRACEABILITY_GENEALOGY_BASELINE_LOCKED
NEXT: C9_MAINTENANCE_EHS.md
```
