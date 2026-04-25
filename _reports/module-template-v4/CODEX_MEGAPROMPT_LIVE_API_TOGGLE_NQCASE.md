# CODEX MEGAPROMPT — Live API Toggle for NQCASE (First Cutover Experiment)

> Paste into Codex local. Codex creates branch
> `codex/live-api-toggle-nqcase`, adds a fixture↔live mode toggle for the
> NQCASE record shell, validates against the newly merged backend EQMS
> aliases, produces a report.
>
> Approval phrase: `Proceed with NQCASE live API toggle experiment.`

---

## ROLE & CONTEXT

You are Codex local. The HESEM Operations Platform has just merged:
- 7 EQMS plural-form REST aliases (commit `d21d6462`, branch `codex/backend-eqms-aliases`)
- 4 frontend slices (DISP, NQCASE, TRAIN, nav shell)
- Quality infrastructure (a11y, visual regression, performance baseline)

This megaprompt is the **first live cutover experiment**. It does NOT replace fixtures. It adds a feature-flagged optional path that:

1. When enabled, the NQCASE renderer fetches data from `/api/v1/nonconformance-cases/{id}` (live backend EQMS plural alias).
2. When disabled (default), behavior is unchanged — fixture data only.

This proves the cutover playbook before applying to other slices.

This is **development/prototype work** — no production cutover. The live mode is opt-in via query string + dev environment only.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT change default behavior (HMV4 fixture mode remains default).
Do NOT enable live mode in mom/portal.html by default.
Do NOT execute mutation actions over live API (still disabled).
Do NOT modify forbidden files (per ADR-0004).
Do NOT alter EQMS controllers or their methods.
Do NOT modify fixture pages or fixture data (those stay the way they are).
Do NOT set HMV4_PREVIEW_ENABLED=true in any committed file.
```

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify EQMS plural alias merged
grep -c "/api/v1/nonconformance-cases" mom/api/routes/rest-routes.php
# Expected: > 0

# Verify Slice 2 NQCASE renderer present
grep -c "renderNonconformanceRecord" mom/scripts/portal/73-module-template-v4-renderers.js
# Expected: > 0

# Verify hydration adapter
ls mom/scripts/portal/70-module-template-v4-hydration.js

# Branch
git checkout -b codex/live-api-toggle-nqcase
```

If fail, return `LIVE_API_TOGGLE_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/73-module-template-v4-renderers.js
tests/e2e/module-template-v4-live-api.spec.ts (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html (NEW)
_reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md (NEW)
docs/adr/0011-live-api-toggle-mechanism.md (NEW — ADR for the toggle pattern)
```

Optional if absolutely necessary:
```text
mom/scripts/portal/72-module-template-v4-bridge.js (only if alias context needs adjustment)
```

## FORBIDDEN

```text
mom/portal.html (do NOT enable live mode by default)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/scripts/portal/74-module-template-v4-fixtures.js (fixture-only; no live mode in there)
mom/api/** (no backend changes)
mom/qms-data/**
Existing fixture pages and fixture JSON (don't change those)
```

## TARGET CONTRACT

### Toggle mechanism

```js
// In hydration init:
window.HMV4_LIVE_API_ENABLED = false; // default
// Override paths (any of these enable live mode for THIS load only):
//   - URL query: ?hmv4-live-api=1
//   - data-hmv4-live-api="true" attribute on <body>
//   - Manual console set (dev only)
```

When `HMV4_LIVE_API_ENABLED === true` AND the route is an AR for `nonconformance-cases`:
1. Renderer first emits a "loading" placeholder.
2. Hydration adapter calls `fetch('/api/v1/nonconformance-cases/' + recordId)` with credentials.
3. On success: replace placeholder with rendered record from live data (same `renderNonconformanceRecord` function, just receives live data instead of fixture).
4. On failure (4xx/5xx/network): render fallback UI with explicit "Live API unavailable. Falling back to fixture display." message.

### Default behavior (live mode OFF)

Identical to current. Renderer reads `window.HMV4_NONCONFORMANCE_CASE_FIXTURE` or fixture JSON block.

### Mutation policy (UNCHANGED)

All disposition/CAPA/e-sign buttons remain disabled. Live mode is **read-only** access to GET endpoints. The plural alias `GET /api/v1/nonconformance-cases/{id}` returns the same shape as the singular `/api/v1/eqms/ncr/{id}`.

## STEP 1 — Inspect existing renderer

```bash
grep -nE "function renderNonconformanceRecord|HMV4_NONCONFORMANCE_CASE_FIXTURE|nonconformance-case-fixture" mom/scripts/portal/73-module-template-v4-renderers.js | head -10
```

