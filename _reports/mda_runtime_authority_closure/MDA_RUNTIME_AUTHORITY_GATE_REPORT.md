# MDA Runtime Authority Gate Report

- Gate: PASS
- Generated at: 2026-06-02T01:35:55+00:00

| Static check | Result |
|---|---:|
| controller_rejects_top_level_actor_claims | PASS |
| controller_rejects_payload_actor_claims | PASS |
| signature_challenge_uses_authenticated_actor | PASS |
| gateway_requires_capability_not_role_bypass | PASS |
| gateway_break_glass_is_server_verified | PASS |
| gateway_sets_domain_command_db_context | PASS |
| sod_rejects_payload_only_approval | PASS |
| reauth_rejects_timestamp_only | PASS |
| object_scope_has_no_privileged_role_bypass | PASS |
| master_data_mutation_fail_closed | PASS |
| pg_only_has_no_json_runtime_fallback | PASS |
| db_guard_default_denies_governed_tables | PASS |
| problem_details_include_correlation_id | PASS |
| openapi_domain_command_problem_contract | PASS |
| frontend_workspace_projection_only | PASS |

| Script | Exit code |
|---|---:|
| adversarial_security | 0 |
| direct_db_guard | 0 |
| workflow_status_parity | 0 |
| traceability_performance | 0 |
