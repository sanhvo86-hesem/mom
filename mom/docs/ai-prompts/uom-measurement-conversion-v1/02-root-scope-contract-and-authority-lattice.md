# P02 — Root Scope Contract and Authority Lattice

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P01)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Root scope contract fully defined. Authority lattice established with clear separation between authoritative roots, value objects, policy roots, and projection surfaces. Workspace mutation boundaries locked. All 7 UoM domain objects classified. No hidden mutation authority permitted. Simulations SIM-003, SIM-006, SIM-007, SIM-019, SIM-060, SIM-089 executed.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Root Object Classification

| Code | Name | Class | Persistent? | Authoritative? | Who may mutate |
|------|------|-------|------------|----------------|----------------|
| `UOM` | Unit of Measure | **Authoritative Root** | YES (PostgreSQL) | YES | Governed workflow only; human approval required |
| `QKIND` | Quantity Kind | **Authoritative Root** | YES (PostgreSQL) | YES | Governed workflow; very rarely changes |
| `DIMVEC` | Dimension Vector | **Semantic Support Object** | YES (computed + stored) | Derived from QKIND | Computed from QKIND; never manually edited |
| `UOMCONV` | Conversion Rule | **Governed Authoritative Root** | YES (PostgreSQL, versioned) | YES | Governed workflow + e-sign + human approval |
| `UOMALIAS` | Unit Alias Mapping | **Governed Data-Quality Root** | YES (PostgreSQL) | YES (after approval) | Review queue → human approve/reject/merge |
| `ITUOM` | Item UoM Policy | **Policy Extension Root** | YES (PostgreSQL, per item) | YES (scoped to item) | Item master workflow + UoM approval |
| `MEASVAL` | Measurement Value Object | **Embedded Evidence Value Object** | Embedded in transaction rows or own table | NO (derives from UOM+UOMCONV at time of creation) | Immutable after creation; conversion_rule snapshot frozen |

---

## 3. Authority Lattice

```
GLOBAL_STANDARD_SOURCES (BIPM, UCUM, QUDT, UNECE, ISO)
       │
       ▼ define / constrain
  UOM Unit Catalog ──── QKIND Quantity Kind ──── DIMVEC (computed)
       │                      │
       │ is governed by       │ guards compatibility of
       ▼                      ▼
  UOMCONV Conversion Rule ◄── compatibility check (kind + dim)
       │
       │ is applied by
       ▼
  ConversionEngine (service, stateless)
       │
       │ produces
       ▼
  MEASVAL MeasurementValue Envelope
       │
       │ is stored in
       ▼
  Transaction Row (inspection, inventory, recipe, calibration, …)

  UOMALIAS ──► feeds UOM (after human approval)
  ITUOM ──────► scopes UOMCONV per item/context/site/customer/supplier
```

### Authority rules

1. UOM entries are created by governing workflow; no API may create a UOM entry without workflow completion.
2. UOMCONV rules are versioned; only the approved version is used; old versions are immutable and queryable for replay.
3. MEASVAL is constructed at transaction time; it snapshots the UOMCONV rule version used; it is never re-computed retroactively.
4. ITUOM does not override global UOMCONV physics; it only selects which unit is used per context.
5. DIMVEC is computed from QKIND definitions; never manually set; used by ConversionEngine for secondary algebra check.
6. UOMALIAS pending entries are in a quarantine queue; they have NO authority until human-approved.
7. Workspace (UI) never holds mutation authority; all mutations are routed through command services.

---

## 4. Object Scope Contracts

### UOM — Unit of Measure

**Is:** a canonical, globally-unique unit identity in the HESEM Measurement Intelligence Subsystem.  
**Is not:** a display label, a vendor-specific string, a packaging quantity, or a currency.

