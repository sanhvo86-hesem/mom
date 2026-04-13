# World-Class Benchmark Gap Tranche 3

**Date**: 2026-04-13  
**Scope**: backend runtime authority, integration backbone, observability, compliance evidence, generated authority artifacts.

## Reaudit Evidence

| Area | Current evidence |
|---|---|
| Repo instructions | No `AGENTS.md` was present. Repo standards under `standards/` were read before implementation. |
| Idempotency authority | `IdempotencyService` selects `PostgresIdempotencyReplayRepository` when existing PostgreSQL config is enabled and otherwise uses cache/file fallback. Migration `097_idempotency_replay_ledger.sql` exists and schema authority summary advertises migration range `001-097`. |
| Idempotency tests | Unit tests cover file fallback, cache compatibility, PostgreSQL fake replay, duplicate conflict, in-progress fail-closed behavior, failed-attempt retry, completion-persistence failure, failure-marker failure, long scope hash authority, and legacy namespace aliases. Gated live PostgreSQL integration test exists. |
| Order workflow authority | `OrderWorkflowService` uses `OrderWorkflowRepository`; default `JsonOrderWorkflowRepository` owns JSON order store, audit JSONL, notification JSONL, and optional PostgreSQL shadow-write mechanics. MVC and legacy entrypoints instantiate it without a DB connection, so current runtime is JSON primary. |
| Master-data authority | `MasterDataService` uses `MasterDataRepository`; default `JsonMasterDataRepository` owns active/history/pending/archive/reference JSON stores. No PostgreSQL-native repository is present. |
| Integration backbone | `OutboxWorker`, `EpicorIntegrationService`, `EpicorInboundWorker`, `QueueService`, and runtime stores provide retry/dead-letter/reconciliation concepts, but outbox/inbox semantics are still JSON/runtime-store centered rather than transactional DB outbox/inbox authority. |
| Control surface | `mom/api/index.php` is now bootstrap plus modular route includes. Auth, core, operations, platform, generic runtime, frontend alias, and REST route modules exist. |
| Observability | `SliceObservability` provides trace/correlation/request ids for one governance slice and `LogTransport` supports observability events, but there is no central runtime authority metrics surface for idempotency/order/master/outbox yet. |
| Compliance/evidence | Audit trail, evidence vault, upload hardening, approval/e-signature schema, operational override signature payloads, shipment gates, supplier quality, CAPA/NCR and compliance reporting exist. Runtime coverage is mixed and not enough to claim full Part 11/62443/SSDF readiness. |
| Generated authority artifacts | `registry-manifest.json`, schema summary artifacts, endpoint catalog, table registry, and contract authority files are present and recently generated on 2026-04-13. |

## Benchmark Gap Matrix

| Dimension | Classification | Current repo evidence | Blocking gap |
|---|---:|---|---|
| 1. Level-3/Level-4 architecture clarity | YELLOW | Standards, module architecture docs, ERP/MOM/MES/eQMS routes, Epicor integration services, and generated registry artifacts exist. | Runtime authority report does not yet state which operational slices are Level-3 authoritative versus compatibility adapters. |
| 2. Operational authority | YELLOW | Idempotency has a PostgreSQL ledger. Order workflow and master data have repository boundaries. | Order workflow and master data remain JSON primary in current entrypoints; runtime does not expose that posture explicitly. |
| 3. Async integration backbone | RED | Outbox worker supports retry/dead-letter and Epicor runtime has reconciliation exceptions. | No transactional DB outbox/inbox/reconciliation authority table is integrated into worker path. |
| 4. Digital thread / genealogy / production history | YELLOW | MES runtime, evidence vault, order hierarchy, genealogy-oriented APIs, and audit trails exist. | Production history is not yet one DB-authoritative eDHR/eBR backbone across orders, MES, evidence, and quality events. |
| 5. Closed-loop quality | YELLOW | Shipment gates, NCR/CAPA, QualityIntegrationService, supplier quality, FMEA links, and compliance reports exist. | Quality loops are not uniformly DB-authoritative and not uniformly tied to transactional outbox/evidence controls. |
| 6. Supplier quality / quality externalization | YELLOW | SupplierQualityService, SCAR, ASL, supplier dashboards, supplier metrics and policies exist. | Supplier quality is not proven as an authoritative multi-site DB workflow with external partner controls. |
| 7. Compliance-grade records and signatures | YELLOW | Evidence vault, upload hardening, audit trail, e-signature migrations, allocation lifecycle signatures, and override signatures exist. | Full Part 11 validation, record-copy, retention, e-signature enforcement, and evidence-integrity proof are not complete end-to-end. |
| 8. Observability maturity | RED | Slice-level correlation exists; health endpoints report infrastructure. | No OpenTelemetry-class platform-wide authority metrics, no central authority state, and no outbox/dead-letter metrics surface. |
| 9. Security / SDL maturity | YELLOW | Auth middleware, API keys, RBAC, RLS migrations, upload hardening, audit middleware, and security-oriented docs exist. | SSDF/62443 lifecycle evidence, threat model, remediation loop, and release gates are partial. |
| 10. Control-surface modularity | GREEN | `api/index.php` loads route modules and dispatches through `Router`; previous parity checks preserved route counts. | Further route cleanup is lower priority than authority and observability gaps. |
| 11. Multi-site / multi-plant readiness | YELLOW | Schema and observability conventions include org/site/plant fields; registry models platform-global authority. | Runtime enforcement and health posture are not consistently multi-site aware across JSON-backed slices. |
| 12. Stress / failover / concurrency proof | YELLOW | Idempotency tests cover fail-closed in-progress and completion-failure semantics; broader smoke suites exist. | Live DB concurrency, failover, outbox crash/resume, and reconciliation stress proof remain incomplete. |

