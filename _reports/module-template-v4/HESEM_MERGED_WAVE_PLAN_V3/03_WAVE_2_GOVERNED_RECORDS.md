# 03_WAVE_2_GOVERNED_RECORDS.md

## Wave name

```text
Wave 2 — Governed Record Shells QA Closure & Pattern Hardening
```

## Status

```text
QA closure for Slices 5-8 (CDOC, INSP, BREL, ECO) + CAPA warning closure
Estimated duration: 2-4 weeks
Codex sessions: 4-8
Predecessor gate: Wave 1 PASS
Successor gate: Wave 3 begins after Wave 2 PASS
```

## Goal

Slices 5-8 already landed via Phase 3 megaprompts. Wave 2 closes their QA loop:

1. Generate dedicated QA reports per slice (S_*_QA_REPORT.md)
2. Verify cross-browser visual baselines for all 4
3. Close any remaining warnings from CAPA Slice 4
4. Standardize fixture-state coverage across all 6 governed roots (NQCASE/CAPA/CDOC/INSP/BREL/ECO)
5. Confirm bridge alias policy applied to all 6 (no record-id fabrication)

This wave does NOT add new slices. It hardens existing 6 governed record shells to "release-grade" QA standard.

## Why this wave matters

GPT Pro plan correctly identified that **CDOC/INSP/BREL/ECO need QA closure** before progression. Implementation is mostly done; QA reports are missing or partial. Without QA closure:
- Live-API graduation (Wave 4) cannot begin
- Cross-record link tests are unreliable
- Bridge alias coverage incomplete
- Visual baselines may have drift on firefox/webkit per stream

## Entry criteria

```text
[ ] Wave 1 returned PASS_READY_FOR_WAVE_2
[ ] HMV4_SLICE_PATTERN_REGISTRY.md present
[ ] HMV4_QA_EVIDENCE_INDEX.md present
[ ] All 6 governed record renderers exist on main:
    - renderNonconformanceRecord (Slice 2)
    - renderCapaRecord (Slice 4)
    - renderCdocRecord (Slice 5)
    - renderInspRecord (Slice 6)
    - renderBrelRecord (Slice 7)
    - renderEcoRecord (Slice 8)
```

## Exit criteria

```text
[ ] S_<SLICE>_QA_REPORT.md present for each of 6 slices (NQCASE+CAPA already exist; add 4 new)
[ ] All cross-browser baselines on all 6 slices' fixture pages PASS
[ ] CAPA Slice 4 warnings: closed OR documented as accepted
[ ] All 6 record shells pass identical 12 standard E2E checks
[ ] Bridge alias coverage verified for all 6 aliases (ncr/capa/cdoc/insp/brel/eco)
[ ] All 6 fixture sets have current/conflict/partial-access/degraded states
[ ] Forbidden diff PASS
[ ] Current portal inert PASS
[ ] No new feature added
```

## Work packages (WP)

### WP2.1 — CAPA Slice 4 warning closure

**Read**: `_reports/module-template-v4/V21_CAPA_WARNING_TRIAGE_REPORT.md` (from Wave 0)

For each `must_fix_now` warning:
1. Apply minimal fix (renderer / fixture / E2E)
2. Re-run E2E
3. Document in `S_SLICE4_CAPA_WARNING_CLOSURE_REPORT.md`

For each `accept_as_known_warning`:
1. Add to `docs/known-limitations.md`

Branch: `codex/wave2-capa-warning-closure`

### WP2.2 — CDOC QA report

**Output**: `_reports/module-template-v4/S_SLICE5_CDOC_QA_REPORT.md`

Standard 12-check QA matrix:

