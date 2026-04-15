# Tranche 18 Pass 2 - Agent 5 Reliability / Security / Observability / Compliance Reaudit

Date: 2026-04-15

## Pass-2 Findings And Closure

| Finding | Pass-2 status | Closure |
| --- | --- | --- |
| Unauthenticated readiness still leaked cache/queue internal paths | FIX_NOW | `HealthController::collectInfrastructureHealthSanitized()` now redacts `file_cache_dir` and `file_queue_dir`; regression test asserts they are absent |
| Queue reconciliation rewrite/swap could fail silently | FIX_NOW | `QueueService::rewriteFileQueue()` now records rewrite, swap, and truncate failures in health counters |
| Queue publish could hide JSON serialization failure | FIX_NOW | `filePublish()` now checks `json_encode()` before write and marks encode failure |
| Audit write-failure health lacked aggregated coverage | FIX_NOW | Health status test now proves `legacy_audit_file_sink.write_failure_count` and timestamp are surfaced |

## Verification

- Focused regression tests: 31 tests, 175 assertions.
- PHPStan: no errors.

## Verdict

Pass-2 reliability/security code-fixable findings are closed. Live OTel collector proof and Part 11 validation package remain external blockers.
