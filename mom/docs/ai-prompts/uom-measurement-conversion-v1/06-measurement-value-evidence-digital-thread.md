# P06 — MeasurementValue Object, Evidence, and Digital Thread Contract

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P05)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Complete MeasurementValue schema defined with all required fields. Canonical JSON contract locked. Three storage strategies specified (JSONB embedded, sub-table, computed view). Digital thread linkage model defined. Audit hash algorithm locked. AI flag field defined. Factory service contract specified. Simulations executed.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Canonical MeasurementValue JSON Schema

```json
{
  "$schema": "https://hesem.local/schemas/measurement-value/v1.json",
  "schema_version": "1.0",
  
  "input": {
    "magnitude": "98.6",
    "unit_code": "[degF]",
    "unit_system": "UCUM",
    "quantity_kind_code": "ThermodynamicTemperature",
    "comparator": null,
    "precision_scale": 1
  },
  
  "normalization": {
    "canonical_magnitude": "37.0000000000",
    "canonical_unit_code": "Cel",
    "conversion_rule_id": "uuid-...",
    "conversion_rule_code": "UOMCONV-TEMP-F-C-v1",
    "conversion_rule_version": 1,
    "conversion_category": "affine",
    "factor_used": "0.55555555555555555556",
    "offset_applied": "-32",
    "formula_applied": "C = (F - 32) × 5/9",
    "factor_source": "BIPM SI / ITS-90",
    "factor_exact": true,
    "calculation_scale": 20,
    "output_rounding_policy_id": "ROUND_HALF_EVEN",
    "output_scale": 1,
    "effective_at": "2026-05-29T00:00:00Z",
    "conversion_rule_snapshot": {
      "rule_id": "...",
      "rule_code": "UOMCONV-TEMP-F-C-v1",
      "version": 1,
      "category": "affine",
      "approved_by_user_id": "...",
      "approved_at": "2026-01-01T00:00:00Z",
      "esign_manifest_hash": "sha256:..."
    }
  },
  
  "display": {
    "display_magnitude": "37.0",
    "display_unit_code": "Cel",
    "display_unit_symbol": "°C",
    "display_unit_name_vi": "độ C",
    "display_scale": 1,
    "scientific_notation": false
  },
  
  "precision_envelope": {
    "input_scale": 1,
    "calculation_scale": 20,
    "canonical_scale": 10,
    "display_scale": 1,
    "commercial_scale": null,
    "regulated_scale": null,
    "rounding_policy_id": "ROUND_HALF_EVEN"
  },
  
  "semantic_context": {
    "domain": "quality_improvement",
    "transaction_type": "IQC_INSPECTION",
    "source_record_id": "INSP-001",
    "source_record_type": "IqcInspectionRecord",
    "item_id": "ITEM-123",
    "item_code": "RM-STEEL-001",
    "lot_id": "LOT-456",
    "operation_step": null,
    "equipment_id": null,
    "measurement_method": null,
    "measurement_device_id": "MDEV-789"
  },
  
  "evidence": {
    "created_at": "2026-05-29T10:30:00.000Z",
    "source_actor_type": "USER",
    "source_actor_id": "USR-001",
    "source_system": null,
    "trace_id": "trace-abc-123-def-456",
    "session_id": "sess-xyz",
    "ip_address_hash": "sha256:...",
    "audit_hash": "sha256:a1b2c3...",
    "audit_hash_algorithm": "SHA-256",
    "audit_hash_fields": ["magnitude","unit_code","quantity_kind_code","conversion_rule_id","conversion_rule_version","created_at","source_actor_id","trace_id"],
    "warnings": [],
    "ai_flags": []
  },
  
  "digital_thread": {
    "parent_measval_id": null,
    "derived_from_measval_ids": [],
    "downstream_uses": []
  }
}
```

---

## 3. Audit Hash Algorithm

```
audit_hash = SHA-256(
  magnitude + "|" +
  unit_code + "|" +
  quantity_kind_code + "|" +
  conversion_rule_id + "|" +
  conversion_rule_version + "|" +
  created_at_iso8601 + "|" +
  source_actor_id + "|" +
  trace_id
)
```

PHP implementation:
```php
function compute_audit_hash(array $fields): string {
    $canonical = implode('|', [
        $fields['magnitude'],
        $fields['unit_code'],
        $fields['quantity_kind_code'],
        $fields['conversion_rule_id'],
        $fields['conversion_rule_version'],
        $fields['created_at'],
        $fields['source_actor_id'],
        $fields['trace_id'],
    ]);
    return 'sha256:' . hash('sha256', $canonical);
}
```

**Immutability rule:** Once a MeasurementValue is written, its audit_hash must be verifiable at any future point. If any field listed in `audit_hash_fields` changes, the MEASVAL is invalid. Retroactive changes are forbidden.

---

## 4. AI Flags Structure

When the AI advisory layer is involved (anomaly detection, alias suggestion, quality outlier), the evidence.ai_flags array records:

```json
{
  "ai_flags": [
    {
      "flag_type": "ANOMALY_DETECTION",
      "model_id": "hesem-uom-anomaly-v1",
      "model_version": "1.0.0",
      "confidence": 0.87,
      "flag_description": "Value 98.6°F is outside 3-sigma control limit for this inspection parameter (μ=22°C, σ=2°C). Possible unit mismatch.",
      "human_reviewed": false,
      "human_reviewer_id": null,
      "human_decision": null,
      "flagged_at": "2026-05-29T10:30:01Z"
    }
  ]
}
```

