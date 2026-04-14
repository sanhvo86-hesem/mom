# Tranche 15 Unresolved Backlog Ledger

Date: 2026-04-14

| Source | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action in this run |
|---|---|---|---|---|---|---|
| User VPS/File Explorer bug | File Explorer behaves like other admin tabs. | ALREADY_FIXED | JS/CSS/smoke from prior fix. | Not open. | No | Re-verified. |
| Tranche 14 generated artifact drift | Generated truth must not hide authority mismatch. | FIXED_IN_THIS_RUN | `schema-authority-summary.json`, `system-contract-diagnostics.json`, `publication-truth-summary.json`, `verify_schema_authority.py`, `verify_publication_truth.py`. | Closed. | Yes | Rebuilt `schema.sql`, split physical vs logical counts, regenerated artifacts. |
| Tranche 14 migration README drift | Migration docs must match chain. | FIXED_IN_THIS_RUN | `mom/database/migrations/README.md`. | Closed. | Yes | Updated 001-131 / 133-file chain and partition semantics after merging latest `main`. |
| Tranche 14 stale graphics benchmark | Benchmark doc must not claim old publishability blocker. | FIXED_IN_THIS_RUN | `mom/docs/world-class-benchmark-matrix-graphics-control-plane.md`. | Closed. | Yes | Updated current publishability and authority model. |
| Tranche 14 stale schema field audit snapshot | Historical snapshot must not be release authority. | FIXED_IN_THIS_RUN | `mom/docs/schema-field-audit-full.json`. | Closed. | Yes | Marked as legacy orphan-field input and pointed release authority to current registry truth. |
| Agent 5 query log leak | Query logging must not store secrets/PII bind values. | FIXED_IN_THIS_RUN | `Connection.php`, `ConnectionQueryLogSecurityTest.php`. | Closed. | Yes | Redacted sensitive names and summarized/hash scalar binds. |
| Agent 5 AMQP durability | Queue publish success must mean broker-confirmed success. | FIXED_IN_THIS_RUN | `QueueService.php`. | Closed locally; no live broker test. | Yes | Enabled publisher confirms and wait-for-ack/return/nack before success. |
| Agent 5 Loki fallback counter | Health counters must reflect actual written log entries. | FIXED_IN_THIS_RUN | `LogTransport.php`, `LogTransportHealthTest.php`. | Closed. | Yes | Count only encoded/written entries. |
| Post-main-merge schema/registry mismatch | Latest migrations must be publishable through the registry/frontend contract path. | FIXED_IN_THIS_RUN | `controlled_import_receipts`, `generate-table-architecture.mjs`, `system-contract-diagnostics.json`. | Closed. | Yes | Added `controlled_import_receipts` to `record_system` authority mapping and regenerated canonical publication to 761/761. |
| Old helper worktree | Repo should not accumulate helper surfaces. | PRODUCT_DECISION_REQUIRED | `git log main...codex/worldclass-closure-20260414-2020` shows unique commits. | Deleting would discard prior unmerged work. | No, not safely | Preserve; not created by tranche15. |
| Live OT segmentation/recovery proof | Prove OT environment controls. | BLOCKED_EXTERNAL | Requires target environment. | External evidence needed. | No | Documented only. |
| Live OTel collector/exporter proof | Prove deployed trace/log/metric backend. | BLOCKED_EXTERNAL | Local file-export only. | External deployment needed. | No | Documented only. |
| Part 11 validation scope | Decide regulated intended-use scope. | PRODUCT_DECISION_REQUIRED | Code supports controls; scope is compliance decision. | Owner decision needed. | No | Documented only. |
