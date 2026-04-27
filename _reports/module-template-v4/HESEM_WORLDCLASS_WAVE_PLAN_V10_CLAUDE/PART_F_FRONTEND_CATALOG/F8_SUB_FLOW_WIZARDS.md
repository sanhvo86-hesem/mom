# F8 — Sub-Flow Wizards

## Wizard Pattern Overview

The Wizard pattern sequences a complex multi-step workflow through a defined
set of step kinds. Wizards open as one of two surfaces:

- **Full-page overlay** — layered above the current route using a high
  z-index panel with its own back/close controls. URL does not change. Used
  for short wizards (≤3 steps) that do not require save-resume.
- **URL-routed multi-step page** — each step has its own URL segment (e.g.
  `/wizard/eco-authoring/<lro_id>/step/2`). Required for any wizard with
  save-resume (E13 LRO) support. Browser Back button navigates to previous
  step; browser Refresh restores step from LRO checkpoint.

Graphics Authority compliance is mandatory: no hardcoded colors, sizes, or
motion durations anywhere in wizard components.

---

## Universal Step Kinds

### data-entry
- Form fields rendered by `ControlKit.*` widget factories.
- Default values loaded from E4/E5 API before step renders.
- Client-side validation fires on blur and on "Next" attempt.
- "Save as Draft" button (if LRO-enabled): commits current step fields to
  the E13 LRO checkpoint via `PATCH /api/v1/lro/<id>/checkpoint`.
- Step-level progress indicator: `Step n of m — <Step Name>`.

### attach-evidence
- E8 evidence composition gate displays which evidence classes are required
  for the current step and which are optional.
- Required classes highlighted with a `--color-required` border token.
- E12 upload inline (single-file per upload action; multiple uploads
  permitted until all required classes satisfied).
- Upload progress bar; scan status indicator (see NRD-07 for scan states).
- "Next" button disabled until all required evidence classes have at least
  one approved attachment.

### review
- Read-only summary of all data entered in preceding steps.
- Diff-from-current-state view: fields that differ from the record's current
  server state are highlighted with a `--color-diff-added` chip. Fields
  deleted are shown with `--color-diff-removed`.
- Annotate: user may add a review note (stored as EC-24 annotation) without
  altering any entered data.
- Scroll-reviewed confirmation: "I have reviewed the above summary" checkbox
  required before "Next"; tracked via `IntersectionObserver` sentinel on last
  section.

### approval
- E7 e-signature per BD code (see NRD-03 for full e-signature specification).
- AAL indicator shown prominently.
- Quorum progress bar if step requires multiple signatories.
- Hardware token prompt for AAL3 steps.
- Step blocked until quorum is met; partial quorum state persisted in LRO.

### submission
- Commits the entire wizard payload to the target system.
- Three sub-modes:
  - **E3 workflow commit** — single `POST` or `PATCH` to the domain API.
  - **E11 bulk submit** — batched multi-record submission LRO.
  - **E15 regulatory submit** — cross-tenant or external regulatory channel.
- LRO operation shown as a progress indicator with polling (`GET
  /api/v1/lro/<id>` every 3 seconds).
- On LRO completion: success state shown with result summary + link to
  submitted record.
- On LRO failure: error detail rendered inline (RFC 9457 body); retry option
  if idempotent; abort option if not.

### effectivity-date
- Calendar date picker with time selector (timezone displayed in user's
  locale).
- Blocked dates:
  - Change-freeze periods: loaded from `GET /api/v1/calendar/freeze-periods`.
  - Regulatory windows where changes are prohibited (pack-specific).
  - Past dates (unless wizard explicitly allows backdating with a mandatory
    NRD-04 reason capture).
- Selected date validated against `POST /api/v1/calendar/validate-date` on
  change.

### notification
- Preview list of all users and roles who will receive notifications when the
  wizard submits. Source: E10 notification resolver.
- Notification channel shown per recipient (in-app, email, SMS, cross-tenant
  EDI).
- User may add ad-hoc recipients (free-text email or user search).
- User may customize the notification subject and body (within template
  bounds defined by the notification template for this wizard type).
- Per-pack regulatory notification preview: for E15 channels, a read-only
  preview of the formatted regulatory message is shown (J1: FDA 15-day
  ICSR; J4: MDR Art.87 notification; J5: USDA-FSIS notification).

### training-assign
- Displays the list of training modules affected by the change (resolved by
  `GET /api/v1/training/impact?change_id=<id>`).
- For each training module: list of personnel roles required to complete it.
- User selects a completion deadline per training module (date picker,
  minimum 5 business days from effectivity date).
- Personnel search to add individuals not covered by role rules.
- Training assignments committed as part of the wizard submission step (not
  independently saved).

---

## Save-Resume via E13 LRO

Wizards with `lro_save_resume: true` persist state to an E13 Long-Running
Operation checkpoint after each step transition.

- `operation_type` = wizard-specific constant (e.g.
  `"WZ_ECO_AUTHORING"`, `"WZ_RECALL_INITIATION"`).
- On browser close / navigation away with unsaved wizard: a browser
  `beforeunload` event triggers a final checkpoint save.
- On next visit to the triggering route: a `ResumeBanner` component checks
  `GET /api/v1/lro?operation_type=<type>&status=in_progress&actor=me`. If
  an in-progress LRO exists, the banner prompts: "You have an unfinished
  [Wizard Name]. Resume where you left off?"
- Resume: navigates to `/wizard/<type>/<lro_id>/step/<last_completed + 1>`.
- **Draft retention:** LROs in `draft` state retained 30 days.
- **Abandoned LRO auto-cancellation:** LROs with no checkpoint update for
  7 days are auto-cancelled by a scheduled job; actor receives in-app
  notification.

---

## Friction Level (L1 §6)

Each wizard is assigned a friction level that controls the density of
confirmation steps, required signatures, and mandatory review dwell time.

| Level | Description |
|-------|-------------|
| L1 | Informational only; no signature; single-step confirm |
| L2 | One-step sign-off; review step present |
| L3 | Multi-sign approval; review scroll-confirmation required |
| L4 | Multi-sign + QA Director or equivalent; regulatory submission; non-waivable |

---

## Wizard Catalog

---

### WZ-01 — NPI (New Product Introduction)

**Trigger:** "Introduce New Product" action on the Master Data root (MDAT
workspace).

**Steps:**
1. `data-entry` — Product specification: product code, description, product
   family, unit of measure, regulatory classification, pack-specific
   classification (e.g. INN for J1, device class for J4, commodity type for
   J5). Defaults from product template if selected.
2. `attach-evidence` — Design inputs (EC-16 design input document). Required
   classes: EC-16. Optional: EC-01 (reference image).
