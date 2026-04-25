# HMV4 Visual Regression Tests

## What this checks
Pixel-level comparison of every fixture page against a captured baseline.
Fails if any change exceeds 100 pixels or 10% per-channel difference.

## How to run
```bash
cd tests/e2e
npm install --no-package-lock
npm run test:visual
```

## When a UI change is intentional
1. Make the visual change.
2. Run baseline update: `npm run test:visual-update`.
3. Review the new PNG diffs in `module-template-v4-visual.spec.ts-snapshots/`.
4. If they look correct, commit the new baselines.
5. If they look wrong, revert and adjust.

## Adding a new fixture page
The spec auto-discovers all pages in `tests/fixtures/module-template-v4/pages/*.html`.
After adding a new page, run `npm run test:visual-update` to capture its baseline.

## Cross-browser
Baselines currently captured for Chromium only. Per-browser baselines
will be added in a separate slice, the Stream D4 cross-browser matrix.
