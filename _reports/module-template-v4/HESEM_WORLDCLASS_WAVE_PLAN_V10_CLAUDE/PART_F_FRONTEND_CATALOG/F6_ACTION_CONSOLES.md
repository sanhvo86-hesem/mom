# F6 — Action Consoles (AC Pattern)

**Part F · Frontend Catalog · HESEM Operations Platform HMV4**
**Decision phrase:** `S3-09_F6_ACTION_CONSOLE_DEEP_UPGRADE_COMPLETE`

---

## 1. Pattern Overview

The Action Console (AC) is the bulk operational surface in HESEM MOM. Where the AR shell (F5) governs a single record's lifecycle and editing, the AC pattern governs batch state transitions, multi-record regulatory actions, and complex workflows that must maintain per-record accountability at scale. Every AC begins with a selection exported from a WS workspace, processes through a fixed six-phase workflow, and terminates with a multi-status result panel that reports per-record outcomes.

ACs enforce the same L1 §6 friction rules per record as AR shells — bulk operations do not provide a bypass. Every record in a batch is individually checked against L1 §4 triple defense before processing proceeds. Where a record fails a precondition, that record is excluded from the batch and the result is clearly marked; the remaining records continue.

AC surfaces are always launched from a WS workspace via a "Bulk Action" button (shown only when 2+ records are selected). They open as a full-screen overlay or a dedicated route (`/action-consoles/{ac-id}`) with the selected record IDs passed as query parameters or in session state. The AC never replaces the source WS in the navigation stack — the user can cancel and return to the WS with their selection intact.

### 1.1 Six-Phase Standard Workflow

All ACs implement the following phases in order. Individual ACs may collapse or skip phases that are not applicable (e.g., an AC with no evidence requirement skips Phase 3), but the phase order is never reordered.

| Phase | Key | UI Surface |
|-------|-----|-----------|
| 1 | Selection | Record grid with confirmation of what was brought in |
| 2 | Confirmation | Action parameters + per-record precondition check |
| 3 | Evidence Capture | H4 §3 evidence class upload (skipped if no evidence required) |
| 4 | Authority Sign | E7 e-signature per BD code (skipped if no signature required) |
| 5 | Submit | E11 bulk command or E3 batch; LRO created; progress bar |
| 6 | Result | HTTP 207 multi-status; per-record chips; retry/export |

Navigation between phases uses a stepper component (tokens: `--stepper-active-bg`, `--stepper-complete-bg`, `--stepper-pending-bg`). Phase navigation is forward-only except Cancel (always available, cancels the entire AC and returns to source WS without mutations). Back navigation within phases 1–4 is permitted (changes to evidence or parameters in earlier phases cause later phases to reset). Once Phase 5 (Submit) begins, the AC is locked — Cancel is disabled; the user must wait for the LRO to complete or timeout.

### 1.2 Per-Record L1 Triple Defense (Phase 2)

Before presenting the confirmation summary to the user, the AC runs a server-side precondition check: `POST /api/v1/action-consoles/{ac-id}/validate` with the list of selected record IDs and the proposed action parameters. The server checks:

1. **State gate:** Each record must be in an eligible state for the action
2. **Role gate:** The submitting user must have the required role for each record (ownership or role-scope)
3. **Banned-decision check (L1 §4):** Each record is checked for any active banned-decision flags (e.g., an open regulatory hold, a WORM lock violation, a banned-combination of states)

Records that fail any check are moved to an "Ineligible" list shown in Phase 2. The user can deselect them and continue with the eligible set, or cancel the AC entirely. The submission never includes ineligible records.

### 1.3 Live Stream Pattern (Phase 5)

During Phase 5, the AC screen subscribes to the E5 §2.4 WebSocket on the topic `lro:{lro_id}` (the Long-Running Operation ID returned when Submit is initiated). As the server processes each record, it emits events of type `lro.record.complete` or `lro.record.failed` with the record ID and result detail. The AC's result panel updates each record's row chip in real time — no page refresh needed. The LRO progress bar reflects both:

- `lro.progress` events (server-side percentage)
- Live event count (client counts `lro.record.complete` + `lro.record.failed` and uses this as a secondary progress signal)

If the WebSocket disconnects during Phase 5, the AC falls back to polling `GET /api/v1/lro/{lro_id}/status` every 5 seconds and marks the banner with a degraded-mode indicator (token `--banner-degraded-bg`).

### 1.4 Result Phase HTTP 207

Phase 6 renders the HTTP 207 Multi-Status response body. Structure per record:

```
{
  "record_id": "...",
  "status": 200 | 409 | 422 | 403 | 500,
  "result": "SUCCESS | PRECONDITION_FAILED | VALIDATION_ERROR | FORBIDDEN | SERVER_ERROR",
  "detail": "human-readable reason",
  "banned_decision_blocked": true | false
}
```

UI chips per record:

| Status | Chip color token | Label |
|--------|-----------------|-------|
| 200 SUCCESS | `--chip-success-bg` | Done |
| 409 PRECONDITION_FAILED | `--chip-warning-bg` | Conflict |
| 422 VALIDATION_ERROR | `--chip-error-bg` | Invalid |
| 403 FORBIDDEN | `--chip-blocked-bg` | Blocked |
| 500 SERVER_ERROR | `--chip-error-bg` | Error |
| Banned-decision blocked | `--chip-banned-bg` | Policy Block |

Failed records expose a "Retry This Record" inline button (re-runs the same action against just that record, re-checking preconditions) and a "View Record" link (opens the AR shell for investigation).

The result panel also offers "Export Result CSV" — generates a CSV with all record IDs, statuses, and detail text — and "Copy Summary to Clipboard" (count of each status category).

---

## 2. AC Instance Catalog (19 Consoles)

---

### AC-01 — NC Bulk Disposition

**Name:** NC Bulk Disposition Console
**AC ID:** AC-01
**Source workspace:** WS-NQCASE (Nonconformance Workspace)

**Purpose:** Select multiple open NC records and apply a single disposition decision (e.g., USE_AS_IS, REWORK, SCRAP, RETURN_TO_SUPPLIER) to all, subject to per-record eligibility. Designed for QA team bulk-processing of minor NCs after investigation.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows NC ID, product, severity, detection date, days open; max 200 records per session; filter by severity/state available in panel |
| 2 — Confirmation | Disposition type picker (USE_AS_IS / REWORK / SCRAP / RETURN_TO_SUPPLIER / OTHER); reason text field (required, minimum 30 characters); precondition: records must be in UNDER_INVESTIGATION or PENDING_DISPOSITION state; NC owner must be in submitting user's scope; CRITICAL severity NCs are excluded from bulk disposition — shown as ineligible with note "Critical NCs require individual disposition" |
| 3 — Evidence | H4 evidence class: DISPOSITION_JUSTIFICATION (optional for MINOR, required for MAJOR and above); attach: inspection report, measurement data, engineering judgement document |
| 4 — Authority Sign | BD-01 (QA Disposition Authorization); AAL2; single signatory (the submitting QA user); reason auto-populated from Phase 2 reason text |
| 5 — Submit | `POST /api/v1/action-consoles/nc-bulk-disposition/execute` → E11 bulk command; LRO created; estimated 2–5 seconds per record |
| 6 — Result | 207 per record; SCRAP decisions trigger automatic lot quarantine events on any linked lots |

