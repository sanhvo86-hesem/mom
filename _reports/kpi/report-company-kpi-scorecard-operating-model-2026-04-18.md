# Company KPI Scorecard Operating Model - 2026-04-18

## Decision

The company KPI system should operate as a governed performance operating system, not a raw dashboard. The official leadership layer is `CNC-EXEC-BSC-15-2026`: 15 KPIs, total weight 100%, monthly scorecard, quarterly calibration, annual Hoshin refresh.

## Scoring Model

| Status | Achievement | Meaning |
|---|---:|---|
| Stretch | 110% | Above target with clean evidence and no counter-metric breach |
| Green | 100% | Meets target with approved evidence |
| Yellow | 50% | Within tolerance but owner action is required |
| Red | 0% | Outside tolerance; containment/RCA/CAPA/resource review required |
| Blocked | 0% | Safety, data integrity, customer escape or gate bypass blocks recognition |

Company score = sum of `weight x achievement`. Green is at least 90. Yellow is 75 to 89.99. Red is below 75. Any current red scorecard KPI caps the company score at yellow for monetary-recognition purposes. Safety is gate-only and cannot be traded for points.

## KPI Weights

| KPI | Weight | Why |
|---|---:|---|
| OTD | 11% | Customer promise is the main external delivery result |
| COMPLAINT_RATE | 8% | Prevents trading delivery speed for customer defects |
| GROSS_MARGIN_JOB_FAMILY | 8% | Keeps profitable mix visible |
| THROUGHPUT_PER_CONSTRAINT_HOUR | 8% | Locks TOC economics into leadership review |
| COPQ | 7% | Converts poor quality into financial impact |
| FPY | 9% | Measures right-first-time flow |
| OEE_BOTTLENECK | 8% | Focuses on the constraint, not average machine utilization |
| WIP_AGING | 6% | Shows stuck jobs before OTD fails |
| SETUP_FIRST_PASS | 6% | Drives setup readiness |
| FAI_FIRST_PASS | 7% | Protects production release gates |
| REPEAT_NCR_RATE | 6% | Measures whether root causes recur |
| CAPA_EFFECTIVENESS | 7% | Measures whether CAPA works after verification |
| SUPPLIER_READINESS | 5% | Combines supplier delivery and usable quality |
| CRITICAL_ROLE_CERT_COVERAGE | 4% | Prevents people roles from becoming hidden bottlenecks |
| RECORDABLE_INCIDENT_RATE | 0% | Safety is a non-tradeable gate, not a weighted payout metric |

## Reward And Discipline Logic

Reward eligibility requires weighted score at least 90, no current red KPI, every yellow KPI action plan closed, no candidate data-contract metric counted for payout, and no open blocker. Recognition is calibrated by HR/QMS/CEO. KPI output is not an automatic payout.

Blocking conditions include recordable incident or serious near-miss action overdue, verified data falsification, required gate bypass, customer escape without containment, major audit nonconformance overdue, and open red counter-metric.

Discipline is not based on outcome metrics alone. It requires verified controllable behavior: falsification, bypassing a required gate, unsafe act, refusal to follow released procedure, or repeated non-compliance after coaching.

## Backend Contract

`GET /api/kpi/catalog` must expose `scorecard_operating_model` and per-metric scorecard fields:

- `scorecard_weight_pct`
- `scorecard_unit`
- `scorecard_target`
- `scorecard_higher_is_better`
- `scorecard_scoring_status`
- `scorecard_contributes_to_reward`
- `quantitative_thresholds`
- `rating_criteria`
- `reward_rule`
- `blocking_conditions`
- `data_contract`
- `consequence`

Runtime calculation endpoints remain restricted to approved runtime metrics. Staged metrics expose their data-contract status and must not return fake values.
