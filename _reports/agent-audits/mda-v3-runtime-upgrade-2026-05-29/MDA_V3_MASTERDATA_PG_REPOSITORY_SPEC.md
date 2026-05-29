# MDA V3 MasterData PostgreSQL Repository Spec

## Runtime Posture

P27 introduces `DataLayerMasterDataRepository` as the cutover bridge between `MasterDataService` and the existing `DataLayer` migration modes.

| Mode | Active read | Active write | JSON role | Claim allowed |
|---|---|---|---|---|
| `JSON_ONLY` | `master-data.json` | `master-data.json` | primary compatibility store | compatibility only |
| `SHADOW_WRITE` | `master-data.json` | JSON first, then PostgreSQL mirror with telemetry | migration primary plus PG shadow | shadow bridge only |
| `POSTGRES_PRIMARY` | PostgreSQL mirror via `DataLayer` | PostgreSQL mirror first, then JSON cache | fallback/cache after PG write | controlled PG primary |
| `POSTGRES_ONLY` | PostgreSQL mirror via `DataLayer` | PostgreSQL mirror only | disabled for active store | PG-only only if restore drill and zero blocker drift exist |

## Implemented Repository Contract

- `MasterDataService` now builds `DataLayerMasterDataRepository` when constructed with a root directory, which is the MVC controller path and the legacy `master_data_service()` helper path.
- `MasterDataController` list/detail read paths now use `MasterDataService::listEntityRecords()` and `MasterDataService::findEntityRecord()` instead of directly reading `master-data.json`.
- Legacy `load_master_data_store()` and `load_master_data_active_store()` now block JSON fallback when global or domain mode requires PostgreSQL authority.
- `save_master_data_store()` writes JSON only as `compatibility_cache_after_postgres_write` under PostgreSQL primary, and skips active JSON writes under `POSTGRES_ONLY`.
- `authorityProbe()` now distinguishes `compatibility_only`, `shadow_write_bridge`, `postgres_primary_with_controlled_json_fallback`, and `postgres_only_authoritative`.

## PostgreSQL Round-trip Coverage

P27 extends existing `RuntimeShadowSync` and `DataLayer::loadRuntimeMasterDataFromPg()` coverage for:

- `routing_library` -> `routings`
- `bom_library` -> `bill_of_materials`
- `control_plans` -> `control_plans`
- `inspection_plans` -> `inspection_plans`

Existing coverage retained:

- `customers` -> `customers`
- `suppliers` -> `vendors`
- `parts` -> `items`
- `revisions` -> `item_revisions`
- `work_centers` -> `work_centers`
- `machines` -> `equipment`
- `operators` -> `v_user_canonical` plus legacy `employees.metadata`
- `tooling_assets` -> `tools`
- `nc_program_releases` -> `mes_nc_release_packages`
- `mes_connectivity_adapters` -> `mes_connectivity_adapters`
- `mes_alarm_catalog` -> `mes_alarm_catalog`
- `mes_alarm_playbooks` -> `mes_alarm_playbooks`
- `tool_assemblies` -> `mes_tool_assemblies`
- downtime reason/resolution codes -> `variable_registry`

## Deliberate Non-claims

P27 does not claim runtime-complete Master Data Authority Platform status because:

- The current probe still reports `JSON_ONLY`, PostgreSQL inactive/unconfigured.
- `history`, `pending`, and `archive` remain JSON compatibility bridges.
- Native command idempotency, optimistic concurrency, audit/event ledger, and outbox are still P31/P32 work.
- Traveler templates, quality gate profiles, warehouse locations, and defect catalog still lack safe physicalized PG mapping in the current registry evidence.
- No live PostgreSQL restore drill or full reconciliation run was possible in this worktree.

## P30/P34 Release-readiness Rule

Release/readiness services must inspect `MasterDataService::authorityProbe()` and/or `runtime_data_layer_summary()` before trusting governed master data.

Required blocking behavior:

- If `readiness_state` is `compatibility_only` or `shadow_write_bridge`, release/readiness must fail closed for governed production release decisions.
- If `POSTGRES_PRIMARY` falls back to JSON, release/readiness must fail closed and open a drift incident.
- If `POSTGRES_ONLY` is requested without a restore-drill evidence packet and zero blocker drift, release/readiness must fail closed.
