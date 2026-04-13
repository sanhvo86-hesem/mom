# Domain: mes-execution

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Machine Alarms** (`mes_execution.machine-alarms`): primary table `mes_machine_alarms`, workflow: `mes_machine_alarms_escalation_status`

## Controllers
- `MobileController` → `mom/api/controllers/MobileController.php`
- `CncProgramController` → `mom/api/controllers/CncProgramController.php`

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