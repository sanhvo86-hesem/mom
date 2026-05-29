# P00 — Source Gap Audit

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Posture:** development/prototype → pre-production readiness

---

## Summary

| Category | Count |
|----------|-------|
| Sources verified (HIGH confidence) | 15 |
| Sources verified (MEDIUM confidence) | 5 |
| Controlled gaps | 5 |
| Critical gaps | 0 |
| High gaps | 0 |
| Medium gaps | 2 |
| Low gaps | 3 |

All medium and low gaps have been assigned to specific downstream prompts for resolution. No planning-blocking gaps identified.

---

## Gap Detail

### GAP-001 — OPC UA Part 8 EUInformation citation

| Field | Value |
|-------|-------|
| Severity | MEDIUM |
| Source | STD-012 |
| Description | OPC UA Part 8 (Data Access / EUInformation node) official URL not accessible during P00 session. Content inferred from engineering knowledge of OPC UA standard. The EUInformation structure: `NamespaceUri`, `UnitId`, `DisplayName`, `Description` — these fields are well-established in the OPC UA community but the exact node IDs and namespace URI for all SI units were not verified against official OPC 10000-8 specification. |
| Impact | P09 OT mapping will reference the EUInformation structure based on engineering inference until P09 agent confirms official source. Risk: EUInformation NamespaceUri constants may differ from inference. |
| Mitigation | P09 agent must read OPC 10000-8 at runtime before designing ExternalEngineeringUnitMapper. If URL still blocked, use OPC Foundation published CSV/XML companion specs. |
| Owner | P09 |
| Required evidence | OPC 10000-8 official spec URL, or OPC UA NodeSet companion file showing EUInformation structure |
| Next prompt | P09 |

---

### GAP-002 — PHP UCUM parser not present in repo

| Field | Value |
|-------|-------|
| Severity | MEDIUM |
| Source | STD-002 |
| Description | The HESEM repo has no PHP implementation of a UCUM expression parser. UCUM unit expressions like `mg/mL`, `kg.m/s2`, `Cel`, `[degF]` require a parser that understands term grammar, prefix multiplication, special units, and annotation syntax. Reference UCUM implementations exist in Java (hapi-ucum), JavaScript (ucum-lhc), and Python. A PHP port or fresh implementation is required. |
| Impact | Until IMPL-02 resolves this, the conversion engine cannot parse compound/derived unit expressions. Only pre-enumerated units can be handled in IMPL-01 (fixture catalog with explicit mappings). |
| Mitigation | IMPL-02 will build a PHP UnitExpressionParser class following UCUM grammar. Alternative: use a subprocess call to a Node.js UCUM library (less preferred — adds dependency). |
| Owner | IMPL-02 |
| Required evidence | PHP UnitExpressionParser class with test coverage for at least 20 UCUM expressions |
| Next prompt | IMPL-02 |

---

### GAP-003 — Custom quantity kind namespace for HESEM-specific kinds

| Field | Value |
|-------|-------|
| Severity | LOW |
| Source | STD-003 (QUDT) |
| Description | QUDT ontology does not define all quantity kinds needed for Vietnamese manufacturing context: e.g. `YieldPercentage`, `ScrapRate`, `OEE`, `CompletionPercentage`, `ConformanceRate`. These are dimensionless ratios but semantically distinct — must not be merged into a single QUDT Dimensionless kind. |
| Impact | P03 must define a HESEM custom quantity kind namespace (e.g. `hesem:YieldPercentage`) that extends QUDT structure. |
| Mitigation | P03 will define custom kinds with: code, label_vi, qudt_parent (Dimensionless), dimension_vector (1), semantic_guard (prevents cross-kind conversion). |
| Owner | P03 |
| Required evidence | HESEM custom quantity kind registry table with at least 10 manufacturing-specific dimensionless kinds |
| Next prompt | P03 |

---

### GAP-004 — ISA-88 recipe table structure not confirmed

| Field | Value |
|-------|-------|
| Severity | LOW |
| Source | STD-011 |
| Description | The HESEM planning_production domain has recipe/BOM tables but the specific column structure for recipe parameter units has not been examined at P00. The ISA-88 model requires per-parameter unit assignment in process formulas (master recipe → control recipe). |
| Impact | P07 item UoM policy may need to account for recipe-level unit overrides vs item-level base unit vs batch-level actual unit. |
| Mitigation | P07 agent must read planning_production domain schema from .ai/db-map/planning-production.json before designing Item UoM Policy for recipes. |
| Owner | P07 |
| Required evidence | planning_production recipe table schema excerpt; confirmed column names for unit fields |
| Next prompt | P07 |

---

### GAP-005 — Currency boundary with UoM engine not explicitly defined in existing code

| Field | Value |
|-------|-------|
| Severity | LOW |
| Source | ENGINEERING_INFERENCE |
| Description | The UoM engine must explicitly reject currency codes (VND, USD, EUR) as unit inputs. The current HESEM finance domain likely uses separate currency conversion logic. If a currency code accidentally enters the UoM engine (e.g. price per kg expressed as VND/kg), the engine must route to a currency/finance boundary rather than attempt physical unit conversion. |
| Impact | Without explicit currency boundary, a developer could accidentally route VND→USD through the UoM conversion engine. |
| Mitigation | P08 will define the finance domain boundary contract. The UoM unit catalog will mark currency codes with quantity_kind=Currency and a guard that blocks ConversionEngine routing for these codes. |
| Owner | P08 |
| Required evidence | Currency boundary contract in P08 output; negative test in P14 |
| Next prompt | P08 |

---

## Weak Source Inventory

| Source | Weakness | Risk level | Downstream mitigation |
|--------|----------|------------|----------------------|
| STD-012 OPC UA | URL not confirmed | MEDIUM | P09 re-verify |
| BENCH-001 SAP | Patterns inferred, not from SAP developer docs | LOW | Pattern used only as benchmark, not authority |
| BENCH-002 Oracle | Same as BENCH-001 | LOW | Same |
| BENCH-003 Siemens | Same | LOW | Same |
| BENCH-004 MasterControl | Same | LOW | Same |

---

## Sources Confirmed Available (HIGH confidence)

All 15 HIGH-confidence sources verified: HESEM repo (8 index files), Claude project memory, UoM Prompt OS pack, BIPM SI Brochure, UCUM spec, QUDT ontology, UNECE Rec 20, HL7 FHIR R5, OpenAPI 3.1, RFC 9457, FDA 21 CFR Part 11, EU GMP Annex 11, OWASP ASVS, WCAG 2.2, NIST AI RMF.

---

**P00 Source Gap Audit complete. No critical or high gaps. Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
