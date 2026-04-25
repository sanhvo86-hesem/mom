# GitHub Actions CI Workflow Draft for HMV4 E2E

**Generated**: 2026-04-25 (advisory draft, not committed to .github/workflows/ until approved)

## Purpose

Automate the V18 QA safety + E2E sequence on every push to `codex/*`
slice branches and PRs to main. Currently QA is only run locally per
slice. CI run = continuous regression confirmation.

## Constraints

- Repo has `mom/phpunit.xml` only — no existing GitHub Actions workflow
- Reports under `_reports/module-template-v4/` are tracked (per
  whitelist)
- `_reports/` directory must be created if absent
- E2E uses Playwright Chromium + PHP 8 built-in server
- node_modules must be cleaned before commit; CI run can keep them in
  workspace

## Recommended workflow file

Path: `.github/workflows/hmv4-e2e.yml`

```yaml
name: HMV4 prototype E2E

on:
  push:
    branches:
      - 'codex/**'
      - main
  pull_request:
    branches:
      - main

env:
  HMV4_PREVIEW_ENABLED: 'false'

jobs:
  safety-checks:
    name: HMV4 safety checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Node syntax check
        run: |
          for f in 70-module-template-v4-hydration 71-module-template-v4-routes \
                   72-module-template-v4-bridge 73-module-template-v4-renderers \
                   74-module-template-v4-fixtures; do
            node --check "mom/scripts/portal/$f.js"
            echo "PASS $f"
          done

      - name: JSON fixture parse
        run: |
          python3 - <<'PY'
          import json, pathlib, sys
          for p in pathlib.Path('tests/fixtures/module-template-v4').rglob('*.json'):
              try:
                  json.loads(p.read_text())
                  print('PASS', p.name)
              except Exception as e:
                  print('FAIL', p, e)
                  sys.exit(1)
          PY

      - name: Fixture production-load guard
        run: |
          if grep -n "74-module-template-v4-fixtures" mom/portal.html; then
            echo "FAIL fixture production load"
            exit 1
          fi
          echo "PASS no fixture production load"

      - name: Forbidden diff guard
        run: |
          DIFF=$(git diff --name-only origin/main..HEAD || true)
          if echo "$DIFF" | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$'; then
            echo "FAIL forbidden diff"
            exit 1
          fi
          echo "PASS forbidden diff"

      - name: Graphics Authority compliance check
        run: |
          # Look for hex colors in JS files (excluding comments)
          if grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/7[0-4]*.js | grep -v '//' ; then
            echo "FAIL: hardcoded hex colors in HMV4 JS"
            exit 1
          fi
          # Look for inline px in JS string concatenation
          if grep -nE '"\d+px"' mom/scripts/portal/7[0-4]*.js ; then
            echo "FAIL: hardcoded px in HMV4 JS string"
            exit 1
          fi
          echo "PASS graphics authority basic check"

  e2e:
    name: HMV4 Playwright E2E (Chromium)
    runs-on: ubuntu-latest
    needs: safety-checks
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Setup PHP for built-in server
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'

      - name: Install Playwright deps
        working-directory: tests/e2e
        run: |
          npm install --no-package-lock
          ./node_modules/.bin/playwright install chromium --with-deps

      - name: Run E2E
        working-directory: tests/e2e
        run: |
          ./node_modules/.bin/playwright test --project=chromium --reporter=list

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: .codex-playwright/
          retention-days: 7
```

## What this catches

- Slice authors accidentally modifying forbidden files
- Slice authors loading `74-fixtures.js` in production portal
- New slice introducing hardcoded hex/px in JS (Graphics Authority
  partial check)
- Broken JS syntax in any HMV4 module
- Broken JSON fixture
- Failing E2E test introduced by a slice

## What it does NOT catch

- CSS hex/px violations (the 19 currently in `module-template-v4.css`)
- Visual regression
- Performance regression
- Cross-browser compatibility (Firefox, WebKit)
- A11y deeper than what specs already cover (no axe-core)

## Activation steps (when approved)

1. Create `.github/workflows/hmv4-e2e.yml` with the YAML above
2. Verify branch protection rule on `main` requires this workflow
3. Test locally: `act push -W .github/workflows/hmv4-e2e.yml` (using `act`
   tool) to dry-run before pushing
4. First green run becomes the baseline; track failure rate

## Decision

```
CI_WORKFLOW_DRAFT_READY_FOR_USER_APPROVAL
```

**Do not enable until user explicitly approves**, since CI activation
adds GitHub Actions usage minutes and changes the contributor flow.
