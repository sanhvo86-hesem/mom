# Domain: quality-improvement

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Audit Programs** (`quality_improvement.audit-programs`): primary table `qual_audit_programs`, workflow: `qual_audit_programs_status_set`
- **Concessions** (`quality_improvement.concessions`): primary table `concessions`, workflow: `concessions_status_set`
- **Control Plans** (`quality_improvement.control-plans`): primary table `control_plans`, workflow: `control_plan_status`
- **Corrective Actions** (`quality_improvement.corrective-actions`): primary table `capa_records`, workflow: `capa_records_capa_status`
- **Deviations** (`quality_improvement.deviations`): primary table `deviations`, workflow: `deviations_exception_status`
- **FQC Inspections** (`quality_improvement.fqc-inspections`): primary table `oqc_inspections`, workflow: `fqc_oqc_alias_runtime`
- **Improvement Actions** (`quality_improvement.improvement-actions`): primary table `improvement_projects`, workflow: `improvement_projects_improvement_status_set`
- **MSA Studies** (`quality_improvement.msa-studies`): primary table `calibration_grr_studies`, workflow: ``
- **Nonconformances** (`quality_improvement.nonconformances`): primary table `ncr_records`, workflow: `ncr_records_ncr_status`
- **OQC Inspections** (`quality_improvement.oqc-inspections`): primary table `oqc_inspections`, workflow: `oqc_inspections_result_status`
- **Override Controls** (`quality_improvement.override-controls`): primary table `operational_override_controls`, workflow: `operational_override_controls_service_runtime`
- **SPC Observations** (`quality_improvement.spc-observations`): primary table `spc_data`, workflow: ``

## Controllers
- `FmeaController` → `mom/api/controllers/FmeaController.php`
- `ApqpController` → `mom/api/controllers/ApqpController.php`
- `ComplianceReportController` → `mom/api/controllers/ComplianceReportController.php`
- `ExceptionController` → `mom/api/controllers/ExceptionController.php`
- `EvidenceController` → `mom/api/controllers/EvidenceController.php`
- `CiController` → `mom/api/controllers/CiController.php`
- `OperationalOverrideController` → `mom/api/controllers/OperationalOverrideController.php`
- `ApprovalGroupController` → `mom/api/controllers/ApprovalGroupController.php`

## Key Services
<!-- List 3–5 most important services for this domain and what they do -->

## Key Tables
<!-- List the 3–5 most critical database tables with a one-line description each -->

## Workflow States
<!-- List lifecycle states for the main records (e.g., Draft → Submitted → Approved → Released → Closed) -->

## Common Tasks & Entry Points
<!-- e.g., "To add a field to an NCR: edit migration + contract.json + ExceptionController" -->
<!-- e.g., "To trace an order: start at OrderController::detail, then OrderService::get" -->

## Business Rules
<!-- Non-obvious rules that would trip up AI without context -->
<!-- e.g., "JO number = plant_code + year + 4-digit sequence — changing this breaks traveler lookup" -->

## Notes / Gotchas
<!-- Architecture quirks, legacy compatibility concerns, known edge cases -->