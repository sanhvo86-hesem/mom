# 01_OPERATING_SYSTEM_ARCHITECTURE_DEEPENED.md

## Purpose

GPT Pro V4 §03 declares a **5-layer Target Operating Model**:

```text
L1 Authority & Governance
L2 Process & Workflow
L3 Data & Digital Thread
L4 Experience
L5 Platform
```

V4 then asserts: *"Every Wave must touch at least L1 + one of L2/L3/L4, and may extend L5."*

The rule is **correct in spirit but underspecified in substance**. It does not tell an engineer:

1. What lives in each layer (responsibilities, *not* names)
2. What the *contract* between two adjacent layers is
3. Which **cross-cutting concerns** thread vertically through all five layers and have nowhere to live in V4
4. How an Operational Truth Graph (OTG) edge is enforced when it crosses layer boundaries
5. How a slice's wave compliance is *measured* per layer

This file deepens V4's 5 layers into **8 layers + 12 cross-cuttings = 20 architectural coordinates per slice**, and specifies for each:

- **Responsibility** — what is true here that is true nowhere else
- **Authority owner** — which authority class (per §05 8-class taxonomy) lives at this layer
- **Public contract** — what the layer above expects, expressed in OpenAPI 3.1.1 / AsyncAPI 2.6 / SQL DDL terms
- **Forbidden coupling** — what this layer must *not* know about
- **Observability surface** — what spans, metrics, log events the layer emits (per OpenTelemetry semantic conventions)
- **Failure mode** — what happens when this layer is degraded, and what the layer above is allowed to assume
- **OTG integration** — what nodes/edges/events this layer reads or writes
- **Validation footprint** — IQ/OQ/PQ surface area for regulated verticals

The result: a slice cannot claim a wave milestone without producing evidence at *every* relevant coordinate.

---

## Section 1 — From V4's 5 layers to V5's 8 layers

V4's collapse of "Process & Workflow" into a single L2 hides a real distinction that bites in production. V4's "Platform" L5 is too coarse to host the security, reliability, and AI/ML duties that real platforms carry. V5 splits both.

### Mapping table

| V5 Layer | Maps from V4 | Why split |
|---|---|---|
| **L1 — Identity, Authority, Authorization** | L1 (subset) | RBAC/ABAC + tenant identity is its own discipline |
| **L2 — Governance, Compliance, Validation** | L1 (subset) | 21 CFR Part 11 / GxP / SOC 2 evidence is not the same as RBAC |
| **L3 — Process, Workflow, State Machines** | L2 | The 8 coupled state machines (per master thesis §5) live here |
| **L4 — Domain Model & Authority Records** | L3 (subset) | Authoritative roots and the OTG node table belong here |
| **L5 — Data Engineering & Digital Thread** | L3 (subset) | OTG edges, projections, derived models, lineage live here |
| **L6 — Experience & Interaction** | L4 | Workspace/Record-shell/Dialog rendering, UX state machines |
| **L7 — Integration, API, External Surface** | L5 (subset) | OpenAPI 3.1.1, RFC 9457, AsyncAPI 2.6, eIDAS, FHIR-style surface |
| **L8 — Platform, Runtime, SRE, Observability** | L5 (subset) | Kubernetes/HA/DR/OTel/Prometheus/Loki/Jaeger live here |

The split is **non-negotiable** because each new layer holds at least one **distinct authority class** (per master thesis §5 8-class taxonomy):

```text
L1  → identity_principal, role_assignment, tenant_membership
L2  → policy_directive, validation_evidence, audit_chain_anchor
L3  → workflow_event, transition_attempt, state_machine_definition
L4  → authoritative_root
L5  → projection_workspace, derived_read_model, otg_edge, otg_event
L6  → ui_render_state, surface_intent_log
L7  → external_request, external_response, replay_protection_token
L8  → telemetry_span, metric_sample, log_event, trace_link, slo_breach_event
```

If a feature touches a record class that doesn't exist in any layer, the feature is **architecturally illegal** until the missing class is named, owned, and added to the OTG vocabulary.

---

## Section 2 — The 12 cross-cuttings

V4 mentions security, telemetry, audit, AI advisory once each as side-comments. V5 promotes them to first-class **vertical concerns** that thread through *all 8 layers* and that every slice must satisfy.

