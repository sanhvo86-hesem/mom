# Prompt 08 - Lean Flow TOC CMM Queue Material Readiness

Date: 2026-05-24
Branch: `codex/kpi-lam-reaudit-prompt-8`
Previous gate: `_reports/kpi-lam-reaudit/2026-05-24/07-data-contract-runtime-and-manual-governed-graduation.md` has `STOP_NEXT_PROMPT=false` and no open P0.

## Files Read

- `AGENTS.md`
- `.ai/AI-WORKFLOW.md`
- `.ai/CONVENTIONS.md`
- `.ai/repo-map.json`
- `/Users/a10/Downloads/kpi_lam_reaudit_gated_prompt_pack_2026-05-24.zip`
- `prompts/00_MASTER_REAUDIT_GUARDRAILS.md`
- `prompts/08_LEAN_FLOW_TOC_CMM_QUEUE_MATERIAL_READINESS.md`
- `_reports/kpi-lam-reaudit/2026-05-24/07-data-contract-runtime-and-manual-governed-graduation.md`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiEngine.php`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `mom/database/schema.sql`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html`
- `mom/docs/operations/references/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html`
- `mom/docs/operations/references/05-ANNEX-500/annex-504-tier-meeting-cadence-and-escalation-standard-work.html`
- `mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html`

## Files Changed

- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiEngine.php`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`
- `mom/docs/operations/references/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html`
- `mom/docs/operations/references/05-ANNEX-500/annex-504-tier-meeting-cadence-and-escalation-standard-work.html`
- `mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.json`
- `_reports/kpi/report-kpi-system-matrix-2026-04-19.md`
- `.ai/*` generated index metadata from `php tools/scripts/ai-index/generate.php --verbose`

## Current-State Delta

Prompt 07 made a clear runtime/manual/staged boundary. That boundary still holds: CMM queue remains manual-governed, FAI/final-inspection queues remain staged, and no new fake runtime calculator was created for constraint metrics.

Stale assumption corrected: `MATERIAL_AVAILABILITY_PLAN` can no longer mean only `job_orders.material_readiness_status`. It is still runtime, but the runtime calculation now fails readiness when job metadata declares cert/CoC, IQC, traceability, special-process, kit, tool, fixture, or gage blockers.

Scope in: Lean/TOC current-constraint visibility, CMM/QC queue, material-cert-IQC readiness, daily/tier board logic, dashboard/catalog exposure, integrity guard and focused tests. Scope out: new migrations for normalized constraint events, live CMM queue tables, JD detemplating, Vietnamese rewrite beyond touched daily-management passages, and runtime graduation of staged queue metrics.

Drift risk if not updated together: registry version/schema, driver panel, dashboard card list, KpiEngine catalog/runtime material calculation, ANNEX-122/125/128, ANNEX-501/504, WI-202 and `check_kpi_integrity.php`.

## Before / After

Before:
- Registry version was `2026-05-24+p07`, `schema_version=24`.
- `CURRENT_CONSTRAINT_RESOURCE`, `CONSTRAINT_STARVED_TIME`, and `CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS` were missing.
- `OEE_BOTTLENECK`, `BOTTLENECK_BUFFER_STATUS`, and `CONSTRAINT_LOST_HOURS` existed but were weak staged rows.
- `MATERIAL_AVAILABILITY_PLAN` used only physical/material-readiness status and could stay green despite declared LAM cert/IQC/traceability blockers.
- Dashboard driver panel did not expose the full TOC/QC/material-readiness set.

