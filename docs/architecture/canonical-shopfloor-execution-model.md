# Canonical Shopfloor Execution Model

This document defines the Phase 1 canonical execution model for CNC/discrete manufacturing while preserving the existing custom MVC architecture and legacy fallback behavior.

## Source of truth

| concept | Phase 1 authority | competing/projection sources | rule |
|---|---|---|---|
| Sales order | Planning/order store and order APIs | Analytics snapshots | Dispatch does not redefine sales orders. |
| Job order | Planning/order store and work order enrichment | Dispatch target copy fields | Dispatch stores trace references only. |
| Work order | Existing work order/order store | Mobile queue work items | `wo_number` remains the dispatch/report join key. |
| Dispatch target | `data/dispatch/targets.json` through `DispatchController` | `shift_targets` PostgreSQL mirror | JSON is live compatibility authority; DB is audited bridge until cutover. |
| Operator assignment | Dispatch target `operator_id` | Mobile queue assignee | Reports require assigned operator or planner/supervisor override. |
| Production report snapshot | `data/dispatch/production_logs.json` | `shift_production_log` PostgreSQL mirror | Snapshot is latest derived state per target. |
| Production report event | `data/dispatch/production_report_events.json` | `shift_production_report_events` PostgreSQL mirror | Primary replay/idempotency source, with compatibility snapshot fallback for pre-event records. |
| Dispatch lifecycle event | `data/dispatch/execution_events.json` | `shift_dispatch_execution_events` PostgreSQL mirror | Append-only lifecycle history for target created/updated/dispatched/reported/downtime/blocked/paused/resumed/completed. |
| Inspection capture | `MobileWorkQueueService::captureInspection()` JSON compatibility store with `mobile_inspection_captures` DB bridge | Dispatch report `quality_gate` result | Dispatch reads first-piece status; it does not replace inspection capture. |
| Machine/equipment | Existing machine/equipment master data references | Connectivity projections/alarms | Dispatch requires stable `machine_id`/`equipment_id` values. |
| Work center | Existing work center references | Report/task card copies | Dispatch preserves trace reference. |
| Downtime/alarm | Manual downtime reason events now; connectivity alarms later | Machine alarm stores | Phase 1 manual downtime is not machine telemetry. |
| Schedule/capacity slot | Planning/scheduling modules | Dispatch target shift fields | Dispatch captures execution intent, not APS authority. |
| AI prediction/projection | Advisory analytics/AI modules | Dispatch `advisory_projection` | AI remains projection-only and cannot write execution state. |
| CNC program version | CNC program/version files through `CncProgramController` | Dispatch target copied `cnc_program_id`/revision | Pending uploads stay separate from `current_rev` until approval. |
| Setup sheet revision | CNC setup sheet store through `CncProgramController` | Dispatch target copied setup sheet fields | Setup sheet updates now carry revision history so targets can freeze a revision. |

## Event vs snapshot rules

- `targets.json` is the current target snapshot used by existing dispatch/mobile flows.
- `production_logs.json` is the latest production report snapshot per target.
- `production_report_events.json` is append-only report history.
- `execution_events.json` is append-only dispatch lifecycle history.
- PostgreSQL bridge tables mirror accepted events/snapshots when DB mode is available.
- If a snapshot and event disagree, event history is used for audit/replay and the snapshot is treated as derived state that must be reconciled.

## Target state machine

Allowed high-level target statuses:

- `planned`: planner can edit dispatch and engineering context fields.
- `dispatched`: sent to operator; identity/engineering fields require supervisor override reason.
- `in_progress`: reporting has started; identity/engineering fields require supervisor override reason.
- `completed`: normal edits are locked except notes/metadata; corrections use report correction mode and supervisor override.
- `cancelled`: normal edits are locked except notes/metadata; execution reporting is rejected.

Execution sub-state is carried separately where needed:

- `running`
- `paused`
- `blocked`
- `completed`

This keeps backward compatibility with existing target status consumers while adding manufacturing-grade pause/resume/block semantics.

## Quality gate rules

- Target fields:
  - `inspection_plan_id`
  - `first_piece_required`
  - `quality_gate_policy`
- Policy values:
  - `warn`: record missing first-piece capture as advisory data quality.
  - `enforce_first_piece`: reject production output/run reporting until a passing first-piece capture exists.
- Passing first-piece evidence is read from the existing mobile inspection capture store.
- Supervisor override requires planner/write role plus `quality_override_reason`; override is recorded in the production log quality gate and lifecycle event context.

## Digital thread fields

Execution payloads preserve:

- `org_company_code`, `org_legal_entity_code`, `org_plant_id`, `org_site_id`
- `wo_number`, `jo_number`
- `item_id`, `part_number`, `part_revision`
- `routing_id`, `operation_seq`, `operation_id`, `operation_revision`
- `machine_id`, `equipment_id`, `work_center_id`
- `operator_id`, `shift_date`, `shift_code`
- `cnc_program_id`, `cnc_program_revision`
- `setup_sheet_id`, `setup_sheet_revision`
- `inspection_plan_id`
- `material_lot_number`, `heat_number`, `traveler_number`

## Bridge and migration decision

This patch does not flip dispatch authority directly to PostgreSQL because that would risk breaking legacy fallback behavior. Instead:

- write through the existing controller/service path,
- keep JSON as live compatibility store,
- mirror accepted facts into PostgreSQL bridge tables,
- make event history complete enough to validate a later DB-primary cutover.

## AI boundary rules

- AI scheduling endpoints remain advisory.
- Dispatch/report payloads are operational truth.
- `advisory_projection` fields are deterministic features only.
- No AI path can mark a target complete, dispatch work, command equipment, or write production truth.