| Cross-cutting | Threads through | Mandatory artifact |
|---|---|---|
| **C1 Audit chain** | L1→L8 | Hash-chained append-only `audit_event` per mutation |
| **C2 e-Signature** | L1, L2, L3 | 21 CFR Part 11 e-sign evidence per regulated transition |
| **C3 i18n / l10n** | L4, L5, L6 | ICU MessageFormat 2 + locale-tagged content |
| **C4 Tenant isolation** | L1, L4, L5, L7 | `tenant_id` in every row + middleware enforcement |
| **C5 Idempotency** | L3, L7 | `Idempotency-Key` header per RFC, server-side replay log |
| **C6 Concurrency / optimistic locking** | L4, L7 | `version` column + `If-Match` ETag |
| **C7 Problem Details** | L3, L7 | RFC 9457 envelope per error, with stable `type` URIs |
| **C8 Observability** | L1→L8 | OpenTelemetry trace, baggage, semantic conventions |
| **C9 Performance budget** | L4→L8 | p50/p95/p99 latency + payload size budget per route |
| **C10 Data retention / WORM** | L2, L4, L5 | Per-class retention policy + S3 Object Lock for evidence |
| **C11 AI advisory governance** | L2, L3, L6 | Banned-decisions list + decision-record per advisory call |
| **C12 Accessibility** | L6 | WCAG 2.2 AA per surface + axe-core CI gate |

Each cross-cutting has its own **gate** in the V5 wave plan (per file `12_QUALITY_GATES.md` to be added), and each has a per-layer **evidence requirement**.

---

## Section 3 — Layer-by-layer deep specification

The remainder of this file is the engineering substance V4 §03 omits. Each section below specifies one layer.

---

### L1 — Identity, Authority, Authorization

**Responsibility.** Answer two questions on every request:

1. *Who is acting?* (authentication: identity_principal)
2. *Are they allowed to perform this action on this resource in this tenant right now?* (authorization: ABAC over RBAC over tenant)

L1 does **not** know what the action means. It does not know workflow state, GxP rules, or business context. It returns a boolean and a reason code.

**Authority owner.**

```text
identity_principal       — keycloak / OIDC issuer
role_assignment          — role_membership table
tenant_membership        — tenant_user table (with hire_date, termination_date)
permission_grant_cache   — Redis with 60s TTL
```

**Public contract (toward L2 governance).**

```http
POST /internal/auth/decide HTTP/1.1
Authorization: Bearer <jwt>
X-HESEM-Tenant: <tenant_uuid>
Content-Type: application/json

{
  "subject": {"principal_id": "...", "session_id": "..."},
  "action":  {"verb": "approve_release", "resource_family": "BREL"},
  "resource": {"resource_id": "...", "tenant_id": "...", "lifecycle_state": "..."},
  "context": {"ip": "...", "user_agent": "...", "amr": ["pwd","totp"]}
}

200 OK
{
  "decision": "permit | deny | not_applicable | indeterminate",
  "obligations": [
    {"type":"esign_required","factor":"totp+pwd","reason":"21 CFR Part 11 §11.10"},
    {"type":"reason_for_change_required"}
  ],
  "policy_chain": ["pol-erp-rbac-v3","pol-21cfr11-esign-v1"],
  "decision_id": "...",
  "ttl_ms": 60000
}
```

**Forbidden coupling.** L1 must not call L3, L4, or L5. It may read its own tables and Redis only. A workflow rule that needs domain knowledge (e.g., "lot is on hold for stability") does not live in L1 — it lives in L3 *and* is encoded as an L1 *obligation*.

**Observability surface.**

```text
spans:
  auth.decide                      attributes: subject.principal_id, action.verb,
                                                resource.family, decision, policy_chain[]
  auth.token.verify                attributes: jwt.iss, jwt.aud, jwt.exp_drift_ms
metrics:
  auth_decisions_total             labels: decision, reason
  auth_latency_ms_bucket           Histogram (p50<5ms target, p95<20ms)
  auth_session_concurrent          Gauge
log events:
  AUTH_DENIED                      severity=info  fields: subject, action, reason
  AUTH_POLICY_LOAD_FAIL            severity=error
```

**Failure mode.** If L1 is degraded:

- **Policy store unreachable** → request fails closed (deny). HTTP 503 with `Retry-After`.
- **Identity provider unreachable** → tokens within their freshness window keep working; new logins fail. UI shows "session-degraded" banner.
- **Permission cache stale** → defined as "stale within 60s is acceptable; beyond 60s, force re-evaluation".
- **Tenant lookup miss** → 401 (not 403). Reason: never confirm tenant existence to a wrong tenant.

**OTG integration.** L1 emits `audit_event` nodes for every deny and every permit-with-obligations. Permits without obligations are sampled at 1% to control volume.

**Validation footprint.**

```text
IQ: keycloak instance up, OIDC discovery doc reachable, root admin disabled
OQ: every action verb in the registry has a policy match;
    deny-by-default for unmatched verbs
PQ: 1000 concurrent sessions, p95 decide < 20ms, zero false-permits in 24h
```

---

### L2 — Governance, Compliance, Validation

**Responsibility.** Encode the *rules that bind* the company before it can perform a transaction:

