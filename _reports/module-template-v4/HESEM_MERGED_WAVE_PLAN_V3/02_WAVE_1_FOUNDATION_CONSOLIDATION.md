# 02_WAVE_1_FOUNDATION_CONSOLIDATION.md

## Wave name

```text
Wave 1 — HMV4 Foundation Consolidation and Pattern Codification
```

## Status

```text
Documentation-only wave (no production code change)
Estimated duration: 1-2 days
Codex sessions: 1-2
Predecessor gate: Wave 0 PASS
Successor gate: Wave 2 begins after Wave 1 PASS
```

## Goal

Consolidate and document everything HMV4 has proven so far. Codify patterns, evidence, and rules so subsequent waves don't re-discover what's already known.

This wave **does not add features**. It produces:
1. **Pattern Registry** — every HMV4 slice pattern with code references
2. **QA Evidence Index** — every Phase 1-3 report cross-indexed
3. **Branch + Merge History Map** — clean lineage of work
4. **Vocabulary Lock** — frozen architectural names per ADR-0002
5. **Live-API Resource Registry** — current vs target state

## Why this wave matters

Before Wave 2 (governed records QA closure) and Wave 5 (Phase 4 megaprompts execute), the team needs a **single source of truth** for "what HMV4 does today and how". Without this:

- Future slice authors re-derive patterns inconsistently → drift
- Future QA misses prior known issues → re-test waste
- Future ADRs forget existing rules → contradictions
- New team members lack onboarding → slow ramp

Adopting Wave 1 from GPT Pro plan is **mature engineering practice**. Claude V2 dismissed this; it was wrong. This wave is mandatory before progression.

## Entry criteria

```text
[ ] Wave 0 returned PASS_READY_FOR_WAVE_1 or PASS_WITH_REPAIRS_PENDING
[ ] V21_PHASE2_INTEGRATION_REVIEW_REPORT.md present on main
[ ] All 9 V21_* reports present (per Wave 0 outputs)
[ ] No frontend slice in flight
[ ] No backend stream in flight
```

## Exit criteria

```text
[ ] HMV4_SLICE_PATTERN_REGISTRY.md generated and complete
[ ] HMV4_QA_EVIDENCE_INDEX.md cross-indexes all reports
[ ] HMV4_BRANCH_AND_MERGE_HISTORY_REPORT.md documents lineage
[ ] HMV4_LIVE_API_RESOURCE_REGISTRY.md captures current vs target
[ ] HMV4_VOCABULARY_LOCK.md restates ADR-0002 frozen vocabulary
[ ] All 5 docs mutually consistent
[ ] No production code changed
[ ] No forbidden file changed
[ ] All artifacts under _reports/module-template-v4/ or docs/
```

## Work packages (WP)

### WP1.1 — HMV4 Slice Pattern Registry

**Objective**: Document each HMV4 pattern that future slices must reuse.

**Read source files**:
```text
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/71-module-template-v4-routes.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/74-module-template-v4-fixtures.js
mom/styles/module-template-v4.tokens.css
mom/styles/module-template-v4.css
mom/templates/module-template-v4/module-template-v4.html
```

**Output artifact**:
```text
_reports/module-template-v4/HMV4_SLICE_PATTERN_REGISTRY.md
```

Required sections:

```markdown
## 1. Overview
   - HMV4 architecture diagram (text-form)
   - 5-layer model: tokens → css → fixtures → routes → bridge → renderers → hydration
   - Feature flag inert-by-default discipline

## 2. Workspace projection pattern (WS)
   ### Reference implementations:
   - renderDispatchBoardWorkspace (mom/scripts/portal/73-module-template-v4-renderers.js:N)
   - renderTrainingMatrixWorkspace (line N)
   ### Required attributes:
   - data-route-class="WS"
   - data-authority-class="projection"
   - data-requires-reanchor="true"
   - data-resource-family="<plural-form>"
   - data-root-code="<UPPERCASE>"
   ### Required behaviors:
   - No live mutation
   - Mutation buttons disabled with data-hmv4-mutation-intent
   - Record-open links re-anchor to /ops/records/<family>/<id>
   ### Required E2E coverage:
   - route parses as WS
   - workspace renders fixture data
   - 4 fixture states: current, conflict, partial-access, degraded, empty
   - mutation buttons absent or disabled

## 3. Authoritative record shell pattern (AR)
   ### Reference implementations:
   - renderNonconformanceRecord (line N)
   - renderCapaRecord (line N)
   - renderCdocRecord (line N)
   - renderInspRecord (line N)
   - renderBrelRecord (line N)
   - renderEcoRecord (line N)
   ### Required attributes:
   - data-route-class="AR"
   - data-authority-class="authoritative"
   - data-resource-family="<plural-form>"
   - data-root-code="<UPPERCASE>"
   - data-record-id="<id>"
   - data-query-tab="<tab>"
   ### Required tabs (varies per root, but all have):
   - overview, related, audit, signatures (minimum)
   - Plus governed-quality: investigation, evidence
   - Plus governed-content: revisions, controlled-copies
   - Plus governed-release: release-package, quality-evidence, genealogy, shipment-readiness
   - Plus governed-change: change-scope, impact-assessment, implementation-plan, training-impact
   ### Required behaviors:
   - Mutation buttons always disabled with intent attrs
   - Tab persists via ?tab= query param
   - 4 fixture states: current, conflict, partial-access, degraded

## 4. Shell + Domain + Module landing pattern (SH/DL/ML)
   ### Reference implementations:
   - renderShellHome (line N) — 14 domain tiles
   - renderDomainLanding (line N) — module tiles per domain
   - renderModuleLanding (line N) — workspace + record-collection tiles
   ### Required attributes:
   - data-route-class="SH" / "DL" / "ML"
   - data-domain-key (DL+)
   - data-module-key (ML)

## 5. Bridge alias policy
   ### File: mom/scripts/portal/72-module-template-v4-bridge.js
   ### 4 alias states: canonical | keep_as_alias | redirect_then_deprecate | internal_only_bridge
   ### Anti-fabrication rule per ADR-0010:
     - Bridges must NOT invent record IDs
     - Without context: return unmapped_needs_decision
     - With context: return canonical AR url

## 6. Fixture page pattern
   ### Standard structure (15 lines minimum):
     <!doctype html>
     <html lang="en"><head>
       <link rel="stylesheet" href="../../../../mom/styles/module-template-v4.tokens.css">
       <link rel="stylesheet" href="../../../../mom/styles/module-template-v4.css">
     </head><body>
       <div id="hmv4-fixture-root"></div>
       <script type="application/json" data-hmv4-fixture-route>...</script>
       <script type="application/json" data-hmv4-<resource>-fixture>...</script>
       <script>window.HMV4_<RESOURCE>_FIXTURE = JSON.parse(...);</script>
       <script src="../../../../mom/scripts/portal/74-module-template-v4-fixtures.js"></script>
       <script src="../../../../mom/scripts/portal/71-module-template-v4-routes.js"></script>
       <script src="../../../../mom/scripts/portal/72-module-template-v4-bridge.js"></script>
       <script src="../../../../mom/scripts/portal/73-module-template-v4-renderers.js"></script>
       <script src="../../../../mom/scripts/portal/70-module-template-v4-hydration.js"></script>
     </body></html>

## 7. E2E test pattern
   ### Spec files: tests/e2e/module-template-v4*.spec.ts
   ### Required suite per slice:
     - Functional smoke (route parse + render)
     - Per-tab render
     - Fixture state coverage (conflict, partial-access, degraded)
     - Bridge alias coverage
     - Mutation button disabled
     - Cross-record links

## 8. Visual snapshot pattern
   ### File: tests/e2e/module-template-v4-visual.spec.ts
   ### Auto-discovers fixture pages
   ### Tolerance: maxDiffPixels=100, threshold=0.1
   ### Per-browser baselines: chromium + firefox + webkit

## 9. Live API toggle pattern (ADR-0011 + ADR-0012)
   ### Master flag: window.HMV4_LIVE_API_ENABLED (default false)
   ### Resource registry: HMV4_LIVE_RESOURCE_REGISTRY
   ### Adapter contract:
     - canonicalPath: /api/v1/<resource-family>
     - fixtureGlobal: 'HMV4_<RESOURCE>_FIXTURE'
     - adapt(live): normalizes backend response to fixture shape
   ### Three-stage graduation per slice (RULE-1):
     Stage 1: fixture-only (default mode forever)
     Stage 2: opt-in live read (?hmv4-live-api=1, dev only)
     Stage 3: controlled mutation (separate ADR per mutation, not yet)

## 10. Rollback pattern
   ### Per-slice v4-scoped revert
   ### Feature-flag disable (3 flags)
   ### Commit-level revert for committed slices
   ### Forbidden file diff guard

## 11. Cross-slice link convention
   ### data-hmv4-record-open + data-hmv4-record-id attributes
   ### Anchor href format: /ops/records/<family>/<id>?tab=overview
   ### Example chains documented:
     - JO → WO → INSP → NC → CAPA → BREL
     - SO → JO → WO
     - CPO → SO → JO → WO
     - ECO → CDOC + TRAIN
```