After:
- Registry version is `2026-05-24+p08`, `schema_version=25`.
- New `lean_flow_operating_model` defines constraint resource types: CNC machine/cell, CMM, setup, CAM, QC/final inspection, deburr/cleaning/packing, supplier/material, and special-process/outsource.
- Constraint driver set is defined/hardened: `CURRENT_CONSTRAINT_RESOURCE`, `OEE_BOTTLENECK`, `BOTTLENECK_BUFFER_STATUS`, `CONSTRAINT_LOST_HOURS`, `CONSTRAINT_STARVED_TIME`, `CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS`.
- CMM/QC queue set is visible and guarded: `CMM_QUEUE_AGING`, `FAI_QUEUE_AGING`, `FINAL_INSPECTION_QUEUE_AGING`, `QC_HOLD_SLA`, `INSPECTION_PLAN_ADHERENCE`.
- `MATERIAL_AVAILABILITY_PLAN` is a composite readiness model with component weights totaling 100 and blockers for cert/CoC, IQC, traceability, special process, kit, and tool/fixture/gage.
- Dashboard core/driver cards grew from 18 to 32 to show staged flags, owner/action due requirement, cause breakdown and daily/tier metric coverage.
- `KpiEngine::getMetricCatalog()` exposes `dashboard_render_contract` and `lean_flow_operating_model`.
- `KpiEngine::calcMaterialAvailabilityPlan()` suppresses green readiness when explicit readiness blockers exist in `job_orders.metadata`.
- `check_kpi_integrity.php` P0.18 now blocks Prompt 08 drift.

## Validation Results

- `bash tools/ai/preflight.sh || true` - completed; expected dirty-tree hazard while Prompt 08 edits were uncommitted.
- `php -l mom/api/services/KpiEngine.php` - pass.
- `php -l mom/api/services/KpiRegistryAdminService.php` - pass.
- `php -l mom/api/controllers/AdminController.php` - pass.
- `php -l mom/tools/release/check_kpi_integrity.php` - pass.
- `php -l mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php` - pass.
- `php -l mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php` - pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js` - pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js` - pass.
- `php mom/tools/release/sync_kpi_annex122.php` - pass; regenerated ANNEX-122 from registry `schema_version 25`.
- `php tools/scripts/kpi/audit-html-kpis.php || true` - completed; registry version `2026-05-24+p08`, 35 runtime calculators observed.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php || true` - completed; inherited governance findings remain outside Prompt 08 scope.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php || true` - pass; regenerated KPI system matrix report and ANNEX-128.
- `php mom/tools/release/check_migration_drift.php || true` - pass with existing P2 duplicate migration prefixes 108, 115 and 188; no fatal drift.
- `php mom/tools/release/check_kpi_integrity.php` - pass with 22 inherited P1 warnings and no P0.
- `composer --working-dir=mom test -- --filter 'KpiIntegrityMetricControlGuardTest|KpiEnginePrompt08FlowReadinessTest|KpiEngineAuthorityRegistryTest'` - pass, 36 tests, 4174 assertions.
- `php tools/scripts/ai-index/generate.php --verbose` - pass.
- `composer --working-dir=mom check` - pass; PHPStan no errors, PHPUnit 647 tests, 7629 assertions, 1 skipped.

No live database/API smoke was run in this Codex environment. Material-readiness runtime behavior is covered through the new fake-connection unit test and static catalog/integrity guards.

## Re-Audit Checkpoints

1. CMM bottleneck scenario: visible through `CMM_QUEUE_AGING`, `CURRENT_CONSTRAINT_RESOURCE`, `lean_flow_operating_model.cmm_qc_queue_metrics`, dashboard core cards and WI-202/ANNEX-504 board logic.
2. Material available but cert missing: `calcMaterialAvailabilityPlan()` counts the job not ready when metadata declares cert/CoC blocker or false cert verification; registry blocks recognition through material/cert/IQC/trace readiness blockers.
3. Hot-job resequence: unchanged Prompt 07 `PLAN_ADHERENCE` protection remains; approved resequence is excluded via `job_orders.metadata.approved_resequence`.
4. Machine OEE green but constraint idle: `CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS` is a staged strategic driver and P0.18-protected dashboard card.
5. Global utilization reward risk: no machine-utilization or bottleneck metric was added to the executive scorecard or reward calculation.

