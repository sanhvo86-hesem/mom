# Incident Postmortem — Template V8

```yaml
incident_id: INC-V8-<YYYYMMDD>-<NNN>
severity: SEV-0 | SEV-1 | SEV-2 | SEV-3
declared_at: <ISO 8601>
resolved_at: <ISO 8601>
duration_minutes: <int>

summary: <1-paragraph for executive>

timeline:
  - time: <ISO>
    event: <observation or action>
    actor: <on-call or system>
  - <chronological events>

impact:
  customers_affected: <count or "all in tenant <X>">
  records_affected: <count>
  revenue_impact_usd: <estimate>
  regulatory_impact: <none | reportable to <regulator>>

root_cause:
  - <root cause statement>

contributing_factors:
  - <factor 1>
  - <factor 2>

what_went_well:
  - <positives observed>

what_went_poorly:
  - <negatives observed>

corrective_actions:
  - id: CA-INC-V8-NNN-01
    description: <action>
    owner: <role>
    due_date: <ISO date>
    blocking: yes | no
  - <more>

prevention_measures:
  - <systemic prevention>

slo_breach:
  - slo_id: SLO-V8-NNN
    minutes_burned: <int>
    error_budget_remaining_pct: <pct>

links:
  trace: <jaeger link>
  metrics: <grafana link>
  logs: <loki link>

approval:
  signer: Engineering Lead + on-call
  postmortem_blameless: yes
  shared_with_customers: <yes/no/redacted>
```
