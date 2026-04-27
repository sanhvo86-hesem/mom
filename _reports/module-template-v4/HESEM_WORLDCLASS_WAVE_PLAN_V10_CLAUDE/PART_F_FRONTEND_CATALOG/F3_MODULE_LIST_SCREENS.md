# F3 — Module List Screens (ML Pattern) — V10 Deep Upgrade
## HESEM Manufacturing Operations Management Portal

```
pattern:          ML — Module List
owner_role:       Frontend Architecture Lead (HMV4 Program)
scope:            All 14 module home pages; per-pack overlays (J1–J5);
                  per-portal variants (auditor / inspector / customer);
                  WCAG 2.2 AA; GraphicsAuthority ADR-0009 compliance
version:          V10 deep-upgrade
api_binding:      E5 §2.3 Dashboard Data Product (summary tiles + KPI row);
                  E5 §2.1 Workspace Projection Read (recent activity);
                  E9 AI Advisory (module-level chip); E10 Notification Inbox
                  (alerts); E2 Authority Decision (link enablement per role)
posture:          Pre-production / prototype (ADR-0001); all ML surfaces
                  feature-flagged INERT by default (HMV4_PREVIEW_ENABLED=false)
upgrade_from:     V9-shallow (module catalog inventory without per-module
                  detail contracts)
upgrade_to:       V10 — full per-module detail: KPIs, tiles, quick links,
                  filters, activity feeds, pack banners, alerts, AI chip,
                  backend binding, role differentiation, portal variants
decision_phrase:  S3-08_F3_MODULE_LIST_DEEP_UPGRADE_COMPLETE
```

---

## 1. ML Pattern Anatomy

Module List (ML) screens occupy the layer between the high-level
cross-domain dashboard (F2 DL) and the per-root workspace (F4 WS).
They are read-only entry surfaces. No mutation, no E3 calls.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRE-PRODUCTION BANNER (non-dismissible, ADR-0001)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  MODULE HEADER                                                           │
│  Module Title  ·  Description  ·  Breadcrumb                            │
├──────────────┬──────────────┬──────────────┬────────────────────────────┤
│  KPI TILE 1  │  KPI TILE 2  │  KPI TILE 3  │  KPI TILE 4 (opt.)         │
│  (E5 §2.3)   │  (E5 §2.3)   │  (E5 §2.3)   │                            │
├─────────────────────────────────────────────────────────────────────────┤
│  MODULE-LEVEL FILTER BAR  (site, shift, date range, status, pack scope) │
├───────────────────────────────────┬─────────────────────────────────────┤
│  SUMMARY TILES                    │  QUICK LINKS                        │
│  (links into WS / AR surfaces)    │  (role-partitioned; E2 gated)       │
├───────────────────────────────────┴─────────────────────────────────────┤
│  RECENT ACTIVITY FEED  (last 10 audit events; E5 §2.1; per-module scope)│
├─────────────────────────────────────────────────────────────────────────┤
│  PACK BANNER  (J1–J5 conditional; collapsed when pack not enabled)      │
├─────────────────────────────────────────────────────────────────────────┤
│  ALERTS  (SEV-1/2/3; E10 inbox; sorted by severity then recency)        │
├─────────────────────────────────────────────────────────────────────────┤
│  AI ADVISORY CHIP  (E9 features applicable to module; advisory only)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Cross-cutting element contracts

**KPI row** — each tile resolves via `GraphicsAuthority.tokens.read()`:
- Background: `kpi-tile-bg`
- Status green/amber/red: `status-green`, `status-amber`, `status-red`
- Value font size: `kpi-value-size`
- Label font size: `kpi-label-size`
- Trend arrow up/down: `trend-up`, `trend-down`

**Summary tiles** — tile links are permission-gated via E2. If the
principal lacks the `workspace.view` permission for the target root, the
tile is shown as disabled (dimmed, `aria-disabled="true"`) rather than
hidden, so the user understands the module has those workspaces.

**Recent activity** — binds to `GET /api/v1/{domain}/activity?limit=10`.
Entries contain: event type, record code, actor principal, timestamp,
event summary. Timestamps rendered relative (e.g., "12 min ago") with
absolute in tooltip. Activity entries are not clickable on mobile
(insufficient touch target); on desktop each row links to the AR for that
record.

**Alerts** — binds to `GET /api/v1/notifications?scope={module}&limit=20`.
SEV-1 alerts (critical) are always shown; SEV-2 (warning) and SEV-3
(info) are collapsible. Each alert shows: severity badge, source
workspace, message, age, and an "Acknowledge" link that routes to E10.

**AI advisory chip** — advisory-only (per ADR per L1 §10). The chip
shows the count of active E9 recommendations for this module. Expanding
the chip shows a summary list; clicking an item navigates to the E9 AI
Advisory Board (WS-29). The chip is hidden when the AI kill-switch is ON.

**Graphics Authority (ADR-0009)** — every visual literal in the ML
renderer must resolve through `window.GraphicsAuthority.tokens.read()`.
No hex literals, no bare `px` values, no hardcoded font-family strings.

---

## 2. Per-Module Specifications

---

### M-01: Quality Management

```
module_id:    M-01
domain_slug:  quality_improvement
route_class:  ML
```

#### 2.1.1 Header zone

- **Title:** Quality Management
- **Description:** Unified quality hub for nonconformances, corrective
  actions, inspection, document control, and engineering changes.
- **Breadcrumb:** Portal Home / Quality Management
- **KPI summary row (4 tiles):**
  - Open NCs (non-conformances): count of NQCASE records in `open`
    state; trend vs. 30-day avg; red if > threshold (E5 §2.3 `kpi_key:
    nc_open_count`)
  - Overdue CAPAs: count of CAPA records past target close date; amber
    at ≥1, red at ≥3 (`kpi_key: capa_overdue_count`)
  - Inspections Today: count of INSP records scheduled for current
    calendar day (`kpi_key: insp_today_count`)
  - Docs Pending Approval: count of CDOC records in `pending_approval`
    state (`kpi_key: cdoc_pending_count`)

#### 2.1.2 Summary tiles

| Tile Label              | Target Pattern | Route Class | WS/AR root |
|-------------------------|----------------|-------------|------------|
| Nonconformance Cases    | WS             | WS          | NQCASE     |
| Corrective Actions      | WS             | WS          | CAPA       |
| Inspection Queue        | WS             | WS          | INSP       |
| Controlled Documents    | WS             | WS          | CDOC       |
| Engineering Changes     | WS             | WS          | ECO        |
| Batch Release Queue     | WS             | WS          | BREL       |

Each tile shows: record count, status breakdown (open / in-progress /
closed) as a mini horizontal bar (colors via GraphicsAuthority tokens
`status-open`, `status-progress`, `status-closed`), and a last-refreshed
timestamp.

#### 2.1.3 Quick links (role-gated)

- Create Nonconformance (Operator, Supervisor, QA Analyst, Admin)
- Launch Inspection (Supervisor, QA Analyst, Admin)
- Approve Document (Document Controller, QA Analyst role with
  `cdoc.approve` permission)
- Initiate CAPA (QA Analyst, Admin)
- View BREL Queue (QP, Admin) — J1 only
- Open Audit Schedule (Compliance Lead, Admin)

#### 2.1.4 Module-level filters

- Site / Plant (multi-select; bound to tenant site registry)
- Department / Cost Centre (multi-select)
- Date range (preset: today / this week / this month / custom)
- Status (multi-select: open / in-review / pending-approval / closed)
- Priority (Low / Medium / High / Critical)
- Assigned to me (toggle; principal-scoped)

#### 2.1.5 Recent activity feed

Last 10 events across NCs, CAPAs, INSPs, CDOCs, ECOs for the current
principal's site scope:

- NC-{code} opened by {actor} at {timestamp}
- CAPA-{code} assigned to {actor} — target date {date}
- INSP-{code} completed — result: {pass/fail/conditional}
- CDOC-{code} approved by {actor} — effective {date}
- ECO-{code} promoted to `approved` state by {actor}
- NC-{code} disposition changed to `rejected` by {actor}

#### 2.1.6 Pack banner

- **J1 (Pharma):** "QP Sign-Off Queue: {N} batches awaiting QP release"
  with a direct link to BREL workspace. Color: GraphicsAuthority token
  `pack-pharma-banner-bg`. Includes count of APR sections due this
  month.
- **J2 (Auto):** "PPAP Submissions: {N} parts with open PPAP packages"
  — link to WS-20 PPAP Status Board.
- **J3 (Aero):** "AS9100 NCR: {N} supplier NCRs open" + GIDEP alert
  count.
- **J4 (MD):** "MDR Vigilance: {N} complaints classified; {N} MDRs due"
  — link to WS-26.
- **J5 (Food):** "HACCP CCP deviations: {N} unresolved" — link to
  WS-27.

#### 2.1.7 Alerts

| Severity | Source         | Message pattern                                           |
|----------|----------------|-----------------------------------------------------------|
| SEV-1    | NQCASE         | NC-{code} has no disposition after {N} days (threshold)  |
| SEV-1    | CAPA           | CAPA-{code} past target close date — {N} days overdue     |
| SEV-2    | CDOC           | Document {code} review cycle due in {N} days              |
| SEV-2    | INSP           | {N} inspections not started — shift ends in {H} hours     |
| SEV-3    | ECO            | ECO-{code} awaiting CCB approval for {N} days             |
| SEV-3    | BREL (J1)      | Batch {lot} approaching release window expiry             |

#### 2.1.8 AI advisory chip (E9)

- **AI-01** Risk-based NC prioritization: "NC-{code} shows pattern
  consistent with supplier escape — recommend escalation to CAPA."
- **AI-05** Document expiry prediction: "CDOC-{code} historically
  takes 14 days to reapprove — start now to avoid lapse."
