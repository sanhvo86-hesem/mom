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

## Implemented Closure

Priority 0:

- Verified Tranche 7 prerequisites are present in code: connected governance repositories/service/controller, trusted release record service, production history read model, shopfloor entitlement gate integration, and runtime authority slice.
- Confirmed the remaining live-DB proof gap is not closed by this tranche: local verification did not apply migrations to a live PostgreSQL instance.

Priority A:

- Added `PlanningScenarioService` with repository boundary and deterministic finite-capacity calculation.
- Added `PlanningScenarioRepository`, `FilePlanningScenarioRepository`, and `PostgresPlanningScenarioRepository`.
- PostgreSQL authority reuses existing migration `047_advanced_planning_scheduling.sql` and table `aps_planning_scenarios`; the richer scenario packet is stored in `metadata` with `payload_schema_version = planning_scenario.v1` to avoid creating a duplicate APS owner.
- File persistence is explicit compatibility/fallback only and reports `json_fallback` / `authority_partial`.
- Scenario calculation now evaluates explicit blocker categories:
  - `capacity_overload`
  - `capacity_missing`
  - `quality_hold`
  - `maintenance_window`
  - `missing_qualification`
  - `expired_qualification`
  - `material_shortage`
  - `active_revision_missing`
- Read models now exist for scenario detail, promise/feasibility explanation, capacity/load by work center/machine/date, dispatch readiness, replanning signals, and runtime probe.

Priority B:

- Added a minimal publishable dispatch package inside the scenario authority packet.
- Backend invariant blocks publish unless the scenario is approved and has no blockers.
- Published schedule entries carry work order, job, operation, work center, machine, planned time, active revision reference, qualification requirement, and provenance.

Priority C:

- Added scenario-scoped `ReplanningSignal` support with deterministic categories:
  - `capacity_loss`
  - `quality_hold`
  - `maintenance_block`
  - `material_shortage`
  - `workforce_unqualified`
  - `promise_risk`
- The current implementation records and queries signals; full automatic recalculation from every runtime signal remains deferred.

Priority D:

- `RuntimeAuthorityService` now reports `planning_scenario`.
- Planning probe reports backend, readiness, state model, constraint categories, replanning categories, read models, and counters for calculate, infeasible, publish block, published, promise risk, quality hold, maintenance block, capacity loss, and missing qualification blockers.
- Added controller/action and REST surfaces under planning without changing existing `schedule_*` compatibility endpoints.

Generated authority artifacts:

- Regenerated registry/publication artifacts after route additions.
- Reran frontend simulator, registry doctor, global capability audit, operational blind-spot report, operational stress report, and system contract authority to clear source-vs-artifact drift.
- Updated `contracts/registry-authority-standard.json` review timestamp so required registry authority artifacts are not falsely classified as aging during this release gate.

## Verification Evidence

