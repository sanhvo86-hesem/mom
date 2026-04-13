# Domain: analytics

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Inventory Balance Snapshots** (`analytics.inventory-balance-snapshots`): primary table `inventory_balance_snapshot`
- **MES OEE Snapshots** (`analytics.mes-oee-snapshots`): primary table `mes_oee_snapshots`
- **Plant Performance Snapshots** (`analytics.plant-performance-snapshots`): primary table `plant_performance_snapshots`
- **Production BOM Snapshots** (`analytics.production-bom-snapshots`): primary table `production_order_bom_snapshot`
- **Production Route Snapshots** (`analytics.production-route-snapshots`): primary table `production_order_route_snapshot`

## Controllers
- `DashboardController` → `mom/api/controllers/DashboardController.php`

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