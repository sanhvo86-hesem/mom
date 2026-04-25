# CODEX MEGAPROMPT — Cross-Browser Baselines (Stream D.4)

> Paste into Codex local. Codex creates branch
> `codex/qa-cross-browser-baselines`, captures Firefox + WebKit visual
> baselines, ensures HMV4 surfaces work across all 3 browsers, commits.
>
> Approval phrase: `Proceed with HMV4 cross-browser baselines.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

Stream D.2 (visual regression Chromium baselines) was merged at commit
`ae46d9e0`. This megaprompt extends baselines to **Firefox + WebKit** so
HMV4 surfaces are protected across all 3 browsers.

This is **test infrastructure** work — independent of frontend slice
work, parallel-safe with any other Codex session.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT modify HMV4 source (renderer, bridge, hydration, routes, fixtures).
Do NOT change forbidden files.
Capture baselines for Firefox + WebKit; do not regenerate Chromium baselines.
If a fixture page renders differently across browsers, fix the source
(ADR-0009 GA tokens, semantic HTML) — do NOT mask with browser-specific
selectors.
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify Chromium baselines exist
ls tests/e2e/module-template-v4-visual.spec.ts-snapshots/*-chromium.png | wc -l
# Expected: ~25-30

# Verify package.json has browsers script
grep -E '"install:browsers"' tests/e2e/package.json
# Expected: present

# Verify playwright config has projects
grep -nE "(name: 'chromium'|name: 'firefox'|name: 'webkit')" tests/e2e/playwright.config.ts

# Branch
git checkout -b codex/qa-cross-browser-baselines
```

If fail, return `CROSS_BROWSER_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
tests/e2e/playwright.config.ts (add firefox + webkit projects if missing)
tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (NEW PNG files for firefox/webkit)
tests/e2e/package.json (add cross-browser script if missing)
.github/workflows/hmv4-e2e.yml (extend matrix strategy if CI active)
_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md (NEW or UPDATE)
tests/e2e/CROSS_BROWSER.md (NEW docs)
```

## FORBIDDEN

```text
mom/scripts/portal/7?-module-template-v4-*.js
mom/styles/module-template-v4*.css
mom/templates/module-template-v4/**
tests/fixtures/module-template-v4/**
mom/portal.html
forbidden file list
```

## STEP 1 — Add Firefox + WebKit projects to playwright.config.ts

Read current config:

```bash
cat tests/e2e/playwright.config.ts
```

If the `projects` array only has chromium, extend:

```ts
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] }
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] }
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] }
  }
]
```

If `devices` not imported, add to imports.

## STEP 2 — Install browsers

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright install firefox webkit --with-deps
```

This downloads Firefox and WebKit binaries via Playwright. Both are large (~150MB each). Allow time.

## STEP 3 — Capture Firefox baselines

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=firefox --update-snapshots module-template-v4-visual.spec.ts
```

Verify firefox PNGs created:

```bash
ls module-template-v4-visual.spec.ts-snapshots/*-firefox.png | wc -l
# Expected: same count as chromium baselines
```

## STEP 4 — Re-run firefox to confirm determinism

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=firefox module-template-v4-visual.spec.ts
```

Expected: 100% pass on second run. If any test flakes, the page has non-deterministic rendering — investigate fixture (animation, dynamic content, font load timing).

## STEP 5 — Capture WebKit baselines

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=webkit --update-snapshots module-template-v4-visual.spec.ts

ls module-template-v4-visual.spec.ts-snapshots/*-webkit.png | wc -l
# Expected: same count as chromium baselines

# Re-run for determinism
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=webkit module-template-v4-visual.spec.ts
```

