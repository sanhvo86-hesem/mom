# Evidence Control Re-Audit

Date: 2026-03-30
Workspace: `C:\Users\TEST4\qms.hesem.com.vn`

## Source Baseline

- Local backlog: `C:\Users\TEST4\qms.hesem.com.vn\EVIDENCE-CONTROL-AUDIT-TASKS.docx`
- Extracted DOCX XML: `C:\Users\TEST4\qms.hesem.com.vn\_reports\audit_docx_extract_v2\word\document.xml`
- FDA Part 11 guidance:
  https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- FDA CAPA reference:
  https://www.fda.gov/corrective-and-preventive-actions-capa
- EMA / ICH Q10 page:
  https://www.ema.europa.eu/en/ich-q10-pharmaceutical-quality-system-scientific-guideline
- ICH Q10 guideline PDF:
  https://database.ich.org/sites/default/files/Q10%20Guideline.pdf
- ISO 15489 overview:
  https://committee.iso.org/sites/tc46sc11/home/projects/published/iso-15489-records-management.html
- ISO disposition guidance:
  https://committee.iso.org/sites/tc46sc11/home/projects/published/disposition.html
- EudraLex Volume 4 / Annex 11:
  https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en
- MasterControl eProcess:
  https://www.mastercontrol.com/eprocess-automation/
- Veeva Batch Release:
  https://www.veeva.com/products/veeva-batch-release/
- Octave Reliance:
  https://www.octave.com/products/asset-performance-management/reliance

## DOCX Backlog Snapshot

The DOCX audit contains 75 tasks:

- P0 Critical: 5
- P1 High: 16
- P2 Medium: 29
- P3 Low: 25

Primary affected files in the DOCX backlog:

- `09-online`: 17 tasks
- `09b`: 20 tasks
- `09c`: 9 tasks
- `09d`: 5 tasks
- `online-forms.css`: 8 tasks
- `backend`: 2 tasks

## What Was Updated In This Cycle

### Frontend orchestration

- Rebuilt `09-online-forms.js` queue loading and mode orchestration into a stable path.
- Fixed stale cache behavior for work queue partial failures.
- Added real work-queue filters for:
  - department
  - form
  - exception type
  - exception date range
  - rolling window (7/30/90 days)
- Added workspace loading state when switching forms or opening a record from queue.
- Added search debounce for form catalog to reduce re-render churn.
- Added SLA-style due/overdue badge in pending review queue.
- Removed raw filename exposure from exception card scope summary.

### Workspace / form runtime

- Added evidence checklist rendering and backend gating for submit-for-review and approval.
- Added related-records panel directly inside the workspace:
  - search by record ID / context
  - bidirectional record linking
  - open linked record in-place
  - unlink with audit trail
- Added CAPA effectiveness visibility and approval-stage enforcement:
  - completion evidence check
  - effectiveness review window check
  - status gate for closeout
- Added export action for evidence pack directly in workspace.
- Strengthened context lock:
  - locked fields now render with read-only/disabled attributes
  - lock badge is visible on governed fields
- Disabled e-signature buttons when the signature module is unavailable.
- Added warning when order-linking fails after successful submit.
- Added warning when server-side draft save fails but local draft remains.
- Added console warning when selected allocation ID is stale/missing.

### Record ID Assistant

- Added duplicate-aware preview using `record_id_peek` + `record_id_check_duplicate`.
- Reset module-level state cleanly on mount.
- Fixed cascading context clearing to avoid asymmetric stale WO/part/revision values.
- Added accessible `for=` label associations for generator fields and governed context lookups.
- Added suggested filename preview in the preview card.
- Added clearer inline error when record types or lookup data fail to load.

### Upload & Verify

- Added file-size precheck (50 MB frontend guard).
- Added localized file-size display.
- Added keyboard-accessible dropzone (`tabindex`, `role`, Enter/Space support).
- Added request timeout wrappers for inspect and receive flows.
- Improved small-screen badge layout by allowing wrap.

### Backend

- Added `evidence_link_list`, `evidence_link_add`, and `evidence_link_remove`.
- Added persisted `evidence_links` storage in allocation data with bidirectional enrichment.
- Added audit-log entries that do not mutate workflow status.
- Added CAPA effectiveness evaluation helper + explicit `capa_effectiveness_evaluate` endpoint.
- `upload_exception_queue` now supports:
  - `status`
  - `date_from`
  - `date_to`
- `evidence_pack_export` now includes full received workbook history when present, not only the latest receipt.

