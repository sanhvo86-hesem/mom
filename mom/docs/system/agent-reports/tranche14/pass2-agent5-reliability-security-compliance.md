# PASS 2 Agent 5 - Reliability / Security / Observability / Compliance Audit

Worktree: `/Users/a10/Documents/mom-tranche14-integration`  
Branch: `codex/tranche14-zero-trust-closure-20260414`  
Scope: pass-2 red-team review only. No code changes made.

## Executive verdict

The tranche is materially stronger than pass 1 on recovery and trust controls. Dispatch projection now degrades into an explicit dead-letter record, mobile task mutation now rolls back and dead-letters, and the trusted release/audit-pack path is hash-aware and assertion-gated. The remaining weaknesses are not basic retry mechanics; they are proof-surface gaps: observability is still local/file-based rather than end-to-end collector proven, projection dead-letter handling is not yet shown as operator-visible/reconciled, and publication truth remains blocked by generated-artifact gates.

## Verified closures

1. **Mobile rollback / dead-letter is now real and explicit.**
   - `mom/api/services/MobileWorkQueueService.php:1138-1150` restores the previous queue on append failure, writes rollback dead-letters when rollback itself fails, writes event dead-letters on journal failure, and throws `mobile_task_event_journal_failed`.
   - `mom/api/services/MobileWorkQueueService.php:1205-1224` writes `mobile_task_event` dead-letter records with a retry hint.
   - This closes the pass-1 “silent mobile failure” gap.

2. **Dispatch production projection now has dead-letter handling.**
   - `mom/api/services/ShopfloorExecutionService.php:1050-1120` returns a projection status and, on exception, emits a `dead_letter` response with `manufacturing_event_projection_failed`.
   - `mom/api/services/ShopfloorExecutionService.php:1129-1157` writes `/manufacturing-events/projection-dead-letter.jsonl` with `pending_reconciliation` state and a replay hint.
   - `mom/api/controllers/DispatchController.php:910-916` now captures the projection result instead of silently discarding it.

3. **Idempotency, outbox, dead-letter, and reconciliation behaviors are backed by real tests.**
   - `mom/tests/Integration/IdempotencyPostgresIntegrationTest.php:48-84` proves replay and conflict rejection against PostgreSQL.
   - `mom/tests/Unit/Services/DomainOutboxWorkerTest.php:13-55` proves dead-lettering instead of dropping events as done.
   - `mom/tests/Unit/Services/QueueServiceFallbackTest.php:25-54` proves file-fallback poison handling reaches dead-letter and reconciliation-required state.
   - `mom/tests/Unit/Services/EpicorWorkerDegradedPathTest.php:16-66` proves degraded unsupported-domain paths are not reported as healthy.

4. **Trusted release records and audit-pack export are stronger, but authority is intentionally split.**
   - `mom/api/services/TrustedReleaseRecordService.php:98-150` marks the structured packet as authority, requires an export copy, and records traceparent/provenance.
   - `mom/api/services/TrustedReleaseRecordService.php:165-206` freezes the packet on release and records a frozen export copy.
   - `mom/api/services/Evidence/AuditPackExporter.php:107-172` only exports when the manifest is ready; otherwise it returns `failed`.
   - `mom/tests/Unit/Services/WorldClassControlPlaneExecutionTest.php:718-759` proves durable export and readback integrity.

5. **Observability has real trace context and structured events, but still not full collector proof.**
   - `mom/api/services/SliceObservability.php:54-156` generates trace/correlation/request IDs and emits structured OTel-compatible events.
   - `mom/api/services/SliceObservability.php:289-294` enriches problem details with trace context.
   - `mom/api/controllers/ApprovalGroupController.php:127-131` uses the trace-enriched problem path.
   - `mom/tests/Unit/Services/LogTransportHealthTest.php:25-55` proves fallback health is visible and a configured Loki target is not treated as verified until push succeeds.

## Findings

### 1) [P1] Dispatch projection dead-letter exists, but operator-facing reconciliation proof is still incomplete

**Evidence**
- `mom/api/services/ShopfloorExecutionService.php:1112-1119` now returns `projection_status = dead_letter` with the dead-letter payload.
- `mom/api/services/ShopfloorExecutionService.php:1129-1157` persists the dead-letter to disk.
- `mom/api/controllers/DispatchController.php:910-916` captures the returned projection result, but the surrounding call path still does not show a health, reconciliation, or client-response contract that proves the dead-letter is surfaced beyond local assignment.

**Why this still matters**
- The failure mode is no longer silent, but zero-trust closure needs operator-visible proof that the dead-letter is reconciled or exposed to monitoring. Capturing the array is not the same as proving the system reacts to it.

**Code-fixable gap**
- Yes. A focused follow-up can surface the projection result into the response, health snapshot, or reconciliation worker input, and add a regression test that the dead-letter path is observable end to end.

**Tests / probes needed**
- Regression test that a projection failure produces a `dead_letter` status at the controller boundary.
- Probe that the dead-letter appears in the reconciliation/health surface, not only in the JSONL file.

**Regression risk**
- Medium. Touching the dispatch surface can regress operator flows if the dead-letter payload is not normalized carefully.

### 2) [P1] Observability is local and structured, but end-to-end OpenTelemetry proof is still missing

