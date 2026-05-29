# Prompt 17 - End-to-End Daily Operation Simulation

## Verdict

- Status: PASS
- P0: 0
- P1: 1
- P2: 0

## Method

I replayed the prompt-pack daily-operation matrix against the current KPI registry, runtime calculators, release dependencies, scorecard rules, and pilot governance controls. This was not a paper walk-through; the goal was to find false-green, unfair scoring, hidden bypass, or actionless dashboards.

## Scenario Stress Review

| Scenario | KPI / Gate Focus | Expected Behavior | Current Result |
|---|---|---|---|
| Hot LAM order cuts into plan | `PLAN_ADHERENCE`, `CURRENT_CONSTRAINT_RESOURCE`, `CONSTRAINT_LOST_HOURS`, gate applicability | Hot order shows action burden and constraint decision trail, but does not silently justify bypass. | PASS |
| Material physically in stock but cert / IQC missing | `MATERIAL_AVAILABILITY_PLAN`, `MATERIAL_CERT_VERIFICATION_COMPLETENESS`, `IQC_RELEASE_ON_TIME`, `TRACEABILITY_LABEL_VERIFIED` | Composite readiness stays blocked; physical-ready alone cannot go green. | PASS |
| FAI fail on a 2-piece lot | `FAI_FIRST_PASS`, `small_lot_review_policy`, `G4` evidence | Event stays visible without pretending that a tiny sample is a stable trend. | PASS |
| CMM is the bottleneck while CNC OEE looks green | `CURRENT_CONSTRAINT_RESOURCE`, `CMM_QUEUE_AGING`, `FINAL_INSPECTION_QUEUE_AGING` | Constraint board drives action; bottleneck is not hidden by local machine utilization. | PASS |
| Shipment packet complete except missing check-dimension report | `SHIP_PACKET_COMPLETENESS`, `CHECK_DIM_REPORT_ON_SHIP`, `G6` | Shipment must stay red / blocked. | PASS |
| Release attempted with invalid gage | `GAGE_VALID_FOR_RELEASE`, `SHIP_PACKET_COMPLETENESS`, `G6` | Release blocked; no green ship packet. | PASS |
| Customer deviation requested without written special release | `SPECIAL_RELEASE_COMPLIANCE`, `SPECIAL_RELEASE_MARKING_COMPLIANCE`, `G5/G6` | Remains blocker, not discretionary note. | PASS |
| Complaint opens, 3D/4D/8D aging | `CUSTOMER_NCR_SEVERITY_SCORE`, `NCR_3D_RESPONSE_SLA`, `NCR_8D_UPDATE_SLA`, acceptance closure | Severity and SLA remain governed; no stealth payout. | PASS |
| Operator output goes red because gage / material / CAM not ready | role controllability + support-role scorecards | Burden stays with blocker owner; frontline role is not blamed for upstream unreadiness. | PASS |
| Month-end NCR closure gaming | `CUSTOMER_ACCEPTED_8D_CLOSURE_RATE`, timestamps, acceptance evidence | Closure requires actual acceptance evidence, not cosmetic close dates. | PASS |

## Finding

### P1-1 - Governance-audit script still reports broad document buckets with KPI references that are not framed as people-governance artifacts

This is not a runtime false-green defect in the governed KPI surface, but it is a documentation hygiene signal. The broad HTML audit still finds many reference/training docs that mention KPI-like tokens without local recognition terms. In most cases these are control/reference documents rather than scorecards, so the correct response is naming discipline and scoping, not blindly injecting reward language.

## Senior-Engineer Critique

1. The runtime path now behaves like an operating system, not a poster.
2. The biggest remaining risk is not KPI math; it is document sprawl where non-scorecard references casually say "KPI" and confuse governance scope.
3. The system is operationally much harder to game now because packet release, material readiness, CTQ sample discipline, and pilot freeze all cross-check each other.

## Evidence

- Runtime tests:
  - `mom/tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php`
  - `mom/tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php`
- Registry and guards:
  - `mom/data/registry/kpi-authority-registry.json`
  - `mom/tools/release/check_kpi_integrity.php`
  - `mom/tools/release/check_kpi_integrity_drift_test.php`
- Supporting audit:
  - `tools/scripts/kpi/audit-kpi-performance-governance.php`

## Validation

- `php mom/tools/release/check_kpi_integrity.php`
- `php mom/tools/release/check_kpi_integrity_drift_test.php`
- `vendor/bin/phpunit tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php tests/Unit/Services/KpiEnginePrompt08FlowReadinessTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php`
