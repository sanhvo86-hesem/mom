# V4 Telemetry Control Tower Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
Prompt: P57 - Telemetry Control Tower and Runtime Authority Observability
Posture: pre-production runtime-readiness evidence; not production-ready

## 1. Executive Decision

P57 closes the runtime observability gap for governed command authority. `MdaRuntimeTelemetryService` now defines required metrics, emits safe/redacted telemetry for command outcomes and Problem Details, builds a control tower report, writes a P60-readable scorecard input, and exposes alert rules for P0 authority risks.

## 2. Source Truth Audit

- P56 made Problem Details `code` and `type` stable enough for telemetry dimensions.
- Existing `MasterDataFallbackTelemetry` already records fallback/drift counts; P57 consumes it rather than duplicating.
- Existing `domain_outbox_events` and `generic_crud_denial_event` provide outbox/direct-mutation probes.
- Existing `RuntimeAuthorityService` is the health/status report aggregator; P57 adds a read-only telemetry slice.
- Telemetry is observability only and does not become mutation authority.

## 3. Runtime Evidence Probe

Manual probe:

```json
{
  "required_metrics_present": true,
  "p60_decision": "NO_GO_RUNTIME_OBSERVABILITY",
  "active_alert_rules": [
    "fallback_read_total",
    "drift_count",
    "outbox_lag_p95",
    "direct_mutation_attempt",
    "scenario_failure"
  ],
  "readiness_blocker_total": 1,
  "quality_hold_blocker_total": 1,
  "uom_failure_total": 1,
  "security_denial_total": 1,
  "fallback_read_total": 1,
  "drift_count": 1,
  "outbox_lag_p95_seconds": 601,
  "direct_mutation_attempt_total": 1,
  "scenario_failure_total": 1,
  "snapshot_file_exists": true,
  "db_telemetry_inserts": 9,
  "db_snapshot_inserts": 1,
  "sensitive_leak_detected": false
}
```

## 4. Blocker / Gap Map

Closed:

- Required fallback, drift, outbox, audit/e-sign, security, direct mutation, projection, and scenario metrics exist in catalog.
- Problem Details failures map to telemetry metrics.
- Domain command HTTP path records best-effort telemetry without blocking command execution.
- Control tower snapshot is readable by P60 via `mda-v4-runtime-control-tower.latest.json#/p60_scorecard_input`.
- Redaction policy blocks actor/payload/plain identifiers; probe shows no sensitive leak.

Controlled:

- Real OTel exporter is not installed; P57 writes OTel-compatible structured events to PostgreSQL/file sinks.
- Full dashboard UI is deferred; P57 provides data source and service report.
- Composer PHPUnit/PHPStan gates remain blocked by missing local vendor binaries.

## 5. Design Delta

- Added migration 273 for `mda_runtime_telemetry_event` and `mda_runtime_control_tower_snapshot`.
- Added `MdaRuntimeTelemetryService`.
- Wired `DomainCommandController` to record command success/failure telemetry.
- Added telemetry slice into `RuntimeAuthorityService`.
- Added metric, alert, redaction/retention, and control tower datasource registries.
- Added telemetry unit test and standalone probe.

## 6. Implementation Plan

Implemented after P56. P58 must use the control tower service and P56 workflow contracts as scenario runner inputs, then record scenario result metrics back through `MdaRuntimeTelemetryService`.

## 7. Files To Edit

- `mom/database/migrations/273_mda_runtime_telemetry_control_tower.sql`
- `mom/api/services/MdaRuntimeTelemetryService.php`
- `mom/api/controllers/DomainCommandController.php`
- `mom/api/services/RuntimeAuthorityService.php`
- `mom/data/registry/mda-v4-telemetry-metric-catalog.json`
- `mom/data/registry/mda-v4-alert-rule-catalog.json`
- `mom/data/registry/mda-v4-telemetry-redaction-retention-policy.json`
- `mom/data/registry/mda-v4-runtime-control-tower-datasource.json`
- `mom/tests/Unit/Services/MdaRuntimeTelemetryServiceTest.php`

