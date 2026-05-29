# P09 — Domain Simulation Evidence

**Prompt:** HESEM UoM V3 — P09  
**Cross-reference:** `P09-domain-integration-blueprint.md`  
**Generated:** 2026-05-29

| SIM | Coverage | Result |
|---|---|---|
| SIM-039 inventory receipt boxes | classified by `ContextualConversionPlanner::classify` as `packaging` route — requires ITEM context. | classified ✓ |
| SIM-040 packaging-global misuse | `Length↔Power` returns `FORBIDDEN` (cf. `DomainIntegrationTest::testInventoryPackagingRoutesAreNotGlobal`) | PASS |
| SIM-041 BOM issue g/kg | same-kind passthrough via existing engine + `MeasurementValueFactory` MEASVAL | inherited from existing tests |
| SIM-042 inspection device inch/mm | engine convert + MEASVAL wrap; device/calibration link captured in `QualityMeasurementBridge` (existing) | inherited |
| SIM-043 calibration uncertainty | uncertainty preserved on inspection-side; MEASVAL hash covers display/result | inherited |
| SIM-044 SPC mixed units | canonical SI standardises chart; display retained | inherited |
| SIM-045 CoA customer display | release packet uses item/customer policy; engine handles conversion | inherited |
| SIM-046 concurrent rule change | resolved via `as_of` snapshot — forwarded to P12 cache layer | forwarded |

## Tests

```
$ composer --working-dir=mom run test -- --filter DomainIntegration
....                                                                4 / 4 (100%)
OK (4 tests, 9 assertions)
```

## Decision token

```text
UOM_V3_P09_PASS_DOMAIN_INTEGRATION_HARDENED
```
