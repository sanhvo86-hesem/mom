# Tranche 18 Pass 2 - Agent 4 Architecture / Authority Reaudit

Date: 2026-04-15

## Pass-2 Findings And Closure

| Finding | Pass-2 status | Closure |
| --- | --- | --- |
| Planning authority inconsistent across controller paths | FIX_NOW | `PlanningScenarioController` now passes session-derived partition scope into detail, feasibility, capacity, approve, and publish; `PlanningScenarioService` enforces site/plant scope when provided |
| Trusted release detail/provenance still had a site-scope edge | FIX_NOW | `verifyPacketScope()` now requires session site/plant and packet site/plant, failing closed on missing or mismatched scope |
| BaseController helper coverage incomplete | FIX_NOW | Added regression tests for planning/release controller consumers and planning service partition access |

## Architecture Result

Planning, trusted release, and traceability now share the same direction of authority: partition truth comes from authenticated session scope, not client request scope. Direct service calls remain backwards-compatible, but controller-authoritative paths now enforce multisite site/plant partitions.

## Verdict

Pass-2 architecture code-fixable findings are closed.