- **AI-12** Inspection sampling optimization: statistical suggestion
  for AQL tightening/lightening per lot history.

#### 2.1.9 Backend binding

| Layer      | Binding                                                     |
|------------|-------------------------------------------------------------|
| E5 §2.3    | `GET /api/v1/quality_improvement/ml/kpi` — 4 KPI tiles      |
| E5 §2.1    | `GET /api/v1/quality_improvement/activity?limit=10`          |
| E2         | `GET /api/v1/auth/permissions?scope=quality_improvement`    |
| E9         | `GET /api/v1/ai/advisories?module=quality_improvement`      |
| E10        | `GET /api/v1/notifications?scope=quality_improvement`       |

#### 2.1.10 Per-role view differences

| Role            | KPIs | Tiles | Quick Links   | Activity | Alerts       |
|-----------------|------|-------|---------------|----------|--------------|
| Operator        | Own dept | Subset | Create NC only | Own records | SEV-1 only |
| Supervisor      | Dept-wide | All | Create + Assign | Dept scope | SEV-1 + SEV-2 |
| QA Analyst      | Site | All | Full quality set | Site scope | All |
| Compliance Lead | Site | All | Audit + CAPA | Full history | All |
| QP (J1)         | BREL-focused | BREL tile prominent | QP sign-off | BREL events | BREL SEV-1 |
| Admin           | Global | All | All | All | All |

#### 2.1.11 Per-portal variant

- **Auditor portal:** KPI row visible (read); summary tiles read-only
  (no tile click launches mutation); quick links hidden; recent activity
  scoped to audit session records; alerts hidden; AI chip hidden.
- **Inspector portal:** KPI row visible; tiles link to read-only WS;
  quick links hidden; alerts hidden.
- **Customer portal:** Module not visible.

---

### M-02: Batch Release

```
module_id:    M-02
domain_slug:  quality_improvement
route_class:  ML
pack_primary: J1 (Pharma) — this module is J1-primary; visible to
              non-J1 tenants only if BREL feature flag enabled
```

#### 2.2.1 Header zone

- **Title:** Batch Release
- **Description:** Electronic Batch Record review, QP sign-off queue,
  and batch disposition workflow for GMP-regulated manufacturing.
- **Breadcrumb:** Portal Home / Batch Release
- **KPI summary row (5 tiles):**
  - Batches Awaiting QP Sign-Off: count in `pending_qp` state
    (`kpi_key: brel_pending_qp`)
  - Batches In Review: count in `under_review` (`kpi_key: brel_in_review`)
  - Batches Released This Month: count in `released` for current month
    (`kpi_key: brel_released_month`)
  - Rejection Rate (30d): pct of dispositioned batches rejected
    (`kpi_key: brel_rejection_rate_30d`)
  - OOS/OOT Events Open: count of out-of-spec / out-of-trend events
    linked to open batches (`kpi_key: brel_oos_open`)

#### 2.2.2 Summary tiles

| Tile Label              | Target    | Root  |
|-------------------------|-----------|-------|
| QP Sign-Off Queue       | WS        | BREL  |
| eBR Review Queue        | WS        | BREL  |
| Batch Disposition Board | WS        | BREL  |
| Stability Schedules     | WS        | (J1 ext: STAB) |
| APR Sections Due        | WS        | (J1 ext: APR)  |

#### 2.2.3 Quick links

- Open QP Queue (QP role, Admin)
- Create eBR Review (Production Pharmacist, QP)
- Record Batch Disposition (QP, Admin)
- View Stability Schedule (QA Analyst, QP)
- Generate APR Section Draft (QA Manager, QP) — AI-assisted draft if
  E9 AI-15 is enabled

#### 2.2.4 Module-level filters

- Product / Material Code
- Batch / Lot Number (free text)
- Manufacturing Site
- Disposition Status (pending / released / rejected / quarantine)
- QP Assigned To
- Release Window (overdue / due-today / due-this-week)

#### 2.2.5 Recent activity feed

- BREL-{code} moved to `pending_qp` by {actor}
- QP {principal} signed BREL-{code} — decision: Released
- OOS event attached to batch {lot} — NC-{nc_code} raised
- eBR section {section} flagged for clarification by {actor}
- BREL-{code} rejected — disposition: Destroy; NC raised
- Stability sample {sample_id} out-of-trend — QP notified

#### 2.2.6 Pack banner

- **J1:** "EU GMP Annex 11 compliance mode ACTIVE — electronic records
  and signatures enabled." Color: `pack-pharma-banner-bg`. QP
  count: "{N} QPs authorized for current site."
  FDA 21 CFR Part 11 mode indicator if US site configured.
- **J4:** No BREL-specific banner (J4 uses EDHR not eBR).
- **Other packs:** "Batch Release module requires Pharma pack (J1).
  Contact your administrator to activate."

#### 2.2.7 Alerts

| Severity | Source   | Message                                                   |
|----------|----------|-----------------------------------------------------------|
| SEV-1    | BREL     | Batch {lot} release window expires in {H} hours — QP action required |
| SEV-1    | BREL     | OOS result for batch {lot} — mandatory NC required         |
| SEV-2    | BREL     | {N} batches in QP queue unactioned for > {N} days         |
| SEV-2    | STAB (J1)| Stability timepoint {id} result overdue                   |
| SEV-3    | APR (J1) | APR for product {code} due in {N} days                    |

#### 2.2.8 AI advisory chip

- **AI-15** APR content pre-population: "Draft APR section 3.2 for
  {product} is ready — review and approve before QP sign-off."
- **AI-08** OOS root cause suggestion: "Batch {lot} OOS pattern
  consistent with environmental excursion — recommend review of
  room {id} monitoring data."

#### 2.2.9 Backend binding

| Layer      | Binding                                                      |
|------------|--------------------------------------------------------------|
| E5 §2.3    | `GET /api/v1/quality_improvement/brel/ml/kpi`               |
| E5 §2.1    | `GET /api/v1/quality_improvement/brel/activity?limit=10`    |
| E2         | QP role gating for sign-off actions                         |
| E9         | `GET /api/v1/ai/advisories?module=batch_release`            |
| J1 pack    | `tenant.packs.j1.enabled` guard at render time              |

#### 2.2.10 Per-role view differences

| Role                | Notes                                                       |
|---------------------|-------------------------------------------------------------|
| Production Operator | Read-only: eBR queue status only; no QP tiles               |
| Production Pharmacist | Create eBR review; see OOS events                         |
| QP                  | Full module; sign-off queue prominent; AI APR chip          |
| QA Analyst          | Read-only analytical view; stability trend                  |
| Admin               | Full module + configuration quick-link                      |

#### 2.2.11 Per-portal variant

- **Auditor portal:** KPI row + eBR review queue (read-only); no sign-off
  triggers; audit trail of all QP decisions visible.
- **Inspector portal (FDA):** eBR records and QP decision records
  visible in read-only AR; batch disposition history accessible.
- **Customer portal:** Not visible.

---

### M-03: Production Operations

```
module_id:    M-03
domain_slug:  planning_production
route_class:  ML
```

#### 2.3.1 Header zone

- **Title:** Production Operations
- **Description:** Job orders, work orders, dispatch board, MES
  execution, and real-time floor monitoring.
- **Breadcrumb:** Portal Home / Production Operations
- **KPI summary row (4 tiles):**
  - Jobs In Progress: count of JO records in `in_progress`
    (`kpi_key: jo_in_progress`)
  - Schedule Adherence (today): pct of WOs completed on time vs.
    planned (`kpi_key: schedule_adherence_today`)
  - OEE (current shift): Overall Equipment Effectiveness pct for the
    current shift across configured machines (`kpi_key: oee_current_shift`)
  - Dispatch Board Exceptions: count of JOs flagged as blocked, starved,
    or at-risk (`kpi_key: dispatch_exceptions`)

#### 2.3.2 Summary tiles

| Tile Label            | Target    | Root  |
|-----------------------|-----------|-------|
| Dispatch Board        | WS        | DISP  |
| Job Order List        | WS        | JO    |
| Work Order List       | WS        | WO    |
| Operation Execution   | WS        | (MES) |
| OEE Dashboard         | DL (analytics) | (OEE) |
| SPC Chart Workspace   | WS        | (SPC) |

#### 2.3.3 Quick links

- Open Dispatch Board (Dispatcher, Supervisor, Admin)
- Create Job Order (Planner, Supervisor, Admin)
- Issue Material to WO (Warehouse, Supervisor, Admin)
- Record Production Count (Operator — glove-mode portal)
- Start Operation (Operator — glove-mode portal)
- View OEE Summary (Supervisor, Manager, Admin)

#### 2.3.4 Module-level filters

- Work Cell / Machine (multi-select)
- Production Line
- Shift (current / previous / next)
- Product Family
- Priority (hot job toggle)
- Date / Schedule Week

#### 2.3.5 Recent activity feed

- JO-{code} released to shop floor by {planner}
- WO-{code} started — operator: {actor}; machine: {id}
- WO-{code} completed — actual qty: {N}; scrap: {N}; cycle time: {T}
- JO-{code} blocked — reason: {material_shortage | equipment_down}
- NC raised for WO-{code} — {nc_code}
- Machine {id} downtime logged — reason: {category}; duration: {T}

#### 2.3.6 Pack banner

- **J1 (Pharma):** "eBR mode: all WOs require eBR completion before
  closure." Per-batch genealogy link.
- **J2 (Auto):** "LPA (Layered Process Audit) due: {N} audits scheduled
  this shift." Per-OEM traceability requirements note.
- **J3 (Aero):** "FAI Required: {N} part numbers have open FAI
  requirements." First-off verification reminder.