3. `review` — Full summary of product spec + attached evidence.
4. `approval` — BD-7 (Product Manager + QA Lead sign). AAL2. Quorum: 2.
5. `effectivity-date` — When the product becomes active in the catalog.
6. `notification` — Product team, procurement, planning notified.
7. `training-assign` — Assign relevant training modules to manufacturing and
   quality personnel.

**BD codes:** BD-7.
**Evidence classes:** EC-16 (required), EC-01 (optional).
**LRO save-resume:** Yes.
**Regulatory submission:** None.
**Friction level:** L3.

---

### WZ-02 — Customer Onboarding

**Trigger:** "Onboard New Customer" action on the Commercial Customer root.

**Steps:**
1. `data-entry` — Company name, legal entity type, country, primary contacts,
   portal tier (Standard / Professional / Enterprise), credit terms,
   assigned account manager.
2. `attach-evidence` — NDA (EC-09), CVLP agreement (EC-10). Both required.
3. `review` — Customer profile summary + document checklist.
4. `approval` — Sales Lead e-signature (BD-8, AAL2).
5. `submission` — E3 creates customer record and cross-links portal tenant
   if Enterprise tier; E15 sends welcome notification.
6. `notification` — Account manager, finance, order management notified.

**BD codes:** BD-8.
**Evidence classes:** EC-09, EC-10.
**LRO save-resume:** Yes.
**Regulatory submission:** None.
**Friction level:** L2.

---

### WZ-03 — Audit Pack Export

**Trigger:** "Export Audit Pack" action on the Quality Improvement or
Traceability root.

**Steps:**
1. `data-entry` — Scope: date range, record types (CAPA, NCI, deviations,
   etc.), regulation profile (ISO 9001, GMP, MDR, AS9100, etc.), output
   format (PDF bundle / ZIP of originals).
2. `attach-evidence` — Optional supplementary documents the submitter wants
   to include (e.g. management review minutes).
3. `review` — Estimated record count, size estimate, scope summary.
4. `approval` — Compliance Lead e-signature (BD-14, AAL2).
5. `submission` — E13 LRO: `operation_type = "WZ_AUDIT_EXPORT"`. LRO
   assembles the pack in background (potentially minutes for large scopes).
6. `notification` — When LRO completes: submitter and compliance lead receive
   download link notification. Link expires in 48 hours.

**BD codes:** BD-14.
**Evidence classes:** EC-optional.
**LRO save-resume:** Yes (pre-submission steps only; submission LRO is its
own operation).
**Regulatory submission:** None (internal export; external submission is a
separate action).
**Friction level:** L3.

---

### WZ-04 — Tenant Provisioning

**Trigger:** Platform Admin action on the Core Infrastructure admin panel.

**Steps:**
1. `data-entry` — Tenant name, tenant slug, region (cloud region from
   allowed list), active packs (J1/J2/J3/J4/J5 checkboxes), admin user
   email, database tier, storage tier, feature flags preset.
2. `review` — Provisioning summary with cost estimate and infrastructure
   checklist.
3. `approval` — Platform Admin e-signature (BD-25, AAL3 mandatory — hardware
   token required).
4. `submission` — E13 provision LRO: `operation_type = "WZ_TENANT_PROVISION"`.
   Provisions database schema, object storage bucket, Redis namespace, tenant
   admin user, initial feature flags. Progress shown step by step.
5. `notification` — Tenant admin user receives welcome email with first-login
   instructions. Platform admin receives confirmation.

**BD codes:** BD-25.
**Evidence classes:** None.
**LRO save-resume:** Yes.
**Regulatory submission:** None.
**Friction level:** L4 (AAL3 sign; infrastructure change; non-waivable).

---

### WZ-05 — VMP (Validation Master Plan) Authoring

**Trigger:** "Create VMP" action on the Quality Improvement root (J1/J4).

**Steps:**
1. `data-entry` — System/process name, system scope description, risk class
   (Low/Medium/High/Critical per GAMP 5 / ISPE), validation approach
   (prospective/retrospective/concurrent), regulatory framework (21 CFR §11,
   EU Annex 11, MDR Annex IX).
2. `attach-evidence` — Risk assessment (EC-17 required). Optional: prior
   validation report (EC-07), supplier qualification data (EC-13).
3. `review` — VMP structure preview with section headings auto-generated
   from the entered scope and risk class.
4. `approval` — QA Lead e-signature (BD-19, AAL2). If Critical risk class:
   Regulatory Affairs sign also required (quorum 2).
5. `effectivity-date` — Validation start date; must fall outside freeze
   periods.
6. `training-assign` — Assign validation protocol training to validation
   team members.

**BD codes:** BD-19 (+ optional Regulatory Affairs sign for Critical).
**Evidence classes:** EC-17 (required), EC-07 (optional), EC-13 (optional).
**LRO save-resume:** Yes.
**Regulatory submission:** None (VMP is internal; individual protocol
submissions are separate).
**Friction level:** L3.

---

### WZ-06 — URS/FS/DS Authoring (Requirements Document)

**Trigger:** "Create Requirements Document" action from a VMP record.

**Steps:**
1. `data-entry` — Document type (URS / FS / DS), parent system, requirement
   entries (repeatable section: requirement ID, requirement text, category,
   source regulation, test method reference).
2. `review` — Traceability matrix generated client-side: maps URS
   requirements to FS/DS entries where linked. Gaps highlighted.
3. `approval` — Multiple signatories per requirement category (category
   mapping loaded from system configuration; e.g. "Safety requirements" →
   Safety Engineer sign, "Regulatory requirements" → Regulatory Affairs sign).
   Quorum varies by document type.

**BD codes:** Category-dependent (loaded from `GET /api/v1/requirement-
categories/<system_id>/bd-map`).
**Evidence classes:** None mandatory; EC-16 optional (reference design doc).
**LRO save-resume:** Yes (requirement entry step can be long).
**Regulatory submission:** None (document stored in DHF/VMP; referenced
from DHF wizard WZ-14).
**Friction level:** L3.

---

### WZ-07 — Disaster Recovery Drill

**Trigger:** "Run DR Drill" action on the Core Infrastructure admin panel.

**Steps:**
1. `data-entry` — Drill scope (systems included), drill type (failover /
   restore / network partition), target RTO, target RPO.
2. `submission` — E13 DR drill LRO: `operation_type = "WZ_DR_DRILL"`.
   Drill executes infrastructure failover scenario. Progress streamed via
   LRO polling.
3. `review` — Drill results: actual RTO, actual RPO, systems recovered,
   errors encountered. Diff from targets highlighted.
