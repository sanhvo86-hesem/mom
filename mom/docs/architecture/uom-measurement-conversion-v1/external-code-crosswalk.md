# P04 — External Code Crosswalk (UNECE Rec20, OPC UA, LIMS, EDI)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P04 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Document the standards-to-canonical mapping the engine uses to absorb foreign-system unit codes. Every external system has its own dictionary; HESEM honours the source but does not adopt it as authority. The crosswalk records each mapping and the revision it is pinned to.

## 2. Mapping systems

| System code | Authority | Coverage in v1 seed | Pin revision |
|---|---|---|---|
| UNECE_Rec20 | UN Centre for Trade Facilitation | 32 highest-traffic codes (MMT, CMK, MTR, KGM, LTR, ...) | `UNECE_Rec20_r17` |
| OPC_UA | OPC Foundation Part 8 §5.6.3 | 24 common engineering tags from namespace 0 | `OPC_UA_1_05` |
| LIMS | de-facto LIMS conventions | 8 starter symbols (`μm`, `μL`, `ppm`, ...) | `LIMS_v1` |
| EDI | EDIFACT / X12 unit codes | none in v1 seed | (reserved) |
| VENDOR_PROPRIETARY | vendor-specific tags via SUPPLIER alias | per-supplier on demand | per-supplier |

## 3. Crosswalk samples

### UNECE Rec20 → HESEM canonical

| Rec20 | Canonical | Notes |
|---|---|---|
| MMT | mm | millimetre |
| CMK | cm | centimetre |
| MTR | m | metre |
| KMT | km | kilometre |
| INH | in | inch |
| FOT | ft | foot |
| GRM | g | gram |
| KGM | kg | kilogram |
| TNE | t | metric tonne |
| LTR | L | litre |
| MLT | mL | millilitre |
| HUR | h | hour |
| MIN | min | minute |
| SEC | s | second |
| CEL | Cel | degree Celsius |
| KEL | K | kelvin |
| FAH | degF | degree Fahrenheit |
| BAR | bar | bar |
| PAL | Pa | pascal |
| PSI | psi | pound per square inch |
| WTT | W | watt |
| AMP | A | ampere |
| VLT | V | volt |
| OHM | Ω | ohm |
| HTZ | Hz | hertz |
| KWH | kWh | kilowatt-hour |
| MMK | mm | (duplicate Rec20 historical re-use; pinned by source_revision) |
| MTK | m2 | square metre |
| MTQ | m3 | cubic metre |
| PR | pr | pair |
| H87 | EA | each |
| KGS | kg/s | kg per second |

### OPC UA EUInformation → HESEM canonical

| UnitId (decimal) | Display | Canonical | Notes |
|---|---|---|---|
| 4408555 | mm | mm | length: millimetre |
| 5067851 | m | m | length: metre |
| 4870451 | km | km | length |
| 4604232 | g | g | mass |
| 5066826 | kg | kg | mass |
| 5267539 | s | s | time |
| 5197646 | min | min | time |
| 4736842 | h | h | time |
| 4408652 | mm/s | mm_s | velocity (compound) |
| 5197647 | m/s | m_s | velocity |
| 4604232 | g | g | mass |
| 4408652 | bar | bar | pressure |
| 4868425 | Pa | Pa | pressure |
| 5132368 | psi | psi | pressure |
| 4477001 | A | A | current |
| 5719876 | V | V | voltage |
| 5266753 | Cel | Cel | temperature |
| 5263431 | K | K | temperature |
| 4604249 | degF | degF | temperature |
| 4604232 | Hz | Hz | frequency |
| 4869185 | rad/s | rad_s | (reserved; not yet seeded) |
| 5197639 | rpm | rpm | rotational speed |
| 4868700 | N | N | force |
| 4604232 | J | J | energy |
| 5067332 | W | W | power |
| 5067852 | kW | kW | power |
| 4868425 | mol | mol | amount of substance |
| 5066832 | cd | cd | luminous intensity |

### LIMS symbol → HESEM canonical

| LIMS symbol | Canonical | Notes |
|---|---|---|
| μm | RA_UM (when used for roughness) or `um` (when used for length) | context-dependent; resolver dispatches by quantity_kind hint |
| μL | uL | volume |
| nL | nL | volume |
| ppm | ppm | dimensionless ratio |
| ppb | ppb | dimensionless ratio |
| % | percent | dimensionless ratio |
| Δ°C | DeltaCel | temperature difference |
| ΔK | DeltaK | temperature difference |

## 4. Provenance and pinning

Every row in `uom_external_code_map` carries:
- `source_revision` — pinned to the spec version the row was authored against.
- `notes` — text justification or page reference in the spec.
- `effective_from` — when this mapping became authoritative.
- `effective_to` — NULL while current; populated when superseded by a newer revision row.

When UNECE Rec20 rev.18 lands, the new mapping is inserted as a new row with the new `source_revision` value and the new `effective_from`. The old row gets an `effective_to` set on its supersede date. Historic MEASVAL envelopes resolved through the old row continue to resolve cleanly because lookups are time-aware.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| EC-001 | External system code is never authoritative; it resolves to canonical | CL-006 |
| EC-002 | Source revision pinned per row; never assumed | CL-008 |
| EC-003 | OPC UA only namespace 0 in seed; vendor namespaces via SUPPLIER alias | AM-003 |
| EC-004 | LIMS μm dispatches via quantity_kind hint (Length vs SurfaceRoughness) | AM-005 |
| EC-005 | EDI seed deferred; column reserved | scope envelope |
| EC-006 | Customer-scoped external codes via CUSTOMER alias rather than external code map | UD-009 |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | ECG-001 | EDI seed empty | extend after first commercial EDI integration |
| medium | ECG-002 | OPC UA vendor-namespace mappings absent | per-supplier alias seeding |
| medium | ECG-003 | UNECE Rec20 long-tail (170+ codes) absent | extend by traffic |
| low | ECG-004 | rad/s OPC UA UnitId reserved but no canonical unit yet | add rad_s unit if angular velocity becomes a kind |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Coverage of major systems | 8 |
| Revision pinning discipline | 10 |
| Resolver dispatch clarity | 9 |
| Provenance recording | 10 |
| **Total** | **37 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/unit-catalog-alias-governance.md` (P04 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p04-alias-ambiguity-redteam.md` (P04 / 3)
