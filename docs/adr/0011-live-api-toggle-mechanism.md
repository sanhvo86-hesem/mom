# ADR 0011: Live API Toggle Mechanism

## Status

Accepted

## Context

Module Template V4 is fixture-first by design. The NQCASE record shell can render authoritative nonconformance case data from stable fixture contracts, while the backend now exposes the EQMS plural alias `GET /api/v1/nonconformance-cases/{id}`. The platform needs a first cutover experiment that proves a live read path without changing production defaults, replacing fixtures, or enabling mutations from prototype UI.

## Decision

Add an opt-in live API toggle for development and prototype verification. The default remains fixture mode. A load may opt in through `window.HMV4_LIVE_API_ENABLED=true`, `?hmv4-live-api=1`, or `data-hmv4-live-api="true"` on `<body>`. When enabled for an authoritative `nonconformance-cases` record route, the hydration adapter renders a loading placeholder, calls `GET /api/v1/nonconformance-cases/{id}` with included credentials, adapts the response into the existing NQCASE fixture shape, and reuses the existing `renderNonconformanceRecord` renderer. Failed responses render an explicit fallback message and do not execute any write action.

## Consequences

### Positive
- Proves a low-risk fixture-to-live cutover path for NQCASE before expanding to CAPA, CDOC, and other slices.
- Preserves the existing renderer contract by adapting live data into the established fixture shape.
- Keeps production and `mom/portal.html` default behavior unchanged.
- Keeps all disposition, CAPA, and e-sign actions disabled in fixture and live modes.

### Negative
- Live mode is still a prototype adapter and may need field expansion as the backend response shape becomes stricter.
- Unauthenticated local environments commonly settle into the fallback UI because backend GET calls may return `401`.

### Neutral
- The toggle is per-load and client-side. It is not a deployment cutover flag.
- The adapter performs only `GET` requests and does not change backend authority, routing, or controller behavior.

## Alternatives Considered

### Replace Fixtures With Live API
Rejected because the fixture-first development contract and visual regression baseline must remain stable until each slice is explicitly cut over.

### Add Backend Changes For NQCASE Prototype Data
Rejected because the plural EQMS alias already exists and this experiment must not alter EQMS controllers or methods.

### Add Live Fetch Logic Inside The Renderer
Rejected for the first experiment because hydration is the correct boundary for route-level data source selection, while renderers should remain deterministic HTML producers.

## References

- `mom/scripts/portal/70-module-template-v4-hydration.js`
- `mom/scripts/portal/73-module-template-v4-renderers.js`
- `tests/e2e/module-template-v4-live-api.spec.ts`
- ADR-0007 fixture-first development
- ADR-0008 EQMS plural-form canonical paths

## History

- 2026-04-25: Accepted for the NQCASE live API toggle experiment.