Note where the fixture is read. The live-mode adapter will produce data of the same shape.

## STEP 2 — Add hydration live-mode adapter

Edit `mom/scripts/portal/70-module-template-v4-hydration.js`. Add (do NOT modify the existing inert-by-default check):

```js
// Live API toggle (ADR-0011, 2026-04-25)
function readLiveApiFlag(){
  if(typeof window === 'undefined') return false;
  if(window.HMV4_LIVE_API_ENABLED === true) return true;
  try {
    var url = new URL(window.location.href);
    if(url.searchParams.get('hmv4-live-api') === '1') return true;
  } catch(_) {}
  if(document.body && document.body.getAttribute('data-hmv4-live-api') === 'true') return true;
  return false;
}

function fetchLiveNonconformance(recordId){
  if(!recordId) return Promise.reject(new Error('missing record id'));
  return fetch('/api/v1/nonconformance-cases/' + encodeURIComponent(recordId), {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  }).then(function(res){
    if(!res.ok){ throw new Error('live api status ' + res.status); }
    return res.json();
  }).then(function(payload){
    // Normalise: live response may be { data: {...} } or {...}
    return (payload && payload.data) ? payload.data : payload;
  });
}

function adaptLiveNcToFixtureShape(live){
  if(!live) return null;
  // Adapt live (EQMS NCR) shape to the renderer's expected fixture shape.
  // The live record may use slightly different keys; normalise.
  return {
    recordId: live.id || live.record_id || live.code,
    rootCode: 'NQCASE',
    title: live.title || live.summary || ('Nonconformance ' + (live.id || '')),
    subtype: live.subtype || live.kind || 'nonconformance',
    status: live.state || live.status,
    severity: live.severity,
    state: 'live',
    freshness: 'live_current',
    owner: (live.owner && (live.owner.name || live.owner)) || null,
    source: live.source,
    part: live.part_number || live.part,
    lot: live.lot,
    workOrder: live.work_order_id || live.workOrder,
    stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
    lifecycle: live.lifecycle || []
    // ... extend as backend response shape solidifies
  };
}

window.Hmv4LiveApi = {
  enabled: readLiveApiFlag,
  fetchNonconformance: fetchLiveNonconformance,
  adaptNcToFixtureShape: adaptLiveNcToFixtureShape
};
```

In the existing hydration adapter where it dispatches the renderer for an AR/nonconformance-cases route, add:

```js
if (route.routeClass === 'AR' && route.params && route.params.resource_family === 'nonconformance-cases' && readLiveApiFlag()) {
  // Live mode path
  var recordId = route.params.record_id;
  // Render placeholder
  content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--loading" data-hmv4-live-api-loading="true" data-hmv4-record-id="' + recordId + '"><p>Loading from /api/v1/nonconformance-cases/' + recordId + '…</p></article>';
  // Fetch + render
  fetchLiveNonconformance(recordId)
    .then(function(live){
      var adapted = adaptLiveNcToFixtureShape(live);
      // Inject into the renderer's expected global, then re-render
      window.HMV4_NONCONFORMANCE_CASE_FIXTURE = { records: { [recordId]: adapted } };
      var html = window.Hmv4Renderers.renderRoute(route);
      content.innerHTML = html;
      // Mark as live-rendered
      var root = content.querySelector('[data-hmv4-nonconformance-record]');
      if(root){ root.setAttribute('data-hmv4-source', 'live-api'); root.setAttribute('data-fixture-state', 'live'); }
    })
    .catch(function(err){
      content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--error" data-hmv4-live-api-error="true" data-hmv4-record-id="' + recordId + '">' +
        '<header class="hmv4-record-identity"><h1 class="hmv4-record-title">' + recordId + ' &mdash; live API unavailable</h1></header>' +
        '<p class="hmv4-feedback" data-feedback-state="warning" role="status">Live API is unavailable: ' + (err && err.message ? String(err.message) : 'unknown error') + '. Refresh to retry, or remove ?hmv4-live-api=1 to use fixture display.</p>' +
      '</article>';
    });
  return; // Stop further dispatch; live path takes over
}

// Else: fixture path (existing behavior)
```

Adapt to the actual hydration shape. If hydration's renderRoute is called once and result inserted, the live-mode override should run BEFORE the renderRoute for AR-nonconformance routes specifically.

## STEP 3 — (Optional) Renderer adjustment

