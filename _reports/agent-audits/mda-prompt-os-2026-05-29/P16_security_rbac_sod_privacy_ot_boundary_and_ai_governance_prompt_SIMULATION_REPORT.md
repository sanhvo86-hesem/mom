# P16 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P16-001 | planner role only | planner | ReleaseQualityHold | permission_denied | none | security.incident | auth audit | n/a | blocked | cross-role unsafe action | RBAC gate |
| SIM-P16-002 | requester is approver | requester | approve change | sod_block | none | security.incident | approval audit | assign other approver | blocked | self-approval | SoD scenario |
| SIM-P16-003 | expired session | user | privileged command | session_timeout | none | security.incident | auth audit | re-login | blocked | zombie session action | session timeout |
| SIM-P16-004 | TOTP reused | signer | regulated command | replay_block | none | security.incident | e-sign audit | request new challenge | blocked | replayed signature | TOTP replay |
| SIM-P16-005 | shopfloor role opens PII | operator | view record | field_redaction | none | access.checked | access audit | n/a | redacted | privacy breach | field redaction |
| SIM-P16-006 | edge adapter sends fake ready | adapter | machine ready event | ot_trust_block | none | adapter.quarantined | security audit | inspect adapter | blocked/quarantined | unsafe ready state | OT trust |
| SIM-P16-007 | AI suggests and executes block supplier | AI | auto block | ai_action_forbidden | none | security.incident | advisory log | human review only | blocked | AI governance breach | AI action ban |
| SIM-P16-008 | attachment prompt-injects AI | AI copilot | summarize attachment | ignore_mutation_instruction | none | advisory log | prompt-injection evidence | n/a | proposal only | model executes malicious note | prompt injection |
| SIM-P16-009 | integration token hits admin command | integration | admin command | token_scope_denied | none | security.incident | auth audit | use proper token | blocked | overbroad token | token scopes |
| SIM-P16-010 | evidence file replaced with same logical ref | user | replace evidence | evidence_immutable | none | security.incident | hash audit | upload as new evidence | blocked | silent evidence tamper | evidence immutability |
| SIM-P16-011 | audit delete attempted | admin | delete audit | append_only | none | security.incident | audit evidence | n/a | blocked | lost trace chain | audit delete |
| SIM-P16-012 | stale projection still shows action | user | click release from board | reanchor_and_refresh | none | ui.security_event | UI audit | refresh first | blocked | stale authority | projection freshness |
| SIM-P16-013 | role escalation without approval | manager | grant role | approval_required | none | security.incident | access request evidence | route approval | blocked | privilege escalation | role grant |
| SIM-P16-014 | operator scans another badge | operator | StartJob | identity_mismatch | none | security.incident | identity audit | use own badge | blocked | borrowed identity | badge misuse |
| SIM-P16-015 | supplier portal opens another supplier NCR | supplier user | view NCR | tenant_scope_denied | none | security.incident | tenant audit | n/a | blocked | tenant breach | portal isolation |
| SIM-P16-016 | offline tablet stolen | thief | reconnect sync | reauth_required | none | security.incident | device audit | revoke device | blocked | cached PII abuse | device revoke |
| SIM-P16-017 | emergency override no expiry | supervisor | create override | expiry_required | none | security.incident | override audit | add expiry | blocked | permanent bypass | override expiry |
| SIM-P16-018 | mass import bypass attempt | admin script | import data | validation_required | none | security.incident | import audit | use governed import | blocked | invalid data bypass | governed import |
| SIM-P16-019 | security event without correlation id | service | log incident | correlation_required | none | none | logging audit | supply correlation | blocked | lost forensic chain | security correlation |
| SIM-P16-020 | OT outage creates allow-by-default | system | StartJob | deny_on_unknown_readiness | none | readiness.unknown | safety evidence | restore heartbeat | blocked | unsafe default allow | deny by default |