- 21 CFR Part 11 (electronic records, electronic signatures)
- 21 CFR Part 820 (medical device QSR), ISO 13485
- IATF 16949 (automotive QMS)
- AS9100 (aerospace QMS)
- EU GMP Annex 11 (computerized systems)
- GAMP 5 (validation methodology)
- SOC 2 (Trust Services Criteria)
- GDPR / CCPA (privacy)
- IEC 62443 (OT/IT security)
- NIST AI RMF 1.0 (AI governance)

L2 publishes **policy directives** that L1 enforces, **validation evidence** that auditors consume, and **audit-chain anchors** that root the integrity proof.

**Authority owner.**

```text
policy_directive          — versioned, signed, indexed by jurisdiction + standard
validation_evidence       — IQ/OQ/PQ run records
audit_chain_anchor        — Merkle root committed daily to immutable storage
gxp_classification_table  — per-record-class GxP/non-GxP flag
retention_policy          — per-record-class retention period (e.g., BREL 7 years)
e_sign_requirement        — per-transition e-sign factor count
```

**Public contract (downward, toward L3 workflow).**

```yaml
# Each transition declares its governance requirements as data, not code
transition: brel.approve_release
requires:
  - reason_for_change: required
  - e_signature:
      factor_count: 2
      factors: [password, totp]
      part11_compliant: true
  - validation_state:
      target_record: brel
      iq_state: passed
      oq_state: passed
      pq_state: passed_within_365_days
  - audit_event: mandatory
  - retention_class: gxp_long_term
```

**Forbidden coupling.** L2 must not know transport (HTTP, gRPC, AMQP), UI state, or projection mechanics. L2 owns *rules*, never *executions*.

**Observability surface.**

```text
metrics:
  policy_directive_evaluations_total   labels: standard, decision
  validation_evidence_freshness_days   per IQ/OQ/PQ run
  audit_chain_depth_total              per chain
  e_sign_attempts_total                labels: factor_count, outcome
log events:
  GOVERNANCE_POLICY_PUBLISHED          severity=notice
  VALIDATION_RUN_COMPLETED             severity=notice
  AUDIT_CHAIN_ANCHOR_COMMITTED         severity=notice
  VALIDATION_EVIDENCE_EXPIRING         severity=warning  (90d before PQ stale)
```

**Failure mode.**

- **Validation evidence stale** → L1 returns *deny* with reason "validation_state_stale".
- **Policy directive not published** → corresponding action verb is *not_applicable* (request returns 501 with problem-detail type `https://hesem.io/problems/policy-not-published`).
- **Audit chain anchor missed daily** → SLO breach, on-call paged. Mutations *continue* (chain still appends), but auditor receives `chain.recent_anchor_age_hours` warning until anchor recommits.

**OTG integration.** L2 produces `evidence_artifact` nodes (validation runs) and `audit_event` nodes. Edges:

```text
validation_evidence  — VALIDATES → authoritative_root (GxP-classed root)
policy_directive     — GOVERNS  → workflow.transition
audit_chain_anchor   — SEALS    → time-window of audit_events
```

**Validation footprint.**

```text
IQ: every standard's policy directive present + signed
OQ: every regulated transition resolves to ≥1 policy_directive
PQ: zero permitted regulated mutations without validation_evidence within 365d
```

---

### L3 — Process, Workflow, State Machines

**Responsibility.** Define the **8 coupled state machines** (per master thesis §5) and their *legal transitions*. L3 is the only layer permitted to mutate authoritative_root state.

```text
SM-1 Order machine          (QUO/CPO/SO)
SM-2 Material machine       (LOT/IREV genealogy)
SM-3 Inspection machine     (INS/IQC/IPC/OQC/MRB)
SM-4 NC + CAPA machine      (NC/CAPA/SCAR)
SM-5 Document machine       (CDOC/ECO)
SM-6 Release machine        (BREL)
SM-7 Maintenance machine    (MWO/PM-SCHEDULE)
SM-8 Equipment machine      (EQUIP/CAL/SPCRUN/FMEA/VAL)
```

**Authority owner.**

```text
state_machine_definition  — declarative SM (YAML) with states, transitions, guards
workflow_event            — every transition_attempt + transition_committed
transition_log            — append-only, one row per attempt (incl. denied)
saga_log                  — for cross-machine coordinations (orchestrated, not choreographed)
```

**Public contract.** Every transition is a typed action verb:

