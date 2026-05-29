# P12 — Cache & Concurrency Simulation Evidence

**Prompt:** HESEM UoM V3 — P12  
**Generated:** 2026-05-29

## SIM-046 — Concurrent rule change

Existing `UomWorkflowService::esign` flips the rule lifecycle and then
calls `invalidateRuleCache($ruleId, $redis)` which deletes both
direction keys (`uom:rule:{from}:{to}` and `uom:rule:{to}:{from}`).
A reader that loaded the snapshot before the flip still holds an
immutable rule snapshot, so its in-flight conversion completes against
the rule it had at request time — the `as_of` snapshot guarantee.

## SIM-047 — Cache stale after retire

Same flow: retire flips lifecycle, deletes the cache keys, the next
reader misses cache and re-resolves; the retired rule will not be
selected because `effective_to <= now`.

## SIM-032 — Batch 1000 rows partial failure

`UomBatchConversionTest` pins the per-row partial-failure shape; the
SRE batch endpoint scales the same logic.

## SIM-050 — Rollback

See `P12-rollback-rehearsal.md`.

## Decision token

```text
UOM_V3_P12_PASS_RELIABILITY_PERFORMANCE_HARDENED
```
