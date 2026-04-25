# Parallel Research: Vocabulary Drift Audit (Step 1–8 Masters)

**Generated**: 2026-04-25 (parallel research, no GPT Pro input)
**Purpose**: Verify Step 1–8 architectural masters use consistent vocabulary
across all phases.

## Executive Verdict

**100% PASS — 12/12 axes consistent.**

All Step 1–8 masters reference unified frozen vocabulary inherited from
Step 1, with early closures in Step 2 and consistent reuse in Steps 3–8.
**Zero material drift detected.** Slice 3+ planning can safely reference
the frozen vocabulary without ambiguity.

## Drift Summary Table

| Axis | Source-of-truth | All masters PASS? |
|---|---|---|
| 1. Domain count + names (14) | Step 1 frozen list | ✅ PASS |
| 2. Module count (46 + 15 = 61) | Step 1 sec 5 | ✅ PASS |
| 3. Bounded contexts (8: BC1-BC8) | Step 1 sec 5.5 | ✅ PASS |
| 4. Enterprise spines (8) | Step 1 sec 5.6 | ✅ PASS |
| 5. Root counts (52 baseline / 51 working) | Step 1 sec 6.2-6.3 | ✅ PASS |
| 6. Wave 1 root codes (18) | Step 2 sec 4.1 | ✅ PASS |
| 7. Dependency root codes (5) | Step 2 sec 4.2 | ✅ PASS |
| 8. Route grammar (6 patterns) | Step 4 master | ✅ PASS |
| 9. Route classes (9: SH/DL/ML/AC/AR/ERD/NRD/WS/SFW) | Step 6 sec 5.2 | ✅ PASS |
| 10. Authority classes (authoritative / projection) | Step 1 + Step 3 | ✅ PASS |
| 11. API family tokens (23 + spines) | Step 3 sec 12.1 | ✅ PASS |
| 12. Forbidden file list (7) | Step 8 sec 3 | ✅ PASS |

## Frozen Vocabulary Reference (for Slice 3+ planning)

### 14 Experience Domains
Commercial & Customer · Product & Process Definition · Planning & Release · Shopfloor Execution · Quality & Compliance · Supply & Supplier Quality · Inventory & Warehouse · Fulfillment & Returns · Traceability & Passport · Maintenance & Reliability · Safety/Facilities & Energy · Workforce/Documents & Training · Finance & Costing · Analytics & Platform

### 8 Bounded Contexts
1. BC1: Commercial Commitments
2. BC2: Product & Process Definition Governance
3. BC3: Planning & Release Orchestration
4. BC4: Execution & Connected Worker
5. BC5: Quality, Compliance & Knowledge Governance
6. BC6: Supply, Inventory & Fulfillment Continuity
7. BC7: Asset, Safety & Facility Operations
8. BC8: Finance & Enterprise Administration

### 8 Enterprise Spines
1. Identity & Authority
2. Workflow & Approval
3. Evidence / e-Sign / Audit
4. Master Data & Reference
5. Digital Thread / Link Graph / Genealogy
6. Event / Notification / Integration
7. Analytics / Semantic Layer
8. Instruction Runtime / Connected Worker

### 18 Wave 1 Workflow Roots
QUO · CPO · SO · PO · IREV · ECO · JO · WO · DISP · PREC · LOT · INSP · NQCASE · CAPA · BREL · CDOC · TRAIN · MWO

### 5 Dependency / Reference Roots
ITEM · CUST · SUP · EQP · MDEV

### 9 Route Classes (Step 6)
- **SH** — `/ops` shell home
- **DL** — `/ops/{domain}` domain landing
- **ML** — `/ops/{domain}/{module}` module landing
- **AC** — `/ops/records/{resource_family}` authoritative collection
- **AR** — `/ops/records/{resource_family}/{record_id}` authoritative record
- **ERD** — `/ops/records/{resource_family}/{record_id}/drafts/{draft_id}` existing-record draft
- **NRD** — `/ops/{domain}/{module}/drafts/{draft_id}` new-record draft
- **WS** — `/ops/{domain}/{module}/{workspace_family}` workspace
- **SFW** — `/ops/{domain}/{module}/{workspace_family}/{subject_type}/{subject_id}` subject-focused workspace

### 23 API Family Tokens (root families)
quotations · customer-purchase-orders · sales-orders · purchase-orders · item-revisions · engineering-changes · job-orders · work-orders · dispatch-targets · purchase-receipts · lots · inspections · nonconformance-cases · capas · batch-releases · controlled-documents · training-records · maintenance-work-orders · items · customers · suppliers · equipment · measuring-devices

### Spine Family Tokens
workflow-instances · workflow-tasks · approval-groups · work-inbox · record-annotations · attachments · evidence-records · electronic-signature-challenges · electronic-signatures · audit-events · audit-packs · record-links · genealogy-edge-facts · genealogy-graphs · as-manufactured-threads · evidence-context-graphs · notifications · webhook-subscriptions · webhook-deliveries · reconciliation-exceptions · reconciliation-jobs · jobs · export-jobs · audit-pack-jobs · packet-jobs · publication-jobs · analytics-query-jobs

### Forbidden Files (Step 8)
- `mom/styles/portal.main.css`
- `mom/styles/eqms-suite.css`
- `mom/styles/density-darkmode.css`
- `mom/scripts/portal/01-module-router.js`
- `mom/scripts/portal/02-state-auth-ui.js`
- `mom/scripts/portal/40-eqms-shell.js`
- `mom/portal.html` (exception: feature-flag insertion only)

## Recommendation

**No urgent vocabulary fix required.** Slice 3 planning can begin
immediately using the frozen vocabulary above as authoritative input.

**Nice-to-have:**
- Document the 52-vs-51 root reconciliation as a formal enterprise task.
- Maintain a single canonical vocabulary checklist for slice planning.
- Add CI check to grep for variant/abbreviated terms (NCM, NCR, INS) and
  fail if found in slice planning artifacts.

## Decision

```
VOCABULARY_DRIFT_AUDIT_PASS_NO_FIXES_REQUIRED
```
