# Wave 1 — 18-Root Slice Sequencing Roadmap

**Generated**: 2026-04-25 (parallel strategic work, no GPT Pro input)
**Inputs**: S16 candidate matrix + API readiness matrix + Step 11 Wave 1 plan + vocabulary audit
**Purpose**: Replace ad-hoc slice picking with a single ordered sequence for Slice 3 → Slice 20.

## Executive logic

The S16 matrix scored 5 candidates on 12 dimensions (op_value, diversity,
route, record, workspace, api, workflow, fixture/e2e, rollback, complexity,
compliance_control). I extend that to all 18 Wave 1 roots **plus** an API
readiness multiplier from the parallel research.

**Backend readiness multiplier** (additive bonus):
- GREEN: +1.0 (none qualify currently)
- YELLOW with EQMS-grade backend (full state machine + esign): +0.8
- YELLOW with legacy backend (partial CRUD): +0.4
- RED (no backend): −0.5

**Pattern coverage multiplier** (positive bonus for diverse pattern):
- Already-covered pattern (e.g., another WS workspace after Dispatch): −0.3
- New pattern not yet covered: +0.5
- Reuses pattern in a high-leverage way: 0

## All 18 Wave 1 Roots — Scored

| Root | Authority Class | Pattern | Backend | S16-base score | Adjustments | Final | Sequence |
|---|---|---|---:|---:|---:|---:|---:|
| **DISP** | projection | WS | YELLOW-action-shim | — (already done) | — | — | ✅ Slice 1 |
| **NQCASE** | authoritative | AR govern-quality | YELLOW-EQMS | 4.2 | already done | — | ✅ Slice 2 |
| **TRAIN** | projection | WS qualification matrix | YELLOW-EQMS | 3.8 | +0.8 backend, +0.5 new pattern | **5.1** | 🟢 Slice 3 |
| **CAPA** | authoritative | AR govern-quality | YELLOW-EQMS | 3.6 | +0.8 backend, −0.3 same pattern as NC | **4.1** | 🟢 Slice 4 |
| **CDOC** | authoritative | AR govern-content | YELLOW-EQMS | 3.5 | +0.8 backend, +0.5 new pattern (governed content) | **4.8** | 🟢 Slice 5 |
| **INSP** | authoritative | AR govern-quality | YELLOW-EQMS | 3.4 | +0.8 backend, −0.3 same as NC | **3.9** | Slice 6 |
| **BREL** | authoritative | AR govern-release | YELLOW-EQMS | 3.5 | +0.8 backend, +0.5 new pattern (release) | **4.8** | Slice 7 |
| **ECO** | authoritative | AR govern-change | YELLOW-EQMS | 3.3 | +0.8 backend, +0.5 new pattern (change) | **4.6** | Slice 8 |
| **JO** | authoritative | AR transactional | YELLOW-legacy | 3.0 | +0.4 backend, +0.5 new pattern (transactional ops) | **3.9** | Slice 9 |
| **SO** | authoritative | AR transactional | YELLOW-legacy | 3.2 | +0.4 backend, −0.3 same as JO | **3.3** | Slice 10 |
| **WO** | authoritative | AR transactional | YELLOW-legacy | 3.1 | +0.4 backend, −0.3 same as SO | **3.2** | Slice 11 |
| **CPO** | authoritative | AR transactional | YELLOW-rename | 2.9 | +0.4 backend, −0.3 same as SO | **3.0** | Slice 12 |
| **PO** | authoritative | AR transactional | RED | 3.0 | −0.5 backend, −0.3 same as SO | **2.2** | Slice 13 |
| **QUO** | authoritative | AR transactional | RED | 2.8 | −0.5 backend, −0.3 same as SO | **2.0** | Slice 14 |
| **PREC** | authoritative | AR transactional | RED | 2.7 | −0.5 backend, +0.5 new pattern (logistics) | **2.7** | Slice 15 |
| **LOT** | authoritative | AR genealogy-anchor | RED | 2.5 | −0.5 backend, +0.5 new pattern (genealogy) | **2.5** | Slice 16 |
| **IREV** | authoritative | AR govern-product | RED | 2.5 | −0.5 backend, +0.5 new pattern (product) | **2.5** | Slice 17 |
| **MWO** | authoritative | AR maintenance | RED | 2.4 | −0.5 backend, +0.5 new pattern (maintenance) | **2.4** | Slice 18 |

## Sequenced Roadmap

### Phase A — Quality / Compliance Stream (Slices 3–8)

**Theme**: Lean on EQMS-grade backends already implemented; build all
governed AR shells and the qualification workspace.

| Slice | Root | Route | Authority | Why now |
|---:|---|---|---|---|
| 3 | TRAIN | `/ops/people-skill-ehs/training-competency/matrix` | WS projection | EQMS backend ready; new workspace pattern |
| 4 | CAPA | `/ops/records/capas/{id}?tab=overview` | AR governed-quality | EQMS backend ready; pairs with NC |
| 5 | CDOC | `/ops/records/controlled-documents/{id}?tab=overview` | AR governed-content | EQMS backend ready; new content pattern |
| 6 | INSP | `/ops/records/inspections/{id}?tab=overview` | AR governed-quality | EQMS backend ready; closes inspection→NC chain |
| 7 | BREL | `/ops/records/batch-releases/{id}?tab=overview` | AR governed-release | EQMS backend ready; release authority pattern |
| 8 | ECO | `/ops/records/engineering-changes/{id}?tab=overview` | AR governed-change | EQMS backend ready; change-control pattern |

**Phase A duration**: 6 slices × ~1 week each = **~6 weeks**.
**Phase A backend cost**: 6 REST aliases (all 1-day tasks).

### Phase B — Transactional Operations Stream (Slices 9–12)

