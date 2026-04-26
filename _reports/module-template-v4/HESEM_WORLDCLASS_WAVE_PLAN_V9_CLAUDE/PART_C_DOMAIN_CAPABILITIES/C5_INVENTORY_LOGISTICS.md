# C5 — Inventory & Logistics

```
domain_code:    D-05
domain_name:    Inventory & Logistics
owner_role:     Logistics Lead (with Quality Lead for quarantine, Production Lead for WIP)
primary_state_machine: SM-2 Material machine
```

---

## 1. Purpose

The Inventory & Logistics domain owns the physical location of every
piece of material in the system. The discipline is that the digital
inventory state must mirror the physical state at all times. Without
that discipline, every other domain operates on lies.

---

## 2. The roots within this domain

```
Inventory Transaction       Every move of material in or out of any
                             location, including type (receipt, issue,
                             move, adjust, scrap, ship).

Lot (Batch)                  The grouping of material with shared origin
                             (same supplier batch, same production batch).

Serial Number                The unique identifier of a single physical unit
                             (used for high-value or regulated items).

Work in Process (WIP)        Material between operations. A projection of
                             active production state.

Warehouse Task               A discrete work item for a warehouse operator
                             (pick, put-away, move, count).

Cycle Count                  The periodic verification of inventory
                             accuracy.

Reservation                  The soft allocation of material to a future
                             order or job.

Quarantine                   The held status of material that cannot be
                             used until released.
```

---

## 3. The capabilities within this domain

### CAP-C5-01 — Inventory Transaction Ledger

**Purpose.** Maintain an authoritative, immutable ledger of every
material move. Compensating transactions (not direct edits) for
corrections.

**Lifecycle.** Each move is one transaction. Transactions are appended,
never modified. Corrections happen via reversing transactions.

**Wave target.** L4 by W5; L5 by W5.

**Acceptance evidence.** Transaction history complete. On-hand inventory
derivable from transaction sum. Reconciliation with physical count
within tolerance.

### CAP-C5-02 — Lot Management

**Purpose.** Group material into lots with shared origin. Track lot
status through quarantine, release, allocation, consumption, scrap, ship.

**Lifecycle (per state machine SM-2).** A lot is created at receipt or
production. State: in-quarantine → available → allocated → consumed (or
scrapped, or rejected). Released-for-shipment when sold. Shipped at
fulfillment.

**Wave target.** L4 by W5; L5 by W5.

### CAP-C5-03 — Serial Number Management

**Purpose.** Track individual physical units by unique serial number for
high-value or regulated items.

**Lifecycle.** Serial assigned at production or receipt. Linked to lot
(parent batch). Tracked through movements until shipment, scrap, or
return.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C5-04 — Quarantine Management

**Purpose.** Hold material that cannot be used until quality review
clears it.

**Lifecycle.** Lot enters quarantine on receipt (default) or upon NC
opening. Quarantine cleared by quality decision (disposition accept) or
held indefinitely (disposition reject means scrap or return).

**Wave target.** L4 by W3; L5 by W3 (W3 eQMS Core wave).

**Acceptance evidence.** Quarantined material visibly distinct in UI,
physically segregated in warehouse, prevented from MRP / production
allocation.

### CAP-C5-05 — Warehouse Task Management

**Purpose.** Generate, assign, and track discrete warehouse tasks for
warehouse operators.

**Lifecycle.** Task generated automatically (e.g., put-away triggered
by receipt; pick triggered by SO release). Assigned to operator.
Executed (with mobile barcode scan or terminal). Closed.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C5-06 — Cycle Counting

**Purpose.** Periodically verify inventory accuracy. Identify
discrepancies and reconcile.

**Lifecycle.** Cycle count plan generated. Operator performs count.
Discrepancies investigated. Inventory adjustments per discipline.

**Wave target.** L4 by W8; L5 by W8.

### CAP-C5-07 — Reservation Management

**Purpose.** Soft-allocate material to specific orders or jobs to
prevent double-allocation.

**Lifecycle.** Reservation created at SO confirmation or job release.
Released when consumed or when allocation is moved.

**Wave target.** L4 by W5; L5 by W5.

### CAP-C5-08 — WIP Tracking

**Purpose.** Track material between operations as a projection.

**Lifecycle.** WIP is derived from production transactions; it is not a
mutated record itself. A projection refreshed continuously.

**Wave target.** L4 by W6.

---

## 4. Workflows

Primary in: D4 Receive to Inspect (alongside Procurement).

Participant in: D1 Order to Cash, D3 Plan to Produce, D5 Inspect to
Disposition, D11 Release to Trace, D12 Complaint to Recall (recall scope
identification via genealogy).

---

## 5. APIs

```
- Inventory Transaction API
- Lot API
- Serial Number API
- Quarantine API
- Warehouse Task API
- Cycle Count API
- Reservation API
- WIP API (projection)
```

---

## 6. Frontend surfaces

```
- Inventory Workspace + Record Shell (per lot, per location, per item)
- Warehouse Task Workspace (today's tasks per operator)
- Quarantine Workspace
- Cycle Count Workspace
- Lot Genealogy Workspace (cross-reference with C8 Traceability)
- WIP Dashboard
```

---

## 7. Cross-cutting concerns most relevant

- C1 Audit chain on every inventory transaction
- C5 Idempotency (transaction posted twice → counted once)
- C6 Concurrency (two operators can't pick same unit)
- C8 Observability per warehouse cycle
- C10 Retention: lot records retained per regulatory class

---

## 8. Wave assignments

```
Inventory Transaction L4 W5; L5 W5
Lot                   L4 W5; L5 W5
Serial Number         L4 W7; L5 W7
Quarantine            L4 W3; L5 W3
Warehouse Task        L4 W6; L5 W6
Cycle Count           L4 W8; L5 W8
Reservation           L4 W5; L5 W5
WIP                   L4 W6
```

---

## 9. Standards

```
- ISO 9001:2015 §8.5.4 (Preservation)
- 21 CFR Part 211 §211.142 (Storage; pharma)
- 21 CFR Part 117 §117.135 (Holding; food)
- IATF 16949 §8.5.4 (Preservation; automotive)
- DSCSA serialization (for pharma; vertical pack)
- UDI (for med device; vertical pack)
```

---

## 10. Boundary with adjacent domains

- D-04 Procurement: Receipt creates inventory transactions.
- D-06 Production: Operations consume and produce material.
- D-07 Quality: Quarantine flows from quality decisions.
- D-08 Traceability: Lot genealogy = cross-reference.
- D-11 Finance: Inventory valuation derived from inventory + cost.

---

## 11. Decision phrase

```
C5_INVENTORY_LOGISTICS_BASELINE_LOCKED
NEXT: C6_SHOPFLOOR_MES.md
```
