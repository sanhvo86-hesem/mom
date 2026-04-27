# F4 — Workspace Projections (WS Pattern) — V10 Deep Upgrade
## HESEM Manufacturing Operations Management Portal

```
pattern:          WS — Workspace Projection
owner_role:       Frontend Architecture Lead (HMV4 Program)
scope:            All 30 workspace types; 18 Wave 1 roots; 12 pack-expanded;
                  per-role partitioning; live WebSocket updates; WCAG 2.2 AA;
                  GraphicsAuthority ADR-0009; E5 §2.1 CQRS projection binding
version:          V10 deep-upgrade
api_binding:      E5 §2.1 Workspace Projection Read; E5 §2.12 Freshness
                  HEAD check; E5 §2.5 Console Live Stream (WebSocket);
                  E9 AI Advisory (inline row-level); E2 Authority Decision
posture:          Pre-production / prototype (ADR-0001); all WS surfaces
                  feature-flagged INERT by default (HMV4_PREVIEW_ENABLED=false)
upgrade_from:     V9-shallow (workspace catalog with common pattern only)
upgrade_to:       V10 — full per-workspace specifications: columns, filters,
                  bulk actions, banner states, live-data patterns, failure
                  modes, pack overlays, role partitioning, render KPI targets
decision_phrase:  S3-08_F4_WORKSPACE_DEEP_UPGRADE_COMPLETE
```

---

## 1. WS Pattern Anatomy

Workspaces are the primary task-execution surfaces in HESEM. They are
read-only CQRS projections — mutations flow through Drawer or Wizard
overlays launched from the workspace. The WS pattern is used for all
live operational queues, dispatch boards, and compliance tracking lists.

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRE-PRODUCTION BANNER (non-dismissible, ADR-0001)                        │
│  [FIXTURE MODE — purple, non-dismissible when HMV4_FIXTURE_MODE=true]     │
│  [LIVE MODE — green indicator when live API active]                       │
├───────────────────────────────────────────────────────────────────────────┤
│  SCOPE SELECTOR (site / shift / department / date; triggers reload)       │
├────────────────┬──────────────────────────────────────────────────────────┤
│  FILTER PANEL  │  WORKSPACE HEADER                                        │
│  (collapsible) │  Title · Subtitle · Freshness indicator · Refresh btn   │
│                ├──────────────────────────────────────────────────────────┤
│  — Status      │  SUB-TABS (if applicable):                               │
│  — Date range  │  Overview · Related · Evidence · History · Compliance · AI│
│  — Owner       ├──────────────────────────────────────────────────────────┤
│  — Priority    │  SEARCH + BULK-SELECT toolbar                            │
│  — Custom dims │  [Select All] [Bulk action buttons — role-gated]        │
│                ├───┬──────────────────────────────────────────────────────┤
│                │ # │ COL A    │ COL B    │ COL C    │ COL D    │ ...      │
│                ├───┼──────────┼──────────┼──────────┼──────────┼──────────┤
│                │ ☐ │ row data │ row data │ row data │ row data │ actions  │
│                │ ☐ │ row data │ row data │ row data │ row data │ actions  │
│                │   │  ...                                                 │
│                ├───┴──────────────────────────────────────────────────────┤
│                │  AGGREGATE ROW (count · total · avg cycle time)          │
│                ├──────────────────────────────────────────────────────────┤
│                │  PAGINATION (page size: 10/25/50/100 · prev/next)        │
└────────────────┴──────────────────────────────────────────────────────────┘
```

### 1.1 Column contract

Every column definition carries:

```json
{
  "key": "status",
  "label_i18n_key": "col.status",
  "type": "status_chip | text | number | date | avatar | code | tag_list",
  "sortable": true,
  "filterable": true,
  "width_token": "col-width-status",
  "align": "left | right | center",
  "pack_required": null | "j1" | "j2" | "j3" | "j4" | "j5"
}
```

Status chip colors resolve via `GraphicsAuthority.tokens.read('status-{state_key}')`.
No hex literals in column renderers. Column widths from `col-width-*` tokens.

### 1.2 Banner states

Every WS must handle all six banner states. The banner rail is a single
fixed zone at the top of the workspace content area (below the shell
top bar):

| State         | Trigger                                        | Visual                          | Dismissible |
|---------------|------------------------------------------------|---------------------------------|-------------|
| Loading       | Initial projection fetch in flight             | Skeleton row shimmer            | No          |
| Empty         | Projection returned 0 rows for current filters | Empty-state slot with action    | No          |
| Error         | API returned 5xx or network timeout            | Red banner; Retry button        | No          |
| Partial       | Some rows failed to hydrate                    | Amber banner; "N rows failed"   | Yes         |
| Degraded      | Freshness SLO breach (per E5 §2.12)            | Amber banner; "Data stale since {T}" | Yes   |
| Fixture-mode  | `HMV4_FIXTURE_MODE=true`                       | Purple; "FIXTURE DATA — not live" | No        |
| Live-mode     | Live API active; freshness OK                  | Green dot; "Live — {timestamp}" | N/A (indicator only) |

### 1.3 Freshness SLO (E5 §2.12)

Each WS defines a `freshness_slo_seconds` target. The HEAD probe
(`HEAD /api/v1/{domain}/{root}/projection`) returns `X-Data-Age-Seconds`.
If `data_age > freshness_slo_seconds`, the Degraded banner is shown.

Auto-refresh: every WS auto-refreshes when the browser tab is in the
foreground. The auto-refresh interval is the minimum of
`freshness_slo_seconds / 2` and 60 seconds.

### 1.4 Live-data WebSocket pattern

WebSocket events that update a workspace projection come through the
`wss://{host}/{tenant}/ws-events` channel. Each WS subscribes to
a topic key (e.g., `dispatch.updates`, `nqcase.state_changes`).

When a matching event arrives:
1. A "projection updated" toast appears at the top of the list for
   3 seconds.
2. After the toast auto-dismisses (or if the user dismisses it),
   the affected row updates in place via DOM diff.
3. The freshness indicator timestamp updates.
4. The aggregate row re-derives without a full reload.

Direct cell mutations without a toast are forbidden (WS §3.4.3).

### 1.5 Render KPI target

All WS surfaces must achieve p95 render time < 250ms from navigation
event to first contentful paint (columns + first page of rows visible).
This is tighter than ML (300ms) because WS is the primary task surface.

Projection endpoint caching:
- First load: served from E5 CQRS read-model (pre-computed; not
  a live DB scan).
- Subsequent filter/sort changes: re-query with new parameters;
  server returns pre-computed filtered page.
- Column data: denormalized into the projection row (no joins at
  render time).

---

## 2. Wave 1 Workspace Specifications (WS-01 through WS-18)

---

### WS-01: DISP Dispatch Board

```
workspace_id:    WS-01
root_kind:       DISP
domain_slug:     planning_production
e5_binding:      E5 §2.1 projection; §2.5 live stream (dispatch.updates)
freshness_slo:   30 seconds
render_kpi:      p95 < 250ms
slice_status:    DONE (Slice 1)
```

**Name and purpose:** Real-time production dispatch board showing all
active job orders mapped to work cells, by shift. Primary surface for
dispatchers and production supervisors to monitor floor status, identify
blocked jobs, and reassign work.

**Default columns:**

| Column              | Type         | Sortable | Filterable | Notes |
|---------------------|--------------|----------|------------|-------|
| JO Code             | code         | Yes      | Yes        | Monospace; links to JO AR |
| Work Cell           | text         | Yes      | Yes        | From DISP scope selector |
| Status              | status_chip  | No       | Yes        | open/in-progress/blocked/completed |
| Priority            | tag_list     | Yes      | Yes        | hot-job / normal / low |
| Product             | text         | Yes      | Yes        | Item description |
| Planned Qty         | number       | Yes      | No         | Scheduled units |
| Completed Qty       | number       | Yes      | No         | Live from MES |
| % Complete          | number (pct) | Yes      | No         | Derived |
| Planned Start       | date         | Yes      | Yes        | Shift-relative |
| Planned End         | date         | Yes      | Yes        | |
| Operator Assigned   | avatar       | Yes      | Yes        | |
| Exception Flag      | status_chip  | No       | Yes        | starved/blocked/at-risk |

