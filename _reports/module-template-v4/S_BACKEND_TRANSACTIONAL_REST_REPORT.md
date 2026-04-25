# Stream C.2 Backend Transactional REST Report

Date: 2026-04-25
Branch: `codex/backend-transactional-rest`
Worktree: `/Users/a10/Documents/mom-backend-transactional-rest`

## Decision

`TRANSACTIONAL_REST_PASS_WITH_WARNINGS`

## Scope Completed

- Added canonical ADR-0008 plural-form transactional routes:
  - `/api/v1/sales-orders`
  - `/api/v1/job-orders`
  - `/api/v1/work-orders`
- Added route-level transition paths:
  - `/api/v1/sales-orders/{soNumber}:transition`
  - `/api/v1/job-orders/{joNumber}:transition`
  - `/api/v1/work-orders/{woNumber}:transition`
- Changed legacy `/api/orders/{sales,jobs,work}` REST paths to dedicated 301 redirect handlers.
- Preserved existing `OrderController` business methods; only additive wrappers/helpers were added.
- Added work-order list/detail projections through existing SO/JO/WO hierarchy data.
- Updated OpenAPI with a `Transactional Orders` tag and 15 canonical operations.
- Added 15 transactional endpoint-catalog entries and compact index rows.
- Added contract tests for canonical route registration/resolution and legacy redirect handlers.

## Important Implementation Notes

- Existing route params are camelCase (`{soNumber}`, `{joNumber}`, `{woNumber}`), while existing controller methods read snake_case query keys (`so_number`, `jo_number`, `wo_number`). Thin path-binding wrappers were required so canonical detail/update routes work without changing existing methods.
- `OrderController::transition()` requires JSON body keys `order_type`, `order_id`, and `target_status`. The canonical transition wrappers bind `order_type` and `order_id` from the URL and leave `target_status` in the caller body.
- The custom `Router` does not support closure handlers, so legacy redirects are additive `OrderController` handlers returning `301 Location`.
- No database schema or HMV4 frontend files were changed.

## Validation Evidence

| Check | Result | Evidence |
|---|---:|---|
| PHP syntax | PASS | `php -l` passed for `OrderController.php`, `rest-routes.php`, and both new contract tests. |
| Focused contract tests | PASS | `36 tests, 153 assertions` for `TransactionalRestTest` and `TransactionalLegacyRedirectTest`. |
| Endpoint catalog JSON | PASS | `jq` verified sales/job/work transactional entries; compact index contains 15 canonical SO/JO/WO path rows. |
| AI index regeneration command | PASS WITH NOTE | `php tools/scripts/ai-index/generate.php --verbose` completed; generated `.ai` churn was restored because `.ai/*` is outside this prompt allowlist. |
| Local curl smoke | WARNING | `php -S 127.0.0.1:8090 -t mom` returned `400 Bad Request` for direct `curl -I` requests to canonical and legacy paths in this local HEAD/front-controller setup. Contract tests prove router registration and redirect response behavior. |
| PHPStan | BLOCKED BY EXISTING DEBT | `./composer analyse -- --memory-limit=1G` reports 20 pre-existing EQMS-controller findings; none are in `OrderController` or C.2 route/test files. |
| Full PHPUnit | BLOCKED BY EXISTING SUITE EXIT | Full `phpunit` exits `255` before a normal summary in this environment; focused C.2 tests pass. |

## Files Changed

- `mom/api/controllers/OrderController.php`
- `mom/api/routes/rest-routes.php`
- `mom/api/openapi.yaml`
- `mom/data/registry/endpoint-catalog.json`
- `mom/data/registry/endpoint-catalog-index.json`
- `mom/tests/contract/TransactionalRestTest.php`
- `mom/tests/contract/TransactionalLegacyRedirectTest.php`
- `_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md`

## Rollback

All changes are additive route/controller/test/catalog/spec changes. Rollback is a normal revert of the Stream C.2 commit.