- **J4 (MD):** "DHR entries required for all WOs in lot {lot}." Unique
  Device Identification (UDI) assignment link.
- **J5 (Food):** "HACCP CCP monitoring: {N} checkpoints due this shift."
  Environmental monitoring link.

#### 2.3.7 Alerts

| Severity | Source | Message                                                        |
|----------|--------|----------------------------------------------------------------|
| SEV-1    | DISP   | JO-{code} machine blocked — {N} units at risk of late delivery |
| SEV-1    | WO     | WO-{code} scrap rate > threshold ({pct}%)                     |
| SEV-2    | JO     | {N} jobs behind schedule by > {N} hours                       |
| SEV-2    | MES    | Machine {id} OEE < {threshold}% for {N} consecutive shifts    |
| SEV-3    | DISP   | Dispatch board last refreshed {N} min ago — freshness breach   |

#### 2.3.8 AI advisory chip

- **AI-03** Schedule risk prediction: "JO-{code} is predicted to miss
  due date based on current cycle time — consider expediting."
- **AI-07** Scrap pattern detection: "Elevated scrap on machine {id}
  — pattern consistent with tooling wear; PM recommended."

#### 2.3.9 Backend binding

| Layer      | Binding                                                      |
|------------|--------------------------------------------------------------|
| E5 §2.3    | `GET /api/v1/planning_production/ml/kpi`                    |
| E5 §2.1    | `GET /api/v1/planning_production/activity?limit=10`         |
| E5 §2.5    | WebSocket `wss:///{tenant}/dispatch-events` for live DISP   |
| E9         | `GET /api/v1/ai/advisories?module=production_operations`    |

#### 2.3.10 Per-role view differences

| Role       | Notes                                                            |
|------------|------------------------------------------------------------------|
| Operator   | Own WO queue only; no JO-level view; no OEE tile                 |
| Dispatcher | Full dispatch board; all exceptions                              |
| Supervisor | Full module; team scope; can create JO/WO                        |
| Planner    | JO-centric; schedule adherence tile prominent                    |
| Admin      | Full module + configuration                                      |

#### 2.3.11 Per-portal variant

- **Auditor:** Production records read-only; audit trail of completions
  accessible; no dispatch board.
- **Inspector:** WO and genealogy records accessible.
- **Customer portal:** Not visible.
- **Glove-mode portal:** Simplified — Dispatch Board tile + active WO
  tile only; large touch targets; no KPI row.

---

### M-04: Procurement & Supplier Quality

```
module_id:    M-04
domain_slug:  procurement_supplier_quality
route_class:  ML
```

#### 2.4.1 Header zone

- **Title:** Procurement & Supplier Quality
- **Description:** Purchase orders, receiving, incoming quality
  control, supplier corrective actions, and PPAP / FSVP management.
- **Breadcrumb:** Portal Home / Procurement & Supplier Quality
- **KPI summary row (4 tiles):**
  - Open POs: count of PO records in `open` or `partially-received`
    (`kpi_key: po_open_count`)
  - IQC Pass Rate (30d): pct of incoming inspections passed first-time
    (`kpi_key: iqc_pass_rate_30d`)
  - Open SCARs: count of Supplier Corrective Action Requests open
    (`kpi_key: scar_open_count`)
  - Supplier On-Time Delivery (90d): pct of POs received within agreed
    lead time (`kpi_key: supplier_otd_90d`)

#### 2.4.2 Summary tiles

| Tile Label           | Target    | Root  |
|----------------------|-----------|-------|
| Purchase Orders      | WS        | PO    |
| Supplier / Vendor    | WS        | PREC  |
| Incoming Quality     | WS        | INSP  |
| SCAR Queue           | WS        | (SCAR) |
| Receiving            | WS        | (RCV) |
| PPAP Status Board    | WS        | (J2: WS-20) |
| FSVP Tracker         | WS        | (J5: FSVP)  |

#### 2.4.3 Quick links

- Create Purchase Order (Buyer, Admin)
- Record Receiving (Warehouse, Supervisor)
- Launch IQC Inspection (QA Analyst, Inspector role)
- Create SCAR (Supplier Quality Engineer, QA Analyst)
- Add Approved Supplier (Procurement Manager, Admin)
- Open PPAP Package (Supplier Quality Engineer) — J2 only

#### 2.4.4 Module-level filters

- Supplier (searchable select)
- Material / Part Number
- PO Status (draft / open / partial / closed / cancelled)
- IQC Result (pending / pass / fail / conditional)
- Commodity Code
- Date range (PO date / receipt date)

#### 2.4.5 Recent activity feed

- PO-{code} issued to supplier {name}
- Receipt {rcv_code} recorded against PO-{code} — qty {N}
- IQC-{code} passed for lot {lot} — inspector: {actor}
- SCAR-{code} opened for supplier {name} — root: {nc_code}
- Supplier {name} status changed to `conditionally-approved`
- PPAP package {code} accepted by {actor} — J2

#### 2.4.6 Pack banner

- **J1:** "FSVP compliance: {N} foreign suppliers require annual FSVP
  verification." FSVP Supplier link.
- **J2:** "PPAP Portal: {N} parts with open PPAP submissions awaiting
  OEM acceptance." WS-20 link.
- **J3:** "NADCAP supplier qualification: {N} process specialties due
  for renewal." Counterfeit alert (GIDEP) count.
- **J4:** "Critical Supplier Monitoring: {N} J4-critical suppliers have
  open audits." 21 CFR 820.50 note.
- **J5:** "FSMA §204 Lot Coverage: {N} supplier lots missing KDE data."
  WS-23 link.

#### 2.4.7 Alerts

| Severity | Source  | Message                                                    |
|----------|---------|------------------------------------------------------------|
| SEV-1    | SCAR    | SCAR-{code} past CAR response due date — {N} days overdue  |
| SEV-1    | IQC     | Incoming lot {lot} from {supplier} FAILED — quarantined    |
| SEV-2    | PO      | {N} POs past expected delivery date with no receipt        |
| SEV-2    | PREC    | Supplier {name} audit overdue by {N} days                  |
| SEV-3    | PPAP(J2)| PPAP package {code} — OEM feedback received               |

#### 2.4.8 AI advisory chip

- **AI-09** Supplier risk scoring: "Supplier {name} shows elevated
  defect rate — recommend escalation to conditional approval."
- **AI-11** PO lead time anomaly: "PO-{code} lead time {N}% above
  historical average for this supplier."

#### 2.4.9 Backend binding

| Layer   | Binding                                                           |
|---------|-------------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/procurement_supplier_quality/ml/kpi`                |
| E5 §2.1 | `GET /api/v1/procurement_supplier_quality/activity?limit=10`     |
| E9      | `GET /api/v1/ai/advisories?module=procurement_supplier_quality`  |

#### 2.4.10 Per-role view differences

| Role                    | Notes                                               |
|-------------------------|-----------------------------------------------------|
| Buyer                   | PO-centric; no SCAR creation; no IQC               |
| Supplier Quality Eng.   | SCAR + IQC + PPAP; full supplier view               |
| Procurement Manager     | Full module; supplier approval authority            |
| QA Analyst              | IQC + SCAR; read-only PO                           |
| Admin                   | Full module                                         |

#### 2.4.11 Per-portal variant

- **Auditor:** PO + IQC + SCAR records read-only; supplier qualification
  history accessible.
- **Inspector:** Receiving and IQC records accessible in scoped AR.
- **Customer portal:** Not visible.

---

### M-05: Inventory & Warehousing

```
module_id:    M-05
domain_slug:  inventory_logistics
route_class:  ML
```

#### 2.5.1 Header zone

- **Title:** Inventory & Warehousing
- **Description:** Lot and batch traceability, stock positions, warehouse
  task management, cycle counts, and regulated lot coverage.
- **Breadcrumb:** Portal Home / Inventory & Warehousing
- **KPI summary row (4 tiles):**
  - Total SKUs On Hand: distinct item codes with positive stock
    (`kpi_key: sku_on_hand_count`)
  - Quarantine Qty (units): total units in quarantine status
    (`kpi_key: quarantine_units`)
  - Cycle Count Accuracy (rolling 90d): pct of cycle count lines
    matching system quantity (`kpi_key: cycle_count_accuracy_90d`)
  - Expiry Risk (30d): count of lots expiring within 30 days
    (`kpi_key: lots_expiring_30d`)

#### 2.5.2 Summary tiles

| Tile Label          | Target    | Root  |
|---------------------|-----------|-------|
| Lot / Batch List    | WS        | LOT   |
| Inventory Stock     | WS        | (INV) |
| Warehouse Tasks     | WS        | (WHT) |
| Quarantine Board    | WS        | (QRN) |
| Cycle Count Queue   | WS        | (CCT) |
| DSCSA Tracker       | WS        | (J1: WS-19) |
| FSMA §204 Coverage  | WS        | (J5: WS-23) |

#### 2.5.3 Quick links

- Transfer Stock (Warehouse, Supervisor)
- Record Adjustment (Warehouse Manager, Admin)
- Start Cycle Count (Warehouse, Supervisor)
- Quarantine Lot (QA Analyst, Warehouse Manager)
- View Lot Genealogy (Traceability Lead, QA Analyst)
- Run Lot Recall Simulation (Traceability Lead, Admin)

#### 2.5.4 Module-level filters

- Warehouse / Location (multi-select)
- Item Code / Description (free text search)
- Lot Status (available / quarantine / consumed / expired)
- Expiry Date range
- Supplier Lot Number

#### 2.5.5 Recent activity feed

- Lot {lot_no} received — qty {N} at {location}
- Stock transfer {xfer_code} — {N} units from {from} to {to}
- Lot {lot_no} quarantined — reason: NC-{nc_code}
- Cycle count {cct_code} completed — variance: {±N} units for {item}
- Lot {lot_no} consumed in WO-{wo_code}
- Lot {lot_no} expiry alert — expires in {N} days; qty: {N}

#### 2.5.6 Pack banner

- **J1:** "DSCSA serial traceability: {N} lot transfers have unresolved
  DSCSA verification failures." Link to WS-19.
- **J2:** "Kanban replenishment: {N} bins below reorder trigger." OEM
  consignment inventory sync status.
- **J3:** "ITAR inventory: {N} line items require ITAR commodity control
  verification before shipment."
- **J4:** "UDI/DI tracking: {N} lots require GUDID/EUDAMED registration."
  Link to WS-22.
- **J5:** "FSMA §204 KDE Coverage: {pct}% of food lots have complete
  CTE/KDE data." Link to WS-23.

#### 2.5.7 Alerts

| Severity | Source | Message                                                         |
|----------|--------|-----------------------------------------------------------------|
| SEV-1    | LOT    | Lot {lot} quarantined — related WOs must stop production        |
| SEV-1    | LOT    | Lot {lot} expiry in {H} hours — {N} units unconsumed            |
| SEV-2    | CCT    | Cycle count {cct} shows > {pct}% variance — investigate         |
| SEV-2    | INV    | Stock-out risk: item {item} has {N} days cover remaining        |
| SEV-3    | DSCSA(J1) | DSCSA verification pending for {N} serialized units           |

#### 2.5.8 AI advisory chip

- **AI-13** Demand-driven replenishment: "Item {code} stock depleting
  faster than forecast — advance reorder recommended."
- **AI-04** Expiry avoidance: "Lot {lot} near expiry with {N} units
  on hand — recommend priority consumption or recall."

#### 2.5.9 Backend binding

| Layer   | Binding                                                        |
|---------|----------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/inventory_logistics/ml/kpi`                      |
| E5 §2.1 | `GET /api/v1/inventory_logistics/activity?limit=10`           |
| E9      | `GET /api/v1/ai/advisories?module=inventory_logistics`        |

