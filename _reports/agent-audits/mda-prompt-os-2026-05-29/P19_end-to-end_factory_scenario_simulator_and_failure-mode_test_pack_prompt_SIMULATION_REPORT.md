# P19 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P19-001 | item and release package ready | sales to shopfloor chain | quote to WO start | all_release_gates_pass | SO JO WO and snapshots | order and release events | evidence chain | replay-safe per command | full pass | fragmented chain | e2e happy path |
| SIM-P19-002 | inspection plan missing | engineer | release package and SO | block_missing_ip | none | gate failure | gate evidence | fix plan | blocked | execution without inspection control | missing IP |
| SIM-P19-003 | supplier receipt fails IQC | warehouse and QA | receive then inspect | quarantine_and_hold | receipt only | hold event | IQC evidence | MRB/rework path | blocked to putaway | bad supplier stock available | IQC fail |
| SIM-P19-004 | OQC fails after production | QA and logistics | inspect and ship | shipment_hold | hold and NCR | quality events | OQC evidence | disposition then release | blocked | shipped failed goods | OQC containment |
| SIM-P19-005 | tool break mid-run | operator | record breakage | suspect_output_hold | breakage event | hold event | breakage evidence | QA disposition | blocked | suspect output escapes | tool breakage |
| SIM-P19-006 | gage OOT discovered | QA | declare OOT | affected_lot_investigation | investigation rows | incident event | calibration evidence | containment and review | blocked | invalid measurements ignored | OOT drill |
| SIM-P19-007 | customer complaint on serial | customer service | complaint and recall | full_backward_forward_trace | complaint case | recall event | complaint evidence | n/a | pass | incomplete trace | complaint recall |
| SIM-P19-008 | JSON to PG drift exists | cutover lead | switch mode | cutover_block | none | drift event | reconcile evidence | fix then rerun | blocked | unsafe switch | drift blocker |
| SIM-P19-009 | direct generic mutation attempted | user | patch status | command_required | none | security incident | guard evidence | n/a | blocked | hidden mutation | generic mutation |
| SIM-P19-010 | idempotency retry on issue | scanner | issue twice | replay_same_response | single ledger delta | single issue event | replay audit | same response | pass | double consume | idempotency |
| SIM-P19-011 | closed period issue | warehouse | issue material | block_closed_period | none | none | period evidence | backdate exception only | blocked | historical drift | period gate |
| SIM-P19-012 | operator qualification expired | operator | start job | qualification_block | none | none | training evidence | reassign | blocked | unqualified execution | training gate |
| SIM-P19-013 | machine PM overdue | shift leader | release WO | pm_block | none | none | PM evidence | maintenance complete | blocked | unsafe machine use | PM gate |
| SIM-P19-014 | NC checksum mismatch | setup tech | load program | checksum_block | none | none | release evidence | correct program | blocked | wrong NC execution | checksum gate |
| SIM-P19-015 | substitute material wrong customer approval | planner | issue substitute | customer_approval_block | none | none | approval evidence | correct approval | blocked | customer-specific mismatch | substitute gate |
| SIM-P19-016 | MRB signer is originator | QA | approve MRB | sod_block | none | none | approval evidence | alternate approver | blocked | self-approved disposition | SoD drill |
| SIM-P19-017 | fallback reads spike | API | open records | observability_alert | none | fallback events | alert evidence | investigate source | warned/blocked switch | silent split authority | fallback drill |
| SIM-P19-018 | outbox failure after domain write attempt | command worker | release package | all_or_nothing | none committed | none | failure evidence | retry | blocked | event loss after state commit | outbox rollback |
| SIM-P19-019 | projection stale | planner | click dashboard action | reanchor_required | none | UI audit | freshness evidence | refresh then reanchor | blocked | stale projection mutation | stale projection |
| SIM-P19-020 | AI recommendation tries release | AI | auto release | autonomous_action_forbidden | none | advisory log | advisory evidence | human review only | blocked | AI release authority | AI boundary |