**BD codes:** BD-01 (AAL2)
**Max selection:** 200 NC records
**Preconditions per record:** State IN (UNDER_INVESTIGATION, PENDING_DISPOSITION); submitting user has QA role; NC is not CRITICAL severity; no active regulatory hold flag
**Evidence required:** DISPOSITION_JUSTIFICATION (class-conditional per severity)
**E-signature:** BD-01, AAL2, single
**Friction level:** L1 §6 Level 3 (regulated QA decision affecting product conformance)
**Live stream:** E5 `lro:{lro_id}` — each NC disposition completion updates row chip
**Per-pack overlay:** J1 — any NC linked to a released or quarantined batch is ineligible for bulk disposition; must be handled individually via AR-NQCASE-J1 with QP involvement. J5 — FSMA-linked NCs require mandatory FSMA §204 traceability check before disposition; added as automated precondition check.

---

### AC-02 — CAPA Bulk Effectiveness Review

**Name:** CAPA Bulk Effectiveness Review Console
**AC ID:** AC-02
**Source workspace:** WS-CAPA (CAPA Workspace)

**Purpose:** Quality teams periodically review CAPAs that have reached their effectiveness review due date. This console allows bulk submission of effectiveness evidence and closure of CAPAs where effectiveness is confirmed.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows CAPA ID, linked NC/source, due date, effectiveness criteria text, days since implementation; filter by due date range; max 100 records |
| 2 — Confirmation | Effectiveness determination picker: EFFECTIVE / NOT_EFFECTIVE / PARTIALLY_EFFECTIVE; required fields: evaluation notes (minimum 50 characters), evaluation date; precondition: CAPA state must be EFFECTIVENESS_REVIEW; implementation completion date must exist; no open evidence classes missing |
| 3 — Evidence | H4 evidence class: EFFECTIVENESS_EVIDENCE (required); attach: re-inspection results, process data, training records, audit results demonstrating corrective action worked |
| 4 — Authority Sign | BD-03 (QA Effectiveness Authorization); AAL2; single QA signatory; NOT_EFFECTIVE result additionally triggers BD-12 (CAPA Re-Open Authorization) and sets CAPA state to ROOT_CAUSE_ANALYSIS |
| 5 — Submit | `POST /api/v1/action-consoles/capa-bulk-effectiveness/execute`; EFFECTIVE → CLOSED; NOT_EFFECTIVE → ROOT_CAUSE_ANALYSIS (CAPA re-opened, new due date required in Phase 2) |
| 6 — Result | 207; NOT_EFFECTIVE CAPAs show as separate status (re-opened successfully); link to re-opened CAPA AR shell |

**BD codes:** BD-03 (AAL2), BD-12 (AAL2, only for NOT_EFFECTIVE determination)
**Max selection:** 100 CAPA records
**Preconditions:** State = EFFECTIVENESS_REVIEW; evidence classes not missing; implementation completion date present; no active re-investigation flag
**Evidence:** EFFECTIVENESS_EVIDENCE (required)
**E-signature:** BD-03 AAL2; BD-12 AAL2 (NOT_EFFECTIVE only)
**Friction:** Level 3 (QA decision with regulatory significance)
**Live stream:** E5 `lro:{lro_id}`
**Per-pack overlay:** J1 — CAPAs linked to GMP deviations require QP co-sign (BD-04) in addition to BD-03; the AC prompts for QP identity in Phase 4 and splits signature into two sequential AAL3 signatures. J4 — CAPAs linked to FSCAs require Regulatory Affairs co-sign (BD-13) in addition to BD-03.

---

### AC-03 — Dispatch Console

**Name:** Dispatch Console
**AC ID:** AC-03
**Source workspace:** WS-DISP (Dispatch Board Workspace)

**Purpose:** Production Supervisors sequence and dispatch multiple Job Orders to work centers and operators in one operation. This is the primary shop-floor scheduling action surface.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows JO ID, product, quantity, required date, current priority rank, work center, constraint flags; default sort: priority-ordered (highest urgency first); max 500 JOs per dispatch run |
| 2 — Confirmation | Per-JO: work center assignment (dropdown populated from capacity availability API); operator assignment (operator picker filtered by work center + available shift); priority rank (drag-reorder or numeric entry in grid); conflict detection: if two JOs compete for the same work center slot, conflict highlighted; constraint check: JOs with missing materials flagged (link to inventory); JOs with missing tooling flagged (link to MWO) |
| 3 — Evidence | No evidence requirement for dispatch (non-regulated action) — Phase 3 skipped |
| 4 — Authority Sign | No BD code for routine dispatch — Phase 4 skipped |
| 5 — Submit | `POST /api/v1/action-consoles/dispatch/execute`; sets JO state to RELEASED and creates WO (Work Order) per JO; priority ranks committed to dispatch schedule |
| 6 — Result | 207; JOs that fail due to capacity conflict show CONFLICT chip with link to work center schedule; successful JOs show RELEASED chip |

**BD codes:** None (routine operational action)
**Max selection:** 500 JO records
**Preconditions:** JO state = PLANNED; work center not over-capacity for the assigned slot; operator in correct shift; no material shortage block flag
**Evidence:** None
**E-signature:** None
**Friction:** Level 2 (state transition — PLANNED→RELEASED affects production floor commitments)
**Live stream:** E5 `lro:{lro_id}` — each JO dispatch completion shows real-time; critical for floor supervisors watching the board during dispatch
**Per-pack overlay:** J3 — ITAR-controlled JOs require the assigned operator to have ITAR clearance; pre-validation in Phase 2 checks operator clearance flag. J4 — DHR assignment: Phase 2 includes DHR lot assignment for device JOs; operator must be trained (TRAIN record COMPLETED) for the process. J5 — CCP operator assignment: operator must have active HACCP training record for the relevant CCP.

---

### AC-04 — Recall Execution Console

**Name:** Recall Execution Console
**AC ID:** AC-04
**Source workspace:** WS-LOT (Lot/Batch Workspace)

**Purpose:** Initiates a product recall by selecting affected lots, defining the recall scope, capturing regulatory documentation, and obtaining the required QA Director authorization signature (BD-22). Applicable across J1 (pharma), J4 (medical device), and J5 (food safety) packs.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Lot ID, product, manufacturing date, expiry, quantity, distribution channels, current state; filter by product code, date range, distribution region; max 1,000 lots per recall execution |
| 2 — Confirmation | Recall class picker: CLASS_I (dangerous) / CLASS_II (may cause adverse health consequences) / CLASS_III (unlikely to cause adverse health); recall reason text (required, minimum 100 characters); affected distribution regions (multi-select); customer notification required (Yes/No auto-set based on distribution); regulatory authority notification required (Yes/No auto-set by recall class); health hazard evaluation reference; complaint/NC reference that triggered recall |
| 3 — Evidence | H4 evidence classes: HEALTH_HAZARD_EVALUATION (required), RECALL_SCOPE_DOCUMENT (required), REGULATORY_FILING_DRAFT (required for CLASS_I and CLASS_II), CUSTOMER_NOTIFICATION_DRAFT (required if customer notification = Yes) |
| 4 — Authority Sign | BD-22 (Recall Authorization); AAL3 (hardware token required); quorum: QA Director (1) + Regulatory Affairs (1) + CEO/COO (1 if CLASS_I); quorum progress shown in Phase 4 stepper; each signatory signs independently; Phase 5 cannot proceed until quorum is complete |
| 5 — Submit | `POST /api/v1/action-consoles/recall-execution/execute`; sets all selected lots to RECALLED state; triggers DSCSA/VRS notification (J1), EUDAMED notification (J4), FSMA notification (J5); creates regulatory filing LRO |
| 6 — Result | 207; each lot RECALLED chip; regulatory notification dispatch status per lot; "Generate Recall Status Report" button (signed PDF) |

