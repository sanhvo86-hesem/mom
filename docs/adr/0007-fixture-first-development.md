# ADR 0007: Fixture-first development (no live API in slices)

## Status

Accepted (2026-04-25)

## Context

The frontend redesign program faces a backend gap: out of 18 Wave 1
roots, **0 are GREEN** (full canonical CRUD + lifecycle transitions
wired). 12 roots are YELLOW (exist but with naming mismatch or legacy
path). 6 roots are RED (no implementation).

If frontend slice work waits for backend GREEN, no slice ships in
2026. Conversely, if frontend slices write live API integration code
against unstable backends, regression risk grows linearly with each
slice.

A fixture-first approach lets frontend iterate independently. Live API
integration becomes a **separate, sliceable** phase that can run
parallel to frontend slice work or follow it.

## Decision

All HMV4 slices use **static JSON fixtures** under
`tests/fixtures/module-template-v4/`. No fetch/XHR calls in slice code.
No backend dependency at slice-time.

### Fixture structure

```text
tests/fixtures/module-template-v4/
├── *.json                  # per-slice fixture data (e.g., dispatch-board-fixtures.json)
├── pages/                  # fixture HTML pages for E2E
│   └── *.html
├── registries/             # registry seed data
│   └── routes/
└── README.md
```

### Fixture loading

Two paths:

1. **E2E test mode** — Fixture HTML pages load HMV4 scripts (70-74)
   and inject fixture data via `<script data-hmv4-*-fixture>` blocks.
   The 74-module-template-v4-fixtures.js helper reads these and exposes
   data on `window.HMV4_*_FIXTURE`.

2. **Preview mode** (dev only) — When `HMV4_PREVIEW_ENABLED=true`,
   hydration tries to load fixture data from `tests/fixtures/...` URL.
   Production never enables this flag.

### When live API integration begins

A future ADR will define the live cutover criteria:
- All Step 3 frozen API family tokens have backend endpoints (or aliases)
- Spine endpoints (workflow-tasks, work-inbox) are GREEN
- Per-root migration toggle (fixture mode vs live mode)

Until then, all slices stay fixture-only.

### Schema drift mitigation

Fixture data may drift from real schema. Mitigations:

- Fixture JSON shape mirrors the OpenAPI spec for each root (manually
  kept in sync during planning)
- A future CI check could validate fixture JSON against OpenAPI schema
- Slice planning artifacts (S20-style scope contracts) document the
  fixture schema explicitly

## Consequences

### Positive
- Frontend independent of backend; iterates fast
- Slices ship fixture-only without backend gate
- E2E tests deterministic (no flaky live data)
- Easier to test edge cases (conflict, partial-access, degraded states)

### Negative
- Schema drift risk grows over time
- "Works on my machine" gap: fixture works, live may not
- Live integration is a future big-bang risk if deferred too long

### Neutral
- The first live integration slice will be a learning event; schema
  mismatches will surface
- A "live mode" toggle per slice mitigates big-bang risk

## Alternatives Considered

### Alternative 1: Live API from Slice 1
Reject backend gap; build slices against real endpoints. Rejected: 0
GREEN roots; would block all slices for 6+ weeks of backend work.

### Alternative 2: Mock backend service
Run a mock server (e.g., MSW, json-server) for local dev. Rejected:
extra service to maintain; fixture HTML pages already provide same
benefit with less infrastructure.

### Alternative 3: Hybrid (some slices live, some fixture)
First N slices fixture, then live. Rejected: arbitrary cutoff; better
to defer live cutover decision per ADR.

## References

- `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md`
- `_reports/module-template-v4/STRATEGIC_MASTER.md` Section 3
- `tests/fixtures/module-template-v4/README.md`
- ADR 0008 EQMS plural-form canonical paths (backend prereq for live)

## History

- 2026-04-25: Proposed and Accepted
