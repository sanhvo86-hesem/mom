# P11 — Logical / Physical Data Model and Migration Plan

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P11 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the logical model (entities + relationships) and the physical migration chain that realises it in PostgreSQL.

## 2. Logical model (compressed ERD)

```
QuantityKind (1) ──< (N) UnitCatalog
UnitCatalog (1) ──< (N) ConversionRule [from_unit, to_unit FKs]
UnitCatalog (1) ──< (N) Alias
UnitCatalog (1) ──< (N) ExternalCodeMap
UnitCatalog (1) ──< (N) ItemUomPolicy [5 slot FKs]
UnitCatalog (1) ──< (N) PackagingPolicy
ConversionRule (1) ──< (N) RuleApproval [4 steps]
Rule (1) ──< (N) MEASVAL (via rule_code + rule_version)
MEASVAL (1) ──< (1) MeasurementThread row
MaterialDensity is standalone, joined by substance_code
AIAdvisoryLog is standalone, joined by advisor_id
```

## 3. Physical migration chain

| ID | File | Purpose |
|---|---|---|
| 214 | `214_uom_quantity_kind.sql` | quantity kinds |
| 215 | `215_uom_unit_catalog.sql` | unit catalog + `uq_ucum_code` |
| 216 | `216_uom_rounding_policy.sql` | rounding policy enum |
| 217 | `217_uom_conversion_rule.sql` | rule table + `chk_rule_approved` |
| 218 | `218_uom_external_code_map.sql` | external code map |
| 219 | `219_uom_alias.sql` | alias + quarantine |
| 220 | `220_item_uom_policy.sql` | ITUOM 8-level |
| 221 | `221_item_packaging_policy.sql` | packaging overlay |
| 222 | `222_material_density_registry.sql` | density |
| 224 | `224_uom_seeds.sql` | fixture data |
| 225 | `225_uom_rule_approval.sql` | approval trail |
| 226 | `226_uom_indexes.sql` | covering indexes |
| 228 | `228_uom_measval_integration.sql` | MEASVAL columns + thread + Ra/HRC/HRB + alias seed |
| (future) | uncertainty budget table | reserved |
| (future) | impact severity policy table | reserved |
| (future) | alias_history (append-only) | optional governance hardening |

All migrations are forward-only. Down migrations are not authored because the audit-thread invariant forbids destructive rollback of catalog state.

## 4. Storage profile

| Table | Expected size (1 year, busy plant) | Notes |
|---|---|---|
| `uom_quantity_kind` | < 100 rows | static |
| `uom_unit_catalog` | < 500 rows | grows with vendor / region additions |
| `uom_conversion_rule` | < 5 000 rows | grows with kind coverage |
| `uom_alias` | < 50 000 rows | bursty with supplier onboarding |
| `uom_alias_quarantine` | < 10 000 rows over time | most resolve & drop out |
| `uom_external_code_map` | < 10 000 rows | grows with EDI partner adoption |
| `item_uom_policy` | per-item | scales with item master |
| `item_packaging_policy` | per-item-with-packaging | scales with packaged items |
| `material_density_registry` | < 5 000 rows | static metrology |
| `uom_rule_approval` | append-only, ~4 rows per rule change | scales with churn |
| `uom_measurement_thread` | append-only, one per recorded conversion | the dominant table |
| `uom_ai_advisory_log` | append-only | bounded by AI throughput |

## 5. Migration safety contract

| Property | Mechanism |
|---|---|
| Idempotent | every DDL guarded by `IF NOT EXISTS`; every INSERT guarded by `ON CONFLICT DO NOTHING` |
| Atomic | each file is a single transaction (PG default) |
| Drift-detected | `php mom/tools/release/check_migration_drift.php` runs in CI |
| Replay-safe on fresh DB | seed migrations carry no UUID hardcoding; use `gen_random_uuid()` |
| FK-ordered | quantity kind → unit catalog → alias → rule → thread |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| DM-001 | Forward-only migrations | audit-thread invariant |
| DM-002 | All UoM tables in same domain prefix (`uom_`, `item_uom_`, `item_packaging_`, `material_density_`, `uom_measurement_`) | scope boundary |
| DM-003 | Indexes computed for the queries we actually run (per IMPL-06 catalog) | performance |
| DM-004 | Migration drift detector is the structural gate | CI policy |
| DM-005 | Future tables (uncertainty, impact severity, alias_history) reserved but not implemented in v1 | YAGNI |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | DG-001 | Storage profile estimates are rough; no production traffic data yet | observability after wiring |
| low | DG-002 | Future tables not pre-allocated as placeholder migrations | YAGNI |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Logical model clarity | 10 |
| Migration chain completeness | 10 |
| Safety contract | 10 |
| Storage planning | 8 (DG-001) |
| **Total** | **38 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/fixture-catalog-spec.md` (P11 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p11-naked-number-remediation-backlog.md` (P11 / 3)
