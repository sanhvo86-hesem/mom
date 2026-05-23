# KPI Rebuild Track 06 - Integration Current State Audit

Date: 2026-05-23
Branch: codex/kpi-t6-ci-governance-final-verify

## Scope

Prompt 6 was executed against the current checkout. The requested v3 track
report folders for Tracks 1-5 were not present:

- `_reports/kpi-rebuild/2026-05-23/track-01-strategy-prune/`
- `_reports/kpi-rebuild/2026-05-23/track-02-data-runtime/`
- `_reports/kpi-rebuild/2026-05-23/track-03-gates-daily-docs/`
- `_reports/kpi-rebuild/2026-05-23/track-04-jd-scorecards/`
- `_reports/kpi-rebuild/2026-05-23/track-05-admin-dashboard/`

Consolidation therefore used repo truth plus the existing KPI stage reports
under `_reports/kpi/` from 2026-05-21 and 2026-05-22.

## Current Facts

| Area | Current state |
|---|---|
| Registry | `mom/data/registry/kpi-authority-registry.json`, schema_version 17 |
| Governance KPIs | 33 total: 14 runtime, 18 staged, 1 manual |
| Runtime list | 28 codes in `runtime_calculated_metrics` |
| Gate controls | 21 gate metrics, G0-G7 coverage present |
| JD scorecards | 39 roles with active legacy weighted scorecards |
| CI | `.github/workflows/deploy.yml` runs `php mom/tools/release/check_kpi_integrity.php` unconditionally |
| Admin Console | Structured KPI Console exists; no raw JSON editor detected by guard |
| Guard baseline | PASS, 0 P0, 38 P1 warnings |

## Consolidated Findings

| Issue ID | Source | Severity | Files affected | Recommended order | Acceptance test |
|---|---|---:|---|---|---|
| T6-P0-001 | Track 6 guard audit | Fixed | Registry + ANNEX-122 | Before final verify | Staged metrics are not `reward_eligible=true` |
| T6-P0-002 | Track 6 guard audit | Fixed | `check_kpi_integrity.php` | Before CI | Fake runtime metric without calc fails guard |
| T6-P0-003 | Track 6 guard audit | Fixed | `check_kpi_integrity.php` | Before CI | Fake linked CDR fails guard |
| T6-P0-004 | Track 6 guard audit | Fixed | `check_kpi_integrity.php` | Before CI | Fake duplicate code fails guard |
| T6-P1-001 | Existing KPI stage reports | P1 | ANNEX-128 | After registry/doc changes | Re-run system matrix audit and review advisory absences |
| T6-P1-002 | Track 4 not merged | P1 | `jd_kpi_scorecards`, JD renderer | Track 4 before final integration | Active/candidate model exists, no fixed 5-count assumption |
| T6-P1-003 | Existing registry | P1 | Executive scorecard | Track 1/2 final architecture | Staged metrics are candidate/labeled, not active payout inputs |
| T6-P1-004 | Existing dashboard contract | P1 | `dashboard_core_kpis` | Track 5 dashboard cleanup | Primary KPI endpoints use `/api/kpi/` namespace |

## Practicality Assessment

The guard and CI path are practical and cheap: the checker is a local PHP
script that reads JSON, PHP, route, JS and HTML files without database or
network access. It can run unconditionally in deploy CI.

The remaining P1 warnings are not false "green" claims. They identify work
that belongs to Track 1/2/4/5 final integration: staged executive metrics,
legacy JD weighted scorecards, and ANNEX-128 advisory freshness.

## Files Changed By Track 06

- `.github/workflows/deploy.yml`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html`

Additional uncommitted admin/JD frontend changes were present in the working
tree during this task and were preserved rather than reverted.

## Remaining Risks

- Track 4 JD target model is not implemented in this checkout.
- ANNEX-128 advisory absences should be reviewed after the final registry/doc
  merge.
- Several percent metrics still declare `min_sample=0`; guard reports P1.
- `GROSS_MARGIN_JOB_FAMILY`, `RECORDABLE_INCIDENT_RATE`, and `FAI_FIRST_PASS`
  remain staged metrics in the executive scorecard and must stay non-payout
  until data contracts are approved.
