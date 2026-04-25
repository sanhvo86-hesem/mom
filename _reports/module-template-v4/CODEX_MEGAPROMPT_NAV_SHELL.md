# CODEX MEGAPROMPT — Slice 0.5 Navigation Shell (SH/DL/ML)

> Paste into Codex local. Codex creates branch
> `codex/slice-0-5-navigation-shell`, implements shell home + domain landing
> + module landing renderers + fixtures, commits.
>
> **Run this OR Slice 3 implementation, NOT both at once** — both touch
> `73-module-template-v4-renderers.js` and would conflict on merge.
>
> Approval phrase: `Proceed with Slice 0.5 navigation shell prototype.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are implementing **Slice 0.5 = navigation shell** (SH/DL/ML route classes) of the HMV4 prototype program. Currently HMV4 only renders WS workspaces (Slice 1) and AR record shells (Slice 2). The SH (`/ops`), DL (`/ops/{domain}`), and ML (`/ops/{domain}/{module}`) routes are implicit but never fixture-tested. After this slice, HMV4 becomes a navigable surface — a user can land on `/ops` and browse to any module without hand-typing routes.

This is **development/prototype work only**. No live API. Fixture-backed only.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT switch current portal navigation.
Do NOT implement backend APIs.
Do NOT promote fixture registries.
Do NOT change forbidden files.
Do NOT add module mutation actions (this is read-only navigation).
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout codex/second-slice-planning-from-dispatch-qa
git pull --ff-only

git status --short
# Expected: empty

# Verify HMV4 surface intact
ls mom/scripts/portal/7?-module-template-v4-*.js
# Expected: 70-74

# Verify ancestor commits
git log --oneline | grep -E "24d57d9a|2eb6a7aa|9289ef89" | head -3

# Branch
git checkout -b codex/slice-0-5-navigation-shell
```

If fail, return `NAV_SHELL_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/72-module-template-v4-bridge.js (only if alias additions needed)
tests/e2e/module-template-v4.spec.ts
tests/e2e/module-template-v4-axe.spec.ts (extend fixture page list)
tests/fixtures/module-template-v4/nav-shell-fixtures.json (NEW)
tests/fixtures/module-template-v4/pages/shell-home.html (existing — UPDATE)
tests/fixtures/module-template-v4/pages/domain-landing.html (existing — UPDATE)
tests/fixtures/module-template-v4/pages/module-landing.html (existing — UPDATE)
tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html (NEW)
tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html (NEW)
tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html (NEW)
tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html (NEW)
tests/fixtures/module-template-v4/pages/module-landing-empty.html (NEW)
_reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md (NEW)
```

Only if strictly needed:

```text
mom/styles/module-template-v4.css (only for new shell-grid layout if absent)
```

## FORBIDDEN

```text
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/**
mom/api/**
```

## TARGET ROUTES

| Route class | Path pattern | Example |
|---|---|---|
| **SH** | `/ops` | `/ops` |
| **DL** | `/ops/{domain}` | `/ops/quality-compliance` |
| **ML** | `/ops/{domain}/{module}` | `/ops/quality-compliance/quality-case-management` |

### Required render attributes

For SH:
```text
data-route-class="SH"
data-hmv4-shell-home
```

For DL:
```text
data-route-class="DL"
data-hmv4-domain-landing
data-domain-key="<domain>"
```

For ML:
```text
data-route-class="ML"
data-hmv4-module-landing
data-domain-key="<domain>"
data-module-key="<module>"
```

## STEP 1 — Read existing renderer pattern

```bash
grep -nE 'function render(DispatchBoardWorkspace|NonconformanceRecord)\(' mom/scripts/portal/73-module-template-v4-renderers.js
grep -nE 'window\.Hmv4Renderers' mom/scripts/portal/73-module-template-v4-renderers.js
grep -nE 'function renderRoute\(' mom/scripts/portal/73-module-template-v4-renderers.js
```

Note the dispatch table shape, the `applyShell` helper, and the `readJsonFixture` helper. Match the pattern.

