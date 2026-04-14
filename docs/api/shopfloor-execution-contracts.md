# Shopfloor Execution API Contracts

Date: 2026-04-14

Scope: Phase 1 CNC shopfloor manual-input foundation using the existing custom MVC routes, middleware, CSRF, role, audit, dispatch, mobile, and AI advisory patterns.

## Planner shift target creation

Handler: existing dispatch target create route in `DispatchController`.

Minimum payload:

```json
{
  "wo_number": "WO-1001",
  "machine_id": "MC-5AX-01",
  "shift_date": "2026-04-13",
  "shift_code": "morning",
  "target_quantity": 80
}
```

CNC digital-thread payload when available:

```json
{
  "jo_number": "JO-1001",
  "work_center_id": "WC-5AX",
  "operator_id": "operator-1",
  "operation_seq": 20,
  "operation_id": "OP20",
  "operation_revision": "C",
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
  "org_legal_entity_code": "HESEM-VN",
  "org_plant_id": "P01",
  "org_site_id": "HCM-CNC",
  "material_lot_number": "LOT-174PH-001",
  "heat_number": "HEAT-001",
  "traveler_number": "TRV-001",
  "priority": 10,
  "sequence": 30,
  "notes": "Run after fixture preload."
}
```

Rules:

- Required values must be nonblank and dates must be valid ISO-style dates.
- Target quantity must be a positive manufacturing quantity.
- Digital-thread fields are copied as execution context and do not redefine master data truth.
- JSON target store remains compatibility authority; DB bridge writes are migration/readiness mirrors.

## Target dispatch and lifecycle

Handler: existing dispatch route in `DispatchController`.

Dispatch payload:

```json
{
  "target_id": "TGT-1001"
}
```

Lifecycle rules:

- `planned` targets can be edited by planners.
- `dispatched` and `in_progress` targets require supervisor override reason for identity, shift, engineering, target quantity, and quality-gate field changes.
- `completed` and `cancelled` targets are locked for normal edits.
- Pause, resume, blocked, downtime, and completion are execution events, not a second work-order abstraction.

## Schedule compatibility aliases

Existing order-prefixed schedule action aliases remain available for backward compatibility:

- `order_schedule_get`
- `order_schedule_slot`
- `order_schedule_update`
- `order_capacity_heatmap`
- `order_promise_suggest`

Behavior:

- The aliases route to the existing scheduling controller handlers, not to order ownership logic.
- Schedule slot create/update requires authenticated scheduling write authority and CSRF.
- Create/update validates `YYYY-MM-DD` dates, 24-hour `HH:MM` times, same-day `end_time > start_time`, and priority values `low`, `normal`, `high`, or `urgent`.
- Scheduling remains planning/advisory capacity context. Dispatch target creation remains the execution-intent path for shopfloor work.

## Operator work retrieval

Handler: existing operator dispatch route in `DispatchController`.

Behavior:

- Operators receive only their assigned work for the selected shift/day unless the actor has planner/write authority.
- Blank assignment does not create an open-to-all report path.
- Response may include legacy task fields and compact task cards. The compact shape should preserve `target_id`, `wo_number`, `operation_seq`, `machine_id`, `equipment_id`, `work_center_id`, `shift_date`, `shift_code`, `target_quantity`, `reported_quantity`, `remaining_quantity`, and quality-gate status when available.
- Mobile task completion persists `result`, `qty_completed`, `qty_scrap`, `quantity_completed`, `quantity_scrap`, and `completion_reason_code` on the existing mobile work queue snapshot. Non-`pass` outcomes and any scrap require a structured reason code; `qty_scrap` may not exceed `qty_completed`.
- Mobile task assignment, start, and completion append `mobile.task_assigned`, `mobile.task_started`, and `mobile.task_completed` records to `mobile/task_events.json`; the queue row is the current snapshot.
- Mobile task completion requires the task to be `in_progress`. Completed tasks cannot be overwritten through the normal completion endpoint.
- Mobile offline conflict resolution is owner-scoped. Supervisor/admin-style override requires explicit override reason and is audited.

## Production report

Handler: existing production-report route in `DispatchController` backed by `ShopfloorExecutionService`.

Payload:

