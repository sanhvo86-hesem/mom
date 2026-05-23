# KPI Lean Architecture Audit - Track 01 Strategy / Prune

Generated: 2026-05-23
Branch: `codex/kpi-t1-strategy-prune`
Mode: Phase 1 read-only audit/spec. Production code, registry JSON, and controlled HTML documents were not changed.

## Scope

Prompt 1 is an audit/spec track. I read the full v3 prompt zip, mandatory repo workflow/governance files, current KPI registry, KpiEngine, KPI admin service/controller/routes, KPI portal renderers, KPI ANNEX/WI docs, role registry, and prior KPI reports/prompt packs.

The v3 zip has 10 physical files while its manifest says `file_count: 9`; the extra physical file is `manifest.json`.

## Current State Facts

| Area | Current fact |
|---|---:|
| Registry schema_version | 16 |
| Runtime-calculated metrics | 28 |
| ANNEX-122 governance KPI rows | 33 |
| Executive scorecard items | 15 |
| Dashboard core KPI rows | 12 |
| Gate control metrics | 21 |
| Proposed operating/role metrics | 71 |
| JD scorecard roles in registry | 39 |
| Role registry roles | 39 |
| Unified metric/counter/alias inventory rows | 288 |

The current system already has a strong registry/engine/guard base. The remaining Track 1 problem is classification: official KPI, operating metric, gate control, role measure, health indicator, and counter metric are still mixed in executive/JD/dashboard contexts.

## Target Classification Counts

| Recommended class | Count |
|---|---:|
| counter_metric | 117 |
| gate_control_metric | 20 |
| health_indicator | 12 |
| official_kpi | 19 |
| operating_metric | 13 |
| retired | 34 |
| role_performance_measure | 73 |

Calculation status seen in inventory:

| Status | Count |
|---|---:|
| manual | 59 |
| manual_governed | 117 |
| runtime_calculated | 28 |
| staged_data_contract | 84 |

## Architecture Decision Summary

1. Official KPI stays small and tied to OTD, customer quality, Lean flow/constraint, material readiness, COPQ/margin, and critical capability.
2. Staged official candidates are allowed only as candidates. They must not score payout until Track 2/3 proves data and evidence.
3. Operating metrics drive tier meetings, TOC weekly, and functional control; they are not broad reward KPIs.
4. Gate metrics hold/release G0-G7 with CDR/evidence.
5. Role measures are for JD/OJT/coaching, selected by controllability and evidence burden, not fixed count.
6. Counter metrics cap/block/review and prevent gaming.

## Proposed Official Core

Active or runtime-available official KPI core:

- `OTD`
- `COMPLAINT_RATE`
- `FPY`
- `COPQ`
- `PLAN_ADHERENCE`
- `WIP_AGING`
- `MATERIAL_AVAILABILITY_PLAN`

Staged/candidate official KPI core - do not score or payout until approved:

- `PROMISE_DATE_RISK`
- `FINAL_RELEASE_RFT`
- `FAI_FIRST_PASS`
- `REPEAT_NCR_RATE`
- `CAPA_EFFECTIVENESS`
- `OEE_BOTTLENECK`
- `CONSTRAINT_LOST_HOURS`
- `THROUGHPUT_PER_CONSTRAINT_HOUR`
- `SUPPLIER_READINESS`
- `GROSS_MARGIN_JOB_FAMILY`
- `CRITICAL_ROLE_CERT_COVERAGE`
- `CUSTOMER_COMM_CLOSURE_OT`

Blockers with no normal score weight:

- `RECORDABLE_INCIDENT_RATE`
- `KPI_DATA_INTEGRITY`
- `KPI_DATA_FRESHNESS`
- `KPI_REGISTRY_DRIFT_COUNT`

## Explicit Demote / Merge / Retire Decisions

