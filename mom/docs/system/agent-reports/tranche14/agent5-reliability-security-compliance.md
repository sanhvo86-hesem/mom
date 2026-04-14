# Agent 5 Audit Report - Reliability / Security / Observability / Compliance

Worktree: `/Users/a10/Documents/mom-tranche14-a5`  
Branch: `codex/tranche14-a5-reliability-security-compliance`  
Scope: pass 1 audit only. No code changes made.

## Executive Summary

The repo has real coverage for idempotency replay, controlled outbox/dead-letter handling, and custom trace-context capture. However, the execution surface still contains a few high-risk weak points:

1. dispatch production-event projection can fail silently after the main write path has already committed;
2. mobile task completion persists state before event journaling, so a journal failure can leave execution truth and audit truth out of sync;
3. observability is partially implemented through custom trace-context and JSONL logging, but I found no end-to-end collector/exporter wiring in `mom/api`, so OTel compatibility is not verified as a live runtime path;
4. repo publication/readiness artifacts still report blocked release posture, so final merge readiness is externally blocked even where code is otherwise healthy.

## Verified Controls

- `IdempotencyService` has a real replay ledger with conflict detection, backend probing, and tests for PostgreSQL replay behavior. See [`IdempotencyService.php`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/IdempotencyService.php#L65) and [`IdempotencyPostgresIntegrationTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Integration/IdempotencyPostgresIntegrationTest.php#L48).
- Dead-letter handling exists in queue/outbox infrastructure, not just in docs. See [`QueueServiceFallbackTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Unit/Services/QueueServiceFallbackTest.php#L25), [`DomainOutboxWorkerTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Unit/Services/DomainOutboxWorkerTest.php#L13), and [`EpicorWorkerDegradedPathTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Unit/Services/EpicorWorkerDegradedPathTest.php#L16).
- Mobile task completion now requires an explicit `startTask()` transition and rejects double completion. See [`MobileWorkQueueServiceTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Unit/Services/MobileWorkQueueServiceTest.php#L79) and [`MobileWorkQueueService.php`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/MobileWorkQueueService.php#L288).
- The prior blank-plant AI fallback leak is closed in code and regression-guarded. See [`AiSchedulingController.php`](/Users/a10/Documents/mom-tranche14-a5/mom/api/controllers/AiSchedulingController.php#L176) and [`SecurityHardeningRegressionTest.php`](/Users/a10/Documents/mom-tranche14-a5/mom/tests/Unit/Controllers/SecurityHardeningRegressionTest.php#L55).

## Findings

### 1. Dispatch production projection can fail silently after state mutation

`DispatchController::recordProductionReport()` commits the JSON state update and DB bridge writes, releases the execution lock, and then calls `ShopfloorExecutionService::appendProductionReportEvent()`. That method wraps the entire projection in `catch (Throwable)` and only writes to `error_log`.

Evidence:
- [`DispatchController.php#L896-L916`](/Users/a10/Documents/mom-tranche14-a5/mom/api/controllers/DispatchController.php#L896)
- [`ShopfloorExecutionService.php#L1049-L1095`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/ShopfloorExecutionService.php#L1049)

Why it matters:
- The request can return success even if the operational event projection fails.
- Audit/replay truth then depends on a log line, not a durable retry or dead-letter path.
- This is a false-confidence risk for compliance evidence and traceability.

Classification:
- `FIX_NOW` for a later remediation tranche.

Regression risk:
- Any fix must preserve the current dispatch write semantics and legacy fallback behavior while making the projection failure durable and observable.

### 2. Mobile task completion is not atomic with task-event journaling

`MobileWorkQueueService::completeTask()` writes the task snapshot first, then appends `mobile.task_completed`. There is no rollback if the event write fails, and `appendTaskEvent()` itself does not provide a retry or dead-letter path.

Evidence:
- [`MobileWorkQueueService.php#L249-L330`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/MobileWorkQueueService.php#L249)
- [`MobileWorkQueueService.php#L1137-L1175`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/MobileWorkQueueService.php#L1137)

Why it matters:
- A completed task can exist without its corresponding event record.
- That breaks append-only audit expectations and makes offline reconciliation harder.
- The lock prevents concurrent corruption, but it does not make the write path transactional.

Classification:
- `FIX_NOW` for a later remediation tranche.

Regression risk:
- Event sequencing changes must not reintroduce the earlier "auto-complete without explicit start" regression; the current unit test already guards that behavior.

### 3. Observability is custom and partial, not yet proven as an end-to-end OTel runtime

The repo does have a custom observability service with `trace_id`, `correlation_id`, `request_id`, and OTel-shaped event envelopes. It is wired into approval-group flows and problem-details enrichment. But the emission path is local `error_log()` plus JSONL files, and I found no collector/exporter wiring, trace propagation middleware, or `otel` package integration in `mom/api`.

Evidence:
- [`SliceObservability.php#L7-L20`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/SliceObservability.php#L7)
- [`SliceObservability.php#L114-L156`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/SliceObservability.php#L114)
- [`ApprovalGroupController.php#L127-L131`](/Users/a10/Documents/mom-tranche14-a5/mom/api/controllers/ApprovalGroupController.php#L127)
- [`TrustedReleaseRecordService.php#L134-L137`](/Users/a10/Documents/mom-tranche14-a5/mom/api/services/TrustedReleaseRecordService.php#L134)

What is verified:
- trace context exists;
- some controllers enrich payloads with trace context;
- custom observability events are persisted locally.

What is unproven:
- live exporter/collector integration;
- end-to-end trace propagation across request boundaries;
- runtime dashboards consuming the trace context as an actual telemetry pipeline rather than local log files.

Classification:
- `PARTIAL` / `UNPROVEN` rather than complete.

Suggested probe:
- one integration smoke that asserts a request emits a trace context record through the configured collector path, not just local JSONL or `error_log`.

### 4. Release/readiness publication is still blocked by generated truth

The generated publication artifacts say the platform is not ready to publish because graphics governance blockers remain active.

Evidence:
- [`publication-truth-summary.json#L8-L18`](/Users/a10/Documents/mom-tranche14-a5/mom/data/registry/publication-truth-summary.json#L8)
- [`registry-quality-report.json#L8-L20`](/Users/a10/Documents/mom-tranche14-a5/mom/data/registry/registry-quality-report.json#L8)
- [`schema-authority-summary.json#L2-L34`](/Users/a10/Documents/mom-tranche14-a5/mom/data/registry/schema-authority-summary.json#L2)

Why it matters:
- The repo is honest about the blocker, but it is still a blocker.
- This is not a code defect in the audit slice; it is a merge-readiness gate that must be cleared before pretending the tranche is world-class-ready.

Classification:
- `BLOCKED_EXTERNAL` / `PRODUCT_DECISION_REQUIRED` depending on whether the graphics-governance blocker is owned by this tranche.

## Code-Fixable Gaps

1. Add a durable retry or dead-letter path for dispatch production-event projection failures instead of `error_log`-only projection failure handling.
2. Make mobile task-event journaling part of the same reconciliation story as the task snapshot write, or add a verified recovery worker for missing task events.
3. Add an actual runtime telemetry smoke for the observability path so `OTel-compatible` means more than trace-shaped JSON.

## Tests / Probes Needed

- Failure-injection test for `appendProductionReportEvent()` that proves projection failure is captured durably and does not vanish behind `error_log`.
- Failure-injection test for `completeTask()` showing snapshot/event consistency or explicit reconciliation when task-event append fails.
- Integration probe for trace emission through the configured observability pipeline, not just internal JSONL output.
- Optional merge-gate smoke for the generated publication truth artifact so the release blocker cannot be hidden by prose.

## External / Product Blockers

- `publication_truth.ready = false` and `releaseReadinessState = "blocked-by-graphics-governance"`. That is a real release gate blocker in the generated artifacts, not a code smell.
- If the intent is to treat the current observability path as "world-class OTel", the repo still needs a product decision on whether local JSONL event logging is sufficient or whether a real collector/exporter contract is required.

## Regression Risk

- Changing the dispatch or mobile event sequences can easily reintroduce false-complete or double-complete behavior. Keep the existing explicit-start and double-completion tests intact.
- Turning silent bridge failures into hard failures may surface more partial-write behavior during load; that is desirable, but it should be paired with a clear retry or dead-letter path.

## Bottom Line

Reliability and compliance are materially stronger than a plain CRUD portal, but the current tranche is still not fully world-class on proof quality. The biggest remaining risks are silent projection failure, non-atomic event journaling, and observability that is trace-shaped but not yet fully proven as a live collector-backed pipeline.
