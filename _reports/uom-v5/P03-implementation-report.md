# P03 Implementation Report

Decision target: UOM_V5_P03_SCHEMA_SERVICE_LIFECYCLE_REPAIRED
Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.

## Scope

P03 repaired schema/service/lifecycle drift for UoM conversion-rule resolution and approval evidence. No migration was created because the current schema already has canonical `uom_conversion_rule.version`; the defect was service SQL drift.

## Files Modified

- `mom/api/services/Uom/ConversionRuleService.php`
- `mom/api/services/Uom/UomWorkflowService.php`
- `mom/api/services/Uom/UomImpactAnalysisService.php`
- `mom/api/services/Uom/UomDataQualityScanner.php`
- `mom/tests/Unit/Uom/UomLifecycleResolutionTest.php`
- `.ai/*` generated index files from `php tools/scripts/ai-index/generate.php --verbose`

## Repairs

1. REPO_EVIDENCE: `ConversionRuleService::resolve()` now accepts optional `asOf` and `contextHash`, uses cache key `uom:rule:v5:{from}:{to}:{as_of}:{context}:{active-approved-v1}`, and keeps a legacy prefix only for invalidation.
2. REPO_EVIDENCE: Direct/reverse rule queries now use `lifecycle_status IN ('active', 'approved')`, enforce `effective_from <= :as_of::date`, and enforce `(effective_to IS NULL OR effective_to > :as_of::date)`.
3. REPO_EVIDENCE: `UomWorkflowService::getApprovalStatus()`, `listPendingRules()`, and approval record creation now read `version AS rule_version` from `uom_conversion_rule`.
4. REPO_EVIDENCE: Approval joins now use `a.rule_version = r.version`.
5. REPO_EVIDENCE: Workflow cache invalidation removes old legacy direct/reverse keys and v5 current-date no-context direct/reverse keys.
6. REPO_EVIDENCE: `UomImpactAnalysisService` and `UomDataQualityScanner` were repaired where they used the old rule-version SQL shape.
7. TEST_EVIDENCE: Added `UomLifecycleResolutionTest` to lock resolver lifecycle/effective-window SQL and workflow alias joins.

## Diff Summary

- Runtime PHP repairs are localized to UoM services.
- No router, middleware, controller, OpenAPI, migration, UI, or runtime data mutation.
- AI index regenerated after PHP changes.

## Residual Warnings

- OUT_OF_SCOPE_BLOCKER: Manifest first-user/permission hardening remains P04.
- OUT_OF_SCOPE_BLOCKER: Full category dispatch matrix remains P05/P08.
- OUT_OF_SCOPE_BLOCKER: API/list/health lifecycle parity remains P10 unless P03 repair is expanded later.
- TEST_EVIDENCE: Full `composer check` is red on unrelated KPI test `KpiEngineAuthorityRegistryTest::testCatalogExposesDocumentAndBackendCoverage` expected 142 but got 148.

Decision: PASS_WITH_WARNINGS and can advance to P04.