**Evidence**
- `mom/api/services/SliceObservability.php:137-156` emits `[otel.event]` into `error_log` and appends JSONL locally.
- `mom/api/services/SliceObservability.php:163-294` records trace context and enriches problem details, but there is no code evidence here of an actual OTel exporter, span processor, or collector handshake.
- `mom/docs/system/vps-observability-stack-setup-2026-04-09.md` documents stack setup, but docs are not runtime proof.

**Why this still matters**
- The platform can prove local traceability, not yet collector-backed telemetry. That is acceptable for a partial slice, not for a world-class observability claim.

**Code-fixable gap**
- Yes, if the intended target is real export rather than file/event logging only. The fix would be to wire an actual exporter or explicitly surface the local-only limitation in code and health gates.

**Tests / probes needed**
- Integration test that emits a trace and verifies delivery to the configured telemetry sink, not just local file emission.
- Health probe that distinguishes `local_only`, `collector_verified`, and `collector_unverified`.

**Regression risk**
- Medium to high. Telemetry plumbing often looks simple and breaks quietly if batching, retries, or auth are wrong.

### 3) [P2] Publication truth still blocks global publishability

**Evidence**
- `mom/data/registry/publication-truth-summary.json:32-43` sets `"publishability": { "ready": false }` and lists `"graphics_release_blockers_active"`.
- `mom/data/registry/registry-quality-report.json:7-10` uses `publishability.ready` as the gate.
- `mom/data/registry/schema-authority-summary.json:30-34` states the registry publication state is still bootstrap/partial relative to the schema authority chain.

**Why this still matters**
- Any downstream claim of clean global publication would be false green. The generated artifacts themselves still say otherwise.

**Code-fixable gap**
- Not in this slice alone. This is a product/release blocker until the graphics-governance or publication pipeline blockers are cleared and the generated artifacts are regenerated.

**Tests / probes needed**
- Re-run the publication generators after blocker removal and verify `publishability.ready=true`.
- Confirm the schema/registry publication state no longer reports bootstrap or partial drift.

**Regression risk**
- Low in code, high in release trust. The risk is in over-claiming readiness.

### 4) [P2] Audit-pack export is hash-verifiable, but the trust boundary is intentionally split

**Evidence**
- `mom/api/services/TrustedReleaseRecordService.php:120-125` states `structured_packet_is_authority = true`, `export_copy_required = true`, and `export_copy_authority = false`.
- `mom/api/services/TrustedReleaseRecordService.php:188-201` freezes the record copy and ties the copy hash to the packet hash.
- `mom/api/services/Evidence/AuditPackExporter.php:115-172` only exports when the manifest is ready and writes a bundle plus receipt with SHA-256 hashes.
- `mom/api/services/Evidence/AuditPackExporter.php:178-210` re-reads the export and verifies integrity by hash.
- `mom/tests/Unit/Services/WorldClassControlPlaneExecutionTest.php:718-759` proves the exporter writes durable bundle/receipt artifacts and that readback verifies integrity.

**Why this still matters**
- This is strong enough for a controlled export copy, but it is not the same as making the export copy authoritative. That distinction is correct and should stay explicit.

**Code-fixable gap**
- Partial. The exporter itself is well-guarded, but an end-to-end controller-to-export-to-readback regression test would reduce the remaining proof gap.

**Tests / probes needed**
- Controller-level integration test for the audit-pack export route that verifies org scoping, ready-state gating, and readback integrity in one flow.

**Regression risk**
- Low. The exporter is already conservative; the main risk is relaxing the authority split by mistake.

### 5) [P3] Generic CRUD hardening is improved, but a broad blank-plant SQL helper still exists

**Evidence**
- `mom/api/controllers/AiSchedulingController.php:176-183` still returns `WHERE 1=1` when `plant_id` is blank.
- `mom/api/controllers/AiSchedulingController.php:2387-2419` also shows a JSON fallback for operator guidance when the DB path is unavailable.
- `mom/tests/Unit/Controllers/SecurityHardeningRegressionTest.php:54-90` shows the intended hardening posture: CSRF, scoped roles, and plant filtering are expected.

**Why this still matters**
- The downstream filter prevents this from being an immediate confirmed breach, but the broad predicate is still a hardening smell. Zero-trust posture is better served by failing closed when a plant scope is required.

**Code-fixable gap**
- Yes. This is a localized hardening cleanup if the product intent is to remove the last broad SQL path.

**Tests / probes needed**
- Regression test that the affected AI surface fails closed or requires explicit plant scope when plant scoping is mandatory.

**Regression risk**
- Low to medium. Tightening a fallback can break legacy flows that relied on it, so the required business rule must be explicit.

## Summary of pass-1 gaps that are now closed or materially improved

- Mobile rollback/dead-letter: **closed**
- Dispatch projection dead-letter: **materially improved, but still partially surfaced**
- Idempotency/outbox/dead-letter/reconciliation: **verified and tested**
- Trusted release / audit-pack trustworthiness: **stronger, still intentionally split**
- Observability: **improved, still local-only in proof**
- Publication truth: **still blocked**

## Final verdict

The tranche is stronger in the control-plane places that matter most: retries no longer disappear, mobile task mutation is recoverable, release records are immutable once frozen, and audit-pack exports are hash-verifiable. What still blocks a true world-class claim is proof quality, not raw mechanics. The two biggest remaining issues are collector-backed observability and the generated publication gates that still say the platform is not ready. Until those are either closed or explicitly scoped as non-goals, the release posture remains partial rather than complete.