### WP1.2 — HMV4 QA Evidence Index

**Objective**: Single source of truth for which Phase delivered what evidence.

**Output artifact**:
```text
_reports/module-template-v4/HMV4_QA_EVIDENCE_INDEX.md
```

Required sections:

```markdown
## Phase Index (chronological)

### Step 9 (initial patch landing)
- _reports/.../STEP9_PATCH_EXECUTION_REPORT.md
- _reports/.../STEP9_REPO_PATCH_BUNDLE.zip (in archive only)

### Step 10/10.5 (E2E baseline + QA hardening)
- _reports/.../STEP10_QA_REGRESSION_REPORT.md
- _reports/.../STEP10_5_QA_HARDENING_REPORT.md
- _reports/.../E2E_RUNNER_BOOTSTRAP_REPORT.md

### Step 11 (Wave 1 planning)
- _reports/.../STEP11_LIMITED_WAVE1_PLANNING_*.md

### V12 E2E bootstrap
- _reports/.../V12_*.md

### V13/V14 (Slice 1 Dispatch Board)
- _reports/.../S13_DISPATCH_BOARD_FIRST_SLICE_IMPLEMENTATION_REPORT.md
- _reports/.../S14_DISPATCH_FIRST_SLICE_QA_REPORT.md
- _reports/.../S14_DISPATCH_FIRST_SLICE_COMMIT_PLAN.md
- _reports/.../S14_DISPATCH_FIRST_SLICE_FIXTURE_COVERAGE_REPORT.md
- _reports/.../S14_DISPATCH_FIRST_SLICE_ROLLBACK_PROCEDURE.md

### V15-V17 (Slice 2 Nonconformance planning + approval)
- _reports/.../V15_*.md
- _reports/.../V16_*.md (branch align rerun)
- _reports/.../V17_*.md (approval)

### V18/V19 (Slice 2 Nonconformance impl + QA)
- _reports/.../S18_NONCONFORMANCE_SECOND_SLICE_IMPLEMENTATION_REPORT.md
- _reports/.../S19_NONCONFORMANCE_SECOND_SLICE_QA_REPORT.md
- _reports/.../S19_NONCONFORMANCE_FIXTURE_COVERAGE_REPORT.md

### V20 (Slice 3 Training Matrix)
- _reports/.../V20_TRAINING_MATRIX_*.md (planning artifacts)
- _reports/.../S20_TRAINING_MATRIX_THIRD_SLICE_IMPLEMENTATION_REPORT.md

### Phase 2 streams (Slice 4 CAPA + live API + REST + cross-browser)
- _reports/.../S_SLICE4_CAPA_IMPLEMENTATION_REPORT.md
- _reports/.../S_LIVE_API_TOGGLE_NQCASE_REPORT.md
- _reports/.../S_BACKEND_TRANSACTIONAL_REST_REPORT.md
- _reports/.../S_QA_CROSS_BROWSER_REPORT.md

### Phase 3 streams (Slices 5-7 + CPO rename + live-api replication)
- _reports/.../S_SLICE5_CDOC_IMPLEMENTATION_REPORT.md
- _reports/.../S_SLICE6_INSP_IMPLEMENTATION_REPORT.md (verify)
- _reports/.../S_SLICE7_BREL_IMPLEMENTATION_REPORT.md (verify)
- _reports/.../S_BACKEND_CPO_RENAME_REPORT.md
- _reports/.../S_LIVE_API_REPLICATION_REPORT.md (if landed)

### Wave 0 (V21)
- _reports/.../V21_PHASE2_INTEGRATION_REVIEW_REPORT.md (FINAL)
- 8 supporting V21_* reports

## Cross-reference matrix

| Slice | Impl report | QA report | Fixture coverage | Rollback proc | Visual baseline |
|---|---|---|---|---|---|
| Slice 1 DISP | S13 | S14 | S14 | S14 | yes (all browsers) |
| Slice 2 NQCASE | S18 | S19 | S19 | S14 (shared) | yes |
| Slice 3 TRAIN | S20 | (verify) | (verify) | (verify) | yes |
| Slice 4 CAPA | S_SLICE4 | (warnings) | (verify) | yes | yes |
| Slice 5 CDOC | S_SLICE5 | (verify) | (verify) | (verify) | yes |
| Slice 6 INSP | S_SLICE6 | (verify) | (verify) | (verify) | yes |
| Slice 7 BREL | (verify) | (verify) | (verify) | (verify) | yes |
| Slice 8 ECO | (Phase 3 carry-over status) | | | | |
| Slice 0.5 Nav | S_NAV_SHELL | (verify) | | | |

## Decision phrase trace

| Stream | Phrase | Note |
|---|---|---|
| (capture all decision phrases from latest reports) | | |
```

