# UPGRADE PROMPT PACK 4 — Quality Infrastructure

**Stream**: D (Quality infrastructure — parallel with Streams A/B/C/E)
**Goal**: Add a11y, visual regression, performance, cross-browser, security testing
**Total prompts**: 5 (parallel — all independent)

These 5 prompts are independent and can run in 5 different sessions/branches simultaneously.

---

## D1 — axe-core a11y Integration 🟢 (parallel)

### When to run
Anytime. Recommended before Slice 5.

### User must say
```
Proceed with HMV4 axe-core integration.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are integrating @axe-core/playwright into the HMV4 E2E suite to
catch WCAG 2.1 AA violations on every test run.

Do not change forbidden files.
Do not modify production HMV4 source.

Required base branch:
  codex/qa-axe-core-integration

Created from:
  codex/second-slice-planning-from-dispatch-qa

Allowed:
  tests/e2e/package.json
  tests/e2e/playwright.config.ts
  tests/e2e/module-template-v4-axe.spec.ts (create new)
  tests/e2e/module-template-v4-accessibility.spec.ts (extend)
  _reports/module-template-v4/S_QA_AXE_*.md

Forbidden:
  Any HMV4 production source
  Any forbidden file from CLAUDE.md

Step 1: Add @axe-core/playwright to tests/e2e/package.json devDependencies.

Step 2: Create new spec file tests/e2e/module-template-v4-axe.spec.ts:

  import { test, expect } from '@playwright/test';
  import AxeBuilder from '@axe-core/playwright';
  
  const fixturePages = [
    'shell-home.html',
    'workspace-board.html',
    'workspace-board-empty.html',
    'authoritative-record-shell-nc-overview.html',
    'authoritative-record-shell-nc-conflict.html',
    'authoritative-record-shell-nc-partial-access.html',
    'authoritative-record-shell-nc-degraded.html',
    // Add Training Matrix pages when Slice 3 lands
  ];
  
  for (const page of fixturePages) {
    test(`a11y: ${page} has no critical violations`, async ({ page: pw }) => {
      await pw.goto(`/tests/fixtures/module-template-v4/pages/${page}`);
      const axeBuilder = new AxeBuilder({ page: pw })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
      const results = await axeBuilder.analyze();
      const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      if (critical.length > 0) {
        console.log('A11y violations:', JSON.stringify(critical, null, 2));
      }
      expect(critical).toHaveLength(0);
    });
  }

Step 3: Run new tests:
  cd tests/e2e
  npm install --no-package-lock
  npm run test:hmv4 -- --project=chromium --grep "a11y"

Expected: depending on current state, may have 0-N violations to fix.

Step 4: For each critical/serious violation, fix in:
  mom/scripts/portal/73-module-template-v4-renderers.js (if rendering issue)
  mom/templates/module-template-v4/module-template-v4.html (if structural)
  mom/styles/module-template-v4.css (if visual contrast)

Common fixes:
  - missing aria-label on buttons → add aria-label
  - low color contrast → adjust CSS tokens
  - missing form labels → add <label> or aria-labelledby
  - missing landmark roles → add role="main", role="navigation"

Step 5: Re-run tests until all pass.

Step 6: Update package.json scripts:
  "test:hmv4": "playwright test module-template-v4*.spec.ts",
  "test:a11y": "playwright test module-template-v4-axe.spec.ts --project=chromium"

Step 7: Document in CI workflow (if active):
  Add separate step "a11y check" with axe-core test.

Generate:
  _reports/module-template-v4/S_QA_AXE_INTEGRATION_REPORT.md

Sections:
  ## Summary
  ## Spec file added
  ## Initial violations found
  ## Fixes applied
  ## Final test result (must be 0 critical/serious)
  ## Coverage matrix (which fixture pages tested)
  ## Decision

Decision phrase output (one of):
  AXE_CORE_PASS_READY_FOR_REVIEW
  AXE_CORE_PASS_WITH_WARNINGS
  AXE_CORE_FAIL_BLOCK_NEXT
```

### Estimated time
2-4 hours (depending on violations found).

---

## D2 — Visual Regression Setup 🟢 (parallel)

### When to run
Anytime. Recommended before Slice 5.

