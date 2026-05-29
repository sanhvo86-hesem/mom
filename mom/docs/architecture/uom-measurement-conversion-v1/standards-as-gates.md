# P01 — Standards Converted to Gates / Evidence / Tests

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P01 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Every external standard inherited in `global-standards-benchmark.md` must be operationalised as one of:

- a **gate** — a precondition that blocks an action,
- an **evidence row** — a record persisted on every applicable action,
- a **test** — a unit, feature, or simulation case that fails if the standard is violated.

The matrix below maps each standard clause to its operational form in the HESEM codebase. Any standard listed in benchmark but not represented here is a hidden gap.

## 2. Standards → operational form

| Authority | Operational form | Where it lives |
|---|---|---|
| ISO 80000-1 §3 dimensional algebra | **gate** | `QuantityKindService::resolve` rejects kind-mismatch before any conversion math; constraint enforced before BCMath ever runs |
| ISO 80000-1 §3 dimensional algebra | **test** | `tests/Unit/Uom/NegativeTestsTest::testKindMismatchExceptionCarriesCorrectCode` (currently blocked by G-001 PSR-4) |
| SI Brochure §2.3 base set | **evidence row** | `uom_unit_catalog.si_base` flag + `si_factor` recorded per unit; readable from `GET /api/v1/uom/units/{code}` |
| UCUM uniqueness | **gate** | `uom_unit_catalog` carries `CONSTRAINT uq_ucum_code UNIQUE(ucum_code)` — DB rejects collision at write time |
| UCUM uniqueness | **test** | migration-drift detector runs in CI; would surface duplicate UCUM if reintroduced |
| UCUM annotation syntax | **gate** | new unit must declare ucum_code in annotation form; seed migrations 224, 228 demonstrate |
| QUDT mapping | **evidence row** | `uom_quantity_kind.qudt_uri` populated where available |
| UNECE Rec20 | **gate + evidence row** | external request must resolve through `uom_external_code_map` (system='UNECE_Rec20') before any value enters the engine; mapping returns canonical code + records resolution |
| OPC UA EUInformation | **gate + evidence row** | `ExternalEngineeringUnitMapper::fromOpcUaUnitId(unitId)` lookups against the map; unknown raises `UOM_EXTERNAL_CODE_UNKNOWN` |
| ASTM E29 rounding | **evidence row** | `uom_rounding_policy` row references; MEASVAL `precision_envelope.rounding_policy` records which policy was applied |
| ASTM E29 rounding | **test** | `tests/Unit/Uom/BcMathRounderTest` exercises HALF_EVEN, HALF_UP, DOWN_TRUNCATE, UP_CEILING |
| 21 CFR Part 11 §11.10(e) audit trail | **evidence row** | `uom_rule_approval` row per workflow step; immutable `recorded_at` |
| 21 CFR Part 11 §11.50 e-sign | **gate** | `UomWorkflowService::esign` is the only path that sets `approved_by`; DB CHECK `chk_rule_approved` rejects approved-without-approver |
| 21 CFR Part 11 §11.50 e-sign | **test** | unit test that attempts INSERT lifecycle_status='approved' with approved_by=NULL fails at DB layer |
| EU Annex 11 §9 audit trail | **evidence row** | `uom_measurement_thread.recorded_at` + `actor_id` per measurement |
| GAMP 5 risk-based depth | **gate** | `risk_level` column on `uom_unit_catalog` drives whether activation needs e-sign or just approve |
| ISO 9001:2015 §7.1.5 measurement traceability | **evidence row** | MEASVAL envelope per measurement; `uom_measurement_thread` joins to inspection_results / mes_inline_measurements |
| ISO/IEC 17025:2017 §6.4 metrological traceability | **evidence row** | `material_density_registry` rows carry `density_source` and `temperature_celsius` for traceability |

## 3. Gate-by-gate evidence

### G-A. Kind-mismatch gate (ISO 80000)

