# P49 Domain Command Factory and Gateway Closure Report

Date: 2026-05-31  
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`  
Decision token: `P49_PASS_WITH_CONTROLLED_GAPS`

## 1. EXECUTIVE DECISION

P49 adds a fail-closed governed `DomainCommandGateway`, command registry, Problem Details factory, HTTP endpoint, OpenAPI operation, and idempotency replay boundary. P48 engineering package commands and `ReleaseWorkOrderCommand` are wired to real handlers. Other core commands are registered but intentionally return `command_handler_not_runtime_complete` until their domain-specific P52-P54/P56 handlers are wired.

## 2. SOURCE TRUTH AUDIT

- Existing `ControlPlaneCommandService` is EQMS-oriented and enqueues commands but does not execute MDA/MES command handlers.
- Existing `idempotency_replay_ledger` and `PostgresIdempotencyReplayRepository` provide PostgreSQL replay/conflict semantics.
- P48 handler is the first runtime-ready command family and now backs the gateway.

## 3. RUNTIME EVIDENCE PROBE

| Probe | Result |
|---|---|
| PHP lint gateway/controller/tests | PASS |
| Unknown command manual probe | PASS: `unknown_command`, 404 |
| Registered unimplemented command probe | PASS: `command_handler_not_runtime_complete`, 501 |
| Idempotency replay manual probe | PASS: replay returned stored payload and did not call operation |
| OpenAPI operation probe | PASS: `submitDomainCommand` present |
| `composer --working-dir=mom run test` | BLOCKED: missing `vendor/bin/phpunit` |
| `composer --working-dir=mom run analyse/check` | BLOCKED: missing `vendor/bin/phpstan` |

## 4. BLOCKER / GAP MAP

| Gap | Severity | Status |
|---|---|---|
| Unknown governed command can mutate | P0 | Closed by registry lookup before handler execution |
| Idempotency undefined | P0 | Closed for gateway path via `PostgresIdempotencyReplayRepository` |
| Problem Details missing | P1 | Closed for gateway endpoint |
| Core command registry missing | P0 | Closed: all P49 required core commands are registered |
| Non-engineering core handlers | P1 | Fail-closed until P52-P54/P56 handler wiring |
| Legacy order/mobile routes bypass gateway | P1 | Still need command-by-command route migration/proof in P52/P55/P58 |

## 5. DESIGN DELTA

- `CommandRegistry` maps command names to root, permission, regulated action, idempotency scope, OpenAPI operation, expected events, and implementation status.
- `DomainCommandGateway` validates name, idempotency, actor, permission, implementation status, and replay fingerprint before handler execution.
- `ProblemDetailsFactory` converts command/security/idempotency/system errors into RFC 9457-style payloads.
- `DomainCommandController` exposes `POST /api/v1/domain-commands` and `GET /api/v1/domain-commands/registry`.

## 6. IMPLEMENTATION PLAN

1. Add fail-closed registry and gateway.
2. Wire P48 engineering package commands and `ReleaseWorkOrderCommand`.
3. Register but fail-close non-runtime-complete core commands.
4. Add OpenAPI and route.
5. Add unit tests and manual probes.

## 7. FILES TO EDIT

- `mom/api/services/DomainCommand/*`
- `mom/api/controllers/DomainCommandController.php`
- `mom/api/routes/rest-routes.php`
- `mom/api/openapi.yaml`
- `mom/api/services/EngineeringReleasePackageCommandHandler.php`
- `mom/tests/Unit/Services/DomainCommandGatewayTest.php`
- `.ai/*`

## 8. FILES FORBIDDEN OR HIGH-RISK

- Do not make Generic CRUD call command internals.
- Do not mark unimplemented core commands as implemented.
- Do not downgrade idempotency conflict to retry-success.
- Do not bypass P48 package snapshot gates for work-order release.

## 9. CODE / SCHEMA / CONTRACT CHANGES

- New gateway and registry code only; no additional schema beyond P48 because the existing idempotency ledger is reused.
- OpenAPI path added for `submitDomainCommand`.
- P48 handler extended with `releaseWorkOrderWithPackage()` so gateway `ReleaseWorkOrderCommand` binds package snapshot and releases WO in one transaction.

## 10. TEST PLAN

- Unit tests cover unknown command, unimplemented command, idempotency replay, and idempotency conflict.
- Manual probes confirm unknown/unimplemented/replay behavior.
- Full PHPUnit/PHPStan blocked locally by missing vendor.

## 11. OPERATIONAL SIMULATION MATRIX

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-049-001 | Unknown command | API caller | submit `BogusCommand` | registry lookup | none | none | no-op | 404 `unknown_command` | random command mutates | unit/manual present |
| V4-SIM-049-002 | Completed idempotency row | API caller | same key + same payload | replay ledger | none new | none new | replay | same payload | duplicate outbox | unit/manual present |
| V4-SIM-049-003 | Completed idempotency row with different hash | API caller | same key + different payload | replay ledger | none | none | conflict | 409 `idempotency_conflict` | duplicate mutation | unit present |
| V4-SIM-049-004 | Handler state write then outbox fails | System | command execution | handler transaction | rolled back | none | failure row | no partial mutation | state/outbox split brain | P52-P54 handler tests |
| V4-SIM-049-005 | Actor lacks permission | Operator | release command | permission gate | none | none | no-op | 403 | unauthorized mutation | add controller test |
| V4-SIM-049-006 | Regulated evidence missing | QE | release package | P48/P47 gate | none | none | no-op | Problem Details | unsigned release | P51/P56 |
| V4-SIM-049-007 | DB deadlock | System | command execution | PostgreSQL transaction | rollback | failure row | retry with same key | safe retry/conflict | partial mutation | P58 real DB scenario |
| V4-SIM-049-008 | OpenAPI operation missing | Release audit | contract probe | OpenAPI probe | none | none | build fail | contract gate fail | undocumented API | probe present |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Attack | Result |
|---|---|---|
| UI developer | Invents command name | Blocked by registry |
| Operator | Reuses idempotency key with changed payload | Conflict |
| Planner | Releases WO through gateway without package evidence | P48 handler blocks |
| Admin | Calls StartJob via gateway before P52 readiness | Fail-closed not implemented |
| Integration job | Bypasses OpenAPI | Endpoint still enforces gateway |

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

- Remove `/api/v1/domain-commands` route to disable new gateway entrypoint.
- Registry fail-closed defaults mean rollback does not need data cleanup unless an implemented engineering command completed; those are audited/outboxed by P48.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

- Idempotency ledger records replay/conflict state.
- P48 implemented commands emit audit and outbox.
- P57 should add gateway counters by `command_name`, `problem_code`, and `replayed`.

## 15. GENERATED ARTIFACTS

- `.ai` regenerated after controller/service/route changes.
- P49 report, handoff, gap ledger, proof pack generated.

## 16. GAP LEDGER UPDATE

See `V4_P49_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

P49_PASS_WITH_CONTROLLED_GAPS

## 18. HANDOFF PACKET FOR NEXT PROMPT

P50/P51/P52 must not treat `command_handler_not_runtime_complete` as success. Each remaining core command must move from registered fail-closed to implemented only when it has transaction, idempotency, audit/evidence/outbox, Problem Details, and scenario proof.
