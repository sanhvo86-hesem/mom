# P10 Rollback Plan

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Rollback Scope

If P10 must be reverted, revert the P10 commit only. Expected affected files:

- `mom/api/openapi.yaml`
- `mom/api/controllers/UomController.php`
- `mom/data/registry/uom-event-contracts.json`
- `mom/tests/Unit/Uom/UomApiContractP10Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P10-*`
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P10_commit_sha>`
2. Run `php -l mom/api/routes/uom-routes.php`
3. Run `php -l mom/api/controllers/UomController.php`
4. Run `composer --working-dir=mom run test -- --filter 'UomApiContractP10|Uom.*Api|ProblemDetails|OpenApi'`
5. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
6. Regenerate AI index if controller/OpenAPI files changed: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: Reverting P10 removes UoM OpenAPI route coverage and static parity tests.
- REPO_EVIDENCE: No database migration or production runtime mutation is part of P10, so rollback is source-only.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
