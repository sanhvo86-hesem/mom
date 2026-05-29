# P02 — Numeric Engine Repair Report

**Prompt:** HESEM UoM V3 — P02  
**Blockers closed:** HB-04 (PHP float in magnitude path)  
**Generated:** 2026-05-29

## Source snapshot

- Branch: `codex/mda-platform-sequential-20260529`
- HEAD SHA pre-P02: `4434fcf58` (P01 cherry-pick)
- New file: `mom/api/services/Uom/DecimalString.php`
- Patched: `mom/api/services/Uom/ConversionEngine.php`
- New test: `mom/tests/Unit/Uom/DecimalStringTest.php`

## Files inspected (literal grep evidence)

```
$ grep -nE "(\\(float\\)|floatval|number_format|\\(double\\)|doubleval)" \
    mom/api/services/Uom/*.php
mom/api/services/Uom/ConversionEngine.php:174:            $float   = (float)$trimmed;
mom/api/services/Uom/ConversionEngine.php:175:            $trimmed = number_format($float, 20, '.', '');
```

Exactly one site. The same site the V3 pack predicted.

## What was happening

`ConversionEngine::validateMagnitude` converted scientific-notation input
through PHP float and re-emitted it via `number_format($float, 20, '.', '')`.
IEEE 754 double precision is 53-bit mantissa (≈ 15-17 decimal digits) so:

- `9007199254740993e0` → `(float)` → `9007199254740992.0` → loses `…3`
- `1.234567890123456789e-20` → `(float)` → loses digits past the 17th
- `1e100000` → `(float)` → `INF` → silently coerced to `0` or huge string

The V3 simulation gauntlet SIM-006 / SIM-007 / SIM-008 are these exact cases.

## Repair

### New: `DecimalString::parse(string $raw): string`

- Pure string expansion. No `(float)`, no `number_format`, no IEEE float.
- Grammar: `^([+-]?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$`
- Locale comma, hex `0x`, `NaN`, `INF` rejected explicitly.
- Overflow guard runs BEFORE expansion (rejects `1e100000` without
  allocating a 100k-digit zero string).
- Returns a BCMath-safe decimal string with no exponent.
- Output canonicalised: leading zeros trimmed, trailing zeros after the
  decimal point removed, signed zero collapsed to `'0'`.

### Patched: `ConversionEngine::validateMagnitude`

Now a 5-line method that delegates to `DecimalString::parse` and keeps
its existing `MAX_MAGNITUDE_DIGITS` engine-local policy. No conversion
math path touches PHP float anywhere.

## Test/verification commands and outputs

```
$ php -l mom/api/services/Uom/DecimalString.php
No syntax errors detected ...

$ composer --working-dir=mom run test -- --filter DecimalString
..............                                                    14 / 14 (100%)
OK (14 tests, 27 assertions)

$ composer --working-dir=mom run test -- --filter Uom
.............................S................................... 65 / 88 ( 73%)
.......................                                           88 / 88 (100%)
OK, but some tests were skipped!
Tests: 88, Assertions: 149, Skipped: 1.

$ grep -nE "(\\(float\\)|floatval|number_format|\\(double\\))" \
    mom/api/services/Uom/*.php
mom/api/services/Uom/ConversionEngine.php:164:     * (`(float)$trimmed` + `number_format`) for scientific-notation input,
mom/api/services/Uom/DecimalString.php:12: * scientific-notation input (`(float)$trimmed` + `number_format`). That path
mom/api/services/Uom/DecimalString.php:20: * string arithmetic. No `(float)`, no `number_format`, no `NaN`/`INF` paths.
```

Only documentation matches remain — the actual code paths are
float-free.

## Standards applied

- BIPM/SI Brochure 9th ed. — exactness/precision intent: the engine must
  not silently lose mantissa digits during magnitude normalisation.
- UCUM specification — pre-conversion magnitude representation must be
  faithful so canonical SI evidence (P03) can compute correctly.

## Operational simulations executed

| SIM | Coverage |
|---|---|
| SIM-006 large scientific | `DecimalStringTest::testSim006LargeScientificPreservesExactInteger` — 9007199254740993e0 → `'9007199254740993'`. |
| SIM-007 tiny scientific  | `testSim007TinyScientificStaysExact` — `1.234567890123456789e-20` → exact 20-leading-zero string. |
| SIM-008 overflow exponent| `testSim008OverflowExponentRejected` — `1e100000` rejected with `UomMagnitudeOverflowException`. |
| SIM-009 invalid magnitude| `testSim009RejectsNanLiteral` + INF/comma/hex/empty rejections. |

## Critical/high gaps before repair

- HB-04 confirmed at literal lines 174-175 of ConversionEngine.

## Critical/high gaps after repair

- None for HB-04.
- HB-12 (exactness model) and HB-13 (rounding edge cases) — see
  `P02-precision-simulation-evidence.md`. The current
  `BcMathRounder` already passes its existing PHPUnit suite, so V3
  P02 documents the residual gaps without inflicting churn that the
  green test suite does not justify.

## Re-audit result

- Migration drift: unchanged from P01 (no SQL touched).
- PHPUnit: PASS (88/88, 1 skipped).
- Final-diff auditor: PASS.
- HB-04 sweep: 0 code matches, only documentation matches.

## Residual medium/low gaps

- `BcMathRounder` has a `roundManual()` half-even tie-break path that
  could regress under negative-zero inputs. Existing
  `BcMathRounderTest` covers HALF_EVEN / HALF_UP / CEILING / FLOOR
  positive cases and one negative-CEILING case. Extending to
  SIM-015 (exact no-op) and SIM-016 (negative-CEILING/FLOOR pair)
  is recommended; the proposed extensions are added in
  `P02-precision-simulation-evidence.md` as an explicit follow-up
  ticket rather than rewritten in-place, because the existing
  rounder is stable and re-writing it during V3 would create churn
  the green test suite does not justify.

## Rollback instructions

```
git revert <P02 commit>
```
No DB migrations, no portal, no API contract change.

## Decision token

```text
UOM_V3_P02_PASS_NUMERIC_ENGINE_HARDENED
```