**Sub-tab structure:** None — DISP is a single-plane projection.

**Search + filter + bulk-select:**
- Search: JO code, product description (free text; debounce 250ms)
- Filters: Work cell, shift, priority, status, exception flag, date
- Bulk select: Reassign operator (Supervisor, Dispatcher); Escalate to
  SEV-2 (Supervisor); Export filtered board (CSV)

**Per-pack overlay:**
- **J1:** Column `eBR Status` added (not started / in progress / complete);
  hot-filter "eBR incomplete for closed WO" shows compliance gap.
- **J2:** Column `LPA Audit Due` (date); filter for LPA-overdue jobs.
- **J3:** Column `FAI Required` (boolean badge); FAI status filter.
- **J4:** Column `DHR Entry Status`; filter for incomplete DHR on WO.
- **J5:** Column `HACCP CCP Check Due` (time); CCP-overdue filter.

**Per-role view:**

| Role        | Scope                       | Mutations Available      |
|-------------|----------------------------|--------------------------|
| Operator    | Own work cell only          | Record count (via Drawer)|
| Dispatcher  | Full plant                  | Reassign, escalate        |
| Supervisor  | Own department              | All Drawer triggers       |
| Planner     | Read-only full view         | None                      |
| Auditor     | Read-only scoped            | None                      |

**Failure modes:**
- MES count feed disconnected: Completed Qty column shows last known value
  with a staleness badge; Degraded banner appears.
- All rows filtered out: "No jobs match filters — clear filters to see
  all active jobs" empty state.

**WebSocket events:** `dispatch.job_status_changed`, `dispatch.operator_assigned`,
`dispatch.exception_raised`, `dispatch.count_recorded`.

---

### WS-02: NQCASE Nonconformance Case List

```
workspace_id:    WS-02
root_kind:       NQCASE
domain_slug:     quality_improvement
e5_binding:      E5 §2.1 projection; §2.12 freshness HEAD
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
slice_status:    DONE (Slice 2)
```

**Name and purpose:** Operational queue of nonconformance cases for
quality teams. Used for daily management of open NCs — review, disposition,
escalation to CAPA, and closure.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| NC Code             | code         | Yes      | Yes        |
| Title / Description | text         | Yes      | No         |
| Status              | status_chip  | No       | Yes        |
| Severity            | tag_list     | Yes      | Yes        |
| Source              | text         | Yes      | Yes        |
| Detected By         | avatar       | Yes      | Yes        |
| Product / Item      | text         | Yes      | Yes        |
| Lot / Batch         | code         | Yes      | Yes        |
| Detected Date       | date         | Yes      | Yes        |
| Target Close Date   | date         | Yes      | Yes        |
| Days Open           | number       | Yes      | No         |
| CAPA Linked         | status_chip  | No       | Yes        |
| Disposition         | status_chip  | No       | Yes        |

**Sub-tab structure:** WS-02 has a secondary "Evidence Freshness" view
(tab: Evidence Freshness) showing per-NC evidence completeness score —
used by QA Managers for gate review.

**Search + filter + bulk-select:**
- Search: NC code, title, item code, lot number
- Filters: Status, severity, source (internal / supplier / customer),
  disposition, detected-by, date range, overdue toggle, CAPA-linked toggle
- Bulk select: Assign to me; Assign to (principal picker); Escalate;
  Export to XLSX; Archive (Admin only)

**Per-pack overlay:**
- **J1:** Columns `Sterile Batch` (boolean) and `QP Review Required`
  (boolean). Filter: "QP action pending." Deviation type taxonomy
  (EU GMP Annex 11 deviation codes).
- **J2:** Column `Supplier SCAR Required` (boolean). AIAG taxonomy
  for defect classification.
- **J3:** Column `GIDEP Alert Linked` (boolean). AS9100 non-conformance
  code from taxonomy.
- **J4:** Column `MDR Potential` (boolean; AI-19 classifier result).
  Filter: "MDR potential unreviewed."
- **J5:** Column `HACCP Significance` (critical / major / minor).
  FSMA product family filter.

**Per-role view:**

| Role          | Scope           | Mutations Available                |
|---------------|-----------------|------------------------------------|
| Operator      | Own submissions | Submit new (via Wizard trigger)    |
| QA Analyst    | Site scope      | Disposition; escalate to CAPA      |
| QA Manager    | Site scope      | All; approve disposition           |
| Compliance    | Full read       | Export; view evidence              |
| Auditor       | Session-scoped  | Read-only                          |

**WebSocket events:** `nqcase.state_changed`, `nqcase.disposition_set`,
`nqcase.capa_linked`.

---

### WS-03: TRAIN Training Matrix

```
workspace_id:    WS-03
root_kind:       TRAIN
domain_slug:     master_data
e5_binding:      E5 §2.1 projection; §2.12 freshness HEAD
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
slice_status:    IN PROGRESS (Slice 3)
```

**Name and purpose:** Two-dimensional matrix showing training
assignments (persons × training items) with completion status, expiry,
and overdue flags. Used by training administrators and supervisors for
workforce competency gap management.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Person Name         | text         | Yes      | Yes        |
| Employee ID         | code         | Yes      | Yes        |
| Department          | text         | Yes      | Yes        |
| Training Item Code  | code         | Yes      | Yes        |
| Training Title      | text         | Yes      | No         |
| Completion Status   | status_chip  | No       | Yes        |
| Completion Date     | date         | Yes      | Yes        |
| Expiry Date         | date         | Yes      | Yes        |
| Days Until Expiry   | number       | Yes      | No         |
| Score / Grade       | text         | Yes      | No         |
| Trainer             | avatar       | Yes      | Yes        |
| Overdue             | status_chip  | No       | Yes        |

**Sub-tab structure:** Overview (default matrix); Expiry Calendar
(upcoming expirations on a calendar grid); Eligibility Gaps (derived
view: roles with uncertified operators).

**Search + filter + bulk-select:**
- Search: person name, employee ID, training item code / title
- Filters: Department, training category, status (complete / in-progress /
  overdue / not-started), expiry window (30d / 60d / 90d),
  eligibility gap toggle
- Bulk select: Assign training to selected persons; Mark for re-training;
  Export training register (CSV)

**Per-pack overlay:**
- **J1:** Aseptic qualification status column; filter for aseptic-
  qualified personnel only; sterile-line eligibility indicator.
- **J3:** ITAR clearance level column; PoR designation indicator.
- **J4:** PRRC competency status column; Article 15 requirement flag.
- **J5:** PCQI designation column; FSVP qualified importer flag.

**Per-role view:**

| Role           | Scope                     | Mutations Available          |
|----------------|---------------------------|------------------------------|
| Operator       | Own training records      | Request training (via Drawer)|
| Supervisor     | Own team                  | Assign training; record completion |
| Training Admin | Full site                 | Full management              |
| HR             | All persons read-only     | None                         |
| Auditor        | Read-only                 | None                         |

**WebSocket events:** `training.completion_recorded`,
`training.expiry_approaching`, `training.assignment_changed`.

---

### WS-04: CAPA Corrective Action List

