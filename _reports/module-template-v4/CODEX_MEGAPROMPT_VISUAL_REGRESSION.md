# CODEX MEGAPROMPT — Visual Regression Setup

> Paste into Codex local. Codex creates branch `codex/qa-visual-regression`,
> adds Playwright screenshot baselines, ensures all fixture pages have
> stable visual snapshots, and commits.
>
> Approval phrase: `Proceed with HMV4 visual regression setup.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are adding **Playwright screenshot-based visual regression** to the HMV4 E2E suite. Every fixture page captures a baseline PNG; tests fail if a future change diverges by more than tolerance.

The package.json in `tests/e2e/` already has `test:visual` and `test:visual-update` scripts (added in an earlier Claude session). Your job is to make those scripts work end-to-end.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT modify HMV4 source (renderer, bridge, hydration, routes, fixtures).
Do NOT change forbidden files.
Do NOT regenerate baselines on every CI run — only when explicit --update-snapshots.
Capture from Chromium only initially; cross-browser baselines can come in a separate Codex session (D4).
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout codex/second-slice-planning-from-dispatch-qa
git pull --ff-only

git status --short
# Expected: empty

# Verify package.json has visual scripts
grep -E '"test:visual' tests/e2e/package.json
# Expected: 2 lines (test:visual, test:visual-update)

# Verify existing E2E spec files
ls tests/e2e/module-template-v4*.spec.ts
# Expected: at least 5 (functional, accessibility, axe, keyboard, bridge)

# Verify all fixture pages
ls tests/fixtures/module-template-v4/pages/*.html | wc -l
# Expected: 25+

# Branch
git checkout -b codex/qa-visual-regression
```

If fail, return `VISUAL_REGRESSION_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
tests/e2e/playwright.config.ts (extend snapshot config)
tests/e2e/module-template-v4-visual.spec.ts (NEW)
tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (auto-created by Playwright on --update-snapshots)
tests/e2e/package.json (only if scripts need adjustment)
tests/e2e/.gitignore (ensure node_modules ignored)
.gitattributes (only if needed for PNG binary handling)
_reports/module-template-v4/S_QA_VISUAL_REGRESSION_REPORT.md (NEW)
```

## FORBIDDEN

```text
mom/scripts/portal/7?-module-template-v4-*.js
mom/styles/module-template-v4*.css
mom/templates/module-template-v4/**
tests/fixtures/module-template-v4/** (don't change fixtures)
mom/portal.html
forbidden file list
```

## STEP 1 — Extend Playwright config

Open `tests/e2e/playwright.config.ts`. Add or update the `expect` block to set screenshot tolerance:

```ts
expect: {
  timeout: 5_000,
  toHaveScreenshot: {
    // Allow up to 100 differing pixels and 10% per-channel tolerance
    // (covers anti-alias jitter + sub-pixel font rendering across runs).
    maxDiffPixels: 100,
    threshold: 0.1,
    animations: 'disabled'
  }
}
```

If the existing config already has an `expect` block without `toHaveScreenshot`, merge in the new key. Do NOT duplicate the block.

## STEP 2 — Inventory fixture pages

```bash
ls tests/fixtures/module-template-v4/pages/*.html
```

Capture the full list. Expected (per latest snapshot):

```text
authoritative-collection.html
authoritative-record-shell-nc-audit.html
authoritative-record-shell-nc-conflict.html
authoritative-record-shell-nc-degraded.html
authoritative-record-shell-nc-evidence.html
authoritative-record-shell-nc-investigation.html
authoritative-record-shell-nc-overview.html
authoritative-record-shell-nc-partial-access.html
authoritative-record-shell-nc-related.html
authoritative-record-shell-nc-signatures.html
authoritative-record-shell.html
bridge-alias.html
degraded-states.html
domain-landing.html
durable-draft-shell.html
module-landing.html
shell-home.html
unknown-alias.html
workspace-analytics.html
workspace-archive.html
workspace-board-degraded.html
workspace-board-empty.html
workspace-board.html
workspace-dashboard.html
workspace-explorer.html
workspace-matrix.html
workspace-monitor.html
workspace-packet.html
workspace-queue.html
workspace-tower.html
```

Plus any newly added Slice 3 training matrix pages if Slice 3 has landed.

## STEP 3 — Create visual spec

Create `tests/e2e/module-template-v4-visual.spec.ts`:

```ts
import { test, expect, Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_DIR = '../fixtures/module-template-v4/pages';

function listFixturePages(): string[] {
  // Resolve from tests/e2e to fixtures dir
  const abs = join(__dirname, '..', 'fixtures', 'module-template-v4', 'pages');
  return readdirSync(abs)
    .filter((f) => f.endsWith('.html'))
    .sort();
}

const fixturePages = listFixturePages();

async function stabilize(page: Page): Promise<void> {
  // Disable transitions + animations
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }'
  });
  // Hide caret + ensure focus reset
  await page.evaluate(() => {
    document.activeElement && (document.activeElement as HTMLElement).blur();
  });
  // Wait for fonts and images
  await page.evaluate(async () => { await (document as any).fonts?.ready; });
  await page.waitForLoadState('networkidle');
  // Small settle delay
  await page.waitForTimeout(100);
}

test.describe('module-template-v4 visual regression', () => {
  for (const page of fixturePages) {
    test(`visual: ${page}`, async ({ page: pw }) => {
      await pw.goto(`/tests/fixtures/module-template-v4/pages/${page}`);
      await stabilize(pw);

      const snapName = page.replace(/\.html$/, '.png');
      await expect(pw).toHaveScreenshot(snapName, {
        fullPage: true,
        omitBackground: false,
        animations: 'disabled'
      });
    });
  }
});
```