### User must say
```
Proceed with HMV4 visual regression setup.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are adding Playwright screenshot-based visual regression to the
HMV4 E2E suite. Every fixture page produces a baseline screenshot;
tests fail if the screenshot diverges by >0.1% pixel difference.

Do not change forbidden files.
Do not modify production HMV4 source.

Required base branch:
  codex/qa-visual-regression

Created from:
  codex/second-slice-planning-from-dispatch-qa

Allowed:
  tests/e2e/playwright.config.ts (extend with snapshot config)
  tests/e2e/module-template-v4-visual.spec.ts (create new)
  tests/e2e/__snapshots__/ (new directory for baselines)
  _reports/module-template-v4/S_QA_VISUAL_*.md

Forbidden:
  Any HMV4 production source
  Any forbidden file from CLAUDE.md

Step 1: Extend playwright.config.ts with snapshot config:

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.1
    }
  }

Step 2: Create tests/e2e/module-template-v4-visual.spec.ts:

  import { test, expect } from '@playwright/test';
  
  const fixturePages = [
    { file: 'shell-home.html', name: 'shell-home' },
    { file: 'workspace-board.html', name: 'workspace-board' },
    { file: 'workspace-board-empty.html', name: 'workspace-board-empty' },
    { file: 'workspace-board-degraded.html', name: 'workspace-board-degraded' },
    { file: 'authoritative-record-shell-nc-overview.html', name: 'nc-overview' },
    { file: 'authoritative-record-shell-nc-investigation.html', name: 'nc-investigation' },
    { file: 'authoritative-record-shell-nc-evidence.html', name: 'nc-evidence' },
    { file: 'authoritative-record-shell-nc-related.html', name: 'nc-related' },
    { file: 'authoritative-record-shell-nc-audit.html', name: 'nc-audit' },
    { file: 'authoritative-record-shell-nc-signatures.html', name: 'nc-signatures' },
    { file: 'authoritative-record-shell-nc-conflict.html', name: 'nc-conflict' },
    { file: 'authoritative-record-shell-nc-partial-access.html', name: 'nc-partial-access' },
    { file: 'authoritative-record-shell-nc-degraded.html', name: 'nc-degraded' },
    // Add Training Matrix pages when Slice 3 lands
  ];
  
  test.describe('visual regression', () => {
    for (const fp of fixturePages) {
      test(`visual: ${fp.name}`, async ({ page }) => {
        await page.goto(`/tests/fixtures/module-template-v4/pages/${fp.file}`);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`${fp.name}.png`, {
          fullPage: true,
          omitBackground: false
        });
      });
    }
  });

Step 3: Run with --update-snapshots to create baseline:
  cd tests/e2e
  npm install --no-package-lock
  npm run test:hmv4 -- --project=chromium --update-snapshots --grep "visual"

This creates tests/e2e/__snapshots__/ with PNG baselines.

Step 4: Re-run without --update-snapshots to confirm tests pass:
  npm run test:hmv4 -- --project=chromium --grep "visual"

Expected: 13+ visual tests pass on second run.

Step 5: Update package.json scripts:
  "test:visual": "playwright test module-template-v4-visual.spec.ts --project=chromium",
  "test:visual-update": "playwright test module-template-v4-visual.spec.ts --update-snapshots"

Step 6: Add CI step (if CI active):
  Run "test:visual"; on failure, upload diff images as artifact.

Step 7: Add documentation note that any UI change must run --update-snapshots
to refresh baselines.

Generate:
  _reports/module-template-v4/S_QA_VISUAL_REGRESSION_REPORT.md

Sections:
  ## Summary
  ## Baselines captured (count)
  ## Test result (must pass on second run)
  ## CI integration plan
  ## Maintenance procedure
  ## Decision

Decision phrase output (one of):
  VISUAL_REGRESSION_PASS_READY_FOR_REVIEW
  VISUAL_REGRESSION_PASS_WITH_WARNINGS
  VISUAL_REGRESSION_FAIL_BLOCK_NEXT
```

### Estimated time
1-2 hours.

---

## D3 — Performance Baseline 🟢 (parallel)

### When to run
After Slice 5.

