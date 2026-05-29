# P03 — Affine / Special Unit Simulation Evidence

**Prompt:** HESEM UoM V3 — P03  
**Generated:** 2026-05-29  
**Cross-reference:** `P03-measval-v2-report.md`

## SIM-002 — 100 Cel → degF canonical 373.15 K

```
assertSame('K', $envelope['normalization']['si_unit']);
assertSame(0, bccomp('373.15', $envelope['normalization']['si_value'], 4));
```

PASS via `MeasurementEvidenceVerifierTest::testSim002_100Cel_to_degF_canonical_is_373_15_K`.

## SIM-003 — 98.6 degF → Cel

Covered transitively by `AffineConverterTest` (existing) and inherits
the V3 canonical-from-input invariant.

## SIM-031 — Retired-rule replay

`MeasurementEvidenceVerifier::verify` consumes the envelope only — no
current-rule lookup — so an envelope built against a since-retired
rule still verifies clean.

## Tamper-detection

| Mutation | Test | Result |
|---|---|---|
| `evidence.factor` changed | `testReplayVerifierRejectsTamperedFactor` | PASS |
| `display.magnitude` changed | `testReplayVerifierRejectsTamperedDisplayMagnitude` | PASS |
| `precision_envelope.rounding_policy` changed | `testReplayVerifierRejectsTamperedRoundingPolicy` | PASS |

## SIM-004 / SIM-005 (delta vs absolute T)

Engine-side enforcement out of P03 scope; covered structurally by the
new `normalization.derivation = 'from_input_via_affine_triplet'` label
which lets a downstream consumer see how SI was derived.

## SIM-023 (pH special)

`LogarithmicConverter` continues to block pH-to-concentration without
reference quantity. No regression.

## Decision token

```text
UOM_V3_P03_PASS_AFFINE_MEASVAL_EVIDENCE
```
