# World-Class Positioning Gap - Tranche 8

**Declared:** 2026-04-13
**Scope:** Planning-to-execution authority, finite-capacity planning scenario, promise-date/dispatch convergence, replanning signals, and planning proof layer.

## Reaudit Inputs

Read before implementation:

- `standards/README.md`
- `standards/01-immutable-rules.md`
- `standards/32-module-architecture-v2.md`
- `standards/33-api-mapping-per-module.md`
- `mom/docs/system/world-class-positioning-gap-tranche6.md`
- `mom/docs/system/world-class-positioning-gap-tranche7.md`
- `mom/database/config.php`
- `mom/database/Connection.php`
- `mom/database/DataLayer.php`
- `mom/database/migrations/025_mes_tables.sql`
- `mom/database/migrations/041_ai_predictive_quality_aps.sql`
- `mom/database/migrations/043_production_dispatch_shift_targets.sql`
- `mom/database/migrations/047_advanced_planning_scheduling.sql`
- `mom/database/migrations/075_canonical_planning_erp_orchestration.sql`
- `mom/api/services/SchedulingService.php`
- `mom/api/controllers/AiSchedulingController.php`
- `mom/api/controllers/DispatchController.php`
- `mom/api/services/ConnectedGovernanceService.php`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/ShopfloorExecutionService.php`
- `mom/api/services/RuntimeAuthorityService.php`
- Focused tests for connected governance, shopfloor execution, trusted release records, runtime authority, and current smoke harnesses.

No `AGENTS.md` files were present in this workspace.

## Benchmark Gap Matrix

| Dimension | Rating | Verified evidence | Unproven claim / gap |
|---|---:|---|---|
| Finite-capacity planning readiness | YELLOW | Migration `047_advanced_planning_scheduling.sql` defines APS scenarios, capacity buckets, constraint resources, schedule blocks, conflicts, material availability, pegging, and KPI snapshots. | Runtime scheduling is still largely JSON/file-centric through `SchedulingService`; no authoritative scenario calculation service owns constraints, blockers, lifecycle, and read models. |
| Promise-date trustworthiness | RED | Existing `schedule_promise` endpoint exists and standards map quote/order flows to promise-date calls. | Promise-date output is not tied to an immutable scenario, deterministic constraint reasons, quality/maintenance/workforce blockers, or published dispatch readiness. |
| Dispatch / execution convergence | YELLOW | MES dispatch queue and dispatch target controllers exist; shopfloor execution and connected governance can gate production reporting. | Planning output does not publish an execution-ready schedule package that excludes blocked work and records provenance. |
| Constraint modeling breadth | YELLOW | Existing schema covers work center/machine capacity, maintenance blocked minutes, material shortage, missing skill conflicts, dispatch operator qualification, and quality/release blockers in adjacent services. | Runtime planning does not evaluate those constraints in one explainable model. |
| Replanning feedback loop | RED | Downtime events, quality holds, NCR/CAPA, production reports, trusted release packets, and connected governance events exist. | Execution-side blockers do not become structured planning impact/replanning signals. |
| Quality-aware planning | YELLOW | Shipment gates, trusted release blockers, manufacturing events, and NCR/CAPA/evidence taxonomies exist. | Quality holds are not first-class blockers in schedule feasibility/promise-date calculations. |
| Workforce-aware planning | YELLOW | Connected governance and workforce qualification gates exist and are tested for backend execution entitlement. | Planning does not yet consume qualification assertions or active revision requirements before marking work executable. |
| Maintenance-aware planning | YELLOW | APS capacity buckets include maintenance blocked minutes and MES downtime events exist. | Maintenance/downtime does not yet deterministically reduce capacity and explain infeasibility in the runtime scenario path. |
| Multisite planning rollout shape | YELLOW | Canonical org/company/legal entity/plant/site fields exist across promoted slices. | Existing APS migration has limited direct org-scope enforcement and no enterprise planning rollup for site-scoped scenarios. |
| Observability of planning failures | RED | Runtime authority exposes promoted slices and connected governance/trusted release counters. | No planning-scenario probe or counters exist for scenario calculation, infeasibility, publish blocks, promise risk, quality holds, capacity loss, or qualification planning blocks. |
| Unproven docs/claims from prior tranches | YELLOW | Tranche 6/7 docs explicitly defer APS, optimizer, live DB failover, and broader HCM/training resolution. | The platform must not claim APS-class planning until runtime scenario authority and constraint proof exist. |

## Tranche 7 Landing Verification

Priority 0 findings:

- `ConnectedGovernanceService`, repository interface, file repository, PostgreSQL repository, controller, and migration `105_connected_governance_revision_training_execution.sql` exist.
- Connected governance can release controlled revisions, create training obligations, evaluate active revision and operator readiness, and emit entitlement decisions.
- `ShopfloorExecutionService` integrates a backend connected-governance entitlement check before production report submission.
- `TrustedReleaseRecordService` and production-history read model can surface connected governance and qualification assertion context through manufacturing events.
- Remaining unproven prerequisite: live PostgreSQL migration/apply and concurrency proof were not executed locally. The slice is usable in code/tests and explicit about fallback mode.

## What Tranche 8 Will Implement

Priority A:

- Add one authoritative planning scenario service/repository slice around existing APS concepts.
- Reuse existing `aps_planning_scenarios` as the PostgreSQL authority target where DB mode and migration `047` are present; store the richer deterministic scenario packet in metadata to avoid duplicating APS ownership.
- Keep a file repository as explicit compatibility/fallback only when DB is not active.
- Calculate finite-capacity feasibility with deterministic blocker categories for capacity, quality hold, maintenance window, missing qualification, material shortage, and active revision gaps when provided.
- Expose scenario detail, promise/feasibility explanation, capacity/load read model, lifecycle transitions, dispatch readiness, and runtime probe.

Priority B:

- Publish a minimal execution schedule from an approved, blocker-free scenario.
- Preserve a backend invariant that blocked scenarios cannot publish.
- Include deterministic dispatch readiness and schedule provenance in the scenario packet.

Priority C:

- Add a lightweight structured replanning signal model for execution-side planning impacts when the Priority A/B slice is stable.

Priority D:

- Add runtime authority reporting and metrics for planning scenario calculation, infeasibility, publish blocks, published schedules, promise risk, quality holds, maintenance blocks, and missing qualification blockers.

## What Tranche 8 Will Defer

- Full APS optimizer, heuristic objective tuning, and interactive schedule optimization.
- Full BOM pegging/material requirements planning beyond deterministic shortage blockers supplied to the scenario.
- Live PostgreSQL concurrency/failover proof.
- Full enterprise multi-site planning rollup and scope enforcement across every legacy planning table.
- UI/dashboard redesign, AI scheduling features, and cosmetic scheduling cleanup.

## Why This Is Highest Leverage

Prior tranches promoted authority for idempotency, core workflow, canonical events, production history, workforce qualification, trusted release packets, and connected governance. The next largest platform gap is that planning/promise/dispatch remains split between legacy file-backed schedule endpoints and schema-only APS artifacts. A bounded planning scenario spine moves the repo toward APS-class behavior by making feasibility explainable, constraints explicit, publishability gated, and runtime state measurable without a broad rewrite.
