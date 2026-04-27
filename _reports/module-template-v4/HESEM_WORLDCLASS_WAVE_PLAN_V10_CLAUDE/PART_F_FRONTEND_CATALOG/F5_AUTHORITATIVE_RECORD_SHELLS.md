# F5 — Authoritative Record Shells (AR Pattern)

**Part F · Frontend Catalog · HESEM Operations Platform HMV4**
**Decision phrase:** `S3-09_F5_AUTHORITATIVE_RECORD_DEEP_UPGRADE_COMPLETE`

---

## 1. Pattern Overview

The Authoritative Record Shell (AR) is the canonical single-record detail view in HESEM MOM. Every AR instance renders one uniquely identified record (identified by a UUID primary key) at a given revision, with a fixed structural contract of seven universal tabs plus pack-specific extension tabs. The AR surface enforces record integrity, role-scoped field visibility, friction-calibrated action gating, and ETag concurrency safety.

AR surfaces are always reached by navigating from a Workspace Projection (WS) or from a Linked record reference. They never act as a landing page in their own right; the shell URL carries the record UUID and optional tab anchor. All data fetches originate from E4 (record read), E5 (live subscription), E7 (signature authority), E8 (evidence), and where applicable E9 (AI advisory). History is sourced from E6 (audit log). The shell subscribes to the E5 §2.4 WebSocket channel for the record's UUID immediately on mount and unsubscribes on unmount.

### 1.1 Fixed Seven-Tab Contract

All AR instances implement every one of the seven universal tabs in the order shown. Pack-specific tabs are inserted after tab 7. Tab ordering is not configurable at runtime.

| # | Tab key | Route anchor |
|---|---------|--------------|
| 1 | Overview | `#overview` |
| 2 | Detail | `#detail` |
| 3 | History | `#history` |
| 4 | Activity | `#activity` |
| 5 | Linked | `#linked` |
| 6 | Evidence | `#evidence` |
| 7 | Signatures | `#signatures` |

---

## 2. Universal Tab Specifications

### 2.1 Tab 1 — Overview

**Purpose:** Immediate situational awareness. A user landing on any AR shell should understand the record's identity, current lifecycle state, and available high-priority actions within 2 seconds without scrolling.

**Required sections:**

| Section | Content |
|---------|---------|
| Record header strip | Record ID badge (monospace, `--token-font-mono`), record type label, state chip (color-coded per state machine, token `--state-<state>-bg`), lifecycle banner (pinned warning if state is BLOCKED, OVERDUE, or RECALLED), record owner display name + avatar, `created_at` formatted per locale, current revision number |
| Key fields panel | 4–8 highest-signal fields for the record type (defined per root in §4 below); rendered read-only in a 2-column grid; values resolved via GraphicsAuthority token `--field-label-color` for labels, `--field-value-color` for values |
| Action toolbar | Primary state-transition button (most likely next action per current state), secondary dropdown for remaining transitions; e-signature button (shown only if pending BD signatures exist for current user); lock/unlock button (L1 §6 friction gate); AI advisory chip (shown only if E9 endpoint is registered for this root) |
| Related records summary | Up to 5 most recently linked records (icons + IDs + states); "View all links" navigates to Linked tab |
| Freshness indicator | Small E8 composition gate pill: "Evidence: 3/4 classes required" — links to Evidence tab |

**Data binding:**
- Primary record: `GET /api/v1/{root}/{id}` (E4 §2.1) — ETag captured and stored in component state
- State chip color: `GraphicsAuthority.tokens.read('state-{state}-chip-bg')` — never hardcoded hex
- AI advisory chip: `GET /api/v1/ai/advisory/{root}/{id}/summary` (E9 §3.1) — shown only when 200 returned
- Live mutation events: E5 §2.4 WebSocket, record channel `record:{root}:{id}`

**Freshness SLO:** Record data must be no older than 60 seconds for mutable records (DRAFT, IN_REVIEW, PENDING_SIGN); no older than 300 seconds for terminal/locked states (CLOSED, RELEASED, VOIDED). The ETag last-fetch timestamp is visible in the header strip as "As of HH:MM:SS" rendered with token `--text-muted`.

**Per-role visibility:**

| Role tier | Visibility |
|-----------|------------|
| Viewer | Full read; action toolbar buttons hidden |
| Contributor | Read + edit fields not locked; primary transition button if eligible actor |
| Supervisor | All contributor rights + unlock button |
| QA / QP | All above + e-signature button + evidence attach |
| Admin | All fields; force-override action exposed |
| Auditor | Read-only; all fields including restricted (no edit affordances) |

**ARIA contract:**
- `role="region"` on the Overview panel with `aria-label="Record overview for {record type} {ID}"`
- State chip: `role="status"`, `aria-label="Current state: {state label}"`
- Action toolbar: `role="toolbar"`, `aria-label="Record actions"`
- Each button: descriptive `aria-label` including record ID and action name
- AI advisory chip: `aria-live="polite"` so screen readers announce advisory updates

---

### 2.2 Tab 2 — Detail

**Purpose:** Full canonical field display and field-level editing. This is the primary data-entry surface for records in editable states.

**Required sections:**

| Section | Content |
|---------|---------|
| Field group panels | All fields organized into collapsible named groups (e.g., "Identification", "Classification", "Disposition", "Regulatory"); each field shows label, current value, last-modified-by user, last-modified-at timestamp |
| Inline edit affordance | For unlocked records in editable states: pencil icon per field activates inline input; validation runs on blur; dirty-field indicator dot shown until saved; autosave draft to local buffer every 30 seconds |
| Drawer / Wizard edit | Complex compound fields (e.g., a multi-step classification with conditional fields) open a side Drawer with a multi-step Wizard; Drawer renders over the AR shell without navigation; uses `ControlKit.Drawer` factory |
| Version history link | Banner "Revision {N} — view revision history" navigates to History tab with version context pre-applied |
| Field-level change log | Expand icon on any field shows inline mini-log: last 5 changes to that field (who, what, when); full log in History tab |
| Save/Cancel bar | Sticky bottom bar appears when any field is dirty; "Save Changes" (L1 friction per action class) + "Discard" |

**Data binding:**
- Read: E4 §2.1 — the same ETag from Overview tab is shared across all tabs; tabs do not re-fetch independently
- Write: `PATCH /api/v1/{root}/{id}` (E3 §2.2) with `If-Match: {ETag}` header; 412 triggers conflict-resolution UI (§6)
- Validation: `POST /api/v1/{root}/{id}/validate` (E3 §2.4) called before Save; returns per-field error map
- Wizard: `ControlKit.Wizard.open({steps, onCommit})` — commits via PATCH on final step

**Freshness SLO:** Same as Overview (ETag shared). Dirty fields are flagged if a push event arrives from E5 while local edits are pending.

**Per-role visibility:** Viewer and Auditor see read-only rendering. Contributor sees edit affordances for non-locked fields. Supervisor/QA see all editable fields. Admin sees system fields (internal flags, database identifiers) normally hidden.

**ARIA contract:**
- Each field group: `role="group"` with `aria-labelledby` pointing to the group heading
- Inline edit input: `aria-label="{field label} — editing"`, `aria-describedby` pointing to validation error paragraph
- Dirty indicator: `aria-label="{field label} has unsaved changes"`, `role="img"`
- Sticky save bar: `role="region"`, `aria-label="Unsaved changes bar"`, `aria-live="polite"` when it appears/disappears

---

### 2.3 Tab 3 — History

**Purpose:** Full immutable audit trail and ETag chain visualization. Provides evidence of every state change, field modification, signature event, and system action on this record.

**Required sections:**

| Section | Content |
|---------|---------|
| Audit event list | Paginated (50 per page), reverse-chronological; each row: actor avatar + name, action verb (FIELD_CHANGED / STATE_TRANSITION / EVIDENCE_ATTACHED / SIGNATURE_CAPTURED / LOCK_APPLIED), timestamp, "from → to" values where applicable |
| Filter controls | Filter by actor, event type, date range; full-text search within event payloads |
| ETag chain visualization | Collapsible panel showing the sequence of ETags for this record with their validity windows; used by auditors to verify no unrecorded mutations occurred |
| Merkle anchor status | For records subject to cryptographic anchoring (J1 pharma batch, J3 aero critical): shows Merkle root hash, anchor timestamp, verification status (VERIFIED / PENDING / FAILED); link to external blockchain anchor if applicable |
| Version comparison | Select any two revision points → side-by-side diff of all field values |

**Data binding:**
- Audit events: `GET /api/v1/audit/{root}/{id}/events?page={n}&page_size=50` (E6 §2.1)
- ETag chain: `GET /api/v1/{root}/{id}/etag-chain` (E4 §2.6)
- Merkle anchor: `GET /api/v1/integrity/{root}/{id}/anchor-status` (E6 §3.2, J1/J3/J4 only)
- Version diff: `GET /api/v1/{root}/{id}/diff?from_rev={r1}&to_rev={r2}` (E4 §2.7)

