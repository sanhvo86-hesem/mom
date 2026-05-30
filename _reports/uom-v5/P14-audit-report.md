# P14 Audit Report

Prompt: P14
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P14 commit: 93046b7c5d8dbba9af8f2824e268baeb4206833d
Decision token: UOM_V5_P14_VALIDATION_READY_PACKAGE_COMPLETE

## Static Audit

- REPO_EVIDENCE: URS includes intended use, regulated scope, non-regulated scope, user roles, records, signatures, audit trail, and reports.
- REPO_EVIDENCE: FRS/DS include architecture, data model, workflow, API, UI, security, audit, e-sign, backup/restore, and time assumptions.
- REPO_EVIDENCE: FMEA covers wrong conversion, naked number, alias ambiguity, stale rule, unauthorized approval, audit tamper, and AI overreach.
- REPO_EVIDENCE: traceability maps URS -> FRS -> DS -> protocol -> result -> evidence file.
- REPO_EVIDENCE: IQ/OQ/PQ protocols and test report exist.
- REPO_EVIDENCE: Part 11/Annex 11 control matrix covers electronic records, audit trail, signature manifestation, signer identity, validation lifecycle, change/config evidence, incident/deviation, and continuity.
- REPO_EVIDENCE: deviation log records KPI suite drift, P12 naked-number backlog, P13 telemetry gap, and PQ site-execution gap.

## Commands

- TEST_EVIDENCE: `php -l mom/tests/Unit/Uom/UomValidationPackageP14Test.php` PASS.
- TEST_EVIDENCE: `test -s _reports/uom-v5/P14-traceability-matrix.csv` PASS.
- TEST_EVIDENCE: `grep -R "signature_meaning\|audit\|traceability\|URS\|OQ\|PQ" ...` PASS.
- TEST_EVIDENCE: first P14 package run failed on missing CSV posture phrase, repair applied.
- TEST_EVIDENCE: `composer --working-dir=mom run test -- --filter 'UomValidationPackageP14'` PASS: 6 tests, 65 assertions.
- TEST_EVIDENCE: `composer --working-dir=mom run analyse -- --memory-limit=1G` PASS.
- TEST_EVIDENCE: `php tools/scripts/ai-index/generate.php --verbose` PASS.
- TEST_EVIDENCE: `git diff --check` PASS.

## Gate Result

PASS_WITH_WARNINGS.
