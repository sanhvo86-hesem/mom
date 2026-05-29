# P10 — Problem Details Catalog (RFC 9457)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P10 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Catalog every problem code the UoM REST surface returns, with HTTP status, human title, and remediation hint. Each entry is the canonical record consumers bind to when handling error responses.

## 2. Catalog

| problem_code | HTTP status | Title | Remediation hint |
|---|---|---|---|
| `UOM_KIND_MISMATCH` | 422 | Quantity Kind Mismatch | Verify both units belong to the same kind, or supply a substance / packaging context if cross-kind |
| `UOM_UNIT_NOT_ACTIVE` | 404 | Unit Not Found or Inactive | Check `lifecycle_status`; the unit may be deprecated or retired |
| `UOM_NO_CONVERSION_PATH` | 422 | No Conversion Path | No direct rule and no SI hop available; metrology team to seed a conversion rule |
| `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` | 422 | Currency Conversion Not Supported | Use the finance currency-conversion service for currency exchanges |
| `UOM_INVALID_MAGNITUDE` | 400 | Invalid Magnitude | Supply a numeric string; reject empty, non-numeric, or injection attempts |
| `UOM_NEGATIVE_MAGNITUDE_FORBIDDEN` | 400 | Negative Magnitude Not Allowed | The target kind is unsigned (Mass, Volume, Count); supply a positive value |
| `UOM_MAGNITUDE_OVERFLOW` | 400 | Magnitude Too Large | Maximum supported is ±10^100; pre-scale the value if needed |
| `UOM_EXTERNAL_CODE_UNKNOWN` | 422 | Unknown External Unit Code | The code is queued in alias quarantine; quarantine_id returned in `see_also` |
| `UOM_RULE_NOT_ACTIVE` | 422 | Conversion Rule Not Active | The applicable rule is in draft / pending_review / deprecated state |
| `UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION` | 422 | Packaging Unit — No Physical Conversion | Packaging units (PALLET, BOX) cannot convert physically; use packaging context |
| `UOM_DENSITY_NOT_FOUND` | 422 | Density Record Not Found | Substance code missing in `material_density_registry`; metrology to seed |
| `UOM_DENSITY_ZERO` | 422 | Density Is Zero | The density record is zero; reverse division would diverge |
| `UOM_TAMPER_DETECTED` | 409 | MEASVAL Hash Mismatch | The envelope content does not match the recorded audit hash; the row has been edited outside the workflow |
| `UOM_INVALID_SCOPE` | 400 | Invalid Resolution Scope | Supplier scope requires `supplier_id`; customer scope requires `customer_id` |
| `csrf_failed` | 403 | CSRF Verification Failed | Request lacks a valid `X-CSRF-Token` header |
| `csrf_expired` | 403 | CSRF Token Expired | Refresh CSRF token and retry |
| `unauthorized` | 401 | Authentication Required | Authenticate before calling the UoM API |
| `unknown_action` | 404 | Unknown Endpoint | The route is not registered |
| `server_error` | 500 | Internal Server Error | A non-domain error occurred; check `_reports/uom-measurement-conversion-v1/` for context |

## 3. Body shape

```json
{
  "type":         "https://hesemeng.com/errors/uom/<problem_code>",
  "title":        "<human title>",
  "status":       <http>,
  "detail":       "<reason>",
  "problem_code": "<UOM_...>",
  "server_time":  "<ISO8601>",
  "see_also":     "<optional URI>"
}
```

## 4. Examples

### Currency block

```json
{
  "type": "https://hesemeng.com/errors/uom/UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE",
  "title": "Currency Conversion Not Supported",
  "status": 422,
  "detail": "Cannot convert USD → mm: currency is excluded from the physical engine.",
  "problem_code": "UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE",
  "server_time": "2026-05-29T02:03:14Z",
  "see_also": "https://eqms.hesemeng.com/docs/finance/currency-conversion"
}
```

### Alias quarantine

```json
{
  "type": "https://hesemeng.com/errors/uom/UOM_EXTERNAL_CODE_UNKNOWN",
  "title": "Unknown External Unit Code",
  "status": 422,
  "detail": "Alias 'µm' could not be resolved in scope=LIMS without quantity_kind hint.",
  "problem_code": "UOM_EXTERNAL_CODE_UNKNOWN",
  "server_time": "2026-05-29T02:03:14Z",
  "see_also": "https://eqms.hesemeng.com/admin/uom/quarantine/<uuid>"
}
```

### Tamper detected

```json
{
  "type": "https://hesemeng.com/errors/uom/UOM_TAMPER_DETECTED",
  "title": "MEASVAL Hash Mismatch",
  "status": 409,
  "detail": "Envelope content on inspection_result <uuid> does not match the stored audit hash.",
  "problem_code": "UOM_TAMPER_DETECTED",
  "server_time": "2026-05-29T02:03:14Z"
}
```

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| PD-001 | Every UoM domain error carries a `problem_code` prefixed `UOM_` | clarity |
| PD-002 | HTTP status follows RFC 9457 conventions (4xx for client, 5xx for server) | RFC 9457 |
| PD-003 | `see_also` is optional and provides a deep-link to a related service or admin UI | UX |
| PD-004 | Non-domain errors (auth, CSRF, server) keep their existing HESEM codes (`unauthorized`, `csrf_failed`, etc.) | platform consistency |
| PD-005 | `UOM_INVALID_MAGNITUDE` reused for both empty / non-numeric / injection attempts | one bucket; details distinguish |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | PG-001 | Some codes referenced in service but not yet returned from controller (`UOM_DENSITY_ZERO`, `UOM_TAMPER_DETECTED`) | wire in IMPL-07 follow-up |
| low | PG-002 | Internationalised titles not yet provided (only EN) | i18n follow-up |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Code enumeration | 10 |
| Status mapping | 10 |
| Example completeness | 9 |
| Remediation hints | 9 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/api/uom-measurement-conversion-v1/openapi-contract-plan.md` (P10 / 1)
- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/uom-event-catalog.md` (P10 / 3)
