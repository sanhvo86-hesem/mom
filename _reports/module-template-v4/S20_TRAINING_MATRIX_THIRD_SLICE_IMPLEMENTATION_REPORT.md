# S20 Training Matrix Third-slice Implementation Report

## Summary

Implemented the development/prototype Training Matrix Workspace third-slice
per the approved V20 plan. The slice adds a read-only qualification
projection at `/ops/people-skill-ehs/training-competency/matrix`,
fixture-backed, with no backend mutation, no certification execution, no
training-completion submit, and no e-sign. The current portal remains inert
by default and forbidden files are untouched. 79 E2E tests pass on
chromium, including 14 new training-matrix-specific assertions and 5 new
axe-core WCAG 2 AA pages.

This is pre-production readiness work, not a production go-live.

## Branch And Working Tree

```text
branch:           codex/second-slice-planning-from-dispatch-qa
HEAD ancestor:    7a2b3958 docs(module-template-v4): execute Stream E1 ai-index regen + retrospective E reports
prior ancestors:  24d57d9a feat(module-template-v4): execute Streams B+D+E parallel deliverables
                  1cf6b693 docs(module-template-v4): add upgrade prompt packs + V20 planning artifacts
                  5f538cce docs(module-template-v4): add parallel strategic research and Wave 1 roadmap
                  567e365b docs(module-template-v4): track Slice 1+2 QA evidence and V20 plan
                  2eb6a7aa Add nonconformance record shell routing and fixtures
                  9289ef89 Harden dispatch board projection QA fixtures
required Slice 1: 9289ef89 PRESENT
required Slice 2: 2eb6a7aa PRESENT
required V20:     567e365b PRESENT
```

V20 plan named `codex/second-slice-planning-from-dispatch-qa` as the
working base. Implementation lands directly on this branch (not a separate
`codex/slice-3-train-from-nc-qa` fork) to keep the V20 implementation
prompt's "Required Base" self-consistent.

Working tree at end of A3 contained the A3 deltas plus untracked artifacts
from parallel Streams D (visual/perf/security/navshell specs +
domain/module landing fixtures) and E (S_QA reports, correction notes,
ai-index regen). Those are not part of this slice and are recorded only as
context.

## Files Changed (A3 deltas only)

Modified:

```text
mom/scripts/portal/73-module-template-v4-renderers.js     (+148 lines)
tests/e2e/module-template-v4.spec.ts                       (+118 lines, 7 tests)
tests/e2e/module-template-v4-bridge.spec.ts                (+12 lines, 1 test)
tests/e2e/module-template-v4-axe.spec.ts                   (+5 lines, 5 a11y pages)
tests/e2e/module-template-v4-keyboard.spec.ts              (+15 lines, 1 test)
```

Created:

```text
tests/fixtures/module-template-v4/training-matrix-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-training-matrix.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html
tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html
_reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md
```

Bridge (`72-module-template-v4-bridge.js`) and routes
(`71-module-template-v4-routes.js`) were not modified. The existing
`training` alias mapping to the training-competency module landing remains
canonical, and existing WS-class allowed query keys (`view`, `scope`,
`lane`, `group_by`, `q`) are reused as the conceptual surface for
team/role/qualification/status filters.

CSS, templates, and the portal HTML were not touched.

## Training Matrix Route Behavior

Target route:

```text
/ops/people-skill-ehs/training-competency/matrix
```

Renderer dispatch:

```text
renderRoute → renderWorkspace → isTrainingMatrixRoute? → renderTrainingMatrixWorkspace
```

Required posture attributes (set on `<section data-hmv4-training-matrix>`):

```text
data-route-class="WS"
data-domain="people-skill-ehs"
data-module="training-competency"
data-workspace-family="matrix"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
data-projection-id (from fixture)
data-projection-freshness (fixture_current | fixture_stale | fixture_conflict | fixture_missing)
data-projection-state (current | empty | conflict | partial_access | degraded_offline)
data-query-view (default | empty | conflict | partial | degraded)
```

Filter chips reflect URL state from the existing WS allowed query keys.
When no filter is active, an "All operators (no filter)" chip is shown.

## Workspace Projection Authority Checks

E2E `parses training matrix route as workspace with allowed view query`
asserts the route adapter parses the canonical path:

```text
routeClass = WS
params.domain = people-skill-ehs
params.module = training-competency
params.workspace_family = matrix
query.view = default
rejectedQuery = []
```