**Freshness SLO:** Audit events are append-only and immutable; no SLO pressure. The list auto-refreshes when an E5 event of type `audit.event.created` arrives on the record channel.

**Per-role visibility:** All roles see the audit trail (read-only). Admin additionally sees system-internal events (cache invalidations, background job touches). Auditor role gets an "Export to PDF" button that generates a signed audit report.

**ARIA contract:**
- Audit event list: `role="log"`, `aria-label="Audit history for {record type} {ID}"`, `aria-live="polite"` for new events appended
- Each event row: `role="listitem"`, descriptive text constructed as "{actor} {action verb} at {timestamp}"
- ETag chain: `role="region"`, `aria-label="ETag integrity chain"`
- Merkle status: `role="status"`, `aria-label="Merkle anchor: {status}"`

---

### 2.4 Tab 4 — Activity

**Purpose:** Human-to-human and human-to-AI communication thread for this specific record. Captures decisions, queries, @mentions, attachments, and AI advisory chat as a unified stream.

**Required sections:**

| Section | Content |
|---------|---------|
| Comment thread | Reverse-chronological message list; each message: actor avatar (color-coded per actor ID modulo palette length, resolved via `GraphicsAuthority.tokens.read('activity-actor-palette-{n}')`), display name, timestamp, message body (Markdown rendered), attachment thumbnails |
| @mention | Typing `@` triggers user picker (scoped to users with access to this record); mentioned users receive E5 push notification |
| Attachment inline | Drag-drop zone or clip icon; attachments stored via Evidence endpoint if they qualify as evidence class; otherwise stored as activity attachments; size limit enforced per system config |
| AI advisory chat | If E9 is registered for this root: a collapsible "AI Advisory" panel within the thread; user sends natural-language queries; E9 responds with structured advisory card (confidence %, supporting evidence IDs, recommended actions); AI responses are clearly labeled `[AI Advisory — not a regulated decision]`; all advisory interactions are logged to audit stream |
| Per-actor color coding | Up to 8 color slots from `--activity-actor-palette-1` through `--activity-actor-palette-8`; assignment is deterministic (actor_id hash mod 8); never hardcoded |

**Data binding:**
- Thread: `GET /api/v1/activity/{root}/{id}/comments?page={n}` (E9 §4.1 or activity sub-service)
- Post comment: `POST /api/v1/activity/{root}/{id}/comments` (E3 §2.5)
- AI advisory query: `POST /api/v1/ai/advisory/{root}/{id}/query` (E9 §3.2); streamed response via SSE
- Push: E5 §2.4 activity channel `activity:{root}:{id}` for new messages

**Freshness SLO:** Real-time via E5 push; no polling needed. New messages appear within 2 seconds of server posting.

**Per-role visibility:** All roles with record access can read the thread. Viewer cannot post. AI advisory panel is shown only to Contributor and above. Auditor can read all including any role-restricted comment threads (if any exist under regulatory confidentiality rules — J4 MDR, J1 pharma QP deliberation).

**ARIA contract:**
- Thread: `role="log"`, `aria-label="Activity thread for {record type} {ID}"`, `aria-live="polite"`
- Each message: `role="article"`, `aria-label="{actor name} at {timestamp}"`
- AI advisory panel: `aria-label="AI Advisory panel"`, AI responses carry `aria-description="AI generated advisory — not a regulated decision"`
- Comment input: `role="textbox"`, `aria-label="Write a comment"`, `aria-multiline="true"`

---

### 2.5 Tab 5 — Linked

**Purpose:** Relational context map. Shows all records that link to or from this record, with link type semantics, enabling navigation without losing the current record context.

**Required sections:**

| Section | Content |
|---------|---------|
| Link graph summary | Card grid or compact table of linked records; grouped by link type |
| Link types displayed | PARENT (this record is a child of another), CHILD (this record has sub-records), REFERENCE (informational cross-link), TRIGGERED_BY (this record was created in response to another — e.g., CAPA triggered by NC), TRIGGERED (records created by this record), SUPERSEDES / SUPERSEDED_BY (document revision lineage) |
| Per-link metadata | Linked record ID, type, title, current state chip, last-modified timestamp, link created-by user |
| Drill-into navigation | Clicking a linked record opens that record's AR shell in a new tab or side panel (user preference); the current record's AR shell remains active |
| Add link | "Link a Record" button opens a searchable picker; allowed link types are governed by the root's link policy (defined in E4 contract metadata); creating a link posts to `POST /api/v1/{root}/{id}/links` |
| Remove link | Permitted only for non-structural links (REFERENCE type); structural links (PARENT, TRIGGERED_BY) require elevated role + audit reason |

**Data binding:**
- Links: `GET /api/v1/{root}/{id}/links` (E4 §2.5)
- Create link: `POST /api/v1/{root}/{id}/links`
- Delete link: `DELETE /api/v1/{root}/{id}/links/{link_id}`
- Linked record preview: E4 §2.1 called for each linked record ID (batched request: `POST /api/v1/records/batch-summary`)

**Freshness SLO:** Links list refreshes on E5 event `record.link.created` / `record.link.deleted` on the record channel.

**Per-role visibility:** All roles see links. Only Contributor+ can add REFERENCE links. Only Supervisor+ can remove structural links. Auditor sees all including system-generated links.

**ARIA contract:**
- Links region: `role="region"`, `aria-label="Linked records"`
- Each link group: `role="group"`, `aria-labelledby` pointing to link-type heading
- Each linked record card: `role="link"` or `role="button"` depending on interaction model; `aria-label="{record type} {ID} — state: {state} — link type: {link type}"`

---

### 2.6 Tab 6 — Evidence

**Purpose:** Evidence composition gate status and evidence management for this record. Implements H4 §3 evidence class requirements — a record cannot advance past certain lifecycle gates unless all required evidence classes are satisfied.

**Required sections:**

| Section | Content |
|---------|---------|
| Composition gate status bar | Horizontal progress indicator showing N required evidence classes; each class shown as a pill: label, required/optional indicator, current status (SATISFIED / MISSING / STALE / WAIVED); gate overall status: OPEN (all satisfied) or BLOCKED (any required class missing/stale) |
| Evidence class panels | One collapsible panel per evidence class; each panel shows: class name, requirement text, list of evidence items attached (ID, filename/description, attached-by, attached-at, WORM lock status), "Attach Evidence" button |
| WORM lock indicator | Per-item padlock icon with `aria-label`; locked items cannot be deleted; lock tooltip shows lock timestamp and operator |
| Freshness per class | Evidence items older than class-defined freshness threshold are flagged STALE with a warning banner; threshold values are fetched from E8 class metadata |
| Attach evidence | Opens file picker + metadata form; evidence type, reference ID (e.g., calibration cert number), date; posts to `POST /api/v1/evidence/{root}/{id}` (E8 §2.2); WORM lock is applied automatically for records in regulated states |
| Waiver request | For optional evidence classes: "Request Waiver" button; waiver requires supervisor approval (L1 friction Level 3); approved waivers appear as green WAIVED chip |

**Data binding:**
- Evidence items: `GET /api/v1/evidence/{root}/{id}` (E8 §2.1) — grouped by class
- Class metadata (requirements, freshness thresholds): `GET /api/v1/evidence/classes/{root}` (E8 §1.1)
- Attach: `POST /api/v1/evidence/{root}/{id}` (E8 §2.2)
- Delete (unlocked only): `DELETE /api/v1/evidence/{root}/{id}/items/{item_id}`
- Waiver: `POST /api/v1/evidence/{root}/{id}/waiver` (E8 §2.4)

**Freshness SLO:** Evidence list refreshes on E5 event `evidence.attached` / `evidence.removed` / `evidence.worm_locked`. Gate status re-computes client-side after each update.

**Per-role visibility:** Viewer and Contributor can view and attach evidence. QA/QP can also waive optional classes. Admin can unlock WORM items (extremely rare; requires AAL3 + dual authorization). Auditor sees all evidence items plus WORM lock audit trail.

**ARIA contract:**
- Gate status bar: `role="meter"`, `aria-label="Evidence composition gate"`, `aria-valuenow="{satisfied count}"`, `aria-valuemax="{total required}"`
- Each class panel: `role="region"`, `aria-label="Evidence class: {class name} — {status}"`
- WORM indicator: `role="img"`, `aria-label="WORM locked at {timestamp}"`
- Attach button: `aria-label="Attach evidence for class: {class name}"`

---

### 2.7 Tab 7 — Signatures

**Purpose:** E-signature history, pending signature tracking, quorum progress, and revocation management per E7 §2.

**Required sections:**