## STEP 2 — Implement 3 renderers

Add to `73-module-template-v4-renderers.js`:

```js
function renderShellHome(route){
  var fixture = window.HMV4_NAV_SHELL_FIXTURE || readJsonFixture('[data-hmv4-nav-shell-fixture]') || {};
  var domains = (fixture.domains || []);
  var search = '<form class="hmv4-search" role="search" aria-label="Search records or workspaces" data-hmv4-shell-search><input type="search" placeholder="Search…" disabled aria-disabled="true"></form>';
  var tiles = domains.map(function(d){
    var moduleCount = (d.modules || []).length;
    return '<a class="hmv4-card hmv4-domain-tile" href="/ops/'+esc(d.key)+'" data-hmv4-domain-tile data-domain-key="'+esc(d.key)+'">'+
      '<h2>'+esc(d.name)+'</h2>'+
      '<p class="hmv4-text-2">'+moduleCount+' module'+(moduleCount===1?'':'s')+'</p>'+
    '</a>';
  }).join('');
  return '<section class="hmv4-shell-home" data-hmv4-shell-home data-route-class="SH">'+
    '<header class="hmv4-page-header-zone"><h1>Operations</h1>'+search+'</header>'+
    '<div class="hmv4-grid">'+tiles+'</div>'+
  '</section>';
}

function renderDomainLanding(route){
  var p = route.params || {};
  var domainKey = p.domain || '';
  var fixture = window.HMV4_NAV_SHELL_FIXTURE || readJsonFixture('[data-hmv4-nav-shell-fixture]') || {};
  var domains = (fixture.domains || []);
  var modules = (fixture.modules || []);

  var domain = null;
  for(var i=0;i<domains.length;i++) if(domains[i].key === domainKey) domain = domains[i];

  if(!domain){
    return '<section class="hmv4-domain-landing" data-hmv4-domain-landing data-route-class="DL" data-domain-key="'+esc(domainKey)+'" data-fixture-state="unknown">'+
      '<div class="hmv4-feedback" data-feedback-state="warning">Unknown domain "'+esc(domainKey)+'". Open <a href="/ops">shell home</a>.</div>'+
    '</section>';
  }

  var moduleKeys = (domain.modules || []);
  var domainModules = modules.filter(function(m){ return moduleKeys.indexOf(m.key) >= 0; });

  var tiles = domainModules.map(function(m){
    return '<a class="hmv4-card hmv4-module-tile" href="/ops/'+esc(domainKey)+'/'+esc(m.key)+'" data-hmv4-module-tile data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(m.key)+'">'+
      '<h3>'+esc(m.name)+'</h3>'+
      (m.summary ? '<p class="hmv4-text-2">'+esc(m.summary)+'</p>' : '')+
    '</a>';
  }).join('');

  var crumbs = '<nav aria-label="Breadcrumb"><ol class="hmv4-breadcrumb"><li><a href="/ops">Operations</a></li><li aria-current="page">'+esc(domain.name)+'</li></ol></nav>';

  return '<section class="hmv4-domain-landing" data-hmv4-domain-landing data-route-class="DL" data-domain-key="'+esc(domainKey)+'">'+
    '<header class="hmv4-page-header-zone">'+crumbs+'<h1>'+esc(domain.name)+'</h1>'+(domain.summary?'<p class="hmv4-page-subtitle">'+esc(domain.summary)+'</p>':'')+'</header>'+
    '<div class="hmv4-grid">'+tiles+'</div>'+
  '</section>';
}

function renderModuleLanding(route){
  var p = route.params || {};
  var domainKey = p.domain || '';
  var moduleKey = p.module || '';
  var fixture = window.HMV4_NAV_SHELL_FIXTURE || readJsonFixture('[data-hmv4-nav-shell-fixture]') || {};
  var domains = (fixture.domains || []);
  var modules = (fixture.modules || []);

  var domain = null, module = null;
  for(var i=0;i<domains.length;i++) if(domains[i].key === domainKey) domain = domains[i];
  for(var j=0;j<modules.length;j++) if(modules[j].key === moduleKey) module = modules[j];

  if(!domain || !module){
    return '<section class="hmv4-module-landing" data-hmv4-module-landing data-route-class="ML" data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(moduleKey)+'" data-fixture-state="unknown">'+
      '<div class="hmv4-feedback" data-feedback-state="warning">Unknown module "'+esc(domainKey)+'/'+esc(moduleKey)+'". Open <a href="/ops/'+esc(domainKey)+'">domain landing</a>.</div>'+
    '</section>';
  }

  var tiles = (module.tiles || []).map(function(t){
    var href = t.href || '';
    return '<a class="hmv4-card hmv4-module-tile" href="'+esc(href)+'" data-hmv4-tile-kind="'+esc(t.kind || 'workspace')+'">'+
      '<h3>'+esc(t.label)+'</h3>'+
      (t.summary ? '<p class="hmv4-text-2">'+esc(t.summary)+'</p>' : '')+
    '</a>';
  }).join('');

  if(!tiles){
    tiles = '<div class="hmv4-feedback" data-feedback-state="bridge" data-hmv4-module-empty>'+
      '<p>No tiles configured for this module fixture.</p>'+
    '</div>';
  }

  var crumbs = '<nav aria-label="Breadcrumb"><ol class="hmv4-breadcrumb">'+
    '<li><a href="/ops">Operations</a></li>'+
    '<li><a href="/ops/'+esc(domainKey)+'">'+esc(domain.name)+'</a></li>'+
    '<li aria-current="page">'+esc(module.name)+'</li>'+
  '</ol></nav>';

  return '<section class="hmv4-module-landing" data-hmv4-module-landing data-route-class="ML" data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(moduleKey)+'">'+
    '<header class="hmv4-page-header-zone">'+crumbs+'<h1>'+esc(module.name)+'</h1>'+(module.summary?'<p class="hmv4-page-subtitle">'+esc(module.summary)+'</p>':'')+'</header>'+
    '<div class="hmv4-grid">'+tiles+'</div>'+
  '</section>';
}
```

