# ADR 0012: Live API replication pattern (resource registry)

## Status
Accepted (2026-04-25)

## Context
ADR-0011 introduced the live API toggle for NQCASE, with per-resource
functions (`fetchLiveNonconformance`, `adaptLiveNcToFixtureShape`,
`isLiveNonconformanceRoute`, `renderLiveNonconformance`) hard-wired to the
nonconformance-cases family. As Phase A slices land for CAPA, CDOC, INSP,
BREL, and ECO, replicating that pattern verbatim would add ~6× boilerplate
with no architectural benefit.

## Decision
Replace per-resource live-mode functions with a single
`HMV4_LIVE_RESOURCE_REGISTRY` map keyed by resource family string. Each
entry declares:

| Field | Purpose |
|---|---|
| `canonicalPath` | REST path prefix (`/api/v1/<plural>`) |
| `fixtureGlobal` | `window.*` fixture object name the renderer reads |
| `recordAttr` | DOM attribute used to locate the rendered record root |
| `adapt(live)` | Normalises live API payload to fixture shape |

A single `fetchLiveResource(family, recordId)` function handles all
network fetches. A single `renderLiveResource(shell, route)` function
dispatches the fetch, writes the loading placeholder, populates
`window[fixtureGlobal]`, re-renders via `Hmv4Renderers.renderRoute`, and
marks the DOM root `data-hmv4-source="live-api"`. Error fallback is
identical across all roots.

The `hydrate()` entry point checks `route.routeClass === 'AR'` and
`readLiveApiFlag()` once, then delegates to `renderLiveResource`
regardless of which resource family the route targets.

Legacy `Hmv4LiveApi.fetchNonconformance` and
`Hmv4LiveApi.adaptNcToFixtureShape` are preserved as thin wrappers
(ADR-0011 backwards compat).

Adding a new live-mode-supported root requires one registry entry only —
no changes to the dispatcher.

## Consequences
**Positive**
- Single dispatcher for all present and future AR live-mode routes
- Consistent loading placeholder and error fallback UI across all roots
- `window.Hmv4LiveApi.registry` is inspectable in tests (registry
  entry presence assertion replaces brittle string matching)
- ADR/governance overhead reduced: one entry per new root, not one PR

**Negative / trade-offs**
- `adapt()` functions per root still require maintenance as backend
  payloads evolve; registry consolidation does not eliminate that cost
- Generic dispatcher cannot special-case rendering edge cases (e.g.
  a root requiring a secondary fetch before render) without extending
  the registry contract

## Alternatives considered
1. **Per-root fetch+dispatch functions** — rejected: 6× boilerplate,
   identical error path copy-pasted six times, harder to keep consistent
2. **Backend-side fixture-to-live shape harmonisation** — rejected:
   requires backend schema changes; out of frontend prototype scope;
   violates pre-production ADR-0001 posture

## References
- ADR-0011: NQCASE live API toggle (predecessor)
- `mom/scripts/portal/70-module-template-v4-hydration.js`
- `tests/e2e/module-template-v4-live-api.spec.ts`
- `_reports/module-template-v4/S_LIVE_API_REPLICATION_REPORT.md`
