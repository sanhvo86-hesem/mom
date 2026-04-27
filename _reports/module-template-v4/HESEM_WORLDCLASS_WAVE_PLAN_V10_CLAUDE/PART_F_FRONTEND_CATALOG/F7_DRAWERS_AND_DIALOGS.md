# F7 — Drawers and Dialogs (NRD Pattern)

## Core NRD Discipline

NRD (Non-Routed Dialog/Drawer) denotes every temporary overlay surface —
side drawers, modal dialogs, bottom sheets, toast/snack notifications —
that appears above the current route without triggering a URL navigation.

### Universal rules (no exceptions across all NRD types)

- **No route change on open.** If a specific NRD state must be deep-linkable
  (e.g. a shared link to an error detail), encode state as a URL hash
  parameter (`#nrd=error-detail&trace=<id>`), never as a pathname segment.
- **Atomic interaction.** The user either completes the NRD flow or cancels
  it. No partial persistence is allowed while the NRD is open. Draft state
  lives only in memory (or a designated draft LRO for multi-field Quick-Edit).
- **No direct mutation.** All writes travel through domain API endpoints
  (E3 record create/update, E4 field patch, E7 e-signature, E12 file upload,
  etc.). The NRD never calls a database helper directly.
- **Keyboard-first.** Every interactive element inside an NRD must be
  reachable by Tab, Shift+Tab, and arrow keys. All primary actions must have
  a keyboard shortcut displayed in the button label or tooltip.
- **ESC always closes** — except `role=alertdialog` variants explicitly
  marked non-dismissible (NRD-02 in critical mode, NRD-12). In those cases
  the user must read and acknowledge before closing.
- **Focus trap.** While an NRD is open, keyboard focus is confined to the
  NRD container per WAI-ARIA 1.2 dialog pattern (WCAG 2.1 SC 2.1.2). On
  close, focus returns to the element that triggered the NRD.
- **Scroll lock.** Document body scroll is locked (`overflow: hidden` on
  `<body>`) while any NRD is open. Scroll inside the NRD's own content zone
  is unaffected.
- **ARIA contract.**
  - Dialogs: `role="dialog"`, `aria-modal="true"`,
    `aria-labelledby="<nrd-id>-title"`.
  - Alert dialogs: `role="alertdialog"`, `aria-modal="true"`,
    `aria-labelledby="<nrd-id>-title"`, `aria-describedby="<nrd-id>-body"`.
  - All interactive controls carry `aria-label` or `aria-labelledby`.
  - Toasts use `role="status"` (polite) or `role="alert"` (assertive).
- **Backdrop.** Semi-opaque overlay (`--color-backdrop` token, 56% opacity)
  sits between the page and the NRD. Clicking the backdrop closes dismissible
  NRDs; for non-dismissible ones the backdrop is present but click-through is
  blocked.
- **Graphics Authority compliance.** No hardcoded hex, px, or font strings.
  All visual parameters resolved via `window.GraphicsAuthority.tokens.read()`
  or the corresponding CSS custom property.
- **Edge/glove-mode override.** When `HMV4_EDGE_GLOVE_MODE=true`, every NRD
  renders as a full-width bottom sheet regardless of its default visual
  format. Touch targets expand to `--touch-target-lg` (48 dp minimum).

---

## NRD Catalog

---

### NRD-01 — Confirmation Dialog

**Purpose:** Prevent accidental destructive or irreversible actions by forcing
an explicit acknowledgement step.

| Attribute | Value |
|-----------|-------|
| Visual format | Centered modal |
| Size | `width: --dialog-sm` (480 px equivalent token); height: auto, max 60 vh |
| Dismissible | ESC + backdrop click (unless action is non-reversible and `force_ack: true` is set by the caller) |
| ARIA role | `dialog` |

**Required content zones:**
1. **Header** — action title (e.g. "Delete Nonconformance Case") + close button (×).
2. **Consequence block** — bulleted list of what will be permanently changed
   or lost. Minimum one consequence item required; the NRD refuses to open
   with an empty list.
3. **Affected record chip** — record ID + record type badge so user can
   confirm they are acting on the right object.
4. **Footer** — two buttons: `Cancel` (secondary, left) and `Confirm` (danger
   variant, right). Button label mirrors the action title verb (e.g.
   "Delete", "Void", "Archive").

