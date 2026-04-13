# Domain: maintenance-ehs

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Controls preventive-maintenance planning, incident tracking, safety observations, energy monitoring, and EHS program governance so equipment uptime, worker safety, and environmental compliance remain auditable.

## Canonical Objects (Contracts)
- **Maintenance Plan** (`maintenance_ehs--maintenance-plans`): primary table `pm_maintenance_plans`
- **Maintenance Work Order** (`maintenance_ehs--maintenance-work-orders`): primary table `maintenance_work_orders`
- **Incident** (`maintenance_ehs--incidents`): primary table `safety_incidents`
- **Permit** (`maintenance_ehs--permits`): primary table `work_permits`
- **Safety Observation** (`maintenance_ehs--safety-observations`)
- **5S Audit** (`maintenance_ehs--five-s-audits`)

## Controllers
- `EnergyController` → `mom/api/controllers/EnergyController.php`

## Key Services
- **EnergyController** (acts as service layer for energy) — Energy monitoring from MES snapshots: `getOverview` (kWh/cost aggregation), `getMachineDetail` (daily trends), `getPerPartEnergy` (kwh_per_part), `getCostTrend` (monthly)
- **MesAlarmService** — Alarm catalog normalization, playbook management, runtime alarm enrichment with severity levels (INFO/WARNING/ALARM/CRITICAL/EMERGENCY)

## Key Tables
- `pm_maintenance_plans` — PM plan header (`status`: draft/approved/active/on_hold/retired/archived, `equipment_id`)
- `maintenance_plan_tasks` — Task details linked to PM plan (frequency, procedure, parts_required)
- `maintenance_work_orders` — Maintenance execution records
- `safety_incidents` — Incident records (incident_type, severity, investigation_status)
- `work_permits` — Permits for hot work, confined space, lockout/tagout, electrical
- `mes_machine_alarms` — Machine alarm events (`escalation_status`: pending/partial/broken/complete, `severity`, `requires_lockout` flag)
- `energy.json` / `energy-snapshots.json` *(file-backed)* — Energy data per machine/date (kwh, cost, parts_produced, run_hours)

## Workflow States

**Maintenance Plan:** draft → approved → active | on_hold ↔ on_hold → retired → archived

**Machine Alarm:** (machine-originated) → acknowledged → escalated | cleared *(tracked via `escalation_status`)*

**Safety Incident:** reported → under_investigation → root_cause_identified → corrective_action → closed

**Work Permit:** requested → approved → active → expired | cancelled

## Common Tasks & Entry Points
- **View energy overview:** `EnergyController::getOverview()` → loads `energy.json` → aggregates by machine (total kWh, cost, efficiency)
- **Machine detail trend:** `EnergyController::getMachineDetail(machine_id, date_range)` → daily breakdown
- **Energy per part:** `EnergyController::getPerPartEnergy()` → `kwh_per_part` = total_kwh / parts_produced
- **Acknowledge alarm:** `MesAlarmService::normalizeRuntimeAlarm()` → updates `escalation_status`, requires operator identity validation
- **Activate PM plan:** PM plan status transitions are managed by PM planning team; gate checks require equipment release

## Business Rules
- **PM plan requires released equipment**: cannot activate without `equipment_released` precondition
- **PM plan on-hold must record deferral reason** and approver trace; retired plans must not continue auto-releasing maintenance work
- **Machine alarms are machine-sourced** — manual alarm creation is blocked; must come from MES adapter or edge source
- **Alarm acknowledgement requires operator identity**: `clear_reason` required for clear/closure; `escalation_reason` for escalation
- **Retired PM plans** must not auto-release maintenance work orders for scheduled tasks

## Notes / Gotchas
- **Energy data has two file sources**: primary = `energy.json` (fields: `kwh`, `cost`, `parts_produced`); fallback = `energy-snapshots.json` (fields: `energy_kwh`, `energy_cost`, `part_count`) — field names differ between sources, handle both
- **Alarms are immutable events** — cannot edit alarm records after creation; only `escalation_status` is mutable
- **Lockout/tagout requirement flag**: `requires_lockout = true` on alarm means work permit must be issued before maintenance response
