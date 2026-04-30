# V21 Cross-Browser Chromium Baseline Repair Plan

## Current Classification

`NO SNAPSHOT REPAIR AUTHORIZED OR PERFORMED`

Current local evidence is not visual drift. The Chromium suite and focused visual spec failed before rendering because the local Playwright Chromium headless shell is missing:

```text
/Users/a10/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

## Why This Is Not A Baseline Refresh

The prompt forbids automatic snapshot updates. This replay did not reach screenshot comparison, so there is no reviewed source render and no current visual-drift artifact that could justify baseline replacement.

## Required Repair Sequence

1. Install the matching Playwright Chromium browser from `tests/e2e`:

```bash
cd tests/e2e
npx playwright install chromium
```

2. Rerun the full Chromium suite:

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
```

3. If the full suite still fails, rerun focused diagnosis:

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test module-template-v4-visual.spec.ts --project=chromium --reporter=list
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test module-template-v4-live-api.spec.ts --project=chromium --reporter=list
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test module-template-v4-axe.spec.ts --project=chromium --reporter=list
```

4. Only if a rendered visual diff is reproduced and the source render is reviewed correct, ask for explicit approval before any snapshot refresh.

## Gate Impact

This blocks Stage F planning unlock in this replay, but it is classified as a local Playwright browser environment blocker rather than confirmed Chromium visual drift.