```yaml
state_machine: brel
states: [draft, in_review, ready_for_release, released, withdrawn]
transitions:
  - id: brel.submit_for_review
    from: draft
    to:   in_review
    guards:
      - lot_quarantine_state == clear
      - all_required_inspections.disposition == accept
      - all_linked_capa.state in [closed, not_applicable]
    obligations:           # consumed by L1 policy decide
      - reason_for_change
    emits:
      - workflow_event: brel.submitted_for_review
      - audit_event:    mutation
  - id: brel.approve_release
    from: ready_for_release
    to:   released
    guards: ...
    obligations:
      - e_signature.factor_count: 2
      - validation_evidence.iq_oq_pq: fresh
    emits:
      - workflow_event: brel.released
      - otg_event:      authoritative_root.lifecycle.released
```

**Forbidden coupling.** L3 may not call L7 directly. L3 publishes events; an outbox pattern (L8) ships them. L3 may not render UI; L6 subscribes. L3 may not write derived models; L5 derives.

**Observability surface.**

```text
spans:
  workflow.transition.attempt             attributes: machine, from, to, decision
  workflow.transition.commit              attributes: machine, from, to
  workflow.guard.evaluate                 attributes: guard.id, result
metrics:
  workflow_transitions_total              labels: machine, transition_id, outcome
  workflow_guard_failures_total           labels: machine, guard_id
  workflow_transition_latency_ms          Histogram
  saga_active                             Gauge
  saga_compensation_started_total         counter
log events:
  WORKFLOW_TRANSITION_DENIED              severity=info
  WORKFLOW_GUARD_FAILED                   severity=info
  SAGA_COMPENSATION_INVOKED               severity=warning
```

**Failure mode.**

- **Guard fails** → 422 with RFC 9457 problem-detail listing the failing guard ids and human-readable reasons; transition is rejected; nothing is mutated.
- **Optimistic-lock conflict** → 409, type `https://hesem.io/problems/version-conflict`; client must refetch.
- **Idempotent replay** → server replays the original response (no second mutation).
- **Saga compensation needed** → reverse transitions executed in reverse order with `saga_id` correlation.

**OTG integration.** L3 is the *primary writer* of OTG `workflow_event` nodes and edges of type `TRIGGERED → state_change`. Every committed transition produces:

```text
otg_node[workflow_event] —TRIGGERED→ authoritative_root[BREL]
authoritative_root[BREL].lifecycle_state = 'released'   (UPDATE)
audit_event[mutation]    —RECORDS→ workflow_event
```

**Validation footprint.**

```text
IQ: every state_machine_definition signed and version-locked
OQ: full transition graph reachability (every state reachable, no orphan states)
PQ: chaos test — random 5% of transitions fail mid-commit; saga compensation
    must restore prior state with zero data corruption over 1000-trial sample
```

---

### L4 — Domain Model & Authority Records

**Responsibility.** Hold the **authoritative_root** records — the system of record for each business object. L4 is the *only* place where the canonical, never-overwritten history of a record lives.

L4 owns the **18 Wave 1 roots** + Wave-2 governed records + Wave-9 vertical extensions.

**Authority owner.**

```text
authoritative_root        — per resource_family (LOT, BREL, NC, CDOC, WO, SO, …)
domain_invariant          — declarative invariant table (e.g., "BREL.lot_id must reference active LOT")
referential_constraint    — FK constraints expressed as data + DB-level
```

**Public contract.** Every root exposes:

```yaml
resource_family: BREL
table: brel
key:
  external_id: brel_code      # human-stable, e.g. "BREL-2026-00042"
  internal_id: brel_id (UUID)
versioning:
  optimistic_lock_column: version (BIGINT)
  etag_format: 'W/"<sha256(canonical_json)>"'
core_fields:
  lifecycle_state: TEXT (FK -> state_machine_definition.brel.states)
  tenant_id:       UUID NOT NULL
  created_at:      TIMESTAMPTZ NOT NULL
  created_by:      UUID NOT NULL
  ...
edges_outbound:
  - lot_id           → LOT (must_exist, lifecycle_state ∈ {active, quarantined})
  - released_by      → identity_principal
edges_inbound:
  - audit_event      ← all mutations
  - workflow_event   ← all transitions
  - validation_evidence ← latest IQ/OQ/PQ run
projection_targets:
  - workspace.brel_inbox
  - read_model.brel_release_history
retention_class: gxp_long_term  (7 years post-supersession)
```

**Forbidden coupling.** L4 must not contain workflow logic, query helpers, or rendering hints. A field that exists "to make the UI easier" lives in L5 (projection), not L4 (root).

**Observability surface.**

```text
metrics:
  domain_root_writes_total          labels: family, outcome
  domain_invariant_violations_total labels: invariant_id
  optimistic_lock_conflicts_total   labels: family
  root_size_bytes                   per family
log events:
  DOMAIN_INVARIANT_VIOLATED         severity=critical (should never happen)
  ROOT_RECORD_PURGED                severity=notice  (only via retention job)
```

**Failure mode.**

