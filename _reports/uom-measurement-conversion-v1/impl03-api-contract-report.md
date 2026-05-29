# IMPL-03 — Read-only API Preview and Normalise: Contract Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-03 |
| Date | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` |

## 1. Scope

Expose the conversion engine, catalog, and alias resolver through versioned REST endpoints under `/api/v1/uom/`. Every error path conforms to RFC 9457 Problem Details. Every endpoint requires authentication; POST endpoints additionally require a valid `X-CSRF-Token` per HESEM `CsrfMiddleware`.

## 2. Source inheritance

| Source | Path | Used for |
|---|---|---|
| Planning | `docs/ai-prompts/uom-measurement-conversion-v1/10-openapi-problem-details-event-contract.md` | endpoint shape, problem-code registry |
| HESEM middleware | `mom/api/middleware/{CorsMiddleware,ApiKeyMiddleware,AuthMiddleware,RateLimitMiddleware,AuditMiddleware,CsrfMiddleware}.php` | the pipeline UoM routes plug into |
| HESEM `Router.php` | `mom/api/Router.php` | route registration API |
| `mom/api/index.php` | bootstrap | route-file include list (line 326) |

## 3. Endpoints delivered

| Method | Path | Controller method | Auth | CSRF | Verified live |
|---|---|---|---|---|---|
| GET | `/api/v1/uom/health` | `UomController::health` | yes | n/a | ✓ |
| GET | `/api/v1/uom/units` | `UomController::listUnits` | yes | n/a | ✓ |
| GET | `/api/v1/uom/units/{code}` | `UomController::getUnit` | yes | n/a | ✓ |
| GET | `/api/v1/uom/kinds` | `UomController::listKinds` | yes | n/a | ✓ |
| GET | `/api/v1/uom/rules` | `UomController::listRules` | yes | n/a | ✓ |
| POST | `/api/v1/uom/convert` | `UomController::convert` | yes | yes | ✓ |
| POST | `/api/v1/uom/aliases/resolve` | `UomController::resolveAlias` | yes | yes | ✓ |
| GET | `/api/v1/uom/external-map/{system}/{code}` | `UomController::resolveExternalCode` | yes | n/a | ✓ |
| GET | `/api/v1/uom/item-policy/{item_id}` | `UomController::getItemPolicy` | yes | n/a | ✓ |
| GET | `/api/v1/uom/item-packaging/{item_id}` | `UomController::getItemPackaging` | yes | n/a | ✓ |

## 4. Files delivered

| File | Purpose |
|---|---|
| `mom/api/controllers/UomController.php` | request → engine → response orchestration; problem-details builder |
| `mom/api/routes/uom-routes.php` | route registration table |
| `mom/api/index.php` (one-line edit) | route-file include at line 326 |

`UomCatalogService.php` (per the IMPL-03 prompt's `Required output files` block) was renamed to `UnitCatalogService.php` at IMPL-02 to align with the prevailing HESEM noun (`UnitCatalogService` ≈ `WorkCenterCatalogService`). The semantic is identical; mapping noted in OD-005 below.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| OD-005 | Catalog service named `UnitCatalogService` (not `UomCatalogService`) for HESEM naming alignment | analogous services pattern |
| OD-006 | Every error path returns RFC 9457 Problem Details with `type`, `title`, `status`, `detail`, `problem_code` | API contract planning prompt P10 |
| OD-007 | POST `/convert` accepts `magnitude` as **string** (preserves BCMath precision); rejects numeric / null | UD-001 |
| OD-008 | `MEASVAL` envelope is included in convert response under `measval` key, never the bare `result` only | UD-003 |
| OD-009 | Alias resolution endpoint is POST (not GET) to allow opaque scope payloads | P10 |
| OD-010 | No mutation endpoints in v1 — all mutations gated by IMPL-07 workflow service | UD-013 |

## 6. Response envelope conventions

Success (HTTP 200):

```json
{
  "ok": true,
  "result": "<computed>",
  "from_unit": "<canonical>",
  "to_unit":   "<canonical>",
  "measval":   { ... },
  "server_time": "<ISO8601>"
}
```

Error (HTTP ≥ 4xx):

```json
{
  "type":   "https://hesemeng.com/errors/uom/<code>",
  "title":  "<human>",
  "status": <code>,
  "detail": "<reason>",
  "problem_code": "UOM_<...>",
  "server_time": "<ISO8601>"
}
```

## 7. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| high | OG-001 | `mom/api/openapi.yaml` does not yet contain `/api/v1/uom/*` paths or component schemas | API contracts | append OpenAPI block; gate before VRS-001 |
| medium | OG-002 | No `mom/tests/Feature/UomApiTest.php` contract test class | platform | add feature test layer that exercises router + middleware on a fresh DB; follow-up commit |
| low | OG-003 | `getItemPackaging` returns the packaging policy if present but does not yet attach `policy_chain` showing the 8-level resolution trail | ITUOM | enrich response in IMPL-05 follow-up |

## 8. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| high | OR-001 | CSRF token expiry mid-session causes a long-running tab to fail conversions silently | session > 1h | client uses `_syncCsrf()` + `refreshCsrfForRetry()` helpers; both exist in portal boot |
| medium | OR-002 | Rate-limit middleware throttles a legitimate bulk-conversion caller | scripted batch | document the limit; expose batch endpoint in future slice |
| medium | OR-003 | `GET /api/v1/uom/units` paginated default of 50 may hide low-traffic units in admin UI | admin views | UI uses `?limit=200` explicit |

## 9. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| AS-001 | Anonymous GET /health | 401 `unauthorized` | confirmed | `curl https://eqms.hesemeng.com/api/v1/uom/health` |
| AS-002 | Authenticated GET /health | 200 + catalog block | confirmed | live portal fetch |
| AS-003 | Authenticated POST /convert without CSRF | 403 `csrf_failed` | confirmed | initial portal probe |
| AS-004 | Authenticated POST /convert with fresh CSRF, 1000mm→m | 200 + result=`1.000000` | confirmed | live portal fetch |
| AS-005 | Authenticated POST /convert with mismatched kinds (kg→m) | 422 `UOM_KIND_MISMATCH` | confirmed | error-path probe |
| AS-006 | Authenticated POST /convert with currency | 422 `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` | confirmed | error-path probe |
| AS-007 | Authenticated POST /aliases/resolve, alias=`Ra` | 200 + canonical=`RA_UM` | confirmed | live portal fetch |
| AS-008 | Authenticated GET /units/{code} for retired unit | 404 `UOM_UNIT_NOT_ACTIVE` | confirmed | catalog probe |
| AS-009 | Authenticated GET /external-map/UNECE_Rec20/MMT | 200 + canonical mapping | confirmed | external-code probe |
| AS-010 | Authenticated GET /item-policy/{unknown} | 404 `policy_not_found` | confirmed | ITUOM probe |

## 10. Audit scorecard

| Axis | Score | Note |
|---|---|---|
| Endpoint completeness | 10 | 10 endpoints cover catalog + convert + alias + external + ITUOM |
| Auth + CSRF discipline | 10 | every method calls `requireAuth`; POST methods enforce `X-CSRF-Token` |
| RFC 9457 conformance | 9 | every error path returns a problem-details body |
| OpenAPI publication | 4 | text spec exists at `docs/ai-prompts/.../10-openapi-…md`; not yet in `mom/api/openapi.yaml` (OG-001) |
| Live verification | 10 | every endpoint confirmed against eqms.hesemeng.com |
| Test class coverage | 5 | no Feature test class yet (OG-002) |
| **Total** | **48 / 60** | |

## 11. Next-prompt prerequisites

- IMPL-04 must:
  - Build the admin UI Control Center that reads from these endpoints and writes nothing.
  - Reuse `GraphicsAuthority.tokens.read()` for every visual parameter.
  - QuantityInputWidget consumes POST `/convert` for the live preview.

## 12. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT` — OG-001 and OG-002 carried to the VRS-001 gate.
