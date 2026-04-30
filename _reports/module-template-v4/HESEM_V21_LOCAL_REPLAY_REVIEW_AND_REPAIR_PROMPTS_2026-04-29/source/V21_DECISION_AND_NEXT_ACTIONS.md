# V21 Decision And Next Actions

## Decision

`PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING`

## Why Not Pass Ready

The review proved static and portal safety, but did not prove full runtime readiness:

- Playwright Chromium could not launch because the local browser executable is missing.
- Backend analyse/test/check is not clean.
- The broader Chromium gate therefore cannot clear the historical cross-browser concern on current local evidence.

## Next Actions Before Stage F

1. From `tests/e2e`, install Playwright Chromium:

```bash
npx playwright install chromium
```

2. Rerun:

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
```

3. If Chromium fails after launching, run focused diagnosis and classify failures as visual drift, live-api behavior, accessibility, or non-V21 environment debt.

4. Resolve or formally classify backend gate failures:
- PHPStan 20 errors in EQMS controllers.
- PHPUnit DCC fallback-title assertion failure.

5. Do not refresh snapshots, enable live API by default, or change forbidden portal files without explicit approval.

## Stage F Unlock

NO.
