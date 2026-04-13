# Domain: finance

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **AP Invoices** (`finance.ap-invoices`): primary table `ap_invoices`, workflow: `ap_invoices_invoice_status`
- **AR Invoices** (`finance.ar-invoices`): primary table `ar_invoices`, workflow: `ar_invoices_payment_status_compatibility_bridge`
- **Backdate Exceptions** (`finance.backdate-exceptions`): primary table `backdate_exceptions`, workflow: `finance_backdate_exceptions_service_runtime`
- **Credit Memos** (`finance.credit-memos`): primary table `credit_memos`, workflow: `finance_credit_memos_service_runtime`
- **Debit Memos** (`finance.debit-memos`): primary table `debit_memos`, workflow: `finance_debit_memos_service_runtime`
- **Fixed Asset Capitalizations** (`finance.fixed-asset-capitalizations`): primary table `fixed_asset_capitalizations`, workflow: `finance_fixed_asset_capitalizations_bridge`
- **Inventory Valuations** (`finance.inventory-valuations`): primary table `inventory_valuations`
- **Period Closes** (`finance.period-closes`): primary table `period_close_controls`, workflow: `finance_period_close_controls_service_runtime`

## Controllers
- `FinanceController` → `mom/api/controllers/FinanceController.php`

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