| # | Check | Pass criteria |
|---:|---|---|
| 1 | Route parses as AR | data-route-class="AR" rendered |
| 2 | Authority class | data-authority-class="authoritative" |
| 3 | Resource family | data-resource-family="controlled-documents" |
| 4 | Root code | data-root-code="CDOC" |
| 5 | Tab persists | ?tab=overview/content/revisions/etc reflected |
| 6 | Mutation buttons disabled | All 7 cdoc-* intent buttons have disabled attr |
| 7 | Fixture states | current/conflict/partial-access/degraded all renderable |
| 8 | Bridge alias | cdoc with record_id maps; without context returns unmapped_needs_decision |
| 9 | Cross-browser visual | chromium + firefox + webkit baselines stable |
| 10 | A11y axe-core | 0 critical/serious WCAG violations |
| 11 | Cross-record links | revisions/related tabs link to ECO + TRAIN records |
| 12 | Current portal inert | HMV4_PREVIEW_ENABLED=false honored |

Cross-record link verification (CDOC-specific):
```
- "Driven by ECO-2026-014" link in revisions tab
- "Training records" link in related tab → /ops/records/training-records/{id}
```

Visual baseline status per fixture page × 3 browsers = ~33 PNGs.

### WP2.3 — INSP QA report

**Output**: `_reports/module-template-v4/S_SLICE6_INSP_QA_REPORT.md`

Standard 12-check matrix + INSP-specific:
- Sample-results tab renders measurement table
- Nonconformance-flags tab links to NC-001 (cross-slice)
- Subtype handling (incoming/first_piece/in_process/final/return_to_service)
- Pass/fail judgment column visible

### WP2.4 — BREL QA report

**Output**: `_reports/module-template-v4/S_SLICE7_BREL_QA_REPORT.md`

Standard 12-check matrix + BREL-specific:
- 10 mutation intents all disabled (release/recall/2-person e-sign especially)
- Release-package tab links to INSP + NC + CAPA + CDOC + LOT
- 2-person approver rule visible in signatures tab
- Quality-evidence tab populates from fixture
- Genealogy tab references LOT root

### WP2.5 — ECO QA report

**Output**: `_reports/module-template-v4/S_SLICE8_ECO_QA_REPORT.md`

Standard 12-check matrix + ECO-specific:
- Change-scope tab links to affected CDOC versions
- Training-impact tab links to TR-7050 (cross-slice)
- Implementation-plan phases visible with status
- Impact-assessment fields render
- Bridge alias eco / change-control behaves correctly

### WP2.6 — Pattern hardening across all 6 governed shells

Verify all 6 follow IDENTICAL skeleton from `HMV4_SLICE_PATTERN_REGISTRY.md` Section 3 (AR pattern). For any deviation, refactor to align.

**Refactor scope** (only if deviation found):
- Inconsistent attribute order on `<article>`
- Inconsistent fixture state name (e.g., `partial_access` vs `partial-access`)
- Inconsistent disabled mutation button structure

Branch: `codex/wave2-pattern-harmonization`

### WP2.7 — Cross-record link audit

Verify all cross-slice anchor patterns work:

```
NC → CAPA, NC ← INSP (escalation)
CAPA → NC, CAPA → TRAIN (linkedNcId, training records)
CDOC → ECO, CDOC → TRAIN (driven by ECO, training records)
INSP → NC (escalation), INSP → WO (parent)
BREL → INSP, NC, CAPA, CDOC, LOT (release package)
ECO → CDOC, TRAIN (change-scope)
WO → JO (parent), WO → INSP, WO → DISP, WO → NC (when escalated)
JO → WO (spawned), JO → CPO (customer order)
SO → JO (spawned), SO → CPO
CPO → SO (spawned)
```

For each link in fixtures:
1. Verify href format `/ops/records/<family>/<id>?tab=overview`
2. Verify target page exists (or document missing target)
3. Verify hover/focus visible

**Output**: `_reports/module-template-v4/HMV4_CROSS_RECORD_LINK_AUDIT_REPORT.md`

### WP2.8 — Wave 2 integration QA

After WP2.1-2.7, run full E2E across all browsers:

```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
rm -rf node_modules
```

Expected count: ~250+ tests (functional + visual + a11y) across 3 browsers ~750 total.

**Output**: `_reports/module-template-v4/V22_WAVE_2_INTEGRATION_REPORT.md`