- **Invariant violation at write time** → transaction aborts; problem-detail type `https://hesem.io/problems/invariant-violation`; nothing committed.
- **Root unavailable (replica lag)** → reads served from primary; writes block briefly; alert if lag > 5s.
- **Tenant boundary leak** → SEV-1 incident; row-level security policies + tenant guard middleware are double-defense; both must independently enforce.

**OTG integration.** L4 *is* the `authoritative_root` node table. Every L4 write either creates a node or mutates one. The OTG node is *never* deleted; supersession is via a `superseded_by_id` self-edge.

**Validation footprint.**

```text
IQ: every authoritative_root table has tenant_id, version, created_at, created_by NOT NULL
OQ: every domain_invariant has at least one negative test (must reject)
PQ: 10M-row scale test — invariants enforced under 1k writes/sec
```

---

### L5 — Data Engineering & Digital Thread

**Responsibility.** Maintain the **OTG edges, projections, derived read models, and lineage**. L5 is the only layer permitted to denormalize. L5 *consumes* L3/L4 events; it never mutates roots.

This is V4's biggest underspecification: V4 names "Data & Digital Thread" as a layer but provides no engineering substance. V5 fills this gap here and in `10_DATA_ENGINEERING_DIGITAL_THREAD.md`.

**Authority owner.**

```text
otg_node                  — see master thesis §9 (full SQL)
otg_edge                  — typed adjacency list with direction + cardinality
otg_event                 — append-only event log driving OTG mutations
projection_workspace      — read-optimized denormalized views (materialized or incremental)
derived_read_model        — analytic models (e.g., open NCs by lot)
lineage_record            — every derivation tagged with (source_event_id, derived_at, derivation_version)
materialized_view_health  — last refresh timestamp, lag metric per view
```

**Public contract.** Every projection declares:

```yaml
projection: workspace.brel_inbox
sources:
  - otg_event:         brel.lifecycle.*
  - authoritative_root: BREL
  - authoritative_root: LOT (via brel.lot_id edge)
materialization: incremental   # or: materialized_view, on_demand_view
freshness_target_seconds: 5
freshness_alarm_seconds:  30
columns:
  - brel_code
  - lifecycle_state
  - lot_code
  - lot_quarantine_state     # joined from LOT
  - days_in_state
  - assigned_reviewer
indexes:
  - (lifecycle_state, assigned_reviewer)
api_exposure: GET /api/v1/workspace/brel-inbox?...
authority_class: projection_workspace   # never authoritative
```

**Forbidden coupling.** L5 must not emit `audit_event` nodes — those come from L1/L3. L5 must not reverse-feed into L4 (no projection ever rewrites an authoritative root).

**Observability surface.**

```text
metrics:
  otg_events_consumed_total           labels: event_type
  otg_events_lag_seconds              Gauge per stream
  projection_refresh_latency_ms       Histogram per projection
  projection_freshness_seconds        Gauge per projection
  derived_model_drift_records         counter (rows that disagree with rebuild-from-scratch)
log events:
  PROJECTION_REFRESH_FAILED           severity=error
  OTG_EDGE_DANGLING                   severity=critical (target node missing)
  LINEAGE_GAP_DETECTED                severity=critical
```

**Failure mode.**

- **Projection lag exceeds alarm** → UI badges that workspace as "data stale by Xs"; if > 5min, workspace is read-locked.
- **Dangling OTG edge** → SEV-2 incident; integrity job runs nightly to detect; auto-quarantine the dangling edge in `otg_edge_quarantine` until manual review.
- **Lineage gap** → derived model is invalidated and rebuilt from event log; freshness alarm fires until rebuild completes.

**OTG integration.** L5 is the OTG itself. Everything else feeds it.

**Validation footprint.**

```text
IQ: otg_node, otg_edge, otg_event tables present with expected schema
OQ: every authoritative_root family has ≥1 projection_workspace consumer
PQ: 100M-event log replay in < 4h (DR scenario)
```

---

### L6 — Experience & Interaction

**Responsibility.** Render UI surfaces (HMV4 workspaces, record-shells, dialogs, drawers, toasts) and translate user intents into L7 calls.

L6 is **stateful only at the surface level** — the source of truth always lives in L4/L5.

**Authority owner.**

```text
ui_render_state           — client-only; ephemeral; reflects L5 projections
surface_intent_log        — per intent submitted (clicked button, submitted form),
                            for replay + bug repro + AI advisory training data
```

**Public contract (toward L7).**

```http
POST /api/v1/intents/brel.submit_for_review HTTP/1.1
Idempotency-Key: <ulid>
If-Match: W/"<etag>"
X-HESEM-Tenant: <tenant>
X-HESEM-Locale: vi-VN
X-HESEM-Trace-Parent: 00-<trace_id>-<span_id>-01

{ "brel_id": "...", "reason_for_change": "..." }
```

