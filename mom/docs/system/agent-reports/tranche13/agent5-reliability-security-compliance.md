# Tranche 13 Agent 5 Reliability / Security / Observability / Compliance Audit

Scope: pass-2 red-team review of the tranche12 reliability/security fixes, with attention to idempotency, retry/outbox/inbox/dead-letter/reconciliation, logging/metrics/traces, OT/security posture, secure development evidence, record/signature/evidence trustworthiness, and repo/process drift around registry/bootstrap artifacts.

## Verdict

The tranche12 follow-up work closed the three strongest pass-1 gaps:

1. `SliceObservability` now has request-scoped initialization in bootstrap.
2. `QueueService` now has visible file-fallback dead-lettering and reconciliation signals.
3. The legacy audit file sink is now surfaced in runtime health and metadata instead of hiding behind an unmentioned fallback.

`LogTransport` is also materially better than before because it no longer presents Loki as healthy without proof. The remaining caveat is that Loki readiness is still only proven by a successful push; there is no separate preflight verification path. That is honest, but it is still weaker than a boot-time or probe-time proof of availability.

## Pass-1 Findings Rechecked

| Area | Pass-1 issue | Pass-2 result | Evidence |
| --- | --- | --- | --- |
| LogTransport | False-green logging health / unverified Loki state | Fixed as a false-green. Health now reports `loki_configured`, `loki_verified`, and `loki_probe_state`, and configured Loki starts as `unverified` rather than silently healthy. Residual caveat: verification still depends on the first successful push. | `mom/api/services/LogTransport.php`, `mom/tests/Unit/Services/LogTransportHealthTest.php`, `mom/api/controllers/HealthController.php` |
| SliceObservability | Request context was singleton-like and not clearly reset per request | Fixed. Bootstrap now calls `SliceObservability::beginRequest($DATA_DIR)`, and the unit test verifies fresh trace/request IDs. | `mom/api/index.php`, `mom/api/services/SliceObservability.php`, `mom/tests/Unit/Services/SliceObservabilityTest.php` |
| QueueService fallback | File fallback lacked dead-letter/reconciliation proof | Fixed. The file queue now tracks attempts, emits dead-letter JSONL, and exposes `file_dead_letter_count` / `file_reconciliation_required`. | `mom/api/services/QueueService.php`, `mom/tests/Unit/Services/QueueServiceFallbackTest.php`, `mom/api/controllers/HealthController.php` |
| Legacy audit sink | Legacy audit logging existed but was not visible as a trust boundary | Fixed. Health now exposes `legacy_audit_file_sink`, and controller metadata records whether the legacy sink was enabled. | `mom/api/controllers/BaseController.php`, `mom/api/controllers/HealthController.php`, `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php` |

## Findings

### 1. Loki proof is honest now, but still not preflight-proven

`LogTransport` no longer claims Loki is healthy by default. The constructor marks a configured Loki endpoint as `unverified`, and the first successful push flips the health state to verified. The health payload now exposes:

- `loki_configured`
- `loki_available`
- `loki_verified`
- `loki_probe_state`
- `loki_verified_at`

That is an improvement over a false-green. The residual weakness is that there is still no distinct readiness probe that proves Loki reachability before the first real push. In operational terms, the system is now truthful, but not fully preflight-verified.

### 2. Request-scoped observability is now grounded in bootstrap

`SliceObservability` now has `beginRequest()`, which resets singleton state per request. The API bootstrap calls it early, and the unit test confirms two successive requests get different trace and request IDs.

This closes the prior false-confidence gap where trace context could look stable even though it was only a process singleton.

### 3. File fallback queues now leave a reconciliation trail

`QueueService` now increments attempt counts, writes dead-letter records when poison messages exceed the retry threshold, and publishes queue health fields that make fallback state visible.

That gives the file fallback a real operational story:

- backlog can be measured
- dead letters can be counted
- reconciliation requirement is explicit
- poison messages no longer disappear into a hidden retry loop

### 4. Legacy audit sink is visible instead of implicit

`BaseController::auditLog()` still allows the legacy file sink behind `MOM_ENABLE_LEGACY_AUDIT_LOG`, but the path is now disclosed in metadata and surfaced in health. That reduces the risk of an undocumented dual-authority write path.

## Process / Registry Bootstrap Drift

I also checked the registry/bootstrap artifacts and the related smoke coverage around system contract authority. The existing test surface already includes registry authority and bootstrap coverage in `tests/enterprise_registry_authority_smoke.php` and `tests/data_schema_admin_smoke.php`.

I did not find a new reliability/security regression in those bootstrap artifacts during this pass. The main point remains the same: the repo is better when authority is asserted by runtime checks and smoke coverage, not just by registry documents.

## Verification

Executed / inspected:

- PHP syntax checks on the touched reliability/security slices passed previously:
  - `mom/api/services/LogTransport.php`
  - `mom/api/services/SliceObservability.php`
  - `mom/api/services/QueueService.php`
  - `mom/api/controllers/BaseController.php`
  - `mom/api/controllers/HealthController.php`
  - `mom/api/index.php`
  - `mom/api/middleware/AuditMiddleware.php`
- Current unit tests provide the core proof for the fixes:
  - `mom/tests/Unit/Services/LogTransportHealthTest.php`
  - `mom/tests/Unit/Services/SliceObservabilityTest.php`
  - `mom/tests/Unit/Services/QueueServiceFallbackTest.php`
  - `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`

Blocked:

- PHPUnit was not runnable in this worktree because `mom/vendor/bin/phpunit` is absent.

## Changed Files

- `mom/docs/system/agent-reports/tranche13/agent5-reliability-security-compliance.md`