4. `approval` — IT Lead e-signature (BD-26, AAL2) attesting results are
   accurate.
5. `attach-evidence` — DR evidence document (EC-07 required; attach drill
   logs and measurement report).

**BD codes:** BD-26.
**Evidence classes:** EC-07.
**LRO save-resume:** No (drill is a live operation; cannot pause mid-drill).
**Regulatory submission:** None.
**Friction level:** L3.

---

### WZ-08 — Recall Initiation (J1, J4, J5)

**Trigger:** "Initiate Recall" action on a Lot or Traceability record.

**Steps:**
1. `data-entry` — Lot range (from AI-20 distribution trace recommendation
   pre-filled, user editable), recall class (Class I/II/III for J1;
   FSMA Class for J5; vigilance for J4), recall reason narrative, distribution
   scope summary (countries, trading partners from traceability graph).
2. `review` — Scope estimate: number of units, number of accounts, number
   of countries. Traceability coverage percentage shown. Any gaps in
   traceability coverage flagged as risk items.
3. `approval` — QA Director e-signature (BD-22, AAL3 mandatory).
4. `submission` — E15 regulatory submission: FDA MedWatch (J1), FDA MAUDE
   (J4), USDA-FSIS (J5). E15 cross-tenant notification to affected trading
   partners.
5. `notification` — Internal: executive team, legal, supply chain. External
   (via E15): trading partners with affected lots receive structured recall
   notification with return instructions.

**BD codes:** BD-22.
**Evidence classes:** None mandatory at initiation (evidence attached to
individual lot investigation records).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 — FDA MedWatch / MAUDE / USDA-FSIS;
cross-tenant trading partner notification.
**Friction level:** L4 (AAL3; regulatory submission; QA Director quorum
non-waivable).

---

### WZ-09 — Mock Recall Drill

**Trigger:** "Run Mock Recall Drill" from the Traceability root.

Identical structure to WZ-08 with two differences:
- `drill_mode: true` flag sent on every API call; endpoints respond with
  simulated but non-committed results.
- Submission step: no E15 regulatory submission issued. Instead, a drill
  results report is generated and attached as EC-07.
- Approval: Quality Lead (BD-14, AAL2) instead of QA Director.

**LRO save-resume:** Yes.
**Regulatory submission:** None (drill only).
**Friction level:** L3.

---

### WZ-10 — PPAP Submission (J2 automotive)

**Trigger:** "Create PPAP Submission" on the Quality Improvement root.

**Steps:**
1. `data-entry` — Part number, part revision, customer name, submission
   level (1 through 5 per AIAG PPAP 4th edition), reason for submission
   (new part / engineering change / tooling change / etc.).
2. `attach-evidence` — All PPAP elements required for the selected
   submission level. Elements 1–18 per AIAG reference; required/optional
   per level loaded from `GET /api/v1/ppap/level/<n>/requirements`. NRD-14-J2
   drawer opens per element for structured element entry. All required
   elements must show `Submitted` status before Next.
3. `review` — PPAP element checklist summary. Elements missing or
   incomplete highlighted. Submission level checklist cross-referenced.
4. `approval` — Quality Lead + Customer Approval Representative e-signatures
   (BD-11, AAL2, quorum 2).
5. `submission` — E15 OEM portal submission: structured PPAP data package
   transmitted via configured OEM API. LRO tracks submission status.

**BD codes:** BD-11.
**Evidence classes:** Per-element (up to 18 evidence classes, element-
specific).
**LRO save-resume:** Yes (PPAP element entry can span days).
**Regulatory submission:** E15 OEM portal.
**Friction level:** L4.

---

### WZ-11 — PSW Sign-off (J2 automotive)

**Trigger:** "Sign Part Submission Warrant" from a completed PPAP submission.

**Steps:**
1. `data-entry` — PSW warrant fields: part number, revision level, drawing
   number, engineering change level, purchase order number, weight, material,
   inspection results summary (pass/fail per attribute), functional check
   result, dimensional results (conforming/non-conforming), appearance
   approval (if required).
2. `review` — Complete warrant preview rendered as a formatted document
   matching AIAG PSW form layout.
3. `approval` — Design Responsible Engineer sign + QA sign (BD-11 sub-flow,
   AAL2, quorum 2).
4. `submission` — AS2 EDI transmission to OEM (E15). Transaction ID returned
   and stored on PSW record.

**BD codes:** BD-11 (sub-flow variant).
**Evidence classes:** None (evidence already attached to PPAP submission).
**LRO save-resume:** No (PSW is a short workflow).
**Regulatory submission:** E15 AS2 to OEM.
**Friction level:** L3.

---

### WZ-12 — APR Generation (J1 pharma)

**Trigger:** "Generate Annual Product Review" on a Product record (J1).

**Steps:**
1. `data-entry` — Product selection, review year, review period start/end
   dates, included batch range, sections to include (can exclude sections
   not applicable to product type).
2. `submission` — AI-21 advisory LRO: `operation_type = "WZ_APR_GENERATE"`.
   AI drafts each section from the batch and quality data for the year.
   LRO progress shown section by section.
3. `review` — QP reviews the AI-generated draft. Each section shown in
   NRD-14-J1 drawer for edit. Section-level acceptance/revision tracked.
   Overall acceptance requires all sections reviewed.
4. `approval` — QP e-signature (BD-3, AAL2). Single signatory.
5. `submission` — APR document archived in WORM storage; DCC document
   record created.

**BD codes:** BD-3.
**Evidence classes:** None (APR references existing records; does not create
new evidence classes).
**LRO save-resume:** Yes.
**Regulatory submission:** None (APR is internal; regulatory inspection
access handled by Audit Pack Export WZ-03).
**Friction level:** L3.

---

### WZ-13 — PSUR Generation (J4 medtech)

**Trigger:** "Generate Periodic Safety Update Report" on a Device record (J4).

Structure mirrors WZ-12 with these differences:
- AI-21 advisory uses MDR/IVDR SSCP data sources and PMS data.
- Review step includes PCCP version check: if a PCCP exists for the device,
  wizard validates that the PSUR references the current PCCP version.
- Approval: Regulatory Affairs Lead sign (BD-20, AAL2).
- Submission: E15 to Notified Body via configured Notified Body API channel.
  Submission reference number stored on PSUR record.

**BD codes:** BD-20.
**LRO save-resume:** Yes.
**Regulatory submission:** E15 Notified Body.
**Friction level:** L4 (regulatory submission; Notified Body timing SLA).

---

### WZ-14 — DHF Sectioning (J4 medtech)

**Trigger:** "Assemble DHF Section" on a Device Design History File record.

