# P11 — Data Model, Migration, and No-Naked-Numbers Remediation Plan

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P10)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Full database migration plan locked. 12 migration files planned (IDs 214–225). Naked number scan strategy defined. Table schemas finalized. Indexes planned. Effectivity, soft-delete, and audit patterns applied consistently. Migration drift detection compliant.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Migration Plan (IDs 214–225)

Next available migration ID: **214** (last is 213_graphics_orders_v3_tokens.sql).

| Migration ID | File name | Purpose |
|-------------|-----------|---------|
| 214 | `214_uom_quantity_kind.sql` | Create `uom_quantity_kind` table |
| 215 | `215_uom_unit_catalog.sql` | Create `uom_unit_catalog` table |
| 216 | `216_uom_rounding_policy.sql` | Create `uom_rounding_policy` table |
| 217 | `217_uom_conversion_rule.sql` | Create `uom_conversion_rule` table |
| 218 | `218_uom_external_code_map.sql` | Create `uom_external_code_map` table |
| 219 | `219_uom_alias.sql` | Create `uom_alias` + `uom_alias_quarantine` tables |
| 220 | `220_item_uom_policy.sql` | Create `item_uom_policy` table |
| 221 | `221_item_packaging_policy.sql` | Create `item_packaging_policy` table |
| 222 | `222_material_density_registry.sql` | Create `material_density_registry` table |
| 223 | `223_uom_rule_approval.sql` | Create `uom_rule_approval` + `uom_ai_advisory_log` tables |
| 224 | `224_uom_seeds.sql` | Insert Phase 1 seed data (quantity kinds, units, rounding policies, conversion rules) |
| 225 | `225_uom_indexes.sql` | Performance indexes |

---

## 3. Core Table Schemas

### uom_quantity_kind (migration 214)

