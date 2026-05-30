# P10 Audit Report

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Static Audit

- REPO_EVIDENCE: `mom/api/routes/uom-routes.php` UoM route list and `mom/api/openapi.yaml` now match for all route paths.
- REPO_EVIDENCE: OpenAPI remains `3.1.2`, matching the current repository baseline.
- REPO_EVIDENCE: `UomController::convert()` forwards `X-Trace-Id` and `Idempotency-Key` into the service context.
- REPO_EVIDENCE: Problem Details now include `type`, `title`, `status`, `detail`, `instance`, `trace_id`, `code`, `field_errors`, and `remediation`.
- REPO_EVIDENCE: `/api/v1/uom/rules/approve` and `/api/v1/uom/rules/activate` are not exposed.
- REPO_EVIDENCE: event contracts are registered for `uom.rule.submitted`, `uom.rule.approved`, `uom.rule.activated`, `uom.alias.quarantined`, `uom.measval.created`, and `uom.policy.changed`.

## No-Guess Checks

- TEST_EVIDENCE: focused P10 tests pass.
- TEST_EVIDENCE: PHP syntax checks pass for route, controller, and P10 test.
- TEST_EVIDENCE: PHPStan passes with 0 errors.
- TEST_EVIDENCE: AI index regeneration completed.
- TEST_EVIDENCE: `git diff --check` passes.

## Findings

- CONTROLLED_GAP: no production call or runtime database mutation was performed.
- CONTROLLED_GAP: OpenAPI response bodies remain permissive because current controller responses are envelope-like and not all fields are typed in existing code.
- CONTROLLED_GAP: full check has one unrelated KPI count failure, not introduced by P10.

## Gate Result

PASS_WITH_WARNINGS.
