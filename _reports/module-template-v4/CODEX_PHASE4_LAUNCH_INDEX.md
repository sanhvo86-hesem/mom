# CODEX PHASE 4 LAUNCH INDEX

**Generated**: 2026-04-26 (after Phase 3 partial merge)
**Main HEAD**: `3af028a6`
**Phase**: 4 — completes Wave 1 Phase B (transactional stream JO/SO/WO/CPO) + nav shell full expansion

---

## ✅ Phase 1 + 2 + 3 status on main

| Phase | Done items |
|---|---|
| 1 | Slices 0.5, 1, 2, 3 + Streams B.1, B.3, C.1, D.1, D.2, D.3, D.5, E.1, E.2, E.3 |
| 2 | Slice 4 CAPA + Live API NQCASE (ADR-0011) + Stream C.2 + Stream D.4 |
| 3 (partial) | Slices 5 (CDOC), 6 (INSP), 7 (BREL) + Stream C.3 (CPO rename) |

**Pending from Phase 3** (megaprompts on main, not yet executed):
- Slice 8 ECO (governed-change record shell)
- Live API toggle replication (CAPA + CDOC + INSP + BREL + ECO via ADR-0012)

These can be picked up alongside Phase 4 — they are independent of transactional stream.

**Tests on main**: ~150+ Playwright tests (across functional, axe, visual chromium+firefox+webkit, bridge, keyboard, accessibility, navshell, performance, live-api).
**ADRs**: 11 (10 + ADR-0011). ADR-0012 pending (lands with Live API replication).

---

## 🟡 Phase 4 — 5 megaprompts ready

### Parallel matrix

| Session | Branch | Megaprompt | Conflict-free? |
|---|---|---|---|
| **1** (frontend Slice 9) | `codex/slice-9-jo-from-eco-qa` | `CODEX_MEGAPROMPT_SLICE9_JO_RECORD_SHELL.md` | Touches 73-renderers.js — sequential |
| **2** (frontend Slice 10) | `codex/slice-10-so-from-jo-qa` | `CODEX_MEGAPROMPT_SLICE10_SO_RECORD_SHELL.md` | After S9 merged |
| **3** (frontend Slice 11) | `codex/slice-11-wo-from-so-qa` | `CODEX_MEGAPROMPT_SLICE11_WO_RECORD_SHELL.md` | After S10 merged |
| **4** (frontend Slice 12) | `codex/slice-12-cpo-from-wo-qa` | `CODEX_MEGAPROMPT_SLICE12_CPO_RECORD_SHELL.md` | After S11 merged |
| **5** (nav shell expansion) | `codex/nav-shell-full-14-domains` | `CODEX_MEGAPROMPT_NAV_SHELL_FULL_EXPANSION.md` | ✅ Independent of all frontend slice work |

### Optimal sequence