**BD codes:** BD-22 (AAL3, quorum 2–3 depending on recall class)
**Max selection:** 1,000 lot records
**Preconditions:** Lot state IN (RELEASED, QP_RELEASED, QUARANTINE) — already-recalled lots are excluded; submitting user has Regulatory Affairs or QA Director role; health hazard evaluation reference populated
**Evidence:** HEALTH_HAZARD_EVALUATION (required), RECALL_SCOPE_DOCUMENT (required), REGULATORY_FILING_DRAFT (CLASS_I/II), CUSTOMER_NOTIFICATION_DRAFT (conditional)
**E-signature:** BD-22, AAL3, quorum 2–3
**Friction:** Level 4 — maximum; hardware token mandatory; quorum multi-party; no time pressure override
**Live stream:** E5 `lro:{lro_id}` for lot state changes; also E5 `regulatory.notification.sent` events update notification status per lot in result panel
**Per-pack overlay:** J1 — triggers DSCSA Suspect Product Alert if CLASS_I; automatically pre-populates AC-06 (DSCSA Suspect Product Console) with the same lot set. J4 — triggers FSN (Field Safety Notice) draft and EUDAMED safety notice. J5 — triggers FSMA §204 traceability report generation and FDA recall notification API push.

---

### AC-05 — HACCP CCP Monitoring Console

**Name:** HACCP CCP Monitoring Console
**AC ID:** AC-05
**Source workspace:** WS-LOT or WS-JO (active production runs) — J5 pack only

**Purpose:** Allows HACCP monitors to enter Critical Control Point monitoring data for multiple CCPs simultaneously during a production run. Designed for real-time use on the production floor. Unlike most ACs, this console is not a bulk state-transition surface — it is a multi-CCP real-time data entry console with immediate deviation detection.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Select active production run (JO or Lot); system presents all CCPs defined in the HACCP plan for the product; CCPs pre-loaded from HACCP plan registry; max CCPs per run: up to plan definition (typically 4–12) |
| 2 — Confirmation | Confirm monitoring session: monitor name, shift, start time; monitoring frequency per CCP shown (e.g., every 30 minutes); no precondition check beyond active production run state |
| 3 — Evidence | Per-CCP data entry form: measured value, unit, instrument ID (calibrated instrument), observation notes; form validates each value against the critical limit range; values outside critical limits trigger immediate DEVIATION flag |
| 4 — Authority Sign | No signature for in-range values; DEVIATION records trigger BD-14 (HACCP CCP Deviation Authorization) from QA Supervisor before processing can continue |
| 5 — Submit | `POST /api/v1/action-consoles/ccp-monitoring/execute`; each CCP monitoring record stored; deviations create linked NC records automatically |
| 6 — Result | Per-CCP status: IN_LIMIT (green chip) / DEVIATION (red chip with auto-linked NC record ID) |

**BD codes:** BD-14 (AAL2, QA Supervisor, DEVIATION records only)
**Max selection:** Up to plan's CCP count (not record-count limited in the same sense — CCP count is bounded by the HACCP plan)
**Preconditions:** Active production run; HACCP plan registered for this product; monitoring session not already open for this CCP × shift combination
**Evidence:** CCP monitoring data (structured form — not file attachment)
**E-signature:** BD-14, AAL2 (conditional — deviation records only)
**Friction:** Level 1 for in-range entries; Level 3 for deviation authorization (immediate production impact)
**Live stream:** E5 `ccp.reading.stored` events update the CCP grid in real time; if another monitor is also logging simultaneously, their readings appear live; deviation events push `role="alert"` ARIA announcements immediately
**Per-pack overlay:** J5 only — no other pack uses this console

---

### AC-06 — DSCSA Suspect Product Console

**Name:** DSCSA Suspect Product Console
**AC ID:** AC-06
**Source workspace:** WS-LOT — J1 Pharma pack only

**Purpose:** Handles DSCSA (Drug Supply Chain Security Act) suspect product identification, quarantine, and reporting to the FDA's Verification Router Service (VRS). Triggered manually or auto-pre-populated from AC-04 recall events.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Lot ID, product NDC, manufacturer, trading partner, received date, transaction information (TI) completeness; filter by NDC, manufacturer, receipt date; max 500 lots |
| 2 — Confirmation | Suspect reason: AUTHENTICITY (potentially counterfeit), INTEGRITY (packaging damaged/tampered), QUALITY (quality complaint), RECALL (recall-triggered); VRS query type: VERIFICATION_REQUEST or SUSPECT_PRODUCT_REPORT; suspected illegitimacy flag (Yes/No — triggers additional regulatory obligations) |
| 3 — Evidence | H4 evidence classes: TRANSACTION_INFORMATION (T, TH, TS records — required), PHYSICAL_EXAMINATION_REPORT (required), LABORATORY_ANALYSIS (required if QUALITY or AUTHENTICITY suspect reason) |
| 4 — Authority Sign | BD-15 (DSCSA Authorized Trading Partner Representative); AAL2 |
| 5 — Submit | Quarantine lot states; submit DSCSA Suspect Product Report to VRS via `POST /api/v1/action-consoles/dscsa-suspect/execute`; VRS response code captured per lot |
| 6 — Result | 207; VRS response per lot (VERIFIED / SUSPECT_CONFIRMED / VRS_UNREACHABLE); SUSPECT_CONFIRMED lots trigger automatic escalation to AC-04 Recall Execution Console |

**BD codes:** BD-15 (AAL2)
**Max selection:** 500 lots
**Preconditions:** Lot is a pharmaceutical product with NDC; transaction information records exist; submitting user has Regulatory Affairs or QA Director role
**Evidence:** TI records (required), Physical examination report (required), Lab analysis (conditional)
**E-signature:** BD-15, AAL2, single
**Friction:** Level 4 (regulatory filing with FDA impact)
**Live stream:** E5 `vrs.response.received` events update per-lot VRS status in result panel in real time
**Per-pack overlay:** J1 only

---

### AC-07 — GIDEP Report Draft Console

**Name:** GIDEP Report Draft Console
**AC ID:** AC-07
**Source workspace:** WS-NQCASE or WS-INSP — J3 Aerospace pack only

