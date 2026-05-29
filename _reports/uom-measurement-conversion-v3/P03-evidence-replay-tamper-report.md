# P03 — Evidence Replay / Tamper Report

**Prompt:** HESEM UoM V3 — P03  
**Generated:** 2026-05-29

Cross-reference: `P03-measval-v2-report.md` for full repair narrative.

## What the verifier does

```php
$verifier = new MeasurementEvidenceVerifier();
$result   = $verifier->verify($envelope);
// $result = [
//   'ok'             => true|false,
//   'expected'       => '<original audit_hash>',
//   'recomputed'     => '<recomputed hash>',
//   'schema_version' => 'MEASVAL-V2',
//   'fields_present' => ['input.magnitude' => bool, …]
// ]
```

`ok = true` only when `hash_equals($expected, $recomputed)` AND
`$expected` is non-empty. Constant-time comparison prevents
hash-timing oracles.

## Required field-presence inventory

`fields_present` makes it explicit which structural fields the
envelope carries. Useful for downstream graders that want to verify
schema completeness in addition to hash integrity. The fields:

- `input.magnitude` / `input.unit_code`
- `display.magnitude` / `display.unit_code`
- `normalization.si_value` / `normalization.si_unit`
- `evidence.rule_code` / `evidence.factor` / `evidence.offset_value`
- `precision_envelope.display_scale` / `precision_envelope.rounding_policy`
- `digital_thread.audit_hash`

## Why excluded fields are intentional

The V2 hash excludes:

- `recorded_at` — timestamps vary per call; a replay across days
  should still verify.
- `trace_id` / `request_id` — call-identifying, not decision-identifying.
- `actor_id` — privacy-sensitive; the manifest authority or
  approval record carries the actor link separately.
- `ai_flags` — advisory annotations attached after the fact.

Excluding these fields is what makes "replay across sessions"
possible. They live in `digital_thread` for traceability.

## Test results

```
$ composer --working-dir=mom run test -- --filter MeasurementEvidenceVerifier
.....                                                               5 / 5 (100%)
OK (5 tests, 9 assertions)
```

5 tests — SIM-002 + 1 clean-replay + 3 tamper-detection. All PASS.

## Decision token

```text
UOM_V3_P03_PASS_AFFINE_MEASVAL_EVIDENCE
```
