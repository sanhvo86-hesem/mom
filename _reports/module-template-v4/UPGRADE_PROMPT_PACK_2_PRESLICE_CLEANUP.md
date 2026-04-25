# UPGRADE PROMPT PACK 2 — Pre-slice Cleanup

**Stream**: B (Pre-slice cleanup — parallel with Streams A/C/D/E)
**Goal**: Fix baseline tech debt before Slice 3 onwards builds on top of it
**Total prompts**: 3 (parallel — can run in different sessions/branches)

These three prompts can run **simultaneously** in different Codex sessions
with different branches. They do not depend on each other.

---

## B1 — Graphics Authority CSS Remediation 🟢 (parallel with B2, B3, Stream A)

### When to run
Anytime after STRATEGIC_MASTER baseline established. Recommended **before** Slice 4 lands.

### User must say
```
Proceed with Slice 0.5 graphics authority CSS remediation.
```

### Background
Per `_reports/module-template-v4/PARALLEL_RESEARCH_GRAPHICS_AUTHORITY_AUDIT.md`,
the file `mom/styles/module-template-v4.css` has **19 hardcoded values**
that violate the CLAUDE.md no-hardcode rule. These violate Graphics
Authority compliance and should be tokenized.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are remediating the 19 Graphics Authority violations in
mom/styles/module-template-v4.css. This is a Slice 0.5 cleanup task,
not a feature slice.

Do not implement new features.
Do not switch portal navigation.
Do not change forbidden files.
Do not promote registries.

Required base branch:
  codex/slice-0-5-graphics-authority-cleanup

Created from:
  codex/second-slice-planning-from-dispatch-qa

Allowed files:
  mom/styles/module-template-v4.css
  mom/styles/module-template-v4.tokens.css
  mom/data/config/design-system-config.json
  _reports/module-template-v4/S_GA_*.md

Optional (if migration is preferred over JSON):
  mom/api/migrations/<NNN>_hmv4_baseline_tokens.sql

Forbidden:
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js
  Any HMV4 JS or template file (those are not the source of violations)

The 19 violations to fix (ALL in mom/styles/module-template-v4.css):

| Line | Pattern | Code | Replace with |
|---|---|---|---|
| 16 | #fff color | color: #fff; (.hmv4-skip-link) | var(--hmv4-text-on-brand) |
| 37 | #fff color | color: #fff; (.hmv4-top-shell-header) | var(--hmv4-text-on-brand) |
| 38 | #fff in color-mix | color-mix(..., #fff 18%) | var(--hmv4-brand-tint-light) |
| 42 | rgba opacity | background: rgba(255,255,255,.16) | var(--hmv4-overlay-white-light) |
| 44a | px padding | padding: 8px 12px | var(--hmv4-space-2) var(--hmv4-space-3) |
| 44b | px width | min-width: min(40vw, 420px) | min(40vw, var(--hmv4-search-max-width)) |
| 44c | px radius | border-radius: 999px | var(--hmv4-radius-pill) |
| 44d | rgba border | border: 1px solid rgba(255,255,255,.25) | 1px solid var(--hmv4-border-light-subtle) |
| 44e | rgba bg | background: rgba(255,255,255,.12) | var(--hmv4-bg-white-subtle) |
| 44f | #fff color | color: #fff | var(--hmv4-text-on-brand) |
| 45 | rgba placeholder | color: rgba(255,255,255,.76) | var(--hmv4-text-placeholder-on-brand) |
| 55 | px font-size | font-size: 12px | var(--hmv4-font-size-label) |
| 56 | px padding | padding: 8px 10px | var(--hmv4-space-2) var(--hmv4-space-2-5) |
| 61 | px gap | gap: 6px | var(--hmv4-space-1-5) |
| 62 | px margin | margin-right: 6px | var(--hmv4-space-1-5) |
| 70 | px margin | margin: 6px 0 0 | var(--hmv4-space-1-5) 0 0 |
| 79 | px gap | gap: 4px | var(--hmv4-space-1) |
| 80 | px padding | padding: 10px 12px | var(--hmv4-space-2-5) var(--hmv4-space-3) |
| 89 | #fff color | color: #fff (.hmv4-button--primary) | var(--hmv4-text-on-brand) |

