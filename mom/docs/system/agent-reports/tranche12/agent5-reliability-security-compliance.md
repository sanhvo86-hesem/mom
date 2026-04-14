# Tranche 12 Agent 5 Audit

Scope: reliability, security, observability, OT posture, secure-development evidence, and trustworthiness of records/signatures/evidence.

Method: read the active code paths, the existing tests, and the current system docs. I did not change code in pass 1.

## What is genuinely verified

- Idempotency has a real authority probe and fail-closed path when Postgres is expected but not active. See [IdempotencyService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/IdempotencyService.php#L49), [IdempotencyService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/IdempotencyService.php#L85), and [IdempotencyServiceTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/IdempotencyServiceTest.php#L128).
- The canonical DB outbox path has retry and dead-letter semantics in the DB worker. See [CanonicalOutboxWorker.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ControlPlane/CanonicalOutboxWorker.php#L27) and [DomainOutboxWorkerTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/DomainOutboxWorkerTest.php#L13).
- `HealthController` does sanitize the unauthenticated readiness payload and does surface runtime authority state. See [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L44) and [HealthControllerRuntimeAuthorityTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php#L28).

## Findings

| Severity | Finding | Status |
|---|---|---|
| P1 | Logging health can be green without a real Loki endpoint | Open |
| P1 | Observability trace context is process-singleton state, not request-scoped proof | Open |
| P1 | File-backed queue fallback has no dead-letter/reconciliation proof | Open |
| P2 | Legacy audit sink still writes a second copy to `audit.log` when enabled | Open |

### P1. Logging health can be green without a real Loki endpoint

`LogTransport` treats a syntactically valid URL as `loki_available = true` at construction time and only flips to false after a flush attempt fails. That means `/api/health/ready` can report logging as healthy even when Loki is down or unreachable and no flush has happened yet.

Evidence:
- Constructor sets availability from URL validation only: [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L40)
- Health remains optimistic until a failed push: [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L151)
- Readiness consumes `loki_available` / fallback flags through `componentHealthy()`: [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L257)
- Current unit test only proves invalid-URL fallback, not live connectivity failure: [LogTransportHealthTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/LogTransportHealthTest.php#L25)

Why it matters:
- This is a false-positive operational signal, not just a missing feature.
- If Loki is down after boot, the readiness probe can still look healthy until the first buffer flush.

### P1. Observability trace context is process-singleton state, not request-scoped proof

`SliceObservability` keeps `traceId`, `correlationId`, and `requestId` on a static singleton. The singleton is reset in tests, but I found production call sites that just call `getInstance()` and `enrichProblem()` / `logApprovalDecision()` with no visible request boundary reset. In a long-lived PHP worker, that can reuse the same trace IDs across multiple requests.

Evidence:
- Singleton storage and ID generation: [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L24)
- IDs are created once in the constructor: [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L51)
- Production call sites use `getInstance()` directly: [ApprovalGroupController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/ApprovalGroupController.php#L127) and [ApprovalGroupService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ApprovalGroupService.php#L421)
- Reset appears in tests, not in app bootstrap: [runtime_assurance_suite.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/runtime_assurance_suite.php#L223)

Why it matters:
- The code claims OTel-compatible trace context, but the implementation does not prove per-request uniqueness in the running app.
- That weakens correlation for incident analysis, audit replay, and cross-service troubleshooting.

### P1. File-backed queue fallback has no dead-letter/reconciliation proof

`QueueService` falls back to JSONL file publication whenever AMQP is unavailable or publish fails. The file consumer keeps failed messages in the same queue file for retry, but it never records an attempt counter, dead-letter state, or reconciliation state. A poison message can sit in the file queue indefinitely and still look like ordinary backlog.

Evidence:
- AMQP publish falls through to file append: [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L160)
- `consume()` switches to file mode when RabbitMQ is unavailable: [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L223)
- `getHealth()` only reports AMQP availability and file directory, not backlog health or poison-message state: [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L330)
- File consumer keeps failed messages in place with no DLQ: [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L404)
- The test coverage I found for dead-letter behavior is on the legacy DB outbox worker, not on this file fallback path: [DomainOutboxWorkerTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/DomainOutboxWorkerTest.php#L13)

Why it matters:
- This is a real reconciliation gap, not a stylistic concern.
- If the queue fallback becomes active during an outage, operators do not get an evidence trail that distinguishes healthy retry from a stuck poison message.

### P2. Legacy audit sink still writes a second copy to `audit.log` when enabled

`BaseController::auditLog()` still has a conditional path that writes to `data/audit.log` when `MOM_ENABLE_LEGACY_AUDIT_LOG` is set, then separately writes the structured event into the audit store. `AuditMiddleware` is also explicitly described as a legacy request-access audit sink. That is a split authority path for audit evidence, and I did not find any health/probe surface that tells operators when the legacy file sink is active.

Evidence:
- Legacy file write is still present behind an env flag: [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php#L586)
- The canonical DB event write happens separately: [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php#L617)
- The middleware itself says it is a legacy sink and should only be used for short-lived diagnostics: [AuditMiddleware.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/middleware/AuditMiddleware.php#L10)

Why it matters:
- This can produce audit evidence split across two stores without a reconciliation control.
- For regulated records, that is a weaker trust model than a single authoritative audit trail with an explicit probe.

## Test and syntax verification

Executed:
- `php -l` on [IdempotencyService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/IdempotencyService.php)
- `php -l` on [PostgresIdempotencyReplayRepository.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/PostgresIdempotencyReplayRepository.php)
- `php -l` on [FileIdempotencyReplayRepository.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/FileIdempotencyReplayRepository.php)
- `php -l` on [CacheIdempotencyReplayRepository.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/CacheIdempotencyReplayRepository.php)
- `php -l` on [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php)
- `php -l` on [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php)
- `php -l` on [AuditMiddleware.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/middleware/AuditMiddleware.php)
- `php -l` on [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php)
- `php -l` on [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php)
- `php -l` on [EvidenceVaultService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/EvidenceVaultService.php)
- `php -l` on [TrustedReleaseRecordService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/TrustedReleaseRecordService.php)
- `php -l` on [CanonicalOutboxService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ControlPlane/CanonicalOutboxService.php)
- `php -l` on [CanonicalOutboxWorker.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ControlPlane/CanonicalOutboxWorker.php)
- `php -l` on [DomainOutboxService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ControlPlane/DomainOutboxService.php)
- `php -l` on [DomainOutboxWorker.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/ControlPlane/DomainOutboxWorker.php)

Skipped:
- PHPUnit and composer-level verification, because this worktree does not have `mom/vendor/` installed, so `vendor/bin/phpunit` is not available here.

## Bottom line

The strongest parts of the current implementation are the fail-closed idempotency authority probe and the canonical DB outbox worker. The remaining code-fixable risk is not around syntax or basic routing; it is around false confidence: logging health can look better than it is, observability context is not provably request-scoped, the file queue fallback does not have DLQ/reconciliation proof, and audit evidence can still split across a legacy file sink and the structured store.
