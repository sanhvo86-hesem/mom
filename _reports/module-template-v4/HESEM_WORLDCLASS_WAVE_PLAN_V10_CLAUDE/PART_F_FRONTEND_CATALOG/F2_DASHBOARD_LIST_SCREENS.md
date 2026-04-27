# F2 — Dashboard / List (DL) Screens (V10 Deep Upgrade)

```
pattern:          DL — Dashboard / List
owner_role:       Frontend Architecture Lead (HMV4 Program)
scope:            All workspace-overview dashboards serving KPI tiles +
                  record lists; live stream integration; audit-pack export;
                  per-portal variants; per-pack overlays; WCAG 2.2 AA
version:          V10 deep-upgrade
api_binding:      E5 §2.3 Dashboard Data Product; E5 §2.1 Workspace
                  Projection Read; E5 §2.5 Console Live Stream; E5 §2.12
                  Freshness HEAD Probe
graphics:         window.GraphicsAuthority.tokens.read() — ADR-0009;
                  CSS variables from graphics_token_catalog; no hex/px
                  literals in JS or HTML
posture:          Pre-production / prototype (ADR-0001); all surfaces
                  feature-flagged INERT by default (HMV4_PREVIEW_ENABLED=false)
upgrade_from:     V9-shallow (screen inventory without full per-dashboard
                  contracts)
upgrade_to:       V10 — full per-dashboard contracts; ≥20 dashboards;
                  live stream pattern; print/export; WCAG 2.2 AA; per-portal
                  variants; freshness SLO; failure modes
```

---

## 1. DL Pattern Anatomy

Every DL screen is composed of three structural zones mounted under the
`HMV4Shell` layout frame:

```
┌─────────────────────────────────────────────────────────────┐
│  BANNER RAIL   (freshness state, stale warning, fixture mode)│
├──────────────┬──────────────────────────────────────────────┤
│  KPI TILE    │  KPI TILE  │  KPI TILE  │  KPI TILE  │ ...  │
│  STRIP (≥3)  │            │            │            │       │
├──────────────┴──────────────────────────────────────────────┤
│  FILTER BAR  (search, date-range, site picker, status enum) │
├─────────────────────────────────────────┬───────────────────┤
│                                         │                   │
│  LIST AREA (role=grid, aria-live=polite)│  ANOMALY SIDEBAR  │
│  — column headers                       │  (AI advisory     │
│  — paginated rows                       │   signals; E9     │
│  — row inline actions                   │   anomaly events) │
│  — bulk-action toolbar (role=toolbar)   │                   │
│  — empty state slot                     │                   │
│                                         │                   │
└─────────────────────────────────────────┴───────────────────┘
```

### 1.1 KPI Tile contract

Each tile receives a `kpi` object from the E5 §2.3 dashboard data product
response. The tile renderer reads all visual parameters from Graphics
Authority:

```
tile.background          → GraphicsAuthority.tokens.read('kpi-tile-bg')
tile.status-color.green  → GraphicsAuthority.tokens.read('status-green')
tile.status-color.amber  → GraphicsAuthority.tokens.read('status-amber')
tile.status-color.red    → GraphicsAuthority.tokens.read('status-red')
tile.trend-up-color      → GraphicsAuthority.tokens.read('trend-up')
tile.trend-down-color    → GraphicsAuthority.tokens.read('trend-down')
tile.sparkline-stroke    → GraphicsAuthority.tokens.read('sparkline-stroke')
tile.font-size-value     → GraphicsAuthority.tokens.read('kpi-value-size')
tile.font-size-label     → GraphicsAuthority.tokens.read('kpi-label-size')
```

Tile ARIA: `role="region"`, `aria-label="<kpi_name>: <value> <uom>, status
<green|amber|red>"`. Trend icon: `aria-label="Trend: <up|down|flat>"`.
Sparkline: `role="img"`, `aria-label="<kpi_name> sparkline last 30 days"`.

Live region: the KPI tile strip is wrapped in
`aria-live="polite" aria-atomic="false"`. When a WebSocket
`stats-updated` event arrives, only the changed tile's value node is
updated in the DOM so the live region announces only the changed metric,
not the entire strip.

### 1.2 List area ARIA contract

```html
<div role="grid" aria-label="<dashboard_name> records"
     aria-rowcount="<total_count>" aria-colcount="<col_count>">
  <div role="rowgroup">   <!-- header row -->
    <div role="row">
      <div role="columnheader" aria-sort="ascending|descending|none">...</div>
    </div>
  </div>
  <div role="rowgroup" aria-live="polite" aria-atomic="false">
    <!-- data rows; each row receives aria-rowindex -->
    <div role="row" aria-rowindex="<n>" aria-selected="false">
      <div role="gridcell">...</div>
    </div>
  </div>
</div>
```

When a WebSocket `row-updated` patch arrives, the renderer applies the
RFC 6902 JSON Patch to the in-memory row store, then surgically updates
the specific `role="row"` node. The `aria-live="polite"` on the rowgroup
announces the change. Focus is NOT moved unless the user has that row
selected; in that case, focus is retained on the updated row and a
`aria-describedby` notice announces the update.

Bulk-action toolbar: `role="toolbar"`, `aria-label="Bulk actions"`.
Visible only when ≥1 row is checked. Keyboard: `Tab` enters toolbar;
`Escape` clears selection and returns focus to the first selected row's
checkbox.

### 1.3 Freshness SLO tiers (per E5 §2.12)

| Tier | Target freshness_age | Applies to |
|------|----------------------|------------|
| HIGH_VELOCITY | ≤ 5 s | Shopfloor, dispatch, live inspection |
| STANDARD | ≤ 30 s | Quality, CAPA, training, document |
| SLOW | ≤ 300 s | Finance summary, analytics, AI advisory |
| REGULATED_NO_STALE | 0 (fallback to E4) | EBR, MDR, lot release, §204 |

The banner rail reads `freshness.banner_state` from the E5 response.
States:

- `live` — no banner shown
- `stale` — amber banner: "Data is X seconds old — refreshing..."
- `degraded` — red banner: "Live updates paused. Last update: <timestamp>."
- `partial-access` — blue info banner: "Some records are hidden by your
  access level."
- `fixture-mode` — purple dev banner: "Fixture data only — not live."
- `null` — no banner

---

## 2. Live Stream Pattern (E5 §2.4 / §2.5)

DL screens use the same WebSocket/SSE live stream mechanism as Action
Consoles, adapted for dashboard-overlay updates rather than full
console-panel control.

### 2.1 Stream bootstrap sequence

```
1. DL screen mounts → calls GET /api/v1/dashboard/{product_id}
   (E5 §2.3) — synchronous first paint
2. Response includes stream_endpoint (WSS URL) and stream_token
   (short-lived JWT, 15-min TTL)
3. DL screen opens WebSocket: WSS /api/v1/console/{ac_id}/stream
   ?token=<stream_token>
   Sec-WebSocket-Protocol: hesem-console-stream-v1
4. Server sends initial PING; client responds PONG
5. Server streams CloudEvents (see §2.5 envelope)
```

### 2.2 Event handling in the DL renderer

```
Event type                       DL handler
─────────────────────────────── ────────────────────────────────────────
row-updated (RFC 6902 patch)    Apply patch to row store; re-render row
row-added                       Prepend row to list; increment aria-rowcount
row-removed                     Remove row from list; decrement aria-rowcount
stats-updated                   Re-render affected KPI tiles only
action-state-changed            Re-render anomaly sidebar if severity changed
overflow                        Log; display "Live updates delayed" toast
```

### 2.3 Reconnect logic

Exponential backoff: 1 s → 2 s → 4 s → 8 s → 16 s → 30 s (cap). On
reconnect, pass `?last_seq=<n>` so the server replays missed events.
After 3 consecutive failed reconnects, the banner state transitions to
`degraded` and the screen falls back to polling E5 §2.3 every 30 s.

When the browser tab becomes hidden (`visibilitychange` event),
the WebSocket connection is suspended to conserve resources. On tab
focus restore, the screen re-fetches E5 §2.3 synchronously to get a
fresh snapshot, then reopens the WebSocket with a new `stream_token`
obtained from the fresh response.

### 2.4 SSE fallback

If the WebSocket handshake returns HTTP 403 or the environment blocks
WSS, the client falls back to
`GET /api/v1/console/{ac_id}/stream` (SSE endpoint). SSE delivers the
same CloudEvents envelope as text/event-stream. Reconnect uses the
standard `EventSource` retry mechanism plus the `Last-Event-ID` header
for sequence resume.

---

## 3. Print and Audit-Pack Export Pattern

### 3.1 Print view

Every DL screen registers a `@media print` stylesheet that:

- Hides the anomaly sidebar, filter bar, bulk-action toolbar, banner rail
- Expands the list area to full width with a flat table layout
- Renders all KPI tiles in a 2-column row using print-safe CSS variables
- Injects a print header block with: dashboard name, date/time of snapshot,
  tenant name, site filter applied, user name, page numbering
- Removes all interactive controls (checkboxes, row-action dropdowns)

Print is triggered via `Ctrl+P` / `Cmd+P` or the "Print" button in the
dashboard action bar. The action bar button calls `window.print()` after
a synthetic re-render that forces the list area to show all rows (not
paginated) up to a cap of 500 rows. If `total_count > 500`, a notice is
injected: "Print limited to 500 records. Export full dataset as audit pack."

### 3.2 Audit-pack LRO export

The "Export Audit Pack" button in the dashboard action bar triggers a
Long-Running Operation (LRO) via E13:

```
POST /api/v1/lro/audit-pack-export
{
  "source_type": "dashboard",
  "product_id": "<product_id>",
  "period": { "from": "<ISO-8601>", "to": "<ISO-8601>" },
  "site_id": "<uuid|null>",
  "format": "pdf|xlsx|csv",
  "include_evidence": false,
  "include_ai_advisories": true,
  "requester_role": "<role>"
}
```

The response contains an LRO `task_id`. The DL screen subscribes to LRO
progress via WebSocket (E13 stream). On completion, the download URL is
presented in a toast notification. The export PDF includes the same print
header block plus a signed hash footer for audit trail purposes (E6 §3).

---

## 4. Per-Portal Variants

### 4.1 Internal portal (default)

Full dashboard experience: all KPI tiles, all columns, anomaly sidebar,
bulk actions, print, export. Role-based column redaction applied per
`columns[].redacted_for_roles` from E5.

### 4.2 Auditor portal

Scope-filtered read from E5 §2.9 (`GET /api/v1/auditor-portal/workspace/
{workspace_id}`). The auditor portal variant:

- Hides bulk-action toolbar (auditors cannot mutate)
- Hides row inline mutation actions (Edit, Reassign, Close)
- Shows `partial-access` banner indicating audit-token scope
- KPI tiles show only metrics within the audit token's declared scope
  (e.g., a supplier audit token only sees supplier-related KPIs)
