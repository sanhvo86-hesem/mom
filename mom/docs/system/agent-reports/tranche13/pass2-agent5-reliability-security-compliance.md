# Tranche 13 Agent 5 Pass-2 Reliability / Security / Observability / Compliance Audit

Scope: red-team review of tranche13 implementation changes for idempotency, retry/outbox/DLQ evidence surfaces, logging/metrics/traces claims, VPS command allowlists, strict authority health readiness, verifier/orchestrator false-green behavior, and Part 11 / OT / security overclaim risk.

## Verdict

The tranche13 implementation is materially stricter and more honest than the previous state.

- `VpsService` now rejects non-whitelisted VPS actions before execution and still enforces host-level `safe_actions`.
- `RuntimeAuthorityService` now distinguishes compatibility, degraded, and authoritative-ready states instead of collapsing them into one green path.
- The publication orchestrator dry-run is explicitly non-verified, which removes the old false-green pattern.
- Observability and trusted-record paths still expose only the evidence they can actually prove.

## Rechecked Findings

| Area | Pass-2 result | Evidence |
| --- | --- | --- |
| Idempotency / replay / authority | Verified honest. `IdempotencyService::backendProbe()` now reports backend, readiness state, and `expected_authority_met`; `RuntimeAuthorityServiceTest` confirms JSON-only runs stay `compatibility_only`, and PostgreSQL-mismatch runs degrade. | `mom/api/services/IdempotencyService.php:65-88`, `mom/api/services/RuntimeAuthorityService.php:37-110`, `mom/tests/Unit/Services/IdempotencyServiceTest.php`, `mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php` |
| Retry / outbox / DLQ | Verified honest. File fallback now increments attempts, writes `.dead-letter.jsonl`, and exposes backlog/dead-letter/reconciliation health. | `mom/api/services/QueueService.php:333-344,414-533`, `mom/tests/Unit/Services/QueueServiceFallbackTest.php` |
| VPS command allowlist | Verified fixed without regression. `runAction()` rejects non-whitelisted actions, then host `safe_actions` applies a second gate. Smoke coverage shows `health` succeeds while `docker_ps` is rejected for `local-vps`. | `mom/api/services/VpsService.php:17-22,295-307,2790-2803`, `mom/tests/vps_control_tower_smoke.php:231-240` |
| Health readiness / strict authority | Verified strict, but this is the one code-fixable judgment call. `HealthController` now treats `runtime_authority_strict` as a health component, so mixed-authority deployments remain unhealthy even when the runtime is otherwise functional. That is fail-closed and honest, but if `/ready` is meant to mean service liveliness rather than strict authority, this coupling is too strong. | `mom/api/controllers/HealthController.php:261-303`, `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php:50-63,106-139` |
| Verifier / orchestrator false-green | Verified fixed. Dry-run now ends with `Overall: DRY-RUN (NOT VERIFIED)` and does not print `Overall: PASS`; the unit test asserts the same. | `mom/tools/registry/canonical_publication_orchestrator.py`, `mom/tests/Unit/Services/PublicationOrchestratorDryRunTest.php`, current dry-run output |
| Logging / traces / OT claims | Evidence is log-enriched trace context, not a full telemetry pipeline. `SliceObservability` emits `[otel.event]` JSON to `error_log` and structured files; the runtime assurance suite explicitly labels this `file_export_only (honest)`. Any claim of full OpenTelemetry export would be overclaim. | `mom/api/services/SliceObservability.php:18-19,130-155`, `mom/tests/runtime_assurance_suite.php:242-244` |
| Part 11 / record trustworthiness | The repo has real integrity and record-copy controls, but not a full validated Part 11 package. `TrustedReleaseRecordService` checks approval/signature presence, hashes the packet, and records retention metadata; `UploadHardeningService` checks magic bytes and SHA-256 integrity. That is good evidence, but it is not proof of full regulatory compliance. | `mom/api/services/TrustedReleaseRecordService.php:97-150,320-333,538-560,784-792`, `mom/api/services/UploadHardeningService.php:269-285` |

## Code-Fixable Defect

1. `runtime_authority_strict` is wired into health `ok`, which makes `/ready` fail whenever the deployment is not fully authoritative.
   - This is correct if the endpoint is meant to gate only strict-authority deployments.
   - It is a defect if the endpoint is intended to mean “the service is live and can serve compatibility-mode traffic.”
   - The fix would be to separate liveness/readiness from authority strictness, but only if that is the desired product contract.

## Evidence Notes

- `VpsService` global allowlist: `ALLOWED_VPS_ACTIONS` includes `health`, `docker_ps`, `nginx_test`, `ports`, `recent_logs`, `terminal_gateway_logs`, and `observability_logs`.
- `VpsService` host gate: `resolveAction()` still requires the action to exist in the host’s `safe_actions`.
- `HealthController` still surfaces `evidence_vault`, `upload_hardening`, and `legacy_audit_file_sink`, so audit consumers can see the runtime trust boundary instead of inferring it.
- `SliceObservability` carries trace IDs and request IDs, but it does not pretend to be an OTLP exporter.

## Verification

Executed:

- `php -l mom/api/services/VpsService.php`
- `php -l mom/api/controllers/HealthController.php`
- `php -l mom/api/services/RuntimeAuthorityService.php`
- `php -l mom/api/services/IdempotencyService.php`
- `php -l mom/api/services/SliceObservability.php`
- `php -l mom/api/services/TrustedReleaseRecordService.php`
- `php -l mom/api/services/UploadHardeningService.php`
- `python3 mom/tools/registry/canonical_publication_orchestrator.py --dry-run`

Skipped:

- PHPUnit was not runnable in this worktree because `mom/vendor/bin/phpunit` is absent.

## Changed File

- `mom/docs/system/agent-reports/tranche13/pass2-agent5-reliability-security-compliance.md`
