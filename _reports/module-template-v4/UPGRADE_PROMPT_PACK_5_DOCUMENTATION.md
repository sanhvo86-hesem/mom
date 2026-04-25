# UPGRADE PROMPT PACK 5 — Documentation

**Stream**: E (Documentation — parallel with Streams A/B/C/D)
**Goal**: Sync repo knowledge artifacts with the slice program
**Total prompts**: 3 (parallel — all independent)

---

## E1 — .ai/ Index Regeneration 🟢 (parallel)

### When to run
After any major source change. Run after Slice 3 + 4 + 5 land.

### User must say
```
Proceed with .ai/ index regeneration.
```

### Background
The repo has a pre-built `.ai/` knowledge index used by AI assistants
to find files quickly. CLAUDE.md says regenerate when source files
change significantly. After Slice 1+2+3 the index is stale.

### Prompt to paste into Codex local

```text
You are in local repo sanhvo86-hesem/mom.

You are regenerating the .ai/ knowledge index after recent slice work.

Do not change forbidden files.
Do not modify slice source code.

Required base branch:
  codex/docs-ai-index-regen

Created from:
  origin/main

Allowed:
  .ai/repo-map.json (regenerate)
  .ai/route-map.json (regenerate)
  .ai/db-map/ (regenerate)
  .ai/contracts-map.json (regenerate)
  .ai/symbols.json (regenerate)
  .ai/module-summaries/*.md (do NOT regenerate; these are hand-authored)
  _reports/module-template-v4/S_DOCS_AI_INDEX_*.md

Forbidden:
  Source code under mom/scripts/portal/
  Source code under mom/api/
  Module summary files (.ai/module-summaries/*.md)
  Forbidden files from CLAUDE.md

Step 1: Run the regenerate script per CLAUDE.md:
  php tools/scripts/ai-index/generate.php --verbose
  
  Or alternative:
  composer --working-dir=mom run ai:index

Step 2: Inspect changes:
  git status .ai/
  git diff --stat .ai/

Step 3: Verify integrity of new files.

For each .ai/ file regenerated:
  python3 -c "import json; json.load(open('.ai/repo-map.json'))"
  python3 -c "import json; json.load(open('.ai/route-map.json'))"
  python3 -c "import json; json.load(open('.ai/db-map/index.json'))"
  python3 -c "import json; json.load(open('.ai/contracts-map.json'))"
  python3 -c "import json; json.load(open('.ai/symbols.json'))"

Step 4: Cross-check stats:
  jq '.statistics.controllerCount' .ai/repo-map.json
  jq '.statistics.serviceCount' .ai/repo-map.json
  jq '.statistics.migrationCount' .ai/repo-map.json
  jq '.statistics.contractObjectCount' .ai/repo-map.json

Compare to CLAUDE.md baseline:
  - 54 controllers (or new count if grew)
  - 122 services (or new count)
  - 137 SQL migrations (or new count)
  - 67 contract objects

If counts diverge significantly, document why (e.g., new EQMS aliases
added 91 routes; new controller class for RED root).

Step 5: Verify symbol map includes HMV4 renderer functions:
  jq '.symbols[] | select(.name | contains("renderNonconformanceRecord"))' .ai/symbols.json
  jq '.symbols[] | select(.name | contains("renderDispatchBoardWorkspace"))' .ai/symbols.json

Step 6: Update CLAUDE.md if any major counts changed:
  Edit "54 controllers, 122 services, 137 SQL migrations, 67 contract objects"
  to current counts.

Generate:
  _reports/module-template-v4/S_DOCS_AI_INDEX_REGEN_REPORT.md

Sections:
  ## Summary
  ## Files regenerated
  ## Statistics: before vs after
  ## CLAUDE.md baseline counts updated (if needed)
  ## Verification: JSON parse for all .ai/ files
  ## Decision

Decision phrase output (one of):
  AI_INDEX_REGEN_PASS_READY_FOR_REVIEW
  AI_INDEX_REGEN_PASS_WITH_WARNINGS
  AI_INDEX_REGEN_FAIL_BLOCK_NEXT
```

