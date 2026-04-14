# Agent 2 - ERP / Planning / Lifecycle Governance

Date: 2026-04-15

Scope: sales orders, job orders, work orders, routing, schedule, lifecycle, enterprise/site/work-center semantics, migrations, services, controllers, and prior docs.

## Findings

| hypothesis | result | severity | evidence | disposition |
|---|---|---:|---|---|
| H1 execution truth file-backed/ambiguous | Confirmed | P1 | `OrderService` documents `data/orders/orders.json` as the live compatibility layer; DB planning migrations exist but are not DB-primary. | Staged. Do not add a competing planning model. |
| H2 mutable last-write snapshots | Partially confirmed | P1 | Order state is still compatibility snapshot state, although workflow/history services exist. | Staged. Event/snapshot split remains target state. |
| H3 weak lifecycle constraints | Partially confirmed | P2 | Hold set previously wrote before verifying the referenced SO/JO/WO existed. | Fixed now: invalid order types and missing source orders are rejected before hold write. |
| H4 weak date validation | Confirmed | P2 | SO create/update accepted raw date strings. | Fixed now: SO create/update normalize `YYYY-MM-DD` and reject dates before `order_date`. |
| H5 repeated schedule scans | Refuted | P3 | Scheduling aliases route to existing scheduling handlers and overlap guards are shared. | No code change. |
| H6 unsafe planning authorization | Refuted | P3 | Transition and hold-release write permissions are guarded by order type. | No code change. |
| H7 reason-code governance missing | Refuted | P3 | Hold/reason handling is governed in the planning path; shopfloor blocker reasons are separate. | No code change. |
| H8 weak plant/site lineage | Partially confirmed | P2 | Plant/site/work-center context is carried but not fully lineage-enforced across all SO/JO/WO release paths. | Blocked by broader planning master-data lineage policy. |
| H9 digital-thread planning hooks missing | Refuted | P3 | JO/WO payloads carry routing/CNC/inspection hooks. | No code change. |
| H10 schedule authority drift | Refuted | P3 | Scheduling remains owned by scheduling controller, not order truth. | No code change. |
| H11 source-of-truth drift | Confirmed | P2 | JSON compatibility, DB planning migrations, and scheduling projections coexist. | Bounded in source-of-truth docs. |
| H12 AI detached/unsafe | Refuted for planning | P3 | AI schedule apply/PM paths are advisory and do not mutate schedule or execution. | No code change. |
| H13 OT/IT governance weak | Refuted for planning write paths | P3 | Browser/API planning writes require auth/CSRF/role gates. | No code change. |
| H14 prior prompt debt | Partially confirmed | P2 | Planning alias drift was already fixed; orphan hold and SO date validation were still safe debt. | Fixed now. |
| H15 duplicate/storage drift | Confirmed | P2 | Planning data is split across compatibility JSON, DB migrations, and projections. | Documented; DB-primary cutover remains staged. |
| H16 tests too narrow | Confirmed | P2 | Existing tests cover workflow/service slices, not full planning cutover behavior. | Added focused dispatch lifecycle test; planning cutover tests remain staged. |

## Paths inspected

- `mom/api/controllers/OrderController.php`
- `mom/api/services/OrderService.php`
- `mom/api/services/OrderWorkflowService.php`
- `mom/api/controllers/AiSchedulingController.php`
- `mom/database/migrations/075_canonical_planning_erp_orchestration.sql`
- `docs/architecture/canonical-execution-source-of-truth.md`
- `docs/architecture/prior-prompt-remediation-log.md`