E2E `renders training matrix as a read-only projection workspace` asserts:

```text
[data-hmv4-training-matrix] is visible
data-route-class = WS
data-authority-class = projection
data-resource-family = training-records
data-root-code = TRAIN
data-requires-reanchor = true
data-projection-state = current
matrix grid: role="grid" with 3 operator rows × 4 qualification columns
all five status enums present in cells: qualified, expiring, expired, in_training, not_required
mutation buttons: 3, all disabled
record-open links: at least one href starts with /ops/records/training-records/ and includes ?tab=overview
```

## Read-only / No-mutation Checks

The workspace shell exposes three top-level disabled mutation controls,
each tagged with `data-hmv4-mutation-intent` and aria-described by the
re-anchor note:

```text
data-hmv4-mutation-intent="train-issue-qualification"   (Issue qualification disabled)
data-hmv4-mutation-intent="train-schedule-training"     (Schedule training disabled)
data-hmv4-mutation-intent="train-acknowledge"           (Acknowledge / sign disabled)
```

E2E asserts these are present and disabled across all five fixture states.
No matrix cell exposes any clickable button, form, submit, e-sign
challenge, or backend fetch. Cells are pure rendered HTML containing a
status chip, optional last-cert/expires text, and an optional record-open
anchor.

E2E `renders empty training matrix without enabling mutation`,
`renders conflict training matrix with visible conflict text`,
`renders partial-access training matrix with visible limitation`,
`renders degraded training matrix with visible stale state`,
each verify enabled-mutation count is zero.

## Bridge Alias Checks

`module-template-v4-bridge.spec.ts` adds:

```text
maps legacy training alias to canonical training-competency module
  → resolveEqmsModule('training').policy = redirect_then_deprecate
  → url contains /ops/people-skill-ehs/training-competency
  → resolveEqmsModule('training-unknown').policy = unmapped_needs_decision
  → url is null, reason is no_eqms_alias
```

The `ncr` policy is unchanged; existing dispatch alias and unknown-alias
behavior are unchanged.

## Fixture Coverage

```text
training-matrix-fixtures.json                          (catalog)
pages/workspace-training-matrix.html                   (happy: 3 ops × 4 quals, all five status enums covered)
pages/workspace-training-matrix-empty.html             (no operators in scope)
pages/workspace-training-matrix-conflict.html          (conflict / fixture_conflict)
pages/workspace-training-matrix-partial-access.html    (partial_access with limitation text + scope filter)
pages/workspace-training-matrix-degraded.html          (degraded_offline / fixture_stale)
```

The conflict fixture is included even though V20 listed it as optional —
it provides full state coverage parity with the Slice 2 NC shell.

## E2E Result

```text
suite:        playwright test module-template-v4*.spec.ts --project=chromium
result:       79 passed (35.8s)
new tests:    14 (7 in module-template-v4.spec.ts, 1 in -bridge.spec.ts,
                  5 in -axe.spec.ts, 1 in -keyboard.spec.ts)
prior count:  approx. 36 (commit 24d57d9a baseline) + Streams D/E parallel additions
```

All 5 training-matrix axe-core a11y pages pass with no critical or serious
violations across `wcag2a wcag2aa wcag21a wcag21aa`.

## JS Syntax Result

```text
node --check mom/scripts/portal/70-module-template-v4-hydration.js   PASS
node --check mom/scripts/portal/71-module-template-v4-routes.js      PASS
node --check mom/scripts/portal/72-module-template-v4-bridge.js      PASS
node --check mom/scripts/portal/73-module-template-v4-renderers.js   PASS
node --check mom/scripts/portal/74-module-template-v4-fixtures.js    PASS
```

`73-module-template-v4-renderers.js` final line count: 424 (up from 293).

## JSON Fixture Result

All 13 JSON fixtures under `tests/fixtures/module-template-v4/**/*.json`
parse, including the new `training-matrix-fixtures.json`.

## Current Portal Safety Result

```text
grep -n "74-module-template-v4-fixtures" mom/portal.html
  → no match  (PASS no fixture production load)

E2E "keeps production portal inert without fixture script":
  → PASS (no #hmv4-ops-shell rendered, window.Hmv4Fixtures absent,
          window.HMV4_FIXTURE_MODE falsy)
```

