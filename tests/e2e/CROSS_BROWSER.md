# HMV4 Cross-Browser Testing

## What This Checks

HMV4 visual and functional behavior on Chromium, Firefox, and WebKit.

## How To Run

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright install --with-deps
npm run test:cross-browser
```

## Updating Visual Baselines

Update only the browser whose rendering intentionally changed:

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=firefox --update-snapshots=all module-template-v4-visual.spec.ts
```

Inspect the diff PNGs before committing. If the difference is incorrect,
fix HMV4 source through ADR-0009 Graphics Authority tokens and semantic HTML;
do not add browser-conditional selectors.

## Browser-Specific Known Differences

- WebKit: focus-visible behavior on buttons can differ from Chromium.
- Firefox: subpixel font rendering can shift baselines by 1-2 pixels.
- Link visited state is normalized in the visual test with the HMV4 accent
  token so browser history cannot change visual baselines between runs.
- Normal rendering jitter is absorbed by `maxDiffPixels: 100` and
  `threshold: 0.1`.