## Prior Tranche Improvements

- Idempotency moved from file/cache primary intent to PostgreSQL replay ledger when PostgreSQL is enabled.
- Idempotency gained migration `097_idempotency_replay_ledger.sql`, schema authority artifact coverage, hash authority for long scope keys, namespace aliases, and focused tests.
- Order workflow and master data gained repository boundaries so business services no longer own file layout directly.
- Route registration was split out of `api/index.php` into domain modules.

## Tranche 3 Implementation Scope

This tranche implements Priority A. Priority B/C/D/E remain explicitly deferred because the nearest blocker was hidden/ambiguous runtime authority posture, not lack of another broad refactor.

- Add explicit runtime authority report for idempotency, order workflow, and master data.
- Expose readiness states: `authoritative_ready`, `authority_partial`, `compatibility_only`, and `degraded`.
- Make idempotency active backend and expected PostgreSQL authority observable.
- Add fail-loud verification for idempotency when PostgreSQL authority is expected but fallback is active.
- Add idempotency counters for first executions, replays, conflicts, in-progress conflicts, fallback executions, and failures.
- Add order/master readiness probes that honestly report JSON primary and optional shadow posture.
- Expose authority state through health/status without changing public route behavior.
- Add focused tests for authority probes, expected-primary fallback behavior, and idempotency counters.

## Implemented Priority A Evidence

| Requirement | Evidence |
|---|---|
| Runtime authority state is explicit | `RuntimeAuthorityService` reports idempotency, order workflow, and master-data slices with readiness state, active backend, and authority mode. |
| Idempotency DB authority is verifiable | `IdempotencyService::backendProbe()` now reports expected backend, active backend, readiness, configuration error, authority match, and metrics. |
| Expected PostgreSQL but fallback active fails loudly | `IdempotencyService::assertExpectedPostgresAuthority()` throws when existing DB config expects PostgreSQL and the active repository is file/cache/custom. Health readiness marks runtime authority false for that mismatch. |
| Counters exist for touched flow | Idempotency now counts first execution, replay, conflict, fingerprint conflict, in-progress conflict, fallback execution, PostgreSQL execution, failures, and disabled pass-through. |
| Order workflow truth is not hidden | `OrderWorkflowService::authorityProbe()` and `JsonOrderWorkflowRepository::authorityProbe()` classify current entrypoints as JSON compatibility primary unless a DB-backed/shadow adapter is actually present. |
| Master-data truth is not hidden | `MasterDataService::authorityProbe()` and `JsonMasterDataRepository::authorityProbe()` classify active/history/pending/archive stores as JSON compatibility primary. |
| Admin/runtime health exposes authority | `HealthController::ready()` includes authority readiness and `HealthController::status()` includes the full authority report. |
| Drift hooks exist for shadow path | Order workflow JSON adapter exposes shadow write attempts/failures and last shadow error as a mismatch counter hook when a DB adapter is present. |

## Verification After Implementation

- `mom/vendor/bin/phpunit --configuration mom/phpunit.xml mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php mom/tests/Unit/Services/IdempotencyServiceTest.php`
- `mom/vendor/bin/phpunit --configuration mom/phpunit.xml mom/tests/Unit/Services/IdempotencyServiceTest.php mom/tests/Unit/Services/RuntimeAuthorityServiceTest.php mom/tests/Unit/Services/OrderWorkflowRepositoryBoundaryTest.php mom/tests/Unit/Services/MasterDataRepositoryBoundaryTest.php`
- `php mom/tests/backend_smoke.php`
- `php mom/tests/runtime_assurance_suite.php`
- `php mom/tests/order_runtime_governance_smoke.php`
- `php mom/tests/data_schema_admin_smoke.php`
- `php mom/tests/enterprise_registry_authority_smoke.php`
- `python3 mom/tools/verify_schema_authority.py`

## Explicit Deferrals

- Priority B transactional outbox/inbox/reconciliation DB backbone is deferred unless Priority A finishes cleanly and test time remains.
- Priority C platform-wide OpenTelemetry-class correlation/metrics is deferred beyond the Priority A authority metrics added here.
- Priority D route modularization is already substantially complete and is not reopened in this tranche.
- Priority E full security/compliance readiness artifact is deferred unless A/B/C complete.