**Data binding:** Caller passes `{ action_key, record_id, record_type,
consequences: string[] }`. No API call on open. On Confirm: caller's
registered `onConfirm(record_id)` handler fires, which issues the
destructive API call; NRD closes and shows a toast (NRD-toast-success or
NRD-toast-error).

**Validation:** None on open. On Confirm: if `force_ack: true`, an inline
checkbox "I understand this action cannot be undone" must be checked before
the Confirm button activates.

**WCAG 2.2 SC:** 3.3.4 (Error Prevention — Reversible). Confirm button
disabled until consequence block has been scrolled into view when content
height exceeds 320 px.

**Portal variants:**
- Auditor/Inspector portal: Confirmation dialog still shown (read-only sessions
  should never reach destructive triggers; if reached, NRD fires but Confirm
  calls an endpoint that returns 403 immediately).
- Customer portal: not applicable (no destructive actions exposed).

---

### NRD-02 — Error Detail Dialog

**Purpose:** Surface structured error information from RFC 9457 Problem Details
responses to users and support personnel.

| Attribute | Value |
|-----------|-------|
| Visual format | Centered modal |
| Size | `width: --dialog-md` (640 px token); height: auto, max 80 vh |
| Dismissible | ESC + backdrop click (recoverable errors); non-dismissible when `severity: critical` and `retry_blocked: true` |
| ARIA role | `alertdialog` |

**Required content zones:**
1. **Severity badge** — color-coded chip: `info` / `warning` / `error` /
   `critical`; icon from the token-defined icon set.
2. **Title** — human-readable `title` from RFC 9457 body.
3. **Detail** — `detail` field rendered as plain text; code blocks for
   technical details wrapped in `<code>` with `--font-mono` token.
4. **Error code** — `type` URI or internal error code displayed as copyable
   monospace chip.
5. **Trace ID** — `trace_id` extension field; copy-to-clipboard button;
   displayed as `TRC-<uuid-short>`.
6. **Instance link** — if `instance` URI is present, rendered as a
   "View incident" link (opens in new tab).
7. **Retry action** — if `retry_path` extension field is set, a "Retry"
   button fires the original request again; disabled when `retry_blocked: true`.
8. **Support block** — "Report to support" button copies a pre-formatted
   support payload (trace_id + error code + timestamp + user ID) to clipboard.

**Data binding:** Populated entirely from the HTTP error response body. No
secondary API call. NRD is triggered by the global response interceptor in
`HMV4Bridge` when status ≥ 400.

**Validation:** None. Read-only display.

**WCAG 2.2 SC:** 3.3.1 (Error Identification); 3.3.3 (Error Suggestion).

---

### NRD-03 — E-Signature Dialog

**Purpose:** Collect a legally-binding electronic signature as part of the
E7 challenge-factor-compose flow for regulated state transitions.

| Attribute | Value |
|-----------|-------|
| Visual format | Centered modal |
| Size | `width: --dialog-lg` (720 px token); height: auto, max 90 vh |
| Dismissible | ESC (cancels signature; state transition is aborted) |
| ARIA role | `dialog` |

**Required content zones:**
1. **AAL Indicator** — badge showing required Authentication Assurance Level
   (`AAL1` / `AAL2` / `AAL3`). Color and text resolved from
   `GraphicsAuthority.tokens.read('aal-indicator-<level>')`.
2. **Manifestation text** — regulatory statement the signatory is attesting to,
   rendered verbatim from the BD (Binding Decision) code manifest. Language
   matches current locale (`i18n` token). Minimum two supported languages for
   regulated records (e.g. EN + VI for domestic; EN + FR for EU J4 records).
3. **Reason-for-signature** — read-only label from the BD code definition
   (e.g. "QA Release Approval", "Pharmacovigilance Officer Review").
4. **BD code chip** — displays the `bd_code` (e.g. `BD-3`, `BD-22`) so the
   signatory knows exactly which binding decision is being recorded.
5. **Credential input** — username field (pre-filled, read-only) + password
   field (never pre-filled). For AAL3: hardware token OTP field replaces
   password; prompt text: "Enter your hardware token code".
6. **Quorum progress** — if this signature is part of a multi-signatory
   quorum, a progress indicator shows `n of m signatures collected`.
7. **Submit / Cancel buttons.**

**Data binding:** E7 `POST /api/v1/esig/challenge-compose`. Response
contains `challenge_token`. On credential submit: `POST
/api/v1/esig/verify` with `{ challenge_token, credential }`. On success:
NRD closes, state transition proceeds. On failure: inline error (not NRD-02;
errors are in-NRD to avoid focus loss during a critical flow).