```json
{
  "target_id": "TGT-1001",
  "quantity_good": 72,
  "quantity_ng": 2,
  "quantity_rework": 1,
  "actual_setup_minutes": 35,
  "actual_run_minutes": 310,
  "actual_idle_minutes": 18,
  "actual_start": "2026-04-13T08:00:00Z",
  "actual_end": "2026-04-13T14:15:00Z",
  "downtime_events": [
    {
      "reason_code": "DT-TOOL-LIFE",
      "minutes": 18,
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
  "blocking_issues": [],
  "idempotency_key": "tablet-1:TGT-1001:2026-04-13:morning:report-1",
  "client_report_id": "tablet-1-report-1",
  "issue_notes": "Tool changed after dimensional drift."
}
```

Validation rules:

- Quantities must be non-negative integers.
- Actual time values must be non-negative.
- `actual_end` cannot be before `actual_start`.
- Production timestamps must fit the shift date rules already enforced by the service.
- NG and rework quantities require governed defect codes.
- Downtime requires governed downtime codes and resolution codes when supplied.
- Blocking issues require governed `blocking_reason_codes`; downtime codes are not accepted as blocker codes.
- Overproduction requires explicit reason.
- Completed target corrections require correction/override semantics.
- Offline reports require idempotency and client report identity. Online exact retries receive a deterministic server-derived idempotency key when a client key is omitted.

## Blocking reason semantics

Canonical blocker catalog: `blocking_reason_codes`.

Seeded examples:

- `BLK-MATL-WAIT`: material, fixture, or outsource lot not available.
- `BLK-QUAL-HOLD`: quality disposition, first-piece, or inspection release pending.
- `BLK-ENG-CLARIFY`: engineering, drawing, setup, or CNC program clarification required.
- `BLK-OPERATOR-AUTH`: qualified operator, certification, or supervisor authorization missing.

Downtime reason codes are for machine/labor loss. Blocking reason codes are for work-not-executable conditions. They are intentionally separate.

## Mobile first-piece inspection capture

Handler: existing mobile inspection capture route in `MobileController`, backed by `MobileWorkQueueService::captureInspection()`.

Payload:

```json
{
  "queue_id": "Q-1001",
  "wo_number": "WO-1001",
  "jo_number": "JO-1001",
  "operation_seq": 20,
  "inspection_plan_id": "IP-714-OP20",
  "machine_id": "MC-5AX-01",
  "equipment_id": "MC-5AX-01",
  "work_center_id": "WC-5AX",
  "capture_type": "first_piece",
  "overall_result": "pass",
  "measurements": [
    {
      "characteristic": "OD-1",
      "value": 10.002,
      "unit": "mm",
      "lower_spec": 9.99,
      "upper_spec": 10.01,
      "pass_fail": "pass"
    }
  ],
  "client_capture_id": "tablet-1-fp-1",
  "idempotency_key": "tablet-1:WO-1001:OP20:first-piece:1",
  "captured_at": "2026-04-13T08:45:00Z",
  "device_id": "tablet-1"
}
```

Validation rules:

- `operator_id` is derived from authenticated actor and must be nonblank.
- `wo_number` is required.
- `capture_type` must be one of `first_piece`, `in_process`, `final`, or `receiving`.
- First-piece capture requires at least one structured measurement.
- Measurement values must be numeric when supplied.
- `pass_fail` must be `pass`, `fail`, or `conditional`.
- `overall_result` must be `pass`, `fail`, or `conditional`; it is derived from measurements when possible.
- Offline capture requires a replay key: `client_capture_id` or `idempotency_key`.
- The controller forwards replay identity fields: `capture_id`, `client_capture_id`, `client_record_id`, `idempotency_key`, and `captured_at`.
- Exact replay returns the existing fact; conflicting replay under the same client/idempotency key is rejected.

Storage behavior:

- The JSON mobile inspection store remains the compatibility write store.
- When DB mode is available, accepted captures are mirrored to `mobile_inspection_captures`.
- Migration `108_mobile_inspection_execution_bridge.sql` adds `equipment_id`, `work_center_id`, `client_capture_id`, `idempotency_key`, and `inspection_fingerprint` to support reconciliation.

## First-piece gate and override

When a target has `first_piece_required=true` or `quality_gate_policy=enforce_first_piece`, production output/run reporting is blocked until a passing first-piece inspection exists for the work order plus operation and inspection plan when supplied.

Override payload:

```json
{
  "target_id": "TGT-1001",
  "quantity_good": 5,
  "actual_run_minutes": 25,
  "quality_override_reason": "QA approved paper first-piece record during tablet outage.",
  "idempotency_key": "supervisor:TGT-1001:first-piece-override:1"
}
```

