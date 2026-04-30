# V21 Local Replay Review

## Reviewed artifact

Uploaded zip: `V21_LOCAL_REPLAY_2026-04-29.zip`

## Local replay decision from report

```text
PHASE2_INTEGRATION_PASS_WITH_REPAIRS_PENDING
```

## Current main evidence

| Field | Value |
|---|---|
| Branch | `codex/v21-phase2-local-replay-20260429` |
| HEAD | `d555d0d5a7c16df083d1a7e173b9ad97a9402e45` |
| origin/main | `d555d0d5a7c16df083d1a7e173b9ad97a9402e45` |
| Primary checkout dirty before review | `True` |
| Source changes performed | `False` |
| Snapshot updates performed | `False` |

## Gate evidence matrix

| Gate | Local report status | Interpretation |
|---|---:|---|
| Static HMV4 guards | `PASS` | Pass. No frontend syntax repair required for scripts 70–74. |
| Portal fixture safety | `PASS` | Pass. `mom/portal.html` does not load fixture script 74. |
| Fixture JSON parse | `PASS` | Pass. Fixture registry syntax is not the blocker. |
| HMV4 live API default | `PASS` | Pass. Static evidence says live API is not default-enabled in portal. |
| Transactional REST C2 focused tests | `PASS` | Pass. C2 focused contract behavior is not the blocker. |
| Backend analyse | `FAIL` | Fail. PHPStan reports 20 errors. |
| Backend test | `FAIL` | Fail. PHPUnit reports one DCC fallback-title assertion failure. |
| Backend check | `FAIL` | Fail. Stops at PHPStan analyse. |
| Playwright Chromium full | `BLOCKED` | Blocked. Browser missing before render. |
| Chromium exit | `1` | Non-zero. Cannot unlock Stage F. |
| Stage F unlock | `False` | False. |

## Hard blockers found in uploaded report

### B1 — Playwright Chromium environment blocker

The local Chromium suite discovered tests but failed before rendering because the local Playwright Chromium headless shell was missing:

```text
Missing Playwright Chromium headless shell at /Users/a10/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

This is not evidence of visual drift and does not authorize snapshot refresh. It requires browser installation and rerun.

### B2 — PHPStan backend blocker

`composer --working-dir=mom run analyse` found 20 errors:

- `mom/api/controllers/EqmsAmlController.php:227`: redundant `$_GET ??` pattern.
- `mom/api/controllers/EqmsCsatController.php:41`: unused `SURVEY_METHODS` constant.
- `mom/api/controllers/EqmsEventsController.php:77`: undefined `isLoggedIn()` method.
- `mom/api/controllers/EqmsEventsController.php:182/186/207`: array values accessed as object properties.
- `mom/api/controllers/EqmsFaiController.php:137`: ternary condition always true.
- `mom/api/controllers/EqmsLessonsLearnedController.php:113`: compact references undefined variables.
- `mom/api/controllers/EqmsLessonsLearnedController.php:257–263`: action methods declared as always terminating but do not always terminate.
- `mom/api/controllers/EqmsSamplingPlansController.php:43`: unused `SAMPLING_TYPES` constant.
- `mom/api/controllers/EqmsSamplingPlansController.php:138`: redundant `$_GET ??` pattern.

### B3 — PHPUnit backend blocker

`composer --working-dir=mom run test` ran 572 tests and failed one assertion:

```text
MOM\Tests\Unit\Services\DocumentHeaderServiceFallbackTest::testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle
Expected: QMS Manual
Actual:   QMS-MAN-001
```

## Decision interpretation

The report is correctly conservative. It proves that the current static/frontend safety guards are good, but it does not prove full V21 readiness. Stage F remains locked until Chromium can launch and backend gates are clean or explicitly accepted through a documented gate policy. For this project package, the strict recommendation is to require clean local replay before Stage F.

## Final local gate rule

Only this exact token unlocks Stage F:

```text
PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING
```

Any other token, including the current one, keeps implementation and slice execution blocked.
