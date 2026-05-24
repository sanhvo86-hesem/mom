# 05 - Customer NCR Severity, 3D/4D/8D SLA, Hard Gates And Bonus Simulation

Date: 2026-05-24  
Branch: `codex/kpi-lam-reaudit-prompt-5`  
Base: Prompt 04 HEAD `4dbe099c`  
Prompt: `05_CUSTOMER_NCR_SEVERITY_3D4D8D_AND_BONUS_SIMULATION.md`

## Current-State Delta

- Prompt 04 report was re-read before edits: `STOP_NEXT_PROMPT: false`, no P0, integrity passed with inherited P1 warnings. Prompt 05 was allowed to proceed.
- Prompt 04 added LAM G3/G5 gate coverage and rows. Prompt 05 now extends the customer escape side: severity matrix, 3D/4D/8D timestamps, hard-gate blocker vocabulary, and simulation-only bonus model.
- Stale assumption found: `NCR_3D_RESPONSE_SLA`, `NCR_4D_PRELIMINARY_SLA`, `NCR_8D_UPDATE_SLA`, and `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE` existed, but they lacked a governed severity/bonus context and complete data-contract linkage.
- Drift risk if not updated together: registry rows, blocking condition registry, bonus simulation model, EQMS complaint columns, catalog/admin exposure, ANNEX render outputs, and CI guard would disagree.

## Files Read