**Steps:**
1. `data-entry` — Device name, device revision, DHF section (options:
   Design Inputs, Design Outputs, Design Reviews, Design Verification,
   Design Validation, Design Transfer, Design Changes; per FDA 21 CFR
   §820.30 and MDR Annex II).
2. `submission` — DHF assembly LRO (E8): collects all records tagged to the
   device + section from the evidence registry. LRO generates a structured
   section package.
3. `review` — Section contents list: each record shown with ID, type,
   evidence class, attachment count, approval status. Gaps (required record
   types missing) flagged.
4. `approval` — Regulatory Affairs e-signature (BD-20, AAL2).

**BD codes:** BD-20.
**Evidence classes:** Section-dependent (loaded from `GET
/api/v1/dhf-sections/<section>/required-classes`).
**LRO save-resume:** Yes.
**Regulatory submission:** None (DHF is internal; referenced from technical
file submission separately).
**Friction level:** L3.

---

### WZ-15 — ICSR Submission (J1 pharma)

**Trigger:** "Create ICSR" action on a Complaint or Adverse Event record (J1).

**Steps:**
1. `data-entry` — Patient demographics (anonymized: age group, sex, weight),
   suspect drug (INN + brand, dose, route, indication, start/stop dates),
   suspect reaction (verbatim text + MedDRA LLT search and code selection),
   seriousness criteria (fatal/life-threatening/hospitalization/
   disability/congenital anomaly/other), narrative (free text, minimum 100
   characters).
2. `review` — MedDRA coding review: PT, HLT, HLGT, SOC shown for each coded
   term. Mismatches between verbatim and PT highlighted. E2B(R3) message
   preview (structured XML summary, not full XML).
3. `approval` — Pharmacovigilance Officer e-signature (BD-4, AAL2).
4. `submission` — E15 ICH E2B(R3) submission to FDA MedWatch and EMA
   EudraVigilance. 15-day reporting deadline timer started on submission
   (displayed in `role="timer"`). Submission acknowledgement IDs stored on
   ICSR record.
5. `notification` — PV team, medical director, regulatory affairs notified.
   15-day deadline reminder scheduled via E10.

**BD codes:** BD-4.
**Evidence classes:** None mandatory at ICSR level (source records
referenced).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 FDA MedWatch + EMA EudraVigilance (ICH
E2B(R3)).
**Friction level:** L4 (dual regulatory submission; 15-day clock; PV Officer
sign non-waivable).

---

### WZ-16 — Vigilance Reportability Assessment (J4 medtech)

**Trigger:** "Assess Reportability" action on a Complaint record (J4).

**Steps:**
1. `data-entry` — Complaint record selection (auto-populated from trigger
   context), AI-19 advisory review (advisory shown read-only; user must
   acknowledge having reviewed it), MDR classification decision (Serious
   Incident / Field Safety Corrective Action / Not Reportable), justification
   narrative.
2. `review` — Classification summary: decision + justification + AI-19
   advisory comparison. Discrepancies between AI recommendation and human
   decision highlighted.
3. `approval` — Regulatory Affairs e-signature (BD-20, AAL2).
4. `submission` — E15 MDR Art.87 notification to Competent Authority
   (configurable per device registration country). Submission reference
   number and timestamp stored.

**BD codes:** BD-20.
**Evidence classes:** None mandatory (complaint evidence already attached).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 MDR Art.87.
**Friction level:** L4.

---

### WZ-17 — FAI Bubble Drawing Processing (J3 aerospace)

**Trigger:** "Start First Article Inspection" on a Part record (J3).

**Steps:**
1. `data-entry` — Part number, revision, drawing number, customer (OEM/Tier
   1). Drawing PDF upload (not E12; treated as a source document input to
   AI-08; stored separately as `fai_source_drawing`).
2. `submission` — AI-08 bubble extraction LRO: `operation_type =
   "WZ_FAI_BUBBLE_EXTRACT"`. AI identifies and numbers all dimension
   callouts, GD&T symbols, and tolerance zones on the drawing. LRO progress
   shown frame by frame.
3. `review` — Engineer reviews extracted bubbles. For each bubble: bubble
   number, drawing zone, characteristic type (GD&T symbol), nominal value,
   tolerance. Engineer annotates: confirm correct / flag incorrect / add
   missing bubble. Corrections submitted back to LRO for re-extraction if
   flagged count exceeds 5% threshold.
4. `approval` — DI (Designated Inspection) Engineer e-signature (BD-12,
   AAL2) attesting bubble list is complete and accurate.
5. `attach-evidence` — FAI report (EC-07 required). AS9102 Rev C FAI report
   form auto-generated from confirmed bubble list; uploaded as evidence.

**BD codes:** BD-12.
**Evidence classes:** EC-07.
**LRO save-resume:** Yes.
**Regulatory submission:** None (FAI report delivered to customer separately).
**Friction level:** L3.

---

### WZ-18 — NADCAP Audit Cycle (J3 aerospace)

**Trigger:** "Initiate NADCAP Audit" on the Maintenance/EHS or Quality
Improvement root (J3).

**Steps:**
1. `data-entry` — NADCAP commodity (NDT / Chemical Processing / Heat
   Treatment / Welding / Electronics / etc.), planned audit date, audit
   scope (processes, sites), NADCAP prime contractor (if applicable).
2. `attach-evidence` — Pre-audit checklist (EC-26 required; NADCAP-
   commodity-specific checklist template pre-populated for user to complete
   and upload).
3. `review` — Audit scope summary; pre-audit checklist compliance status;
   any open NCIs from previous NADCAP audit flagged.
4. `approval` — Quality Lead e-signature (BD-13, AAL2).
5. `notification` — E15 notification to NADCAP body (PRI Registrar) with
   audit confirmation; internal manufacturing and quality team notified.

**BD codes:** BD-13.
**Evidence classes:** EC-26 (required), EC-07 (optional prior audit report).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 PRI NADCAP Registrar.
**Friction level:** L3.

---

### WZ-19 — Counterfeit Investigation (J3 aerospace)

**Trigger:** "Open Counterfeit Investigation" on a receiving inspection or
inventory record (J3 / AS6081).

**Steps:**
1. `data-entry` — Part number, lot number, quantity suspect, supplier/source,
   AI-18 advisory review (advisory shown read-only; user must acknowledge;
   AI-18 provides suspect characteristics from GIDEP database cross-reference).
2. `attach-evidence` — Test results (EC-07 required: XRF, SEM, decap
   analysis, or other applicable test). Physical inspection evidence (EC-01:
   photographs of suspect markings, packaging anomalies). Both required
   before Next.
3. `review` — Investigation summary. Counterfeit determination: Confirmed /
   Suspect / Not Counterfeit. Narrative of evidence supporting determination.
