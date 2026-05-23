# KPI Rebuild Final Summary

Date: 2026-05-23
Scope: Track 06 CI governance / integration / final verification

## Executive Summary

Track 06 hardened the KPI integrity guard and corrected one source-truth
policy violation: staged KPI rows must not be reward eligible. The guard now
checks KpiEngine calculator mapping, staged reward drift, reward blockers,
gate G0-G7 coverage, route/API surface and Admin Console raw JSON patterns.

The v3 Track 1-5 report folders were absent in this checkout, so this is not
declared as a full six-track rebuild completion. It is a CI/integration guard
slice with explicit remaining P1 items for Track 1/2/4/5.

## Before / After

| Measure | Before | After |
|---|---:|---:|
| Governance KPIs | 33 | 33 |
| Runtime governance KPIs | 14 | 14 |
| Staged governance KPIs | 18 | 18 |
| Manual governance KPIs | 1 | 1 |
| Runtime calculated metric list | 28 | 28 |
| Gate metrics | 21 | 21 |
| G0-G7 gate coverage | Present | Guard-enforced |
| Staged reward-eligible metrics | 2 | 0 |
| Reward KPIs with blocking_conditions | 0 | 2 |
| JD roles with active scorecards | 39 | 39 legacy weighted model |

## Official KPI / Executive Scorecard Notes

The current executive scorecard still contains staged metrics:

- `GROSS_MARGIN_JOB_FAMILY`
- `RECORDABLE_INCIDENT_RATE`
- `FAI_FIRST_PASS`

They remain P1 until Track 1/2 resolves whether to graduate, demote or label
them candidate-only. They are not reward eligible after this Track 06 change.

## Gate G0-G7 Coverage

Current guard baseline reports:

```text
G0=2 · G1=3 · G2=2 · G3=2 · G4=2 · G5=2 · G6=2 · G7=3
```

The guard now fails P0 if any G0-G7 gate has zero metrics, if a gate metric
lacks a CDR/pass condition, or if linked CDR is absent from the authority
matrix.

## JD Scorecard Status

Current registry still uses legacy weighted `scorecard` arrays, not Track 4's
target `active_candidate_role_scorecard` model. The guard reports this as P1
and warns on exact five-row active sets or active sets above six rows.

## CI Guard

`deploy.yml` already ran KPI guard unconditionally. The workflow comment was
updated to reflect the expanded guard coverage. No second/divergent guard was
created.

## Known Limitations

- Track 4 target JD model is not implemented here.
- ANNEX-128 still has advisory absences for some governance KPI codes.
- Several percent metrics still have `min_sample=0`.
- Dashboard `WIP_AGING` still references a non-`/api/kpi/` endpoint.
- Local validation/fake drift results are recorded separately in Track 06
  once the commands complete.

## 30 / 60 / 90 Day Rollout Guidance

30 days: use KPI outputs for baseline, action learning and data quality; do
not use staged or insufficient-data metrics for individual reward/discipline.

60 days: graduate priority staged data contracts only where source tables,
columns, evidence and ownership are verified. Demote any metric that does not
drive a real decision.

90 days: complete Track 4 active/candidate JD model and perform a quarterly
Hoshin/TOC review of official KPI count, gate coverage and gaming signals.

## Self-Critique

The guard materially reduces KPI paper drift, but it cannot replace process
ownership. False positives are kept as P1 where current source truth is known
legacy debt. The system still needs Track 4 to remove the fixed JD-scorecard
assumption and Track 1/2 to resolve staged executive metrics.