Step 1: Add 9 new tokens to mom/styles/module-template-v4.tokens.css:

  --hmv4-text-on-brand: #fff;
  --hmv4-brand-tint-light: color-mix(in srgb, var(--hmv4-brand), white 18%);
  --hmv4-overlay-white-light: rgba(255,255,255,.16);
  --hmv4-border-light-subtle: rgba(255,255,255,.25);
  --hmv4-bg-white-subtle: rgba(255,255,255,.12);
  --hmv4-text-placeholder-on-brand: rgba(255,255,255,.76);
  --hmv4-radius-pill: 999px;
  --hmv4-search-max-width: 420px;
  --hmv4-space-1-5: 6px;
  --hmv4-space-2-5: 10px;
  --hmv4-font-size-label: 12px;

NOTE: token values are hardcoded INSIDE the tokens file (this is the
source of truth, hex/px allowed only here). Component CSS must
reference var(--hmv4-*).

Step 2: Edit mom/styles/module-template-v4.css per the table.

Step 3: Re-grep to verify zero violations:

  grep -nE '#[0-9a-fA-F]{6}\b' mom/styles/module-template-v4.css | grep -v "//"
  Expected: zero hex matches outside :root or selectors that DEFINE tokens.

  grep -nE '\d+px\b' mom/styles/module-template-v4.css | grep -v "//" | head -20
  Expected: only matches in tokens file or 0px usages.

  grep -nE 'rgba\(' mom/styles/module-template-v4.css | grep -v "//"
  Expected: only matches in tokens file.

Step 4: Optional — also add tokens to graphics_token_catalog table.

If migration is approved, create:
  mom/api/migrations/<NNN>_hmv4_baseline_tokens.sql

INSERT INTO graphics_token_catalog (token_key, css_variable, default_value,
description, owner_module, ...) VALUES
  ('hmv4.text.on-brand', '--hmv4-text-on-brand', '#fff', ...),
  ...

Each new token gets a row.

If migration is NOT approved (defer to admin UI), skip Step 4.

Step 5: E2E regression check.

  cd tests/e2e
  npm install --no-package-lock
  npm run test:hmv4 -- --project=chromium
  rm -rf node_modules

Expected: 23+ tests still pass (no functional regression from CSS-only refactor).

Step 6: Visual smoke (optional, if Codex environment supports browser):

  Manually verify:
  - .hmv4-skip-link still has white text
  - .hmv4-search input still has light border
  - .hmv4-button--primary still has white text
  - Colors and shadows visually identical to before refactor

Generate report:
  _reports/module-template-v4/S_GA_REMEDIATION_REPORT.md

Sections:
  ## Summary
  ## Branch and working tree
  ## Tokens added (9 new)
  ## CSS rules refactored (19 violations)
  ## Pre/post grep results
  ## E2E regression result
  ## Visual smoke (if performed)
  ## Migration SQL (if generated)
  ## Rollback notes
  ## Remaining warnings
  ## Decision

Decision phrase output (one of):
  GA_REMEDIATION_PASS_READY_FOR_REVIEW
  GA_REMEDIATION_PASS_WITH_WARNINGS
  GA_REMEDIATION_FAIL_BLOCK_NEXT
