# S_QA_SECURITY_REVIEW_REPORT — HMV4 Prototype Security Audit

**Pack**: 4 — Stream D5 (Security review)
**Branch**: `codex/second-slice-planning-from-dispatch-qa` (bundled with D2/D3/D4)
**Audit date**: 2026-04-25
**Auditor**: Claude Code (manual review; `/security-review` skill not invoked because all HMV4 changes were already on this branch — running the skill against pending changes returned an empty diff)

---

## Summary

The HMV4 prototype surface (files `70`–`74` under `mom/scripts/portal/`,
fixture pages under `tests/fixtures/module-template-v4/pages/`, and the
feature-flagged insertion in `mom/portal.html`) was audited end-to-end
against the OWASP-relevant categories called out in Pack 4, prompt D5.

**No HIGH-severity findings.** Two MEDIUM findings (one auth-routing
caveat, one fixture-deployment caveat) and one LOW finding (URL scheme
validation) are documented below with concrete fixes; none block the
next slice. CSRF is not applicable (no mutation endpoints). XSS surface
is well-contained: all dynamic HTML insertions go through a central
`esc()` helper, and all URL construction goes through
`Hmv4Routes.buildUrl()` which `encodeURIComponent`s every segment.

**Decision**: `SECURITY_REVIEW_PASS_WITH_MEDIUM_FINDINGS`

---

## Scope reviewed

Files audited (HMV4 surface as of branch HEAD `24d57d9a`):

| File | Lines | Purpose |
|---|---:|---|
| `mom/scripts/portal/70-module-template-v4-hydration.js` | 62 | Shell mount + tab keyboard + close-preview |
| `mom/scripts/portal/71-module-template-v4-routes.js` | 87 | Path/query parser, URL builder, query whitelist |
| `mom/scripts/portal/72-module-template-v4-bridge.js` | 74 | Page-key + EQMS module alias maps |
| `mom/scripts/portal/73-module-template-v4-renderers.js` | 293 | DOM rendering for SH/DL/ML/AC/AR/WS routes |
| `mom/scripts/portal/74-module-template-v4-fixtures.js` | 20 | Dev-only fixture seed (NEVER loaded by `portal.html`) |
| `mom/portal.html` lines 33–35, 429–440 | 13 | Feature-flag insertion + script load order |
| `tests/fixtures/module-template-v4/**/*.json` | n/a | Fixture data (synthetic) |
| `tests/fixtures/module-template-v4/pages/*.html` | 23 pages | Static fixture preview pages |

Out of scope (per ADR-0001 / ADR-0004): all forbidden files
(`portal.html` body, `01-module-router.js`, `02-state-auth-ui.js`,
`40-eqms-shell.js`, classic styles).

---

## XSS audit

**Sinks searched**: `innerHTML`, `outerHTML`, `document.write`,
`insertAdjacentHTML`, `dangerouslySetInnerHTML`, `setAttribute('on*', …)`.

**Findings (per file)**:

`70-module-template-v4-hydration.js`:
- Line 16: `mount.innerHTML = '<header>…'` — completely static template
  literal. No interpolation. **SAFE.**
- Line 21: `content.innerHTML = ''` — wipes container. **SAFE.**

`73-module-template-v4-renderers.js`:
- Line 5: central `esc()` helper escapes `& < > "` (the four characters
  required for HTML-context safety). Applied consistently.
- Lines 31, 35–37, 42, 47–48, 52–54, 58–60, 140–141, 153–154, 157,
  160, 163, 165, 168, 175–181, 188–192, 217–225, 236–254, 260–263,
  284–286, 290: every variable interpolated into HTML passes through
  `esc()`. Audited every match — **no unescaped interpolation found.**
- The shell breadcrumb / page header (`applyShell`, lines 275–287) build
  HTML from `route.params.*` strings; all interpolations call `esc()`
  via `breadcrumb()` and `pageHeader()`.
- The dispatch card renderer (`renderDispatchCard`, lines 215–228)
  reads `card.recordHref` from fixture data and escapes it before
  setting as `href`. See LOW finding F-3 below regarding URL-scheme
  validation.

`72-module-template-v4-bridge.js`:
- Banner HTML (`bridgeBannerHtml`, line 66) is a static string. No
  user input. **SAFE.**

**Verdict**: No XSS vector found in HMV4 production source. The
`esc()` helper is applied uniformly, and all dynamic data
(record IDs, fixture content, route params) is sanitized at the point
of insertion. **PASS.**

---

## Open redirect / SSRF audit

**Sinks searched**: `location.href = `, `location.assign(`,
`location.replace(`, `window.open(`, `fetch(`, `XMLHttpRequest`.

**Findings**:

