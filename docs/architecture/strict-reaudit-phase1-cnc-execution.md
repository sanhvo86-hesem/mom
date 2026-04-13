# Strict Reaudit: Phase 1 CNC Execution Backbone

## Branch And Scope Inspected

- Branch: `main`.
- Merge base checked against `origin/main`: `685d51d7a9a37996f505e2f9e054903cacfeff59`.
- Workspace state: dirty before this upgrade, with many unrelated registry/governance changes. This remediation is intentionally scoped to dispatch/shopfloor execution files and architecture docs.

## Source-Of-Truth Decisions

| Concept | Decision |
| --- | --- |
| Sales/job/work orders | `data/orders/orders.json` through `OrderService` remains live order truth. Dispatch may enrich missing context from it but must not create a second work-order model. |
| Dispatch target | `data/dispatch/targets.json` remains planner-controlled Phase 1 dispatch truth, bridging toward DB table `shift_targets`. |
| Production report history | `data/dispatch/production_report_events.json` is the Phase 1 append-only report history for accepted manual reports. |
| Production report snapshot | `data/dispatch/production_logs.json` remains the compatibility current-state snapshot for dashboards and legacy screens. |
| Mobile time and inspection | `MobileWorkQueueService` stores detailed labor and inspection captures separately; dispatch production reports do not replace those paths. |
| Machine downtime and alarms | Manual downtime in dispatch reports is operator-entered execution context; machine-originated alarms remain in MES alarm/connectivity services. |
| AI and analytics | `AiSchedulingController`, prediction files/tables, and `advisory_projection` remain projection-only and cannot write execution truth. |

## H1-H10 Reaudit Results

- H1 confirmed. Dispatch truth is still file-backed while richer DB schema exists in `043_production_dispatch_shift_targets.sql`, `076_canonical_mes_execution_spine.sql`, and `098_canonical_manufacturing_event_backbone.sql`. Remediation: documented staged bridge and kept file authority for compatibility.
- H2 confirmed. The previous write path overwrote one production snapshot per target. Remediation: added `production_report_events.json` so accepted reports preserve append-only history while snapshots remain legacy current state.
- H3 partially confirmed. Reason-code and time validation existed, but correction, overproduction, target completion, and blank-assignment behavior were weak. Remediation: added explicit correction, overproduction, completion, and operator-assignment guards.
- H4 refuted for current operator dispatch. `getOperatorDispatch()` reads targets and logs once, builds a log map, and scans targets once. Remediation: narrowed returned tasks to dispatched/in-progress/completed work so planned targets do not leak to operators.
- H5 confirmed. Blank `operator_id` targets were reportable by any operator. Remediation: normal operators are blocked unless a planner/manager override role submits.
- H6 mostly refuted. Downtime, NG, rework, and blockers already use master-data catalogs. Remediation retained that path and kept legacy defect type mapping into governed `defect_catalog`.
- H7 partially confirmed. Dispatch had CNC program/setup links but missed several digital-thread fields. Remediation added routing, operation revision, setup sheet revision, inspection plan, traveler, material lot, and heat-number continuity, with conservative enrichment from order truth.
- H8 confirmed. Quantity-only auto-completion was too naive. Remediation: target completion now requires explicit completion intent and `actual_end`, with good quantity meeting target.
- H9 refuted. AI/advisory data is still marked projection-only and is not used as execution authority. Remediation kept that separation in event history and docs.
- H10 partially confirmed. Mobile task start already uses `WorkforceQualificationGateService`; dispatch report submission now also has a connected-governance entitlement hook when that service is present in the current branch.

## Remediation Strategy

The least-risk path is a staged bridge:

1. Preserve existing MVC actions and legacy response shapes.
2. Keep `targets.json` and `production_logs.json` as live compatibility stores.
3. Add append-only production report event history beside the snapshot.
4. Use event history for idempotency replay after later snapshot updates.
5. Append canonical manufacturing events as read-model projections only.
6. Defer DB authority migration until `shift_targets`, `shift_production_log`, and `mes_operational_event_ledger` can be migrated with controlled backfill and reconciliation.

## Deferred Items

- Real DB transaction boundaries across dispatch target, snapshot, and event history.
- Full pause/resume command semantics.
- Full route/operation/inspection-plan referential enforcement against DB tables.
- Full MTConnect/OPC-UA ingestion. Phase 1 only preserves stable machine/equipment and timestamp semantics for later ingestion.