**Purpose:** Government-Industry Data Exchange Program (GIDEP) reporting. Aerospace and defense contractors must report safety-critical part failures to GIDEP. This console selects failure events, drafts the GIDEP report, obtains ITAR clearance sign-off, and submits.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows NC or Inspection record ID, part number, NSN (National Stock Number if applicable), failure mode, ITAR controlled flag; filter by part number, failure mode; max 20 records per GIDEP submission (GIDEP reports are typically per-part) |
| 2 — Confirmation | Report type: FAILURE_EXPERIENCE (most common) / PRODUCT_ALERT / SAFE_ALERT; GIDEP report fields: subject, part number, cage code, quantity affected, defect description, failure mode code, test conditions, recommended action; ITAR controlled check: if any selected part is ITAR controlled, Phase 4 signature requires ITAR-cleared signatory |
| 3 — Evidence | H4 evidence classes: FAILURE_ANALYSIS_REPORT (required), DIMENSIONAL_INSPECTION_RECORDS (required for dimensional failures), PHOTOGRAPH_EVIDENCE (required for SAFE_ALERT) |
| 4 — Authority Sign | BD-16 (GIDEP Authorized Representative); AAL2; if ITAR controlled: additionally requires BD-17 (ITAR Export Control Clearance) from ITAR-cleared Compliance Officer |
| 5 — Submit | `POST /api/v1/action-consoles/gidep-draft/execute`; generates formatted GIDEP report XML; submits to GIDEP portal API; response: confirmation number |
| 6 — Result | 207; per-record GIDEP confirmation number; "Download GIDEP Submission PDF" (signed archive) |

**BD codes:** BD-16 (AAL2), BD-17 (AAL2, ITAR controlled only)
**Max selection:** 20 failure records
**Preconditions:** Part number has CAGE code registered; failure analysis evidence present; submitting user has Engineering or QA role with GIDEP authorization
**Evidence:** Failure analysis report (required), Dimensional records (conditional), Photographs (conditional)
**E-signature:** BD-16 AAL2; BD-17 AAL2 (ITAR conditional)
**Friction:** Level 3 (regulatory filing); Level 4 for ITAR-controlled parts (dual sign-off required)
**Live stream:** E5 `gidep.submission.response` updates per-record GIDEP status
**Per-pack overlay:** J3 only

---

### AC-08 — MDR Vigilance Triage Console

**Name:** MDR Vigilance Triage Console
**AC ID:** AC-08
**Source workspace:** WS-NQCASE (complaint/NC Workspace) — J4 Medical Device pack only

**Purpose:** Medical Device Report (MDR) and EU Vigilance report triage. AI-19 (complaint classifier) pre-classifies complaints; this console allows Pharmacovigilance / Regulatory Affairs to review AI-classified complaints, confirm or override classification, and either submit an MDR/ICSR report or close without reporting.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Complaint ID, AI-19 classification (MDR_REQUIRED / VIGILANCE_REQUIRED / NOT_REPORTABLE / NEEDS_REVIEW), confidence %, device type, injury type, severity; filter by AI classification; max 100 complaints |
| 2 — Confirmation | Per record: confirm AI classification or override (override requires override reason); regulatory pathway determination: FDA MDR / EU MDR / Health Canada MDV / TGA; reporting timeline determination (5-day / 30-day event); final determination: REPORT / CLOSE_WITHOUT_REPORT; bulk determination only available when all records have the same pathway and classification |
| 3 — Evidence | H4 evidence classes: COMPLAINT_INVESTIGATION_SUMMARY (required), CLINICAL_EVALUATION (required for MDR_REQUIRED), DEVICE_HISTORY_RECORD (required for MDR_REQUIRED) |
| 4 — Authority Sign | BD-18 (Pharmacovigilance Officer Authorization); AAL2; if MDR_REQUIRED: additionally BD-19 (QA Director MDR Sign-off) required |
| 5 — Submit | `POST /api/v1/action-consoles/mdr-triage/execute`; for REPORT: generates eMDR XML / EUDAMED EUDAMED electronic form and submits via regulatory API; for CLOSE_WITHOUT_REPORT: closes complaint with documented justification |
| 6 — Result | 207; per-complaint: eMDR submission confirmation number / closure record ID; "Export Vigilance Report Archive" |

**BD codes:** BD-18 (AAL2), BD-19 (AAL2, MDR_REQUIRED only)
**Max selection:** 100 complaint records
**Preconditions:** Complaint state IN (OPEN, UNDER_INVESTIGATION); AI-19 classification present; submitting user has Pharmacovigilance or Regulatory Affairs role
**Evidence:** Investigation summary (required), Clinical evaluation (conditional), DHR (conditional)
**E-signature:** BD-18 AAL2; BD-19 AAL2 (conditional)
**Friction:** Level 3; Level 4 for MDR_REQUIRED (dual sign + timeline pressure explicitly shown)
**Live stream:** E5 `regulatory.submission.response` events update MDR submission status per complaint
**Per-pack overlay:** J4 only

---

### AC-09 — Customer Complaint Console

**Name:** Customer Complaint Console
**AC ID:** AC-09
**Source workspace:** WS-NQCASE (complaint intake queue)

**Purpose:** Bulk-process incoming customer complaints: classify severity, assign owners, determine if CAPA is required, and send acknowledgement notifications to customers.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Complaint ID, customer, product, complaint date, AI-09 initial classification (if E9 registered), days since receipt; filter by customer, product, date; max 200 complaints |
| 2 — Confirmation | Per complaint: severity classification (CRITICAL/MAJOR/MINOR); CAPA trigger decision (Yes/No — MAJOR and CRITICAL require CAPA); owner assignment; acknowledgement deadline; customer notification method (email/portal/EDI) |
| 3 — Evidence | No evidence required for initial classification — Phase 3 skipped |
| 4 — Authority Sign | BD-20 (QA Manager Complaint Classification Authorization); AAL2; required only for CRITICAL classification |
| 5 — Submit | `POST /api/v1/action-consoles/customer-complaint/execute`; CAPA records auto-created for required complaints; acknowledgement notifications dispatched |
| 6 — Result | 207; per complaint: classification applied, CAPA created (with CAPA ID), notification sent |

**BD codes:** BD-20 (AAL2, CRITICAL only)
**Max selection:** 200 complaints
**Preconditions:** Complaint state = OPEN (unclassified); no duplicate CAPA already exists for this complaint
**Evidence:** None
**E-signature:** BD-20 AAL2 (CRITICAL only)
**Friction:** Level 2 for routine; Level 3 for CRITICAL classification
**Live stream:** E5 `lro:{lro_id}`
**Per-pack overlay:** J4 — CRITICAL complaints are routed to AC-08 MDR Vigilance Triage Console automatically after classification. J1 — CRITICAL complaints linked to GMP products trigger GMP deviation review.

---

### AC-10 — Deviation Console

**Name:** Deviation Console
**AC ID:** AC-10
**Source workspace:** WS-NQCASE (GMP deviation queue) — J1 Pharma pack only

**Purpose:** QP (Qualified Person) review of GMP deviations linked to batches. Determines batch impact for each deviation, authorizes investigation, and records QP decision.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Deviation ID, linked batch, deviation type, detection phase, critical/major/minor classification, days since detection; filter by batch, deviation type; max 100 deviations |
| 2 — Confirmation | Per deviation: batch impact determination (NONE / MINOR / SIGNIFICANT / CRITICAL); if SIGNIFICANT or CRITICAL: root cause required in text field; investigation timeline (regulatory requirement: 30 calendar days); batch disposition decision if CRITICAL (QUARANTINE immediately) |
| 3 — Evidence | H4 evidence classes: DEVIATION_INVESTIGATION_REPORT (required for SIGNIFICANT/CRITICAL), BATCH_RECORD_REVIEW (required), RISK_ASSESSMENT (required for SIGNIFICANT/CRITICAL) |
| 4 — Authority Sign | BD-04 (QP Deviation Authorization); AAL3 (hardware token); single QP signatory |
| 5 — Submit | `POST /api/v1/action-consoles/deviation/execute`; batch impact assessments recorded; CRITICAL deviations trigger batch QUARANTINE; investigation LROs created |
| 6 — Result | 207; per deviation: impact determination recorded; quarantine triggered (if applicable); investigation task created |