Notes:
- `__dirname` resolution: Playwright supports both ESM and CJS. If `package.json` has `"type": "module"`, replace `__dirname` with `import.meta.dirname` (Node 22+) or `fileURLToPath(new URL('.', import.meta.url))`.
- The fixture loop uses real filesystem, so adding new fixture pages later auto-extends coverage on next baseline update.

## STEP 4 — Capture baselines (Chromium only)

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright install chromium

# Baseline capture
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=chromium --update-snapshots module-template-v4-visual.spec.ts

# Verify snapshots created
ls module-template-v4-visual.spec.ts-snapshots/ | head -10

# Re-run without --update-snapshots to confirm tests pass deterministically
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test \
  --project=chromium module-template-v4-visual.spec.ts

# Cleanup
rm -rf node_modules
cd ../..
```

Expected: as many PNGs as fixture pages, all tests PASS on second run.

If a particular fixture is non-deterministic (e.g., contains current timestamp), either:
1. Stub the dynamic content via fixture data
2. Mask the dynamic region with `mask:` option
3. Skip that page from visual coverage and document why

Iterate until ALL fixture pages produce stable, repeatable snapshots.

## STEP 5 — Configure git for PNG binaries

Check `.gitattributes` for binary PNG handling:

```bash
grep -nE '\*\.png' .gitattributes 2>/dev/null
```

If absent, append:

```text
# Visual regression baselines — binary, do not normalize line endings
tests/e2e/**/*.png binary
*.png binary
```

This ensures PNG diffs don't get corrupted by autocrlf on Windows clients.

## STEP 6 — Update package.json (if needed)

The scripts already exist:

```json
"test:visual": "playwright test module-template-v4-visual.spec.ts --project=chromium",
"test:visual-update": "playwright test module-template-v4-visual.spec.ts --update-snapshots"
```

Verify they work and only update if necessary.

## STEP 7 — Add to CI workflow (advisory)

Read `.github/workflows/hmv4-e2e.yml`. Add a new step in the `e2e` job AFTER the existing test run:

```yaml
- name: Run visual regression
  working-directory: tests/e2e
  run: ./node_modules/.bin/playwright test --project=chromium module-template-v4-visual.spec.ts
  continue-on-error: false

- name: Upload visual diff on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: visual-diff-${{ github.run_id }}
    path: |
      tests/e2e/test-results/
    retention-days: 14
    if-no-files-found: ignore
```

If editing `.github/workflows/hmv4-e2e.yml` is out of scope for this branch, document the proposed addition in the report and SKIP this step.

## STEP 8 — Document the workflow

Create `tests/e2e/VISUAL_REGRESSION.md`:

```markdown
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
will be added in a separate slice (Stream D4 cross-browser matrix).
```

## STEP 9 — Generate report

Create `_reports/module-template-v4/S_QA_VISUAL_REGRESSION_REPORT.md`:

```markdown
# Visual Regression Setup Report

## Summary
- N baselines captured (count from snapshots dir)
- M fixture pages covered (count from pages dir)
- N == M? YES/NO (any pages skipped, with reason)

## Branch and working tree
- Branch: codex/qa-visual-regression
- Base: codex/second-slice-planning-from-dispatch-qa

## Files changed
- tests/e2e/playwright.config.ts (extend expect.toHaveScreenshot)
- tests/e2e/module-template-v4-visual.spec.ts (NEW)
- tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (NEW, N PNGs)
- .gitattributes (PNG binary handling, if added)
- tests/e2e/VISUAL_REGRESSION.md (NEW docs)

## Baseline capture
| Page | Snapshot | Size (bytes) |
|---|---|---|
| ... | ... | ... |

## Test result (second-run determinism)
- PASS ALL on second run? YES/NO
- Any flaky pages? (list)

## Stabilization techniques applied
- Animations disabled via CSS injection
- Caret hidden
- document.fonts.ready awaited
- networkidle waited
- 100ms settle

## Recommendations
- Cross-browser baselines (Firefox, WebKit) deferred to D4
- Add `mask:` for any future dynamic content
- Update baselines on intentional UI change via `npm run test:visual-update`

## Decision
VISUAL_REGRESSION_PASS_READY_FOR_REVIEW
VISUAL_REGRESSION_PASS_WITH_WARNINGS
VISUAL_REGRESSION_FAIL_BLOCK_NEXT
```

## STEP 10 — Commit and push

```bash
git add tests/e2e/playwright.config.ts \
        tests/e2e/module-template-v4-visual.spec.ts \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/ \
        tests/e2e/VISUAL_REGRESSION.md \
        .gitattributes \
        _reports/module-template-v4/S_QA_VISUAL_REGRESSION_REPORT.md

# Note: PNG snapshots can be many MB. If repo size grows large, consider
# git-lfs in a future ADR. For now, regular git is fine.

git commit -m "test(hmv4): add visual regression baselines (Stream D2)

Auto-discovers all fixture pages under
tests/fixtures/module-template-v4/pages/ and captures Chromium screenshot
baselines. Tolerance: 100 pixels / 10%. Animations disabled, caret hidden,
fonts awaited for deterministic captures.

Cross-browser baselines deferred to D4 cross-browser matrix slice."

git push -u origin codex/qa-visual-regression
```

## ROLLBACK PROCEDURE

```bash
git checkout codex/second-slice-planning-from-dispatch-qa
git branch -D codex/qa-visual-regression
# After push: git push origin --delete codex/qa-visual-regression
```

No production source touched; revert is purely additive removal.

## DECISION PHRASE OUTPUT

Return ONE of:

```text
VISUAL_REGRESSION_PASS_READY_FOR_REVIEW
VISUAL_REGRESSION_PASS_WITH_WARNINGS
VISUAL_REGRESSION_FAIL_BLOCK_NEXT
```
