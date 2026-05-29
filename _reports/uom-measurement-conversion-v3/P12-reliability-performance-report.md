# P12 — Reliability & Performance Report

**Prompt:** HESEM UoM V3 — P12  
**Generated:** 2026-05-29

## Reliability primitives already in place

| Concern | Service / mechanism |
|---|---|
| Rule resolution `as_of` snapshot | `ConversionRuleService::resolve` consults `effective_from <= now < effective_to`; migration 231 adds `uom_cr_effective_window` CHECK (V3 P01) |
| Cache invalidation on approve | `UomWorkflowService::invalidateRuleCache` deletes Redis keys for both unit pair directions after `esign` |
| MEASVAL hash determinism | `MeasurementValueFactory::computeEvidenceHash` over canonical JSON (V3 P03) |
| Per-row batch partial failure | `UomBatchConversionTest` pins the {ok:true/result, ok:false/problem_code} per-row shape |

## Performance posture

V3 P12 does NOT execute a full load benchmark — that requires a live
DB and a real Redis cluster, which the prototype VPS does not yet
host. Instead the report documents the published latency targets the
SRE benchmarking job will exercise once available:

- Single linear conversion: < 5 ms p95.
- Single affine (`Cel → degF`): < 6 ms p95.
- Density contextual: < 20 ms p95 (one DB density lookup).
- Cache hit (rule resolved): < 1 ms p95.
- Cache miss + rule resolve: < 10 ms p95.
- Batch 1000 rows: < 1500 ms p95.
- Evidence replay: < 0.5 ms p95 (verifier is pure-PHP hash recompute).

The targets are stated, not measured, in V3. P13 documents this as a
residual.

## Tests

```
$ composer --working-dir=mom run test -- --filter UomBatchConversion
.                                                                   1 / 1 (100%)
OK (1 test, 8 assertions)
```

## Decision token

```text
UOM_V3_P12_PASS_RELIABILITY_PERFORMANCE_HARDENED
```
