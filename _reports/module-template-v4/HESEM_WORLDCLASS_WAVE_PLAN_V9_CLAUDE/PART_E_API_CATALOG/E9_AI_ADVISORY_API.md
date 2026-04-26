# E9 — AI Advisory API

```
api_family:     AI Advisory
owner_role:     AI Lead
scope:          Inference invocation; decision recording;
                model card retrieval
```

---

## 1. Purpose

The AI Advisory API exposes the AI advisory features per PART_C13.
Every invocation produces an AI Decision Record. RULE-2 (banned
decisions) is enforced at this boundary.

---

## 2. Endpoints

### E9.1 — Invoke advisory feature

**Purpose**: Submit an input to an AI advisory feature; receive a
recommendation with confidence.

**Audience**: UI surfaces (NC workspace, CAPA workspace, CDOC workspace,
Complaint workspace, Maintenance dashboard, etc.).

**Request**: Feature id (e.g., "nc.similarity_cluster"), input
references (e.g., NC id), context.

**Success**: Recommendation envelope with: feature id, model name +
version, trained_at timestamp, confidence score (0-1), abstain flag,
output payload, explanation (when supported).

**Failure modes**:
- ai/advisory-not-available       (feature down or not enabled for tenant)
- ai/confidence-below-threshold    (below per-feature threshold; abstain)
- ai/banned-decision-attempted     (caller tried to use AI for banned decision; SEV-0)
- ai/red-team-block                (feature blocked from red-team finding)

**Idempotency**: idempotency-key recommended (re-submission returns
same recommendation if input identical).

**Performance**: per-feature SLO (typically p95 < 200 ms).

### E9.2 — Capture human decision (override capture)

**Purpose**: Record the human's decision after seeing an advisory:
accepted, rejected, modified, or ignored. Also capture override reason
when rejected.

**Audience**: UI surfaces after user interaction.

### E9.3 — Retrieve decision record

**Purpose**: Retrieve a specific AI decision record.

**Audience**: Compliance team, audit pack generator.

### E9.4 — List decisions for a record

**Purpose**: Retrieve all AI decision records for a target record.

### E9.5 — Acceptance rate metrics (per feature)

**Purpose**: Retrieve the acceptance rate KPI for a feature over a
period.

**Audience**: AI Lead, governance review.

### E9.6 — Model card retrieval

**Purpose**: Retrieve the model card for a specific model version.

**Audience**: Compliance team, regulators, customers.

### E9.7 — Red-team report retrieval

**Purpose**: Retrieve quarterly red-team reports per feature.

**Audience**: Security Lead, AI Lead, regulators.

---

## 3. Authentication and authorization

Authenticated session required. Some endpoints (E9.5, E9.6, E9.7)
require AI Governance role.

---

## 4. Failure modes

The full AI category of problem-detail types applies (per E9.1).

---

## 5. Wave target

L4 by W6.5; L5 by W6.5.

---

## 6. Decision phrase

```
E9_AI_ADVISORY_API_BASELINE_LOCKED
NEXT: E10_NOTIFICATION_API.md
```
