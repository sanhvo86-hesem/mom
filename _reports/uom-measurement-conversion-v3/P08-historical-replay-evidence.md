# P08 — Historical Replay Evidence

**Prompt:** HESEM UoM V3 — P08  
**Generated:** 2026-05-29

The `MeasurementEvidenceVerifier` (P03 deliverable) plus the
catalog-aware `buildWrapOnly` (P08 deliverable) together guarantee
that a historical MEASVAL envelope can be verified without consulting
the current rule registry.

## SIM-031 — Retired-rule replay

Envelope captured with a rule that is later retired:

- `verify($envelope)` does NOT load `uom_conversion_rule`.
- It re-derives the hash from envelope-only fields.
- `digital_thread.audit_hash` matches → `ok: true`.

This is the property the V3 pack required: replay must use the
rule snapshot embedded in the envelope, not the current mutable
rule.

## SIM-033 — Wrap-only with known unit row

`MeasurementEvidenceReplayTest::testCatalogAwareWrapOnlyCarriesCanonicalSi`
confirms:

```
buildWrapOnly('100', 'Cel', [], $celsiusRow)
  → normalization.si_unit  = 'K'
  → normalization.si_value = 373.15
  → normalization.catalog_aware = true
  → normalization.derivation = 'wrap_only_catalog_aware'
verifier.verify(envelope).ok = true
```

## Tests

```
$ composer --working-dir=mom run test -- --filter MeasurementEvidenceReplay
...                                                                 3 / 3 (100%)
OK (3 tests, 8 assertions)

$ composer --working-dir=mom run test -- --filter Uom
............................................S................... 63 / 137
............................................................... 126 / 137
...........                                                     137 / 137
OK, but some tests were skipped! Tests: 137, Assertions: 232, Skipped: 1.
```

## Decision token

```text
UOM_V3_P08_PASS_DATA_MIGRATION_REPLAY_HARDENED
```