Wire into renderRoute:

```js
if(route.routeClass === 'SH') return renderShellHome(route);
if(route.routeClass === 'DL') return renderDomainLanding(route);
if(route.routeClass === 'ML') return renderModuleLanding(route);
```

Expose:

```js
window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, {
  renderShellHome: renderShellHome,
  renderDomainLanding: renderDomainLanding,
  renderModuleLanding: renderModuleLanding
});
```

Use existing `esc()` helper. If absent, copy the same XSS-safe escape function used by other renderers.

## STEP 3 — Create fixture data

Create `tests/fixtures/module-template-v4/nav-shell-fixtures.json`. Keep it minimal — 3 domains, 6 modules — that's enough to demonstrate the pattern. Full 14×46 can come later.

```json
{
  "version": "0.1",
  "domains": [
    { "key": "quality-compliance", "name": "Quality & Compliance", "summary": "Nonconformance, CAPA, batch release, change control, controlled documents.", "modules": ["quality-case-management", "capa", "batch-release", "controlled-documents"] },
    { "key": "shopfloor-execution", "name": "Shopfloor Execution", "summary": "Dispatch, work orders, in-process inspection.", "modules": ["dispatch-board", "work-orders"] },
    { "key": "people-skill-ehs", "name": "Workforce, Documents & Training", "summary": "Training, qualification matrix, skill certification.", "modules": ["training-competency"] }
  ],
  "modules": [
    {
      "key": "quality-case-management",
      "name": "Quality Case Management",
      "summary": "Nonconformance, deviation, concession.",
      "tiles": [
        { "kind": "record-collection", "label": "Open NC cases", "href": "/ops/records/nonconformance-cases", "summary": "All authoritative NC records." },
        { "kind": "workspace", "label": "Case board", "href": "/ops/quality-compliance/quality-case-management/board", "summary": "Triage and disposition projection." }
      ]
    },
    {
      "key": "capa",
      "name": "CAPA",
      "summary": "Corrective and preventive actions.",
      "tiles": [
        { "kind": "record-collection", "label": "Open CAPA records", "href": "/ops/records/capas", "summary": "All authoritative CAPA records." }
      ]
    },
    {
      "key": "batch-release",
      "name": "Batch Release",
      "summary": "Release authority and packet review.",
      "tiles": [
        { "kind": "record-collection", "label": "Pending releases", "href": "/ops/records/batch-releases", "summary": "Records awaiting release decision." }
      ]
    },
    {
      "key": "controlled-documents",
      "name": "Controlled Documents",
      "summary": "Document change control and effective revisions.",
      "tiles": [
        { "kind": "record-collection", "label": "Effective documents", "href": "/ops/records/controlled-documents", "summary": "Released revisions in force." }
      ]
    },
    {
      "key": "dispatch-board",
      "name": "Dispatch Board",
      "summary": "Live dispatch projection — read-only.",
      "tiles": [
        { "kind": "workspace", "label": "Board", "href": "/ops/planning-scheduling/dispatch-board/board", "summary": "Live dispatch state." },
        { "kind": "workspace", "label": "Dashboard", "href": "/ops/planning-scheduling/dispatch-board/dashboard", "summary": "KPIs and rollups." }
      ]
    },
    {
      "key": "work-orders",
      "name": "Work Orders",
      "summary": "WO record lifecycle — fixture only.",
      "tiles": []
    },
    {
      "key": "training-competency",
      "name": "Training & Competency",
      "summary": "Operator qualification readiness.",
      "tiles": [
        { "kind": "workspace", "label": "Matrix", "href": "/ops/people-skill-ehs/training-competency/matrix", "summary": "Operator × qualification status grid." }
      ]
    }
  ]
}
```