```
workspace_id:    WS-04
root_kind:       CAPA
domain_slug:     quality_improvement
e5_binding:      E5 §2.1 projection
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Corrective and Preventive Action queue for quality
management. Shows all CAPAs with lifecycle state, owner, effectiveness
review dates, and linked NCs.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| CAPA Code           | code         | Yes      | Yes        |
| Title               | text         | Yes      | No         |
| Status              | status_chip  | No       | Yes        |
| Type                | tag_list     | Yes      | Yes        |
| Root Cause Category | text         | Yes      | Yes        |
| Owner               | avatar       | Yes      | Yes        |
| Target Close Date   | date         | Yes      | Yes        |
| Days Overdue        | number       | Yes      | No         |
| Priority            | tag_list     | Yes      | Yes        |
| Linked NC Count     | number       | Yes      | No         |
| Effectiveness Due   | date         | Yes      | Yes        |
| Risk Level          | status_chip  | No       | Yes        |

**Search + filter + bulk-select:**
- Search: CAPA code, title, root cause keyword
- Filters: Status, type (corrective / preventive / both), owner,
  overdue toggle, risk level, effectiveness-due window
- Bulk select: Reassign; Escalate; Close (Admin); Export

**Per-pack overlay:**
- **J1:** Columns for `Deviation Link` and `CAPA Class` (EU GMP Annex 11
  classification: major / critical / other).
- **J2:** AIAG 8D phase indicator (D1–D8) as a mini progress bar.
- **J4:** Column `FSCA Required` (boolean; field safety corrective
  action flag for MDR-linked CAPAs).
- **J5:** `HACCP Corrective Action` boolean; CCP deviation link.

**WebSocket events:** `capa.state_changed`, `capa.owner_changed`,
`capa.effectiveness_review_due`.

---

### WS-05: CDOC Controlled Document List

```
workspace_id:    WS-05
root_kind:       CDOC
domain_slug:     quality_improvement
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Document control workspace showing all controlled
documents (SOPs, work instructions, forms, specifications) with revision
status, review cycle, and approval state.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Document Code       | code         | Yes      | Yes        |
| Title               | text         | Yes      | No         |
| Document Type       | tag_list     | Yes      | Yes        |
| Revision            | text         | Yes      | No         |
| Status              | status_chip  | No       | Yes        |
| Owner               | avatar       | Yes      | Yes        |
| Effective Date      | date         | Yes      | Yes        |
| Review Due Date     | date         | Yes      | Yes        |
| Approver            | avatar       | Yes      | Yes        |
| DCC Header Valid    | status_chip  | No       | Yes        |
| Training Required   | status_chip  | No       | Yes        |

**Search + filter + bulk-select:**
- Search: doc code, title
- Filters: Type, status, owner, approver, review-due window, DCC
  compliance (valid / missing / invalid)
- Bulk select: Assign review; Export document index; Archive (Admin)

**Per-pack overlay:**
- **J1:** Column `21 CFR Part 11 Compliant` (boolean). Filter: docs
  with electronic approval audit trail.
- **J4:** Column `DHF Section` (which DHF section this doc belongs to).
- **J5:** Column `HACCP Plan Component` (boolean).

---

### WS-06: INSP Inspection Queue

```
workspace_id:    WS-06
root_kind:       INSP
domain_slug:     quality_improvement
e5_binding:      E5 §2.1 projection; §2.5 live (insp.status_changed)
freshness_slo:   60 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Incoming and in-process inspection queue. Inspectors
use this surface to see their assigned inspections, record results, and
escalate failures.

**Default columns:**

| Column           | Type         | Sortable | Filterable |
|------------------|--------------|----------|------------|
| Inspection Code  | code         | Yes      | Yes        |
| Type             | tag_list     | Yes      | Yes        |
| Item / Part      | text         | Yes      | Yes        |
| Lot / Batch      | code         | Yes      | Yes        |
| Supplier (IQC)   | text         | Yes      | Yes        |
| Status           | status_chip  | No       | Yes        |
| Result           | status_chip  | No       | Yes        |
| AQL Level        | text         | Yes      | No         |
| Sample Size      | number       | Yes      | No         |
| Inspector        | avatar       | Yes      | Yes        |
| Scheduled Date   | date         | Yes      | Yes        |
| Completed Date   | date         | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: code, item, lot
- Filters: Type (IQC / in-process / final / periodic), status, result,
  inspector, date, AQL level
- Bulk select: Assign to me; Export results; Bulk-pass (with
  confirmation modal — Supervisor only)

**Per-pack overlay:**
- **J1:** Column `Sterile Process Step` (boolean); GMP defect
  classification (critical / major / minor / cosmetic).
- **J3:** Column `AS9102 Section` for FAI inspections.
- **J4:** Column `Design Characteristic` (critical / major / minor).
- **J5:** Column `HACCP CCP Check` (boolean); allergen check flag.

**WebSocket events:** `insp.started`, `insp.result_recorded`,
`insp.failed_escalated`.

---

### WS-07: BREL Batch Release Queue

```
workspace_id:    WS-07
root_kind:       BREL
domain_slug:     quality_improvement
pack_primary:    J1 (Pharma)
e5_binding:      E5 §2.1 projection; §2.5 live (brel.qp_action_required)
freshness_slo:   60 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** QP (Qualified Person) batch release queue. Primary
workspace for GMP batch disposition — eBR review, OOS/OOT assessment,
QP sign-off, and batch release or rejection decision.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Batch Code           | code         | Yes      | Yes        |
| Product              | text         | Yes      | Yes        |
| Batch Status         | status_chip  | No       | Yes        |
| eBR Status           | status_chip  | No       | Yes        |
| QP Assigned          | avatar       | Yes      | Yes        |
| Manufactured Date    | date         | Yes      | Yes        |
| Release Window Close | date         | Yes      | Yes        |
| Hours Remaining      | number       | Yes      | No         |
| OOS Events           | number       | Yes      | No         |
| OOT Events           | number       | Yes      | No         |
| Disposition          | status_chip  | No       | Yes        |
| Site                 | text         | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: batch code, product
- Filters: Status, QP assigned, disposition, OOS/OOT flag,
  release window (overdue / due-today / due-this-week)
- Bulk select: Assign QP; Export batch register (J1 EU GMP format)

**Per-pack overlay:** J1 is the defining pack — no additional overlays.
Non-J1 tenants see an "Enable Pharma Pack to access Batch Release" gate.

**WebSocket events:** `brel.qp_assigned`, `brel.ebr_section_complete`,
`brel.disposition_changed`, `brel.oos_raised`.

---

### WS-08: ECO Engineering Change List

```
workspace_id:    WS-08
root_kind:       ECO
domain_slug:     master_data
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Engineering change order tracking workspace.
CCB members, engineers, and operations staff monitor ECO lifecycle —
from initiation through CCB approval to controlled effectivity release.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| ECO Code            | code         | Yes      | Yes        |
| Title               | text         | Yes      | No         |
| Status              | status_chip  | No       | Yes        |
| Change Category     | tag_list     | Yes      | Yes        |
| Initiator           | avatar       | Yes      | Yes        |
| CCB Reviewer        | avatar       | Yes      | Yes        |
| Proposed Effectivity| date         | Yes      | Yes        |
| Affected Items Count| number       | Yes      | No         |
| Open WOs Affected   | number       | Yes      | No         |
| Priority            | tag_list     | Yes      | Yes        |
| Days In Review      | number       | Yes      | No         |

**Search + filter + bulk-select:**
- Search: ECO code, title, item code
- Filters: Status, category, priority, initiator, effectivity-date range,
  items-affected count range
- Bulk select: Assign reviewer; Escalate; Export ECO register

**Per-pack overlay:**
- **J2:** Column `APQP Gate Impact` (which APQP gate this ECO affects).
- **J3:** Column `AS9100 NCR Reference`. Export classification required
  for ECOs affecting ITAR items.
- **J4:** Column `DHF Impact Section`. Regulatory submission trigger
  assessment column.

---

### WS-09: JO Job Order List

```
workspace_id:    WS-09
root_kind:       JO
domain_slug:     planning_production
e5_binding:      E5 §2.1 projection; §2.5 live (jo.state_changed)
freshness_slo:   60 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Job order list for planners and production managers.
Shows all JOs across their lifecycle — from planning through release to
completion — with schedule adherence and exception flags.

