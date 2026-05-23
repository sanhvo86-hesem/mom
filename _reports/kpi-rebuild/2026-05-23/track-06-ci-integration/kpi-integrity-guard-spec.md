# KPI Rebuild Track 06 - KPI Integrity Guard Spec

Date: 2026-05-23
Guard: `mom/tools/release/check_kpi_integrity.php`

## Inputs

| Input | Default | Env override |
|---|---|---|
| Registry | `mom/data/registry/kpi-authority-registry.json` | `KPI_INTEGRITY_REGISTRY` |
| ANNEX-122 | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html` | `KPI_INTEGRITY_ANNEX122` |
| CDR matrix | `mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html` | `KPI_INTEGRITY_CDR_MATRIX` |
| ANNEX-128 | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html` | `KPI_INTEGRITY_ANNEX128` |
| KpiEngine | `mom/api/services/KpiEngine.php` | `KPI_INTEGRITY_ENGINE` |
| Routes | `mom/api/routes/core-routes.php` | `KPI_INTEGRITY_ROUTES` |
| Admin JS | `mom/scripts/portal/00o-admin-kpi-registry.js` | `KPI_INTEGRITY_ADMIN_JS` |

## P0 Checks

- ANNEX-122 governance code parity with registry.
- Required governance fields: formula, thresholds, owner, data source, status and decision action.
- Runtime status must be listed in `runtime_calculated_metrics` and wired in `KpiEngine::getCalculator()`.
- KpiEngine calculator support must be represented in the runtime list.
- Duplicate governance `canonical_code`.
- Legacy alias target unknown.
- Gate metric missing valid gate, linked CDR or pass condition.
- Any G0-G7 gate has zero gate metrics.
- Counter metric missing dedicated code/endpoint/name/intent.
- Reward KPI missing `blocking_conditions`.
- Staged metric marked `reward_eligible=true`.
- KPI routes missing.
- Admin Console structural fields are editable or raw JSON pattern appears.
- JD scorecard item references unknown metric or legacy weighted rows fail weight validation.

## P1 Warnings

- Percent metric has `min_sample=0`.
- Lag KPI lacks paired lead metric.
- ANNEX-128 advisory absence.
- Non-reward staged metric sits in executive scorecard.
- Dashboard endpoint outside `/api/kpi/`.
- Legacy JD weighted model or exact five-row active sets remain.

## Output

The guard prints registry/schema, counts by status, official scorecard count, gate coverage, JD active roles, P1 warnings and P0 failures. Exit code is 1 only when P0 exists.
