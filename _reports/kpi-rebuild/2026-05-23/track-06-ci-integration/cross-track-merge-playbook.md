# KPI Rebuild Track 06 - Cross-Track Merge Playbook

Date: 2026-05-23

## Recommended Merge Order

1. Track 1 architecture/prune registry target.
2. Track 2 runtime/data contracts.
3. Track 3 gate/value-stream/daily documents.
4. Track 4 JD scorecards active/candidate model.
5. Track 5 Admin Console/dashboard/API.
6. Track 6 CI guard/final verification.

## High Conflict Files

| File | Risk | Rule |
|---|---:|---|
| `mom/data/registry/kpi-authority-registry.json` | High | Registry is SSOT; do not resolve by line order only. |
| `mom/api/services/KpiEngine.php` | High | Runtime requires real getCalculator mapping. |
| `mom/api/services/KpiRegistryAdminService.php` | Medium | Keep structured overlay writer and restricted editable fields. |
| `mom/api/routes/core-routes.php` | Medium | Keep all KPI route keys. |
| `mom/scripts/portal/00o-admin-kpi-registry.js` | High | No raw JSON editor; staged/manual/runtime labels must stay clear. |
| `mom/scripts/portal/13-jd-scorecard-renderer.js` | High | Track 4 model must not regress to fixed five rows. |
| ANNEX-122/127/128 HTML | High | Regenerate marker regions from registry when supported. |
| `mom/tools/release/check_kpi_integrity.php` | High | Do not weaken P0 checks to pass stale sources. |

## Merge Gates

- KPI integrity guard exits 0.
- Fake drift tests fail for counter removal, staged reward, runtime without calculator, bad CDR, duplicate code and JD unknown code.
- No staged data-contract metric is reward eligible.
- Every reward KPI has counter_metric and blocking_conditions.
- Every G0-G7 gate has a metric, linked CDR and pass condition.
- Admin Console exposes structured widgets, not raw JSON editing.