**Default columns:**

| Column            | Type         | Sortable | Filterable |
|-------------------|--------------|----------|------------|
| JO Code           | code         | Yes      | Yes        |
| Product           | text         | Yes      | Yes        |
| Status            | status_chip  | No       | Yes        |
| Priority          | tag_list     | Yes      | Yes        |
| Planned Qty       | number       | Yes      | No         |
| Completed Qty     | number       | Yes      | No         |
| Planned Start     | date         | Yes      | Yes        |
| Planned End       | date         | Yes      | Yes        |
| Work Cell         | text         | Yes      | Yes        |
| Schedule Adherence| status_chip  | No       | Yes        |
| Exception Flag    | status_chip  | No       | Yes        |
| Customer SO       | code         | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: JO code, product, SO code
- Filters: Status, priority, work cell, schedule adherence
  (on-time / at-risk / late), exception flag, date range
- Bulk select: Release to shop floor (Planner, Supervisor);
  Export schedule (XLSX); Close jobs (Admin)

**Per-pack overlay:**
- **J1:** Column `eBR Required` (boolean); lot genealogy completeness
  indicator per JO.
- **J2:** Column `OEM Customer Order` (linked CPO code from J2 OEM).
- **J4:** Column `DHR Required` (boolean). UDI assignment status.

**WebSocket events:** `jo.released`, `jo.completed`, `jo.blocked`,
`jo.priority_changed`.

---

### WS-10: SO Sales Order List

```
workspace_id:    WS-10
root_kind:       SO
domain_slug:     commercial_customer
e5_binding:      E5 §2.1 projection
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Sales order tracking workspace for sales, logistics,
and operations. Shows fulfillment status, delivery promises, and
shipment readiness.

**Default columns:**

| Column            | Type         | Sortable | Filterable |
|-------------------|--------------|----------|------------|
| SO Code           | code         | Yes      | Yes        |
| Customer          | text         | Yes      | Yes        |
| Status            | status_chip  | No       | Yes        |
| Order Date        | date         | Yes      | Yes        |
| Promise Date      | date         | Yes      | Yes        |
| Total Value       | number       | Yes      | No         |
| Currency          | text         | No       | Yes        |
| Fulfillment Pct   | number (pct) | Yes      | No         |
| JO Linked         | status_chip  | No       | Yes        |
| Shipment Status   | status_chip  | No       | Yes        |
| Account Manager   | avatar       | Yes      | Yes        |
| Late Risk         | status_chip  | No       | Yes        |

**Search + filter + bulk-select:**
- Search: SO code, customer, product
- Filters: Status, customer, date range, late-risk flag, fulfillment
  pct range, account manager
- Bulk select: Assign account manager; Export sales register; Mark
  for expedite (Supervisor)

**Per-pack overlay:**
- **J4:** Column `UDI Verification` for device shipments.
- **J5:** Column `FDA Prior Notice Required` for LACF/acidified food.

---

### WS-11: WO Work Order List

```
workspace_id:    WS-11
root_kind:       WO
domain_slug:     planning_production
e5_binding:      E5 §2.1 projection; §2.5 live (wo.state_changed)
freshness_slo:   60 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Work order queue for supervisors and production
management. Tracks execution status of individual production operations
across machines and operators.

**Default columns:**

| Column            | Type         | Sortable | Filterable |
|-------------------|--------------|----------|------------|
| WO Code           | code         | Yes      | Yes        |
| JO Code           | code         | Yes      | Yes        |
| Operation         | text         | Yes      | Yes        |
| Status            | status_chip  | No       | Yes        |
| Machine / WC      | text         | Yes      | Yes        |
| Operator          | avatar       | Yes      | Yes        |
| Planned Qty       | number       | Yes      | No         |
| Produced Qty      | number       | Yes      | No         |
| Scrap Qty         | number       | Yes      | No         |
| Setup Time        | number       | Yes      | No         |
| Run Time          | number       | Yes      | No         |
| Shift             | text         | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: WO code, JO code, machine ID
- Filters: Status, machine, operator, shift, scrap-threshold breach,
  date range
- Bulk select: Reassign operator; Issue material; Export WO report

**Per-pack overlay:**
- **J1:** Column `eBR Section Complete` (boolean). GMP batch
  documentation status per WO.
- **J4:** Column `DHR Entry Status`. Unique device count per WO.
- **J5:** Column `CCP Check Completed` (boolean).

**WebSocket events:** `wo.started`, `wo.count_recorded`, `wo.scrap_logged`,
`wo.completed`.

---

### WS-12: CPO Customer Purchase Order List

```
workspace_id:    WS-12
root_kind:       CPO
domain_slug:     commercial_customer
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Customer purchase order register tracking inbound
CPOs through acknowledgement, production planning, fulfillment, and
invoicing.

**Default columns:**

| Column            | Type         | Sortable | Filterable |
|-------------------|--------------|----------|------------|
| CPO Code          | code         | Yes      | Yes        |
| Customer          | text         | Yes      | Yes        |
| Status            | status_chip  | No       | Yes        |
| CPO Date          | date         | Yes      | Yes        |
| Required Date     | date         | Yes      | Yes        |
| Total Value       | number       | Yes      | No         |
| Line Item Count   | number       | Yes      | No         |
| SO Linked         | status_chip  | No       | Yes        |
| Invoice Status    | status_chip  | No       | Yes        |
| Account Manager   | avatar       | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: CPO code, customer
- Filters: Status, customer, date range, SO-linked status,
  invoice status
- Bulk select: Link to SO; Export CPO register; Archive (Admin)

---

### WS-13: PO Purchase Order List

```
workspace_id:    WS-13
root_kind:       PO
domain_slug:     procurement_supplier_quality
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Purchase order tracking for procurement. Monitors
POs from issuance through receipt, invoice matching, and closure.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| PO Code             | code         | Yes      | Yes        |
| Supplier            | text         | Yes      | Yes        |
| Status              | status_chip  | No       | Yes        |
| PO Date             | date         | Yes      | Yes        |
| Expected Delivery   | date         | Yes      | Yes        |
| Total Value         | number       | Yes      | No         |
| Currency            | text         | No       | Yes        |
| Receipt Status      | status_chip  | No       | Yes        |
| IQC Status          | status_chip  | No       | Yes        |
| Buyer               | avatar       | Yes      | Yes        |
| Days Late           | number       | Yes      | No         |

**Search + filter + bulk-select:**
- Search: PO code, supplier name, item code
- Filters: Status, supplier, receipt status, IQC status, date range,
  late-delivery toggle
- Bulk select: Send delivery reminder; Export PO register;
  Approve invoices (Finance role)

**Per-pack overlay:**
- **J2:** Column `PPAP Required` (boolean); PPAP status for new POs.
- **J3:** Column `ITAR/EAR Classification`; NADCAP supplier filter.
- **J5:** Column `FSVP Verification Status` for foreign supplier POs.

---

### WS-14: QUO Quote List

