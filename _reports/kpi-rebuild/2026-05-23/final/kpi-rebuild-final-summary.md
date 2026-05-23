# KPI Rebuild Final Summary

Date: 2026-05-23
Scope: Track 06 CI governance / integration / final verification

## Summary

Track 06 hardened the KPI CI guard and corrected staged reward drift. This is not a claim that Tracks 1-5 are fully merged in this clean worktree; it is the integration/CI guard slice required to keep the rebuild durable.

Fake drift tests passed for counter removal, staged reward, runtime without
calculator, bad linked CDR, duplicate code, percent min_sample warning policy
and JD unknown KPI code.

## Before / After

| Measure | Before | After |
|---|---:|---:|
| Governance KPIs | 33 | 33 |
| Runtime governance KPIs | 14 | 14 |
| Staged governance KPIs | 18 | 18 |
| Manual governance KPIs | 1 | 1 |
| Runtime metric list | 28 | 28 |
| Gate metrics | 21 | 21 |
| Staged reward-eligible metrics | 2 | 0 |
| Reward KPIs with blocking_conditions | 0 | 2 |
| JD active scorecard roles | 39 legacy | 39 legacy, guard-warned |

## Remaining Limitations

- Track 4 active/candidate JD model remains open.
- Staged executive scorecard metrics remain as non-reward P1 items.
- ANNEX-128 advisory absences remain.
- Some percent metrics still declare `min_sample=0`.
- Dashboard `WIP_AGING` endpoint remains outside `/api/kpi/`.

## 30 / 60 / 90 Day Rollout

30 days: use KPIs for baseline/action and data-quality learning, not individual punishment.

60 days: graduate only metrics with verified data contracts; demote unused metrics.

90 days: complete JD active/candidate model and review official KPI count through Hoshin/TOC governance.
