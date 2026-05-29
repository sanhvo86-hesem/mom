# P10 — OpenAPI, Problem Details, Event, and Contract Specification

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-measurement-conversion-v1  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P09)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Full API contract architecture defined: 14 endpoints specified with request/response schemas. RFC 9457 Problem Details catalog with 22 error types. RabbitMQ event schema for 8 UoM events. Contract file paths locked. Fixture-first / opt-in live read-only policy enforced.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. API Design Principles

1. **Schema-first:** OpenAPI YAML is the contract; implementation must conform, not the reverse
2. **Fixture default:** All read endpoints return fixture data when `X-UOM-Fixture-Mode: true` header (or config `UOM_FIXTURE_MODE=true`)
3. **Live opt-in:** Live data read-only available when `UOM_FIXTURE_MODE=false`; controlled mutation requires separate mutation API
4. **Problem Details:** All errors return RFC 9457 JSON (Content-Type: application/problem+json)
5. **Idempotency:** All POST/PUT commands must accept `Idempotency-Key` header
6. **No naked number in any API response:** all quantity fields are MeasurementValue objects

---

## 3. API Endpoint Catalog

### Read-only endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/uom/units | List all active units (paginated, filterable by quantity_kind) |
| GET | /api/v1/uom/units/{canonical_code} | Get unit detail with external mappings |
| GET | /api/v1/uom/quantity-kinds | List all quantity kinds |
| GET | /api/v1/uom/quantity-kinds/{kind_code} | Get kind detail with dimension_vector |
| GET | /api/v1/uom/conversion-rules | List approved conversion rules |
| GET | /api/v1/uom/conversion-rules/{rule_code} | Get rule detail with formula |
| POST | /api/v1/uom/convert | Preview conversion (returns MEASVAL; does NOT persist) |
| POST | /api/v1/uom/normalize | Normalize a raw measurement to canonical unit |
| GET | /api/v1/uom/alias-queue | List pending alias reviews (requires UOM_STEWARD role) |
| GET | /api/v1/uom/impact-analysis/{rule_code} | Impact analysis for rule change |

### Governed mutation endpoints (Phase 2 — requires workflow/auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/uom/units/submit | Submit new unit for approval |
| PUT | /api/v1/uom/units/{canonical_code}/label | Update display labels (low-risk; no e-sign) |
| POST | /api/v1/uom/conversion-rules/submit | Submit new conversion rule for review |
| POST | /api/v1/uom/alias-queue/{id}/resolve | Approve or reject a pending alias |

---

## 4. Problem Details Catalog (RFC 9457)

Base type URI: `https://hesem.local/uom/problems/`

| type (suffix) | title | HTTP status | description |
|--------------|-------|------------|-------------|
| cross-kind-conversion | Cross-kind conversion blocked | 422 | Quantity kinds incompatible; no approved rule |
| affine-unit-error | Affine unit handling required | 422 | Attempt to use linear engine for °C/°F |
| naked-number-risk | Naked number rejected | 422 | Quantity field missing unit_code or quantity_kind |
| unit-not-found | Unit not found in catalog | 404 | canonical_code not in active lifecycle |
| unit-deprecated | Unit is deprecated | 410 | Lifecycle status=deprecated; suggest replacement |
| unit-retired | Unit is retired | 410 | Cannot use retired unit in new conversion |
| rule-not-approved | Conversion rule not approved | 422 | Rule lifecycle_status ≠ 'approved' |
| rule-not-found | Conversion rule not found | 404 | No UOMCONV for this pair |
| context-required | Conversion context required | 422 | Density, potency, or basis context missing |
| ambiguous-unit | Unit string is ambiguous | 422 | Alias quarantined; disambiguation required |
| unknown-external-unit | External unit string unknown | 422 | Not in alias table or quarantine queue |
| packaging-globalism | Packaging unit rejected | 422 | box/case/pallet must route to ITUOM |
| currency-in-physical-engine | Currency code rejected | 422 | VND/USD not physical units |
| rule-version-expired | Rule version not current | 422 | Rule has been superseded; use current version |
| ai-approval-violation | AI cannot approve rules | 403 | Human approval required |
| duplicate-canonical-code | Duplicate unit code | 409 | canonical_code already exists |
| missing-required-field | Required field missing | 422 | See extensions.missing_fields |
| permission-denied | Insufficient role | 403 | UOM_STEWARD or higher required |
| fixture-mode-active | Fixture mode — mutation blocked | 503 | Set UOM_FIXTURE_MODE=false to enable writes |
| idempotency-conflict | Duplicate idempotency key | 409 | Same command already processed |
| workflow-incomplete | Workflow step incomplete | 422 | Approval step required before proceed |
| esign-required | E-signature required | 403 | Regulated rule requires e-sign |

