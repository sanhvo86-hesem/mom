# P14 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P14-001 | operator qualification expired | operator | StartJob | block_operator_training | none | none | qualification evidence | renew and retry | blocked | unqualified run | readiness operator |
| SIM-P14-002 | machine PM overdue | shift leader | StartJob | block_machine_pm | none | none | PM evidence | maintenance action | blocked | unsafe machine use | readiness PM |
| SIM-P14-003 | tool life below stop | setup tech | StartJob | block_tool_life | none | none | tool evidence | replace tool | blocked | tool break risk | readiness tool |
| SIM-P14-004 | material lot on hold | warehouse | StartJob | block_material_hold | none | none | hold evidence | release hold first | blocked | suspect material run | readiness material |
| SIM-P14-005 | NC checksum mismatch | setup tech | LoadProgram | block_program_checksum | none | none | program receipt evidence | load correct program | blocked | wrong program run | readiness program |
| SIM-P14-006 | WI document obsolete | operator | StartJob | block_document_status | none | none | document evidence | use released WI | blocked | obsolete instructions | document gate |
| SIM-P14-007 | release command double tap | shift leader | TrackIn | replay_same_response | one runtime transition | one event | replay audit | same response | pass | duplicate track-in | idempotent track-in |
| SIM-P14-008 | issue material retry | warehouse | IssueMaterialToWO | replay_same_response | one inventory and WIP delta | one issue event | replay audit | same response | pass | double consume | issue replay |
| SIM-P14-009 | tool assembly revision wrong | setup tech | LoadTool | block_tool_compatibility | none | none | compatibility evidence | load correct assembly | blocked | wrong setup | tooling gate |
| SIM-P14-010 | inspection fail | inspector | RecordInspectionResult | create_hold_and_block_completion | inspection result | quality hold | inspection evidence | require disposition | blocked from complete | failed product escapes | inspection containment |
| SIM-P14-011 | critical machine alarm | adapter/worker | RecordMachineEvent | create_maintenance_or_containment | alarm and incident rows | maintenance request | alarm evidence | operator assess | pass with containment | continuing unsafe run | alarm reaction |
| SIM-P14-012 | tool breakage mid-run | operator | RecordToolBreakage | hold_suspect_output | tooling event | suspect hold | breakage evidence | QA disposition | blocked for suspect qty | suspect stock released | breakage containment |
| SIM-P14-013 | offline tablet stale completion after WO close | tablet sync | CompleteOperation candidate | stale_runtime_block | none | none | sync audit | manual reconcile | blocked | closed WO mutated | offline stale gate |
| SIM-P14-014 | master revision changes during run | engineer | later master edit | frozen_snapshot_only | none | none | history audit | n/a | running job unchanged | history rewritten | frozen snapshot |
| SIM-P14-015 | operator shift ends during long run | shift leader | ResumeJob | requalification_check | none | none | shift evidence | reassign operator | blocked until qualified | unauthorized continuation | shift validity |
| SIM-P14-016 | scrap exceeds threshold | operator | ReportScrap | supervisor_approval_required | scrap row only after approval | none until approved | scrap evidence | approval path | blocked/pending | uncontrolled losses | scrap threshold |
| SIM-P14-017 | completion qty exceeds released qty | operator | CompleteOperation | qty_limit_block | none | none | qty audit | fix counts | blocked | overproduction hidden | qty gate |
| SIM-P14-018 | process parameter out of limit | operator | RecordProcessParam | create_deviation_or_hold | parameter row and deviation | process param event | parameter evidence | supervisor review | blocked for completion if required | OOT process ignored | param limit |
| SIM-P14-019 | first article required but absent | operator | StartJob | block_first_article | none | none | quality plan evidence | do FAI | blocked | no first-piece control | first article gate |
| SIM-P14-020 | shipment requested while OQC hold open | logistics | ConfirmDelivery | block_shipment_hold | none | none | hold evidence | release after disposition | blocked | customer shipment of held product | shipment hold gate |
