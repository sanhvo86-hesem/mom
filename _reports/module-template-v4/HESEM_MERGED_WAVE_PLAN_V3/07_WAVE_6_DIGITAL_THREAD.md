# 07_WAVE_6_DIGITAL_THREAD.md

## Wave name

```text
Wave 6 — Digital Thread, Genealogy, and Release Packet
```

## Status

```text
Estimated duration: 6-12 weeks
Codex sessions: 8-14
Predecessor gate: Wave 5 PASS
Successor gate: Wave 7 begins after Wave 6 PASS
```

## Goal

Prove end-to-end traceability + RED root completion:

1. LOT record shell (RED root) — material identity anchor
2. PREC record shell (RED root) — purchase receipts
3. IREV record shell (RED root) — item revisions
4. MWO record shell completion (frontend already in Wave 3; backend now)
5. Genealogy Explorer workspace — graph visualization of digital thread
6. Batch Release Packet workspace — read-only release decision packet
7. Product Passport / Certificate of Analysis read-only viewer
8. Evidence Bundle shell (cross-cutting reference surface)

## Why this wave matters

Wave 1-5 established record shells per family. Wave 6 connects them via the **digital thread** — the central differentiator vs ERP-only platforms (SAP/Oracle) and QMS-only platforms (Veeva/MasterControl).

Without Wave 6:
- Traceability claim unsupported
- Recall management impossible
- Batch passport/COA cannot be issued
- Genealogy stays as backend feature only

## Entry criteria

```text
[ ] Wave 5 returned PASS_READY_FOR_WAVE_6
[ ] All 11 record shells stable (DISP/NQCASE/TRAIN/CAPA/CDOC/INSP/BREL/ECO/JO/SO/WO/CPO/QUO)
[ ] Cross-record link chain verified end-to-end
[ ] Backend C.4 PO + QUO controllers stable from Wave 4
```

## Exit criteria

```text
[ ] LOT record shell + backend controller landed
[ ] PREC record shell + backend controller landed
[ ] IREV record shell + backend controller landed
[ ] MWO backend controller landed (frontend from Wave 3)
[ ] Genealogy Explorer workspace landed (graph viz)
[ ] Batch Release Packet workspace landed
[ ] Product Passport / COA viewer landed
[ ] Evidence Bundle shell landed
[ ] All 4 RED root frontends Stage 2 (live-mode opt-in)
[ ] HMV4_LIVE_API_RESOURCE_REGISTRY covers all 18 Wave 1 roots
[ ] Cross-record genealogy E2E tests pass
```

## Work packages

### WP6.1 — Backend RED root controllers (3 new)

LOT, PREC, IREV controllers (MWO already partially done).

Each controller:
- Full CRUD endpoints (`/api/v1/<family>`)
- State machine per Step 2 workflow schema
- OpenAPI documentation
- Endpoint catalog regen
- Contract tests
- Migration if new tables

Per ADR-0015 RED root controller pattern.

Branch per controller: `codex/wave6-backend-<root>-controller`

### WP6.2 — Slice 14: LOT record shell

Pattern: AR genealogy-anchor (special variant)
Route: `/ops/records/lots/LOT-2026-04`
Tabs: overview | composition | genealogy-upstream | genealogy-downstream | linked-inspections | linked-batch-releases | related | audit

LOT is the **genealogy graph anchor** per ADR-0016. Special tab semantics:
- composition: what materials make up this lot
- genealogy-upstream: lots/items consumed to make this lot
- genealogy-downstream: lots/products derived from this lot

### WP6.3 — Slice 15: PREC record shell

Pattern: AR transactional/inbound-logistics
Route: `/ops/records/purchase-receipts/PREC-2026-022`
Tabs: overview | line-items | 3-way-match (PO ↔ receipt ↔ invoice) | inspection-status | lot-creation | related | audit

3-way match is the supply chain core check.

### WP6.4 — Slice 16: IREV record shell

Pattern: AR governed-product
Route: `/ops/records/item-revisions/IREV-PN-2042-B`
Tabs: overview | bom | routing | effectivity | linked-eco | usage | related | audit

IREV ties to ECO (engineering change driver) and BOM/Routing (manufacturing definition).

### WP6.5 — Slice 17: Genealogy Explorer Workspace

Route: `/ops/traceability-passport/genealogy/explorer`
Pattern: WS projection / graph visualization

Renders:
- Selected anchor record (LOT, BATCH, ITEM)
- Upstream graph (what fed this)
- Downstream graph (what this fed)
- Per-edge metadata (consumed quantity, date, operator, work order)
- Filter (by date range, by NC presence, by operator)

