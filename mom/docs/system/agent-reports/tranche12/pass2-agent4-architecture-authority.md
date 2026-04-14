# Tranche 12 - Pass 2 Agent 4 Architecture / Authority Red-Team

Scope: current branch tip at `db10c311` after fast-forward. Evidence used: current code, current unit tests, and current tranche docs only. No code changes were made in this pass.

## Verdict

The proof-layer work is materially better than the earlier state: request-scoped observability exists, queue fallback now has dead-letter semantics, logging health no longer pretends URL syntax is availability, and the health controller exposes the legacy audit sink explicitly. The branch is also honest enough to keep the compatibility vs authority split visible in several places.

The red-team concern is that the new health surface still compresses several distinct states into a single `ok`/`degraded` narrative. That creates two risks:

1. A runtime can look healthy while most domain slices are only compatibility-ready or partial.
2. The new readiness/status surfaces are still enterprise-global, not site-scoped, so they cannot localize a multisite authority regression.

## Findings

### 1) Runtime authority health can be green while authority is still fragmented

`RuntimeAuthorityService` only treats slices as bad when `readiness_state === 'degraded'`. Compatibility-only and authority-partial slices are counted as acceptable in the `ok` calculation in `mom/api/services/RuntimeAuthorityService.php:75-103` and `:156-167`.

That matters because the health controller now folds this posture report into readiness/status. `HealthController::evaluateComponents()` marks `runtime_authority` healthy when `authority['ok']` is true and the idempotency authority expectation is met in `mom/api/controllers/HealthController.php:261-272`.

The current test explicitly preserves the fragmented states:

- `order_workflow` => `compatibility_only`
- `master_data` => `compatibility_only`
- `manufacturing_events` => `compatibility_only`
- `trusted_release_record` => `compatibility_only`
- `connected_governance` => `authority_partial`
- `planning_scenario` => `authority_partial`
- `traceability_genealogy` => `compatibility_only`

See `mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php:50-70`.

This is not a code defect in the narrow sense, but it is a false-confidence boundary if operators read `ok` as “authoritative.” The report is a posture report, not proof that the execution backbone has converged.

### 2) Readiness/status is still enterprise-global, not multisite-scoped

The new health layer aggregates a single runtime authority report and a single set of infrastructure checks for the whole process. `HealthController` has no site, plant, or org discriminator in its readiness/status surface in `mom/api/controllers/HealthController.php:44-86` and `:92-140`.

That is in tension with the rest of the architecture, which is explicitly site-aware:

- `ConnectedGovernanceService` scopes rollout and entitlement by site in `mom/api/services/ConnectedGovernanceService.php:260-339` and rejects missing site scope in `:382-385`.
- `PlanningScenarioService` enforces org/site access gates in `mom/api/services/PlanningScenarioService.php:246-279` and `:328-367`.

The result is that a site-specific authority regression can still be flattened into one global `runtime_authority` boolean. For a multisite deployment, that is too coarse to be operationally authoritative. It is acceptable as an enterprise summary, but not as a localized readiness proof.

### 3) Compatibility fallback is treated as unhealthy by the new probe semantics

The fallback implementations are real and now better instrumented:

- `QueueService` reports `fallback_mode = file`, backlog, dead-letter count, and reconciliation need in `mom/api/services/QueueService.php:333-345`.
- `LogTransport` reports Loki configuration vs verification and fallback activity in `mom/api/services/LogTransport.php:294-313`.

But `HealthController::componentHealthy()` treats any `fallback_active === true` or non-empty `fallback_mode` as unhealthy in `mom/api/controllers/HealthController.php:278-303`.

That means file-backed queue fallback and logging fallback are intentionally considered degraded, even though the code paths are functioning and the new tests prove they work:

- `mom/tests/Unit/Services/QueueServiceFallbackTest.php`
- `mom/tests/Unit/Services/LogTransportHealthTest.php`

This may be the right policy for a strict canonicality probe, but it should be called out explicitly as a product decision. Otherwise the readiness endpoint can be misread as “service unavailable” when it really means “operating in compatibility mode.”

### 4) Queue fallback routing is lossy by design

`QueueService::routingKeyToQueue()` collapses any unmapped event exchange/routing key into the audit queue in `mom/api/services/QueueService.php:392-412`.

That is acceptable as a coarse compatibility path, but it does mean the file fallback does not preserve the full routing topology. If later audits use fallback queue backlog as proof of event-family coverage, they can overstate how much of the routing graph is actually exercised.

## What did not regress

- `SliceObservability::beginRequest()` is called at API boot in `mom/api/index.php:226-227`, and the new unit test verifies fresh trace/request IDs across calls.
- The unauthenticated readiness endpoint does not leak the internal `error` payloads that the health collector sanitizes.
- The tranche 12 closure docs still avoid claiming final merge or cleanup completion; they remain explicit that pass 2 and merge gates are pending.

## Evidence from tests

Focused verification for the changed surfaces passed:

- `tests/Unit/Services/QueueServiceFallbackTest.php`
- `tests/Unit/Services/SliceObservabilityTest.php`
- `tests/Unit/Services/LogTransportHealthTest.php`
- `tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php`

Result: 7 tests, 89 assertions, all passing.

## Conclusion

The branch is stronger on proof-layer discipline, but the new health surface still needs a stricter vocabulary. Right now it can say “ok” about a system whose domain authority is still mixed across compatibility-only and partial slices. That is the main remaining architecture risk from this tranche’s queue/log/observability work.
