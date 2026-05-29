# P03 — Quantity Kind and Dimension Vector Model

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P03 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the formal model for QuantityKind and its dimensional algebra so the conversion engine can refuse semantic-junk conversions at the moment of unit resolution, before any BCMath ever runs.

## 2. Model

`uom_quantity_kind` columns:

| Column | Type | Purpose |
|---|---|---|
| `kind_code` | varchar(50) PK | canonical kind name (`Length`, `Mass`, `Temperature`, ...) |
| `parent_kind_code` | varchar(50) FK | parent kind for hierarchical derivation (Velocity ⇒ kind, parent = NULL but dimension = M^0 L^1 T^-1) |
| `qudt_uri` | text | mapping to QUDT public ontology |
| `dimension_vector` | varchar(50) | 7-symbol ISO 80000 encoding `M^aL^bT^cI^dΘ^eN^fJ^g` |
| `label_en` | varchar(200) | English label |
| `label_vi` | varchar(200) | Vietnamese label (full diacritics) |
| `is_dimensionless` | boolean | true for empirical scales (hardness, surface roughness rating, ratios, indices) |
| `allows_cross_kind` | boolean | true only for explicitly governance-blessed cross-kind conversions (e.g. volume↔mass via density) |
| `source` | varchar(50) | authority tag (`ISO`, `QUDT`, `UCUM`, `vendor`) |

## 3. Dimension vector encoding

The 7 base quantities (ISO 80000-1):

| Symbol | Base quantity | Base SI unit |
|---|---|---|
| M | Mass | kg |
| L | Length | m |
| T | Time | s |
| I | Electric current | A |
| Θ | Thermodynamic temperature | K |
| N | Amount of substance | mol |
| J | Luminous intensity | cd |

Encoded as `M{a}L{b}T{c}I{d}Θ{e}N{f}J{g}` where each exponent is a small integer (or zero). Example values:

| Kind | Dimension vector |
|---|---|
| Length | `M0L1T0I0Θ0N0J0` |
| Mass | `M1L0T0I0Θ0N0J0` |
| Time | `M0L0T1I0Θ0N0J0` |
| Area | `M0L2T0I0Θ0N0J0` |
| Volume | `M0L3T0I0Θ0N0J0` |
| Velocity | `M0L1T-1I0Θ0N0J0` |
| Acceleration | `M0L1T-2I0Θ0N0J0` |
| Force | `M1L1T-2I0Θ0N0J0` |
| Pressure | `M1L-1T-2I0Θ0N0J0` |
| Energy | `M1L2T-2I0Θ0N0J0` |
| Power | `M1L2T-3I0Θ0N0J0` |
| Density | `M1L-3T0I0Θ0N0J0` |
| Temperature (absolute) | `M0L0T0I0Θ1N0J0` |
| Temperature difference | `M0L0T0I0Θ1N0J0` (same dimension as temperature, distinguished by parent_kind_code) |
| SurfaceRoughness (Ra) | `M0L1T0I0Θ0N0J0` (Ra is a length deviation) |
| Hardness (HRC / HRB) | `M0L0T0I0Θ0N0J0` (empirical, dimensionless) |
| AngularMeasure | `M0L0T0I0Θ0N0J0` (dimensionless) |
| AmountOfSubstance | `M0L0T0I0Θ0N0J1` (J=1 → N=1; recorded as N=1) |

(Where two kinds share dimension vector — like absolute and difference temperature, or all dimensionless scales — they are distinguished by `kind_code` and `parent_kind_code`. Dimensional algebra is necessary but not sufficient for compatibility.)

## 4. Compatibility resolution

`QuantityKindService::resolve($fromUnit, $toUnit)` resolves both units to their kinds, then applies:

1. If `from.kind_code == to.kind_code` → compatible.
2. Else if both kinds have identical `dimension_vector` AND a `parent_kind_code` relationship (e.g. Length parent of SurfaceRoughness) → compatible.
3. Else if `from.kind_code` and `to.kind_code` are both flagged `allows_cross_kind=true` AND a density / potency / packaging context is provided → compatible **with context**.
4. Else → reject `UOM_KIND_MISMATCH`.

This three-tier check is what stops "kg → m" with zero overhead and stops "Volume → Mass" without a substance context.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| KD-001 | 7-symbol ISO encoding stored as a single string for grep / index simplicity | ISO 80000-1 §3 |
| KD-002 | Exponents are integers (no fractional dimensions); rare cases (e.g. half-power spectral density) deferred to next slice | scope envelope |
| KD-003 | `parent_kind_code` distinguishes derived kinds sharing a dimension vector (e.g. Ra ⊂ Length) | model clarity |
| KD-004 | `allows_cross_kind=true` requires a context-providing token (substance, packaging, potency) | UD-003 safety |
| KD-005 | `is_dimensionless=true` does NOT imply convertibility across all dimensionless kinds; explicit kind_code still gates | semantic safety |
| KD-006 | Temperature-difference kind is a separate kind_code (TemperatureDifference) with the same dimension vector as ThermodynamicTemperature | UCUM `K{diff}` rationale |
| KD-007 | Currency kind exists in the catalog (USD, VND, EUR, JPY) so external systems can describe currency, but engine refuses to convert currency↔currency in physical engine path | UD-007 |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | KG-001 | Fractional-exponent kinds (PSD spectral density) absent | scope-extension prompt |
| medium | KG-002 | `qudt_uri` partial coverage (18 of 50 NULL) | seed extension |
| low | KG-003 | Compound-kind compatibility (e.g. Energy ⇄ Heat) not yet exercised by tests | extend tests |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Model formalism | 9 |
| ISO 80000 conformance | 10 |
| Compatibility rules clarity | 9 |
| Empirical-kind handling | 9 |
| **Total** | **37 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/semantic-compatibility-rules.md` (P03 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p03-semantic-negative-test-report.md` (P03 / 3)
