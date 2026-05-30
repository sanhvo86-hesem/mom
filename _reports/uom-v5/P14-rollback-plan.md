# P14 Rollback Plan

Prompt: P14
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P14 commit: 93046b7c5d8dbba9af8f2824e268baeb4206833d
Decision token: UOM_V5_P14_VALIDATION_READY_PACKAGE_COMPLETE

## Rollback Scope

Revert the P14 commit only. Expected affected files:

- `_reports/uom-v5/validation/*`
- `_reports/uom-v5/P14-traceability-matrix.csv`
- `mom/tests/Unit/Uom/UomValidationPackageP14Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P14-*`
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P14_commit_sha>`
2. Run `composer --working-dir=mom run test -- --filter 'UomValidationPackageP14|Uom'`
3. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
4. Regenerate AI index: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: rollback removes the validation evidence package and package tests.
- REPO_EVIDENCE: no runtime data, schema migration, or API write path is part of P14.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