```
workspace_id:    WS-14
root_kind:       QUO
domain_slug:     commercial_customer
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Sales quotation register showing all quotes with
win/loss tracking, expiry, and conversion to SO.

**Default columns:**

| Column          | Type         | Sortable | Filterable |
|-----------------|--------------|----------|------------|
| Quote Code      | code         | Yes      | Yes        |
| Customer        | text         | Yes      | Yes        |
| Status          | status_chip  | No       | Yes        |
| Issue Date      | date         | Yes      | Yes        |
| Expiry Date     | date         | Yes      | Yes        |
| Total Value     | number       | Yes      | No         |
| Win Probability | number (pct) | Yes      | Yes        |
| Sales Rep       | avatar       | Yes      | Yes        |
| Days to Expiry  | number       | Yes      | No         |
| Converted to SO | status_chip  | No       | Yes        |

**Search + filter + bulk-select:**
- Search: quote code, customer
- Filters: Status, sales rep, expiry window, win probability range
- Bulk select: Extend expiry; Export pipeline report; Archive lost

---

### WS-15: PREC Supplier / Vendor List

```
workspace_id:    WS-15
root_kind:       PREC
domain_slug:     procurement_supplier_quality
e5_binding:      E5 §2.1 projection
freshness_slo:   600 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Approved supplier / vendor register. Procurement
and quality teams maintain supplier qualification status, performance
scorecards, and audit schedules.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Supplier Code        | code         | Yes      | Yes        |
| Name                 | text         | Yes      | Yes        |
| Approval Status      | status_chip  | No       | Yes        |
| Commodity Category   | tag_list     | Yes      | Yes        |
| OTD (90d)            | number (pct) | Yes      | Yes        |
| PPM Defect Rate (90d)| number       | Yes      | Yes        |
| Last Audit Date      | date         | Yes      | Yes        |
| Next Audit Due       | date         | Yes      | Yes        |
| Open SCARs           | number       | Yes      | No         |
| Risk Level           | status_chip  | No       | Yes        |
| Account Manager      | avatar       | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: supplier code, name, commodity
- Filters: Approval status, commodity, risk level, audit-overdue toggle,
  open-SCAR count range
- Bulk select: Schedule audit; Export approved supplier list;
  Suspend (Admin)

**Per-pack overlay:**
- **J2:** Column `MMOG/LE Score`; OEM-specific scorecard link.
- **J3:** Column `NADCAP Certifications` (tag list); GIDEP enrollment.
- **J4:** Column `Critical Supplier Classification`; 21 CFR 820.50 audit date.
- **J5:** Column `FSVP Status` (verified / pending / overdue).

---

### WS-16: LOT Lot / Batch Traceability List

```
workspace_id:    WS-16
root_kind:       LOT
domain_slug:     traceability_serialization
e5_binding:      E5 §2.1 projection
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Lot and batch register with traceability metadata.
Used by warehouse, quality, and traceability teams to track lot status,
genealogy completeness, and regulatory coverage.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Lot Number           | code         | Yes      | Yes        |
| Item Code            | code         | Yes      | Yes        |
| Item Description     | text         | Yes      | No         |
| Status               | status_chip  | No       | Yes        |
| Supplier Lot No.     | text         | Yes      | Yes        |
| Received Date        | date         | Yes      | Yes        |
| Manufactured Date    | date         | Yes      | Yes        |
| Expiry Date          | date         | Yes      | Yes        |
| Qty On Hand          | number       | Yes      | No         |
| Location             | text         | Yes      | Yes        |
| Genealogy Coverage   | number (pct) | Yes      | No         |
| DSCSA Verified (J1)  | status_chip  | No       | Yes        |

**Search + filter + bulk-select:**
- Search: lot number, item code, supplier lot
- Filters: Status, location, expiry window, genealogy coverage
  range, DSCSA verified toggle
- Bulk select: Quarantine selected lots; Export traceability report;
  Add to recall scope; Print labels

**Per-pack overlay:**
- **J1:** Column `Serialization Status` (serialized / aggregated / bulk).
  DSCSA transaction count.
- **J4:** Column `UDI-DI` and `UDI-PI` for device lots.
- **J5:** Column `KDE Completeness` (pct); CTE link count.

---

### WS-17: IREV Internal Audit Review List

```
workspace_id:    WS-17
root_kind:       IREV
domain_slug:     quality_improvement
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Internal audit and management review workspace.
Compliance leads and QA managers track internal audit programs, findings,
and corrective action follow-up.

**Default columns:**

| Column             | Type         | Sortable | Filterable |
|--------------------|--------------|----------|------------|
| IREV Code          | code         | Yes      | Yes        |
| Title              | text         | Yes      | No         |
| Type               | tag_list     | Yes      | Yes        |
| Status             | status_chip  | No       | Yes        |
| Lead Auditor       | avatar       | Yes      | Yes        |
| Scope / Area       | text         | Yes      | Yes        |
| Planned Date       | date         | Yes      | Yes        |
| Actual Date        | date         | Yes      | Yes        |
| Finding Count      | number       | Yes      | No         |
| Open Actions       | number       | Yes      | No         |
| Standard           | tag_list     | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: IREV code, title, scope
- Filters: Type (quality / EHS / financial / system), status,
  lead auditor, standard (ISO 9001 / AS9100 / ISO 13485 / FSSC 22000),
  date range
- Bulk select: Assign auditor; Export audit register

**Per-pack overlay:**
- **J1:** Filter for GMP self-inspection vs. system audit types.
- **J2:** Column `IATF 16949 Clause` linked to findings.
- **J3:** Column `AS9100 Requirement` linked to findings.
- **J4:** Column `ISO 13485 Clause`.
- **J5:** Column `FSSC 22000 / SQF Clause`.

---

### WS-18: MWO Maintenance Work Order List

```
workspace_id:    WS-18
root_kind:       MWO
domain_slug:     maintenance_ehs
e5_binding:      E5 §2.1 projection; §2.5 live (mwo.state_changed)
freshness_slo:   60 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Maintenance work order queue for maintenance
technicians, planners, and supervisors. Covers planned, corrective,
and predictive maintenance tasks.

**Default columns:**

| Column             | Type         | Sortable | Filterable |
|--------------------|--------------|----------|------------|
| MWO Code           | code         | Yes      | Yes        |
| Asset / Equipment  | text         | Yes      | Yes        |
| Type               | tag_list     | Yes      | Yes        |
| Status             | status_chip  | No       | Yes        |
| Priority           | tag_list     | Yes      | Yes        |
| Assigned Tech      | avatar       | Yes      | Yes        |
| Scheduled Date     | date         | Yes      | Yes        |
| Actual Start       | date         | Yes      | Yes        |
| Actual End         | date         | Yes      | Yes        |
| Parts Used         | number       | Yes      | No         |
| Downtime Hours     | number       | Yes      | No         |
| Work Area          | text         | Yes      | Yes        |

**Search + filter + bulk-select:**
- Search: MWO code, asset ID
- Filters: Type (planned / corrective / predictive / emergency),
  status, priority, assigned tech, area, overdue toggle
- Bulk select: Reassign; Approve parts request; Export maintenance log

**Per-pack overlay:**
- **J1:** Column `GMP Validation Impact` (boolean). PM tasks on
  validated equipment flagged. Calibration certificate status.
- **J3:** Column `SLLP Life Remaining (hrs)`. Service-life alert.

**WebSocket events:** `mwo.started`, `mwo.completed`, `mwo.parts_issued`.

---

## 3. Pack-Expanded Workspace Specifications (WS-19 through WS-30)

---

### WS-19: DSCSA Partner Network

```
workspace_id:    WS-19
root_kind:       DSCSA
domain_slug:     traceability_serialization
pack_required:   J1
e5_binding:      E5 §2.1 projection; §2.9 auditor variant
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** DSCSA (Drug Supply Chain Security Act)
serialized lot chain tracking and trading partner verification workspace.
Shows lot transactions across the pharmaceutical supply chain with
partner verification status, exception tracking, and EPCIS exchange health.

**Default columns:**

| Column                | Type         | Sortable | Filterable |
|-----------------------|--------------|----------|------------|
| Transaction Code      | code         | Yes      | Yes        |
| Lot / Serial          | code         | Yes      | Yes        |
| Product NDC           | code         | Yes      | Yes        |
| Transaction Type      | tag_list     | Yes      | Yes        |
| Trading Partner       | text         | Yes      | Yes        |
| Transaction Date      | date         | Yes      | Yes        |
| Verification Status   | status_chip  | No       | Yes        |
| EPCIS Exchange Status | status_chip  | No       | Yes        |
| Partner Maturity Level| tag_list     | Yes      | Yes        |
| Exception Flag        | status_chip  | No       | Yes        |

