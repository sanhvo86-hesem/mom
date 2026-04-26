# Slice Report — Template V8

```yaml
slice:
  root_code: <e.g., NQCASE>
  surface_pattern: <WS | AR | AC | SFW | DL | ML>
  target_maturity: <0-7>
  target_wave: <W0..W14>
  reporter: <Domain Lead + Platform Lead>
  reported_at: <ISO 8601>

artifacts_present:
  scope_contract: <link>
  fixture_contract: <link>
  screen_contract: <link>
  api_contract: <link or N/A if L<4>
  workflow_contract: <link or N/A if L<5>
  evidence_contract: <link>
  qa_report: <link>
  rollback_runbook: <link>
  decision_log: <this file>

guards_results (per V8 file 02 + slice factory):
  G1 node syntax: PASS | FAIL
  G2 fixture parse: PASS | FAIL
  G3 forbidden diff: empty | violations
  G4 fixture not in portal: verified | violation
  G5 inert defaults: verified | violation
  G6 chromium e2e: <pass>/<total> = <pct>%
  G7 visual regression: max_diff = <px>; threshold 50px
  G8 axe-core: <serious> serious violations; <critical> critical
  G9 graphics authority: PASS | violations
  G10 authority ledger entry: present | absent
  G11 live API contract test (L≥4): PASS | FAIL | N/A
  G12 failure-mode test (L≥4): PASS | FAIL | N/A
  G13 perf budget (L≥4): p95 = <ms>; error_rate = <pct>
  G14 graduation ADR (L≥4): present | absent
  G15 command envelope (L≥5): conformant | non-conformant | N/A
  G16 11 mutation tests (L≥5): <pass>/11
  G17 saga compensation chaos (L≥5): PASS | FAIL | N/A
  G18 per-mutation ADR (L≥5): present | absent
  G19 e-sign verification (regulated L≥5): PASS | FAIL | N/A

quantitative:
  e2e_pass_rate: <pct>
  visual_drift_max: <px>
  a11y_serious_count: <int>
  performance_p95_ms: <ms>
  contract_drift: none | breaking | non-breaking

risks_identified:
  - id: R-V8-NNN
    description: <one-line>
    severity: <SEV-N>
    mitigation_status: <pending | in-progress | resolved>

decision_phrase:
  - <ROOT>_<NUM>_PASS_READY_FOR_QA
  - <ROOT>_<NUM>_PASS_WITH_WARNINGS
  - <ROOT>_<NUM>_FAIL_BLOCK_NEXT
  - <ROOT>_<NUM>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING
  - <ROOT>_<NUM>_QA_FAIL_BLOCK_NEXT

if PASS_WITH_WARNINGS:
  warnings_classified:
    - id: W-NNN
      classification: must_fix_now | schedule | accept
      owner: <role>
      deadline: <ISO date>

approval:
  signers: [Domain Lead, Platform Lead]
  signed_at: <ISO 8601>
```