**BD codes:** BD-04 (AAL3)
**Max selection:** 100 deviations
**Preconditions:** Deviation in OPEN state; batch exists and is not already RECALLED; submitting user is QP
**Evidence:** Investigation report (SIGNIFICANT/CRITICAL), Batch record review (required), Risk assessment (SIGNIFICANT/CRITICAL)
**E-signature:** BD-04, AAL3, single QP
**Friction:** Level 4 (AAL3, QP role gate)
**Live stream:** E5 `lro:{lro_id}`; quarantine events push immediately to WS-LOT live board
**Per-pack overlay:** J1 only

---

### AC-11 — LPA Audit Console

**Name:** LPA Audit Console (Layer Process Audit)
**AC ID:** AC-11
**Source workspace:** WS-JO or dedicated LPA schedule view — J2 Automotive pack only

**Purpose:** Executes Layer Process Audits across multiple production processes or work centers simultaneously. LPA is an AIAG-aligned structured audit process where supervisors, managers, and executives each audit the same process at different depths (layers).

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Audit ID, process/work center, scheduled layer (L1/L2/L3), scheduled auditor, LPA question set version; filter by layer, work center; max 50 LPA audit records per session |
| 2 — Confirmation | Per LPA record: confirm auditor identity; confirm audit date/time; confirm question set version (must match current approved version); precondition: auditor must be the layer's designated auditor (L1=Supervisor, L2=Manager, L3=Plant Manager/Engineering) |
| 3 — Evidence | No upload required — evidence is the structured LPA answer data entered in Phase 3 form |
| 3 (variant) — LPA Execution | Structured question-answer form per LPA record: per question (typically 5–20 per layer), Yes/No/NA response, finding capture (free text + category), photo attachment per finding |
| 4 — Authority Sign | No BD code for routine LPA — Phase 4 skipped |
| 5 — Submit | `POST /api/v1/action-consoles/lpa-audit/execute`; findings stored; auto-creates linked NC for any NOK finding rated MAJOR; corrective action tasks assigned per finding |
| 6 — Result | 207; per LPA: completion status, finding count (MAJOR/MINOR/OFI), NC records created (with IDs) |

**BD codes:** None (operational audit — non-regulated)
**Max selection:** 50 LPA records
**Preconditions:** LPA state = SCHEDULED; auditor is designated layer auditor; question set version is current; production process is active (associated JO is IN_PROGRESS)
**Evidence:** Structured LPA answer data (form-driven, not file upload)
**E-signature:** None
**Friction:** Level 1 for non-finding responses; Level 2 for MAJOR finding creation (forces confirmation + CAPA trigger decision)
**Live stream:** E5 `lpa.finding.captured` events; useful when a plant-level LPA session is running across multiple auditors simultaneously — each finding appears live on a shared session dashboard
**Per-pack overlay:** J2 only

---

### AC-12 — SCAR Issuance Console

**Name:** SCAR Issuance Console (Supplier Corrective Action Request)
**AC ID:** AC-12
**Source workspace:** WS-NQCASE (supplier-caused NC queue) or WS-INSP (incoming inspection failures)

**Purpose:** Issues Supplier Corrective Action Requests to external suppliers for quality failures attributable to those suppliers. Supports cross-tenant push via the inter-organization messaging layer.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows NC or Inspection record ID, supplier name, part number, defect description, severity; filter by supplier, part number, severity; max 100 records |
| 2 — Confirmation | Per record: SCAR type (IMMEDIATE_CORRECTIVE_ACTION / 8D_RESPONSE / PROCESS_CHANGE); supplier SCAR response due date; root cause determination required (Yes/No — 8D_RESPONSE requires it); supplier escalation level (1=Routine, 2=Formal Notice, 3=Disqualification Warning); cross-tenant notification method (portal push / EDI X12 / email fallback) |
| 3 — Evidence | H4 evidence classes: DEFECTIVE_SAMPLE_DOCUMENTATION (required), INSPECTION_RECORDS (required), MEASUREMENT_DATA (required for dimensional defects) |
| 4 — Authority Sign | BD-21 (Procurement/SQE SCAR Authorization); AAL2; Level 3 escalation additionally requires BD-10 (Supplier Qualification Authority) |
| 5 — Submit | `POST /api/v1/action-consoles/scar-issuance/execute`; SCAR records created; cross-tenant push initiated; supplier notification sent; linked NC/Inspection records updated with SCAR reference |
| 6 — Result | 207; per record: SCAR ID, cross-tenant push status (SENT / FALLBACK_EMAIL / FAILED), supplier notification delivery status |

**BD codes:** BD-21 (AAL2), BD-10 (AAL2, Level 3 escalation only)
**Max selection:** 100 NC or Inspection records
**Preconditions:** NC/Inspection attributable to supplier (supplier field populated); supplier exists in PREC master (AR-PREC-BASE); no duplicate open SCAR for the same NC; submitting user has SQE or Procurement role
**Evidence:** Defective sample docs (required), Inspection records (required), Measurement data (conditional)
**E-signature:** BD-21 AAL2; BD-10 AAL2 (Level 3 escalation)
**Friction:** Level 3; Level 4 for disqualification-warning escalation (requires dual BD-21 + BD-10)
**Live stream:** E5 `scar.delivered` / `scar.acknowledged` events update delivery status in result panel after submit
**Per-pack overlay:** J2 — AIAG SCAR format template auto-populated; customer notification required field added for OEM-impacting defects. J3 — ITAR check on supplier; if ITAR-restricted, cross-tenant push is blocked and fallback to encrypted email with ITAR header is used.

---

### AC-13 — Batch Release Console

**Name:** Batch Release Console
**AC ID:** AC-13
**Source workspace:** WS-LOT (batch queue in QP_REVIEW state) — J1 Pharma pack only

**Purpose:** QP (Qualified Person) reviews and releases multiple batches in a single authorized session. This is the highest-stakes console in the system — BD-03 at AAL3 is the strictest signature requirement. Feeds directly from AR-BREL-J1 eBR gate status.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Batch ID, product, batch size, manufacturing date, expiry date, QC result summary (PASS/FAIL/PENDING), deviation count, eBR completeness %; batches with ANY open deviation, incomplete eBR (<100%), or QUARANTINE flag are shown as INELIGIBLE; max 50 batches per QP session |
| 2 — Confirmation | Per batch: QP attestation checkboxes (each checkbox corresponds to a GMP §section: identity, quantity, quality tests, environmental monitoring, deviations cleared, labels); all checkboxes must be checked individually — no "select all"; batch destination market(s); any special release conditions (quarantine release, expedited release with conditions) |
| 3 — Evidence | H4 evidence classes: all AR-BREL-J1 evidence classes must be in SATISFIED state (checked automatically from E8 composition gate); if any class is MISSING or STALE, batch is moved to INELIGIBLE; no additional evidence upload in this AC |
| 4 — Authority Sign | BD-03 (QP Batch Release Authorization); AAL3 (hardware token mandatory — software token is rejected); single QP signatory; QP must be named QP on record for the batch's manufacturing site; quorum is single (QP sole authority per GMP) |
| 5 — Submit | `POST /api/v1/action-consoles/batch-release/execute`; batch states → RELEASED; QP_RELEASED flag set; Merkle anchor triggered per batch; eBR sealed as WORM-locked PDF |
| 6 — Result | 207; per batch: RELEASED chip + release timestamp; Merkle anchor hash; WORM PDF generation status; "Export Release Certificates" (signed PDF per batch) |

