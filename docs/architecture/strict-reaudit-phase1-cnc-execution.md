# Strict Reaudit: Phase 1 CNC Execution Backbone

## Branch And Scope Inspected

- Branch: `main`.
- Merge base checked against `origin/main`: `685d51d7a9a37996f505e2f9e054903cacfeff59`.
- Workspace state: dirty before this upgrade, with many unrelated registry/governance changes. This remediation is intentionally scoped to dispatch/shopfloor execution files and architecture docs.

## Source-Of-Truth Decisions

| Concept | Decision |
| --- | --- |
| Sales/job/work orders | `data/orders/orders.json` through `OrderService` remains live order truth. Dispatch may enrich missing context from it but must not create a second work-order model. |
| Dispatch target | `data/dispatch/targets.json` remains planner-controlled Phase 1 dispatch truth, with PostgreSQL shadow-write support to `shift_targets` when DB mode and migration `107_phase1_shopfloor_execution_bridge.sql` are active. |
| Production report history | `data/dispatch/production_report_events.json` is the Phase 1 append-only report history for accepted manual reports, with PostgreSQL shadow-write support to `shift_production_report_events`. |
| Dispatch lifecycle history | `data/dispatch/execution_events.json` is the Phase 1 append-only target lifecycle history, with PostgreSQL shadow-write support to `shift_dispatch_execution_events`. |
| Production report snapshot | `data/dispatch/production_logs.json` remains the compatibility current-state snapshot for dashboards and legacy screens, with PostgreSQL shadow-write support to `shift_production_log`. |
| Mobile time and inspection | `MobileWorkQueueService` stores detailed labor and inspection captures separately; dispatch production reports do not replace those paths. |
| Machine downtime and alarms | Manual downtime in dispatch reports is operator-entered execution context; machine-originated alarms remain in MES alarm/connectivity services. |
| AI and analytics | `AiSchedulingController`, prediction files/tables, and `advisory_projection` remain projection-only and cannot write execution truth. |

## H1-H10 Reaudit Results

- H1 confirmed. Dispatch truth is still file-backed while richer DB schema exists in `043_production_dispatch_shift_targets.sql`, `076_canonical_mes_execution_spine.sql`, and `098_canonical_manufacturing_event_backbone.sql`. Remediation: added migration `107_phase1_shopfloor_execution_bridge.sql` and a PostgreSQL shadow-write bridge while keeping file authority for compatibility.
- H2 confirmed. The previous write path overwrote one production snapshot per target and did not journal target lifecycle writes. Remediation: added `production_report_events.json` and `execution_events.json` so accepted reports and target lifecycle events preserve append-only history while snapshots remain legacy current state.
- H3 partially confirmed. Reason-code and time validation existed, but correction, overproduction, target completion, target edit constraints, and blank-assignment behavior were weak. Remediation: added explicit correction, overproduction, completion, operator-assignment guards, state-based target edit locks, and supervisor override reasons.
- H4 refuted for current operator dispatch. `getOperatorDispatch()` reads targets and logs once, builds a log map, and scans targets once. Remediation: narrowed returned tasks to dispatched/in-progress/completed work so planned targets do not leak to operators.
- H5 confirmed. Blank `operator_id` targets were reportable by any operator. Remediation: normal operators are blocked unless a planner/manager override role submits.
- H6 mostly refuted. Downtime, NG, rework, and blockers already use master-data catalogs. Remediation retained that path and kept legacy defect type mapping into governed `defect_catalog`.
- H7 partially confirmed. Dispatch had CNC program/setup links but missed several digital-thread fields. Remediation added routing, operation revision, setup sheet revision, inspection plan, traveler, material lot, heat-number, company, legal entity, plant, and site continuity, with conservative enrichment from order truth. Dispatch can now enforce CNC program and inspection-plan references with `reference_policy: "enforce_dispatch"` while defaulting to warning mode for backward compatibility.
- H8 confirmed. Quantity-only auto-completion was too naive. Remediation: target completion now requires explicit completion intent and `actual_end`, with good quantity meeting target.
- H9 refuted. AI/advisory data is still marked projection-only and is not used as execution authority. Remediation kept that separation in event history and docs.
- H10 confirmed for first-piece gating and partially refuted for qualifications. Mobile task start already uses `WorkforceQualificationGateService`; dispatch report submission has a connected-governance entitlement hook. Remediation added first-piece quality gate enforcement against mobile inspection captures plus supervisor override semantics.

## Remediation Strategy

The least-risk path is a staged bridge:

1. Preserve existing MVC actions and legacy response shapes.
2. Keep `targets.json` and `production_logs.json` as live compatibility stores.
3. Add append-only production report event history beside the snapshot.
4. Use event history for idempotency replay after later snapshot updates.
5. Serialize file-backed dispatch mutations under one dispatch state lock: planner target create/update/dispatch protects `targets.json` and `execution_events.json`, operator reporting protects target/snapshot/report-event/lifecycle-event reads, idempotency checks, event append, snapshot update, and target lifecycle update, and multi-file dispatch read models use a shared lock for consistent target/log pairs.
6. Add explicit report governance for planned/completed target lifecycle, correction override, backdate override, future timestamps, offline replay identifiers, pause/resume event markers, first-piece gate enforcement, and target edit overrides.
7. Add lightweight CNC digital-thread reference warnings by default, with opt-in strict dispatch blocking through `reference_policy`.
8. Append canonical manufacturing events as read-model projections only.
9. Mirror accepted dispatch targets, production report facts, and target lifecycle facts into PostgreSQL bridge tables when DB mode is active, while deferring final DB authority cutover until controlled backfill and reconciliation can be performed.

## Deferred Items

- Full DB authority cutover for dispatch targets and production reports. This patch adds a PostgreSQL bridge, but JSON remains the compatibility write authority until deployment backfill and reconciliation are completed.
- DB-enforced route/operation/inspection-plan foreign keys. Current support includes enrichment, warning-mode validation, and opt-in strict dispatch blocking for CNC program and inspection-plan references.
- Full dispatch skill/certification matrix enforcement. Current support preserves the connected-governance entitlement hook, but certification-depth rules remain staged.
- Full MTConnect/OPC-UA ingestion. Phase 1 only preserves stable machine/equipment and timestamp semantics for later ingestion.
- Repository-wide PHPStan closure remains outside this scoped shopfloor patch; focused changed-file analysis is clean while unrelated existing debt remains.

## Follow-up Reaudit Hardening Applied

- Target update aliases are normalized before lifecycle lock checks, and conflicting canonical/alias payloads are rejected.
- Completed and cancelled targets no longer accept locked-field edits through a free-text override reason.
- `due_at` is lifecycle-locked after dispatch because it changes execution commitment and delay analytics.
- Online production reports without a client idempotency key receive deterministic server-derived keys; replay returns the same response envelope shape.
- Dispatch lifecycle events distinguish `dispatch.downtime_reported` and `dispatch.production_blocked`.
- Mobile first-piece captures now preserve operation, inspection plan, machine/equipment, work center, result, device, and offline metadata needed by the execution quality gate.
- PostgreSQL bridge rows preserve org scope on targets/logs and report `partial` unless all production bridge components mirror.
- `mom.dispatch` is registered as a governed source system in migration `107_phase1_shopfloor_execution_bridge.sql`.
- CNC program `current_rev` updates only after approval, and setup sheets carry revision history for traceable target references.