If the renderer's data-fetch path is purely `window.HMV4_NONCONFORMANCE_CASE_FIXTURE`, no renderer change needed — STEP 2's pre-injection handles it.

If the renderer reads from inline `<script data-hmv4-nonconformance-case-fixture>` blocks, you may need to also set the global so the renderer falls back to it. Look at how the renderer reads:

```bash
grep -nE "HMV4_NONCONFORMANCE_CASE_FIXTURE|nonconformance-case-fixture" mom/scripts/portal/73-module-template-v4-renderers.js | head -5
```

The renderer should already prefer the global over the inline block (per V18 implementation). If not, add the global preference.

## STEP 4 — Create live-mode fixture page

Create `tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html`:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>HMV4 NC Live API Fixture</title>
<link rel="stylesheet" href="../../../../mom/styles/module-template-v4.tokens.css">
<link rel="stylesheet" href="../../../../mom/styles/module-template-v4.css">
</head>
<body data-hmv4-live-api="true">
<div id="hmv4-fixture-root"></div>
<script type="application/json" data-hmv4-fixture-route>
{
  "fixtureId": "authoritative-record-shell-nc-live-mode",
  "path": "/ops/records/nonconformance-cases/NC-001",
  "routeClass": "AR",
  "params": { "resource_family": "nonconformance-cases", "record_id": "NC-001" },
  "query": { "tab": "overview" }
}
</script>
<script>window.HMV4_LIVE_API_ENABLED = true;</script>
<!-- Note: this fixture page DOES NOT bundle nonconformance-case-fixtures.json.
     The live-mode adapter must fetch from /api/v1/nonconformance-cases/NC-001.
     If the local PHP server backend has no NC-001 record, the error
     fallback will render. -->
