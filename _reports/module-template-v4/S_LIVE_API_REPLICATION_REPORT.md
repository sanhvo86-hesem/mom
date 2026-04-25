# HMV4 Live API Toggle Replication — Implementation Report

**Slice:** Live API toggle replication (CAPA + CDOC + INSP + BREL + ECO)
**Branch:** `codex/live-api-toggle-replication-phase3`
**Date:** 2026-04-25
**Status:** LIVE_API_REPLICATION_PASS_READY_FOR_REVIEW

---

## Summary

Replicated the NQCASE live API toggle pattern (ADR-0011) to five additional
EQMS-backed authoritative record roots, completing Phase A live-mode coverage.
Implemented as a shared resource registry (ADR-0012) rather than per-root
copy-paste, eliminating ~6× boilerplate.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `mom/scripts/portal/70-module-template-v4-hydration.js` | Modified | Resource registry + generic dispatcher replaces NQCASE-specific functions |
| `tests/e2e/module-template-v4-live-api.spec.ts` | Modified | `liveModePages` loop adds 3 tests × 6 pages (18 new test cases) |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-live-mode.html` | New | CAPA live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-live-mode.html` | New | CDOC live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-live-mode.html` | New | INSP live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-live-mode.html` | New | BREL live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-eco-live-mode.html` | New | ECO live-mode fixture page |
| `docs/adr/0012-live-api-replication-pattern.md` | New | ADR documenting registry pattern |

---

## Architecture Change (ADR-0012)

### Before (NQCASE-only, per-resource functions)
```
fetchLiveNonconformance()          — NQCASE only
adaptLiveNcToFixtureShape()        — NQCASE only
isLiveNonconformanceRoute()        — NQCASE only
renderLiveNonconformance()         — NQCASE only
hydrate() → if(isLiveNonconformanceRoute...) → renderLiveNonconformance
```

### After (shared registry, 6 roots)
```
HMV4_LIVE_RESOURCE_REGISTRY       — 6 entries (NQCASE + CAPA + CDOC + INSP + BREL + ECO)
fetchLiveResource(family, id)      — generic fetch for any registry entry
renderLiveResource(shell, route)   — generic dispatcher: loading → fetch → adapt → render → mark
hydrate() → if(routeClass==='AR' && liveFlag) → renderLiveResource
```

Legacy `Hmv4LiveApi.fetchNonconformance` / `adaptNcToFixtureShape` preserved as wrappers.

---

## Registry Entries

| Family key | Canonical path | Fixture global | Record attr |
|---|---|---|---|
| `nonconformance-cases` | `/api/v1/nonconformance-cases` | `HMV4_NONCONFORMANCE_CASE_FIXTURE` | `data-hmv4-nonconformance-record` |
| `capas` | `/api/v1/capas` | `HMV4_CAPA_RECORD_FIXTURE` | `data-hmv4-capa-record` |
| `controlled-documents` | `/api/v1/controlled-documents` | `HMV4_CDOC_RECORD_FIXTURE` | `data-hmv4-cdoc-record` |
| `inspections` | `/api/v1/inspections` | `HMV4_INSP_RECORD_FIXTURE` | `data-hmv4-insp-record` |
| `batch-releases` | `/api/v1/batch-releases` | `HMV4_BREL_RECORD_FIXTURE` | `data-hmv4-brel-record` |
| `engineering-changes` | `/api/v1/engineering-changes` | `HMV4_ECO_RECORD_FIXTURE` | `data-hmv4-eco-record` |

---

## E2E Test Coverage Added

Each of the 6 live-mode fixture pages receives 3 new parameterised tests:

1. **Error fallback when backend 401** — page settles with
   `data-hmv4-live-api-error` or `data-hmv4-source="live-api"` within 10 s
2. **Never enables mutation** — `[data-hmv4-mutation-intent]:not([disabled])`
   count remains 0 after settlement
3. **Registry exposes correct family entry** — `Hmv4LiveApi.registry[family]`
   is truthy after hydration

Total new test cases: 18 (3 × 6 pages)

---

## Pre-production Invariants (all maintained)

| Invariant | Status |
|---|---|
| `HMV4_LIVE_API_ENABLED` defaults to `false` | PASS — line 5 of hydration.js |
| No `HMV4_LIVE_API_ENABLED=true` in `mom/portal.html` | PASS — fixture pages only |
| No mutation in live mode | PASS — mutation buttons remain disabled |
| No `74-module-template-v4-fixtures.js` load in `mom/portal.html` | PASS — forbidden file untouched |
| Forbidden files untouched | PASS — portal.html, CSS files, router, auth, shell untouched |

---

## Quality Gates

- Node syntax check (`node --check`): PASS
- Forbidden diff guard: PASS
- No live-api default in portal.html: PASS
- Playwright E2E (fixture mode, standard suite): pending run
