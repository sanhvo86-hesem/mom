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
- `dispatch/production_logs.json` *(file)* — Operator-reported actual output (good/NG/rework/downtime)

## Workflow States

**Sales Order (SO):** Draft → Quoted → Confirmed → In Production → Shipped → Closed *(or Cancelled)*

**Job Order (JO):** Planned → Released → Active → On Hold → Completed → Closed *(or Cancelled)*

**Work Order (WO):** Scheduled → Setup → Running → Inspection → Completed *(or On Hold / Cancelled)*

**Production Plan:** Draft → Under Review → Approved → Published → Frozen → Completed *(Cancelled from early states)*

## Common Tasks & Entry Points
- **Create SO:** `OrderController::createSalesOrder()` → `OrderService::createSalesOrder()` → status = `draft`
- **Release JO:** `OrderController::transition()` → `OrderWorkflowService::validateTransition()` → checks SO is confirmed
- **Dispatch WO to floor:** `DispatchController::createTarget()` → `targets.json`, status = `planned`
- **Report production:** `DispatchController::reportProduction()` → `production_logs.json`; auto-completes if achievement ≥ 100%
- **Get operator tasks:** `DispatchController::getOperatorDispatch(operator_id, date)` → filtered by operator + `shift_date`
- **Allocate record ID:** `AllocationController::allocate(record_type, department)` → `RecordIdGenerator::allocate()`

## Business Rules
- **Hard hierarchy**: SO must be `confirmed` before JO can release; JO must be `released` before WO can dispatch
- **Quality hold**: WO can enter `quality_hold` from Released or In Production; must resolve explicitly before close
- **Schedule freeze**: once plan is `frozen`, changes require traceable override
- **Field-edit constraints by state**: `SO.total_qty` editable only in draft/quoted; `WO.machine_id` only in scheduled/setup
- **ECR required** for part_revision, material_spec, routing_id changes after order is released/active/running
- **Cancel/Reopen permissions**: manager+ to cancel; director+ to reopen from `closed`
- **Target reporting is idempotent**: multiple reports for same `target_id` update the same log row

## Notes / Gotchas
- **Inconsistent status field names**: SO = `status`, JO = `job_status`, WO = `work_order_status` — use the correct field per object type
- **Order number sequences are stateful**: `OrderService::generateOrderNumber()` is not atomic; concurrent calls can cause gaps
- **WorkflowService config dependency**: `OrderWorkflowService` reads `so_jo_wo_config.json`; if missing, falls back to legacy role permissions
- **Dispatch is shift-based**: targets filtered by `shift_date` + `shift_code`; shift definitions come from master data
