# P08 Implementation Report

Prompt: P08 Contextual Conversion
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Scope

- REPO_EVIDENCE: P08 touched contextual conversion planner/execution, density context, potency context, packaging context, schema contract migration, API error titles, MEASVAL contextual evidence, tests, AI indexes, and reports.
- REPO_EVIDENCE: No historical mass backfill, UI screen, or domain recipe rollout was added.

## File Inventory Before

- `ContextualConversionPlanner` could classify density but potency/packaging were not executable.
- `ConversionEngine` rejected cross-kind Volume/Mass before planner execution.
- `DensityContextualConverter` used registry lookup by substance and temperature, but did not accept direct lot/material density evidence.
- No potency converter existed.
- No packaging converter existed.
- `item_packaging_policy` did not expose lifecycle/evidence columns used by P08 stale-policy guard.

## File Inventory After

- `ConversionEngine.php`
  - Invokes contextual planner before semantic compatibility rejection when context can govern density/potency/packaging.
  - Builds contextual MEASVAL evidence for `density_based`, `potency_assay`, and `packaging_policy`.
- `ContextualConversionPlanner.php`
  - Routes density, potency, and packaging conversions.
  - Returns context-required remediation for missing density, missing assay evidence, and missing packaging policy.
- `DensityContextualConverter.php`
  - Supports lot/material/item density context with direct density evidence or active registry lookup.
- `PotencyContextualConverter.php`
  - Adds IU-to-mass and mass-to-IU conversion using lot potency evidence.
- `PackagingContextualConverter.php`
  - Converts pack-to-each and each-to-pack through item/site/supplier/customer packaging policy.
- `ItemUomPolicyService.php`
  - Adds as-of aware packaging policy resolution and lifecycle filter.
- `MeasurementValueFactory.php`
  - Captures `context_required` and `contextual_evidence`.
- `260_uom_v5_contextual_conversion_contract.sql`
  - Adds density context metadata, packaging lifecycle/evidence fields, potency assay registry, IU/EA/BOX units, and context schemas for contextual rule categories.
- `ContextualConversionP08Test.php`
  - Covers required P08 simulations.

## Commands And Results

- `php -l` for modified P08 PHP files: PASS.
- `composer --working-dir=mom run test -- --filter 'ContextualConversionP08|ContextualConversionPlanner|Density|Potency|Packaging|ItemUom|Uom'`: PASS, 164 tests, 386 assertions, 2 skipped.
- `grep -R "density_based\|potency_assay\|packaging_policy" mom/api/services/Uom mom/database/migrations mom/tests/Unit/Uom`: REVIEWED.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS, migrations count now 240.
- `git diff --check`: PASS.
- `composer --working-dir=mom run check`: WARN, PHPStan passed; full PHPUnit failed on existing KPI registry count drift, `148 is identical to 142`.

## Acceptance Gates

- Contextual categories require context schema: PASS.
- L to kg without density context rejects with remediation: PASS.
- Lot density converts 1 L water at 1 kg/L to 1 kg: PASS.
- Potency/IU context converts 1000 IU by lot assay to mg: PASS.
- Packaging policy is item-specific: PASS.
- Expired packaging policy rejects: PASS.
- Full repository check: PASS_WITH_WARNINGS due unrelated KPI count drift.

## Residual Risk Ledger

- WARNING: `composer check` remains red on unrelated KPI registry count drift.
- CONTROLLED_GAP: P08 does not backfill historical measurements.
- CONTROLLED_GAP: Recipe/ISA-88 quantity state taxonomy is represented in context contract only; domain recipe rollout remains P12/P15.
- CONTROLLED_GAP: UI remediation remains P11.
