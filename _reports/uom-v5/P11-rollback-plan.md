# P11 Rollback Plan

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

## Rollback Scope

Revert the P11 commit only. Expected affected files:

- `mom/scripts/portal/80-uom-control-center.js`
- `mom/scripts/portal/81-uom-quantity-widget.js`
- `mom/tests/Unit/Uom/UomUiProjectionP11Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P11-*`
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P11_commit_sha>`
2. Run `node --check mom/scripts/portal/80-uom-control-center.js`
3. Run `node --check mom/scripts/portal/81-uom-quantity-widget.js`
4. Run `composer --working-dir=mom run test -- --filter 'UomUiProjectionP11|Uom.*Ui|QuantityWidget|ControlCenter'`
5. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
6. Regenerate AI index if source files change: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: rollback restores live-fetch default and removes the P11 UI projection locks.
- REPO_EVIDENCE: no database or backend write path is part of P11, so rollback is source-only.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
