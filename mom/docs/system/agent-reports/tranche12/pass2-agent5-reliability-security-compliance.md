# Tranche 12 Pass 2 Agent 5

Scope: red-team verification of the four pass-1 findings around LogTransport Loki proof, SliceObservability request context, QueueService file fallback DLQ/reconciliation, and legacy audit sink visibility.

Method: read the current integration commit in this worktree, inspect the updated code paths and unit tests, and run syntax checks on the touched PHP files. I did not change application code.

## Verdict

Three of the four pass-1 findings are now properly closed with code and test evidence. One finding was fixed in code, but the new `LogTransport` behavior creates a new operational regression: readiness can stay degraded until the first successful Loki push.

## Pass-1 findings, rechecked

| Finding | Pass-2 status | Evidence |
|---|---|---|
| Loki proof for `LogTransport` | Fixed, but with a readiness regression | [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L37), [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L200), [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L294), [LogTransportHealthTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/LogTransportHealthTest.php#L25) |
| Request-scoped observability context | Verified fixed | [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L54), [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L74), [index.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/index.php#L226), [SliceObservabilityTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/SliceObservabilityTest.php#L24) |
| QueueService file fallback DLQ/reconciliation | Verified fixed | [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L28), [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L333), [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L439), [QueueServiceFallbackTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/QueueServiceFallbackTest.php#L13) |
| Legacy audit sink visibility | Verified fixed | [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php#L586), [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L172), [index.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/index.php#L258), [HealthControllerRuntimeAuthorityTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php#L28) |

## What changed in the code

### 1. Loki proof is now explicit, but the health signal is stricter than before

`LogTransport` now distinguishes:
- configured
- verified
- available
- fallback-active

It starts `loki_available = false` until a successful push verifies the endpoint. The health payload now exposes `loki_verified`, `loki_probe_state`, and `loki_verified_at`.

That closes the pass-1 false-positive gap, but it also creates a new risk:
- `HealthController` still treats `loki_available === false` as unhealthy through `componentHealthy()`
- the app bootstrap does not show any boot-time Loki verification path
- under low traffic or before any log flush, readiness can stay degraded even when Loki is correctly configured

Evidence:
- [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L45)
- [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L200)
- [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php#L294)
- [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L278)
- [index.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/index.php#L240)

### 2. Observability context is now request-scoped in the bootstrap path

`SliceObservability` now has `beginRequest()` and stores `requestStartedAt` alongside the UUIDs. The bootstrap explicitly calls `SliceObservability::beginRequest($DATA_DIR)` before routing. The unit test confirms a second request gets fresh trace and request IDs.

Evidence:
- [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L54)
- [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php#L74)
- [index.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/index.php#L227)
- [SliceObservabilityTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/SliceObservabilityTest.php#L24)

Pass-2 red-team result:
- the earlier singleton-context concern is no longer supported by the current request path
- I did not find a new regression in this slice

### 3. QueueService file fallback now has DLQ and reconciliation evidence

The file-based queue path now tracks:
- `file_attempts`
- `file_status`
- `dead_letter_reason`
- `dead_lettered_at`
- a `.dead-letter.jsonl` side file
- backlog and dead-letter counts in health
- `file_reconciliation_required`

The fallback consumer also retains or dead-letters poison messages instead of silently cycling them forever.

Evidence:
- [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L333)
- [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L439)
- [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php#L501)
- [QueueServiceFallbackTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Services/QueueServiceFallbackTest.php#L13)

Pass-2 red-team result:
- the earlier “no DLQ/reconciliation proof” gap is closed
- the new health fields make the fallback state visible instead of hidden

### 4. Legacy audit sink is now visible in health

The legacy file sink is still present for diagnostics, but it is now surfaced as an explicit infrastructure component:
- bootstrap passes the env-controlled flag into `AuditMiddleware`
- `BaseController::auditLog()` writes the legacy file sink state into audit metadata
- `HealthController` reports `legacy_audit_file_sink` in both `status()` and `ready()`

Evidence:
- [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php#L586)
- [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php#L610)
- [AuditMiddleware.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/middleware/AuditMiddleware.php#L11)
- [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L172)
- [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php#L232)
- [HealthControllerRuntimeAuthorityTest.php](/Users/a10/Documents/mom-tranche12-a5/mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php#L28)

Pass-2 red-team result:
- the earlier hidden-sink concern is materially improved
- the sink is still legacy, but it is now visible rather than implicit

## Focused verification

Syntax checks passed for:
- [LogTransport.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/LogTransport.php)
- [SliceObservability.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/SliceObservability.php)
- [QueueService.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/services/QueueService.php)
- [BaseController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/BaseController.php)
- [AuditMiddleware.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/middleware/AuditMiddleware.php)
- [HealthController.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/controllers/HealthController.php)
- [index.php](/Users/a10/Documents/mom-tranche12-a5/mom/api/index.php)

PHPUnit execution was not available in this worktree because `mom/vendor/bin/phpunit` is absent.

## Remaining issue

The only open issue I found in pass 2 is the logging-readiness overcorrection:
- `LogTransport` now avoids the earlier false green
- but readiness can stay degraded until one successful Loki push occurs
- that is a code-fixable operational regression, not a documentation problem

## Changed files

- [mom/docs/system/agent-reports/tranche12/pass2-agent5-reliability-security-compliance.md](/Users/a10/Documents/mom-tranche12-a5/mom/docs/system/agent-reports/tranche12/pass2-agent5-reliability-security-compliance.md)