**BD codes:** BD-03 (AAL3, hardware token mandatory)
**Max selection:** 50 batches
**Preconditions:** Batch state = QP_REVIEW; eBR completeness = 100%; all H4 evidence classes SATISFIED; no open deviations rated SIGNIFICANT or CRITICAL; no active QUARANTINE flag; QP is named QP for manufacturing site
**Evidence:** All AR-BREL-J1 H4 classes must already be satisfied (no new upload in AC-13)
**E-signature:** BD-03, AAL3, hardware token mandatory, single QP
**Friction:** Level 4 — maximum; QP attestation checkboxes (GMP requirement); hardware token enforcement; real-time GMP deviation blocker visible in Phase 2
**Live stream:** E5 `batch.released` events; `merkle.anchor.complete` events update per-batch anchor hash in result panel
**Per-pack overlay:** J1 only. Note: AC-13 is the one console where the AC itself is the primary release surface (not a supplement to the AR shell). The AR shell AR-BREL-J1 shows the gate status; AC-13 is the execution surface.

---

### AC-14 — FAI Approval Console

**Name:** FAI Approval Console (First Article Inspection)
**AC ID:** AC-14
**Source workspace:** WS-INSP (FAI inspection queue) — J3 Aerospace pack only

**Purpose:** Engineering review and approval of First Article Inspection records per AS9102B. Can cover multiple FAI records (one per part number) in a single authorized session.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows FAI Record ID, part number, revision, AS9102B Form 1/2/3 completeness %, bubble extraction completeness %, NADCAP cert status; ITAR controlled flag; max 30 FAI records |
| 2 — Confirmation | Per FAI: engineering review notes (minimum 30 characters); conditional approval allowances (if any characteristic has a waiver); customer notification required (Yes/No); customer approval required for PPAP Level (3/4/5) |
| 3 — Evidence | H4 evidence classes: AS9102B_FORMS_COMPLETE (required — verified against AI-08 bubble extraction completeness), BALLOONED_DRAWING (required), MATERIAL_CERT (required), PROCESS_CERT (required per applicable special process) |
| 4 — Authority Sign | BD-07 (Engineering FAI Approval Authority); AAL2; if ITAR controlled: additionally BD-17 (ITAR clearance) |
| 5 — Submit | `POST /api/v1/action-consoles/fai-approval/execute`; FAI records → APPROVED; customer submission packages generated |
| 6 — Result | 207; FAI ID + approval timestamp; customer package generation status; NADCAP link verification |

**BD codes:** BD-07 (AAL2), BD-17 (AAL2, ITAR conditional)
**Max selection:** 30 FAI records
**Preconditions:** FAI in PENDING_APPROVAL state; AS9102B forms ≥95% complete (100% required for final approval — 95% allows conditional); AI-08 bubble extraction complete; NADCAP certs valid (not expired); submitting user has Engineering approval role
**Evidence:** AS9102B forms (required), Ballooned drawing (required), Material cert (required), Process certs (conditional)
**E-signature:** BD-07 AAL2; BD-17 AAL2 (ITAR)
**Friction:** Level 3; Level 4 for ITAR-controlled FAIs
**Live stream:** E5 `lro:{lro_id}`
**Per-pack overlay:** J3 only

---

### AC-15 — PPAP Submission Console

**Name:** PPAP Submission Console
**AC ID:** AC-15
**Source workspace:** WS-JO or WS-ECO (PPAP-triggered) — J2 Automotive pack only

**Purpose:** Assembles and submits PPAP (Production Part Approval Process) packages to OEM customers. Covers PPAP Levels 1–5. Bulk submission is useful when a single engineering change affects multiple part numbers each requiring a PPAP update.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows PPAP Record ID, part number, PPAP Level, customer, submission due date, element completeness %; PPAP records with missing mandatory elements shown as INELIGIBLE; max 20 PPAP records |
| 2 — Confirmation | Per PPAP: submission method (Customer Portal / AIAG APQP/PPAP web service / PDF package); Level confirmation; part submission warrant (PSW) review; any open deviations or conditional approvals documented |
| 3 — Evidence | H4 evidence classes: DESIGN_RECORDS (required L3+), ENGINEERING_CHANGE_DOCUMENTS (required if ECO triggered), CUSTOMER_ENGINEERING_APPROVAL (required L3+), DIMENSIONAL_RESULTS (required all levels), MSA_STUDIES (required L3+), MATERIAL_TEST_RESULTS (required), CPKPQC_RESULTS (required L3+), PSW_SIGNED (required all levels — PSW is the customer-facing warrant) |
| 4 — Authority Sign | BD-23 (Engineering/Quality PPAP Submission Authority); AAL2; if customer requires: customer portal sign-on credential (external OEM system — OEM-specific integration) |
| 5 — Submit | `POST /api/v1/action-consoles/ppap-submission/execute`; PPAP package assembled as signed PDF archive; submitted to customer portal or AIAG web service; PSW generated |
| 6 — Result | 207; per PPAP: customer submission confirmation / portal ticket number; OEM status (PENDING_REVIEW / APPROVED / CONDITIONALLY_APPROVED) if synchronous response available |

**BD codes:** BD-23 (AAL2)
**Max selection:** 20 PPAP records
**Preconditions:** PPAP element completeness = 100% for mandatory elements per level; PSW signed (internal, AR-JO-J2 level); no open ECOs that would invalidate the submitted revision; submitting user has PPAP Coordinator or Engineering role
**Evidence:** Level-dependent (full list above in Phase 3)
**E-signature:** BD-23 AAL2
**Friction:** Level 3 (externally-facing regulatory submission)
**Live stream:** E5 `ppap.submission.response` for OEM portals that provide webhook callbacks
**Per-pack overlay:** J2 only

---

### AC-16 — UDI Submission Console

**Name:** UDI Submission Console (Unique Device Identifier)
**AC ID:** AC-16
**Source workspace:** WS-LOT or device registration queue — J4 Medical Device pack only

**Purpose:** Bulk submission of UDI data to FDA GUDID (Global Unique Device Identification Database) and sync with EUDAMED (European database of medical devices). Each UDI record represents a device version or lot that requires regulatory registration.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Device Record ID, DI (Device Identifier), PI (Production Identifier — lot/batch), device name, classification (Class I/II/III), GUDID submission status (NOT_SUBMITTED / PENDING / SUBMITTED / ERROR), EUDAMED status; max 500 device records |
| 2 — Confirmation | Per device: confirm Basic UDI-DI, confirm labeler DUNS/GLN, confirm device description and intended use (GUDID required fields); EUDAMED sync flag (Yes/No per device — not all products require EUDAMED); legacy conversion flag (pre-UDI product being registered for first time) |
| 3 — Evidence | H4 evidence classes: LABELING_PACKAGE (required — all labeling materials in current version), DEVICE_DESCRIPTION_DOCUMENT (required), 510K_OR_PMA_REFERENCE (required for Class II/III) |
| 4 — Authority Sign | BD-24 (Regulatory Affairs UDI Submission Authority); AAL2 |
| 5 — Submit | `POST /api/v1/action-consoles/udi-submission/execute`; GUDID SOAP/REST API calls per device; EUDAMED REST API calls for EU-bound devices; GS1 validation pre-submission |
| 6 — Result | 207; per device: GUDID confirmation (DI published timestamp) / GUDID error code; EUDAMED EUDAMED ID / sync status; "Download UDI Submission Manifest" |

