# Agent 3 - MOM / MES Execution Backbone

Date: 2026-04-15

Scope: dispatch, operator assignment, production reporting, mobile/shopfloor execution, execution events, idempotency/offline sync, file stores, migrations, controllers, services, and repositories.

## Findings

| hypothesis | result | severity | evidence | disposition |
|---|---|---:|---|---|
| H1 execution truth file-backed/ambiguous | Confirmed | P1 | `DispatchController` writes JSON compatibility targets/logs/events and mirrors through `ShopfloorExecutionPersistenceService`. | Staged bridge retained. |
| H2 mutable snapshot behavior | Partially confirmed | P1 | `production_logs.json` is a current snapshot; report/lifecycle event journals preserve replay/audit history. | Snapshot role documented. |
| H3 weak lifecycle transitions | Confirmed | P1 | Normal dispatch did not explicitly block redispatch of started or terminal targets. | Fixed now: only `planned` targets are dispatchable. |
| H4 weak execution validation | Mostly refuted | P2 | `ShopfloorExecutionService` validates quantities, timestamps, reason codes, correction, first-piece, and 5M traceability gates. | No broad change. |
| H5 repeated scans/I/O | Partially confirmed | P2 | Operator dispatch is single-pass; manufacturing-event file append previously retained the full fallback ledger. | Fixed now: append scans duplicate/hash context under lock. |
| H6 unsafe assignment | Refuted | P2 | Reporting requires assignment or planner override and connected-governance entitlement hook. | No change. |
| H7 reason-code governance | Refuted | P2 | Downtime, NG, rework, and blocking codes are validated against governed catalogs. | No change. |
| H8 qualification controls | Partially confirmed | P2 | Mobile start uses qualification gate; dispatch report skill/cert matching remains policy-staged. | Blocked by missing governed machine/operation/skill policy. |
| H9 inspection gating | Refuted for first-piece | P2 | Production reporting blocks required first-piece output until passing capture or governed override. | No change. |
| H10 digital-thread continuity | Partially confirmed | P1 | Execution carries CNC/setup/inspection/material/traveler context; DB authority for CNC/setup remains staged. | Documented as CNC workstream blocker. |
| H11 source-of-truth drift | Confirmed | P1 | JSON compatibility, DB bridge, and manufacturing-event projections coexist. | Bounded by explicit authority docs. |
| H12 AI/projection drift | Refuted | P2 | AI fields in logs are advisory projections and cannot mutate execution truth. | No change. |
| H13 OT/IT/replay controls | Mostly refuted | P2 | CSRF/role checks, idempotency replay, locks, and dead-letter projection path are present. | No change. |
| H14 prior debt | Partially confirmed | P1 | Safe dispatch lifecycle and file-append gaps remained. | Fixed now. |
| H15 duplicate concepts/storage drift | Confirmed | P2 | Compatibility stores and bridge ledgers intentionally coexist. | Staged cutover only after reconciliation. |
| H16 tests too narrow | Confirmed | P2 | Tests focus service behavior but not every controller/DB cutover scenario. | Added lifecycle service coverage. |

## Paths inspected

- `mom/api/controllers/DispatchController.php`
- `mom/api/controllers/MobileController.php`
- `mom/api/services/ShopfloorExecutionService.php`
- `mom/api/services/ShopfloorExecutionPersistenceService.php`
- `mom/api/services/FileManufacturingEventRepository.php`
- `mom/api/services/PostgresManufacturingEventRepository.php`
- `mom/database/migrations/098_canonical_manufacturing_event_backbone.sql`
- `mom/database/migrations/107_phase1_shopfloor_execution_bridge.sql`
- `mom/database/migrations/122_digital_thread_event_context_filters.sql`

