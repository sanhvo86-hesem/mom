# P02 Operational Simulation

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4

```yaml
case_id: SIM-P02-01
scenario: Service uses a DB column that does not exist.
input: uom_conversion_rule schema and UomWorkflowService SQL.
expected_result: Ledger P0 if service selects rule_version while schema uses version.
actual_result: P02-C01 recorded as P0 with exact file/line evidence.
pass_fail: PASS
defect_found: version vs rule_version drift.
repair_applied: none; P02 report-only.
retest_result: assigned to P03.
residual_risk: runtime approval paths may fail until P03 repair.
```

```yaml
case_id: SIM-P02-02
scenario: Older report implies greenfield but repo already has UoM.
input: UoM file inventory.
expected_result: Ledger marks repo as existing subsystem, not greenfield.
actual_result: Inventory confirms schema/services/API/UI/tests/prior reports exist.
pass_fail: PASS
defect_found: none
repair_applied: none
retest_result: not required
residual_risk: later prompts must patch existing architecture, not rebuild.
```

```yaml
case_id: SIM-P02-03
scenario: Migration lifecycle broadened but resolver remains approved-only.
input: Migration 231 active lifecycle and ConversionRuleService approved filters.
expected_result: Ledger P0.
actual_result: P02-C02 recorded as P0.
pass_fail: PASS
defect_found: active vs approved resolver drift.
repair_applied: none; P02 report-only.
retest_result: assigned to P03.
residual_risk: active rules may not resolve.
```

## Common Minimum Simulation Set

- Golden case: Active file inventory created. PASS.
- Negative case: `rule_version` service drift recorded as P0. PASS.
- Boundary precision/overflow: Existing tests located; P05 owns proof.
- Permission denied: Manifest permission gap recorded. PASS.
- Stale cache/effective date: Cache drift recorded. PASS.
- Audit hash replay: MEASVAL verifier located; P09/P14 own proof.
- External alias quarantine: Unknown quarantine exists; ambiguous gap recorded. PASS.
- UI/API parity: Routes/controller/OpenAPI/UI located; P10/P11 own parity proof.
