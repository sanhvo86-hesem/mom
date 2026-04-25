# STEP10_QA_REGRESSION_REPORT.md

## Summary

Step 10 QA was executed for the Step 9 `module-template-v4` prototype.

Decision:

```text
STEP10_PASS_WITH_WARNINGS_NEEDS_QA_FOLLOWUP
```

The prototype passes production safety, JavaScript syntax, portal integration, fixture JSON, route/bridge static behavior, committed-state rollback, and browser smoke for the existing portal and HMV4 surfaces. E2E test execution remains blocked by missing JS runner bootstrap.

## Branch and repo status

Initial checkout was unexpectedly on `main` with Step 9 already committed at:

```text
57788196 feat(module-template): add v4 portal prototype assets
```

Created and switched to the required QA branch from the current clean HEAD:

```text
codex/module-template-v4-v7-prototype
```

Final tracked changes are fixture-only fixes under:

```text
tests/fixtures/module-template-v4/pages/*.html
```

## Files under test

```text
mom/portal.html
mom/templates/module-template-v4/module-template-v4.html
mom/styles/module-template-v4.tokens.css
mom/styles/module-template-v4.css
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/71-module-template-v4-routes.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/74-module-template-v4-fixtures.js
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/**
```

## Production safety checks

```text
PASS no fixture production load
PASS forbidden diff
PASS mom/qms-data absent
```

`74-module-template-v4-fixtures.js` is not referenced by `mom/portal.html`.

No forbidden-file diff was detected for:

