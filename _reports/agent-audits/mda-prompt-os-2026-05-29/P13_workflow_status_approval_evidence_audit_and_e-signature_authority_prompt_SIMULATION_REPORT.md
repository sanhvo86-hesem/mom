# P13 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P13-001 | UI shows `released`, DB registry does not | user | open status selector | generated_authority_only | none | none | UI audit | refresh artifact | blocked | stale UI state | WF-001 |
| SIM-P13-002 | transition exists in registry but command rejects due missing gate | engineer | ReleaseItemRevision | command_guard_required | none | none | gate audit | retry after fix | blocked | split authority | transition parity |
| SIM-P13-003 | signature form lacks meaning | approver | approve release | signature_meaning_required | none | none | e-sign audit | retry with meaning | blocked | meaningless signature | e-sign meaning |
| SIM-P13-004 | signature not linked to record hash/version | approver | release package | record_hash_required | none | none | e-sign audit | fail closed | blocked | non-repudiation weak | signature hash link |
| SIM-P13-005 | requester is approver | originator | approve own change | sod_block | none | none | approval audit | n/a | blocked | self-approval | SoD |
| SIM-P13-006 | route has no backup/delegation | manager absent | release hold | escalation_policy_required | none | none | route audit | escalate | blocked until delegated | process deadlock | delegation |
| SIM-P13-007 | audit trail overwrite attempted | admin | patch old audit row | append_only | none | none | security audit | n/a | blocked | history tamper | audit immutability |
| SIM-P13-008 | evidence attachment deleted before retention ends | system | purge evidence | legal_hold_retention_check | none | none | retention audit | n/a | blocked | missing evidence | retention |
| SIM-P13-009 | old alias status appears after migration | user | open NCR | generated_alias_map_only | none | none | workflow audit | refresh generated outputs | blocked | workflow drift | alias map |
| SIM-P13-010 | released record patched directly | API client | PATCH released rev | command_only | none | none | security audit | n/a | blocked | release integrity loss | released patch ban |
| SIM-P13-011 | challenge token reused | signer | approve second record | replay_block | none | none | e-sign audit | get new token | blocked | signature replay | token replay |
| SIM-P13-012 | training expired | approver | approve release | qualification_gate | none | none | qualification evidence | renew and retry | blocked | unqualified approval | training gate |
| SIM-P13-013 | CAPA close requested with no effectiveness evidence | QA | CloseCapa | evidence_required | none | none | CAPA audit | provide evidence | blocked | premature close | effectiveness gate |
| SIM-P13-014 | quality hold release missing reason | QA | ReleaseQualityHold | reason_required | none | none | hold audit | retry with reason | blocked | unexplained release | reason code |
| SIM-P13-015 | frontend options not regenerated | release engineer | open workflow menu | generated_output_parity | none | none | build audit | regenerate | blocked | stale UI controls | generated parity |
| SIM-P13-016 | export omits signer printed name | auditor | export signed record | export_signature_context | none | none | export audit | rerender export | blocked | audit unusable | signed export |
| SIM-P13-017 | legal hold active | purge worker | purge evidence | legal_hold_block | none | none | retention audit | n/a | blocked | evidence destruction | legal hold |
| SIM-P13-018 | timezone ambiguity | auditor | inspect audit record | UTC_required | none | none | audit record | normalize timezone | pass with UTC only | ambiguous chronology | UTC timestamp |
| SIM-P13-019 | emergency override has no expiry | supervisor | create override | expiry_required | none | none | override audit | retry with expiry | blocked | permanent unsafe bypass | override expiry |
| SIM-P13-020 | AI recommendation attached as decision evidence with no human accept | AI copilot | suggest MRB | human_accept_required | none | none | advisory audit | require command by human | blocked | AI becomes decision authority | AI boundary |
