# Domain: inventory-logistics

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Controls outbound shipment release, dispatch, delivery confirmation, and closure so OTIF and proof-of-delivery truth remain governed. Gates shipments through a 10-point readiness checklist. Also manages inventory item master, stock balances, movements, warehouse locations, and cycle counts.

## Canonical Objects (Contracts)
- **Inventory Item** (`inventory_logistics--inventory-items`): primary table `inventory_items`
- **Stock Balance** (`inventory_logistics--stock-balances`): primary table `stock_balances`
- **Shipment** (`inventory_logistics--shipments`): primary table `shipments`
- **Customer Return** (`inventory_logistics--customer-returns`)
- **Inventory Movement** (`inventory_logistics--inventory-movements`)
- **Cycle Count Plan** (`inventory_logistics--cycle-count-plans`)
- **Warehouse** (`inventory_logistics--warehouses`)
- **Freight Order** (`inventory_logistics--freight-orders`)

## Controllers
- `LogisticsController` → `mom/api/controllers/LogisticsController.php`
- `AllocationController` → `mom/api/controllers/AllocationController.php`

## Key Services
- **ShipmentGateService** — 10-point readiness checklist (SG-01 through SG-10); RBAC enforcement; override support via `OperationalOverrideService`
- **LogisticsController** — Subcontracting, OQC/final inspection, packing lists, delivery confirmation

## Key Tables
- `shipments` — Shipment header (`shipment_status`: planned/blocked/ready/released/dispatched/delivered/closed/cancelled)
- `shipment_lines` — Detail lines per shipment (item_id, quantity, UOM, lot/serial trace)
- `shipment_packages` — Packing/labeling spec (package_type, weight, dimensions, customer label spec)
- `inventory_items` — Item master (`item_status`: prototype/engineering/active/inactive/obsolete, `released_revision_trace`)
- `stock_balances` — On-hand quantities per item/warehouse/lot
- `inventory_movements` — Stock transaction ledger (receipts, issues, transfers, adjustments)
- `warehouses` — Warehouse and bin location master

## Workflow States

**Shipment:** planned → {blocked ↔ ready} → released → dispatched → delivered → closed *(or cancelled from planned/blocked/ready/released)*

**Inventory Item:** prototype → engineering → {active ↔ inactive} → obsolete

**Customer Return:** received → inspection → {accepted_to_stock | scrapped | returned_to_supplier} → closed

## Common Tasks & Entry Points
- **Check shipment readiness:** `ShipmentGateService::checkReadiness(soNumber, userId, role)` → returns `{ready: bool, failed_gates: [], gate_details[]}`
- **Release shipment:** `LogisticsController` → `ShipmentGateService::checkReadiness()` + override check → status = `released`
- **Confirm delivery:** `LogisticsController::delivery_confirm(shipment_id, pod_ref)` → status = `delivered`
- **Activate inventory item:** `activate(item_id)` → requires `released_revision_exists` precondition → `item_status` = `active`
- **Create packing list:** `LogisticsController::packing_create(shipment_id, packages[])` → `shipment_packages`
- **OQC inspection:** `LogisticsController::oqc_create()` → `oqc_inspections` for final quality check

## Business Rules
**Shipment gate checklist (10 points):**
- **Required**: SG-01 (contract review), SG-02 (JOs completed/closed), SG-03 (no open NCRs), SG-04 (no active holds), SG-05 (documents received), SG-06 (CAPA actions closed), SG-09 (packing/labeling spec confirmed)
- **Optional**: SG-07 (FAI approved if first article), SG-08 (export control cleared), SG-10 (customer source inspection)

Other rules:
- **Cannot release without gate clearance**: `shipment_gate_passed` precondition enforced; 409 returned with `failed_gates` array if not ready
- **Proof of delivery mandatory**: `proof_of_delivery_recorded` precondition for `delivered` state
- **Active items must have released revision trace**: `item_status=active` requires valid `released_revision`
- **Obsolete items block new demand**: blocked from requisitions and new orders
- **Cancellation is guarded**: cannot cancel `delivered` or `closed` shipments

## Notes / Gotchas
- **Gate check is not automatic** — must be explicitly called before release; 409 returned with `failed_gates` array on failure; resolve each gate blocker before retry
- **Subcontracting, OQC, and packing are three separate sub-systems** in `LogisticsController`; do not conflate endpoints
- **Inventory item_id must not fork**: canonical = `inventory_item_id`, legacy = `item_id`; active items must not change their identifier
- **Proof of delivery must be preserved** — `delivered → closed` requires POD evidence; no POD = cannot close
