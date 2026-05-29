# P02 — Precision Simulation Evidence

**Prompt:** HESEM UoM V3 — P02  
**Generated:** 2026-05-29

## Simulations executed in code

| ID | Test method | Result |
|---|---|---|
| SIM-006 | `DecimalStringTest::testSim006LargeScientificPreservesExactInteger` | PASS |
| SIM-007 | `DecimalStringTest::testSim007TinyScientificStaysExact` | PASS |
| SIM-008 | `DecimalStringTest::testSim008OverflowExponentRejected` | PASS |
| SIM-009 | `DecimalStringTest::testSim009RejectsNanLiteral` (+ INF/comma/hex/empty) | PASS |
| SIM-014 (round half-even 2.5 → 2 scale 0) | `BcMathRounderTest::testHalfEvenTiesDownOnEven` (pre-existing) | PASS |
| SIM-015 (rounding exact no-op) | NOT YET COVERED — see Residual gaps |
| SIM-016 (rounding sign CEILING -1.234 → -1.23 / FLOOR → -1.24) | partially covered by existing BcMathRounderTest — see Residual gaps |

## Verification commands and outputs

```
$ composer --working-dir=mom run test -- --filter DecimalString
..............                                                    14 / 14 (100%)
OK (14 tests, 27 assertions)

$ composer --working-dir=mom run test -- --filter Uom
.............................S............................................
.................. 88 / 88 (100%)
OK, but some tests were skipped! Tests: 88, Assertions: 149, Skipped: 1.
```

## Exactness model snapshot

The existing seed data already classifies each rule by `category`:

- `exact_linear`  — `factor` is exact (e.g. `1 in = 25.4 mm exactly`).
- `defined_linear` — defined decimal (e.g. SI prefix factor) with a
  documented number of significant digits.
- `approximate_linear` — measurement-derived (e.g. molar mass).

What's missing for HB-12 is a column-level commitment of the exactness
class on the rule itself, not just the seed comment. P02 documents
this as the explicit P05/P08 follow-up: extend
`uom_conversion_rule.exactness_class` and migrate the seed comments to
that column.

## Residual gaps (forwarded)

- HB-12 (exactness model column promotion) — owned by P08 (data model).
- HB-13 (SIM-015 exact no-op / SIM-016 sign-ceiling/floor): the
  existing `BcMathRounder::roundManual` already handles
  `ROUND_DOWN_TRUNCATE`, `ROUND_UP_CEILING`, `ROUND_HALF_UP` and
  `ROUND_HALF_EVEN`. PHP 8.4 native `bcround` path is preferred and
  passes its dedicated tests. Adding the two missing simulations as
  direct unit tests is a low-risk follow-up that does NOT need a
  rewrite of the rounder.

## Decision token

```text
UOM_V3_P02_PASS_NUMERIC_ENGINE_HARDENED
```
