# ADR 0012: Live API replication pattern (resource registry)

## Status
Accepted (2026-04-26)

## Context
ADR-0011 introduced the live API toggle for NQCASE with per-resource
functions (`fetchLiveNonconformance`, `adaptLiveNcToFixtureShape`,
`isLiveNonconformanceRoute`, `renderLiveNonconformance`). Slice 11 (WO)
added an identical second set. As more EQMS-backed and transactional slices
land (CAPA, CDOC, INSP, BREL, ECO), replicating that pattern verbatim
accumulates 7+ sets of near-identical boilerplate with no architectural benefit.

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

A single `fetchLiveResource(family, recordId)` handles all network fetches.
A single `renderLiveResource(shell, route)` dispatches the fetch, writes the
loading placeholder, populates `window[fixtureGlobal]`, re-renders via
`Hmv4Renderers.renderRoute`, and marks the DOM root `data-hmv4-source="live-api"`.
Error fallback is identical across all roots.

`hydrate()` checks `route.routeClass === 'AR'` and `readLiveApiFlag()` once,
then delegates to `renderLiveResource` regardless of resource family.

Legacy `Hmv4LiveApi.fetchNonconformance`, `fetchWorkOrder`,
`adaptNcToFixtureShape`, `adaptWoToFixtureShape` are preserved as thin
wrappers (ADR-0011 backwards compat).

Adding a new live-mode-supported root = one registry entry only.

## Consequences
**Positive**
- Single dispatcher for all present and future AR live-mode routes
- Consistent loading placeholder and error fallback UI across all roots
- `window.Hmv4LiveApi.registry` is inspectable in tests
- ADR/governance overhead reduced: one entry per new root, not one PR

**Negative / trade-offs**
- `adapt()` functions per root still require maintenance as backend payloads evolve
- Generic dispatcher cannot special-case rendering edge cases without extending
  the registry contract

## Alternatives considered
1. **Per-root fetch+dispatch functions** — rejected: 7× boilerplate, identical error path, harder to keep consistent
2. **Backend-side fixture-to-live shape harmonisation** — rejected: requires backend schema changes; out of frontend prototype scope

## References
- ADR-0011: NQCASE live API toggle (predecessor)
- `mom/scripts/portal/70-module-template-v4-hydration.js`
- `tests/e2e/module-template-v4-live-api.spec.ts`
- `_reports/module-template-v4/S_LIVE_API_REPLICATION_REPORT.md`