**BD codes:** BD-24 (AAL2)
**Max selection:** 500 device records
**Preconditions:** Device in REGISTERED or PENDING_UDI state; labeling package complete; DUNS/GLN registered; Class II/III have 510(k) or PMA reference on file; submitting user has Regulatory Affairs role
**Evidence:** Labeling package (required), Device description (required), Regulatory clearance reference (Class II/III)
**E-signature:** BD-24 AAL2
**Friction:** Level 3 (externally-facing FDA submission)
**Live stream:** E5 `gudid.response.received` / `eudamed.sync.complete` events update per-device status in result panel
**Per-pack overlay:** J4 only

---

### AC-17 — Audit Pack Assembly Console

**Name:** Audit Pack Assembly Console
**AC ID:** AC-17
**Source workspace:** Any WS (cross-domain console accessible from navigation)

**Purpose:** Assembles signed, tamper-evident audit packs from selected records and evidence across any domain. Used for external audits (regulatory inspections, customer audits, certification body audits). Produces a cryptographically signed archive.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Cross-domain record picker: select any combination of NC records, CAPAs, Inspection records, Training records, CDOC records, Lots, Batches, Signatures; add individual Evidence items; max 1,000 items; organize into named sections (user-defined) |
| 2 — Confirmation | Audit pack name; audit type (REGULATORY_INSPECTION / CUSTOMER_AUDIT / CERTIFICATION_AUDIT / INTERNAL_PREPARATION); auditor/audience; confidentiality classification (PUBLIC / CONFIDENTIAL / RESTRICTED); include audit trail for each record (Yes/No — significantly increases pack size) |
| 3 — Evidence | No additional evidence capture — records and evidence already attached in Phase 1 are the content |
| 4 — Authority Sign | BD-25 (Audit Pack Authorization); AAL2; pack cannot be generated without authorization signature — ensures accountability for what is disclosed |
| 5 — Submit | `POST /api/v1/action-consoles/audit-pack/execute`; LRO assembles pack (potentially large — may take 1–5 minutes); SHA-256 hash of pack generated; BD-25 signature embedded in pack manifest; pack uploaded to secure storage; download URL generated |
| 6 — Result | Single result (not 207 per record); "Download Audit Pack" (signed ZIP archive with manifest); pack hash for independent verification; pack access log shown (who has downloaded) |

**BD codes:** BD-25 (AAL2)
**Max selection:** 1,000 items (cross-domain)
**Preconditions:** User has read access to every record and evidence item selected; confidentiality classification does not exceed user's clearance level; ITAR-controlled items require ITAR clearance
**Evidence:** Content is the selection itself
**E-signature:** BD-25 AAL2
**Friction:** Level 3 (disclosure of potentially regulated records to external parties)
**Live stream:** E5 `lro:{lro_id}` tracks pack assembly progress (large packs can take significant time); progress bar shows "Assembling section {n} of {m}"
**Per-pack overlay:** All packs — cross-domain. J1 pharma: GMP audit pack includes eBR seals per batch. J3 aerospace: ITAR classification filtering enforced. J4 medical device: MDR/vigilance file exclusion option (some regulatory disclosures are restricted from customer audit packs).

---

### AC-18 — Training Bulk Sign-Off Console

**Name:** Training Bulk Sign-Off Console
**AC ID:** AC-18
**Source workspace:** WS-TRAIN (Training Matrix Workspace — Slice 3 root)

**Purpose:** Trainers sign off multiple training records in a single authorized session after conducting a group training session (classroom, OJT group, or read-and-sign batch). Replaces one-at-a-time AR-TRAIN-BASE sign-off for batch scenarios.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Grid shows Training Record ID, trainee name, training topic, training type, session date, trainee assessment score (if applicable); filter by topic, session date, training type; max 500 training records per sign-off session |
| 2 — Confirmation | Session confirmation: training topic, session date, training method, training location, training materials version; trainer confirms: all trainees were present and participated; assessment scores verified (if scored); any trainees marked NOT_COMPETENT (they appear as separate bucket; their records will be set to FAILED, not COMPLETED) |
| 3 — Evidence | H4 evidence classes: ATTENDANCE_RECORD (required — signed attendance sheet or digital log), TRAINING_MATERIALS_VERSION (required — version reference of materials used), ASSESSMENT_RESULTS (required if assessment conducted) |
| 4 — Authority Sign | BD-08 (Trainer Sign-Off Authorization); AAL2; single trainer signatory |
| 5 — Submit | `POST /api/v1/action-consoles/training-bulk-signoff/execute`; COMPLETED records → COMPLETED state, validity period calculated from session date; FAILED records → state = FAILED, requires re-assignment |
| 6 — Result | 207; per trainee: COMPLETED chip (with expiry date) or FAILED chip (with reason); "Export Training Certificate CSV" |

**BD codes:** BD-08 (AAL2)
**Max selection:** 500 training records
**Preconditions:** Training records in PENDING_SIGN_OFF state; all records belong to same training topic and session (cross-topic bulk sign-off not permitted — one AC per topic per session); trainer is credentialed for the training topic
**Evidence:** Attendance record (required), Materials version (required), Assessment results (conditional)
**E-signature:** BD-08 AAL2
**Friction:** Level 2 (state transition affecting competency records)
**Live stream:** E5 `lro:{lro_id}`
**Per-pack overlay:** All packs — training is universal. J1 — GMP training completion triggers automatic check of GMP training matrix completeness for the operator's role; incomplete matrix flagged in result panel. J3 — ITAR-controlled training topics require ITAR-cleared trainer; validated in Phase 2 precondition.

---

### AC-19 — Evidence Freshness Remediation Console

**Name:** Evidence Freshness Remediation Console
**AC ID:** AC-19
**Source workspace:** Cross-domain (system health dashboard or any WS with stale evidence chips)

**Purpose:** Manages stale evidence across the system — identifies records whose evidence classes have lapsed their freshness threshold (per H4 §3), assigns remediation owners, sets deadlines, and sends notifications. This is an administrative console used by QA managers to prevent evidence composition gate failures from accumulating.

**Phase specifications:**