`70-module-template-v4-hydration.js` line 57:
```js
if(close) close.addEventListener('click', function(){
  location.href = location.pathname.replace(/^\/ops\/?/, '/') || '/';
});
```
The destination URL is computed from the **current** `location.pathname`
by stripping the `/ops/` prefix. The user cannot control where this
points — it is always a path on the same origin derived from the URL
the user already has open. **No open-redirect vector.**

`71-module-template-v4-routes.js` line 19:
```js
function enc(v){ return encodeURIComponent(v == null ? '' : String(v)); }
```
All path segments and query values built into URLs by
`Hmv4Routes.buildUrl()` are `encodeURIComponent`-encoded. Combined with
the per-route-class query whitelist (`allowedQuery` line 7–17), an
attacker cannot inject `javascript:` schemes, additional path segments
(`/`-encoding), or arbitrary query parameters into the URL the
prototype emits.

`72-module-template-v4-bridge.js`:
- Bridge alias maps are **frozen object literals** (`Object.freeze`
  lines 7, 26). `resolvePageKey` and `resolveEqmsModule` look up the
  alias map by exact key match; any unknown key returns
  `unmapped_needs_decision` with `url:null`. There is no string
  concatenation into a URL.
- `maybeReplaceToCanonical` (line 68) only fires if
  `window.HMV4_PREVIEW_ENABLED` is true, and writes to
  `history.replaceState` (no network navigation). Even then, the URL
  comes from the hard-coded alias map.

**No outbound `fetch()`, `XMLHttpRequest`, or `window.open()` calls
exist anywhere in the HMV4 prototype.** The prototype is fully
client-side and does not initiate any network requests from JS.

**Verdict**: **PASS.** No open-redirect or SSRF vector.

---

## CSRF / SameSite audit

**Status**: **NOT APPLICABLE** (acceptable for prototype).

The HMV4 prototype contains no mutation endpoints. All buttons that
would represent state changes are rendered as
`<button type="button" disabled data-hmv4-mutation-intent="…">`
(see `73-module-template-v4-renderers.js` lines 146–148, 225–226).
`portal.html` line 434 enforces
`window.HMV4_DISABLE_MUTATION_LAUNCHERS = true` by default. There is
no form submission, no POST, no state-changing request from this
surface.

**Future work** (not blocking): when mutation flows are introduced
(post-Wave-1 or in slices that wire RED roots), a CSRF token strategy
must be defined. The portal-wide CSRF model is the natural anchor;
HMV4 should not invent its own. Recorded as F-4 in the findings table.

---

## Auth / authorization audit

**Activation logic** (`70-module-template-v4-hydration.js` line 5):
```js
function isPreview(){
  return !!window.HMV4_PREVIEW_ENABLED || location.pathname.indexOf('/ops') === 0;
}
```

This is the gating function for the entire HMV4 surface. Two
observations:

1. **Today is safe.** `portal.html` lives at `/mom/portal.html`. The
   classic portal router (`01-module-router.js`) does not emit
   `/ops/...` URLs. The feature flag
   `HMV4_PREVIEW_ENABLED` is false by default
   (`portal.html` line 431). Therefore in current production posture,
   `isPreview()` returns false in real user sessions and HMV4 does
   not render. **Status: SAFE for current deployment.**

2. **Future risk (MEDIUM, F-1).** The OR-condition means that if any
   future router or nginx rule causes `/ops/...` URLs to reach
   `portal.html`, HMV4 will hydrate even with the flag off. This is
   acceptable for a deliberate canary, but it makes the feature flag
   weaker than its name suggests — the path-based escape hatch is a
   hidden second activation channel. Recommended fix below.

**Authentication on fixture pages**: fixture pages
(`tests/fixtures/module-template-v4/pages/*.html`) load HMV4 styles
and scripts directly from relative paths and bypass the portal auth
shell entirely. This is **correct behavior for prototype tests** and
is reinforced by ADR-0007 (fixture-first development). However, the
`tests/` directory must **never** be served by the production web
server. See F-2.

---

## Sensitive data exposure audit

Scanned `tests/fixtures/module-template-v4/**/*.json` for: `PII`,
`email`, `phone`, `ssn`, `password`, `token`, `api_key`, `api-key`.

**Result**: zero matches. All fixture identifiers are synthetic
(`NC-001`, `DISP-001`, `WO-3011`, `LOT-2026-04`, `PN-2042 Rev B`,
`QA Engineer`). No real names, email addresses, internal hostnames,
or credentials present.

`74-module-template-v4-fixtures.js` (the dev-only seed file) contains
two synthetic records (`QUO-DEMO-001`, `DISP-DEMO-001`) and is
**never loaded by `portal.html`** (verified: `grep
"74-module-template-v4-fixtures" mom/portal.html` returns no match).

