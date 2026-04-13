# Domain: commercial-customer

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Controls quote-to-order lifecycle, customer purchase orders, sales order fulfillment, and customer care from estimation through shipment and financial realization. Manages the commercial demand signal and customer-facing portal.

## Canonical Objects (Contracts)
- **Quotation** (`commercial_customer--quotations`): primary table `quotes`
- **Sales Order** (`commercial_customer--sales-orders`): primary table `sales_orders`
- **Customer Purchase Order** (`commercial_customer--customer-purchase-orders`): primary table `customer_purchase_orders`
- **Customer Care Case** (`commercial_customer--customer-care-cases`)
- **Quote Effectiveness Review** (`commercial_customer--quote-effectiveness-reviews`)

## Controllers
- `QuoteController` → `mom/api/controllers/QuoteController.php`
- `CustomerPortalController` → `mom/api/controllers/CustomerPortalController.php`

## Key Services
- **QuoteService** — Quote CRUD; status transitions; cycle-time and material cost estimation; conversion to sales orders
- **CustomerPurchaseOrderService** — Customer PO lifecycle; linkage to SO; acknowledgment/confirmation workflow
- **QuoteController** — Quote management: `listQuotes`, `detail`, `create`, `update`, `transition`, `convertToSo`, `estimateCycleTime`, `estimateMaterial`, dashboard KPIs

## Key Tables
- `quotes` — Quote header (`status`: draft/internal_review/sent/accepted/rejected/expired/revised/converted)
- `quote_lines` — Line items (part_id, qty, unit_price, material, operations, line_total)
- `customer_purchase_orders` — Customer PO commitment (`po_status`: received/acknowledged/confirmed/closed/cancelled)
- `customer_purchase_order_lines` — PO line items
- `sales_orders` — SO header (`so_status`: draft/quoted/confirmed/in_production/shipped/closed/cancelled; linked to `customer_po_id`)

## Workflow States

**Quote:** draft → internal_review → sent → {accepted | rejected | expired | revised} → converted

**Customer PO:** received → acknowledged → confirmed → closed | cancelled

**Sales Order:** draft → quoted → confirmed → in_production → shipped → closed | cancelled

## Common Tasks & Entry Points
- **Create quote:** `QuoteController::create()` → `QuoteService::create()` → `quotes` + `quote_lines`, status = `draft`
- **Send quote to customer:** `QuoteController::transition(quote_id, 'sent')` → requires `internal_review` state
- **Convert accepted quote to SO:** `QuoteController::convertToSo()` → `QuoteService::convertToSalesOrder()` → `sales_orders`; must be in `accepted` state
- **Estimate cycle time:** `QuoteController::estimateCycleTime()` → `QuoteService::estimateCycleTime()` using `HARDNESS_FACTORS`, `BASE_REMOVAL_RATE`, `DEFAULT_SETUP_TIME`
- **Acknowledge customer PO:** `CustomerPurchaseOrderService::acknowledgeAndConfirm()` → `customer_purchase_orders` status transition
- **Customer portal access:** `CustomerPortalController` — external portal users; complaint submissions; document access tracking

## Business Rules
- **Quote cannot send without completing internal review**: transition to `sent` requires internal review state
- **Only `accepted` quotes can convert to SO**: `QuoteService::convertToSalesOrder()` blocks from other states
- **Customer PO must link to SO before confirmation**: `confirmed` state requires linked `sales_order_id`
- **SO cannot release to production before commercial confirmation**: so_status must be `confirmed` before JO can release
- **Conversion preserves full traceability**: quote_id → sales_order.source_quote_id

## Notes / Gotchas
- **Quote status aliases**: legacy system uses `review/won/lost`; runtime truth is `internal_review/accepted/rejected` — always use canonical values
- **Customer PO is a separate entity from SO**: both must exist and be linked; missing linkage blocks `confirmed` state
- **Cycle time estimation uses hardness factors**: `HARDNESS_FACTORS` map material hardness → rate modifier; `BASE_REMOVAL_RATE` = default machining rate; `DEFAULT_SETUP_TIME` = constant setup hours — verify these constants before changing machining logic
