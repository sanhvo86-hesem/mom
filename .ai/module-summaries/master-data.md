# Domain: master-data

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **Assets** (`master_data.assets`): primary table `assets`, workflow: `master_data_assets_bridge`
- **Compliance Obligations** (`master_data.compliance-obligations`): primary table `qual_compliance_obligations`, workflow: `qual_compliance_obligations_obligation_status`
- **Customers** (`master_data.customers`): primary table `customers`, workflow: `customers_customer_status`
- **Employees** (`master_data.employees`): primary table `employees`, workflow: `hcm_employees_employment_status`
- **Equipment** (`master_data.equipment`): primary table `equipment`, workflow: `equipment_equipment_status`
- **Measuring Devices** (`master_data.measuring-devices`): primary table `tools`, workflow: `master_data_measuring_devices_bridge`
- **Suppliers** (`master_data.suppliers`): primary table `suppliers`, workflow: `vendors_vendor_status`
- **Tools** (`master_data.tools`): primary table `tools`, workflow: `tools_tool_status`

## Controllers
- `MasterDataController` → `mom/api/controllers/MasterDataController.php`

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