**Day 1**:
- Session 1: Slice 9 JO (frontend, ~3 hr)
- Session 5: Nav shell expansion (parallel — no conflict on 73-renderers.js since it's fixture-only) **PARALLEL**

**Day 1 evening**: Merge Session 1 + Session 5 → main.

**Day 2**: Session 2 Slice 10 SO (3 hr) → merge.

**Day 3**: Session 3 Slice 11 WO (3 hr) → merge.

**Day 4**: Session 4 Slice 12 CPO (3 hr) → merge. **Phase B COMPLETE.**

---

## 📋 Phase 4 file inventory

```text
CODEX_PHASE4_LAUNCH_INDEX.md (this file)
CODEX_MEGAPROMPT_SLICE9_JO_RECORD_SHELL.md           (full template, ~600 lines)
CODEX_MEGAPROMPT_SLICE10_SO_RECORD_SHELL.md          (differential, ~200 lines)
CODEX_MEGAPROMPT_SLICE11_WO_RECORD_SHELL.md          (differential, ~250 lines)
CODEX_MEGAPROMPT_SLICE12_CPO_RECORD_SHELL.md         (differential, ~250 lines)
CODEX_MEGAPROMPT_NAV_SHELL_FULL_EXPANSION.md         (~500 lines)
```

Total: ~1800 LOC. Differential prompts reference JO Slice 9 as full template.

---

## 🔑 Approval phrases

```text
Proceed with JO Record Shell ninth-slice prototype implementation.
Proceed with navigation shell full expansion to 14 domains.
Proceed with SO Record Shell tenth-slice prototype implementation.
Proceed with WO Record Shell eleventh-slice prototype implementation.
Proceed with CPO Record Shell twelfth-slice prototype implementation.
```

---

## 🎯 Decision phrases

| Session | PASS | WARNINGS | FAIL |
|---|---|---|---|
| 1 (JO) | `JO_SLICE9_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 2 (SO) | `SO_SLICE10_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 3 (WO) | `WO_SLICE11_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 4 (CPO) | `CPO_SLICE12_PASS_READY_FOR_QA` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |
| 5 (Nav shell) | `NAV_SHELL_EXPANSION_PASS_READY_FOR_REVIEW` | `_PASS_WITH_WARNINGS` | `_FAIL_BLOCK_NEXT` |

---

## 🧩 Phase 3 carry-over (re-runnable)

If Slice 8 ECO and Live API replication haven't been completed yet, their megaprompts are still on main:
- `CODEX_MEGAPROMPT_SLICE8_ECO_RECORD_SHELL.md`
- `CODEX_MEGAPROMPT_LIVE_API_REPLICATION.md`

Run them alongside Phase 4 (e.g., on Days 5-6) to fully close Wave 1 Phase A + cross-slice live-api.

---

## 📦 What Phase 4 unlocks

After Phase 4 + Phase 3 carry-over complete:
- **12 of 18 Wave 1 surfaces done** (Slices 0.5+1+2+3+4+5+6+7+8+9+10+11+12 = 13 surfaces with nav shell)
- **Phase A quality stream + Phase B transactional stream BOTH COMPLETE**
- **Nav shell covers FULL ADR-0002 14×~30 catalog** — every domain browsable
- **6 governed roots + 4 transactional roots have authoritative record shells**, all live-API-ready (when ADR-0012 lands)
- **Backend C.1 + C.2 + C.3 streams COMPLETE** — only C.4 (RED roots) remain
- **12 ADRs total** (11 + ADR-0012 from Phase 3 carry-over)

## 🚀 Phase 5 candidates (preview)

After Phase 4, the next phase is **Phase C RED roots** which need backend creation:
- Slice 13 PO (purchase orders) — needs new PurchaseOrderController
- Slice 14 QUO (quotations) — needs new QuoteController REST surface
- Slice 15 PREC (purchase receipts) — needs 3-way match logic
- Slice 16 LOT (lots) — needs lot CRUD + genealogy graph
- Slice 17 IREV (item revisions) — needs ECM controller
- Slice 18 MWO (maintenance work orders) — needs MWO controller

Each Phase C slice ≈ 2-3× longer than Phase A/B because backend must be built first.

Plus cross-cutting:
- Spine work: workflow-tasks, work-inbox, webhook-subscriptions REST surfaces
- A11y: full WCAG 2.1 AA pass (currently passes critical/serious, may have moderate findings)
- Performance: Lighthouse budget per-slice

---

## ⚠️ Forbidden across all Phase 4 sessions

```text
mom/portal.html (cache-bust line edits OK; no feature-flag default change)
mom/styles/portal.main.css, eqms-suite.css, density-darkmode.css
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/qms-data/**
HMV4_PREVIEW_ENABLED=true / HMV4_LIVE_API_ENABLED=true in mom/portal.html
ADR-0002 vocabulary changes (domain/module names FROZEN)
```

---

## 🔄 Post-Phase-4 coordinator prompt

After all Phase 4 sessions land on main, run:

```text
Read all Phase 4 reports in _reports/module-template-v4/ (S_SLICE9*,
S_SLICE10*, S_SLICE11*, S_SLICE12*, S_NAV_SHELL_EXPANSION*).
Synthesize Wave 1 Phase A+B integration report covering:
- 12 surfaces × 5 fixture states × 3 browsers visual coverage matrix
- Live API mode coverage matrix across 10 EQMS+transactional roots
- Backend canonical path completeness for Wave 1 Phase A+B (C.1+C.2+C.3)
- Cross-slice link coverage: JO→WO, SO→JO, CPO→SO, WO→INSP→NC, etc.
- Outstanding gaps for Phase C (RED roots Slices 13-18)
- Spine endpoint readiness (workflow-tasks, work-inbox, webhooks) for Wave 1 closure
Run full E2E suite on main to verify all phases coexist (~200+ tests expected).
Generate S_PHASE4_INTEGRATION_REPORT.md with Phase 5 go/no-go.
```