**Forbidden coupling.** L6 must not implement business rules. If a button's label depends on whether the user is allowed to use it, L6 *asks L1* via /can endpoint, never decides locally.

**Observability surface.**

```text
metrics:
  surface_render_latency_ms_p95        per surface_id (target < 200ms)
  surface_first_contentful_paint_ms    per workspace
  intent_submitted_total               labels: intent_id, outcome
  intent_failure_total                 labels: intent_id, problem_type
  a11y_violation_count                 labels: rule_id
log events:
  SURFACE_RENDER_TIMEOUT               severity=warning
  INTENT_FAILED                        severity=info
```

**Failure mode.**

- **Projection unreachable** → render skeleton + retry banner; never silently use stale fixture.
- **Intent rejected (422)** → surface shows the problem-detail's `title` + `detail` localized via ICU MessageFormat 2.
- **Locale resource missing** → fall back to en-US with `aria-live` announcement.

**OTG integration.** L6 emits `surface_intent_log` events that *may* be inputs for AI advisory training (per L11 cross-cutting governance). They are not authoritative.

**Validation footprint.**

```text
IQ: every surface registered in surface_registry
OQ: every record-shell renders for every fixture record without console errors
PQ: WCAG 2.2 AA pass per surface; Lighthouse > 90 on every workspace route
```

---

### L7 — Integration, API, External Surface

**Responsibility.** Define and serve the **external contract** to humans (UI), other systems (CSV, EDI, ESB), and partners (customer/supplier portals).

L7 publishes:

```text
OpenAPI 3.1.1   — REST surface
AsyncAPI 2.6    — event surface (for partners subscribing)
GraphQL SDL     — convenience layer (Wave 9 stream 9I)
RFC 9457 schema — error envelope
RFC 7807-bis    — when ratified, migrate
JSON Schema 2020-12 — body schemas
ETag / If-Match — concurrency
Idempotency-Key — replay safety
```

**Authority owner.**

```text
external_request          — every inbound API call, sampled to 100% on regulated routes
external_response         — every outbound response, sampled
replay_protection_token   — Idempotency-Key + 24h replay window
api_version_manifest      — semver per route, deprecation date per version
contract_test_evidence    — per release, per route
```

**Public contract.** Every route follows the V5 standard envelope:

```yaml
GET /api/v1/<resource-family>/<id>
  responses:
    200: { schema: <resource_family>_canonical }
    304: ETag match (no body)
    401: problem-detail (auth)
    403: problem-detail (policy)
    404: problem-detail (resource_not_found)
    429: problem-detail (rate-limited)  + Retry-After
    503: problem-detail (degraded)      + Retry-After

POST /api/v1/<resource-family>/<id>:<action>
  required headers:
    Idempotency-Key
    If-Match
    X-HESEM-Tenant
    X-HESEM-Trace-Parent
  responses:
    202: accepted (async); response body = WorkflowAttempt envelope
    409: problem-detail (version-conflict)
    422: problem-detail (guard-failure | invariant-violation)

problem-detail envelope (RFC 9457):
  type:     https://hesem.io/problems/<machine-name>
  title:    short human title
  status:   HTTP status
  detail:   human detail (locale-aware)
  instance: trace_id-correlated URI
  errors[]: per-field violations
  retry-after: when applicable
```

**Forbidden coupling.** L7 must not contain domain logic. L7 is a translator: HTTP ↔ L3 intent. If a route handler needs to "decide", that decision belongs in L1, L2, or L3.

**Observability surface.**

```text
spans:
  http.server                attributes: route_template, http.method, http.status,
                                          tenant_id, principal_id
  http.client (outbound)
metrics:
  http_requests_total                     labels: route, method, status
  http_request_duration_ms                Histogram
  http_request_payload_bytes              Histogram
  api_version_in_use                      Gauge per (route, version)
log events:
  REQUEST_REJECTED_AT_BOUNDARY            severity=info  (auth/throttle)
  CONTRACT_DRIFT_DETECTED                 severity=error (response shape mismatched schema)
```

**Failure mode.**

- **Schema drift detected** → CI gate fails; deploy blocked.
- **Backward-incompatible change** → must bump major version; old version remains for ≥ 6 months per deprecation policy.
- **Idempotency-Key replay (>24h)** → server treats as new request (not a replay).
- **Rate-limit exceeded** → 429 with Retry-After + token-bucket refill timestamp.

**OTG integration.** Every L7 mutation request opens a workflow_event in L3 *and* an audit_event in L1; failures still produce audit_event (deny path).

**Validation footprint.**

