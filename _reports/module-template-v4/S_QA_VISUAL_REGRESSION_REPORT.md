# S_QA_VISUAL_REGRESSION_REPORT — HMV4 Visual Regression Setup

**Pack**: 4 — Stream D2 (Visual regression)
**Branch**: `codex/second-slice-planning-from-dispatch-qa` (bundled with D3/D4/D5)
**Date**: 2026-04-25

---

## Summary

Playwright `toHaveScreenshot()` visual regression integrated into the
HMV4 E2E suite. 13 baseline PNGs captured across all current Wave-1
fixture pages (Slice 1 dispatch board + Slice 2 NC record shell, plus
empty/degraded/conflict/partial-access state variants).

Threshold: `maxDiffPixels: 200`, `threshold: 0.15`,
`animations: 'disabled'`. Snapshot path template includes
`{projectName}` so future cross-browser runs (Pack 4 D4) generate
sibling baselines automatically (e.g. `shell-home-firefox.png`).

**Decision**: `VISUAL_REGRESSION_PASS_READY_FOR_REVIEW`

---

## Spec file added

`tests/e2e/module-template-v4-visual.spec.ts` (33 lines)
- One `test.describe` block, `viewport: 1280x800`
- Loops over 13 fixture pages
- Per-test: `goto → networkidle → wait for [data-hm-shell="ops"] →
  document.fonts.ready → toHaveScreenshot(fullPage)`

## Config extension

`tests/e2e/playwright.config.ts`:
- `expect.toHaveScreenshot` defaults set:
  `maxDiffPixels: 200, threshold: 0.15, animations: 'disabled'`
- `snapshotPathTemplate: '__snapshots__/{testFilePath}/{arg}-{projectName}{ext}'`

## package.json scripts added

```json
"test:visual": "playwright test module-template-v4-visual.spec.ts --project=chromium",
"test:visual-update": "playwright test module-template-v4-visual.spec.ts --update-snapshots"
```

## Baselines captured

13 PNGs, total ~2.2 MB (Chromium):

| Spec | Fixture page | Baseline file |
|---|---|---|
| visual: shell-home | shell-home.html | shell-home-chromium.png |
| visual: workspace-board | workspace-board.html | workspace-board-chromium.png |
| visual: workspace-board-empty | workspace-board-empty.html | workspace-board-empty-chromium.png |
| visual: workspace-board-degraded | workspace-board-degraded.html | workspace-board-degraded-chromium.png |
| visual: nc-overview | authoritative-record-shell-nc-overview.html | nc-overview-chromium.png |
| visual: nc-investigation | authoritative-record-shell-nc-investigation.html | nc-investigation-chromium.png |
| visual: nc-evidence | authoritative-record-shell-nc-evidence.html | nc-evidence-chromium.png |
| visual: nc-related | authoritative-record-shell-nc-related.html | nc-related-chromium.png |
| visual: nc-audit | authoritative-record-shell-nc-audit.html | nc-audit-chromium.png |
| visual: nc-signatures | authoritative-record-shell-nc-signatures.html | nc-signatures-chromium.png |
| visual: nc-conflict | authoritative-record-shell-nc-conflict.html | nc-conflict-chromium.png |
| visual: nc-partial-access | authoritative-record-shell-nc-partial-access.html | nc-partial-access-chromium.png |
| visual: nc-degraded | authoritative-record-shell-nc-degraded.html | nc-degraded-chromium.png |

Stored under `tests/e2e/__snapshots__/module-template-v4-visual.spec.ts/`.

## Test result

First run with `--update-snapshots`: 13 PNGs written, 13 passed in 14.4s.
Second run without `--update-snapshots`: **13/13 PASS in 11.9s** —
baselines stable on consecutive runs (no inherent flakiness from font
metrics, animations, or layout jitter).

Combined HMV4 E2E suite is now: **49 tests** (23 functional + 13 a11y +
13 visual).

## CI integration plan

When `.github/workflows/hmv4-e2e.yml` is activated (Pack 2 / B3):

1. Run `npm run test:visual` as a separate job step after
   `test:hmv4`.
2. On failure, upload `tests/e2e/__snapshots__-diff/` and
   `.codex-playwright/module-template-v4-results/` as workflow
   artifacts so reviewers can see the visual diff.
3. Cache `~/.cache/ms-playwright` to skip browser re-download.
4. Do NOT run `test:visual-update` in CI — baselines are committed
   from local machines only.

## Maintenance procedure

1. **When a renderer or token intentionally changes the visual**:
   ```
   cd tests/e2e
   npm run test:visual-update -- --project=chromium
   git add tests/e2e/__snapshots__/
   git diff --stat tests/e2e/__snapshots__/
   ```
   Inspect the new PNGs visually before committing — confirm the
   change matches the design intent.
2. **When adding a new fixture page** (e.g. Slice 3 Training Matrix):
   add the page to `fixturePages` array in
   `module-template-v4-visual.spec.ts`, then run
   `npm run test:visual-update`.
3. **When platform fonts change** (macOS / Linux render differently):
   baselines are platform-specific. CI runners must use a consistent
   OS image (Ubuntu LTS recommended). Local-mac baselines may diff
   from Linux-CI baselines — accept either as authoritative and
   regenerate on the other platform separately. The
   `snapshotPathTemplate` already segregates per `{projectName}`; if
   needed, also segregate per OS by adding `--snapshot-suffix` or
   adjusting the template to `{platform}-{projectName}`.

## Decision

`VISUAL_REGRESSION_PASS_READY_FOR_REVIEW`

13 baselines captured; 13/13 stable on second run; spec added to
`test:hmv4` glob; CI integration plan documented; maintenance
procedure documented.
