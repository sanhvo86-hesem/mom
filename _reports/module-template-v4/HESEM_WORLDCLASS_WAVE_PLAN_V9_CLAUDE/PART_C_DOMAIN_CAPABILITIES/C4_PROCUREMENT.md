# C4 — Procurement & Supplier Quality

```
domain_code:    D-04
domain_name:    Procurement & Supplier Quality
owner_role:     Procurement Lead (with Quality Lead for SCAR, Supplier Quality Engineer for PPAP)
primary_state_machine: SM-9 Procurement machine
```

---

## 1. Purpose

The Procurement & Supplier Quality domain is the mirror image of
Commercial: where Commercial manages outbound goods to customers,
Procurement manages inbound goods from suppliers. This domain answers:
who supplies us, what did we order from them, did they deliver on time
and to spec, and how do we hold them accountable to quality.

---

## 2. The roots within this domain

```
Supplier Master                  The system of record for who supplies the
                                  manufacturer, including legal terms,
                                  qualification status, performance score.

Purchase Order (PO)              The manufacturer's commitment to buy from
                                  a supplier.

Receiving (Receipt)              The record of physical goods arriving from
                                  a supplier.

Incoming Quality Control (IQC)   The inspection of received goods.

Supplier Qualification          The formal qualification record per IATF
                                  16949 §8.4.2 / AS9100 §8.4 / ISO 13485
                                  §7.4.

Supplier Corrective Action       The escalation when a supplier delivered
   Request (SCAR)                 defective goods, requiring corrective
                                  action.

Production Part Approval         The formal acceptance of a new part from a
   Process (PPAP)                 supplier (automotive vertical pack).
```

---

## 3. The capabilities within this domain

### CAP-C4-01 — Supplier Master Management

**Purpose.** Maintain the authoritative record of every supplier, their
contacts, certifications, qualified scope, performance.

**Lifecycle.** New supplier created from procurement need. Qualification
process. Active. Suspended if performance declines. Disqualified if
non-recoverable. Reinstated after corrective action.

**Wave target.** L4 by W1; L5 by W6.

### CAP-C4-02 — Purchase Order Lifecycle

**Purpose.** Issue, track, and close purchase orders with suppliers.

**Lifecycle (per state machine SM-9).** Draft → sent → acknowledged-by-
supplier → partially-received → fully-received → closed. Alternative:
cancelled.

**Wave target.** L4 by W4; L5 by W5.

### CAP-C4-03 — Receiving

**Purpose.** Record physical receipt of goods from suppliers, link to
PO, trigger IQC.

**Lifecycle.** Goods arrive. Receipt documented. Inventory transaction
generated for received goods (in quarantine status pending IQC).

**Wave target.** L4 by W5; L5 by W5.

### CAP-C4-04 — Incoming Quality Control

**Purpose.** Inspect received goods per inspection plan. Disposition
based on findings.

**Lifecycle (per state machine SM-3 inspection).** Inspection scheduled
on receipt. In-progress. Completed. Dispositioned (accept, reject,
rework, concession, MRB).

**Wave target.** L4 by W3; L5 by W3 (in W3 eQMS Core wave).

**Acceptance evidence.** IQC results recorded; lot disposition flows
through; rejected lots auto-quarantine; SCAR auto-candidate when
threshold breached.

### CAP-C4-05 — Supplier Qualification

**Purpose.** Formally qualify a supplier for a specific scope (specific
items, specific processes). Track qualification status, expiration, and
re-qualification triggers.

**Lifecycle.** Qualification request initiated. Evaluation per IATF
16949 §8.4.2 (or applicable standard). Audit (sometimes on-site). Sample
submission (PPAP for automotive). Decision. Active qualification.
Re-qualification triggers: certification expiry, SCAR ineffective close,
score drop, contract renewal.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C4-06 — Supplier Corrective Action Request (SCAR)

**Purpose.** Formally hold suppliers accountable for defective goods.
Track through closure with effectiveness check.

**Lifecycle (per state machine).** Draft → opened → acknowledged-by-
supplier → containment-in-place → root-cause-identified → corrective-
action-complete → effectiveness-check → closed.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C4-07 — Production Part Approval Process (PPAP)

**Purpose.** Formally approve a new part from a supplier per AIAG PPAP
4th Edition (automotive). Includes 18 elements.

**Lifecycle (per state machine).** Submission level selected (1-5,
typically 3). Documents gathered. Submitted. Customer (or HESEM)
reviews. Approved or rejected.

**Wave target.** L0 currently; L4 by W10; L5 by W10 (automotive vertical
pack).

---

## 4. Workflows

Primary in: D2 Procurement to Pay, D4 Receive to Inspect, D5 Inspect to
Disposition (for IQC failures).

Participant in: D6 NC to CAPA (when supplier is at fault), D11 Release
to Trace (supplier batch genealogy).

---

## 5. APIs

```
- Supplier Master API
- Purchase Order API
- Receiving API
- IQC API
- Supplier Qualification API
- SCAR API
- PPAP API (automotive)
- Supplier Performance Score API (read-only projection)
```

---

## 6. Frontend surfaces

```
- Supplier Master Workspace + Record Shell
- Purchase Order Workspace + Record Shell
- Receiving Workspace
- IQC Workspace + Inspection Record Shell
- Supplier Qualification Workspace + Record Shell
- SCAR Workspace + Record Shell
- PPAP Submission Workspace + Record Shell (auto pack)
- Supplier Quality Score Dashboard
```

---

## 7. Cross-cutting concerns most relevant

- C1 Audit chain on supplier mutations and SCARs
- C2 E-signature on supplier qualification approval (regulated)
- C8 Observability per receiving / IQC cycle
- C11 AI advisory: supplier risk scoring as advisory, never autonomous
  qualification decision (BD-7 banned per RULE-2)

---

## 8. Wave assignments

```
Supplier Master       L4 W1; L5 W6
Purchase Order        L4 W4; L5 W5
Receiving              L4 W5; L5 W5
IQC                    L4 W3; L5 W3
Supplier Qualification L4 W6; L5 W6
SCAR                   L4 W7; L5 W7
PPAP                   L4 W10; L5 W10 (automotive)
```

---

## 9. Standards

```
- IATF 16949:2016 §8.4 (Automotive supplier control)
- AS9100D §8.4 (Aerospace supplier control)
- ISO 13485:2016 §7.4 (Med device supplier control)
- 21 CFR Part 820 §820.50 (Med device purchasing controls)
- AIAG PPAP 4th Edition (Automotive)
- AIAG SCAR / 8D problem-solving methodology
- AS5553, AS6174 (Counterfeit parts avoidance, aerospace)
```

---

## 10. Boundary with adjacent domains

- D-02 Engineering: BOM drives PO requirements.
- D-03 Planning: MRP generates purchase requisitions.
- D-05 Inventory: Receipt creates inventory transactions.
- D-07 Quality: IQC failures raise NCs; SCAR ties to NC.
- D-08 Traceability: Supplier batch genealogy tracked.

---

## 11. Decision phrase

```
C4_PROCUREMENT_BASELINE_LOCKED
NEXT: C5_INVENTORY_LOGISTICS.md
```
