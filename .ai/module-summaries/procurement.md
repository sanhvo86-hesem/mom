# Domain: procurement

> **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

## Purpose
<!-- Describe what this domain is responsible for in the business context -->

## Canonical Objects (Contracts)
- **IQC Inspections** (`procurement_supplier_quality.iqc-inspections`): primary table `incoming_inspections`, workflow: `incoming_inspections_status`
- **Purchase Receipt Corrections** (`procurement_supplier_quality.purchase-receipt-corrections`): primary table `purchase_receipt_corrections`, workflow: `purchase_receipt_corrections_correction_status`
- **Purchase Receipts** (`procurement_supplier_quality.purchase-receipts`): primary table `purchase_receipts`, workflow: `purchase_receipts_receipt_status`
- **Purchase Requisitions** (`procurement_supplier_quality.purchase-requisitions`): primary table `purchase_requisitions`, workflow: `purchase_requisitions_requisition_status`
- **Supplier ASNs** (`procurement_supplier_quality.supplier-asns`): primary table `supplier_asns`, workflow: `supplier_asns_asn_status`
- **Supplier Purchase Orders** (`procurement_supplier_quality.supplier-purchase-orders`): primary table `supplier_purchase_orders`, workflow: `supplier_purchase_orders_po_status_purchasing_runtime`

## Controllers
- `SupplierController` → `mom/api/controllers/SupplierController.php`

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