```

### Expected outputs
- 9 new CSS tokens
- 19 CSS rules refactored
- 1 SQL migration (optional)
- 1 remediation report
- 23+ E2E tests still pass

### Estimated time
1-2 hours Codex execution.

---

## B2 — Slice 0.5 Navigation Shell 🟢 (parallel with B1, B3, Stream A)

### When to run
Anytime after STRATEGIC_MASTER baseline. Recommended **before** Slice 4 so users can navigate to module landings.

### User must say
```
Proceed with Slice 0.5 navigation shell prototype.
```

### Background
Currently, HMV4 only renders WS workspace and AR record routes. The
SH/DL/ML route classes (shell home / domain landing / module landing)
are implicit but not fixture-tested. A user landing on `/ops` or
`/ops/quality-compliance/quality-case-management` sees nothing useful.

This slice adds 3 thin renderers + 6 fixture pages so HMV4 becomes a
navigable surface.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are implementing the Slice 0.5 navigation shell prototype. This adds
domain landing, module landing, and shell home rendering so HMV4
becomes browsable. This is a small, scoped slice; not a record-shell
or workspace slice.

Do not switch current portal navigation.
Do not implement backend APIs.
Do not promote fixture registries to mom/qms-data.
Do not change forbidden files.

Required base branch:
  codex/slice-0-5-navigation-shell

Created from:
  codex/second-slice-planning-from-dispatch-qa

Allowed files:
  mom/scripts/portal/73-module-template-v4-renderers.js
  mom/scripts/portal/72-module-template-v4-bridge.js
  tests/e2e/module-template-v4*.spec.ts
  tests/fixtures/module-template-v4/**
  _reports/module-template-v4/S_NAV_SHELL_*.md

Forbidden:
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js

Routes to render:

1. SH (shell home) at /ops:
   - data-route-class="SH"
   - 14 domain tiles
   - search bar (read-only fixture, no submit)

2. DL (domain landing) at /ops/{domain}:
   - data-route-class="DL"
   - data-domain-key="<domain>"
   - module tiles for the domain (3-6 tiles per domain)
   - re-anchor link: "Open record from quick search"

3. ML (module landing) at /ops/{domain}/{module}:
   - data-route-class="ML"
   - data-domain-key + data-module-key
   - workspace tiles + record-collection tile + recent records tile
   - explicit redirect resolver if module has only one workspace

Renderer extensions in 73-module-template-v4-renderers.js:

  function renderShellHome(route)
  function renderDomainLanding(route)
  function renderModuleLanding(route)

The renderers must dispatch from existing renderRoute switch:
  if(route.routeClass === 'SH') return renderShellHome(route);
  if(route.routeClass === 'DL') return renderDomainLanding(route);
  if(route.routeClass === 'ML') return renderModuleLanding(route);

Each renderer reads from window.HMV4_NAV_SHELL_FIXTURE or
nav-shell-fixtures.json.

Required fixtures:

  tests/fixtures/module-template-v4/nav-shell-fixtures.json
  tests/fixtures/module-template-v4/pages/shell-home.html
  tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html
  tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html
  tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html
  tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html
  tests/fixtures/module-template-v4/pages/module-landing-empty.html

nav-shell-fixtures.json schema (sketch):

{
  "version": "0.1",
  "domains": [
    { "key": "commercial", "name": "Commercial & Customer", "modules": ["quotes", "sales-orders", ...] },
    { "key": "quality-compliance", "name": "Quality & Compliance", "modules": ["quality-case-management", "capa", "controlled-documents", ...] },
    ...14 domains total
  ],
  "modules": [
    { "key": "quality-case-management", "domainKey": "quality-compliance", "name": "Quality Case Management", "tiles": [...] },
    ...46 modules total
  ]
}

NOTE: do not embed all 46 modules; minimal coverage of 3 domains × 6 modules = 18 modules is acceptable for fixture.

Required E2E checks (extend module-template-v4.spec.ts):
  - /ops route parses as SH and renders 14 domain tiles
  - /ops/quality-compliance parses as DL and renders module tiles
  - /ops/quality-compliance/quality-case-management parses as ML
  - module landing without subject context renders tiles, no mutation
  - empty module landing fixture renders empty-state copy
  - record-open links route to /ops/records/{family}/{id}?tab=overview
  - bridge aliases continue to work (dispatch, ncr, training)
  - unknown alias remains unmapped_needs_decision
  - current portal inert by default
  - 74 absent from portal.html

Total target: extend by ~8 tests → 31 passing tests.

Required commands:
  cd tests/e2e
  npm install --no-package-lock
  npm run test:hmv4 -- --project=chromium
  rm -rf node_modules

  (back to repo root)
  node --check mom/scripts/portal/70-module-template-v4-hydration.js
  node --check mom/scripts/portal/71-module-template-v4-routes.js
  node --check mom/scripts/portal/72-module-template-v4-bridge.js
  node --check mom/scripts/portal/73-module-template-v4-renderers.js
  node --check mom/scripts/portal/74-module-template-v4-fixtures.js

Forbidden diff guard + fixture production-load guard (must PASS).

Generate:
  _reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md

Decision phrase output (one of):
  NAV_SHELL_PASS_READY_FOR_REVIEW
  NAV_SHELL_PASS_WITH_WARNINGS
  NAV_SHELL_FAIL_BLOCK_NEXT
```

