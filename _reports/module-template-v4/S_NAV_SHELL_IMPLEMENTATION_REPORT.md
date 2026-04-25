# Slice 0.5 Navigation Shell Implementation Report

## Summary
Implemented SH/DL/ML route rendering for the HMV4 fixture-backed navigation shell:

- `renderShellHome`
- `renderDomainLanding`
- `renderModuleLanding`

The prototype now renders `/ops`, `/ops/{domain}`, and `/ops/{domain}/{module}` from inline fixture data without live API calls or production portal navigation changes.

## Branch and working tree
- Branch: `codex/slice-0-5-navigation-shell`
- Requested base: `codex/second-slice-planning-from-dispatch-qa`
- Actual base note: requested base branch was missing after `git fetch`, so this branch was created from the current local HEAD per user follow-up.
- Working tree note: unrelated dirty files existed/appeared outside this slice, including EQMS PHP controllers, OpenAPI/routes/registry files, visual-regression files, and performance output. They are not part of the nav-shell commit.

## Files changed for this slice
- `mom/scripts/portal/73-module-template-v4-renderers.js`
- `tests/e2e/module-template-v4.spec.ts`
- `tests/e2e/module-template-v4-axe.spec.ts`
- `tests/e2e/module-template-v4-navshell.spec.ts`
- `tests/fixtures/module-template-v4/nav-shell-fixtures.json`
- `tests/fixtures/module-template-v4/pages/shell-home.html`
- `tests/fixtures/module-template-v4/pages/domain-landing.html`
- `tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html`
- `tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html`
- `tests/fixtures/module-template-v4/pages/module-landing.html`
- `tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html`
- `tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html`
- `tests/fixtures/module-template-v4/pages/module-landing-empty.html`
- `_reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md`

## Route classes covered
- SH at `/ops`
- DL at `/ops/quality-compliance`
- DL at `/ops/shopfloor-execution`
- DL unknown re-anchor at `/ops/unknown-domain`
- ML at `/ops/quality-compliance/quality-case-management`
- ML at `/ops/shopfloor-execution/dispatch-board`
- ML empty state at `/ops/quality-compliance/work-orders`

## Read-only / no-mutation checks
- Shell-home search input is disabled.
- Domain/module tiles are anchors only.
- No nav-shell mutation buttons or mutation-intent controls were added.
- Fixture pages inline JSON and do not call live APIs.

## Fixture coverage
- 3 domains.
- 7 fixture modules total.
- Full 14 x 46 inventory is deferred to a future slice.

## Validation
- `node --check` on portal scripts `70` through `74`: PASS
- JSON parse for `tests/fixtures/module-template-v4/**/*.json`: PASS, 13 files
- Production fixture load guard (`74-module-template-v4-fixtures` in `mom/portal.html`): PASS, absent
- Scoped forbidden-file guard for this slice: PASS
- Hex literal guard on `73-module-template-v4-renderers.js`: PASS
- Focused Playwright chromium (`module-template-v4.spec.ts`, `module-template-v4-navshell.spec.ts`, `module-template-v4-axe.spec.ts`): PASS, 63/63
- Full Playwright chromium command: PASS, 120/120
- `./composer test`: PASS, 562 tests, 4883 assertions, 1 skipped
- `./composer analyse -- --memory-limit=1G`: FAIL, 42 PHPStan errors in existing/dirty PHP controller files outside this slice
- `./composer check`: FAIL, same PHPStan errors as analyse

## PHPStan blocker summary
The PHPStan failures are outside the nav-shell files. Main clusters:

- `EqmsBatchReleaseController`, `EqmsCapaController`, `EqmsDocumentsController`, `EqmsEngineeringChangeController`, `EqmsInspectionController`, `EqmsNcrController`, and `EqmsTrainingController`: local `query()` method signature conflicts with `BaseController::query($key, $default)`.
- Existing additional controller debt in `EqmsAmlController`, `EqmsCsatController`, `EqmsEventsController`, `EqmsFaiController`, `EqmsLessonsLearnedController`, and `EqmsSamplingPlansController`.

## Decision
`NAV_SHELL_PASS_WITH_WARNINGS`