### WP1.3 — Branch and merge history report

**Objective**: Map current main lineage; identify orphaned branches; verify no work lost.

**Output artifact**:
```text
_reports/module-template-v4/HMV4_BRANCH_AND_MERGE_HISTORY_REPORT.md
```

Required sections:

```markdown
## Current main HEAD: <SHA>

## Commit graph from origin/main going back 50 commits
git log --oneline --decorate --graph -50

## Merge commits in chronological order
| SHA | Date | Branch merged | Phase |
|---|---|---|---|
| (capture all merge commits) | | | |

## Branches deleted (intentionally)
- codex/backend-eqms-aliases — merged commit d21d6462
- codex/qa-visual-regression — merged commit ae46d9e0
- codex/docs-codex-megaprompts-parallel — merged commit bb21612f
- codex/docs-ai-index-regen-20260425 — merged commit 618b99de
- codex/slice-0-5-navigation-shell — merged commit 41e3252e
- codex/dcc-translation-root-cause-v3 — same SHA as base
- codex/backend-cpo-rename — merged
- codex/slice-6-insp-from-cdoc-qa — merged

## Branches still active
- main (only branch on origin currently)

## Worktrees (if any)
git worktree list

## Work currently in stash (if any)
git stash list

## Forbidden file diff verification (vs initial baseline 383f3327)
git diff --name-only 383f3327..HEAD | grep <forbidden patterns>

## Cumulative LOC change in HMV4 surfaces
- mom/scripts/portal/70-module-template-v4-hydration.js: +N lines
- mom/scripts/portal/71-module-template-v4-routes.js: +N lines
- mom/scripts/portal/72-module-template-v4-bridge.js: +N lines
- mom/scripts/portal/73-module-template-v4-renderers.js: +N lines
- mom/scripts/portal/74-module-template-v4-fixtures.js: +N lines
- mom/styles/module-template-v4.css: +N lines
- mom/styles/module-template-v4.tokens.css: +N lines
- tests/fixtures/module-template-v4/**: +N files, N lines
- tests/e2e/module-template-v4*.spec.ts: +N tests
- _reports/module-template-v4/**: +N reports
- docs/adr/*.md: +N ADRs
```

### WP1.4 — Live API Resource Registry index

**Objective**: Document current state of HMV4_LIVE_RESOURCE_REGISTRY (the ADR-0012 pattern) — which roots are wired, what adapt() functions expect.

**Source**: `mom/scripts/portal/70-module-template-v4-hydration.js`

**Output artifact**:
```text
_reports/module-template-v4/HMV4_LIVE_API_RESOURCE_REGISTRY.md
```

Required sections:

```markdown
## Registry overview
Pattern per ADR-0012. Each entry has canonicalPath, fixtureGlobal, adapt(live).

## Registry entries currently in main

| Resource family | Canonical path | Fixture global | adapt() function | Status |
|---|---|---|---|---|
| nonconformance-cases | /api/v1/nonconformance-cases | HMV4_NONCONFORMANCE_CASE_FIXTURE | adaptLiveNcToFixtureShape | live (Phase 2 ADR-0011) |
| capas | /api/v1/capas | HMV4_CAPA_RECORD_FIXTURE | adapter (Phase 3 replication) | live or pending |
| controlled-documents | /api/v1/controlled-documents | HMV4_CDOC_RECORD_FIXTURE | adapter | live or pending |
| inspections | /api/v1/inspections | HMV4_INSP_RECORD_FIXTURE | adapter | live or pending |
| batch-releases | /api/v1/batch-releases | HMV4_BREL_RECORD_FIXTURE | adapter | live or pending |
| engineering-changes | /api/v1/engineering-changes | HMV4_ECO_RECORD_FIXTURE | adapter | live or pending |

## Wave-by-wave registry expansion plan

| Wave | Add | Reason |
|---|---|---|
| Wave 4 | (close warnings on existing 6) | hardening |
| Wave 5 | job-orders, sales-orders, work-orders, customer-purchase-orders | Phase 4 megaprompts wire these |
| Wave 6 | lots, training-records | digital thread + training |
| Wave 7 | (read-models for analytics, not separate roots) | analytics layer |
| Wave 8 | (no new entries; hardening) | |
| Wave 9 | equipment, oee-events, downtime-events, spc-runs, calibration-records, fmea-worksheets, validation-runs, customer-complaints + finance roots | MES depth + finance core |
```

