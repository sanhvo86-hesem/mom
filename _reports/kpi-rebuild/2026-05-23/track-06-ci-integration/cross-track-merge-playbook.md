# KPI Rebuild Track 06 - Cross-Track Merge Playbook

Date: 2026-05-23

## Merge Sequence

1. Track 1 - Strategy/prune/official KPI architecture.
2. Track 2 - Runtime/data-contract truth.
3. Track 3 - Gate, CDR, daily management documents.
4. Track 4 - JD scorecards and role performance measures.
5. Track 5 - Admin Console, dashboard UX, API catalog.
6. Track 6 - CI guard, fake drift tests, final verification.

## High Conflict Files

| File | Conflict risk | Integration rule |
|---|---:|---|
| `mom/data/registry/kpi-authority-registry.json` | High | Registry is SSOT; merge classification, runtime status, reward, JD and gate fields from source truth, not by line order. |
| `mom/api/services/KpiEngine.php` | High | Runtime status requires real getCalculator wiring and no fake zero calculators. |
| `mom/api/services/KpiRegistryAdminService.php` | Medium | Preserve structured editable-field allowlist; formula/data_source/calculation_status stay structural. |
| `mom/api/controllers/AdminController.php` | Medium | Preserve RBAC, CSRF and audit_events for admin save. |
| `mom/api/routes/core-routes.php` | Medium | Preserve all KPI action routes and REST input routes. |
| `mom/scripts/portal/00o-admin-kpi-registry.js` | High | Preserve structured widgets, filters and no raw JSON editor. |
| `mom/scripts/portal/13-jd-scorecard-renderer.js` | High | Track 4 active/candidate model must not regress to fixed five rows. |
| `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/*.html` | High | Regenerate marker regions from registry when supported; do not hand-edit generated tables. |
| `mom/tools/release/check_kpi_integrity.php` | High | Final guard wins; do not weaken P0 checks to pass stale sources. |
| `.github/workflows/deploy.yml` | Low | Keep KPI guard unconditional. |

## Merge Gates

| Gate | Requirement |
|---|---|
| G1 | `php mom/tools/release/check_kpi_integrity.php` exits 0. |
| G2 | Fake drift tests fail for reward/counter, staged reward, runtime without calculator, bad CDR, duplicate code and JD unknown code. |
| G3 | No staged metric is reward eligible. |
| G4 | Every reward KPI has counter_metric and blocking_conditions. |
| G5 | G0-G7 have gate metrics with linked CDR and pass condition. |
| G6 | Admin Console has no raw JSON editing pattern and route keys exist. |
| G7 | Track 4 converts JD scorecards to active/candidate model or leaves explicit P1 blocker. |

## Conflict Resolution Rules

- Do not keep a KPI active just because it existed historically.
- Do not graduate runtime status unless KpiEngine getCalculator maps it.
- Do not place staged data-contract metrics in payout/reward paths.
- Do not use ANNEX-122 as the source of truth for generated KPI rows.
- Do not reduce guard failures to warnings unless the report documents a real
  false positive and an owner path.