Override rules:

- Override requires planner/supervisor style write authority.
- Override is recorded in quality-gate context and advisory data-quality flags.
- Override does not approve an inspection, close an NCR, or command equipment.

## AI advisory feedback

Handler: existing AI feedback route in `AiSchedulingController::aiFeedbackSubmit()`.

Payload:

```json
{
  "prediction_id": "PRED-1001",
  "feedback_type": "helpful",
  "notes": "Delay risk matched the shift outcome.",
  "idempotency_key": "planner-1:PRED-1001:feedback-1"
}
```

Rules:

- Actor must be authenticated and authorized for AI feedback write.
- CSRF is required.
- Feedback write is idempotent.
- Feedback is advisory analytics data only and cannot mutate dispatch or execution state.
- Critical prediction recommendation records remain `pending` and carry `advisory_only: true`, `execution_authority: false`, and `requires_human_approval: true`. They may point a human to quality, maintenance, tooling, or planning review, but they do not create NCRs, maintenance work, tool orders, schedule moves, or machine commands.
- AI model list, prediction list, SPC anomaly, tool-wear, legacy dashboard, and combined dashboard endpoints require AI read roles. Model config, metadata, and training source fields are only returned to admin roles.
- Dashboard prediction and schedule metrics are plant-scoped where plant context is available, including mean time to action.

## AI natural-language query

Handler: existing AI route in `AiSchedulingController::aiNlQuery()`.

Payload:

```json
{
  "question": "Show critical defect probability predictions for CNC-01 this week",
  "context_type": "production_query"
}
```

Rules:

- Actor must be authenticated and hold an AI read role such as quality, production planning/management, CNC workshop management, engineering management/lead, supervisor, shift lead, or admin.
- CSRF is required because the route writes conversation history and may trigger external advisory processing.
- The service validates generated SQL as SELECT/CTE only, rejects DDL/DML and dangerous functions, caps rows, runs in a PostgreSQL read-only transaction, and sets `statement_timeout` inside that transaction.
- The NLQ prompt uses canonical AI prediction types: `defect_probability`, `tool_wear`, `spc_anomaly`, `process_drift`, and `equipment_failure`.
- NLQ is read-only advisory access. It cannot dispatch work, approve quality, alter schedules, create NCRs, or command machines.

## AI root-cause analysis

Handler: existing AI route in `AiSchedulingController::aiRcaAnalyze()`.

Payload:

```json
{
  "ncr_id": "NCR-1001"
}
```

Rules:

- Actor must be authenticated and hold admin, `quality_manager`, or `quality_engineer` access.
- CSRF is required.
- RCA output is advisory. Any NCR disposition, CAPA, waiver, shipment gate, or production release must still go through governed EQMS/MOM write paths.

## Evidence upload safety

Evidence upload and governance attachment paths validate:

- temporary file exists and is readable
- file size is greater than zero and no more than 50 MB
- MIME type is detected from file bytes
- extension fallback is allowed only for generic/ambiguous byte detection, not for concrete disallowed content
- explicit idempotency keys must be 16 to 128 characters and use only letters, numbers, `.`, `_`, or `-`

## Planning and EQMS controlled update surfaces

- JO and WO generic update routes use explicit field allowlists before workflow validation. Unknown top-level fields are rejected instead of being silently added to the JSON authority store.
- WO schedule edits reject `scheduled_end <= scheduled_start` when both timestamps are supplied.
- WO creation and update contracts preserve optional CNC/digital-thread fields: `routing_operation_id`, `job_operation_id`, `cnc_program_version_id`, `setup_sheet_id`, `setup_sheet_revision`, `org_plant_id`, and `org_site_id`.
- EQMS complaint/MRB/deviation/concession generic updates cannot mutate lifecycle fields such as `status`, `status_history`, closure, approval, or rejection metadata. Those changes must use transition or change-control paths.
- Genealogy DB constraint migration `121_genealogy_runtime_ontology_constraints.sql` aligns `genealogy_nodes` and `as_manufactured_snapshots` with the runtime graph ontology; it does not make AI or analytics execution authority.

## Backward compatibility

- Existing legacy aliases remain accepted where already supported.
- New fields are additive and do not remove current response fields.
- JSON fallback remains live for current deployment.
- New DB bridge columns are optional and added with `IF NOT EXISTS`.
- Mobile large body reads are route-scoped to support offline tablet batches without changing the global request limit for every route.