| Section | Content |
|---------|---------|
| Pending signatures panel | Per BD code that is not yet closed: quorum progress bar (N of M signatories who have signed); list of pending signatories with role label; "Sign Now" button for current user if they are a required signatory |
| Signature history list | Reverse-chronological; each row: signatory name, role, BD code, signature timestamp, AAL used (AAL2 / AAL3), signature method (software key / hardware token), purpose statement, any associated reason text |
| BD code display | Each BD code shown with its full label (from E7 §1 BD registry); AAL requirement badge; description of what the signature authorizes |
| Revoke button | Shown only for AAL3-eligible roles on signatures that are within the revocation window; clicking opens a reason dialog (L1 §6 Level 4 friction); revocation itself posts `POST /api/v1/signatures/{sig_id}/revoke` and creates audit event |
| PQC migration indicator | If record was signed before PQC migration cutover: a warning chip "Pre-PQC Signature — classical algorithm"; link to migration guidance; affects regulatory acceptability per E7 §4.3 |

**Data binding:**
- Pending + history: `GET /api/v1/signatures/{root}/{id}` (E7 §2.1)
- BD code registry: `GET /api/v1/signatures/bd-codes` (E7 §1.1; cached 1 hour)
- Sign: `POST /api/v1/signatures/{root}/{id}/sign` (E7 §2.3); body includes BD code, reason text, AAL credential proof
- Revoke: `POST /api/v1/signatures/{sig_id}/revoke` (E7 §2.5)

**Freshness SLO:** Signatures list refreshes on E5 event `signature.captured` / `signature.revoked`. Quorum progress bar updates in real time as co-signatories sign.

**Per-role visibility:** All roles see signature history. Only eligible signatories per BD code see the "Sign Now" button. Admin sees system-generated auto-signature events. AAL3-eligible roles see revoke button within revocation window.

**ARIA contract:**
- Quorum progress: `role="meter"`, `aria-label="Signature quorum for BD code {code}: {n} of {m} signed"`, `aria-valuenow="{n}"`, `aria-valuemax="{m}"`
- Sign button: `aria-label="Sign as {role label} for {BD code} on {record ID}"`
- Revoke button: `aria-label="Revoke signature by {signatory name} for {BD code} — requires AAL3"`
- PQC warning: `role="alert"`, `aria-label="Pre-PQC signature warning"`

---

## 3. Pack-Specific Extension Tabs

### 3.1 J1 Pharma — EBR Tab

**Tab key:** `#ebr` | Inserted after tab 7.

**Purpose:** Electronic Batch Record viewer for the pharmaceutical manufacturing pack. Displays the inline eBR assembled from EC-04 evidence links, QP sign-off status, and the batch release gate readiness check.

**Sections:**
- eBR viewer: read-only structured display of the assembled Electronic Batch Record in EC-04 schema; sections: Product Identity, Equipment Verification, Material Reconciliation, In-Process Controls, Environmental Monitoring, Yield Reconciliation, Deviations Summary, QC Release Tests
- QP sign-off status: shows which QP (Qualified Person) is assigned; their AAL3 e-signature status; sign-off date; any conditions attached to release
- Batch release gate: traffic-light indicator — RED (eBR incomplete or deviation open), AMBER (eBR complete, QP sign pending), GREEN (QP signed, release authorized); gate status is an input to the AC-13 Batch Release Console
- Deviation link list: any deviations cross-linked to this batch with their own states
- eBR PDF export: generates signed PDF via `POST /api/v1/ebr/{batch_id}/export` (E8 §3.1, J1 extension)

**ARIA:** `role="region"`, `aria-label="Electronic Batch Record"`.

---

### 3.2 J4 Medical Device — DHF Tab

**Tab key:** `#dhf` | Inserted after tab 7.

**Purpose:** Design History File navigator for medical device pack. Aggregates EC-16 through EC-20 design control evidence links per product, PCCP status, and EUDAMED registration linkage.

**Sections:**
- DHF document tree: hierarchical list of design control categories (User Needs, Design Input, Design Output, Verification, Validation, Design Transfer, Design Change) with EC-16–20 links and completeness badges
- PCCP status badge: Predetermined Change Control Plan — shows APPROVED / PENDING / NOT_APPLICABLE; links to regulatory filing reference
- EUDAMED registration: shows EUDAMED Basic UDI-DI, registration status, last sync timestamp; "Sync Now" button for Admin
- DHF completeness gate: percentage of required DHF sections populated; blocks regulatory submission until 100%

---

### 3.3 J2 Automotive — PPAP Tab

**Tab key:** `#ppap` | Inserted after tab 7.

**Purpose:** PPAP (Production Part Approval Process) submission status tracker.

**Sections:**
- PPAP element matrix: 18 PPAP elements listed; per element: required for this PPAP level (1–5), submission status (NOT_STARTED / IN_PROGRESS / SUBMITTED / APPROVED / REJECTED), customer approval indicator
- Customer approval matrix: per customer (OEM), per element, approval status and comments
- MMOG/LE link: if plant is MMOG/LE assessed, link to relevant MMOG assessment record
- Submit to customer: "Submit PPAP Package" button (L1 Level 3 friction) triggers AC-15 flow

---

### 3.4 J3 Aerospace — FAI Tab

**Tab key:** `#fai` | Inserted after tab 7.

**Purpose:** First Article Inspection tracker per AS9102B.

**Sections:**
- AS9102B checklist: per form section (Form 1 Part Number Accountability, Form 2 Product Accountability, Form 3 Characteristic Accountability); completion status per section
- Bubble extraction status: AI-08 automated bubble extraction result (extracted N of M characteristics); confidence per characteristic; manual override per row
- NADCAP link: if process requires NADCAP certification, shows cert number + expiry + link to NADCAP audit record
- FAI approval: approve button (L1 Level 3 friction) links to AC-14 FAI Approval Console

---

### 3.5 J5 Food — HACCP Tab

**Tab key:** `#haccp` | Inserted after tab 7.

**Purpose:** HACCP Critical Control Point monitoring dashboard for the food safety pack.

**Sections:**
- CCP monitoring data table: per CCP (identified in HACCP plan), last N monitoring readings, critical limit vs actual, status (IN_LIMIT / DEVIATION)
- FSMA §204 lot linkage: traceability links per Lot to upstream supply chain hops as required by FSMA §204; completeness badge
- FSIS inspector access log: read-only log of FSIS inspector access events on this lot/batch (regulatory requirement); each row: inspector ID, access time, fields viewed
- Corrective action trigger: if any CCP deviation exists, "Trigger Corrective Action" button pre-populates a linked CAPA record

---

## 4. AR Shell Instance Catalog (≥50 instances)

Each entry below defines the full configuration of one AR shell instance.

---

### 4.1 NC Case (Root: NQCASE)

#### AR-NQCASE-BASE
- **Shell ID:** AR-NQCASE-BASE
- **Root kind:** Nonconformance Case
- **Pack variant:** Base (all industries)
- **Tab configuration:** Tabs 1–7 (all universal); no pack tabs
- **State machine:** DRAFT → OPEN → UNDER_INVESTIGATION → PENDING_DISPOSITION → DISPOSED → CLOSED; also: VOIDED (from DRAFT only); ESCALATED (lateral from any open state)
- **State chips:** DRAFT (token `--state-draft-chip-bg`), OPEN (token `--state-open-chip-bg`), UNDER_INVESTIGATION (`--state-investigation-chip-bg`), PENDING_DISPOSITION (`--state-pending-chip-bg`), DISPOSED (`--state-disposed-chip-bg`), CLOSED (`--state-closed-chip-bg`), VOIDED (`--state-voided-chip-bg`), ESCALATED (`--state-escalated-chip-bg`)
- **Primary toolbar actions:** "Open Investigation" (DRAFT→OPEN, L1 Level 1); "Record Disposition" (UNDER_INVESTIGATION→PENDING_DISPOSITION, L1 Level 2, reason required); "Close" (DISPOSED→CLOSED, L1 Level 2, QA approval); "Escalate" (any→ESCALATED, L1 Level 2); "Void" (DRAFT→VOIDED, L1 Level 2, reason required)
- **Friction calibration:**
  - View NC details: Level 0
  - Edit description/classification fields: Level 1
  - Record disposition decision: Level 2 (reason required, confirms impact)
  - Close NC (QA approval): Level 2 + QA role gate
  - Escalate to regulatory NC: Level 3 (re-auth + supervisor check)
- **E-signature requirements:** BD-01 (QA disposition sign-off) required at DISPOSED→CLOSED; AAL2 minimum
- **Key fields (Overview panel):** NC ID, Detection Date, Product/Part, Detection Source, Severity (MINOR/MAJOR/CRITICAL), Disposition Type, Responsible Owner, Days Open
- **AI advisory (E9):** Root-cause suggestion advisory; confidence chip shown in Overview if E9 registered

#### AR-NQCASE-J1 (Pharma overlay)
- Inherits AR-NQCASE-BASE
- **Additional pack tab:** EBR tab (§3.1) — links associated batch to the NC; if batch is identified, EBR viewer loads that batch's eBR
- **Additional state:** BATCH_IMPACT_ASSESSED (inserted between UNDER_INVESTIGATION and PENDING_DISPOSITION)
- **Additional toolbar action:** "Assess Batch Impact" (L1 Level 2; triggers batch impact form in Drawer; output linked to EBR deviation section)
- **Additional friction:** Closing a pharma NC that is linked to a released batch requires Level 3 + QP role gate
- **BD code addition:** BD-02 (QP Batch Impact Authorization) required before PENDING_DISPOSITION when batch is affected

