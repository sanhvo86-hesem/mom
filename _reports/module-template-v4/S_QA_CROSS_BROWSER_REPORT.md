# S_QA_CROSS_BROWSER_REPORT — HMV4 Cross-Browser Matrix

**Pack**: 4 — Stream D4 (Cross-browser matrix)
**Branch**: `codex/second-slice-planning-from-dispatch-qa` (bundled with D2/D3/D5)
**Date**: 2026-04-25

---

## Summary

`tests/e2e/playwright.config.ts` extended with Firefox and WebKit
projects. Visual regression baselines generated for each browser
(13 PNGs × 3 browsers = 39 baselines). Performance baseline restricted
to Chromium (uses Chromium-specific PerformanceObserver entries).
Full HMV4 suite executed across all three browsers.

**Result: 223 passed, 14 skipped, 0 failed in 3.0 minutes.**

The 14 skips are the perf spec on Firefox/WebKit (intentional — see
"Skip rationale" below). All other tests — functional, accessibility
(axe-core), visual regression, keyboard, bridge — pass on all three
engines without per-browser branches in source code.

**Decision**: `CROSS_BROWSER_PASS_READY_FOR_REVIEW`

---

## Config extension

`tests/e2e/playwright.config.ts` — projects array:

```ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit',   use: { ...devices['Desktop Safari'] } }
]
```

`snapshotPathTemplate: '__snapshots__/{testFilePath}/{arg}-{projectName}{ext}'`
already segregates baselines per browser, so the same `toHaveScreenshot()`
call produces `nc-overview-chromium.png`, `nc-overview-firefox.png`,
`nc-overview-webkit.png` automatically.

## Browser install

```bash
npx playwright install firefox webkit
# Firefox 145 (playwright firefox-1511) + WebKit 26.4 (playwright webkit-2272)
# ~250 MB combined download
```

Browsers cached at `~/Library/Caches/ms-playwright/`. CI workflow
should add the same step and cache the directory across runs.

## package.json scripts added

```json
"test:cross-browser": "playwright test module-template-v4.spec.ts module-template-v4-axe.spec.ts module-template-v4-keyboard.spec.ts module-template-v4-bridge.spec.ts module-template-v4-accessibility.spec.ts"
```

(Visual regression and perf are excluded from `test:cross-browser`
because they have project-level scoping: visual generates baselines
per browser via `--update-snapshots`, perf is chromium-only.)

## Visual baseline generation

```
tests/e2e/__snapshots__/module-template-v4-visual.spec.ts/
  ├─ shell-home-chromium.png
  ├─ shell-home-firefox.png
  ├─ shell-home-webkit.png
  ├─ workspace-board-chromium.png
  ├─ workspace-board-firefox.png
  ├─ workspace-board-webkit.png
  ├─ … (13 fixture pages × 3 browsers = 39 PNGs)
```

Generated with:
```
npx playwright test module-template-v4-visual.spec.ts --project=firefox --update-snapshots
npx playwright test module-template-v4-visual.spec.ts --project=webkit  --update-snapshots
```

**Race condition note**: running both `--project=firefox` and
`--project=webkit` concurrently caused 6 spurious WebKit failures —
both runners try to share the `php -S` dev server (`reuseExistingServer`
in non-CI), and when Firefox's run finished it tore the server down
mid-WebKit-run. Re-running WebKit alone restored 13/13 pass. **Do not
run cross-browser visual updates in parallel locally.** In CI each
browser runs in its own job/runner so this is not an issue.

## Skip rationale (perf spec)

`module-template-v4-performance.spec.ts` is gated to chromium-only:

```ts
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Performance baseline uses Chromium-specific PerformanceObserver entries (longtask, largest-contentful-paint).'
);
```

Reason: `largest-contentful-paint` and `longtask` PerformanceObserver
entry types ship reliably on Blink (Chromium). Firefox supports LCP
since Fx 122 but with different timing semantics; WebKit/Safari does
not expose `longtask`. Running the same spec on those browsers would
emit warnings + null-cell rows, polluting the baseline file. Better to
keep perf comparisons single-engine and capture cross-browser perf
deltas separately if needed in future.

## Test results across all 3 browsers

```
Running 237 tests using 1 worker
  ✓ 223 passed
  - 14 skipped (perf × firefox + perf × webkit = 7×2)
  - 0 failed
  Total time: 3.0 min
```

Suite breakdown per browser:

| Spec file | Tests/browser | Chromium | Firefox | WebKit |
|---|---:|---:|---:|---:|
| module-template-v4.spec.ts (functional smoke) | ~37 | ✅ | ✅ | ✅ |
| module-template-v4-axe.spec.ts (a11y) | ~17 | ✅ | ✅ | ✅ |
| module-template-v4-accessibility.spec.ts (manual a11y) | included above | ✅ | ✅ | ✅ |
| module-template-v4-bridge.spec.ts | included above | ✅ | ✅ | ✅ |
| module-template-v4-keyboard.spec.ts | included above | ✅ | ✅ | ✅ |
| module-template-v4-visual.spec.ts (visual regression) | 13 | ✅ | ✅ | ✅ |
| module-template-v4-performance.spec.ts (perf) | 7 | ✅ | ⊘ skip | ⊘ skip |

(Firefox + WebKit also exercise the new Training Matrix Slice 3 axe
tests — workspace-training-matrix*.html pages — confirming Slice 3
has cross-browser coverage as well, even though it landed on this
branch concurrently.)

## Failures fixed

**Zero per-browser failures.** No HMV4 source change was required to
support Firefox or WebKit. The HMV4 prototype is built on plain
DOM APIs (`createElement`, `addEventListener`, `innerHTML`,
`history.replaceState`) and CSS variables — all of which are
universally supported.

## CI matrix configuration

For `.github/workflows/hmv4-e2e.yml`:

```yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: Install Playwright browsers
        run: |
          cd tests/e2e
          npm ci
          npx playwright install --with-deps ${{ matrix.browser }}
      - name: Run HMV4 E2E
        run: cd tests/e2e && npx playwright test --project=${{ matrix.browser }}
      - name: Upload trace artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: trace-${{ matrix.browser }}
          path: .codex-playwright/module-template-v4-results/
```

`fail-fast: false` ensures one browser's failure doesn't cancel the
others (useful for triage). Cache `~/.cache/ms-playwright` in a
separate cache step to skip the 250MB browser re-download.

## Decision

`CROSS_BROWSER_PASS_READY_FOR_REVIEW`

223/223 functional + a11y + visual tests pass on Chromium + Firefox +
WebKit. Perf spec correctly scoped to Chromium. Per-browser baselines
captured. CI matrix template documented. No HMV4 source changes were
needed to add Firefox/WebKit support — the prototype is portable by
design.