| Phase | Detail |
|-------|--------|
| 1 — Selection | Cross-domain grid showing records (any root) with at least one STALE or MISSING evidence class; columns: Record ID, Root Type, Evidence Class, Staleness Duration, Responsible Owner (current), Priority (auto-scored: critical = STALE + regulated state; high = STALE + open state; medium = MISSING + draft state); filter by root type, evidence class, staleness duration; max 1,000 records |
| 2 — Confirmation | Per record (or group-assign for same-class records): new responsible owner assignment (picker — user must have Contributor or above on that record's root); remediation deadline (date picker; system suggests: today + freshness threshold for that class); escalation path (who to notify if not remediated by deadline); bulk assignment mode: assign all selected records to same owner + same deadline |
| 3 — Evidence | No evidence upload in this AC — this console assigns remediation tasks, not captures evidence itself |
| 4 — Authority Sign | No BD code for routine remediation assignment — Phase 4 skipped |
| 5 — Submit | `POST /api/v1/action-consoles/evidence-freshness/execute`; remediation tasks created (linked to record + evidence class); notification messages dispatched to assigned owners; deadline calendar entries created if calendar integration configured |
| 6 — Result | 207; per record: task ID created, owner notified (notification delivery status), deadline set; "Export Remediation Task List" (CSV with all assignments) |

**BD codes:** None (administrative task assignment — non-regulated)
**Max selection:** 1,000 records (cross-domain)
**Preconditions:** Record exists and is accessible by the submitting user; assigned owner has at least Contributor access to each record; deadline must be in the future
**Evidence:** None
**E-signature:** None
**Friction:** Level 1 (administrative assignment action — no regulatory consequence; the evidence attachment itself carries friction when the owner later performs it)
**Live stream:** E5 `notification.delivered` events update delivery status per record in result panel
**Per-pack overlay:** All packs. J1 — GMP evidence classes have regulatory-mandated freshness thresholds (e.g., environmental monitoring must not be older than 6 months); these are highlighted with regulatory flag in Phase 1 grid. J3 — AS9100 calibration certs have mandatory re-certification windows; flagged as REGULATORY_MANDATORY in priority scoring.

---

## 3. Per-AC L1 Enforcement Summary

Bulk operations in HESEM never provide a shortcut around per-record L1 §4 triple defense. The following enforcement rules apply uniformly to every AC:

### 3.1 Pre-Submit Validation (Phase 2 precondition check)

Every AC sends selected record IDs through `POST /api/v1/action-consoles/{ac-id}/validate` before Phase 3 begins. This endpoint runs:

1. **State gate check:** Is each record in an eligible state for this action?
2. **Role gate check:** Does the submitting user have the required role scope for each record?
3. **Banned-decision check:** Does any record have an active banned-decision flag (L1 §4 — e.g., regulatory hold, open WORM violation, blocked combination of states)?
4. **Pack-specific checks:** Additional checks per pack overlay (e.g., eBR completeness for J1 batch release, ITAR clearance for J3 ITAR-controlled records)

Records failing any check are placed in the INELIGIBLE bucket in Phase 2. They are displayed to the user with the specific failure reason. The user may:
- Remove ineligible records and proceed with the eligible subset
- Cancel the entire AC to investigate the ineligible records individually
- The user cannot override ineligible status without navigating to the individual AR shell and resolving the underlying issue

### 3.2 Server-Side Per-Record Processing (Phase 5)

Even after Phase 2 validation, the server re-runs L1 §4 checks at the moment of processing for each record (time-of-check to time-of-use gap). If a record's state changed between Phase 2 validation and Phase 5 execution:

- That record is returned with HTTP 409 PRECONDITION_FAILED in the 207 response
- Chip label: "Conflict — state changed"
- The other records in the batch are not affected

### 3.3 Banned-Decision Blocked Records in 207

Records blocked by the banned-decision check at Phase 5 processing time are returned with HTTP 403 FORBIDDEN and `banned_decision_blocked: true` in the 207 response body. These records:

- Show the chip label "Policy Block" (token `--chip-banned-bg`)
- Display the specific banned-decision rule that was triggered (e.g., "BD-RULE-04: QP Batch Release cannot proceed while CRITICAL deviation is open")
- Cannot be retried from the AC — must be resolved at the AR shell level first
- The blocked record event is logged to the audit stream as a `banned_decision_trigger` event

### 3.4 No Batch Override of Individual Friction

The friction level required for an individual record applies equally in a batch context. For example, if a single CAPA effectiveness closure requires Level 3 friction (BD-03 AAL2 e-signature), bulk-closing 50 CAPAs still requires the same BD-03 AAL2 e-signature — the signature covers all records in the batch, but it cannot be downgraded or bypassed because it is bulk.

For BD code quorum requirements: if a single record requires a two-signatory quorum (e.g., BD-22 for lot recall), the AC implementing AC-04 requires that same quorum for every lot in the batch. The quorum is collected once for the batch but is cryptographically associated with every lot record in the submission.

---

## 4. Live Stream Integration Detail (E5 §2.4)

### 4.1 WebSocket Topic Structure

| AC | LRO topic | Per-record event types |
|----|-----------|----------------------|
| AC-01 | `lro:{lro_id}` | `nc.disposed`, `lot.quarantined` (side-effect) |
| AC-02 | `lro:{lro_id}` | `capa.closed`, `capa.reopened` |
| AC-03 | `lro:{lro_id}` | `jo.released`, `wo.created` |
| AC-04 | `lro:{lro_id}` | `lot.recalled`, `regulatory.notification.sent` |
| AC-05 | `ccp.{run_id}` | `ccp.reading.stored`, `ccp.deviation.detected` |
| AC-06 | `lro:{lro_id}` | `lot.quarantined`, `vrs.response.received` |
| AC-07 | `lro:{lro_id}` | `gidep.submission.response` |
| AC-08 | `lro:{lro_id}` | `mdr.submitted`, `complaint.closed` |
| AC-09 | `lro:{lro_id}` | `complaint.classified`, `capa.created` |
| AC-10 | `lro:{lro_id}` | `deviation.assessed`, `batch.quarantined` |
| AC-11 | `lpa.{session_id}` | `lpa.finding.captured`, `nc.created` |
| AC-12 | `lro:{lro_id}` | `scar.created`, `scar.delivered` |
| AC-13 | `lro:{lro_id}` | `batch.released`, `merkle.anchor.complete`, `ebr.sealed` |
| AC-14 | `lro:{lro_id}` | `fai.approved` |
| AC-15 | `lro:{lro_id}` | `ppap.submitted`, `ppap.submission.response` |
| AC-16 | `lro:{lro_id}` | `gudid.response.received`, `eudamed.sync.complete` |
| AC-17 | `lro:{lro_id}` | `lro.progress` (pack assembly %) |
| AC-18 | `lro:{lro_id}` | `training.completed`, `training.failed` |
| AC-19 | `lro:{lro_id}` | `notification.delivered`, `task.created` |

### 4.2 WebSocket Disconnection Handling During Phase 5

If the WebSocket disconnects during Phase 5 (Submit):

1. Client immediately renders a degraded-mode banner (token `--banner-degraded-bg`): "Live updates disconnected — results may be delayed"
2. Client falls back to polling `GET /api/v1/lro/{lro_id}/status?include_records=true` every 5 seconds
3. Progress bar continues advancing based on polled `lro.progress` field
4. On WebSocket reconnection, client re-subscribes and reconciles any missed events against the latest `lro/status` snapshot
5. Once LRO status = COMPLETE, polling stops and final 207 result is rendered from the LRO result payload

### 4.3 ARIA Live Regions During Phase 5

- Progress bar: `role="progressbar"`, `aria-valuenow="{n}"`, `aria-valuemax="{total}"`, `aria-label="Processing: {n} of {total} records complete"`
- Each row chip update: surrounding region has `aria-live="polite"` so screen readers announce each completion without interruption
- Error/banned-decision events: `aria-live="assertive"` with announcement "{record ID}: {error reason}" — these are more urgent
- LRO completion: `aria-live="assertive"` announces "All records processed. View results below."

---

`S3-09_F6_ACTION_CONSOLE_DEEP_UPGRADE_COMPLETE`

---

`S3-09_F5_F6_DEEP_UPGRADE_COMPLETE`
