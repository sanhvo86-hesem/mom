# Prompt 07 - Lean/TOC Daily Flow and CMM Queue Engine

## Scope

- Prompt source: `/tmp/mom-kpi-v6-audit/_reports/kpi-world-class-v6-prompts/prompts/07_LEAN_TOC_DAILY_FLOW_CMM_QUEUE_ENGINE.md`
- Worktree: `/tmp/mom-kpi-v6-audit`
- Mode: implementation + re-audit + mutation-test

## Executive Verdict

- `P0 before fix`: 2
- `P0 after fix`: 0
- `P1 after fix`: 1
- `STOP_NEXT_PROMPT: false`

Prompt 07 is now materially safer. The driver panel no longer mixes a role-discipline metric with queue-engine signals, and the queue/constraint contracts now carry the minimum fields needed for daily operating decisions rather than retrospective explanation.

## Findings Before Fix

### P0-1 - Queue engine was polluted by a role scorecard metric

`INSPECTION_PLAN_ADHERENCE` was being used as:

- `lean_flow_operating_model.cmm_qc_queue_metrics`
- `daily_board_required_signals`
- `dashboard_core_kpis`
- `scorecard_operating_model.strategic_driver_panel`

This is semantically wrong. It is a `role_performance_measure`, not a queue-aging or bottleneck-control signal. If left in the daily flow board, the board can drift from "solve the bottleneck" into "score the inspector", which creates bad incentives and weakens fairness.

### P0-2 - Lean contracts were still too thin for real-time recovery control

The queue-aging and current-constraint contracts were missing operationally critical fields:

- constraint side lacked `buffer_policy`, `protection_action`
- queue side lacked `inspection_request_at`, `needed_by_at`, `queue_status`, `completion_at`

Without those fields, the board can show a problem exists, but still cannot govern recovery rigorously enough for hot job changes, CMM bottlenecks, or inspection-release prioritization.

## Remediation

### 1. Decoupled queue engine from role discipline

Updated `/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json` to:

- remove `INSPECTION_PLAN_ADHERENCE` from `cmm_qc_queue_metrics`
- add `queue_discipline_support_metrics = [INSPECTION_PLAN_ADHERENCE]`
- remove `INSPECTION_PLAN_ADHERENCE` from:
  - daily board required signals
  - lean review-forum queue lists
  - dashboard core card set
  - strategic driver panel

This preserves the metric for QA/QCL governance, but keeps it off the daily flow control plane.

### 2. Hardened current-constraint contract

Added `buffer_policy` and `protection_action` into:

- `lean_flow_operating_model.constraint_register_contract.required_fields`
- `CURRENT_CONSTRAINT_RESOURCE.data_source.columns`
- `CURRENT_CONSTRAINT_RESOURCE.manual_input_contract.fields`

This closes a real operating gap: a valid current-constraint declaration now requires not just naming the bottleneck, but also documenting how it will be protected.

### 3. Hardened queue-aging contract

Added explicit queue-control fields into:

- `lean_flow_operating_model.queue_aging_contract.required_fields`
- `CMM_QUEUE_AGING.data_source.columns`
- `CMM_QUEUE_AGING.manual_input_contract.fields`
- `QC_HOLD_SLA.data_source.columns`
- `QC_HOLD_SLA.manual_input_contract.fields`
- staged queue metrics `FAI_QUEUE_AGING` and `FINAL_INSPECTION_QUEUE_AGING` source/gap/evidence text

Required fields now explicitly cover:

- inspection request timestamp
- needed-by timestamp
- queue status
- owner
- completion timestamp

This is the minimum viable contract for queue triage under real delivery pressure.

### 4. Tightened integrity guard and mutation tests

Updated `/tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php` to fail if:

- `INSPECTION_PLAN_ADHERENCE` returns as a queue engine metric
- `INSPECTION_PLAN_ADHERENCE` returns to the daily flow board, dashboard core, or strategic driver panel
- constraint contract loses `buffer_policy` or `protection_action`
- queue contract loses `inspection_request_at`, `needed_by_at`, `queue_status`, `completion_at`
- queue engine metrics become role measures or rewardable

Mutation coverage added in:

- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`

## Senior-Engineer Reaudit

### Simulation 1 - CNC OEE green but CMM queue red

- Expected behavior:
  - board shows `CURRENT_CONSTRAINT_RESOURCE = cmm`
  - `CMM_QUEUE_AGING` shows owner, due time, blocker category
  - no one can hide behind local machine OEE
- Result after fix:
  - pass semantically

### Simulation 2 - Hot job resequence changes bottleneck

- Expected behavior:
  - active constraint change must record effective window, approver, buffer policy, protection action
- Result after fix:
  - pass semantically

### Simulation 3 - Inspection discipline drops during recovery

- Expected behavior:
  - `INSPECTION_PLAN_ADHERENCE` remains visible to QA/QCL governance
  - but does not masquerade as queue-aging or daily bottleneck signal
- Result after fix:
  - pass semantically

### Simulation 4 - Final inspection queue threatens OTD

- Expected behavior:
  - queue contract captures request time, needed-by, owner, status, completion
  - board can prioritize based on release risk rather than gut feel
- Result after fix:
  - pass at registry/contract level; runtime source still staged

## Residual P1

### P1-1 - Queue engine still relies on manual/staged contracts

This is honest, not hidden:

- `CMM_QUEUE_AGING` is still `manual_governed`
- `FAI_QUEUE_AGING` and `FINAL_INSPECTION_QUEUE_AGING` are still `staged_data_contract`

That is acceptable for Prompt 07 because runtime queue event tables are not yet proven. The guard now forces truthful status instead of fake runtime.

## Files Changed

- `/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json`
- `/tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `/tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
- `/tmp/mom-kpi-v6-audit/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html`

## Validation

- `php /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `cd /tmp/mom-kpi-v6-audit/mom && vendor/bin/phpunit tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`

## Next Step

Proceed to Prompt 08: composite material readiness, reusing the new fail-closed queue/constraint contracts so material green cannot bypass cert/IQC/traceability/kit/gage blockers.
