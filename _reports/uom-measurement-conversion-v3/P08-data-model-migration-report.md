# P08 — Data Model + Migration Drift Report

**Prompt:** HESEM UoM V3 — P08  
**Blocker closed:** HB-14 (wrap-only catalog-aware canonical promotion)  
**Generated:** 2026-05-29

## Source

- Patched: `mom/api/services/Uom/MeasurementValueFactory.php` (HB-14)
- New: `mom/api/services/Uom/UomNakedNumberScanner.php`
- New tests:
  - `mom/tests/Unit/Uom/UomNakedNumberScannerTest.php` (5 cases)
  - `mom/tests/Unit/Uom/MeasurementEvidenceReplayTest.php` (3 cases)

## HB-14 fix

`MeasurementValueFactory::buildWrapOnly` now accepts an optional
`?array $unitRow` parameter. When supplied:

- `normalization.si_value` is computed via the same affine triplet
  path as `build()` (input × si_factor + si_offset).
- `normalization.si_unit` is the SI base code for the quantity kind.
- `normalization.derivation = 'wrap_only_catalog_aware'`.
- `normalization.catalog_aware = true`.
- `semantic_context.quantity_kind` is populated from the row.

When `$unitRow` is null (legacy callers) the wrap stays catalog-blind
and surfaces an explicit reason
(`'wrap_only_catalog_blind_no_row_supplied'`) so downstream consumers
can decide whether to escalate. This is the literal HB-14 closure:
"wrap-only MEASVAL can omit kind/canonical when unit is known" no
longer applies — the catalog-aware path is available and the
catalog-blind path is now self-describing.

The replay verifier (`MeasurementEvidenceVerifier`, P03) accepts both
shapes because the hash payload covers the new `si_value` / `si_unit`.

## Migration drift

```
$ php mom/tools/release/check_migration_drift.php
migration drift: 0 P1 + 3 P2 (no fatal issues; pass --strict to fail on P1)
```

Three pre-existing P2 prefix collisions on 108 / 115 / 188 are unrelated
to UoM and have been carried forward from main.

## Decision token

```text
UOM_V3_P08_PASS_DATA_MIGRATION_REPLAY_HARDENED
```