- All data served as regulated (no stale; fallback to E4)
- Column "Created By" is replaced with "Responsible Party" (role name,
  not personal name) for GDPR compliance in auditor-visible surfaces
- "Evidence" download links are scoped: auditor can only download
  evidence explicitly included in the audit token's evidence_scope list

### 4.3 Inspector portal

Uses same E5 §2.9 pathway as auditor portal but with `inspector_scope`
flag. Inspector variant:

- List area filtered to records assigned to the inspector's active
  inspection lot or visit scope
- KPI tiles show: pending inspections count, pass rate, NC rate for
  current visit only
- Anomaly sidebar suppressed (inspector portal is operational, not
  analytical)
- Row actions: "Record Result", "Raise NC", "Accept Lot" — mapped to
  E3 workflow transitions

### 4.4 Customer portal — CVLP tiers

CVLP (Customer Value Lifecycle Portal) has three access tiers. Projection
data is served from E5 §2.10 (`GET /api/v1/customer-portal/workspace/
{workspace_id}`). The customer_id is derived from the customer-portal JWT
and is not overridable.

| CVLP Tier | KPI tiles visible | List area columns | Row actions |
|-----------|-------------------|-------------------|-------------|
| CVLP-Basic | Order count, On-time delivery %, Open NC count | SO#, status, ship date, NC count | View SO detail |
| CVLP-Standard | + Inspection pass rate, SCAR count | + Inspection result, PPAP status | + Download CoA, View NC |
| CVLP-Premium | + OEE (customer-facing), Complaint rate, CAPA count | + CAPA status, deviation count | + View CAPA, Download audit summary |

CVLP never shows: supplier cost data, internal cost variances, employee
names, audit trail actors, AI advisory content.

---

## 5. WCAG 2.2 AA Compliance — DL Pattern

### 5.1 Focus management

On initial load: focus is placed on the first interactive element after
the banner rail (usually the search field in the filter bar). The KPI tile
strip is inert to keyboard unless the tile has a "Drill down" link, in
which case the link is a standard focusable `<a>` with descriptive
`aria-label`.

On filter apply: the list area rowgroup is re-rendered. Focus is moved to
the first row in the updated list if no row was previously selected.
If a row was selected and survives the filter, focus is retained on that row.

On row action: opening a row action menu moves focus to the first menu item.
Closing the menu returns focus to the row action trigger button.

On bulk action: activating "Delete selected" opens a confirmation dialog.
After dialog close (confirm or cancel), focus returns to the bulk-action
toolbar trigger.

### 5.2 Color and contrast

All status colors (green/amber/red) are read from Graphics Authority tokens
that declare both foreground and background values satisfying WCAG 4.5:1
contrast ratio. Trend indicator icons include text labels visible to screen
readers and color-independent icons (arrow shapes, not color-only).

### 5.3 Keyboard navigation in grid

- `Tab` / `Shift+Tab`: move between interactive cells (checkboxes, action
  buttons, sortable column headers)
- `Arrow keys`: move between cells within the grid (standard grid pattern
  per ARIA 1.2 §6.3.9)
- `Space`: toggle row checkbox
- `Enter` on a row: navigate to the drill-into target (record shell)
- `Escape`: close any open dropdown; if no dropdown open, deselect all rows

### 5.4 Reduced motion

When `prefers-reduced-motion: reduce` is detected, KPI tile live-update
animations and row-add slide-in transitions are disabled. The DOM update
still occurs; only the CSS transition is suppressed. Animation tokens are
read from Graphics Authority (`motion-duration-short`, `motion-duration-none`)
and the reduced-motion variant is declared in the token catalog with value
`0ms`.

---

## 6. Failure Modes

### 6.1 Stale data

If `freshness.slo_breach = true` in the E5 response, the banner rail
displays: "Data may be outdated — last updated <relative time> ago."
with a "Refresh" button that calls `GET /api/v1/dashboard/{product_id}`
directly (bypassing browser cache via `Cache-Control: no-cache`).

For `REGULATED_NO_STALE` dashboards (EBR, MDR, §204), any stale signal
triggers an immediate fallback to E4 (per E5 §1.2) and the UI displays
a yellow "Live data from authoritative source" banner explaining the
fallback mode.

### 6.2 WebSocket disconnect

On unclean disconnect (close codes 1001–1011 or browser-level TCP drop),
the reconnect sequence (§2.3) begins immediately. The banner transitions
to `degraded` after 3 failed attempts. While degraded, the list area
shows a status bar: "Live updates paused — polling every 30 s." Polling
calls E5 §2.3 with `Cache-Control: no-cache`. When the WebSocket
reconnects, the status bar is dismissed and the `degraded` banner removed.

### 6.3 Empty state

When the E5 workspace projection returns `rows: []` with `total_count: 0`,
the list area renders the appropriate empty state:

- **No records match filter**: "No records match your current filters.
  Clear filters to see all records." with a "Clear filters" button.
- **No records exist**: Contextual message per dashboard (e.g., for CAPA:
  "No open CAPAs — your quality system is on track.") with a CTA to
  create a new record (if user has operator+ role).
- **Access restriction**: "No records visible with your current access
  level." — shown when `banner_state = partial-access`.

Empty state does not hide KPI tiles; tiles remain and show zero values so
the user can confirm the data product is reachable and simply has no rows.

### 6.4 Data product not found

If E5 returns `404 dashboard/product-not-found`, the entire DL screen
shows a full-page error state: "This dashboard is not available. It may
require a feature pack not enabled for your tenant." with a link to the
tenant admin panel. KPI strip and list area are not rendered.

### 6.5 Fixture mode

When `banner_state = fixture-mode` (HMV4 prototype posture,
`HMV4_FIXTURE_MODE=true`), the purple dev banner is shown: "Fixture data
only — this is a development prototype, not live data." The banner is
non-dismissible and visible to all users in fixture mode. All live stream
connections are skipped; the fixture hydration layer (`74-module-template-
v4-fixtures.js`) feeds static JSON into the DL renderer.

---

## 7. Dashboard Specifications — DL-01 through DL-20

---

### DL-01 — Quality Overview Dashboard

```
dashboard_id:     DL-01
product_id:       quality-overview
primary_audience: Quality Manager, Quality Engineer
data_product:     E5 §2.3 GET /api/v1/dashboard/quality-overview
workspace_bind:   E5 §2.1 GET /api/v1/workspace/quality-overview-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     quality-overview-stream
wave:             L3 (basic); L5 (regulated fields)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Open NCs | `kpis[kpi_code=open-nc].value` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 2 | Open CAPAs | `kpis[kpi_code=open-capa].value` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 3 | Overdue CAPAs | `kpis[kpi_code=overdue-capa].value` | Always bad if > 0 | ≥ 1 → amber; ≥ 3 → red |
| 4 | NC Disposition Pending | `kpis[kpi_code=nc-pending-disposition].value` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 5 | First-Pass Quality Rate | `kpis[kpi_code=first-pass-rate].value` (%) | Up = good | < 95% → amber; < 90% → red |

#### List Area

Columns: `NC#`, `Type` (badge: Internal / Customer / Supplier), `Product /
Part`, `Severity` (badge: Critical/Major/Minor), `Site`, `Assigned To`,
`Status`, `Opened Date`, `Due Date`, `Days Open`.

Default sort: `Days Open desc`.

Row actions:
- View Record → drills to NQCASE Authoritative Record Shell (AR-02)
- Reassign (operator+) → opens inline assignee picker
- Change Disposition (operator+) → opens disposition modal
- Export Row → single-record PDF download

Bulk actions: Reassign selected (operator+), Export selected (viewer+),
Print selected (viewer+).

#### Anomaly Sidebar

AI advisory (E9) anomaly signals shown:
- NC clusters: "3 NCs from same supplier in 7 days — possible systemic
  defect. Suggested: open SCAR."
- Overdue CAPA drift: "CAPA-0042 is 14 days past due with no activity.
  Suggest escalation to QM."
- Repeat-failure pattern: "Part P-1023 has had 5 NCs in 30 days — recurring
  issue detected."

Each anomaly has: severity badge (High/Medium/Low), description, suggested
action button (opens relevant record or action).

#### Drill-into Target

Clicking a row navigates to: `NQCASE` AR shell (`/records/nqcase/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| QA Engineer | All tiles + list. Can reassign and update disposition. |
| Compliance Lead | All tiles. List filtered to NCs with regulatory implication flag. Extra column: "Regulatory Ref". Cannot reassign. |
| Read-only viewer | All tiles. List visible. No row actions. Bulk: Export + Print only. |
| Auditor (portal) | Tiles scoped to audit token period. List filtered to audit-token site. "Assigned To" shows role, not name. |

#### Per-Pack Overlays

- J1 Pharma: Extra tile "Batch Rejection Rate" (`pharma/batch-rejection`).
  List gains column "Batch#" and "GMP Classification". NC Types include
  "Deviation" and "OOS" in addition to standard types.
- J4 Medical: Extra tile "MDR Reportable Count" (`md/mdr-reportable`).
  List gains column "MDR Status" (Reportable / Under Review / Not Reportable).
  Anomaly sidebar adds: "2 complaints may meet MDR reporting threshold —
  review within 30 days."

#### CVLP Variant

CVLP-Standard and above: tile "Open NC Count" is visible to the customer
scoped to NCs raised against their products. List shows NCs for that
customer's products only; columns: `NC#`, `Product`, `Severity`, `Status`,
`Resolution Date`. No anomaly sidebar.

---

### DL-02 — Batch Release Dashboard

```
dashboard_id:     DL-02
product_id:       pharma/batch-release
primary_audience: Qualified Person (QP), Batch Record Reviewer
data_product:     E5 §2.3 GET /api/v1/dashboard/pharma/batch-release
workspace_bind:   E5 §2.1 GET /api/v1/workspace/pharma/batch-queue
freshness_tier:   REGULATED_NO_STALE (fallback to E4)
stream_ac_id:     pharma-batch-release-stream
pack_required:    J1 Pharma
wave:             L4 (basic); L5 (regulated)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Batches Awaiting QP Release | `pharma/kpis[batch-pending-qp]` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 2 | Batches In Review | `pharma/kpis[batch-in-review]` | Neutral | N/A |
| 3 | Batch Rejection Rate (MTD) | `pharma/kpis[batch-rejection-rate]` (%) | Down = good | ≥ 2% → amber; ≥ 5% → red |
| 4 | EBR Completion Rate | `pharma/kpis[ebr-completion-rate]` (%) | Up = good | < 90% → amber; < 80% → red |
| 5 | Open Deviations | `pharma/kpis[open-deviations]` | Down = good | ≥ 3 → amber; ≥ 8 → red |
| 6 | Stability Studies Active | `pharma/kpis[stability-active]` | Informational | N/A |

#### List Area

Columns: `Batch#`, `Product Name`, `Batch Size`, `Manufacture Date`,
`EBR Status` (badge: In Progress / Complete / Rejected), `QP Assigned`,
`Deviation Count`, `OOS Count`, `Release Due Date`, `Days to Release`,
`QP Decision` (badge: Pending / Released / Rejected / On Hold).