#### 2.5.10 Per-role view differences

| Role              | Notes                                                          |
|-------------------|----------------------------------------------------------------|
| Warehouse         | Own location scope; task queue prominent                       |
| Warehouse Manager | Full site inventory; adjustment authority                      |
| QA Analyst        | Quarantine + expiry tiles; genealogy access                    |
| Traceability Lead | Full genealogy + recall simulation                             |
| Admin             | Full module                                                    |

#### 2.5.11 Per-portal variant

- **Auditor:** Read-only inventory records and lot genealogy.
- **Inspector:** Lot records and traceability in scoped AR.
- **Customer portal:** Delivery lots shared via CVLP — selected lot
  status visible.

---

### M-06: Maintenance & EHS

```
module_id:    M-06
domain_slug:  maintenance_ehs
route_class:  ML
```

#### 2.6.1 Header zone

- **Title:** Maintenance & EHS
- **Description:** Planned maintenance schedules, maintenance work
  orders, calibration, equipment asset registry, and EHS incident
  management.
- **Breadcrumb:** Portal Home / Maintenance & EHS
- **KPI summary row (4 tiles):**
  - PM Compliance (rolling 30d): pct of planned maintenance tasks
    completed on schedule (`kpi_key: pm_compliance_30d`)
  - Open MWOs: count of maintenance work orders in `open` state
    (`kpi_key: mwo_open_count`)
  - Calibration Overdue: count of assets with overdue calibration
    (`kpi_key: cal_overdue_count`)
  - Open EHS Incidents: count of incidents in `open` state
    (`kpi_key: ehs_incident_open`)

#### 2.6.2 Summary tiles

| Tile Label              | Target    | Root  |
|-------------------------|-----------|-------|
| Maintenance Work Orders | WS        | MWO   |
| PM Calendar             | WS        | (PMC) |
| Equipment / Assets      | WS        | (EQP) |
| Calibration Queue       | WS        | (CAL) |
| EHS Incidents           | WS        | (EHS) |
| Service-Life Summary    | WS        | (J3: SLLP) |

#### 2.6.3 Quick links

- Create MWO (Maintenance Tech, Supervisor, Admin)
- Log EHS Incident (Any authenticated principal)
- Schedule PM Task (Maintenance Planner, Admin)
- Record Calibration Result (Calibration Tech, Admin)
- View Asset History (Maintenance Tech, Supervisor)

#### 2.6.4 Module-level filters

- Asset / Equipment ID
- Maintenance Type (planned / corrective / predictive)
- Priority (low / medium / high / emergency)
- Assigned To
- Date (scheduled date / actual date / overdue toggle)
- Department / Plant Area

#### 2.6.5 Recent activity feed

- MWO-{code} completed by {actor} — mean time: {T}; parts used: {N}
- PM-{code} scheduled for {date} — asset: {asset_id}
- Calibration for {asset_id} completed — result: {pass/fail}
- EHS Incident {inc_code} reported by {actor} — severity: {L1..L5}
- Asset {asset_id} downtime started — reason: {category}
- MWO-{code} escalated to SEV-1 by {supervisor}

#### 2.6.6 Pack banner

- **J1:** "Validated equipment: {N} GMP-critical assets are due for
  re-validation." Per-site validated equipment registry link.
- **J2:** "OEM service bulletin: {N} unreviewed service bulletins for
  installed equipment."
- **J3:** "Service Life Limit Parts (SLLP): {N} parts approaching
  service-life limit." Link to WS (J3 SLLP extension).
- **J4:** "Preventive Maintenance for design-critical assets: {N}
  assets require DHF-linked PM verification."
- **J5:** "Sanitation schedule: {N} scheduled sanitation events due
  this shift." Environmental monitoring link.

#### 2.6.7 Alerts

| Severity | Source | Message                                                          |
|----------|--------|------------------------------------------------------------------|
| SEV-1    | EHS    | EHS incident {inc} — Level {L4/L5} — regulatory notification may be required |
| SEV-1    | CAL    | Asset {id} calibration expired — equipment must be taken offline |
| SEV-2    | MWO    | MWO-{code} — emergency maintenance blocked by parts shortage     |
| SEV-2    | PMC    | {N} PM tasks overdue by > {N} days                              |
| SEV-3    | EQP    | Asset {id} OEE prediction below threshold for next shift         |

#### 2.6.8 AI advisory chip

- **AI-07** Predictive maintenance: "Asset {id} vibration signature
  indicates bearing wear — recommend inspection before next shift."
- **AI-14** EHS trend: "Near-miss rate for {area} has increased 40%
  over 30 days — recommend safety walk."

#### 2.6.9 Backend binding

| Layer   | Binding                                                     |
|---------|-------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/maintenance_ehs/ml/kpi`                       |
| E5 §2.1 | `GET /api/v1/maintenance_ehs/activity?limit=10`            |
| E9      | `GET /api/v1/ai/advisories?module=maintenance_ehs`         |

#### 2.6.10 Per-role view differences

| Role              | Notes                                                         |
|-------------------|---------------------------------------------------------------|
| Operator          | Can log EHS incident; view asset status; no MWO creation      |
| Maintenance Tech  | Own MWO queue; calibration queue                              |
| EHS Officer       | Incident-centric; alert access                                |
| Maintenance Planner | PM schedule + resource planning                             |
| Admin             | Full module                                                   |

#### 2.6.11 Per-portal variant

- **Auditor:** Calibration records and PM history accessible.
- **Inspector:** EHS incident records and calibration certs accessible.
- **Customer portal:** Not visible.

---

### M-07: Finance

```
module_id:    M-07
domain_slug:  finance
route_class:  ML
```

#### 2.7.1 Header zone

- **Title:** Finance
- **Description:** PO spend monitoring, accounts payable invoices,
  budget tracking by cost centre, and cost-of-poor-quality (COPQ)
  analysis.
- **Breadcrumb:** Portal Home / Finance
- **KPI summary row (4 tiles):**
  - PO Spend MTD: total monetary value of POs issued this month
    (`kpi_key: po_spend_mtd`; currency from tenant locale)
  - AP Invoices Pending: count of supplier invoices awaiting approval
    (`kpi_key: ap_invoice_pending`)
  - Budget Variance (YTD): pct over/under budget at current YTD
    (`kpi_key: budget_variance_ytd`; red if > 5% over)
  - COPQ This Quarter: total cost-of-poor-quality (scrap + rework +
    warranty + returns) for current quarter
    (`kpi_key: copq_current_quarter`)

#### 2.7.2 Summary tiles

| Tile Label            | Target    | Root   |
|-----------------------|-----------|--------|
| Purchase Order Spend  | DL        | PO     |
| Supplier Invoices     | DL        | (INV)  |
| Cost Centre Budgets   | DL        | (BGTCC)|
| COPQ Analysis         | DL        | (COPQ) |
| GL Cost Roll          | DL        | (GL)   |

#### 2.7.3 Quick links

- Approve Invoice (Finance Approver, Admin)
- View Budget Report (Finance Manager, Admin)
- Export COPQ Report (Quality Manager, Finance Manager)
- Create Cost Adjustment (Finance Manager, Admin)

#### 2.7.4 Module-level filters

- Cost Centre (multi-select)
- Supplier (searchable)
- Date range (fiscal month / quarter / YTD)
- Currency (if multi-currency enabled)
- GL Account Code

#### 2.7.5 Recent activity feed

- PO-{code} approved — total value: {currency}{amount}
- Invoice {inv_code} from {supplier} — {currency}{amount} — pending approval
- Budget {cc_code} updated — new budget: {amount}
- COPQ entry {code} recorded — category: {scrap|rework|warranty}
- GL period {period} closed by {actor}

#### 2.7.6 Pack banner

No pack-specific banners for Finance (Finance module is universal).

#### 2.7.7 Alerts

| Severity | Source  | Message                                                       |
|----------|---------|---------------------------------------------------------------|
| SEV-2    | Budget  | Cost centre {cc} at {pct}% of budget with {N} months remaining |
| SEV-2    | AP      | Invoice {inv} overdue for approval — supplier aging affected  |
| SEV-3    | COPQ    | COPQ for {dept} increased {pct}% vs. prior quarter            |

#### 2.7.8 AI advisory chip

- **AI-10** Spend anomaly: "PO-{code} unit price is {pct}% above
  historical average for item {code} from this supplier."
- **AI-06** COPQ attribution: "Scrap increase in {dept} correlates
  with supplier {name} lot change."

#### 2.7.9 Backend binding

| Layer   | Binding                                                     |
|---------|-------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/finance/ml/kpi`                               |
| E5 §2.1 | `GET /api/v1/finance/activity?limit=10`                    |
| E9      | `GET /api/v1/ai/advisories?module=finance`                 |