## Harsh 10-Angle Critique

1. Shop-floor reality: better because the board must show current constraint, queue age, lost/starved/idle hours and owner/due, not only OTD after failure. Weakness: constraint events are still staged until a normalized register exists.
2. LAM/Semsysco readiness: stronger for G3/G5 readiness because material score now links to cert/CoC, IQC, traceability, kit, special process and gage/tool/fixture blockers. It still depends on manual-governed evidence for several LAM gates.
3. Lean/TOC: the model no longer assumes the machine is the bottleneck. CMM, QC, setup, CAM, deburr/packing and supplier/material can be the constraint. Local utilization is explicitly countered.
4. Data truth: no staged constraint or queue metric was promoted to runtime. Runtime material calculation only uses existing `job_orders` columns/metadata and exposes metadata coverage flags.
5. Low-volume statistics: no Cpk/SPC claims were added. Queue and constraint drivers remain staged/manual, visible for action rather than customer-grade or reward scoring.
6. Fairness: owner roles are split by controllability: PPL for release/constraint, WKM for lost hours, QA/QC for queue/release evidence, SCM for material readiness. Inherited owner-vs-CDR warnings remain.
7. Anti-gaming: counter-metrics and P0.18 block making constraint drivers rewardable. `CONSTRAINT_IDLE_WHILE_NON_CONSTRAINT_RUNS` catches local utilization gaming.
8. Admin/UX: catalog and dashboard contract now expose Lean/TOC/readiness metadata for consumers, but this prompt did not redesign the Admin Console wizard. Admin UX risk remains for future governance prompts.
9. Documentation: ANNEX-122 and ANNEX-128 were regenerated; ANNEX-125, ANNEX-501, ANNEX-504 and WI-202 were updated directly.
10. CI guard: P0.18 fake-drift tests now catch missing constraint metric, rewardable constraint driver, missing material cert component and missing queue daily-management context.

## Issues Found

P0:
- None remaining.

P1:
- Inherited `check_kpi_integrity.php` warnings remain: `RECORDABLE_INCIDENT_RATE` min-sample, critical staged evidence fallback for several G7 rows, owner-vs-CDR split notes, and unresolved `ORDER_REVIEW_RFT` paired metric `RFQ_COMPLETENESS_SCORE`.
- Constraint events, CMM-specific queue events and final-inspection queue events are not normalized runtime tables yet.
- Live DB/API route smoke for material readiness and dashboard cards was not executed.

P2:
- Existing migration prefix collisions 108, 115 and 188 remain.
- `.ai` index regeneration changed generated timestamps only.
- KPI system matrix regenerated large full-scan outputs.

## Fixes Applied After Critique

- Kept CMM queue manual-governed and FAI/final-inspection queues staged; no fake runtime.
- Added explicit non-machine constraint resource types and dashboard cards.
- Added material-readiness component blockers and a runtime test for explicit cert/IQC/gage blocker suppression.
- Added P0.18 integrity guard and fake-drift coverage.
- Updated daily/tier meeting documents so the next action is visible through owner, due date, cause breakdown and evidence.

## Remaining Risk Register

- R1: Normalize `constraint_resource_events` and `constraint_loss_events` so TOC metrics can graduate honestly.
- R2: Add CMM/FAI/final-inspection queue event tables with queued/started/completed timestamps before runtime graduation.
- R3: Add live DB fixtures/API smoke for material-readiness metadata blockers.
- R4: Close inherited owner-vs-CDR warnings before final management-system release.
- R5: Keep manual-governed LAM gates audited; software now requires the evidence contract but cannot prove operator discipline without usage data.

## Recommended Next Prompt

Continue to the next gated prompt after Prompt 08. Do not promote staged Lean/TOC or CMM/QC queue metrics to runtime until the required event contracts exist.

STOP_NEXT_PROMPT: false
