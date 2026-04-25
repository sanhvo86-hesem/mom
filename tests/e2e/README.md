# Module Template V4 E2E Harness

This directory contains an isolated Playwright runner for `module-template-v4`.

## Scope

- Runs only from `tests/e2e`.
- Serves the repository root with PHP so `/mom/portal.html` and fixture pages are available.
- Does not add a root `package.json`.
- Does not load `74-module-template-v4-fixtures.js` in production `mom/portal.html`.
- Does not migrate Wave 1 modules or add backend endpoints.

## Install

```bash
npm install --no-package-lock
npx playwright install --with-deps chromium
```

## Run

```bash
npm run test:hmv4 -- --project=chromium
```

The Playwright config starts:

```bash
php -S 127.0.0.1:8091 -t ../..
```

Base URL:

```text
http://127.0.0.1:8091
```

## Artifacts

Test artifacts are written to:

```text
../../.codex-playwright/
```

That path is ignored by the repository.
