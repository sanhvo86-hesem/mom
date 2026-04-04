# QMS Portal - Pro Handoff Next Implementation Spec

**Document Code:** HANDOFF-2026-03-29-01  
**Date:** 2026-03-29  
**Owner:** QMS Portal Development Team  
**Target Executor:** GPT Pro / Codex implementation session  
**Status:** Active handoff  
**Base Branch:** `main`  
**Minimum Starting Commit:** `84d7ad0e`

---

## 1. Purpose

This handoff defines the exact next implementation scope after the NCR demo and reusable frontend components were pushed to Git. It is written so the next implementation agent can continue without re-discovering the current state.

This is **not** a brainstorming note. It is a build specification with:

- current baseline
- required production work
- target files
- acceptance criteria
- strict self-check procedure before commit

---

## 2. Current Baseline

### 2.1 Already Completed

- PostgreSQL schema foundation exists under `01-QMS-Portal/database/`
- API/DataLayer foundation exists under `01-QMS-Portal/api/`
- document/form architecture studies already exist in `01-QMS-Portal/docs/`
- Evidence Control UI orchestration already exists under `01-QMS-Portal/scripts/portal/09-online-forms.js`
- sidebar already separates:
  - `Quản lý đơn hàng`
  - `Kiểm soát chứng cứ`
- form design system standard already exists:
  - `core-standards/24-form-template-design-system.md`
- language rule already exists:
  - frontend visible text in Vietnamese must use proper Unicode diacritics
  - backend code / keys / APIs remain English

### 2.2 Newly Delivered in Commit `84d7ad0e`

- `01-QMS-Portal/demos/form-ncr-demo.html`
- `01-QMS-Portal/scripts/portal/11-e-signature.js`
- `01-QMS-Portal/scripts/portal/12-searchable-input.js`
- `01-QMS-Portal/assets/hesem-logo.svg`

### 2.3 What These New Files Are

They are **reference-grade components and demo assets**, not yet full production integration.

They already prove:

- SOP-style header direction
- searchable lookup fields
- CAPA lookup concept
- multi-select 6M root cause
- electronic signature modal concept

They do **not** yet complete:

- production API integration
- schema-driven runtime rendering
- master-data-backed lookups
- allocation / upload / receipt lifecycle
- approval workflow persistence

---

## 3. Non-Negotiable Product Rules

The next implementation must preserve these rules.

### 3.1 Language Rule

- All user-facing frontend text must be Vietnamese with proper diacritics.
- Backend source code, JSON keys, SQL column names, API action names, and internal identifiers remain English.

### 3.2 Master Data Rule

If a field already has governed master data, the form must **not** allow uncontrolled manual typing.

This applies to:

- Customer
- Supplier
- Sales Order
- Job Order
- Work Order
- Part Number
- Part Revision
- CAPA Number
- NCR Number
- machine / work center where applicable

### 3.3 Single Source of Truth Rule

- form definition lives in controlled schema/config
- allocation lives in controlled counters/logs
- approval/signature lives in audit-backed workflow state
- offline upload acceptance is based on system-issued metadata, not filename only

### 3.4 Git Hygiene Rule

Do not commit:

- `_reports/...`
- `.claude/...`
- `__pycache__/`
- generated local audit CSV/TXT artifacts unless explicitly requested

---

## 4. Target End State

The next agent should aim to convert the current demo direction into a production-capable module set:

1. A real **Form Control / Form Builder** module for creating and revising form definitions.
2. A real **Evidence Control** runtime for:
   - online fill
   - offline download package
   - upload and verification
3. A real **Record ID Assistant** tab separated from fill/download.
4. A real **Master Data Control** module for customer/supplier/order/part/rev linkage.
5. A real **Order Management** page for SO -> JO -> WO relationships.
6. A real **electronic signature approval flow** that writes auditable signature evidence.

---

## 5. Required Work - In Execution Order

## 5.1 Phase A - Build Master Data Control First

### Objective

Build the production master data module that all forms and orders depend on.

### Must Cover

- Customers
- Suppliers / subcontractors
- Parts
- Part revisions
- Sales orders
- Job orders
- Work orders
- CAPA references
- optional future hooks for NCR / equipment / work centers

### Expected Deliverables

- new frontend module/page for master data management
- new API endpoints for list/search/create/update/archive
- cascading relationships:
  - Customer -> SO -> JO -> WO
  - Customer -> Part -> Revision
  - Customer -> Approved Supplier / Processor
  - NCR -> CAPA linkage

### Suggested Target Files