<script src="../../../../mom/scripts/portal/74-module-template-v4-fixtures.js"></script>
<script src="../../../../mom/scripts/portal/71-module-template-v4-routes.js"></script>
<script src="../../../../mom/scripts/portal/72-module-template-v4-bridge.js"></script>
<script src="../../../../mom/scripts/portal/73-module-template-v4-renderers.js"></script>
<script src="../../../../mom/scripts/portal/70-module-template-v4-hydration.js"></script>
</body></html>
```

## STEP 5 — Add E2E spec

Create `tests/e2e/module-template-v4-live-api.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('hmv4 live api toggle (NQCASE)', () => {
  test('default fixture mode is unaffected', async ({ page }) => {
    // The standard fixture page should still work as before
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html');
    const root = page.locator('[data-hmv4-nonconformance-record]');
    await expect(root).toBeVisible();
    // Ensure live-source attribute NOT set when in fixture mode
    await expect(root).not.toHaveAttribute('data-hmv4-source', 'live-api');
    // Mutation buttons still disabled
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('live mode enabled but backend 401 falls back to error UI', async ({ page }) => {
    // The PHP test server typically returns 401 for unauthenticated EQMS calls,
    // which is the expected fallback path.
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html');
    // Wait for the fetch to complete (success or error)
    await page.waitForFunction(
      () => !!document.querySelector('[data-hmv4-live-api-error="true"], [data-hmv4-source="live-api"]'),
      { timeout: 10_000 }
    );
    // In CI test env (no auth), expect error fallback
    const errorRoot = page.locator('[data-hmv4-live-api-error="true"]');
    const liveRoot = page.locator('[data-hmv4-source="live-api"]');
    const errorVisible = await errorRoot.isVisible().catch(() => false);
    const liveVisible = await liveRoot.isVisible().catch(() => false);
    expect(errorVisible || liveVisible).toBeTruthy();
  });

  test('live mode never enables mutation buttons', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html');
    await page.waitForFunction(
      () => !!document.querySelector('[data-hmv4-live-api-error="true"], [data-hmv4-source="live-api"]'),
      { timeout: 10_000 }
    );
    const enabled = page.locator('[data-hmv4-mutation-intent]:not([disabled])');
    await expect(enabled).toHaveCount(0);
  });
});
```

Update `tests/e2e/package.json` to add a script:

```json
"test:live-api": "playwright test module-template-v4-live-api.spec.ts --project=chromium"
```

(This script is INDIVIDUAL — separate from the standard test:hmv4 since live-api runs require a backend. In CI, live-api may always go to error fallback path; that's acceptable.)

## STEP 6 — Run gates

```bash
# Standard E2E (fixture mode) must STILL pass — no regression
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --project=chromium --reporter=list
EXIT=$?
rm -rf node_modules
cd ../..
[ $EXIT -eq 0 ] && echo "PASS standard E2E" || echo "FAIL standard E2E"

# Static
node --check mom/scripts/portal/70-module-template-v4-hydration.js
node --check mom/scripts/portal/73-module-template-v4-renderers.js

# Forbidden diff
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden"

# No fixture production load (74 still not loaded by portal.html)
grep -n "74-module-template-v4-fixtures" mom/portal.html && echo "FAIL" || echo "PASS"

# No HMV4_LIVE_API_ENABLED=true in committed mom/portal.html
grep -n "HMV4_LIVE_API_ENABLED" mom/portal.html && echo "REVIEW: live api flag in portal.html — must be false default if present" || echo "PASS no live-api default in portal"
```

## STEP 7 — Author ADR-0011

Create `docs/adr/0011-live-api-toggle-mechanism.md` documenting:
- Why opt-in flag (no production cutover)
- Three opt-in paths (global, query, body attr)
- Read-only constraint preserved
- Error fallback contract
- Per-slice rollout plan (NQCASE first, then CAPA, then CDOC, etc.)

Use the standard ADR template (docs/adr/template.md).

## STEP 8 — Generate report

```markdown
# Live API Toggle for NQCASE Report

## Summary
First live cutover experiment. NQCASE record shell now supports an
opt-in fetch from /api/v1/nonconformance-cases/{id} (EQMS plural alias
merged in commit d21d6462).

Default: fixture mode (unchanged).
Opt-in: ?hmv4-live-api=1, data-hmv4-live-api="true", or
window.HMV4_LIVE_API_ENABLED=true.

## Branch and working tree
- Branch: codex/live-api-toggle-nqcase
- Base: main 2af773e8

## Files changed (count + paths)

## Toggle mechanism verified
- ?hmv4-live-api=1 enables: YES
- data-hmv4-live-api="true" body attr enables: YES
- Default OFF in mom/portal.html: YES
- HMV4_PREVIEW_ENABLED untouched: YES

## Live API integration verified
- GET /api/v1/nonconformance-cases/{id} called: YES (verified via Playwright network)
- Response shape adapted to fixture shape: YES
- Loading placeholder shown: YES
- Error fallback shown when backend returns 401/4xx/5xx: YES
- data-hmv4-source="live-api" set on success: YES

## Mutation policy unchanged
- All mutation buttons disabled in both fixture and live mode: VERIFIED
- No POST/PATCH/DELETE calls in adapter: VERIFIED

## E2E result
- Standard 111+ tests STILL PASS (no regression)
- 3 new live-api tests PASS (default fixture, live error fallback, no mutation)

## Per-slice rollout plan (per ADR-0011)
1. NQCASE — DONE (this slice)
2. CAPA — Slice 4 follow-up
3. CDOC — Slice 5 follow-up
... etc

## Decision
LIVE_API_TOGGLE_NQCASE_PASS_READY_FOR_REVIEW
LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS
LIVE_API_TOGGLE_NQCASE_FAIL_BLOCK_NEXT
```

## STEP 9 — Commit

```bash
git add mom/scripts/portal/70-module-template-v4-hydration.js \
        mom/scripts/portal/73-module-template-v4-renderers.js \
        tests/e2e/module-template-v4-live-api.spec.ts \
        tests/e2e/package.json \
        tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html \
        docs/adr/0011-live-api-toggle-mechanism.md \
        _reports/module-template-v4/S_LIVE_API_TOGGLE_NQCASE_REPORT.md

git commit -m "feat(hmv4): add live API toggle for NQCASE record shell (ADR-0011)

First live cutover experiment. Opt-in flag enables the NQCASE
record shell to fetch from /api/v1/nonconformance-cases/{id} (EQMS
plural alias) instead of fixture data. Default: fixture mode.
Opt-in: ?hmv4-live-api=1, data-hmv4-live-api='true' body attr, or
window.HMV4_LIVE_API_ENABLED=true (dev console only).

Mutation actions remain disabled in both modes (read-only)."

git push -u origin codex/live-api-toggle-nqcase
```

## ROLLBACK

```bash
git checkout main
git branch -D codex/live-api-toggle-nqcase
git push origin --delete codex/live-api-toggle-nqcase
```

Or revert just the toggle without removing the bridge alias:
```bash
git revert <commit> -m 1 && git push
```

## DECISION PHRASE OUTPUT

```text
LIVE_API_TOGGLE_NQCASE_PASS_READY_FOR_REVIEW
LIVE_API_TOGGLE_NQCASE_PASS_WITH_WARNINGS
LIVE_API_TOGGLE_NQCASE_FAIL_BLOCK_NEXT
```
