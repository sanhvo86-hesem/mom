# KPI Rebuild Track 06 - Integration Current State Audit

Date: 2026-05-23
Branch: codex/kpi-t6-ci-integration-isolated

## Current Facts

- The v3 Track 1-5 report folders were not present in the clean isolated worktree at start, so this Track 6 consolidation used repo truth plus existing `_reports/kpi/` stage reports from 2026-05-21/22.
- Registry: `mom/data/registry/kpi-authority-registry.json`, schema_version 17 after this change.
- Governance KPIs: 33 total, 14 runtime, 18 staged, 1 manual.
- Runtime list: 28 codes.
- Gate controls: 21 metrics; G0-G7 coverage is present and now guard-enforced.
- JD scorecards: 39 roles, still legacy weighted model.
- CI: `deploy.yml` runs `php mom/tools/release/check_kpi_integrity.php` unconditionally.

## Consolidated Findings

| Issue | Severity | Status | Evidence / action |
|---|---:|---|---|
| Staged metrics were reward eligible | P0 | Fixed | `FINAL_RELEASE_RFT` and `GROSS_MARGIN_JOB_FAMILY` changed to `reward_eligible=false`. |
| Reward KPIs lacked blockers | P0 | Fixed | `OTD` and `COMPLAINT_RATE` now carry `blocking_conditions`. |
| Runtime guard used weak source scan | P0 | Fixed | Guard now parses `KpiEngine::getCalculator()` mapping. |
| Gate coverage was only partially guarded | P0 | Fixed | Guard now fails missing gate/pass-condition/CDR and any zero G0-G7 coverage. |
| Fake-drift testability was missing | P0 | Fixed | Guard supports env path overrides for temp registry/doc/source fixtures. |
| JD scorecards still imply fixed-count legacy model | P1 | Open | Guard warns until Track 4 active/candidate model lands. |
| ANNEX-128 advisory absences | P1 | Open | Existing advisory remains; re-run matrix after final registry/doc merge. |
| Staged executive scorecard entries | P1 | Open | Must be candidate/labeled or graduated by Track 1/2 final integration. |

## Files Changed

- `.github/workflows/deploy.yml`
- `mom/tools/release/check_kpi_integrity.php`
- `mom/data/registry/kpi-authority-registry.json`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html`
- `mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html`

## Remaining Risks

- Track 4 JD target model is not complete in this slice.
- Some percent metrics still have `min_sample=0`.
- `WIP_AGING` dashboard endpoint remains outside `/api/kpi/`.
- Staged metrics still appear in the executive scorecard as non-reward items.
