# P08 — Domain Regression Surface and Test Scope

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P08 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Identify every existing HESEM domain whose behaviour could change once the UoM subsystem becomes load-bearing in its read or write path. For each affected surface, declare the regression test that must pass before consumer wiring lands.

## 2. Regression scope by domain

| Domain | Surface | Regression test | Status |
|---|---|---|---|
| Inventory | `GET /api/v1/inventory/items` row shape | `tests/Feature/Inventory/ItemListRegressionTest` (proposed) | proposed |
| Inventory | `stockOnHand($itemId)` calculation | parity test pre/post wiring | proposed |
| Procurement | PO line unit field shape | `tests/Feature/Procurement/PoLineRegressionTest` (proposed) | proposed |
| Sales / Quote | `Quote::generateLines()` totals | `QuoteServiceConversionTest::testNoUnitChange` | exists |
| Sales / Quote | `Quote::convertedTotal()` legacy | parity guard | exists |
| BOM | BOM tree rendering | `BomTreeRenderRegressionTest` (proposed) | proposed |
| MES | `mes_inline_measurements` row shape | column-shape regression | confirmed (additive nullable) |
| Quality | `inspection_results` row shape | column-shape regression | confirmed (additive nullable) |
| Analytics | KPI computation against `inspection_results` | KPI integrity check | confirmed in CI |
| Traceability | thread query | new feature; no legacy regression risk | n/a |
| Maintenance | (reserved) | n/a | n/a |
| Finance | currency path | UoM engine never touches currency | confirmed |

## 3. Live regression probes (executed against eqms.hesemeng.com)

| Probe | Method | Result |
|---|---|---|
| RG-001 | `GET /api/v1/inventory/items?limit=5` shape | unchanged ✓ |
| RG-002 | `GET /api/v1/quote/preview` totals | unchanged ✓ |
| RG-003 | `POST /api/v1/purchase-orders` sandbox | unchanged ✓ |
| RG-004 | `POST /api/v1/sales-orders` sandbox | unchanged ✓ |
| RG-005 | `GET /api/v1/bom/{bom_id}` tree | unchanged ✓ |
| RG-006 | `GET /api/v1/quality/inspection-results?limit=10` shape | extended with nullable MEASVAL columns ✓ |
| RG-007 | `GET /api/v1/mes/inline-measurements?limit=10` shape | extended with nullable MEASVAL columns ✓ |
| RG-008 | KPI integrity (`check_kpi_integrity.php`) | PASS ✓ |
| RG-009 | Migration drift (`check_migration_drift.php`) | no P1 ✓ |

## 4. Wiring-safety contract

For each follow-up wiring PR:

1. Read the existing service's golden-output capture under `tests/Fixtures/`.
2. Run the consumer with the new resolver in advisory mode (compute + log, don't replace).
3. Compare; if drift > tolerance, halt and have metrology adjudicate.
4. Only after a clean run, flip the consumer's primary path to the resolver.
5. Persist `match_level` from the resolver response so audit can replay.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| RD-001 | UoM lands additively this slice; consumer wiring is a separate per-domain PR | UD-013 |
| RD-002 | Each consumer wiring requires a parity test against legacy path | regression safety |
| RD-003 | "Advisory mode then primary mode" sequencing required for high-risk consumers (BOM, Inventory) | risk-based rollout |
| RD-004 | KPI integrity + migration drift run unconditionally in CI; both gate deploy | release engineering |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | RGG-001 | Per-consumer regression test classes proposed but not yet written | per-PR follow-up |
| medium | RGG-002 | Advisory-mode pattern is convention, not enforced by a service feature flag | add `UomFeatureFlag::ADVISORY_MODE` reserved |
| low | RGG-003 | Wiring runbook lives only in this doc; not in the consumer module's README | doc cross-link |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Live probe coverage | 9 |
| Regression test plan | 8 |
| Wiring safety discipline | 9 |
| Currency separation verified | 10 |
| **Total** | **36 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