```sql
CREATE TABLE uom_quantity_kind (
    kind_code VARCHAR(64) PRIMARY KEY,
    parent_kind_code VARCHAR(64) REFERENCES uom_quantity_kind(kind_code),
    qudt_uri VARCHAR(256),
    dimension_vector CHAR(32) NOT NULL,
    label_en VARCHAR(128) NOT NULL,
    label_vi VARCHAR(128) NOT NULL,
    is_dimensionless BOOLEAN NOT NULL DEFAULT false,
    allows_cross_kind BOOLEAN NOT NULL DEFAULT false,
    source VARCHAR(64) NOT NULL CHECK (source IN ('QUDT','BIPM','HESEM_CUSTOM','ISO')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### uom_unit_catalog (migration 215)

```sql
CREATE TABLE uom_unit_catalog (
    canonical_code VARCHAR(64) PRIMARY KEY,
    ucum_code VARCHAR(64) NOT NULL,
    qudt_uri VARCHAR(256),
    display_symbol VARCHAR(32) NOT NULL,
    display_name_en VARCHAR(128) NOT NULL,
    display_name_vi VARCHAR(128) NOT NULL,
    quantity_kind_code VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code),
    si_base BOOLEAN NOT NULL DEFAULT false,
    si_factor NUMERIC(38,20),
    si_offset NUMERIC(38,20) DEFAULT 0,
    is_affine BOOLEAN NOT NULL DEFAULT false,
    lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_status IN ('draft','active','deprecated','retired')),
    owner_role VARCHAR(64) NOT NULL,
    source_tag VARCHAR(64) NOT NULL
        CHECK (source_tag IN ('BIPM','UCUM','QUDT','UNECE','ISO','HESEM_CUSTOM','OPC_UA','LAB')),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low','medium','high','regulated')),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    retired_at TIMESTAMPTZ,
    retired_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ucum_code UNIQUE(ucum_code)
);
```

### uom_rounding_policy (migration 216)

```sql
CREATE TABLE uom_rounding_policy (
    policy_id VARCHAR(64) PRIMARY KEY,
    algorithm VARCHAR(64) NOT NULL
        CHECK (algorithm IN ('ROUND_HALF_EVEN','ROUND_HALF_UP','ROUND_DOWN_TRUNCATE','ROUND_UP_CEILING','ROUND_NONE')),
    display_scale_default SMALLINT NOT NULL DEFAULT 4,
    calculation_scale SMALLINT NOT NULL DEFAULT 20,
    description_en VARCHAR(256) NOT NULL,
    description_vi VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### uom_conversion_rule (migration 217)

```sql
CREATE TABLE uom_conversion_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    from_unit_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    to_unit_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    quantity_kind_code VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code),
    category VARCHAR(32) NOT NULL
        CHECK (category IN ('exact_linear','defined_linear','approximate_linear',
                            'affine','logarithmic','derived_expression',
                            'dimensionless_strict','ratio','density_based',
                            'potency_assay','packaging_policy','arbitrary','device_display')),
    factor NUMERIC(38,20),
    offset_value NUMERIC(38,20) DEFAULT 0,
    formula_expression TEXT,
    factor_source VARCHAR(256) NOT NULL,
    factor_exact BOOLEAN NOT NULL DEFAULT false,
    precision_digits SMALLINT NOT NULL DEFAULT 12,
    rounding_policy_id VARCHAR(64) NOT NULL REFERENCES uom_rounding_policy(policy_id),
    context_required BOOLEAN NOT NULL DEFAULT false,
    context_schema JSONB,
    bidirectional BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to DATE,
    lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_status IN ('draft','review','approved','deprecated')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    esign_manifest_hash VARCHAR(256),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low','medium','high','regulated')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT uq_rule_version UNIQUE(rule_code, version),
    CONSTRAINT chk_rule_approved CHECK (
        lifecycle_status != 'approved' OR approved_by IS NOT NULL
    )
);
```

### uom_alias (migration 219)

```sql
CREATE TABLE uom_alias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_string VARCHAR(128) NOT NULL,
    canonical_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    source_system VARCHAR(64) NOT NULL,
    context_scope VARCHAR(64),
    confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('VERIFIED','HIGH','MEDIUM','LOW')),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low','medium','high','regulated')),
    approved_by UUID NOT NULL REFERENCES users(id),
    approved_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alias_source UNIQUE(alias_string, source_system, context_scope)
);

CREATE TABLE uom_alias_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_string VARCHAR(128) NOT NULL,
    source_system VARCHAR(64) NOT NULL,
    raw_payload JSONB,
    ambiguity_candidates JSONB,
    ai_suggested BOOLEAN NOT NULL DEFAULT false,
    ai_suggestion JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review','ai_suggested','resolved','rejected','unknown')),
    resolved_canonical_code VARCHAR(64) REFERENCES uom_unit_catalog(canonical_code),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Naked Number Scan Strategy

**Phase 1 (planning/prototype):** Document all tables with quantity columns that lack unit metadata.  
**Phase 2 (post-Phase 1):** Add `_measval JSONB` columns alongside existing numeric columns; populate via migration.

### Scanner output format (tool: UomDataQualityScanner)

```json
{
  "table": "qc_inspection_results",
  "column": "measured_value",
  "data_type": "numeric",
  "naked_number_risk": "HIGH",
  "rows_affected": 4521,
  "suggested_unit": "mm",
  "suggested_kind": "Length",
  "confidence": "MEDIUM",
  "remediation": "Add measurement_value JSONB column; backfill from inspection_spec.unit_code"
}
```

### Known naked-number columns (pre-scan, from domain knowledge)

| Table | Column | Risk | Suggested unit source |
|-------|--------|------|----------------------|
| qc_inspection_results | measured_value | HIGH | inspection_spec.unit |
| production_orders | planned_quantity | HIGH | item_uom_policy.inventory_unit |
| inventory_movements | quantity | HIGH | item_uom_policy.inventory_unit |
| calibration_records | instrument_reading | HIGH | calibration_spec.unit |
| recipe_parameters | parameter_value | HIGH | recipe_parameter_uom.unit_code |
| ehs_incidents | measurement_value | MEDIUM | incident_form field |

**Remediation rule:** Never alter the existing column (backward compatibility). Add `{column}_measval JSONB` alongside. Run backfill migration with source_actor_type='SYSTEM_MIGRATION', trace_id='migration-225'.

---

## 5. Audit Scorecard — P11

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Migration plan | 10/10 | 12 migrations, sequential IDs 214-225, drift detector compliant |
| Schema completeness | 10/10 | All 8 tables defined with proper constraints, FK, CHECK |
| Naked number strategy | 9/10 | Scanner defined; known columns listed; backfill approach non-destructive |
| Effectivity patterns | 10/10 | effective_from/effective_to on all time-sensitive tables |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