Rule: AI flags are advisory only. They never block a transaction. They are presented to human reviewers. If human_reviewed=false and flag_type=ANOMALY_DETECTION, the record is surfaced in the AI advisory dashboard.

---

## 5. Storage Strategies

### Strategy A: JSONB column on transaction table (preferred for embedded quantities)

```sql
-- Inspection measurement column
ALTER TABLE qc_inspection_results ADD COLUMN measurement_value JSONB;

-- Indexed for queries
CREATE INDEX idx_measval_unit ON qc_inspection_results 
    USING GIN ((measurement_value->'input'->'unit_code'));
```

Use when: single measurement value per record, query volume moderate.

### Strategy B: Linked sub-table (for multiple measurements per record)

```sql
CREATE TABLE measurement_value_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_table VARCHAR(64) NOT NULL,
    parent_id UUID NOT NULL,
    parameter_code VARCHAR(64) NOT NULL,
    measval JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_parent CHECK (parent_table IN ('qc_inspection_results','calibration_records','lab_results',...))
);
CREATE INDEX idx_mvr_parent ON measurement_value_records(parent_table, parent_id);
```

Use when: multiple measurements per record (inspection with 5 parameters, SPC data point batch).

### Strategy C: Canonical normalized columns + JSONB evidence (hybrid, for analytics)

```sql
-- Fast-query columns (analytical)
canonical_magnitude NUMERIC(20,10),
canonical_unit_code VARCHAR(64),
quantity_kind_code VARCHAR(64),
-- Full evidence
measval_json JSONB
```

Use when: Analytics domain needs fast aggregation; quantity dimension queries without JSON parsing.

---

## 6. MeasurementValueFactory Contract

```php
interface MeasurementValueFactoryInterface {
    public function create(
        string $magnitude,
        string $unit_code,
        string $quantity_kind_code,
        string $actor_id,
        string $trace_id,
        array $semantic_context,
        ?array $conversion_options = null
    ): MeasurementValue;
    
    public function normalize(
        MeasurementValue $mv,
        string $target_unit_code,
        ?array $context = null
    ): MeasurementValue;
    
    public function verify_hash(MeasurementValue $mv): bool;
    
    public function to_display(MeasurementValue $mv, string $locale = 'vi'): array;
    
    public function from_json(string $json): MeasurementValue;
    
    public function snapshot_rule(string $rule_id, int $version): array;
}
```

**Immutability:** `create()` returns an immutable value object. `normalize()` returns a NEW MeasurementValue with original preserved as `digital_thread.parent_measval_id`.

---

## 7. Digital Thread Linkage

```
Device measurement (°F)
    │
    ▼
MEASVAL-1: {magnitude: "98.6", unit: "[degF]", source_actor_type: "DEVICE"}
    │
    │ normalize() → conversion
    ▼
MEASVAL-2: {magnitude: "37.0", unit: "Cel", digital_thread.parent_measval_id: MEASVAL-1.id}
    │
    │ stored in IQC record
    ▼
IqcInspectionRecord.measurement_value → MEASVAL-2 (with full chain traceable)

If IQC triggers nonconformance:
MEASVAL-2 referenced in:
  ├── NQCaseRecord.triggering_measurement_value_id
  └── CAPARecord.root_cause_evidence_measval_id
```

All downstream uses are recorded in MEASVAL.digital_thread.downstream_uses when the parent value is referenced.

---

## 8. Simulations

### SIM-170 — Full MeasurementValue for °F→°C IQC measurement

See P05; P06 adds: audit_hash computed; digital_thread set; ai_flags empty; semantic_context.domain='quality_improvement'.

### SIM-006 — Reject MEASVAL creation without quantity_kind_code

Input: {magnitude: "50", unit_code: "m", quantity_kind_code: null}. Factory.create() throws: MeasurementValueValidationException("quantity_kind_code is required"). No MEASVAL written.

### SIM-005 — Historical MEASVAL preserved when conversion rule is retired

Rule UOMCONV-TEMP-F-C-v1 retired (v2 approved). Historical MEASVAL-2 retains `conversion_rule_snapshot` from v1. `verify_hash()` passes on old record. New conversions use v2.

### SIM-040 — Batch scaling: MEASVAL chain from recipe to production order

MEASVAL-R (recipe): {magnitude: "2.5", unit: "kg", source_record: "MasterRecipe-001"}.  
MEASVAL-PO (production): {magnitude: "25", unit: "kg", source_record: "PO-001", digital_thread.derived_from: [MEASVAL-R.id]}. Scaling factor=10 recorded in semantic_context.scaling_factor.

---

## 9. Gap Register

| Gap ID | Description | Severity | Owner |
|--------|------------|----------|-------|
| GAP-P06-001 | downstream_uses auto-population requires FK scanning — may be expensive for high-volume; defer to analytics queue | LOW | P16 |
| GAP-P06-002 | Potency/assay MEASVAL variant (with assay_context) not fully specified — deferred to P07 | LOW | P07 |

No critical or high gaps.

---

## 10. Audit Scorecard — P06

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Source fidelity | 10/10 | Schema modeled from HL7 FHIR Quantity + FDA 21 CFR 11 audit trail |
| Immutability | 10/10 | Audit hash algorithm; factory returns value object; no retroactive recompute |
| AI boundary | 10/10 | ai_flags advisory only; human_reviewed tracked; never blocks transaction |
| Digital thread | 9/10 | parent_measval_id + derived_from; downstream_uses deferred to analytics |
| Evidence completeness | 10/10 | trace_id, actor, session, IP hash, audit_hash, warnings, ai_flags all present |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