## STEP 4 — Create / update fixture pages

### Existing pages to update

If `shell-home.html`, `domain-landing.html`, `module-landing.html` already exist as scaffolds, edit them to load the new fixture. If they don't exist, create them.

Use the same shape as `workspace-board.html` for boilerplate (head, link to tokens.css and module-template-v4.css, fixture script blocks, ordered HMV4 script tags).

### New per-state pages

Create:

- `shell-home.html` (route: `/ops`, fixture key `shell-home`)
- `domain-landing-quality-compliance.html` (route: `/ops/quality-compliance`, fixture key `domain-landing-quality-compliance`)
- `domain-landing-shopfloor-execution.html` (route: `/ops/shopfloor-execution`, fixture key `domain-landing-shopfloor-execution`)
- `module-landing-quality-case-management.html` (route: `/ops/quality-compliance/quality-case-management`, fixture key `module-landing-qcm`)
- `module-landing-dispatch-board.html` (route: `/ops/shopfloor-execution/dispatch-board`, fixture key `module-landing-dispatch`)
- `module-landing-empty.html` (route: `/ops/quality-compliance/work-orders` — has empty tiles array; tests empty-state copy)

Each page inlines the FULL fixture JSON via `<script data-hmv4-nav-shell-fixture>` block, sets `window.HMV4_NAV_SHELL_FIXTURE`, then loads HMV4 scripts.

For each page, set the `data-hmv4-fixture-route` script with appropriate `path`, `routeClass`, and `params`.

## STEP 5 — Add E2E tests

Extend `tests/e2e/module-template-v4.spec.ts`:

