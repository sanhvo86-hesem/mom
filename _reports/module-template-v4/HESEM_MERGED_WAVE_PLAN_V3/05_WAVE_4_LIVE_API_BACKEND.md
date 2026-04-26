# 05_WAVE_4_LIVE_API_BACKEND.md

## Wave name

```text
Wave 4 — Live API Cutover & Backend Contract Hardening
```

## Status

```text
Estimated duration: 4-8 weeks
Codex sessions: 5-10
Predecessor gate: Wave 3 PASS
Successor gate: Wave 5 begins after Wave 4 PASS
```

## Goal

Graduate selected slices from Stage 1 (fixture-only) to Stage 2 (opt-in live API read-only) per RULE-1 three-stage discipline.

Specifically:
1. Close NQCASE live API warnings (Phase 2 stream)
2. Replicate live API toggle pattern (ADR-0012) to CAPA, CDOC, INSP, BREL, ECO, TRAIN, MWO
3. Verify backend C.1, C.2, C.3 contracts (warnings closure)
4. Begin Stream C.4 (RED roots: PO, QUO, PREC, LOT, IREV — frontend deferred to Wave 6, backend prep here)

**Key principle**: fixture mode remains DEFAULT. Live mode is OPT-IN via flag. Mutation NEVER auto-enabled.

## Entry criteria

```text
[ ] Wave 3 returned PASS_READY_FOR_WAVE_4
[ ] HMV4_LIVE_API_RESOURCE_REGISTRY.md present (from Wave 1)
[ ] All 6 governed record shells fixture-stable
[ ] Mobile shell pattern proven (Wave 3 deliverable)
[ ] Backend C.1+C.2+C.3 already on main
```

## Exit criteria

```text
[ ] NQCASE live API: 0 warnings (down from PASS_WITH_WARNINGS)
[ ] All 7 EQMS-backed roots have live-mode fixture pages: NQCASE, CAPA, CDOC, INSP, BREL, ECO, TRAIN
[ ] All 7 follow ADR-0012 resource registry pattern
[ ] Backend C.1+C.2+C.3 warnings: closed or accepted-as-known
[ ] Stream C.4 (RED roots backend) plan documented
[ ] Live-mode E2E tests pass for all 7 (error fallback path tested)
[ ] No mutation graduation (Stage 3) on any slice
[ ] Forbidden diff PASS
```

## Work packages

### WP4.1 — NQCASE live API warning closure

Read `S_LIVE_API_TOGGLE_NQCASE_REPORT.md` warnings:
- Visual drift on live-mode page (likely)
- E2E flake (likely)
- Backend 401 response handling (verify fallback UI)
- Performance budget under live-mode

For each warning:
- Apply fix in `mom/scripts/portal/70-module-template-v4-hydration.js`
- Verify with E2E

Branch: `codex/wave4-nqcase-live-warning-closure`

### WP4.2 — Replicate live-mode to 6 more roots

Already partially done in Phase 3 carry-over. Verify and complete for:
- CAPA
- CDOC
- INSP
- BREL
- ECO
- TRAIN

Per ADR-0012:
- Each root has registry entry: `canonicalPath`, `fixtureGlobal`, `adapt(live)`
- Each root has live-mode fixture page: `authoritative-record-shell-<root>-live-mode.html`
- Each root has live-mode E2E test (error fallback)

### WP4.3 — TRAIN live mode (workspace, not record)

TRAIN is a WS workspace (not AR). Live-mode for workspaces requires:
- Adapter for `/api/v1/training-records?team=...&role=...&status=...`
- Adapt response to matrix shape
- Filter parameters preserved in URL

ADR amendment if WS live-mode pattern differs from AR pattern.

### WP4.4 — Backend contract verification (C.1, C.2, C.3 warnings closure)

Read `S_BACKEND_TRANSACTIONAL_REST_REPORT.md` warnings.

Per warning:
- curl smoke environment fix (PHP -S server config)
- PHPStan debt separation (technical debt log; not blocking)
- Full PHPUnit diagnosis (backend test infrastructure)
- Route redirect test evidence (301 from /api/orders/sales)

Branch: `codex/wave4-backend-warning-closure`

### WP4.5 — C.4 RED root backend creation kickoff

Stream C.4 is RED roots backend creation:
- PO (PurchaseOrderController) — full new
- QUO (QuoteController REST surface — currently action shim only)
- PREC (PurchaseReceiptController) — new
- LOT (LotController) — new
- IREV (ItemRevisionController) — extract from MasterDataController
- MWO (MaintenanceWorkOrderController) — new

