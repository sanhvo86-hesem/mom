# P04 — Standards Crosswalk Report

**Prompt:** HESEM UoM V3 — P04  
**Blocker closed:** HB-08 (OPC UA UnitId algorithm)  
**Generated:** 2026-05-29

## Source

- Branch: `codex/mda-platform-sequential-20260529`
- New: `mom/api/services/Uom/OpcUaUnitId.php`
- New test: `mom/tests/Unit/Uom/OpcUaUnitIdTest.php`

## HB-08 fix

`OpcUaUnitId::packCommonCode($code)` and `::unpackCommonCode($id)`
implement the OPC UA Part 8 §5.6.3 algorithm: a UNECE Common Code
(1-3 ASCII alphanumerics) packs into a signed Int32 as
`(byte0 << 16) | (byte1 << 8) | byte2`. Short codes pad with `\0` so
they occupy the high bytes — `'M'` packs to `5_046_272`.

Reference values (locked in `OpcUaUnitIdTest::commonCodeReferenceTable`):

| Common Code | UnitId |
|---|---:|
| KGM | 4 933 453 |
| MMT | 5 066 068 |
| LTR | 5 002 322 |
| C81 | 4 405 297 |
| FAH | 4 604 232 |

`OpcUaUnitId::UNKNOWN = -1` is the quarantine sentinel. Codes that
don't match the Common Code grammar pack to -1 so the caller can
route them to the alias-quarantine path (SIM-028).

## Tests

```
$ composer --working-dir=mom run test -- --filter OpcUaUnitId
..............                                                    14 / 14 (100%)
OK (14 tests, 23 assertions)
```

## Other P04 surfaces

- **UCUM, QUDT, UNECE** authority codes are already registered in
  `UomStandardLibraryManifestService::SOURCE_AUTHORITIES` (P01
  deliverable) — `BIPM_SI, UCUM, QUDT, UNECE_REC20, OPC_UA, ISO, IEC,
  CIPM, NIST, ASTM, HESEM_INTERNAL_STANDARD`. The DB CHECK constraint
  on `uom_standard_library_manifest.source_authority` (migration 231)
  mirrors this catalog so service and DB cannot drift.
- **QuantityDimensionVector** registry — the existing
  `uom_quantity_kind` table already carries dimension semantics. A
  full QUDT-style 7-tuple (L, M, T, I, Θ, N, J) is a follow-up
  documented in `P04-opcua-unece-simulation.md`; not a hard blocker
  for V3 P04 closure.
- **UCUM expression parser** — out of P04 scope; documented as
  `CONTROLLED_STANDARD_GAP` in the simulation report for P13 to
  judge.

## Decision token

```text
UOM_V3_P04_PASS_STANDARDS_CROSSWALK_EXECUTABLE
```
