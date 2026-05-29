# P08 — Naked-Number Scanner Report

**Prompt:** HESEM UoM V3 — P08  
**Generated:** 2026-05-29

`UomNakedNumberScanner::scan($rows)` walks already-loaded row metadata
(`table`, `column`, `value`, `siblings[]`) and flags numeric
measurement-looking columns that have no sibling unit declaration.

Severity is `P0` for regulated tables
(`inspection_*`, `calibration_*`, `msa_*`, `batch_release*`,
`control_chart*`, `lot_results*`, `spc_*`) and `P2` everywhere else.

The class is intentionally schema-agnostic — the CI integration that
loads sample rows from each controlled table lives outside this
service so unit tests stay DB-free.

## Test coverage

```
$ composer --working-dir=mom run test -- --filter UomNakedNumber
....                                                                5 / 5 (100%)
OK (5 tests, 5 assertions)
```

- naked measurement in regulated table → P0
- column with `<col>_unit` sibling → clean
- non-measurement column → ignored
- naked measurement in unregulated table → P2
- non-numeric value (`'N/A'`) → ignored

## Decision token

```text
UOM_V3_P08_PASS_DATA_MIGRATION_REPLAY_HARDENED
```