Each ≈ 2-3 days backend work. NOT all in Wave 4. Wave 4 schedules and begins:
- Wave 4: PO + QUO (2 controllers)
- Wave 5: deferred (start of transactional frontend)
- Wave 6: PREC + LOT + IREV + MWO (digital thread requires LOT)

Per-controller pattern (ADR required):
- ADR-0015 RED root controller pattern (skeleton, state machine, OpenAPI)
- ADR-0016 LOT genealogy graph anchor

Branch per controller: `codex/wave4-backend-<root>-controller`

### WP4.6 — Live-mode discipline ADR

ADR-0017 Live API Three-Stage Graduation Discipline (formalize RULE-1)

Stage 1: Fixture-only (default forever; never deprecated)
Stage 2: Opt-in live read (?hmv4-live-api=1; dev/staging only by default)
Stage 3: Controlled mutation (separate ADR per mutation surface; 2026Q4+ only)

### WP4.7 — Wave 4 integration report

```text
V24_WAVE_4_INTEGRATION_REPORT.md
```

Decision phrase:
```text
WAVE_4_LIVE_API_BACKEND_PASS_READY_FOR_WAVE_5
WAVE_4_LIVE_API_BACKEND_PASS_WITH_WARNINGS
WAVE_4_LIVE_API_BACKEND_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 5-10
  Session 1: WP4.1 NQCASE warning closure — 2 hr
  Session 2: WP4.2 replicate to CAPA + CDOC — 3 hr
  Session 3: WP4.2 replicate to INSP + BREL + ECO — 3 hr
  Session 4: WP4.3 TRAIN workspace live mode — 3 hr
  Session 5: WP4.4 backend warning closure (C.1+C.2+C.3) — 4 hr
  Session 6: WP4.5 PO controller — 2-3 days
  Session 7: WP4.5 QUO controller — 2-3 days
  Session 8: WP4.6 ADR-0015 to 0017 — 2 hr
  Session 9: WP4.7 integration report — 2 hr

Human review: 4-8 days (backend changes need careful review)
Calendar elapsed: 4-8 weeks
```

## Allowed files

```text
mom/scripts/portal/70-module-template-v4-hydration.js (live-mode adapter extensions)
mom/scripts/portal/73-module-template-v4-renderers.js (workspace live-mode if needed)
tests/e2e/module-template-v4-live-api.spec.ts (extend test list)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-<root>-live-mode.html (× 7)
mom/api/routes/rest-routes.php (RED root routes for PO, QUO)
mom/api/controllers/PurchaseOrderController.php (NEW)
mom/api/controllers/QuoteController.php (NEW REST methods; existing legacy preserved)
mom/api/openapi.yaml (add PO + QUO paths)
mom/api/migrations/<NNN>_purchase_orders_table.sql (if needed)
mom/data/registry/endpoint-catalog*.json (regenerate)
mom/tests/contract/PoRestTest.php (NEW)
mom/tests/contract/QuoRestTest.php (NEW)
docs/adr/0015-red-root-controller-pattern.md
docs/adr/0016-lot-genealogy-anchor.md (design only; impl Wave 6)
docs/adr/0017-live-api-three-stage-graduation.md
_reports/module-template-v4/V24_WAVE_4_*.md
_reports/module-template-v4/S_WAVE4_*.md
```

## Forbidden

```text
Any frontend slice for RED roots (Wave 6 scope)
Stage 3 mutation graduation
Live-mode default-on in mom/portal.html
Forbidden file
mom/qms-data/**
```

## Per-rule compliance

- **RULE-1**: Graduate 7 governed roots from Stage 1 → Stage 2; document the graduation
- **RULE-2**: No AI
- **RULE-3**: Pre-production wording
- **RULE-4**: 8 standard artifacts (V24 report + per-stream reports)
- **RULE-5**: Wave 3 PASS required
- **RULE-6**: 15-question checklist
- **RULE-7**: V24 + S_WAVE4_* naming
- **RULE-8**: No mutation; only opt-in read

## Decision phrase

```text
WAVE_4_LIVE_API_BACKEND_PASS_READY_FOR_WAVE_5
WAVE_4_LIVE_API_BACKEND_PASS_WITH_WARNINGS
WAVE_4_LIVE_API_BACKEND_FAIL_BLOCK_NEXT
```

```
WAVE_4_PLAN_BASELINE_LOCKED
```
