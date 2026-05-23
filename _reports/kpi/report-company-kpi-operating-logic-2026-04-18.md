# Company KPI Operating Logic Review - 2026-04-18

## Scope

This report consolidates the 10-agent review of the CNC company-wide KPI operating system. The review covered strategy/BSC/Hoshin, CNC MES/Lean Daily, EQMS quality, HR/training/reward/discipline, KpiEngine/API, QMS documents, official world benchmark, finance/customer, supplier/procurement/inventory, and safety/maintenance/traceability.

No KPI or metric should exist as a passive number. Every metric must have intent, behavior motive, expected result, owner, evidence, review cadence, consequence, and anti-gaming guardrail. If it is not approved for evaluation, it must not be called KPI.

## Operating Model Conclusion

The best fit for CNC job-shop manufacturing is not OKR as the core system. The core should remain:

1. Hoshin annual strategy deployment.
2. BSC monthly/quarterly scorecard.
3. TOC weekly bottleneck control.
4. Lean Daily Management by shift/day.
5. QMS/MES gate evidence by event.

OKR is useful only for 60-90 day improvement projects. It should not replace BSC, Hoshin, QMS, MES, or the KPI authority registry.

## Optimized Executive Scorecard

The leadership scorecard should stay at 15 KPIs:

| KPI | Intent | Behavior Motive | Expected Result |
|---|---|---|---|
| OTD | Protect customer promise reliability | Escalate blockers and stabilize dispatch | Higher on-time delivery without quality escape |
| COMPLAINT_RATE | Expose customer escapes | Do not trade speed for customer defects | Fewer complaints and faster containment |
| GROSS_MARGIN_JOB_FAMILY | See profitable job families | Avoid revenue that consumes constraint capacity with poor margin | Better margin and quote/mix decisions |
| THROUGHPUT_PER_CONSTRAINT_HOUR | Maximize value through the bottleneck | Protect constraint time | More value per constraint hour |
| COPQ | Make poor quality visible in money | Reduce scrap, rework, concession, expedite, escape cost | Lower poor-quality cost |
| FPY | Improve right-first-time flow | Prevent defects at source | Higher yield and lower rework |
| OEE_BOTTLENECK | See true constraint capacity | Prioritize setup, gage, CMM, maintenance at bottleneck | More usable bottleneck capacity |
| WIP_AGING | Expose stuck jobs | Resolve blockers instead of releasing more WIP | Lower aged WIP and delivery risk |
| SETUP_FIRST_PASS | Prove setup readiness | Prepare program, tool, fixture, offset, gage before run | Fewer setup loops and setup scrap |
| FAI_FIRST_PASS | Prove first-piece release | Align drawing, program, setup and inspection before quantity run | Fewer FAI loops and escapes |
| REPEAT_NCR_RATE | Expose recurring failures | Close root cause, not NCR paperwork | Fewer repeat nonconformances |
| CAPA_EFFECTIVENESS | Prove CAPA works | Close CAPA by effectiveness evidence | Lower recurrence after CAPA |
| SUPPLIER_READINESS | Combine supplier delivery and usable quality | Manage suppliers by plan readiness, not one component metric | Fewer shortages and outsource quality disruptions |
| CRITICAL_ROLE_CERT_COVERAGE | Prevent people-role bottlenecks | Certify backup for setup, CMM, QC, planner, maintenance | Stable capacity when key people are absent |
| RECORDABLE_INCIDENT_RATE | Keep safety as a non-negotiable gate | Stop output tradeoffs that create unsafe work | Fewer incidents and stronger hazard learning |

`IN_PROCESS_REJECT_RATE` remains important but should sit under Lean Daily / FPY drilldown, not CEO scorecard. `SUPPLIER_OTD` and `SUPPLIER_QUAL` remain component metrics under `SUPPLIER_READINESS`.

## Classification Rule

| Label | Use | Consequence |
|---|---|---|
| KPI | Formal scorecard or performance review | BSC/Hoshin review, recognition, corrective action, calibrated consequence |
| Operating Metric | Shift/day/week operating control | Action log, escalation, coaching; no direct reward/discipline |
| Gate Control Metric | Hold/release or QMS/MES evidence gate | Hold/release, NCR/CAPA, retraining; discipline only for bypass/falsification/repeated non-compliance |
| Role Performance Measure | JD/OJT/competency review | Training, certification, role level, skill bonus guardrails |
| Health Indicator | Trend awareness | Review only; no rating, no reward, no discipline |

## Consequence Model

1. Green sustainable: recognize team and standardize the method.
2. Yellow: open owner action with due date and evidence.
3. Red one period: containment, root cause, resource escalation.
4. Red repeated: management review, CAPA/kaizen, process/resource redesign.
5. Verified controllable violation: discipline may apply only for data falsification, bypassing a required gate, unsafe act, refusal to follow released procedure, or repeated non-compliance after coaching.

Outcome KPIs like OTD, FPY, OEE, COPQ, WIP aging, and throughput must not be used alone to discipline individuals because they are shared system outcomes affected by material, machine, fixture, gage, CMM, engineering, customer changes, and management resource decisions.

## Backend/API Decision

`GET /api/kpi/catalog` must expose per-metric operating contract fields:

- `metric_type`
- `usage_types`
- `is_official_kpi`
- `result_type`
- `strategic_intent`
- `motive`
- `expected_result`
- `decision_purpose`
- `evaluation_use`
- `evaluation_scope`
- `accountable_owner`
- `review_cadence`
- `review_forum`
- `rating_method`
- `counter_metric`
- `consequence`
- `data_contract`
- `anti_gaming_guardrail`
- `controllability_scope`

`GET /api/kpi/{metricCode}` and `/trend` must still calculate only runtime-approved metrics. Known non-runtime metrics must return registry/data-contract status, not fake values.

## Remaining High-Value Backend Gaps

Priority calculators/read models:

1. `OEE_BOTTLENECK`
2. `WIP_AGING`
3. `SETUP_FIRST_PASS`
4. `FAI_FIRST_PASS`
5. `REPEAT_NCR_RATE`
6. `CAPA_EFFECTIVENESS`
7. `SUPPLIER_READINESS`
8. `THROUGHPUT_PER_CONSTRAINT_HOUR`
9. `GROSS_MARGIN_JOB_FAMILY`
10. `RECORDABLE_INCIDENT_RATE`

Quality KPI should migrate from legacy quality tables toward EQMS v4 sources or explicitly mark legacy runtime status. CAPA closure must not be used without CAPA effectiveness and repeat NCR guardrails.

## Official Benchmark Anchors

- NIST Baldrige: integrated leadership, strategy, measurement, workforce, operations, and results.
- ISA-95: preserve enterprise-control/MOM boundaries and span of control.
- SAP Digital Manufacturing / ME OEE: OEE must decompose availability, performance, and quality using execution/order-operation data.
- SAP SuccessFactors Calibration / Variable Pay: rating, calibration, and payout are governed workflows; do not turn raw metrics into automatic people consequences.
- Microsoft Viva Goals: OKR check-ins need owner, cadence, and data source; OKR is useful for improvement cadence, not as the main CNC KPI backbone.

## Implemented Direction

This review supports the implemented direction:

- Keep BSC/Hoshin as the main company operating layer.
- Keep QMS/MES as execution/evidence truth.
- Keep KpiEngine as governed calculation/catalog surface.
- Add metric operating contract metadata to the catalog.
- Rename or downgrade non-evaluation measures in documents to operating metric, gate metric, role measure, or health indicator.
