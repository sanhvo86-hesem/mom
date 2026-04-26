# B1 — Layered Architecture (the 8 layers L1-L8)

This chapter describes the eight layers of HESEM's architecture. Every
component of HESEM lives in exactly one layer. Each layer has a clear
responsibility, a clear boundary, a defined contract toward neighboring
layers, and a defined failure mode.

The layers are presented bottom-up, but the order is pedagogical only;
the layers are not strictly hierarchical in execution (an event can flow
upward then back down across layers within a single user interaction).

---

## The 8 layers — orientation

```
L1  Identity, Authority, Authorization
L2  Governance, Compliance, Validation
L3  Process, Workflow, State Machines
L4  Domain Model & Authoritative Records
L5  Data Engineering & Digital Thread
L6  Experience & Interaction (UI)
L7  Integration, API, External Surface
L8  Platform, Runtime, SRE, Observability
```

L1 to L5 are the "inside" of the system: who, what, how, when, history.
L6 is the human-facing edge: what people see and do. L7 is the
machine-facing edge: what other systems see and call. L8 is the
substrate everything runs on.

---

## L1 — Identity, Authority, Authorization

**Purpose**. L1 answers two questions on every request: who is acting,
and are they allowed to perform this action on this resource in this
tenant right now. L1 does not know what the action means in business
terms; it returns a yes-or-no decision and a list of obligations.

**What L1 owns.** L1 owns the identity of users, the roles they hold, the
tenant memberships they belong to, the policy directives that govern
which roles can do what, and the cache of authorization decisions.

