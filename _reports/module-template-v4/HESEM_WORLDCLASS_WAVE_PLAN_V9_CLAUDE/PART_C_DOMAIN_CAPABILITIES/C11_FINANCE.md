# C11 — Finance

```
domain_code:    D-11
domain_name:    Finance
owner_role:     Finance Lead
primary_state_machine: (none specific; mostly read-mostly projections + GL integration)
```

---

## 1. Purpose

The Finance domain owns the financial perspective of operations. HESEM
does not aim to replace the customer's primary financial system (SAP
Finance, Oracle Financials, NetSuite, etc.). HESEM owns operational
cost (cost of poor quality, cost variance, inventory valuation) and
integrates financial postings into the customer's primary financial
system via the GL Integration interface.

This domain is the most "boundaried" domain in HESEM — it participates
in many workflows but defers to external systems for ultimate financial
authority.

---

## 2. The roots within this domain

```
Standard Cost              The planned cost of an item per item revision.
Actual Cost                The incurred cost of producing an item (rolled
                            up from labor, material, overhead allocations).
WIP Cost                   The cost accumulated during in-process
                            manufacturing (a projection from operations).
Cost Variance              The difference between standard and actual,
                            categorized by cause (material price, labor
                            efficiency, overhead).
Inventory Valuation        The financial value of on-hand inventory
                            (per costing method: FIFO, LIFO, weighted-
                            average, standard).
Cost of Quality            The cost attributed to quality (rework, scrap,
                            inspection, audit).
GL Integration             The interface to the customer's primary
                            general ledger.
```

---

## 3. The capabilities within this domain

### CAP-C11-01 — Standard Cost Management

**Purpose.** Maintain the planned standard cost per item revision.

**Lifecycle.** Standard cost authored per item revision (typically
during BOM / routing release). Updated periodically (annual standard
cost roll typical) through ECO discipline.

**Wave target.** L4 by W8; L5 by W8.

### CAP-C11-02 — Actual Cost Capture

**Purpose.** Capture actual costs as production happens: material at
consumption, labor at OPER completion, overhead allocations per period.

**Lifecycle.** Actual costs accumulate per JO during production. Closed
when JO completes.

**Wave target.** L4 by W8; L5 by W8.

### CAP-C11-03 — WIP Cost Tracking

**Purpose.** Track cost in WIP as a projection.

**Lifecycle.** WIP cost is derived from JO + OPER + material
transactions. Refreshed continuously.

**Wave target.** L4 by W8.

### CAP-C11-04 — Variance Analysis

**Purpose.** Compute variances between standard and actual; categorize
by cause; surface in reports.

**Variance categories.**
- Material price variance (standard price vs actual price paid)
- Material usage variance (standard quantity vs actual quantity used)
- Labor rate variance (standard rate vs actual rate)
- Labor efficiency variance (standard time vs actual time)
- Overhead variance (planned vs absorbed)

**Wave target.** L4 by W8.

### CAP-C11-05 — Inventory Valuation

**Purpose.** Compute the financial value of on-hand inventory per the
customer's chosen costing method.

**Wave target.** L4 by W8.

### CAP-C11-06 — Cost of Quality (COPQ)

**Purpose.** Aggregate quality-related costs from operations: rework,
scrap, inspection labor, audit labor, complaint resolution. Surface
trends.

**Wave target.** L4 by W8.

### CAP-C11-07 — GL Integration

**Purpose.** Post operational financial events (inventory transactions,
WIP cost, variance, cost of goods sold) to the customer's primary
general ledger.

**Lifecycle.** Per posting period (often daily), HESEM batches financial
events and posts via the customer's preferred channel: file export,
direct API to SAP / Oracle / NetSuite / etc., or partner connector.

**Wave target.** L4 by W10; L5 by W10. (HESEM is intentionally late on
this; customer's primary financial system is the authority, not HESEM.)

---

## 4. Workflows

Primary in: (none unique). Participant in:
- D1 Order to Cash (invoice generation, COGS posting)
- D2 Procurement to Pay (PO commitment, AP posting)
- D3 Plan to Produce (cost roll, WIP, variance)
- D6 NC to CAPA (cost of quality calculation)

---

## 5. APIs

```
- Standard Cost API
- Actual Cost API
- WIP Cost API (projection)
- Variance Analysis API
- Inventory Valuation API
- Cost of Quality API (data product)
- GL Integration API (with documented per-target connector)
```

---

## 6. Frontend surfaces

```
- Standard Cost Workspace + Record Shell
- Actual Cost Workspace
- WIP Cost Dashboard
- Variance Analysis Workspace
- Inventory Valuation Workspace
- Cost of Quality Dashboard
- GL Posting Workspace (audit log of postings)
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on every cost mutation
- C8 Observability per cost roll cycle
- C10 Retention: cost records retained per regulatory + accounting class

---

## 8. Wave assignments

```
Standard Cost      L4 W8; L5 W8
Actual Cost        L4 W8; L5 W8
WIP Cost           L4 W8
Variance Analysis  L4 W8
Inventory Valuation L4 W8
Cost of Quality    L4 W8
GL Integration     L4 W10
```

Finance arrives later because HESEM defers to the customer's primary
financial system.

---

## 9. Standards

```
- ISO 9001:2015 (no finance-specific clauses; quality cost in §10)
- IFRS / GAAP (per customer's reporting framework)
- Customer-specific accounting policies
- Sarbanes-Oxley (for US public-company customers)
```

HESEM does not implement IFRS / GAAP rules itself; the customer's
primary financial system does. HESEM provides the source data.

---

## 10. Boundary with adjacent domains

- D-01 Commercial: Invoice generation; pricing.
- D-02 Engineering: Standard cost per item revision.
- D-03 Planning: Cost-aware capacity planning (some customers).
- D-04 Procurement: PO commitments feed AP.
- D-05 Inventory: Inventory valuation derived from inventory.
- D-06 Production: Actual cost capture per OPER.
- D-07 Quality: Cost of quality calculation.

---

## 11. Decision phrase

```
C11_FINANCE_BASELINE_LOCKED
NEXT: C12_INTEGRATION.md
```
