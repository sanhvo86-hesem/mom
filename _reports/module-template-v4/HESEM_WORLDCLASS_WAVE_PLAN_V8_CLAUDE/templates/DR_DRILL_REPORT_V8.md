# DR Drill Report — Template V8

```yaml
dr_drill:
  drill_id: DR-V8-<YYYYQ>
  scenario: <S1..S6 per CODEX_DR_DRILL_V8.md>
  executed_at: <ISO 8601>
  duration_minutes: <int>
  
participants:
  primary_oncall: <name@hesem.io>
  secondary_oncall: <name@hesem.io>
  observers: [<roles>]

scenario_steps:
  1. <step + observed result>
  2. <step + observed result>
  ...

metrics:
  RPO_target_minutes: 60
  RPO_observed_minutes: <int>
  RTO_target_minutes: 240
  RTO_observed_minutes: <int>
  data_integrity_post_restore: PASS | FAIL
  audit_chain_anchor_consistency: PASS | FAIL
  customer_facing_services_restored: PASS | PASS_WITH_CLEANUP | FAIL

result: PASS | PASS_WITH_GAPS | FAIL

findings:
  - <finding 1>: severity, description, owner, due_date

corrective_actions:
  - id: CA-DR-<YYYYQ>-NNN
    description: <action>
    owner: <role>
    due_date: <ISO date>

decision_phrase: DR_DRILL_<YYYYQ>_PASS  /  DR_DRILL_<YYYYQ>_FAIL_<reason>

stop_rule_check:
  consecutive_quarterly_FAIL_count: <int>
  if >= 2: SEV-1 + halt new tenant onboarding (R-V8-018)

approval:
  signers: [SRE Lead, On-call primary]
```
