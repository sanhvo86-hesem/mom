# P15 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P15-001 | BOM omitted from PG rebuild | cutover worker | switch mode | fatal_drift_block | none | drift.detected | drift report | n/a | blocked | incomplete routing/material truth | PG-002 |
| SIM-P15-002 | inspection plan header migrated but characteristics missing | cutover worker | reconcile quality | fatal_drift_block | none | drift.detected | report evidence | n/a | blocked | inspection gaps hidden | quality parity |
| SIM-P15-003 | legacy status `enabled` present | migration batch | map statuses | unknown_status_block | none | migration.blocked | mapping report | fix mapping | blocked | ambiguous lifecycle | status mapping |
| SIM-P15-004 | duplicate normalized part number | migration batch | load parts | duplicate_key_block | none | migration.blocked | duplicate report | dedupe | blocked | merged item identity | duplicate key |
| SIM-P15-005 | JSON write succeeds, PG shadow fails | runtime command | shadow write | mark_projection_stale | JSON only in bridge | shadow.failure | warning audit | reconcile and retry | controlled warning | silent split | dual-write failure |
| SIM-P15-006 | PG primary read falls back to JSON | API | read record | fallback_telemetry_and_block_final_switch | none | fallback.read | telemetry evidence | fix source then retry | read allowed only in primary window | hidden archive authority | fallback read |
| SIM-P15-007 | in-progress idempotency rows remain open | cutover lead | switch mode | block_cutover | none | cutover.blocked | recovery report | operator recovery first | blocked | replay ambiguity | stale in-progress |
| SIM-P15-008 | rollback requested after PG-only write | release lead | rollback | restore_drill_required | none | rollback.denied | rollback audit | restore only | blocked | data divergence | rollback policy |
| SIM-P15-009 | supplier scorecard stale while ASL moved | buyer | approve supplier | block_cutover_or_readiness | none | drift.detected | supplier reconcile report | refresh projections | blocked | supplier risk invisible | supplier parity |
| SIM-P15-010 | OQC JSONL NCR not linked to PG hold | quality lead | reconcile quality | fatal_drift_block | none | drift.detected | quality reconcile report | import and link | blocked | shipment leakage | hold parity |
| SIM-P15-011 | inventory balance mismatch ledger | inventory lead | reconcile inventory | fatal_drift_block | none | drift.detected | ledger evidence | fix and rerun | blocked | stock corruption | ledger parity |
| SIM-P15-012 | machine latest state exists without raw events | MES lead | reconcile MES | fatal_drift_block | none | drift.detected | MES reconcile report | import raw events | blocked | non-reconstructable history | event parity |
| SIM-P15-013 | customer ids changed on migration | cutover worker | reconcile orders | fatal_drift_block | none | drift.detected | order report | remap IDs | blocked | broken SO links | order linkage |
| SIM-P15-014 | evidence paths missing hashes | cutover worker | reconcile evidence | fatal_drift_block | none | drift.detected | evidence report | hash repair | blocked | unverifiable evidence | evidence integrity |
| SIM-P15-015 | status aliases mixed old/new | migration batch | validate workflow | fatal_drift_block | none | drift.detected | workflow report | canonicalize | blocked | split status authority | workflow parity |
| SIM-P15-016 | concurrent import during freeze | user | import | freeze_guard | none | import.blocked | governance audit | retry after window | blocked | moving target cutover | freeze gate |
| SIM-P15-017 | migration rerun same batch | worker | rerun | idempotent_batch | no extra rows | batch.replayed | batch audit | same response | pass | duplicate imports | rerun idempotency |
| SIM-P15-018 | drift report lacks human summary | cutover lead | review report | export_completeness_required | none | none | report audit | regenerate | blocked | operators miss blocker context | report completeness |
| SIM-P15-019 | archived JSON still used in PG only mode | API | open record | p0_authority_violation | none | archive.read_alert | security evidence | remove code path | blocked | split authority returns | archive ban |
| SIM-P15-020 | backup restore untested | cutover lead | approve switch | restore_drill_required | none | cutover.blocked | restore evidence missing | run drill | blocked | unrecoverable cutover | restore drill |
