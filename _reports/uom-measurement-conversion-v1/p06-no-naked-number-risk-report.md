# P06 — No-Naked-Number Risk Map and Scan Strategy

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P06 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

The "naked number" anti-pattern is a measurement value stored without its unit, or with an opaque / hard-coded display string instead of a canonical code. This report inventories where naked numbers can hide in the HESEM data model, the strategy used to surface them, and the residual risk.

## 2. Definition

A measurement value is **clothed** when:

- it carries a canonical_code resolved through `uom_unit_catalog`,
- the canonical_code is `lifecycle_status='active'` at the moment of the write,
- the value is wrapped in a MEASVAL envelope with a SHA-256 hash, or at minimum a canonical_unit_code FK on the source row.

It is **naked** when any of:

- the value is stored as text without a unit hint,
- the unit is a free-text string not in `uom_unit_catalog`,
- the unit is the `measurement_unit` PG enum value but not yet aliased through `uom_alias` (SYSTEM scope),
- the value is in a JSONB blob without a parseable unit hint.

## 3. Naked-number risk map

| Risk | Where it lurks | Severity | Detection |
|---|---|---|---|
| Free-text unit field | legacy spreadsheet imports | high | importer rejects un-aliased text |
| `measurement_unit` enum used directly | inspection_results legacy rows | medium | migration 228 alias seed mm/in/deg/Ra/HRC/HRB |
| Hard-coded unit in templated SOP | docs/operations/sops/*.html | low | scope: docs are reference text, not measurement records |
| Display label as authority | legacy reports | medium | scanner CT-DRIFT category |
| JSONB blob with `"value": "1.5"` no unit | legacy form_results | high | scanner via JSONB key audit |
| AI extraction from email PO | aeoi_cases payload | medium | AEOI pipeline already routes through UoM resolver |
| OPC UA stream into MES | mes_inline_measurements | medium | mapper rejects unknown UnitId |
| LIMS import | (future) lab_test_results | high | LIMS adapter resolves through alias |
| Currency mixed into measurement field | quote_lines.discount stored alongside qty | medium | finance engine separation |

## 4. Scan strategy

| Scanner | Method | Cadence |
|---|---|---|
| `UomDataQualityScanner::scanOrphanedPolicies` | catalog lifecycle vs active policy | on-demand + nightly |
| `UomDataQualityScanner::scanConversionGaps` | cross-policy unit pairs without conversion path | on-demand |
| `UomDataQualityScanner::scanMissingDensity` | volume-slot items without density row | on-demand |
| `UomDataQualityScanner::scanStaleReviews` | rules in pending_review > 14 days | nightly |
| `UomDataQualityScanner::scanQuarantinedAliases` | quarantine queue depth | on-demand |
| (proposed) `scanNakedJsonbValues` | grep JSONB form_results for numeric-only entries | weekly |
| (proposed) `scanLegacyEnumUsage` | `inspection_results` rows where `measurement_unit` is set but `canonical_unit_code` is NULL | weekly |
| Migration drift detector | already runs in CI | every push |
| KPI integrity | already runs in CI | every push |

## 5. Remediation playbook

| Naked-number pattern | Remediation |
|---|---|
| free-text unit | route through alias resolver; if alias resolves, write canonical_unit_code; else quarantine |
| `measurement_unit` enum bare | for each enum value, ensure SYSTEM alias maps to canonical; then bridge re-wraps inspection_results to populate canonical_unit_code |
| JSONB numeric without unit | publish a migration script that infers from context column (when SOP/template metadata is unambiguous); else flag for manual triage |
| display-label hard-coded | replace with canonical in code path; preserve display via display_unit_code |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| NN-001 | Migration 228 seeded alias `mm/in/deg/Ra/HRC/HRB` so legacy `measurement_unit` enum values resolve through alias resolver, not free-text | UD-005 + UD-009 |
| NN-002 | Inspection_results retains both `measurement_unit` enum (legacy) and new `canonical_unit_code` (canonical) columns; new writes populate canonical; legacy reads still work via fallback resolution | additive evolution |
| NN-003 | JSONB form_results legacy scan deferred until the form_engine team is ready to backfill | scope envelope |
| NN-004 | Currency must NEVER appear in MEASVAL — engine refuses | UD-007 |
| NN-005 | Display label is informational; never authoritative | UD-003 |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | NG-001 | Naked-JSONB scanner not yet implemented | proposed in §4; follow-up commit |
| medium | NG-002 | Legacy enum scanner not yet implemented | proposed in §4 |
| medium | NG-003 | Form_results backfill plan deferred | coordinate with form_engine team |
| low | NG-004 | Display-label drift in legacy reports not yet centrally inventoried | once consumer wiring lands, sweep reports |

## 8. Simulation result table

| Case | Scenario | Expected | Actual |
|---|---|---|---|
| NS-001 | Insert inspection_results row with measurement_unit='mm', canonical_unit_code=NULL | scanner flags as naked-enum | proposed scanner pending NG-002 |
| NS-002 | Insert inspection_results row with both measurement_unit='mm' AND canonical_unit_code='mm' | not flagged | not flagged ✓ |
| NS-003 | Insert mes_inline_measurements row via QualityMeasurementBridge | canonical + envelope populated | confirmed |
| NS-004 | Insert quote_lines with currency_code='USD' and qty=10 | quote service treats as commerce, not measurement | acceptable; not a UoM scope concern |
| NS-005 | Import legacy form_results JSONB with naked numeric | flag via NG-001 scanner | proposed |

## 9. Audit scorecard

| Axis | Score |
|---|---|
| Risk map completeness | 9 |
| Scanner coverage | 7 (NG-001, NG-002 pending) |
| Remediation playbook | 9 |
| Migration alignment | 10 |
| **Total** | **35 / 40** |

## 10. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT` — NG-001 + NG-002 carried to IMPL-07 closure.