#### 2.7.10 Per-role view differences

| Role            | Notes                                                        |
|-----------------|--------------------------------------------------------------|
| Buyer           | PO spend tile; no AP invoice approval; no budget            |
| Finance Analyst | Read-only analytical view; budget variance; COPQ            |
| Finance Manager | Full module; budget authority; invoice approval             |
| QA Manager      | COPQ tile + report only                                     |
| Admin           | Full module                                                 |

#### 2.7.11 Per-portal variant

- **Auditor:** GL and COPQ records read-only for financial audit scope.
- **Inspector:** Not visible.
- **Customer portal:** Not visible.

---

### M-08: Sales & Customer

```
module_id:    M-08
domain_slug:  commercial_customer
route_class:  ML
```

#### 2.8.1 Header zone

- **Title:** Sales & Customer
- **Description:** Sales quotations, customer purchase orders, sales
  orders, shipments, and customer complaints / returns management.
- **Breadcrumb:** Portal Home / Sales & Customer
- **KPI summary row (4 tiles):**
  - Open Sales Orders: count of SO records in `confirmed` or
    `in-fulfillment` (`kpi_key: so_open_count`)
  - On-Time Shipment Rate (30d): pct of shipments delivered by
    promised date (`kpi_key: otd_30d`)
  - Open Customer Complaints: count of customer complaints in `open`
    state (`kpi_key: customer_complaints_open`)
  - Quote Win Rate (90d): pct of quotes converted to SO
    (`kpi_key: quote_win_rate_90d`)

#### 2.8.2 Summary tiles

| Tile Label             | Target    | Root  |
|------------------------|-----------|-------|
| Quotes                 | WS        | QUO   |
| Customer Purchase Orders | WS      | CPO   |
| Sales Orders           | WS        | SO    |
| Shipments              | WS        | (SHP) |
| Customer Complaints    | WS        | (CCL) |
| RMA Returns            | WS        | (RMA) |

#### 2.8.3 Quick links

- Create Quote (Sales Rep, Sales Manager, Admin)
- Create Sales Order (Sales Rep, Admin)
- Record Shipment (Logistics, Supervisor, Admin)
- Log Customer Complaint (Customer Service, QA Analyst)
- Process RMA Return (Customer Service, Warehouse)

#### 2.8.4 Module-level filters

- Customer (searchable)
- Sales Rep / Account Manager
- Status (draft / open / in-fulfillment / shipped / closed)
- Date range (order date / ship date)
- Product Family

#### 2.8.5 Recent activity feed

- QUO-{code} sent to customer {name}
- CPO-{code} received from {customer} — {N} line items
- SO-{code} confirmed — promise date: {date}
- SHP-{code} dispatched — carrier: {name}; tracking: {id}
- Complaint {ccl_code} received from {customer} — product: {item}
- RMA-{code} received — {N} units; disposition pending

#### 2.8.6 Pack banner

- **J1:** "Controlled substance shipments: {N} SOs require DEA/BNF
  export documentation."
- **J4:** "CE/FDA device shipments: {N} SOs require UDI label
  verification before dispatch."
- **J5:** "SFCR/LACF export: {N} shipments require FDA prior notice."

#### 2.8.7 Alerts

| Severity | Source | Message                                                         |
|----------|--------|-----------------------------------------------------------------|
| SEV-1    | SO     | SO-{code} promised date in {H} hours — fulfillment incomplete   |
| SEV-2    | CCL    | Complaint {ccl} overdue for 8D response — customer: {name}     |
| SEV-3    | QUO    | Quote {quo} expires in {N} days — no SO received               |

#### 2.8.8 AI advisory chip

- **AI-02** Late delivery risk: "SO-{code} is predicted to miss
  promise date based on current WO completion rate."
- **AI-16** Quote pricing: "Quote {quo_code} margin is below
  standard threshold — recommend pricing review."

#### 2.8.9 Backend binding

| Layer   | Binding                                                         |
|---------|-----------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/commercial_customer/ml/kpi`                       |
| E5 §2.1 | `GET /api/v1/commercial_customer/activity?limit=10`            |
| E9      | `GET /api/v1/ai/advisories?module=commercial_customer`         |

#### 2.8.10 Per-role view differences

| Role            | Notes                                                           |
|-----------------|-----------------------------------------------------------------|
| Sales Rep       | Own customers; quote + SO; no complaint authority               |
| Sales Manager   | Full sales view; team scope; win rate tile                      |
| Customer Service| Complaint + RMA; read-only SO/SHP                              |
| Logistics       | Shipment queue; no quote/SO creation                           |
| Admin           | Full module                                                     |

#### 2.8.11 Per-portal variant

- **Auditor:** Sales records read-only for financial or quality audit.
- **Inspector:** Not typically scoped.
- **Customer portal (CVLP — J5):** Customer-visible: own CPOs, own SOs
  status, shipment tracking, and shared quality certificates.

---

### M-09: Engineering

```
module_id:    M-09
domain_slug:  master_data
route_class:  ML
```

#### 2.9.1 Header zone

- **Title:** Engineering
- **Description:** Item master, bill of materials, routings,
  engineering change management, design verification, and internal
  review (IREV) workflow.
- **Breadcrumb:** Portal Home / Engineering
- **KPI summary row (4 tiles):**
  - Open ECOs: count of ECO records in `open` or `in-review`
    (`kpi_key: eco_open_count`)
  - Items Released This Month: count of item revisions released to
    production (`kpi_key: items_released_month`)
  - IRev Reviews In Progress: count of IREV records active
    (`kpi_key: irev_in_progress`)
  - BOM Accuracy (30d): pct of WO material issues matching BOM without
    substitution (`kpi_key: bom_accuracy_30d`)

#### 2.9.2 Summary tiles

| Tile Label             | Target    | Root  |
|------------------------|-----------|-------|
| Engineering Changes    | WS        | ECO   |
| Internal Reviews       | WS        | IREV  |
| Item Master            | WS        | (ITEM)|
| Bill of Materials      | ML        | (BOM) |
| Routings               | WS        | (RTG) |
| Design Verification    | WS        | (DVP) |
| DHF Overview (J4)      | WS        | (DHF) |

#### 2.9.3 Quick links

- Create ECO (Design Engineer, Engineering Manager, Admin)
- Start Internal Review (Engineer, Admin)
- Add Item Revision (Design Engineer, Admin)
- View BOM Structure (Any authenticated; read-only)
- Generate DHF Pack (Regulatory Affairs, Admin) — J4 only

#### 2.9.4 Module-level filters

- Product Family / Item Class
- ECO Status (draft / in-review / approved / released / cancelled)
- Engineering Owner
- Effectivity Date range
- IREV Type (design / process / supplier)

#### 2.9.5 Recent activity feed

- ECO-{code} approved by CCB — effective: {date}
- Item {item_code} Rev {rev} released to production
- IREV-{code} opened — type: design verification; owner: {actor}
- BOM {bom_code} Rev {rev} baseline approved
- ECO-{code} rejected by {actor} — reason: {category}
- DHF section {sec} approved for device {item} — J4

#### 2.9.6 Pack banner

- **J2:** "APQP Gate Review: {N} projects at gate {G} awaiting sign-off."
  APQP project link.
- **J3:** "AS9102 FAI: {N} part numbers released this month require
  FAI." WS-21 link.
- **J4:** "Design History File: {N} open DHF action items." DHF link.
  UDI device classification updates required for {N} items.
- **J5:** "Formulation / recipe changes: {N} ECOs affect HACCP
  ingredient list — re-validate HACCP plan."

#### 2.9.7 Alerts

| Severity | Source | Message                                                        |
|----------|--------|----------------------------------------------------------------|
| SEV-2    | ECO    | ECO-{code} CCB review overdue by {N} days                     |
| SEV-2    | BOM    | BOM {bom_code} used in open WOs has pending ECO — version risk |
| SEV-3    | IREV   | IREV-{code} approaching review deadline                       |

#### 2.9.8 AI advisory chip

- **AI-17** ECO impact analysis: "ECO-{code} affects {N} active WOs
  and {N} open POs — recommend coordinated cutover date."
- **AI-18** Part substitution risk: "Proposed substitute for {item}
  has {N} open quality alerts — verify qualification."

#### 2.9.9 Backend binding

| Layer   | Binding                                                     |
|---------|-------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/master_data/engineering/ml/kpi`               |
| E5 §2.1 | `GET /api/v1/master_data/engineering/activity?limit=10`    |
| E9      | `GET /api/v1/ai/advisories?module=engineering`             |

#### 2.9.10 Per-role view differences

