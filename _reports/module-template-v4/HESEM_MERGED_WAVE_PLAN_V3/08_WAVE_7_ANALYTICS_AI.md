# 08_WAVE_7_ANALYTICS_AI.md

## Wave name

```text
Wave 7 — Analytics, AI, Knowledge, and Improvement (with AI Governance)
```

## Status

```text
Estimated duration: 8-16 weeks
Codex sessions: 8-16
Predecessor gate: Wave 6 PASS
Successor gate: Wave 8 begins after Wave 7 PASS
```

## Goal

Add the intelligence layer:
1. Real-time KPI dashboards (Quality Tower, Dispatch Recovery, Training Risk)
2. AI advisory features (recommend, never autonomously decide)
3. Knowledge loop (NQCASE → CAPA → Lessons Learned → Training/Document impact)
4. RCA recommendation assistant
5. Supplier risk cockpit
6. CAPA effectiveness analytics
7. Plus: KPI governance discipline (formula, source, freshness, owner, drilldown)

**KEY GUARDRAIL**: AI advisory only. Per RULE-2 (8 banned autonomous regulated decisions).

## Why this wave matters

Modern manufacturing platforms differentiate via AI/analytics. Without Wave 7:
- HESEM is a record-keeping system, not a decision-support system
- Compliance posture lacks AI governance evidence
- Customer ROI claim ("our AI saves you 30% time on RCA") unsupported
- Competitive positioning vs SAP+Joule / Oracle Analytics / Veeva analytics weak

WITH Wave 7 + AI governance enforced:
- Demo-able AI value
- Audit-ready AI evidence (model version, input hash, human override)
- Clear regulatory boundary

## AI Governance Rule (FROZEN per RULE-2)

```
AI MAY:
  - recommend
  - rank candidates
  - score risk
  - cluster similar records
  - surface anomalies
  - draft text for human review
  - extract structured data from free text

AI MUST NOT autonomously:
  - release a lot
  - approve a disposition
  - close a CAPA
  - release a controlled document (revision)
  - release an ECO
  - certify training as complete
  - qualify a supplier
  - decide a recall or field action
```

Every AI feature must have:
- Input references logged
- Model version captured
- Confidence reported
- Explanation rendered (if explainable model)
- Human decision captured
- Override reason captured (if user disagrees with AI)
- Audit trail of (input, model, output, human action)

This is the **regulated-industry-friendly AI governance posture** that makes HESEM defensible.

## Entry criteria

```text
[ ] Wave 6 returned PASS_READY_FOR_WAVE_7
[ ] All 18 Wave 1 roots have record shells (or workspace if WS root)
[ ] Cross-record link chain end-to-end
[ ] HMV4_LIVE_API_RESOURCE_REGISTRY covers 18 roots in Stage 2
```

## Exit criteria

```text
[ ] Quality Tower analytics workspace landed
[ ] Dispatch Recovery analytics landed
[ ] Training Risk analytics landed
[ ] CAPA Effectiveness analytics landed
[ ] OEE / Downtime analytics scaffolding (uses dummy data; full data flow Wave 9)
[ ] AI Advisory Shell pattern landed (input/model/confidence/explanation/decision)
[ ] RCA Recommendation Assistant prototype landed
[ ] Supplier Risk Cockpit landed
[ ] Lessons Learned knowledge base scaffolded
[ ] AI Governance ADR (ADR-0022) frozen
[ ] All AI features have evidence trail
[ ] No regulated decision automated
```

## Work packages

### WP7.1 — Analytics read-models architecture

ADR-0022 Read-Model Pattern for Analytics:
- Backend computes from authoritative sources (BREL, CAPA, NC, INSP, etc.)
- Frontend renders projections only
- No mutation possible from analytics surface
- Refresh cadence (real-time, hourly, daily) per KPI

### WP7.2 — Quality Tower analytics workspace

Route: `/ops/quality-compliance/quality-tower/dashboard`
Pattern: WS projection
Renders:
- Open NC count by severity
- CAPA aging by state
- Disposition mix (use-as-is, rework, scrap, RTV)
- NC source by category
- 30/60/90/365-day trends
- Drilldown to authoritative records

### WP7.3 — Dispatch Recovery analytics

Route: `/ops/planning-scheduling/dispatch-recovery/board`
Pattern: WS projection
Renders:
- Behind-schedule WOs
- Resource bottleneck identification
- Recommended next dispatch (AI advisory)

### WP7.4 — Training Risk analytics

Route: `/ops/people-skill-ehs/training-risk/dashboard`
Pattern: WS projection
Renders:
- Operators with expiring qualifications (next 30 days)
- Operators with training gaps for assigned WOs
- Predicted capability shortage in next 30/60/90 days
- AI risk score (advisory)

### WP7.5 — CAPA Effectiveness analytics

Pattern: WS projection
Renders:
- CAPA closure aging
- Effectiveness check pass rate
- Recurrence rate (NCs reopened post-CAPA-close)
- Per-cause-category effectiveness

### WP7.6 — AI Advisory Shell pattern

ADR-0023 AI Advisory UI Component Contract:
- Input panel (what AI considered)
- Model panel (model name, version, training date)
- Output panel (recommendations with confidence)
- Explanation panel (why this recommendation)
- Action panel (human decides; AI does not)
- Override panel (if human disagrees, capture reason)

Render examples:
- RCA Recommendation: "Based on similar past NCs, root cause likely 'training gap' (78% confidence)"
- Dispatch Recovery: "Recommend dispatching WO-3014 next instead of WO-3015 because operator OP-1004 has higher first-time-pass rate on this part type"

### WP7.7 — RCA Recommendation Assistant

Inputs: NC record (description, characteristic, severity)
Output: Top 3 candidate root causes with similar past NCs cited
Confidence: based on text similarity + outcome correlation

