# KPI Rebuild Track 06 - KPI Integrity Guard Spec

Date: 2026-05-23
Guard: `mom/tools/release/check_kpi_integrity.php`

## Purpose

Prevent KPI paper, registry drift, staged-as-runtime, staged-as-reward,
reward without counter/blocker, gate/CDR gaps, fixed JD count assumptions and
raw JSON admin editing from returning after the KPI rebuild.

## Inputs

| Input | Default path | Env override |
|---|---|---|
| Registry | `mom/data/registry/kpi-authority-registry.json` | `KPI_INTEGRITY_REGISTRY` |
| ANNEX-122 | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html` | `KPI_INTEGRITY_ANNEX122` |
| CDR matrix | `mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html` | `KPI_INTEGRITY_CDR_MATRIX` |
| ANNEX-128 | `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html` | `KPI_INTEGRITY_ANNEX128` |
| KpiEngine | `mom/api/services/KpiEngine.php` | `KPI_INTEGRITY_ENGINE` |
| Routes | `mom/api/routes/core-routes.php` | `KPI_INTEGRITY_ROUTES` |
| Admin Console JS | `mom/scripts/portal/00o-admin-kpi-registry.js` | `KPI_INTEGRITY_ADMIN_JS` |

Env overrides exist so fake drift tests can mutate temp copies without
touching repo files.

## P0 Checks

- ANNEX-122 `data-kpi-code` set equals registry governance KPI set.
- Governance KPI has formula, thresholds, owner, data_source,
  calculation_status and decision_action.
- `runtime_calculated` code is in `runtime_calculated_metrics` and wired in
  `KpiEngine::getCalculator()`.
- `KpiEngine::getCalculator()` does not expose a runtime metric absent from
  the registry runtime list.
- Duplicate governance `canonical_code` is blocked.
- Legacy alias target must be a known metric.
- Gate metric must have valid `gate`, `linked_cdr`, `gate_pass_condition`;
  linked CDR must exist in the RACI matrix.
- Every G0-G7 gate must have at least one gate metric.
- Counter metric must be a dedicated object with `code`, `endpoint`,
  `name_vi` and `intent`.
- `reward_eligible=true` requires `blocking_conditions`.
- `staged_data_contract` must not be `reward_eligible=true`.
- KPI action routes must exist.
- Admin Console editable fields must not include structural fields such as
  `formula`, `data_source`, `calculation_status`, `metric_type` or
  `canonical_code`.
- Admin Console JS must not expose JSON parse/stringify/raw JSON editor
  patterns in the normal path.
- JD scorecard item codes must be known metrics and weighted scorecard rows
  must still sum to 100 while the legacy model remains in place.

## P1 Warnings

- Percent metric has `min_sample=0`.
- Lag metric lacks paired lead metric.
- ANNEX-128 does not enumerate a governance code.
- Staged metric sits in executive scorecard while non-reward.
- Dashboard primary endpoint is outside `/api/kpi/`.
- JD scorecard registry still uses legacy weighted scorecard model.
- A role scorecard has exactly 5 active rows or more than 6 rows, indicating
  possible fixed-count carryover.

## Output Contract

The guard prints:

- registry version and schema version
- governance counts by calculation status
- all metric counts by calculation status
- official active scorecard item count
- gate coverage G0-G7
- JD roles with active scorecards
- P1 warnings
- P0 failures

Exit code is `1` when P0 findings exist, otherwise `0`.