### Expected outputs
- 3 new renderer functions
- 6 new fixture pages
- 1 fixture JSON
- ~8 new E2E tests
- 1 implementation report

### Estimated time
2-3 hours Codex execution.

---

## B3 — CI Workflow Activation 🟢 (parallel with B1, B2, Stream A)

### When to run
After at least one slice has stabilized (e.g., after Slice 2 QA pass — already met).

### User must say
```
Activate HMV4 CI workflow.
```

### Background
A CI workflow draft exists at `_reports/module-template-v4/CI_WORKFLOW_DRAFT.md`.
This prompt creates the actual `.github/workflows/hmv4-e2e.yml` file
and validates it works against the current branch state.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are activating the HMV4 E2E CI workflow on GitHub Actions.

Do not change forbidden files.
Do not modify the slice cycle.

Required base branch:
  codex/ci-hmv4-e2e-workflow

Created from:
  codex/second-slice-planning-from-dispatch-qa

Allowed files:
  .github/workflows/hmv4-e2e.yml (create new)
  _reports/module-template-v4/S_CI_*.md
  Optionally: tests/e2e/.env.ci (if env vars needed)

Forbidden:
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js
  Any other production source

Step 1: Read the CI draft at _reports/module-template-v4/CI_WORKFLOW_DRAFT.md.

Step 2: Create .github/workflows/hmv4-e2e.yml using the YAML in the draft.

Adjust as follows:
  - Pin actions/checkout@v4 and actions/setup-node@v4 to specific SHAs
    (security best practice)
  - Set Node version to 22 (matches local dev)
  - Set PHP version to 8.2
  - Add concurrency block to cancel in-progress runs on the same branch
  - Add timeout-minutes per job (15 for safety, 25 for E2E)

Step 3: Local dry-run validation.

If the local environment has the `act` tool:
  act push -W .github/workflows/hmv4-e2e.yml -j safety-checks --container-architecture linux/amd64

If `act` is not available, skip dry-run. Instead, validate YAML syntax:
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/hmv4-e2e.yml'))"

Step 4: Commit but DO NOT push.

Step 5: User reviews the YAML manually.

Step 6: After user approves, push the branch.

Step 7: Open PR to main:
  gh pr create --title "ci(hmv4): activate E2E + safety guards on push and PR" \
    --body "Activates HMV4 prototype CI workflow per CI_WORKFLOW_DRAFT.md.\nRuns safety-checks + Playwright Chromium E2E on push to codex/* and PR to main."

Step 8: Watch the first PR run.

If first run is GREEN:
  - Decision: CI_ACTIVATION_PASS_READY_FOR_REVIEW

If first run FAILS due to environment differences (Node/PHP versions, etc.):
  - Iterate on .github/workflows/hmv4-e2e.yml until run is GREEN
  - Update branch with fixes
  - Decision after success: CI_ACTIVATION_PASS_WITH_WARNINGS

If first run FAILS due to actual code issues:
  - Stop and report
  - Decision: CI_ACTIVATION_FAIL_BLOCK_NEXT

Generate:
  _reports/module-template-v4/S_CI_ACTIVATION_REPORT.md

Sections:
  ## Summary
  ## Workflow file generated
  ## Local dry-run result (if performed)
  ## Push and PR
  ## First CI run result
  ## Iterations needed (if any)
  ## Decision

Decision phrase output (one of):
  CI_ACTIVATION_PASS_READY_FOR_REVIEW
  CI_ACTIVATION_PASS_WITH_WARNINGS
  CI_ACTIVATION_FAIL_BLOCK_NEXT
```

### Expected outputs
- `.github/workflows/hmv4-e2e.yml`
- 1 activation report
- First green CI run

### Estimated time
30 min setup + waiting for CI runs (~10 min each iteration).

---

## Pack 2 timing summary

| Step | Codex time | User review | Total |
|---|---|---|---|
| B1 GA remediation | 1-2 hr | 30 min | ~2 hr |
| B2 Nav shell | 2-3 hr | 30 min | ~3 hr |
| B3 CI activation | 30 min + iterations | 15 min | ~1 hr |

If run in **3 parallel sessions**, total elapsed ≈ 3 hours.
If run sequentially, total ≈ 6 hours.

After all 3 pass, the baseline is clean and Slice 3 (or Slice 4 if 3 already done) inherits a healthier surface.
