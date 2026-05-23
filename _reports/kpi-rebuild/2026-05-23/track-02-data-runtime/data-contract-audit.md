# Track 02 Data Contract Audit - KPI Calculation Truth

Date: 2026-05-23
Branch: codex/kpi-t2-data-runtime
Mode: Phase 1 audit/spec. No runtime or registry mutation in this track output.

## Scope And Evidence Read

Track 1 target reports were not present at `_reports/kpi-rebuild/2026-05-23/track-01-strategy-prune/`, so this audit uses the current registry, KpiEngine, DashboardController, core routes, db-map index, migrations, and prior KPI reports as the current-state baseline.

Files inspected:

- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiEngine.php`
- `mom/api/controllers/DashboardController.php`
- `mom/api/routes/core-routes.php`
- `.ai/db-map/index.json` and domain db-map files for touched tables
- `mom/database/migrations/*.sql` for column evidence where db-map has table metadata but not columns
- `_reports/kpi/kpi-stage-04-data-contracts-and-compute-2026-05-21.md`
- `_reports/kpi/kpi-upgrade-summary-2026-05-22.md`

## Current State Facts

- Registry schema_version: 16.
- `runtime_calculated_metrics`: 28.
- `KpiEngine::ALL_METRICS`: 28.
- Runtime registry and KpiEngine constants currently match exactly: yes for codes, no for source tables on three metrics.
- Unique metric codes seen across registry surfaces, scorecards, dashboard, gates, proposed metrics, and JD scorecards: 132.
- ANNEX-122 governance KPI statuses: runtime_calculated: 14, staged_data_contract: 18, manual: 1.
- Dashboard core KPI statuses: runtime_calculated: 2, staged_data_contract: 8, widget_only: 1, runtime_calculated_partial: 1.
- Gate metric statuses: staged_data_contract: 15, manual: 2, runtime_calculated: 4.
- Proposed operating metric statuses: staged_data_contract: 14, retained_from_annex122: 1, manual: 56.
- Executive scorecard evidence statuses: active_runtime: 2, manual_governed: 2, candidate_data_contract: 10, gate_only: 1.

## P0 Findings

### K02-P0-01 Runtime metrics depend on a source table absent from db-map

`OEE`, `MACHINE_UTIL`, and `SETUP_RATIO` are listed as runtime and have calculator mappings, but their calculators query `equipment_logs`. That table is not present in `.ai/db-map/index.json`. This repeats the older Stage 04 finding that OEE is not calculation-truth until its source is repaired.

Required repair path: either move these calculators to verified MES/analytics sources such as `mes_oee_snapshots`, `mes_machine_state_events`, `mes_downtime_events`, or a governed equipment log table, or demote these metrics to `staged_data_contract` until the physical source exists. Do not keep reward or dashboard scoring on this source as-is.

### K02-P0-02 Staged scorecard candidates remain non-calculable

The high-pressure candidates in Prompt 02 remain staged unless noted below. None should be promoted to runtime or payout scoring without a verified calculator, source table, columns, minimum sample behavior, and breakdown.

| Code | Status | Engine | Source tables | Missing tables | Recommendation |
| --- | --- | --- | --- | --- | --- |
| FAI_FIRST_PASS | staged_data_contract | no | inspection_results | - | staged_data_contract_until_columns_and_calc_verified |
| FINAL_RELEASE_RFT | staged_data_contract | no | inspection_results, trusted_release_records | trusted_release_records | staged_data_contract_until_columns_and_calc_verified |
| SETUP_FIRST_PASS | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| REPEAT_NCR_RATE | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| CAPA_EFFECTIVENESS | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| OEE_BOTTLENECK | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| CONSTRAINT_LOST_HOURS | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| THROUGHPUT_PER_CONSTRAINT_HOUR | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| ENGINEERING_RELEASE_ON_TIME | staged_data_contract | no | engineering_releases | engineering_releases | staged_data_contract_until_columns_and_calc_verified |
| PROMISE_DATE_RISK | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| SUPPLIER_READINESS | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| GROSS_MARGIN_JOB_FAMILY | staged_data_contract | no | job_orders, invoices | invoices | staged_data_contract_until_columns_and_calc_verified |
| CRITICAL_ROLE_CERT_COVERAGE | staged_data_contract | no | - | - | staged_data_contract_until_columns_and_calc_verified |
| CUSTOMER_COMM_CLOSURE_OT | staged_data_contract | no | customer_communication_log | customer_communication_log | staged_data_contract_until_columns_and_calc_verified |
| TOOL_FIXTURE_READY_TO_PLAN | missing_from_registry | no | - | - | Prompt 02 P0 candidate is absent from current registry. |

### K02-P0-03 Registry declares several source tables that are absent from db-map

These are not automatically wrong if an integration is planned, but they are not runtime-ready source contracts.

| Code | Status | Declared tables | Missing in db-map |
| --- | --- | --- | --- |
| FINAL_RELEASE_RFT | staged_data_contract | inspection_results, trusted_release_records | trusted_release_records |
| GROSS_MARGIN_JOB_FAMILY | staged_data_contract | job_orders, invoices | invoices |
| RECORDABLE_INCIDENT_RATE | staged_data_contract | incident_logs | incident_logs |
| BCP_READINESS | manual | role_backup_certifications | role_backup_certifications |
| RFQ_TURNAROUND_TIME | staged_data_contract | rfq_records | rfq_records |
| SHIP_READY_TO_INVOICE_LT | staged_data_contract | shipments, invoices | invoices |
| FOD_LINE_CLEARANCE_COMPLIANCE | staged_data_contract | quality_audits | quality_audits |
| ENGINEERING_RELEASE_ON_TIME | staged_data_contract | engineering_releases | engineering_releases |
| QUOTE_HIT_RATE | staged_data_contract | rfq_records | rfq_records |
| CUSTOMER_COMM_CLOSURE_OT | staged_data_contract | customer_communication_log | customer_communication_log |
| MONTH_END_CLOSE_OT | staged_data_contract | finance_close_log | finance_close_log |
| CRITICAL_ROLE_BACKUP_COVERAGE | staged_data_contract | role_backup_certifications | role_backup_certifications |
| SERVICE_TICKET_SLA | staged_data_contract | service_tickets | service_tickets |
| CRITICAL_SYSTEM_AVAILABILITY | staged_data_contract | system_uptime_logs | system_uptime_logs |
| MASTER_DATA_EXCEPTION_AGING | staged_data_contract | data_exceptions | data_exceptions |

## Runtime Coverage Table

| Code | Calculator | Tables | DB-map gap | Decision |
| --- | --- | --- | --- | --- |
| OEE | calcOee | equipment_logs, job_orders, items | equipment_logs | P0 source drift |
| OTD | calcOtd | shipments | - | source table verified |
| DPMO | calcDpmo | inspection_results | - | source table verified |
| COPQ | calcCopq | ncr_records, records | - | source table verified |
| FPY | calcFpy | inspection_results | - | source table verified |
| SCRAP_RATE | calcScrapRate | job_orders | - | source table verified |
| REWORK_RATE | calcReworkRate | job_orders | - | source table verified |
| MACHINE_UTIL | calcMachineUtil | equipment_logs | equipment_logs | P0 source drift |
| SETUP_RATIO | calcSetupRatio | equipment_logs | equipment_logs | P0 source drift |
| NCR_RATE | calcNcrRate | ncr_records, records, job_orders | - | source table verified |
| CAPA_CLOSURE | calcCapaClosure | capa_records | - | source table verified |
| CAL_COMPLIANCE | calcCalCompliance | equipment, calibration_records | - | source table verified |
| TRAINING_COMP | calcTrainingCompletion | training_records | - | source table verified |
| SUPPLIER_OTD | calcSupplierOtd | vendor_ratings | - | source table verified |
| SUPPLIER_QUAL | calcSupplierQuality | vendor_ratings | - | source table verified |
| COMPLAINT_RATE | calcComplaintRate | ncr_records, records, shipments | - | source table verified |
| INV_TURNS | calcInventoryTurns | kpi_snapshots, kpi_definitions | - | source table verified |
| LABOR_EFF | calcLaborEfficiency | job_orders, items | - | source table verified |
| PUT_THRU | calcPutThru | job_orders | - | source table verified |
| PLAN_ADHERENCE | calcPlanAdherence | job_orders | - | source table verified |
| WIP_AGING | calcWipAging | job_orders | - | source table verified |
| NCR_CLOSURE_AGING | calcNcrClosureAging | ncr_records | - | source table verified |
| ECO_CLOSURE_AGING | calcEcoClosureAging | engineering_change_requests | - | source table verified |
| MATERIAL_AVAILABILITY_PLAN | calcMaterialAvailabilityPlan | job_orders | - | source table verified |
| INVENTORY_ACCURACY | calcInventoryAccuracy | wms_cycle_count_results | - | source table verified |
| DSO | calcDso | ap_ar_invoices | - | source table verified |
| INVOICE_RFT | calcInvoiceRft | ap_ar_invoices | - | source table verified |
| INCIDENT_ACTION_CLOSURE_AGING | calcIncidentActionClosureAging | ehs_incidents | - | source table verified |

## Runtime Behavior Review

`calculateKpi()` dispatches only codes in `ALL_METRICS` to calculators. Non-runtime metrics fall back to `calculateFromManualInput()`, reading `kpi_manual_inputs` and returning grey when no input exists. Runtime metrics with `sample_size` below registry `formula.min_sample` are also forced grey with an insufficient-data reason. This is the correct anti-fake-runtime behavior.

Gaps that remain:

- Not every calculator returns `sample_size`; raw count/cost metrics may be acceptable, but percentage/ratio calculators should carry explicit numerator, denominator, and sample size.
- Calculator breakdowns are still thin for root cause action: most return totals, not customer, part family, machine, gate, owner, or reason-code breakdowns.
- `calculateFromManualInput()` is a common fallback for both manual and staged metrics. That is safe for grey display, but registry must distinguish true `manual_governed` from `staged_data_contract` so staged metrics do not become scored by manual entry.

## Graduation Decisions

No new runtime graduation is performed in this Phase 1 output. The only candidates close enough for later implementation are:

- `CAPA_EFFECTIVENESS`: `capa_effectiveness_checks` exists in migrations with check result, recurrence check, sample size, due date, evidence reference, and method. Registry currently points to broader CAPA sources but lacks a dedicated calculator. This is a strong next graduate after formula alignment.
- `FAI_FIRST_PASS`: `fai_records` and `fai_characteristics` exist; however the current ANNEX-122 contract points to `inspection_results.inspection_type/attempt_number/result`, and those exact fields are not present as columns. Do not graduate until first-attempt semantics are canonical.
- `TOOL_FIXTURE_READY_TO_PLAN`: Prompt 02 names it, but the current registry has no canonical metric code. Adjacent MES evidence exists in `mes_dispatch_queue` (tooling_available, fixture_available, all_constraints_met) and `mes_fixture_assignments`, so Track 3/5 should decide whether to add this metric.

## Required Implementation Order

1. Fix or demote the `equipment_logs` runtime source drift before trusting OEE/MACHINE_UTIL/SETUP_RATIO.
2. Add a calculator for `CAPA_EFFECTIVENESS` only after aligning registry source to `capa_effectiveness_checks` and CAPA recurrence semantics.
3. Align FAI source contract to real FAI tables or add a migration for first-attempt semantics.
4. Keep TOC metrics staged until active constraint source, reason-code lost-time source, and throughput definition are governed.
5. Keep all staged executive/JD metrics out of payout scoring until runtime/manual evidence is approved.

## Self-Critique

- Practical: the registry and engine code-count consistency improved, but code-count consistency is not data truth. `equipment_logs` proves why source verification must inspect db-map and migrations.
- Non-practical: direct graduation of FAI, final release, TOC throughput, supplier readiness, and critical role coverage would be fake because their exact source semantics are missing or divergent.
- Gaming risk: OEE and utilization can drive local optimization and WIP unless restricted to bottleneck/constraint logic with counter metrics. CAPA closure is not a substitute for CAPA effectiveness.
- Data-entry risk: common manual input endpoints are useful, but staged metrics must not be manually entered into an official scorecard without an approver/evidence workflow.

## Files Changed By This Track

Report/spec files only under `_reports/kpi-rebuild/2026-05-23/track-02-data-runtime/`. No runtime PHP, JavaScript, registry JSON, migration, or controlled HTML was changed.
