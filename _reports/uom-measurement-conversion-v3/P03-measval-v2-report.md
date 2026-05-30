# P03 — MEASVAL V2 Affine + Full-Payload Hash Report

**Prompt:** HESEM UoM V3 — P03  
**Blockers closed:** HB-05, HB-06  
**Forwarded:** HB-14 → P08  
**Generated:** 2026-05-29

## Source

- Branch: `codex/mda-platform-sequential-20260529`
- Patched: `mom/api/services/Uom/MeasurementValueFactory.php`
- New: `mom/api/services/Uom/MeasurementEvidenceVerifier.php`
- New test: `mom/tests/Unit/Uom/MeasurementEvidenceVerifierTest.php`
- Patched test: `mom/tests/Unit/Uom/VRS001ValidationTest.php` (positional arg order)

## HB-05 fix

`MeasurementValueFactory::build` now derives canonical SI from the
INPUT unit's affine triplet:
`si_value = magnitude × from_unit.si_factor + from_unit.si_offset`.
For 100 Cel → degF this yields 373.15 K and `si_unit = 'K'` regardless
of the display unit being affine. The previous `normalisedToSi(result,
toUnitRow)` returned the display value when the display unit was
affine — the literal HB-05 failure.

## HB-06 fix

New `computeEvidenceHash` hashes canonical-JSON over the full payload
(input, display, normalization, rule [code, version, category, factor,
offset_value, reversed], precision [display_scale, rounding_policy]).
`recorded_at`, `trace_id`, `request_id`, `actor_id`, `ai_flags` are
excluded so the hash is a *decision* identity, not a *call* identity —
this is what lets the verifier replay across sessions.

## Replay verifier

`MeasurementEvidenceVerifier::verify($envelope)` re-derives the hash
from envelope-only data and compares with `hash_equals` (constant-time).
It does NOT need the original rule row, so historical envelopes whose
rules have since been retired still verify clean.

## Tests

```
$ composer --working-dir=mom run test -- --filter Uom
....................................S............................  65 / 93
............................                                       93 / 93
OK, but some tests were skipped!
Tests: 93, Assertions: 157, Skipped: 1.
```

VRS001ValidationTest line 245 fixture order corrected from
`('1','KG','KG','1')` (accidentally passed by old normalisedToSi using
`$result`, not `$magnitude`) to `('KG','1','KG','1')`.

## Standards

UCUM (special units), BIPM/SI (canonical = K), 21 CFR Part 11 / Annex 11
(tamper evidence).

## Decision token

```text
UOM_V3_P03_PASS_AFFINE_MEASVAL_EVIDENCE
```