### Estimated time
30 minutes.

---

## E2 — Architecture Decision Records (ADR) 🟢 (parallel)

### When to run
Anytime after STRATEGIC_MASTER established. Recommended pre-Slice 5.

### User must say
```
Proceed with ADR records authoring.
```

### Background
The Step 1-8 masters captured many architectural decisions (e.g.,
forbidden files, route grammar, slice cycle, non-production posture).
These should be formalized as Architecture Decision Records (ADR) in
a permanent repo location for future-team awareness.

### Prompt to paste into Claude Code local

```text
You are in local repo sanhvo86-hesem/mom.

You are authoring Architecture Decision Records (ADR) for the HESEM
Operations Platform frontend program.

Do not change forbidden files.
Do not modify slice code.

Required base branch:
  codex/docs-adr-records

Created from:
  origin/main

Allowed (create new files):
  docs/adr/0001-non-production-positioning.md
  docs/adr/0002-frozen-vocabulary-14-domains.md
  docs/adr/0003-route-grammar-ops-prefix.md
  docs/adr/0004-forbidden-file-list.md
  docs/adr/0005-slice-based-prototype-cycle.md
  docs/adr/0006-feature-flag-hmv4-preview.md
  docs/adr/0007-fixture-first-development.md
  docs/adr/0008-eqms-plural-form-canonical-paths.md
  docs/adr/0009-graphics-authority-no-hardcode.md
  docs/adr/0010-bridge-alias-policy.md
  docs/adr/README.md (index)
  _reports/module-template-v4/S_DOCS_ADR_*.md

Forbidden:
  Any source code
  Any forbidden file from CLAUDE.md

NOTE per CLAUDE.md: "NEVER place reports inside mom/docs/". This is
NOT a report; it's an ADR (architecture decision record). ADRs are
permanent documentation, not generated reports. Place them under
docs/adr/ at repo root.

ADR format (per https://adr.github.io/):

  # ADR <NNNN>: <title>
  
  ## Status
  Accepted / Proposed / Superseded by ADR-XXXX
  
  ## Context
  <Why this decision was needed; what problem does it solve?>
  
  ## Decision
  <The decision in one paragraph.>
  
  ## Consequences
  <Positive and negative implications.>
  
  ## Alternatives considered
  <What else was considered and why rejected.>
  
  ## References
  <Links to source documents, e.g., STEP1_MASTER_CONTEXT.md>

Step 1: Create docs/adr/README.md as an index:

  # Architecture Decision Records (ADR)
  
  This directory holds the major architectural decisions for the HESEM
  Operations Platform frontend redesign program. Each ADR is immutable
  once accepted; supersession is via a new ADR.
  
  | # | Title | Status | Date |
  |---|---|---|---|
  | 0001 | Non-production positioning for slice work | Accepted | 2026-04-25 |
  | 0002 | Frozen vocabulary: 14 domains, 18 Wave 1 roots | Accepted | 2026-04-25 |
  | 0003 | Route grammar: /ops prefix, /records/ for AR | Accepted | 2026-04-25 |
  ...

Step 2: Author each ADR per the format above.

ADR 0001 — Non-production positioning:
  Context: HMV4 prototype is fixture-only; no live data, no production
    cutover. Why?
  Decision: All slice work is dev/prototype. Wording rules. Feature
    flag inert by default.
  Consequences: Frontend can iterate fast; backend integration deferred.
  Alternatives: Live integration from Slice 1 (rejected: too risky).
  References: STEP1_MASTER_CONTEXT.md, NON_PRODUCTION_DELIVERY_POSITIONING.md

ADR 0002 — Frozen vocabulary:
  Context: 14 domains, 46 modules, 8 BCs, 8 spines, 18 Wave 1 roots
    were synthesized across multiple ChatGPT chats; risk of drift.
  Decision: Lock vocabulary; verify zero drift via audit.
  Consequences: All slices reference same vocabulary; no semantic divergence.
  Alternatives: Per-slice vocabulary (rejected: enables drift).
  References: PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md

ADR 0003 — Route grammar /ops:
  Context: Existing portal uses page-key navigation; confusing for AR
    (record) vs WS (workspace).
  Decision: /ops/{domain}/{module}/... for navigation; /ops/records/...
    for AR shells. Tabs via ?tab=. Forbid module codes in path.
  Consequences: Clean URL grammar; bridge alias for legacy.
  Alternatives: Module codes in URL (rejected: encodes internal IDs).
  References: STEP4_ROUTE_MASTER.md

ADR 0004 — Forbidden file list:
  Context: HMV4 prototype must not break existing portal.
  Decision: 7 files (portal.html, 3 CSS, 3 JS) immutable; only
    feature-flag insertion in portal.html.
  Consequences: Slice work cannot regress production portal.
  Alternatives: Edit existing CSS/JS (rejected: too risky).
  References: STEP6_HTML_MASTER.md, STEP8_PATCH_MASTER.md

ADR 0005 — Slice-based prototype cycle:
  Context: Wave 1 has 18 roots; can't ship all at once.
  Decision: Slice cycle = plan → approval → impl → QA → next slice.
    Each slice = 1 root + 1 pattern.
  Consequences: Predictable cadence; each slice independently shippable.
  Alternatives: Big-bang Wave 1 release (rejected: unmanageable scope).
  References: STEP11_LIMITED_WAVE1_PLANNING_MASTER.md

ADR 0006 — Feature flag HMV4_PREVIEW_ENABLED:
  Context: Current portal must remain default; HMV4 only for testing.
  Decision: window.HMV4_PREVIEW_ENABLED defaults false; production
    inert until explicit override.
  Consequences: Zero production impact; opt-in preview.
  Alternatives: Branch-per-feature (rejected: complicates QA).
  References: STEP7_IMPLEMENTATION_MASTER.md

ADR 0007 — Fixture-first development:
  Context: Backend gap (0/18 GREEN); 100% fixture mode for slice
    development.
  Decision: All HMV4 slices use static JSON fixtures in
    tests/fixtures/module-template-v4/. Live data integration deferred.
  Consequences: Frontend can iterate without backend dependency.
  Alternatives: Mock backend (rejected: extra service to maintain).
  References: PARALLEL_RESEARCH_API_READINESS_MATRIX.md

ADR 0008 — EQMS plural-form canonical paths:
  Context: EQMS controllers use singular paths (/api/v1/eqms/ncr);
    Step 3 spec uses plural (/api/v1/nonconformance-cases).
  Decision: Add plural REST aliases that delegate to existing
    controllers. No new business logic.
  Consequences: Frontend uses canonical paths; backend code unchanged.
  Alternatives: Rename existing paths (rejected: breaks legacy callers).
  References: PARALLEL_RESEARCH_API_READINESS_MATRIX.md, UPGRADE_PROMPT_PACK_3.md

ADR 0009 — Graphics Authority no-hardcode:
  Context: CLAUDE.md mandates no hex/px/font literals in JS.
  Decision: All visual values via tokens table or CSS variables. CI
    grep guard fails build on violation.
  Consequences: Consistent design system; harder to introduce drift.
  Alternatives: Per-component theming (rejected: design fragmentation).
  References: CLAUDE.md, PARALLEL_RESEARCH_GRAPHICS_AUTHORITY_AUDIT.md

ADR 0010 — Bridge alias policy:
  Context: Legacy page-key URLs (e.g., dispatch, ncr, training) must
    redirect to canonical /ops routes during cutover.
  Decision: 4 alias states: canonical / keep_as_alias /
    redirect_then_deprecate / internal_only_bridge. ncr-style aliases
    must not invent record IDs without context.
  Consequences: Smooth migration; no broken legacy links.
  Alternatives: Hard-cut legacy (rejected: breaks bookmarks).
  References: STEP7_REPO_GROUNDED_CODEX_MASTER.md (V7), V18 NC slice

Step 3: Verify all 10 ADRs created and README index updated.

Step 4: Add ADR template for future records:
  docs/adr/template.md

Generate:
  _reports/module-template-v4/S_DOCS_ADR_REPORT.md

Sections:
  ## Summary
  ## ADRs created (count + list)
  ## README index
  ## Template added
  ## Decision

Decision phrase output (one of):
  ADR_RECORDS_PASS_READY_FOR_REVIEW
  ADR_RECORDS_PASS_WITH_WARNINGS
  ADR_RECORDS_FAIL_BLOCK_NEXT
```