### WP1.5 — Vocabulary lock document

**Objective**: Codify ADR-0002 frozen vocabulary as a single reference card.

**Output artifact**:
```text
docs/adr/HMV4_VOCABULARY_LOCK.md (or _reports/module-template-v4/ if docs/ rule prohibits)
```

Required sections:

```markdown
## 14 Experience Domains (frozen)
1. commercial-customer (Commercial & Customer)
2. product-process-definition (Product & Process Definition)
3. planning-scheduling (Planning & Release)
4. shopfloor-execution (Shopfloor Execution)
5. quality-compliance (Quality & Compliance)
6. supply-supplier-quality (Supply & Supplier Quality)
7. inventory-warehouse (Inventory & Warehouse)
8. fulfillment-returns (Fulfillment & Returns)
9. traceability-passport (Traceability & Passport)
10. maintenance-reliability (Maintenance & Reliability)
11. people-skill-ehs (Workforce, Documents & Training)
12. safety-facilities-energy (Safety, Facilities & Energy)
13. finance-costing (Finance & Costing)
14. analytics-platform (Analytics & Platform)

## 18 Wave 1 Workflow Roots (frozen codes)
QUO, CPO, SO, PO, IREV, ECO, JO, WO, DISP, PREC, LOT, INSP, NQCASE, CAPA, BREL, CDOC, TRAIN, MWO

## 5 Dependency Roots
ITEM, CUST, SUP, EQP, MDEV

## ~28 Wave 9 Extension Roots (proposed)
EQUIP, OEEEVT, DOWNTIME, SPCRUN, CAL, FMEA, VAL, COMPLAINT
GL, AP, AR, FA, COSTRUN, PERIODCLOSE
DEMANDPLAN, REPLENPLAN, CYCLECOUNT, PHYSINV, SHIPMENT
LEAD, OPPTY, CONTRACT, CREDIT
EMPLOYEE, SHIFT, TIMEATTENDANCE, SAFETYINC, ENERGYREADING
PM-SCHEDULE, RELIABILITY-RUN, SPARE-PART
APR, DEVIATIONLOG, BATCHRECORD, QC-SAMPLE, STABILITY-STUDY (pharma pack)
APQP, PPAP, FAI-AS9102 OR FAI-CQI, CONTROL-PLAN, GAGE-RR (auto pack)

## 9 Route Classes (frozen)
SH, DL, ML, AC, AR, ERD, NRD, WS, SFW

## 23 API Family Tokens (Step 3 frozen)
quotations, customer-purchase-orders, sales-orders, purchase-orders, item-revisions,
engineering-changes, job-orders, work-orders, dispatch-targets, purchase-receipts,
lots, inspections, nonconformance-cases, capas, batch-releases, controlled-documents,
training-records, maintenance-work-orders, items, customers, suppliers, equipment,
measuring-devices

## 8 Bounded Contexts (frozen)
BC1 Commercial Commitments
BC2 Product & Process Definition Governance
BC3 Planning & Release Orchestration
BC4 Execution & Connected Worker
BC5 Quality, Compliance & Knowledge Governance
BC6 Supply, Inventory & Fulfillment Continuity
BC7 Asset, Safety & Facility Operations
BC8 Finance & Enterprise Administration

## 8 Enterprise Spines (frozen)
1. Identity & Authority
2. Workflow & Approval
3. Evidence/e-Sign/Audit
4. Master Data & Reference
5. Digital Thread / Genealogy
6. Event/Notification/Integration
7. Analytics/Semantic Layer
8. Instruction Runtime/Connected Worker

## Forbidden file list (frozen per ADR-0004)
mom/portal.html (only feature-flag insertion)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
mom/qms-data/**
```

## Workload estimate

```text
Codex sessions: 1-2
  Session 1: WP1.1 + WP1.2 (registry + evidence index) — 2-3 hr
  Session 2: WP1.3 + WP1.4 + WP1.5 (history + live-api + vocabulary lock) — 2 hr

Human review: 1 day
Calendar elapsed: 1-2 days
```

## Allowed files in Wave 1

