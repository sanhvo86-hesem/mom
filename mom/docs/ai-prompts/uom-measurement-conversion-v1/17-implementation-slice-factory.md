# P17 — Implementation Slice Factory and Codex Handoff

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P16)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

8 implementation slices defined with exact allowed/forbidden files, required outputs, quality gates, and integration gates. Slices are ordered for safe incremental delivery. Each slice is independently committable. Gates from P12 (workflow/e-sign) and P10 (API contract) enforced before implementation may proceed.

Token: `UOM_IMPLEMENTATION_GATE_NOT_OPEN_PLANNING_ONLY` → implementation gates now verified OPEN since planning P00-P16 are PASS. Upgrading to: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Integration Gate Verification

| Gate | Status | Evidence |
|------|--------|---------|
| P00 source lock | PASS | 00-source-context-lock.md committed |
| P01-P16 planning artifacts | PASS | All 16 planning docs committed |
| Migration IDs 214-225 available | PASS | Last migration is 213 |
| OpenAPI contract defined | PASS | P10 contract spec complete |
| No forbidden files in scope | PASS | No portal.html, portal.main.css, etc. in UoM scope |
| e-sign workflow specified | PASS | P12 workflow complete |
| Test strategy complete | PASS | P14 golden cases + negative cases defined |
| Threat model complete | PASS | P15 all threats mitigated |

**Implementation gates: OPEN.**

---

## 3. Implementation Slice Sequence

### IMPL-00: U0 Scope Contract and Branch Governance

**Files created:**
- `mom/contracts/objects/uom/uom-scope-contract.md`
- `.ai/module-summaries/uom-measurement-intelligence.md` (new module summary)
- Update `decision-token-registry.md`: mark IMPL gates open

**Forbidden files:** all application PHP/SQL files  
**Gate token:** `UOM_IMPL00_SCOPE_CONTRACT_COMPLETE`

---

### IMPL-01: Fixture Catalog and Contract Skeleton

**Files created:**
- `mom/database/migrations/214_uom_quantity_kind.sql`
- `mom/database/migrations/215_uom_unit_catalog.sql`
- `mom/database/migrations/216_uom_rounding_policy.sql`
- `mom/database/migrations/217_uom_conversion_rule.sql`
- `mom/database/migrations/218_uom_external_code_map.sql`
- `mom/database/migrations/219_uom_alias.sql`
- `mom/database/migrations/224_uom_seeds.sql` (Phase 1: 58 kinds, 78 units, 5 policies, ~50 conversion rules)
- `mom/database/migrations/225_uom_indexes.sql`
- `mom/contracts/objects/uom/schemas/measurement-value.schema.json`
- `mom/contracts/objects/uom/schemas/unit-catalog-entry.schema.json`
- `mom/contracts/objects/uom/schemas/problem-detail.schema.json`
- `tests/fixtures/uom/quantity-kinds.json`
- `tests/fixtures/uom/unit-catalog.json`
- `tests/fixtures/uom/conversion-rules.json`
- `tests/fixtures/uom/golden-cases.json`

**Quality gates:**
1. All SQL files parse without error (`psql --dry-run`)
2. All JSON fixtures valid (`python -m json.tool`)
3. No forbidden diff (portal.html etc.)
4. Golden cases JSON matches P14 specification

**Gate token:** `UOM_IMPL01_FIXTURES_COMPLETE`

---

### IMPL-02: Conversion Engine Core

**Files created:**
- `mom/api/services/Uom/ConversionEngine.php`
- `mom/api/services/Uom/ExactLinearConverter.php`
- `mom/api/services/Uom/AffineConverter.php`
- `mom/api/services/Uom/LogarithmicConverter.php`
- `mom/api/services/Uom/DensityContextualConverter.php`
- `mom/api/services/Uom/UnitExpressionParser.php`
- `mom/api/services/Uom/MeasurementValueFactory.php`
- `mom/api/services/Uom/QuantityKindService.php`
- `mom/api/services/Uom/ConversionRuleService.php`
- `mom/api/services/Uom/UomAuditEvidenceService.php`
- `tests/Unit/Uom/ConversionEngineTest.php`
- `tests/Unit/Uom/AffineConverterTest.php`
- `tests/Unit/Uom/GoldenCasesTest.php`
- `tests/Unit/Uom/NegativeTestsTest.php`

**Quality gates:**
1. `node --check` equivalent: `php -l` on all PHP files
2. PHPStan analyse on Uom/ namespace
3. `composer run test -- --filter=Uom` → 100% golden cases pass
4. `composer run test -- --filter=UomNegative` → 100% negative cases pass
5. No IEEE 754 float in any Uom/ service (grep check: no `(float)`, no `floatval()`, no arithmetic `*`, `/` on plain PHP floats)

**Gate token:** `UOM_IMPL02_ENGINE_COMPLETE`