**Filters:** Verification status, trading partner, product NDC, date
range, exception flag, partner maturity level.
**Bulk actions:** Submit verification request; Export DSCSA audit file
(FDA-ready format); Flag for investigation.
**Auditor variant (E5 §2.9):** Read-only; full EPCIS transaction log;
no export.
**Per-role view:** Traceability Lead — full; QA Analyst — verification
view; Operator — no access.

---

### WS-20: PPAP Status Board

```
workspace_id:    WS-20
root_kind:       PPAP
domain_slug:     procurement_supplier_quality
pack_required:   J2
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Part-level PPAP (Production Part Approval Process)
submission status board for automotive suppliers. Shows PPAP package
status per part number, OEM, and submission level.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Part Number         | code         | Yes      | Yes        |
| Part Description    | text         | Yes      | No         |
| OEM Customer        | text         | Yes      | Yes        |
| Submission Level    | tag_list     | Yes      | Yes        |
| PPAP Status         | status_chip  | No       | Yes        |
| Submission Date     | date         | Yes      | Yes        |
| OEM Response Date   | date         | Yes      | Yes        |
| PSW Status          | status_chip  | No       | Yes        |
| Open Actions        | number       | Yes      | No         |
| Supplier Quality Eng| avatar       | Yes      | Yes        |

**Filters:** OEM customer, submission level (1–5), PPAP status,
PSW status, date range.
**Bulk actions:** Send PPAP reminder to supplier; Export PPAP register
(AIAG format).

---

### WS-21: FAI Tracker

```
workspace_id:    WS-21
root_kind:       FAI
domain_slug:     quality_improvement
pack_required:   J3
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** First Article Inspection tracker per AS9102 for
aerospace manufacturing. Shows FAI status by part number, revision, and
production facility.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Part Number         | code         | Yes      | Yes        |
| Revision            | text         | Yes      | No         |
| FAI Status          | status_chip  | No       | Yes        |
| FAI Type            | tag_list     | Yes      | Yes        |
| Customer / Program  | text         | Yes      | Yes        |
| Scheduled Date      | date         | Yes      | Yes        |
| Completed Date      | date         | Yes      | Yes        |
| Disposition         | status_chip  | No       | Yes        |
| Open Bubbles        | number       | Yes      | No         |
| Responsible Eng.    | avatar       | Yes      | Yes        |
| Trigger Event       | text         | Yes      | Yes        |

**Filters:** FAI status, type (full / partial / delta), customer,
disposition, trigger event (new part / design change / process change /
supplier change), date range.
**Bulk actions:** Assign engineer; Export AS9102 compliance report.

---

### WS-22: UDI Device Registry

```
workspace_id:    WS-22
root_kind:       UDI
domain_slug:     traceability_serialization
pack_required:   J4
e5_binding:      E5 §2.1 projection
freshness_slo:   600 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** GUDID/EUDAMED device registration status
workspace for medical device manufacturers. Shows registration status
for all UDI-DI codes across regulatory jurisdictions.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| UDI-DI              | code         | Yes      | Yes        |
| Device Description  | text         | Yes      | No         |
| Device Class        | tag_list     | Yes      | Yes        |
| Jurisdiction        | tag_list     | Yes      | Yes        |
| GUDID Status        | status_chip  | No       | Yes        |
| EUDAMED Status      | status_chip  | No       | Yes        |
| Submission Date     | date         | Yes      | Yes        |
| Accepted Date       | date         | Yes      | Yes        |
| Expiry / Renewal    | date         | Yes      | Yes        |
| RA Owner            | avatar       | Yes      | Yes        |

**Filters:** Jurisdiction (FDA / EU / MDSAP), device class (I / II / III),
GUDID status, EUDAMED status, renewal due window.
**Bulk actions:** Submit to GUDID batch; Export UDI register; Flag for update.

---

### WS-23: FSMA §204 Lot Coverage

```
workspace_id:    WS-23
root_kind:       FSMA204
domain_slug:     traceability_serialization
pack_required:   J5
e5_binding:      E5 §2.1 projection
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** FSMA §204 traceability compliance workspace for
food manufacturers. Shows CTE (Critical Tracking Event) and KDE (Key
Data Element) completeness per lot for FDA-designated food categories.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Lot Number          | code         | Yes      | Yes        |
| Food Category       | tag_list     | Yes      | Yes        |
| CTE Count           | number       | Yes      | No         |
| KDE Completeness    | number (pct) | Yes      | Yes        |
| Missing KDEs        | number       | Yes      | No         |
| Traceability Partner| text         | Yes      | Yes        |
| Lot Date            | date         | Yes      | Yes        |
| Expiry Date         | date         | Yes      | Yes        |
| FDA Category Flag   | status_chip  | No       | Yes        |
| Compliance Status   | status_chip  | No       | Yes        |

**Filters:** Food category, KDE completeness threshold, compliance status,
traceability partner, FDA category flag, date range.
**Bulk actions:** Submit KDE data; Export §204 compliance report;
Flag lot for mock recall.

---

### WS-24: Supplier Scorecard

```
workspace_id:    WS-24
root_kind:       SCORECARD
domain_slug:     procurement_supplier_quality
pack_required:   J2
e5_binding:      E5 §2.1 projection; E5 §2.3 analytics
freshness_slo:   1800 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Supplier performance scorecard workspace per
MMOG/LE metrics for automotive OEM supply chains. Provides structured
per-supplier ratings across delivery, quality, logistics, and management.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Supplier Code        | code         | Yes      | Yes        |
| Supplier Name        | text         | Yes      | Yes        |
| OEM Customer         | text         | Yes      | Yes        |
| MMOG/LE Score        | number       | Yes      | Yes        |
| OTD Score            | number (pct) | Yes      | Yes        |
| Quality PPM          | number       | Yes      | Yes        |
| Logistics Score      | number       | Yes      | No         |
| Management Score     | number       | Yes      | No         |
| Overall Rating       | status_chip  | No       | Yes        |
| Scoring Period       | date         | Yes      | Yes        |
| Trend vs. Prior      | tag_list     | No       | No         |

**Filters:** OEM customer, overall rating, scoring period, OTD threshold,
PPM threshold.
**Bulk actions:** Send scorecard to supplier; Schedule development meeting;
Export OEM scorecard pack.

---

### WS-25: Counterfeit Alert Board

```
workspace_id:    WS-25
root_kind:       COUNTERFEIT
domain_slug:     procurement_supplier_quality
pack_required:   J3
e5_binding:      E5 §2.1 projection; E9 AI-18 alerts
freshness_slo:   3600 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Counterfeit and suspect unapproved parts alert
board for aerospace manufacturers. Aggregates AI-18 (counterfeit risk
prediction) alerts and GIDEP (Government-Industry Data Exchange Program)
alerts.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Alert Code          | code         | Yes      | Yes        |
| Alert Source        | tag_list     | Yes      | Yes        |
| Part Number         | code         | Yes      | Yes        |
| Supplier            | text         | Yes      | Yes        |
| Alert Date          | date         | Yes      | Yes        |
| Severity            | status_chip  | No       | Yes        |
| AI Risk Score       | number (pct) | Yes      | Yes        |
| Status              | status_chip  | No       | Yes        |
| Inventory Affected  | status_chip  | No       | Yes        |
| GIDEP Reference     | code         | Yes      | Yes        |

**Filters:** Alert source (AI-18 / GIDEP / industry notification),
severity, status, part number, supplier, date range, inventory-affected toggle.
**Bulk actions:** Quarantine affected inventory; File GIDEP report;
Notify program team.

---

### WS-26: MDR Vigilance Queue

