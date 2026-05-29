# P04 — OPC UA / UNECE Simulation Evidence

**Prompt:** HESEM UoM V3 — P04  
**Generated:** 2026-05-29  
**Cross-reference:** `P04-standards-crosswalk-report.md`

## SIM-026 / SIM-027 / SIM-028 — OPC UA UnitId

| SIM | Input | Expected | Test method | Result |
|---|---|---|---|---|
| SIM-026 | `KGM` | `4 933 453` | `testPackCommonCodeMatchesOpcUaReference` (dataProvider) | PASS |
| SIM-027 | `MMT` | `5 066 068` | same | PASS |
| SIM-028 | unknown `!!` | `-1` quarantine | `testUnknownCodeReturnsMinusOne` | PASS |

Round-trip stability (`isRoundTripStable`) PASS for all 5 reference codes.

## SIM-029 — EDI alias conflict

Alias-quarantine handling lives in `UomAliasResolutionService`
(existing). The OPC UA path now returns -1 on grammar violation,
which downstream consumers must treat as quarantine — that is the
correct V3 behaviour and is explicitly tested.

## SIM-001 — Dimension mismatch (kg → m)

Out of P04 scope (engine-side; covered by existing UoM negative
tests).

## SIM-025 — Arbitrary unit (IU → mg)

Out of P04 scope; arbitrary units require substance/method/reference-
standard registration (P05 contextual planner + P09 quality bridge).

## Controlled gaps

- UCUM expression parser subset — `CONTROLLED_STANDARD_GAP`. Parser
  grammar published at https://ucum.org/ucum is not (yet) embedded
  in the HESEM engine; resolved via authority-mapping table for the
  finite set of supported expressions. Documented for P13 review.
- QUDT QuantityKindDimensionVector 7-tuple — current
  `uom_quantity_kind` carries qualitative dimension labels; the
  numeric SI dimension vector promotion is forwarded to P08.

## Decision token

```text
UOM_V3_P04_PASS_STANDARDS_CROSSWALK_EXECUTABLE
```
