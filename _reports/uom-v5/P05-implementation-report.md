# P05 Implementation Report

Prompt: P05 Decimal Precision & Rule Resolution Engine
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

## Scope

- REPO_EVIDENCE: P05 touched only UoM decimal, engine dispatch, rule descriptor/evidence, contextual decimal temperature parsing, UoM tests, and reports.
- REPO_EVIDENCE: No UCUM parser, alias quarantine, UI, or API route rewrite was done; those remain P06/P10/P11.

## File Inventory Before

- `DecimalString.php`: already string-parsed scientific notation, but comments caused false positives in the float grep.
- `ConversionEngine.php`: supported identity, exact/defined/si-base-hop, affine, and logarithmic fall-through. Unsupported categories threw `UOM_NO_CONVERSION_PATH`, not deterministic category errors.
- `ConversionRuleService.php`: did not include factor exactness or effective-window evidence in the normalized rule descriptor.
- `MeasurementValueFactory.php`: MEASVAL did not record effective window, factor exactness, or explicit input/calculation/output precision envelope.
- `ContextualConversionPlanner.php` and `DensityContextualConverter.php`: contextual temperature used PHP floating-point type/cast.

## File Inventory After

- `ConversionEngine.php`
  - Added `CATEGORY_DISPATCH` for all DB categories.
  - Unsupported categories now throw `UOM_CATEGORY_NOT_SUPPORTED`.
  - `approximate_linear`, `dimensionless_strict`, and `ratio` are explicit linear handlers.
  - Affine direct/reverse paths remain formula-based.
  - Engine passes context `as_of`/`effective_date` and `context_hash` to rule resolution.
- `UomException.php`
  - Added `UomCategoryNotSupportedException`.
- `ConversionRuleService.php`
  - Rule descriptor now includes `factor_exact`, `effective_from`, `effective_to`, and `context_required`.
  - Synthetic SI hop refuses cross-kind and affine unit pairs.
- `MeasurementValueFactory.php`
  - Precision envelope now records `input_precision`, `calculation_scale`, `output_precision`, `rounding_policy_id`, and `factor_exact` while keeping legacy keys.
  - Evidence now records rounding policy, factor exactness, and effective window.
- `ContextualConversionPlanner.php` and `DensityContextualConverter.php`
  - Removed float parsing for contextual temperature; uses `DecimalString::parse()` and SQL numeric cast.
- `ConversionEngineP05Test.php`
  - Added required P05 simulations and category matrix coverage.
- `_reports/uom-v5/P05-category-dispatch-matrix.md`
  - Required matrix artifact.

## Commands And Results

- `grep -R "floatval\|doubleval\|(float)\|is_nan\|INF" mom/api/services/Uom mom/api/controllers/UomController.php`: PASS, no output.
- `php -l` for modified P05 PHP files: PASS.
- `composer --working-dir=mom run test -- --filter 'ConversionEngineP05|DecimalString|Affine|ExactLinear|MeasurementEvidence|ContextualConversionPlanner'`: PASS, 56 tests, 109 assertions.
- `composer --working-dir=mom run test -- --filter 'Uom|Decimal|Conversion'`: PASS, 117 tests, 227 assertions, 1 skipped.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `git diff --check`: PASS.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS, no material index delta after P05.
- `composer --working-dir=mom run check`: WARN, PHPStan passed, full PHPUnit failed on existing KPI registry assertion `148 is identical to 142`.

## Acceptance Gates

- No float in UoM conversion path: PASS.
- Scientific notation exact parse: PASS.
- Full category matrix: PASS.
- Unsupported categories deterministic: PASS.
- Affine direct/reverse formula: PASS.
- SI-hop constraints: PASS.
- Precision envelope and rule replay evidence: PASS.
- Full repository check: PASS_WITH_WARNINGS due unrelated KPI count drift.

## Residual Risk Ledger

- WARNING: `composer check` remains red on unrelated KPI registry count drift.
- CONTROLLED_GAP: API Problem Details mapping for `UOM_CATEGORY_NOT_SUPPORTED` remains P10.
- CONTROLLED_GAP: UCUM/QUDT/UNECE/OPC UA alias quarantine remains P06.
- CONTROLLED_GAP: Full contextual density/potency/packaging execution remains P08.