| Role               | Notes                                                        |
|--------------------|--------------------------------------------------------------|
| Design Engineer    | Own ECOs + IREVs; BOM read-only                              |
| CCB Member         | ECO approval tile; CCB queue prominent                       |
| Engineering Manager| Full module; all ECOs; BOM accuracy tile                     |
| Regulatory Affairs | DHF tile (J4); IREV; no BOM creation                        |
| Admin              | Full module                                                  |

#### 2.9.11 Per-portal variant

- **Auditor:** ECO history, BOM, and DHF read-only.
- **Inspector:** Item specifications and DHF accessible for device
  inspections.
- **Customer portal:** Not visible.

---

### M-10: Training & Workforce

```
module_id:    M-10
domain_slug:  master_data
route_class:  ML
```

#### 2.10.1 Header zone

- **Title:** Training & Workforce
- **Description:** Training matrix, competency management, role
  certifications, aseptic qualifications, and workforce eligibility
  for regulated roles (PRRC, PCQI, ITAR PoR).
- **Breadcrumb:** Portal Home / Training & Workforce
- **KPI summary row (4 tiles):**
  - Overdue Training: count of training assignments past due date
    (`kpi_key: training_overdue_count`)
  - Eligibility Gaps: count of production role assignments where the
    assigned operator lacks current certification
    (`kpi_key: eligibility_gaps`)
  - Training Completion Rate (MTD): pct of scheduled training completed
    this month (`kpi_key: training_completion_mtd`)
  - Expiring Certifications (30d): count of certifications expiring
    within 30 days (`kpi_key: certs_expiring_30d`)

#### 2.10.2 Summary tiles

| Tile Label               | Target    | Root  |
|--------------------------|-----------|-------|
| Training Matrix          | WS        | TRAIN |
| Competency Matrix        | WS        | (COMP)|
| Person / Skills Register | WS        | (PERS)|
| Certification Queue      | WS        | (CERT)|
| Eligibility Lookup       | WS        | (ELIG)|
| Aseptic Qualifications   | WS        | (J1: ASEP) |
| PCQI Designations        | WS        | (J5: PCQI) |

#### 2.10.3 Quick links

- Assign Training (Training Admin, Supervisor)
- Record Training Completion (Trainer, Training Admin)
- Check Eligibility (Supervisor, Operator)
- Renew Certification (Training Admin, HR)
- Add Aseptic Qualification (QA Analyst, Training Admin) — J1 only
- Register PRRC (Regulatory Affairs, Admin) — J4 only

#### 2.10.4 Module-level filters

- Department / Cost Centre
- Skill Category
- Training Status (pending / in-progress / completed / overdue)
- Certification Type
- Expiry window (30d / 60d / 90d)

#### 2.10.5 Recent activity feed

- Training {trn_code} completed by {actor} — score: {N}%
- Certification {cert_code} renewed for {person} — expiry: {date}
- Eligibility gap detected for operator {person} on WC-{wc_code}
- Aseptic qualification {aq_code} approved for {person} — J1
- Training assignment {trn_code} overdue — {person} notified
- PCQI designation updated for {person} — facility: {site} — J5

#### 2.10.6 Pack banner

- **J1:** "Aseptic qualifications: {N} operators due for re-validation
  within 30 days. Sterile line eligibility at risk."
- **J3:** "ITAR Persons of Record: {N} designations require annual
  re-attestation." Export privilege confirmation link.
- **J4:** "PRRC designation: {N} active PRRCs; next competency review
  in {N} days." EU MDR Article 15 note.
- **J5:** "PCQI: {N} designated PCQIs for {N} facilities." FSMA §103
  competency documentation link.

#### 2.10.7 Alerts

| Severity | Source | Message                                                          |
|----------|--------|------------------------------------------------------------------|
| SEV-1    | ELIG   | Operator {person} running WC-{wc} lacks current certification    |
| SEV-2    | CERT   | {N} certifications expiring in < 14 days — action required      |
| SEV-2    | ASEP(J1)| Aseptic qualification for {person} expired — line access risk  |
| SEV-3    | TRAIN  | Training completion rate < {pct}% for {dept} this month         |

#### 2.10.8 AI advisory chip

- **AI-20** Training gap prediction: "Based on planned production
  changes, {N} additional operators need qualification for item
  {item_code} by {date}."

#### 2.10.9 Backend binding

| Layer   | Binding                                                      |
|---------|--------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/master_data/training/ml/kpi`                   |
| E5 §2.1 | `GET /api/v1/master_data/training/activity?limit=10`        |
| E9      | `GET /api/v1/ai/advisories?module=training_workforce`       |

#### 2.10.10 Per-role view differences

| Role            | Notes                                                         |
|-----------------|---------------------------------------------------------------|
| Operator        | Own training records and certifications only                  |
| Supervisor      | Team scope; eligibility check; assign training               |
| Training Admin  | Full module; create/assign/record completions                |
| HR              | Person register; certification records; no training creation  |
| Regulatory Aff. | PRRC/PCQI/ITAR PoR tiles; compliance obligations view         |
| Admin           | Full module                                                   |

#### 2.10.11 Per-portal variant

- **Auditor:** Training records and qualification histories read-only.
- **Inspector:** PCQI/PRRC designations and training records accessible.
- **Customer portal:** Not visible.

---

### M-11: Traceability

```
module_id:    M-11
domain_slug:  traceability_serialization
route_class:  ML
```

#### 2.11.1 Header zone

- **Title:** Traceability
- **Description:** Lot genealogy, serialized unit tracking, recall
  readiness simulation, and regulatory traceability compliance
  (DSCSA, FSMA §204, GUDID, EUDAMED).
- **Breadcrumb:** Portal Home / Traceability
- **KPI summary row (5 tiles):**
  - Lots With Complete Genealogy: pct of active lots with full upstream
    and downstream lineage (`kpi_key: genealogy_coverage_pct`)
  - Open Recall Events: count of recall investigations in `active`
    state (`kpi_key: recall_open`)
  - DSCSA Coverage (J1): pct of serialized Rx units with verified DSCSA
    transaction data (`kpi_key: dscsa_coverage_pct`)
  - FSMA §204 KDE Completeness (J5): pct of food lots with all required
    KDEs recorded (`kpi_key: fsma204_kde_pct`)
  - Mean Recall Response Time (last 3 simulations): hours
    (`kpi_key: recall_sim_response_time`)

#### 2.11.2 Summary tiles

| Tile Label             | Target    | Root  |
|------------------------|-----------|-------|
| Lot Genealogy Tree     | ML        | LOT   |
| Serialized Unit Track  | WS        | (SER) |
| Batch Release Trace    | WS        | BREL  |
| Recall Management      | WS        | (RCL) |
| DSCSA Partner Network  | WS        | (J1: WS-19) |
| FSMA §204 Coverage     | WS        | (J5: WS-23) |
| UDI Device Registry    | WS        | (J4: WS-22) |

#### 2.11.3 Quick links

- Run Recall Simulation (Traceability Lead, QA Manager, Admin)
- Launch Lot Genealogy (Traceability Lead, QA Analyst)
- Initiate Mock Recall (Regulatory Affairs, Admin)
- View DSCSA Transaction Log (Traceability Lead) — J1 only
- Submit §204 KDE Data (Traceability Lead) — J5 only

#### 2.11.4 Module-level filters

- Lot / Serial Number (free text)
- Item Code
- Manufacturing Date range
- Expiry Date range
- Genealogy completeness (complete / partial / missing)
- Regulatory program (DSCSA / FSMA §204 / GUDID / EUDAMED)

#### 2.11.5 Recent activity feed

- Lot genealogy {lot} completed — coverage: 100%
- Recall simulation {sim_id} completed — response time: {T} hours
- DSCSA verification failure for serial {sn} — partner: {name}
- §204 KDE record submitted for lot {lot} — CTE: {cte_name}
- Lot {lot} added to recall scope {rcl_code}
- UDI {udi} registered in GUDID for device {item} — J4

#### 2.11.6 Pack banner

- **J1:** "DSCSA Interoperability: {N} DSCSA transactions unverified —
  partner verification required." Exchange network health link.
  Serialized Rx unit coverage: {pct}%.
- **J4:** "GUDID Registration: {N} device identifiers pending
  GUDID/EUDAMED registration." EUDAMED status link.
- **J5:** "FSMA §204 readiness: {pct}% of lots have complete KDE data.
  FDA enforcement date: {date}."
- **J3:** "ITAR lot control: {N} lots contain ITAR-controlled
  components — export documentation required before shipment."

#### 2.11.7 Alerts

| Severity | Source      | Message                                                     |
|----------|-------------|-------------------------------------------------------------|
| SEV-1    | RCL         | Recall event {rcl} ACTIVE — {N} lots affected; containment in progress |
| SEV-1    | DSCSA (J1)  | DSCSA verification FAILED for serialized Rx lot {lot}       |
| SEV-2    | Genealogy   | {N} active lots missing upstream genealogy links            |
| SEV-2    | GUDID (J4)  | {N} UDIs not yet registered in GUDID — shipment block risk  |
| SEV-3    | FSMA (J5)   | §204 KDE submission for lot {lot} overdue by {N} days       |

#### 2.11.8 AI advisory chip

- **AI-04** Recall scope prediction: "Lot genealogy analysis indicates
  recall of lot {lot} would affect {N} downstream lots — review scope."
- **AI-13** Coverage gap: "Lot {lot} shows incomplete upstream
  genealogy — likely source: receiving scan gap on {date}."

#### 2.11.9 Backend binding

| Layer   | Binding                                                          |
|---------|------------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/traceability_serialization/ml/kpi`                 |
| E5 §2.1 | `GET /api/v1/traceability_serialization/activity?limit=10`      |
| E9      | `GET /api/v1/ai/advisories?module=traceability`                 |

#### 2.11.10 Per-role view differences

