# V4 P44 Generic CRUD Hard Stop Report

## Source Truth Audit

- Prompt executed: `P44_governed_entity_registry_and_triple_layer_generic_crud_hard_stop`.
- Branch/worktree: `codex/mda-v4-implementation-closure-recovery-20260530` in `/private/tmp/mom-mda-v4-recovery`.
- Baseline artifacts consumed: P42/P43 reports and blocker register in `_reports/agent-audits/mda-v4-implementation-closure-2026-05-30/`.
- Runtime source inspected: `GenericCrudController`, `GenericCrudService`, `runtime-access-policy.json`, generic REST routes, `Connection`, existing controller runtime-safety tests.
- Baseline finding: HTTP controller had a partial domain-command boundary, but direct `GenericCrudService` calls could still execute create/update/delete/transition SQL on governed tables. No governed entity registry existed.

## Implementation Delta

- Added `mom/data/registry/governed-entity-registry.json` as the P44 registry for governed roots, tables, allowed command names, read-only projections, import staging tables, and break-glass controls.
- Added `GenericCrudGuardService` and `GenericCrudMutationDeniedException`.
- Wired `GenericCrudController` to return RFC 9457-style Problem Details fields while preserving legacy `error=domain_command_required`.
- Wired `GenericCrudService` so direct service-layer create/update/delete/transition calls fail before payload validation and before DB writes for governed tables.
- Added migration `267_governed_generic_crud_guard.sql` with `governed_entity_registry`, `generic_crud_denial_event`, and `hesem_governed_generic_crud_guard()` trigger rollout for tables that exist.
- Added focused tests for guard behavior and migration shape.

## Runtime Evidence Probe

- `php -l` passed for modified/new PHP files.
- Registry JSON parse passed: `REGISTRY_JSON_OK roots=11`.
- Service-layer direct probe: `GenericCrudService::update('sales','sales_orders',...)` returned `["domain_command_required","sales_orders",409]` before DB mutation.
- Controller probe: admin create on `sales.sales_orders` returned `[409,"domain_command_required","https://hesemeng.com/problems/domain-command-required","sales_orders"]`.
- Unknown table mutation probe returned `[false,"unknown_table_mutation_denied"]`.
- Break-glass probe returned `[true,"migration_break_glass"]` only with required env, internal override header, release manifest, command UUID, and admin role.
- Telemetry probe wrote JSONL denial event with `event_type=generic_crud_mutation_denied`.
- Migration drift checker remains non-fatal: `0 P1 + 3 P2` historical duplicate prefixes `108`, `115`, `188`.
- PHPUnit command blocked by missing vendor: `vendor/bin/phpunit` not found.

## Operational Simulation Matrix

| scenario_id | command/action | expected_gate | result |
|---|---|---|---|
| P44-SIM-01 | HTTP admin create `sales.sales_orders` through Generic CRUD | 409 domain command required | PASS |
| P44-SIM-02 | Direct `GenericCrudService::update` on `sales_orders` | Service-layer guard before DB | PASS |
| P44-SIM-03 | Generic read/list on governed table | Read allowed, no mutation | PASS |
| P44-SIM-04 | Mutate read-only projection | Projection read-only denial | PASS |
| P44-SIM-05 | Unknown table create | Unknown mutation denied by default | PASS |
| P44-SIM-06 | Import staging create with staging context | Allowed as staging bridge | PASS |
| P44-SIM-07 | Migration break-glass update | Allowed only with env/header/manifest/command/admin | PASS |
| P44-SIM-08 | DB trigger guard for Generic CRUD session context | Migration function and trigger rollout exist | PASS static; live DB apply pending |

## Adversarial Re-Audit

- Security reviewer: HTTP-only mitigation is no longer enough; direct service calls now fail closed.
- Data authority reviewer: Generic CRUD no longer owns governed business transitions; registry points to command names only and does not claim commands are complete.
- DB reviewer: migration protects Generic CRUD DB execution context without prematurely blocking all legacy non-generic service writes. Full app-role RLS remains a controlled gap for later command-context prompts.
- API reviewer: response payload now carries Problem Details fields, but OpenAPI deny markers remain deferred to P57.
- Release reviewer: not production-ready; PHPUnit and live DB migration execution are pending environment/deploy stages.

## Decision

Decision token: `P44_PASS_WITH_CONTROLLED_GAPS`.

Rationale: P0 Generic CRUD governed mutation is closed for HTTP and service-layer Generic CRUD paths, with DB guard artifacts for Generic CRUD session context. Remaining DB-wide app-role direct SQL enforcement is intentionally not activated until live command handlers can set command context.
