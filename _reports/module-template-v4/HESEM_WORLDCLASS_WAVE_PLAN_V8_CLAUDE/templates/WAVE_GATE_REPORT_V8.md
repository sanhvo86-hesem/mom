# Wave Gate Report — Template V8

```yaml
wave:
  id: <W0..W14 or CS-A/CS-B-period>
  scope: <one-line scope>
  entry_decision_phrase: <e.g., W0_5_PLATFORM_SUBSTRATE_ACCEPTED>
  exit_decision_phrase: <e.g., W1_SLICE_FACTORY_READY>
  gate_owner: <Program Manager + Domain Lead>
  reported_at: <ISO 8601>

evidence_summary:
  - gate_id: <SLO-V8-NNN or invariant_id>
    description: <one-line>
    result: PASS | PASS_WITH_WARNINGS | FAIL
    evidence_uri: <link to test logs / report>
    owner: <role>
    residual_risk: <none | low | medium | high>
    classified_action: <none | must_fix_now | schedule | accept>
  - <more rows ...>

tests_executed:
  - test_id: <T-V8-NNN>
    command: <bash command actually run>
    result: PASS | FAIL
    evidence: <log path>
    notes: <observations>
  - <more rows ...>

invariants_check:
  - INV-1: PASS  <link to detection mechanism status>
  - INV-2: PASS
  - ...
  - INV-12: PASS

stop_rules_check:
  - STOP-V8-01..18: status per stop rule per V8 file 02 §2

rollback_rehearsal:
  procedure: <link to rollback runbook>
  rehearsed_at: <ISO 8601>
  result: PASS | PASS_WITH_GAPS | FAIL
  gaps: <list of gaps>
  remediation_plan: <if PASS_WITH_GAPS or FAIL>

forbidden_diff_check:
  diff_against: main..HEAD
  result: empty | violations
  violations: <list if any>

inert_flag_check:
  HMV4_PREVIEW_ENABLED: false (verified)
  fixture file 74 NOT loaded: verified
  HMV4_DISABLE_MUTATION_LAUNCHERS: true (verified)
  per-root live-API toggles: per data/inert_flag_registry_v8.json status

slo_status_window:
  window: 30d
  per-slo (from file 24):
    SLO-V8-001 L1 auth.decide p95: <value> (target < 20ms)
    SLO-V8-003 L3 workflow commit p95: <value> (target < 500ms)
    SLO-V8-008 L7 api p95: <value> (target < 500ms)
    ...

decision_phrase: <exact phrase from V8 file 27 wave plan>

next_wave_blocking_items:
  - <item> + <owner> + <due_date>

approval:
  signers:
    - role: <Domain Lead>
      principal: <name@hesem.io>
      signed_at: <ISO 8601>
      signature: <ed25519>
    - role: <Platform Lead>
      ...
    - role: <Compliance Lead> (regulated only)
      ...

attached_evidence_bundle:
  uri: <s3://...>
  sha256: <hex>
  signed_by: <platform-lead@hesem.io>
```
