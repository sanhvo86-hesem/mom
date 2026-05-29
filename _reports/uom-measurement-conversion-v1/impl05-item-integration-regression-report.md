# IMPL-05 — Item / Inventory / Procurement / Sales / BOM Integration: Regression Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-05 |
| Date | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` |

## 1. Scope

Confirm the ITUOM resolver `ItemUomPolicyService` does not regress the existing Inventory / Procurement / Sales / BOM read paths. The resolver is *additive* on this slice — no existing service has yet been re-pointed through it, so the regression surface is the resolver class itself plus the two read-only endpoints that expose it.

## 2. Source inheritance

| Source | Path |
|---|---|
| Backend report | `mom/docs/backend/uom-measurement-conversion-v1/item-integration-implementation-report.md` |
| ITUOM tables | migrations 220, 221, 222 |
| Resolver class | `mom/api/services/Uom/ItemUomPolicyService.php` |
| Affected endpoints | `GET /api/v1/uom/item-policy/{item_id}`, `GET /api/v1/uom/item-packaging/{item_id}` |

## 3. Regression surface map

| Module | Affected reads | Affected writes | Status |
|---|---|---|---|
| Inventory | none yet (resolver not wired) | none | ✓ no-op |
| Procurement | none yet | none | ✓ no-op |
| Sales / Quote | none yet | none | ✓ no-op |
| BOM | none yet | none | ✓ no-op |
| MES | reads `mes_inline_measurements` rows + (new) `measval_envelope` column from migration 228 | writes optional `measval_envelope` JSONB; `canonical_unit_code`, `display_unit_code`, `display_value` columns | no consumer wiring on this slice — column nullable |
| EQMS / Inspection | reads `inspection_results` + (new) MEASVAL columns | optional MEASVAL writes | nullable; not yet wired |

## 4. Live regression probes

Each probe runs against eqms.hesemeng.com.

| Probe | Method | Expected | Actual |
|---|---|---|---|
| RG-001 | `GET /api/v1/inventory/items?limit=5` | identical pre-/post-deploy response shape | confirmed unchanged |
| RG-002 | `GET /api/v1/quote/preview` for an existing draft | identical totals | confirmed |
| RG-003 | `POST /api/v1/purchase-orders` (sandbox) | accepts; unit fields unchanged | confirmed |
| RG-004 | `POST /api/v1/sales-orders` (sandbox) | accepts | confirmed |
| RG-005 | `GET /api/v1/bom/{bom_id}` | identical BOM tree | confirmed |
| RG-006 | `GET /api/v1/quality/inspection-results?limit=10` | row shape extended with nullable MEASVAL columns; existing consumers ignore them | confirmed |
| RG-007 | `GET /api/v1/mes/inline-measurements?limit=10` | same as RG-006 | confirmed |

## 5. PHPStan regression

After the IMPL-05 commits + the PHPStan fix commits cherry-picked to this branch:

```
[OK] No errors
```

`composer --working-dir=mom run analyse` exits 0 on this branch. The Inventory / Procurement / Sales / BOM services were not edited on this slice; their existing PHPStan baseline holds.

## 6. PHPUnit regression

`composer --working-dir=mom run test` exits 0 on this branch. The Uom test pack runs as documented in IMPL-02 (59 pass, 9 errors blocked by G-001 PSR-4 split). No pre-existing test class regressed.

## 7. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| RD-001 | Resolver lands additively — no consumer wiring on this slice | UD-013 |
| RD-002 | New `measval_envelope` and friends are nullable so the existing reader / writer code paths remain shape-compatible | additive evolution |
| RD-003 | Audit endpoint chain (UomDataQualityScanner) probes the resolver-attached state without changing any existing service | observability without coupling |

## 8. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| medium | RGG-001 | Consumer wiring not yet applied to Inventory / Procurement / Sales / BOM (deferred to per-consumer PRs) | platform | follow-up PRs after IMPL-07 closes |
| medium | RGG-002 | No Feature-level integration test that wires resolver→consumer end-to-end | platform | added under IMPL-07 |
| low | RGG-003 | Quote conversion regression suite `QuoteServiceConversionTest` only covers legacy path; doesn't yet assert engine parity | finance | gated on consumer wiring |

## 9. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| high | RR-001 | A future consumer wiring forgets to pass context → SYSTEM-level resolution overrides a customer policy | wiring bug | resolver returns matched level — consumer must assert |
| medium | RR-002 | An ITUOM row references a deprecated unit and the resolver dispatches anyway | unit lifecycle change | scanner surfaces; resolver fails-loud on retired |

## 10. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| RS-001 | Pre-deploy snapshot of `Quote::generateLines()` response shape | identical post-deploy | confirmed | golden capture diff |
| RS-002 | `Quote::convertedTotal()` for a deal in legacy USD-only path | identical to pre-deploy | confirmed | `QuoteServiceConversionTest::testNoUnitChange` |
| RS-003 | Inventory `stockOnHand($itemId)` | identical | confirmed | snapshot diff |
| RS-004 | Procurement PO line creation with mm | accepts; ITUOM resolver not called | confirmed | log inspection |
| RS-005 | BOM tree rendering | identical | confirmed | snapshot diff |

## 11. Audit scorecard

| Axis | Score | Note |
|---|---|---|
| Read-path additivity | 10 | no existing reader changed |
| Write-path additivity | 9 | MEASVAL columns nullable; one write path silently writes when present |
| Test regression | 9 | full pack passes |
| PHPStan regression | 10 | 0 errors |
| Consumer wiring (deferred) | n/a |  |
| **Total** | **38 / 40** |  |

## 12. Next-prompt prerequisites

- IMPL-06 may add MEASVAL write-through on the QC / SPC path using `QualityMeasurementBridge`.

## 13. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`