**Validation:**
- Password/OTP field required before Submit activates.
- Three consecutive failures lock the dialog and fire NRD-02 (error detail)
  with `retry_blocked: true`.

**WCAG 2.2 SC:** 3.3.4 (Error Prevention); 1.3.5 (Identify Input Purpose).

**Per-pack variants:**
- J1 (pharma): Manifestation text includes GxP statement per 21 CFR §11.50.
- J4 (medtech): Manifestation text includes MDR/IVDR statement.
- J3 (aerospace): ITAR data handling notice appended when record carries
  ITAR classification.
- J5 (food): FSMA PCQI statement appended.

---

### NRD-04 — Reason-for-Change Drawer

**Purpose:** Capture a documented rationale before any regulated state
transition executes — stored as an EC-24 annotation.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-md` (420 px token); full viewport height |
| Dismissible | ESC (aborts transition; no annotation stored) |
| ARIA role | `dialog` |

**Required content zones:**
1. **Transition context block** — current record ID, current state → proposed
   next state (rendered as a state arrow chip).
2. **Category select** — dropdown; options loaded from
   `GET /api/v1/change-categories?domain=<domain>`. Categories include:
   `Correction`, `Preventive Action`, `Customer Request`, `Regulatory
   Requirement`, `Process Improvement`, `Other`.
3. **Reason text area** — free text, minimum 20 characters, maximum 2000.
   Character counter displayed. `aria-required="true"`.
4. **Affected documents** — optional multi-chip input: user can tag related
   doc codes that prompted the change.
5. **Regulatory citation** — optional free text (e.g. "21 CFR 211.100 (a)");
   shown only when the pack has `regulatory_citations_required: true`.
6. **Submit / Cancel buttons.**

**Data binding:** On submit: `POST /api/v1/annotations` with
`{ record_id, annotation_type: "EC-24", category, reason_text,
affected_docs, regulatory_citation }`. After 201 response, state transition
API call is released.

**Validation:** Category required; reason text minimum length enforced inline
(not on submit). Submit button disabled until both fields pass.

**WCAG 2.2 SC:** 3.3.2 (Labels or Instructions); 3.3.1 (Error
Identification).

---

### NRD-05 — Quick-Edit Drawer

**Purpose:** Allow inline editing of 1–5 fields on a record without
navigating to the full edit view.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-md` (420 px token); height auto up to full viewport |
| Dismissible | ESC (discards unsaved changes after confirmation via NRD-01 if dirty) |
| ARIA role | `dialog` |

**Required content zones:**
1. **Record identity bar** — record ID badge + record type chip at top;
   read-only.
2. **ETag display** — current ETag shown as `v<n>` chip; tooltip explains
   optimistic concurrency.
3. **Field editors** — up to 5 fields rendered using the appropriate widget
   factory (`ControlKit.textInput`, `ControlKit.dateInput`,
   `ControlKit.enumSelect`, etc.). Each field shows its current value as
   default.
4. **Dirty indicator** — asterisk (*) in drawer title when any field is
   modified from its original value.
5. **Save / Discard buttons.**

**Data binding:** `PATCH /api/v1/<resource>/<id>` with `If-Match: <etag>`
header. Optimistic update: UI updates immediately on Save click. On 412
(Precondition Failed — ETag mismatch): rollback all field values, show
inline conflict banner with "Reload" action that re-fetches current values
and re-opens the drawer. On 200: NRD closes, parent view refreshes row.

**Validation:** Per-field validation rules mirror the full edit form. Errors
shown inline below each field. Save button disabled if any field has an
active validation error.

**WCAG 2.2 SC:** 3.3.1 (Error Identification); 4.1.3 (Status Messages —
optimistic update and conflict banner are announced via `aria-live`).

---

### NRD-06 — Detail Drawer

**Purpose:** Show a rich read-only summary of a related record — opened from
a Linked Records tab or a workspace row — without navigating away.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC + backdrop click |
| ARIA role | `dialog` |

**Required content zones:**
1. **Record header** — record ID, record type badge, status chip, created/
   modified timestamps.
2. **Core fields section** — top 8–12 fields from the record definition,
   rendered read-only using `ControlKit.readField`. Field list is driven by
   the route registry's `detail_drawer_fields` array for the record type.
