# KPI Official Core Proposal - Track 01

Generated: 2026-05-23

## Principle

The target is not more KPIs. Official KPIs are few; staged candidates are honest; operating metrics create action; gate metrics hold/release work; role measures are controllable; health indicators stay non-punitive; counter metrics stop gaming.

## Official KPI Core

| Code | Current status | Track 1 decision |
|---|---|---|
| `OTD` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `COMPLAINT_RATE` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `FPY` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `COPQ` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `PLAN_ADHERENCE` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `WIP_AGING` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `MATERIAL_AVAILABILITY_PLAN` | runtime_calculated | Keep active official; Track 2 verifies formula/attribution. |
| `PROMISE_DATE_RISK` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `FINAL_RELEASE_RFT` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `FAI_FIRST_PASS` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `REPEAT_NCR_RATE` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `CAPA_EFFECTIVENESS` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `OEE_BOTTLENECK` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `CONSTRAINT_LOST_HOURS` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `THROUGHPUT_PER_CONSTRAINT_HOUR` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `SUPPLIER_READINESS` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `GROSS_MARGIN_JOB_FAMILY` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `CRITICAL_ROLE_CERT_COVERAGE` | staged_data_contract | Candidate only; no payout until data/evidence approved. |
| `CUSTOMER_COMM_CLOSURE_OT` | staged_data_contract | Candidate only; no payout until data/evidence approved. |

## Blockers

| Code | Rule |
|---|---|
| `RECORDABLE_INCIDENT_RATE` | Gate/blocker only, no normal score weight. |
| `KPI_DATA_INTEGRITY` | Gate/blocker only, no normal score weight. |
| `KPI_DATA_FRESHNESS` | Gate/blocker only, no normal score weight. |
| `KPI_REGISTRY_DRIFT_COUNT` | Gate/blocker only, no normal score weight. |

## What Leaves The Core

| Code | New home | Reason |
|---|---|---|
| `MACHINE_UTIL` | health / operating | All-machine utilization encourages local optimization and excess WIP. |
| `CAPA_CLOSURE` | health | Closure rate rewards paperwork; effectiveness is the official signal. |
| `TRAINING_COMP` | health | Completion is not competence. |
| `LABOR_EFF` | guarded operating | Can trade quality/safety for apparent efficiency. |
| `DPMO` | diagnostic health | Low-volume CNC sample noise. |
| `NCR_RATE` | diagnostic operating | Low NCR count can mean suppression. |
| `SUPPLIER_OTD`, `SUPPLIER_QUAL` | component metrics | Roll into `SUPPLIER_READINESS`. |
| `DSO`, `INVOICE_RFT`, `INV_TURNS`, `MONTH_END_CLOSE_OT`, `SERVICE_TICKET_SLA` | finance/IT/SCM health | Useful controls, not core CNC manufacturing KPI. |

## Count Summary

- Active official now: 7
- Candidate official/staged: 12
- Blockers: 4
- Inventory rows: 288
- Official KPI rows in CSV: 19
- Operating metrics: 13
- Gate controls: 20
- Role performance measures: 73
- Health indicators: 12
- Counter metrics: 117

## Track Dependencies

Track 2 graduates candidates to runtime/manual/staged truth. Track 3 makes documents express the classification. Track 4 rebuilds JD scorecards around active/candidate role measures. Track 5 exposes the model in Admin/Dashboard UX. Track 6 locks it in CI.
