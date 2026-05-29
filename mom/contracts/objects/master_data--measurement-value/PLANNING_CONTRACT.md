# Planning-only contract — `master_data--measurement-value`

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P06 / artifact 2 of 3 |
| Posture | **planning only** — do not promote to a runtime contract unless an integration gate explicitly authorises mutation acceptance for MEASVAL writes |
| Date sealed | 2026-05-29 |

## 1. Scope sketch

`MeasurementValue` (MEASVAL) is the immutable evidence envelope produced by every successful UoM conversion and persisted as JSONB on the source row plus a row in `uom_measurement_thread`. This planning contract captures the proposed JSON Schema, the storage location, and the consumer-facing API surface; it is **not** an authoritative runtime contract.

## 2. Storage targets

| Where | Column |
|---|---|
| `inspection_results.measval_envelope` | JSONB NULLABLE |
| `mes_inline_measurements.measval_envelope` | JSONB NULLABLE |
| `uom_measurement_thread` | dedicated table with audit_hash linkage |
| (future) `lab_test_results.measval_envelope` | reserved |
| (future) `quote_lines.measval_envelope` | reserved (subject to currency-block scope) |

## 3. Proposed JSON Schema (sketch — see also `mom/docs/architecture/.../measurement-value-contract.md` for the canonical narrative)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "HESEM Measurement Value Envelope (MEASVAL)",
  "type": "object",
  "additionalProperties": false,
  "required": ["input", "normalization", "display", "evidence", "precision_envelope", "semantic_context", "digital_thread", "ai_flags"],
  "properties": {
    "input":            { "$ref": "#/definitions/InputBlock" },
    "normalization":    { "$ref": "#/definitions/NormBlock" },
    "display":          { "$ref": "#/definitions/DisplayBlock" },
    "evidence":         { "$ref": "#/definitions/EvidenceBlock" },
    "precision_envelope": { "$ref": "#/definitions/PrecisionBlock" },
    "semantic_context": { "$ref": "#/definitions/ContextBlock" },
    "digital_thread":   { "$ref": "#/definitions/ThreadBlock" },
    "ai_flags":         { "type": "array", "items": { "type": "string" } }
  },
  "definitions": {
    "InputBlock": {
      "type": "object",
      "required": ["magnitude", "unit_code", "kind_code"],
      "properties": {
        "magnitude": { "type": "string", "pattern": "^-?\\d+(\\.\\d+)?(e-?\\d+)?$" },
        "unit_code": { "type": "string", "minLength": 1, "maxLength": 64 },
        "kind_code": { "type": "string", "minLength": 1, "maxLength": 50 }
      }
    },
    "NormBlock": {
      "type": "object",
      "required": ["si_value", "si_unit"],
      "properties": {
        "si_value": { "type": "string", "pattern": "^-?\\d+(\\.\\d+)?$" },
        "si_unit":  { "type": "string", "minLength": 1, "maxLength": 30 }
      }
    },
    "DisplayBlock": {
      "type": "object",
      "required": ["magnitude", "unit_code"],
      "properties": {
        "magnitude": { "type": "string" },
        "unit_code": { "type": "string" }
      }
    },
    "EvidenceBlock": {
      "type": "object",
      "required": ["category", "rule_code", "rule_version", "factor", "offset_value", "reversed"],
      "properties": {
        "category":     { "enum": ["exact_linear", "defined_linear", "affine", "logarithmic", "density_contextual"] },
        "rule_code":    { "type": "string", "minLength": 1, "maxLength": 80 },
        "rule_version": { "type": "integer", "minimum": 1 },
        "factor":       { "type": "string" },
        "offset_value": { "type": ["string", "null"] },
        "reversed":     { "type": "boolean" },
        "via_si_hop":   { "type": "boolean" },
        "policy_fallback": { "type": "boolean" },
        "density_kg_m3": { "type": ["string", "null"] },
        "density_source": { "type": ["string", "null"] },
        "substance_code": { "type": ["string", "null"] }
      }
    },
    "PrecisionBlock": {
      "type": "object",
      "required": ["bcmath_scale", "display_scale", "rounding_policy"],
      "properties": {
        "bcmath_scale":    { "const": 30 },
        "display_scale":   { "type": "integer", "minimum": 0, "maximum": 30 },
        "rounding_policy": { "enum": ["ROUND_HALF_EVEN", "ROUND_HALF_UP", "ROUND_DOWN_TRUNCATE", "ROUND_UP_CEILING", "ROUND_NONE"] },
        "uncertainty":     { "type": ["object", "null"] }
      }
    },
    "ContextBlock": {
      "type": "object",
      "required": ["domain", "quantity_kind"],
      "properties": {
        "domain":          { "enum": ["QC", "SPC", "MES", "LIMS", "UI", "ITUOM", "EDI", "OT", "BATCH"] },
        "quantity_kind":   { "type": "string" },
        "item_id":         { "type": ["string", "null"] },
        "from_risk_level": { "enum": ["low", "medium", "high"] },
        "to_risk_level":   { "enum": ["low", "medium", "high"] }
      }
    },
    "ThreadBlock": {
      "type": "object",
      "required": ["audit_hash", "hash_algorithm", "recorded_at"],
      "properties": {
        "actor_id":       { "type": ["string", "null"], "format": "uuid" },
        "audit_hash":     { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "hash_algorithm": { "const": "SHA256" },
        "recorded_at":    { "type": "string", "format": "date-time" },
        "request_id":     { "type": ["string", "null"] },
        "trace_id":       { "type": ["string", "null"] }
      }
    }
  }
}
```

## 4. Promotion criteria

Promote this planning contract to a runtime contract (`contract.json` under the same folder) only after **all** of:

1. IMPL-07 readiness gate crossed.
2. VRS-001 validation pack passed including the seven MEASVAL invariants.
3. PSR-4 exception split (G-001) closed so the negative-test pack passes.
4. OpenAPI block (OG-001) committed.
5. Consumer wiring in at least one of QC / MES / LIMS landed.
6. A separate production-cutover gate explicitly authorises mutation acceptance.

## 5. Non-goals

- This planning contract is **not** an authoritative source for migration generation.
- It does **not** declare a runtime endpoint contract; OpenAPI does.
- It does **not** authorise removing the pre-production banner from the Control Center.

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | CR-001 | uncertainty block schema marked optional; populated only when metrology supplies | metrology supply |
| medium | CR-002 | `evidence.via_si_hop`, `policy_fallback` not present in some earlier sketches; aligned here | docs sync |
| low | CR-003 | `request_id` / `trace_id` formats not yet constrained beyond string | adopt W3C Trace Context spec later |

## 7. Final token

`UOM_IMPLEMENTATION_GATE_NOT_OPEN_PLANNING_ONLY`
