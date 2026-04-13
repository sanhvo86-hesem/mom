# Domain: maintenance-ehs

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **5S Audits** (`maintenance_ehs.five-s-audits`): primary table `lean_5s_audits`, workflow: `lean_5s_audits_status_set`
- **Incidents** (`maintenance_ehs.incidents`): primary table `ehs_incidents`, workflow: `ehs_incidents_incident_status`
- **Maintenance Plans** (`maintenance_ehs.maintenance-plans`): primary table `pm_maintenance_plans`, workflow: `pm_maintenance_plans_status_set`
- **Maintenance Work Orders** (`maintenance_ehs.maintenance-work-orders`): primary table `pm_work_orders`, workflow: `pm_work_orders_status_set`
- **Permits** (`maintenance_ehs.permits`): primary table `ehs_permit_register`, workflow: `ehs_permit_register_status_set`
- **Safety Observations** (`maintenance_ehs.safety-observations`): primary table `safety_observations`, workflow: `safety_observations_observation_status`

## Controllers
- `EnergyController` → `mom/api/controllers/EnergyController.php`

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