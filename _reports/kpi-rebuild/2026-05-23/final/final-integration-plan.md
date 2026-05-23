# KPI Rebuild Final Integration Plan

Date: 2026-05-23
Branch: `codex/kpi-final-integration`
Mode: Track 99 integration and final verification.

## Integration Scope

Track 99 consolidates the six KPI rebuild tracks into one coherent final
state. The final state is not a new KPI expansion. It is a governed Lean KPI
architecture with explicit separation between official scorecard KPIs,
operating metrics, gate controls, JD role measures, health indicators,
counter metrics, and staged/manual/runtime calculation status.

## Inputs Read

| Track | Input folder | Integration decision |
|---|---|---|
| Track 1 | `_reports/kpi-rebuild/2026-05-23/track-01-strategy-prune/` | Use as target architecture and prune/classification authority. |
| Track 2 | `_reports/kpi-rebuild/2026-05-23/track-02-data-runtime/` | Keep runtime truth conservative; do not graduate staged candidates without verified tables, columns, calculators, and min-sample handling. |
| Track 3 | `_reports/kpi-rebuild/2026-05-23/track-03-gates-daily-docs/` | Use as document and gate matrix evidence; keep ANNEX-128 freshness as a verification item. |
| Track 4 | `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/` | Preserve the active/candidate target model as remaining implementation work; do not claim fixed-count removal is complete. |
| Track 5 | `_reports/kpi-rebuild/2026-05-23/track-05-admin-dashboard/` | Keep structured Admin Console/dashboard views, editable-field allowlist, staged labels, and no raw JSON editor. |
| Track 6 | `_reports/kpi-rebuild/2026-05-23/track-06-ci-integration/` | Merge guard, registry/doc, deploy CI, and fake-drift evidence into final integration. |

## Branch Integration

Current branch starts from `codex/kpi-track99-aggregation-inputs`, which
already gathered Track 1-6 report artifacts. Track 6 implementation branch
`codex/kpi-t6-ci-integration-isolated` has been merged because it contains
the registry, controlled KPI docs, expanded integrity guard, deploy workflow
comment, and fake drift evidence not present in the report-only aggregation
branch.

Add/add conflicts in Track 6 report files were resolved by keeping the longer
aggregation report versions and adding the missing Track 6 fake-drift evidence
file.

## Final Architecture Checks

| Requirement | Current integration state |
|---|---|
| Official KPI set is not fixed by historical count | Track 1 target keeps a small active core plus staged candidates; current registry still has 33 governance KPI rows but UI/guard labels staged/manual/runtime truth. |
| No staged payout metric | Track 6 registry change sets staged reward-eligible metrics to false; guard enforces this as P0. |
| Every reward KPI has counter/blocker | Track 6 guard enforces `blocking_conditions` for `reward_eligible=true`; Admin view reports 100% counter coverage. |
| Runtime/manual/staged/retired is clear | Current governance status count is 14 runtime, 18 staged, 1 manual, 0 retired. |
| G0-G7 gate coverage | Current gate coverage is 100%; all G0-G7 gates have linked CDR and pass condition coverage. |
| JD scorecards do not assume fixed 5 | Not fully implemented. Renderer supports `active_scorecard`/candidate compatibility, but registry still uses legacy weighted `scorecard` arrays. Guard now reports broad/fixed-count risks. |
| Admin Console does not expose raw JSON as main editor | Track 5 structured console and Track 6 guard preserve no raw JSON editor pattern. |
| CI guard catches fake drift | Track 6 fake-drift evidence exists; Track 99 validation must rerun the real guard. |

## Merge Rules For Final State

1. Do not promote staged metrics to runtime unless `KpiEngine::getCalculator()`
   maps the code and source tables/columns are verified in `.ai/db-map`.
2. Do not place staged metrics in reward or payout paths.
3. Do not weaken `mom/tools/release/check_kpi_integrity.php` to make stale
   sources pass.
4. Do not hand-edit generated KPI marker regions except where Track 6 already
   merged controlled doc output that must match the registry.
5. Treat Track 4 JD active/candidate conversion as a remaining limitation
   unless implemented and validated in a later branch.

## Verification Plan

Run the Track 99 validation suite:

```bash
bash tools/ai/preflight.sh || true
php -l mom/api/services/KpiEngine.php
php -l mom/api/services/KpiRegistryAdminService.php || true
php -l mom/api/controllers/AdminController.php
node --check mom/scripts/portal/00o-admin-kpi-registry.js || true
node --check mom/scripts/portal/13-jd-scorecard-renderer.js || true
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
php tools/release/check_kpi_integrity.php || php mom/tools/release/check_kpi_integrity.php
php mom/tools/release/check_migration_drift.php || true
```

Then run `composer --working-dir=mom run check` unless blocked by existing
repo state or tool/runtime constraints.

## Final GO/NO-GO Policy

GO for report-level final integration if the guard exits 0, Track 99 report
records all remaining P1/P2 limitations, and no staged reward/runtime fake
truth is present.

NO-GO for deployment if any P0 guard failure remains, if fake-drift residue is
left in the worktree, or if validation mutates controlled docs inconsistently
with the registry.
