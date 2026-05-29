# P10 — OpenAPI Contract Plan (UoM v1)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P10 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the OpenAPI 3.1 contract for the `/api/v1/uom/*` REST surface so external consumers (admin UI, QC inspection, MES bridge, future SDKs) bind against a stable, versioned schema.

## 2. Paths

| Path | Method | Operation ID | Summary |
|---|---|---|---|
| `/api/v1/uom/health` | GET | `uomHealth` | Engine version + catalog counts |
| `/api/v1/uom/units` | GET | `uomListUnits` | Paginated list of active units |
| `/api/v1/uom/units/{code}` | GET | `uomGetUnit` | Detailed unit record |
| `/api/v1/uom/kinds` | GET | `uomListKinds` | List quantity kinds |
| `/api/v1/uom/rules` | GET | `uomListRules` | List conversion rules |
| `/api/v1/uom/convert` | POST | `uomConvert` | Convert magnitude between units |
| `/api/v1/uom/aliases/resolve` | POST | `uomResolveAlias` | Resolve alias to canonical |
| `/api/v1/uom/external-map/{system}/{code}` | GET | `uomResolveExternalCode` | Resolve external code |
| `/api/v1/uom/item-policy/{item_id}` | GET | `uomGetItemPolicy` | Get ITUOM resolution |
| `/api/v1/uom/item-packaging/{item_id}` | GET | `uomGetItemPackaging` | Get packaging policy |

## 3. Component schemas

### `UnitRecord`

```yaml
type: object
required: [canonical_code, ucum_code, display_symbol, display_name_en, display_name_vi, quantity_kind_code, lifecycle_status, si_base, is_affine, source_tag, risk_level]
properties:
  canonical_code:    { type: string, maxLength: 30 }
  ucum_code:         { type: string, maxLength: 50 }
  display_symbol:    { type: string, maxLength: 20 }
  display_name_en:   { type: string, maxLength: 200 }
  display_name_vi:   { type: string, maxLength: 200 }
  quantity_kind_code: { type: string, maxLength: 50 }
  si_base:           { type: boolean }
  si_factor:         { type: [string, "null"] }
  si_offset:         { type: [string, "null"] }
  is_affine:         { type: boolean }
  lifecycle_status:  { enum: [draft, active, deprecated, retired] }
  source_tag:        { type: string }
  risk_level:        { enum: [low, medium, high] }
```

### `MeasvalEnvelope` — referenced from convert response

See `mom/docs/architecture/uom-measurement-conversion-v1/measurement-value-contract.md` §2 (full schema mirrored in PLANNING_CONTRACT.md). OpenAPI references the same shape.

### `ProblemDetails` — RFC 9457

```yaml
type: object
required: [type, title, status, problem_code, server_time]
properties:
  type:         { type: string, format: uri, example: "https://hesemeng.com/errors/uom/UOM_KIND_MISMATCH" }
  title:        { type: string, example: "Quantity Kind Mismatch" }
  status:       { type: integer, example: 422 }
  detail:       { type: string, example: "Cannot convert kg to m: different kinds." }
  problem_code: { type: string, example: "UOM_KIND_MISMATCH" }
  server_time:  { type: string, format: date-time }
  see_also:     { type: [string, "null"], format: uri, description: "Optional link to related service (e.g. finance currency engine for currency rejections)" }
```

## 4. Security schemes

| Scheme | Applied to |
|---|---|
| `bearerAuth` (session token in header) | every operation |
| `csrfToken` (`X-CSRF-Token` header) | POST endpoints only |

## 5. Versioning policy

- The URL embeds `/v1/`. Breaking changes require `/v2/`.
- Additive changes (new optional fields, new error codes) ship in `v1` without bumping.
- Deprecation: a `Deprecation` HTTP header on the endpoint announces sunset; `Sunset` header carries the date.
- The OpenAPI spec lives in `mom/api/openapi.yaml`. Pending OG-001, the spec does not yet embed the UoM block.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| OD-001 | RFC 9457 Problem Details for every error response | OD-006 |
| OD-002 | `UnitRecord` mirrors DB column shape exactly | reduce mapping cost |
| OD-003 | `MeasvalEnvelope` schema shared between contract and OpenAPI | single source of truth |
| OD-004 | CSRF token required on POST per HESEM CsrfMiddleware | security |
| OD-005 | Versioning via URL segment; additive evolution allowed within `v1` | clarity |
| OD-006 | `see_also` field optional on every problem-details body | better UX for cross-engine errors |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| high | OG-001 | `/api/v1/uom/*` block not yet in `mom/api/openapi.yaml` | follow-up commit |
| medium | OG-002 | OpenAPI Validator does not yet enforce `MeasvalEnvelope` reference | wire after OG-001 |
| low | OG-003 | `x-internal` annotation on workflow endpoints not yet declared | add during workflow endpoint authoring |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Path enumeration | 10 |
| Schema completeness | 9 |
| Security scheme correctness | 10 |
| Versioning discipline | 9 |
| Spec materialisation | 5 (OG-001 open) |
| **Total** | **43 / 50** |

## 9. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/api/uom-measurement-conversion-v1/problem-details-catalog.md` (P10 / 2)
- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/uom-event-catalog.md` (P10 / 3)
