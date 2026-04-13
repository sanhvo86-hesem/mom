# Phase 1 AI-Ready Shopfloor Foundation

## Purpose

Phase 1 captures reliable manual execution truth for a CNC machining factory without adding autonomous scheduling, machine control, or fake AI. The implementation extends the existing dispatch and mobile-adjacent execution flow so later analytics and AI can consume clean shift-level facts.

## Source of Truth

| Concept | Authoritative source today | Notes |
| --- | --- | --- |
| Sales order | `data/orders/orders.json` through `OrderService` | Database tables exist, but the live MVC order flow uses the governed JSON compatibility store. |
| Job order | `data/orders/orders.json` through `OrderService` | Preserves SO to JO hierarchy and workflow rules. |
| Work order | `data/orders/orders.json` through `OrderService` | Dispatch references `wo_number`; it does not create another work order model. |
| Planner dispatch target | `data/dispatch/targets.json` through `DispatchController` and `ShopfloorExecutionService` | Mirrors migration `043_production_dispatch_shift_targets.sql` shape while preserving current file-backed behavior. |
| Operator assigned work | `dispatch_operator_tasks` from `DispatchController::getOperatorDispatch()` | Returns legacy `tasks` plus compact `task_cards`; no second queue is introduced. |
| Operator production report | `data/dispatch/production_logs.json` snapshot plus `data/dispatch/production_report_events.json` event history through `DispatchController::reportProduction()` and `ShopfloorExecutionService` | The event history preserves accepted manual execution reports; the snapshot remains the compatibility current-state read model for dashboards and existing screens. |
| Operator time entry | `data/mobile/time_entries/*.json` through `MobileWorkQueueService` | Remains the detailed mobile labor clock path; Phase 1 dispatch reporting does not replace it. |
| Inspection capture | `data/mobile/inspections/*.json` through `MobileWorkQueueService` | Remains the tablet/mobile inspection path. Production logs may carry defect reasons but are not inspection records. |
| Machine/equipment | `data/master-data/master-data.json` and schema tables such as `equipment` | Dispatch stores stable `machine_id` and `equipment_id` for later MTConnect/OPC-UA mapping. |
| Work center | Master data/schema `work_centers` and canonical `org_work_center` | Dispatch records `work_center_id` when known for ISA-95 alignment. |
| Reason codes | `data/master-data/master-data.json` | Uses `downtime_reason_codes`, `downtime_resolution_codes`, and `defect_catalog`; no brittle hardcoded production reason list. |
| Machine alarm/downtime | MES alarm/connectivity services and master-data alarm catalogs | Phase 1 manual downtime is captured as structured downtime events in production logs; machine-originated alarms stay separate. |
| Schedule/capacity | Existing scheduling/AI scheduling JSON endpoints remain advisory | Dispatch target truth is not overwritten by AI schedule slots. |
| AI prediction/projection | AI scheduling JSON files and deterministic `advisory_projection` fields | Projection-only. Never execution authority. |
| Manufacturing event history | `ManufacturingEventBackboneService` / `mes_operational_event_ledger` or JSONL fallback | Dispatch reporting appends a best-effort work execution event for timeline/read-model continuity. |

## Bridge Decision

No parallel MES or AI truth store was added. The live write path remains dispatch-owned:

1. Planner creates or updates a dispatch target in `dispatch/targets.json`.
2. Operator retrieves assigned targets through `dispatch_operator_tasks`.
3. Operator reports execution through `dispatch_report_production`.
4. The accepted report is appended to `dispatch/production_report_events.json`.
5. The latest per-target snapshot is updated in `dispatch/production_logs.json` for legacy dashboards.
6. A best-effort manufacturing event projection is appended for digital-thread read models.

The manufacturing event append is not the source of truth and must not block production reporting. It exists so production history, release readiness, and later AI feature extraction can read a consistent event stream without changing the Phase 1 operator flow.

## Why This Is Lowest Risk

- It extends `DispatchController`, which already owns planner shift targets and operator production reporting.
- It does not introduce another dispatch queue, work order, or AI-only truth store.
- It keeps legacy payload compatibility by preserving existing fields and responses.
- It adds stricter validation only on operational writes where contradictory data would damage future analytics.
- It uses existing master-data reason catalogs instead of embedding reason lists in controller logic.
- It preserves ISA-95 boundaries: planning targets, execution actuals, mobile time/inspection, and AI advisory projections remain separate.

## Dispatch Target Contract

Existing action: `dispatch_create_target`

Required fields:

```json
{
  "wo_number": "WO-1001",
  "machine_id": "MC-5AX-01",
  "shift_date": "2026-04-13",
  "cycle_time_minutes": 4.5,
  "target_quantity": 100
}
```

Recommended CNC context:

```json
{
  "jo_number": "JO-1001",
  "part_number": "714-1101",
  "part_revision": "REV-C",
  "operation_seq": 20,
  "operation_name": "5-axis finish mill",
  "equipment_id": "MC-5AX-01",
  "work_center_id": "WC-5AX",
  "operator_id": "operator-1",
  "shift_code": "morning",
  "setup_time_minutes": 30,
  "standard_setup_minutes": 30,
  "expected_run_minutes": 450,
  "priority": 80,
  "dispatch_sequence": 1,
  "cnc_program_id": "NC-714-1101-OP20",
  "cnc_program_revision": "REV-C",
  "setup_sheet_id": "SETUP-714-OP20",
  "setup_sheet_revision": "REV-C",
  "inspection_plan_id": "IP-714-OP20",
  "notes": "Use released setup sheet."
}
```

Validation:

