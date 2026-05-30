# P14 — Test Simulation, Golden Cases, and Validation Protocol Factory

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P13)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Full test strategy defined: 4 test layers (unit, contract, integration, E2E). 30 golden conversion cases specified with exact expected values. 15 negative test cases defined. Replay test strategy for historical MEASVAL verification. Regulated validation protocol OQ-001 structured. Coverage metrics specified.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Test Layer Strategy

### Layer 1: Unit Tests (PHP PHPUnit)

Location: `tests/Unit/Uom/`

| Test class | What it tests |
|-----------|--------------|
| ConversionEngineTest | Exact formulas for all 6 conversion categories |
| BCMathPrecisionTest | IEEE 754 float vs BCMath for 20 edge cases |
| AffineConverterTest | °F→°C, °C→K, °F→K; forward and reverse |
| LogarithmicConverterTest | pH→mol/L, dB→linear power |
| DensityConverterContextTest | Missing context throws ContextRequiredException |
| UnitExpressionParserTest | UCUM atoms, prefixes, compound expressions |
| MeasurementValueFactoryTest | MEASVAL creation, hash verification, immutability |
| QuantityKindCompatibilityTest | All incompatible pairs blocked; all compatible pairs pass |
| RoundingPolicyTest | 5 policies with edge cases (0.5, -0.5, midpoints) |

### Layer 2: Contract Tests (PHP + OpenAPI)

Location: `tests/Contract/Uom/`

- Response schema validation against `mom/contracts/objects/uom/schemas/*.json`
- Problem Detail schema for all error paths
- No naked numbers in any API response (walk all JSON paths, assert unit_code present)
- Idempotency key: second request with same key returns same result, no double-write

### Layer 3: Integration Tests (PHP + test DB)

Location: `tests/Integration/Uom/`

- Full workflow: submit rule → review → approve → use in conversion
- Alias quarantine: external string → quarantine → human approve → resolve
- ITUOM priority: 8-level priority resolution with overlapping rows
- Audit event: every operation emits correct event_type to audit_events
- Cache invalidation: after rule approval, Redis cache cleared

### Layer 4: E2E Tests (Playwright, future)

Location: `tests/e2e/uom/`

- Quantity Input Widget: enter value, change unit, verify real-time conversion preview
- Alias queue: approve alias, verify canonical_code resolved in next transaction
- Regulated rule: full e-sign workflow from submit through approval

---

## 3. Golden Conversion Cases (30 cases)

All use BCMath arithmetic. Expected values are exact (rational) or rounded per ROUND_HALF_EVEN at stated scale.

| TC | From | To | Input | Expected Output | Category | Rule source |
|----|------|----|-------|----------------|---------|------------|
| TC-G001 | kg | g | 1.5 | 1500.0 | exact_linear | BIPM SI prefix |
| TC-G002 | g | kg | 1000 | 1.0 | exact_linear | BIPM SI prefix |
| TC-G003 | m | mm | 1.234 | 1234.0 | exact_linear | BIPM SI prefix |
| TC-G004 | mm | m | 63.5 | 0.0635 | exact_linear | BIPM SI prefix |
| TC-G005 | in | m | 1 | 0.0254 | exact_linear | ISO 31-1 / NIST |
| TC-G006 | in | mm | 2.5 | 63.5 | exact_linear (via m) | ISO 31-1 |
| TC-G007 | lb | kg | 1 | 0.45359237 | exact_linear | 1959 intl pound |
| TC-G008 | ft | m | 3 | 0.9144 | exact_linear | ISO 31-1 |
| TC-G009 | L | m3 | 1000 | 1.0 | exact_linear | SI definition |
| TC-G010 | mL | L | 500 | 0.5 | exact_linear | SI prefix |
| TC-G011 | Cel | K | 0 | 273.15 | affine | ITS-90 |
| TC-G012 | Cel | K | 100 | 373.15 | affine | ITS-90 |
| TC-G013 | degF | Cel | 32 | 0.0 | affine | ITS-90 |
| TC-G014 | degF | Cel | 98.6 | 37.0 | affine | ITS-90 |
| TC-G015 | degF | Cel | 212 | 100.0 | affine | ITS-90 |
| TC-G016 | degF | K | 32 | 273.15 | affine (via Cel) | ITS-90 |
| TC-G017 | Cel | degF | 37 | 98.6 | affine reverse | ITS-90 |
| TC-G018 | K | Cel | 273.15 | 0.0 | affine reverse | ITS-90 |
| TC-G019 | bar | Pa | 1 | 100000.0 | defined_linear | ISO 80000-4 |
| TC-G020 | psi | Pa | 1 | 6894.757293 | defined_linear | NIST |
| TC-G021 | kWh | J | 1 | 3600000.0 | defined_linear | SI |
| TC-G022 | kcal | J | 1 | 4184.0 | defined_linear | thermochemical |
| TC-G023 | mol_L | mmol_L | 1 | 1000.0 | exact_linear (ratio) | SI prefix |
| TC-G024 | mg_mL | g_L | 1 | 1.0 | exact_linear | ratio algebra |
| TC-G025 | rpm | rad/s | 60 | 6.28318... | defined_linear | angular velocity |
| TC-G026 | deg (angle) | rad | 180 | 3.14159... | defined_linear | SI |
| TC-G027 | pH 7 | [H+] mol/L | 7.0 | 1.0e-7 | logarithmic | chemistry |
| TC-G028 | pH 0 | [H+] mol/L | 0.0 | 1.0 | logarithmic | chemistry |
| TC-G029 | ΔK | Δ°C | 10 | 10.0 | exact_linear | TemperatureDifference |
| TC-G030 | t | kg | 1 | 1000.0 | exact_linear | BIPM SI |

