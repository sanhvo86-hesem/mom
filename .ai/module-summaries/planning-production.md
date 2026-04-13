# Domain: planning-production

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Dispatch Lists** (`planning_production.dispatch-lists`): primary table `mes_dispatch_queue`, workflow: `mes_dispatch_queue_queue_status_set`
- **IPQC Inspections** (`planning_production.ipqc-inspections`): primary table `ipqc_inspections`, workflow: `ipqc_inspections_inspection_status`
- **Job Orders** (`planning_production.job-orders`): primary table `job_orders`, workflow: `job_orders_job_status_order_runtime`
- **Production Operations** (`planning_production.production-operations`): primary table `production_operations`, workflow: `job_operations_status`
- **Production Plans** (`planning_production.production-plans`): primary table `production_schedule`, workflow: `production_schedule_schedule_status_set`
- **Work Orders** (`planning_production.work-orders`): primary table `work_orders`, workflow: `work_orders_work_order_status`

## Controllers
- `OrderController` → `mom/api/controllers/OrderController.php`
- `DispatchController` → `mom/api/controllers/DispatchController.php`
- `AllocationController` → `mom/api/controllers/AllocationController.php`
- `AiSchedulingController` → `mom/api/controllers/AiSchedulingController.php`

## Key Services
<!-- List 3–5 most important services for this domain and what they do -->

## Key Tables
<!-- List the 3–5 most critical database tables with a one-line description each -->

## Workflow States
<!-- List lifecycle states for the main records (e.g., Draft → Submitted → Approved → Released → Closed) -->

## Common Tasks & Entry Points
<!-- e.g., "To add a field to an NCR: edit migration + contract.json + ExceptionController" -->
<!-- e.g., "To trace an order: start at OrderController::detail, then OrderService::get" -->

## Business Rules
<!-- Non-obvious rules that would trip up AI without context -->
<!-- e.g., "JO number = plant_code + year + 4-digit sequence — changing this breaks traveler lookup" -->

## Notes / Gotchas
<!-- Architecture quirks, legacy compatibility concerns, known edge cases -->