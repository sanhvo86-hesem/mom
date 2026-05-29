# P09 — Domain Integration Blueprint

**Prompt:** HESEM UoM V3 — P09  
**Generated:** 2026-05-29

## Authority class map

| Domain | Authority class | Owning service | UoM consumption pattern |
|---|---|---|---|
| Unit catalog / quantity kinds | UoM authority | `UnitCatalogService`, `QuantityKindService` | Direct |
| Conversion rules | UoM authority | `ConversionRuleService` + `UomStandardLibraryManifestService` (V3 P01) | Direct |
| Item ↔ UoM binding | ITEM policy | `ItemUomPolicyService` (8-level priority preserved) | Engine consults policy before fallback |
| Inventory receipts/issues | Inventory transaction | (consuming module) | Resolves via ITEM policy → engine |
| Inspection results | Inspection authority | (consuming module) + `QualityMeasurementBridge` | MEASVAL envelope wrap (V3 P03/P08) |
| Calibration records | Calibration authority | `QualityMeasurementBridge::wrapCalibrationResult` | Same — preserves uncertainty in evidence |
| SPC analytics | SPC authority | consuming module | Canonical SI for charting, display unit retained |
| Release packets / CoA | Release authority | consuming module | Display conversion via customer policy |
| MES / OT inline | OT untrusted | `ExternalEngineeringUnitMapper` + `OpcUaUnitId` | Quarantine-first (unknown UnitId → -1) |
| AI advisory | non-authority | `UomWorkflowService::recordAiAdvisory`, `UomAiAdvisoryGuard` (P11) | Suggestion only; human reviewer decision required |

## Workspace boundary

All listed services are projection-only when invoked from a workspace
(Control Center, ITEM workspace, Quality workspace). Mutation must
re-anchor to the authoritative record/workflow command — for UoM
this is the `submitForReview` → `approve` → `esign` chain in
`UomWorkflowService`.

## Item policy priority — preserved

`ItemUomPolicyService` 8-level resolution
(item × site × supplier × customer × context × effective date × …)
was already correct on PR #74 and continues to satisfy the V3 P09
contract.

## OT / external untrusted inputs

`OpcUaUnitId::packCommonCode` returns `-1` for any code that does not
satisfy the UNECE Rec 20 Common Code grammar (alphanumeric, 1-3 chars).
`-1` is the agreed quarantine sentinel — downstream consumers must
route to alias-quarantine instead of accepting the input as authority
(SIM-028).

## Standards

- ISA/IEC 62443 — OT/IACS lifecycle; quarantine-first is the
  least-privilege primitive.
- 21 CFR Part 11 — separation of authoring authority and reviewer
  authority is recorded in approval rows.

## Tests

```
$ composer --working-dir=mom run test -- --filter DomainIntegration
....                                                                4 / 4 (100%)
OK (4 tests, 9 assertions)
```

Coverage:

- UoM authority catalog includes the V3 integration standards
  (BIPM_SI, UCUM, QUDT, UNECE_REC20, OPC_UA).
- OT unknown input routes to quarantine (`-1` sentinel).
- Inventory packaging routes are not "globally available" — planner
  classifies them as `FORBIDDEN` without ITEM context.
- AI advisory cannot self-approve a retired manifest (sanity boundary).

## Decision token

```text
UOM_V3_P09_PASS_DOMAIN_INTEGRATION_HARDENED
```
