# P07 Implementation Report

Prompt: P07 Semantic Compatibility & QuantityKind Engine
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Scope

- REPO_EVIDENCE: P07 touched quantity-kind compatibility schema, quantity-kind guard service, semantic mismatch error detail, UoM controller problem detail extensions, tests, AI indexes, and reports.
- REPO_EVIDENCE: No contextual density/potency/packaging handler, UI remediation, or domain rollout was added.

## File Inventory Before

- `uom_quantity_kind` had `kind_code`, `parent_kind_code`, `dimension_vector`, labels, dimensionless flag, cross-kind flag, source, and notes. It did not expose measurement family, allowed-unit projection, risk, lifecycle, or semantic-parent audit columns.
- No `uom_quantity_kind_compatibility` table existed.
- `QuantityKindService::assertCompatible()` allowed same quantity kind and otherwise threw a basic mismatch exception. It had no active compatibility matrix lookup.
- `UomKindMismatchException` did not carry reason, remediation path, or trace id.

## File Inventory After

- `mom/database/migrations/259_uom_v5_quantity_kind_compatibility.sql`
  - Adds audit columns to `uom_quantity_kind`: `semantic_parent`, `measurement_family`, `allowed_unit_codes`, `risk_level`, `lifecycle_status`.
  - Creates `uom_quantity_kind_compatibility` with from/to kind, type, allowed flag, condition schema, owner, approval status, risk, remediation path, and effective window.
  - Seeds active DENY compatibility traps for Energy/Torque, absolute/delta temperature, dimensionless subtypes, and pH/Molarity where source kinds exist.
  - Registers `DeltaDegF` and the 5/9 temperature-difference rule in `pending_review`, preserving P04 human approval lock.
- `mom/api/services/Uom/QuantityKindService.php`
  - Joins quantity-kind metadata during unit lookup.
  - Allows cross-kind conversion only when an explicit active compatibility rule is allowed and unconditional.
  - Rejects explicit DENY rows with reason/remediation details.
  - Rejects conditional compatibility until a governed handler evaluates its schema.
- `mom/api/services/Uom/UomException.php`
  - Extends `UomKindMismatchException` with `fromKind`, `toKind`, `reason`, `remediationPath`, and `traceId`.
- `mom/api/services/Uom/ConversionEngine.php`
  - Resolves `as_of`/`trace_id` before compatibility checks and passes them into `QuantityKindService`.
- `mom/api/controllers/UomController.php`
  - Adds mismatch extension fields to Problem Details payloads.
- `mom/tests/Unit/Uom/QuantityKindCompatibilityP07Test.php`
  - Covers all required P07 simulations plus allowed and conditional compatibility behavior.

## Commands And Results

- `php -l` for modified P07 PHP files: PASS.
- `composer --working-dir=mom run test -- --filter 'QuantityKindCompatibilityP07|QuantityKind|Compatibility|Uom'`: PASS, 132 tests, 285 assertions, 1 skipped.
- `grep -R "dimension_vector.*==\|same dimension" mom/api/services/Uom`: REVIEWED, no dimension-vector equality guard; output is comments/remediation text only.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`: PASS, 0 errors.
- `php tools/scripts/ai-index/generate.php --verbose`: PASS, migrations count now 239.
- `git diff --check`: PASS.
- `composer --working-dir=mom run check`: WARN, PHPStan passed; full PHPUnit failed on existing KPI registry count drift, `148 is identical to 142`.

## Acceptance Gates

- Same quantity kind remains the default allow path: PASS.
- Cross-kind default reject unless active explicit compatibility rule exists: PASS.
- Energy/Torque same-dimension trap rejects: PASS.
- Absolute/delta temperature semantic split rejects: PASS.
- Delta Cel to Delta K linear 1:1: PASS.
- Absolute Cel to K affine: PASS.
- Yield percent to concentration percent rejects: PASS.
- pH to molarity rejects without logarithmic chemistry handler: PASS.
- Full repository check: PASS_WITH_WARNINGS due unrelated KPI count drift.

## Residual Risk Ledger

- WARNING: `composer check` remains red on unrelated KPI registry count drift.
- CONTROLLED_GAP: `DeltaDegF` conversion rule is registered `pending_review`; activation requires the governed human approval path locked in P04.
- CONTROLLED_GAP: `Stress`, `Work`, and `Moment` quantity kinds are not present in the current registry, so P07 cannot seed deny rows for absent pairs without inventing unused kinds.
- CONTROLLED_GAP: Contextual condition-schema handlers remain later prompt work.
