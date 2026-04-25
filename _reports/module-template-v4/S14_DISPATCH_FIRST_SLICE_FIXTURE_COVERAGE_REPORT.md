# S14 Dispatch First Slice Fixture Coverage Report

## Summary

Dispatch Board first-slice fixture coverage is now complete for the V14 QA target states. Coverage remains fixture-only and does not promote registries into `mom/qms-data`.

## Coverage Matrix

| Coverage target | Status | Evidence |
|---|---|---|
| Happy dispatch board | Covered | `tests/fixtures/module-template-v4/pages/workspace-board.html`; `tests/e2e/module-template-v4.spec.ts` verifies 3 cards, projection authority, re-anchor flag, disabled mutation controls, and record link. |
| Empty board | Covered | Added `tests/fixtures/module-template-v4/pages/workspace-board-empty.html`; E2E verifies zero cards, zero mutation controls, and three visible `No targets` messages. |
| Stale/degraded board | Covered | Added `tests/fixtures/module-template-v4/pages/workspace-board-degraded.html`; E2E verifies `data-projection-freshness="fixture_stale"`, `data-projection-state="degraded_offline"`, visible stale state messaging, and re-anchor record links. |
| Blocked/hold target | Covered | Existing `DISP-004` blocked card plus degraded `DISP-011` with `Blocked / hold`, `quality hold`, and `offline sync pending`. |
| In-progress target | Covered | Existing running lane target `DISP-003`. |
| Ready target | Covered | Existing ready targets `DISP-001`, `DISP-002`, plus degraded stale ready target `DISP-010`. |
| Record-open link | Covered | E2E asserts record links resolve to `/ops/records/dispatch-targets/{id}?tab=overview`. |
| Disabled mutation controls | Covered | Renderer emits disabled buttons with `data-hmv4-mutation-intent`; E2E confirms all mutation controls are disabled on populated board and absent on empty board. |
| Unknown alias | Covered | `tests/fixtures/module-template-v4/pages/unknown-alias.html`; bridge E2E confirms `unmapped_needs_decision`. |
| Dispatch alias | Covered | `tests/fixtures/module-template-v4/pages/bridge-alias.html`; bridge E2E confirms `dispatch` maps to `/ops/planning-scheduling/dispatch-board/board`. |

## Fixture Index Updates

`tests/fixtures/module-template-v4/dispatch-board-fixtures.json` now includes a `coverageIndex` for:

- `happyDispatchBoard`
- `emptyBoard`
- `staleDegradedBoard`
- `dispatchAlias`
- `unknownAlias`

`tests/fixtures/module-template-v4/route-fixtures.json` now includes route contexts for:

- `/ops/planning-scheduling/dispatch-board/board?view=empty`
- `/ops/planning-scheduling/dispatch-board/board?view=degraded&focus=offline`

## QA Fixes Applied

- Added empty board fixture page.
- Added degraded/offline board fixture page.
- Added visible projection state metadata and status text in the dispatch renderer.
- Added E2E assertions for empty and degraded board behavior.
- Added accessibility assertion for the dispatch board region name.

## Remaining Fixture Gaps

No blocking fixture coverage gaps remain for the V14 Dispatch Board first-slice QA scope.

