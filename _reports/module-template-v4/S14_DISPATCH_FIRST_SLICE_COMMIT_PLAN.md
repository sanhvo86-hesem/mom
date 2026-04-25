# S14 Dispatch First Slice Commit Plan

## Summary

V14 QA was run on branch `codex/module-template-v4-step10-5-hardening`.

No commit was created. The current uncommitted changes are limited to HMV4 renderer, fixture, E2E, and report files.

## Current Provenance

Current branch log head:

```text
a5f4d3c7 Add dispatch board prototype slice fixtures and tests
383f3327 test(module-template): fix v4 fixture asset paths
57788196 feat(module-template): add v4 portal prototype assets
4d894c08 test(module-template): add v4 registry fixtures
```

The branch already contains the Step 9, Step 10.5, V12 E2E harness, and V13 dispatch first-slice work. The V13 dispatch implementation appears consolidated in commit `a5f4d3c7` with fixture hardening and E2E harness files rather than split into separate commits.

## Working Tree Classification

| Group | Status | Files |
|---|---|---|
| Step 10.5 fixture hardening | Already committed on this branch, consolidated in `a5f4d3c7` | `tests/fixtures/module-template-v4/**` |
| V12 E2E harness | Already committed on this branch, consolidated in `a5f4d3c7` | `tests/e2e/package.json`, `tests/e2e/playwright.config.ts`, `tests/e2e/README.md`, `tests/e2e/module-template-v4*.spec.ts` |
| V13 dispatch first-slice changes | Already committed on this branch, consolidated in `a5f4d3c7` | `mom/scripts/portal/73-module-template-v4-renderers.js`, dispatch fixtures, dispatch E2E specs |
| V14 dispatch QA fixes | Uncommitted | `mom/scripts/portal/73-module-template-v4-renderers.js`, `tests/e2e/module-template-v4.spec.ts`, `tests/e2e/module-template-v4-accessibility.spec.ts`, `tests/fixtures/module-template-v4/dispatch-board-fixtures.json`, `tests/fixtures/module-template-v4/route-fixtures.json`, `tests/fixtures/module-template-v4/pages/workspace-board-empty.html`, `tests/fixtures/module-template-v4/pages/workspace-board-degraded.html`, `_reports/module-template-v4/S14_*` |
| Unrelated changes | None observed | N/A |

## Recommended Commit Grouping

If preserving the current branch history:

1. Commit existing branch state is already represented by:
   - `4d894c08` registry fixtures.
   - `57788196` Step 9 v4 portal prototype assets.
   - `383f3327` fixture asset-path fix.
   - `a5f4d3c7` consolidated Step 10.5, V12 E2E harness, and V13 dispatch first-slice work.
2. Commit V14 as a new focused QA commit:
   - `test(module-template): harden dispatch board first-slice QA fixtures`

If rewriting or cherry-picking into a review branch, the cleaner grouping is:

1. Step 10.5 fixture hardening.
2. Isolated E2E harness.
3. Dispatch board first-slice implementation.
4. Dispatch QA stabilization and coverage fixes.

## Commit Guidance

- Do not commit from this prompt without explicit user approval.
- Keep V14 QA fixes separate from the already committed V13 slice if possible.
- Do not include `tests/e2e/node_modules`.
- Do not modify or commit forbidden core portal files.
- Treat reports under `_reports/module-template-v4/` as local QA artifacts unless report-persistence policy changes.