4. `approval` — Security Lead e-signature + Quality Lead e-signature (BD-15,
   AAL2, quorum 2).
5. `submission` — GIDEP alert submission via E15 (GIDEP Web Services API)
   if determination is Confirmed or Suspect. GIDEP report number stored.

**BD codes:** BD-15.
**Evidence classes:** EC-07 (required), EC-01 (required).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 GIDEP.
**Friction level:** L4.

---

### WZ-20 — HACCP Plan Authoring (J5 food)

**Trigger:** "Create HACCP Plan" on the Quality Improvement root (J5).

**Steps:**
1. `data-entry` — Product description, intended use, process flow (step-by-
   step process description; each step becomes a node in the hazard analysis
   grid). For each process step: identify biological/chemical/physical hazards,
   significance assessment (likelihood × severity = risk score), preventive
   control type. Identify CCPs: decision tree applied per Codex Alimentarius
   for each significant hazard.
2. `data-entry` (CCP details, separate sub-step) — For each CCP: critical
   limit (value + unit + parameter), monitoring procedure (what / how / frequency
   / who), corrective action plan, verification procedure, record-keeping
   requirement.
3. `review` — Full HACCP plan table rendered. CCP count, hazard count,
   preventive control summary. Any CCP without a critical limit highlighted.
4. `approval` — HACCP Team Lead e-signature (BD-16, AAL2).
5. `submission` — E15 USDA-FSIS HACCP plan notification (for FSIS-regulated
   facilities). PCIP (Process Category Identification Plan) reference
   included.
6. `training-assign` — Assign HACCP awareness and CCP monitoring training
   to production and QA personnel. Completion deadline: before plan
   effectivity date.

**BD codes:** BD-16.
**Evidence classes:** None mandatory at authoring (evidence gathered during
implementation).
**LRO save-resume:** Yes.
**Regulatory submission:** E15 USDA-FSIS.
**Friction level:** L4.

---

### WZ-21 — HACCP Reanalysis (J5 food)

**Trigger:** "Trigger HACCP Reanalysis" from a HACCP Plan record (J5).
Required triggers per FSMA: product change, process change, new hazard
identification, recall, or periodic (annual).

**Steps:**
1. `data-entry` — Reanalysis trigger type (dropdown: product change / process
   change / new hazard / recall / periodic), description of what changed, which
   HACCP plan sections are affected.
2. `attach-evidence` — Updated hazard analysis document (EC-17 required if
   new hazard identified; EC-16 required if product or process specification
   changed).
3. `review` — Side-by-side comparison: original HACCP plan section vs
   proposed reanalysis changes. Delta highlighting.
4. `approval` — HACCP Team Lead e-signature (BD-16, AAL2).
5. `effectivity-date` — When the reanalysis takes effect. Cannot be
   backdated.

**BD codes:** BD-16.
**Evidence classes:** EC-17 (conditional), EC-16 (conditional).
**LRO save-resume:** Yes.
**Regulatory submission:** None (USDA-FSIS is notified of plan changes at
next scheduled review; unless recall-triggered, in which case WZ-08 handles
notification).
**Friction level:** L3.

---

### WZ-22 — FSVP Supplier Verification (J5 food)

**Trigger:** "Create FSVP Verification" on a Supplier record (J5 / FSMA
FSVP Rule 21 CFR §1.500+).

**Steps:**
1. `data-entry` — Foreign supplier name, country, food item description
   (including FDA product category), known applicable food safety
   regulations for the supplier's country, FSVP Qualified Individual (QI)
   identity (pre-filled from current user if QI-credentialed; otherwise
   search).
2. `attach-evidence` — Hazard analysis for the food item (EC-17 required).
   Supplier verification activities (EC-13 required: may be audit report,
   sampling results, review of food safety records, or annual onsite audit).
3. `review` — FSVP checklist: all required verification activities documented,
   QI identity confirmed, hazard analysis covers all significant hazards.
4. `approval` — FSVP Qualified Individual e-signature (BD-16 variant,
   AAL2). Must match the QI identity entered in step 1.

**BD codes:** BD-16 (QI variant).
**Evidence classes:** EC-17, EC-13.
**LRO save-resume:** Yes.
**Regulatory submission:** None (FSVP records are kept on file for FDA
inspection; not proactively submitted).
**Friction level:** L3.

---

### WZ-23 — Risk File Authoring (J4 medtech / ISO 14971)

**Trigger:** "Create Risk File" on a Device record (J4).

**Steps:**
1. `data-entry` — Device name, intended use, intended patient population,
   reasonably foreseeable misuse. Harm/hazard register: for each hazard entry:
   hazard description, hazard situation, harm, initial probability (1–5),
   initial severity (1–5), initial risk score (auto-calculated), risk control
   measure, residual probability, residual severity, residual risk score.
   Risk acceptability criterion (loaded from organization risk policy).
2. `review` — Risk matrix rendered: severity vs probability heatmap using
   token-defined color thresholds (not hardcoded). Residual risks above
   acceptance criterion highlighted. Overall residual risk benefit-risk
   summary.
3. `approval` — Risk Manager e-signature (BD-17, AAL2). If any residual risk
   is above acceptance criterion: additional sign-off by Medical Director
   required (quorum 2).
4. `effectivity-date` — Risk file version effectivity.

**BD codes:** BD-17.
**Evidence classes:** EC-17 (risk assessment supporting documents).
**LRO save-resume:** Yes (hazard register entry can be extensive).
**Regulatory submission:** None (risk file is part of technical
documentation; referenced in DHF).
**Friction level:** L3.

---

### WZ-24 — ECO Authoring (Engineering Change Order)

**Trigger:** "Create ECO" on the Planning & Production or Quality Improvement
root.

