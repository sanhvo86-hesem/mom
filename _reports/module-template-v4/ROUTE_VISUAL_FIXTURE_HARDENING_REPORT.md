# ROUTE_VISUAL_FIXTURE_HARDENING_REPORT.md

## Summary

Route-specific visual fixture coverage was hardened without touching production files.

Changed fixture-only paths:

```text
tests/fixtures/module-template-v4/pages/*.html
tests/fixtures/module-template-v4/route-fixtures.json
```

Added fixture-only path:

```text
tests/fixtures/module-template-v4/pages/unknown-alias.html
```

## Pages inspected

```text
tests/fixtures/module-template-v4/pages/authoritative-collection.html
tests/fixtures/module-template-v4/pages/authoritative-record-shell.html
tests/fixtures/module-template-v4/pages/bridge-alias.html
tests/fixtures/module-template-v4/pages/degraded-states.html
tests/fixtures/module-template-v4/pages/domain-landing.html
tests/fixtures/module-template-v4/pages/durable-draft-shell.html
tests/fixtures/module-template-v4/pages/module-landing.html
tests/fixtures/module-template-v4/pages/shell-home.html
tests/fixtures/module-template-v4/pages/unknown-alias.html
tests/fixtures/module-template-v4/pages/workspace-analytics.html
tests/fixtures/module-template-v4/pages/workspace-archive.html
tests/fixtures/module-template-v4/pages/workspace-board.html
tests/fixtures/module-template-v4/pages/workspace-dashboard.html
tests/fixtures/module-template-v4/pages/workspace-explorer.html
tests/fixtures/module-template-v4/pages/workspace-matrix.html
tests/fixtures/module-template-v4/pages/workspace-monitor.html
tests/fixtures/module-template-v4/pages/workspace-packet.html
tests/fixtures/module-template-v4/pages/workspace-queue.html
tests/fixtures/module-template-v4/pages/workspace-tower.html
```

## JSON fixtures inspected

```text
tests/fixtures/module-template-v4/a11y-fixtures.json
tests/fixtures/module-template-v4/bridge-fixtures.json
tests/fixtures/module-template-v4/record-fixtures.json
tests/fixtures/module-template-v4/route-fixtures.json
tests/fixtures/module-template-v4/screenshot-matrix.json
tests/fixtures/module-template-v4/shell-fixtures.json
tests/fixtures/module-template-v4/state-fixtures.json
tests/fixtures/module-template-v4/workspace-fixtures.json
```

## Hardening applied

Each page fixture now includes:

```html
<script type="application/json" data-hmv4-fixture-route>
{
  "path": "/ops/records/nonconformance-cases/NC-001?tab=overview",
  "routeClass": "AR",
  "expectedRenderer": "renderRecord"
}
</script>
```

Each page also exports `window.HMV4_FIXTURE_ROUTE_CONTEXT` and performs a fixture-only `history.replaceState(...)` after the HMV4 scripts are loaded but before `DOMContentLoaded` hydration, so browser smoke can render the declared route context without production script `74`.

## Required route context coverage

```text
PASS /ops
PASS /ops/records/nonconformance-cases/NC-001?tab=overview
PASS /ops/planning-scheduling/dispatch-board/board
PASS /ops/planning-scheduling/dispatch-board/board?view=default
PASS legacy dispatch alias fixture
PASS unknown alias fixture
PASS degraded/offline/conflict fixture
```

Validation output:

```text
PASS fixture route contexts 19
```

## Production impact

No production files were modified. `74-module-template-v4-fixtures.js` remains excluded from `mom/portal.html`.