#### AR-NQCASE-J2 (Automotive overlay)
- Inherits AR-NQCASE-BASE
- **Additional fields in Detail tab:** Customer notification required (Yes/No), Customer 8D reference number, Containment action type (per AIAG FMEA taxonomy)
- **Additional toolbar action:** "Issue Customer Notification" (L1 Level 2; generates customer notification draft routed to AC-12 SCAR flow if supplier-caused)
- **Link policy addition:** NQCASE can TRIGGER a SCAR (Supplier Corrective Action Request) directly from Linked tab

#### AR-NQCASE-J3 (Aerospace overlay)
- Inherits AR-NQCASE-BASE
- **Additional field:** ITAR controlled part (Yes/No toggle; if Yes, access-list restriction applied; viewer-role is further scoped to ITAR-cleared users)
- **Additional toolbar action:** "File GIDEP Report" (L1 Level 3; routes to AC-07 GIDEP Report Draft Console)
- **Regulatory note in History tab:** Merkle anchor status shown (J3 critical parts require cryptographic chain of custody)

#### AR-NQCASE-J4 (Medical Device overlay)
- Inherits AR-NQCASE-BASE
- **Additional state:** MDR_PENDING (inserted after ESCALATED when complaint classification triggers MDR obligation)
- **Additional toolbar action:** "Trigger MDR Triage" (L1 Level 3; routes to AC-08 MDR Vigilance Triage Console)
- **Additional pack tab:** (no DHF tab — DHF tab is product-level, not NC-level); instead: a "Complaint Linkage" panel in Evidence tab showing linked complaint records and Pharmacovigilance case ID