```
workspace_id:    WS-26
root_kind:       MDR
domain_slug:     quality_improvement
pack_required:   J4
e5_binding:      E5 §2.1 projection; E9 AI-19 classification
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Medical device vigilance and MDR (Medical Device
Report) filing queue. Customer complaints classified by AI-19 are triaged
here for regulatory decision — whether an MDR/MAUDE submission is required
under 21 CFR Part 803 or EU MDR Article 87.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Complaint Code       | code         | Yes      | Yes        |
| Device / UDI         | code         | Yes      | Yes        |
| Complaint Summary    | text         | Yes      | No         |
| AI-19 Classification | status_chip  | No       | Yes        |
| AI Confidence        | number (pct) | Yes      | No         |
| MDR Required?        | status_chip  | No       | Yes        |
| Human Decision       | status_chip  | No       | Yes        |
| Decision Maker       | avatar       | Yes      | Yes        |
| 30-Day Clock         | number       | Yes      | No         |
| Filing Status        | status_chip  | No       | Yes        |
| Jurisdiction         | tag_list     | Yes      | Yes        |

**Filters:** AI classification, MDR required flag, human decision
status, jurisdiction (FDA / EU MDR / Health Canada), 30-day clock
(expired / expiring-today / on-track).
**Bulk actions:** Accept AI classification; Override classification
(with mandatory reason text); File MDR (navigates to MDR Wizard).

AI Insights inline: AI-19 classification rationale shown in expandable
row. Human decision is mandatory before filing — AI alone cannot trigger
a submission (per L1 §10 human-authority principle).

---

### WS-27: HACCP Monitor

```
workspace_id:    WS-27
root_kind:       HACCP
domain_slug:     quality_improvement
pack_required:   J5
e5_binding:      E5 §2.1 projection; §2.5 live (haccp.ccp_deviation)
freshness_slo:   30 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** HACCP (Hazard Analysis Critical Control Point)
real-time CCP monitoring workspace for food manufacturing. Shows current
CCP status across establishment, with deviation alerts and corrective
action triggers.

**Default columns:**

| Column             | Type         | Sortable | Filterable |
|--------------------|--------------|----------|------------|
| CCP Code           | code         | Yes      | Yes        |
| CCP Name           | text         | Yes      | No         |
| Hazard Type        | tag_list     | Yes      | Yes        |
| Critical Limit     | text         | No       | No         |
| Current Value      | number       | Yes      | No         |
| Limit Status       | status_chip  | No       | Yes        |
| Monitoring Freq    | text         | No       | No         |
| Last Checked       | date         | Yes      | No         |
| Checked By         | avatar       | Yes      | Yes        |
| Corrective Action  | status_chip  | No       | Yes        |
| Establishment      | text         | Yes      | Yes        |

**Filters:** Establishment, hazard type (biological / chemical /
physical / radiological), limit status (within / deviation / critical),
corrective-action-open toggle.
**Bulk actions:** Acknowledge deviation; Trigger corrective action (via
Drawer); Export monitoring log (FDA-ready format).

**WebSocket events:** `haccp.ccp_reading_recorded`, `haccp.ccp_deviation`,
`haccp.corrective_action_required`.

30-second freshness SLO is mandatory because CCP deviations require
near-realtime operator response per FSMA requirements.

---

### WS-28: Evidence Freshness Board

```
workspace_id:    WS-28
root_kind:       EVFRESH
domain_slug:     quality_improvement
pack_required:   none (all packs; applies wherever regulated decisions exist)
e5_binding:      E5 §2.1 projection; E5 §2.12 composition gate status
freshness_slo:   300 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Cross-domain composition gate status board.
Compliance leads and QA managers use this workspace to see whether
the evidence backing each regulated decision is fresh enough to support
that decision — preventing stale-evidence risk in audit or inspection
scenarios.

**Default columns:**

| Column               | Type         | Sortable | Filterable |
|----------------------|--------------|----------|------------|
| Decision Record Code | code         | Yes      | Yes        |
| Decision Type        | tag_list     | Yes      | Yes        |
| Domain               | text         | Yes      | Yes        |
| Evidence Items       | number       | Yes      | No         |
| Oldest Evidence Age  | number (days)| Yes      | Yes        |
| Freshness Gate Status| status_chip  | No       | Yes        |
| SLO Target (days)    | number       | Yes      | No         |
| Gate Breach Date     | date         | Yes      | Yes        |
| Owner                | avatar       | Yes      | Yes        |

**Filters:** Domain, decision type, freshness gate status (pass /
warning / breach), breach date range, owner.
**Bulk actions:** Request evidence refresh; Notify owner; Export
freshness compliance report.

Per-pack: J1 adds EU GMP Annex 11 evidence integrity check column;
J4 adds DHF evidence coverage score; J3 adds ITAR classification
freshness column.

---

### WS-29: AI Advisory Board

```
workspace_id:    WS-29
root_kind:       AI_ADV
domain_slug:     analytics
pack_required:   none (universal)
e5_binding:      E5 §2.1 projection; E9 AI advisory catalog
freshness_slo:   120 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Centralized AI advisory board showing all active
E9 recommendations across all modules and domains. Compliance leads
and managers review, acknowledge, and act on AI advisories. All human
decisions on advisories are recorded in the E9 governance ledger.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Advisory Code       | code         | Yes      | Yes        |
| AI Feature          | text         | Yes      | Yes        |
| Subject Record      | code         | Yes      | Yes        |
| Domain              | tag_list     | Yes      | Yes        |
| Recommendation      | text         | Yes      | No         |
| Confidence          | number (pct) | Yes      | Yes        |
| Advisory Date       | date         | Yes      | Yes        |
| Status              | status_chip  | No       | Yes        |
| Human Action        | status_chip  | No       | Yes        |
| Acted By            | avatar       | Yes      | Yes        |

**Filters:** AI feature (multi-select from E9 catalog), domain,
status (active / acknowledged / acted / overridden / expired),
confidence threshold, human-action pending toggle.
**Bulk actions:** Acknowledge selected; Dismiss (with reason); Export
advisory audit log.

All advisory actions are advisory-only. No AI advisory may trigger a
mutation without explicit human confirmation (per L1 §10). The "Act"
column triggers a confirmation Wizard — not a silent API call.

---

### WS-30: Integration Health Board

```
workspace_id:    WS-30
root_kind:       INT_HEALTH
domain_slug:     core_infrastructure
pack_required:   none (universal — visible to Admin and Integration Engineers)
e5_binding:      E5 §2.1 projection; §2.5 live (integration.health_changed)
freshness_slo:   30 seconds
render_kpi:      p95 < 250ms
```

**Name and purpose:** Partner integration health and circuit-breaker
status board. Shows real-time health of all configured integration
connectors, LRO queue status, and sub-processor compliance state.

**Default columns:**

| Column              | Type         | Sortable | Filterable |
|---------------------|--------------|----------|------------|
| Connector ID        | code         | Yes      | Yes        |
| Partner Name        | text         | Yes      | Yes        |
| Protocol            | tag_list     | Yes      | Yes        |
| Status              | status_chip  | No       | Yes        |
| Circuit Breaker     | status_chip  | No       | Yes        |
| Last Success        | date         | Yes      | Yes        |
| Last Failure        | date         | Yes      | Yes        |
| Failure Rate (24h)  | number (pct) | Yes      | Yes        |
| Latency p95 (ms)    | number       | Yes      | Yes        |
| LRO Queue Depth     | number       | Yes      | No         |
| Data Residency Zone | tag_list     | Yes      | Yes        |

**Filters:** Status, protocol (EDI-X12 / EDIFACT / REST / AS2 / SFTP),
circuit-breaker state (closed / open / half-open), failure-rate
threshold, data residency zone.
**Bulk actions:** Reset circuit breaker (Admin); Retry failed LRO
(Admin); Export health report; Disable connector (Admin).

**WebSocket events:** `integration.connector_health_changed`,
`integration.circuit_breaker_tripped`, `integration.lro_completed`,
`integration.lro_failed`.

