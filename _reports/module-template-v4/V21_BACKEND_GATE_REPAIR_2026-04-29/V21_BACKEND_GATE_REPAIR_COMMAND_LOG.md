# V21 Backend Gate Repair Command Log

Run timestamp: 2026-04-30T11:23:55+0700

## Orientation

Commands run:

- `cat .ai/AI-WORKFLOW.md`
- `cat .ai/CONVENTIONS.md`
- `cat .ai/repo-map.json`
- `rg -n "EqmsAmlController|EqmsCsatController|EqmsEventsController|EqmsFaiController|EqmsLessonsLearnedController|EqmsSamplingPlansController|DocumentHeaderService|DocumentHeaderServiceFallbackTest|BaseController" .ai/symbols.json`
- `rg -n "dcc_document_header|doc_description|doc_descriptions|document_header|documents|controlled_doc|document_control|dcc" .ai/db-map/index.json`
- `cat AGENTS.md`
- `cat CLAUDE.md`

Result: PASS. Placement rule confirmed: generated AI/test reports belong under `_reports/<category>/`.

## Branch And Baseline State

Command:

```bash
git branch --show-current
```

Output before branch creation:

```text
main
```

Command:

```bash
git status --short
```

Output before branch creation:

```text
 M mom/api/controllers/DocumentControlController.php
 M mom/api/routes/dcc-routes.php
 M mom/api/services/DocumentControl/DocumentLocaleAutomationService.php
 M mom/scripts/portal/02-state-auth-ui.js
 M tools/scripts/translation/dcc_argos_vi_to_en.py
 M tools/scripts/translation/dcc_locale_backfill.php
?? HESEM_V21_LOCAL_REPLAY_REVIEW_AND_REPAIR_PROMPTS_2026-04-29.zip
?? HESEM_V21_LOCAL_REPLAY_REVIEW_AND_REPAIR_PROMPTS_2026-04-29/
?? TASKS.md
?? _reports/module-template-v4/V21_ENV_REPLAY_2026-04-29/
?? _reports/module-template-v4/V21_LOCAL_REPLAY_2026-04-29/
?? dashboard.html
?? mom/scripts/portal/00e-admin-translation-provider.js
?? tools/scripts/translation/dcc_nllb_vi_to_en.py
```

Command:

```bash
git checkout -b codex/v21-backend-gate-repair-20260429
```

Sandbox result:

```text
fatal: cannot lock ref 'refs/heads/codex/v21-backend-gate-repair-20260429': Unable to create '/Users/a10/Documents/mom/.git/refs/heads/codex/v21-backend-gate-repair-20260429.lock': Operation not permitted
```

Escalated rerun result:

```text
Switched to a new branch 'codex/v21-backend-gate-repair-20260429'
```

## Baseline Failure Reproduction

Command:

```bash
composer --working-dir=mom run analyse
```

Sandbox result:

```text
Failed to listen on "tcp://127.0.0.1:0": Operation not permitted (EPERM)
```

Escalated rerun result:

```text
[ERROR] Found 20 errors
```

The reproduced PHPStan failures matched the V21 list:

- `EqmsAmlController.php:227`
- `EqmsCsatController.php:41`
- `EqmsEventsController.php:77,182,186,207`
- `EqmsFaiController.php:137`
- `EqmsLessonsLearnedController.php:113,257-263`
- `EqmsSamplingPlansController.php:43,138`

Command:

```bash
composer --working-dir=mom run test -- --filter DocumentHeaderServiceFallbackTest
```

Output:

```text
OK (2 tests, 5 assertions)
```

The previously reported DCC fallback test failure was not reproducible on the current branch state.

## Focused Syntax Checks

Commands:

```bash
php -l mom/api/controllers/EqmsAmlController.php
php -l mom/api/controllers/EqmsCsatController.php
php -l mom/api/controllers/EqmsEventsController.php
php -l mom/api/controllers/EqmsFaiController.php
php -l mom/api/controllers/EqmsLessonsLearnedController.php
php -l mom/api/controllers/EqmsSamplingPlansController.php
```

Output:

```text
No syntax errors detected in all six touched controller files.
```

## PHPStan Repair Replay

Command:

```bash
composer --working-dir=mom run analyse
```

First repair rerun:

```text
EqmsEventsController.php:366 Method sendSseError() is unused.
```

After removing the now-unused helper:

```text
[OK] No errors
```

## Required Backend Validation

Command:

```bash
composer --working-dir=mom run test
```

Output:

```text
OK, but some tests were skipped!
Tests: 572, Assertions: 4903, Skipped: 1.
```

Command:

```bash
composer --working-dir=mom run check
```

Output:

```text
[OK] No errors
OK, but some tests were skipped!
Tests: 572, Assertions: 4903, Skipped: 1.
```

Command:

```bash
cd mom && vendor/bin/phpunit tests/contract/TransactionalRestTest.php tests/contract/TransactionalLegacyRedirectTest.php && cd ..
```

Output:

```text
OK (36 tests, 153 assertions)
```

## Required V21 Frontend Static Guards

Commands:

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
```

Output:

```text
All node --check commands exited 0.
PASS no fixture production load
```

## Chromium Replay

Command:

```bash
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
```

Sandbox result:

```text
Error: Process from config.webServer was not able to start. Exit code: 1
php -S 127.0.0.1:8091 -t ../.. -> Failed to listen on 127.0.0.1:8091 (reason: Operation not permitted)
```

Escalated rerun output:

```text
491 passed (3.1m)
CHROMIUM_EXIT=0
```

Known generated side effect:

```text
_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-30.md
```

It did not exist before this replay and was removed from the worktree because Prompt 02 only approved the V21 backend gate repair report bundle.

## Final Worktree Check

Command:

```bash
git diff --check -- mom/api/controllers/EqmsAmlController.php mom/api/controllers/EqmsCsatController.php mom/api/controllers/EqmsEventsController.php mom/api/controllers/EqmsFaiController.php mom/api/controllers/EqmsLessonsLearnedController.php mom/api/controllers/EqmsSamplingPlansController.php
```

Output:

```text
PASS, no whitespace errors.
```
