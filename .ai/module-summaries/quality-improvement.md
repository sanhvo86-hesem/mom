# Domain: quality-improvement

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Manage product and process defects, failures, and risks through FMEA analysis, exception lifecycle (NCR, CAPA, complaints, MRB, deviations, concessions), control plans, and continuous improvement per AIAG/VDA and AS9100D standards. Prevent escaped defects and drive verified corrective action closure.

This domain was **significantly expanded in v4.0 (2026-04-15)** to a world-class EQMS surface benchmarked against Veeva QMS, MasterControl, ETQ Reliance, TrackWise, and Siemens Opcenter. See `docs/benchmark/eqms-worldclass-gaps-2026-04-15.md` for the gap analysis.

---

## v4.0 World-Class EQMS Controllers (eqms-quality-routes.php)

| Controller | Module | Route Prefix |
|---|---|---|
| `EqmsComplaintsController` | Customer Complaints | `/api/v1/eqms/customer-complaints` |
| `EqmsDeviationController` | Deviations | `/api/v1/eqms/deviations` |
| `EqmsNcrController` | NCR / MRB | `/api/v1/eqms/ncr` |
| `EqmsCapaController` | CAPA | `/api/v1/eqms/capa` |
| `EqmsChangeControlController` | Formal Change Control | `/api/v1/eqms/change-control` |
| `EqmsEngineeringChangeController` | Engineering Change Orders | `/api/v1/eqms/engineering-changes` |
| `EqmsDocumentsController` | Document Control | `/api/v1/eqms/documents` |
| `EqmsTrainingController` | Training | `/api/v1/eqms/training` |
| `EqmsAuditsController` | Internal Audits + Findings | `/api/v1/eqms/audits` |
| `EqmsSuppliersController` | Supplier Qualification + QA | `/api/v1/eqms/suppliers` |
| `EqmsSupplierAuditsController` | Supplier Audits + SCAR | `/api/v1/eqms/supplier-audits` |
| `EqmsRisksController` | Risk Register + FMEA | `/api/v1/eqms/risk-register` |
| `EqmsCalibrationController` | Calibration + MSA | `/api/v1/eqms/calibration` |
| `EqmsLabInvestigationsController` | OOS / OOT Lab Investigations | `/api/v1/eqms/lab-investigations` |
| `EqmsBatchReleaseController` | Batch Release / Disposition | `/api/v1/eqms/batch-release` |
| `EqmsValidationController` | Validation Management (GAMP 5) | `/api/v1/eqms/validation` |
| `EqmsFieldActionsController` | Field Actions / Recall | `/api/v1/eqms/field-actions` |
| `EqmsGenealogyController` | Genealogy / Traceability | `/api/v1/mom/traceability/genealogy` |
| `EqmsInspectionController` | IQC + In-Process Inspection | `/api/v1/eqms/iqc` + `/api/v1/eqms/in-process` |
| `EqmsSpcController` | SPC | `/api/v1/eqms/spc` |
| `EqmsQualityTowerController` | Quality Control Tower | `/api/v1/eqms/quality-tower` |

All extend `EqmsBaseController` which provides: optimistic concurrency (If-Match), state machine enforcement, e-sig requirement, audit trail, comments, attachments, relationships, available-actions, signatures, export endpoints.

---

## v4.0 Database Tables (Migration 136)

All new tables use `eqms_` prefix. See `mom/database/migrations/136_eqms_worldclass_surface.sql`.

| Table | Module |
|---|---|
| `eqms_complaints` | Customer Complaints |
| `eqms_deviations` | Deviations |
| `eqms_ncr_records` | NCR / MRB |
| `eqms_capa_records` | CAPA |
| `eqms_change_controls` | Formal Change Control |
| `eqms_engineering_changes` | Engineering Change Orders |
| `eqms_documents` | Document Control |
| `eqms_training_records` | Training |
| `eqms_training_curricula` | Training Curricula |
| `eqms_audits` | Internal Audits |
| `eqms_audit_findings` | Audit Findings |
| `eqms_supplier_qualifications` | Supplier Qualification |
| `eqms_supplier_quality_agreements` | Quality Agreements |
| `eqms_supplier_audits` | Supplier Audits |
| `eqms_scar_records` | SCAR 8D |
| `eqms_risk_register` | Risk Register (risk_score = GENERATED ALWAYS AS likelihood*severity) |
| `eqms_fmea_records` | FMEA |
| `eqms_calibration_records` | Calibration |
| `eqms_msa_studies` | MSA / GR&R |
| `eqms_lab_investigations` | OOS / OOT |
| `eqms_batch_release_records` | Batch Release |
| `eqms_validation_projects` | Validation Projects |
| `eqms_validation_requirements` | Validation Requirements |
| `eqms_validation_protocols` | Validation Protocols |
| `eqms_validation_executions` | Protocol Executions |
| `eqms_field_actions` | Field Actions / Recall |
| `eqms_genealogy_trace_reports` | Genealogy Freeze |
| `eqms_iqc_lots` | IQC Lots |
| `eqms_inprocess_inspections` | In-Process Inspections |
| `eqms_spc_observations` | SPC |
| `eqms_quality_tower_snapshots` | Tower KPI Snapshots |
| `eqms_audit_events` | Append-only audit trail (immutability trigger) |
| `eqms_comments` | Cross-entity comments |
| `eqms_attachments` | Cross-entity attachments |
| `eqms_record_links` | Cross-module record links |
| `eqms_esig_events` | Electronic signatures (21 CFR Part 11) |
| `eqms_export_jobs` | Async export job queue |