Default sort: `Release Due Date asc`.

Row actions:
- View EBR → drills to EBR Authoritative Record Shell
- Release Batch (QP role only, requires e-signature via E7) → opens
  e-signature modal with QP release checklist
- Place on Hold (operator+) → opens hold reason modal with reason code
- Open Deviation (operator+) → pre-fills NC creation form with batch_id
- Download Batch Record PDF (viewer+) → triggers audit-pack LRO (E13)

Bulk actions: Export selected (viewer+), Assign QP to selected (QP role),
Print release list (viewer+).

#### Anomaly Sidebar

- "Batch B-20244501 has 3 deviations — threshold for automatic rejection
  review. QP attention required."
- "EBR for Batch B-20244512 has been stale for 48 h with no updates."
- "Stability Study SS-2024-07 is 2 days past sampling date."
- "QP daily release target: 8 batches. Current pace: 4. Risk of backlog."

#### Drill-into Target

Clicking a row navigates to: EBR record shell (`/records/ebr/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| QP | Full view + Release and Hold actions. E-signature required for Release. |
| Batch Record Reviewer | Full list, no Release action. Can add annotations to EBR. |
| QA Manager | Full view. Cannot release. Can view all batches across sites. |
| Read-only | Tiles + list. No actions. |

#### Per-Pack Overlays

This dashboard is only available with J1 Pharma pack active. No additional
pack overlays; J1 is the entire basis.

#### CVLP Variant

Not applicable — batch release is an internal GMP operation.

---

### DL-03 — Production Floor Dashboard

```
dashboard_id:     DL-03
product_id:       production-floor
primary_audience: Production Supervisor, Shift Manager, Plant Manager
data_product:     E5 §2.3 GET /api/v1/dashboard/production-floor
workspace_bind:   E5 §2.1 GET /api/v1/workspace/job-order-list
freshness_tier:   HIGH_VELOCITY (≤ 5 s)
stream_ac_id:     production-floor-stream
wave:             L3 (JO/WO status); L4 (MES live data)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Active Job Orders | `kpis[active-jo]` | Informational | N/A |
| 2 | WO On-Time Completion (shift) | `kpis[wo-ontime-rate]` (%) | Up = good | < 80% → amber; < 60% → red |
| 3 | OEE (shift) | `kpis[oee-shift]` (%) | Up = good | < 65% → amber; < 50% → red |
| 4 | Scrapped Units (shift) | `kpis[scrap-count-shift]` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 5 | WOs Blocked / On Hold | `kpis[wo-blocked]` | Down = good | ≥ 3 → amber; ≥ 7 → red |
| 6 | MES Alarms Active | `kpis[mes-alarms-active]` | Down = good | ≥ 1 → amber; ≥ 5 → red |

#### List Area

Columns: `JO#`, `Product`, `Planned Qty`, `Completed Qty`, `Scrap Qty`,
`Work Center`, `Shift`, `Operator`, `WO Status` (badge: Not Started /
In Progress / Complete / Blocked / Scrapped), `Start Time`, `Due Time`,
`OEE %`, `MES Alarm Count`.

Default sort: `Due Time asc`.

Row actions:
- View JO → drills to JO record shell (`/records/jo/{id}`)
- View WO → drills to WO record shell (`/records/wo/{id}`)
- Raise NC (operator+) → opens NC creation pre-filled with JO/product
- Report Scrap (operator+) → opens scrap entry modal
- Block JO (supervisor+) → opens block-reason modal

Bulk actions: Export selected, Print shift report.

#### Anomaly Sidebar

- "Work center WC-04 OEE has dropped 12% in last 30 min — possible
  equipment issue. Maintenance ticket suggested."
- "JO-20244203 is 45 min behind schedule. Downstream SO at risk."
- "MES alarm ALM-0041 on machine M-12 has been active 22 min with no
  acknowledgment."
- "Scrap rate on Part P-2244 is 8% this shift — 3x normal. Quality
  investigation recommended."

#### Drill-into Target

JO rows → JO record shell. WO rows → WO record shell. Work center click → WO
list filtered to that work center.

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Production Supervisor | Full view. Block, Scrap, Raise NC actions active. |
| Shift Manager | Full view + cross-shift comparison tile. Site-wide OEE trend chart added to KPI strip. |
| Plant Manager | Aggregated tiles across all work centers. No per-WO row actions. Only site-level bulk export. |
| MES Operator | Limited to their assigned work center. OEE, MES Alarm tiles only. List filtered to their JOs. |

#### Per-Pack Overlays

- J2 Auto: Extra tiles "JIT Demand vs Supply" and "Poka-Yoke Failures (shift)".
  List gains column "Customer Release" (yes/no). Anomaly sidebar adds JIT
  demand-signal discrepancy alerts.
- J1 Pharma: List gains column "Batch#" and "GMP Line Status". MES alarms
  include GMP deviation trigger events. OEE tile replaced by EBR Step
  Completion % for pharma lines.

#### CVLP Variant

CVLP-Premium: customer sees a simplified production-status tile showing
"Your orders in production: X units — On Track / At Risk." No granular
JO/WO list or OEE data.

---

### DL-04 — Supplier Performance Dashboard

```
dashboard_id:     DL-04
product_id:       supplier-performance
primary_audience: Supplier Quality Engineer (SQE), Procurement Manager
data_product:     E5 §2.3 GET /api/v1/dashboard/supplier-performance
workspace_bind:   E5 §2.1 GET /api/v1/workspace/supplier-scorecard-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     supplier-performance-stream
wave:             L3 (scorecard list); L4 (SCAR + PPAP overlays)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Suppliers On Approved List | `kpis[approved-suppliers]` | Informational | N/A |
| 2 | Suppliers On Conditional | `kpis[conditional-suppliers]` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 3 | Open SCARs | `kpis[open-scars]` | Down = good | ≥ 3 → amber; ≥ 8 → red |
| 4 | Incoming Inspection Failure Rate (MTD) | `kpis[incoming-failure-rate]` (%) | Down = good | ≥ 5% → amber; ≥ 10% → red |
| 5 | On-Time Delivery Rate | `kpis[otd-rate]` (%) | Up = good | < 90% → amber; < 80% → red |
| 6 | PPAP Submissions Pending | `kpis[ppap-pending]` | Informational | ≥ 5 → amber |

#### List Area

Columns: `Supplier Name`, `Supplier ID`, `Category`, `Approval Status`
(badge: Approved / Conditional / Suspended / Disqualified), `Overall Score`,
`OTD %`, `IQC Pass Rate %`, `Open SCARs`, `Open PPAPs`, `Last Audit Date`,
`Next Audit Due`.

Default sort: `Overall Score asc` (worst performers first).

Row actions:
- View Supplier Record → drills to supplier master record shell
- Open SCAR (SQE+) → opens SCAR creation pre-filled with supplier_id
- Schedule Audit (SQE+) → opens audit scheduling modal
- Change Status (SQE+, requires approval workflow) → opens status change
  modal with reason and escalation routing
- Download Scorecard PDF (viewer+)

Bulk actions: Export scorecard report, Send portal invitation to selected
suppliers (operator+), Print list.

#### Anomaly Sidebar

- "Supplier S-0042 incoming failure rate increased 8% this month —
  recommend immediate SCAR."
- "3 suppliers have PPAP submissions overdue by >30 days. Consider
  escalation to procurement VP."
- "Supplier S-0071 OTD has dropped below 75% for 3 consecutive months.
  Conditional status recommended."
- "SCAR-0019 is 14 days past due root cause submission deadline."

#### Drill-into Target

Clicking a row navigates to: supplier master Authoritative Record Shell
(`/records/supplier/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| SQE | Full view. SCAR, Audit, Status actions active. |
| Procurement Manager | Full view. "Open SCARs" and "PPAP Pending" tiles only shown if count > 0 (cleaner view). Cannot open SCAR directly; can initiate procurement hold. |
| Supplier (portal, if invited) | Sees only their own scorecard. Tiles: their OTD %, their IQC rate, their open SCARs. List: their submitted PPAPs, their open SCARs. No other suppliers visible. |

#### Per-Pack Overlays

- J2 Auto: Extra tiles "PPAP Funnel Stage Distribution" (chart) and
  "Customer-Specific Requirements Compliance %". List gains columns
  "PPAP Level", "Current APQP Gate", "Customer Scorecard Rating".
- J3 Aero: Extra tile "NADCAP Certification Status". List gains column
  "NADCAP Commodity" and "Cert Expiry Date". Anomaly sidebar adds
  approaching NADCAP recertification alerts.

#### CVLP Variant

Not applicable — supplier performance data is internal. Supplier self-portal
is the mechanism for supplier-facing data (see per-role view above).

---

### DL-05 — Inspection Queue Dashboard

```
dashboard_id:     DL-05
product_id:       inspection-queue
primary_audience: QC Inspector, IQC Lead, In-Process QC Supervisor
data_product:     E5 §2.3 GET /api/v1/dashboard/inspection-queue
workspace_bind:   E5 §2.1 GET /api/v1/workspace/inspection-queue-list
freshness_tier:   HIGH_VELOCITY (≤ 5 s)
stream_ac_id:     inspection-queue-stream
wave:             L3 (IQC); L4 (in-process + final)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | IQC Inspections Pending | `kpis[iqc-pending]` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 2 | In-Process Inspections Open | `kpis[ipqc-open]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 3 | IQC Pass Rate (MTD) | `kpis[iqc-pass-rate]` (%) | Up = good | < 90% → amber; < 80% → red |
| 4 | Inspections Overdue (past SLA) | `kpis[inspection-overdue]` | Down = good | ≥ 3 → amber; ≥ 8 → red |
| 5 | Inspector Utilization % | `kpis[inspector-utilization]` (%) | Informational | > 95% → amber |

#### List Area

Columns: `Inspection#`, `Type` (badge: IQC / IPQC / Final / Receiving),
`Part / Product`, `Supplier` (IQC only), `PO#` (IQC only), `JO#` (IPQC),
`Inspector Assigned`, `Inspection Plan`, `Status` (badge: Queued / In
Progress / Pass / Fail / On Hold), `Received Date`, `Due Date`,
`Days in Queue`.

Default sort: `Due Date asc`.

Row actions:
- Start Inspection (inspector+) → opens inspection plan execution screen
- Record Result (inspector+) → opens result entry form
- Raise NC (inspector+) → creates NC linked to inspection
- Reassign (supervisor+)
- View Inspection Record → drills to INSP record shell

Bulk actions: Assign to inspector (supervisor+), Print inspection queue list,
Export selected.

#### Anomaly Sidebar

- "IQC queue for Supplier S-0023 has 12 items — above average by 4x.
  Possible delivery surge."
- "Inspector I-04 has 0 completions in the last 2 h during active shift —
  confirm status."
- "Part P-1055 has 3 consecutive IQC failures this week. SCAR suggested."

#### Drill-into Target

Clicking a row navigates to: INSP record shell (`/records/insp/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| QC Inspector | List filtered to inspections assigned to them. "Start" and "Record Result" active. |
| IQC Lead | Full list across all inspectors. Reassign action active. |
| Inspector (portal) | Scoped to visit scope. See §4.3 inspector portal. |

#### Per-Pack Overlays

- J1 Pharma: List gains column "GMP Inspection Type" (In-Process / Release
  / Stability Sample). Extra tile "Analytical Lab Samples Pending" for
  lab integration. Result entry form gains 21 CFR 11 e-signature requirement.
- J5 Food: List gains column "CCP Check". Anomaly sidebar adds "CCP
  deviation detected — immediate corrective action required" alerts with
  severity Critical.

---

### DL-06 — Inventory & Warehouse Dashboard

```
dashboard_id:     DL-06
product_id:       inventory-warehouse
primary_audience: Inventory Manager, Warehouse Supervisor, Materials Planner
data_product:     E5 §2.3 GET /api/v1/dashboard/inventory-warehouse
workspace_bind:   E5 §2.1 GET /api/v1/workspace/inventory-stock-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     inventory-warehouse-stream
wave:             L3 (stock levels); L4 (shortage + overstock alerts)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | SKUs Below Reorder Point | `kpis[below-reorder]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 2 | SKUs in Critical Shortage | `kpis[critical-shortage]` | Down = good | ≥ 1 → amber; ≥ 3 → red |
| 3 | Overstock Value ($) | `kpis[overstock-value]` | Down = good | ≥ $50k → amber; ≥ $200k → red |
| 4 | Inventory Accuracy % | `kpis[inventory-accuracy]` | Up = good | < 97% → amber; < 95% → red |
| 5 | Lots on Quality Hold | `kpis[lots-on-hold]` | Down = good | ≥ 3 → amber; ≥ 10 → red |
| 6 | Pending Cycle Count Tasks | `kpis[cycle-count-pending]` | Down = good | ≥ 10 → amber |

#### List Area

Columns: `Part#`, `Part Description`, `Warehouse`, `Location`, `Current Stock`,
`UoM`, `Reorder Point`, `Safety Stock`, `Status` (badge: OK / Below Reorder /
Critical / On Hold / Quarantine / Expired), `Lot#`, `Expiry Date` (where
applicable), `Value ($)`.

Default sort: `Status` (Critical first, then Below Reorder, then OK).

Row actions:
- View Lot Record → drills to LOT record shell
- Place on Hold (operator+) → opens lot hold modal
- Release Hold (QA+) → releases lot with reason and optional e-sig
- Initiate Transfer (operator+) → opens warehouse transfer form
- Create PO (planner+) → opens PO creation pre-filled with part and qty

Bulk actions: Export stock report, Place on hold (bulk), Release hold
(bulk, QA+), Print lot labels.

#### Anomaly Sidebar

- "Part P-2033 stock at 8% of safety level. 3 SOs at risk. Recommend
  emergency PO."
- "Lot L-20244089 expires in 5 days with 200 units remaining. Expedite
  consumption or disposition."
- "Inventory accuracy in Zone B-3 dropped to 93% after last cycle count —
  physical recount recommended."

#### Drill-into Target

Clicking a row navigates to: LOT record shell (`/records/lot/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Inventory Manager | Full view. All actions. |
| Warehouse Supervisor | List filtered to their warehouse. Transfer action active. Hold action visible. |
| Materials Planner | Full list. "Create PO" action active. No hold/release action. |
| Read-only | Tiles + list. No actions. |

#### Per-Pack Overlays

- J5 Food: List gains columns "HACCP CCP Status" and "Temperature Log Status".
  Extra tile "Cold Chain Excursions (24h)". Anomaly sidebar adds cold chain
  excursion alerts with immediate escalation flag.
- J1 Pharma: List gains column "Release Status" (Released / Quarantine /
  Rejected). Lot hold/release requires QP role and e-signature.

---

### DL-07 — Maintenance Board Dashboard

```
dashboard_id:     DL-07
product_id:       maintenance-board
primary_audience: Maintenance Supervisor, Reliability Engineer, Plant Manager
data_product:     E5 §2.3 GET /api/v1/dashboard/maintenance-board
workspace_bind:   E5 §2.1 GET /api/v1/workspace/maintenance-wo-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     maintenance-board-stream
wave:             L3 (PM schedule); L4 (asset availability)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | PM Compliance Rate (MTD) | `kpis[pm-compliance]` (%) | Up = good | < 90% → amber; < 80% → red |
| 2 | Open Corrective WOs | `kpis[open-corrective-wo]` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 3 | Overdue PM Tasks | `kpis[overdue-pm]` | Down = good | ≥ 1 → amber; ≥ 5 → red |
| 4 | Asset Availability % | `kpis[asset-availability]` | Up = good | < 90% → amber; < 80% → red |
| 5 | MTTR (hours, MTD) | `kpis[mttr-hours]` | Down = good | ≥ 4 h → amber; ≥ 8 h → red |

#### List Area

Columns: `WO#`, `Asset / Equipment`, `WO Type` (badge: PM / Corrective /
Predictive / Inspection), `Priority` (badge: Critical / High / Normal / Low),
`Assigned Technician`, `Status` (badge: Open / In Progress / Pending Parts /
Complete / Cancelled), `Scheduled Date`, `Due Date`, `Hours Est.`,
`Hours Actual`, `Parts Cost ($)`.

Default sort: `Priority desc, Due Date asc`.

Row actions:
- View MWO → drills to MWO record shell (`/records/mwo/{id}`)
- Assign Technician (supervisor+)
- Start Work (technician+) → transitions WO to In Progress
- Complete Work (technician+) → opens completion form with labor/parts
- Escalate Priority (supervisor+)

Bulk actions: Assign technician (bulk), Export WO report, Print schedule.

#### Anomaly Sidebar

- "Asset M-15 (CNC Mill) has had 3 corrective WOs in 30 days — MTBF
  declining. Predictive maintenance assessment recommended."
- "PM-0032 on Asset M-07 is 5 days overdue. Asset availability risk."
- "Parts shortage: Bearing PN-4422 has 0 stock — 2 WOs awaiting parts."

#### Drill-into Target

Clicking a row navigates to: MWO record shell (`/records/mwo/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Maintenance Supervisor | Full view. Assign, Escalate actions. |
| Technician | List filtered to their assigned WOs. Start/Complete actions. |
| Reliability Engineer | All tiles including MTTR, MTBF trend chart. Read-only on WO list. |
| EHS Officer | List filtered to safety-related WOs. Extra column: "EHS Flag". |

#### Per-Pack Overlays

- J3 Aero: List gains column "Airworthiness Impact" (Yes/No). WOs with
  airworthiness impact require QA sign-off before completion. Extra tile
  "AD/SB Compliance Tasks Pending".
- J1 Pharma: GMP Equipment WOs require QA approval before return to service.
  List gains column "GMP Impact". Extra tile "Equipment Qualification
  Status".

---

### DL-08 — CAPA Effectiveness Dashboard

```
dashboard_id:     DL-08
product_id:       capa-effectiveness
primary_audience: CAPA Owner, Quality Manager, Compliance Lead
data_product:     E5 §2.3 GET /api/v1/dashboard/capa-effectiveness
workspace_bind:   E5 §2.1 GET /api/v1/workspace/capa-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     capa-effectiveness-stream
wave:             L3 (open/closed CAPA list); L5 (effectiveness scoring)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Open CAPAs | `kpis[open-capa]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 2 | Overdue CAPAs | `kpis[overdue-capa]` | Down = good | ≥ 1 → amber; ≥ 3 → red |
| 3 | CAPA Effectiveness Rate (closed CAPAs, MTD) | `kpis[capa-effectiveness-rate]` (%) | Up = good | < 80% → amber; < 65% → red |
| 4 | Avg Days to Close | `kpis[capa-avg-days-close]` | Down = good | ≥ 45 d → amber; ≥ 90 d → red |
| 5 | Recurrence Rate (re-opened CAPAs) | `kpis[capa-recurrence-rate]` (%) | Down = good | ≥ 5% → amber; ≥ 10% → red |

#### List Area

Columns: `CAPA#`, `Title`, `Source` (badge: NC / Audit / Customer Complaint /
Regulatory), `Priority` (badge: Critical / High / Normal), `Owner`,
`Status` (badge: Draft / Open / Root Cause / Action Plan / Verification /
Closed / Re-opened), `Opened Date`, `Due Date`, `Days Open`,
`Effectiveness Score` (shown only for Closed CAPAs; badge: Effective /
Partially Effective / Not Effective / Pending).

Default sort: `Priority desc, Due Date asc`.

Row actions:
- View CAPA → drills to CAPA record shell (`/records/capa/{id}`)
- Update Status (CAPA owner+) → opens status transition modal
- Assign Owner (quality manager+)
- Re-open (quality manager+) → if effectiveness check failed
- Export CAPA Report PDF (viewer+)

Bulk actions: Assign owner (bulk, QM+), Export CAPA register, Print list.

#### Anomaly Sidebar

- "5 CAPAs have been in 'Root Cause' stage for >30 days with no update.
  Possible stall."
- "CAPA-0028 effectiveness verification is due in 3 days — owner has not
  been active."
- "Recurrence rate increased 3% this month vs. prior month — systemic
  quality system weakness signal."
- "Source cluster: 4 of 7 new CAPAs this month originated from same work
  center (WC-04). Common root cause investigation suggested."

#### Drill-into Target

Clicking a row navigates to: CAPA record shell (`/records/capa/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| CAPA Owner | List filtered to CAPAs they own. Update Status action active. |
| Quality Manager | Full list. All actions. Can re-open. |
| Compliance Lead | Full list. Extra column "Regulatory Reference". Read-only. |
| Auditor (portal) | List scoped to audit-token period. Effectiveness Score visible. "Opened Date" and "Owner" shown as role, not name. |

#### Per-Pack Overlays

- J4 Medical: List gains column "Risk Class" and "Post-Market Signal Source"
  (PMS / PMCF / Vigilance). Extra tile "CAPAs Linked to MDR Events".
  Effectiveness Rate tile splits into: Product CAPAs vs Process CAPAs.
- J2 Auto: List gains column "8D Report Status" and "Customer Affected"
  (Yes/No). Anomaly sidebar adds "Customer-facing CAPA with no 8D in 30
  days — SLA breach risk."

---

### DL-09 — Training Matrix Dashboard

```
dashboard_id:     DL-09
product_id:       training-matrix
primary_audience: Training Coordinator, HR Manager, Department Head
data_product:     E5 §2.3 GET /api/v1/dashboard/training-matrix
workspace_bind:   E5 §2.1 GET /api/v1/workspace/training-matrix-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     training-matrix-stream
wave:             L3 (current slice — TRAIN is Slice 3, IN PROGRESS)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Training Completion Rate (company, current period) | `kpis[train-completion-rate]` (%) | Up = good | < 90% → amber; < 80% → red |
| 2 | Certifications Expiring in 30 Days | `kpis[certs-expiring-30d]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 3 | Certifications Expired (active employees) | `kpis[certs-expired]` | Down = good | ≥ 1 → amber; ≥ 5 → red |
| 4 | Training Gap Count | `kpis[training-gaps]` (unfilled mandatory training positions) | Down = good | ≥ 10 → amber; ≥ 30 → red |
| 5 | Overdue Training Tasks | `kpis[training-overdue]` | Down = good | ≥ 5 → amber; ≥ 15 → red |

#### List Area

Columns: `Employee Name`, `Department`, `Role`, `Training Plan`, `Course Title`,
`Required By` (date), `Status` (badge: Not Started / In Progress / Passed /
Failed / Expired / Waived), `Completed Date`, `Cert Expiry Date`,
`Score` (if scored assessment).

Default sort: `Required By asc` (most urgent first), then `Status`.

Row actions:
- View Training Record → drills to employee training record shell
- Assign Training (coordinator+) → opens assignment modal
- Record Completion (coordinator+) → opens completion entry form
- Waive (department head+) → opens waiver form with justification
- Send Reminder (coordinator+) → triggers notification to employee

Bulk actions: Assign training plan (bulk), Export training register, Send
reminders (bulk), Print matrix.

#### Anomaly Sidebar

- "Department Engineering has 12 expired certifications — highest in
  company. Escalation recommended."
- "Employee E-0234 has 3 mandatory courses overdue. Access restriction
  may be triggered per policy."
- "GMP refresher course for Line 3 operators not completed — 8 operators
  affected. Compliance risk."
- "Training completion rate for Safety courses dropped 8% this quarter
  vs. prior. Root cause review suggested."

#### Drill-into Target

Clicking a row navigates to: employee training record shell
(`/records/train/{employee_id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Training Coordinator | Full view. All assign/record/remind actions. |
| HR Manager | Full list across all departments. Can waive. Cannot record completion directly. |
| Department Head | List filtered to their department. Can view gaps. Cannot record. Can approve waivers. |
| Employee (self-service portal) | Only their own training tasks. Status, due dates, course link. No actions. |

#### Per-Pack Overlays

- J1 Pharma: Extra tile "GMP Training Compliance %" scoped to GMP-critical
  roles. List gains column "GMP Role Required". Waiver for GMP training
  requires QP countersignature.
- J3 Aero: Extra tile "ITAR-Controlled Training Compliance %". List gains
  column "ITAR Required" (Yes/No). Expired ITAR training triggers automatic
  access restriction flag.

---

### DL-10 — Document Control Dashboard

```
dashboard_id:     DL-10
product_id:       document-control
primary_audience: Document Controller, Quality Manager, Process Owner
data_product:     E5 §2.3 GET /api/v1/dashboard/document-control
workspace_bind:   E5 §2.1 GET /api/v1/workspace/controlled-document-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     document-control-stream
wave:             L3 (document list); L4 (approval workflow state)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Documents Pending Approval | `kpis[docs-pending-approval]` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 2 | Documents Expiring in 30 Days | `kpis[docs-expiring-30d]` | Down = good | ≥ 3 → amber; ≥ 10 → red |
| 3 | Documents Expired (not renewed) | `kpis[docs-expired]` | Down = good | ≥ 1 → amber; ≥ 3 → red |
| 4 | Open ECOs (doc impact) | `kpis[eco-open-doc-impact]` | Informational | ≥ 5 → amber |
| 5 | Documents Issued This Month | `kpis[docs-issued-mtd]` | Informational | N/A |

#### List Area

Columns: `Doc Code`, `Title`, `Type` (badge: SOP / Work Instruction / Form /
Policy / Specification / Drawing), `Revision`, `Owner`, `Approver`,
`Status` (badge: Draft / In Review / Approved / Obsolete / Expired /
Superseded), `Effective Date`, `Review Due Date`, `Days to Expiry`.

Default sort: `Days to Expiry asc` (expiring soonest first).

Row actions:
- View Document → opens document viewer (DCC renderer)
- Initiate Review (document controller+) → opens review workflow
- Approve (approver role, requires e-signature E7)
- Reject (approver role)
- Obsolete (document controller+, requires reason)
- Download PDF (viewer+)

Bulk actions: Initiate review (bulk), Export document register, Print list.

#### Anomaly Sidebar

- "SOP-102 has been in 'In Review' for 45 days — longest in system.
  Possibly stalled."
- "3 documents expire in the next 7 days with no review initiated."
- "ECO-0041 affects 7 documents — review and update not started."
- "Form F-0023 has 12 expired copies in circulation (based on training
  records referencing old rev)."

#### Drill-into Target

Clicking a row navigates to: CDOC record shell (`/records/cdoc/{id}`)
or the DCC document viewer at `/docs/{doc_code}`.

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Document Controller | Full view. Initiate Review, Obsolete actions. |
| Process Owner | List filtered to documents they own. Can initiate review for their docs. |
| Approver | Tiles show their pending approvals count. List filtered to docs awaiting their approval. E-sign action active. |
| Read-only | Tiles + list. Download PDF only. |

#### Per-Pack Overlays

- J4 Medical: Extra tile "DHF Document Coverage %" and "Design History
  File Completeness". List gains column "DHF / Technical File Ref".
  Expired design control documents trigger MDR compliance risk flag.
- J1 Pharma: Extra tile "Master Batch Record Version Currency %" (MBRs
  linked to current product specifications). List gains column
  "GMP Classification".

---

### DL-11 — Finance Overview Dashboard

```
dashboard_id:     DL-11
product_id:       finance-overview
primary_audience: CFO, Finance Manager, Budget Controller
data_product:     E5 §2.3 GET /api/v1/dashboard/finance-overview
workspace_bind:   E5 §2.1 GET /api/v1/workspace/finance-summary-list
freshness_tier:   SLOW (≤ 300 s)
stream_ac_id:     finance-overview-stream
wave:             L5 (finance data — sensitive, regulated SLO)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | PO Spend (MTD) | `kpis[po-spend-mtd]` ($) | Informational | ≥ budget threshold → amber |
| 2 | Invoice Aging > 60 Days | `kpis[invoice-aging-60d]` ($) | Down = good | ≥ $50k → amber; ≥ $200k → red |
| 3 | Budget Variance (MTD) | `kpis[budget-variance-mtd]` (%) | Down = good (over-spend) | ≥ 5% over → amber; ≥ 10% over → red |
| 4 | Open Invoices Pending Approval | `kpis[invoices-pending]` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 5 | Purchase Requisitions Open | `kpis[pr-open]` | Informational | N/A |

#### List Area

Columns: `PO#`, `Supplier`, `Category`, `PO Value`, `Invoiced Value`,
`Remaining Value`, `PO Status` (badge: Open / Partial / Invoiced / Closed /
Cancelled), `PO Date`, `Expected Receipt`, `Invoice Aging (days)`,
`Budget Code`.

Default sort: `Invoice Aging desc`.

Row actions:
- View PO → drills to PO record shell (`/records/po/{id}`)
- Approve Invoice (finance approver role, requires e-signature)
- Dispute Invoice (finance+)
- Close PO (finance manager+)

Bulk actions: Approve invoices (bulk, with batch e-signature), Export
spend report, Print PO register.

#### Anomaly Sidebar

- "Supplier S-0088 invoice aging at 85 days — risk of supplier relationship
  impact. AP team review recommended."
- "Budget code BC-042 (IT) is 12% over MTD budget. Requires VP approval
  for new POs."
- "3 POs have been open >180 days with no goods receipt — possible ghost PO."

#### Drill-into Target

Clicking a row navigates to: PO record shell (`/records/po/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Finance Manager | Full view. All columns including cost data. All approve/dispute actions. |
| CFO | Aggregated tiles. List shows only POs > threshold ($50k). No detail edits. |
| Budget Controller | List filtered to their budget codes. Budget Variance tile scoped to their codes. |
| Read-only | Tiles (no cost values — these are redacted for non-finance roles). List shows PO status without cost columns. |

#### Per-Pack Overlays

No industry-specific pack overlays for standard Finance Overview. J2 Auto
adds a "Supplier Tier Cost Breakdown" chart by Tier-1 / Tier-2 spend.

#### CVLP Variant

CVLP-Premium: customer sees their PO history, invoice status, and outstanding
balance. No internal budget variance or other suppliers' data.

---

### DL-12 — Sales Order Pipeline Dashboard

```
dashboard_id:     DL-12
product_id:       sales-order-pipeline
primary_audience: Sales Manager, Order Management Coordinator, Customer Service
data_product:     E5 §2.3 GET /api/v1/dashboard/sales-order-pipeline
workspace_bind:   E5 §2.1 GET /api/v1/workspace/sales-order-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     sales-order-pipeline-stream
wave:             L3 (SO list); L4 (ship confirmation / backorder)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Open Sales Orders | `kpis[open-so]` | Informational | N/A |
| 2 | On-Time Shipment Rate (MTD) | `kpis[ots-rate]` (%) | Up = good | < 90% → amber; < 80% → red |
| 3 | Backorder Count | `kpis[backorder-count]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 4 | SOs At Risk (delivery date in jeopardy) | `kpis[so-at-risk]` | Down = good | ≥ 3 → amber; ≥ 8 → red |
| 5 | Pending Ship Confirmations | `kpis[pending-ship-confirm]` | Down = good | ≥ 5 → amber |

#### List Area

Columns: `SO#`, `Customer`, `Product / SKU`, `Ordered Qty`, `Shipped Qty`,
`Backorder Qty`, `Order Date`, `Promised Ship Date`, `Actual Ship Date`,
`Carrier`, `Status` (badge: New / Confirmed / In Pick / Shipped / Invoiced /
Cancelled / Backorder), `Risk Flag` (badge: At Risk / On Track / Late).

Default sort: `Promised Ship Date asc, Risk Flag desc`.

Row actions:
- View SO → drills to SO record shell (`/records/so/{id}`)
- Confirm Shipment (logistics+)
- Flag At Risk (sales rep+) → adds risk flag with reason
- Raise NC on Shipment (quality+) → creates NC linked to SO/shipment
- Contact Customer (sales rep+) → opens customer communication log

Bulk actions: Export SO register, Print pick list, Confirm shipment (bulk,
logistics+).

#### Anomaly Sidebar

- "Customer C-0041 has 3 SOs at risk this week — relationship management
  alert."
- "Backorder on Part P-3044 has cascaded to 5 SOs. Procurement emergency
  suggested."
- "SO-20244512 promised ship date is today with 0 units picked — critical."

#### Drill-into Target

Clicking a row navigates to: SO record shell (`/records/so/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Sales Manager | Full view. All actions. Customer contact action. |
| Order Management | Full list. Confirm Shipment, Flag At Risk active. No customer contact. |
| Customer Service | List filtered to their assigned customers. Contact Customer active. |
| Read-only | Tiles + list (no customer contact details). Export only. |

#### CVLP Variant

CVLP-Basic: customer sees their SO list. Tiles: their open SOs, their on-time
rate. Columns: `SO#`, `Status`, `Promised Ship Date`, `Tracking#`.
No anomaly sidebar, no bulk actions.

CVLP-Standard+: adds `Backorder Qty` column and "Download Shipping Docs" row action.

---

### DL-13 — Traceability Dashboard

```
dashboard_id:     DL-13
product_id:       traceability
primary_audience: Traceability Manager, Quality Manager, Regulatory Affairs
data_product:     E5 §2.3 GET /api/v1/dashboard/traceability
workspace_bind:   E5 §2.1 GET /api/v1/workspace/lot-genealogy-list
freshness_tier:   REGULATED_NO_STALE (fallback to E4)
stream_ac_id:     traceability-stream
wave:             L4 (genealogy); L5 (recall readiness)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Lots with Open Holds | `kpis[lots-open-hold]` | Down = good | ≥ 3 → amber; ≥ 10 → red |
| 2 | Recall Readiness Score | `kpis[recall-readiness-score]` (0–100) | Up = good | < 70 → amber; < 50 → red |
| 3 | Genealogy Coverage % | `kpis[genealogy-coverage]` (%) | Up = good | < 95% → amber; < 90% → red |
| 4 | Lots Released Last 30 Days | `kpis[lots-released-30d]` | Informational | N/A |
| 5 | Mock Recall Drill Score (last drill) | `kpis[mock-recall-score]` (0–100) | Up = good | < 80 → amber |

#### List Area

Columns: `Lot#`, `Part / Product`, `Status` (badge: In Inventory / Released /
On Hold / Recalled / Quarantine / Consumed), `Genealogy Depth` (levels of
parent/child traceability), `Supplier Lot#`, `Production Date`,
`Release Date`, `Expiry Date`, `Customer Distribution Count` (if released),
`Recall Scope` (if recalled: customer count, lot count).

Default sort: `Status` (On Hold and Recalled first), then `Production Date desc`.

Row actions:
- View Lot → drills to LOT record shell (`/records/lot/{id}`)
- View Genealogy Tree → opens full genealogy visualization panel
- Place on Hold (operator+, regulated: requires e-sig)
- Initiate Recall (quality director+, triggers recall workflow LRO)
- Download Traceability Report (viewer+)

Bulk actions: Hold selected lots (QA+), Export traceability report,
Print lot list.

#### Anomaly Sidebar

- "Genealogy gap detected: Lot L-20244231 has incomplete upstream
  component traceability. Coverage 82% — below 95% threshold."
- "Recall readiness score dropped from 87 to 71 after recent lot hold
  event — investigate root cause."
- "Lot L-20244019 on hold for 45 days with no disposition decision.
  Escalation recommended."

#### Drill-into Target

Clicking a row navigates to: LOT record shell (`/records/lot/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Traceability Manager | Full view. Genealogy tree, hold, initiate recall. |
| Quality Manager | Full view. Cannot initiate recall (quality director+ required). |
| Regulatory Affairs | Read-only. Extra column: "Regulatory Notification Status". |

#### Per-Pack Overlays

- J5 Food: Extra tile "FSMA §204 KDE Coverage %". List gains columns
  "KDE Complete" (Yes/No/Partial) and "§204 Reportable" (Yes/No).
  Anomaly sidebar adds "Lot with incomplete KDE detected — §204 compliance
  risk." (See also DL-20.)
- J1 Pharma: Extra tile "DSCSA Compliance %" and "Serialization Coverage".
  List gains "Serialized" (Yes/No) and "EPCIS Event Count" columns.

---

### DL-14 — ECO / Engineering Change Dashboard

```
dashboard_id:     DL-14
product_id:       eco-engineering-change
primary_audience: Engineering Manager, Change Control Board, Quality Engineer
data_product:     E5 §2.3 GET /api/v1/dashboard/eco-engineering-change
workspace_bind:   E5 §2.1 GET /api/v1/workspace/eco-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     eco-engineering-change-stream
wave:             L3 (ECO list); L4 (approval and release workflow)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Open ECOs | `kpis[open-eco]` | Informational | ≥ 15 → amber |
| 2 | ECOs Pending CCB Approval | `kpis[eco-pending-ccb]` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 3 | ECOs Released This Month | `kpis[eco-released-mtd]` | Informational | N/A |
| 4 | Avg Days in Review | `kpis[eco-avg-review-days]` | Down = good | ≥ 15 d → amber; ≥ 30 d → red |
| 5 | ECOs Affecting Active Production | `kpis[eco-affecting-production]` | Down = good | ≥ 3 → amber; ≥ 7 → red |

#### List Area

Columns: `ECO#`, `Title`, `Type` (badge: Design / Process / Document /
Supplier / Safety), `Priority` (badge: Urgent / High / Normal),
`Originator`, `CCB Status` (badge: Draft / Under Review / CCB Approved /
Released / Rejected / On Hold), `Affected Documents`, `Affected BOMs`,
`Affected Part Count`, `Target Release Date`, `Days in Review`.

Default sort: `Priority desc, Target Release Date asc`.

Row actions:
- View ECO → drills to ECO record shell (`/records/eco/{id}`)
- Submit for CCB Review (engineer+)
- CCB Approve (CCB member, requires e-signature)
- CCB Reject (CCB member)
- Release ECO (configuration manager+)
- View Affected Items → opens impact list side panel

Bulk actions: Export ECO register, Submit selected for CCB review,
Print change summary.

#### Anomaly Sidebar

- "ECO-0032 has been in CCB review for 28 days — longest in queue.
  CCB scheduling issue possible."
- "ECO-0041 affects 3 currently active production jobs. Coordinate with
  production before release."
- "Safety ECO-0028 classified Urgent has been open 15 days — escalate
  to Engineering VP."

#### Drill-into Target

Clicking a row navigates to: ECO record shell (`/records/eco/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Engineering Manager | Full view. Submit, view affected items. |
| CCB Member | Tiles show their pending CCB queue count. List filtered to ECOs awaiting their signature. E-sign actions active. |
| Quality Engineer | List filtered to ECOs with quality impact flag. Raise NC from ECO action active. |
| Configuration Manager | Full list. Release ECO action. |

#### Per-Pack Overlays

- J4 Medical: Extra tile "Design Change Notifications (FDA/EMA) Due".
  List gains column "Regulatory Submission Required" (Yes/No/TBD).
  CCB for Class II/III device changes triggers regulatory impact assessment
  workflow.
- J3 Aero: Extra tile "AD/SB Affected ECO Count". ECOs affecting
  airworthiness require DER (Designated Engineering Representative) review.

---

### DL-15 — Regulatory Compliance Dashboard

```
dashboard_id:     DL-15
product_id:       regulatory-compliance
primary_audience: Regulatory Affairs Manager, Compliance Lead, Quality Director
data_product:     E5 §2.3 GET /api/v1/dashboard/regulatory-compliance
workspace_bind:   E5 §2.1 GET /api/v1/workspace/compliance-status-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     regulatory-compliance-stream
wave:             L5 (regulated workspace, no stale)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Audit Readiness Score | `kpis[audit-readiness-score]` (0–100) | Up = good | < 70 → amber; < 50 → red |
| 2 | Open CAPAs by Regulatory Source | `kpis[capa-regulatory-source]` | Down = good | ≥ 3 → amber; ≥ 7 → red |
| 3 | Evidence Freshness % (required evidence submitted on time) | `kpis[evidence-freshness]` (%) | Up = good | < 90% → amber; < 80% → red |
| 4 | Upcoming Regulatory Submissions | `kpis[submissions-due-30d]` | Informational | ≥ 3 → amber |
| 5 | Overdue Regulatory Commitments | `kpis[regulatory-overdue]` | Down = good | ≥ 1 → amber; ≥ 3 → red |

#### List Area

Columns: `Regulation / Standard`, `Edition`, `Requirement Ref`, `Domain`,
`Compliance Status` (badge: Compliant / Partial / Non-Compliant / Not
Applicable / Under Review), `Owner`, `Last Evidence Date`, `Evidence Freshness
Days`, `Associated CAPA #`, `Audit Finding Source`, `Due Date`.

Default sort: `Compliance Status` (Non-Compliant first), then `Due Date asc`.

Row actions:
- View Compliance Item → drills to compliance record
- Link CAPA (compliance manager+)
- Upload Evidence (compliance manager+, via E8 evidence upload)
- Mark Not Applicable (regulatory affairs+, requires justification)

Bulk actions: Export compliance register, Generate audit readiness report
(triggers audit-pack LRO via E13), Print list.

#### Anomaly Sidebar

- "ISO 9001 Clause 9.1.3 (analysis and evaluation) evidence is 45 days
  stale — audit risk."
- "21 CFR 820.100 (CAPA) has 2 open non-conformances from last FDA
  inspection with no linked CAPA."
- "Annual management review evidence is due in 14 days — no submission
  started."

#### Drill-into Target

Clicking a row navigates to: compliance item record or linked CAPA record.

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Regulatory Affairs Manager | Full view. All actions. |
| Compliance Lead | Full view. Read-only. Can upload evidence. |
| Quality Director | Tiles + high-level compliance score. List filtered to critical non-compliances. |
| Auditor (portal) | Scope-filtered by regulation (per audit token). Evidence download for in-scope items only. |

#### Per-Pack Overlays

- J4 Medical: Extra tiles "MDR/IVDR Compliance %" and "EUDAMED Sync Status".
  List gains rows for MDR Article 87, IVDR Article 82 requirements with
  per-requirement status.
- J1 Pharma: Extra tile "GDP/GMP Inspection Readiness %" and "APR Submission
  Status". List gains EU GMP Annex rows.
- J3 Aero: Extra tile "AS9100D Surveillance Audit Readiness". List gains
  ITAR compliance requirement rows.
- J5 Food: Extra tile "FSMA Rule Compliance %" (Preventive Controls,
  §204 Traceability). List gains HACCP plan validation status rows.

---

### DL-16 — AI Advisory Activity Dashboard

```
dashboard_id:     DL-16
product_id:       ai-advisory-activity
primary_audience: Quality Manager, Process Improvement Lead, AI/Data Analyst
data_product:     E5 §2.3 GET /api/v1/dashboard/ai-advisory-activity
workspace_bind:   E5 §2.1 GET /api/v1/workspace/ai-advisory-log-list
freshness_tier:   SLOW (≤ 300 s)
stream_ac_id:     ai-advisory-activity-stream
wave:             L5 (AI advisory — E9 integration)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | AI Advisories Generated (MTD) | `kpis[ai-advisories-mtd]` | Informational | N/A |
| 2 | Override Rate (human overrode AI suggestion) | `kpis[ai-override-rate]` (%) | Informational | ≥ 40% → amber (high disagreement) |
| 3 | Model Drift Alerts Active | `kpis[ai-drift-alerts]` | Down = good | ≥ 1 → amber; ≥ 3 → red |
| 4 | High-Confidence Advisories Accepted | `kpis[ai-high-conf-accepted]` (%) | Up = good | < 60% → amber |
| 5 | Advisories Pending Human Review | `kpis[ai-pending-review]` | Down = good | ≥ 10 → amber; ≥ 25 → red |

#### List Area

Columns: `Advisory ID`, `Domain`, `Root Kind`, `Record ID`, `Advisory Type`
(badge: Anomaly / Recommendation / Prediction / Drift Alert),
`Confidence Score`, `Status` (badge: Pending / Accepted / Overridden /
Dismissed / Escalated), `Generated At`, `Reviewed By`, `Reviewed At`,
`Override Reason` (if overridden).

Default sort: `Generated At desc`.

Row actions:
- View Advisory Detail → opens advisory detail panel with full AI reasoning
- Accept Advisory (operator+) → records acceptance; triggers suggested action
- Override Advisory (operator+) → opens override form with reason selection
- Escalate (quality manager+) → escalates to human expert queue
- View Source Record → drills to the record that triggered the advisory

Bulk actions: Export advisory log, Bulk dismiss low-confidence advisories
(analyst+), Print log.

#### Anomaly Sidebar

For this dashboard, the anomaly sidebar itself surfaces meta-level AI health
signals:
- "Model M-QualNC-v2 has 3 drift alerts in 7 days — retrain may be needed."
- "Override rate for CAPA recommendations is 58% this month — model
  alignment review recommended."
- "Advisory latency p95 increased from 800 ms to 2.1 s this week —
  infrastructure investigation needed."

#### Drill-into Target

Clicking a row navigates to: the source record for the advisory (varies by
root kind).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Quality Manager | Full view. Accept, Override, Escalate active. |
| AI/Data Analyst | Full view. Extra columns: "Model ID", "Feature Importances" (JSON link). Cannot accept/override. |
| Process Improvement Lead | Filtered to Recommendations type. Accept active. |
| Read-only | Tiles + list (confidence scores masked). Export only. |

#### Per-Pack Overlays

No specific pack overlays. E9 advisory signals are domain-agnostic by
design; per-pack regulatory advisories (MDR threshold, batch rejection
prediction) appear as advisory types in the common list.

---

### DL-17 — Integration Health Dashboard

```
dashboard_id:     DL-17
product_id:       integration-health
primary_audience: Integration Engineer, IT Operations, Platform Lead
data_product:     E5 §2.3 GET /api/v1/dashboard/integration-health
workspace_bind:   E5 §2.1 GET /api/v1/workspace/integration-partner-list
freshness_tier:   HIGH_VELOCITY (≤ 5 s)
stream_ac_id:     integration-health-stream
wave:             L4 (circuit state); L5 (LRO queue + EDI errors)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Partner Connections Active | `kpis[partner-active]` | Informational | N/A |
| 2 | Circuit Breakers Open (degraded) | `kpis[circuit-open]` | Down = good | ≥ 1 → amber; ≥ 3 → red |
| 3 | EDI Errors (last 24h) | `kpis[edi-errors-24h]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 4 | LRO Queue Depth | `kpis[lro-queue-depth]` | Down = good | ≥ 10 → amber; ≥ 25 → red |
| 5 | Message Throughput (msg/min) | `kpis[msg-throughput]` | Informational | < 50% of baseline → amber |

#### List Area

Columns: `Partner ID`, `Partner Name`, `Protocol` (badge: EDI-X12 / EDIFACT /
REST / SOAP / FTP / SFTP), `Circuit State` (badge: Closed=OK / Open=Degraded /
Half-Open=Testing), `Last Heartbeat`, `Error Rate (%)`, `Messages (24h)`,
`Last Error`, `LRO Jobs In Flight`.

Default sort: `Circuit State` (Open first), then `Error Rate desc`.

Row actions:
- View Partner Record → integration partner record shell
- Reset Circuit (platform engineer+) → forces circuit to Half-Open for test
- Retry Failed Messages (platform engineer+) → triggers retry LRO
- View Error Log → opens partner-scoped error log
- Disable Partner (platform lead+) → disables integration with reason

Bulk actions: Export integration health report, Retry all failed (PE+),
Print status snapshot.

#### Anomaly Sidebar

- "Partner EDI-CUST-0041 circuit has been Open for 45 min — SLA breach in
  15 min. Escalate to IT operations."
- "LRO queue depth has grown 3x in 20 min — possible consumer slowdown."
- "EDI error spike on partner EDI-SUP-0023: 22 errors in 1 h (normal: 0)."

#### Drill-into Target

Clicking a row navigates to: integration partner record shell.

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Integration Engineer | Full view. All actions. |
| IT Operations | Full view. Reset Circuit, Retry Messages. Cannot disable. |
| Platform Lead | Full view. All actions including Disable. |
| Read-only | Tiles + list. No actions. |

#### Per-Pack Overlays

- J5 Food: Extra tile "FSMA Partner Portal Enrollment Rate" (§204 partner
  onboarding). List gains column "§204 Enrolled" (Yes/No). See also DL-20.
- J4 Medical: Extra tile "EUDAMED Sync Status". List gains column
  "EUDAMED Last Sync" and "EUDAMED Sync Error".

---

### DL-18 — EHS Incidents Dashboard

```
dashboard_id:     DL-18
product_id:       ehs-incidents
primary_audience: EHS Manager, Safety Officer, Plant Manager
data_product:     E5 §2.3 GET /api/v1/dashboard/ehs-incidents
workspace_bind:   E5 §2.1 GET /api/v1/workspace/ehs-incident-list
freshness_tier:   STANDARD (≤ 30 s)
stream_ac_id:     ehs-incidents-stream
wave:             L3 (incident list); L4 (corrective actions)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Days Since Last Lost-Time Incident | `kpis[days-since-lti]` | Up = good | < 1 (new LTI) → red immediately |
| 2 | Open Incidents | `kpis[open-incidents]` | Down = good | ≥ 3 → amber; ≥ 8 → red |
| 3 | Near Misses (MTD) | `kpis[near-misses-mtd]` | Down = good | ≥ 5 → amber |
| 4 | Open Corrective Actions (EHS) | `kpis[ehs-open-ca]` | Down = good | ≥ 5 → amber; ≥ 10 → red |
| 5 | Overdue Safety Inspections | `kpis[safety-insp-overdue]` | Down = good | ≥ 1 → amber |

#### List Area

Columns: `Incident#`, `Type` (badge: Injury / Near Miss / Property Damage /
Environmental / Spill), `Severity` (badge: Critical / Serious / Minor /
Near Miss), `Location`, `Date of Incident`, `Reported By`, `Assigned To`,
`Status` (badge: Open / Under Investigation / CA Pending / Closed / Reported
to Authority), `Days Open`, `Lost Time Days` (injuries only), `Regulatory
Report Required` (Yes/No).

Default sort: `Severity desc, Date of Incident desc`.

Row actions:
- View Incident → drills to EHS incident record shell
- Update Investigation (investigator+) → opens investigation update form
- Add Corrective Action (safety officer+) → opens CA creation form
- Submit Regulatory Report (EHS manager+) → opens regulatory notification form
  (OSHA 300 log entry, or equivalent per jurisdiction)
- Close Incident (EHS manager+)

Bulk actions: Export incident register, Print OSHA 300 log summary,
Generate EHS period report (LRO).

#### Anomaly Sidebar

- "2 incidents in Zone C this month — above zone average by 3x. Hazard
  assessment recommended."
- "Incident INC-0032 has been open 30 days with no corrective action —
  regulatory reporting risk."
- "Near-miss rate in Shipping department increased 40% this month —
  leading indicator alert."

#### Drill-into Target

Clicking a row navigates to: EHS incident record shell (`/records/ehs-inc/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| EHS Manager | Full view. All actions including regulatory report. |
| Safety Officer | Full list. Add CA, update investigation. Cannot submit regulatory report. |
| Plant Manager | Tiles + aggregated list (severity ≥ Serious). No detail actions. |
| Employee (self-service, near-miss report only) | Can submit new near-miss report only. No list access. |

#### Per-Pack Overlays

No specific industry pack overlays. J1 Pharma adds "Process Safety Incident"
as an incident type with additional GMP deviation cross-link.

---

### DL-19 — MDR / IVDR Vigilance Dashboard

```
dashboard_id:     DL-19
product_id:       md/vigilance
primary_audience: Regulatory Affairs (Medical Devices), Vigilance Officer, PRRC
data_product:     E5 §2.3 GET /api/v1/dashboard/md/vigilance
workspace_bind:   E5 §2.1 GET /api/v1/workspace/md/vigilance-list
freshness_tier:   REGULATED_NO_STALE (fallback to E4)
stream_ac_id:     md-vigilance-stream
pack_required:    J4 Medical Devices
wave:             L5 (regulated, per-pack)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | Complaints Rate (per 1,000 units sold, MTD) | `md/kpis[complaint-rate]` | Down = good | ≥ baseline+20% → amber; ≥ baseline+50% → red |
| 2 | MDR Reportable Events (open) | `md/kpis[mdr-reportable-open]` | Down = good | ≥ 1 → amber immediately (regulatory timer starts) |
| 3 | EUDAMED Sync Status | `md/kpis[eudamed-sync-ok]` (Yes/No/Error) | N/A | Error → red immediately |
| 4 | Trend Analysis: Serious Incidents (3-month) | `md/kpis[serious-incident-trend]` | Down = good | Upward trend → amber |
| 5 | PSUR / PMCF Reports Due (90 days) | `md/kpis[psur-due-90d]` | Informational | ≥ 2 → amber |
| 6 | Vigilance Report Submission Compliance % | `md/kpis[vigilance-submission-pct]` | Up = good | < 95% → amber; < 85% → red |

#### List Area

Columns: `Complaint / Incident #`, `Device Name`, `UDI`, `Lot / Serial`,
`Event Date`, `Received Date`, `MDR Classification` (badge: Reportable /
Under Assessment / Not Reportable / Serious / Non-Serious), `Regulatory
Deadline` (days remaining for reportable events — RED if ≤ 3 days),
`EUDAMED Status` (badge: Synced / Pending / Error / N/A), `PRRC Review`,
`CAPA Linked`, `Status` (badge: Open / Under Investigation / Reported /
Closed).

Default sort: `MDR Classification` (Reportable first, then Under Assessment),
then `Regulatory Deadline asc`.

Row actions:
- View Complaint Record → drills to complaint/vigilance record shell
- Classify as Reportable (vigilance officer+, requires e-signature E7)
- Submit to EUDAMED (regulatory affairs+) → triggers EUDAMED submission LRO
- Link CAPA (regulatory affairs+)
- Generate PSUR Draft (PRRC+) → opens PSUR template pre-filled with data
- Close Event (regulatory affairs+, requires PRRC countersignature)

Bulk actions: Export vigilance report, Generate periodic safety update
summary, Print regulatory submission list.

#### Anomaly Sidebar

- "Complaint rate for Device D-0041 exceeded baseline +35% this month —
  Vigilance signal threshold reached. Trend analysis required."
- "MDR reportable event INC-0088 has 2 days until 15-day regulatory
  deadline. Submission not started."
- "EUDAMED sync for Device D-0023 has failed for 72 h — EUDAMED
  registration data may be stale."
- "PMCF data collection for Device D-0011 is 30 days overdue per CER
  schedule."

#### Drill-into Target

Clicking a row navigates to: vigilance / complaint record shell
(`/records/md-vigilance/{id}`).

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Vigilance Officer | Full view. Classify, submit EUDAMED, link CAPA. E-sig required for Reportable classification. |
| PRRC (Person Responsible for Regulatory Compliance) | Full view. PSUR draft, countersignature for closure. Dashboard shows certification banner: "PRRC: [name] — responsible per MDR Art. 15." |
| Regulatory Affairs Manager | Full view. All actions. |
| Read-only | Tiles + list. UDI and patient data columns masked. Export limited to non-patient summary. |
| Auditor (portal) | Scoped to audit token — specific device or date range. All financial and internal actor data masked. |

#### Per-Pack Overlays

This dashboard IS the J4 Medical pack overlay. No further pack layers apply
within J4. J3 Aero has an analogous airworthiness occurrence dashboard that
follows the same pattern but with EASA reporting requirements.

#### CVLP Variant

Not applicable — vigilance data is regulatory-internal. Patient data must
not be exposed to customer portals.

---

### DL-20 — FSMA §204 Traceability Readiness Dashboard

```
dashboard_id:     DL-20
product_id:       food/fsma-204-readiness
primary_audience: Food Safety Manager, Traceability Officer, Regulatory Affairs (Food)
data_product:     E5 §2.3 GET /api/v1/dashboard/food/fsma-204-readiness
workspace_bind:   E5 §2.1 GET /api/v1/workspace/food/fsma-204-lot-list
freshness_tier:   REGULATED_NO_STALE (fallback to E4)
stream_ac_id:     food-fsma-204-stream
pack_required:    J5 Food & Beverage
wave:             L5 (regulated, per-pack)
```

#### KPI Tiles

| # | Metric | E5 field | Trend | Alert threshold |
|---|--------|----------|-------|-----------------|
| 1 | KDE Coverage % (Key Data Elements, §204 required fields) | `food/kpis[kde-coverage]` (%) | Up = good | < 90% → amber; < 80% → red |
| 2 | Trading Partner Enrollment % (§204 partner list) | `food/kpis[partner-enrollment]` (%) | Up = good | < 70% → amber; < 50% → red |
| 3 | Recall Drill Score (last mock recall) | `food/kpis[recall-drill-score]` (0–100) | Up = good | < 75 → amber; < 60 → red |
| 4 | Lots with Incomplete §204 KDE | `food/kpis[lots-kde-incomplete]` | Down = good | ≥ 5 → amber; ≥ 15 → red |
| 5 | FTL Items Coverage % (Foods on FTL list correctly flagged) | `food/kpis[ftl-coverage]` (%) | Up = good | < 100% → amber (no tolerance for FTL gaps) |
| 6 | Last Mock Recall Duration (hours) | `food/kpis[mock-recall-duration-h]` | Down = good | ≥ 4 h → amber; ≥ 8 h → red (§204 target: ≤ 24 h full trace) |

#### List Area

Columns: `Lot#`, `Product Name`, `FTL Item` (Yes/No), `KDE Status`
(badge: Complete / Partial / Missing), `Missing KDE Fields` (comma-separated
list of missing §204 fields), `Partner Traceability Depth` (upstream partner
count with complete KDE chain), `Origination Point (ILP)` (Initial Lot
Packing point — §204 CTE), `Last CTE Update`, `Recall Drill Included`
(Yes/No), `Regulatory Flag` (badge: Compliant / At Risk / Non-Compliant).

Required §204 KDE fields tracked per lot row:
- Traceability Lot Code (TLC)
- Quantity and Unit of Measure
- Product Description
- Location description (ILP address)
- Point of Contact (supplier)
- Date shipped / Date received (CTEs)

Default sort: `KDE Status` (Missing first, Partial next, Complete last),
then `FTL Item` (FTL items first).

Row actions:
- View Lot → drills to LOT record shell with §204 KDE tab
- Complete KDE (traceability officer+) → opens KDE data entry form
  with per-field §204 guidance
- Invite Partner (traceability officer+) → sends partner portal enrollment
  invitation with pre-linked lot context
- Run Mock Recall (food safety manager+) → triggers mock recall LRO for
  this lot, timing the trace upstream and downstream
- Download Traceability Report (viewer+) → §204-formatted lot report PDF

Bulk actions: Complete KDE (bulk entry for selected lots), Invite partners
(bulk), Export §204 compliance report (formatted per FDA guidance), Run
mock recall drill for selected lots.

#### Anomaly Sidebar

- "42 FTL items have incomplete KDE — §204 compliance deadline risk.
  Priority completion required."
- "Trading partner TP-0023 (key upstream supplier) has not enrolled in
  portal — blocks KDE chain for 18 lots."
- "Last mock recall took 6.2 h for upstream trace — above 4 h amber
  threshold. Process improvement needed."
- "ILP address for Lot L-20244411 does not match FDA-registered facility
  address — potential filing discrepancy."
- "New product P-0922 meets FTL criteria but is not flagged as FTL item —
  data correction required."

#### Drill-into Target

Clicking a row navigates to: LOT record shell (`/records/lot/{id}`) with
the §204 KDE tab auto-opened.

#### Per-Role View Differences

| Role | Difference |
|------|------------|
| Traceability Officer | Full view. Complete KDE, Invite Partner, Download actions. |
| Food Safety Manager | Full view. Run Mock Recall action. Can trigger FDA voluntary disclosure workflow. |
| Regulatory Affairs (Food) | Full view. Extra column "FDA Submission Reference". Cannot edit KDE directly. |
| Trading Partner (portal) | Scoped to their lots only. KDE form for their shipments. Enrollment status. No other companies' data. |
| Auditor (portal) | Scoped to audit-token date range and product scope. KDE field detail visible. Cannot trigger recall. |

#### Per-Pack Overlays

This dashboard IS the J5 Food pack overlay. J5 also adds §204-specific
overlays to DL-06 (Inventory) and DL-13 (Traceability) as described in
those sections.

#### CVLP Variant

CVLP for food customers (buyer/retailer portal): shows KDE status for
lots they received. Tiles: KDE coverage for their received lots, any open
holds affecting their products. Row actions: download §204 traceability
report for their received lots only.

---

## 8. Cross-Dashboard Patterns

### 8.1 Dashboard filter bar

Every DL screen includes a standard filter bar with:

- **Search field**: full-text search against the list (calls E5 §2.6
  workspace search, debounced 300 ms)
- **Date range picker**: `date_from` / `date_to` passed to E5 §2.3
  `period` overrides; bound to Graphics Authority token `date-picker-border`
  for border color
- **Site picker**: multi-select; populates from the user's accessible sites
  (read from auth token claims)
- **Status filter**: enum multi-select; options declared in the workspace
  contract schema (columns[].filterable)
- **Save filter**: saves the current filter set to user preferences via
  B2 user preference API (key: `dashboard.<product_id>.saved_filter`)
- **Reset**: clears all filters and re-fetches

### 8.2 Column customization

Users can show/hide columns and reorder them. Customization state is saved
per-user per-dashboard to B2 user preferences. Column options are limited to
the set declared in the E5 workspace contract; no custom columns may be
added without a new workspace contract version.

### 8.3 Row density

Three density modes: Compact (32 px row height), Default (48 px), Comfortable
(64 px). Row height tokens are read from Graphics Authority (`list-row-height-
compact`, `list-row-height-default`, `list-row-height-comfortable`). Selected
density is saved to user preferences.

### 8.4 Linked navigation

"Drill-into target" navigation uses the HMV4 router's `navigateTo(rootKind,
rootId)` method, which resolves the AR shell URL from the HMV4 route registry
(`tests/fixtures/module-template-v4/registries/routes/hmv4-route-registry.json`).
Navigation does not full-page reload; it uses the HMV4 soft-nav pattern to
mount the target AR shell in the shell frame.

### 8.5 Responsive layout

DL screens use a responsive breakpoint strategy driven by Graphics Authority
layout tokens:

| Breakpoint | KPI tile layout | List / sidebar layout |
|------------|-----------------|-----------------------|
| ≥ 1440 px (desktop-xl) | 5–6 tiles per row | Side-by-side (75/25 split) |
| ≥ 1024 px (desktop) | 3–4 tiles per row | Side-by-side (70/30 split) |
| ≥ 768 px (tablet) | 2–3 tiles per row | Stacked (sidebar below list) |
| < 768 px (mobile) | 1–2 tiles per row | Sidebar hidden; anomalies in collapsed drawer |

Breakpoint values are read from Graphics Authority tokens (`breakpoint-xl`,
`breakpoint-desktop`, `breakpoint-tablet`, `breakpoint-mobile`). No hardcoded
pixel breakpoints in JS.

---

`S3-07_F2_DASHBOARD_DEEP_UPGRADE_COMPLETE`

`S3-07_F0_F1_F2_DEEP_UPGRADE_COMPLETE`
