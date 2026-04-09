# Operational Stress Audit

Date: 2026-04-09

## Purpose

This audit asks a stricter question than schema coverage, endpoint coverage, or workflow coverage:

- What happens when reality is messy instead of clean?
- Which backend gaps still allow duplicate side effects, half-committed flow, backdated distortion, quarantine leakage, stale master truth, weak override, archive drift, or finance closure gaps?
- Which of those gaps still block a serious frontline rollout?

The answer is now codified in:

- `mom/data/registry/operational-stress-governance-policy.json`
- `mom/data/registry/operational-stress-catalog.json`
- `mom/data/registry/operational-stress-report.json`

## Governing logic

The backend must answer these stress questions before any new process element is accepted:

- If the action retries, what prevents duplicate side effects?
- If the flow only half succeeds, what compensates or reconciles it?
- If the posting is backdated, what prevents false KPI and audit distortion?
- If master data changes after release, what snapshot preserves approved execution truth?
- If a hold or quarantine exists, what downstream activity is blocked automatically?
- If an override is needed, who can do it, with what reason, what expiry, and what evidence?
- If data syncs late or a worker/job dies, where does reconciliation happen?
- If the record is archived, corrected, or superseded, how is traceability preserved without leaking it into active flow?

## Reference basis

- [RFC 9110](https://www.rfc-editor.org/in-notes/rfc9110.pdf)
- [Google AIP-155](https://google.aip.dev/155)
- [Azure Compensating Transaction Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)
- [Oracle Fusion Receiving](https://docs.oracle.com/cd/G44591_01/trans/G41058-01/using-receiving.pdf)
- [Oracle Payables duplicate invoice controls](https://docs.oracle.com/cd/E26401_01/doc.122/e48760/T295436T485719.htm)
- [Dynamics 365 Quarantine Orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quarantine-orders)
- [Dynamics 365 Quality Orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quality-orders)
- [FDA Part 11 Scope and Application](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [NIST Lean and Process Improvement](https://www.nist.gov/mep/lean-and-process-improvement)

## Current result

The new stress report currently shows:

- `scenario_count = 12`
- `critical = 6`
- `high = 6`
- `medium = 0`
- `watch = 0`

Local signals from the current backend publication:

- `idempotency_mentions = 2`
- `compensation_markers = 0`
- `correction_markers = 0`
- `period_close_mentions = 0`
- `credit_memo_mentions = 0`
- `override_resources = 0`
- `snapshot_resources = 1`
- `mes_execution_blockers = 13`

Interpretation:

- The system is now much stronger on optimistic concurrency and guarded lifecycle.
- The system is still weak on recovery, correction, financial close, and stress-time truth preservation.
- This means the backend is better at saying “two users changed the same row” than at saying “what do we do after a partial real-world failure?”

## Highest-risk stress gaps

### 1. Duplicate side effects are still too easy to create under retry

Local evidence:

- `idempotency_mentions = 2`
- `if_match_mentions = 3367`
- `row_version_mentions = 24924`

Meaning:

- Concurrency protection exists.
- Duplicate-submit safety is still too sparse relative to the mutating surface.

### 2. Compensation and correction are still not first-class enough

Local evidence:

- `compensation_markers = 0`
- `correction_markers = 0`

Meaning:

- The system can guard state changes.
- The system still does not explain recovery well after partial completion, return, reverse, or correction.

### 3. Period-close and finance correction controls are still absent

Local evidence:

- `period_close_mentions = 0`
- `credit_memo_mentions = 0`
- `ap_ar_invoices` is still a unified Wave 1 normalized object

Meaning:

- Finance lifecycle is cleaner than before.
- It is still not mature enough for strict period integrity and correction governance.

### 4. Release truth can drift after master-data change

Local evidence:

- `effective_dating_markers = 571`
- `snapshot_resources = 1`

Meaning:

- Effective dating exists in metadata.
- Release snapshot governance is still too thin for production-grade truth preservation.

### 5. Override and waiver are still design gaps

Local evidence:

- `override_mentions = 24`
- `waiver_mentions = 24`
- `override_resources = 0`

Meaning:

- The words exist.
- The controlled object model still does not exist strongly enough.

### 6. MES execution still lacks enough operation-context state

Local evidence:

- `mes_execution_blockers = 13`
- Examples: `track_in`, `track_out`, `pause_resume`, `dispatch_queue`, `material_consumption`, `production_completion`, `scrap`

Meaning:

- Stress-time dispatch, pause, consumption, and completion are still too weakly governed in the backend slice.

## What this means for build policy

No new backend element should be accepted unless it can survive:

- retry
- partial completion
- correction
- reversal
- backdate
- override
- quarantine
- archive
- dependency drift
- offline replay

If it cannot answer those stress questions, it is not ready for frontline use.

## Priority remediation after this audit

### P0

- Add explicit idempotency coverage for create and side-effect endpoints.
- Introduce first-class compensation, correction, reversal, and reconciliation patterns.
- Split finance correction and close controls away from the current unified `ap_ar_invoices` shape.
- Introduce first-class override and waiver governance with reason, approver, expiry, and evidence.

### P1

- Add release snapshots for critical master truth at execution boundaries.
- Add cycle-count / discrepancy closure and governed inventory movement exceptions.
- Close customer return / complaint / quality / finance loop as one governed process.
- Harden MES execution with operation-context and execution-status models.

## Governing rule going forward

The standard is no longer “can the workflow run?”

The standard is:

- Can the workflow run truthfully under stress?
- Can it fail without creating invisible waste, unsafe release, or false KPI?
- Can it recover without manual shadow systems?
- Can it produce audit evidence automatically?

If not, it remains remediation work, not production-grade backend coverage.
