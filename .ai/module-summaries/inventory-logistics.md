# Domain: inventory-logistics

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Customer Returns** (`inventory_logistics.customer-returns`): primary table `rma_orders`, workflow: `rma_orders_rma_status`
- **Cycle Count Plans** (`inventory_logistics.cycle-count-plans`): primary table `wms_cycle_count_plans`, workflow: `inventory_cycle_count_plans_bridge`
- **Freight Orders** (`inventory_logistics.freight-orders`): primary table `freight_orders`, workflow: `freight_orders_freight_status`
- **Inventory Items** (`inventory_logistics.inventory-items`): primary table `inventory_items`, workflow: `items_item_status`
- **Inventory Movements** (`inventory_logistics.inventory-movements`): primary table `inventory_movements`, workflow: `inventory_transactions_posting_status`
- **Shipments** (`inventory_logistics.shipments`): primary table `shipments`, workflow: `tms_shipments_shipment_status`
- **Stock Balances** (`inventory_logistics.stock-balances`): primary table `stock_balances`
- **Warehouses** (`inventory_logistics.warehouses`): primary table `warehouses`, workflow: `warehouses_warehouse_status`

## Controllers
- `LogisticsController` → `mom/api/controllers/LogisticsController.php`

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