## 8. Files Forbidden Or High-risk

- Command handlers as telemetry-owned mutation authority.
- Raw payload/actor/person identifiers in telemetry dimensions.
- Generic CRUD mutation paths.
- Parallel UOM implementation branches.

## 9. Code / Schema / Contract Changes

- `mda_runtime_telemetry_event` stores redacted event metrics with retention.
- `mda_runtime_control_tower_snapshot` stores aggregated control tower snapshots and P60 scorecard inputs.
- `MdaRuntimeTelemetryService::metricCatalog()` defines 19 runtime metrics.
- `MdaRuntimeTelemetryService::alertRules()` defines P0 alert thresholds.
- `RuntimeAuthorityService` now includes `mda_runtime_control_tower` in the runtime authority report.

## 10. Test Plan

- Lint new/modified PHP.
- Run `/private/tmp/p57_telemetry_probe.php`.
- Validate telemetry registry JSON.
- Run `git diff --check`.
- Run composer test/analyse/check; record vendor blocker if still missing.

## 11. Operational Simulation Matrix

| scenario_id | command/action | expected_gate | data_written | expected_result |
|---|---|---|---|---|
| V4-SIM-057-001 | StartJob blocked by tool life | Problem Details code -> readiness/tooling metric | telemetry event + snapshot | blocker visible |
| V4-SIM-057-002 | fallback read happens | MasterDataFallbackTelemetry consumed | control tower snapshot | P0 alert `fallback_read_total` |
| V4-SIM-057-003 | outbox delayed | DB outbox lag probe | snapshot metric | P0 alert `outbox_lag_p95` |
| V4-SIM-057-004 | audit store unavailable | Problem code contains audit | telemetry event | `audit_failure_total` increments |
| V4-SIM-057-005 | direct mutation denied | generic CRUD denial probe | snapshot metric | P0 alert `direct_mutation_attempt` |
| V4-SIM-057-006 | BOLA/object scope denial | Problem code maps to security metric | telemetry event | `security_denial_total` increments |
| V4-SIM-057-007 | scenario failure | `recordScenarioResult(..., fail)` | telemetry event | P0 alert `scenario_failure` |
| V4-SIM-057-008 | projection stale | projection staleness metric | telemetry event | staleness visible |

## 12. Multi-role Adversarial Audit

- SRE lead: PASS for metric catalog, alert thresholds, file+DB sinks, and P60 input.
- Security lead: PASS for redaction and probe evidence showing no actor/payload leak.
- MES lead: PASS because telemetry does not bypass command authority.
- Quality lead: PASS because hold/readiness/e-sign/audit failures have stable problem-code dimensions.
- Platform lead: PARTIAL until live dashboards and OpenTelemetry exporter are installed.

## 13. Rollback / Restore / Recovery Plan

- Revert this commit to remove telemetry wiring without reverting command handlers.
- Keep file sink logs as audit evidence; they are append-only JSONL and safe-dimension only.
- Dropping P57 tables requires exporting snapshots if they were used in a red-team scorecard.

## 14. Telemetry / Control Tower Evidence

- Probe wrote 9 telemetry events and 1 snapshot through the fake DB sink.
- Probe produced active P0 alerts and a P60 scorecard decision.
- `sensitive_leak_detected=false` verifies payload/actor data was not emitted.

## 15. Generated Artifacts

- `V4_TELEMETRY_CONTROL_TOWER_REPORT.md`
- `V4_TELEMETRY_CONTROL_TOWER_PROOF_PACK.json`
- `V4_P57_GAP_LEDGER_UPDATE.csv`
- `V4_PROMPT_HANDOFF_P57.md`

## 16. Gap Ledger Update

See `V4_P57_GAP_LEDGER_UPDATE.csv`.

## 17. Decision Token

P57_PASS_WITH_CONTROLLED_GAPS_READY_FOR_P58

## 18. Handoff Packet For Next Prompt

P58 must execute real command-stack scenarios and call `MdaRuntimeTelemetryService::recordScenarioResult()` so P60 can evaluate failures from telemetry evidence.