- Full prompt pack under `/tmp/kpi_lam_reaudit_pack_2026_05_24/kpi_lam_reaudit_gated_prompt_pack_2026-05-24/`.
- `AGENTS.md`, `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `.ai/db-map/index.json`, `.ai/db-map/quality-improvement.json`, `.ai/db-map/commercial-customer.json`.
- `_reports/kpi-lam-reaudit/2026-05-24/04-lam-g3-g5-gate-coverage-and-evidence-rows.md`.
- KPI registry, `KpiEngine`, `KpiRegistryAdminService`, Admin Console JS, `EqmsComplaintsController`, `check_kpi_integrity.php`, and related KPI tests.

## Files Changed

- `mom/data/registry/kpi-authority-registry.json`
- `mom/database/migrations/198_customer_ncr_severity_contract.sql`
- `mom/api/controllers/EqmsComplaintsController.php`
- `mom/api/services/KpiEngine.php`
- `mom/api/services/KpiRegistryAdminService.php`
- `mom/scripts/portal/00o-admin-kpi-registry.js`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `.ai/*` generated index metadata
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html`
- This report.

## Implementation Summary

- Added `customer_ncr_severity_matrix` with all 10 required severity rows: minor, major, critical, repeat same root cause, late/no NCR, no containment, unauthorized change, ship deviation without special release, expired gage used for release, falsified record.
- Added registered hard-gate condition IDs for customer escape, gate bypass, and data integrity cases. Matrix hard gates now resolve to `blocking_condition_registry`.
- Added Prompt 05 metric rows: `CUSTOMER_NCR_SEVERITY_SCORE`, `CUSTOMER_NCR_EVENTS_M`, `DEFECTIVE_ORDER_RATE_M`, `CUSTOMER_ESCAPE_DPPM_12M`, `NO_LATE_NO_NCR_COUNTER`, `NO_CONTAINMENT_COUNTER`; enriched the existing 3D/4D/8D/accepted-closure rows.
- Added `customer_ncr_data_contract` with distinct fields for complaint receipt, detection, NCR creation, customer notification, containment, 3D, 4D, 8D, corrective action effectiveness, customer acceptance, closure, and repeat root-cause family.
- Added `bonus_simulation_model` with `simulation_only: true`, payout formula, severity deductions, hard gates, calibration requirement, scope rule, and no-payout/no-automatic-discipline boundary.
- Added nullable EQMS complaint columns and indexes for 3D/4D/8D event truth and severity/hard-gate tracking.
- Extended complaint metrics API with `quality_escape_severity` aggregates and open-row status fields.
- Exposed the new registry sections through `KpiEngine::getMetricCatalog()` and `KpiRegistryAdminService::load()`.
- Added Admin Console `Quality Escape` tab for the severity matrix, 3D/4D/8D data contract, hard gates, dashboard contract, and simulation boundary.
- Extended `check_kpi_integrity.php` with Prompt 05 P0 rules and PHPUnit fake-drift coverage.
- Regenerated ANNEX-122 and ANNEX-128 from the registry/scripts.

## Validation Results

- `bash tools/ai/preflight.sh || true`: exit 0; one expected dirty-tree hazard due in-progress changes.
- `php -l mom/api/services/KpiEngine.php`: pass.
- `php -l mom/api/services/KpiRegistryAdminService.php`: pass.
- `php -l mom/api/controllers/AdminController.php`: pass.
- `php -l mom/api/controllers/EqmsComplaintsController.php`: pass.
- `php -l mom/tools/release/check_kpi_integrity.php`: pass.
- `php -l mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`: pass.
- `php -l mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`: pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: pass.
- `php tools/scripts/ai-index/generate.php --verbose`: pass; migrations count updated to 201.
- `php mom/tools/release/sync_kpi_annex122.php`: regenerated ANNEX-122 from schema_version 22.
- `php tools/scripts/kpi/audit-html-kpis.php`: exit 0; registry version `2026-05-24+p05`, 209 known metric codes.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php`: exit 0; no highest-risk documents reported.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php`: exit 0; regenerated ANNEX-128. Large `_reports/kpi` churn was not kept.
- `php mom/tools/release/audit_kpi_hardcode.php`: pass; 203 registry rows, 194 canonical codes, no hardcoded KPI drift.
- `php mom/tools/release/check_migration_drift.php`: exit 0; inherited P2 prefix collisions only for 108, 115, 188.
- `php mom/tools/release/check_kpi_integrity.php`: pass with 25 inherited P1 warnings; no P0.
- `composer --working-dir=mom test -- --filter KpiIntegrityMetricControlGuardTest`: pass, 13 tests, 52 assertions.
- `composer --working-dir=mom test -- --filter KpiEngineAuthorityRegistryTest`: pass, 9 tests, 3819 assertions.
- Admin Console Playwright smoke through local isolated mount: pass, `Quality Escape` tab rendered with `simulation_only` and hard-gate content; 0 page errors.
- `composer --working-dir=mom check`: pass; PHPStan no errors; PHPUnit 624 tests, 7279 assertions, 1 skipped.

Note: first full `composer check` failed because `KpiEngineAuthorityRegistryTest` still expected 123 proposed metrics. Prompt 05 added 6 rows, so the expected count was updated to 129 and the full rerun passed.

## Re-Audit Checkpoints

1. LAM 8D metrics have canonical rows: yes. Existing 3D/4D/8D/accepted-closure rows remain canonical and now carry data-contract/evidence links.
2. No severity metric is directly rewardable: yes. Prompt 05 severity/hard-gate metrics are `not_rewardable` or `blocker_only`; CI rejects drift.
3. Bonus model is simulation-only: yes. `bonus_simulation_model.simulation_only` is true and CI enforces it.
4. Hard gates match blocker registry: yes. Matrix and bonus hard gates resolve to `blocking_condition_registry`.
5. Complaint rate is not alone for low-volume punishment: yes. `COMPLAINT_RATE` now has `low_volume_policy`, sample policy, and pairs to `CUSTOMER_NCR_SEVERITY_SCORE`.
6. Data model distinguishes event times: yes. Detection, NCR creation, notification, containment, 3D, 4D, 8D, effectiveness, customer acceptance, and closure are distinct contract fields.

## Harsh 10-Angle Critique

1. Shop-floor reality: improves containment pressure and customer-risk visibility. It still depends on disciplined timestamp capture; no calculator can rescue missing complaint evidence.
2. LAM/Semsysco readiness: 3D/4D/8D clocks, customer acceptance, special release, change approval, expired gage, and record falsification are explicitly modeled. Gage/CTQ runtime depth remains Prompt 06 scope.
3. Lean/TOC: avoids local optimization by preventing low DPPM from diluting critical escapes. It does not yet connect customer escape to bottleneck WIP/constraint loss.
4. Data truth: no new severity KPI is marked runtime without real calculator proof. Staged/manual statuses are honest.
5. Low-volume statistics: complaint rate now has low-volume policy and sample context. DPPM/order-rate remain staged until denominator joins are proven.
6. Fairness: role assignments put QA/CS as governed owners, but attribution still needs case-by-case root-cause family discipline in operations.
7. Anti-gaming: late/no NCR, no containment, self-closed 8D, false records, and denominator exclusions are guarded. Hiding via customer email outside EQMS remains a process risk until mailbox/API intake is formalized.
8. Admin/UX: Admin Console now shows the model and simulation boundary. It is read-only for the matrix; editing still belongs in registry/review flow.
9. Documentation: ANNEX-122 and ANNEX-128 were regenerated. ANNEX-125/127/129 did not receive manual prose expansion; this is acceptable for Prompt 05 but should be cleaned in Prompt 11.
10. CI guard: fake-drift tests cover simulation-only, missing blocker, direct rewardability, and missing required metric. Remaining risk is semantic quality of severity text, not structural drift.

## Issues And Risk Register

P0: none.

P1 remaining inherited:
- KPI integrity still reports 25 P1 warnings, mostly staged critical CDR manual fallback gaps, owner-vs-CDR alignment notes, `RECORDABLE_INCIDENT_RATE` min_sample 0, and unresolved `ORDER_REVIEW_RFT` paired metric `RFQ_COMPLETENESS_SCORE`.

P2 remaining:
- Existing migration prefix collisions remain for 108, 115, and 188; drift checker treats them as non-fatal P2.
- New 3D/4D/8D complaint fields are nullable and not backfilled; dashboards must show missing/staged evidence until live data exists.
- Full prose synchronization into ANNEX-125/127/129 is deferred; generated ANNEX-122/128 are synchronized now.
- No production payout logic was added by design; bonus model is calibration/simulation only.

## Fixes Applied After Critique

- Added missing `repeat_same_root_cause_escape` to bonus hard gates after integrity guard detected mismatch with matrix hard gate.
- Updated catalog count test from 123 to 129 and added assertions for the new severity/data-contract/bonus catalog sections.
- Updated `KpiEngine` metric-control role summary to read `role_code` as well as legacy `role`.

## STOP_NEXT_PROMPT

STOP_NEXT_PROMPT: false

Recommended next prompt: `06_CPK_CTQ_SPC_CAPABILITY_MODULE_CONCRETE.md`