### User must say
```
Proceed with HMV4 performance baseline.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are establishing a performance baseline for the HMV4 prototype
using Lighthouse CI. The baseline records FCP, LCP, TBT, CLS, TTI,
and bundle size for the current portal vs HMV4-enabled portal.

Required base branch:
  codex/qa-performance-baseline

Allowed:
  tests/e2e/lighthouse-config.js (new)
  tests/e2e/module-template-v4-performance.spec.ts (new)
  _reports/module-template-v4/S_QA_PERF_*.md

Forbidden:
  HMV4 source
  Forbidden files

Step 1: Add @playwright/test (already there) + lighthouse package:
  cd tests/e2e
  npm install --no-package-lock --save-dev lighthouse

Step 2: Create lighthouse-config.js:

  module.exports = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      throttlingMethod: 'simulate',
      formFactor: 'desktop'
    }
  };

Step 3: Create perf spec:

  import { test, expect } from '@playwright/test';
  import { playAudit } from 'playwright-lighthouse';
  
  const PERF_TARGETS = {
    'fcp': 1500,
    'lcp': 2500,
    'tbt': 200,
    'cls': 0.1,
    'tti': 3500
  };
  
  test('perf: current portal baseline (HMV4 disabled)', async ({ page }) => {
    await page.goto('/mom/portal.html');
    const result = await playAudit({ page, port: 9222, ... });
    expect(result.lhr.categories.performance.score * 100).toBeGreaterThan(80);
    // Record metrics for baseline document
  });
  
  test('perf: HMV4 record shell baseline', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html');
    const result = await playAudit({ page, port: 9222, ... });
    expect(result.lhr.categories.performance.score * 100).toBeGreaterThan(80);
  });

Step 4: Run baseline:
  npm run test -- --grep perf

Step 5: Capture results to a baseline file:
  _reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-25.md

  | Page | FCP | LCP | TBT | CLS | TTI | Score |
  |---|---|---|---|---|---|---|
  | Current portal | ... | ... | ... | ... | ... | ... |
  | HMV4 NC overview | ... | ... | ... | ... | ... | ... |
  | HMV4 dispatch board | ... | ... | ... | ... | ... | ... |

Step 6: Document regression alert thresholds:
  - FCP > 2000ms = warning, > 3000ms = fail
  - LCP > 3000ms = warning, > 4000ms = fail
  - TBT > 300ms = warning, > 500ms = fail
  - CLS > 0.15 = warning, > 0.25 = fail

Step 7: Add npm script:
  "test:perf": "playwright test module-template-v4-performance.spec.ts"

Generate:
  _reports/module-template-v4/S_QA_PERFORMANCE_BASELINE_REPORT.md

Sections:
  ## Summary
  ## Baseline metrics (table)
  ## Regression thresholds
  ## CI integration plan
  ## Decision

Decision phrase output (one of):
  PERF_BASELINE_PASS_READY_FOR_REVIEW
  PERF_BASELINE_PASS_WITH_WARNINGS
  PERF_BASELINE_FAIL_BLOCK_NEXT
```

### Estimated time
1-2 hours.

---

## D4 — Cross-Browser CI Matrix 🟢 (parallel)

### When to run
After CI workflow active (Pack 2.B3).

### User must say
```
Proceed with HMV4 cross-browser matrix.
```

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are adding Firefox and WebKit projects to the Playwright config so
HMV4 E2E runs cross-browser.

Required base branch:
  codex/qa-cross-browser-matrix

Allowed:
  tests/e2e/playwright.config.ts (extend projects array)
  .github/workflows/hmv4-e2e.yml (extend matrix strategy if CI active)
  _reports/module-template-v4/S_QA_CROSS_BROWSER_*.md

Forbidden:
  HMV4 source
  Forbidden files

Step 1: Extend playwright.config.ts projects:

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]

Step 2: Install browsers:
  cd tests/e2e
  npm install --no-package-lock
  ./node_modules/.bin/playwright install firefox webkit

Step 3: Run tests across all 3 browsers:
  npm run test:hmv4 -- --project=chromium
  npm run test:hmv4 -- --project=firefox
  npm run test:hmv4 -- --project=webkit

Step 4: Identify cross-browser failures.

Common issues:
  - Firefox: stricter CSS spec parsing
  - WebKit: different focus-visible behavior
  - WebKit: different font rendering (visual regression diffs)

Fix in HMV4 source if needed (per-browser branches in playwright.config
should NOT be used to mask bugs).

Step 5: Update CI workflow to run browser matrix:

  jobs:
    e2e:
      strategy:
        matrix:
          browser: [chromium, firefox, webkit]
      steps:
        - run: npm run test:hmv4 -- --project=${{ matrix.browser }}

Step 6: Update visual baselines per browser:
  npm run test:visual-update -- --project=firefox
  npm run test:visual-update -- --project=webkit

This creates separate __snapshots__/ subdirectories per browser (Playwright handles this).

Generate:
  _reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md

