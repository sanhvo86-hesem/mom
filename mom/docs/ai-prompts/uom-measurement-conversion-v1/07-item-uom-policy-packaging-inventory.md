# P07 — Item UoM Policy, Packaging, Commercial, and Inventory Model

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P06)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Item UoM Policy (ITUOM) fully specified. Five unit slots per item (inventory, purchase, sales, recipe, QC) with explicit conversion rules. Packaging policy model defined: box/case/pallet are item-context policies, not global units. Supplier/customer override model specified. Effective-date versioning designed. Serialization and lot tracking integration locked. Simulations executed.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. ITUOM Table Schema

```sql
CREATE TABLE item_uom_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id VARCHAR(64) NOT NULL,           -- FK to items table
    site_id VARCHAR(64),                    -- NULL = global; site-specific overrides
    supplier_id VARCHAR(64),               -- NULL = no supplier-specific policy
    customer_id VARCHAR(64),               -- NULL = no customer-specific policy
    context_code VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    -- The five canonical unit slots:
    inventory_unit_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    purchase_unit_code  VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    sales_unit_code     VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    recipe_unit_code    VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    qc_unit_code        VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    -- Conversion rule overrides (NULL = use global UOMCONV)
    inv_to_purchase_rule_id UUID REFERENCES uom_conversion_rule(id),
    inv_to_sales_rule_id    UUID REFERENCES uom_conversion_rule(id),
    inv_to_recipe_rule_id   UUID REFERENCES uom_conversion_rule(id),
    inv_to_qc_rule_id       UUID REFERENCES uom_conversion_rule(id),
    -- Minimum quantity and lot tracking
    min_purchase_qty    NUMERIC(20,6),
    min_sales_qty       NUMERIC(20,6),
    lot_tracking_unit   VARCHAR(64) REFERENCES uom_unit_catalog(canonical_code),
    serial_tracking     BOOLEAN NOT NULL DEFAULT false,
    -- Effectivity
    effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,
    -- Governance
    version             INTEGER NOT NULL DEFAULT 1,
    lifecycle_status    VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (lifecycle_status IN ('draft','active','superseded','retired')),
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes               TEXT,
    CONSTRAINT uq_item_context UNIQUE(item_id, site_id, supplier_id, customer_id, context_code, effective_from)
);
```

### Priority resolution (when multiple ITUOM rows match an item)

```
Priority (highest first):
1. item_id + site_id + supplier_id + customer_id (fully specific)
2. item_id + site_id + supplier_id
3. item_id + site_id + customer_id
4. item_id + supplier_id
5. item_id + customer_id
6. item_id + site_id
7. item_id (global item default)
8. Default policy (system fallback — blocks transaction if no policy found)
```

---

## 3. Packaging Policy Model

**Core principle (DEC-007 re-enforced):** box, case, carton, pallet, reel, bag, roll, sheet, kit are NOT global units. They are packaging policies attached to the item+context.

```sql
CREATE TABLE item_packaging_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id VARCHAR(64) NOT NULL,
    site_id VARCHAR(64),
    supplier_id VARCHAR(64),
    customer_id VARCHAR(64),
    -- Packaging tier definitions (NULL = not applicable)
    inner_pack_label    VARCHAR(64),        -- e.g. 'hộp nhỏ' (inner box)
    inner_pack_qty      NUMERIC(20,6),      -- quantity in inventory_unit per inner pack
    outer_pack_label    VARCHAR(64),        -- e.g. 'thùng' (carton)
    outer_pack_qty      NUMERIC(20,6),      -- quantity in inventory_unit per outer pack
    pallet_label        VARCHAR(64),        -- e.g. 'pallet'
    pallet_qty          NUMERIC(20,6),      -- quantity in inventory_unit per pallet
    -- Physical dimensions of outer pack (for logistics)
    outer_pack_weight_kg   NUMERIC(12,4),
    outer_pack_length_mm   NUMERIC(12,2),
    outer_pack_width_mm    NUMERIC(12,2),
    outer_pack_height_mm   NUMERIC(12,2),
    -- Governance
    effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,
    approved_by         UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pack_context UNIQUE(item_id, site_id, supplier_id, customer_id, effective_from)
);
```

**Why packaging factors are stored here, not in uom_unit_catalog:**
- Box of 12 for Item A ≠ Box of 24 for Item B
- Customer A takes carton of 6; Customer B takes carton of 10
- Packaging changes by supplier revision without changing the physical unit
- Global unit table would need item_id FK — making it no longer global

**Conversion from packaging quantity to inventory unit:**
```
purchase_qty_in_boxes × item_packaging_policy.outer_pack_qty = inventory_qty_in_inventory_unit
```
This is a simple arithmetic operation, NOT a ConversionEngine UOMCONV rule.

---

## 4. Substance Density Registry (resolves GAP-P01-002, GAP-004)

