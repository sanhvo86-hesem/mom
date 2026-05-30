# P03 Rollback Plan

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

## Runtime Rollback

Revert the P03 commit touching:

- `mom/api/services/Uom/ConversionRuleService.php`
- `mom/api/services/Uom/UomWorkflowService.php`
- `mom/api/services/Uom/UomImpactAnalysisService.php`
- `mom/api/services/Uom/UomDataQualityScanner.php`
- `mom/tests/Unit/Uom/UomLifecycleResolutionTest.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P03-*`
- `_reports/uom-v5/00-sequential-gate-ledger.json`

## Data Rollback

No DB migration or data write was introduced by P03.

## Operational Risk If Rolled Back

Rolling back reopens the P0 `version` vs `rule_version`, `active` vs `approved`, and stale cache-key defects recorded by P02.