30-second freshness SLO is mandatory because circuit-breaker events
have real-time operational impact on partner data exchange.

---

## 4. Common Failure Modes

Applies to all WS surfaces unless the individual spec states otherwise:

| Code    | Description                              | Behavior                                               | Recovery |
|---------|------------------------------------------|--------------------------------------------------------|----------|
| FM-WS-1 | Projection API 5xx                       | Error banner; Retry button; previous rows cached for 5 min | E5 restart |
| FM-WS-2 | Freshness SLO breach                     | Degraded banner; stale timestamp; auto-retry every 30s | E5 cache invalidation |
| FM-WS-3 | Zero rows (no data match)                | Purposeful empty state: "No {root} records match current filters" | None — expected |
| FM-WS-4 | Zero rows (API empty — no records exist) | Purposeful empty state with "Create first {root}" action | Create flow trigger |
| FM-WS-5 | Partial row hydration failure            | Amber "N rows could not be loaded" banner; affected rows show error state | Row-level Retry |
| FM-WS-6 | WebSocket disconnect                     | Live-mode indicator turns amber "Reconnecting…"; falls back to 30s poll | Auto-reconnect |
| FM-WS-7 | Fixture mode active                      | Purple non-dismissible banner; all rows are fixture data | Toggle HMV4_FIXTURE_MODE |
| FM-WS-8 | Role lacks `workspace.view` permission   | 403 from API; "Access denied" full-page state; not a blank page | Role configuration |
| FM-WS-9 | Pack not enabled for tenant              | Pack-gated WS shows "Enable {pack_name} to access this workspace" gate | Admin pack activation |
| FM-WS-10| Column sort/filter produces no results   | Row area shows filter-specific empty state; filter chip persists | Clear filter button |
| FM-WS-11| Bulk action fails                        | Toast error per failed row; success count shown for succeeded rows | Retry individual rows |

---

## 5. Cross-Cutting Concerns

### 5.1 Graphics Authority compliance (ADR-0009)

All WS column renderers in `mom/scripts/portal/73-module-template-v4-renderers.js`
must resolve every visual parameter through `window.GraphicsAuthority.tokens.read()`.
Specific token requirements:

- Status chip background: `status-{state_key}-bg`
- Status chip text: `status-{state_key}-text`
- Row hover background: `ws-row-hover-bg`
- Row selected background: `ws-row-selected-bg`
- Column sort indicator: `col-sort-active-color`
- Aggregate row background: `ws-aggregate-bg`
- Freshness indicator (green/amber/red): `freshness-ok`, `freshness-degraded`, `freshness-breach`

No hex literals, no bare `px` widths, no hardcoded `font-family` strings
in any workspace renderer. Forbidden diff guard (quality gate 7) enforces
this on every PR.

### 5.2 WCAG 2.2 AA

- Column header `<th>` elements have `scope="col"` and `aria-sort="ascending|descending|none"`.
- Sort buttons are `<button>` elements (not `<div>` click handlers).
- Row checkboxes for bulk select: `aria-label="Select {record_code}"`.
- Bulk action toolbar: `role="toolbar"` with `aria-label="Bulk actions"`.
- Filter panel: `role="search"` with `aria-label="{workspace_name} filters"`.
- Freshness indicator: `aria-live="polite"` so timestamp updates are
  announced.
- Empty states: `role="status"` with `aria-live="polite"`.
- Skip link: `<a href="#ws-table" class="skip-link">Skip to {workspace_name} table</a>`.

### 5.3 Internationalization (per F12)

- Column labels: all from `i18n_key` — no hardcoded strings.
- Date columns: locale-formatted via `Intl.DateTimeFormat`.
- Number columns: locale-formatted via `Intl.NumberFormat` (decimal
  separator, thousand separator).
- Currency columns: formatted with `Intl.NumberFormat({currency})`.
- Status chip labels: locale keys (not English-only strings).
- RTL: column order reverses; filter panel slides in from left instead
  of right; sort icons mirror.

### 5.4 Pre-production posture (ADR-0001)

- `HMV4_FIXTURE_MODE=true`: purple non-dismissible banner at top of
  every WS; all data comes from `tests/fixtures/module-template-v4/
  record-fixtures.json` projection key.
- `HMV4_DISABLE_MUTATION_LAUNCHERS=true`: all Drawer and Wizard
  triggers within WS surfaces are disabled; row action menus are
  hidden; bulk action buttons are disabled; quick-action cells show
  "–" placeholder.
- `HMV4_PREVIEW_ENABLED=false`: WS surfaces are not reachable from
  `mom/portal.html` navigation.

### 5.5 Render KPI accountability

The p95 < 250ms target is measured from the navigation event
(URL change) to first contentful paint (columns visible + skeleton
rows replaced by real data for the first page). This requires:

- Projection endpoint served from E5 read-model (no live DB scan
  at render time).
- Column definitions loaded from a bundled schema (not a network call).
- Status chip tokens pre-resolved at module boot (GraphicsAuthority
  bootstrap in `00bb-graphics-authority.js` resolves all `status-*`
  tokens at startup and caches them in memory).
- First page size default: 25 rows (configurable to 10/50/100
  but 25 is the default for performance).

Measurements must be recorded by the Playwright `module-template-v4-visual.spec.ts`
performance assertions. Any workspace that regresses past 350ms p95
is flagged by the CI performance gate.

---

## 6. Wave Targets

| Wave | WS Milestone                                                         |
|------|----------------------------------------------------------------------|
| W1   | WS-01 (DISP) + WS-02 (NQCASE) live; fixture + real API toggle       |
| W2   | WS-03 (TRAIN); freshness SLO enforcement for Wave 1 roots            |
| W3   | WS-04 through WS-08; bulk-select with bulk actions                   |
| W4   | WS-09 through WS-12; WebSocket live-data pattern for all roots       |
| W5   | WS-13 through WS-18; J1 + J4 pack overlays for all WS               |
| W6   | WS-19 (DSCSA) + WS-26 (MDR) + WS-27 (HACCP); J1/J4/J5 pack GA      |
| W7   | WS-20 through WS-25 (J2/J3 packs); AI advisory inline (E9)          |
| W8   | WS-28 (Evidence Freshness) + WS-29 (AI Advisory) + WS-30 (Int Health)|
| W10  | All 30 WS types production-ready (pre-production posture lifted)     |
| W12  | Sovereign region variants; glove-mode WS rendering                   |

---

## 7. Cross-References

- F0 — eight canonical patterns; WS pattern definition §3.4
- F1 — global shell; navigation to WS entry points
- F3 — module list screens (parent; summary tiles link to WS)
- F5 — authoritative record shells (target of WS row clicks)
- F6 — action consoles (launched from WS work items)
- F7 — drawers (launched from WS row actions)
- F8 — wizards (launched from WS bulk actions or Drawer "promote" actions)
- F9 — frontend-backend binding; E5 endpoint contracts
- F10 — design tokens (status-*, ws-row-*, col-width-*, freshness-*)
- F11 — accessibility specification
- F12 — internationalization
- E2 — authority decision (role-partitioning for WS columns + actions)
- E5 §2.1 — workspace projection read
- E5 §2.5 — console live stream (WebSocket topics)
- E5 §2.9 — auditor variant projection
- E5 §2.12 — freshness HEAD check
- E9 — AI advisory (inline row-level + WS-29 advisory board)
- L1 §10 — AI communication discipline (no silent mutations from AI)
- M5 — SLO definition (SLO-7: render p95; SLO-5: freshness)

---

## 8. Decision Phrases

```
S3-08_F4_WORKSPACE_DEEP_UPGRADE_COMPLETE
NEXT: F5_AUTHORITATIVE_RECORD_SHELLS.md

S3-08_F3_F4_DEEP_UPGRADE_COMPLETE
```