```
Fields (authoritative):
  canonical_code       VARCHAR(64) NOT NULL UNIQUE   -- UCUM atom (case-sensitive)
  ucum_code            VARCHAR(64) NOT NULL           -- same as canonical_code for UCUM units
  qudt_uri             VARCHAR(256) NULLABLE          -- reference, not enforced live
  display_symbol       VARCHAR(32) NOT NULL           -- human-readable (µg, °C, etc.)
  display_name_en      VARCHAR(128) NOT NULL           -- English name
  display_name_vi      VARCHAR(128) NOT NULL           -- Vietnamese name WITH diacritics
  quantity_kind_code   VARCHAR(64) NOT NULL FK→QKIND  -- the SINGLE permitted kind
  si_base              BOOLEAN NOT NULL DEFAULT false
  si_factor            NUMERIC(38,20) NULLABLE        -- factor to SI base; NULL for non-linear
  si_offset            NUMERIC(38,20) NULLABLE        -- affine offset (e.g. 273.15 for Celsius)
  lifecycle_status     ENUM('draft','active','deprecated','retired') NOT NULL DEFAULT 'draft'
  owner_role           VARCHAR(64) NOT NULL            -- HESEM role that owns this entry
  source_tag           VARCHAR(64) NOT NULL            -- BIPM/UCUM/QUDT/UNECE/HESEM_CUSTOM
  risk_level           ENUM('low','medium','high','regulated') NOT NULL
  created_at           TIMESTAMPTZ NOT NULL
  approved_at          TIMESTAMPTZ NULLABLE
  approved_by          UUID NULLABLE FK→users
  retired_at           TIMESTAMPTZ NULLABLE
```

**Forbidden on UOM:**
- Storing packaging ratios (box_qty, case_qty)
- Storing item-specific conversion factors
- Auto-creating entries from display string alone

### QKIND — Quantity Kind

**Is:** the semantic meaning of what is being measured.  
**Is not:** equivalent to SI dimension vector alone (two quantities may share dimension but differ in kind).

```
Fields:
  kind_code            VARCHAR(64) NOT NULL UNIQUE   -- e.g. Mass, Length, YieldPercentage
  parent_kind_code     VARCHAR(64) NULLABLE FK→self  -- QUDT hierarchy
  qudt_uri             VARCHAR(256) NULLABLE
  dimension_vector     CHAR(32) NOT NULL             -- e.g. M1L0T0I0Θ0N0J0
  label_en             VARCHAR(128) NOT NULL
  label_vi             VARCHAR(128) NOT NULL          -- Vietnamese WITH diacritics
  is_dimensionless     BOOLEAN NOT NULL DEFAULT false
  allows_cross_kind    BOOLEAN NOT NULL DEFAULT false -- true only for context rules
  source               VARCHAR(64) NOT NULL           -- QUDT/HESEM_CUSTOM/ISO
  notes                TEXT NULLABLE
```

**Complete HESEM quantity kind list (Phase 1 — manufacturing focus):**

SI base kinds: Mass, Length, Time, ElectricCurrent, ThermodynamicTemperature, AmountOfSubstance, LuminousIntensity

SI derived kinds: Area, Volume, VolumetricFlowRate, MassFlowRate, Velocity, Acceleration, Force, Pressure, Energy, Power, Frequency, Density, DynamicViscosity, KinematicViscosity, SurfaceTension, Angle, SolidAngle, ElectricCharge, ElectricPotential, Capacitance, Resistance, MagneticFlux, MagneticFluxDensity, Inductance, LuminousFlux, Illuminance, RadioactiveActivity, AbsorbedDose, EquivalentDose

Manufacturing-specific dimensionless kinds (HESEM custom, parent=Dimensionless):
- YieldPercentage (sản lượng %)
- ScrapRate (tỷ lệ phế phẩm %)
- CompletionPercentage (% hoàn thành)
- ConformanceRate (% phù hợp)
- OEEScore (hiệu suất thiết bị tổng thể)
- MoistureContent (độ ẩm %)
- PurityPercentage (độ tinh khiết %)
- ConcentrationPercentage (nồng độ %)

Lab/quality kinds:
- pH (negative log scale; parent=Dimensionless; special conversion)
- LogarithmicRatio (dB, etc.)
- Molarity (mol/L — ratio, not cancellable)
- MassConcentration (mg/mL, g/L)
- VolumeConcentration (dimensionless ratio)
- Potency (IU/mL, IU/g — procedure-defined)
- TitreConcentration (serology)

### UOMCONV — Conversion Rule

**Is:** a versioned, approved, evidence-backed formula for converting a quantity from one unit to another.  
**Is not:** a simple lookup table row.