```text
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

## JS syntax checks

```text
PASS node --check 70
PASS node --check 71
PASS node --check 72
PASS node --check 73
PASS node --check 74
PASS node checks after fixture fix
```

## portal.html integration checks

HMV4 CSS appears after `./styles/graphics-authority.css`.

HMV4 JS appears before `./scripts/portal/99-bootstrap.js` in the required order:

```text
71-module-template-v4-routes.js
72-module-template-v4-bridge.js
73-module-template-v4-renderers.js
70-module-template-v4-hydration.js
```

HMV4 begin/end comments are present for both styles and scripts. Fixture script `74` is not loaded.

## Fixture and registry checks

Fixture and registry files were found under:

```text
tests/fixtures/module-template-v4/
tests/fixtures/module-template-v4/registries/
```

JSON parse result:

```text
PASS json tests/fixtures/module-template-v4/a11y-fixtures.json
PASS json tests/fixtures/module-template-v4/shell-fixtures.json
PASS json tests/fixtures/module-template-v4/screenshot-matrix.json
PASS json tests/fixtures/module-template-v4/bridge-fixtures.json
PASS json tests/fixtures/module-template-v4/workspace-fixtures.json
PASS json tests/fixtures/module-template-v4/state-fixtures.json
PASS json tests/fixtures/module-template-v4/record-fixtures.json
PASS json tests/fixtures/module-template-v4/route-fixtures.json
PASS json tests/fixtures/module-template-v4/registries/routes/hmv4-route-registry.json
```

Fixture relative path check after fix:

```text
PASS fixture relative paths
```

## Runtime no-op / feature flag checks

Static checks passed:

```text
PASS css order after graphics authority
PASS js order before bootstrap
PASS 74 absent from portal
PASS hydration has no-op guard
PASS hydration exposes compatibility global
PASS feature flags default inert in portal
PASS mutation launchers disabled flag
```

Evidence:

- `window.HMV4_PREVIEW_ENABLED` defaults false in `mom/portal.html`.
- `window.HMV4_FIXTURE_MODE` defaults false in `mom/portal.html`.
- Hydration returns early when not preview and not under `/ops`.
- Compatibility globals are present: `window.Hmv4Routes`, `window.Hmv4Bridge`, `window.Hmv4Renderers`, and `window.HMModuleTemplateV4Hydration`.
- Workspace rendering carries `data-authority-class="projection"` and `data-requires-reanchor="true"`.

## Route and bridge checks

Static Node route checks passed:

```text
PASS route classes: AC,AR,DL,ERD,ML,NRD,SFW,SH,WS
PASS /ops parses as shell
PASS record route parses
PASS workspace route parses
PASS unknown alias unmapped
PASS dispatch alias mapped
```

Unknown aliases return:

```text
unmapped_needs_decision
```

## Accessibility and keyboard checks

Static/manual checks passed for:

- labelled breadcrumb `nav`;
- `tablist`, `tab`, and `tabpanel` semantics in rendered record shell;
- `aria-current="page"` in breadcrumb rendering;
- skip link in the template;
- action controls use `<button>` where present;
- navigation uses links;
- focus-visible styles exist for buttons, nav links, and tabs;
- critical/warning states include visible text, not only color;
- keyboard left/right tab movement exists in the hydration adapter.

Warning:

```text
requires_runner_bootstrap
```

Automated accessibility and keyboard E2E specs were not executed because no JS/E2E runner was found.

## Browser smoke results

Local servers used:

```text
php -S 127.0.0.1:8090 -t mom
php -S 127.0.0.1:8091 -t .
```

Browser smoke results:

```text
PASS portal default page loaded at http://127.0.0.1:8091/mom/portal.html
PASS default portal kept HMV4 shell absent/inert
PASS HMV4 template page loaded at http://127.0.0.1:8090/templates/module-template-v4/module-template-v4.html
PASS fixture page loaded at http://127.0.0.1:8091/tests/fixtures/module-template-v4/pages/shell-home.html
PASS fixture page resolved HMV4 assets after fixture link fix
PASS no current 8091 browser error logs
```

Warning:

The `php -S 127.0.0.1:8090 -t mom` fallback emits an existing PWA service-worker error because this portal expects `/mom/sw.js`. Serving from repo root with `php -S 127.0.0.1:8091 -t .` matches the `/mom/...` path assumptions better.

Fixture pages load the HMV4 shell and assets, but route-specific visual fixture coverage remains shallow because the generic fixture HTML pages do not each force their named `/ops` route.

## Rollback verification

The exact prompt rollback command failed in this committed-state checkout:

```text
FAIL rollback
```

Reason: Step 9 was already committed at HEAD before Step 10 started, so `git checkout -- mom/portal.html` restores the patched committed file, not the pre-Step9 file.

Committed-state rollback rehearsal passed:

```text
PASS committed rollback
```

Command shape:

```bash
cp mom/portal.html /tmp/portal-hmv4-step10-committed.html
git checkout HEAD^ -- mom/portal.html
grep -n "module-template-v4" mom/portal.html && echo "FAIL committed rollback" || echo "PASS committed rollback"
cp /tmp/portal-hmv4-step10-committed.html mom/portal.html
```

## Fixes applied, if any

Applied one fixture-only fix:

```text
tests/fixtures/module-template-v4/pages/*.html
```

Changed relative HMV4 asset/script paths from:

```text
../../../mom/...
```

to:

```text
../../../../mom/...
```

This fixes browser smoke when fixture pages are served from the repo root.

No production files, forbidden files, architecture, route grammar, APIs, workflows, or Step 11 migration surfaces were modified.

## Known warnings

- Step 9 assets were already committed on `main`/`origin/main` before Step 10 started; the expected Codex branch was recreated from that HEAD for QA.
- No JS/E2E runner was found; E2E specs are `requires_runner_bootstrap`.
- Prompt rollback command is stale for a committed patch; committed rollback using `HEAD^` passed.
- Fixture HTML pages now load assets correctly, but route-specific visual fixture behavior needs stronger per-page route setup in a later QA hardening pass.
- The `-t mom` PHP server fallback is not the best smoke command for this repo because PWA paths expect `/mom/...`.

## Blockers

No production-safety blocker was found.

Step 11 should not start as migration work from this prompt. Before limited Wave 1 planning, bootstrap the JS/E2E runner and decide the committed rollback command for the release procedure.

## Go/no-go for Step 11

```text
STEP10_PASS_WITH_WARNINGS_NEEDS_QA_FOLLOWUP
```

Allowed next step: limited Wave 1 planning prompt preparation only.

Do not start Wave 1 migration until the JS/E2E runner and committed rollback procedure are explicitly accepted.