- `01-QMS-Portal/portal.html`
- `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- `01-QMS-Portal/scripts/portal/13-master-data-control.js` (new)
- `01-QMS-Portal/styles/master-data-control.css` (new)
- `01-QMS-Portal/api.php`
- `01-QMS-Portal/api/controllers/` (if modern router path is used)
- `01-QMS-Portal/qms-data/config/` and/or DB-backed services

### Acceptance Criteria

- user can create customer/supplier/part/revision/order data from UI
- search dropdowns in forms consume this source
- no hardcoded demo arrays remain in production path
- lookup values are stable IDs internally, localized labels externally

---

## 5.2 Phase B - Convert FRM-631 from Demo to Production Schema-Driven Form

### Objective

Replace the isolated NCR demo with a real production FRM-631 implementation driven by governed schema.

### Must Change

- update `FRM-631.json` to match intended production logic
- align runtime field types with:
  - searchable lookups
  - multi-select 6M root cause
  - linked CAPA lookup
  - JO / WO / SO / Part / Revision linkage

### Required Schema Features

- field group definition
- lookup field metadata
- strict select mode
- dependency chain between fields
- multi-select definition for root cause
- signature block configuration
- approval step configuration

### Suggested Target Files

- `01-QMS-Portal/qms-data/online-forms/schemas/FRM-631.json`
- `01-QMS-Portal/scripts/portal/09-online-forms.js`
- form renderer / form engine files in `01-QMS-Portal/api/services/`

### Acceptance Criteria

- FRM-631 runs from schema, not from a one-off HTML demo only
- root cause allows multiple selections end-to-end
- CAPA field is searchable from governed data
- customer / supplier / order / part / revision are selected from lookup
- typed values cannot bypass strict-select when governed master exists

---

## 5.3 Phase C - Build Tab 1 as a Real Form Builder / Form Version Control Module

### Objective

The first tab inside `Kiểm soát chứng cứ` must become the control center for creating, revising, and publishing forms.

### Required Functional Scope

- list all forms
- create new form
- edit existing form
- clone existing form as template
- start new revision
- submit form definition for review
- approve/reject form definition
- mark obsolete

### Required Authoring Logic

During form creation, the system must ask for:

- owning department
- form series
- whether form is online or offline
- record type / evidence type
- target storage site/library/path logic
- whether folder subdivision is allowed or not
- whether master-data lookup is required
- whether approval signature is required

### Required Builder Capabilities

- reusable blocks
- dropdown blocks
- formula/display blocks
- signature blocks
- attachments blocks
- readonly computed sections
- conditional visibility
- dependent lookups

### Required Governance

- use the same revision logic philosophy as document editor
- draft / in review / approved / rejected / obsolete
- immutable released revisions
- audit trail on every schema change

### Suggested Target Files

- `01-QMS-Portal/scripts/portal/09-online-forms.js`
- `01-QMS-Portal/scripts/portal/09f-form-builder-engine.js` (new or equivalent)
- `01-QMS-Portal/styles/online-forms.css`
- document editor shared code if reuse is viable
- API endpoints for form revision lifecycle

### Acceptance Criteria

- a user can create a new form definition without editing JSON manually
- version history is visible
- approved form revisions cannot be silently edited in place
- output of builder matches design system in CS-024

---

## 5.4 Phase D - Separate and Complete Record ID Assistant

### Objective

`Điền form / tải form` and `Tạo mã` must remain two different workflows.

### Required Record ID Assistant Flow

Filter chain:

- department
- document/record family
- record type
- subtype if applicable

Then:

- preview generated code
- confirm issuance
- write issuance log
- copy generated code to clipboard
- download empty `.txt` with generated code as filename
- mark issuance status

### Required Data Captured

- issued code
- issuer
- date/time
- related department
- related record type
- linked form if any
- status: issued / used / received / superseded / cancelled

### Suggested Target Files

- `01-QMS-Portal/scripts/portal/09-online-forms.js`
- `01-QMS-Portal/api.php`
- record counter services and issuance logs

### Acceptance Criteria

- code issuance cannot duplicate existing code
- code issuance is fully logged
- downstream form workflows can query issued-but-not-yet-received allocations

---

## 5.5 Phase E - Build the Offline Form Package and Return Flow

### Objective

Offline forms must become traceable system-issued packages, not generic Excel downloads.

### Required Download Logic

When an offline form is requested:

1. issue or bind a controlled record/allocation
2. rename the downloaded file according to governed naming rule
3. inject hidden workbook metadata sheet
4. store issuance log

### Hidden Workbook Metadata Must Include

- form code
- form revision
- record ID / allocation ID
- issuance timestamp
- issued by
- related customer / SO / JO / WO / part / revision if selected
- checksum / signature / validation token
- upload history block

### Required Upload Logic

When a filled workbook is uploaded:

- verify it was issued by the system
- verify hidden metadata integrity
- verify expected form revision
- verify whether it was already received before
- if re-uploaded:
  - notify previous receipt/version
  - increment controlled submission version
  - rename to latest accepted version
- update receive status in issuance history
- route file to correct ShareFile / SharePoint target path

### Suggested Target Files

- `01-QMS-Portal/docs/excel-form-version-control-architecture.md`
- upload validator scripts
- API upload endpoints
- any Excel processing utility layer

### Acceptance Criteria

- upload is rejected if workbook did not originate from system issuance
- filename alone is never the only acceptance criterion
- received status is synchronized between issuance and upload history
- version increment on second receipt is controlled and visible

---

## 5.6 Phase F - Build Production E-Signature Approval Flow

### Objective

The signature demo must become a real controlled approval mechanism.

### Required Rules

- signature bound to logged-in identity
- re-authentication required at approval moment
- meaning of signature captured
- signer ID stored
- timestamp stored
- target block stored
- hash / integrity evidence stored
- signature visibly rendered into its designated form block

### Important Governance Note

Drawn signature appearance alone is not the approval control.  
The approval control is the identity-bound, audited approval event.

### Must Support

- Reported By
- Checked By / Inspector
- Approved By
- future role expansion for QA / Engineering / Department Head

### Suggested Target Files

- `01-QMS-Portal/scripts/portal/11-e-signature.js`
- workflow services
- approval endpoints
- audit trail writer

### Acceptance Criteria

- clicking approve inserts signature display in correct block
- audit record is written
- re-auth is enforced
- approved state change and signature event cannot drift apart

---

## 5.7 Phase G - Integrate Order Management with Form Context

### Objective

The new left-sidebar `Quản lý đơn hàng` page must become a real control module rather than a placeholder.

### Required Scope

- manage SO
- manage JO
- manage WO
- maintain hierarchical relationship:
  - SO -> JO -> WO
- keep:
  - customer
  - part number
  - revision
  - quantity
  - due date
  - status
  - route / operation context as needed

### Why This Is Needed

Evidence forms must select order context instead of typing it manually.

### Acceptance Criteria

- forms can search and bind to real order records
- changes in order status or revision context can be surfaced in forms
- duplicate manual entry is removed

---

## 5.8 Phase H - Update Controlled Documentation

### Objective

After implementation, documents must match the system exactly.

### Must Update

- core standard for form creation/control
- core standard for online vs offline decision
- core standard for form design system
- core standard for language/diacritics rule if expanded
- WI for online form operation
- WI/ANNEX for record allocation and naming
- SOP/WI/ANNEX for offline Excel issuance and receipt control
- SOP/WI/ANNEX for electronic signature approval model

### Minimum Document Targets

- `core-standards/24-form-template-design-system.md`
- `core-standards/18-online-vs-offline-form-decision-framework.md`
- new core standard for form control module if not yet present
- `WI-101`
- `ANNEX-137`
- any SOP/WI currently governing NCR/CAPA and online forms

### Acceptance Criteria

- no contradiction between portal behavior and controlled documents
- storage logic, naming logic, approval logic, and upload logic are all documented

---

## 6. Strict Self-Check Before Any Commit

The next implementation agent must run a strict self-check before pushing.

## 6.1 Functional Check

- online lookup fields work end-to-end
- offline issuance works end-to-end
- upload verification rejects fake workbook
- e-signature writes audit evidence
- record ID issuance updates log and status

## 6.2 Data Integrity Check

- no hardcoded demo arrays remain in production path
- no duplicated source of truth between schema and runtime config
- lookup IDs and display labels are not confused

## 6.3 UX Check

- all visible Vietnamese text has proper diacritics
- no mojibake
- header/logo style is aligned with SOP visual direction
- online form appearance is consistent between initial open and filled state

## 6.4 Git Check

- `git status --short`
- commit only implementation files
- exclude `_reports`, `.claude`, `__pycache__`, transient artifacts

## 6.5 Documentation Check

- if logic changed, docs changed in same implementation wave
- if docs were deferred, leave explicit TODO note in commit message or handoff note

---

## 7. Suggested Execution Batches for GPT Pro

To reduce context drift, execute in these batches:

### Batch 1

- Master Data Control
- Order Management
- production lookup APIs

### Batch 2

- FRM-631 schema conversion
- form runtime integration
- strict-select enforcement in production path

### Batch 3

- Form Builder / version control tab
- form revision workflow

### Batch 4

- Record ID Assistant
- offline package issuance
- hidden Excel metadata injection

### Batch 5

- upload verification and receipt lifecycle
- submission version increment

### Batch 6

- e-signature workflow hardening
- audit trail and approval state synchronization

### Batch 7

- docs synchronization
- final self-audit

---

## 8. Immediate First Task for GPT Pro

If only one task is started next, it should be this:

**Build the production Master Data Control and bind all NCR form lookup fields to it.**

Reason:

- almost every other requirement depends on governed lookup data
- it removes manual typing risk early
- it unlocks FRM-631 productionization
- it unlocks SO/JO/WO integration
- it reduces rework in later phases

---

## 9. Definition of Done for This Whole Next Wave

This next wave is complete only when:

- FRM-631 is running as a governed production form, not only a demo
- master data drives lookup fields
- offline form download/upload is controlled by issued metadata
- record allocation has full status tracking
- signatures are identity-bound and auditable
- SO/JO/WO context can be selected, not typed manually
- docs are updated to match implementation

---

## 10. Final Instruction to the Next Agent

Start from commit `84d7ad0e`.  
Treat `form-ncr-demo.html`, `11-e-signature.js`, and `12-searchable-input.js` as reusable reference assets, not the final runtime architecture.  
Do not spend the next wave polishing demo-only HTML. Convert the direction into production modules.