**Steps:**
1. `data-entry` — Change title, change description, change class (minor/
   major/emergency), affected part numbers (multi-select from BOM search),
   affected documents (multi-select from DCC document search), change
   urgency, regulatory impact assessment (checkbox: "This change affects a
   regulated characteristic").
2. `attach-evidence` — EC-16 (design input/change justification; required for
   major and emergency changes). Optional: EC-07 (test data), EC-17 (risk
   assessment for regulated changes).
3. `review` — Impact assessment: cross-referenced BOM impact (components
   using affected parts), regulatory classification impact, training impact.
4. `approval` — Sign-off by role depends on change class:
   - Minor: Engineering Lead sign (BD-6, AAL2).
   - Major: Engineering Lead + QA Lead + Customer Approval if customer-
     affecting (BD-6 + BD-19, quorum 2–3).
   - Emergency: same as Major but with 24-hour escalation SLA tracked.
5. `effectivity-date` — Change implementation date. If regulatory impact:
   validates against regulatory freeze windows.
6. `notification` — Manufacturing, procurement, quality, customer (if
   customer-affecting) notified.
7. `training-assign` — Assign updated work instruction training to affected
   operators.

**BD codes:** BD-6 (minor), BD-6 + BD-19 (major/emergency).
**Evidence classes:** EC-16 (conditional), EC-07 (optional), EC-17
(conditional on regulatory impact).
**LRO save-resume:** Yes.
**Regulatory submission:** None (regulatory submission triggered separately
if required by change).
**Friction level:** L2 (minor) / L3 (major) / L4 (emergency).

---

### WZ-25 — SCAR Issuance (Supplier Corrective Action Request)

**Trigger:** "Issue SCAR" from a Nonconformance or Receiving Inspection
record.

**Steps:**
1. `data-entry` — Supplier name (from supplier master), NC scope description,
   quantity affected, containment actions taken (checkbox list + free text),
   root cause investigation deadline (calendar picker, minimum 5 business
   days from issuance), corrective action deadline.
2. `review` — SCAR summary. Supplier history summary chip (open SCAR count,
   last audit rating) shown as context.
3. `approval` — Supplier Quality Lead e-signature (BD-18, AAL2).
4. `submission` — E10 cross-tenant notification to supplier portal (if
   supplier has a HESEM tenant). Otherwise: E10 email notification with
   SCAR PDF attachment.
5. `notification` — Internal: procurement, quality, receiving. External:
   supplier contacts.

**BD codes:** BD-18.
**Evidence classes:** None (NC evidence already attached to source record).
**LRO save-resume:** Yes.
**Regulatory submission:** None.
**Friction level:** L2.

---

### WZ-26 — 8D Problem Solving

**Trigger:** "Open 8D" from a CAPA, SCAR, or Customer Complaint record.

**Steps** (one data-entry sub-step per D-discipline; each D-step has its
own checkpoint in the LRO):

1. `data-entry` D1 — Team formation: list team members (user search), team
   leader selection.
2. `data-entry` D2 — Problem description: 5W2H structured form (Who/What/
   Where/When/Why/How/How Many). Problem statement auto-generated as summary.
3. `data-entry` D3 — Containment actions: action description, owner, due
   date, effectiveness criteria.
4. `data-entry` D4 — Root cause analysis: AI-05 advisory shown (read-only;
   user may use as starting point or override). Fishbone/5-Why structured
   input; primary root cause selection.
5. `data-entry` D5 — Corrective actions: for each root cause: action
   description, owner, due date, verification method.
6. `data-entry` D6 — Effectiveness verification: evidence of corrective
   action implementation (reference to EC-07 or EC-08 test results); measured
   vs baseline comparison.
7. `data-entry` D7 — Prevention: similar products/processes identified;
   prevention actions for each; training updates required.
8. `data-entry` D8 — Team recognition: recognition narrative (optional);
   lessons learned; closure statement.

Between each D-step: `approval` gate where the gate signer (Quality Lead,
BD-19) signs off that the D-step content is complete and accurate. Approval
required before Next.

Final step: `attach-evidence` — EC-15 (8D report; required; auto-generated
PDF from all D-step data attached automatically by the LRO; user confirms).

**BD codes:** BD-19 (per D-step gate).
**Evidence classes:** EC-15.
**LRO save-resume:** Yes (8D can span weeks).
**Regulatory submission:** None.
**Friction level:** L3.

---

### WZ-27 — LPA Audit (Layered Process Audit, J2 automotive)

**Trigger:** "Conduct LPA Audit" from the Quality Improvement root (J2 /
AIAG LPA standard).

**Steps:**
1. `data-entry` — Audit layer (Layer 1: supervisor; Layer 2: manager; Layer
   3: executive), production area, process being audited, audit date (default:
   today), auditor identity (pre-filled: current user).
2. `data-entry` — Checklist items: for each LPA checklist item (loaded from
   `GET /api/v1/lpa-checklists?area=<area>&layer=<layer>`):
   - Result: Conforming / Non-Conforming / N/A.
   - Finding note (required if Non-Conforming).
3. `review` — Audit summary: conformance rate, NC count, NC items listed.
4. `approval` — Auditor e-signature (BD-10, AAL2) attesting results are
   accurate.
5. `attach-evidence` — EC-26 (audit finding; required if NC count > 0;
   auto-generated summary uploaded).

**BD codes:** BD-10.
**Evidence classes:** EC-26 (conditional on NC findings).
**LRO save-resume:** No (LPA audit is a single-session activity).
**Regulatory submission:** None.
**Friction level:** L2.

---

### WZ-28 — Complaint Investigation

**Trigger:** "Investigate Complaint" on a Complaint record.

**Steps:**
1. `data-entry` — Complaint reference (pre-filled), product/lot identification,
   investigation findings narrative, root cause determination (structured:
   category dropdown + description), investigation conclusion (substantiated/
   unsubstantiated/inconclusive).
2. `attach-evidence` — EC-07 (test result; required if substantiated/
   inconclusive). EC-01 (photograph; required if physical product issue).
3. `review` — Investigation summary. AI-19 (J4) or AI-05 advisory shown for
   reference if already generated.
4. `approval` — QA Lead e-signature (BD-19, AAL2).
5. `notification` — Customer notification via E10: response letter with
   investigation conclusion (tone and template configurable; customer-facing
   language reviewed by user before send).

**BD codes:** BD-19.
**Evidence classes:** EC-07 (conditional), EC-01 (conditional).
**LRO save-resume:** Yes.
**Regulatory submission:** None directly (ICSR/MDR reportability assessed
separately via WZ-15/WZ-16 if complaint meets criteria).
**Friction level:** L3.

---

### WZ-29 — Media Fill (Process Simulation, J1 pharma)

**Trigger:** "Record Media Fill" on a Validation or Process record (J1).

**Steps:**
1. `data-entry` — Simulation scope (filling line, shift, units filled),
   media type, fill volume, incubation conditions (temperature, duration),
   acceptance criteria (AQL, maximum allowable false-positive rate).
2. `attach-evidence` — Growth promotion test results (EC-06 required: tests
   confirming media supports microbial growth). Simulation process log
   (EC-08 required: batch record-equivalent log for the media fill run).
3. `review` — Media fill results summary: units produced, units incubated,
   positives (contaminated units), contamination rate. Pass/fail determination
   against acceptance criteria shown prominently.
4. `approval` — Microbiologist e-signature + QA Lead e-signature (BD-21,
   AAL2, quorum 2).
5. `effectivity-date` — Validity start date of the media fill result (media
   fills have a validity period per internal SOP).

**BD codes:** BD-21.
**Evidence classes:** EC-06, EC-08.
**LRO save-resume:** Yes (media fill wizard may span multiple days as
incubation results arrive).
**Regulatory submission:** None (media fill records are part of process
validation; inspected on demand).
**Friction level:** L3.

---

### WZ-30 — Sub-processor Onboarding (GDPR Art.28)

**Trigger:** "Onboard Sub-processor" on the Core Infrastructure privacy
admin panel.

**Steps:**
1. `data-entry` — Sub-processor legal name, country of establishment,
   processing activities (multi-select from data processing activity
   catalog), data categories processed (multi-select), transfer mechanism
   (Standard Contractual Clauses / Adequacy Decision / Binding Corporate
   Rules / Other), DPA reference number.
2. `attach-evidence` — DPA document (EC-09 required: signed Data Processing
   Agreement). SOC 2 Type II report or ISO 27001 certificate (EC-10
   required).
3. `review` — Sub-processor profile summary. GDPR transfer risk assessment
   summary (generated from data categories + country + transfer mechanism).
   Any gaps highlighted (e.g. no adequacy decision for country with SCC not
   uploaded).
4. `approval` — Compliance Lead e-signature + Legal Counsel e-signature
   (BD-23, AAL2, quorum 2).
5. `submission` — E15 sub-processor registration: updates the public sub-
   processor list API endpoint; triggers notification to data subjects if
   required by internal GDPR policy (30-day advance notice).
6. `notification` — DPO and privacy team notified. If tenants have opted into
   sub-processor change notifications, cross-tenant E15 notification issued.

**BD codes:** BD-23.
**Evidence classes:** EC-09, EC-10.
**LRO save-resume:** Yes.
**Regulatory submission:** E15 sub-processor list publication.
**Friction level:** L3.

---

### WZ-31 — ITAR Access Grant (J3 aerospace)

**Trigger:** "Grant ITAR Access" from the Security or Master Data admin
panel (J3 / 22 CFR §120-130).

**Steps:**
1. `data-entry` — Principal name (user or role search), access scope
   (technical data categories: controlled articles, technical data,
   defense services — multi-select), access justification narrative,
   export license number (if applicable), citizenship verification status
   (read-only: sourced from HR record; must be US Person or valid license).
2. `review` — Access grant summary. Existing ITAR access for this principal
   shown. Cumulative access level assessed against export license scope.
3. `approval` — ITAR Compliance Officer e-signature (BD-24, AAL3 mandatory).
4. `effectivity-date` — Access start date and expiry date (mandatory expiry;
   maximum 2 years).
5. `notification` — Principal notified of access grant. DCSA (Defense
   Counterintelligence and Security Agency) notification issued via E15 if
   required by the facility's ITAR registration.

**BD codes:** BD-24.
**Evidence classes:** None.
**LRO save-resume:** No.
**Regulatory submission:** E15 DCSA (conditional).
**Friction level:** L4 (AAL3; regulatory implication; citizenship
verification hard gate).

---

### WZ-32 — DSCSA Trading Partner Onboarding (J1 pharma)

**Trigger:** "Register DSCSA Partner" on the Supply Chain or Commercial root
(J1 / DSCSA 21 USC §360eee).

**Steps:**
1. `data-entry` — Partner legal name, GLN (Global Location Number), DEA
   registration number, partner type (manufacturer / wholesale distributor /
   dispenser / repackager), DSCSA maturity level (Level 1–4 per HDMA
   framework), EPCIS endpoint URL (for Level 3/4 partners).
2. `attach-evidence` — Trading partner agreement (EC-09 required). Partner
   DSCSA attestation letter (EC-10 required).
3. `review` — Partner profile summary. DSCSA compliance checklist: DEA number
   validated format, GLN format validated, EPCIS endpoint reachability test
   result (run live via `POST /api/v1/dscsa/test-epcis` if Level ≥ 3).
4. `approval` — Supply Chain Lead e-signature (BD-5, AAL2).
5. `submission` — E15 DSCSA partner register update. If Level 3/4: AS2/AS4
   EPCIS handshake initiated.
6. `notification` — Supply chain, compliance, and logistics teams notified.

**BD codes:** BD-5.
**Evidence classes:** EC-09, EC-10.
**LRO save-resume:** Yes.
**Regulatory submission:** E15 DSCSA partner register.
**Friction level:** L3.

---

### WZ-33 — DSAR Extraction (GDPR Art.20 Data Portability)

**Trigger:** "Process DSAR" from the Privacy admin panel on receipt of a
Data Subject Access Request.

**Steps:**
1. `data-entry` — Data subject identity (name, email, additional identifiers:
   employee ID or customer ID if known), identity verification method and
   result (identity check must be completed before proceeding; result
   recorded: Verified / Unable to Verify), request scope (data portability /
   right of access / both), request received date (SLA clock starts here;
   30-day statutory deadline for GDPR Art.12).
2. `review` — What data will be included: system generates a preview list of
   data categories found for the data subject across all modules (personal
   data registry queried via `GET /api/v1/privacy/dsar/preview?subject_id=
   <id>`). DPO reviews and may exclude categories covered by Art.17(3)
   exemptions (with justification note).
3. `approval` — DPO (Data Protection Officer) e-signature (BD-23 variant,
   AAL2).
4. `submission` — E13 DSAR extraction LRO: `operation_type = "WZ_DSAR_
   EXTRACT"`. LRO collects and packages all in-scope personal data across
   modules into a structured JSON + PDF bundle. LRO progress tracked.
5. `notification` — When LRO completes: DPO receives download link (expires
   72 hours). Data subject notified via email with instructions. 30-day
   deadline countdown shown throughout wizard from request received date.

**BD codes:** BD-23 (DPO variant).
**Evidence classes:** None.
**LRO save-resume:** Yes.
**Regulatory submission:** None (response delivered directly to data subject).
**Friction level:** L3 (DPO sign non-waivable; 30-day statutory SLA
enforced).

---

## Wizard Summary Table

| ID | Name | Steps | BD Codes | LRO | Pack | Friction |
|----|------|-------|----------|-----|------|---------|
| WZ-01 | NPI | 7 | BD-7 | Yes | All | L3 |
| WZ-02 | Customer Onboarding | 6 | BD-8 | Yes | All | L2 |
| WZ-03 | Audit Pack Export | 6 | BD-14 | Yes | All | L3 |
| WZ-04 | Tenant Provisioning | 5 | BD-25 | Yes | Platform | L4 |
| WZ-05 | VMP Authoring | 6 | BD-19 | Yes | J1/J4 | L3 |
| WZ-06 | URS/FS/DS Authoring | 3 | Category-dependent | Yes | J1/J4 | L3 |
| WZ-07 | DR Drill | 5 | BD-26 | No | All | L3 |
| WZ-08 | Recall Initiation | 5 | BD-22 | Yes | J1/J4/J5 | L4 |
| WZ-09 | Mock Recall Drill | 5 | BD-14 | Yes | J1/J4/J5 | L3 |
| WZ-10 | PPAP Submission | 5 | BD-11 | Yes | J2 | L4 |
| WZ-11 | PSW Sign-off | 4 | BD-11 | No | J2 | L3 |
| WZ-12 | APR Generation | 5 | BD-3 | Yes | J1 | L3 |
| WZ-13 | PSUR Generation | 5 | BD-20 | Yes | J4 | L4 |
| WZ-14 | DHF Sectioning | 4 | BD-20 | Yes | J4 | L3 |
| WZ-15 | ICSR Submission | 5 | BD-4 | Yes | J1 | L4 |
| WZ-16 | Vigilance Reportability | 4 | BD-20 | Yes | J4 | L4 |
| WZ-17 | FAI Bubble Drawing | 5 | BD-12 | Yes | J3 | L3 |
| WZ-18 | NADCAP Audit Cycle | 5 | BD-13 | Yes | J3 | L3 |
| WZ-19 | Counterfeit Investigation | 5 | BD-15 | Yes | J3 | L4 |
| WZ-20 | HACCP Plan Authoring | 6 | BD-16 | Yes | J5 | L4 |
| WZ-21 | HACCP Reanalysis | 5 | BD-16 | Yes | J5 | L3 |
| WZ-22 | FSVP Supplier Verification | 4 | BD-16 | Yes | J5 | L3 |
| WZ-23 | Risk File Authoring | 4 | BD-17 | Yes | J4 | L3 |
| WZ-24 | ECO Authoring | 7 | BD-6/BD-19 | Yes | All | L2–L4 |
| WZ-25 | SCAR Issuance | 5 | BD-18 | Yes | All | L2 |
| WZ-26 | 8D Problem Solving | 10+ | BD-19 | Yes | All | L3 |
| WZ-27 | LPA Audit | 5 | BD-10 | No | J2 | L2 |
| WZ-28 | Complaint Investigation | 5 | BD-19 | Yes | All | L3 |
| WZ-29 | Media Fill | 5 | BD-21 | Yes | J1 | L3 |
| WZ-30 | Sub-processor Onboarding | 6 | BD-23 | Yes | All | L3 |
| WZ-31 | ITAR Access Grant | 5 | BD-24 | No | J3 | L4 |
| WZ-32 | DSCSA Partner Onboarding | 6 | BD-5 | Yes | J1 | L3 |
| WZ-33 | DSAR Extraction | 5 | BD-23 | Yes | All | L3 |

---

---

## Wizard navigation UI

**Step indicator:** Horizontal step rail at the top of the wizard (desktop) or collapsed progress bar (mobile/glove). Each step: step number, icon, label, state chip (`PENDING` / `IN_PROGRESS` / `COMPLETE` / `ERROR`). Clicking a completed step navigates back to it (non-linear navigation) if the wizard allows backward navigation (configured per wizard; some regulatory wizards are linear-only).

**Back/Forward buttons:**
- Back: always available (except Step 1); returns to prior step with state preserved; form data re-populated from component memory.
- Forward / Next: available only when current step validation passes. Triggered by keyboard `Enter` when inside a single-field step, or explicit Next button for multi-field steps.
- Save Draft: available on steps 2+ for save-resume wizards; triggers E13 LRO checkpoint.
- Cancel: available on all steps; triggers NRD-01 Confirmation if any data entered; on confirm: LRO set to CANCELLED (if save-resume), local state cleared.

**Keyboard navigation within steps:**
- `Tab` / `Shift+Tab`: move between fields and buttons.
- `Alt+Right` / `Alt+Left`: advance/retreat step (same as Next/Back buttons).
- `Escape`: triggers Cancel flow.

**Step indicator ARIA:** `<nav aria-label="Wizard progress"><ol role="tablist">` — each step is `role="tab"` with `aria-selected` and `aria-current="step"` on the active step. Completed steps: `aria-label="{step name} — completed"`.

---

## Save-resume LRO checkpoint structure

For wizards with `lro_save_resume: true`, checkpoint `state_blob` schema:

```jsonc
{
  "wizard_id": "WZ-08",
  "last_completed_step": 3,
  "total_steps": 6,
  "step_states": {
    "1": { "status": "COMPLETE", "data": { /* step 1 form values */ } },
    "2": { "status": "COMPLETE", "data": { /* step 2 form values */ } },
    "3": { "status": "COMPLETE", "data": { /* step 3 form values */ } },
    "4": { "status": "PENDING", "data": null },
    "5": { "status": "PENDING", "data": null },
    "6": { "status": "PENDING", "data": null }
  },
  "evidence_refs": ["ev-uuid-1"],       /* already-attached evidence IDs */
  "draft_record_id": "draft-uuid",      /* if wizard creates a draft record */
  "tenant_id": "tenant-uuid",
  "principal_id": "p-uuid",
  "wizard_version": "2025-11"           /* wizard schema version for migration */
}
```

On resume, wizard rehydrates from `state_blob`: completed steps are read-only (shown as COMPLETE in step rail); user continues from `last_completed_step + 1`. If `wizard_version` has changed since draft was saved: migration function transforms `state_blob` to current schema; if migration not possible, user is shown a notice and must restart.

---

## Error recovery in submission step

When the submission step (E3 / E11 / E15 / LRO) fails:

| Failure type | Recovery action |
|---|---|
| Network timeout | Retry button; LRO status poll to check if submission actually succeeded before retry (idempotency) |
| 422 Validation failure | Return to data-entry step with field errors pre-populated; user corrects and resubmits |
| 503 Service unavailable | Retry with exponential backoff (30s, 2m, 8m); after 3 fails: Save Draft automatically; notify user to retry later |
| 412 ETag conflict | Return to review step with conflict dialog (same as F5 AR conflict resolution); user resolves then resubmits |
| 403 Forbidden | Show error: "Your permission level does not allow this submission"; do not retry; contact admin |
| LRO job FAILED | Show LRO error detail link; offer restart from last checkpoint; maintain draft for context |

All submission failures emit EC-22 `wizard_submission_failure` subtype for audit trail.

---

`S3-10_F8_WIZARD_DEEP_UPGRADE_COMPLETE`

---

`S3-10_F7_F8_DEEP_UPGRADE_COMPLETE`
