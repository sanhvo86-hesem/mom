# CODEX_DR_DRILL_V8 — Quarterly Disaster Recovery Drill

```text
Per V8 file 24 SLO-V8-017 + V5 file 12 §7.

Cadence: quarterly
Targets: RPO 1h / RTO 4h

Phases:
  P1. drill_planning (1-2 wk before): scope, tenants in scope, scenarios
  P2. drill_execution (1 day): execute scenarios with on-call
  P3. drill_verification: confirm RPO/RTO observed; data integrity verified
  P4. drill_postmortem: lessons learned + corrective actions

Scenarios (rotate quarterly):
  S1. region_failure: kill primary region; failover to DR region
  S2. database_failure: kill primary Postgres; failover to replica
  S3. network_partition: simulate inter-region partition
  S4. data_corruption: detect + rollback from PITR snapshot
  S5. ransomware: isolate + restore from backup
  S6. credential_compromise: rotate keys + audit reach

Required outputs:
  D1. _reports/sre/dr-drill-<YYYYQ>.md
     - executed_at
     - scenario
     - participants (on-call + observers)
     - RPO_observed (minutes)
     - RTO_observed (minutes)
     - PASS / FAIL
     - findings
     - corrective actions

Tests:
  T1. RPO observed <= 60 minutes
  T2. RTO observed <= 240 minutes
  T3. data integrity post-restore: all checksums match
  T4. audit chain anchor verified post-restore
  T5. customer-facing services restored without manual cleanup

Decision phrase: DR_DRILL_<YYYYQ>_PASS  /  DR_DRILL_<YYYYQ>_FAIL_<reason>

Stop rule: 2 consecutive quarterly DR drill FAILs → SEV-1 + halt new tenant onboarding (R-V8-018)

End.
```
