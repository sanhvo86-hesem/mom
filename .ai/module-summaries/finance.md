# Domain: finance

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Controls AP/AR invoicing, period closes with electronic signature, and memo corrections (credit/debit) so procurement and period-close decisions remain explicit, auditable, and separable from invoice records. Enforces 3-way match, posting gates, and backdated change governance.

## Canonical Objects (Contracts)
- **AR Invoice** (`finance--ar-invoices`): primary table `ar_invoices`
- **AP Invoice** (`finance--ap-invoices`): primary table `ap_invoices`
- **Inventory Valuation** (`finance--inventory-valuations`)
- **Period Close** (`finance--period-closes`): primary table `period_close_controls`
- **Backdate Exception** (`finance--backdate-exceptions`): primary table `backdate_exceptions`
- **Credit Memo** (`finance--credit-memos`): primary table `credit_memos`
- **Debit Memo** (`finance--debit-memos`): primary table `debit_memos`
- **Fixed Asset Capitalization** (`finance--fixed-asset-capitalizations`)

## Controllers
- `FinanceController` → `mom/api/controllers/FinanceController.php`

## Key Services
- **FinanceControlService** — Period close governance, memo corrections, idempotent transitions with electronic signature evidence
- **InventoryFinanceLedgerService** — Inventory accounting / dual-write to GL
- **IdempotencyService** — Ensures create/transition operations are idempotent (fingerprint matching, 120s retry window)
- **EpicorIntegrationService** — Epicor ERP integration for AP/AR sync

## Key Tables
- `ap_invoices` — AP records (`status`: draft/matched/on_hold/posted/partially_paid/paid/voided/closed). **Warning**: operational status is in `dispute_status`, not `invoice_status`
- `ap_invoice_lines` — AP line items with amounts and GL distribution codes
- `ar_invoices` — AR records with posting trace and payment settlement
- `period_close_controls` — Period close governance (`period_code` YYYY-MM, `ledger_scope` AP/AR/PLANT, `close_status`, `electronic_signature`)
- `period_close_steps` — Audit trail of close/reopen transitions with reason trace
- `credit_memos` — AP/AR deductions: draft → posted → settled → closed
- `debit_memos` — AP/AR adjustments: draft → posted → settled → closed
- `backdate_exceptions` — Governed corrections in closed periods: requested → under_review → {approved|rejected} → closed

## Workflow States

**AP Invoice:** draft → matched → posted → partially_paid → paid → closed
*(On Hold from draft/matched/posted; Voided from draft/on_hold)*

**Period Close:** closed ↔ reopened *(cyclic — starts as `closed` when created)*

**Credit/Debit Memo:** draft → posted → settled → closed

**Backdate Exception:** requested → under_review → {approved | rejected} → closed

## Common Tasks & Entry Points
- **Create AP invoice:** `FinanceController::createApInvoice()` → `FinanceControlService` → `ap_invoices` (status = `draft`)
- **3-way match:** `FinanceController::matchApInvoice()` → idempotency check + match logic → status = `matched`
- **Post AP invoice:** `FinanceController::postApInvoice()` → requires `matched` state → status = `posted`
- **Close period:** `FinanceController::createPeriodClose()` → `FinanceControlService::createPeriodClose()` → `period_close_controls` (status = `closed`)
- **Reopen period:** `FinanceController::transitionPeriodClose(id, 'reopen')` → status = `reopened`, requires e-signature
- **Create backdate exception:** `FinanceController::createBackdateException()` → e-signature + reason → `backdate_exceptions`
- **Create credit memo:** `FinanceController::createCreditMemo()` → `credit_memos`

## Business Rules
- **3-way match gates AP posting**: precondition `po_and_receipt_available` enforced; cannot post without match
- **Period close is per `ledger_scope` + `period_code`**: one close record per YYYY-MM + AP|AR|PLANT combination
- **Period close requires electronic signature**: `e_signature` field must contain `signature_meaning`, `signed_by`, `signed_at`; reopen also requires signature
- **Backdated changes require governed exception**: any posting change in a closed period needs an approved `backdate_exceptions` record
- **Idempotency key is mandatory for create/transition**: key ≤ 200 chars, pattern `^[A-Za-z0-9._:\-]+$`; 120s retry window
- **AP invoice cannot skip states**: draft → matched → posted → paid; no shortcuts

## Notes / Gotchas
- **`dispute_status` is the operational workflow truth**, not `invoice_status` — code comment warns: "invoice_status must not override workflow truth"
- **`period_code` format is strict**: must match `^\d{4}\-(0[1-9]|1[0-2])$`; `ledger_scope` must be uppercase `AP`, `AR`, or `PLANT`
- **Period close is created in `closed` state** — `createPeriodClose()` starts closed, then `reopen/close` cycle; do not create in `open` state
- **Idempotency key parsing fails silently on malformed keys** — returns 400; verify pattern before sending
