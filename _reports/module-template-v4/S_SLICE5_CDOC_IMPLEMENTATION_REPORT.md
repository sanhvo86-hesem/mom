# Slice 5 CDOC Record Shell — Implementation Report

**Date:** 2026-04-25  
**Branch:** codex/slice-5-cdoc-from-capa-qa → merged to main (b3771027)  
**Pattern:** AR (Authoritative Record Shell) — Governed-Content class  
**Root:** CDOC  

---

## Summary

Slice 5 implements the CDOC (Controlled Document) record shell — the **first governed-content
record** in the HMV4 Wave 1 prototype program. Unlike NQCASE/CAPA (governed-quality) or DISP
(governed-process), CDOC introduces document-specific concepts: revision history, controlled-copy
distribution, effectivity scope, and supersession chain.

---

## Deliverables

### Renderer (`73-module-template-v4-renderers.js`)

- `defaultCdocRecord(recordId)` — baseline fixture with full populated data (revisions, controlled
  copies, effectivity, related records, lifecycle 7-state)
- `getCdocRecord(route)` — fixture resolution: defaults → JSON merge → state overlay
- `renderCdocPanel(tab, record)` — 8 panel renderers:
  `overview | content | revisions | controlled-copies | effectivity | related | audit | signatures`
- `renderCdocRecord(route)` — main AR renderer; wired into `renderRecord` dispatch
- Exports `renderCdocRecord` in `window.Hmv4Renderers`

**7 disabled mutation intents:**
`cdoc-submit-for-review | cdoc-approve | cdoc-release | cdoc-supersede |
cdoc-obsolete | cdoc-acknowledge-controlled-copy | cdoc-esign`

### Bridge (`72-module-template-v4-bridge.js`)

- `cdoc` entry in `eqmsModuleAliasMap` → `quality-compliance/controlled-documents` (no-context fallback)
- Context-backed dispatch: `cdoc + recordId` → `AR/controlled-documents/{id}?tab=overview`

### Fixture JSON (`tests/fixtures/module-template-v4/cdoc-record-fixtures.json`)

Record `CDOC-001` (qms-sop-100 Process Validation SOP, Rev B, state: effective) with:
- 2-revision history (A, B)
- 3 controlled-copy holders (CC-001, CC-002, CC-003)
- Effectivity scope (2 sites, 3 processes)
- 2 related records (ECO-2026-014, TR-7050)
- State overlays: `conflict | partial_access | degraded`

### Fixture Pages (11 HTML)

| File | Tab / State |
|------|-------------|
| `authoritative-record-shell-cdoc-overview.html` | overview tab |
| `authoritative-record-shell-cdoc-content.html` | content tab |
| `authoritative-record-shell-cdoc-revisions.html` | revisions tab |
| `authoritative-record-shell-cdoc-controlled-copies.html` | controlled-copies tab |
| `authoritative-record-shell-cdoc-effectivity.html` | effectivity tab |
| `authoritative-record-shell-cdoc-related.html` | related tab |
| `authoritative-record-shell-cdoc-audit.html` | audit tab |
| `authoritative-record-shell-cdoc-signatures.html` | signatures tab |
| `authoritative-record-shell-cdoc-conflict.html` | conflict state |
| `authoritative-record-shell-cdoc-partial-access.html` | partial-access state |
| `authoritative-record-shell-cdoc-degraded.html` | degraded state |

---

## Quality Gates

| Gate | Result | Notes |
|------|--------|-------|
| 1 — Node syntax (70-74) | PASS | `node --check` clean |
| 2 — JSON fixture parse | PASS | 16 JSON files valid |
| 3 — Forbidden diff guard | PASS | No forbidden files touched |
| 4 — No fixture production load | PASS | portal.html unchanged |
| 5 — Feature flags inert | PASS | HMV4_PREVIEW_ENABLED=false default |
| 6 — Playwright CDOC E2E | PASS | 16 CDOC tests pass (chromium) |
| 7 — Graphics Authority (no hex) | PASS | No hardcoded hex colors |

**Note:** 6 pre-existing failures on this branch from incomplete Slice 6/7 work (BREL, INSP) are
unrelated to CDOC and are tracked for their respective slices.

---

## E2E Test Coverage

**Main spec (`module-template-v4.spec.ts`) — CDOC section:**

- `renders CDOC overview tab with required attributes`
- `renders CDOC {tab} tab panel` × 7 (content, revisions, controlled-copies, effectivity, related, audit, signatures)
- `CDOC all mutation launchers are disabled`
- `CDOC revisions tab renders revision table`
- `CDOC controlled-copies tab renders copies table`
- `CDOC related tab links use data-hmv4-record-open attributes`
- `CDOC conflict state fixture sets data-fixture-state`
- `CDOC partial-access state shows partial notice`
- `CDOC degraded state has no enabled mutation launchers`
- `CDOC lifecycle strip renders all 7 states`

**Bridge spec (`module-template-v4-bridge.spec.ts`):**

- `maps cdoc to module landing without record context`
- `maps cdoc to record shell only with explicit record context`

**Axe spec (`module-template-v4-axe.spec.ts`):**

- 11 CDOC fixture pages added to axe accessibility scan — all pass

**Visual spec:**

- Chromium, Firefox, WebKit baselines generated for all 11 CDOC fixture pages

---

## CDOC vs CAPA/NQCASE Differences

| Concept | NQCASE | CAPA | CDOC |
|---------|--------|------|------|
| Authority class | AR | AR | AR |
| Tab count | 6 | 8 | 8 |
| Document-specific tabs | — | — | content, revisions, controlled-copies, effectivity |
| Lifecycle states | 4 | 7 | 7 |
| Terminal states | — | closed | superseded, obsolete |
| Mutation intents | 3 | 10 | 7 |

---

## Decision

```
CDOC_SLICE5_PASS_WITH_WARNINGS
```

**Basis for PASS:** All 16 CDOC-specific E2E tests pass on chromium. All quality gates 1–7 pass.
Visual baselines generated for 3 browsers. Bridge alias correctly constrained to context-backed AR.
Governed-content pattern established as template for future document-class records.

**Basis for WARNINGS:** 6 pre-existing test failures on this branch from incomplete Slice 6/7
(BREL/INSP) work. These are not regressions introduced by CDOC Slice 5.