- `shift_date` must be `YYYY-MM-DD`.
- `shift_code` must be `morning`, `afternoon`, or `night`.
- If only one of `machine_id` or `equipment_id` is supplied, the dispatch target mirrors it into the other field to avoid machine/equipment alias drift.
- `cycle_time_minutes`, `target_quantity`, `dispatch_sequence`, and `shift_duration_minutes` must be positive.
- Quantity and time assumptions cannot be negative.
- `setup_time_minutes` cannot exceed `shift_duration_minutes`.
- When `data/orders/orders.json` has a matching work order, missing dispatch fields such as JO, operation, work center, operator, CNC program, setup estimates, traveler, and material lot are filled from the existing order source of truth. Dispatch does not create another work-order model.

Legacy portal aliases are accepted on input for compatibility: `wo_id`, `target_date`, `shift`, `cycle_time`, `setup_time`, `shift_duration`, and `target_qty`. They are normalized into canonical storage fields. Read responses include those legacy aliases as response-only compatibility fields so existing dispatch screens keep working without making aliases a second source of truth.

## Operator Work Contract

Existing action: `dispatch_operator_tasks`

Filters:

- `date`, default today.
- `operator_id`, only planners/managers can request another operator.
- `shift_code`, optional.

Response:

- `tasks` remains the legacy full target payload.
- `task_cards` is the new shopfloor-friendly compact view sorted by sequence and priority.
- Operator views only include `dispatched`, `in_progress`, and same-shift `completed` targets. Planned targets remain planner-controlled until explicitly dispatched.

## Production Report Contract

Existing action: `dispatch_report_production`

Required fields:

```json
{
  "target_id": "TGT-1001",
  "quantity_good": 80
}
```

AI-ready structured payload:

```json
{
  "target_id": "TGT-1001",
  "quantity_good": 80,
  "quantity_ng": 2,
  "quantity_rework": 1,
  "actual_setup_minutes": 35,
  "actual_run_minutes": 360,
  "downtime_events": [
    {
      "reason_code": "DT-TOOL-LIFE",
      "minutes": 20,
      "resolution_code": "tool_replaced",
      "notes": "Tool changed after wear check."
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
  "blocking_issues": [
    {
      "reason_code": "DT-MATL-WAIT",
      "severity": "major",
      "blocked_minutes": 5,
      "notes": "Material cart arrived late."
    }
  ],
  "completion_intent": "complete_target",
  "report_mode": "snapshot",
  "client_report_id": "tablet-7-shift-20260413-001",
  "idempotency_key": "tablet-7:TGT-1001:2026-04-13:morning"
}
```

Validation:

- Good, NG, rework, setup, run, idle, and reason detail quantities cannot be negative.
- NG quantity requires a known `defect_catalog.defect_code`.
- Rework quantity requires a known `defect_catalog.defect_code`.
- Idle/downtime minutes require a known `downtime_reason_codes.reason_code`.
- Blocking issues require a known downtime reason code and severity `minor`, `major`, or `critical`.
- Downtime resolution codes must exist in `downtime_resolution_codes`.
- `actual_end` cannot be earlier than `actual_start`.
- If detail quantities are supplied for NG or rework, their sum must match the reported category quantity.
- NG and rework reason codes are rejected unless the matching NG or rework quantity is greater than zero.
- Downtime reason codes are rejected unless downtime/idle minutes are also supplied or derived from a downtime event.
- Blank downtime rows are ignored; non-empty downtime rows require a known reason code.
- A target with no assigned operator cannot be reported by a normal operator; planner/manager roles are treated as explicit override actors.
- `report_mode` defaults to `snapshot`; `correction` requires an existing report and `correction_reason`.
- Over-target good quantity requires `overproduction_reason`.
- Target completion is no longer inferred from quantity alone. Completion requires `completion_intent` or `complete_target: true`, good quantity at least target quantity, and `actual_end`.

Legacy `ng_details` rows using `{ "type": "dimensional", "qty": 2 }` are accepted when `type` resolves to an active `defect_catalog.defect_group`, `defect_name`, or `defect_code`; the stored log still uses canonical `defect_code` and `quantity`. The seeded CNC defect catalog covers the existing dispatch UI groups: `dimensional`, `surface`, `material`, `visual`, `burr`, `thread`, `fod`, and `other`.

`idempotency_key` is enforced for file-backed production reporting against both the latest snapshot and the append-only event history. A replay with the same key and same normalized report fingerprint returns the original production log with `"replayed": true`; the same key with different target or execution facts returns `409 idempotency_conflict`. The current file-backed dispatch snapshot still preserves the existing one-log-per-target read behavior for reports without an idempotency key.

## Advisory Projection

Each production log now includes `advisory_projection`:

- `projection_only: true`
- deterministic delay risk hint: `normal`, `elevated`, or `high`
- data quality flags such as missing operation, CNC program, or run time
- numeric features for later analytics/AI consumption

This field is not execution authority and must not drive autonomous schedule changes or machine actions.

## Storage Notes

The schema already has DB-backed equivalents in migrations such as `043_production_dispatch_shift_targets.sql`, `076_canonical_mes_execution_spine.sql`, and `098_canonical_manufacturing_event_backbone.sql`. This Phase 1 implementation keeps file-backed dispatch as the compatibility authority and uses the existing manufacturing event backbone as a read-model bridge only. Production report writes update `production_report_events.json`, `production_logs.json`, and `targets.json` together with best-effort rollback if any atomic file write fails; this is not a replacement for a future database transaction boundary. A later migration can shadow-write dispatch files into `shift_targets`, `shift_production_log`, and the canonical MES event ledger without changing operator contracts.
