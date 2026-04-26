# F4 — Workspace Projections

```
surface_class:  WS
owner_role:     Per-domain lead
```

This is the most numerous and most-used surface class in HESEM. There
are approximately 40-50 workspaces across the 14 domains.

---

## 1. Purpose

Workspaces are the task-oriented list surfaces where users accomplish
their day-to-day work. "Show me my work today," "show me open NCs,"
"show me equipment due for calibration." They are projections from
authoritative records, optimized for read.

**The discipline (per B6 C2)**: Workspaces never mutate. They never
issue commands. They display, filter, and route. To mutate, the user
clicks into a Record Shell (F5) or invokes an Action Console (F6).

---

## 2. Inventory of workspaces (by domain)

### D-01 Commercial workspaces
- WS-01 Customer 360 Workspace
- WS-02 Quotation Workspace
- WS-03 Sales Order Workspace
- WS-04 Shipment Workspace
- WS-05 Invoice Workspace
- WS-06 Customer Complaint Workspace
- WS-07 RMA Workspace

### D-02 Engineering workspaces
- WS-08 Item Master Workspace
- WS-09 Item Revision Workspace
- WS-10 BOM Workspace
- WS-11 Routing Workspace
- WS-12 ECO Workspace
- WS-13 FMEA Workspace
- WS-14 Process Flow Workspace

### D-03 Planning workspaces
- WS-15 MPS Workspace
- WS-16 MRP Workspace
- WS-17 Capacity Workspace
- WS-18 Schedule Workspace (Gantt)
- WS-19 Dispatch List Workspace (existing HMV4 baseline)
- WS-20 Kitting Workspace

### D-04 Procurement workspaces
- WS-21 Supplier Workspace
- WS-22 Purchase Order Workspace
- WS-23 Receiving Workspace
- WS-24 IQC Workspace
- WS-25 SCAR Workspace

### D-05 Inventory workspaces
- WS-26 Inventory Workspace (per location, per item, per lot)
- WS-27 Warehouse Task Workspace
- WS-28 Quarantine Workspace
- WS-29 Cycle Count Workspace

### D-06 Production workspaces
- WS-30 Connected Worker PWA (operator-facing)
- WS-31 Work Order Workspace (supervisor)
- WS-32 Operation Execution Workspace
- WS-33 OEE Workspace
- WS-34 SPC Chart Workspace

### D-07 Quality workspaces
- WS-35 Inspection Workspace
- WS-36 Nonconformance Case Workspace (existing HMV4 Slice 2 baseline)
- WS-37 CAPA Workspace
- WS-38 Controlled Document Workspace
- WS-39 MRB Workspace
- WS-40 Audit Finding Workspace
- WS-41 Periodic Review Workspace

### D-08 Traceability workspaces
- WS-42 Lot Genealogy Tree Workspace (visual graph)
- WS-43 BREL Workspace
- WS-44 Recall Workspace

### D-09 Maintenance workspaces
- WS-45 Equipment Workspace
- WS-46 PM Calendar Workspace
- WS-47 MWO Workspace
- WS-48 Calibration Workspace
- WS-49 EHS Incident Workspace

### D-10 Workforce workspaces
- WS-50 Training Workspace
- WS-51 Competency Matrix Workspace
- WS-52 Eligibility Lookup Workspace

### D-13 Analytics workspaces
- WS-53 Predictive Maintenance Workspace
- WS-54 Data Product Catalog Workspace

### Vertical pack workspaces (W10)
- WS-55 EBR Workspace (Pharma)
- WS-56 EDHR Workspace (Med Device)
- WS-57 PPAP Workspace (Automotive)
- WS-58 AS9102 FAI Workspace (Aerospace)
- WS-59 APR Workspace (Pharma)
- WS-60 DSCSA Transaction Workspace (Pharma)

---

## 3. Common workspace pattern

Every workspace has:
- Filter sidebar (status, date, owner, custom filters)
- List / table area (paginated, sortable)
- Per-row quick actions (open record shell, mark for action, archive)
- Bulk actions toolbar (when multi-row select active)
- Search / filter bar
- Pagination controls
- Refresh / freshness indicator
- Workspace-specific tools (e.g., Gantt for Schedule, tree for Genealogy)

---

## 4. Backend bindings

Workspaces bind to Workspace Projection APIs (E5). Some workspaces also
embed AI advisory (E9) inline.

---

## 5. Cross-cutting concerns

All 12 cross-cutting concerns apply to workspaces — but per the
discipline, mutation concerns (C5 idempotency, C6 concurrency) apply
to actions launched from workspaces, not to workspaces themselves.

---

## 6. Wave target

Workspaces graduate per their underlying domain capabilities. Most by
W4-W6. Vertical-pack workspaces by W10.

---

## 7. Decision phrase

```
F4_WORKSPACE_PROJECTIONS_BASELINE_LOCKED
NEXT: F5_AUTHORITATIVE_RECORD_SHELLS.md
```
