# Domain: procurement

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Gates inbound material quality, manages supplier scorecards, incoming inspections (IQC), Approved Supplier List (ASL), Purchase Orders/Receipts, and Supplier Corrective Action Requests (SCAR) so supplier quality signals integrate with purchasing, receiving, and finance. Enforces 8D methodology for SCAR closure.

## Canonical Objects (Contracts)
- **Purchase Requisition** (`procurement_supplier_quality--purchase-requisitions`)
- **Purchase Order** (`procurement_supplier_quality--purchase-orders`): primary table `purchase_orders`
- **Supplier ASN** (`procurement_supplier_quality--supplier-asns`)
- **Purchase Receipt** (`procurement_supplier_quality--purchase-receipts`): primary table `purchase_receipts`
- **Purchase Receipt Correction** (`procurement_supplier_quality--purchase-receipt-corrections`)
- **IQC Inspection** (`procurement_supplier_quality--iqc-inspections`): primary table `incoming_inspections`

## Controllers
- `SupplierController` → `mom/api/controllers/SupplierController.php`

## Key Services
- **SupplierQualityService** — Supplier scorecards (quality 40%, delivery 30%, cost 20%, compliance 10%); skip-lot ANSI Z1.4 management; ASL maintenance; SCAR 8D lifecycle
- **ShipmentGateService** — Used in reverse direction: incoming receipt gate checks

## Key Tables
- `supplier_scorecards` — Vendor performance by period (YYYY-MM) with weighted score and grades (A/B/C/D/F)
- `incoming_inspections` — IQC records (`status`: pending/pass/fail/conditional)
- `incoming_inspection_results` — Detail test results (test_name, specification, actual_value, pass/fail)
- `purchase_receipts` — Inbound receipts (`receipt_status`: received/under_iqc/accepted/quarantined/putaway/closed/reversed)
- `purchase_receipt_lines` — Line items (item_id, quantity_received, quantity_accepted, lot/serial)
- `supplier_asl` — Approved Supplier List (vendor_id, product_category, approval_status, expiration_date)
- `supplier_scar` — SCAR records with 8D fields (d1_team_members through d7_preventive_actions)
- `supplier_audits` — Planned/completed audits per vendor

## Workflow States

**IQC Inspection:** pending → {pass | fail | conditional}

**Purchase Receipt:** received → under_iqc → {accepted → putaway | quarantined} → {closed | reversed}

**SCAR (8D):** issued → acknowledged → root_cause_analysis → corrective_action → verification → closed

## Common Tasks & Entry Points
- **Calculate scorecard:** `SupplierController::calculateScorecard(vendor_id, period)` → `SupplierQualityService::calculateScorecard()` → `supplier_scorecards`
- **Queue IQC:** `SupplierController::createIncoming(receipt_id, items[])` → `incoming_inspections` (status = `pending`)
- **Complete IQC + accept:** `SupplierController::updateIncoming(inspection_id, {result_lines[], decision})` → pass/fail/conditional
- **Update skip-lot level:** `SupplierController::updateSkipLot(vendor_id, new_level)` → `SupplierQualityService::updateSkipLot()`
- **Manage ASL:** `SupplierController::upsertAsl(vendor_id, category, approval_status)` → `supplier_asl`
- **Create SCAR:** `SupplierController::createScar(vendor_id, description)` → `supplier_scar` (status = `issued`)
- **Advance SCAR:** `SupplierController::scarTransition(scar_id, target_state, 8d_payload)` → validates required 8D fields per state

## Business Rules
- **Scorecard weights**: quality=0.40, delivery=0.30, cost=0.20, compliance=0.10; grades: A/B/C/D/F
- **IQC acceptance requires result evidence**: `result_evidence_complete` precondition; cannot accept without result_lines array
- **Quarantined receipts cannot reach free stock**: status stays `quarantined` until disposition resolved; `putaway` requires `accepted` precondition
- **Skip-lot ANSI Z1.4 switching**: levels = `['tightened', 'normal', 'reduced', 'skip']`; any failed lot moves supplier back to `tightened`
- **SCAR 8D fields are state-gated**:
  - `acknowledged` requires `d1_team_members` + `d2_problem_description`
  - `root_cause_analysis` requires `d3_containment_actions` + `d4_root_cause`
  - `corrective_action` requires `d5_corrective_actions` + `d6_implementation_plan`
  - `verification` requires `d7_preventive_actions`
- **Receipt reversal preserves AP trace**: `reversed` command requires `correction_reason_recorded`; reversal invalidates downstream AP invoice posting
- **Conditional IQC requires waiver approval**: `waive` command moves to `conditional`; requires `waiver_approval_recorded`

## Notes / Gotchas
- **SCAR 8D fields cannot be skipped** — each state enforces its required fields; cannot jump states; no backward steps in the standard path
- **IQC result_lines are mandatory for acceptance** — empty or missing results block the accept transition; `test_name`, `specification`, `actual_value`, `pass/fail` all required
- **ASL expiration is NOT auto-enforced** — `expiration_date` is recorded but does not block PO creation automatically; purchasing must check ASL status separately
- **Receipt reversal is a lifecycle state, not a soft delete** — `reversed` state is final; downstream AP invoice and stock balance must both be corrected
