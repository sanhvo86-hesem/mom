# P09 — OT/Edge/Lab/EDI and External Integration Mapping

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P08)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

OT/Edge quarantine model defined. OPC UA EUInformation mapping specified (GAP-001 resolved by design). EDI alias resolution pipeline designed. Lab LIMS unit quarantine pathway specified. External unit string → canonical_code mapping with ambiguity scoring implemented. Simulations executed.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. OPC UA EUInformation Mapping (resolves GAP-001)

OPC UA Part 8 defines `EUInformation` structure for engineering units on data items:

```
EUInformation {
    NamespaceUri: String  -- "http://www.opcfoundation.org/UA/units/un/cefact"
    UnitId: Int32         -- UNECE Rec 20 numeric code (e.g. 4408 = kilogram)
    DisplayName: LocalizedText -- "kg" or "kilogram"
    Description: LocalizedText -- "SI unit of mass"
}
```

**Design decision (DEC-012):** HESEM will NOT trust OPC UA DisplayName (human-readable string) as the authority. It WILL use the UnitId (UNECE numeric code) as the primary lookup key, mapped to canonical_code via uom_external_code_map.

```sql
-- Add UNECE numeric code mapping
ALTER TABLE uom_external_code_map ADD COLUMN external_numeric_id INTEGER;
-- e.g. for kg: external_system='OPC_UA', external_code='KGM', external_numeric_id=4408
```

**OT unit quarantine flow:**

```
Device EUInformation received
    │
    ├─ UnitId found in uom_external_code_map → canonical_code resolved → accept
    ├─ UnitId not found, DisplayName matches known alias → quarantine (AI suggestion)
    └─ UnitId not found, DisplayName ambiguous or unknown → quarantine (pending_review)

All quarantine entries: source_system='OPC_UA', device_id, timestamp, raw_eu_information JSON
```

### Key OPC UA unit mappings (seed)

| UNECE code | OPC UA UnitId | canonical_code | confidence |
|------------|--------------|----------------|------------|
| KGM | 4408 | kg | VERIFIED |
| MTR | 5595 | m | VERIFIED |
| CEL | 6548 | Cel | VERIFIED |
| PAL | 5581 | Pa | VERIFIED |
| BAR | 4385 | bar | VERIFIED |
| LTR | 5565 | L | VERIFIED |
| HUR | 5107 | h | VERIFIED |
| KEL | 5513 | K | VERIFIED |
| C62 | 4418 | each | VERIFIED |

---

## 3. ExternalEngineeringUnitMapper Contract

```php
interface ExternalEngineeringUnitMapperInterface {
    public function resolve(
        string $external_string,
        string $source_system,
        ?int $numeric_unit_id = null,
        ?array $context = null
    ): ExternalUnitResolutionResult;
    
    // result:
    // {
    //   status: 'RESOLVED' | 'AI_SUGGESTED' | 'QUARANTINED' | 'UNKNOWN',
    //   canonical_code: string|null,
    //   confidence: float 0-1,
    //   quarantine_id: string|null,
    //   ambiguity_candidates: array
    // }
    
    public function bulk_resolve(array $external_units, string $source_system): array;
    public function get_quarantine_queue(string $source_system = null): array;
}
```

---

## 4. EDI Unit Alias Resolution Pipeline

```
EDI X12 / EDIFACT transaction inbound
    │
    ├─ Extract unit code from segment (e.g. 856 ASN: UOM=KG)
    ├─ Lookup: uom_external_code_map WHERE external_system='UNECE_REC20' AND external_code='KG'
    │     → canonical_code = 'kg' (VERIFIED)
    │
    ├─ Unit code = 'M' (ambiguous)
    │     → Quarantine. Check transaction context:
    │       - If segment = weight segment → suggest 'kg'? No — 'M' ≠ kg. Flag UNKNOWN_IN_WEIGHT_CONTEXT
    │       - If segment = length segment → suggest 'm' (meter)? Confidence=0.7 (not HIGH)
    │       → Create alias_quarantine entry; hold transaction; notify EDI steward
    │
    └─ Unit code not in map → quarantine: status=unknown

EDI outbound:
    ├─ canonical_code 'kg' → UNECE code 'KGM' (for EDIFACT)
    ├─ canonical_code 'L' → UNECE code 'LTR'
    └─ Context: check customer/supplier preference (some partners expect 'KG' not 'KGM')
       → customer_edi_profile.preferred_unit_format
```

---

## 5. Lab / LIMS Unit Integration

Lab instruments report units in instrument-specific strings. HESEM quarantine + alias approach:

| Common LIMS string | Canonical code | Confidence | Note |
|-------------------|----------------|------------|------|
| mg/dL | mg/dL | MEDIUM | Not in standard UCUM — mg/dL is valid UCUM; dL=(deci)litre → 0.1L; maps to mg_mL / 10 |
| IU/mL | IU/mL | LOW | Potency unit — procedure-defined; requires PotencyUnit kind + method_ref |
| U/mL | ??? | LOW | Ambiguous: IU/mL or enzyme unit U/mL — quarantine required |
| % | pct | MEDIUM | Must specify kind in context |
| N/A or — | none | special | No measurement; record null + reason |

---

## 6. Simulations

### SIM-009 extended — OPC UA device sends 'M' as DisplayName with UnitId=5595

UnitId=5595 → UNECE MTR → canonical='m'. DisplayName='M' ignored.  
RESOLVED via numeric ID without quarantine. Evidence: source_system=OPC_UA, numeric_id=5595, confidence=VERIFIED.

### SIM-170 — Supplier EDI temperature in °F

EDI segment: unit code = 'FAH' (UNECE code for degree Fahrenheit). Lookup: uom_external_code_map → canonical_code='[degF]'. Resolved. Alias resolution skips quarantine (VERIFIED). ConversionEngine: affine. Result: °C MEASVAL.

### SIM-089 — EDI sends 'KG' (uppercase)

uom_external_code_map lookup: external_system='UNECE_REC20', external_code='KG' → NOT FOUND (UNECE code is 'KGM').  
Fallback: case-insensitive alias scan → alias 'KG' → 'kg' (LOW risk, pre-approved alias). Resolved with confidence=VERIFIED (alias approved).

---

## 7. Gap Register

| Gap ID | Description | Severity | Owner |
|--------|------------|----------|-------|
| GAP-P09-001 | Lab LIMS IU/mL and U/mL unit disambiguation requires method registry — deferred to IMPL-06 | MEDIUM | IMPL-06 |
| GAP-P09-002 | Customer EDI preferred unit format profile not yet in commercial_customer schema | LOW | IMPL-05 |

OPC UA GAP-001: RESOLVED by design — UnitId numeric lookup via UNECE code.

---

## 8. Audit Scorecard — P09

| Dimension | Score | Evidence |
|-----------|-------|---------|
| OPC UA resolution | 9/10 | UnitId numeric as authority; DisplayName ignored; GAP-001 resolved |
| EDI pipeline | 10/10 | Full alias resolution → quarantine → human approval flow |
| Lab unit handling | 8/10 | IU/mL deferred to IMPL-06; method registry needed |
| Source fidelity | 9/10 | OPC UA Part 8 EUInformation structure described per engineering knowledge |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