## Claude Audit Status Update

Closed or materially improved:

1. `Stale cache in loadWorkQueue`: fixed.
2. `Race / brittle re-entry after allocate`: reduced by direct controlled flow and explicit workspace loading path.
3. `Upload exception queue visibility`: improved by queue filters and removed filename from card scope; department/form filters are now first-class.
4. `prompt()` UX for reject/reopen/approve`: fixed via modal path where prompt dialog runtime exists.
5. `Hard-coded auto-download timeout`: removed earlier and kept removed.

## DOCX Task Alignment

Implemented or materially addressed from the 75-task DOCX:

- `#1` Evidence completeness checklist
- `#2` Evidence pack export
  - partial: ZIP evidence pack baseline, not full PDF dossier
- `#3` SLA timer
  - partial: due/overdue badge in queue, not backend escalation
- `#4` Cross-reference linking
  - bidirectional link store + workspace UI done
  - still not auto-linked from business rules
- `#5` CAPA effectiveness verification
  - approval-stage checklist + workspace visibility done
- `#7` Quarantine resolution UI
- `#8` Duplicate check UI before allocation
- `#11` Context fields locked after allocation
- `#13` Exception queue date/type filters
- `#16` Asymmetric context clearing
- `#19` Link-order silent failure
- `#21` Signature buttons when module missing
- `#23` Replace native prompt UX
- `#27` No clear error if data loads fail
- `#28` Work queue stale cache
- `#29` Workspace state reset on form switch
- `#32` Record-ID generator stale module state
- `#33` Loading state when switching forms
- `#35` Suggested filename preview
- `#41` Mobile shell behavior
- `#42` Workspace padding for smaller screens
- `#43` Allocate grid breakpoint
- `#44` Signature grid mobile breakpoint
- `#45` Offline badge contrast
- `#47` Tool button focus outline
- `#48` Field stacking on smaller screens
- `#49` Sidebar navigation landmark
- `#51` Disabled signature button aria state
- `#52` Select label association
- `#53` Field label association
- `#54` Keyboard-accessible dropzone
- `#67` Localized file-size display
- `#69` Server draft error visibility
- `#75` Silent missing selected allocation

## Current Capability Re-Audit

### Strong now

- Governed allocation lifecycle
- Online schema-driven form entry
- Offline issued workbook download and governed upload receipt
- Approval workflow with e-signature and password re-auth
- Work queue / pending evidence / upload exception queue
- Duplicate-aware next-ID preview
- Evidence completeness gate
- Baseline evidence pack export
- Bidirectional related-record linking across allocations
- CAPA effectiveness closeout gate
- Draft persistence to local + server
- Order linking
- Quarantine verification / accept / reject UI

### Still below world-class target

- True SLA engine:
  no persisted deadline, no escalation policy, no notification routing, no reassignment logic
- Evidence pack export:
  not yet compiled into a customer/audit-ready PDF dossier or merged release packet
- Cross-reference automation:
  manual bidirectional linking exists, but no rule-based auto-linking from shared customer/order/part/CAPA context yet
- CAPA effectiveness orchestration:
  approval gate exists, but there is no separate due-date scheduler, reminder, or management dashboard for overdue effectiveness review
- Retention/disposition:
  no record-type retention clock, legal hold, or disposition workflow
- Training auto-link:
  no document-revision-triggered training assignment
- Parallel approval / bulk actions:
  not implemented

## World-Class Criteria Reconfirmed

From the official and market references above, advanced systems consistently require:

- controlled creation, capture, retention, and disposition of records
- accountable electronic signatures with traceability and controlled access
- governed CAPA closure including effectiveness verification
- evidence bundle / release packet compilation across multiple evidence sources
- overdue visibility, escalation, and management review traceability

## Practical Scorecard After This Cycle

- Audit v1 baseline: approximately `2/10`
- Claude v2 checkpoint: approximately `6/10`
- Current implemented HESEM state: approximately `8/10`

Reasoning:

- The operational frontend/backoffice loop is now substantially more usable.
- The most important governance features now exist in some form.
- The largest remaining gap is now the backend operating model for SLA, retention, automated training linkage, and a true PDF dossier/export pipeline.

## Recommended Next Steps

1. Build persisted SLA policy + overdue/escalation backend.
2. Add retention/disposition policy by record type.
3. Upgrade evidence pack export from ZIP baseline to compiled PDF dossier / release packet.
4. Add rule-based auto-linking and training-trigger integration on top of the new `evidence_links` model.