ADR-0024 RCA Recommendation Model

### WP7.8 — Supplier Risk Cockpit

Route: `/ops/supply-supplier-quality/supplier-cockpit/dashboard`
Pattern: WS projection
Renders:
- Per-supplier NC rate
- Per-supplier on-time delivery
- SCAR aging
- Per-supplier audit readiness
- Risk score (AI advisory)

### WP7.9 — Lessons Learned knowledge base

Pattern: AR + WS hybrid
- AR shell per Lesson record (LESSON-2026-001)
- WS workspace for browsing lessons by tag
- Tied to NC/CAPA/ECO records as extraction source

ADR-0025 Knowledge Base Pattern

### WP7.10 — KPI governance register

Per KPI documented:
- Formula
- Source authority (which root contributes)
- Freshness (real-time / hourly / daily / monthly)
- Owner role (who's accountable for KPI)
- Drilldown route (where user clicks for details)
- Target value
- Alert threshold

Output: `_reports/module-template-v4/HMV4_KPI_GOVERNANCE_REGISTER.md`

### WP7.11 — Wave 7 integration QA + AI governance audit

Verify each AI feature:
1. Has input log
2. Has model/version capture
3. Has explanation
4. Has human decision capture
5. Has override capture
6. NO autonomous regulated decisions per RULE-2

Output: `_reports/module-template-v4/V27_WAVE_7_AI_GOVERNANCE_AUDIT.md`

Decision phrase:
```text
WAVE_7_ANALYTICS_AI_PASS_READY_FOR_WAVE_8
WAVE_7_ANALYTICS_AI_PASS_WITH_WARNINGS
WAVE_7_ANALYTICS_AI_FAIL_BLOCK_NEXT
WAVE_7_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT  (special: any AI feature exceeds RULE-2)
```

## Workload estimate

```text
Codex sessions: 8-16
  Session 1: WP7.1 read-model architecture + ADR-0022 — 3 hr
  Session 2: WP7.2 Quality Tower — 3 hr
  Session 3: WP7.3 Dispatch Recovery — 2 hr
  Session 4: WP7.4 Training Risk — 2 hr
  Session 5: WP7.5 CAPA Effectiveness — 2 hr
  Session 6: WP7.6 AI Advisory Shell + ADR-0023 — 4 hr
  Session 7: WP7.7 RCA Recommendation Assistant — 4 hr
  Session 8: WP7.8 Supplier Risk Cockpit — 3 hr
  Session 9: WP7.9 Lessons Learned KB — 3 hr
  Session 10: WP7.10 KPI governance register — 2 hr
  Session 11: WP7.11 governance audit — 2 hr

Human review: 5-15 days (AI features need careful review)
Calendar elapsed: 8-16 weeks
```

## Allowed files

```text
mom/scripts/portal/73-module-template-v4-renderers.js (analytics workspaces + AI advisory shell)
mom/scripts/portal/72-module-template-v4-bridge.js (analytics aliases)
mom/scripts/portal/70-module-template-v4-hydration.js (read-model fetch adapter)
tests/e2e/module-template-v4*.spec.ts (analytics + AI advisory tests)
tests/fixtures/module-template-v4/<analytics>-fixtures.json
tests/fixtures/module-template-v4/pages/workspace-quality-tower*.html
tests/fixtures/module-template-v4/pages/workspace-dispatch-recovery*.html
tests/fixtures/module-template-v4/pages/workspace-training-risk*.html
tests/fixtures/module-template-v4/pages/workspace-capa-effectiveness*.html
tests/fixtures/module-template-v4/pages/workspace-supplier-cockpit*.html
tests/fixtures/module-template-v4/pages/workspace-rca-assistant*.html
tests/fixtures/module-template-v4/pages/workspace-lessons-learned*.html
docs/adr/0022-read-model-pattern.md
docs/adr/0023-ai-advisory-ui-component.md
docs/adr/0024-rca-recommendation-model.md
docs/adr/0025-knowledge-base-pattern.md
_reports/module-template-v4/HMV4_KPI_GOVERNANCE_REGISTER.md
_reports/module-template-v4/V27_WAVE_7_AI_GOVERNANCE_AUDIT.md
_reports/module-template-v4/V27_WAVE_7_INTEGRATION_REPORT.md
```

## Forbidden

```text
Any AI feature that autonomously:
  - releases a lot (BREL)
  - approves a disposition (NQCASE)
  - closes a CAPA
  - releases ECO
  - releases CDOC
  - certifies training
  - qualifies supplier
  - decides recall
Forbidden file
HMV4_PREVIEW_ENABLED / LIVE_API defaults change
mom/qms-data/**
3rd-party AI service calls without explicit fixture / mocked response
```

## Per-rule compliance

- **RULE-1**: Analytics use Stage 2 fixture/live; no Stage 3
- **RULE-2**: AI Governance — 8 banned autonomous decisions strictly enforced; audit per WP7.11
- **RULE-3**: Pre-production wording
- **RULE-4**: 8 standard artifacts
- **RULE-5**: Wave 6 must PASS
- **RULE-6**: 15-question checklist + AI governance audit
- **RULE-7**: V27 / S_WAVE7_* naming
- **RULE-8**: Read-only analytics + advisory; mutation never auto

## Decision phrase

```text
WAVE_7_ANALYTICS_AI_PASS_READY_FOR_WAVE_8
WAVE_7_ANALYTICS_AI_PASS_WITH_WARNINGS
WAVE_7_ANALYTICS_AI_FAIL_BLOCK_NEXT
WAVE_7_AI_GOVERNANCE_VIOLATION_BLOCK_NEXT
```

```
WAVE_7_PLAN_BASELINE_LOCKED
```