**Theme**: Sales/Purchase/Job/Work order shells. Backend exists as legacy
under `/api/orders/...` — needs canonical REST formalization.

| Slice | Root | Route | Authority | Why now |
|---:|---|---|---|---|
| 9 | JO | `/ops/records/job-orders/{id}?tab=overview` | AR transactional | Pivot from quality to ops; legacy backend |
| 10 | SO | `/ops/records/sales-orders/{id}?tab=overview` | AR transactional | Pairs with JO; legacy backend |
| 11 | WO | `/ops/records/work-orders/{id}?tab=overview` | AR transactional | Closes JO→WO chain |
| 12 | CPO | `/ops/records/customer-purchase-orders/{id}?tab=overview` | AR transactional | Customer-side commitment |

**Phase B duration**: 4 slices × ~1.5 weeks each = **~6 weeks**.
**Phase B backend cost**: 4 canonical REST routes (each ~2-3 days).

### Phase C — Procurement / Logistics / Genealogy Stream (Slices 13–18)

**Theme**: RED roots needing full backend creation. These are slower per
slice because backend must be built in parallel.

| Slice | Root | Route | Authority | Why now |
|---:|---|---|---|---|
| 13 | PO | `/ops/records/purchase-orders/{id}?tab=overview` | AR transactional | Procurement domain start |
| 14 | QUO | `/ops/records/quotations/{id}?tab=overview` | AR transactional | Quote→SO conversion |
| 15 | PREC | `/ops/records/purchase-receipts/{id}?tab=overview` | AR transactional | 3-way match logic |
| 16 | LOT | `/ops/records/lots/{id}?tab=overview` | AR genealogy | Material identity anchor |
| 17 | IREV | `/ops/records/item-revisions/{id}?tab=overview` | AR governed-product | ECM lifecycle |
| 18 | MWO | `/ops/records/maintenance-work-orders/{id}?tab=overview` | AR maintenance | Asset/labor integration |

**Phase C duration**: 6 slices × ~3 weeks each (with backend) = **~18 weeks**.
**Phase C backend cost**: 6 full controllers + state machines.

## Cross-Slice Pattern Variants Coverage

After Slice 8, all major AR/WS pattern variants are exercised:

| Pattern variant | First slice |
|---|---|
| WS workspace projection (planning) | 1 (Dispatch) |
| WS workspace projection (qualification) | 3 (Training) |
| AR governed-quality | 2 (NC) |
| AR governed-quality (CAPA) | 4 |
| AR governed-content | 5 (CDOC) |
| AR governed-quality (INSP) | 6 |
| AR governed-release | 7 (BREL) |
| AR governed-change | 8 (ECO) |
| AR transactional ops | 9 (JO) |
| SH/DL/ML shell pattern | not yet — could be inserted as "Slice 0" |
| ERD/NRD draft pattern | not yet — likely Slice 19+ |

**Recommendation**: insert a thin "Slice 0.5" for the SH/DL/ML domain
landing pattern early (before Slice 4), so the operations shell becomes a
real navigable surface and not just record/workspace deep links. This was
already implicit in the V18 hydration but never fixture-tested.

## Backend Migration Stream (parallel)

While slice frontend work runs, backend team should add REST aliases:

**Sprint 1** (1-2 weeks, blocks Slice 4-8):
- Add 6 plural-form REST aliases for EQMS singular paths:
  - `/api/v1/capas → /api/v1/eqms/capa`
  - `/api/v1/controlled-documents → /api/v1/eqms/documents`
  - `/api/v1/inspections → /api/v1/eqms/iqc + /inprocess`
  - `/api/v1/batch-releases → /api/v1/eqms/batch-release`
  - `/api/v1/engineering-changes → /api/v1/eqms/engineering-change`
  - `/api/v1/training-records → /api/v1/eqms/training`
- Add canonical alias for `/api/v1/nonconformance-cases → /api/v1/eqms/ncr`

**Sprint 2** (2-3 weeks, blocks Slice 9-12):
- Formalize `/api/v1/sales-orders`, `/api/v1/job-orders`, `/api/v1/work-orders`
- Add 301 redirects from `/api/orders/sales/*` etc.
- Rename `/api/v1/commercial/customer-purchase-orders` to canonical

**Sprint 3+** (long-running, blocks Slice 13-18):
- Build PurchaseOrderController, QuoteController (REST), etc.
- Build LotController + genealogy graph anchor
- Build ItemRevisionController + ECM integration
- Build PurchaseReceiptController + 3-way match
- Build MaintenanceWorkOrderController + asset integration

## Total Wave 1 Estimate

- **18 slices** (6 fast + 4 medium + 6 slow + 2 platform/shell)
- **~30 weeks** of frontend slice work (with parallel backend)
- **Best-case**: ~20 weeks if backend prioritizes alias work
- **Worst-case**: ~40 weeks if RED roots discovered to be larger

## Risk Mitigations

1. **Don't start Phase B until Phase A backend aliases land** — frontend
   would be stuck in fixture mode.
2. **Phase C requires backend roadmap from day 1** — 6 RED roots cannot
   be slice-prototyped indefinitely.
3. **After Slice 8, evaluate framework switch** — by then 6+ AR shells
   exist; if pattern reuse cost is high, consider React/Vue framework.
   Until then, vanilla JS modular design suffices.
4. **Insert "Slice 0.5" domain landing slice** before Slice 4 so the
   `/ops/{domain}/{module}` path actually navigates.

## Decision

```
WAVE1_SEQUENCING_READY_FOR_SLICE_3_APPROVAL
```

Slice 3 = TRAIN (Training Matrix) is the unambiguous next slice based on
S16 + API readiness + pattern diversity scoring.
