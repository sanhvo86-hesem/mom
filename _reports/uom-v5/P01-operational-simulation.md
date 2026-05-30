# P01 Operational Simulation

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

```yaml
case_id: SIM-P01-01
scenario: UCUM special units require affine handling for Cel/degF.
input: UCUM-like Celsius/Fahrenheit expression requirement from prompt pack.
expected_result: Matrix routes Cel/degF to affine/special handling, not factor-only linear conversion.
actual_result: Matrix records UCUM as parser authority and explicitly blocks factor-only affine/log/arbitrary units.
pass_fail: PASS_WITH_WARNING
defect_found: official UCUM source not browsed because domain outside repo allowlist.
repair_applied: CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED added.
retest_result: matrix row includes gap and handler gate.
residual_risk: P05/P06 need official/local UCUM evidence before high-risk release claims.
```

```yaml
case_id: SIM-P01-02
scenario: UNECE code KGM from EDI maps externally but anchors canonical kg.
input: KGM external unit code.
expected_result: External code map to canonical kg if active and trusted; otherwise quarantine.
actual_result: Matrix assigns UNECE/EDIFACT to `uom_external_code_map` and rejects it as canonical semantics.
pass_fail: PASS_WITH_WARNING
defect_found: official UNECE source not browsed because domain outside repo allowlist.
repair_applied: CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED added.
retest_result: matrix still mandates canonical anchor or quarantine.
residual_risk: P06 must verify official mappings or controlled source artifacts.
```

```yaml
case_id: SIM-P01-03
scenario: Vendor benchmark lacks specific official UoM source.
input: Siemens/Dassault/AVEVA high-level MOM/MES pages.
expected_result: Use only pattern extraction, not unsupported capability claim.
actual_result: Matrix extracts digital thread, genealogy, quality, inventory, and MOM boundary patterns only.
pass_fail: PASS
defect_found: none
repair_applied: none
retest_result: not required
residual_risk: later implementation still needs repo tests.
```

## Common Minimum Simulation Set

- Golden case: SAP base UoM pattern maps to HESEM item base unit plus alternative policy. PASS.
- Negative case: Disallowed official source domain is not cited as verified. PASS.
- Boundary precision/overflow: Assigned to P05.
- Permission denied: Assigned to P04/P10/P14.
- Stale cache/effective date: Assigned to P03/P13.
- Audit hash replay: Assigned to P09/P14.
- External alias quarantine: Matrix requires quarantine. PASS.
- UI/API parity: Assigned to P10/P11.