### Estimated time
2-3 hours.

---

## E3 — CLAUDE.md Wave 1 Section Update 🟢 (parallel)

### When to run
After Slice 3 lands.

### User must say
```
Proceed with CLAUDE.md Wave 1 section update.
```

### Background
CLAUDE.md is the entry-point AI assistant guide. It currently has DCC
header standards and Graphics Authority sections but no Wave 1 program
context. AI assistants opening this repo cold should know about the
slice program.

### Prompt to paste into Claude Code local

```text
You are in local repo sanhvo86-hesem/mom.

You are extending CLAUDE.md with a "Wave 1 Frontend Program" section
so future AI assistants understand the slice cycle and forbidden file
constraints.

Do NOT remove existing CLAUDE.md content.
Do NOT change forbidden files.

Required base branch:
  codex/docs-claude-md-wave1

Created from:
  origin/main

Allowed:
  CLAUDE.md (extend)
  _reports/module-template-v4/S_DOCS_CLAUDE_MD_*.md

Forbidden:
  Any source code
  Any forbidden file (other than CLAUDE.md itself which is documentation)

Step 1: Read current CLAUDE.md to understand structure.

Step 2: Add a new section "MANDATORY: HMV4 Wave 1 Frontend Slice Program"
after the DCC Document Header Standard section.

Section content:

  ## MANDATORY: HMV4 Wave 1 Frontend Slice Program
  
  The frontend redesign of HESEM Operations Platform follows a
  slice-based prototype program known as **module-template-v4** (HMV4).
  Each slice is one root × one pattern (workspace projection or
  authoritative record shell).
  
  **Reference documents** (always read these first):
  - `_reports/module-template-v4/STRATEGIC_MASTER.md` — strategy + roadmap
  - `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md` — current state
  - `_reports/module-template-v4/WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md` — slice order
  - `docs/adr/` — frozen architectural decisions
  
  **Pre-production posture (FROZEN)**:
  - HMV4 is development/prototype only
  - Wording: use "development/prototype", "current portal safety",
    "pre-production readiness"; AVOID "production go-live", "production
    cutover", "production release"
  - All HMV4 surfaces feature-flagged INERT by default
  - Fixture data only (no live API)
  - No `mom/qms-data` registry promotion without explicit approval
  
  **Forbidden files (NEVER modify in HMV4 slice work)**:
  - `mom/portal.html` (only feature-flag insertion allowed)
  - `mom/styles/portal.main.css`
  - `mom/styles/eqms-suite.css`
  - `mom/styles/density-darkmode.css`
  - `mom/scripts/portal/01-module-router.js`
  - `mom/scripts/portal/02-state-auth-ui.js`
  - `mom/scripts/portal/40-eqms-shell.js`
  
  **HMV4 source files**:
  - `mom/scripts/portal/70-module-template-v4-hydration.js`
  - `mom/scripts/portal/71-module-template-v4-routes.js`
  - `mom/scripts/portal/72-module-template-v4-bridge.js`
  - `mom/scripts/portal/73-module-template-v4-renderers.js`
  - `mom/scripts/portal/74-module-template-v4-fixtures.js` (fixture-only,
    NEVER loaded by `mom/portal.html`)
  - `mom/styles/module-template-v4.tokens.css`
  - `mom/styles/module-template-v4.css`
  - `mom/templates/module-template-v4/module-template-v4.html`
  - `tests/e2e/module-template-v4*.spec.ts` (4 spec files, ~33+ tests)
  - `tests/fixtures/module-template-v4/**` (JSON + HTML fixtures)
  
  **Slice cycle**:
  Each slice progresses through: planning → approval → implementation →
  QA. Each step has its own Codex prompt with explicit allowed/forbidden
  files and required output decision phrase.
  
  Reference prompt packs:
  - `_reports/module-template-v4/UPGRADE_PROMPT_PACK_1_SLICE_3_CYCLE.md`
  - `_reports/module-template-v4/UPGRADE_PROMPT_PACK_2_PRESLICE_CLEANUP.md`
  - `_reports/module-template-v4/UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md`
  - `_reports/module-template-v4/UPGRADE_PROMPT_PACK_4_QUALITY_INFRA.md`
  - `_reports/module-template-v4/UPGRADE_PROMPT_PACK_5_DOCUMENTATION.md`
  
  **18 Wave 1 roots and current slice progression**:
  - Slice 1: DISP (Dispatch Board, WS) — DONE
  - Slice 2: NQCASE (Nonconformance Case Record Shell, AR) — DONE
  - Slice 3: TRAIN (Training Matrix Workspace) — IN PROGRESS
  - Slices 4-8: CAPA, CDOC, INSP, BREL, ECO (quality stream)
  - Slices 9-12: JO, SO, WO, CPO (transactional stream)
  - Slices 13-18: PO, QUO, PREC, LOT, IREV, MWO (RED roots, full backend)
  
  **Quality gates per slice**:
  1. Node syntax 70-74 PASS
  2. JSON fixture parse PASS
  3. Forbidden diff guard PASS
  4. No fixture production load PASS
  5. Portal feature flag inert by default
  6. Playwright E2E 100% pass
  7. Graphics Authority compliance (no hex/px in JS)
  
  **When opening this repo**:
  1. Read `STRATEGIC_MASTER.md` and `EXECUTIVE_REVIEW_FOR_GPT_PRO.md`
  2. Identify current slice from `WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md`
  3. Honor forbidden file list (above)
  4. Use frozen vocabulary (14 domains, 18 roots, 9 route classes)
  5. Maintain pre-production wording

Step 3: Verify CLAUDE.md still parses correctly (Markdown syntax).

Step 4: Verify section is inserted in the right place (between DCC
section and AI Context Loading Protocol).

Generate:
  _reports/module-template-v4/S_DOCS_CLAUDE_MD_UPDATE_REPORT.md

Sections:
  ## Summary
  ## Section added (line number)
  ## Existing sections preserved
  ## CLAUDE.md syntax validation
  ## Decision

Decision phrase output (one of):
  CLAUDE_MD_UPDATE_PASS_READY_FOR_REVIEW
  CLAUDE_MD_UPDATE_PASS_WITH_WARNINGS
  CLAUDE_MD_UPDATE_FAIL_BLOCK_NEXT
```

### Estimated time
1 hour.

---

## Pack 5 timing summary

| Step | Time | Parallel? |
|---|---|---|
| E1 .ai/ index regen | 30 min | yes |
| E2 ADR records (10 files) | 2-3 hr | yes |
| E3 CLAUDE.md update | 1 hr | yes |

**3 parallel sessions**: ~3 hours total elapsed.
**Single-thread**: ~4-5 hours.

After all 3 complete:
- `.ai/` index reflects current code state
- 10 ADRs document major architectural decisions
- CLAUDE.md guides AI assistants on slice program
- Knowledge persistence is complete; future sessions can pick up cold