```
Fields:
  rule_id              UUID PRIMARY KEY
  rule_code            VARCHAR(128) NOT NULL UNIQUE   -- e.g. UOMCONV-TEMP-F-C-v1
  version              INTEGER NOT NULL DEFAULT 1
  from_unit_code       VARCHAR(64) NOT NULL FK→UOM
  to_unit_code         VARCHAR(64) NOT NULL FK→UOM
  quantity_kind_code   VARCHAR(64) NOT NULL FK→QKIND
  category             ENUM('exact_linear','defined_linear','approximate_linear',
                            'affine','logarithmic','derived_expression',
                            'dimensionless_strict','ratio','density_based',
                            'potency_assay','packaging_policy','arbitrary',
                            'device_display') NOT NULL
  factor               NUMERIC(38,20) NULLABLE       -- for linear: to = from * factor
  offset               NUMERIC(38,20) NULLABLE       -- for affine: to = from * factor + offset
  formula_expression   TEXT NULLABLE                 -- for logarithmic/complex
  factor_source        VARCHAR(256) NOT NULL          -- citation: "BIPM SI §4.3", "ISO 31-1"
  precision_digits     SMALLINT NOT NULL DEFAULT 12  -- calculation precision
  rounding_policy_id   VARCHAR(64) NOT NULL          -- FK→uom_rounding_policy
  context_required     BOOLEAN NOT NULL DEFAULT false -- true for density/potency
  context_schema       JSONB NULLABLE                -- JSON schema for required context
  bidirectional        BOOLEAN NOT NULL DEFAULT true
  effective_from       DATE NOT NULL
  effective_to         DATE NULLABLE
  lifecycle_status     ENUM('draft','review','approved','deprecated') NOT NULL
  approved_by          UUID NULLABLE FK→users        -- NOT NULL when status=approved
  approved_at          TIMESTAMPTZ NULLABLE
  esign_manifest_hash  VARCHAR(256) NULLABLE         -- SHA-256 of signed manifest
  risk_level           ENUM('low','medium','high','regulated') NOT NULL
  created_by           UUID NOT NULL FK→users
  created_at           TIMESTAMPTZ NOT NULL
  notes                TEXT NULLABLE
```

### MEASVAL — Measurement Value Object

**Is:** an immutable evidence envelope created at the moment a quantity is measured, entered, or converted.  
**Is not:** a standalone table record (embedded as JSONB or in a sub-table linked to parent transaction).

```json
{
  "magnitude": "98.6",
  "unit_code": "[degF]",
  "unit_system": "UCUM",
  "quantity_kind_code": "ThermodynamicTemperature",
  "comparator": null,
  "precision": {
    "input_scale": 1,
    "calculation_scale": 12,
    "display_scale": 1,
    "rounding_policy_id": "ROUND-HALF-EVEN"
  },
  "normalization": {
    "canonical_magnitude": "37.0",
    "canonical_unit_code": "Cel",
    "conversion_rule_id": "UOMCONV-TEMP-F-C-v1",
    "conversion_rule_version": 1,
    "conversion_category": "affine",
    "effective_at": "2026-05-29T00:00:00Z",
    "conversion_rule_snapshot": { ... }
  },
  "display": {
    "display_magnitude": "37.0",
    "display_unit_code": "Cel",
    "display_unit_label": "°C",
    "display_unit_label_vi": "độ C"
  },
  "semantic_context": {
    "domain": "quality_improvement",
    "source_record_type": "IQC_INSPECTION",
    "source_record_id": "INSP-001",
    "item_id": "ITEM-123",
    "lot_id": "LOT-456"
  },
  "evidence": {
    "source_actor_type": "USER",
    "source_actor_id": "USR-789",
    "trace_id": "trace-abc-123",
    "session_id": "sess-xyz",
    "created_at": "2026-05-29T10:30:00Z",
    "audit_hash": "sha256:...",
    "warnings": [],
    "ai_flags": []
  }
}
```

---

## 5. Workspace / Mutation Boundary Rules

