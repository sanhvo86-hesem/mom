# P15 Audit Report

Prompt: P15
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P15 commit: 89b07a7cce1eb279a63cd03c08e419e37f4cf240
Decision token: UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY

## Static Audit

- REPO_EVIDENCE: policy mode is `shadow_proposal_only`.
- REPO_EVIDENCE: `overwrite_original_fields=false`.
- REPO_EVIDENCE: `guess_units_from_field_name=false`.
- REPO_EVIDENCE: missing unit action is quarantine backlog.
- REPO_EVIDENCE: rollback deletes shadow proposals only and never rewrites original records.
- REPO_EVIDENCE: vertical packs include quantity kinds, allowed units, contextual rules, and validation needs.
- REPO_EVIDENCE: sample dataset covers all required P15 simulations.

## Commands

- TEST_EVIDENCE: historical grep scan completed over `mom/database`, `mom/api`, and `mom/data`.
- TEST_EVIDENCE: `php -l mom/tests/Unit/Uom/UomBackfillVerticalP15Test.php` PASS.
- TEST_EVIDENCE: JSON decode for P15 policy/pack/scan/sample files PASS.
- TEST_EVIDENCE: `test -s _reports/uom-v5/P15-backfill-risk-register.md` PASS.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'UomBackfillVerticalP15|Backfill|Vertical|Uom'` PASS: 176 tests, 660 assertions, 1 skipped.
- TEST_EVIDENCE: `composer --working-dir=mom run analyse -- --memory-limit=1G` PASS.
- TEST_EVIDENCE: `php tools/scripts/ai-index/generate.php --verbose` PASS.
- TEST_EVIDENCE: `git diff --check` PASS.

## Gate Result

PASS_WITH_WARNINGS.