## STEP 6 — Run full E2E matrix on all 3 browsers

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
```

This runs ALL specs (functional, axe, bridge, keyboard, accessibility, visual) on chromium + firefox + webkit. Expected: ~3× total tests, all PASS.

If any non-visual test fails on firefox or webkit:
1. Identify the failing test
2. Check if the failure is browser-specific behavior (e.g., webkit handles focus-visible differently)
3. If the test is fundamentally browser-correct, the fix goes in HMV4 source (renderer, CSS) — NOT in masking the test
4. If genuinely flaky/environmental, document in report

```bash
rm -rf node_modules
cd ../..
```

## STEP 7 — Add cross-browser script to package.json

If missing, add:

```json
"test:cross-browser": "playwright test"
```

(Without `--project`, runs all 3.)

## STEP 8 — (Optional) Extend CI workflow

Read `.github/workflows/hmv4-e2e.yml`. If a matrix strategy is desired:

```yaml
jobs:
  e2e:
    name: HMV4 Playwright E2E
    runs-on: ubuntu-latest
    needs: safety-checks
    timeout-minutes: 35
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false
    steps:
      # ... existing steps ...
      - name: Run HMV4 E2E (${{ matrix.browser }})
        working-directory: tests/e2e
        run: |
          ./node_modules/.bin/playwright test --project=${{ matrix.browser }} --reporter=list
```

(Test runtime triples; consider if matrix is too costly. If so, leave CI Chromium-only and run Firefox/WebKit nightly.)

## STEP 9 — Document workflow

Create `tests/e2e/CROSS_BROWSER.md`:

```markdown
# HMV4 Cross-Browser Testing

## What this checks
Visual + functional behavior on Chromium, Firefox, WebKit.

## How to run
```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright install --with-deps
npm run test:cross-browser
```

## When a UI change causes browser-specific diff
1. Run baseline update for the changed browser:
   `npm run test:visual-update -- --project=firefox`
2. Inspect the diff PNG
3. If correct, commit
4. If incorrect, fix HMV4 source (CSS tokens, semantic HTML) — do NOT
   mask with browser-conditional code

## Browser-specific known differences
- WebKit: focus-visible behavior on buttons differs from Chromium
- Firefox: subpixel font rendering can shift baselines by 1-2 pixels
- All differences absorbed by `maxDiffPixels: 100, threshold: 0.1`
```

## STEP 10 — Generate report

```markdown
# Cross-Browser Baselines Report (Stream D.4)

## Summary
Firefox + WebKit baselines captured for all HMV4 fixture pages. Visual
regression now protects all 3 browsers.

## Branch and working tree
- Branch: codex/qa-cross-browser-baselines
- Base: main 2af773e8

## Baselines captured
| Browser | Baseline count | Match Chromium count? |
|---|---:|---|
| chromium (existing) | N | — |
| firefox (NEW) | N | YES/NO |
| webkit (NEW) | N | YES/NO |

## E2E full matrix result
| Browser | Tests passed | Tests failed |
|---|---:|---:|
| chromium | 111 | 0 |
| firefox | 111 | 0 (or list failures + reason) |
| webkit | 111 | 0 (or list failures + reason) |

## Browser-specific issues found and fixed
- (none / list with file:line and fix)

## Browser-specific issues KNOWN ACCEPTABLE
- WebKit focus-visible rendering: minor pixel diff absorbed by threshold
- Firefox subpixel font: minor pixel diff absorbed by threshold

## CI matrix decision
- Chromium on every push (existing)
- Firefox + WebKit nightly OR on PR to main (recommended)
- (or matrix on every push if CI minutes budget allows)

## Decision
CROSS_BROWSER_PASS_READY_FOR_REVIEW
CROSS_BROWSER_PASS_WITH_WARNINGS
CROSS_BROWSER_FAIL_BLOCK_NEXT
```

## STEP 11 — Commit

```bash
git add tests/e2e/playwright.config.ts \
        tests/e2e/package.json \
        tests/e2e/CROSS_BROWSER.md \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/*.png \
        .github/workflows/hmv4-e2e.yml \
        _reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md

git commit -m "test(hmv4): add Firefox + WebKit visual baselines (Stream D.4)

Cross-browser visual regression coverage. Each fixture page now has
3 baseline PNGs (chromium-existing, firefox-new, webkit-new).

CI matrix recommendation in S_QA_CROSS_BROWSER_REPORT.md."

git push -u origin codex/qa-cross-browser-baselines
```

## ROLLBACK

```bash
git checkout main
git branch -D codex/qa-cross-browser-baselines
git push origin --delete codex/qa-cross-browser-baselines
```

## DECISION PHRASE OUTPUT

```text
CROSS_BROWSER_PASS_READY_FOR_REVIEW
CROSS_BROWSER_PASS_WITH_WARNINGS
CROSS_BROWSER_FAIL_BLOCK_NEXT
```
