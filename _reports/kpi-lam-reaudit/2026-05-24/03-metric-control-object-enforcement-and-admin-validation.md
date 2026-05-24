# Prompt 03 — Metric Control Object Enforcement And Admin Validation

Date: 2026-05-24  
Branch: `codex/kpi-lam-reaudit-prompt-3`  
Base HEAD: `4ad5beac` (`docs(kpi): close BSC drift to 7 core driver model`)  
Scope: Prompt 03 only.

## Gate Decision

`STOP_NEXT_PROMPT: false`

Reason: no confirmed P0 remains in `check_kpi_integrity.php`, the new Prompt 03 fake-drift PHPUnit guard rejects all required invalid Metric Control Object combinations, and `composer --working-dir=mom check` passes. One KPI hardcode audit still exits non-zero on a pre-existing ANNEX-122 §9 coverage mismatch; it is recorded below as a P1 document-surface debt because the release integrity gate still passes and Prompt 03 explicitly avoided portal-managed HTML regeneration unless required.

## Current-State Delta

- Added strict Metric Control Object validation in `KpiRegistryAdminService`: Console-added rows must declare complete MCO semantics, while legacy rows without structural MCS fields remain load-compatible.
- Extended progressive enrichment rejection: subtype without control intent, invalid subtype/scoring pairing, staged reward modes, health indicator reward/scored-core usage, gate rows without gate/CDR/pass/evidence/hold-release, SPC/Cpk without sample policy, composite weights not equal to 100, and scoring-model missing fields now fail.
- Extended `check_kpi_integrity.php` with matching P0 guard coverage.
- Reworked Admin KPI Console add flow into 8 guided MCO sections and disabled add/save when MCO rules are incomplete.
- Added `metric_control` summary to `KpiEngine` catalog metrics for dashboard/admin consumers.
- Tightened seed registry rows needed by enforcement: `QC_HOLD_SLA` now carries G6/D8 gate object fields; `TIME_ENTRY_COMPLIANCE` now carries role assignment, controllability, and red-action fields.
- Added PHPUnit fake-drift guard coverage and service-level MCO validator coverage.
- Regenerated `.ai` index files after PHP changes.

## Exact Validation Results

- `bash tools/ai/preflight.sh || true`: exit 0; reported dirty-tree hazard only, expected before commit.
- `php -l mom/api/services/KpiEngine.php`: pass.
- `php -l mom/api/services/KpiRegistryAdminService.php`: pass.
- `php -l mom/api/controllers/AdminController.php`: pass.
- `php -l mom/tools/release/check_kpi_integrity.php`: pass.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js`: pass.
- `node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: pass.
- `jq empty mom/data/registry/kpi-authority-registry.json`: pass.
- `php mom/tools/release/check_kpi_integrity.php`: pass with 27 P1 warnings, no P0.
- `php mom/tools/release/check_kpi_integrity_drift_test.php`: pass; all 4 legacy drift scenarios caught.
- `mom/vendor/bin/phpunit --configuration mom/phpunit.xml mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php mom/tests/Unit/Services/KpiRegistryAdminServiceMetricControlTest.php`: pass, 8 tests / 29 assertions.
- `mom/vendor/bin/phpunit --configuration mom/phpunit.xml mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`: pass, 9 tests / 3539 assertions.
- `php mom/tools/release/check_migration_drift.php`: exit 0 with 3 P2 prefix-collision findings: 108, 115, 188.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php`: exit 0; generated system-matrix outputs during audit run, generated report churn was not committed to keep Prompt 03 scope clean.
- `php tools/scripts/kpi/audit-html-kpis.php`: exit 0; scanned 867 HTML files, 683 files with KPI references.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php`: exit 0; scanned 867 HTML files, 624 KPI files, 95 missing evaluation terms, 227 missing recognition terms, 29 missing discipline/corrective terms, 218 KPI table rows without people-governance terms.
- `php mom/tools/release/audit_kpi_hardcode.php`: exit 1; one remaining finding: `ANNEX-122 §9: 21 gate rows rendered but registry has 31`.
- `composer --working-dir=mom check`: pass; PHPStan no errors; PHPUnit 617 tests / 6971 assertions / 1 skipped.
- `php tools/scripts/ai-index/generate.php --verbose`: pass; regenerated repo map, route map, DB map, symbols, and contracts map.

## Harsh 10-Angle Critique

1. MCO enforcement is still JSON-registry enforcement, not a normalized DB constraint.
2. Admin Console now prevents bad MCO submissions, but it is still a dense single-screen workflow.
3. Service and CI validation intentionally duplicate rules; this is safer now but creates future rule-drift risk.
4. SPC/Cpk is structurally guarded, but Prompt 03 still does not deliver real Cpk/CTQ runtime computation.
5. Composite index enforcement proves weights sum to 100, but does not prove component data quality.
6. Health indicator reward/scored-core abuse is blocked, but downstream documents can still misuse health metrics textually.
7. Gate MCO fields are now strict, yet ANNEX-122 §9 remains out of sync at 21 rendered rows vs 31 registry rows.
8. Role-measure controllability is now required, but JD scorecard detemplating remains outside this prompt.
9. Legacy reward-mode-only rows were intentionally not treated as full MCO adoption to avoid false P0; this is compatible but not fully migrated.
10. No browser smoke was performed for the Admin Console UI; syntax and backend contracts passed, but visual ergonomics still need a browser pass in a frontend prompt.

## Remaining Risks

### P0

None confirmed by `check_kpi_integrity.php` or PHPUnit fake-drift coverage.

### P1

- `audit_kpi_hardcode.php`: ANNEX-122 §9 renders 21 gate rows while the registry has 31. This is a document-surface coverage debt, not fixed in Prompt 03 because portal-managed HTML regeneration was intentionally kept out of scope.
- 27 `check_kpi_integrity.php` warnings remain, led by gate critical-CDR evidence fallback gaps, gate owner-vs-CDR-A alignment notes, and unresolved `ORDER_REVIEW_RFT -> RFQ_COMPLETENESS_SCORE` pairing.
- Performance governance audit still reports 95 KPI files missing evaluation terms, 227 missing recognition terms, and 218 KPI table rows without people-governance terms.

### P2

- Migration drift check still reports prefix collisions for migration numbers 108, 115, and 188.
- Admin Console guided flow needs browser QA and UI polish after this backend-driven enforcement pass.
- MCO schema is not yet backed by DB migrations or generated TypeScript/PHP shared schema artifacts.

