# KPI Rebuild Final Integration Plan

Date: 2026-05-23
Branch: `codex/kpi-final-integration`
Mode: Track 99 rerun and final verification.

## Integration Scope

Track 99 now consolidates all six tracks into one reviewed branch. Tracks 1-4
are not left as report-only guidance: the registry, JD model, guard, dashboard,
ANNEX-128, generated reports, and tests were updated so the final branch has
the intended lean KPI operating architecture.

## Inputs Read

| Track | Input folder | Integration decision |
|---|---|---|
| Track 1 | `_reports/kpi-rebuild/2026-05-23/track-01-strategy-prune/` | Materialize lean 7-KPI executive scorecard and demote staged/broad items out of the company scorecard. |
| Track 2 | `_reports/kpi-rebuild/2026-05-23/track-02-data-runtime/` | Keep runtime truth conservative; new role metrics are governed/manual unless a real runtime contract exists. |
| Track 3 | `_reports/kpi-rebuild/2026-05-23/track-03-gates-daily-docs/` | Preserve G0-G7 gate coverage and regenerate ANNEX-128/system matrix. |
| Track 4 | `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/` | Convert registry to `active_candidate_role_scorecard` with active/candidate/optional/do-not-use controls. |
| Track 5 | `_reports/kpi-rebuild/2026-05-23/track-05-admin-dashboard/` | Keep structured Admin Console/dashboard views and editable-field allowlist. |
| Track 6 | `_reports/kpi-rebuild/2026-05-23/track-06-ci-integration/` | Keep CI guard, fake-drift coverage, and registry/doc guard hardening. |

## Branch Integration

The branch started from `codex/kpi-track99-aggregation-inputs`, which already
collected Track 1-6 report artifacts. Track 6 implementation branch
`codex/kpi-t6-ci-integration-isolated` was merged because it contained the
initial registry/doc/guard implementation. The rerun then added the missing
Track 1-4 materialization work on top of that merge.

## Final Architecture Checks

| Requirement | Final state |
|---|---|
| Official KPI set is lean and not historical-count based | `executive_scorecard` has 7 runtime/manual-governed core items. |
| No staged payout metric | Guard exits 0; staged reward eligibility is P0-blocked. |
| Every reward KPI has counter/blocker | Guard enforces counter/blocker requirements. |
| Runtime/manual/staged/retired is explicit | Guard output: governance 14 runtime, 18 staged, 0 manual, 1 manual_governed. |
| G0-G7 gate coverage | 100%; all gate metrics have linked CDR/pass condition. |
| JD scorecards do not assume fixed 5 | Registry uses `active_candidate_role_scorecard`; active distribution is 3/4/5 by role fit. |
| Admin Console avoids raw JSON editor | Structured console remains in place and guard checks raw JSON editor drift. |
| CI guard catches fake drift | Track 6 fake-drift evidence remains in the report folder. |
| ANNEX-128 enumerates governed codes | Audit generator now renders registry inventory in addition to true usage counts. |

## Verification Plan

Executed during rerun:

```bash
bash tools/ai/preflight.sh || true
php -l mom/api/services/KpiEngine.php
php -l mom/api/services/KpiRegistryAdminService.php
php -l mom/api/controllers/AdminController.php
php -l mom/api/services/DashboardService.php
php -l tools/scripts/kpi/audit-kpi-system-matrix.php
php -l mom/tools/release/check_kpi_integrity.php
node --check mom/scripts/portal/00o-admin-kpi-registry.js
node --check mom/scripts/portal/13-jd-scorecard-renderer.js
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php mom/tools/release/check_kpi_integrity.php
composer --working-dir=mom test -- --filter KpiEngineAuthorityRegistryTest
php tools/scripts/ai-index/generate.php --verbose
composer --working-dir=mom run check
php mom/tools/release/check_migration_drift.php || true
```

## Final GO/NO-GO Policy

GO for integration review because KPI integrity passes with zero warnings and
full `composer --working-dir=mom run check` passes.

NO-GO for direct production deployment until the normal merge/deploy gates are
run from the release branch and the non-fatal migration prefix-collision debt is
accepted or handled separately.
