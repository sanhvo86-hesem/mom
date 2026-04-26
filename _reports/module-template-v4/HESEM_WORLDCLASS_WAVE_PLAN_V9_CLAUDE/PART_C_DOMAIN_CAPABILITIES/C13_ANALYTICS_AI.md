# C13 — Analytics & AI

```
domain_code:    D-13
domain_name:    Analytics & AI
owner_role:     Data Platform Lead + AI Lead (joint)
primary_state_machine: (none specific; data products and ML models)
```

---

## 1. Purpose

The Analytics & AI domain owns insight. It computes operational metrics,
provides analytic data products, hosts AI advisory features. This domain
is governed by a strict discipline: AI is advisory only. The eight
banned regulated decisions (PART_L) are never executed by AI without
human authority.

---

## 2. The roots within this domain

```
OEE Analytics              Equipment performance computed from MES events.
Quality Analytics          Defect trends, FPY, COPQ trends.
Throughput Analytics      Production rate, schedule attainment.
Predictive Maintenance     ML model that predicts equipment failure.
   Model
AI Advisory Feature       The discrete advisory feature exposed to users
                           (e.g., NC similarity cluster, CAPA root-cause
                           candidate ranking).
Data Product              The contract-bound, freshness-controlled data
                           sets exposed for analytic and BI use.
Decision Record           The per-AI-advisory-call record of input,
                           output, confidence, human decision, override.
```

---

## 3. The capabilities within this domain

### CAP-C13-01 — OEE Analytics Data Product

**Purpose.** Compute Overall Equipment Effectiveness from PackML state
events and production count events. Provide per-equipment-per-shift,
per-day, per-month aggregations.

**Source.** Edge Gateway (CAP-C6-10), OEE Event (CAP-C6-08).

**Wave target.** L4 by W8.

### CAP-C13-02 — Quality Analytics Data Product

**Purpose.** Quality KPIs: First Pass Yield, Cost of Poor Quality,
defect Pareto, supplier Pareto, complaint trends, CAPA effectiveness.

**Wave target.** L4 by W8.

### CAP-C13-03 — Throughput Analytics Data Product

**Purpose.** Production rate, schedule attainment, capacity utilization,
constraint analysis.

**Wave target.** L4 by W8.

### CAP-C13-04 — Predictive Maintenance ML Feature

**Purpose.** Predict equipment failure based on telemetry, historical
maintenance data, and reliability models. Output: probability of
failure within next 7 / 14 / 30 days.