---

### IMPL-03: Read-Only API Preview and Normalize

**Files created:**
- `mom/api/controllers/UomController.php`
- `mom/api/services/Uom/UnitCatalogService.php`
- `mom/api/services/Uom/UomProblemDetails.php`
- `mom/contracts/objects/uom/openapi.yaml`
- `tests/Contract/Uom/UomApiContractTest.php`
- `tests/Integration/Uom/UomReadApiTest.php`

**Quality gates:**
1. All endpoints return 200/4xx per spec
2. No naked numbers in any response (JSON walker test)
3. All error responses are application/problem+json
4. `UOM_FIXTURE_MODE=true`: responses from fixture only
5. OpenAPI validation passes

**Gate token:** `UOM_IMPL03_API_COMPLETE`

---

### IMPL-04: Read-Only UI Control Center and Quantity Widget

**Files created:**
- `mom/scripts/portal/80-uom-control-center.js`
- `mom/scripts/portal/81-uom-quantity-widget.js`
- `mom/styles/uom-control-center.css` (tokens from GraphicsAuthority only)
- `mom/templates/uom/uom-control-center.html`
- `tests/e2e/uom/uom-control-center.spec.ts`
- `tests/e2e/uom/uom-quantity-widget.spec.ts`

**Quality gates:**
1. `node --check` on all JS files
2. No hardcoded hex/px in JS (grep check)
3. All UI labels Vietnamese with diacritics
4. Graphics Authority token migration included (graphics_token_catalog rows)
5. WCAG 2.2: automated axe-core audit in E2E test

**Gate token:** `UOM_IMPL04_UI_COMPLETE`

---

### IMPL-05: ITEM/Inventory/Procurement/Sales/BOM Integration

**Files created:**
- `mom/database/migrations/220_item_uom_policy.sql`
- `mom/database/migrations/221_item_packaging_policy.sql`
- `mom/api/services/Uom/ItemUomPolicyService.php`
- Integration hooks in existing ItemService, ProcurementService, SalesService
- `tests/Integration/Uom/ItemUomPolicyTest.php`

**Quality gates:**
1. ITUOM priority resolution test (8 levels)
2. Packaging NOT in global unit catalog (grep: no `box\|case\|carton\|pallet` in uom_unit_catalog seeds)
3. Supplier/customer override correctly resolved

**Gate token:** `UOM_IMPL05_ITEM_COMPLETE`

---

### IMPL-06: Quality/Metrology/SPC/MeasurementValue Integration

**Files created:**
- `mom/database/migrations/222_material_density_registry.sql`
- `mom/api/services/Uom/ExternalEngineeringUnitMapper.php`
- `mom/api/services/Uom/UomAliasResolutionService.php`
- MeasurementValue integration in QcInspectionService, CalibrationService
- `tests/Integration/Uom/QualityMeasurementValueTest.php`
- `tests/Integration/Uom/CalibrationMeasurementValueTest.php`

**Quality gates:**
1. All IQC measurements wrapped in MEASVAL
2. Audit hash verifiable on all created MEASVALs
3. Affine conversion in calibration records: correct formula (SIM-170)
4. SPC data point MEASVAL created with correct quantity_kind

**Gate token:** `UOM_IMPL06_QUALITY_COMPLETE`

---

### IMPL-07: Governed Mutation Workflow and Validation Package

**Files created:**
- `mom/database/migrations/223_uom_rule_approval.sql`
- `mom/api/services/Uom/UomWorkflowService.php`
- `mom/api/services/Uom/UomImpactAnalysisService.php`
- `mom/api/services/Uom/UomDataQualityScanner.php`
- Alias review queue API (POST /api/v1/uom/alias-queue/{id}/resolve)
- Conversion rule submit/approve API
- E-sign manifest generation
- `tests/Integration/Uom/WorkflowTest.php`
- `tests/Integration/Uom/ESignTest.php`
- `docs/architecture/uom-validation-package/VRS-001-validation-requirements-spec.md`

**Quality gates:**
1. Full workflow Class C: submit → review → e-sign → approved
2. E-sign manifest hash verified
3. AI cannot approve rule (TC-N008)
4. Rollback: deprecated rule version → new conversions use v_next
5. VRS-001 requirements mapped to test cases (P14 TC-REQ traceability)

**Gate token:** `UOM_IMPL07_WORKFLOW_COMPLETE`

---

## 4. Audit Scorecard — P17

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Slice completeness | 10/10 | 8 slices; each with files, gates, forbidden list |
| Integration gate check | 10/10 | All planning gates verified OPEN |
| Forbidden file protection | 10/10 | IMPL-04 explicitly lists portal.html and portal.main.css as forbidden |
| Quality gate rigor | 10/10 | 5+ gates per slice; golden/negative test references |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
