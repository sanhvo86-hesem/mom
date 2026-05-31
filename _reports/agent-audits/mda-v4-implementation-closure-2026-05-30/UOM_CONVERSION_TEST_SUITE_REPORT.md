# UOM Conversion Test Suite Report - P46

Prompt: P46 - UOM Measurement Authority Integration Closure
Branch: codex/mda-v4-implementation-closure-recovery-20260530
Date: 2026-05-30
Posture: pre-production runtime-readiness evidence only; not production-ready

## Runtime Probes Executed

| Probe | Result | Evidence |
|---|---:|---|
| BCMath extension availability | PASS | `php -r 'echo extension_loaded("bcmath") ...'` returned `bcmath yes` |
| UOM PHP syntax | PASS | `find mom/api/services/Uom -name '*.php' -exec php -l {} +` returned no syntax errors for 23 service files |
| UomController syntax | PASS | `php -l mom/api/controllers/UomController.php` included in earlier UOM lint pass and returned no syntax errors |
| PHPUnit UOM suite | BLOCKED | `composer --working-dir=mom run test -- --filter Uom` failed because `vendor/bin/phpunit` is missing in this worktree |
| MEASVAL hash/envelope probe | PASS | Manual `MeasurementValueFactory` probe returned SI normalization `1.000000000000000000000000000000`, rounding `ROUND_HALF_EVEN`, and 64-char SHA-256 audit hash |
| Affine temperature probe | PASS | Manual `AffineConverter` probe returned `98.6F_to_C=37.00` and `100C_to_F=212.00` |
| Decimal parser precision probe | PASS | Manual `DecimalString` probe preserved `9007199254740993e0 => 9007199254740993` and rejected injected magnitude after requiring `UomException.php` |

## Stop Rule Results

| Stop Rule | Result | Evidence |
|---|---|---|
| BLOCK if two UOM authorities exist | BLOCKED | Legacy `uom` and `mdm_uom_conversions` tables remain in older migrations; active runtime UOM authority is `uom_unit_catalog` / `uom_conversion_rule`, but command paths still accept raw `uom` fields |
| BLOCK if commands bypass canonical conversion | BLOCKED | Search found no live required command handlers using `ConversionEngine`, `ItemUomPolicyService`, or `MeasurementValueFactory` outside UOM controller/bridge |
| BLOCK if alias ambiguity does not quarantine | BLOCKED | Main `UomAliasResolutionService` queries `uom_alias ... ORDER BY supplier_id NULLS LAST LIMIT 1`, so multiple active canonical candidates are not quarantined |
| BLOCK if rounding/precision rules are undocumented or untested | PARTIAL | Rounding and precision are documented/tested in UOM classes, but full PHPUnit execution is blocked by missing `vendor/bin/phpunit` |

## Adversarial Finding

The UOM package on `origin/codex/uom-production-backend-clean-20260531` reports UOM V5 pre-production readiness, but its own P12 domain registry classifies supplier/customer/site live command enforcement as backlog. That is acceptable for UOM V5 scope, but it is not sufficient for P46 runtime-closure because P46 requires command-stack evidence across item, procurement, inventory, quality, MES, tooling, and cost.

## Decision

P46 cannot close the UOM P0 in this branch without editing the same UOM authority files currently changed by active UOM branches and without implementing domain command-stack wiring that later V4 prompts own. The safe output is a blocked runtime proof pack, not a partial code patch.

P46_BLOCKED_RUNTIME_AUTHORITY_RISK
