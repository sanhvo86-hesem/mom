# V21 Cross-Browser Chromium Baseline Repair Plan

Date: 2026-04-25
Current main HEAD: `5f6376bb`

## Context

`_reports/module-template-v4/S_QA_CROSS_BROWSER_REPORT.md` records `CROSS_BROWSER_FAIL_BLOCK_NEXT` because Stream D.4 captured Firefox/WebKit baselines but was not allowed to regenerate stale Chromium baselines.

This integration review reran the requested current-main Chromium E2E command. Current `main` now passes Chromium:

```text
159 passed
CHROMIUM_EXIT=0
```

No Chromium snapshot update was executed in this review.

## Failing Chromium Baselines Listed In D4 Report

| page from D4 report | Chromium snapshot | current-main status | obsolete vs source-render-correct | repair decision |
|---|---|---:|---|---|
| `domain-landing-quality-operations.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-quality-operations-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `domain-landing-shopfloor-execution.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-shopfloor-execution-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `domain-landing.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `module-landing-dispatch-board.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-dispatch-board-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `module-landing-empty.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-empty-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `module-landing-quality-case-management.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-quality-case-management-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `module-landing.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |
| `shell-home.html` | `tests/e2e/module-template-v4-visual.spec.ts-snapshots/shell-home-chromium.png` | PASS in full Chromium E2E | D4 report is stale for current `main`; current source and baseline agree | No repair now |

## Current Evidence

- `tests/e2e/module-template-v4-visual.spec.ts-snapshots/*-chromium.png` count on current main: `53`
- `shell-home-chromium.png`, selected domain/module landing Chromium snapshots, and the live-mode Chromium baseline are present.
- Git history shows selected stale Chromium snapshots were last changed by `d8b71348 feat(module-template): add CAPA record shell prototype (Slice 4)`.
- `authoritative-record-shell-nc-live-mode-chromium.png` was added by `5f6376bb test(module-template-v4): add live mode chromium baseline`.

## Repair Recommendation

No source fix and no Chromium baseline regeneration are recommended for current `main` because the current Chromium E2E suite passed.

The D4 blocker should be treated as a historical report status that was superseded by later current-main commits. The integration report should mark the cross-browser blocker as resolved for Chromium current-main evidence, while preserving the D4 report as an audit record.

## Approved Fallback Command If Drift Reappears

Only run this if a future current-main Chromium visual run fails and the source render is reviewed as correct:

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --update-snapshots=all module-template-v4-visual.spec.ts
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium module-template-v4-visual.spec.ts
rm -rf node_modules
cd ../..
```

## Expected Files To Change If The Fallback Is Approved

Expected change set should be limited to failing Chromium visual snapshots, usually:

```text
tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-quality-operations-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-shopfloor-execution-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/domain-landing-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-dispatch-board-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-empty-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-quality-case-management-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/module-landing-chromium.png
tests/e2e/module-template-v4-visual.spec.ts-snapshots/shell-home-chromium.png
_reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_REPORT.md
```

If any source file changes are needed, stop and get explicit approval before editing source.

## Rollback Command

If an approved snapshot repair is executed and must be rolled back before commit:

```bash
git restore -- tests/e2e/module-template-v4-visual.spec.ts-snapshots/*-chromium.png _reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_REPORT.md
```

## Decision

```text
CHROMIUM_BASELINE_REPAIR_NOT_REQUIRED_ON_CURRENT_MAIN
```
