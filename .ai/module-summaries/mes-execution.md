# Domain: mes-execution

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Captures machine execution events, operator work queues, time tracking, in-process inspections, CNC program management, and alarms so shopfloor activities remain auditable and linked to jobs/orders. Provides offline-first mobile support with conflict resolution.

## Canonical Objects (Contracts)
- **Machine Alarm** (`mes_execution--machine-alarms`): primary table `mes_machine_alarms`

## Controllers
- `MobileController` → `mom/api/controllers/MobileController.php`
- `CncProgramController` → `mom/api/controllers/CncProgramController.php`
- `DispatchController` → `mom/api/controllers/DispatchController.php` *(shared with planning_production)*

## Key Services
- **MobileWorkQueueService** — Work queue state management; task assignments; in-process inspection records
- **MesAdapterService** — Normalizes adapter config (adapter_id, machine_id, adapter_type, transport_protocol, `heartbeat_sla_seconds`, `stale_after_seconds`, `store_and_forward_enabled`) and event payloads
- **MesAlarmService** — Alarm catalog normalization; playbooks with `response_steps`; runtime alarm normalization with lockout/maintenance flags
- **MtconnectPollingService** — Polls MTConnect machines per adapter config; updates shadow state

## Key Stores
- `data/mobile/work_queue.json` *(file-backed compatibility store)* — Queue entries (`queue_id`, `employee_id`, `wo_number`, `operation_seq`, `task_status`: pending/in_progress/completed/skipped/blocked, result fields)
- `data/mobile/time_entries.json` *(file-backed compatibility store)* — Clock records (`entry_id`, `employee_id`, `wo_number`, `machine_id`, `labor_type`: setup/run/rework/inspection, `clock_in`, `clock_out`)
- `data/mobile/inspections.json` *(file-backed compatibility store)* — Inspection captures (`capture_type`: first_piece/in_process/final, `operation_seq`, `inspection_plan_id`, `overall_result`, `measurements[]`, `photos[]` as base64)
- `mes_machine_alarms` — Machine alarm events (`alarm_event_id`, `equipment_id`, `alarm_code`, `severity`, `escalation_status`, `playbook_id`)
- `mes_runtime.json` *(file-backed)* — Runtime shadow state for machines, operations, adapters

## Workflow States

**Work queue task:** pending → in_progress → completed | skipped | blocked

**Time entry:** open (clock_in recorded) → closed (clock_out recorded)

**Machine alarm:** (machine-originated) → acknowledged → escalated | cleared *(by operator)*

**CNC Program:** draft → under_review → approved → released | superseded

## Common Tasks & Entry Points
- **Get operator queue:** `MobileController::getMyQueue()` → `MobileWorkQueueService::getOperatorQueue(employee_id)` → `mobile_work_queue`
- **Start task:** `MobileController::startTask(queue_id)` → `task_status = in_progress`, `start_time` recorded
- **Complete task:** `MobileController::completeTask(queue_id, result, qty_completed, qty_scrap)` → `task_status = completed`
- **Clock in:** `MobileController::clockIn(wo_number, operation_seq, machine_id, labor_type)` → `data/mobile/time_entries.json`, records `clock_in`
- **Clock out:** `MobileController::clockOut(time_entry_id, qty_completed)` → records `clock_out`, calculates duration
- **Capture inspection:** `MobileController::captureInspection(wo_number, operation_seq, inspection_plan_id, capture_type, measurements[], photos[])` → `data/mobile/inspections.json`
- **Sync offline batch:** `MobileController::submitOfflineBatch(entries[])` → processes queued records, detects conflicts, applies resolution strategy
- **Poll MTConnect:** `MtconnectPollingService::pollAll()` → queries adapters with `adapter_type='mtconnect'` and `status='active'`

## Business Rules
- **Employee identification**: lookup `user['employee_id']` in `users.json` by username; fallback to username if `employee_id` not set
- **Clock-in requires**: `wo_number`, `operation_seq`, `machine_id`, `labor_type` (setup/run/rework/inspection)
- **Clock-out requires**: `qty_completed`; `qty_scrap` is optional
- **First-piece inspection required** before production run when a dispatch target sets `first_piece_required` or `quality_gate_policy = enforce_first_piece`; dispatch reporting checks the existing mobile inspection capture store and permits only audited supervisor override with `quality_override_reason`
- **Offline batch conflict types**: depend on entry type (time_entry, inspection, queue_task); `merge` strategy requires `merge_data` payload; must specify `resolution`: keep_local | keep_server | merge
- **Machine alarms must have source**: source must be machine/adapter/edge — manual alarm creation is blocked
- **Inspection photos as base64**: stored directly in JSON; no separate file storage abstraction
- **MTConnect filter**: `adapter_type='mtconnect'` AND `status='active'` — only matching adapters are polled

## Notes / Gotchas
- **Employee resolution can fail silently**: `user['employee_id']` may not exist; system falls back to username as employee identifier — ensure users have `employee_id` set in `users.json`
- **Offline sync conflicts require explicit resolution payload**: the `merge` strategy needs `merge_data`; sending empty merge_data silently drops the update
- **Inspection photos are base64 blobs in the JSON records** — no file storage; large photos significantly increase record size; no size cap currently enforced
- **MES runtime is file-backed**: `mes_runtime.json` is not in PostgreSQL; changes by concurrent processes can cause write conflicts