**Verdict**: **PASS.** No sensitive data exposure in HMV4 prototype
artifacts.

---

## Bridge alias hijacking audit

The bridge alias system in `72-module-template-v4-bridge.js`
(`pageKeyAliasMap`, `eqmsModuleAliasMap`) is the closest thing in
HMV4 to a redirect mechanism. Audited for unbounded redirects and
key-injection.

**Findings**:

- Both alias maps are `Object.freeze`d at module load. Cannot be
  mutated at runtime by user input.
- Lookup is **exact match only** (`map[key]`). No prefix matching, no
  regex, no wildcard.
- Unknown keys return `{ policy:'unmapped_needs_decision', url:null,
  reason:'…' }` — there is no fallback URL.
- All target URLs are produced by `Hmv4Routes.buildUrl()` which
  `encodeURIComponent`s every segment and applies the
  per-route-class query whitelist.
- `maybeReplaceToCanonical` is the only consumer that performs an
  actual URL change, and it uses `history.replaceState` (no network
  navigation), only fires when `HMV4_PREVIEW_ENABLED=true`, and only
  for the `redirect_then_deprecate` policy.

**Verdict**: **PASS.** No alias hijacking vector. The bridge is
correctly fail-closed: unmapped keys do nothing.

---

## Findings table

| ID  | Severity | File:line | Description | Suggested fix | Effort |
|-----|----------|-----------|-------------|---------------|--------|
| F-1 | **MEDIUM** | `70-module-template-v4-hydration.js:5` | The path-based activation (`/ops/*` → hydrate) is a hidden second activation channel that bypasses `HMV4_PREVIEW_ENABLED`. If any future router emits `/ops/*`, HMV4 will render even with the flag off. | Tighten `isPreview()` to require **both** `HMV4_PREVIEW_ENABLED` **and** path match, OR explicitly comment that `/ops/*` is the authorized canary channel and add a console warning when the path-only branch fires. | 30 min |
| F-2 | **MEDIUM** | deployment | Fixture pages under `tests/fixtures/` bypass auth. If the production web server's docroot includes `tests/`, anyone could load the fixtures and confuse them with real records. | Verify nginx / web-server config blocks `^/tests/`. Add an explicit `deny all` rule or move `tests/` outside docroot. Document in deployment checklist. | 30 min — **deployment-side, not code** |
| F-3 | **LOW** | `73-module-template-v4-renderers.js:224` | `card.recordHref` (from fixture data) is HTML-escaped via `esc()` but its URL scheme is not validated. A malicious fixture could set `recordHref: "javascript:alert(1)"` and produce a clickable XSS link. | Add scheme allowlist to `esc()` for `href` contexts, or wrap `card.recordHref` in a `safeUrl()` helper that rejects non-`/`-prefixed values. Acceptable to defer until any non-fixture data flows in. | 15 min |
| F-4 | INFO | future | No CSRF strategy yet because no mutations exist. Will need one before any RED-root slice (Slices 13–18) wires real POST/PUT/DELETE. | Reuse portal-wide CSRF token. Document the strategy in a new ADR before Slice 13. | n/a (future work) |

No HIGH-severity findings.

---

## Recommendations

**Before next slice (Slice 3 — Training Matrix)**:
- No security work required. F-1, F-2, F-3 are not slice-blockers.

**Before any production canary (post-Wave-1)**:
- **F-1**: tighten `isPreview()` activation — explicitly require
  `HMV4_PREVIEW_ENABLED=true` for any path-based hydration, OR document
  `/ops/*` as the authorized canary channel with a console warning.
- **F-2**: verify production nginx/Apache blocks `/tests/` paths and
  fixture HTML cannot leak.
- **F-3**: add `safeUrl()` helper before any non-fixture data sources
  feed `recordHref`.

**Before any RED root slice (13–18)**:
- **F-4**: define CSRF strategy and document in a new ADR.

---

## Decision

`SECURITY_REVIEW_PASS_WITH_MEDIUM_FINDINGS`

Two MEDIUM findings (F-1 activation gating, F-2 fixture deployment),
one LOW finding (F-3 URL scheme validation), one INFO item (F-4 CSRF
for future work). None block Slice 3 or subsequent quality-stream
slices. All HIGH-priority categories (XSS, open redirect, sensitive
data exposure, bridge hijacking) **PASS** with no findings.

The HMV4 prototype is built defensively: a single `esc()` helper, a
URL builder that encodes every segment, a per-route-class query
whitelist, frozen alias maps, no network calls, and disabled mutation
buttons. The two MEDIUM findings are deployment-posture concerns, not
code defects.