```ts
test('module-template-v4 preview smoke › renders shell home with 3 domain tiles', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
  const root = page.locator('[data-hmv4-shell-home]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-route-class', 'SH');
  await expect(page.locator('[data-hmv4-domain-tile]')).toHaveCount(3);
});

test('module-template-v4 preview smoke › renders domain landing with module tiles', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html');
  const root = page.locator('[data-hmv4-domain-landing]');
  await expect(root).toHaveAttribute('data-route-class', 'DL');
  await expect(root).toHaveAttribute('data-domain-key', 'quality-compliance');
  await expect(page.locator('[data-hmv4-module-tile]')).toHaveCount(4);
});

test('module-template-v4 preview smoke › renders module landing with tiles', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
  const root = page.locator('[data-hmv4-module-landing]');
  await expect(root).toHaveAttribute('data-route-class', 'ML');
  await expect(root).toHaveAttribute('data-module-key', 'quality-case-management');
  await expect(page.locator('a[href*="/records/nonconformance-cases"]')).toBeVisible();
});

test('module-template-v4 preview smoke › module landing empty state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-empty.html');
  await expect(page.locator('[data-hmv4-module-empty]')).toBeVisible();
});

test('module-template-v4 preview smoke › unknown domain renders re-anchor', async ({ page }) => {
  // Reuse domain-landing.html with bogus domain key in fixture
  await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing.html?bogus=1');
  // Adjust per how the fixture defaults to unknown
});
```

Extend `tests/e2e/module-template-v4-axe.spec.ts` to include the new pages (`shell-home.html`, `domain-landing-*.html`, `module-landing-*.html`).

## STEP 6 — Run all gates

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
EXIT=$?
rm -rf node_modules
cd ../..

# Plus all standard guards
node --check mom/scripts/portal/73-module-template-v4-renderers.js
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS"
git diff --name-only origin/codex/second-slice-planning-from-dispatch-qa..HEAD | \
  grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && \
  echo "FAIL forbidden" || echo "PASS forbidden"
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js | grep -v '//' && echo "FAIL hex" || echo "PASS no hex"
```

## STEP 7 — Generate report

`_reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md`:

```markdown
# Slice 0.5 Navigation Shell Implementation Report

## Summary
3 new renderers (renderShellHome, renderDomainLanding, renderModuleLanding).
6 fixture pages (3 templates + 3 specific domain/module pages + 1 empty state).
~5 new E2E tests.

## Branch and working tree
- Branch: codex/slice-0-5-navigation-shell
- Base: codex/second-slice-planning-from-dispatch-qa

## Files changed
- (list)

## Route classes covered
- SH at /ops
- DL at /ops/{domain} (3 fixture domain examples)
- ML at /ops/{domain}/{module} (3 fixture module examples)

## Read-only / no-mutation checks
- Search input disabled in shell home
- All anchors are <a> elements (no buttons that could trigger mutation)
- No mutation-intent buttons added

## Fixture coverage (count)
- 3 domains × 7 modules = 7 modules total in fixture (subset of 46)
- Full 14 × 46 deferred to a future slice

## E2E result
- N tests pass

## Decision
NAV_SHELL_PASS_READY_FOR_REVIEW
NAV_SHELL_PASS_WITH_WARNINGS
NAV_SHELL_FAIL_BLOCK_NEXT
```

## STEP 8 — Commit and push

```bash
git add mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4*.spec.ts \
        tests/fixtures/module-template-v4/nav-shell-fixtures.json \
        tests/fixtures/module-template-v4/pages/shell-home.html \
        tests/fixtures/module-template-v4/pages/domain-landing*.html \
        tests/fixtures/module-template-v4/pages/module-landing*.html \
        _reports/module-template-v4/S_NAV_SHELL_IMPLEMENTATION_REPORT.md

git commit -m "feat(module-template): add navigation shell prototype (Slice 0.5)

Adds SH/DL/ML route renderers so HMV4 becomes navigable.
3 fixture domains × 7 fixture modules cover the pattern.
Full 14 × 46 inventory deferred to a later slice.

Read-only navigation only; no mutation, no live API."

git push -u origin codex/slice-0-5-navigation-shell
```

## ROLLBACK PROCEDURE

```bash
git checkout codex/second-slice-planning-from-dispatch-qa
git branch -D codex/slice-0-5-navigation-shell
# After push: git push origin --delete codex/slice-0-5-navigation-shell
```

## DECISION PHRASE OUTPUT

```text
NAV_SHELL_PASS_READY_FOR_REVIEW
NAV_SHELL_PASS_WITH_WARNINGS
NAV_SHELL_FAIL_BLOCK_NEXT
```
