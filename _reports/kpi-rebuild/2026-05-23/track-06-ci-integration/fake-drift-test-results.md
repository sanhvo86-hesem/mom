# KPI Rebuild Track 06 - Fake Drift Test Results

Date: 2026-05-23

Method: each test copied `mom/data/registry/kpi-authority-registry.json` to a
temporary `/tmp/kpi-drift-*` file, mutated only the temp copy, and ran:

```bash
KPI_INTEGRITY_REGISTRY=<tmp-registry.json> php mom/tools/release/check_kpi_integrity.php
```

No repo file was mutated for fake drift testing.

| Case | Expected | Result | Key guard output |
|---|---:|---|---|
| remove-counter | exit 1 | PASS | `Registry OTD: counter_metric must be a dedicated definition object...` |
| staged-reward | exit 1 | PASS | `Registry FAI_FIRST_PASS: staged_data_contract must not be reward_eligible.` |
| runtime-without-calculator | exit 1 | PASS | `runtime_calculated_metrics lists 'FAKE_RUNTIME_NO_CALC' but it does not appear in KpiEngine::getCalculator()` |
| bad-linked-cdr | exit 1 | PASS | `Gate metric KPI-G0-01: linked_cdr 'Z99' does not exist in RACI-MASTER-MATRIX.` |
| duplicate-governance-code | exit 1 | PASS | `Registry: duplicate governance canonical_code 'OTD'.` |
| percent-min-sample-warning | exit 0 | PASS | `Registry OTD: percent-unit KPI has min_sample 0...`; warning-only by policy. |
| jd-unknown-code | exit 1 | PASS | `JD scorecard CEO: kpi_code 'UNKNOWN_KPI' is not a governed metric.` |

Baseline after fake tests:

```text
php mom/tools/release/check_kpi_integrity.php
KPI integrity check PASSED with 38 warning(s).
```

The 38 warnings are carried as P1 debt in the current-state audit and final
summary; there are 0 P0 findings after the Track 06 hardening changes.