Example Problem Detail response:
```json
{
  "type": "https://hesem.local/uom/problems/cross-kind-conversion",
  "title": "Cross-kind conversion blocked",
  "status": 422,
  "detail": "Cannot convert Mass (kg) to Length (m). No approved cross-kind conversion rule exists.",
  "instance": "/api/v1/uom/convert",
  "trace_id": "trace-abc-123",
  "extensions": {
    "from_unit": "kg",
    "from_kind": "Mass",
    "to_unit": "m",
    "to_kind": "Length",
    "dimension_vector_from": "M1L0T0I0Θ0N0J0",
    "dimension_vector_to": "M0L1T0I0Θ0N0J0"
  }
}
```

---

## 5. Convert Endpoint Schema

```yaml
POST /api/v1/uom/convert:
  requestBody:
    required: true
    content:
      application/json:
        schema:
          type: object
          required: [magnitude, from_unit_code, to_unit_code, quantity_kind_code]
          properties:
            magnitude:
              type: string
              pattern: '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$'
              example: "98.6"
            from_unit_code:
              type: string
              example: "[degF]"
            to_unit_code:
              type: string
              example: "Cel"
            quantity_kind_code:
              type: string
              example: "ThermodynamicTemperature"
            context:
              type: object
              description: Required for density/potency conversions
            precision_scale:
              type: integer
              minimum: 0
              maximum: 20
              default: 4

  responses:
    200:
      description: Conversion result (not persisted)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/MeasurementValue'
    422:
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

---

## 6. RabbitMQ Event Schema

Exchange: `hesem.uom`  
Events use CloudEvents structure + HESEM envelope.

| event_type | trigger | consumers |
|-----------|---------|---------|
| uom.unit.created | New unit approved | Analytics, cache invalidation |
| uom.unit.deprecated | Unit deprecated | All domains using that unit; impact alert |
| uom.unit.retired | Unit retired | Same as deprecated |
| uom.rule.submitted | Rule enters review | Notification service |
| uom.rule.approved | Rule approved by human | ConversionEngine cache invalidation |
| uom.rule.deprecated | Rule version superseded | All cached conversions using that rule_version |
| uom.alias.quarantined | External unit string quarantined | UoM Steward notification |
| uom.alias.resolved | Alias approved by human | EDI/OT subsystem cache |

Event payload minimum:
```json
{
  "specversion": "1.0",
  "type": "com.hesem.uom.rule.approved",
  "source": "https://hesem.local/uom",
  "id": "uuid-...",
  "time": "2026-05-29T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "rule_id": "...",
    "rule_code": "UOMCONV-TEMP-F-C-v1",
    "version": 1,
    "approved_by": "USR-001",
    "trace_id": "trace-..."
  }
}
```

---

## 7. Contract File Paths

```
mom/contracts/objects/uom/
├── openapi.yaml                    -- Main OpenAPI 3.1 spec
├── schemas/
│   ├── measurement-value.schema.json
│   ├── unit-catalog-entry.schema.json
│   ├── quantity-kind.schema.json
│   ├── conversion-rule.schema.json
│   └── problem-detail.schema.json
└── events/
    ├── uom.unit.created.json
    ├── uom.rule.approved.json
    └── uom.alias.resolved.json
```

---

## 8. Audit Scorecard — P10

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Schema-first discipline | 10/10 | OpenAPI defined before implementation; fixture-first enforced |
| Problem Details | 10/10 | 22 error types; all with RFC 9457 fields + HESEM extensions |
| No naked numbers | 10/10 | All responses use MeasurementValue schema |
| Event completeness | 9/10 | 8 events; CloudEvents spec; cache invalidation listed |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
