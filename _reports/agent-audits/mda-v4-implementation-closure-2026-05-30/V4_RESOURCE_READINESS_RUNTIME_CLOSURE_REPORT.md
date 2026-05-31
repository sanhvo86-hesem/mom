# P52 ResourceReadinessService Runtime Closure Report

Date: 2026-05-31  
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`  
Decision token: `P52_PASS_WITH_CONTROLLED_GAPS`

## 1. EXECUTIVE DECISION

P52 adds a composite `ResourceReadinessService` and wires MES runtime commands through readiness snapshots before any MES event writes. `StartJobCommand`, `IssueMaterialToWorkOrderCommand`, `LoadToolCommand`, `RecordInspectionResultCommand`, and `CompleteOperationCommand` are now implemented in the domain command gateway through `MesRuntimeCommandHandler`.

The implementation is fail-closed: missing, expired, held, incompatible, unauthorized, stale, or blocked evidence writes a readiness snapshot with operator-facing reasons and blocks the command before MES event writes.

## 2. SOURCE TRUTH AUDIT

- Existing reports identified `P0-RESOURCE-READINESS-NOT-WIRED` as open.
- Existing tables found: `mes_operational_event_ledger`, `mes_job_execution`, `mes_operation_execution`, `mes_material_consumption`, `mes_tool_life_events`, and canonical MES event context columns.
- Existing `ReleaseWorkOrderCommand` already reads engineering package and writes `work_order_engineering_package_snapshot`.
- No prior `ResourceReadinessService` file existed.
- New migration: `268_resource_readiness_runtime_closure.sql`.

## 3. RUNTIME EVIDENCE PROBE

| Probe | Result |
|---|---|
| PHP lint for P52 services/tests/gateway | PASS |
| Expired training manual probe | PASS: `resource_readiness_blocked`, blocker `readiness_evidence_expired`, snapshot written, no MES event |
| Valid StartJob manual probe | PASS: decision `allow`, snapshot index before event index |
| `git diff --check` | PASS |
| `.ai` regenerated | PASS |
| `composer --working-dir=mom run test` | BLOCKED: missing `vendor/bin/phpunit` |
| `composer --working-dir=mom run analyse/check` | BLOCKED: missing `vendor/bin/phpstan` |

Manual probe output:

```json
{"expired_training":["resource_readiness_blocked","readiness_evidence_expired",true,false],"start_ok":["allow",15,19,true]}
```

## 4. BLOCKER / GAP MAP

| Gap | Severity | Status |
|---|---|---|
| StartJob can run without readiness snapshot | P0 | Closed for gateway path |
| Missing evidence defaults allow | P0 | Closed: missing row creates blocker |
| Events write before gates pass | P0 | Closed: handler calls readiness before MES writes |
| Operator-facing blocker reasons absent | P0 | Closed: `operator_reason_payload` persisted and returned in Problem Details |
| Resource evidence source population | P1 | Open: upstream domains must populate `resource_readiness_evidence_state` |
| Legacy non-gateway routes | P1 | Open for P55/P58 proof |
| Full local validation | P1 | Blocked by missing vendor binaries |

## 5. DESIGN DELTA

- `resource_readiness_evidence_state` is the server-side readiness evidence input table.
- `resource_readiness_snapshot` is the immutable allow/block decision snapshot.
- `ResourceReadinessService` evaluates command-specific required evidence keys, persists snapshot, writes readiness audit, and throws Problem Details on blockers.
- `MesRuntimeCommandHandler` writes MES runtime rows/events only after readiness returns `allow`.
- `CommandRegistry` now marks StartJob, IssueMaterial, LoadTool, RecordInspectionResult, and CompleteOperation as implemented.

## 6. IMPLEMENTATION PLAN

1. Add readiness evidence and snapshot schema.
2. Add fail-closed ResourceReadinessService.
3. Add MES runtime command handler.
4. Wire handler into `DomainCommandGateway`.
5. Add unit tests and manual probes.
6. Regenerate `.ai` index and create proof artifacts.

## 7. FILES TO EDIT

- `mom/api/services/DomainCommand/ResourceReadinessService.php`
- `mom/api/services/DomainCommand/MesRuntimeCommandHandler.php`
- `mom/api/services/DomainCommand/CommandRegistry.php`
- `mom/api/services/DomainCommand/DomainCommandGateway.php`
- `mom/database/migrations/268_resource_readiness_runtime_closure.sql`
- `mom/tests/Unit/Services/DomainCommandResourceReadinessServiceTest.php`
- `.ai/*`

## 8. FILES FORBIDDEN OR HIGH-RISK

- Do not write MES events before readiness snapshot decision.
- Do not trust caller-provided `readiness_*` flags as authority.
- Do not make dashboards/projections mutate readiness.
- Do not bypass P50/P51 security/evidence gates when adding handlers.

## 9. CODE / SCHEMA / CONTRACT CHANGES

- New readiness tables:
  - `resource_readiness_evidence_state`
  - `resource_readiness_snapshot`
- Implemented gateway handlers:
  - `StartJobCommand`
  - `IssueMaterialToWorkOrderCommand`
  - `LoadToolCommand`
  - `RecordInspectionResultCommand`
  - `CompleteOperationCommand`
- Runtime writes:
  - `mes_job_execution`
  - `mes_operation_execution`
  - `mes_material_consumption`
  - `mes_tool_life_events`
  - `mes_operational_event_ledger`
  - `audit_events`
  - `domain_outbox_events`

## 10. TEST PLAN

- Unit tests added for expired training, missing evidence, machine PM overdue, tool life blocked, gage calibration expired, and valid StartJob event ordering.
- Full PHPUnit/PHPStan must be rerun after dependencies are restored.

## 11. OPERATIONAL SIMULATION MATRIX

| scenario_id | name | initial_state | actor | command_or_action | authoritative_reads | expected_gate | expected_writes | expected_events | expected_audit_evidence | expected_problem_details_if_blocked | rollback_retry_expectation | telemetry_expectation | test_to_add | gap_if_fails |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-052-001 | training expired | operator training evidence expired | operator | StartJob | `resource_readiness_evidence_state` | operator training | block snapshot | none | readiness blocked audit | `resource_readiness_blocked` | no MES write | blocker metric P58 | unit/manual present | untrained operator starts |
| V4-SIM-052-002 | PM overdue | machine PM status expired | operator | StartJob | readiness evidence | machine PM | block snapshot | none | readiness blocked audit | `readiness_evidence_expired` | no MES write | blocker metric P58 | unit present | unsafe machine start |
| V4-SIM-052-003 | calibration overdue | machine calibration expired | operator | StartJob | readiness evidence | machine calibration | block snapshot | none | readiness blocked audit | `resource_readiness_blocked` | no MES write | blocker metric P58 | pattern covered | invalid equipment |
| V4-SIM-052-004 | tool life low | tool life blocked | operator | LoadTool/StartJob | readiness evidence | tool life | block snapshot | none | readiness blocked audit | `readiness_evidence_blocked` | no tool event | blocker metric P58 | unit present | broken tool loaded |
| V4-SIM-052-005 | gage expired | gage calibration expired | inspector | RecordInspectionResult | readiness evidence | gage calibration | block snapshot | none | readiness blocked audit | `readiness_evidence_expired` | no quality event | blocker metric P58 | unit present | invalid CTQ result |
| V4-SIM-052-006 | NC mismatch | nc checksum blocked | operator | StartJob | readiness evidence | NC checksum | block snapshot | none | readiness blocked audit | `resource_readiness_blocked` | no MES write | blocker metric P58 | add DB fixture | wrong program |
| V4-SIM-052-007 | all valid | all evidence valid | operator | StartJob | readiness evidence | readiness allow | readiness snapshot + MES rows | operational event + outbox | allowed audit | none | idempotent replay via gateway | success metric P58 | unit/manual present | event before gate |
| V4-SIM-052-008 | double start | same idempotency key | operator | StartJob replay | idempotency ledger | replay | no duplicate event | replay response | existing idempotency evidence | none | no duplicate track-in semantic event | replay metric P58 | P49 idempotency + P52 command | duplicate start |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Attack / objection | Impact | Required proof | Repair recommendation | Severity |
|---|---|---|---|---|---|
| MES architect | event writes before readiness | bad execution truth | query order test | keep readiness first | P0 |
| Quality lead | expired gage records CTQ | invalid inspection | gage blocker test | extend evidence keys per CTQ | P0 |
| CNC engineer | wrong NC checksum starts job | machine scrap | nc checksum evidence | populate evidence state from NC release | P0 |
| Tooling engineer | tool below life threshold loads | tool breakage | tool life blocker | connect tool life source in P53/P55 | P0 |
| Warehouse controller | held lot issued | genealogy defect | material hold evidence | P54 canonical holds/ledger | P0 |
| Security red-team | caller sends readiness override | bypass gate | source table read only | ignore caller readiness flags | P0 |
| SRE | readiness store down | unsafe default allow | store unavailable Problem Details | fail closed | P0 |
| UX lead | operator lacks reason | work stoppage confusion | reason payload | surface `operator_reason_payload` | P1 |

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

- Revert P52 commit to return the five MES commands to fail-closed registry state.
- Migration is additive; snapshots are immutable and should be retained for audit.
- If evidence state table is unavailable, command fails closed with `resource_readiness_store_unavailable`.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

- Current telemetry is audit/outbox/readiness snapshot based.
- P58 should add metrics by `command_name`, `evidence_key`, blocker code, decision, and event write result.

## 15. GENERATED ARTIFACTS

- `.ai` regenerated.
- P52 closure report, proof pack, gap ledger, and handoff generated.

## 16. GAP LEDGER UPDATE

See `V4_P52_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

P52_PASS_WITH_CONTROLLED_GAPS

## 18. HANDOFF PACKET FOR NEXT PROMPT

P53/P54 must populate and consume canonical quality hold/material/inventory evidence without bypassing `resource_readiness_evidence_state` or the gateway. Legacy route bypass remains a controlled P1 until P55/P58 proves coverage.
