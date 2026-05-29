# P12 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P12-001 | same idempotency key different payload | browser client | IssueMaterialToWO | idempotency_conflict | none | none | idempotency audit | fail closed | 409 | silent duplicate mutation | replay fingerprint |
| SIM-P12-002 | domain write okay but outbox write fails | command worker | CompleteOperation | all_or_nothing_tx | none committed | none | failure audit | retry safe | command fails closed | hidden event loss | tx atomicity |
| SIM-P12-003 | audit write fails after state update attempt | command worker | ReleaseQualityHold | audit_durable_required | none committed | none | failure audit | retry safe | fail closed | untraceable regulated action | audit atomicity |
| SIM-P12-004 | Generic CRUD calls command internals | backend | update released item | command_only | none | none | guard audit | n/a | blocked | hidden bypass | CRUD guard |
| SIM-P12-005 | projection endpoint asked to mutate | frontend | release item from board | reanchor_required | none | none | UI audit | n/a | blocked | projection authority | projection ban |
| SIM-P12-006 | browser session no CSRF token | browser | ReleaseQualityHold | csrf_required | none | none | auth audit | retry with token | blocked | CSRF bypass | CSRF command |
| SIM-P12-007 | stale row version | engineer | ReleaseItemRevision | optimistic_concurrency | none | none | conflict audit | refresh and retry | 409 | lost update | row version |
| SIM-P12-008 | permitted role but SoD conflict | approver/originator same | ApproveEngineeringReleasePackage | sod_block | none | none | approval audit | assign new approver | blocked | self approval | SoD rule |
| SIM-P12-009 | exception path throws 500 | API | CreateParty | problem_details_required | none | none | error audit | retry as allowed | structured error | opaque operational failure | problem-details |
| SIM-P12-010 | external machine event replay | adapter | RecordMachineEvent | idempotent_event_ingest | one raw row | one raw event | adapter evidence | same response | pass | duplicate raw events | event replay |
| SIM-P12-011 | outbox worker retries publish | worker | dispatch outbox | exactly_once_delivery_contract | none extra | one semantic publish | worker audit | dedupe by event id | pass | downstream duplication | outbox dedupe |
| SIM-P12-012 | command tries to create e-sign after commit | release flow | ApproveEngineeringReleasePackage | esign_inside_tx | none | none | esign audit | fail closed | blocked | detached signature | esign atomicity |
| SIM-P12-013 | validation error lacks field path | browser | CreateItemRevision | violations_required | none | none | validation audit | fix payload | blocked with field paths | unusable errors | validation detail |
| SIM-P12-014 | long scope key collision risk | integration | CreateJobOrder | scope_hash_enforced | command row | outbox event | idempotency audit | replay safe | pass | truncated scope collision | long scope |
| SIM-P12-015 | operator forces retry on in-progress row | operator | RecoverIdempotencyRow | operator_recovery_only | recovery log only | none | recovery evidence | governed only | blocked until reviewed | unsafe duplicate execution | in-progress recovery |
| SIM-P12-016 | PG only mode but command hits JSON path | worker | CreateParty | mode_policy_enforced | none | none | mode audit | fix service | blocked | authority split | mode guard |
| SIM-P12-017 | docs say optional but command requires field | client | ReleaseSalesOrderToProduction | contract_parity_required | none | none | API audit | contract update | blocked | client ambiguity | OpenAPI parity |
| SIM-P12-018 | Arazzo workflow contradicts preconditions | integration | ReleaseWorkOrder | contract_parity_required | none | none | workflow audit | fix orchestration spec | blocked | orchestrated unsafe call | Arazzo parity |
| SIM-P12-019 | PATCH generic endpoint edits released data | client | PATCH /entity | command_required | none | none | security audit | n/a | blocked | released mutation bypass | released patch ban |
| SIM-P12-020 | correlation id missing | client | CreateParty | correlation_required | none | none | request audit | supply header | blocked | lost trace chain | correlation enforcement |