- `php -l` passed for new planning service, repositories, controller, route module, runtime authority service, and planning test file.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche8-planning-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/PlanningScenarioServiceTest.php` -> pass, 8 tests, 32 assertions.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche8-focused-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/PlanningScenarioServiceTest.php tests/Unit/Services/ConnectedGovernanceServiceTest.php tests/Unit/Services/RuntimeAuthorityServiceTest.php tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php` -> pass, 20 tests, 113 assertions.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-tranche8-full-phpunit-error.log vendor/bin/phpunit --do-not-cache-result` -> pass, 230 tests, 1444 assertions, 1 gated skip.
- `php -d error_log=/tmp/mom-tranche8-backend-smoke-error.log tests/backend_smoke.php` -> pass.
- `python3 tools/registry/canonical_publication_orchestrator.py` -> pass with publication proof `PASS`.
- `python3 tools/registry/enterprise_frontend_simulator.py` -> pass with `watch` status and no blocker counts.
- `python3 tools/registry/enterprise_registry_doctor.py --write` -> pass with `watch` status, 0 P1 findings.
- `python3 tools/registry/generate_global_erp_mom_capability_audit.py` -> pass with 0 blocking gaps.
- `python3 tools/registry/generate_operational_blind_spot_report.py` -> pass with 0 critical/high/medium findings.
- `python3 tools/registry/generate_operational_stress_report.py` -> pass with 0 critical/high/medium findings.
- `python3 tools/registry/generate_system_contract_authority.py` -> pass with 0 critical gaps.
- `php -d display_errors=1 -d error_log=/tmp/mom-tranche8-data-schema-smoke-error.log tests/data_schema_admin_smoke.php` -> pass.
- `php -d display_errors=1 -d error_log=/tmp/mom-tranche8-registry-smoke-error.log tests/enterprise_registry_authority_smoke.php` -> pass.

## Strict Reaudit Closure

Additional reaudit on 2026-04-13 found and closed these issues:

- `aps_planning_scenarios.created_by` is a nullable UUID foreign key, but the planning service can carry actor labels such as `planner` or `planner-1`. `PostgresPlanningScenarioRepository` now only binds `created_by` when the actor value is a valid UUID and preserves non-UUID actor labels in the authoritative metadata packet as `created_by_actor`.
- `aps_planning_scenarios.scenario_name` is `VARCHAR(150)`, while the repository previously allowed 255 characters. Scenario names are now truncated to the schema limit before upsert.
- Scenario-scoped replanning signal updates now lock the matching APS scenario row with `FOR UPDATE` before rewriting the metadata signal list, reducing lost-update risk on PostgreSQL.
- Capacity bucket `shift_start` parsing now accepts both `HH:MM` and `HH:MM:SS` and falls back to `08:00:00` for invalid values instead of constructing malformed timestamps.
- Focused tests now cover material shortage plus missing active revision blockers, closed/released quality holds, shift-start seconds, and PostgreSQL schema helper behavior for `scenario_name` and `created_by`.

Reaudit verification:

- `php -l mom/api/services/PostgresPlanningScenarioRepository.php` -> pass.
- `php -l mom/api/services/PlanningScenarioService.php` -> pass.
- `php -l mom/tests/Unit/Services/PlanningScenarioServiceTest.php` -> pass.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-reaudit-planning-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/PlanningScenarioServiceTest.php` -> pass, 12 tests, 41 assertions.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-reaudit-focused-phpunit-error.log vendor/bin/phpunit --do-not-cache-result tests/Unit/Services/PlanningScenarioServiceTest.php tests/Unit/Services/ConnectedGovernanceServiceTest.php tests/Unit/Services/RuntimeAuthorityServiceTest.php tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php` -> pass, 24 tests, 122 assertions.
- `php -d memory_limit=512M -d opcache.enable_cli=0 -d error_log=/tmp/mom-reaudit-full-phpunit-error.log vendor/bin/phpunit --do-not-cache-result` -> pass, 247 tests, 1495 assertions, 1 gated skip.
- `php -d error_log=/tmp/mom-reaudit-backend-smoke-error.log tests/backend_smoke.php` -> pass.
- `python3 tools/registry/canonical_publication_orchestrator.py` -> pass with publication proof `PASS`.
- `python3 tools/registry/enterprise_frontend_simulator.py` -> pass with `watch` status and no blocker counts.
- `python3 tools/registry/enterprise_registry_doctor.py --write` -> pass with `watch` status, 0 P1 findings.
- `python3 tools/registry/generate_global_erp_mom_capability_audit.py` -> pass with 0 blocking gaps.
- `python3 tools/registry/generate_operational_blind_spot_report.py` -> pass with 0 critical/high/medium findings.
- `python3 tools/registry/generate_operational_stress_report.py` -> pass with 0 critical/high/medium findings.
- `python3 tools/registry/generate_system_contract_authority.py` -> pass with 0 critical gaps.
- `php -d display_errors=1 -d error_log=/tmp/mom-reaudit-data-schema-smoke-error.log tests/data_schema_admin_smoke.php` -> pass.
- `php -d display_errors=1 -d error_log=/tmp/mom-reaudit-registry-smoke-error.log tests/enterprise_registry_authority_smoke.php` -> pass.

## Remaining Unproven Items

- No live PostgreSQL migration/apply, concurrency, lock contention, or failover test was executed locally.
- The new Postgres repository persists scenario packets through existing `aps_planning_scenarios.metadata`; fully normalized APS tables for schedule blocks, conflicts, material pegging, and dispatch queue publication remain future work.
- The deterministic rules engine is not a full optimizer. It proves finite-capacity blockers and promise-date explanation, not APS-grade optimization.
- BOM explosion, multi-level MRP, alternate resource selection, sequence optimization, and cross-site planning rollup remain deferred.
- Replanning signals are structured and queryable, but automatic scenario recalculation from all execution/quality/maintenance events is not yet complete.
