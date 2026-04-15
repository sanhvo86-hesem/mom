# Tranche 18 Pass 2 - Agent 6 Defect Hunter / Backlog Reaudit

Date: 2026-04-15

## Pass-2 Ledger

| Item | Status after fixes | Evidence |
| --- | --- | --- |
| Trusted release read-path fail-open when session partition missing | CLOSED_BY_IMPLEMENTATION | `TrustedReleaseRecordController::verifyPacketScope()` now fails closed; regression tests cover missing session and missing packet scope |
| Readiness cache/queue path leaks | CLOSED_BY_IMPLEMENTATION | `HealthControllerRuntimeAuthorityTest` asserts `file_cache_dir` and `file_queue_dir` are absent |
| Queue publish encode failure | CLOSED_BY_IMPLEMENTATION | `QueueServiceFallbackTest::testFilePublishEncodeFailureIsSurfacedInHealth` |
| Queue rewrite/swap failure | CLOSED_BY_IMPLEMENTATION | `QueueServiceFallbackTest::testQueueRewriteFailureIsSurfacedInHealth` |
| Audit sink health aggregation | CLOSED_BY_IMPLEMENTATION | `HealthControllerRuntimeAuthorityTest::testStatusSurfacesLegacyAuditSinkWriteFailures` |
| Periodic evaluation controller accepted caller scope while service required org authority | CLOSED_BY_IMPLEMENTATION | `EqmsControlPlaneController::schedulePeriodicEvaluation()` and `closePeriodicEvaluation()` now reject caller scope and inject session-derived `org_id` |
| Migration 135 generated-artifact drift | CLOSED_BY_IMPLEMENTATION | `canonical_publication_orchestrator.py` PASS; `data_schema_admin_smoke.php` ok; `verify_publication_truth.py` PASS 271/271 |
| `machine_raw_events` direct governance metadata gap | CLOSED_BY_IMPLEMENTATION | Migration 135 and `MachineEventSpineService` include `payload_schema_version` and `row_version`; Data Schema smoke no longer reports governance gaps |
| Helper worktree/branch cleanup | PENDING_FINAL_PHASE | Required after merge/pass3 |
| OTel live collector/exporter proof | BLOCKED_EXTERNAL | Requires deployed telemetry backend |
| Part 11 validation/WORM proof | BLOCKED_EXTERNAL | Requires validation package and operational controls |
| Vendor-suite parity | PRODUCT_DECISION_REQUIRED | Roadmap/product scope |

## Verification

- `./composer test -- --filter 'PlanningReleaseScopeAuthorityTest|PlanningScenarioServiceTest|HealthControllerRuntimeAuthorityTest|QueueServiceFallbackTest|AuditMiddlewareFallbackHealthTest'`: 31 tests, 175 assertions.
- `./composer analyse -- --memory-limit=1G`: no errors.
- `python3 mom/tools/registry/canonical_publication_orchestrator.py`: PASS after migration 135 regeneration.
- `php mom/tests/data_schema_admin_smoke.php`: ok.
- `python3 mom/tools/verify_schema_authority.py`: PASS 9/9.
- `python3 mom/tools/registry/verify_publication_truth.py`: PASS 271/271.

## Verdict

No known pass-2 code-fixable defect remains open on the integration branch. Cleanup remains intentionally pending until final phase.
