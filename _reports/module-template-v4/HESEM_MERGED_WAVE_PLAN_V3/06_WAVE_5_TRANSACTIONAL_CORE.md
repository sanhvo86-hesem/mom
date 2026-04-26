# 06_WAVE_5_TRANSACTIONAL_CORE.md

## Wave name

```text
Wave 5 — Core Transactional ERP/MOM (Order-to-Execution Flow)
```

## Status

```text
Estimated duration: 6-12 weeks
Codex sessions: 8-16
Predecessor gate: Wave 4 PASS
Successor gate: Wave 6 begins after Wave 5 PASS
Note: Phase 4 megaprompts (Slices 9-12) on main are Wave 5 scope
```

## Goal

Prove the order-to-execution backbone of HESEM:

```
Quote → Customer PO → Sales Order → Job Order → Work Order → Dispatch → Inspection → Release
```

Slices delivered in Wave 5:
- Slice 9: JO record shell (job orders) — Phase 4 megaprompt ready
- Slice 10: SO record shell (sales orders) — Phase 4 megaprompt ready
- Slice 11: WO record shell (work orders) — Phase 4 megaprompt ready
- Slice 12: CPO record shell (customer purchase orders) — Phase 4 megaprompt ready
- Slice 13: QUO record shell (quotations) — backend prepared in Wave 4 WP4.5
- Slice 14: WO console workspace
- Slice 15: Dispatch tower workspace (extends existing dispatch board)
- Slice 16: Order-to-execution genealogy preview (read-only chain visualization)
- Plus: nav shell expansion (3→14 domains) — Phase 4 megaprompt ready

This wave is the **biggest single execution chunk** of the program.

## Why this wave matters

Without working order-to-execution flow, HESEM has:
- Quality system (Wave 2 governed records) without manufacturing context
- Dispatch board (Wave 1) without orders feeding it
- Connected worker (Wave 3) without WOs to execute
- Live-API toggle (Wave 4) without transactional roots

Wave 5 closes all 4 gaps. After Wave 5, HESEM can demo a complete order lifecycle with fixture data + opt-in live API.

## Entry criteria

```text
[ ] Wave 4 returned PASS_READY_FOR_WAVE_5
[ ] All 7 governed roots in Stage 2 live-API mode
[ ] Backend C.4 RED roots: PO + QUO controllers landed
[ ] Mobile shell pattern proven (Wave 3)
[ ] HMV4_LIVE_API_RESOURCE_REGISTRY captures all expected Wave 5 roots
```

## Exit criteria

```text
[ ] Slices 9-12 (JO/SO/WO/CPO) frontend prototype landed and QA passed
[ ] Slice 13 (QUO) frontend prototype landed
[ ] WO Console workspace landed
[ ] Dispatch Tower workspace landed
[ ] Nav shell full 14 domains × ~30 modules expansion
[ ] Cross-record link chain verified end-to-end:
    QUO → CPO → SO → JO → WO → DISP → INSP → NC/CAPA → BREL
[ ] All 5 transactional roots wired in HMV4_LIVE_RESOURCE_REGISTRY
[ ] Visual baselines on 3 browsers + mobile viewport for all new surfaces
[ ] No Stage 3 mutation graduation (still RULE-1 stage 2 max)
[ ] Forbidden diff PASS
```

## Work packages (slice-by-slice)

### WP5.1 — Slice 9 JO record shell

**Megaprompt source**: `_reports/module-template-v4/CODEX_MEGAPROMPT_SLICE9_JO_RECORD_SHELL.md` (already on main)

Branch: `codex/slice-9-jo-from-eco-qa`

7 tabs: overview | dispatch-readiness | spawned-work-orders | material-consumption | progress | related | audit

Wires JO into HMV4_LIVE_RESOURCE_REGISTRY (`canonicalPath: /api/v1/job-orders`, `fixtureGlobal: HMV4_JO_RECORD_FIXTURE`, adapter function).

Decision: `JO_SLICE9_PASS_READY_FOR_QA`

### WP5.2 — Slice 10 SO record shell (differential)

**Megaprompt source**: `CODEX_MEGAPROMPT_SLICE10_SO_RECORD_SHELL.md`

Mirror Slice 9 with SO-specific data shape and 7 tabs:
overview | line-items | linked-job-orders | shipment-allocation | invoicing | related | audit

### WP5.3 — Slice 11 WO record shell (differential)

**Megaprompt source**: `CODEX_MEGAPROMPT_SLICE11_WO_RECORD_SHELL.md`

8 tabs: overview | operation-detail | resource-allocation | execution-log | inspections | dispatch-status | related | audit

WO is leaf operational unit. Granular shopfloor execution view.

### WP5.4 — Slice 12 CPO record shell (differential)

**Megaprompt source**: `CODEX_MEGAPROMPT_SLICE12_CPO_RECORD_SHELL.md`

7 tabs: overview | line-items | terms-and-conditions | linked-sales-orders | acknowledgment | related | audit

Closes commercial commitment loop.

### WP5.5 — Slice 13 QUO record shell

**New megaprompt** required. Pattern: AR transactional/commercial.

7 tabs: overview | line-items | pricing | revisions | linked-cpo | related | audit
Lifecycle: draft → sent → accepted → expired | rejected
Bridge alias: `quo`, `quote`, `quotation`