| Surface | May display | May read live data | May initiate mutation | Must route through |
|---------|------------|-------------------|----------------------|-------------------|
| UoM Control Center (UI) | YES | YES (read-only API) | NO — submit form only | UomRuleSubmitCommand |
| Unit detail panel (UI) | YES | YES | NO | — |
| Alias review queue (UI) | YES | YES | Approve/reject only | UomAliasApproveCommand |
| ITEM master UoM tab (UI) | YES | YES | NO — submit form only | ItemUomPolicyUpdateCommand |
| Quantity input widget (UI, embedded) | YES | YES (unit picker) | NO — emits value object only | Parent form submit |
| API `/api/v1/uom/*` (read) | — | YES | NO | — |
| API `/api/v1/uom/*/submit` (write) | — | — | YES | Command service |
| ConversionEngine service | — | YES (reads rules) | NO — produces MEASVAL only | — |
| AI suggestion service | — | YES (reads catalog) | NO — advisory only, writes to AI advisory log | Human review |

**Hidden mutation is FORBIDDEN in all surfaces.** Every state change to UOM/UOMCONV/UOMALIAS/ITUOM must:
1. Emit a command object
2. Pass authorization check (roles.permissions JSONB)
3. Create an audit_events row
4. Return command receipt with trace_id

---

## 6. Simulations

### SIM-003 — Block duplicate canonical_code with different semantic meaning

| Field | Value |
|-------|-------|
| case_id | SIM-003 |
| scenario | Attempt to insert a second UOM entry with canonical_code='kg' but quantity_kind_code='Volume' (wrong). |
| expected | BLOCKED: UNIQUE constraint on canonical_code prevents second insert. Error: UOM_DUPLICATE_CANONICAL_CODE. |
| negative blocked | Allowing two rows with same canonical_code='kg' to coexist. |
| evidence | DB error propagated to API as RFC 9457 Problem Detail: {type, title, detail, trace_id} |
| open gap | None |

### SIM-006 — Reject unit without owner_role, lifecycle_status, quantity_kind_code

| Field | Value |
|-------|-------|
| case_id | SIM-006 |
| scenario | API receives CreateUnit command: {canonical_code: 'rpm', display_symbol: 'rpm', quantity_kind_code: NULL}. |
| expected | BLOCKED at command validation layer: quantity_kind_code is required. Error: UOM_UNIT_MISSING_REQUIRED_FIELD. HTTP 422 with Problem Detail. |
| negative blocked | Inserting rpm without quantity_kind assignment (rpm = frequency or angular velocity? — must be declared). |
| evidence | HTTP 422; Problem Detail body; no DB write |
| open gap | None |

### SIM-007 — Localized label change does not alter conversion authority

| Field | Value |
|-------|-------|
| case_id | SIM-007 |
| scenario | Admin updates display_name_vi for unit 'kg' from 'ki-lô-gam' to 'kilôgam' (typo fix). |
| expected | Allowed without full workflow: label edit is a non-authority field. Change logged in audit_events with event_type='UOM_LABEL_EDIT'. Conversion rules not invalidated. No e-sign required. |
| negative blocked | Requiring full conversion rule re-approval for a label change. Allowing label edit to silently change canonical_code or quantity_kind_code. |
| evidence | audit_events row: event_type='UOM_LABEL_EDIT', old_value, new_value, actor_id, timestamp |
| open gap | None — label edit is a low-risk operation |

### SIM-019 — Block conversion where UOMCONV rule status = 'draft' (not approved)

| Field | Value |
|-------|-------|
| case_id | SIM-019 |
| scenario | ConversionEngine is asked to convert 5 in → mm using UOMCONV-LENGTH-IN-MM-v1 which is in status='draft'. |
| expected | BLOCKED: ConversionEngine only uses rules with lifecycle_status='approved'. Returns error: UOM_RULE_NOT_APPROVED with rule_id, current_status. No conversion result produced. |
| negative blocked | Using draft rule in any production conversion. Silently falling back to an older approved rule without logging. |
| evidence | Error event logged; no MEASVAL produced; trace_id |
| open gap | None |

### SIM-060 — ITUOM policy: item "Steel Rod 12mm" uses kg inventory, mm length for QC, each for sales

| Field | Value |
|-------|-------|
| case_id | SIM-060 |
| scenario | Item ITEM-SR-12: inventory_unit=kg, sales_unit=EA (each), qc_inspection_unit=mm (diameter measurement), purchase_unit=kg. Production batch recipe unit=g/batch. |
| expected | ITUOM record stores all four unit codes. No conflict — each is used in its own domain context. ConversionEngine can convert between units when explicitly requested with MEASVAL evidence. QC diameter measurement is a separate quantity kind (Length) from inventory mass (Mass) — no implicit conversion needed. |
| negative blocked | Treating mm as the default unit for inventory (cross-kind confusion). Requiring a global conversion rule for kg↔EA (packaging policy, not physics). |
| evidence | ITUOM row: {item_id: 'ITEM-SR-12', inventory_unit: 'kg', sales_unit: '{each}', qc_unit: 'mm', purchase_unit: 'kg', recipe_unit: 'g'} |
| open gap | None |