| Code | Decision | Reason |
|---|---|---|
| `BCP_READINESS` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `CAPA_CLOSURE` | demote_to_health_indicator | Closure rate creates CAPA-paper risk; official signal is CAPA_EFFECTIVENESS. |
| `CRITICAL_SYSTEM_AVAILABILITY` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `DPMO` | demote_to_diagnostic_health | Diagnostic only with min_sample for low-volume CNC. |
| `DSO` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `INV_TURNS` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `MACHINE_UTIL` | demote_to_health_indicator | All-machine utilization drives local optimization and WIP; use bottleneck OEE/constraint metrics instead. |
| `MONTH_END_CLOSE_OT` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `SERVICE_TICKET_SLA` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `TRAINING_COMP` | demote_to_health_indicator | Completion is not competence; official signal is CRITICAL_ROLE_CERT_COVERAGE. |
| `NCR_RATE` | demote_to_operating_metric | Use diagnostically; never reward low NCR count. |
| `SUPPLIER_QUAL` | merge_as_supplier_readiness_component | Keep as component of SUPPLIER_READINESS. |
| `INVOICE_RFT` | demote_to_health_or_function_metric | Useful function health/control measure, not core manufacturing KPI. |
| `SUPPLIER_OTD` | merge_as_supplier_readiness_component | Keep as component of SUPPLIER_READINESS. |

Full per-code decisions are in `kpi-prune-decisions.csv`.

## Missing But Essential Lean Metrics

| Code | Current state | Required next action |
|---|---|---|
| `PROMISE_DATE_RISK` | Dashboard reference only; no complete registry contract found. | Define formula, source, owner, and score/gate usage. |
| `SETUP_TIME_VARIANCE` | Missing. | Add as operating metric or setup role measure after source verification. |
| `TOOL_FIXTURE_READY_TO_PLAN` | Missing. | Add as gate/operating readiness metric for planning/setup. |
| `KPI_DATA_FRESHNESS` | Missing. | Add as governance blocker for dashboard/scorecard trust. |
| `KPI_REGISTRY_DRIFT_COUNT` | Missing. | Add as CI/governance blocker backed by integrity guard output. |

## Practicality And Risk Critique

Mostly wrong layer: `MACHINE_UTIL`, `CAPA_CLOSURE`, `TRAINING_COMP`, `DPMO`, `MONTH_END_CLOSE_OT`, `SERVICE_TICKET_SLA`, `INV_TURNS`, and `DSO`.

Highest gaming risks: promise-date movement for OTD, delayed complaint/NCR logging, CAPA closure before effectiveness evidence, all-machine utilization, labor efficiency without quality/safety guard, and training completion without competence verification.

Owner-controllability risks: company OTD should not score frontline roles without attribution; gross margin should not score operators/QC/CAM/warehouse; NCR aging should not punish QA for engineering/supplier/production actions outside QA control; OEE red must split material, engineering, maintenance, gage/CMM, customer-change, and production causes.

## Validation Evidence

Commands run this turn:

- `bash tools/ai/preflight.sh || true`: safe, no hazards, branch `codex/kpi-t1-strategy-prune` at `e87cbe9e`.
- `php -l mom/api/services/KpiEngine.php && php -l mom/api/services/KpiRegistryAdminService.php && php -l mom/api/controllers/AdminController.php`: PASS.
- `node --check mom/scripts/portal/00o-admin-kpi-registry.js && node --check mom/scripts/portal/13-jd-scorecard-renderer.js`: PASS.
- `php mom/tools/release/check_kpi_integrity.php`: PASS with 12 P1 warnings. Key warnings: ANNEX-128 freshness gaps and staged scorecard candidates.
- `php tools/scripts/kpi/audit-html-kpis.php`: completed; 867 HTML files, 683 with KPI text, 4205 KPI occurrences.
- `php tools/scripts/kpi/audit-kpi-performance-governance.php`: completed; 867 HTML files, 624 KPI files, 95 files missing evaluation terms, 227 missing recognition terms, 29 missing discipline/corrective terms.
- `php tools/scripts/kpi/audit-kpi-system-matrix.php`: completed but mutates generated files; out-of-scope production/report side effects were reverted. Track 6 should add dry-run validation.
- `composer --working-dir=mom run check`: PASS. PHPStan scanned 306 files with no errors; PHPUnit passed 603 tests, 5970 assertions, 1 skipped.

## Remaining Risks For Later Tracks

1. Executive scorecard must not show staged/gate-only candidates as normal active score rows.
2. Missing/underdefined metrics above need contracts or explicit deferred status.
3. Track 2 must verify FPY formula truth.
4. Track 4 must remove fixed-count/fixed-weight JD assumptions.
5. Track 6 must prevent ANNEX-128 freshness warnings and staged-as-payout regressions.