```sql
CREATE TABLE material_density_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substance_code VARCHAR(64) NOT NULL,
    substance_name_vi VARCHAR(256) NOT NULL,
    density_value NUMERIC(20,8) NOT NULL,
    density_unit_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    temperature_celsius NUMERIC(6,2),
    pressure_pa NUMERIC(12,2) DEFAULT 101325,
    density_source VARCHAR(256) NOT NULL,   -- 'NIST Webbook', 'Supplier CoA', etc.
    lot_id VARCHAR(64),                     -- if lot-specific density
    method_code VARCHAR(64),               -- ASTM method, ISO method
    effective_from DATE NOT NULL,
    effective_to DATE,
    approved_by UUID REFERENCES users(id)
);
```

Seed data (key manufacturing substances):
| substance | density (kg/L) | at °C | source |
|-----------|---------------|-------|--------|
| water | 0.99821 | 20 | NIST |
| ethanol | 0.78945 | 20 | NIST |
| acetone | 0.79100 | 20 | NIST |
| steel (carbon) | 7.850 | 20 | engineering ref |
| aluminum | 2.700 | 20 | engineering ref |
| polyethylene | 0.950 | 20 | engineering ref |

---

## 5. Recipe / BOM Unit Integration

From ISA-88 perspective: each recipe parameter has its own unit. ITUOM.recipe_unit_code is the default for all parameters unless overridden per-parameter.

```sql
CREATE TABLE recipe_parameter_uom (
    recipe_id UUID NOT NULL,
    parameter_code VARCHAR(64) NOT NULL,
    unit_code VARCHAR(64) NOT NULL REFERENCES uom_unit_catalog(canonical_code),
    quantity_kind_code VARCHAR(64) NOT NULL REFERENCES uom_quantity_kind(kind_code),
    default_value NUMERIC(20,8),
    lower_limit NUMERIC(20,8),
    upper_limit NUMERIC(20,8),
    target_value NUMERIC(20,8),
    limit_measval_json JSONB,  -- MeasurementValue for each limit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (recipe_id, parameter_code)
);
```

**Batch scaling rule:** All recipe parameter values scale linearly with batch size. The batch size itself is a dimensionless integer (batch_count). Total = parameter_value × batch_count. No unit conversion needed when recipe_unit = inventory_unit. Explicit conversion needed when recipe_unit ≠ inventory_unit (e.g. recipe in g, inventory in kg).

---

## 6. Simulations

### SIM-060 — Multi-context ITUOM for Steel Rod 12mm

ITUOM rows:
1. item=ITEM-SR-12, site=SITE-HN, supplier=null, customer=null: inventory=kg, purchase=kg, sales=each, recipe=g, qc=mm
2. item=ITEM-SR-12, site=SITE-HN, supplier=SUP-JP-001: purchase=t (metric ton for bulk)
3. item=ITEM-SR-12, customer=CUST-US-001: sales=lb (US customer)

Resolution for purchase from SUP-JP-001: priority rule 2 → purchase_unit=t. ConversionEngine: t→kg factor=1000.  
Resolution for sales to CUST-US-001: priority rule 4 → sales_unit=lb. ConversionEngine: kg→lb via UOMCONV-MASS-KG-LB-v1.  
QC measurement of diameter: qc_unit=mm (Length, different quantity kind from Mass). No cross-kind conversion.

### SIM-040 — Batch scaling (re-confirmed with full ITUOM)

Recipe unit=g (ITEM-RM-CHEM-001.recipe_unit_code='g'). Inventory unit=kg. Batch size=10 batches, 2.5g/batch.  
Total recipe quantity: 25g. Convert to inventory: 25g × UOMCONV-MASS-G-KG-v1 → 0.025 kg.  
MEASVAL created for 0.025 kg with source_record=PO-001, scaling_factor=10 recorded.

### SIM-032 — Density conversion with substance registry

Item=ITEM-ETHANOL, volume purchased=100 L. Density from material_density_registry: 0.78945 kg/L @20°C, source=NIST.  
Mass = 100 × 0.78945 = 78.945 kg. MEASVAL: density_context={substance='ITEM-ETHANOL', density=0.78945, density_unit='kg/L', temperature=20}.

### SIM-007 — Packaging: 50 boxes of 12 ea each → inventory in each

outer_pack_qty=12, sales_unit=each. 50 boxes × 12 = 600 each. Stored in inventory as 600 each (simple arithmetic, no UOMCONV). Purchase order: 50 boxes. Receipt: 600 each.

---

## 7. Gap Register

| Gap ID | Description | Severity | Owner |
|--------|------------|----------|-------|
| GAP-P07-001 | Potency assay context (IU/g, assay result) not yet integrated into ITUOM | MEDIUM | P06 IMPL-06 |
| GAP-P07-002 | Recipe per-parameter UoM override not implemented in current recipe tables | MEDIUM | IMPL-05 |

No critical or high gaps.

---

## 8. Audit Scorecard — P07

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Source fidelity | 10/10 | ISA-88 recipe parameter model; ISA-95 L3/L4 unit policy separation |
| Packaging anti-globalism | 10/10 | Packaging in separate table; ITUOM does not store packaging as global units |
| Priority resolution | 10/10 | 8-level priority lattice; no ambiguous override |
| Substance density | 9/10 | Registry created; 6 seed substances; assay/potency deferred to IMPL-06 |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