QUO is **upstream** of CPO/SO. Customer-facing.

### WP5.6 — WO Console Workspace

Route: `/ops/shopfloor-execution/wo-console/queue`
Pattern: WS projection
Renders: Per-shift / per-operator WO queue with dispatch readiness, instruction visibility, quality gate

### WP5.7 — Dispatch Tower Workspace

Extends existing Slice 1 Dispatch Board with:
- Cross-line view (multiple dispatch boards on one tower)
- Andon escalation indicators
- Real-time refresh placeholder (fixture for now; Wave 9 IoT extension lights up live)

### WP5.8 — Nav shell full expansion (3→14 domains)

**Megaprompt source**: `CODEX_MEGAPROMPT_NAV_SHELL_FULL_EXPANSION.md`

Already prepared. Replaces 3-domain subset with full 14×30 catalog.

### WP5.9 — Cross-record link end-to-end audit

Verify the full chain renders cleanly:

```
QUO-2026-001 (in fixture)
  ↓ accepted
CPO-2026-077
  ↓ acknowledged
SO-2026-088
  ↓ released
JO-2026-014
  ↓ spawned WOs
WO-3013 (first-piece OP-30)
  ↓ dispatched
DISP-2026-1107 (via Dispatch Board)
  ↓ inspected
INSP-001
  ↓ flagged NC
NC-001
  ↓ disposed
CAPA-001
  ↓ closed
BREL-2026-X (release decision after CAPA effectiveness)
```

Each step must be navigable via cross-record link in fixture pages.

### WP5.10 — Wave 5 integration QA

Full E2E across all browsers + mobile viewport:
```bash
cd tests/e2e
npm install --no-package-lock
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
```

Expected count: ~400+ tests × 3 browsers ~1200 total + mobile ~200 = 1400 tests.

```text
V25_WAVE_5_INTEGRATION_REPORT.md
```

Decision phrase:
```text
WAVE_5_TRANSACTIONAL_CORE_PASS_READY_FOR_WAVE_6
WAVE_5_TRANSACTIONAL_CORE_PASS_WITH_WARNINGS
WAVE_5_TRANSACTIONAL_CORE_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 8-16 (largest wave)
  Sequential frontend (each ~3 hr Codex):
    Session 1: Slice 9 JO
    Session 2: Slice 10 SO
    Session 3: Slice 11 WO
    Session 4: Slice 12 CPO
    Session 5: Slice 13 QUO
  Workspace slices (each ~3 hr):
    Session 6: WO Console
    Session 7: Dispatch Tower
  Independent (parallel-safe):
    Session 8: Nav shell expansion (parallel with frontend slices)
  Audit + integration:
    Session 9: cross-record link audit
    Session 10: integration QA report

Human review: 5-12 days
Calendar elapsed: 6-12 weeks (longest wave)
```

## Allowed files

```text
mom/scripts/portal/73-module-template-v4-renderers.js (extend with 7 new renderers)
mom/scripts/portal/72-module-template-v4-bridge.js (jo, so, wo, cpo, quo aliases)
mom/scripts/portal/70-module-template-v4-hydration.js (extend HMV4_LIVE_RESOURCE_REGISTRY)
tests/e2e/module-template-v4*.spec.ts (extend coverage)
tests/fixtures/module-template-v4/<root>-record-fixtures.json × 5
tests/fixtures/module-template-v4/pages/authoritative-record-shell-<root>-*.html × ~50 (10 per slice × 5)
tests/fixtures/module-template-v4/pages/workspace-wo-console*.html × 5
tests/fixtures/module-template-v4/pages/workspace-dispatch-tower*.html × 5
tests/fixtures/module-template-v4/nav-shell-fixtures.json (full 14×30)
tests/fixtures/module-template-v4/pages/domain-landing-*.html × 14 + module-landing-*.html × 15
tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (~150+ new PNGs across 3 browsers + mobile)
_reports/module-template-v4/S_SLICE<9-13>_*.md
_reports/module-template-v4/V25_WAVE_5_*.md
docs/adr/0018-quotation-record-shell.md (if needed)
```

## Forbidden

```text
Stage 3 mutation graduation
Forbidden file
HMV4_PREVIEW_ENABLED / HMV4_LIVE_API_ENABLED defaults change
Backend mutation
mom/qms-data/**
```

## Per-rule compliance

- **RULE-1**: All 5 transactional roots Stage 2 (live-mode opt-in via existing pattern)
- **RULE-2**: No AI
- **RULE-3**: Pre-production wording
- **RULE-4**: 8 standard artifacts × 7 surfaces
- **RULE-5**: Wave 4 PASS
- **RULE-6**: 15-question checklist per slice
- **RULE-7**: S_SLICE<n>_<root> naming
- **RULE-8**: No mutation; read-only with cross-record links

## Decision phrase

```text
WAVE_5_TRANSACTIONAL_CORE_PASS_READY_FOR_WAVE_6
WAVE_5_TRANSACTIONAL_CORE_PASS_WITH_WARNINGS
WAVE_5_TRANSACTIONAL_CORE_FAIL_BLOCK_NEXT
```

```
WAVE_5_PLAN_BASELINE_LOCKED
```