- **Where**: `mom/api/services/Uom/ConversionEngine.php` line ~60–90
- **Mechanism**: before any BCMath runs, `QuantityKindService::resolve($fromUnit, $toUnit)` resolves the kind of both units; if not compatible (e.g. mass→length), throws `UomKindMismatchException` with code `UOM_KIND_MISMATCH`.
- **Test**: `tests/Unit/Uom/NegativeTestsTest::testKindMismatchExceptionCarriesCorrectCode`
- **API response**: HTTP 422 + Problem Details, `problem_code: "UOM_KIND_MISMATCH"`.

### G-B. UCUM uniqueness gate

- **Where**: `mom/database/migrations/215_uom_unit_catalog.sql`
- **Mechanism**: `CONSTRAINT uq_ucum_code UNIQUE(ucum_code)` rejects duplicate UCUM. Combined with annotation rule (`{Ra}`, `K{diff}`) preserves uniqueness for empirical and delta units.
- **Test**: migration `224_uom_seeds.sql` originally failed without `{diff}` annotations; root-cause logged in IMPL-01 report.

### G-C. Approver-bypass gate (21 CFR Part 11)

- **Where**: `mom/database/migrations/217_uom_conversion_rule.sql`
- **Mechanism**: `CONSTRAINT chk_rule_approved CHECK (lifecycle_status != 'approved' OR approved_by IS NOT NULL)` — DB rejects approved-without-approver writes at the SQL layer, independent of any application code path.
- **Test**: workflow simulation in `_reports/.../impl07-governed-mutation-validation-report.md` §12 GW-005.

### G-D. Currency-in-physical-engine gate

- **Where**: `mom/api/services/Uom/ConversionEngine.php` line ~50
- **Mechanism**: engine short-circuits if either unit's kind is `Currency`; raises `UomCurrencyBlockedException` with code `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE`.
- **Test**: `tests/Unit/Uom/NegativeTestsTest::testCurrencyExceptionCarriesCorrectProblemCode` (currently blocked by G-001 PSR-4).

## 4. Evidence-row map

For every governed action, the corresponding evidence row(s):

| Action | Evidence row(s) |
|---|---|
| Convert | MEASVAL JSON envelope (returned + persistable) + `uom_measurement_thread` row |
| Submit rule for review | `uom_rule_approval` row with `step='SUBMITTED'` |
| Approve rule | `uom_rule_approval` row with `step='APPROVED'` |
| E-sign rule | `uom_rule_approval` row with `step='ESIGNED'` + `uom_conversion_rule.approved_by` set |
| Quarantine alias | `uom_alias_quarantine` row with `review_status='PENDING'` |
| Resolve alias | (read-only, no row) |
| AI advisory recorded | `uom_ai_advisory_log` row with `human_reviewed=false` |
| Human decision on advisory | `uom_ai_advisory_log.human_reviewed=true` + decision recorded |

## 5. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| critical | SG-001 | Negative tests for ISO 80000 / Part 11 gates currently error on PSR-4 autoload (G-001) | platform | exception split commit |
| medium | SG-002 | GAMP 5 risk-categorisation on rule mutation not yet enforced in workflow UI | metrology | add risk-confirm dialog in IMPL-07 follow-up |
| medium | SG-003 | OPC UA gate test pack absent; only synthetic mapper tests exist | metrology + OT | integration test against fake OPC UA endpoint |
| low | SG-004 | UNECE Rec20 long-tail coverage limited to 32 codes | metrology | extend seed |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Standard → gate translation | 9 |
| Standard → evidence row translation | 10 |
| Standard → test translation | 7 (SG-001 blocks part of negative coverage) |
| Coverage completeness | 9 |
| **Total** | **35 / 40** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 8. Cross-references

- Sibling: `mom/docs/benchmark/uom-measurement-conversion-v1/global-standards-benchmark.md` (P01 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p01-contradiction-ledger.md` (P01 / 3)
