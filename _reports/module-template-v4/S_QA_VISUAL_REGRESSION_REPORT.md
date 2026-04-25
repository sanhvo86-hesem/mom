# Visual Regression Setup Report

## Summary
- 40 baselines captured.
- 40 fixture pages covered.
- N == M? YES.
- Skipped pages: none.

## Branch and working tree
- Branch: codex/qa-visual-regression
- Base: 8d3aaf5c fix(dcc): localize shell language switches atomically
- Note: requested base branch `codex/second-slice-planning-from-dispatch-qa` was unavailable during preflight. After user instruction to create a new branch and execute, this branch was created from the current local HEAD.

## Files changed
- `tests/e2e/playwright.config.ts` - extended `expect.toHaveScreenshot` tolerance and snapshot path template.
- `tests/e2e/module-template-v4-visual.spec.ts` - auto-discovered fixture visual regression spec.
- `tests/e2e/module-template-v4-visual.spec.ts-snapshots/` - 40 Chromium PNG baselines.
- `tests/e2e/package.json` - aligned visual update script to Chromium-only baselines.
- `tests/e2e/VISUAL_REGRESSION.md` - operator workflow documentation.
- `.gitattributes` - PNG binary handling.
- `_reports/module-template-v4/S_QA_VISUAL_REGRESSION_REPORT.md` - setup evidence report.

## Baseline capture
| Page | Snapshot | Size (bytes) |
|---|---|---:|
| authoritative-collection.html | authoritative-collection-chromium.png | 91084 |
| authoritative-record-shell-nc-audit.html | authoritative-record-shell-nc-audit-chromium.png | 133309 |
| authoritative-record-shell-nc-conflict.html | authoritative-record-shell-nc-conflict-chromium.png | 187216 |
| authoritative-record-shell-nc-degraded.html | authoritative-record-shell-nc-degraded-chromium.png | 191030 |
| authoritative-record-shell-nc-evidence.html | authoritative-record-shell-nc-evidence-chromium.png | 139918 |
| authoritative-record-shell-nc-investigation.html | authoritative-record-shell-nc-investigation-chromium.png | 142457 |
| authoritative-record-shell-nc-overview.html | authoritative-record-shell-nc-overview-chromium.png | 187841 |
| authoritative-record-shell-nc-partial-access.html | authoritative-record-shell-nc-partial-access-chromium.png | 198543 |
| authoritative-record-shell-nc-related.html | authoritative-record-shell-nc-related-chromium.png | 140425 |
| authoritative-record-shell-nc-signatures.html | authoritative-record-shell-nc-signatures-chromium.png | 136818 |
| authoritative-record-shell.html | authoritative-record-shell-chromium.png | 187345 |
| bridge-alias.html | bridge-alias-chromium.png | 134905 |
| degraded-states.html | degraded-states-chromium.png | 187345 |
| domain-landing-quality-operations.html | domain-landing-quality-operations-chromium.png | 121763 |
| domain-landing-shopfloor-execution.html | domain-landing-shopfloor-execution-chromium.png | 111595 |
| domain-landing.html | domain-landing-chromium.png | 124341 |
| durable-draft-shell.html | durable-draft-shell-chromium.png | 140599 |
| module-landing-dispatch-board.html | module-landing-dispatch-board-chromium.png | 108184 |
| module-landing-empty.html | module-landing-empty-chromium.png | 91753 |
| module-landing-quality-case-management.html | module-landing-quality-case-management-chromium.png | 115959 |
| module-landing.html | module-landing-chromium.png | 91796 |
| shell-home.html | shell-home-chromium.png | 226405 |
| unknown-alias.html | unknown-alias-chromium.png | 85559 |
| workspace-analytics.html | workspace-analytics-chromium.png | 113656 |
| workspace-archive.html | workspace-archive-chromium.png | 112990 |
| workspace-board-degraded.html | workspace-board-degraded-chromium.png | 188961 |
| workspace-board-empty.html | workspace-board-empty-chromium.png | 156865 |
| workspace-board.html | workspace-board-chromium.png | 241027 |
| workspace-dashboard.html | workspace-dashboard-chromium.png | 168975 |
| workspace-explorer.html | workspace-explorer-chromium.png | 114650 |
| workspace-matrix.html | workspace-matrix-chromium.png | 112867 |
| workspace-monitor.html | workspace-monitor-chromium.png | 114115 |
| workspace-packet.html | workspace-packet-chromium.png | 114118 |
| workspace-queue.html | workspace-queue-chromium.png | 112863 |
| workspace-tower.html | workspace-tower-chromium.png | 112821 |
| workspace-training-matrix-conflict.html | workspace-training-matrix-conflict-chromium.png | 185255 |
| workspace-training-matrix-degraded.html | workspace-training-matrix-degraded-chromium.png | 188674 |
| workspace-training-matrix-empty.html | workspace-training-matrix-empty-chromium.png | 168612 |
| workspace-training-matrix-partial-access.html | workspace-training-matrix-partial-access-chromium.png | 192522 |
| workspace-training-matrix.html | workspace-training-matrix-chromium.png | 229414 |

## Test result
- Baseline update: PASS, `PLAYWRIGHT_HTML_OPEN=never npm run test:visual-update` completed with 40 passed.
- Second-run determinism: PASS, `PLAYWRIGHT_HTML_OPEN=never npm run test:visual` completed with 40 passed.
- Any flaky pages? none observed.

## Stabilization techniques applied
- Animations and transitions disabled via CSS injection.
- Caret hidden and active element blurred before capture.
- Shell and route content readiness awaited before screenshot.
- HMV4 hydration hook re-applied when available.
- `document.fonts.ready`, `networkidle`, double `requestAnimationFrame`, and 100ms settle delay awaited.

## CI workflow advisory
`.github/workflows/hmv4-e2e.yml` was not edited because it is outside the allowed file list for this branch. Recommended follow-up step for the `e2e` job:

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

## Recommendations
- Cross-browser baselines for Firefox and WebKit remain deferred to D4.
- Add `mask:` for any future fixture region that becomes intentionally dynamic.
- Update baselines only on intentional UI changes via `npm run test:visual-update`.

## Decision
VISUAL_REGRESSION_PASS_READY_FOR_REVIEW