**Discipline.** This is a Tier-2 AI feature per NIST AI RMF. Output is
advisory; recommendation appears in the maintenance planner's workspace.
Maintenance planner decides whether to schedule MWO. AI does not auto-
schedule (BD-7-adjacent: not banned per V3 RULE-2 since maintenance
isn't one of the 8, but discipline is similar).

**Wave target.** L4 by W7 (initial); L5 by W7.

### CAP-C13-05 — Nonconformance Similarity Clustering AI Advisory

**Purpose.** When a new NC is opened, AI advisory clusters it with
similar prior NCs to suggest root cause categories and prior CAPAs that
may apply.

**Discipline.** Tier-2 NIST AI RMF. Advisory only. Investigator reads,
agrees / disagrees, acts. AI does not act.

**Wave target.** L4 by W6.5; L5 by W6.5.

### CAP-C13-06 — CAPA Root-Cause Candidate Ranking AI Advisory

**Purpose.** Suggest ranked list of likely root causes based on the NC
description, the affected lot, the equipment, and prior CAPAs.

**Discipline.** Tier-2 NIST AI RMF. Advisory only. Banned: closing CAPA
autonomously (BD-3).

**Wave target.** L4 by W6.5; L5 by W6.5.

### CAP-C13-07 — CDOC Suggested Reviewer AI Advisory

**Purpose.** Suggest the most appropriate document reviewer based on
document content, reviewer expertise, and prior assignments.

**Discipline.** Tier-1 NIST AI RMF (lower risk; advisory). Banned:
releasing CDOC autonomously (BD-4).

**Wave target.** L4 by W6.5.

### CAP-C13-08 — Complaint NLP Classification AI Advisory

**Purpose.** When a customer complaint arrives in free text, AI
classifies it into defect mode, product family, urgency tier, and
suggests reportability evaluation.

**Discipline.** Tier-2 NIST AI RMF. Advisory only. Banned: deciding
recall (BD-8).

**Wave target.** L4 by W7.

### CAP-C13-09 — RAG-Powered SOP Search

**Purpose.** Operators or QA engineers can ask "what does our SOP say
about X?" — AI retrieves relevant CDOC sections with citations.

**Discipline.** Tier-1 NIST AI RMF. RAG (retrieval-augmented generation)
with citation grounding. Ungrounded responses rejected.

**Wave target.** L4 by W7.

### CAP-C13-10 — Generative Drafting (CAPA initial draft, complaint response)

**Purpose.** AI drafts initial CAPA investigation report or complaint
response based on the input data.

**Discipline.** Tier-2 NIST AI RMF. Draft only; human reviews and edits.

**Wave target.** L4 by W7.

### CAP-C13-11 — Data Product Catalog & Contract Management

**Purpose.** Maintain the registry of data products, their contracts
(source, grain, freshness, DQ rules, owner, consumers), and the
deprecation lifecycle.

**Wave target.** L4 by W6; L5 by W8.

### CAP-C13-12 — AI Decision Record (per advisory call)

**Purpose.** Per AI advisory call, record the input, output, confidence,
abstain flag, model identity, and (when human acts) the human decision
and override reason.

**Wave target.** L4 by W6.5; L5 by W6.5.

---

## 4. Workflows

Participant in: D6 NC to CAPA (NC similarity, root-cause ranking),
D7 Document to Release (suggested reviewer), D9 Maintain to Restore
(predictive maintenance), D12 Complaint to Recall (complaint NLP).

---

## 5. APIs

```
- OEE Analytics API (data product)
- Quality Analytics API (data product)
- Throughput Analytics API (data product)
- Predictive Maintenance API
- AI Advisory Invocation API (per feature)
- Data Product Catalog API
- AI Decision Record API
- Model Card API (read-only)
- Override Capture API
```

---

## 6. Frontend surfaces

```
- OEE Dashboard
- Quality Dashboard
- Throughput Dashboard
- Predictive Maintenance Workspace (advisory feed in maintenance UI)
- AI Advisory Inline (in NC, CAPA, CDOC, Complaint workspaces)
- AI Acceptance-Rate Dashboard (governance)
- Data Product Catalog Workspace
- Model Card Browser
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on every AI decision record
- C8 Observability per AI inference call
- C9 Performance budget on inference (typically p95 < 200ms)
- C11 AI Advisory Governance (governs everything in this chapter)

---

## 8. Wave assignments

```
OEE Analytics                   L4 W8
Quality Analytics                L4 W8
Throughput Analytics             L4 W8
Predictive Maintenance ML        L4 W7; L5 W7
NC Similarity AI                 L4 W6.5; L5 W6.5
CAPA Root-Cause AI               L4 W6.5; L5 W6.5
CDOC Reviewer AI                 L4 W6.5
Complaint NLP AI                 L4 W7
RAG SOP Search                   L4 W7
Generative Drafting              L4 W7
Data Product Catalog             L4 W6; L5 W8
AI Decision Record               L4 W6.5; L5 W6.5
```

---

## 9. Standards

```
- NIST AI Risk Management Framework 1.0 + NIST AI 600-1 (Generative AI Profile)
- ISO/IEC 42001:2023 (AI management system)
- ISO/IEC 23894:2023 (AI risk management)
- EU AI Act (Regulation EU 2024/1689)
- OWASP Top 10 for LLM Applications (2024)
- OWASP Top 10 for Machine Learning (2023)
- IEEE 7000 series (ethical AI)
- MITRE ATLAS (adversarial threat model)
- ISO 22400 (KPI for manufacturing)
- DAMA Data Management Body of Knowledge (data products)
```

---

## 10. Boundary with adjacent domains

This domain touches every domain (analytics derives from every domain's
data; AI features serve specific domain workflows).

- D-06 Production: OEE source; predictive maintenance feeds maintenance.
- D-07 Quality: NC clustering, CAPA root-cause, CDOC reviewer suggestions
  are all advisory features for Quality.
- D-09 Maintenance: Predictive maintenance feeds maintenance planner.
- D-12 Integration: Schema registry (CAP-C12-09) registers data product
  schemas.

---

## 11. Decision phrase

```
C13_ANALYTICS_AI_BASELINE_LOCKED
NEXT: C14_CORE_PLATFORM.md
```
