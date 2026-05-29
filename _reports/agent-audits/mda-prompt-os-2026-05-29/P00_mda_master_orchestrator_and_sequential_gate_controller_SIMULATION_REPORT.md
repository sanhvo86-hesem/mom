# P00 Simulation Report

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-P00-001 | P01 emits `REPAIR_REQUIRED` | orchestrator | attempt to open P02 | block | decision log only | none | token audit | no retry | P02 stays locked | false-forward architecture | prompt-chain gate test |
| SIM-P00-002 | runtime authority map missing | orchestrator | continue anyway | block | controlled gap | none | source audit | no retry | run stops | guessed authority | missing-input stop test |
| SIM-P00-003 | user requests implementation before audit | orchestrator | switch to implementation | deny | none | none | mode log | retry after gates open | remain audit-only | accidental runtime edits | mode-lock test |
| SIM-P00-004 | prompt output invents endpoint | orchestrator | accept output | deny | gap ledger | none | adversarial audit | repair loop | prompt marked failed | architecture on fiction | invented-endpoint test |
| SIM-P00-005 | source date stale | orchestrator | ignore freshness | controlled gap | source map update | none | freshness note | re-review later | prompt may continue only if non-blocking | outdated benchmark later | freshness-gap test |