| Role              | Notes                                                          |
|-------------------|----------------------------------------------------------------|
| Warehouse         | Lot lookup; no genealogy tree; no recall                       |
| QA Analyst        | Genealogy + recall simulation; DSCSA view                      |
| Traceability Lead | Full module; recall initiation authority                       |
| Regulatory Aff.   | Regulatory program tiles prominent; submission actions         |
| Admin             | Full module                                                    |

#### 2.11.11 Per-portal variant

- **Auditor:** Lot genealogy and recall simulation history read-only.
- **Inspector:** Full genealogy and DSCSA/FSMA/GUDID records accessible.
- **Customer portal:** Lot status for customer's received lots via CVLP.

---

### M-12: Analytics & AI

```
module_id:    M-12
domain_slug:  analytics
route_class:  ML
```

#### 2.12.1 Header zone

- **Title:** Analytics & AI
- **Description:** KPI trend analysis, AI advisory activity, E9
  feature catalog, governance decision ledger, and predictive
  maintenance analytics.
- **Breadcrumb:** Portal Home / Analytics & AI
- **KPI summary row (4 tiles):**
  - Active AI Advisories: count of current E9 recommendations across
    all modules (`kpi_key: ai_advisories_active`)
  - AI Override Rate (30d): pct of AI advisories where principal
    chose to override the recommendation (`kpi_key: ai_override_rate_30d`)
  - Human-Confirmation Decisions (30d): count of E9 decisions requiring
    human-only confirmation in last 30 days
    (`kpi_key: ai_human_confirm_30d`)
  - Data Products Available: count of E5 data products registered and
    serving (`kpi_key: data_products_available`)

#### 2.12.2 Summary tiles

| Tile Label              | Target    | Root       |
|-------------------------|-----------|------------|
| AI Advisory Board       | WS        | (WS-29)    |
| KPI Trend Explorer      | DL        | (analytics)|
| AI Feature Catalog      | DL        | (E9)       |
| AI Governance Ledger    | DL        | (E9 audit) |
| Predictive Maintenance  | WS        | (WS-53)    |
| Data Product Catalog    | WS        | (WS-54)    |

#### 2.12.3 Quick links

- View Active Advisories (Any authorized principal)
- Open AI Governance Ledger (Compliance Lead, Admin)
- Configure AI Feature (Admin)
- Export Advisory Report (Manager, Compliance Lead, Admin)
- Run Predictive Analysis (Maintenance Manager, Admin)

#### 2.12.4 Module-level filters

- AI feature (multi-select from E9 feature catalog)
- Domain (quality / production / maintenance / supply chain)
- Advisory status (active / acknowledged / overridden / expired)
- Date range
- Human-only decision flag (toggle)

#### 2.12.5 Recent activity feed

- AI-{feature} advisory issued for {root}-{code} — confidence: {pct}%
- Principal {actor} acknowledged advisory for {root}-{code}
- Principal {actor} overrode advisory for {root}-{code} — reason: {text}
- AI kill-switch toggled by {admin} — feature: {feature_id}
- Data product {dp_id} freshness SLO breach — last update: {time}
- AI governance ledger entry {entry_id} recorded — decision: {type}

#### 2.12.6 Pack banner

No pack-specific banners in Analytics (features vary by pack
but the module itself is universal).

#### 2.12.7 Alerts

| Severity | Source       | Message                                                     |
|----------|--------------|-------------------------------------------------------------|
| SEV-2    | E9 Kill-switch| AI feature {feature} forcibly disabled — confirm intent   |
| SEV-2    | Data Product | Data product {dp_id} stale > {N} min — downstream ML inputs affected |
| SEV-3    | Governance   | AI advisory override rate > {pct}% — review model calibration |

#### 2.12.8 AI advisory chip

The AI Advisory chip on M-12 is meta-level:
- "AI-governance: {N} advisories have been overridden without a
  recorded reason — review governance ledger."
- No self-referential AI-on-AI recommendation loops permitted
  (per L1 §10 triple-defense).

#### 2.12.9 Backend binding

| Layer   | Binding                                                       |
|---------|---------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/analytics/ml/kpi`                               |
| E5 §2.1 | `GET /api/v1/analytics/activity?limit=10`                    |
| E9      | `GET /api/v1/ai/advisories?module=analytics` (meta-scope)    |
| E9 catalog | `GET /api/v1/ai/features` — feature registry               |

#### 2.12.10 Per-role view differences

| Role            | Notes                                                         |
|-----------------|---------------------------------------------------------------|
| Domain User     | Read advisory board; own-module advisories; no config         |
| Compliance Lead | Governance ledger; override rate; human-confirm tile          |
| Admin           | AI feature configuration; kill-switch; full module            |

#### 2.12.11 Per-portal variant

- **Auditor:** AI governance ledger read-only; override audit trail.
- **Inspector:** Not typically scoped.
- **Customer portal:** Not visible.

---

### M-13: Integration

```
module_id:    M-13
domain_slug:  core_infrastructure
route_class:  ML
```

#### 2.13.1 Header zone

- **Title:** Integration
- **Description:** Partner integration health, EDI transaction status,
  long-running operation (LRO) queue, sub-processor compliance, and
  circuit-breaker state monitoring.
- **Breadcrumb:** Portal Home / Integration
- **KPI summary row (4 tiles):**
  - Active Partner Connections: count of integration connectors in
    `healthy` state (`kpi_key: integrations_healthy_count`)
  - EDI Transactions (24h): count of EDI messages processed
    (`kpi_key: edi_tx_24h`)
  - LRO Queue Depth: count of long-running operations queued or in
    progress (`kpi_key: lro_queue_depth`)
  - Circuit-Breaker Trips (24h): count of circuit-breaker OPEN events
    in last 24 hours (`kpi_key: circuit_breaker_trips_24h`)

#### 2.13.2 Summary tiles

| Tile Label                | Target    | Root       |
|---------------------------|-----------|------------|
| Integration Health Board  | WS        | (WS-30)    |
| Partner Network (DSCSA)   | WS        | (J1: WS-19)|
| EDI Transaction Log       | DL        | (EDI)      |
| LRO Queue                 | WS        | (LRO)      |
| Sub-Processor Status      | DL        | (SPS)      |
| Connector Registry        | DL        | (CNX)      |

#### 2.13.3 Quick links

- View Integration Health Board (Admin, Integration Engineer)
- Retry Failed LRO (Admin)
- Acknowledge Circuit Breaker (Admin, Integration Engineer)
- Add Connector (Admin)
- View Sub-Processor Map (Compliance Lead, Admin)

#### 2.13.4 Module-level filters

- Connector / Partner (searchable)
- Status (healthy / degraded / circuit-open / disconnected)
- Protocol (EDI-X12 / EDIFACT / REST / AS2 / SFTP)
- Date range (last event)
- LRO type

#### 2.13.5 Recent activity feed

- Connector {cnx_id} reconnected after circuit reset
- EDI message {msg_id} type {type} processed — partner: {name}
- LRO {lro_id} type {batch_job} completed — duration: {T}
- Circuit breaker for {cnx_id} tripped — consecutive failures: {N}
- Sub-processor {sp_name} DPA renewal due in {N} days
- EDI acknowledgement REJECTED by {partner} — error: {code}

#### 2.13.6 Pack banner

- **J1:** "DSCSA EPCIS exchange: {N} trading partners connected; last
  verification exchange: {time}."
- **J4:** "GUDID/EUDAMED API: last successful submission {time}."
  UDI batch submission status.
- **J5:** "FSMA §204 data exchange: {N} supply chain partners
  configured for CTE/KDE interchange."

#### 2.13.7 Alerts

| Severity | Source        | Message                                                    |
|----------|---------------|------------------------------------------------------------|
| SEV-1    | Circuit-breaker| Connector {cnx} circuit OPEN — partner data exchange halted |
| SEV-1    | LRO           | LRO {lro_id} failed after {N} retries — manual intervention required |
| SEV-2    | EDI           | {N} EDI messages unacknowledged > {N} hours                |
| SEV-2    | Sub-processor | Sub-processor {sp} DPA expires in {N} days — GDPR risk     |
| SEV-3    | Connector     | Connector {cnx} latency > {N}ms p95 — degraded             |

#### 2.13.8 AI advisory chip

- **AI-21** Anomaly detection: "EDI rejection rate for partner {name}
  spiked — pattern consistent with schema version mismatch."

#### 2.13.9 Backend binding

| Layer   | Binding                                                         |
|---------|-----------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/core_infrastructure/integrations/ml/kpi`          |
| E5 §2.1 | `GET /api/v1/core_infrastructure/integrations/activity?limit=10` |
| E9      | `GET /api/v1/ai/advisories?module=integration`                 |

#### 2.13.10 Per-role view differences

| Role                | Notes                                                        |
|---------------------|--------------------------------------------------------------|
| Integration Engineer| Full health board; LRO retry; circuit-breaker management     |
| Compliance Lead     | Sub-processor map; DPA expiry; no connector management       |
| Admin               | Full module; add/remove connectors                           |
| Other roles         | Module not visible                                           |

#### 2.13.11 Per-portal variant

- **Auditor:** Sub-processor map and DPA records read-only.
- **Inspector/Customer:** Not visible.

---

### M-14: Administration

```
module_id:    M-14
domain_slug:  core_infrastructure
route_class:  ML → AC (all tiles link to AC pattern surfaces)
```

#### 2.14.1 Header zone

- **Title:** Administration
- **Description:** Tenant configuration, user and role management,
  Graphics Authority token management, feature flags, pack activation,
  and audit log access.
- **Breadcrumb:** Portal Home / Administration
- **KPI summary row (3 tiles):**
  - Active Users: count of principals with `active` account status
    (`kpi_key: users_active`)
  - Feature Flags Enabled: count of feature flags currently ON
    (`kpi_key: feature_flags_on`)
  - Config Changes (7d): count of administrative configuration changes
    in last 7 days (`kpi_key: admin_config_changes_7d`)

