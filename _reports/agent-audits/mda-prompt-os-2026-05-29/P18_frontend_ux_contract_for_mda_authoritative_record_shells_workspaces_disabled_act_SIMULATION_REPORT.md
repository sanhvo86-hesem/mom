# P18 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P18-001 | workspace row selected | steward | change item status from workspace | projection_mutation_forbidden | none | ui.audit | UI evidence | n/a | blocked | hidden workspace authority | projection mutation |
| SIM-P18-002 | dashboard data stale | user | release action | reanchor_required | none | ui.audit | freshness evidence | refresh and reopen | blocked | stale board releases data | reanchor gate |
| SIM-P18-003 | disabled action | user | hover/click | disabled_reason_required | none | ui.audit | none | n/a | reason shown | opaque user experience | disabled reason |
| SIM-P18-004 | supplier bank data exists | operator | open supplier record | field_redaction | none | access.checked | access audit | n/a | fields hidden | privacy leak | field redaction |
| SIM-P18-005 | item revision shell open | engineer | inspect tabs | audit_tab_required | none | ui.audit | none | n/a | audit tab visible | missing trace | audit tab |
| SIM-P18-006 | release queue shows ready but IP missing | engineer | open action | gate_reason_required | none | ui.audit | gate evidence | reanchor to package | blocked | false ready state | gate reason |
| SIM-P18-007 | mobile offline edit | operator | change released data | candidate_only | none | offline.candidate_captured | candidate audit | later reconcile | blocked from mutation | offline hidden authority | offline candidate |
| SIM-P18-008 | search results suggest duplicates | steward | open merged record | human_review_only | none | ui.audit | duplicate evidence | manual merge command | suggestion only | silent merge | duplicate UX |
| SIM-P18-009 | dashboard hold release button clicked | user | release hold | reanchor_required | none | ui.audit | hold evidence | open record shell | blocked | dashboard authority | hold release UI |
| SIM-P18-010 | PM overdue machine | user | open readiness board | blocker_visible | none | ui.audit | readiness evidence | n/a | PM overdue visible | hidden maintenance blocker | readiness board |
| SIM-P18-011 | tool life warning | setup tech | open setup shell | blocker_visible | none | ui.audit | tool evidence | n/a | warning visible | setup blind spot | tool warning |
| SIM-P18-012 | e-sign modal opened | approver | sign | signature_meaning_required | none | ui.audit | none | n/a | meaning visible | meaningless signature | e-sign UI |
| SIM-P18-013 | route alias stale | user | open record route | canonical_route_required | none | ui.audit | navigation evidence | redirect to canonical shell | blocked | wrong root anchor | route grammar |
| SIM-P18-014 | role revoked after page load | user | click action | server_truth_refresh | none | access.denied | access audit | refresh | blocked | cached permission misuse | permission refresh |
| SIM-P18-015 | keyboard only user | user | inspect blocked action | accessibility_required | none | ui.audit | a11y evidence | n/a | reason reachable | inaccessible governance | keyboard access |
| SIM-P18-016 | mobile regulated action | approver | release hold | reauth_required | none | access.denied | auth audit | re-auth then retry | blocked until reauth | weak mobile approval | mobile reauth |
| SIM-P18-017 | attachment contains prompt injection | AI assistant panel | preview attachment | advisory_only | none | advisory.log | preview audit | n/a | no mutation | AI side-channel | prompt injection preview |
| SIM-P18-018 | timeline open | auditor | inspect entries | command_id_required | none | ui.audit | timeline evidence | n/a | command ids shown | incomplete trace | timeline IDs |
| SIM-P18-019 | projection freshness unknown | user | open workspace | actions_disabled | none | projection.stale_detected | freshness evidence | refresh | blocked | unknown authority age | freshness banner |
| SIM-P18-020 | WO history open | operator | navigate to frozen source versions | frozen_source_links_required | none | ui.audit | history evidence | n/a | links available | snapshot not explainable | frozen source navigation |
