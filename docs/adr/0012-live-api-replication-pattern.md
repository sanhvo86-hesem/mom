# ADR 0012: Live API replication pattern (resource registry)

## Status
Accepted (2026-04-26)

## Context
ADR-0011 introduced the live API toggle for NQCASE with per-resource functions.
Slice 11 (WO) added an identical second set. As EQMS slices land (CAPA, CDOC,
INSP, BREL, ECO), replicating that pattern verbatim accumulates 7+ sets of
near-identical boilerplate.

## Decision
Replace per-resource live-mode functions with a single HMV4_LIVE_RESOURCE_REGISTRY
map keyed by resource family string. Each entry declares: canonicalPath,
fixtureGlobal, recordAttr, adapt(live). A single fetchLiveResource + renderLiveResource
dispatcher handles all AR live-mode routes. hydrate() checks routeClass=AR and
readLiveApiFlag() once, then delegates to renderLiveResource.

Legacy Hmv4LiveApi.fetchNonconformance, fetchWorkOrder, adaptNcToFixtureShape,
adaptWoToFixtureShape preserved as thin wrappers (ADR-0011 backwards compat).

Adding a new live-mode-supported root = one registry entry only.

## Consequences
+ Single dispatcher for all present and future AR live-mode routes
+ Consistent loading placeholder and error fallback UI across all roots
+ window.Hmv4LiveApi.registry is inspectable in tests
- adapt() functions per root still require maintenance as backend payloads evolve

## References
- ADR-0011: NQCASE live API toggle (predecessor)
- mom/scripts/portal/70-module-template-v4-hydration.js
- tests/e2e/module-template-v4-live-api.spec.ts
