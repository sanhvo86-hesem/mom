# E5 — Workspace Projection API

```
api_family:     Workspace Projections
owner_role:     Per-domain lead (per PART_F1 frontend surface owners)
scope:          Read-optimized denormalized views for workspaces
```

---

## 1. Purpose

The Workspace Projection API serves the read-optimized data shapes that
power workspace UI surfaces (PART_F). Unlike Record APIs (which serve
authoritative records), Projection APIs serve denormalized,
pre-aggregated, fast views.

A workspace is a list-oriented UI: "show me all open NCs," "show me
all WOs for this shift," "show me the equipment status across the
plant." Projections power them.

---

## 2. Endpoints (one per workspace)

There are approximately 40 workspace projections (cross-referenced in
PART_F). Each has:

### Standard list endpoint

**Purpose**: Retrieve the projection data filtered and paginated.

**Cache**: per the projection's freshness SLA (typically 5-60 seconds).

**Pagination**: cursor-based.

**Filter**: per-projection filters (typically tenant + status + date
range + assigned-to).

### Single-row detail (when applicable)

**Purpose**: Retrieve enriched detail for one row of the projection
(when more detail than the list shows is needed without going to the
full Record API).

### Filter metadata endpoint

**Purpose**: Return the available filter options (e.g., the distinct
"status" values for a workspace).

**Audience**: Filter UI components.

### Aggregations endpoint (for dashboard projections)

**Purpose**: Return aggregated metrics: counts, percentiles, trends.

**Audience**: Dashboard tiles, visualizations.

---

## 3. Workspaces by domain (cross-reference summary)

```
D-01 Commercial workspaces: Customer 360, Quotation, Sales Order,
                            Shipment, Invoice, Complaint, RMA workspaces
D-02 Engineering workspaces: Item Master, BOM, Routing, ECO, FMEA,
                              Process Flow workspaces
D-03 Planning workspaces:    MPS, MRP, Capacity, Schedule, Dispatch,
                              Kitting workspaces
D-04 Procurement workspaces: Supplier, PO, Receiving, IQC, Supplier
                              Qualification, SCAR workspaces
D-05 Inventory workspaces:   Inventory by Lot/Location, Warehouse
                              Tasks, Quarantine, Cycle Count workspaces
D-06 Production workspaces:  Connected Worker, WO, OPER, OEE, Andon,
                              SPC, EBR/EDHR workspaces
D-07 Quality workspaces:     Inspection, NQCASE (existing HMV4 Slice),
                              CAPA, CDOC, MRB, Audit Finding, APR,
                              Deviation, Periodic Review workspaces
D-08 Traceability workspaces: Lot Genealogy Tree, BREL, Recall, Release
                               Packet workspaces
D-09 Maintenance workspaces:  Equipment, PM Calendar, MWO, Calibration,
                               EHS Incident, Reliability workspaces
D-10 Workforce workspaces:   User, Role, Training, Competency Matrix,
                              Eligibility Lookup workspaces
D-11 Finance workspaces:     Cost, Variance, Valuation, COPQ workspaces
D-12 Integration workspaces:  Connector Health, Webhook Subscriptions,
                              Live API Toggle, Schema Registry, EDI
                              workspaces
D-13 Analytics workspaces:   OEE, Quality, Throughput, Predictive
                              Maintenance dashboards
```

Plus admin / SRE / observability workspaces (D-14).

---

## 4. Authentication and authorization

Authenticated session required. Per-tenant scope. Per-workspace role
checks (e.g., not every user can see the financial dashboards).

---

## 5. Cache and freshness

Each projection has a declared freshness SLA (in B5 §4):
- High-velocity (open NCs, dispatch list, OEE): 5-30 seconds
- Medium-velocity (most workspaces): 1-5 minutes
- Low-velocity (master data, supplier qualification): 1 hour

The freshness lag is exposed in the response (so the UI can show "data
fresh as of X seconds ago").

---

## 6. Failure modes

```
- auth/unauthorized              401
- auth/forbidden                 403
- projection/freshness-stale     503 (when projection lag exceeds threshold)
- projection/refresh-failed      503
- rate-limit/exceeded            429
```

---

## 7. Wave target

Projection APIs go live as the underlying projections (B5) materialize.
Most by W4-W4.5; OTG-native projections by W4.5; analytic projections
by W8.

---

## 8. Decision phrase

```
E5_WORKSPACE_PROJECTION_API_BASELINE_LOCKED
NEXT: E6_AUDIT_API.md
```
