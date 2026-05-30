# P12 Audit Report

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

## Static Audit

- REPO_EVIDENCE: all required P12 roots are represented in `uom-domain-integration-contracts.json`.
- REPO_EVIDENCE: authority policy requires canonical unit, alias quarantine, AI read-only/advisory behavior, and no hidden commercial price/currency conversion.
- REPO_EVIDENCE: simulation contracts exist for supplier PO lb->kg, inspection inch->mm, batch release correction visibility, potency-adjusted work order recipe, and analytics drill-through.
- REPO_EVIDENCE: backlog entries identify concrete files with legacy `quantity/uom` or `unit_of_measure` surfaces.
- REPO_EVIDENCE: no operational domain write path was changed.

## Commands

- TEST_EVIDENCE: `grep -R "unit_code\|measurement_value\|quantity_kind\|uom" mom/api mom/scripts mom/data | head -300 || true` completed and informed backlog.
- TEST_EVIDENCE: `php -l mom/tests/Unit/Uom/UomDomainIntegrationP12Test.php` PASS.
- TEST_EVIDENCE: JSON decode for registry/backlog PASS.
- TEST_EVIDENCE: first focused test run found P12-D01 registry wording mismatch and repair was applied.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'UomDomainIntegrationP12|ItemUom|Inspection|Lot|WorkOrder|Uom'` PASS: 177 tests, 580 assertions, 1 skipped.
- TEST_EVIDENCE: `composer --working-dir=mom run analyse -- --memory-limit=1G` PASS.
- TEST_EVIDENCE: `php tools/scripts/ai-index/generate.php --verbose` PASS.
- TEST_EVIDENCE: `git diff --check` PASS.

## Gate Result

PASS_WITH_WARNINGS.