#### AR-NQCASE-J5 (Food Safety overlay)
- Inherits AR-NQCASE-BASE
- **Additional field:** FSMA §204 traceability required (Yes/No)
- **Additional toolbar action:** "Initiate Recall Scope Check" (L1 Level 3; pre-populates AC-04 Recall Execution Console with this NC's affected lot links)
- **Evidence class addition:** CCP monitoring data required as evidence class before disposition is allowed when NC source = CCP deviation

---

### 4.2 CAPA (Root: CAPA)

#### AR-CAPA-BASE
- **Shell ID:** AR-CAPA-BASE
- **Root kind:** Corrective and Preventive Action
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → OPEN → ROOT_CAUSE_ANALYSIS → ACTION_PLAN → IMPLEMENTATION → EFFECTIVENESS_REVIEW → CLOSED; also VOIDED, OVERDUE (system-set flag, not a distinct state but triggers OVERDUE chip overlay)
- **Key fields:** CAPA ID, Linked NC/Source, CAPA Type (CORRECTIVE / PREVENTIVE), Root Cause Category, Due Date, Responsible Owner, Effectiveness Criteria, Days Open
- **Primary toolbar actions:** "Open" (DRAFT→OPEN, L1 Level 1); "Submit Root Cause" (Level 2, reason required); "Approve Action Plan" (Level 2, Supervisor role gate); "Mark Implementation Complete" (Level 2, evidence required — H4 composition gate must be OPEN); "Submit Effectiveness Evidence" (Level 2); "Close" (Level 3, QA sign-off + BD-03)
- **Friction calibration:**
  - DRAFT edits: Level 1
  - Root cause submission: Level 2
  - Action plan approval: Level 2 + Supervisor gate
  - Implementation complete (regulated evidence required): Level 3
  - Effectiveness closure: Level 3 + BD-03 QA e-signature (AAL2)
- **AI advisory (E9):** Root cause classification suggestion + similar-CAPA lookup advisory

#### AR-CAPA-J1 (Pharma)
- **Additional state:** QP_EFFECTIVENESS_CONFIRMED (inserted between EFFECTIVENESS_REVIEW and CLOSED; requires QP AAL3 sign-off BD-04)
- **Additional evidence class:** Stability data or re-test results (H4 class: EFFECTIVENESS_EVIDENCE_PHARMA) required at effectiveness review
- **Additional toolbar action:** "QP Confirm Effectiveness" (L1 Level 4; AAL3 e-signature via BD-04)

#### AR-CAPA-J2 (Automotive)
- **Additional fields:** 8D report reference number; customer-impacted (Yes/No); warranty claim linkage
- **Additional link policy:** CAPA can TRIGGER a customer 8D record (if customer-impacted = Yes); 8D record appears in Linked tab with link type TRIGGERED
- **Additional toolbar action:** "Generate 8D Report" (L1 Level 2); auto-populates 8D fields from CAPA data

#### AR-CAPA-J4 (Medical Device)
- **Additional field:** FSCA (Field Safety Corrective Action) required flag; if Yes, triggers additional Evidence class: FSCA Regulatory Filing
- **Additional state:** FSCA_FILED (inserted between IMPLEMENTATION and EFFECTIVENESS_REVIEW when FSCA required flag is Yes)
- **Additional toolbar action:** "File FSCA" (L1 Level 4; routes to regulatory filing sub-workflow)

---

### 4.3 Batch Release (Root: BREL)

#### AR-BREL-J1 (Pharma primary — base is pack-specific)
- **Shell ID:** AR-BREL-J1
- **Root kind:** Batch Release Record (pharma-only root; no BASE variant — BREL is J1-primary)
- **Pack variant:** J1 Pharma
- **Tab configuration:** Tabs 1–7 + EBR tab (§3.1) as primary pack tab
- **State machine:** PENDING_QC → QC_COMPLETE → QP_REVIEW → RELEASED; also REJECTED (from QP_REVIEW); QUARANTINE (system-triggered on any open NC linkage)
- **Key fields:** Batch ID, Product Code, Batch Size, Manufacturing Date, Expiry Date, QP Assigned, QC Result Summary, Release Date, Country Destination
- **Primary toolbar actions:** "Mark QC Complete" (L1 Level 2, QC role gate); "Submit to QP" (Level 2); "QP Release" (Level 4, AAL3 BD-03 e-sig, mandatory reason); "Reject Batch" (Level 4, AAL3 BD-03, mandatory reason + disposition note); "Quarantine" (Level 3, any role with QA access)
- **Friction calibration:**
  - QC data entry: Level 1
  - QC completion: Level 2
  - QP release: Level 4 — highest friction; AAL3 hardware token required; confirmation dialog shows full batch summary + any open NC/deviation links; cannot proceed if any open deviation is BATCH_IMPACTED
  - Quarantine: Level 3
- **Evidence classes (H4):** QC_TEST_RESULTS (required), ENVIRONMENTAL_MONITORING (required), DEVIATION_CLEARANCE (required if any deviation linked), STABILITY_DATA (required for stability-indicating tests), LABEL_RECONCILIATION (required)
- **E-signature BD codes:** BD-03 (QP Batch Release Authorization, AAL3); BD-04 (QP Rejection Authorization, AAL3)
- **AI advisory (E9):** Batch release risk score — highlights any anomalous QC results vs historical baseline

---

### 4.4 Inspection (Root: INSP)

#### AR-INSP-BASE
- **Shell ID:** AR-INSP-BASE
- **Root kind:** Inspection Record
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** SCHEDULED → IN_PROGRESS → PENDING_REVIEW → ACCEPTED / REJECTED; also CANCELLED
- **Key fields:** Inspection ID, Inspection Type (IQC/IPQC/FQC/OBA), Item/Part, Lot Reference, Inspector, Inspection Date, Sampling Plan, Result Summary (PASS/FAIL/CONDITIONAL)
- **Primary toolbar actions:** "Start Inspection" (SCHEDULED→IN_PROGRESS, L1 Level 1); "Submit Results" (IN_PROGRESS→PENDING_REVIEW, Level 2, evidence required); "Accept" (PENDING_REVIEW→ACCEPTED, Level 2, QA gate); "Reject" (PENDING_REVIEW→REJECTED, Level 2, QA gate, reason required); "Cancel" (Level 2, reason required)
- **Friction:** Result submission Level 2 (evidence: measurement records required). Accept/Reject Level 2 + QA role.

#### AR-INSP-J2 (Automotive)
- Inherits AR-INSP-BASE
- **Additional field:** AIAG sampling plan reference; gauge R&R study reference; MSA completed (Yes/No)
- **Additional evidence class:** Measurement System Analysis (MSA) certificate required for dimensional inspections
- **Toolbar addition:** "Trigger LPA" (links to AC-11 LPA Audit Console if inspection result is CONDITIONAL or finding requires process audit)

#### AR-INSP-J3 (Aerospace)
- Inherits AR-INSP-BASE
- **Additional tab:** FAI tab (§3.4) when inspection type = FIRST_ARTICLE
- **Additional evidence class:** AS9102B Form 3 characteristic accountability (bubble extraction result from AI-08)
- **Toolbar addition:** "Link to FAI" button; "Trigger GIDEP" (L1 Level 3) if inspection result reveals safety-critical defect

#### AR-INSP-J4 (Medical Device)
- Inherits AR-INSP-BASE
- **Additional field:** UDI lot linkage; device classification (Class I/II/III); incoming inspection per ISO 13485 §8.4.3
- **Additional evidence class:** CoC (Certificate of Conformance) from supplier required for Class II/III devices
- **Toolbar addition:** "Flag for MDR Triage" if inspection rejection is safety-relevant (routes to AC-08)

---

### 4.5 Controlled Document (Root: CDOC)

#### AR-CDOC-BASE
- **Shell ID:** AR-CDOC-BASE
- **Root kind:** Controlled Document
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → IN_REVIEW → PENDING_APPROVAL → APPROVED → EFFECTIVE → OBSOLETE; also SUPERSEDED_BY (when a new revision is approved)
- **Key fields:** Doc Code, Title, Revision, Doc Type (SOP/WI/FORM/SPEC/PLAN), Owner, Approver, Effective Date, Review Due Date, Language
- **Primary toolbar actions:** "Submit for Review" (DRAFT→IN_REVIEW, L1 Level 1); "Submit for Approval" (IN_REVIEW→PENDING_APPROVAL, Level 2); "Approve" (PENDING_APPROVAL→APPROVED, Level 3, BD-05 AAL2 e-sig + reason); "Activate" (APPROVED→EFFECTIVE, Level 2, date-gated); "Obsolete" (EFFECTIVE→OBSOLETE, Level 3, BD-05, replacement doc required)
- **Friction:** Approval Level 3 (BD-05, role: Approver or above). Obsolescence Level 3 (requires superseding doc reference).
- **Link policy:** CDOC SUPERSEDES / SUPERSEDED_BY links maintained in Linked tab. CDOC can REFERENCE NCases, CAPAs.
- **Version comparison:** History tab version comparison diff is especially important for CDOC (regulatory requirement to track all text changes between revisions)

---

### 4.6 Engineering Change Order (Root: ECO)

#### AR-ECO-BASE
- **Shell ID:** AR-ECO-BASE
- **Root kind:** Engineering Change Order
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → SUBMITTED → IMPACT_ASSESSMENT → APPROVED → IMPLEMENTATION → VERIFICATION → CLOSED; also REJECTED (from any open state)
- **Key fields:** ECO ID, Change Description, Affected Parts/Documents, Change Type (DESIGN/PROCESS/MATERIAL/SUPPLIER), Priority, Originator, Responsible Engineer, Target Implementation Date, Impact Level (LOW/MEDIUM/HIGH/CRITICAL)
- **Primary toolbar actions:** "Submit ECO" (Level 1); "Complete Impact Assessment" (Level 2, impact form in Drawer); "Approve" (Level 3, BD-06 AAL2, cross-functional approval); "Reject" (Level 2, reason required); "Mark Implementation Complete" (Level 2, evidence required); "Verify" (Level 2, verification evidence required); "Close" (Level 2)
- **Friction:** Approval Level 3 (multi-party: Engineering + QA + Production; partial quorum shown in Signatures tab).

#### AR-ECO-J2 (Automotive)
- Inherits AR-ECO-BASE
- **Additional state:** CUSTOMER_NOTIFICATION_SENT (inserted after APPROVED when change is customer-affecting)
- **Additional evidence class:** Customer deviation/approval letter required for customer-affecting changes
- **Toolbar addition:** "Trigger PPAP Revision" (routes to updated PPAP submission — AC-15)

#### AR-ECO-J3 (Aerospace)
- Inherits AR-ECO-BASE
- **Additional field:** ITAR controlled (Yes/No); DO-160/DO-178 qualification impact (Yes/No)
- **Additional state:** AS9100_REVIEW_COMPLETE (review by DER/DAR if qualification impact)
- **Additional evidence class:** DER/DAR review letter required when qualification impact = Yes

---

### 4.7 Job Order (Root: JO)

#### AR-JO-BASE
- **Shell ID:** AR-JO-BASE
- **Root kind:** Job Order (Manufacturing Work Order)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** PLANNED → RELEASED → IN_PROGRESS → PENDING_QC → COMPLETED; also CANCELLED, ON_HOLD
- **Key fields:** JO ID, Product/Assembly, Quantity, BOM Revision, Routing Revision, Work Center, Scheduled Start, Scheduled End, Actual Start, Actual End, Production Status, Yield %
- **Primary toolbar actions:** "Release to Floor" (PLANNED→RELEASED, L1 Level 2, capacity check); "Start Production" (RELEASED→IN_PROGRESS, Level 1, floor operator); "Submit to QC" (IN_PROGRESS→PENDING_QC, Level 1 with evidence — in-process QC records); "Complete" (PENDING_QC→COMPLETED, Level 2, QC sign-off); "Hold" (any→ON_HOLD, Level 2, reason); "Cancel" (Level 3, reason required, lot disposition)
- **AI advisory (E9):** Yield prediction chip in Overview; root-cause suggestion if yield below target

#### AR-JO-J2 (Automotive)
- Inherits AR-JO-BASE
- **Additional field:** Customer order reference (linked SO); AIAG traceability label type; LPA check required (Yes/No based on production schedule)
- **Additional evidence class:** LPA audit record required (if LPA check = Yes) before COMPLETED
- **Toolbar addition:** "Trigger LPA Check" (routes to AC-11)

#### AR-JO-J3 (Aerospace)
- Inherits AR-JO-BASE
- **Additional field:** ITAR controlled (Yes/No); First Article required (Yes/No)
- **Additional tab:** FAI tab (§3.4) when First Article required = Yes
- **Additional state:** FAI_PENDING (inserted between IN_PROGRESS and PENDING_QC when First Article required = Yes)

#### AR-JO-J4 (Medical Device)
- Inherits AR-JO-BASE
- **Additional field:** DHR (Device History Record) completion %; UDI assigned (Yes/No); lot/batch reference
- **Additional evidence class:** DHR completeness required at COMPLETED (100% DHR required)
- **Additional toolbar action:** "View DHR" (opens DHF-like viewer for device history record of this JO)

#### AR-JO-J5 (Food Safety)
- Inherits AR-JO-BASE
- **Additional field:** Production run date/time; CCP monitoring compliance (Yes/No auto-computed from linked CCP records)
- **Additional tab:** HACCP tab (§3.5) — shows CCP monitoring data for this production run
- **Additional state:** CCP_DEVIATION_OPEN (system-set flag triggered when any linked CCP has a deviation; blocks COMPLETED until deviation resolved)

---

### 4.8 Sales Order (Root: SO)

#### AR-SO-BASE
- **Shell ID:** AR-SO-BASE
- **Root kind:** Sales Order
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → SUBMITTED → CONFIRMED → IN_FULFILLMENT → PARTIALLY_SHIPPED → SHIPPED → INVOICED → CLOSED; also CANCELLED, ON_HOLD
- **Key fields:** SO Number, Customer Name, Order Date, Required Ship Date, Total Value (currency via `GraphicsAuthority.tokens.read('currency-format-primary')`), Items Summary (N line items), Fulfillment Status, Payment Terms, Incoterms
- **Primary toolbar actions:** "Submit SO" (Level 1); "Confirm" (Level 2, credit check passed required); "Ship" (Level 2, picking complete + shipping docs); "Invoice" (Level 2, shipping confirmed); "Close" (Level 2); "Cancel" (Level 3, reason + customer notification)
- **Friction:** Cancellation of confirmed SO Level 3 (customer impact). Credit override Level 3 + Finance role.

---

### 4.9 Work Order (Root: WO)

#### AR-WO-BASE
- **Shell ID:** AR-WO-BASE
- **Root kind:** Work Order (Maintenance/Production sub-order)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → SCHEDULED → IN_PROGRESS → PENDING_VERIFICATION → COMPLETED; also CANCELLED
- **Key fields:** WO ID, WO Type (MAINTENANCE/PRODUCTION_SUPPORT/REWORK), Linked JO or MWO, Assigned Technician, Work Center, Estimated Hours, Actual Hours, Task Description, Priority
- **Primary toolbar actions:** "Schedule" (Level 1); "Start" (Level 1); "Submit Completion" (Level 2, task evidence); "Verify" (Level 2, supervisor); "Complete" (Level 2); "Cancel" (Level 2, reason)

#### AR-WO-J2 (Automotive)
- Inherits AR-WO-BASE
- **Additional field:** Tool calibration reference; gauge used; setup approval required (Yes/No)
- **Additional evidence class:** Setup approval record required when setup approval = Yes; calibration cert of gauge required

---

### 4.10 Purchase Order (Root: PO)

#### AR-PO-BASE
- **Shell ID:** AR-PO-BASE
- **Root kind:** Purchase Order
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → SUBMITTED → APPROVED → SENT_TO_SUPPLIER → PARTIALLY_RECEIVED → RECEIVED → INVOICED → CLOSED; also CANCELLED
- **Key fields:** PO Number, Supplier Name, Order Date, Required Delivery Date, Total Value, Line Items Count, Delivery Status, Payment Terms, Supplier QA Status
- **Primary toolbar actions:** "Submit PO" (Level 1); "Approve" (Level 2, Procurement role + spend limit gate — over-limit requires Finance Level 3); "Send to Supplier" (Level 2); "Record Receipt" (Level 1, Receiving); "Invoice Match" (Level 2, Finance); "Close" (Level 2); "Cancel" (Level 3)
- **Friction:** High-value PO approval (over configured threshold): Level 3 + Finance e-signature BD-07.

---

### 4.11 Lot/Batch (Root: LOT)

#### AR-LOT-BASE
- **Shell ID:** AR-LOT-BASE
- **Root kind:** Lot/Batch Traceability Record
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** QUARANTINE → RELEASED → CONSUMED; also RECALLED
- **Key fields:** Lot ID, Product Code, Quantity, Unit of Measure, Manufacturing Date, Expiry Date, Origin (internal/external), Quality Status, Traceability Chain completeness %
- **Primary toolbar actions:** "Release Lot" (Level 2, QA role, inspection evidence required); "Quarantine" (Level 2, any QA); "Recall" (Level 4, BD-22, QA Director + Regulatory role, mandatory documentation)
- **Friction:** Recall is Level 4 — maximum friction; requires dual AAL3 signatures per BD-22.

#### AR-LOT-J1 (Pharma)
- Inherits AR-LOT-BASE
- **Additional tab:** EBR tab (§3.1)
- **Additional state:** QP_RELEASED (inserted between RELEASED and CONSUMED; QP sign-off required for pharma lots before shipment — BD-03)
- **Additional evidence classes:** All J1 batch release evidence classes propagated from AR-BREL-J1
- **Merkle anchor:** Required for GMP lots — History tab shows Merkle anchor status

#### AR-LOT-J4 (Medical Device)
- Inherits AR-LOT-BASE
- **Additional tab:** DHF tab context: shows relevant DHF sections for the device in this lot
- **Additional field:** GUDID DI/PI (unique device identifier); EUDAMED Basic UDI-DI
- **Toolbar addition:** "Submit to GUDID" (Level 2, Regulatory role); "Sync EUDAMED" (Level 2)

#### AR-LOT-J5 (Food Safety)
- Inherits AR-LOT-BASE
- **Additional tab:** HACCP tab (§3.5) — CCP monitoring compliance for this lot's production run
- **Additional field:** FSMA §204 traceability data completeness %
- **Toolbar addition:** "Export FSMA §204 Report" (generates traceability report as required by FSMA §204(d))

---

### 4.12 Maintenance Work Order (Root: MWO)

#### AR-MWO-BASE
- **Shell ID:** AR-MWO-BASE
- **Root kind:** Maintenance Work Order
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** PLANNED → SCHEDULED → IN_PROGRESS → PENDING_VERIFICATION → COMPLETED; also CANCELLED, DEFERRED
- **Key fields:** MWO ID, MWO Type (PREVENTIVE/CORRECTIVE/PREDICTIVE), Asset ID + Asset Name, Assigned Technician, Scheduled Date, Priority (CRITICAL/HIGH/MEDIUM/LOW), EHS Permit Required (Yes/No), Downtime Impact (Yes/No)
- **Primary toolbar actions:** "Schedule" (Level 1); "Start Work" (Level 1 — if EHS permit required, permit must be attached first); "Submit Completion" (Level 2, task evidence + parts used); "Verify" (Level 2, supervisor); "Defer" (Level 2, reason + new scheduled date); "Cancel" (Level 2, reason)
- **Friction:** EHS permit gate: if EHS permit required and permit evidence not attached, "Start Work" button is disabled with explanation banner. Critical asset MWO completion: Level 3.

---

### 4.13 Training Record (Root: TRAIN)

#### AR-TRAIN-BASE
- **Shell ID:** AR-TRAIN-BASE
- **Root kind:** Training Record (individual trainee × training topic × session)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** ASSIGNED → IN_PROGRESS → PENDING_SIGN_OFF → COMPLETED; also EXPIRED (system-set when validity window lapses), WAIVED
- **Key fields:** Training Record ID, Trainee Name, Training Topic, Training Type (CLASSROOM/OJT/E-LEARNING/READ-AND-SIGN), Trainer, Session Date, Validity Period, Expiry Date, Score (if applicable), Competency Level
- **Primary toolbar actions:** "Mark In Progress" (Level 1, trainee); "Submit for Sign-Off" (Level 1, trainee); "Sign Off" (Level 2, trainer role, BD-08 AAL2); "Waive" (Level 3, Supervisor + reason + alternative evidence); "Expire" (system-automatic; manual expire available at Level 3 for Admin)
- **Friction:** Sign-off Level 2 (trainer e-signature BD-08). Bulk sign-off via AC-18.
- **AI advisory (E9):** Training gap analysis chip — shows other training records for this trainee that are approaching expiry or are missing for their current role.

---

### 4.14 Internal Audit Review (Root: IREV)

#### AR-IREV-BASE
- **Shell ID:** AR-IREV-BASE
- **Root kind:** Internal Audit Review Record
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** PLANNED → IN_PROGRESS → DRAFT_REPORT → REPORT_REVIEW → REPORT_ISSUED → CLOSED
- **Key fields:** Audit ID, Audit Type (SYSTEM/PROCESS/PRODUCT), Audit Scope, Lead Auditor, Audit Team, Scheduled Date, Actual Date, Finding Count (MAJOR/MINOR/OFI), Report Issue Date
- **Primary toolbar actions:** "Open Audit" (Level 1); "Submit Draft Report" (Level 2); "Issue Report" (Level 3, BD-09 Lead Auditor sign, AAL2); "Close" (Level 2, all findings resolved or linked to open CAPAs); "Cancel" (Level 2, reason)
- **Evidence classes:** Audit checklists (required), Objective evidence samples (required), Opening/closing meeting attendance (required)
- **Linked tab behavior:** IREV TRIGGERS one CAPA per MAJOR finding; CAPAs appear in Linked tab as TRIGGERED records

---

### 4.15 Customer Purchase Order (Root: CPO)

#### AR-CPO-BASE
- **Shell ID:** AR-CPO-BASE
- **Root kind:** Customer Purchase Order (inbound order from customer)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** RECEIVED → ACKNOWLEDGED → CONFIRMED → IN_PRODUCTION → PARTIALLY_SHIPPED → SHIPPED → INVOICED → CLOSED; also CANCELLED, DISPUTED
- **Key fields:** CPO Number, Customer Name, Customer PO Reference, Order Date, Required Delivery Date, Line Items, Total Value, Linked SO (internal sales order), OTIF Status (On-Time In-Full)
- **Primary toolbar actions:** "Acknowledge" (Level 1, auto-acknowledge option configurable); "Confirm" (Level 2, capacity + inventory check); "Create Linked SO" (Level 1, auto-creates SO from CPO); "Mark Disputed" (Level 2, reason); "Close" (Level 2)

---

### 4.16 Quote (Root: QUO)

#### AR-QUO-BASE
- **Shell ID:** AR-QUO-BASE
- **Root kind:** Quote/Quotation
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SENT → WON / LOST / EXPIRED
- **Key fields:** Quote ID, Customer, Quote Date, Valid Until, Line Items, Total Value, Discount %, Probability %, Sales Rep, Status
- **Primary toolbar actions:** "Submit Quote" (Level 1); "Approve" (Level 2, Sales Manager + margin gate — below-minimum-margin requires Finance Level 3 override); "Send to Customer" (Level 2); "Mark Won" (Level 1); "Mark Lost" (Level 1, reason/reason code); "Expire" (system-automatic)
- **Friction:** Below-margin approval Level 3 + Finance role.

---

### 4.17 Supplier/Vendor Record (Root: PREC)

#### AR-PREC-BASE
- **Shell ID:** AR-PREC-BASE
- **Root kind:** Supplier/Vendor Master Record (Procurement)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7
- **State machine:** PENDING_QUALIFICATION → QUALIFIED → PREFERRED → CONDITIONALLY_APPROVED → DISQUALIFIED; also SUSPENDED
- **Key fields:** Supplier ID, Supplier Name, Country, Supplier Category, Qualification Status, Last Audit Date, Next Audit Due, Quality Score, Spend YTD, SCAR Count (open)
- **Primary toolbar actions:** "Qualify" (Level 3, QA + Procurement, BD-10 dual sign-off); "Prefer" (Level 2); "Suspend" (Level 3, reason, immediate effect); "Disqualify" (Level 4, BD-10 + BD-11 dual sign-off, mandatory reason + corrective action plan); "Reinstate" (Level 4 from DISQUALIFIED)
- **Linked tab:** All SCARs issued to this supplier; all POs linked; last audit record
- **AI advisory (E9):** Supplier risk score chip (delivery performance + quality score + SCAR trend)

---

### 4.18 Dispatch Board Item (Root: DISP)

#### AR-DISP-BASE
- **Shell ID:** AR-DISP-BASE
- **Root kind:** Dispatch Board Item (production scheduling unit)
- **Pack variant:** Base
- **Tab configuration:** Tabs 1–7 (though the primary DISP surface is the WS workspace; the AR shell is for individual dispatch item deep-dive)
- **State machine:** QUEUED → ASSIGNED → IN_PROGRESS → COMPLETED; also DEFERRED, CANCELLED
- **Key fields:** Dispatch Item ID, Linked JO, Work Center, Assigned Operator, Scheduled Start, Scheduled End, Priority Rank, Setup Time, Run Time, WIP Status
- **Primary toolbar actions:** "Assign Operator" (Level 1, Supervisor); "Start" (Level 1, Operator); "Defer" (Level 2, reason + new slot); "Complete" (Level 1, Operator + in-process QC link); "Cancel" (Level 2, reason)
- **Freshness SLO:** DISP records are high-frequency; live-mode SLO is 15 seconds for mutable states (QUEUED, ASSIGNED, IN_PROGRESS). ETag pushes via E5 drive real-time updates.
- **Friction:** DISP actions are generally low-friction (shop floor usage). Priority re-rank of QUEUED items by Supervisor: Level 2.

#### AR-DISP-J2 (Automotive overlay)
- **Shell ID:** AR-DISP-J2
- **Root kind:** Dispatch Board Item — Automotive
- **Pack variant:** J2 Automotive
- **Additional behavior:** KANBAN signal field visible (REPLENISHMENT / PRODUCTION / WITHDRAWAL); links to EDI 830 DELFOR schedule entry that generated this dispatch; OEM production number field displayed in header bar; hourly takt-time deviation chip in Summary tab shows whether current throughput is within IATF production tracking tolerance.

#### AR-DISP-J5 (Food Safety overlay)
- **Shell ID:** AR-DISP-J5
- **Pack variant:** J5 Food Safety
- **Additional behavior:** CCP monitoring chip in Summary tab — if the associated production line has active CCP records, their real-time status (IN_CONTROL / NEAR_LIMIT / OUT_OF_CONTROL) is shown inline. Line clearance pre-requisite gate: "Start" action is blocked if line clearance checklist (CCP plan) is not APPROVED for this batch run.

---

### 4.19 Training Record (Root: TRAIN) — Pack Overlays

#### AR-TRAIN-J1 (Pharma)
- **Shell ID:** AR-TRAIN-J1
- **Pack variant:** J1 Pharmaceutical
- **Additional behavior:** GMP training effectiveness indicator in Summary tab: shows assessment score vs. minimum passing threshold (site-configurable per SOP requirement). "Retraining Required" flag is automatically set when NC record linked to the same SOP is closed with root cause = human error. Evidence tab requires EC-15 (training completion certificate) before record can reach COMPLETE state.

#### AR-TRAIN-J4 (Medical Device)
- **Shell ID:** AR-TRAIN-J4
- **Pack variant:** J4 Medical Device
- **Additional behavior:** IEC 62366 usability training competency badge displayed in header if operator has completed device-specific usability training. DHF reference link shown in Summary tab (training record contributes to DHF training section per ISO 13485 §6.2). Role Reviewer must be a designated PRRC or QA manager per EU MDR Article 15.

---

### 4.20 Controlled Document (Root: CDOC) — Pack Overlays

#### AR-CDOC-J1 (Pharma)
- **Shell ID:** AR-CDOC-J1
- **Pack variant:** J1 Pharmaceutical
- **Additional behavior:** EU GMP Annex 11 §8 data integrity status badge on document revision. "QP Review Required" flag appears for SOPs covering sterile manufacturing or packaging operations. Periodic review due-date chip drives H6 periodic review cadence (typically 2-year mandatory re-approval per EU GMP). Evidence tab requires EC-07 (review record) at each re-approval.

#### AR-CDOC-J4 (Medical Device)
- **Shell ID:** AR-CDOC-J4
- **Pack variant:** J4 Medical Device
- **Additional behavior:** Document type classification chip (Technical File / DHF / IFU / Label / Risk Management) displayed in header. IFU documents show per-language publication status (24 EU locales for EU MDR Annex II compliance; links to translation review log). EUDAMED UDI-DI association field visible for device-specific IFUs.

---

### 4.21 Purchase Order (Root: PO) — Pack Overlays

#### AR-PO-J1 (Pharma)
- **Shell ID:** AR-PO-J1
- **Pack variant:** J1 Pharmaceutical
- **Additional behavior:** Supplier qualification status chip in Summary tab (QUALIFIED / CONDITIONAL / DISQUALIFIED sourced from supplier record). CoA requirement field: if checked, evidence tab requires EC-22 (Certificate of Analysis) before receipt can be closed. GMP API importation batch: links to FC-013 (Foreign Certificate Import) supplemental section.

#### AR-PO-J2 (Automotive)
- **Shell ID:** AR-PO-J2
- **Pack variant:** J2 Automotive
- **Additional behavior:** PPAP requirement chip: if supplier is PPAP-required, shows PPAP run@rate status. EDI 850/860 exchange history panel in Summary tab (shows outbound 850, any inbound 855 acknowledgement, any 860 change orders). OEM-specific PO number field per customer-specific requirement (CSR overlay).

---

### 4.22 Maintenance Work Order (Root: MWO) — Pack Overlays

#### AR-MWO-J1 (Pharma)
- **Shell ID:** AR-MWO-J1
- **Pack variant:** J1 Pharmaceutical
- **Additional behavior:** Equipment qualification status chip: IQ/OQ/PQ status for the equipment being maintained. Calibration certificate linkage: Evidence tab requires EC-24 (calibration record) post-maintenance before equipment can re-enter production. Change control trigger: if the MWO modifies a validated process parameter, a change control record (CPO) is automatically linked and must reach APPROVED before MWO can close.

#### AR-MWO-J4 (Medical Device)
- **Shell ID:** AR-MWO-J4
- **Pack variant:** J4 Medical Device
- **Additional behavior:** Device risk class chip in header (Class I / II / III). For Class III equipment: maintenance completion requires two-person sign-off (E7 AAL2 quorum). Regulatory impact assessment field: tracks whether maintenance affects a validated process relevant to the 510(k) or CE marking technical file. Maintenance record contributes to DHF §6 production and process controls evidence.

---

### 4.23 Internal Review (Root: IREV) — Pack Overlays

#### AR-IREV-J1 (Pharma)
- **Shell ID:** AR-IREV-J1
- **Pack variant:** J1 Pharmaceutical
- **Additional behavior:** Annex 11 §11 periodic review section visible: shows previous review date, system validation status at time of review, any deviations opened since last review. QP sign-off required (E7 AAL2) to close the review record. Annual Product Review (APR) trigger: if IREV scope covers a product, completion automatically queues an APR task for the responsible QA.

#### AR-IREV-J4 (Medical Device)
- **Shell ID:** AR-IREV-J4
- **Pack variant:** J4 Medical Device
- **Additional behavior:** Post-Market Surveillance (PMS) plan linkage: IREV of a medical device product shows PMS plan completion status and links to PSUR if due. EUDAMED event log panel in Summary tab: regulatory events (vigilance reports, FSCAs) since last review period shown inline. Clinical Evaluation Report (CER) review status chip (CURRENT / UPDATE_DUE / OVERDUE).

---

## 5. Per-State UI Specifications

Each AR shell renders differently depending on the data availability state. States are orthogonal to the record's lifecycle state (which is a domain concept); these are UI rendering states.

### 5.1 Loading State

- **Visual indicator:** Full-panel skeleton layout — skeleton bars for record header, state chip, key fields, and tab labels; skeleton bars use CSS animation `var(--skeleton-animation)` (shimmer); no real data rendered
- **Banner:** None (skeleton implies loading without a banner to avoid double indication)
- **User actions available:** None; action toolbar is hidden; tab navigation is disabled
- **ARIA announcement:** `aria-live="polite"` region announces "Loading {record type} record…" on mount; spinner has `aria-label="Loading"`
- **Timeout behavior:** If loading exceeds 8 seconds, transitions to Degraded state with a specific network-error banner

### 5.2 Empty State

- **Visual indicator:** Empty state illustration (SVG, color tokens `--empty-state-icon-color`) + heading + sub-text; no skeleton
- **When triggered:** When E4 returns 404 (record not found) or the record ID is invalid
- **Banner text:** "Record not found" / sub-text "The {record type} record {ID} does not exist or has been deleted."
- **Color token:** `--banner-error-bg`, `--banner-error-text`
- **User actions available:** "Go back" button (browser history back); "Search records" link to WS workspace
- **ARIA announcement:** `role="alert"`, `aria-label="Record not found: {record type} {ID}"`

### 5.3 Partial-Access State

- **Visual indicator:** Record renders normally but fields/sections the user cannot access are replaced with a lock icon + "Access restricted" label (using token `--field-restricted-bg`); banner below the record header
- **When triggered:** E4 returns 200 but with `access_scope: partial` in the response meta; or ITAR-restricted fields when user lacks ITAR clearance
- **Banner text:** "You have partial access to this record. Some fields are restricted." (token `--banner-warning-bg`)
- **User actions available:** Full actions for unrestricted fields; restricted-field actions hidden; "Request Access" link shown if access request workflow is configured
- **ARIA announcement:** `aria-live="polite"` announces "Partial access: some fields in this record are restricted" on mount

### 5.4 Degraded State

- **Visual indicator:** Record renders with last-known data from browser cache; a prominent sticky banner at the top of the shell
- **When triggered:** E5 WebSocket disconnected AND E4 re-fetch fails (network error or server error ≥500); or loading timeout exceeded
- **Banner text:** "Live data unavailable — showing cached data as of {last-fetch-time}. Retry?" (token `--banner-degraded-bg`, `--banner-degraded-text`)
- **Color token:** `--banner-degraded-bg` (amber/warning tone, never hardcoded hex)
- **User actions available:** Read-only; all write actions (edit, state transitions, sign) are disabled with tooltip "Cannot perform actions while disconnected"; "Retry" button attempts E4 re-fetch
- **ARIA announcement:** `role="alert"`, `aria-label="Degraded mode: showing stale data. Live connection unavailable."`

### 5.5 Live-Mode State

- **Visual indicator:** Small green "LIVE" indicator badge in the record header strip (token `--badge-live-bg`, `--badge-live-text`); no banner needed — this is the normal healthy state
- **When triggered:** E4 fetch succeeded + E5 WebSocket connected and receiving heartbeats
- **Banner:** None
- **User actions available:** All role-appropriate actions enabled
- **ARIA announcement:** No announcement on enter (normal state); if transitioning from Degraded to Live: `aria-live="polite"` announces "Live data restored."

### 5.6 Fixture-Mode State

- **Visual indicator:** Prominent top banner "FIXTURE DATA — Not live. Development/prototype mode." (token `--banner-fixture-bg`); all record data sourced from `tests/fixtures/module-template-v4/**`; banner is permanent and cannot be dismissed
- **When triggered:** `HMV4_FIXTURE_MODE=true` feature flag is active (development/prototype use only; never active in any deployed context)
- **Banner text:** "FIXTURE DATA — Development/prototype only. Record changes are not persisted." (token `--banner-fixture-bg`, color in warm amber range)
- **User actions available:** All UI actions available for testing; writes are no-op (intercepted by fixture bridge in `72-module-template-v4-bridge.js`); console warning logged on every write attempt
- **ARIA announcement:** `role="status"`, `aria-label="Fixture mode active: data is not real"`

---

## 6. Conflict-Resolution UI (ETag Mismatch — HTTP 412)

When a user submits an edit (PATCH) or state transition (POST) and the server returns HTTP 412 Precondition Failed (ETag mismatch), the conflict-resolution UI is triggered. This means another user or system process modified the record between when the current user loaded it and when they attempted to save.

### 6.1 Conflict Dialog

A modal dialog is presented (not dismissible by clicking outside — requires an explicit choice):

**Title:** "Record Updated by Another User"
**Body:** "This record was modified by {conflicting user display name} at {conflict timestamp — formatted per locale}. Your changes have not been saved. Choose how to proceed:"

**Dialog layout:**
- Conflict metadata strip: shows conflicting editor's name, avatar, timestamp
- Field-level diff table: two-column comparison

| Field | Your Change | Server Version |
|-------|------------|----------------|
| {field label} | {your value (styled with token `--conflict-local-value-bg`)} | {server value (styled with token `--conflict-server-value-bg`)} |

- Only fields that differ (local vs server) are shown; identical fields are collapsed
- If the same field was changed by both: row is highlighted with `--conflict-collision-bg` and labeled "BOTH CHANGED"

### 6.2 Resolution Options

Three options are presented as buttons:

**Option A — Discard Local Changes**
- Label: "Discard My Changes"
- Effect: Fetches fresh record from E4 (bypasses cache, forces ETag refresh); local dirty state is cleared; form resets to server version
- Friction: Level 1 (single confirm) — this is a safe operation
- ARIA: `aria-label="Discard my changes and reload the server version"`

**Option B — Field-Level Merge**
- Label: "Merge Changes"
- Available only when there are no BOTH CHANGED fields (i.e., the fields changed locally and the fields changed on server do not overlap)
- Effect: Applies local changes on top of server version; re-submits PATCH with updated ETag; if merge succeeds, conflict dialog closes and record shows merged state
- If BOTH CHANGED fields exist: this button is disabled with tooltip "Merge not available — the same fields were changed by both parties"
- Friction: Level 1 — clearly explained
- ARIA: `aria-label="Merge non-conflicting fields and save"`

**Option C — Force Override**
- Label: "Override with My Changes"
- Available only to roles: Supervisor, QA, Admin (not Contributor or Viewer)
- Effect: Re-submits PATCH with `X-Force-Override: true` header + mandatory reason text input (reason text box appears inline in the dialog before confirm)
- Friction: Level 3 — requires role gate + reason text + secondary confirm ("Are you sure you want to override changes made by {user}?")
- Audit event: `EC-22 conflict_resolution` event is emitted with: resolution_type=FORCE_OVERRIDE, reason text, conflicting user, ETag diff, timestamp
- ARIA: `aria-label="Force override: replace server version with my changes — requires reason"`

### 6.3 EC-22 Audit Event

On all three resolution paths, an `EC-22 conflict_resolution` audit event is emitted via `POST /api/v1/audit/{root}/{id}/events` with:
```json
{
  "event_type": "conflict_resolution",
  "resolution": "DISCARD_LOCAL | MERGE | FORCE_OVERRIDE",
  "local_etag": "...",
  "server_etag": "...",
  "conflicting_user_id": "...",
  "conflict_timestamp": "...",
  "reason": "..." // only for FORCE_OVERRIDE
}
```

This event appears in the History tab audit stream.

---

## 7. Friction Calibration per L1 §6

Friction levels are applied uniformly across all AR instances. The calibration below governs what UI mechanism enforces each level.

### Level 0 — View Only
- **Trigger:** Any read action (navigating tabs, viewing fields, exporting read-only reports)
- **UI mechanism:** No friction; direct rendering
- **Applicable to:** All roles for read operations on any tab

### Level 1 — Routine Edit
- **Trigger:** Field edits on non-regulated fields; attaching non-regulated attachments; adding REFERENCE links; routine state transitions in non-regulated workflows
- **UI mechanism:** Single save button; no confirmation dialog; dirty indicator; form validation on submit
- **Example actions:** Edit description field on NQCASE, Mark DISP item In Progress, Add comment in Activity tab

### Level 2 — State Transition or Consequential Edit
- **Trigger:** Any state transition; edits to regulated fields; deleting non-WORM-locked items; high-impact routing decisions
- **UI mechanism:** Confirmation dialog with: summary of what will change, reason text field (required if transition is reason-required), confirm button labeled with the action name (not just "OK"), cancel button
- **Dialog design:** Confirm button uses token `--button-confirm-bg`; not dismissible by clicking outside
- **Example actions:** "Record Disposition" on NQCASE, "Submit for Approval" on CDOC, "Release Lot" on LOT

### Level 3 — Regulated Decision
- **Trigger:** Approvals by role-gated users; actions with regulatory significance; multi-party coordination actions; force-override in conflict resolution
- **UI mechanism:** Re-authentication prompt (AAL2 — password re-entry or OTP); reason text required (minimum 20 characters enforced); pre-action checklist shown (operator confirms they have reviewed required evidence); confirmation dialog naming the regulatory consequence
- **Example actions:** "Approve CDOC" (BD-05), "Approve CAPA Effectiveness" (BD-03), "Qualify Supplier" (BD-10), "Disqualify Supplier" (BD-10+BD-11)

### Level 4 — Multi-Party Regulated Decision (BD code quorum)
- **Trigger:** Actions requiring multiple named signatories (BD code quorum); QP batch release; lot recall; force-override by Admin on regulated records
- **UI mechanism:** Full E7 e-signature quorum UI in Signatures tab; hardware token indicator if AAL3 required; quorum progress bar (N of M signed); each signatory signs independently; record is locked against other state changes until quorum is complete or quorum is cancelled
- **BD codes in this tier:** BD-03 (QP Batch Release, AAL3), BD-04 (QP Batch Rejection, AAL3), BD-22 (Lot Recall Authorization, AAL3 + dual), BD-10+BD-11 (Supplier Disqualification)
- **Example actions:** QP Release (AR-BREL-J1), Lot Recall (AR-LOT-BASE), Supplier Disqualification (AR-PREC-BASE)

---

`S3-09_F5_AUTHORITATIVE_RECORD_DEEP_UPGRADE_COMPLETE`
