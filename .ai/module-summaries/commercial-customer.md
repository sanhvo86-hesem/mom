# Domain: commercial-customer

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Customer Care Cases** (`commercial_customer.customer-care-cases`): primary table `crm_customer_touchpoints`, workflow: `crm_customer_touchpoints_touchpoint_status`
- **Customer Purchase Orders** (`commercial_customer.customer-purchase-orders`): primary table `customer_purchase_orders`, workflow: `customer_purchase_orders_po_status_service_runtime`
- **Quotations** (`commercial_customer.quotations`): primary table `quotes`, workflow: `quotes_status_quote_runtime`
- **Quote Effectiveness Reviews** (`commercial_customer.quote-effectiveness-reviews`): primary table `qual_effectiveness_reviews`
- **Sales Orders** (`commercial_customer.sales-orders`): primary table `sales_orders`, workflow: `sales_orders_so_status_order_runtime`

## Controllers
- `QuoteController` → `mom/api/controllers/QuoteController.php`
- `CustomerPortalController` → `mom/api/controllers/CustomerPortalController.php`

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