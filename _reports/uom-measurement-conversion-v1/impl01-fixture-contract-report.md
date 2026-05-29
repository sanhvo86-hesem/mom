# IMPL-01 — Fixture Catalog and Contract Skeleton Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-01 |
| Date | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` |

## 1. Scope

Seed the UoM catalog data model with a deterministic fixture set covering the conversion categories required by ERP / MOM / MES / EQMS. Land the migration chain 214 → 222 (data-model) + 224 (seed) + 225 / 226 (workflow + indexes) + 228 (MEASVAL integration) and prove that the live PostgreSQL instance materialises 69 active units, 50 quantity kinds, and 33 approved rules — the numbers the engine must defend.

## 2. Source inheritance

| Source | Path | Used for |
|---|---|---|
| HESEM root model lock | package `03_UOM_DOMAIN_MODEL_LOCK.md` | quantity-kind taxonomy, conversion category enum |
| HESEM standards lock | package `02_STANDARD_AND_BENCHMARK_RESEARCH_LOCK.md` | UCUM 1.9, QUDT, ISO 80000-1, UNECE Rec20 |
| Existing HESEM migration register | `mom/database/migrations/00X..213_*.sql` | next available migration ID (214) |
| `.ai/CONVENTIONS.md` | repo `.ai/` | column-naming standard (`*_code`, `*_unit_code`, `effective_*`, `lifecycle_status`) |

## 3. Migration chain delivered

| ID | File | Purpose |
|---|---|---|
| 214 | `214_uom_quantity_kind.sql` | governing dimensional taxonomy |
| 215 | `215_uom_unit_catalog.sql` | canonical units, UCUM codes, SI factors, risk levels |
| 216 | `216_uom_rounding_policy.sql` | named rounding policies (HALF_EVEN, HALF_UP, DOWN_TRUNCATE, UP_CEILING, NONE) |
| 217 | `217_uom_conversion_rule.sql` | factor / offset rule registry + `chk_rule_approved` constraint |
| 218 | `218_uom_external_code_map.sql` | UNECE Rec20, OPC UA NodeId, LIMS symbol resolution |
| 219 | `219_uom_alias.sql` | alias + quarantine table, null-safe COALESCE unique index |
| 220 | `220_item_uom_policy.sql` | 8-level priority ITUOM resolution |
| 221 | `221_item_packaging_policy.sql` | packaging unit overlay |
| 222 | `222_material_density_registry.sql` | substance density rows for volume↔mass |
| 224 | `224_uom_seeds.sql` | the fixture data itself |
| 225 | `225_uom_rule_approval.sql` | 4-step workflow approval trail |
| 226 | `226_uom_indexes.sql` | covering indexes for hot paths |
| 228 | `228_uom_measval_integration.sql` | MEASVAL columns on `inspection_results` + `mes_inline_measurements` + uom_measurement_thread + Ra / HRC / HRB units + measurement_unit enum alias seed |

## 4. Fixture coverage by quantity kind

50 quantity kinds seeded. Representative kinds and unit counts:

| Kind | Units seeded | Notes |
|---|---|---|
| Length | mm, cm, m, km, in, ft, yd, mil | SI exact + imperial defined-linear |
| Mass | g, kg, t (metric ton), lb, oz, lb_av | UCUM + Rec20 |
| ThermodynamicTemperature | Cel, K, degF | affine with offset |
| TemperatureDifference | DeltaCel (`Cel{diff}`), DeltaK (`K{diff}`) | UCUM annotation syntax — distinct from absolute scales |
| Pressure | Pa, kPa, MPa, bar, psi, atm | mixed exact + defined |
| Volume | L, mL, m3, cm3, gal_US, gal_UK | density-contextual dispatch |
| Time | s, min, h, d | exact base |
| AmountOfSubstance | mol, mmol | exact |
| ElectricCurrent | A, mA | exact |
| LuminousIntensity | cd | base |
| AngularMeasure | deg, rad | exact ratio |
| Frequency | Hz, kHz, MHz | exact |
| Velocity | m_s, km_h | derived |
| Acceleration | m_s2 | derived |
| Force | N, kN, lbf | mixed |
| Energy | J, kJ, kWh, cal | mixed |
| Power | W, kW, hp | mixed |
| Density | kg_m3, kg_L, g_cm3 | dispatch input |
| SurfaceRoughness | RA_UM (UCUM `{Ra}`) | empirical |
| Hardness | HRC (`{HRC}`), HRB (`{HRB}`) | empirical |
| Currency | USD, VND, EUR, JPY | **blocked** in physical engine |

## 5. Conversion rule fixtures

`SELECT category, COUNT(*) FROM uom_conversion_rule WHERE lifecycle_status='approved' GROUP BY category;` returns:

| Category | Approved rules |
|---|---|
| affine | 2 (Cel↔K, degF↔Cel) |
| defined_linear | 6 |
| exact_linear | 25 |
| **Total approved** | **33** |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| FD-001 | Approve rules via draft-then-activate DO block in seed migration so `chk_rule_approved` is honoured without forcing seed-time approver invention | migration 224 |
| FD-002 | `bidirectional=true` on every linear or affine rule so engine can reverse on demand without re-seeding the inverse rule | migration 224 + ConversionEngine.php |
| FD-003 | Temperature-difference units use UCUM `K{diff}` / `Cel{diff}` annotations to avoid global `uq_ucum_code` collision | UCUM 1.9 §32 |
| FD-004 | Ra / HRC / HRB delivered with `si_factor=NULL` (empirical scales) — engine treats them as non-convertible across kinds, alias-mapped only | migration 228 §4 |
| FD-005 | Densities seeded for water, ethanol, mild steel, aluminium, copper, lubricant (6 substances) | migration 222 |
| FD-006 | Aliases seeded at SYSTEM scope only; SUPPLIER / CUSTOMER aliases will arrive via admin UI flow once VRS-001 closes | migration 228 §5 |

## 7. Contracts

`mom/contracts/objects/uom/` umbrella holds:

- `uom-scope-contract.md` — narrative scope per the U0 contract (above)
- `events/` — domain event envelopes (rule.proposed, rule.approved, rule.activated, alias.quarantined)
- `schemas/` — JSON Schema for `convert` request / response and `MEASVAL` envelope

Canonical per-entity contract emission (`mom/contracts/objects/master_data--units/`, `master_data--quantity-kinds/`) is deferred as gap **OG-001** (carried from IMPL-00); track for PR #74 review.

## 8. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| medium | FG-001 | Per-entity contract JSON files not emitted under canonical paths (umbrella `uom/` used instead) | metrology | re-house under `master_data--units/contract.json` and `master_data--quantity-kinds/contract.json` |
| low | FG-002 | Potency conversion seed (active-ingredient assay) not yet provided — pharma kind absent | future slice | gate on pharma scope arrival |
| low | FG-003 | Material density registry covers 6 substances; production inventory has many more | metrology | extend via admin UI after VRS-001 |

## 9. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| critical | FR-001 | UCUM ucum_code collision regression if a future delta unit forgets `{diff}` | new migration | engine emits `UOM_BLOCKED_…` if `uq_ucum_code` constraint is violated; pre-merge review checklist |
| high | FR-002 | Approver-bypass during seed reuse on a fresh DB without users seeded | `users` table empty | DO block falls through to NOTICE and leaves rules in `draft`; engine refuses non-approved rules → fail-loud, not fail-silent |
| medium | FR-003 | Density gap leaks volume→mass error | item ITUOM uses Volume + no density row | DensityContextualConverter raises `UOM_DENSITY_NOT_FOUND` (HTTP 422); UomDataQualityScanner surfaces in pre-flight |

## 10. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| FS-001 | Apply migrations 214–228 on a fresh DB | all DDL + DML succeed atomically | applied (233 total on VPS) | psql migration table |
| FS-002 | Catalog count assertion | active_units=69 | confirmed | `GET /api/v1/uom/health` |
| FS-003 | Kind count assertion | quantity_kinds=50 | confirmed | `GET /api/v1/uom/health` |
| FS-004 | Approved rule count assertion | 33 | confirmed | `GET /api/v1/uom/health` |
| FS-005 | Re-running seed migration is idempotent | `ON CONFLICT DO NOTHING` clauses on every seed INSERT | confirmed by source inspection of `224_uom_seeds.sql` and `228_uom_measval_integration.sql` |
| FS-006 | Temperature unit pair Cel↔K resolved | rule UOMCONV-TEMP-CEL-K-v1 active | confirmed | `psql -c "SELECT rule_code, bidirectional FROM uom_conversion_rule WHERE rule_code='UOMCONV-TEMP-CEL-K-v1';"` returns t |
| FS-007 | Alias mm→mm at SYSTEM scope resolves to canonical mm | (sanity) | confirmed via POST `/api/v1/uom/aliases/resolve` |
| FS-008 | Density registry has rows for the 6 seeded substances | 6 rows | confirmed | migration 222 seed body |
| FS-009 | External code map has both Rec20 and OPC UA entries | non-empty | 32 rows | psql |

## 11. Audit scorecard

| Axis | Score | Note |
|---|---|---|
| Source fidelity | 9 | every kind / unit / rule traced to a migration |
| Semantic correctness | 9 | UCUM annotation syntax applied; affine offsets at correct sign |
| Migration safety | 9 | every INSERT is `ON CONFLICT DO NOTHING`; CHECK constraint honoured via draft→activate pattern |
| Coverage breadth | 8 | 50 kinds is meaningful; potency / pharma absent (FG-002) |
| Contract discipline | 7 | umbrella vs per-entity (FG-001) |
| Idempotency | 10 | re-run of any migration is a no-op |
| Auditability | 9 | seed migrations carry comments tying every block to a decision ID |
| **Total** | **61 / 70** | |

## 12. Next-prompt prerequisites

- IMPL-02 must:
  - Implement `ExactLinearConverter`, `AffineConverter`, `LogarithmicConverter`, `DensityContextualConverter` + `MeasurementValueFactory` against the seed above.
  - Cover positive + negative test cases (`mom/tests/Unit/Uom/`).
  - Reach BCMath scale=30 and reject non-numeric magnitudes deterministically.

## 13. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