Decision phrase:
```text
WAVE_2_GOVERNED_RECORDS_PASS_READY_FOR_WAVE_3
WAVE_2_GOVERNED_RECORDS_PASS_WITH_WARNINGS
WAVE_2_GOVERNED_RECORDS_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 4-8
  Session 1: WP2.1 CAPA warning closure — 2 hr
  Session 2: WP2.2 CDOC QA + WP2.3 INSP QA — 3 hr
  Session 3: WP2.4 BREL QA + WP2.5 ECO QA — 3 hr
  Session 4: WP2.6 pattern harmonization — 3 hr
  Session 5: WP2.7 cross-record link audit — 2 hr
  Session 6: WP2.8 integration QA — 2 hr

Human review: 2-4 days
Calendar elapsed: 2-4 weeks (with parallel sessions and review cycles)
```

## Allowed files in Wave 2

```text
_reports/module-template-v4/S_SLICE<N>_<ROOT>_QA_REPORT.md (4 new)
_reports/module-template-v4/S_SLICE4_CAPA_WARNING_CLOSURE_REPORT.md
_reports/module-template-v4/HMV4_CROSS_RECORD_LINK_AUDIT_REPORT.md
_reports/module-template-v4/V22_WAVE_2_INTEGRATION_REPORT.md
docs/known-limitations.md (extend)

Pattern harmonization fixes (only if needed):
mom/scripts/portal/73-module-template-v4-renderers.js (only attribute order or naming alignment)
tests/fixtures/module-template-v4/<resource>-record-fixtures.json (only if state name normalized)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-*.html (only if pattern alignment needed)
tests/e2e/module-template-v4*.spec.ts (extend coverage)
tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (only if --update-snapshots needed for known-good drift)
```

## Forbidden in Wave 2

```text
Any new feature
Any forbidden file
Any backend mutation
HMV4_PREVIEW_ENABLED / HMV4_LIVE_API_ENABLED defaults change
mom/api/**
mom/qms-data/**
New roots or new bridge aliases (those are Wave 5+ scope)
```

## Decision phrase output

```text
WAVE_2_GOVERNED_RECORDS_PASS_READY_FOR_WAVE_3
WAVE_2_GOVERNED_RECORDS_PASS_WITH_WARNINGS
WAVE_2_GOVERNED_RECORDS_FAIL_BLOCK_NEXT
```

## Per-rule compliance

- **RULE-1**: All 6 slices stay in Stage 1 (fixture-only) for Wave 2; Stage 2 (live-API) graduation is Wave 4 scope
- **RULE-2**: No AI feature added
- **RULE-3**: All 4 new QA reports use pre-production wording
- **RULE-4**: 8 standard artifacts produced (4 QA reports + 4 supporting)
- **RULE-5**: Wave 1 must PASS first
- **RULE-6**: 15-question checklist applied to each WP
- **RULE-7**: S_<slice>_QA_REPORT.md naming
- **RULE-8**: No mutation; pattern is read-only

## Codex prompt to run Wave 2 (run after Wave 1 PASS)

```text
You are in local repo sanhvo86-hesem/mom.

Run Wave 2 — Governed Record Shells QA Closure per:
_reports/module-template-v4/HESEM_MERGED_WAVE_PLAN_V3/03_WAVE_2_GOVERNED_RECORDS.md

Predecessor gate: Wave 1 must return PASS_READY_FOR_WAVE_2 (verify HMV4_SLICE_PATTERN_REGISTRY exists).

Execute WP2.1 through WP2.8 in order.

Allowed files per the wave plan.
Forbidden: new features, new roots, forbidden file changes.

Decision phrase: ONE of
  WAVE_2_GOVERNED_RECORDS_PASS_READY_FOR_WAVE_3
  WAVE_2_GOVERNED_RECORDS_PASS_WITH_WARNINGS
  WAVE_2_GOVERNED_RECORDS_FAIL_BLOCK_NEXT

Per RULE-3 pre-production wording. Per RULE-1 no live-API graduation. Per RULE-8 no mutation.
```

```
WAVE_2_PLAN_BASELINE_LOCKED
```