---

## Legacy Controllers (pre-v4.0, still active)

- `ExceptionController` → `mom/api/controllers/ExceptionController.php` (ncr_records, capa_records, etc.)
- `FmeaController` → `mom/api/controllers/FmeaController.php` (fmea_records, failure_modes)
- `ApqpController` → `mom/api/controllers/ApqpController.php` (apqp_projects)
- `CiController` → `mom/api/controllers/CiController.php`
- `EvidenceController` → `mom/api/controllers/EvidenceController.php`
- `OperationalOverrideController` → `mom/api/controllers/OperationalOverrideController.php`
- `ApprovalGroupController` → `mom/api/controllers/ApprovalGroupController.php`

Legacy controllers continue writing to legacy tables (ncr_records, capa_records, fmea_records, etc.). New v4.0 controllers write exclusively to eqms_* tables. **Do not mix** — legacy and v4.0 records are separate lineages.

---

## Key Services

- **FmeaService** — DFMEA/PFMEA/system/MSF FMEA; failure modes with S/O/D ratings (1–10); RPN trend; control plan generation
- **ExceptionService** — Unified NCR/CAPA/complaint/MRB/deviation/concession with state-machine transitions, COPQ tracking
- **QualityIntegrationService** — Auto-CAPA trigger (3+ similar NCRs in 90 days), Jidoka (3 sequential rejects = auto-NCR), FAI detection, CAPA effectiveness checks
- **ApqpPpapService** — APQP phases 1–5 with gate reviews and checklists; PPAP element tracking (levels 1–5)

> **v4.0 gap**: `BatchReleaseService`, `ValidationManagementService`, `FieldActionService`, `LabInvestigationService`, `QualityRiskService`, `MsaService`, `SupplierAuditService` are not yet extracted to service classes. Controllers contain inline SQL. See gaps doc.

---

## Workflow States (v4.0)

**Complaints:** draft → open → under_investigation → response_issued → closed

**Deviations:** draft → classified → under_investigation → pending_closure → closed | voided

**NCR:** draft → submitted → under_review → disposition_set → containment_active → close_requested → closed

**CAPA (10-state):** draft → initiated → root_cause_analysis → action_planning → plan_approval → implementation → effectiveness_review → verification → pending_closure → closed

**Change Control:** draft → impact_assessment → routing → under_review → approved → implementation → verification → closed | cancelled

**Documents:** draft → under_review → approved → released → superseded | obsolete (+ checkout/checkin lock)

**Batch Release:** lot_created → data_aggregation → exception_review → pending_release → approved | on_hold → market_shipped

**Validation:** planning → requirements → protocol_authoring → protocol_approved → execution → summary_generated → qualified | failed

**Field Actions:** evaluation → planned → launched → notifications_sent → effectiveness_monitoring → closed

**SCAR:** issued → acknowledged → root_cause_analysis → corrective_action → verification → closed

---

## Cross-Cutting Rules (v4.0)

- **Optimistic concurrency**: Every PATCH and action endpoint on regulated records requires `If-Match: "{version}"` header. Returns 412 on mismatch, 428 if missing.
- **Electronic signatures (21 CFR Part 11)**: Required for: close, approve, supersede, obsolete, release, market-ship, launch, freeze-trace-report, void. Body must include `esig: { reason, password | sig_token }`.
- **Audit trail**: Every state transition writes an append-only record to `eqms_audit_events`. Immutability enforced by DB trigger (UPDATE/DELETE raise exception).
- **State machine**: Invalid transitions return 409 Conflict with `allowed` array.
- **EventBus**: All state transitions emit to `domain_outbox_events` via `emitQualityEvent()`.
- **Export**: All modules support `POST /{id}/export` (async 202 + job_id). Jobs stored in `eqms_export_jobs`.

---

## Business Rules (v4.0 additions)

- **Risk score**: `eqms_risk_register.risk_score` = `likelihood × severity` (GENERATED ALWAYS STORED). Never write directly; will throw PG error.
- **Batch release approval ALWAYS requires esig** — no exceptions, even for test lots.
- **Market ship requires prior approved status** — 409 if still `pending_release`.
- **Genealogy freeze is irreversible** — frozen records block all mutations; requires quality_manager role + esig.
- **SCAR close always requires esig** — regardless of score or severity.
- **Supplier disqualify requires quality_manager role** — engineer role gets 403.
- **Audit close blocks if open major findings remain** — 409 until all major findings are closed.
- **CAPA action planning blocked without root cause** — 422 if root_cause_description is null.
- **Document checkout is exclusive** — second checkout by different user returns 409.
- **OOS/OOT close requires**: root_cause, lab_error_identified, final_conclusion + esig.

---

## Notes / Gotchas

- **v4.0 controllers use `eqms_*` tables; legacy controllers use old tables** — always check which namespace you're in
- **`risk_score` is a GENERATED column** — do not include it in INSERT/UPDATE statements
- **eqms_audit_events is immutable** — trigger will throw on UPDATE/DELETE; DBA must disable trigger to correct a record
- **esig body format**: `{ "esig": { "reason": "...", "password": "..." } }` — wrong nesting returns 400
- **If-Match header**: `If-Match: "5"` (quoted) — the version number as a quoted string per HTTP spec
- **Quality Tower snapshot**: stale after 1 hour; refresh with `POST /api/v1/eqms/quality-tower/snapshot` or via cron
