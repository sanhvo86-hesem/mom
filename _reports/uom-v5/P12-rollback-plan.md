# P12 Rollback Plan

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

## Rollback Scope

Revert the P12 commit only. Expected affected files:

- `mom/data/registry/uom-domain-integration-contracts.json`
- `_reports/uom-v5/P12-domain-naked-number-backlog.json`
- `mom/tests/Unit/Uom/UomDomainIntegrationP12Test.php`
- `.ai/*` regenerated index files
- `_reports/uom-v5/P12-*`
- `_reports/uom-v5/00-orchestrator-state.md`

## Rollback Steps

1. `git revert <P12_commit_sha>`
2. Run `php -l mom/tests/Unit/Uom/UomDomainIntegrationP12Test.php` if the test remains present during conflict resolution.
3. Run `composer --working-dir=mom run test -- --filter 'UomDomainIntegrationP12|ItemUom|Inspection|Lot|WorkOrder|Uom'`
4. Run `composer --working-dir=mom run analyse -- --memory-limit=1G`
5. Regenerate AI index: `php tools/scripts/ai-index/generate.php --verbose`

## Expected Impact

- REPO_EVIDENCE: rollback removes P12 domain integration registry and controlled naked-number backlog.
- REPO_EVIDENCE: no runtime data, schema migration, or domain mutation path is part of P12.
- CONTROLLED_GAP: full `composer check` may still fail on unrelated KPI count drift after rollback.
