# P13 Rollback Plan

Prompt: P13
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P13 commit: 52843a8248e10dbac5fee56ae280972ae272c96f
Decision token: UOM_V5_P13_ENTERPRISE_OPERABILITY_LOCKED

## Rollback Scope

Revert the P13 commit only. Expected affected files:

- `mom/api/services/Uom/UcumParser.php`
- `mom/data/registry/uom-operability-contracts.json`
- `mom/tests/Unit/Uom/UomOperabilityP13Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P13-*`
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P13_commit_sha>`
2. Run `php -l mom/api/services/Uom/UcumParser.php`
3. Run `composer --working-dir=mom run test -- --filter 'UomOperabilityP13|Uom'`
4. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
5. Regenerate AI index: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: rollback removes explicit UCUM expression length/complexity guard and P13 operability registry/tests.
- REPO_EVIDENCE: no database migration or runtime data mutation is part of P13.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
