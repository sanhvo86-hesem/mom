# HMV4 Live API Toggle Replication — Implementation Report

**Branch:** `codex/live-api-toggle-replication-phase3`
**Date:** 2026-04-26
**Status:** LIVE_API_REPLICATION_PASS_READY_FOR_REVIEW

---

## Summary

Replicated the NQCASE/WO live API toggle pattern (ADR-0011) to five additional
EQMS-backed authoritative record roots (CAPA, CDOC, INSP, BREL, ECO),
completing Phase A live-mode coverage. Implemented as a shared resource
registry (ADR-0012), absorbing both the existing NQCASE and WO implementations
into a single dispatcher.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `mom/scripts/portal/70-module-template-v4-hydration.js` | Modified | 7-entry registry replaces 2 per-resource function sets |
| `tests/e2e/module-template-v4-live-api.spec.ts` | Modified | `liveModePages` loop: 7 pages × 3 tests = 21 new test cases |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-live-mode.html` | New | CAPA live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-live-mode.html` | New | CDOC live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-live-mode.html` | New | INSP live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-live-mode.html` | New | BREL live-mode fixture page |
| `tests/fixtures/module-template-v4/pages/authoritative-record-shell-eco-live-mode.html` | New | ECO live-mode fixture page |
| `docs/adr/0012-live-api-replication-pattern.md` | New | ADR documenting registry pattern |

---

## Registry Entries (7 total)

| Family key | Canonical path | Fixture global | Record attr |
|---|---|---|---|
| `nonconformance-cases` | `/api/v1/nonconformance-cases` | `HMV4_NONCONFORMANCE_CASE_FIXTURE` | `data-hmv4-nonconformance-record` |
| `work-orders` | `/api/v1/work-orders` | `HMV4_WO_RECORD_FIXTURE` | `data-hmv4-wo-record` |
| `capas` | `/api/v1/capas` | `HMV4_CAPA_RECORD_FIXTURE` | `data-hmv4-capa-record` |
| `controlled-documents` | `/api/v1/controlled-documents` | `HMV4_CDOC_RECORD_FIXTURE` | `data-hmv4-cdoc-record` |
| `inspections` | `/api/v1/inspections` | `HMV4_INSP_RECORD_FIXTURE` | `data-hmv4-insp-record` |
| `batch-releases` | `/api/v1/batch-releases` | `HMV4_BREL_RECORD_FIXTURE` | `data-hmv4-brel-record` |
| `engineering-changes` | `/api/v1/engineering-changes` | `HMV4_ECO_RECORD_FIXTURE` | `data-hmv4-eco-record` |

---

## Pre-production Invariants (all maintained)

| Invariant | Status |
|---|---|
| `HMV4_LIVE_API_ENABLED` defaults to `false` | PASS |
| No `HMV4_LIVE_API_ENABLED=true` in `mom/portal.html` | PASS |
| No mutation in live mode | PASS — mutation buttons remain disabled |
| Forbidden files untouched | PASS |

---

## Quality Gates

- Node syntax check: PASS
- Forbidden diff guard: PASS
- No live-api default in portal.html: PASS
- Playwright E2E (fixture mode): pending run
