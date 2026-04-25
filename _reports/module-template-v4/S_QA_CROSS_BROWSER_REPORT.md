# Cross-Browser Baselines Report (Stream D.4)

## Summary

Firefox and WebKit visual baselines were captured for all HMV4 fixture pages.
The visual spec now runs on all Playwright browser projects instead of
skipping non-Chromium projects.

## Branch and Working Tree

- Branch: `codex/qa-cross-browser-baselines`
- Worktree: `/Users/a10/Documents/mom-qa-cross-browser-baselines`
- Base: `origin/main` at `554e28b4`
- Original checkout status: dirty `codex/live-api-toggle-nqcase`; Stream D.4 was isolated in a clean worktree.

## Baselines Captured

| Browser | Baseline count | Match Chromium count? |
|---|---:|---|
| chromium (existing) | 41 | - |
| firefox (new) | 41 | YES |
| webkit (new) | 41 | YES |

## Validation Results

| Command | Result |
|---|---|
| `playwright test --project=firefox --update-snapshots=all module-template-v4-visual.spec.ts` | PASS, 41/41 |
| `playwright test --project=firefox module-template-v4-visual.spec.ts` | PASS, 41/41 |
| `playwright test --project=webkit --update-snapshots=all module-template-v4-visual.spec.ts` | PASS after rerun, 41/41 captured |
| `playwright test --project=webkit module-template-v4-visual.spec.ts` | PASS, 41/41 |
| `playwright test --project=chromium module-template-v4-visual.spec.ts -g "visual: shell-home.html"` | FAIL, existing Chromium baseline drift |
| `playwright test --reporter=list` | FAIL, 338 passed, 8 failed, 14 skipped |

## E2E Full Matrix Result

| Browser | Tests passed | Tests failed | Tests skipped |
|---|---:|---:|---:|
| chromium | 112 | 8 | 0 |
| firefox | 113 | 0 | 7 |
| webkit | 113 | 0 | 7 |

Firefox and WebKit failures were not observed in the full matrix. The 14
skips are the Chromium-only performance baseline specs skipped on Firefox and
WebKit.

## Chromium Baseline Blocker

The full matrix is blocked by existing Chromium baseline drift. Example:
`shell-home-chromium.png` expects an older 12-domain shell, while current
`tests/fixtures/module-template-v4/pages/shell-home.html` renders the
3-domain HMV4 fixture shell. The prompt explicitly prohibited regenerating
Chromium baselines, so the Chromium PNGs were left unchanged.

Failed Chromium visual pages:

- `domain-landing-quality-operations.html`
- `domain-landing-shopfloor-execution.html`
- `domain-landing.html`
- `module-landing-dispatch-board.html`
- `module-landing-empty.html`
- `module-landing-quality-case-management.html`
- `module-landing.html`
- `shell-home.html`

## Browser-Specific Issues Found and Fixed

- `tests/e2e/module-template-v4-visual.spec.ts` hard-skipped non-Chromium
  projects. The skip was removed so Firefox and WebKit baselines can run.
- Browser history could make links render as visited between runs. The visual
  test now normalizes `a:visited` to `var(--hmv4-accent)` for all browsers.
- The Playwright-managed PHP server can become unstable during long visual
  runs when request logs are piped. `playwright.config.ts` now ignores
  managed server stdout/stderr.

## Scope Deviation

`tests/e2e/module-template-v4-visual.spec.ts` was not in the original allowed
file list, but editing it was necessary because the existing non-Chromium skip
made Firefox/WebKit baseline capture impossible. No HMV4 renderer, bridge,
hydration, route, fixture, CSS, or portal source file was changed.

## CI Matrix Decision

- Keep the existing CI workflow Chromium-only for now.
- Do not enable an all-browser CI matrix until Chromium baselines are refreshed
  in a separate approved stream.
- After Chromium baseline drift is fixed, `npm run test:cross-browser` runs
  the full Playwright project matrix.

## Decision

CROSS_BROWSER_FAIL_BLOCK_NEXT
