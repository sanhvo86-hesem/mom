# Domain: planning-production

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Governs the transformation of sales demand into executable shopfloor work through a strict SO → JO → WO hierarchy. Controls release gates, execution truth, quality holds, and schedule adherence so dispatch, capacity planning, and OTIF commitments all read the same authorized schedule and work state.

## Canonical Objects (Contracts)
- **Production Plan** (`planning_production--production-plans`): primary table `production_schedule`
- **Work Order** (`planning_production--work-orders`): primary table `work_orders`
- **Job Order** (`planning_production--job-orders`): primary table `job_orders`
- **Production Operation** (`planning_production--production-operations`)
- **Dispatch List** (`planning_production--dispatch-lists`)
- **IPQC Inspection** (`planning_production--ipqc-inspections`)

## Controllers
- `OrderController` → `mom/api/controllers/OrderController.php`
- `DispatchController` → `mom/api/controllers/DispatchController.php`
- `AllocationController` → `mom/api/controllers/AllocationController.php`
- `AiSchedulingController` → `mom/api/controllers/AiSchedulingController.php`

## Key Services
- **OrderService** — Read/write for SO/JO/WO; hierarchy navigation; customer PO linking; order number generation
- **OrderWorkflowService** — Status-transition rules, role-based guards, field-edit constraints by state, cancel/reopen governance
- **ShipmentGateService** — Post-production shipment readiness gate checks (10-point SG-01→SG-10)
- **SchedulingService** — Capacity scheduling, promise-date calculation

## Key Tables
- `production_schedule` — Production plan header (`Draft → Under Review → Approved → Published → Frozen → Completed/Cancelled`)
- `production_plan_lines` — Plan line items per part/WO
- `work_orders` — WO execution records (`work_order_status`)
- `job_orders` — JO records (`job_status`)
- `dispatch/targets.json` *(file)* — Planner-created shift production targets
- `dispatch/production_report_events.json` *(file)* — Append-only accepted manual production report events
- `dispatch/execution_events.json` *(file)* — Append-only dispatch target lifecycle events
- `dispatch/production_logs.json` *(file)* — Latest per-target production report snapshot for legacy dashboards
- `shift_targets` *(DB bridge when PostgreSQL mode is enabled)* — Shadow target rows keyed by `source_system` + `source_record_id`
- `shift_production_log` *(DB bridge when PostgreSQL mode is enabled)* — Shadow latest production report snapshot rows keyed by accepted report IDs
- `shift_production_report_events` *(DB bridge when PostgreSQL mode is enabled)* — Append-only shadow event rows from manual dispatch reports
- `shift_dispatch_execution_events` *(DB bridge when PostgreSQL mode is enabled)* — Append-only shadow target lifecycle rows from manual dispatch

## Workflow States

**Sales Order (SO):** Draft → Quoted → Confirmed → In Production → Shipped → Closed *(or Cancelled)*

**Job Order (JO):** Planned → Released → Active → On Hold → Completed → Closed *(or Cancelled)*

**Work Order (WO):** Scheduled → Setup → Running → Inspection → Completed *(or On Hold / Cancelled)*

**Production Plan:** Draft → Under Review → Approved → Published → Frozen → Completed *(Cancelled from early states)*

## Common Tasks & Entry Points
- **Create SO:** `OrderController::createSalesOrder()` → `OrderService::createSalesOrder()` → status = `draft`
- **Release JO:** `OrderController::transition()` → `OrderWorkflowService::validateTransition()` → checks SO is confirmed
- **Dispatch WO to floor:** `DispatchController::createTarget()` → `targets.json`, status = `planned`
- **Report production:** `DispatchController::reportProduction()` → appends `production_report_events.json`, appends `execution_events.json`, and updates `production_logs.json`; completion requires explicit intent plus actual end
- **Get operator tasks:** `DispatchController::getOperatorDispatch(operator_id, date)` → filtered by operator + `shift_date`
- **Allocate record ID:** `AllocationController::allocate(record_type, department)` → `RecordIdGenerator::allocate()`

## Business Rules
- **Hard hierarchy**: SO must be `confirmed` before JO can release; JO must be `released` before WO can dispatch
- **Quality hold**: WO can enter `quality_hold` from Released or In Production; must resolve explicitly before close
- **Schedule freeze**: once plan is `frozen`, changes require traceable override
- **Field-edit constraints by state**: `SO.total_qty` editable only in draft/quoted; `WO.machine_id` only in scheduled/setup
- **ECR required** for part_revision, material_spec, routing_id changes after order is released/active/running
- **Cancel/Reopen permissions**: manager+ to cancel; director+ to reopen from `closed`
- **Target reporting is replay-safe**: accepted reports append to `production_report_events.json`; the latest per-target snapshot is updated in `production_logs.json`; duplicate `idempotency_key` with the same fingerprint replays, while conflicts return `idempotency_conflict`; file-backed dispatch mutations share a read-modify-write lock
- **Target lifecycle is append-only**: create/update/dispatch/report/pause/resume/complete events append to `dispatch/execution_events.json`; target/log JSON files remain compatibility snapshots
- **Target completion is explicit**: quantity alone does not complete a target; completion requires completion intent and `actual_end`
- **State-based target edits are controlled**: after dispatch/in-progress, engineering and identity fields require `supervisor_override_reason`; completed/cancelled targets are locked except notes/metadata without override
- **Report governance is explicit**: planned targets cannot be reported by normal operators, completed targets require correction mode, corrections/backdates require planner override, and offline reports require replay-safe IDs
- **Manual pause/resume stays in the same execution ledger**: `dispatch_pause_target` and `dispatch_resume_target` route through the production-report ledger, require idempotency, and update `execution_state` without introducing a second execution command system
- **CNC digital-thread checks are staged**: dispatch references item revision, operation, CNC program, setup sheet, inspection plan, traveler, and material lots; default policy warns, while `reference_policy = enforce_dispatch` blocks missing or unreleased CNC/inspection references
- **First-piece quality gate is enforceable**: `first_piece_required` or `quality_gate_policy = enforce_first_piece` blocks production output/run reports until a passing mobile first-piece capture exists; supervisor overrides require `quality_override_reason`

## Notes / Gotchas
- **Inconsistent status field names**: SO = `status`, JO = `job_status`, WO = `work_order_status` — use the correct field per object type
- **Order number sequences are stateful**: `OrderService::generateOrderNumber()` is not atomic; concurrent calls can cause gaps
- **WorkflowService config dependency**: `OrderWorkflowService` reads `so_jo_wo_config.json`; if missing, falls back to legacy role permissions
- **Dispatch is shift-based**: targets filtered by `shift_date` + `shift_code`; shift definitions come from master data
- **Dispatch storage is staged with a DB bridge**: file-backed planner target mutations and production-report read-modify-write are serialized with an exclusive dispatch lock, target/log read models use a shared lock, and PostgreSQL mode shadow-writes to `shift_targets`, `shift_production_log`, `shift_production_report_events`, and `shift_dispatch_execution_events`; JSON remains compatibility authority until a controlled DB cutover