#### 2.14.2 Summary tiles

| Tile Label             | Target    | Root       |
|------------------------|-----------|------------|
| User Management        | AC        | (users)    |
| Role & Permissions     | AC        | (roles)    |
| Graphics Authority     | AC        | (graphics) |
| Feature Flags          | AC        | (flags)    |
| Pack Management        | AC        | (packs)    |
| Tenant Configuration   | AC        | (tenant)   |
| Admin Audit Log        | DL        | (audit)    |

#### 2.14.3 Quick links

- Manage Users (Super Admin)
- Edit Feature Flags (Admin)
- Configure Graphics Tokens (Admin)
- Activate / Deactivate Pack (Super Admin)
- View Admin Audit Log (Admin, Compliance Lead)

#### 2.14.4 Module-level filters

Filters are within the AC sub-surfaces rather than at the ML level.
The ML filter bar at M-14 level offers:
- Configuration category
- Changed by (principal search)
- Change date range

#### 2.14.5 Recent activity feed

- Feature flag {flag_key} toggled ON by {admin}
- User {principal} role changed to {role} by {admin}
- Graphics token {token_key} value updated — simulation scene run
- Pack {pack_id} activated for tenant {tenant_id}
- Tenant locale changed to {locale} by {admin}
- Admin configuration {category} exported by {admin}

#### 2.14.6 Pack banner

No pack banner at M-14 level (Administration is pack-agnostic at
the ML home; pack-specific config is within individual AC surfaces).

#### 2.14.7 Alerts

| Severity | Source     | Message                                                    |
|----------|------------|------------------------------------------------------------|
| SEV-2    | Auth       | {N} failed login attempts for user {principal} in last {H}h |
| SEV-2    | Session    | Admin session for {principal} idle {N} min — auto-logout pending |
| SEV-3    | Config     | Configuration snapshot export has not run for {N} days     |

#### 2.14.8 AI advisory chip

No AI advisory chip on M-14 (Administration is a human-authority
surface; AI advisories do not surface in admin configuration per
L1 §10 principle — administrative decisions are exclusively
human-authority).

#### 2.14.9 Backend binding

| Layer   | Binding                                                       |
|---------|---------------------------------------------------------------|
| E5 §2.3 | `GET /api/v1/admin/ml/kpi`                                   |
| E5 §2.1 | `GET /api/v1/admin/activity?limit=10`                        |

#### 2.14.10 Per-role view differences

| Role       | Notes                                                         |
|------------|---------------------------------------------------------------|
| Admin      | Full module; all AC tiles; audit log                         |
| Super Admin| Full module + pack activation + tenant reset                  |
| Compliance Lead | Audit log read-only; no configuration changes            |
| All others | Module not visible (returns 403 from API layer)              |

#### 2.14.11 Per-portal variant

- **Auditor:** Admin audit log read-only (scoped to audit session).
- **Inspector/Customer:** Not visible.

---

## 3. Portal Visibility Matrix

| Module    | Internal | Auditor Portal | Inspector Portal | Customer Portal (J5) | Glove-Mode |
|-----------|----------|---------------|-----------------|----------------------|------------|
| M-01 Quality | Full | Read-only (scoped) | Read-only (scoped) | No | No |
| M-02 Batch Release | Full (J1) | QP decisions read | eBR + batch read | No | No |
| M-03 Production | Full | Read-only | WO/genealogy read | No | DISP + WO tiles |
| M-04 Procurement | Full | PO/IQC/SCAR read | Receiving + IQC | No | No |
| M-05 Inventory | Full | Read-only | Lot traceability | Lot status (own) | No |
| M-06 Maintenance | Full | Cal + PM read | EHS + cal read | No | MWO tile only |
| M-07 Finance | Full | GL + COPQ read | No | No | No |
| M-08 Sales | Full | Sales records read | No | Own CPO/SO/SHP | No |
| M-09 Engineering | Full | ECO + DHF read | Item specs + DHF | No | No |
| M-10 Training | Full | Training records | PCQI/PRRC records | No | No |
| M-11 Traceability | Full | Genealogy + recall | Full genealogy | Lot status (own) | No |
| M-12 Analytics | Full | Governance ledger | No | No | No |
| M-13 Integration | Admin/Eng only | Sub-processor read | No | No | No |
| M-14 Admin | Admin only | Audit log read | No | No | No |

---

## 4. Cross-Cutting Concerns

### 4.1 Graphics Authority compliance (ADR-0009)

All ML surfaces are rendered by the `HmV4ModuleListRenderer` factory in
`mom/scripts/portal/73-module-template-v4-renderers.js`. Every color,
size, spacing, radius, and motion duration is resolved via:

```javascript
window.GraphicsAuthority.tokens.read('<token_key>')
```

Status chip colors: `status-{state_key}` tokens.
Pack banner background: `pack-{pack_id}-banner-bg` tokens.
Alert severity colors: `alert-sev1-bg`, `alert-sev2-bg`, `alert-sev3-bg`.

### 4.2 WCAG 2.2 AA (per F11)

- Every ML surface carries semantic landmark roles:
  `<main>`, `<nav aria-label="Module navigation">`,
  `<section aria-labelledby="kpi-section-heading">`,
  `<section aria-labelledby="alerts-section-heading">`.
- KPI tiles: `role="region"`, `aria-label="{kpi_name}: {value}"`.
- Alert list: `role="list"` with `role="listitem"` per alert.
- AI advisory chip: `aria-expanded` toggles on expand/collapse.
- Skip link: `<a href="#main-content" class="skip-link">Skip to module content</a>` — visually hidden until focused.

### 4.3 Internationalization (per F12)

- All text strings from locale files — no hardcoded strings in JS.
- KPI values: number-formatted per locale (decimal separator, thousand
  separator, currency symbol position).
- Timestamps: relative + absolute per locale date format.
- RTL layout supported for ar-SA, he-IL tenants.
- Regulator-required language override: J1/J4 tenants with EU-site
  configuration can force module-header language to the jurisdiction
  language (e.g., de-DE for BfArM submissions).

### 4.4 Tenant boundary (per B6 C5)

ML KPI tiles, activity feeds, and alerts are all scoped to the
authenticated principal's tenant. Cross-tenant data leakage is
impossible because all E5 `ml/kpi` and `activity` endpoints enforce
tenant-header isolation at the database query level. SEV-1 if a
cross-tenant record appears in any ML feed.

### 4.5 Performance (SLO-7)

- ML render target: p95 < 300ms from navigation event to first
  meaningful paint.
- KPI tiles: served from E5 cache (30-second TTL); cache miss
  triggers skeleton → populated in < 800ms.
- Activity feed: paginated; first 10 records always from cache.
- Freshness banner triggers when KPI data age > 90 seconds.

---

## 5. Wave Targets

| Wave | ML Milestone                                                   |
|------|----------------------------------------------------------------|
| W1   | Baseline ML for HMV4 18 roots; M-01 through M-05 shipped      |
| W3   | M-06 through M-11 shipped; full per-domain ML                  |
| W5   | J1 (Pharma) + J4 (MD) pack overlays across all ML surfaces     |
| W7   | AI advisory chip (E9) integration across all 14 modules        |
| W8   | SOC 2 + DORA Elite compliance; audit trail on ML surfaces       |
| W10  | J2 (Auto) + J3 (Aero) + J5 (Food) pack overlays GA            |
| W12  | Sovereign region variants; per-portal scoping QA pass          |

---

## 6. Failure Modes

| Code | Description                          | Behavior                                       | Recovery |
|------|--------------------------------------|------------------------------------------------|----------|
| FM-ML-1 | KPI data API unavailable           | Skeleton tiles remain; "Data unavailable" chip after 5s; Retry | E5 cache invalidation; I3 if persistent |
| FM-ML-2 | Activity feed empty (no events)    | Purposeful empty state: "No activity in the last 30 days" | Not an error; no I3 |
| FM-ML-3 | Pack banner data stale             | Banner shows last known state with age indicator | E5 freshness check |
| FM-ML-4 | Alert count exceeds 20             | Shows 20 + "and {N} more — view all in Alerts" link to E10 | E10 inbox |
| FM-ML-5 | AI chip returns empty              | Chip hidden (not shown as "0 advisories") | No I3 |
| FM-ML-6 | Tile target WS/AR unavailable      | Tile shown disabled (`aria-disabled`); tooltip explains | Admin investigates feature flag |
| FM-ML-7 | Cross-tenant data leak detected    | SEV-1 incident; surface quarantined; user redirected | H8 systemic CAPA |
| FM-ML-8 | Graphics Authority token missing   | Renderer falls back to CSS variable default; audit log entry | Admin adds missing token |

---

## 7. Cross-References

- F0 — eight canonical patterns; ML pattern definition
- F1 — global shell; navigation to module list entry points
- F2 — cross-domain dashboard (parent of ML surfaces)
- F4 — workspace projections (target of ML summary tile clicks)
- F5 — authoritative record shells (target of ML quick-link clicks)
- F9 — frontend-backend binding detail
- F10 — design tokens catalog
- F11 — accessibility specification
- F12 — internationalization
- E2 — authority decision (link enablement per role)
- E5 §2.3 — dashboard data product binding
- E9 — AI advisory chip and feature catalog
- E10 — notification inbox (alerts)
- H1 §3 — regulator-window banner integration
- L1 §10 — AI communication discipline
- M5 — SLO-5 + SLO-7

---

## 8. Decision Phrase

```
S3-08_F3_MODULE_LIST_DEEP_UPGRADE_COMPLETE
NEXT: F4_WORKSPACE_PROJECTIONS.md
```