3. **Summary metrics** — aggregated counts (e.g. "3 linked CAPAs", "2
   attachments") rendered as chips.
4. **"Open full record" link** — navigates to the record's own route; opens
   in current tab (not new tab, to preserve navigation state).
5. **Close button** (× in header + footer "Close" button).

**Data binding:** `GET /api/v1/<resource>/<id>?view=drawer_summary`. No
mutations. Cache-Control honors `max-age=60`; stale-while-revalidate
pattern.

**WCAG 2.2 SC:** 1.3.1 (Info and Relationships); 4.1.2 (Name, Role, Value).

**Portal variants:**
- Customer portal: only NRD-06 is available. Fields shown are filtered to
  `customer_visible: true` per the route registry.

---

### NRD-07 — Attachment Drawer

**Purpose:** Handle E12 file upload as a 3-step flow: initiate → upload →
confirm. Ensures scan status and WORM commitment before the attachment is
linked to the record.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC (only before upload starts; once upload in progress, ESC shows NRD-01 abort confirmation) |
| ARIA role | `dialog` |

**Step 1 — Initiate:**
- File picker (drag-and-drop zone + "Browse" button).
- Evidence class select: loaded from `GET /api/v1/evidence-classes`. Required
  for regulated records.
- Document title field (optional; defaults to filename).
- ITAR warning banner (rendered from `GraphicsAuthority.tokens.read(
  'itar-warning-banner')`) shown when parent record carries ITAR
  classification (J3 packs).
- "Start Upload" button.

**Step 2 — Upload:**
- Progress bar showing bytes uploaded / total (`aria-valuenow` updated
  every 500ms).
- Scan status indicator: `Pending` → `Scanning` → `Clean` / `Threat
  Detected`. If `Threat Detected`, upload is aborted, file deleted
  server-side, error shown inline.
- Cancel upload button.

**Step 3 — Confirm:**
- File metadata summary: name, size, MIME type, evidence class, scan result.
- WORM commitment notice: "This file will be stored in immutable WORM
  storage. It cannot be deleted after confirmation."
- For J3/ITAR records: additional ITAR export control acknowledgment checkbox.
- "Confirm & Link" button.

**Data binding:** E12 multi-part protocol:
1. `POST /api/v1/attachments/initiate` → returns `upload_url`,
   `attachment_id`.
2. `PUT <upload_url>` with binary body → streaming upload.
3. `POST /api/v1/attachments/<attachment_id>/confirm` with `{ record_id,
   evidence_class }`.

**WCAG 2.2 SC:** 3.3.4 (Error Prevention); 4.1.3 (Status Messages — scan
status announced via `aria-live="polite"`).

---

### NRD-08 — Linked Records Drawer

**Purpose:** Add or remove bidirectional record links from a source record.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC + backdrop click (no unsaved state; each link action commits immediately) |
| ARIA role | `dialog` |

**Required content zones:**
1. **Source record identity bar** — record ID + type at top.
2. **Existing links list** — grouped by record type; each row shows linked
   record ID, type badge, link type (e.g. "caused by", "resolved by",
   "related to"), and a Remove (×) icon button.
3. **Add link section:**
   - Link type select (options from `GET /api/v1/link-types?from=<type>`).
   - Target record typeahead: text input with debounced search across
     `GET /api/v1/records/search?q=<term>&types=<allowed_types>`. Results
     show record ID + type + title.
   - "Add Link" button.
4. **Empty state** — when no links exist: illustration + "No linked records
   yet" message.

**Data binding:** Each Add Link action fires `POST /api/v1/links` with
`{ source_id, target_id, link_type }` (E3). Each Remove fires `DELETE
/api/v1/links/<link_id>`. Responses update the list immediately; no bulk
save step.

**WCAG 2.2 SC:** 3.3.2 (Labels or Instructions — typeahead has visible
label); 4.1.3 (Status Messages — link added/removed announced).

---

### NRD-09 — Help Drawer

**Purpose:** Provide context-sensitive help, documentation links, keyboard
shortcuts, and embedded video for the current view.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-md` (420 px token); full viewport height |
| Dismissible | ESC + backdrop click |
| ARIA role | `dialog` |

**Required content zones:**
1. **Help topic title** — derived from the current route's `help_topic_key`
   in the route registry.
2. **Help text** — rich text rendered from the help content store (`GET
   /api/v1/help/<topic_key>?locale=<locale>`). Supports headings,
   paragraphs, code blocks, and note/warning admonitions.
3. **Documentation links** — list of links to canonical doc pages (DCC
   documents or external URLs).
4. **Keyboard shortcuts reference** — table of shortcut → action pairs for
   the current route, pulled from `route-map.json`
   `keyboard_shortcuts` array.
5. **Video embed** — if `help_video_url` is non-null in the help record,
   renders a thumbnail with a "Play" button that loads an `<iframe>` on
   click (lazy embed to avoid preloading video resources).

**Data binding:** `GET /api/v1/help/<topic_key>`. 24-hour client cache.
No mutations.

**WCAG 2.2 SC:** 1.4.4 (Resize Text — help text respects user text-size
preferences); 2.4.4 (Link Purpose).

---

### NRD-10 — AI Advisory Drawer

**Purpose:** Surface E9 AI advisory results for the current record or
context, following L2 §6 communication requirements for AI-assisted
decisions.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC + backdrop click |
| ARIA role | `dialog` |

**Required content zones:**
1. **Advisory header** — advisory type (e.g. "AI-05 Root Cause Analysis",
   "AI-19 MDR Reportability Assessment"), advisory ID, generation timestamp.
2. **Non-binding disclaimer banner** — persistent banner at top: "This
   advisory is AI-generated and non-binding. Human review and sign-off are
   required before any regulated action." Styled from
   `GraphicsAuthority.tokens.read('advisory-disclaimer-banner')`.
3. **Confidence score** — numeric score (0–100) rendered as a gauge. Color
   thresholds: low (<50): warning token; medium (50–79): caution token; high
   (≥80): positive token.
4. **Advisory body** — primary advisory text; markdown rendered.
5. **RAG citations** — collapsible list of source documents used for
   retrieval-augmented generation. Each citation shows document ID, title,
   section, relevance score, and a link to the source record or attachment.
6. **PCCP badge** — for J4 records where the advisory touches a
   Predetermined Change Control Plan element: badge "PCCP v<n>" with link
   to the PCCP record. Required per MDR/IVDR Annex IX.
7. **Override button** — "Override Advisory" opens NRD-04 (Reason-for-Change)
   to capture the override rationale; override is logged as an EC-24
   annotation with `advisory_id` reference.
8. **Regenerate button** — triggers `POST /api/v1/advisories/<id>/regenerate`;
   shows loading state while E9 processes.

**Data binding:** `GET /api/v1/advisories/<id>` (E9). Regenerate via `POST`.
Override records EC-24 annotation via `POST /api/v1/annotations`.

**WCAG 2.2 SC:** 1.4.3 (Contrast — confidence gauge meets 3:1 ratio);
4.1.3 (Status Messages — regenerating status announced).

**Per-pack variants:**
- J4 (medtech): PCCP badge mandatory when advisory type is AI-19 or AI-21.
- J1 (pharma): Pharmacovigilance statement appended to disclaimer.

---

### NRD-11 — History Drawer

**Purpose:** Show a filtered, field-level audit trail from E6 for a specific
field or action on a record.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC + backdrop click |
| ARIA role | `dialog` |

**Required content zones:**
1. **Scope bar** — record ID + field name (if field-scoped) or action type
   (if action-scoped). Filter chips for date range and actor.
2. **Timeline list** — reverse-chronological list of audit events. Each entry:
   - Timestamp (ISO 8601; rendered in user's locale timezone).
   - Actor avatar + name.
   - Action verb chip (e.g. "Modified", "State Transition", "Signed",
     "Attached").
   - Diff block: `before` value → `after` value for field-scoped events.
     Rendered as color-coded diff chips (removed: `--color-diff-removed`;
     added: `--color-diff-added`).
   - E-signature reference chip if event carried an `esig_id`.
3. **Load more** — pagination trigger at bottom of list (page size 25).
4. **Export** — "Export CSV" button fires `GET
   /api/v1/audit?record_id=<id>&field=<f>&format=csv` and triggers browser
   download.

**Data binding:** `GET /api/v1/audit?record_id=<id>&field=<field>&page=<n>`
(E6). Read-only. Cursor-based pagination.

**WCAG 2.2 SC:** 1.3.3 (Sensory Characteristics — diff not conveyed by
color alone; also labeled "Removed" / "Added"); 2.4.1 (Bypass Blocks —
skip link to timeline list).

---

### NRD-12 — Banned-Decision Warning Dialog

**Purpose:** Halt the user when they attempt to traverse a path explicitly
prohibited by L1 §10 governance rules. Non-dismissible until acknowledged.

| Attribute | Value |
|-----------|-------|
| Visual format | Centered modal |
| Size | `width: --dialog-lg` (720 px token); height: auto, max 90 vh |
| Dismissible | Non-dismissible until user scrolls rule text to bottom AND clicks "I have read and understood this restriction" |
| ARIA role | `alertdialog` |

**Required content zones:**
1. **Stop icon** — high-contrast stop/prohibition icon from the token icon
   set (not a custom SVG; resolved from `GraphicsAuthority.tokens.read(
   'icon-banned-decision')`).
2. **Warning title** — "Action Blocked: Governance Rule Violation".
3. **L1 rule reference** — displays which L1 §10 rule was triggered (rule
   ID, rule title, short rationale). Rule text loaded from `GET
   /api/v1/governance/rules/<rule_id>`.
4. **Consequence statement** — plain-language explanation of why this path
   is banned and what harm it prevents.
5. **No retry path notice** — explicit statement: "There is no override or
   escalation path for this restriction. If you believe this is in error,
   contact your Compliance Lead." Retry button is absent.
6. **Acknowledge button** — only activates after user has scrolled the rule
   text section to its bottom (tracked via `IntersectionObserver` on the
   last paragraph sentinel element).

**Data binding:** Rule text from `GET /api/v1/governance/rules/<rule_id>`.
Acknowledgement logged as `POST /api/v1/audit/governance-ack` with
`{ rule_id, record_id, actor_id, timestamp }`.

**Validation:** Acknowledge button `aria-disabled="true"` until sentinel
element has been intersected.

**WCAG 2.2 SC:** 3.3.4 (Error Prevention); 1.4.1 (Use of Color — stop
state not conveyed by color alone; icon + text both present).

---

### NRD-13 — Concession Addendum Drawer

**Purpose (J1 pharma):** Append a concession narrative to a batch deviation
record. Requires QP (Qualified Person) e-signature. Stores as EC-23
annotation.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC (abandons addendum; no annotation stored) |
| ARIA role | `dialog` |

**Required content zones:**
1. **Deviation reference block** — batch deviation record ID, lot range,
   deviation category. Read-only.
2. **Concession narrative** — rich text editor (bold, italic, numbered list
   only; no arbitrary HTML). Minimum 50 characters. Maximum 5000 characters.
3. **Regulatory basis** — dropdown: `EU GMP Annex 16 §6.3`, `21 CFR
   §211.192`, `PIC/S PE 009 §7.4`, `Other (specify)`. Required field.
4. **QP Identity** — read-only field pre-filled with current user's QP
   license number (from `GET /api/v1/users/me/qp-credential`).
5. **Submit for QP Sign** — triggers NRD-03 (E-Signature) with BD code
   `BD-3` (QP Certification), AAL2 minimum.

**Data binding:** On QP signature completion: `POST /api/v1/annotations`
with `{ record_id, annotation_type: "EC-23", narrative, regulatory_basis,
qp_esig_id }`.

**Pack requirement:** J1 only. NRD-13 is not registered in non-J1 tenants.

**Auditor/Inspector portal:** disabled (session is read-only).

**WCAG 2.2 SC:** 3.3.2 (Labels or Instructions); 1.4.4 (Resize Text —
rich text editor respects user font-size preferences).

---

### NRD-14 — Per-Pack Specialized Drawers

#### NRD-14-J1: APR/PSUR Section Drawer (J1 pharma)

**Purpose:** Edit a single section of an Annual Product Review or Periodic
Safety Update Report, using an AI-21 advisory draft as a starting point.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-xl` (720 px token); full viewport height |
| Dismissible | ESC (with dirty-check confirmation via NRD-01 if modified) |

**Content zones:**
1. **Section header** — APR/PSUR document ID, section number, section title.
2. **AI-21 draft pane** — read-only panel showing the AI-generated draft for
   this section (from E9 advisory). Confidence score chip. "Use this draft"
   button copies text into editor.
3. **Edit pane** — rich text editor with regulatory structure enforced
   (headings correspond to ICH E3 / EU CTD 2.7.x section numbering).
4. **Comparison toggle** — side-by-side view (AI draft | User edit).
5. **Save Draft / Submit Section buttons.** Submit triggers NRD-03 (BD-3
   QP sign) if section is a regulatory-sign section.

---

#### NRD-14-J3: FAI Characteristic Drawer (J3 aerospace)

**Purpose:** Enter measured values for a single ballooned (bubble) dimension
on a First Article Inspection report.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-md` (420 px token); full viewport height |
| Dismissible | ESC |

**Content zones:**
1. **Bubble reference** — bubble number, drawing zone, characteristic type
   (GD&T symbol rendered using font-token glyph or SVG from token set).
2. **Nominal / Tolerance block** — nominal value, upper tolerance, lower
   tolerance. Read-only (sourced from AI-08 extraction).
3. **Measured value inputs** — up to 5 measurement readings (for features
   requiring multi-point measurement). Each input has `aria-label` =
   "Measurement n of m".
4. **Statistical summary** — mean, range, Cpk (calculated client-side on
   input change).
5. **Conformance chip** — auto-updates as values entered:
   `CONFORMING` (green token) / `NON-CONFORMING` (danger token) /
   `INCOMPLETE` (neutral token).
6. **Save / Cancel.**

**Data binding:** `PATCH /api/v1/fai-characteristics/<id>` with measured
values array.

---

#### NRD-14-J2: PPAP Element Drawer (J2 automotive)

**Purpose:** Fill a single PPAP element, attach required evidence, and
submit the element for OEM review.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-lg` (560 px token); full viewport height |
| Dismissible | ESC (with dirty-check via NRD-01) |

**Content zones:**
1. **Element header** — PPAP element number (1–18 per AIAG reference),
   element title, submission level requirement.
2. **Element fields** — element-specific form fields (schema loaded from
   `GET /api/v1/ppap-elements/<element_id>/schema`).
3. **Evidence attach zone** — inline E12 attach (simplified 2-step:
   select + confirm) for evidence classes required by this element.
4. **OEM requirement note** — read-only text from the OEM's specific
   requirement for this element (loaded from OEM profile).
5. **Submit Element** — fires `POST /api/v1/ppap-submissions/<id>/elements/
   <element_id>/submit`; NRD-03 (BD-code per element class) if element
   requires sign.

---

#### NRD-14-J5: HACCP CCP Excursion Drawer (J5 food)

**Purpose:** Log a Critical Control Point excursion in real time, capture
immediate corrective action, and start the SLA verification timer.

| Attribute | Value |
|-----------|-------|
| Visual format | Right-side drawer |
| Size | `width: --drawer-md` (420 px token); full viewport height |
| Dismissible | Non-dismissible once submitted (user must complete corrective action entry) |

**Content zones:**
1. **CCP reference** — CCP ID, process step, critical limit (e.g.
   "Internal temp ≥ 75°C").
2. **Excursion values** — observed value input; deviation from critical limit
   auto-calculated and displayed.
3. **Excursion timestamp** — pre-filled with `now()`; user can adjust
   backward up to 15 minutes (FSMA HARPC requirement).
4. **Immediate corrective action** — text area; required. Minimum 20
   characters. Options from corrective action codebook (loaded from HACCP
   plan).
5. **Product disposition** — radio: `Hold`, `Rework`, `Destroy`, `Release
   with waiver`. If "Release with waiver": NRD-03 (HACCP Team Lead sign).
6. **SLA countdown** — starts on submit. Timer shows time remaining to
   verification (configurable per CCP, default 4 hours). Displayed in
   `role="timer"` ARIA landmark.
7. **Submit.**

**Data binding:** `POST /api/v1/ccp-excursions` with full excursion payload.
SLA verified by `PATCH /api/v1/ccp-excursions/<id>/verify` (separate action
after corrective action is confirmed).

---

## Portal Variant Matrix

| NRD | Auditor | Inspector | Customer | Edge/Glove |
|-----|---------|-----------|----------|------------|
| NRD-01 Confirmation | Shown (403 on confirm) | Same as auditor | N/A | Bottom sheet |
| NRD-02 Error Detail | Available | Available | Limited (generic message) | Bottom sheet |
| NRD-03 E-Signature | Disabled | Disabled | N/A | Bottom sheet |
| NRD-04 Reason-for-Change | Disabled | Disabled | N/A | Bottom sheet |
| NRD-05 Quick-Edit | Disabled | Disabled | N/A | Bottom sheet |
| NRD-06 Detail | Available | Available | Available (filtered fields) | Bottom sheet |
| NRD-07 Attachment | Disabled | Disabled | N/A | Bottom sheet |
| NRD-08 Linked Records | Disabled | Disabled | N/A | Bottom sheet |
| NRD-09 Help | Available | Available | Available | Bottom sheet |
| NRD-10 AI Advisory | Available (read-only; no override) | Same | N/A | Bottom sheet |
| NRD-11 History | Available | Available | N/A | Bottom sheet |
| NRD-12 Banned-Decision | Available | Available | N/A | Bottom sheet |
| NRD-13 Concession (J1) | Disabled | Disabled | N/A | Bottom sheet |
| NRD-14-* Pack drawers | Disabled | Disabled | N/A | Bottom sheet |

---

## Toast / Snack Notifications

Not catalogued as NRD types (they are non-interactive overlays), but
governed by the same Graphics Authority rule:

- `role="status"` for success/info toasts (polite announcement).
- `role="alert"` for error/warning toasts (assertive announcement).
- Dismiss button required for persistence > 5 seconds (WCAG 2.2 SC 2.2.1).
- Toast stacking: maximum 3 visible simultaneously; oldest auto-dismissed
  when 4th arrives.
- Position: top-right on desktop; top-center on mobile and edge/glove.
- Duration tokens: `--toast-duration-success` (4 s), `--toast-duration-error`
  (8 s), `--toast-duration-info` (5 s). Never hardcoded.

---

## WCAG 2.2 SC compliance matrix

| SC | Name | NRD compliance |
|---|---|---|
| 1.4.3 | Contrast (Minimum) | All NRD text uses `--text-primary` / `--text-secondary` tokens validated ≥ 4.5:1 by Graphics Authority token audit |
| 1.4.11 | Non-text Contrast | Status chips and icons in NRDs use `--border-default` token ≥ 3:1 |
| 2.1.1 | Keyboard | All NRD actions keyboard reachable; no mouse-only interactions |
| 2.4.3 | Focus Order | DOM order; drawers start focus on heading; dialogs on first interactive element; destructive dialogs focus close button first |
| 2.4.11 | Focus Not Obscured | NRD always topmost z-layer; sticky NRD header does not cover focused form field (sticky stops at scroll container boundary) |
| 3.3.1 | Error Identification | All validation errors in NRD-05/NRD-03 use `role=alert` linked via `aria-describedby` to field ID |
| 3.3.4 | Error Prevention | NRD-01 Confirmation for destructive; NRD-03 review step for legal; NRD-12 non-dismissible banned-decision acknowledgement |
| 4.1.3 | Status Messages | NRD submit success/failure uses `role=status` / `role=alert` — announced without focus shift |

---

## Animation tokens (GraphicsAuthority)

| Token | Default | Usage |
|---|---|---|
| `--motion-nrd-enter` | 200ms ease-out | Slide-in / fade-in |
| `--motion-nrd-exit` | 150ms ease-in | Slide-out / fade-out |
| `--motion-nrd-overlay` | 100ms ease | Background overlay fade |

`prefers-reduced-motion: reduce` resolves all motion tokens to `0ms` at the CSS variable level. No per-component override needed. Side drawers use `inset-inline-end: 0` (logical property) — RTL-safe. Edge/glove bottom-sheet uses `inset-block-end: 0`.

---

## NRD state persistence rules

- **NRD-05 Quick-Edit**: unsaved state in component memory only. ESC/cancel discards. No draft saved — prevents stale draft after concurrent edit by another user.
- **NRD-03 E-Signature**: challenge token invalidated on NRD close (5-minute TTL). User must restart on re-open.
- **NRD-07 Attachment**: E12 pre-signed URL valid 1 hour. If user closes before confirm: orphaned upload auto-expires after 24 hours (E12 orphan cleanup job).
- **NRD-14 PPAP Element**: partially filled element held in session memory only; cleared on page reload. Full submission is atomic.

---

## KPIs

| Metric | Target |
|---|---|
| NRD open-to-interactive (Drawer) | p95 < 100ms |
| NRD open-to-interactive (Modal) | p95 < 80ms |
| E-Signature dialog: challenge issued | p95 < 300ms |
| E-Signature dialog: compose submit | p95 < 500ms |
| Attachment scan status: first update | p95 < 5s |
| Quick-Edit save round-trip | p95 < 250ms |

---

`S3-10_F7_DRAWERS_DEEP_UPGRADE_COMPLETE`