```text
_reports/module-template-v4/HMV4_*.md (5 new docs)
docs/adr/HMV4_VOCABULARY_LOCK.md (or _reports/ if ADR docs/ rule applies)
```

## Forbidden in Wave 1

```text
Any source code change (this is documentation-only)
Any forbidden file
Any new slice or feature
Any backend mutation
HMV4_PREVIEW_ENABLED / HMV4_LIVE_API_ENABLED defaults change
mom/api/**
mom/qms-data/**
```

## Wave 1 success criteria checklist

```
1. Did all 5 docs land? [ ]
2. Are docs cross-consistent (no contradictions between registry, evidence index, vocabulary)? [ ]
3. Was no production code changed? [ ]
4. Was no forbidden file changed? [ ]
5. Are reports tracked under _reports/module-template-v4/? [ ]
6. Is HMV4_VOCABULARY_LOCK aligned with ADR-0002? [ ]
7. Does Pattern Registry reference actual line numbers in source files? [ ]
8. Does Evidence Index include every report in _reports/module-template-v4/? [ ]
9. Does Live-API Registry match actual code state? [ ]
10. Is decision phrase one of standard 4? [ ]
```

## Decision phrase output

```text
WAVE_1_FOUNDATION_PASS_READY_FOR_WAVE_2
WAVE_1_FOUNDATION_PASS_WITH_WARNINGS
WAVE_1_FOUNDATION_FAIL_BLOCK_NEXT
```

## Codex prompt to run Wave 1

```text
You are in local repo sanhvo86-hesem/mom.

Run Wave 1 — HMV4 Foundation Consolidation per:
_reports/module-template-v4/HESEM_MERGED_WAVE_PLAN_V3/02_WAVE_1_FOUNDATION_CONSOLIDATION.md

Predecessor gate: Wave 0 must be PASS_READY_FOR_WAVE_1.
Verify by reading V21_PHASE2_INTEGRATION_REVIEW_REPORT.md

Step 1: WP1.1 generate HMV4_SLICE_PATTERN_REGISTRY.md
Step 2: WP1.2 generate HMV4_QA_EVIDENCE_INDEX.md
Step 3: WP1.3 generate HMV4_BRANCH_AND_MERGE_HISTORY_REPORT.md
Step 4: WP1.4 generate HMV4_LIVE_API_RESOURCE_REGISTRY.md
Step 5: WP1.5 generate HMV4_VOCABULARY_LOCK.md

Allowed files: _reports/module-template-v4/HMV4_*.md and docs/HMV4_VOCABULARY_LOCK.md
Forbidden: any source code change.

Decision phrase output: ONE of
  WAVE_1_FOUNDATION_PASS_READY_FOR_WAVE_2
  WAVE_1_FOUNDATION_PASS_WITH_WARNINGS
  WAVE_1_FOUNDATION_FAIL_BLOCK_NEXT

Per RULE-3 use pre-production wording. Per RULE-7 use V<n>/S<n> naming.
```

## Per-rule compliance

- **RULE-1** (3-stage graduation): N/A; this wave is documentation
- **RULE-2** (AI governance): N/A; no AI feature work
- **RULE-3** (pre-production wording): MANDATORY in all 5 docs
- **RULE-4** (8 standard artifacts): 5 docs are partial fulfillment; QA report deferred to Wave 2
- **RULE-5** (stabilization gate): Wave 0 must PASS first
- **RULE-6** (15-question checklist): use checklist above
- **RULE-7** (naming): Use HMV4_*_REGISTRY.md / HMV4_*_INDEX.md / HMV4_*_REPORT.md
- **RULE-8** (read-only graduation): N/A; this wave is documentation

## Risk register for Wave 1

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Pattern registry diverges from actual source | Medium | High | Cross-validate by re-running grep in WP1.1 |
| Evidence index misses a report | Low | Medium | Use `find _reports/ -name "*.md"` enumeration |
| Vocabulary lock diverges from ADR-0002 | Low | High | Read ADR-0002 file directly into doc |
| Branch history report misses a stash | Low | Low | `git stash list` + `git worktree list` |
| Wave 1 takes >2 days | Low | Medium | Time-box; partial completion is acceptable PASS_WITH_WARNINGS |

## Successor wave gate

After Wave 1 PASS_READY_FOR_WAVE_2:

```text
Wave 2 governed records QA closure may begin
Wave 5 (Phase 4 megaprompts) remains paused until Wave 4 closes
```

```
WAVE_1_PLAN_BASELINE_LOCKED
```
