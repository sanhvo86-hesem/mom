# P08 — ERP/MOM/MES/eQMS Domain Integration Blueprint

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P07)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

All 12 HESEM domains mapped to UoM subsystem integration points. Currency boundary contract defined (DEC-005 resolved). Per-domain integration contracts specified: which unit slot is used, which conversion category, which MEASVAL storage strategy. Finance boundary explicitly excluded from physical unit engine. Simulations executed.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Currency Boundary Contract (resolves GAP-005)

**Rule (DEC-005-CURRENCY):** Currency codes (VND, USD, EUR, JPY, CNY) are NOT units in the UoM engine.

```
uom_unit_catalog: no currency entries.
quantity_kind_code: Currency is NOT a recognized kind in UoM subsystem.
ConversionEngine: MUST reject any conversion request where from_unit OR to_unit has 
                  quantity_kind_code = 'Currency'. Emit: UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE.
```

Currency conversion lives in a separate FinancialRateService. Price-per-unit (VND/kg) is a composite: price (VND) is finance domain; per-unit (kg) is UoM domain. They are NOT merged.

**Anti-pattern blocked:** `price_per_kg = 50000 VND/kg` — the 'VND/kg' is NOT a unit in UoM. It is a finance quantity (price) associated with a physical unit (kg).

---

## 3. Domain Integration Map

### Domain 1: Master Data (master_data)

| Integration point | Unit slot used | MEASVAL | Notes |
|------------------|---------------|---------|-------|
| Item master: base unit | ITUOM.inventory_unit_code | No — policy only | Must reference uom_unit_catalog |
| Item master: purchase/sales/recipe/qc | ITUOM per slot | No | — |
| Item master: weight/dimensions | embedded columns with unit_code FK | Yes (Strategy A) | item_weight_measval JSONB |
| BOM line: quantity + unit | MEASVAL Strategy A | Yes | bom_line_quantity_measval JSONB |

### Domain 2: Planning & Production (planning_production)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Production order quantity | ITUOM.inventory_unit_code | Yes | po_quantity_measval JSONB |
| Work order operation: cycle time | Duration unit | Yes | operation_time_measval JSONB |
| Recipe parameter: active ingredient | ITUOM.recipe_unit_code | Yes | parameter_measval JSONB |
| Production output | inventory_unit | Yes | output_measval JSONB |
| Material consumption | inventory_unit | Yes | consumption_measval JSONB |
| Batch scaling | see P07 | Yes | scaling_factor in semantic_context |

### Domain 3: Quality Improvement (quality_improvement)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| IQC inspection measurement | ITUOM.qc_unit_code or spec unit | Yes — sub-table | Multiple per inspection record |
| OQC inspection | same | Yes | — |
| IPQC (in-process) | operation step unit | Yes | equipment context in semantic_context |
| Specification limit (USL/LSL) | spec definition unit | Yes | comparator field used |
| Nonconformance: defect dimension | qc_unit | Yes | NQCASE linking |
| CAPA measurement evidence | any relevant unit | Yes | digital_thread links to root MEASVAL |
| SPC control chart data point | qc_unit | Yes | measval_sub_table per chart |

### Domain 4: Inventory & Logistics (inventory_logistics)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Stock level | ITUOM.inventory_unit_code | Yes (Strategy C) | Fast analytics; canonical_magnitude indexed |
| Goods receipt quantity | purchase_unit → convert to inventory | Yes | receipt_measval JSONB |
| Stock movement | inventory_unit | Yes | movement_measval JSONB |
| Physical inventory count | inventory_unit | Yes | count_measval JSONB |
| Warehouse location capacity | Volume or Mass | Yes | capacity_measval JSONB |
| Shipping weight | Mass | Yes | ship_weight_measval JSONB |

### Domain 5: Procurement & Supplier Quality (procurement_supplier_quality)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| PO line quantity | ITUOM.purchase_unit_code | Yes | po_line_measval JSONB |
| Supplier CoA measurement | qc_unit (from supplier context) | Yes | Alias resolution: supplier unit string → canonical |
| IQC (incoming quality) | ITUOM.qc_unit_code | Yes | Linked to PO line MEASVAL |
| Supplier performance: defect rate | YieldPercentage or ScrapRate | Yes | rate_measval JSONB |

### Domain 6: Commercial & Customer (commercial_customer)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Sales order line quantity | ITUOM.sales_unit_code | Yes | so_line_measval JSONB |
| Customer complaint: defect measurement | qc_unit (from customer context) | Yes | Alias resolution: customer unit |
| Delivery note quantity | sales_unit | Yes | delivery_measval JSONB |
| Customer spec limits | customer-defined unit | Yes | spec MEASVAL with comparator |

### Domain 7: MES Execution (mes_execution)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Process parameter: temperature | ITUOM.qc_unit or equipment unit | Yes | High-frequency; Strategy C |
| Process parameter: pressure | Pressure kind unit | Yes | same |
| Process parameter: flow rate | VolumetricFlowRate or MassFlowRate | Yes | — |
| Material consumed at step | recipe_unit | Yes | — |
| WIP output quantity | inventory_unit | Yes | — |
| Equipment sensor reading | ExternalEngineeringUnitMapper output | Yes | OT integration point |