```text
IQ: openapi.json validates against OpenAPI 3.1.1 spec; problem.schema.json validates against RFC 9457
OQ: contract test suite green per route; backward-compat suite green
PQ: 1000 req/s per route, p95 < 200ms, p99 < 1s, error rate < 0.1%
```

---

### L8 — Platform, Runtime, SRE, Observability

**Responsibility.** Run the system. Keep it up. Prove it stayed up. Recover when it doesn't. Emit the spans/metrics/logs/traces that all other layers produce, and turn them into SLOs.

**Authority owner.**

```text
telemetry_span            — OTel span store (Jaeger / Tempo)
metric_sample             — Prometheus
log_event                 — Loki / ELK
trace_link                — span ↔ log ↔ metric correlation
slo_breach_event          — when an SLO objective is breached
incident_record           — per declared incident with postmortem link
runbook                   — per alert
release_record            — every deploy with version + artifact-hash
ha_topology_snapshot      — current cluster shape
dr_drill_record           — per DR drill execution
backup_record             — per snapshot, per retention
```

**Public contract (toward all other layers).**

```yaml
# Every service consumes this contract:
otel_endpoint:        otel-collector.observability.svc.cluster.local:4317
metrics_endpoint:     prometheus pull at /metrics
log_format:           JSON line, fields per OpenTelemetry semantic conventions
required_baggage:
  - tenant.id
  - request.id
  - principal.id (when present)
required_resource_attrs:
  - service.name
  - service.version
  - deployment.environment

slo_definitions:
  l1_auth_decide_p95_ms:        20
  l3_workflow_commit_p95_ms:    500
  l5_projection_freshness_s:    5
  l7_api_p95_ms:                500
  l7_api_error_rate:            < 0.001
  audit_chain_anchor_lag_h:     < 24
  rpo_minutes:                  < 60
  rto_minutes:                  < 240
```

**Forbidden coupling.** L8 must not embed business logic. L8 is *not* a god-layer — it provides primitives, never decisions.

**Observability surface.** L8 is the surface for everyone else; its self-observability is meta:

```text
metrics:
  otel_collector_throughput_spans_per_s
  prometheus_scrape_failures_total
  loki_ingestion_errors_total
  jaeger_query_latency_ms
  alert_pages_total                        labels: severity, route
  slo_burn_rate                            per SLO
  dr_drill_success                         per drill
log events:
  SLO_BREACH                               severity=warning
  INCIDENT_DECLARED                        severity=alert
  DEPLOY_COMPLETE                          severity=notice
  DEPLOY_ROLLBACK                          severity=warning
```

**Failure mode.**

- **OTel collector down** → services buffer locally for 5 min then drop; metrics degraded warning.
- **Prometheus down** → alerts blind; on-call paged via secondary path (PagerDuty heartbeat).
- **Region failure** → DR runbook executed; RPO/RTO measured against budget; postmortem mandatory.

**OTG integration.** L8 emits `telemetry_span / metric_sample / log_event / slo_breach_event` records but they are *not* in the OTG (volume too high). A daily aggregator distills SLO breaches and incident records into OTG `audit_event` nodes for compliance.

**Validation footprint.**

```text
IQ: OTel collector + Prometheus + Loki + Jaeger up; dashboards loaded
OQ: every service emits the required resource attrs;
    every SLO has an alert rule + runbook
PQ: chaos drill — kill a pod, RTO < 60s; kill a node, RTO < 5min; kill a region, RTO < 4h
```

---

## Section 4 — Layer-pair contracts

V4 says nothing about *what crosses a layer boundary*. V5 specifies every adjacent pair. This is what an architect actually needs to draw the system without ambiguity.

| From → To | Crosses | Format | Forbidden |
|---|---|---|---|
| L1 → L2 | obligation request | JSON over HTTP | embedding rules |
| L2 → L3 | governance manifest | YAML registry, polled | side-channel injection |
| L3 → L4 | mutation intent | typed transaction | direct table writes from outside L3 |
| L3 → L5 | workflow_event stream | outbox + CDC | synchronous projection update |
| L4 → L5 | row CDC stream | logical decoding (Postgres WAL) | application-level dual-write |
| L5 → L6 | projection query | REST/GraphQL | dynamic SQL from UI |
| L6 → L7 | intent | RFC 9457 envelope | UI assuming server state |
| L7 → all | request fan-out | OTel-traced HTTP | bypass auth |
| L8 → all | telemetry contract | OTel SDK | logging frameworks not OTel-aware |

---

## Section 5 — Cross-cutting deep specifications

The 12 cross-cuttings are documented in detail in dedicated files (per master thesis §12 manifest). This section is a stub crosswalk so an architect can locate ownership.

