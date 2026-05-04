# V21 Clean Main Stream Status Matrix

| stream | current local evidence | pass_warning_blocker | repair_required | owner_path | next_action |
| --- | --- | --- | --- | --- | --- |
| Current-main branch alignment | Replay branch created from `origin/main`; base `HEAD == origin/main == 7260a7d517603031265c18227ecf5c1d26aabc6e`. | PASS | None. | Release gate owner | Integrate reviewed repair commit if needed. |
| Six EQMS controller repairs | Six expected controller files are present in base HEAD-vs-parent diff. | PASS | None. | Backend EQMS owner | Preserve narrow backend repair behavior. |
| DCC fallback blocker | `DocumentHeaderServiceFallbackTest` now passes: 2 tests, 5 assertions. | PASS | Completed. | DCC backend owner | Preserve legacy catalog/bootstrap fallback until DCC rows are fully backfilled. |
| Static guards / syntax | HMV4 scripts 70-74 passed `node --check`. | PASS | None. | HMV4 owner | Continue guarding fixture-only script 74. |
| Current portal safety | Portal does not load fixture script 74; forbidden/current portal diff guard passed. | PASS | None. | Portal safety owner | Keep forbidden files unchanged. |
| Fixture JSON parse | All module-template-v4 fixture JSON parsed successfully. | PASS | None. | HMV4 QA owner | Keep fixture registry valid. |
| Backend PHPStan analyse | `composer --working-dir=mom run analyse` passed with no errors. | PASS | None. | Backend owner | Keep PHPStan clean. |
| Backend PHPUnit full suite | Full PHPUnit passed: 572 tests, 4903 assertions, 1 skipped. | PASS | None. | Backend owner | No remaining blocker from this replay. |
| Backend composer check | `composer --working-dir=mom run check` passed. | PASS | None. | Backend owner | No remaining blocker from this replay. |
| Transactional REST C2 | Focused C2 contracts passed: 36 tests, 153 assertions. | PASS | None. | Transactional REST owner | No C2 action from this replay. |
| Cross-browser / Chromium | Full Chromium Playwright passed: 491 tests, `CHROMIUM_EXIT=0`. | PASS | None. | QA / DevEx owner | No snapshot refresh required. |
| Final unlock audit evidence | All current replay gates pass after DCC fallback repair. | PASS | None. | Release gate owner | Stage F planning may be considered separately; not started here. |
