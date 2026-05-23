# Track 02 Runtime Risk Register

Date: 2026-05-23

| ID | Severity | Risk | Evidence | Impact | Mitigation |
| --- | --- | --- | --- | --- | --- |
| K02-P0-01 | P0 | Runtime source drift | OEE, MACHINE_UTIL, SETUP_RATIO query equipment_logs, absent from db-map. | Dashboard/runtime scoring can fail or show false zero/grey. | Repair calculators to verified MES/OEE source or demote to staged before scoring. |
| K02-P0-02 | P0 | Staged scorecard metrics | 10 executive scorecard evidence contracts are candidate_data_contract. | Payout/management review can treat non-runtime metrics as real. | Admin/dashboard must label candidate/staged and block payout. |
| K02-P0-03 | P0 | FAI first-pass ambiguity | FAI contract asks for inspection_type/attempt_number/result but real tables expose different fields. | False first-pass KPI or unprovable FAI gate. | Define canonical first-attempt event or migrate source columns before calculator. |
| K02-P0-04 | P0 | TOC metrics lack active constraint contract | OEE_BOTTLENECK, CONSTRAINT_LOST_HOURS, THROUGHPUT_PER_CONSTRAINT_HOUR lack approved active constraint and loss-hour evidence. | Local optimization and wrong bottleneck decisions. | Use aps_constraint_resources plus MES reason codes and approved weekly constraint register. |
| K02-P1-01 | P1 | Manual fallback can blur staged vs manual | calculateFromManualInput works for any known non-runtime metric. | A staged metric could get manual data and appear operational if UI labels poorly. | Catalog/UI must preserve calculation_status and scorecard_scoring_status. |
| K02-P1-02 | P1 | Breakdowns too thin | Runtime calculators mostly return totals. | Managers cannot assign root-cause action. | Add machine, part family, customer, gate, owner, and reason-code breakdowns per calculator. |
| K02-P1-03 | P1 | Missing canonical TOOL_FIXTURE_READY_TO_PLAN | Prompt 02 names it but registry lacks the code. | Gate G3/G4 readiness remains fragmented. | Track 3 should add or map it to mes_dispatch_queue readiness fields. |
| K02-P1-04 | P1 | Adjacent data exists but registry names wrong table | final release, gross margin, promise risk, role coverage have nearby tables but declared names are absent. | Migration or integration plan may create duplicate authority. | Prefer aligning registry to existing canonical tables before creating new tables. |

## Residual Risk After This Track

This track intentionally does not repair runtime code because Prompt 02 starts with data-contract audit/spec and Track 1 target architecture is absent in this checkout. The reports create the source-truth backlog for later implementation.

No P0 runtime behavior is worsened by this track because no runtime files are changed. Existing P0 risk remains open until the `equipment_logs` source drift is repaired or the affected metrics are demoted.
