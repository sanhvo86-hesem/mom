# E2E_RUNNER_BOOTSTRAP_IMPLEMENTATION_PLAN.md

## Scope

Bootstrap an isolated Playwright runner for `module-template-v4` only.

No Wave 1 migration, production portal behavior, backend API, production registry, route grammar, workflow, screen contract, or HTML blueprint change is in scope.

## Files to add or update

```text
tests/e2e/package.json
tests/e2e/playwright.config.ts
tests/e2e/README.md
```

Existing `tests/e2e/module-template-v4*.spec.ts` files may be adjusted only if execution proves a path/server assumption mismatch.

Reports are generated under the ignored local report path:

```text
_reports/module-template-v4/E2E_RUNNER_BOOTSTRAP_REPORT.md
```

## Install commands

```bash
cd tests/e2e
npm install --no-package-lock
npx playwright install --with-deps chromium
```

## Test commands

```bash
cd tests/e2e
npm run test:hmv4 -- --project=chromium
```

## Browser and server strategy

Playwright runs from `tests/e2e` and starts:

```bash
php -S 127.0.0.1:8091 -t ../..
```

Base URL:

```text
http://127.0.0.1:8091
```

The repo root server makes `/mom/portal.html` and fixture pages available without modifying production runtime files.

## Why no root package.json

The runner is a scoped QA harness for HMV4. Adding a root `package.json` would be a broader repo-level tooling decision and is outside the V12 bootstrap scope.

## Production safety constraints

- Do not modify `mom/portal.html`.
- Do not modify forbidden CSS or portal shell JS files.
- Do not load `74-module-template-v4-fixtures.js` from production `portal.html`.
- Do not promote fixture registries to `mom/qms-data`.
- Do not add backend endpoints.

## Rollback and removal

```bash
rm -f tests/e2e/package.json tests/e2e/playwright.config.ts tests/e2e/README.md
rm -rf tests/e2e/node_modules .codex-playwright
```

If local spec-only fixes were made, revert those specific `tests/e2e/module-template-v4*.spec.ts` edits.
