# Unresolved Backlog Ledger - Tranche 12

Date: 2026-04-14

This ledger resolves contradictions between the six pass-1 agents using current code, current tests, current generated artifacts, and official benchmark sources. `FIX_NOW` is reserved for items that were code-fixable in this workspace without fabricating artifacts or requiring missing secrets.

## Ledger

| Item | Source prompt / tranche / doc | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action in this run |
|---|---|---|---|---|---|---|---|
| Publication registry artifact set | Prior publication / foundation governance prompts, `verify_publication_truth.py` | Checked-in `mom/data/registry` artifacts prove publication truth | `BLOCKED_EXTERNAL` after coordinator verification | `python3 mom/tools/registry/canonical_publication_orchestrator.py` fails on missing `table-registry.json`, `data-fields.json`, wave policy files; schema sync fails on missing `DB_PASSWORD` | Required source artifacts and environment credentials are absent | No, not without source artifacts or credentials | Recorded as blocker; docs corrected so no green claim remains |
| Publication truth still partial | `mom/docs/schema-field-audit-full.json`, prior global pass claims | Publishability ready with zero workflow bridge blockers | `BLOCKED_EXTERNAL` / `DOC_DRIFT` | Current artifact reports `frontend_partial_entities=198`, `workflow_engine_bridge_blocked=115`, `publishability_ready=false`; verifier cannot run Gate A because registry artifacts missing | Cannot regenerate or close from absent registry source inputs | No in this workspace | Historical false claims corrected; no completion claim made |
| Metadata-only blocker families | `close_partial_entities.py`, `canonical_publication_orchestrator.py` | Generator closes timestamp, operation, execution status, planning, resource, traceability metadata gaps | `BLOCKED_EXTERNAL` | Orchestrator classifies them as generator-automatable, but generator fails before inputs load | Missing registry inputs prevent safe regeneration | No until registry sources exist | Recorded as blocked, not closed |
| Attachment / work-instruction / formula contracts | Publication orchestrator blocker classifications | Domain contracts completed | `PRODUCT_DECISION_REQUIRED` | `missing_attachment_contract`, `missing_work_instruction_signal`, and `missing_formula_or_aggregate_contract` are classified as manual domain decisions | Requires domain-owner semantics, not mechanical edit | No | Remains product decision |
| Admin-tab authority and config persistence | `admin-tabs-international-standard-gap-assessment-2026-04-09.md` | Backend-authoritative admin config persistence and policy enforcement | `PARTIAL` | Current write helpers remain file/temp-file based; current alias routing is already fixed | Full authoritative persistence requires broader admin control-plane migration | Partly | No broad admin rewrite in this run; current false subclaim about raw `admin_users_list` remains invalid |
| Historical global PASS claims | Prior prompt 02/03 execution reports | Global publication/readiness PASS | `INVALID_CLAIM` | Current OpenAPI is `3.1.2`, but current artifacts still show partial publication and missing registry tree | Historical reports no longer match current tree | Not applicable | Superseded in Tranche 12 docs and false claim docs |
| Session bootstrap log pollution | Backend cleanup tranche | No avoidable CLI/session warning pollution | `ALREADY_FIXED` | `SessionService` and `api.php` have fallback handling; cleanup doc records closure | Closed before Tranche 12 | No | Verified only |
| Stale workspace revision guard | Schema Studio cleanup tranche | Reject stale workspace saves | `ALREADY_FIXED` | `AdminMetadataStudioController` rejects `stale_workspace_revision`; smoke asserts 409 path | Closed before Tranche 12 | No | Verified only |
| Contract-authority bundle gaps | Backend cleanup tranche | Authored contract bundle covers priority objects | `ALREADY_FIXED` | `mom/contracts/authority-report.json` reports full authored/core coverage | Closed before Tranche 12 | No | Verified only |
| Logging health false green | Agent 5 pass 1 | Readiness must not report Loki healthy before proof | `FIX_NOW -> CLOSED` | `LogTransport` previously trusted URL syntax; new health exposes `loki_configured`, `loki_verified`, `loki_probe_state` and keeps `loki_available=false` until successful push | Was open because URL validation was treated as availability | Yes | Fixed with regression test |
| Observability request context | Agent 5 pass 1 | Trace/correlation/request IDs must be request-scoped | `FIX_NOW -> CLOSED` | `SliceObservability::beginRequest()` resets trace context; `api/index.php` calls it during boot | Was open because singleton IDs could persist in long-lived workers | Yes | Fixed with regression test |
| File queue fallback DLQ / reconciliation | Agent 5 pass 1 | File fallback distinguishes retry from poison messages | `FIX_NOW -> CLOSED` | `QueueService` now tracks file attempts, writes `.dead-letter.jsonl`, and reports backlog/dead-letter/reconciliation health | Was open because failed messages stayed ordinary backlog | Yes | Fixed with regression test |
| Legacy audit file sink visibility | Agent 5 pass 1 | Legacy audit file sink must not be hidden split authority | `FIX_NOW -> CLOSED` | Health exposes `legacy_audit_file_sink`; readiness degrades when enabled; structured audit metadata records the flag | Was open because env-enabled file copy had no probe | Yes | Fixed with regression test |

## Remaining blocked external

- Restoring or regenerating `mom/data/registry` requires the missing registry source artifact set and a workspace with required database credentials such as `DB_PASSWORD`.

## Remaining product decisions

- Attachment contract semantics.
- Work-instruction signal semantics.
- Formula / aggregate contract semantics.
- Full admin-tab backend authority migration scope.
