# 04_WAVE_3_WORKFORCE_MAINTENANCE.md

## Wave name

```text
Wave 3 — Workforce, Maintenance, and Connected Worker Readiness
```

## Status

```text
Estimated duration: 2-5 weeks
Codex sessions: 4-8
Predecessor gate: Wave 2 PASS
Successor gate: Wave 4 begins after Wave 3 PASS
```

## Goal

Build the role/device/task surfaces required for credible MOM/MES claim.

Wave 1 (Slice 3) shipped Training Matrix workspace. This wave deepens it and adds:
1. Maintenance Work Order (MWO) record shell — RED root from Wave 1; needs frontend even though backend deferred to Wave 5/6
2. Asset Readiness workspace
3. Connected Worker Queue workspace
4. Operator Mobile Console (PWA)
5. Training Matrix hardening (workspaces extended)

This wave introduces **mobile/PWA** discipline (RULE-1 stage-1 fixture mode for mobile too).

## Why this wave matters

A strong MOM/MES product must support shopfloor work, not only management dashboards.

Without Wave 3:
- HESEM looks like an "office system" not a manufacturing platform
- Operator UX claims unsupported by evidence
- Mobile/PWA strategy unverified
- Connected Worker positioning weak

## Entry criteria

```text
[ ] Wave 2 returned PASS_READY_FOR_WAVE_3
[ ] All 6 governed record shells QA passed
[ ] Cross-record link audit passed
[ ] Pattern Registry stable
```

## Exit criteria

```text
[ ] MWO record shell prototype landed (fixture-only; backend deferred)
[ ] Asset Readiness workspace landed
[ ] Connected Worker Queue workspace landed
[ ] Operator Mobile Console (PWA shell) landed
[ ] Training Matrix workspace hardened (additional fixture states)
[ ] All 5 surfaces have visual baselines on 3 browsers
[ ] All 5 surfaces pass axe-core a11y AA
[ ] Mobile viewport visual baselines captured (375×812 iPhone, 390×844 iPhone, 414×896, 360×800 Android)
[ ] No mutation introduced
```

## Work packages

### WP3.1 — MWO record shell (Slice — Wave 3 first)

**Pattern**: AR transactional/maintenance
**Route**: `/ops/records/maintenance-work-orders/MWO-2026-101`
**Tabs**: overview | scope | linked-asset | parts-required | execution-log | linked-records | audit
**Lifecycle**: open → planned → in-progress → completed → closed
**Bridge alias**: `mwo`, `maintenance-work-order`

**Required attributes**:
```
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="maintenance-work-orders"
data-root-code="MWO"
```

**Disabled mutation intents** (RULE-1 stage 1):
```
mwo-plan, mwo-start, mwo-pause, mwo-complete, mwo-close, mwo-esign
```

**Fixture data** (sample):
```json
{
  "MWO-2026-101": {
    "title": "Preventive maintenance on CMM-Z1",
    "type": "preventive",
    "asset": "CMM-Z1",
    "scheduledDate": "2026-04-30",
    "scopeOfWork": "Quarterly calibration check + lubrication + axis travel verification",
    "partsRequired": [{ "code": "LUB-200", "qty": 2, "lot": "LOT-LUB-2026-Q1" }],
    "executionLog": [],
    "relatedRecords": [
      { "resourceFamily": "equipment", "recordId": "CMM-Z1", "label": "CMM-Z1 (Zeiss Contura)" }
    ]
  }
}
```

**Backend note**: MWO is C.4 RED root. Wave 3 lands frontend only. Backend creation deferred to Wave 6/9.

### WP3.2 — Asset Readiness Workspace

**Route**: `/ops/maintenance-reliability/asset-readiness/board`
**Pattern**: WS projection
**Renders**:
- Equipment list with current status (running/idle/maintenance/down)
- Open MWO links per equipment
- OEE-equivalent indicators (per-equipment availability)
- Calibration overdue indicator (placeholder until CAL root in Wave 9)
- Block-by reasons

**Backed by**: Joins MWO fixtures + equipment fixture data

### WP3.3 — Connected Worker Queue Workspace

