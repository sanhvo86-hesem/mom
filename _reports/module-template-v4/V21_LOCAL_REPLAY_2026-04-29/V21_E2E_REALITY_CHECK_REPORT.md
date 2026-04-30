# V21 E2E Reality Check Report

## Result

`BLOCKED`

## Full Chromium Command

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
CHROMIUM_EXIT=$?
echo "CHROMIUM_EXIT=${CHROMIUM_EXIT}"
cd ../..
```

## Full Chromium Evidence

- `npm install --no-package-lock`: completed.
- Full Chromium suite discovered `491 tests`.
- Result: `CHROMIUM_EXIT=1`.
- Shared failure root:

```text
Error: browserType.launch: Executable doesn't exist at /Users/a10/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
Looks like Playwright was just installed or updated.
Please run the following command to download new browsers:
npx playwright install
```

## Focused Diagnosis

The required focused diagnosis commands were run:

- `module-template-v4-visual.spec.ts`: failed before render for the same missing Chromium executable.
- `module-template-v4-live-api.spec.ts`: `33 failed`, same missing Chromium executable.
- `module-template-v4-axe.spec.ts`: `125 failed`, same missing Chromium executable.

## Interpretation

This replay did not prove current visual drift. It failed before Chromium could launch, so no screenshot, accessibility, live-api, or rendered DOM evidence can be trusted as a current app regression.

This is an environment/toolchain blocker for the V21 gate. It prevents Stage F unlock until Chromium is installed and the suite is replayed.
