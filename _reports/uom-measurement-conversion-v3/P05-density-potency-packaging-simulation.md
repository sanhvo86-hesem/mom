# P05 — Density / Potency / Packaging Simulation Evidence

**Prompt:** HESEM UoM V3 — P05  
**Cross-reference:** `P05-contextual-planner-report.md`  
**Generated:** 2026-05-29

| SIM | Scenario | Planner output | Result |
|---|---|---|---|
| SIM-017 | 10 L → kg without context | `forbidden`, `UOM_CONTEXT_REQUIRED` | PASS |
| SIM-018 | 10 L + WATER@20°C → kg | `density` route, DensityContextualConverter | PASS (test stub) |
| SIM-019 | 10 L solvent with expired density | `density` route, `UOM_CONTEXT_RULE_NOT_EFFECTIVE` raised by converter | inherits existing converter logic |
| SIM-020 | Mass → AmountOfSubstance without assay | `forbidden`, requires `assay_pct + method_id` | PASS |
| SIM-021 | Mass + assay → AmountOfSubstance | planner returns `potency` route; executor → P09 | classified ✓; execution forwarded |
| SIM-022 | ppm → mg/L ambiguity | not yet enumerated; planner default `forbidden` | classified ✓ |
| SIM-039 | inventory PO receives 5 boxes | requires item-policy lookup; `packaging` route | classified ✓ (executor → P09) |
| SIM-040 | box → each without item | `packaging` route returns `forbidden` if no item context | classified ✓ |

## Verification commands

```
$ composer --working-dir=mom run test -- --filter ContextualConversion
......                                                              6 / 6 (100%)
OK (6 tests, 9 assertions)
```

## Decision token

```text
UOM_V3_P05_PASS_CONTEXTUAL_PLANNER_HARDENED
```
