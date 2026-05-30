# P13 Audit Report

Prompt: P13
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P13 commit: 52843a8248e10dbac5fee56ae280972ae272c96f
Decision token: UOM_V5_P13_ENTERPRISE_OPERABILITY_LOCKED

## Static Audit

- REPO_EVIDENCE: `DecimalString::parse()` rejects SQL/JS-like magnitude injection and exponent bombs before expansion.
- REPO_EVIDENCE: `UcumParser` now has byte and atom-count limits and rejects unicode/confusable and injection payloads.
- REPO_EVIDENCE: operability registry covers OWASP API/ASVS/ISA-62443 threats named by the prompt.
- REPO_EVIDENCE: authorization matrix separates preview/list/read from approve/e-sign/manifest/link actions.
- REPO_EVIDENCE: observability contract names spans and metrics for conversion, alias resolve, rule resolve, and MEASVAL creation.
- REPO_EVIDENCE: cache contract uses `as_of` and context/policy dimensions.
- REPO_EVIDENCE: replay contract requires original/canonical/display, rule version/effective fields, audit hash, and trace id.

## Commands

- TEST_EVIDENCE: `grep -R "trace_id\|span\|metric\|redis\|cache" mom/api/services/Uom mom/api/controllers` completed and confirmed existing trace/cache evidence.
- TEST_EVIDENCE: `php -l mom/api/services/Uom/UcumParser.php` PASS.
- TEST_EVIDENCE: `php -l mom/tests/Unit/Uom/UomOperabilityP13Test.php` PASS.
- TEST_EVIDENCE: JSON decode for operability registry PASS.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'Security|Auth|Uom|Fuzz|Telemetry'` WARN: selected existing KPI Authority test and failed on known KPI count drift.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'UomOperabilityP13'` PASS: 6 tests, 30 assertions.
- TEST_EVIDENCE: `composer --working-dir=mom run analyse -- --memory-limit=1G` PASS.
- TEST_EVIDENCE: `php tools/scripts/ai-index/generate.php --verbose` PASS.
- TEST_EVIDENCE: `git diff --check` PASS.

## Gate Result

PASS_WITH_WARNINGS.
