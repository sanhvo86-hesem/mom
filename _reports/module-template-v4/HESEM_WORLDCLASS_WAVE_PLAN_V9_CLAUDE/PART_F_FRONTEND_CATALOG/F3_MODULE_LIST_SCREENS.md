# F3 — Module List Screens

```
surface_class:  ML
owner_role:     Per-domain lead
```

---

## 1. Purpose

Module List screens are the entry points into specific modules. They
show "what's in this module" at a moderate level of detail — finer than
Dashboards (F2), coarser than Workspaces (F4). They never mutate.

A typical user journey: from Dashboard (F2 high-level) → Module List
(F3 module-scoped) → Workspace (F4 task-scoped) → Record Shell (F5
record-scoped).

---

## 2. Examples

```
- Quality Module List              entry to inspection / NQCASE / CAPA / CDOC workspaces
- Production Module List           entry to JO / WO / OPER workspaces
- Procurement Module List         entry to PO / SUP / IQC / SCAR workspaces
- Maintenance Module List         entry to MWO / PMSCH / CAL workspaces
- Workforce Module List           entry to user / role / training / matrix workspaces
- Finance Module List             entry to cost workspaces
- Integration Module List         entry to connector / webhook / EDI workspaces
- Analytics Module List           entry to OEE / Quality / Throughput dashboards
- Admin Module List               entry to tenant / config / SRE workspaces
```

---

## 3. Per-module pattern

Each module list shows:
- Module-level summary tiles (e.g., "today's open NCs," "this week's
  IQCs")
- Quick links to module workspaces
- Module-level filters (e.g., per-plant filter)
- Module-level recent activity feed

---

## 4. Backend bindings

Bind to Workspace Projection APIs (E5) for the summary tiles.

---

## 5. Wave target

Module list screens emerge as their respective workspaces emerge.
Most by W3-W6.

---

## 6. Decision phrase

```
F3_MODULE_LIST_SCREENS_BASELINE_LOCKED
NEXT: F4_WORKSPACE_PROJECTIONS.md
```