**Route**: `/ops/shopfloor-execution/connected-worker-andon/queue`
**Pattern**: WS projection
**Renders**:
- Per-operator assigned WOs (filtered by current shift)
- Dispatch readiness indicator
- Quality gate warnings (open NC for this operator's WOs)
- Training-readiness indicator (operator qualifications expiring/expired for assigned WO)
- Instruction version visibility

**Cross-references**:
- Operator → TR record (training)
- WO → INSP (quality gate)
- WO → DISP (dispatch readiness)

### WP3.4 — Operator Mobile Console (PWA shell)

**Pattern**: Mobile-first WS workspace
**Route**: `/ops/mobile/operator-console`
**Viewport**: 375×812 (iPhone) primary; 360×800 Android secondary

**Features (read-only stage 1)**:
- My WOs list
- Touch-friendly card UI
- Scan barcode placeholder (camera API stubbed in fixture)
- View work instructions (pulled from CDOC fixture)
- Andon button (disabled with intent attr)
- Offline indicator

**ADR required**: ADR-0016 Mobile slice contract (touch targets, viewport, offline-first)
**ADR required**: ADR-0017 Offline-first sync queue contract (deferred wave; design only)

### WP3.5 — Training Matrix workspace hardening

Extend existing renderTrainingMatrixWorkspace from Slice 3:
- Add filter UI for status (qualified/expiring/expired/in-training/not-required)
- Add filter UI for team
- Add filter UI for role
- Add filter UI for qualification
- Open record link per cell (already exists; verify)
- Mobile viewport variant

### WP3.6 — Cross-browser + mobile visual baselines

For all 5 new surfaces × 4 viewports × 3 browsers:
- Desktop chromium (1920×1080)
- iPhone chromium (375×812)
- Tablet chromium (768×1024)
- Desktop firefox (1920×1080)
- Desktop webkit (1920×1080)

Capture baselines via `--update-snapshots` per browser/device.

### WP3.7 — Wave 3 integration report

```text
V23_WAVE_3_INTEGRATION_REPORT.md
```

Decision phrase:
```text
WAVE_3_WORKFORCE_MAINTENANCE_PASS_READY_FOR_WAVE_4
WAVE_3_WORKFORCE_MAINTENANCE_PASS_WITH_WARNINGS
WAVE_3_WORKFORCE_MAINTENANCE_FAIL_BLOCK_NEXT
```

## Workload estimate

```text
Codex sessions: 4-8
  Session 1: WP3.1 MWO record shell — 3 hr (frontend only; no backend)
  Session 2: WP3.2 Asset Readiness workspace — 3 hr
  Session 3: WP3.3 Connected Worker Queue — 3 hr
  Session 4: WP3.4 Operator Mobile Console — 4 hr (with mobile viewport handling)
  Session 5: WP3.5 Training Matrix hardening — 2 hr
  Session 6: WP3.6 multi-viewport baselines — 2 hr
  Session 7: WP3.7 integration report — 1 hr

Human review: 2-5 days (mobile UX requires more eyes)
Calendar elapsed: 2-5 weeks
```

## Allowed files

```text
mom/scripts/portal/73-module-template-v4-renderers.js (extend with 4 new renderers)
mom/scripts/portal/72-module-template-v4-bridge.js (mwo, asset, connected-worker aliases)
mom/scripts/portal/70-module-template-v4-hydration.js (mobile viewport awareness; no live-api yet)
mom/styles/module-template-v4.css (extend for mobile-only classes; no forbidden CSS)
tests/e2e/module-template-v4*.spec.ts (extend coverage including mobile viewport)
tests/fixtures/module-template-v4/<resource>-record-fixtures.json (NEW × 1 MWO + workspaces)
tests/fixtures/module-template-v4/pages/authoritative-record-shell-mwo-*.html (NEW × 9)
tests/fixtures/module-template-v4/pages/workspace-asset-readiness*.html (NEW × 5)
tests/fixtures/module-template-v4/pages/workspace-connected-worker*.html (NEW × 5)
tests/fixtures/module-template-v4/pages/mobile-operator-console*.html (NEW × 5)
tests/fixtures/module-template-v4/pages/workspace-training-matrix-*.html (extend)
tests/e2e/module-template-v4-visual.spec.ts-snapshots/ (mobile + cross-browser PNGs)
docs/adr/0013-mobile-slice-contract.md (NEW)
docs/adr/0014-offline-first-sync-queue.md (NEW; design only, no impl yet)
_reports/module-template-v4/S_WAVE3_*.md (per-WP reports)
_reports/module-template-v4/V23_WAVE_3_INTEGRATION_REPORT.md
```

## Forbidden

```text
Any forbidden file
Any backend creation (MWO backend deferred)
Live-API graduation (still Wave 4 scope)
Mutation execution
Production wording
```

## Per-rule compliance

- **RULE-1**: All 5 new surfaces stay Stage 1 (fixture-only)
- **RULE-2**: No AI yet
- **RULE-3**: Pre-production wording
- **RULE-4**: 8 standard artifacts per surface
- **RULE-5**: Wave 2 must PASS
- **RULE-6**: 15-question checklist
- **RULE-7**: S_<slice>_<scope> naming
- **RULE-8**: No mutation

## Decision phrase

```text
WAVE_3_WORKFORCE_MAINTENANCE_PASS_READY_FOR_WAVE_4
WAVE_3_WORKFORCE_MAINTENANCE_PASS_WITH_WARNINGS
WAVE_3_WORKFORCE_MAINTENANCE_FAIL_BLOCK_NEXT
```

```
WAVE_3_PLAN_BASELINE_LOCKED
```