**What L1 produces.** L1 produces a permission decision (permit, deny,
not-applicable, or indeterminate) along with optional obligations
(such as "an electronic signature is required" or "a reason for change
is mandatory"). L1 also produces audit events for every deny and every
permit-with-obligations.

**What L1 consumes.** L1 consumes the user's authentication token, the
intended action verb, the target resource family, the target resource
identifier, the tenant identifier, and the request context (including
factors authenticated, IP, user agent).

**What L1 must not do.** L1 must not call into the workflow layer (L3) or
the domain model (L4) to determine permission. If a permission decision
requires domain knowledge (such as "is this lot still on quarantine
hold?"), that knowledge is encoded into L1 as policy data, not retrieved
at decision time from L3 or L4.

**Failure mode.** When L1 is degraded — its policy store unreachable,
its identity provider unreachable, its cache stale — L1 fails closed.
That is, L1 returns a deny, never a permit. The permission cache has a
60-second time-to-live. Beyond 60 seconds, decisions must be fresh.

**Owner.** Identity Lead.

**Evidence.** Per-route decision count metrics, decision latency p95
(target less than 20 ms per Service Level Objective), policy version
freshness, audit event coverage of deny paths.

---

## L2 — Governance, Compliance, Validation

**Purpose**. L2 encodes the rules that bind the company before any
transaction can execute. These are the regulatory rules (21 CFR Part 11,
EU GMP Annex 11, IATF 16949, AS9100, ISO 13485, GAMP 5, etc.), the
internal policies (per-customer SLA terms, per-vertical-pack
obligations), and the validation evidence (IQ/OQ/PQ records that prove
the system performs as specified).

**What L2 owns.** L2 owns the policy directive registry, the validation
evidence store, the audit chain anchor, the retention policies per
record class, the e-signature obligation table, and the GxP
classification table.

**What L2 produces.** L2 produces:
- Policy directives that L1 enforces
- Validation evidence that auditors consume
- Audit chain anchors that prove the integrity of the audit trail
- Retention policy declarations that tell the system how long records
  must be kept and on what storage tier

**What L2 consumes.** L2 consumes external regulatory updates (FDA
guidance, EMA guidance, IATF surveillance findings, NADCAP audit
results) and integrates them into the policy directive registry.

**What L2 must not do.** L2 must not know transport (HTTP, gRPC, AMQP),
UI state, or projection mechanics. L2 owns rules; it never owns
executions of rules.

**Failure mode.** When L2 is degraded — validation evidence stale,
policy directive not published, audit chain anchor missed — the system
fails toward safety. Stale validation evidence demotes the affected
root's maturity automatically (described in B6 cross-cutting concerns).
Policy not published returns a 501 problem-detail. Missed anchor causes
an SLO breach but does not stop mutations (the chain continues
appending; the anchor catches up).

**Owner.** Compliance Lead.

**Evidence.** Policy directive count, validation evidence freshness
distribution, audit chain anchor consistency over rolling 7 days,
retention policy coverage of record classes.

---

## L3 — Process, Workflow, State Machines

**Purpose**. L3 defines the legal transitions that operational records
can undergo, and is the only layer permitted to mutate authoritative
records. L3 is described in detail in B4 (State Machine Network) and the
Workflow Mutation Command Bus is described in B6 cross-cutting concern
"workflow command bus."

**What L3 owns.** L3 owns the state machine definitions for the 14
coupled state machines (Order, Material, Inspection, NC+CAPA+SCAR,
Document, Release, Maintenance, Equipment, Procurement, Job/Work-Order,
Training, Complaint/Recall, Calibration, Validation), the workflow event
log, the saga log for cross-machine compensations, and the transition
attempt log.

**What L3 produces.** L3 produces:
- Workflow events for every transition attempt and commit
- Audit events for every committed mutation
- OTG events that propagate state changes to projection layer (L5)
- Compensating commands when sagas need to roll back

**What L3 consumes.** L3 consumes commands from L7 (the Command Bus),
permission decisions from L1, validation evidence references from L2,
and current state from L4.

**What L3 must not do.** L3 must not call L7 directly (it publishes
events; an outbox pattern in L8 ships them). L3 must not render UI (L6
subscribes). L3 must not write derived models (L5 derives).

**Failure mode.** When L3 is degraded — guard evaluation fails, saga
compensation needed — the system rejects the transition with an
RFC 9457 problem-detail listing the failing guard ids and the human-
readable reasons. Optimistic-lock conflicts return HTTP 409. Idempotent
replays return the original response without re-executing.

**Owner.** Workflow Lead (often the Platform Lead).

**Evidence.** Per-machine transition rate, guard failure rate per machine
per guard, saga active count, saga compensation rate, idempotency replay
hit rate.

---

## L4 — Domain Model & Authoritative Records

**Purpose**. L4 holds the authoritative record (the system of record) for
every business object. L4 is the only place where the canonical history
of a record lives.

**What L4 owns.** L4 owns the 95 root tables (Sales Order, Purchase
Order, Lot, Batch Release, Nonconformance Case, Controlled Document,
Equipment, etc.), the foreign key relationships among them, the
optimistic-lock version columns, the tenant scoping columns, and the
audit columns (created_at, created_by, updated_at, updated_by,
superseded_by_id).

**What L4 produces.** L4 produces row mutations that propagate to L5 via
Change Data Capture, and rows that L5 projections and L7 read APIs query.

**What L4 consumes.** L4 consumes commands from L3 that have been
authorized by L1, governed by L2, and gated by L3 guards.

**What L4 must not do.** L4 must not contain workflow logic, query
helpers for the UI, or rendering hints. A field that exists "to make
the UI easier" lives in L5 (projection), not L4 (root).

**Failure mode.** When L4 is degraded — invariant violation, replica lag,
tenant boundary leak attempt — the database transaction aborts with a
problem-detail. Replica lag beyond 5 seconds triggers an SLO breach.
Tenant boundary attempts are SEV-1 incidents.

**Owner.** Backend Lead, with Domain Architects per domain (one per the
14 PART_C chapters).

**Evidence.** Per-family row count, mutation rate, optimistic-lock
conflict rate, invariant violation count (target zero), tenant
isolation audit pass rate.

---

## L5 — Data Engineering & Digital Thread

**Purpose**. L5 maintains the Operational Truth Graph (OTG): the
projections, derived read models, materialized views, lineage records,
and the daily audit chain anchor. L5 is the only layer permitted to
denormalize. L5 consumes L3 and L4 events; it never mutates roots.

**What L5 owns.** L5 owns the OTG node table, the OTG edge table, the
OTG event log, the materialized views (lot genealogy, open NCs by lot,
release readiness, training eligibility, supplier quality score, OEE
freshness, AI advisory acceptance, audit chain health), the derived
read models for analytics, and the lineage records that bind every
derivation back to its source events.

**What L5 produces.** L5 produces:
- Workspace projections (the read-optimized views that L6 renders)
- Analytic data products (the contract-bound data sets that PART_I and
  PART_C13 describe)
- Genealogy graphs (the upstream and downstream lineage of any lot,
  serial, or batch)
- Drift reports (where projection state diverges from a fresh rebuild
  from event log)

**What L5 consumes.** L5 consumes:
- Change Data Capture events from L4 (Postgres logical decoding)
- Workflow events from L3
- Audit events from L1, L2, and L3
- Time-series telemetry from L8 and the Edge Gateway (PART_B8)

**What L5 must not do.** L5 must not emit audit events on its own (those
come from L1 and L3). L5 must not reverse-feed into L4 (no projection
ever rewrites an authoritative root).

**Failure mode.** When L5 is degraded — projection lag exceeds alarm,
drift detected, dangling edge — the system surfaces the staleness
explicitly to the UI ("data stale by N seconds") and beyond a longer
threshold (typically 5 minutes) the workspace is read-locked until
freshness is restored. Dangling edges are SEV-2 incidents.

**Owner.** Data Platform Lead.

**Evidence.** Per-projection freshness, OTG event lag p95, drift count
(target zero), materialized view refresh latency, audit chain anchor
recency.

---

## L6 — Experience & Interaction (UI)

**Purpose**. L6 renders user interface surfaces (workspaces, record
shells, dialogs, drawers, sub-flow wizards) and translates user intents
into L7 calls. L6 is the human-facing edge of the system.

**What L6 owns.** L6 owns the UI render state (ephemeral, never
authoritative), the surface intent log (every clicked button, every
submitted form), and the per-tenant theme overrides.

**What L6 produces.** L6 produces L7 API calls, surface intent log
entries (which may feed AI advisory training data per L11 cross-cutting
governance), and accessibility-conformant rendered HTML.

**What L6 consumes.** L6 consumes projection responses from L7,
authoritative record responses from L7, problem-detail responses (RFC
9457), and design tokens from the Graphics Authority.

**What L6 must not do.** L6 must not implement business rules. If a
button's label depends on whether the user is allowed to use it, L6
asks L1 via a /can endpoint, never decides locally. L6 must not access
the database directly.

**Failure mode.** When the projection is unreachable, L6 renders a
skeleton with a retry banner. L6 never silently uses a stale fixture.
When an intent is rejected with HTTP 422, L6 displays the problem-
detail's title and detail localized via ICU MessageFormat 2.

**Owner.** Frontend Lead.

**Evidence.** Per-surface render latency p95, accessibility violation
count (target zero serious), intent failure rate, intent submitted rate.

---

## L7 — Integration, API, External Surface

**Purpose**. L7 defines and serves the external contract to humans (UI),
to other systems (CSV, EDI, ESB), and to partners (customer portal,
supplier portal). L7 is the machine-facing edge of the system.

**What L7 owns.** L7 owns the OpenAPI 3.1.1 specifications per resource
family, the AsyncAPI 2.6 specifications per event topic, the GraphQL
schema (Wave 9), the RFC 9457 problem registry (62 entries), the
idempotency replay store, the version manifest per route, and the
contract test evidence.

**What L7 produces.** L7 produces HTTP responses (success or problem-
detail), event publications via the Event Bus, and contract-test
artifacts proving backward compatibility.

**What L7 consumes.** L7 consumes HTTP requests from L6 (UI) and from
external systems, deserializes the request body, validates against the
OpenAPI schema, calls L1 for permission, packages the request as a
command, hands it to L3, awaits the result, and serializes the
response.

**What L7 must not do.** L7 must not contain domain logic. L7 is a
translator: HTTP to L3 intent. If a route handler needs to "decide,"
that decision belongs in L1 (permission), L2 (governance), or L3
(workflow guard).

**Failure mode.** When L7 detects schema drift (response shape mismatched
its declared schema), CI fails the deploy. Backward-incompatible changes
require a major version bump. Idempotency-Key replays beyond the 24-hour
window are treated as new requests. Rate-limit-exceeded returns HTTP 429
with Retry-After.

**Owner.** API Lead.

**Evidence.** Per-route p95 latency, error rate (per route, per type),
contract test pass rate, version-deprecated request count, schema drift
count (target zero).

---

## L8 — Platform, Runtime, SRE, Observability

**Purpose**. L8 runs the system, keeps it up, proves it stayed up,
recovers when it does not, and emits the spans, metrics, logs, and
traces that the other layers produce.

**What L8 owns.** L8 owns the Kubernetes deployment topology, the
OpenTelemetry collector, the Prometheus metrics store, the Loki log
store, the Jaeger trace store, the Grafana dashboards, the AlertManager
routing, the deployment pipeline, the disaster-recovery runbooks, the
backup policy, and the per-tenant cost attribution.

**What L8 produces.** L8 produces:
- Deployment events (release records)
- Telemetry (spans, metrics, logs, traces)
- SLO breach events when an objective is breached
- Incident records when an incident is declared
- Backup records, DR drill records
- Per-tenant cost reports

**What L8 consumes.** L8 consumes telemetry from every other layer (every
service emits OpenTelemetry-conformant data), CI/CD pipeline triggers,
and infrastructure events from cloud providers.

**What L8 must not do.** L8 must not embed business logic. L8 is the
substrate; it provides primitives, never decisions.

**Failure mode.** When L8 components are degraded:
- Telemetry collector down: services buffer locally for up to 5 minutes.
- Prometheus down: alerts go blind; on-call paged via secondary path.
- Region failure: DR runbook executed; RPO/RTO measured against budget.

**Owner.** Site Reliability Engineering Lead.

**Evidence.** SLO compliance per SLO, error budget burn rate, alert
acknowledge time, MTTR per severity, DR drill pass rate.

---

## How layers communicate

The communication patterns between layers are described in B6 (Cross-
Cutting Concerns) and the per-pair contract is summarized here:

```
L1 to L2:   obligation request (HTTP)
L2 to L3:   governance manifest (registry polled)
L3 to L4:   mutation intent (typed transaction)
L3 to L5:   workflow event (outbox + CDC)
L4 to L5:   row CDC (Postgres logical decoding)
L5 to L6:   projection query (REST or GraphQL)
L6 to L7:   intent (RFC 9457 envelope)
L7 to all:  request fan-out (OpenTelemetry-traced HTTP)
L8 to all:  telemetry contract (OpenTelemetry SDK)
```

What goes between layers is one of: typed command, structured event,
projection query, problem-detail, telemetry. Nothing else. Anything
else is an architectural smell.

---

## Layer ownership accountability

Each layer has a single named lead. The lead reviews any change to the
layer and approves promotions of capabilities into the layer.

```
L1 — Identity Lead
L2 — Compliance Lead
L3 — Workflow Lead (or Platform Lead)
L4 — Backend Lead (with per-domain Architects)
L5 — Data Platform Lead
L6 — Frontend Lead
L7 — API Lead
L8 — SRE Lead
```

These leads are also the primary reviewers of relevant Part B chapters.

---

## Decision phrase

```
B1_LAYERED_ARCHITECTURE_BASELINE_LOCKED
NEXT: B2_AUTHORITY_MODEL.md
```
