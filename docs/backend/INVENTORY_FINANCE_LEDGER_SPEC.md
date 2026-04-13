# Inventory Finance Ledger Spec

This spec defines the runtime ledger and finance controls required before inventory, WIP, AP, AR, GL, and period close can be considered enterprise-grade.

## Current Findings

| Finding | Classification | Impact |
| --- | --- | --- |
| Material issue can be recorded in MES/mobile-style stores without enforced inventory/WIP posting | P0 ledger gap | Stock and WIP are not reliable. |
| Inventory tables and valuation migrations exist, but no dedicated posting command engine was found | schema-only/decorative control | Generic CRUD can create records without accounting logic. |
| Period close is only partially enforced | AP/AR debit-credit memo posting now checks closed-period controls and consumes approved backdate exceptions; inventory, WIP, AP invoice, AR invoice, GL, payment, valuation, and COPQ posting paths still do not share one central policy. | Closed-period control is enforceable only for memo posting today; all other posting paths remain unsafe until command-owned. |
| P2P schema exists for receipt/AP/3-way match, but command engine is missing | schema-heavy | AP liability/payment controls are incomplete. |

## Inventory Transaction Ledger

All stock movements must post immutable ledger entries. No business command may update stock balance without a ledger row.

Required ledger fields:

- `inventory_transaction_id`
- `transaction_type`: receipt, putaway, issue_to_wip, return_to_stock, transfer, split, merge, scrap, rework_issue, rework_receipt, return_to_supplier, adjustment
- `item_id`, `lot_id`, `serial_id?`
- `from_location`, `to_location`
- `quantity`, `uom`
- `unit_cost`, `currency`, `valuation_method`
- `source_command`, `source_id`, `idempotency_key`
- `posting_date`, `period_code`
- `quality_status_before/after`
- `created_by`, `created_at`
- `audit_event_id`, `evidence_id?`

## Stock Balance Rules

- Balances are derived from ledger or updated in the same transaction after ledger insert.
- Unique balance key: `item_id + lot_id + location_id + quality_status + valuation_layer`.
- No negative balance unless item/location policy explicitly allows and finance approves.
- Held/rejected lots are not available for issue.
- Balance update must lock the row with `SELECT ... FOR UPDATE`.
- Reconciliation report compares ledger sum to balance table daily.

## WIP Movement

`IssueMaterialToWorkOrder` posts:

- Inventory issue from stock/receiving location.
- WIP debit for WO/operation.
- MES material consumption record.
- Cost layer assignment.

`CompleteOperation` posts:

- WIP movement from operation to next operation or finished goods.
- Scrap/rework movement when qty scrap/rework exists.
- Labor/machine cost capture if cost module enabled.

## Receipt Posting

`ReceivePurchaseOrder` posts:

- Receipt ledger into receiving inspection/hold location.
- Lot creation with status `pending_iqc`.
- Supplier/cert evidence link.
- AP accrual if policy requires.

It does not make stock available for production until `RecordIqcResult` accept and `PutawayInventory`.

## Putaway Posting

`PutawayInventory` posts:

- Transfer from receiving hold to stock location.
- Lot status `available`.
- Balance update.
- Warehouse location occupancy update where WMS is enabled.

It must fail if:

- IQC is rejected/fail and no waiver exists.
- Active quality hold exists.
- Period is closed.
- Destination location invalid or blocked.

## Scrap/Rework Posting

`ApproveMrbDisposition(scrap)` posts:

- Inventory/WIP reduction.
- Scrap ledger.
- COPQ ledger.
- Lot status `scrapped`.

`ApproveMrbDisposition(rework)` posts:

- WIP transfer to rework WO/operation.
- Rework cost bucket.
- Hold remains active until rework completion and OQC pass.

`ApproveMrbDisposition(use_as_is)` posts:

- Quality status release with e-signature.
- Concession/deviation evidence link.
- No inventory quantity change unless location/status changes.

## Inventory Valuation

Supported methods:

- FIFO by lot/cost layer.
- Weighted average by item/site.

Required controls:

- Valuation method defined by item/site and cannot change mid-period without finance approval.
- Every issue consumes a valuation layer.
- Rework/scrap updates cost ledger and COPQ.
- Period close snapshots inventory value and locks postings.

## AP 3-Way Match

