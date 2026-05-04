# V21 Clean Main Command Log

## Orientation

Read before execution:

```text
.ai/AI-WORKFLOW.md
.ai/CONVENTIONS.md
.ai/repo-map.json
AGENTS.md
CLAUDE.md
HESEM_V21_FINAL_UNLOCK_STATUS_REVIEW_2026-04-29/prompts/CODEX_PROMPT_04_V21_CLEAN_MAIN_INTEGRATION_AND_FINAL_REPLAY.md
```

## Initial Main Checkout

```bash
git remote -v
git branch --show-current
git status --short
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -20
```

Key output:

```text
branch: main
HEAD: 7260a7d517603031265c18227ecf5c1d26aabc6e
origin/main: 7260a7d517603031265c18227ecf5c1d26aabc6e
status: untracked prompt/report artifacts in original checkout only
top commit: 7260a7d5 fix(eqms): clear backend static analysis gate
```

## Worktree Setup

```bash
git fetch origin
git worktree add ../mom-v21-clean-main-replay origin/main
cd ../mom-v21-clean-main-replay
git switch -c codex/v21-clean-main-replay-20260430
```

Result:

```text
Switched to a new branch 'codex/v21-clean-main-replay-20260430'
HEAD: 7260a7d517603031265c18227ecf5c1d26aabc6e
origin/main: 7260a7d517603031265c18227ecf5c1d26aabc6e
initial status: clean
```

## Repair Scope Check

```bash
git diff --name-only HEAD^ HEAD -- \
  mom/api/controllers/EqmsAmlController.php \
  mom/api/controllers/EqmsCsatController.php \
  mom/api/controllers/EqmsEventsController.php \
  mom/api/controllers/EqmsFaiController.php \
  mom/api/controllers/EqmsLessonsLearnedController.php \
  mom/api/controllers/EqmsSamplingPlansController.php
```

Output:

```text
mom/api/controllers/EqmsAmlController.php
mom/api/controllers/EqmsCsatController.php
mom/api/controllers/EqmsEventsController.php
mom/api/controllers/EqmsFaiController.php
mom/api/controllers/EqmsLessonsLearnedController.php
mom/api/controllers/EqmsSamplingPlansController.php
```

`git diff --name-only HEAD^ HEAD` also includes `.ai/` index artifacts and `_reports/` artifacts in the already-pushed `origin/main` commit.

## Static Frontend Guards

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
```

Result: all exited 0.

```bash
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
```

Output:

```text
PASS no fixture production load
```

```bash
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden/current portal diff" || echo "PASS forbidden/current portal diff"
```

Output:

```text
PASS forbidden/current portal diff
```

```bash
python3 - <<'PY'
import json, pathlib, sys
for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
    try:
        json.loads(p.read_text())
        print('PASS json', p)
    except Exception as e:
        print('FAIL json', p, e)
        sys.exit(1)
PY
```

Result: all fixture JSON files printed `PASS json`.

## Backend Gates Before DCC Fallback Repair

```bash
composer --working-dir=mom install --no-interaction --prefer-dist
```

Result: exit 0. Existing PSR-4 autoload warnings were printed.

```bash
composer --working-dir=mom run analyse
```

Output summary:

```text
[OK] No errors
```

```bash
composer --working-dir=mom run test
```

Output summary:

```text
FAILURES!
Tests: 572, Assertions: 4901, Failures: 1, Skipped: 1.
1) MOM\Tests\Unit\Services\DocumentHeaderServiceFallbackTest::testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle
Expected: QMS Manual
Actual: QMS-MAN-001
```

```bash
composer --working-dir=mom run check
```

Output summary:

```text
PHPStan: [OK] No errors
PHPUnit: same DCC fallback failure
Tests: 572, Assertions: 4901, Failures: 1, Skipped: 1.
```

```bash
cd mom && vendor/bin/phpunit tests/contract/TransactionalRestTest.php tests/contract/TransactionalLegacyRedirectTest.php && cd ..
```

Output:

```text
OK (36 tests, 153 assertions)
```

## Playwright Chromium

```bash
cd tests/e2e
npm install --no-package-lock
npx playwright install chromium
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
CHROMIUM_EXIT=$?
echo "CHROMIUM_EXIT=${CHROMIUM_EXIT}"
cd ../..
```

Output summary:

```text
491 passed (2.9m)
CHROMIUM_EXIT=0
```

Playwright generated `_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-30.md`; it was removed as an unintended test side-effect before writing the required replay report files.

## DCC Fallback Repair

Changed:

```text
mom/api/services/DocumentControl/DocumentHeaderService.php
```

Repair summary:

```text
DocumentHeaderService now reads legacy document rows from scan_cache.json,
docs_custom.local.json, docs_custom.json, and controlled-document DCC bootstrap
metadata. DB title/subtitle remain authoritative unless title is blank or only
the canonical doc code.
```

## Backend Gates After Repair

```bash
cd mom && vendor/bin/phpunit tests/Unit/Services/DocumentHeaderServiceFallbackTest.php
```

Output:

```text
OK (2 tests, 5 assertions)
```

```bash
composer --working-dir=mom run analyse
```

Output:

```text
[OK] No errors
```

```bash
composer --working-dir=mom run test
```

Output:

```text
OK, but some tests were skipped!
Tests: 572, Assertions: 4903, Skipped: 1.
```

```bash
composer --working-dir=mom run check
```

Output:

```text
PHPStan: [OK] No errors
PHPUnit: Tests: 572, Assertions: 4903, Skipped: 1.
```

```bash
cd mom && vendor/bin/phpunit tests/contract/TransactionalRestTest.php tests/contract/TransactionalLegacyRedirectTest.php && cd ..
```

Output:

```text
OK (36 tests, 153 assertions)
```

## Static / Fixture Guards After Repair

```bash
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/71-module-template-v4-routes.js
node --check mom/scripts/portal/72-module-template-v4-bridge.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js
node --check mom/scripts/portal/74-module-template-v4-fixtures.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL fixture production load" || echo "PASS no fixture production load"
git diff --name-only | grep -E 'mom/styles/(portal.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|mom/portal\.html' && echo "FAIL forbidden/current portal diff" || echo "PASS forbidden/current portal diff"
```

Output:

```text
node --check: all exit 0
PASS no fixture production load
PASS forbidden/current portal diff
Fixture JSON parse: all PASS json
```

## Chromium After Repair

```bash
cd tests/e2e
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
CHROMIUM_EXIT=$?
echo "CHROMIUM_EXIT=${CHROMIUM_EXIT}"
cd ../..
```

Output:

```text
491 passed (3.1m)
CHROMIUM_EXIT=0
```

Playwright generated `_reports/module-template-v4/PERFORMANCE_BASELINE_2026-04-30.md`; it was removed as an unintended test side-effect.

## AI Index

```bash
php tools/scripts/ai-index/generate.php --verbose
```

First sandbox run printed `Operation not permitted` warnings while writing `.ai/*`. Escalated rerun completed successfully:

```text
Done. Index written to .ai/
```
