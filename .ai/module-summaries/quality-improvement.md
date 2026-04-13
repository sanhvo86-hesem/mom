# Domain: quality-improvement

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Manage product and process defects, failures, and risks through FMEA analysis, exception lifecycle (NCR, CAPA, complaints, MRB, deviations, concessions), control plans, and continuous improvement per AIAG/VDA and AS9100D standards. Prevent escaped defects and drive verified corrective action closure.

## Canonical Objects (Contracts)
- **Nonconformance** (`quality_improvement--nonconformances`): primary table `ncr_records`
- **Control Plan** (`quality_improvement--control-plans`): primary table `control_plans`
- **MSA Study** (`quality_improvement--msa-studies`)
- **FQC Inspection** (`quality_improvement--fqc-inspections`)
- **OQC Inspection** (`quality_improvement--oqc-inspections`)
- **Corrective Action** (`quality_improvement--corrective-actions`): primary table `capa_records`
- **Deviation** (`quality_improvement--deviations`): primary table `deviation_records`
- **Concession** (`quality_improvement--concessions`): primary table `concession_records`
- **Audit Program** (`quality_improvement--audit-programs`)
- **SPC Observation** (`quality_improvement--spc-observations`)
- **Improvement Action** (`quality_improvement--improvement-actions`)
- **Override Control** (`quality_improvement--override-controls`)

## Controllers
- `ExceptionController` → `mom/api/controllers/ExceptionController.php`
- `FmeaController` → `mom/api/controllers/FmeaController.php`
- `ApqpController` → `mom/api/controllers/ApqpController.php`
- `CiController` → `mom/api/controllers/CiController.php`
- `EvidenceController` → `mom/api/controllers/EvidenceController.php`
- `OperationalOverrideController` → `mom/api/controllers/OperationalOverrideController.php`
- `ApprovalGroupController` → `mom/api/controllers/ApprovalGroupController.php`

## Key Services
- **FmeaService** — DFMEA/PFMEA/system/MSF FMEA; failure modes with S/O/D ratings (1–10); RPN trend; control plan generation
- **ExceptionService** — Unified NCR/CAPA/complaint/MRB/deviation/concession with state-machine transitions, COPQ tracking
- **QualityIntegrationService** — Auto-CAPA trigger (3+ similar NCRs in 90 days), Jidoka (3 sequential rejects = auto-NCR), FAI detection, CAPA effectiveness checks
- **ApqpPpapService** — APQP phases 1–5 with gate reviews and checklists; PPAP element tracking (levels 1–5)
- **ComplianceReportService** — Regulatory compliance reporting, evidence aggregation
- **EvidenceVaultService** — Secure evidence storage with audit trail

## Key Tables
- `ncr_records` — Nonconformances (`draft → submitted → under_review → disposition_set → containment_active → close_requested → closed`)
- `capa_records` — Corrective actions (`draft → initiated → action_planning → implementation → effectiveness_review → closed`)
- `fmea_records` — FMEA master with `type` (DFMEA/PFMEA/system/msf/supplemental), `status`
- `failure_modes` — Child records under FMEA: `severity`, `occurrence`, `detection` (each 1–10), `rpn`
- `fmea_actions` — Recommended actions: `status` (open/in_progress/completed/cancelled), target new S/O/D after action
- `control_plans` — Generated from FMEA with `control_methods` and `reaction_types`
- `apqp_projects` — APQP projects: `phase` (1–5), `status` (active/on_hold/completed/cancelled)
- `ppap_submissions` — PPAP packages: `ppap_level` (1–5), element statuses
- `complaint_records`, `mrb_records`, `deviation_records`, `concession_records`

## Workflow States

**NCR:** draft → submitted → under_review → disposition_set → containment_active → close_requested → closed

**CAPA:** draft → initiated → action_planning → implementation → effectiveness_review → closed

**FMEA Actions:** open → in_progress → completed | cancelled

**Complaint:** open → under_investigation → root_cause_identified → corrective_action → verification → closed

**MRB:** pending_review → {use_as_is | rework | scrap | return_to_vendor} → closed

**Deviation / Concession:** requested → under_review → {approved | approved_with_conditions | rejected} → closed

**APQP:** phase 1 (concept) → phase 2 (program approval) → phase 3 (design/prototype) → phase 4 (design optimization) → phase 5 (production validation)

## Common Tasks & Entry Points
- **Create FMEA:** `FmeaController::createFmea()` → `FmeaService::createFmea()` → `fmea_records` (status = `draft`)
- **Add failure mode:** `FmeaController::addFailureMode()` → `FmeaService::addFailureMode()` → `failure_modes` + RPN = S×O×D
- **Complete action / lower RPN:** `FmeaController::completeAction()` → `FmeaService::completeAction()` → records new_S/O/D + new_rpn
- **Generate control plan from FMEA:** `FmeaController::generateControlPlan()` → `FmeaService::generateControlPlanFromFmea()` → `control_plans`
- **Submit NCR:** `ExceptionController` (workflow transition) → `ExceptionService::submitNCR()` → status = `submitted`
- **Auto-CAPA trigger:** `QualityIntegrationService::checkAutoCapaThreshold()` — fires when 3+ similar NCRs in 90-day window
- **APQP gate review:** `ApqpController::submitGateReview()` → `ApqpPpapService::submitGateReview()` → `apqp_gate_reviews`

## Business Rules
- **RPN = Severity × Occurrence × Detection** (each 1–10); recalculated only on `completeAction()` — stale until then
- **NCR cannot close without disposition**: precondition `ncr_cannot_close_without_disposition` + `disposition_complete` enforced
- **Auto-CAPA**: `AUTO_CAPA_NCR_COUNT=3`, `AUTO_CAPA_WINDOW_DAYS=90` — 3 similar NCRs in 90 days auto-initiates CAPA
- **CAPA requires root cause before action planning**: precondition `root_cause_recorded` before `plan_actions()` command
- **APQP gate approval requires complete checklist**: `submitGateReview()` needs checklist array; missing required items block approval
- **PPAP level governs elements required**: all elements must reach `completed` or `na` before submission closure
- **NCR → FAI linkage**: certain NCRs trigger First Article Inspection per AS9102 triggers (new_part, design_change, tooling_change, material_change, supplier_change, production_lapse_24m, corrective_action_change)
- **MRB disposition options per AS9100D**: use_as_is (requires engineering justification), rework, repair, scrap, return_to_vendor

## Notes / Gotchas
- **NCR / CAPA / Complaint / MRB / Deviation / Concession are separate types** with distinct state machines — do not mix transition commands (e.g., `set_disposition` is NCR-only; `root_cause_analysis` is CAPA-only)
- **RPN recalculation only on action completion** — the `failure_modes.rpn` value is stale until an action closes with new S/O/D ratings
- **FMEA types enum**: `['design', 'process', 'system', 'msf', 'supplemental']` — wrong type fails validation
- **Control plan auto-generation** uses `generateControlPlanFromFmea()` — does not auto-update if FMEA changes later; must regenerate manually