| C# | Cross-cutting | Detail file | One-line ownership |
|---|---|---|---|
| C1 | Audit chain | `13_SECURITY_THREAT_MODEL_AND_DEVSECOPS.md` | hash chain anchored at L8 nightly |
| C2 | e-Signature | `07_DOMAIN_DEPTH_REGULATORY_VALIDATION.md` | obligation declared in L2, executed at L3 |
| C3 | i18n / l10n | `12_PLATFORM_ENGINEERING_AND_SRE.md` | ICU MF2; locale traveling in `Accept-Language` |
| C4 | Tenant isolation | `13_SECURITY_THREAT_MODEL_AND_DEVSECOPS.md` | RLS + middleware; double-defense |
| C5 | Idempotency | `09_API_CONTRACT_FACTORY.md` | server replay log keyed by Idempotency-Key |
| C6 | Concurrency | `09_API_CONTRACT_FACTORY.md` | ETag/If-Match; version column in L4 |
| C7 | Problem details | `09_API_CONTRACT_FACTORY.md` | RFC 9457 envelope; stable type URIs |
| C8 | Observability | `12_PLATFORM_ENGINEERING_AND_SRE.md` | OTel SDK in every service |
| C9 | Performance budget | `12_PLATFORM_ENGINEERING_AND_SRE.md` | per-route budget enforced in CI + runtime |
| C10 | Retention / WORM | `07_DOMAIN_DEPTH_REGULATORY_VALIDATION.md` | per-class retention; S3 Object Lock |
| C11 | AI advisory governance | `11_AI_ENGINEERING_PLAYBOOK.md` | banned-decisions list; decision-record per advisory |
| C12 | Accessibility | `12_PLATFORM_ENGINEERING_AND_SRE.md` | WCAG 2.2 AA; axe-core CI gate |

---

## Section 6 — The 20 architectural coordinates

A slice's wave compliance is now expressed as a 20-cell scorecard:

```text
            L1  L2  L3  L4  L5  L6  L7  L8
          +---+---+---+---+---+---+---+---+
   C1     | • | • | • | • | • | • | • | • |
   C2     | • | • | • | . | . | • | . | . |
   C3     | . | . | . | • | • | • | • | . |
   C4     | • | . | . | • | • | . | • | . |
   C5     | . | . | • | . | . | . | • | . |
   C6     | . | . | . | • | . | . | • | . |
   C7     | . | . | • | . | . | . | • | . |
   C8     | • | • | • | • | • | • | • | • |
   C9     | . | . | . | • | • | • | • | • |
   C10    | . | • | . | • | • | . | . | . |
   C11    | . | • | • | . | . | • | . | . |
   C12    | . | . | . | . | . | • | . | . |
          +---+---+---+---+---+---+---+---+
```

Where `•` means "this slice produces evidence at this coordinate".

A slice's **maturity coordinate** in the Slice Maturity Cube (master thesis §10) is determined by the highest level reached at the *minimum* of its S/A/V axes — i.e., a slice is only as mature as its weakest cross-cutting × layer cell.

V4's "every Wave touches L1 + one of L2/L3/L4" rule is now restated as:

```text
V5 RULE: Every wave produces evidence at every layer the wave touches AND
         at every cross-cutting that layer claims to support, expressed as
         a non-empty cell at every • in the slice's coordinate matrix.
         A coordinate without evidence = wave gate failure.
```

---

## Section 7 — Why this matters for prototype today

The repository's current state (per `_reports/module-template-v4/` history):

```text
WAVE 1 SLICE 1-12  : Stage 1 fixture-only, demonstrating L4 + L6 + L7 partial
WAVE 1 NAV SHELL   : L6
PHASE 2 STREAM REPORT : CROSS_BROWSER_FAIL_BLOCK_NEXT (L6 cross-browser),
                        + 3 PASS_WITH_WARNINGS streams
```

Mapped onto V5's 8 layers, the current prototype is at:

| Layer | Coverage |
|---|---|
| L1 | placeholder (mocked) |
| L2 | not yet started |
| L3 | partial (workflow registry exists in `_reports/V18_*`) |
| L4 | fixture only (no DB tables yet for new roots) |
| L5 | fixture only (no projections; no OTG tables) |
| L6 | active (Slice 1-12 + nav shell) |
| L7 | partial (read endpoints exist) |
| L8 | basic (no OTel, no Prometheus, no Loki, no Jaeger) |

The honest assessment: HESEM is a credible **L6+L7-partial** prototype. To reach world-class, the next work is **L1+L2+L8 platform groundwork** in parallel with **L3+L4+L5 OTG groundwork**. Wave 0.5 (per master thesis §7) exists precisely for this.

---

## Section 8 — Decision phrase

```text
V5_OS_ARCHITECTURE_DEEPENED_BASELINE_LOCKED
NEXT_FILE: 02_AUTHORITY_AND_TRUTH_GRAPH_FORMAL_MODEL.md
```
