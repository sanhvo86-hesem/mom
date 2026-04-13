# Dispatch Execution API Contracts

These contracts extend the existing dispatch routes without replacing the custom MVC router, middleware, CSRF, auth, audit, or legacy JSON fallback behavior.

## Create target

Endpoint: existing dispatch create-target route handled by `DispatchController::createTarget()`

Required fields:

```json
{
  "wo_number": "WO-1001",
  "machine_id": "MC-5AX-01",
  "shift_date": "2026-04-13",
  "target_quantity": 100,
  "cycle_time_minutes": 4.5
}
```

Recommended CNC fields:

```json
{
  "jo_number": "JO-1001",
  "work_center_id": "WC-5AX",
  "operator_id": "operator-1",
  "shift_code": "morning",
  "operation_seq": 20,
  "operation_id": "OP20",
  "part_number": "714-1101",
  "part_revision": "REV-C",
  "cnc_program_id": "NC-714-1101-OP20",
  "cnc_program_revision": "V4",
  "setup_sheet_id": "SETUP-714-OP20",
  "setup_sheet_revision": "A",
  "inspection_plan_id": "IP-714-OP20",
  "first_piece_required": true,
  "quality_gate_policy": "enforce_first_piece",
  "org_company_code": "HESEM",
  "org_plant_id": "P01",
  "material_lot_number": "LOT-174PH-001",
  "heat_number": "HEAT-001",
  "traveler_number": "TRV-001"
}
```

Response additions:

- `storage_bridge`: JSON-only skip or PostgreSQL mirror result.
- `execution_event`: append-only lifecycle event for `dispatch.target_created`.
- `execution_event_bridge`: DB mirror result for the lifecycle event.

## Update target

Endpoint: existing dispatch update-target route handled by `DispatchController::updateTarget()`

State rules:

- `planned`: target fields can be edited normally.
- `dispatched` / `in_progress`: identity, engineering, quality, shift, and target quantity fields require `supervisor_override_reason`.
- `completed` / `cancelled`: only notes/metadata are normal edits; locked-field changes are rejected even with free-text override reason and must use a dedicated correction workflow.

Example override:

```json
{
  "target_id": "TGT-123",
  "machine_id": "MC-5AX-02",
  "supervisor_override_reason": "Machine reassigned after spindle alarm."
}
```

Validation errors:

- `target_update_requires_supervisor_override:<field-list>`
- `target_locked_after_completion`
- `target_locked_after_cancellation`

## Dispatch target

Endpoint: existing dispatch dispatch-target route handled by `DispatchController::dispatchTarget()`

Request:

```json
{
  "target_id": "TGT-123"
}
```

Behavior:

- Recalculates strict digital-thread blockers at dispatch time when `reference_policy` is `enforce_dispatch`.
- Writes target snapshot and `dispatch.target_dispatched` lifecycle event under the same dispatch state lock.

## Operator work retrieval

Endpoint: existing operator dispatch route handled by `DispatchController::getOperatorDispatch()`

Behavior:

- Operators can fetch only their own assigned work unless they have planner/write role.
- Targets and logs are read once under a shared dispatch state lock.
- Response includes full legacy `tasks` plus compact `task_cards`.

## Production report

Endpoint: existing report-production route handled by `DispatchController::reportProduction()`

Example payload:

```json
{
  "target_id": "TGT-123",
  "quantity_good": 80,
  "quantity_ng": 2,
  "quantity_rework": 1,
  "actual_setup_minutes": 35,
  "actual_run_minutes": 360,
  "actual_idle_minutes": 20,
  "actual_start": "2026-04-13T08:00:00Z",
  "actual_end": "2026-04-13T15:30:00Z",
  "downtime_events": [
    {
      "reason_code": "DT-TOOL-LIFE",
      "minutes": 20,
      "resolution_code": "tool_replaced"
    }
  ],
  "ng_details": [
    {
      "defect_code": "DEF-DIM",
      "quantity": 2
    }
  ],
  "rework_details": [
    {
      "defect_code": "DEF-SURF",
      "quantity": 1
    }
  ],
  "idempotency_key": "tablet-1:TGT-123:2026-04-13:morning",
  "client_report_id": "tablet-1-report-001"
}
```

Report validation:

- quantities must be non-negative integers,
- time values must be non-negative,
- `actual_end` must not be before `actual_start`,
- timestamps must fit the shift date, with night-shift next-day allowance,
- NG/rework quantities require governed defect codes,
- downtime/blocked events require governed reason codes,
- overproduction requires `overproduction_reason`,
- offline reports require `idempotency_key` and `client_report_id`,
- online reports should provide `idempotency_key`; when omitted, the server derives a deterministic `server:*` key from the normalized report fingerprint so exact retries are replay-safe,
- completed target snapshots require correction mode and planner/supervisor override.

Response additions:

- `production_event`: append-only production report event.
- `dispatch_execution_event`: lifecycle event referencing the production event.
- `storage_bridge`: DB mirror result for target/log/report event.
- `execution_event_bridge`: DB mirror result for lifecycle event.

## Pause and resume

Endpoints: existing pause/resume routes handled by `pauseTarget()` and `resumeTarget()`

Pause requires an idempotency key and a downtime/blocking reason context. Resume requires `resumed_from_event_id`. Both write through the same report/event ledger.

Lifecycle event typing stays distinct:

- `progress` and normal reports emit `dispatch.production_reported`.
- `downtime` emits `dispatch.downtime_reported`.
- `blocked` emits `dispatch.production_blocked`.
- `pause` and `resume` emit pause/resume lifecycle events.
- completion intent emits `dispatch.target_completed` after validation.

## First-piece quality gate

When `first_piece_required=true` or `quality_gate_policy=enforce_first_piece`, production output/run reporting is rejected until a passing mobile first-piece inspection capture exists for the same work order, operation, and inspection plan.

Mobile inspection capture must preserve the execution context used by the gate when known:

```json
{
  "wo_number": "WO-1001",
  "jo_number": "JO-1001",
  "operation_seq": 20,
  "inspection_plan_id": "IP-714-OP20",
  "machine_id": "MC-5AX-01",
  "work_center_id": "WC-5AX",
  "capture_type": "first_piece",
  "overall_result": "pass",
  "measurements": []
}
```

Supervisor override example:

```json
{
  "target_id": "TGT-123",
  "quantity_good": 5,
  "actual_run_minutes": 25,
  "quality_override_reason": "QA approved paper first-piece record during tablet outage."
}
```

The override is accepted only for planner/write roles and is recorded as `quality_gate.status=overridden`.

## Backward compatibility

- Existing legacy field aliases remain accepted, including `wo_id`, `target_date`, `shift`, `cycle_time`, `setup_time`, and `target_qty`.
- If a payload provides both canonical and alias fields with conflicting values during target update, the request is rejected instead of letting the alias bypass lifecycle locks.
- JSON files remain the live fallback store.
- New event and bridge fields are additive response fields. `storage_bridge.status=mirrored` means target, snapshot, and production-event mirror writes all succeeded; otherwise it is `partial`, `failed`, `skipped`, or `replayed` with UUID fields showing exactly what mirrored.
- AI/advisory fields remain projection-only and do not change execution authority.