The training matrix renderer is reachable only through fixture pages that
explicitly set `window.HMV4_PREVIEW_ENABLED = true` and load the four
allowed scripts (71/72/73/70). It is NOT registered into
`mom/portal.html`, `mom/scripts/portal/01-module-router.js`, or any other
forbidden file.

## Forbidden Diff Result

```text
git diff --name-only HEAD | grep -E '...forbidden patterns...'
  → no match  (PASS no forbidden diff)

verified files (none modified by A3):
  mom/portal.html
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js
```

## Graphics Authority Compliance Result

```text
grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/73-module-template-v4-renderers.js
  → no match  (PASS no hex in JS)

grep -nE '"[0-9]+px"' mom/scripts/portal/73-module-template-v4-renderers.js
  → no match  (PASS no px in JS string)
```

The renderer emits class names only and lets `module-template-v4.css` and
`module-template-v4.tokens.css` resolve all colors, spacing, radius, and
typography through `--hmv4-*` tokens introduced in commit `24d57d9a`. The
status chip uses existing `.hmv4-chip` styling supplemented by
`data-feedback-state` attributes mapped to existing
`.hmv4-feedback[data-feedback-state="success|warning|danger|info"]`
selectors. Status text is the primary indicator; color is supplementary
(WCAG-compliant).

## Rollback Notes

Third-slice-only revert (working tree, before commit):

```bash
git checkout -- \
  mom/scripts/portal/73-module-template-v4-renderers.js \
  tests/e2e/module-template-v4.spec.ts \
  tests/e2e/module-template-v4-bridge.spec.ts \
  tests/e2e/module-template-v4-axe.spec.ts \
  tests/e2e/module-template-v4-keyboard.spec.ts

rm -f tests/fixtures/module-template-v4/training-matrix-fixtures.json
rm -f tests/fixtures/module-template-v4/pages/workspace-training-matrix*.html
rm -f _reports/module-template-v4/S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md
```

If committed, the candidate revert is a single commit subject like:

```text
feat(module-template): add training matrix workspace prototype
```

A `git revert <hash>` of that commit removes the third slice cleanly
because no shared infrastructure files were touched.

Slice 1 (Dispatch) and Slice 2 (Nonconformance) artifacts must NOT be
removed by any third-slice rollback; the rollback above is scoped to
training-matrix files only.

## Remaining Warnings

1. Working tree contains substantial untracked content from parallel
   Streams D (visual/perf/navshell/security specs and domain/module
   landing fixtures) and parallel E corrections (S_QA reports, V20 API
   readiness verification note, prompt pack 3 correction note).
   These are orthogonal to Slice 3 but will need to be reconciled before
   any single bundled commit. Current commit boundary recommendation: A3
   should commit ONLY the files listed under "Files Changed" above; the
   parallel Stream D/E work belongs in its own commits.

2. Filename naming convention: V20 planning prompts are `V20_*` while
   implementation/QA reports are `S20_*` / `S22_*`. Pack 1's A1 spec
   nominally calls for `S20_*` planning artifacts; the on-disk planning
   files use `V20_*`. Internal references are self-consistent.
   Cosmetic only; not blocking.

3. Branch naming: Pack 1's A1 nominally calls for a working branch
   `codex/slice-3-train-from-nc-qa`. V20 implementation prompt explicitly
   names `codex/second-slice-planning-from-dispatch-qa` as the required
   base. Implementation honored V20 (the source of truth that was
   approved). No rename needed.

4. Subject filters from the V20 scope contract (`?team=`, `?role=`,
   `?qualification=`, `?status=`) are mapped onto the existing
   WS-class allowed query keys (`scope`, `lane`, `group_by`, `q`, `view`)
   to avoid touching `71-module-template-v4-routes.js`, which is outside
   the A3 allowed file list. The renderer reads any of the allowed keys
   and displays them as filter chips. If literal `team=`/`role=`/
   `qualification=`/`status=` keys are required as URL grammar in a
   future iteration, that change belongs in Stream A or Stream C as a
   route-grammar update, not in A3.

## Decision

```text
TRAINING_MATRIX_THIRD_SLICE_PASS_READY_FOR_QA
TRAIN_IMPLEMENTATION_PASS_READY_FOR_QA
```

Both decision phrases are recorded for reader convenience: the first
matches the V20 implementation prompt vocabulary, the second matches the
Pack 1 A3 vocabulary.