### SIM-089 — Alias queue: vendor sends 'KG' in EDI; must not auto-approve as kg

| Field | Value |
|-------|-------|
| case_id | SIM-089 |
| scenario | EDI transaction from vendor uses 'KG' as unit string. UCUM requires lowercase 'kg'. |
| expected | Alias resolution: 'KG' is not a valid UCUM atom. System creates uom_alias_quarantine record: {alias='KG', source_system='VENDOR_EDI', ambiguity_resolution='PENDING', ai_suggestion={canonical_code: 'kg', confidence: 0.97}}. Human reviewer sees the suggestion, approves, and alias 'KG'→'kg' is added to uom_alias with approved_by, source='UCUM_CASE_NORMALIZATION'. |
| negative blocked | Auto-approving 'KG'→'kg' without human review even though confidence is high. Blocking the EDI transaction permanently without providing a review path. |
| evidence | uom_alias_quarantine row; ai_advisory_log row with model, confidence; after approval: uom_alias row |
| open gap | None |

---

## 7. Service Boundary Definitions

| Service | Responsibilities | Must NOT do |
|---------|----------------|------------|
| UnitCatalogService | CRUD UOM via workflow; validate canonical_code uniqueness; assign quantity_kind | Perform conversions; accept unreviewed aliases as authority |
| QuantityKindService | CRUD QKIND; compute dimension_vector; check kind compatibility | Override dimension algebra for semantic guard |
| ConversionRuleService | Version UOMCONV; check approval status before use; store effective dates | Produce conversions directly — delegates to ConversionEngine |
| ConversionEngine | Stateless: receive input value + from_unit + to_unit + context → produce MEASVAL | Persist to DB; approve rules; ignore quantity_kind guard |
| MeasurementValueFactory | Assemble MEASVAL envelope from ConversionEngine result; snapshot rule; hash evidence | Retroactively recompute old MEASVALs |
| ItemUomPolicyService | CRUD ITUOM per item/site/context; validate all referenced unit_codes exist in UOM | Bypass unit catalog validation; create packaging global units |
| UomAliasResolutionService | Map external strings to canonical codes via approved alias table; quarantine ambiguous | Auto-approve aliases; return ambiguous result without flagging |
| UomImpactAnalysisService | Given a rule change: identify all affected transactions, items, recipes, specs | Prevent impact analysis — it is a read-only service |
| UomAuditEvidenceService | Assemble audit export for a given trace_id or rule_id | Modify audit records |
| ExternalEngineeringUnitMapper | Map OPC UA / EDI / lab external unit strings to canonical; quarantine unknowns | Accept unvalidated external strings as authority |

---

## 8. Audit Scorecard — P02

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Source fidelity | 10/10 | All object definitions sourced from P01 standards + P00 domain model lock; no invented facts |
| HESEM repo fit | 10/10 | PHP service names follow repo naming convention; planning only |
| UoM semantic correctness | 10/10 | 7 objects correctly classified; authority lattice enforces kind guard before dimension algebra |
| Operational simulation depth | 9/10 | 6 simulations covering catalog CRUD, alias quarantine, ITUOM policy, rule lifecycle |
| Regulated evidence readiness | 9/10 | MEASVAL envelope complete; FDA audit trail linked to UOMCONV approval |
| Workflow/mutation safety | 10/10 | All mutation surfaces route through command; no hidden workspace authority |
| AI human authority boundary | 10/10 | AI suggestion logged; human approval required; no auto-approve |
| Handoff clarity | 10/10 | P03 prerequisites defined |

---

## 9. Next Prompt Prerequisites (P03)

1. P02 artifact committed
2. P03 must build full HESEM quantity kind registry using QKIND schema defined here
3. P03 must add dimension_vector for all HESEM custom kinds
4. P03 simulations: SIM-011, SIM-013, SIM-015, SIM-021, SIM-024, SIM-030

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