`RunThreeWayMatch` compares:

- PO line quantity/price/tax/freight terms.
- Receipt quantity accepted.
- AP invoice quantity/price/tax/freight.
- Tolerance profile.
- Supplier quality hold/payment hold.

Outcomes:

- `matched`: payable release allowed.
- `matched_within_tolerance`: payable release allowed with audit.
- `disputed`: payment blocked, buyer/AP workflow required.
- `quality_hold`: payment blocked or held by policy.

Acceptance:

- AP invoice cannot move to payable if receipt missing.
- Price/qty variance over tolerance creates dispute.
- Supplier rejected lot can block payment per policy.

## Period Close Enforcement

Current runtime boundary: `FinanceControlService::createMemo()` enforces closed-period policy for AP/AR debit and credit memos, consumes a matching approved backdate exception under a finance-control lock, and attempts to restore the exception if memo persistence fails after consumption. This is a real mitigation, but it is not global ledger control and is still JSON-based.

Every posting command must call:

`PeriodControlPolicy::assertPostingAllowed(ledger_scope, posting_date, command, actor, backdate_exception_id?)`

Applies to:

- Inventory transactions.
- WIP/cost/COPQ ledgers.
- AP invoice posting.
- AP payment.
- AR invoice/credit/debit memo.
- GL journal.
- Inventory valuation adjustment.
- MRB scrap/rework cost posting.

Rules:

- If period is open: allow.
- If period is closed and no approved unexpired exception: reject.
- If exception exists: validate scope, subject type/ref, max date, approver, expiry, e-signature, and remaining use count.
- Every override writes audit/evidence and outbox.

## Backdate Exception

Backdate exception required fields:

- `backdate_exception_id`
- `ledger_scope`
- `subject_type`, `subject_ref`
- `requested_posting_date`
- `approved_by`, `approved_at`
- `expires_at`
- `max_uses` or single-use default
- `reason`
- `electronic_signature_id`

Command must consume the exception or mark usage atomically.

## Financial Audit Trail

For every ledger posting:

- Command audit row.
- Immutable audit trail event.
- Ledger row hash.
- Previous ledger hash for hash-chain by ledger scope/period.
- Evidence link where source document exists.
- Correlation ID and idempotency key.
- User, role, session, IP.

## Migration Requirements

| Requirement | Migration |
| --- | --- |
| Idempotent postings | Unique index on `(source_command, idempotency_key)` and source business keys. |
| Balance integrity | Unique balance key and FK to item/lot/location. |
| Period policy | Index `posting_date`, `period_code`, `ledger_scope`; FK to backdate exception usage. |
| Lot quality availability | Add lot `quality_status` and `hold_status` if absent. |
| Valuation | Cost layer table with FIFO sequence and weighted-average snapshot. |
| Reconciliation | Materialized/reporting view for ledger sum vs balance. |

## Acceptance Tests

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| LEDGER-001 | Issue material to WO with open period | Inventory ledger, WIP ledger, consumption, and balance update commit together. |
| LEDGER-002 | Retry same material issue | Same transaction returned; no double stock decrement. |
| LEDGER-003 | Issue held lot | Fails `lot_on_quality_hold`. |
| LEDGER-004 | Receive PO then putaway before IQC | Fails `iqc_not_accepted`. |
| LEDGER-005 | IQC accept then putaway | Lot moves to available stock with ledger. |
| LEDGER-006 | Close finance period then post AP invoice | Fails `period_closed`. |
| LEDGER-007 | Approved backdate exception | Posting succeeds once, with exception usage audit. |
| LEDGER-008 | 3-way match variance over tolerance | AP invoice status `disputed`, payment blocked. |
| LEDGER-009 | MRB scrap | Stock/WIP reduced and COPQ ledger posted. |
| LEDGER-010 | Ledger-balance reconciliation | Report has zero unexplained variance. |
| LEDGER-011 | Close AP/AR period then create debit/credit memo without exception | Fails `period_closed`; runtime mitigation already covers this path. |
| LEDGER-012 | Create debit/credit memo with matching approved exception | Memo posts once and exception status changes to consumed/closed; runtime mitigation already covers this path. |
| LEDGER-013 | Reuse consumed backdate exception | Fails `backdate_exception_not_approved` or equivalent deterministic policy error. |
