# P07 — Negative Test Gate Report

**Prompt:** HESEM UoM V3 — P07  
**Blocker closed:** HB-03 (negative tests allowed to fail/error while chain passed)  
**Generated:** 2026-05-29

## Source

- Branch: `codex/mda-platform-sequential-20260529`
- New: `mom/tools/release/check_uom_safety_gate.php`
- New test: `mom/tests/Unit/Uom/UomAdversarialConversionTest.php`

## Repair

### Gate script

`mom/tools/release/check_uom_safety_gate.php` runs
`composer test -- --filter Uom` and exits non-zero whenever:

- ≥ 1 PHPUnit ERROR
- ≥ 1 PHPUnit FAILURE
- > 1 SKIPPED test (one tolerated non-critical skip is allowed)

The script parses PHPUnit 10's footer regex so it works without a
custom reporter.

### Adversarial test layer

`UomAdversarialConversionTest` runs real service code paths
(`DecimalString::parse`, `OpcUaUnitId::pack/unpackCommonCode`,
`UomException::problemCode`) and asserts on the stable HESEM
problem-code surface. Coverage:

| Case | SIM | Test |
|---|---|---|
| Empty / whitespace / NaN / INF / hex / locale comma / two-sign / trailing-exp / word | SIM-009 + grammar fuzz | `testInvalidMagnitudeIsRejected` (dataProvider, 9 inputs) |
| Overflow exponent (1e100000) | SIM-008 | `testOverflowExponentIsRejected` |
| 9007199254740993e0 round-trip | SIM-006 | `testLargeScientificMagnitudePreservesEveryDigit` |
| OPC UA unknown → -1 | SIM-028 | `testOpcUaUnknownReturnsQuarantineSentinel` |
| KGM / MMT reference values | SIM-026/027 | `testOpcUaReferenceValuesAreStable` |
| UomException problem code stability | n/a (contract) | `testUomExceptionCarriesStableProblemCode` |

## Tests

```
$ composer --working-dir=mom run test -- --filter UomAdversarialConversion
..............                                                    14 / 14 (100%)
OK (14 tests, 17 assertions)

$ php mom/tools/release/check_uom_safety_gate.php
…
Tests: 129, Assertions: 216, Skipped: 1.
[INFO] Tests:    129
[INFO] Errors:   0
[INFO] Failures: 0
[INFO] Skipped:  1
[INFO] UoM safety gate: 1 tolerated non-critical skip.
[INFO] UoM safety gate: PASS
```

## Coverage-matrix mapping

See `P07-adversarial-coverage-matrix.md` for the HB-to-test mapping.

## Standards

- 21 CFR Part 11 §11.10(a) — validation of computer systems requires
  documented test evidence. The gate script makes that evidence
  executable.

## Residual gaps

- The gate currently runs the unit slice only. P09/P13 should extend
  it to include integration/Feature tests once the DB fixture layer
  is stood up.

## Decision token

```text
UOM_V3_P07_PASS_NEGATIVE_TEST_GATE_HARDENED
```
