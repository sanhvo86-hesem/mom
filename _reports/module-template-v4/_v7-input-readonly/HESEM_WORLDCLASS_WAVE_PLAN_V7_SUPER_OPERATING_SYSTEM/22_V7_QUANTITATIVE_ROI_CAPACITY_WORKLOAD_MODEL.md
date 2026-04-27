# 22 — Quantitative ROI, Capacity and Workload Model
## Purpose

V7 uses quantitative models to prevent hand-wavy ambition. Every wave estimates capacity, gates, risk and expected value. Numbers below are planning ranges, not factual measurement. Replace with repo/team data during V21/W0.5.

## Workload model

| Work unit | Typical outputs | Planning effort range |
| --- | --- | --- |
| Root L1 planning | scope contract + owner + risk | 0.5–2 days |
| Fixture prototype L2 | fixtures + route/screen contract | 2–5 days |
| E2E prototype L3 | HMV4 UI + tests + QA report | 3–8 days |
| Live read L4 | OpenAPI + backend read + fallback + tests | 4–12 days |
| Mutation L5 | command/workflow/audit/evidence/idempotency | 8–25 days |
| Validation L6 | URS/RTM/IQ/OQ/PQ/report | 10–40 days |
| Vertical pack L7 | templates/onboarding/support/commercial | 15–60 days |

## ROI hypothesis categories

| Value lever | Measurement |
| --- | --- |
| Quality escape reduction | NC/CAPA recurrence, defect PPM, complaint rate |
| Release cycle reduction | time from last operation to release decision |
| Schedule adherence | dispatch adherence, WIP aging, constraint utilization |
| Labor productivity | touch time, rework, training eligibility delays |
| Inventory reduction | quarantine/WIP/cycle count accuracy |
| Maintenance reliability | downtime, PM compliance, MTBF/MTTR |
| Compliance efficiency | audit preparation time, batch/DHR review time |

## Capacity guard

If a wave requires more root promotions than team capacity can evidence, split the wave. Do not lower evidence threshold to match calendar pressure.