### Domain 8: Maintenance & EHS (maintenance_ehs)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Calibration: instrument reading | calibration unit (device unit) | Yes | cal_measval JSONB |
| Calibration: reference standard | reference unit | Yes | Linked MEASVAL pair |
| Calibration error/bias | same unit as measurement | Yes | TemperatureDifference for temp |
| EHS measurement: noise level | LogarithmicRatio (dB) | Yes | dB(A) with reference |
| EHS: chemical exposure | MassConcentration (mg/m³) | Yes | — |
| EHS: incident dimension | Length (m, mm) | Yes | SIM-181 |
| Preventive maintenance: run hours | Duration (h) | Yes | pm_trigger_measval |
| Equipment capability: rated load | Mass or Force | Yes | equipment_rating_measval |

### Domain 9: Traceability & Serialization (traceability_serialization)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| Lot quantity | inventory_unit | Yes | lot_quantity_measval |
| Serial item: weight | Mass | Yes | serial_weight_measval |
| Batch record: yield | YieldPercentage | Yes | batch_yield_measval |
| Chain-of-custody quantity | inventory_unit | Yes | custody_measval |

### Domain 10: Analytics (analytics)

| Integration point | Unit slot | MEASVAL | Notes |
|------------------|----------|---------|-------|
| KPI: OEE score | OEEScore (%) | Yes (Strategy C) | Fast aggregation |
| KPI: Production output | inventory_unit | Yes | Canonical magnitude indexed |
| KPI: Defect rate | ScrapRate (%) | Yes | — |
| SPC: Xbar chart | qc_unit | Yes | measval_json for full evidence |
| Analytics normalization: all quantities normalized to canonical unit before aggregation | canonical_unit | Derived | canonical_magnitude column |

### Domain 11: Finance (finance)

**Boundary:** Finance domain uses UoM unit codes as REFERENCE only (price per unit). The physical conversion engine does NOT process currency. The finance domain reads ITUOM to know the unit of the priced item. No UOMCONV applies to financial calculations.

### Domain 12: Core Infrastructure (core_infrastructure)

| Integration point | Notes |
|------------------|-------|
| audit_events | UoM events use existing audit_events table with event_type prefix 'UOM_' |
| roles.permissions | UoM mutation permissions stored in roles.permissions JSONB |
| Redis cache | uom_unit_catalog and uom_quantity_kind cached with TTL=3600s |
| RabbitMQ events | UoM_RULE_APPROVED, UoM_ALIAS_RESOLVED, UoM_CONVERSION_COMPUTED events |

---

## 4. Cross-Domain Conversion Flow

```
Domain A (e.g. Procurement, purchase_unit=lb)
    │
    │ receipt: quantity=100 lb
    ▼
ConversionEngine.normalize(100, 'lb', 'kg', context={item_id, lot_id})
    │
    ├── Step 1: Resolve ITUOM for item → inventory_unit='kg'
    ├── Step 2: Find UOMCONV: [lb_av]→kg, factor=0.45359237, category=exact_linear
    ├── Step 3: BCMath: 100 × 0.45359237 = 45.359237 kg
    ├── Step 4: MeasurementValueFactory.create() → MEASVAL with full evidence
    └── Step 5: Write to inventory_movement_records.quantity_measval

Domain B (e.g. Sales, sales_unit=each)
    │
    ├── ITUOM: item=ITEM-SR-12, sales_unit=each, inv_to_sales_rule: 1 each = 0.5 kg
    ├── Sales order: 200 each
    ├── Convert: 200 each × 0.5 kg/each = 100 kg
    └── MRB check: 100 kg inventory available → allocate
```

---

## 5. Simulations

### SIM-170 — IQC temperature measurement (domain: procurement/quality)

Domain: procurement_supplier_quality + quality_improvement.  
Supplier IQC: temperature reading from supplier = 98.6°F.  
ITUOM.qc_unit_code = 'Cel'. ConversionEngine: affine. Result: 37.0°C.  
MEASVAL stored in qc_inspection_results.measurement_value (JSONB).  
Trace_id links: qc_inspection → supplier_quality_control → purchase_order.

### SIM-181 — EHS incident dimension measurement

Domain: maintenance_ehs. EHS incident: gap measurement = 2.5 in.  
ITUOM: not relevant — EHS measurement unit = [in_i] (as recorded), display = mm.  
ConversionEngine: 2.5 in → 0.0635 m → display as 63.5 mm.  
MEASVAL stored in ehs_incident_records.measurement_value JSONB.

### SIM-032 — Procurement density conversion (goods receipt)

Domain: procurement. Receive 100 L ethanol. ITUOM.inventory_unit='kg'.  
DensityContextualConverter: density=0.78945 kg/L from material_density_registry.  
Mass = 78.945 kg. MEASVAL in goods_receipt.quantity_measval.

### SIM-040 — Production planning batch scaling

Domain: planning_production. PO 10 batches × 2.5g = 25g → 0.025 kg.  
MEASVAL in production_order.output_quantity_measval.

---

## 6. Gap Register

| Gap ID | Description | Severity | Owner |
|--------|------------|----------|-------|
| GAP-P08-001 | Analytics domain: high-frequency MES process parameters need batch MEASVAL insert (not per-row overhead) | MEDIUM | P16 IMPL-06 |
| GAP-P08-002 | Solar irradiance (W/m²) for EHS/HVAC not in P03 kind list | LOW | IMPL-01 extension |

No critical or high gaps.

---

## 7. Audit Scorecard — P08

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Domain coverage | 10/10 | All 12 domains; finance boundary explicitly defined |
| Currency boundary | 10/10 | DEC-005 re-confirmed; UoM engine rejects currency |
| Cross-domain conversion flow | 10/10 | Full flow from domain input through ITUOM→ConversionEngine→MEASVAL→storage |
| MES high-frequency concern | 8/10 | Flagged as GAP-P08-001; deferred to P16 for SLO design |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