**Tech challenge**: Graph rendering is non-trivial. Options:
- Pure SVG render (recommended for fixture mode)
- Dagre / cytoscape.js (3rd-party lib; requires ADR for vendor lock-in)
- D3 (heavy)

Decision: Pure SVG with ADR-0019 graph rendering pattern. Simple but reliable.

### WP6.6 — Batch Release Packet workspace

Route: `/ops/quality-compliance/batch-release/packet/<id>`
Pattern: WS projection (effectively a frozen snapshot view of related records)

Renders:
- Linked BREL record (cite)
- All linked INSP records (results)
- All linked NC records (with disposition)
- All linked CAPA records (status)
- All linked CDOC versions (effective revisions)
- Production attribution (JO/WO/operator/equipment)
- Genealogy reference

This is the audit-ready packet exported as PDF (Wave 8 hardening adds the export).

### WP6.7 — Product Passport / Certificate of Analysis viewer

Route: `/ops/records/lots/LOT-2026-04/passport`
Pattern: AR child-shell (specialized AR variant)

Renders:
- Lot identity
- Production attribution
- Quality attribution (linked INSP results, NC dispositions)
- Customer-facing fields (filtered for confidentiality per fixture state partial-access)
- COA-style evidence

### WP6.8 — Evidence Bundle shell

Cross-cutting reference surface. Not a slice per se; a component used by BREL/CAPA/CDOC/ECO release tabs.

Per ADR-0020 Evidence Bundle component contract.

### WP6.9 — Wave 6 integration QA

```text
V26_WAVE_6_INTEGRATION_REPORT.md
```

Decision phrase:
```text
WAVE_6_DIGITAL_THREAD_PASS_READY_FOR_WAVE_7
WAVE_6_DIGITAL_THREAD_PASS_WITH_WARNINGS
WAVE_6_DIGITAL_THREAD_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 8-14
  Backend (sequential due to single repo):
    Session 1: LOT controller — 3 days
    Session 2: PREC controller — 3 days
    Session 3: IREV controller — 3 days
  Frontend (sequential due to renderer file):
    Session 4: LOT record shell — 3 hr
    Session 5: PREC record shell — 3 hr
    Session 6: IREV record shell — 3 hr
    Session 7: Genealogy Explorer (largest, novel SVG rendering) — 6 hr
    Session 8: Batch Release Packet — 3 hr
    Session 9: Product Passport viewer — 2 hr
  Integration:
    Session 10: WP6.8 evidence bundle component — 2 hr
    Session 11: WP6.9 integration report — 2 hr

Human review: 5-12 days
Calendar elapsed: 6-12 weeks
```

## Allowed files

```text
mom/api/controllers/LotController.php (NEW)
mom/api/controllers/PurchaseReceiptController.php (NEW)
mom/api/controllers/ItemRevisionController.php (NEW)
mom/api/controllers/MaintenanceWorkOrderController.php (NEW; if not done in Wave 3)
mom/api/migrations/<NNN>_lots_table.sql (if new)
mom/api/migrations/<NNN>_purchase_receipts_table.sql (if new)
mom/api/migrations/<NNN>_item_revisions_table.sql (if new)
mom/api/routes/rest-routes.php (extend)
mom/api/openapi.yaml (extend)
mom/scripts/portal/73-module-template-v4-renderers.js (extend with 5 new + genealogy graph)
mom/scripts/portal/70-module-template-v4-hydration.js (extend registry)
tests/e2e/module-template-v4*.spec.ts (extend)
tests/fixtures/module-template-v4/lot-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/purchase-receipt-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/item-revision-record-fixtures.json (NEW)
tests/fixtures/module-template-v4/genealogy-graph-fixtures.json (NEW)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-{lot,prec,irev}-*.html (× ~30)
tests/fixtures/module-template-v4/pages/workspace-genealogy-explorer*.html (× 5)
tests/fixtures/module-template-v4/pages/workspace-batch-release-packet*.html (× 5)
docs/adr/0019-graph-rendering-pattern.md
docs/adr/0020-evidence-bundle-component.md
docs/adr/0021-product-passport-coa-rendering.md
_reports/module-template-v4/S_SLICE<14-17>_*.md
_reports/module-template-v4/V26_WAVE_6_*.md
```

## Forbidden

```text
Stage 3 mutation
Forbidden file
3rd-party graph lib without ADR
mom/qms-data/**
```

## Decision phrase

```text
WAVE_6_DIGITAL_THREAD_PASS_READY_FOR_WAVE_7
WAVE_6_DIGITAL_THREAD_PASS_WITH_WARNINGS
WAVE_6_DIGITAL_THREAD_FAIL_BLOCK_NEXT
```

```
WAVE_6_PLAN_BASELINE_LOCKED
```
