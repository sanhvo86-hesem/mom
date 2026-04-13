# Domain: traceability

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Provides forward and backward genealogy linking lots, serials, batches, and production orders so containment, recall, and NCR decisions cite auditable traceability evidence. Also manages digital product passports with lifecycle event tracking and QR code generation.

## Canonical Objects (Contracts)
- **Lot Genealogy** (`traceability_serialization--lot-genealogy`): primary table `genealogy_link`

## Controllers
- `ProductPassportController` → `mom/api/controllers/ProductPassportController.php`

## Key Services
- **ProductPassportController** (acts as main handler) — Passport CRUD, lifecycle event tracking, forward/backward genealogy tracing, QR code generation
- Genealogy records maintained via `genealogy_link` and correction tables

## Key Tables
- `genealogy_link` — Parent-child lot relationships (`genealogy_link_id`, `production_order_id`, `parent_lot_no`, `child_lot_no`, `link_type`: consumes/produces/rework/scrap)
- `trace_genealogy_batches` — Batch-level genealogy metadata
- `trace_genealogy_links` — Superseding genealogy corrections (append-only; original links never deleted)
- `mes_part_genealogy` — MES-side genealogy events (supplement to main genealogy tables)
- `passports` — Digital product passports (`passport_number`, `part_number`, `serial_number`, `customer_name`, `status`, `lifecycle_events[]`)

## Workflow States

**Passport:** lifecycle governed by events, not a strict state machine — events: `first_piece`, `in_process`, `final_inspection`, `shipped`

**Genealogy:** stateless evidence thread — `record_link` creates; `correct_link` supersedes; original records are **never deleted**

## Common Tasks & Entry Points
- **Trace genealogy forward/backward:** `ProductPassportController::getGenealogy(part_id | serial)` → queries `genealogy_link` where `parent_lot_no` or `child_lot_no` matches → returns chain
- **Record genealogy link:** `genealogy_link::recordLink(production_order_id, parent_lot_no, child_lot_no, link_type)` → new row in `genealogy_link`
- **Correct genealogy:** `ProductPassportController::correctGenealogy(original_link_id, correction_reason)` → creates new row in `trace_genealogy_links` with `superseding_flag = true`; original row untouched
- **Get product passport:** `ProductPassportController::detail(passport_id)` → full lifecycle event history
- **Create passport:** `ProductPassportController::create(part_number, serial_number, customer)` → `passports` record

## Business Rules
- **Genealogy link requires `parent_lot_no` OR `child_lot_no`** plus source system — cannot create orphaned link
- **Genealogy corrections are append-only**: original `genealogy_link` row never deleted; corrections stored in `trace_genealogy_links` with `superseding_flag`
- **Traceability chain must resolve to source**: forward/backward trace must terminate at a work order, receipt, or manufacturing operation — broken chains are non-conforming
- **Containment decisions must cite genealogy evidence**: NCR/recall containment decisions reference `genealogy_link_id` for audit
- **Blank correction reason is rejected**: `correction_reason` field is mandatory for `correctGenealogy()`

## Notes / Gotchas
- **Four genealogy tables must be queried together** for complete traceability: `genealogy_link` (primary), `trace_genealogy_batches` (batch metadata), `trace_genealogy_links` (corrections), `mes_part_genealogy` (MES events) — queries using only `genealogy_link` will miss corrections and MES data
- **Corrections use superseding pattern**: to find the current valid link, look for the most recent `trace_genealogy_links` entry that supersedes the original; if no correction exists, the original `genealogy_link` row is authoritative
- **`link_type` enum**: `consumes` (material consumed in production), `produces` (output lot), `rework` (reworked lot), `scrap` (scrapped lot) — use correct type for traceability to work in both directions