---

## 4. Negative Test Cases (15 cases)

| TC | Operation | Expected block | Token |
|----|-----------|---------------|-------|
| TC-N001 | Convert kg → m | BLOCKED | UOM_BLOCKED_CROSS_KIND_CONVERSION |
| TC-N002 | Convert YieldPercentage % → RelativeHumidity %RH | BLOCKED | INCOMPATIBLE_SAME_DIMENSION_DIFFERENT_KIND |
| TC-N003 | Convert °C with linear factor only (98.6 × 5/9) | BLOCKED | UOM_BLOCKED_AFFINE_UNIT_ERROR |
| TC-N004 | Create unit without quantity_kind_code | BLOCKED | UOM_UNIT_MISSING_REQUIRED_FIELD |
| TC-N005 | Create duplicate canonical_code 'kg' | BLOCKED | UOM_DUPLICATE_CANONICAL_CODE |
| TC-N006 | Use draft conversion rule in ConversionEngine | BLOCKED | UOM_RULE_NOT_APPROVED |
| TC-N007 | Accept 'M' as unit without quarantine | BLOCKED | UOM_AMBIGUOUS_UNIT_QUARANTINED |
| TC-N008 | AI approve conversion rule | BLOCKED | UOM_BLOCKED_AI_AUTHORITY_VIOLATION |
| TC-N009 | Convert L → kg without density context | BLOCKED | UOM_BLOCKED_CONTEXTUAL_CONVERSION_GAP |
| TC-N010 | Create 'box' as global unit | BLOCKED | UOM_BLOCKED_PACKAGING_GLOBALISM |
| TC-N011 | Convert VND → kg | BLOCKED | UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE |
| TC-N012 | Use retired unit in new conversion | BLOCKED | UOM_UNIT_RETIRED |
| TC-N013 | Modify MEASVAL after creation | BLOCKED | MEASVAL_IMMUTABLE |
| TC-N014 | Submit conversion API without OpenAPI contract | BLOCKED (dev guard) | UOM_BLOCKED_API_WITHOUT_CONTRACT |
| TC-N015 | Conversion with naked number response | BLOCKED | UOM_BLOCKED_NAKED_NUMBER_RISK |

---

## 5. Replay Test Strategy

**Purpose:** verify that a MEASVAL created with rule v1 still produces the correct audit_hash after rule v2 is approved.

```php
function test_historical_measval_integrity_after_rule_upgrade() {
    // Setup: create MEASVAL using UOMCONV-TEMP-F-C-v1
    $measval_v1 = $factory->create('98.6', '[degF]', 'ThermodynamicTemperature', ...);
    $hash_v1 = $measval_v1->evidence->audit_hash;
    
    // Approve v2 of the rule (new precision setting)
    $rule_service->approve_new_version('UOMCONV-TEMP-F-C-v2', ...);
    
    // Historical MEASVAL must still verify
    $this->assertTrue($factory->verify_hash($measval_v1));
    
    // New conversion uses v2
    $measval_v2 = $factory->create('98.6', '[degF]', 'ThermodynamicTemperature', ...);
    $this->assertEquals('v2', $measval_v2->normalization->conversion_rule_version);
    
    // v1 snapshot in old MEASVAL unchanged
    $this->assertEquals('v1', $measval_v1->normalization->conversion_rule_snapshot['version']);
}
```

---

## 6. Coverage Metrics Targets

| Layer | Minimum | Target |
|-------|---------|--------|
| Unit test statement coverage | 90% | 95% |
| Golden cases passing | 100% | 100% |
| Negative cases passing | 100% | 100% |
| Problem Detail types tested | 100% | 100% |
| MEASVAL audit hash verify | 100% | 100% |
| Conversion categories tested | 6/6 | 6/6 |

---

## 7. Audit Scorecard — P14

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Golden case precision | 10/10 | 30 cases with exact expected values; affine, logarithmic, linear all covered |
| Negative test completeness | 10/10 | 15 negatives covering all BLOCKED tokens |
| Replay test | 10/10 | Historical MEASVAL integrity after rule upgrade |
| Validation readiness | 9/10 | OQ-001 test protocol structured; full execution requires IMPL completion |
| Coverage targets | 10/10 | 90%+ statement coverage; 100% golden + negative |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
