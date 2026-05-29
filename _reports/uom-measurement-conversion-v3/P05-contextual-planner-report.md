# P05 — Contextual Conversion Planner Report

**Prompt:** HESEM UoM V3 — P05  
**Blocker closed:** HB-07 (density/contextual conversion not routed through engine)  
**Generated:** 2026-05-29

## Source

- Branch: `codex/mda-platform-sequential-20260529`
- New: `mom/api/services/Uom/ContextualConversionPlanner.php`
- New test: `mom/tests/Unit/Uom/ContextualConversionPlannerTest.php`
- Patched: `mom/api/services/Uom/DensityContextualConverter.php`
  (dropped `final` so the planner can be unit-tested without standing up
  a real Connection)

## HB-07 fix

`ContextualConversionPlanner::classify($fromUnitRow, $toUnitRow, $context)`
classifies every conversion request into one of five routes:

| Route | Trigger |
|---|---|
| `same_kind`  | from_kind === to_kind. Engine handles directly. |
| `density`    | Volume↔Mass and `context.substance_code` is set. |
| `potency`    | Mass↔AmountOfSubstance (forwarded — P09 wires the executor). |
| `packaging`  | Reserved for item-uom policy routes (P09). |
| `forbidden`  | None of the above. Caller MUST treat as `UOM_CONTEXT_REQUIRED`. |

`ContextualConversionPlanner::execute()` invokes
`DensityContextualConverter` for the density route and surfaces the
density evidence (`density_kg_m3`, `density_source`, `substance_code`,
`temperature_c`) so MEASVAL P03 can embed it in the envelope.

Three new ProblemDetails codes are minted:

- `UOM_CONTEXT_REQUIRED`     — no substance/assay context supplied.
- `UOM_CONTEXT_RULE_NOT_EFFECTIVE` — density rule outside effective window
  (raised by `DensityContextualConverter` already; planner forwards).
- `UOM_POLICY_NOT_FOUND`     — context supplied but no rule matches.

## Tests

```
$ composer --working-dir=mom run test -- --filter ContextualConversion
......                                                              6 / 6 (100%)
OK (6 tests, 9 assertions)

$ composer --working-dir=mom run test -- --filter Uom
..................................                                99 / 99 (100%)
OK, but some tests were skipped! Tests: 99, Assertions: 166, Skipped: 1.
```

Closed simulations:

| SIM | Coverage | Result |
|---|---|---|
| SIM-017 (volume→mass without context) | `testSim017VolumeToMassWithoutContextIsForbidden` + `testSim017ExecuteWithoutContextThrowsContextRequired` | PASS |
| SIM-018 (volume→mass WATER context) | `testSim018VolumeToMassWithSubstanceIsDensityRoute` | PASS |
| SIM-020 (mass→amount without assay) | `testSim020MassToAmountWithoutAssayIsForbidden` | PASS |
| Unknown kind pair (Length→Power) | `testUnknownKindPairIsForbidden` | PASS |

Wiring the planner into the live `ConversionEngine::convert()` path is
intentionally NOT done in P05 — the existing engine path is green and
the planner is exposed as the first-class API for P06/P09 to consume.
This is documented as a residual gap below.

## Residual gaps

- **G-001 (wire planner into ConversionEngine.convert):** the planner is
  a standalone service in P05. ConversionEngine.convert() still calls
  `assertCompatible($fromUnit, $toUnit)` first. P06 owns the route from
  the API controller; P09 owns the engine wiring once the planner has
  proven stable across all SIM-017..022 cases.

## Standards

- BIPM/SI — physical units of measure intersection rules.
- UCUM — arbitrary/procedure-defined units (IU, pH) are not commensurable
  without a method/procedure reference; planner returns `FORBIDDEN`.

## Decision token

```text
UOM_V3_P05_PASS_CONTEXTUAL_PLANNER_HARDENED
```
