# P17 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P17-001 | new item import causes gate spikes | steward | import | alert_top_gate_failures | none | metric spike | incident evidence | n/a | alert raised | silent bad import | gate failure metric |
| SIM-P17-002 | PG primary falls back to JSON | API | read | fallback_alert | none | fallback.read | alert evidence | fix source | alert raised | hidden authority split | fallback metric |
| SIM-P17-003 | outbox lag exceeds SLO | worker | dispatch | lag_alert | none | outbox.lag_alert | incident evidence | worker recover | alert raised | events stuck unnoticed | outbox lag |
| SIM-P17-004 | drift report too old | reconcile job | daily run | staleness_alert | none | reconcile.stale | incident evidence | rerun job | alert raised | stale cutover confidence | reconcile age |
| SIM-P17-005 | evidence store down during e-sign | signer | approve | fail_closed_and_alert | none | security.incident | failure evidence | retry after restore | blocked and alerted | unsigned regulated action | evidence availability |
| SIM-P17-006 | audit write failure | command service | regulated command | fail_closed_and_alert | none | security.incident | failure evidence | retry after restore | blocked and alerted | unaudited mutation | audit availability |
| SIM-P17-007 | projection stale but dashboard green | dashboard | open board | stale_projection_alert | none | projection.stale_detected | freshness evidence | refresh | warning visible | projection treated as truth | projection freshness |
| SIM-P17-008 | supplier cert score drops | steward | run quality job | data_quality_alert | none | quality.score_changed | data quality evidence | steward fix | alert raised | supplier risk hidden | data quality score |
| SIM-P17-009 | Generic CRUD blocks spike | backend | blocked mutation | abuse_alert | none | security.incident | guard evidence | investigate callers | alert raised | repeated bypass attempts hidden | block count |
| SIM-P17-010 | idempotency conflicts rise | API | replay collisions | replay_alert | none | idempotency.conflict | conflict evidence | investigate client | alert raised | client duplicates silent | conflict metric |
| SIM-P17-011 | machine heartbeat stale | adapter | no signal | heartbeat_alert | none | adapter.stale | OT evidence | inspect adapter | alert raised | unsafe default allow | heartbeat age |
| SIM-P17-012 | quality hold release latency high | QA | release | latency_alert | none | hold.release.slow | latency evidence | optimize path | alert raised | delayed release bottlenecks hidden | hold latency |
| SIM-P17-013 | trace lacks correlation chain | developer | inspect trace | trace_integrity_alert | none | trace.broken | trace evidence | fix propagation | alert raised | non-reconstructable history | trace integrity |
| SIM-P17-014 | PII leaks into logs | service | write log | pii_alert | redacted retry only | security.incident | redaction evidence | sanitize logger | alert raised | privacy breach | log redaction |
| SIM-P17-015 | label cardinality explosion | service | emit metric | label_guard | bounded metrics only | telemetry.guard | SRE evidence | sanitize labels | blocked/alerted | monitoring collapse | cardinality guard |
| SIM-P17-016 | runbook missing owner | incident | page on alert | owner_required | none | governance.incident | runbook audit | assign owner | blocked as governance defect | alert with no action path | runbook completeness |
| SIM-P17-017 | SLO breach no incident | monitor | evaluate | incident_required | none | governance.incident | SLO evidence | page owner | incident created | stealth degradation | SLO to incident |
| SIM-P17-018 | data lineage missing on import | import | reconcile | lineage_alert | none | data.quality_issue | lineage evidence | quarantine rows | alert raised | untraceable import | lineage completeness |
| SIM-P17-019 | controlled gap overdue | governance | review ledger | escalation_alert | none | governance.escalated | gap evidence | owner follow-up | escalation created | design debt hidden | gap aging |
| SIM-P17-020 | alert fatigue suppresses P0 drift | NOC | monitor | severity_override | none | p0_alert_unsuppressed | alert evidence | incident only | P0 still pages | fatal drift missed | alert routing |