Sections:
  ## Summary
  ## Browser test results (per browser)
  ## Failures fixed
  ## Visual baseline strategy
  ## CI matrix configuration
  ## Decision

Decision phrase output (one of):
  CROSS_BROWSER_PASS_READY_FOR_REVIEW
  CROSS_BROWSER_PASS_WITH_WARNINGS
  CROSS_BROWSER_FAIL_BLOCK_NEXT
```

### Estimated time
2-3 hours (more if browser-specific bugs found).

---

## D5 — Security Review 🟢 (parallel)

### When to run
Before Slice 5.

### User must say
```
Proceed with HMV4 security review.
```

### Prompt to paste into Claude Code local

```text
You are in local repo sanhvo86-hesem/mom.

You are running a security review on the HMV4 prototype surfaces.
Use the /security-review skill (if available in your Claude Code
session) and supplement with manual analysis.

Scope: HMV4 modifications since main branch (commits a5f4d3c7, 9289ef89, 2eb6a7aa, 567e365b, 5f538cce on codex/second-slice-planning-from-dispatch-qa).

Required base branch:
  codex/qa-security-review

Allowed:
  _reports/module-template-v4/S_QA_SECURITY_*.md

Forbidden:
  HMV4 source modifications
  Forbidden files

Step 1: Invoke /security-review skill if available:
  /security-review

Or manually audit. Look for:

XSS vulnerabilities:
  - Any innerHTML/document.write of user-controlled data?
  - Any DOM-based XSS via window.location parsing?
  - Any URL parameter reflection without escaping?
  
  Check files:
  mom/scripts/portal/72-module-template-v4-bridge.js
  mom/scripts/portal/73-module-template-v4-renderers.js
  mom/scripts/portal/70-module-template-v4-hydration.js

Open redirect / SSRF:
  - Any redirect based on user-controlled URL?
  - Any fetch to user-controlled URL?
  - Bridge alias mapping should not allow arbitrary URL injection

CSRF / SameSite:
  - Are mutation buttons protected? (currently disabled by design)
  - Future: when mutation enabled, CSRF token strategy needed

Auth / authorization:
  - HMV4 fixture pages bypass auth (acceptable for prototype)
  - Production portal must NOT load HMV4 with HMV4_PREVIEW_ENABLED=true unauthenticated
  - Verify portal.html guard logic

Sensitive data exposure:
  - Fixture data should not contain real PII
  - Check tests/fixtures/module-template-v4/ for emails, names, IDs
  - If real data found, replace with synthetic

Bridge alias hijacking:
  - Can a malicious page redirect from /ops/<wrong> to /ops/<right>?
  - Verify bridge alias does not allow unbounded redirects

Step 2: Document findings.

For each finding, classify:
  - HIGH: must fix before any production rollout
  - MEDIUM: should fix in next slice
  - LOW: monitor

Step 3: For HIGH findings, propose fixes (do NOT apply yet):
  - Code change description
  - Test that catches the issue
  - Estimated fix effort

Generate:
  _reports/module-template-v4/S_QA_SECURITY_REVIEW_REPORT.md

Sections:
  ## Summary
  ## Scope reviewed
  ## XSS audit
  ## Open redirect / SSRF audit
  ## CSRF / SameSite audit
  ## Auth / authorization audit
  ## Sensitive data exposure audit
  ## Bridge alias hijacking audit
  ## Findings (table: severity / file / line / description / fix)
  ## Recommendations
  ## Decision

Decision phrase output (one of):
  SECURITY_REVIEW_PASS_NO_CRITICAL
  SECURITY_REVIEW_PASS_WITH_MEDIUM_FINDINGS
  SECURITY_REVIEW_FAIL_HIGH_FINDINGS_BLOCK_NEXT
```

### Estimated time
2-3 hours.

---

## Pack 4 timing summary

| Step | Time | Parallel? |
|---|---|---|
| D1 axe-core | 2-4 hr | yes |
| D2 visual regression | 1-2 hr | yes |
| D3 performance baseline | 1-2 hr | yes |
| D4 cross-browser | 2-3 hr | yes |
| D5 security review | 2-3 hr | yes |

**5 parallel sessions**: ~3-4 hours total elapsed.
**Single-thread**: ~10-14 hours total.

After all 5 complete, HMV4 has comprehensive quality coverage:
- Functional (E2E baseline)
- Accessibility (axe-core)
- Visual (screenshot diff)
- Performance (Lighthouse)
- Cross-browser (Chromium + Firefox + WebKit)
- Security (manual + skill review)
