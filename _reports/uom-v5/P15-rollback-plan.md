# P15 Rollback Plan

Prompt: P15
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P15 commit: 89b07a7cce1eb279a63cd03c08e419e37f4cf240
Decision token: UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY

## Rollback Scope

Revert the P15 commit only. Expected affected files:

- `mom/data/registry/uom-backfill-shadow-policy.json`
- `mom/data/registry/uom-vertical-packs.json`
- `_reports/uom-v5/P15-*`
- `mom/tests/Unit/Uom/UomBackfillVerticalP15Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P15_commit_sha>`
2. Run `composer --working-dir=mom run test -- --filter 'UomBackfillVerticalP15|Uom'`
3. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
4. Regenerate AI index: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: rollback removes backfill policy, vertical packs, scan evidence, sample dataset, tests, and P15 reports.
- REPO_EVIDENCE: no original historical data or real shadow proposal rows are created by P15, so rollback is source-only.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
