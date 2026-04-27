# PART_B — ARCHITECTURE MASTER — Overview (V10 Deep Upgrade)

```
chapter_id:   B0
version:      V10
upgrade_from: V9-shallow
upgrade_by:   S1-01_B0_B1_LAYERED_ARCHITECTURE_DEEP_UPGRADE
standards:    ISA-95/IEC 62264; ISA-88/IEC 61512; 21 CFR Part 11;
              EU GMP Annex 11; GAMP 5; IEC 62443; OWASP ASVS 5.0;
              NIST SP 800-53 r5; NIST SP 800-204; ISO/IEC 25010:2023;
              OpenAPI 3.1.1; RFC 9457; OpenTelemetry; NIST AI RMF;
              WCAG 2.2 AA; ISO 27001:2022
```

---

## 1. Purpose of Part B

Part B specifies how HESEM is structured — the nine layers that compose it,
the twelve cross-cutting concerns that thread through those layers, and the
governance rules that control their composition. It does not describe what
HESEM does (that is Part C). It describes how the platform is organized so
that what it does can be done correctly, repeatably, observably, and in
conformance with the regulatory frameworks that HESEM customers operate under.

---

## 2. Architectural principles

Every principle below is a concrete, testable design rule with a stated
justification. Aspirational adjectives ("clean," "robust," "industry-leading")
do not appear. Each principle is enforceable in CI or in peer review.

### P-B-01 — Authority is single-path and explicit

Every mutation to an authoritative root (L4) flows through the Authority
Ledger (B2) and the Workflow Command Bus (L3). There is no alternative write
path. Workspaces (L5 projections) never mutate; they only project.
Justification: the only way to guarantee a complete and tamper-evident audit
chain (required by 21 CFR Part 11 §11.10(b) and EU GMP Annex 11 §9) is to
ensure that every mutation passes through a single choke-point where the
audit event is generated before the mutation commits. Multiple write paths
make audit completeness structurally unverifiable.

### P-B-02 — Layer boundaries are inviolable

No component in one layer invokes any component in a non-adjacent layer
except through the defined inter-layer interface contract (per B1 Section 3).
L4 never calls L7. L6 never queries L5 directly. L9 never mutates L4 without
passing through L3. Violations are detectable by static import analysis and
rejected in CI (per ADR-B-003).
Justification: boundary violations create hidden coupling that prevents
independent deployment, independent testing, and independent scaling of
layers. A single forbidden dependency left unchecked spawns more via the
"broken window" effect (documented in HESEM CI runbook RB-CI-002).

### P-B-03 — Cross-cutting concerns are vertical threads, not extra layers

The twelve cross-cutting concerns (audit chain, e-signature, i18n, tenant
isolation, idempotency, optimistic concurrency, problem details, observability,
performance budget, retention/WORM, AI governance, accessibility) thread
through every applicable layer. Each concern has a designated governance-
owner layer (per B6); every other layer implements that concern's contract.
Adding a thirteenth layer to "hold concerns" is specifically rejected because
it creates an architectural anti-pattern: the cross-cutting concern layer
becomes a dependency of every other layer, defeating the vertical threading
model.

### P-B-04 — Open standards are default; proprietary protocols require ADR

HESEM defaults to: ISA-95/IEC 62264, ISA-88/IEC 61512, OpenAPI 3.1.1,
RFC 9457 Problem Details, CloudEvents 1.0, AsyncAPI 3.0, JSON Schema 2020-12,
OpenTelemetry semantic conventions 1.x, OPC UA (IEC 62541), MQTT Sparkplug B,
NIST SP 800-53 r5, IEC 62443 (SL-2 for OT paths), OWASP ASVS 5.0, WCAG 2.2
AA, and NIST AI RMF. Any proprietary protocol (a specific vendor's EDI
dialect, OEM-specific CAN bus format) is wrapped in an anti-corruption layer
(ACL) at L7 or L9, isolated from core layers, and documented with its own ADR.
Justification: open standards allow independent validation by regulators and
auditors, reduce vendor lock-in, and provide implementation guidance that has
been publicly reviewed (NIST SP 800-204 Section 3.2 explicitly recommends
standard interfaces for microservice security boundaries).

### P-B-05 — Tenant isolation is double-enforced

Every request is scoped to a tenant_id at L1 (middleware extraction and
binding) and at L5 (PostgreSQL row-level security policy). A single
enforcement failure — one request seeing another tenant's row — is a
SEV-1 incident with mandatory post-mortem and regulatory notification
assessment. There are no cross-tenant shared mutable tables. Even read-only
analytics (L5 data products) are scoped per tenant before publication.
Justification: ISO/IEC 27018 Clause 5.1 requires clear separation of
personally identifiable information across customer tenants. 21 CFR Part 11
§11.10(d) requires limitation of system access. Regulatory auditors regularly
request proof of tenant boundary enforcement.

### P-B-06 — Observability is mandatory and uniform

Every layer emits OpenTelemetry-conformant traces (W3C Trace Context
propagated across all inter-layer calls), structured log lines (JSON;
trace_id and span_id present), and metrics (RED: rate, errors, duration per
endpoint per layer). Missing instrumentation is a CI failure. No layer has
an opt-out path.
Justification: HESEM's SRE discipline (DORA four-key metrics; error budget
tracking per B9) is structurally dependent on uniform telemetry. Gaps in
observability create blind spots that mask SLO breaches, which translates
directly to undetected violations of GAMP 5 operational performance
monitoring requirements.

### P-B-07 — Contract-first API discipline

No live L7 endpoint exists without a written OpenAPI 3.1.1 specification
published and review-approved before the implementation begins. The contract
includes: all request fields with JSON Schema 2020-12 constraints, all
response shapes, all RFC 9457 error codes with concrete type-URI and recovery
path, idempotency rules (Idempotency-Key semantics), rate-limit rules
(X-RateLimit-* headers), RBAC requirements (per role per verb), and SLO
target (p95 response time). Implementation without a ratified contract is a
policy violation that blocks merge.
Justification: contract-first prevents the most common source of integration
technical debt in manufacturing software: undocumented behavior that becomes
implicitly relied on by integrators, and is therefore impossible to change
without breaking them. 21 CFR Part 11 §11.10(k) requires adequate controls
over system documentation.

### P-B-08 — Per-slice graduation; no skipping

Capabilities graduate from L0 (planned) to L7 (productized) one level per
decision phrase per delivery cycle. No capability jumps from L2 to L5 in one
step regardless of time pressure. The decision phrase for each graduation is
the formal audit record of readiness.
Justification: GAMP 5 V-model validation requires progressive verification
steps (DQ → IQ → OQ → PQ). Skipping graduation levels is equivalent to
skipping validation phases — it creates a documentation gap that a regulatory
auditor will find and flag as a CAPA-triggering observation.

### P-B-09 — AI is advisory only; banned decisions are structurally enforced

The eight regulated decisions (lot release, inspection disposition, CAPA
closure, controlled document release, engineering change approval, training
certification, supplier qualification, recall initiation) are never executed
by an AI service principal. This boundary is enforced:
(a) at L1: actor identity claims checked against the AI-principal class
before the Command Bus accepts the command;
(b) at L3: each banned-decision command handler declares a guard
`ActorNotAIPrincipal` in its guard list;
(c) in CI: a scanner (RB-CI-003) detects any command handler for a
banned-decision verb whose guard list does not include
`ActorNotAIPrincipal` and fails the build.
Justification: NIST AI RMF MAP-5.2 requires that human oversight is
maintained for high-impact automated decisions. EU AI Act Annex III
classifies quality decisions in regulated manufacturing as high-risk AI
use; human-in-the-loop is required. The structural enforcement (not
policy-document enforcement) ensures that AI governance does not erode
under delivery pressure.

### P-B-10 — Evidence is mandatory for regulated mutations

Any mutation classified as GxP, ITAR-controlled, or 21 CFR Part 11 in scope
must:
(a) emit an audit event before the database transaction commits;
(b) emit a workflow event after the transaction commits;
(c) create an evidence record in the WORM-enforced storage tier (S3 Object
Lock or equivalent) within 60 seconds of commit.
Stale evidence (evidence record missing beyond SLO window) automatically
demotes the affected root's capability maturity level by one (managed by
the OTG evidence-staleness projection in L5).
Justification: 21 CFR Part 11 §11.10(e) requires accurate and complete
copies of records. EU GMP Annex 11 §9 requires audit trail completeness.
ISO 13485:2016 §4.2.5 requires retention of quality records.

### P-B-11 — Idempotency is required for all mutating endpoints

Every POST, PUT, PATCH, and DELETE endpoint that changes L4 root state
accepts an `Idempotency-Key` header (UUID v4 format; 24-hour replay window).
Replays within the window return the original response without re-executing
the command. Replays beyond the window are treated as new requests. The
idempotency store is owned by L3 and persisted in L5 (idempotency_key table).
Justification: in distributed systems under network degradation, clients
retry. Without idempotency, retries cause duplicate mutations — a
particularly severe problem for regulated records (duplicate lot releases,
double-posted invoices, duplicate audit events that break hash-chain
integrity). RFC 9457 Section 5.2 recommends idempotency-key pattern for
command APIs.

### P-B-12 — Every architectural decision is an ADR

Changes to: layer boundaries, new layers, deleted layers, cross-cutting
concern governance, public API shapes (breaking changes), inter-layer
interface contracts, deployment topology, and OT write-path prerequisites
require a written Architecture Decision Record (see Section 7 for template)
ratified before implementation. ADRs are append-only; superseded ADRs
remain in the registry with a `superseded_by` link.
Justification: GAMP 5 Section 5.3 requires traceability of design decisions
to requirements. A decision made verbally and implemented without an ADR is
unauditable and often reversed inconsistently in later waves.

### P-B-13 — Failure modes favor safety, not availability

L1 fails closed (deny on policy store outage; never permit by default).
L3 rejects transitions when guards cannot be evaluated to a definitive
result (indeterminate → reject). L5 surfaces staleness explicitly (workspace
banner) rather than serving stale data silently beyond the SLO threshold.
L9 OT enforces all N-prerequisites for the write-path even when upstream
connectivity is degraded — the edge node evaluates prerequisites locally.
Justification: for regulated records, a spurious permit (wrongly allowing
a mutation) is categorically more severe than a spurious deny (incorrectly
blocking a user). 21 CFR Part 11 §11.10(h) requires limiting system access
to authorized individuals. The fail-closed posture enforces this even
under infrastructure degradation.

### P-B-14 — The Operational Truth Graph is the single projection truth source

Workspace projections, genealogy graphs, release readiness views, and
analytic data products are derived exclusively from the OTG (L5). No
workspace or UI surface reads directly from L4 roots. No workspace mutates
the OTG. This separation implements the CQRS (Command Query Responsibility
Segregation) pattern at the layer boundary: L4 for command truth, L5 for
query truth.
Justification: without this separation, every UI query directly loads the
transactional L4 tables, which (a) creates read contention with write-path
transactions, and (b) prevents independent scaling of the read path. More
critically for HESEM's regulated use case, it prevents the projection layer
from capturing derived regulatory facts (e.g., "is this lot's entire material
genealogy released?") that cannot be expressed as a single L4 query.

---

## 3. Architectural style

### 3.1 Chosen style: modular monolith with event-driven domain integration

HESEM is a **modular monolith** deployed as a set of cooperating processes
(PHP 8.5 API process + background worker processes) behind a unified L7
API gateway, sharing one PostgreSQL 16 cluster per tenant (with a hot-
standby replica for availability), connected via RabbitMQ for async
cross-domain event routing.

Within each process, domain modules are isolated by PHP namespace
(`MOM\Api\Controllers\`, `MOM\Api\Services\`, per domain sub-namespace).
Cross-domain calls within the process use typed Command and Query objects
dispatched through the L3 Command Bus — never direct class-to-class
invocation across domain boundaries. This enforces authority discipline
without the distributed-system overhead of separate services.

### 3.2 Rejected: full microservices (per-domain services)

Each microservice boundary requires its own: deployment pipeline, schema
migration discipline, health-check endpoint, circuit-breaker configuration,
inter-service mTLS, distributed tracing propagation discipline, and
independently validated test suite. For a team at HESEM's current scale
(pre-production-readiness prototype stage), the operational overhead of
fully distributed services is disproportionate. More critically:

- Cross-domain saga compensation (D6 NC-to-CAPA, D10 Batch-to-Release)
  is significantly harder to implement correctly across network boundaries
  than within a transactional monolith boundary.
- 21 CFR Part 11 audit chain integrity requires that the audit event and
  the mutation commit atomically. Distributed two-phase commits across
  microservice databases are complex and failure-prone at the validation
  level.

Microservice decomposition is evaluated starting Wave 9 (B7), when
operational team scale and domain boundary stability support it.

### 3.3 Rejected: pure event-sourced architecture (append-only event log only)

Pure event sourcing (where all state is derived by replaying an event log;
no authoritative row persisted) adds:
- Rehydration latency on every read (incompatible with ≤200 ms p95 SLO)
- Eventual-consistency windows on writes that conflict with 21 CFR Part 11
  §11.10(e) requirement for accurate and complete copies of records at the
  time of the record
- Snapshot discipline complexity that, when not rigorously maintained,
  causes rehydration correctness failures

HESEM uses **hybrid persistence**: authoritative roots persisted as rows in
L4 (PostgreSQL), with an event log and CDC used to derive L5 projections.
The audit chain is hash-linked (an event-sourcing property) but the
authoritative record is the row, not the event sequence.

### 3.4 Rejected: full monolith without module boundaries

A flat monolith with no namespace isolation produces a codebase where
any file can call any other file. This precludes: per-domain test isolation,
per-domain CI gates, per-domain deployment readiness assessment, and the
future decomposition path to microservices. HESEM's modular monolith
explicitly enforces namespace boundaries through PSR-4 autoloading rules
and CI import checks.

---

## 4. System decomposition map

Every architectural component enumerated with owner, primary dependencies,
and boundary.

```
COMPONENT                         LAYER  OWNER                 PRIMARY DEPS              BOUNDARY
─────────────────────────────────────────────────────────────────────────────────────────────────────
Identity Provider (OIDC / WebAuthn) L1    Identity Lead         OIDC upstream; L5 user    authn decisions only; no business logic
Session/Token Service               L1    Identity Lead         JWT/PASETO; L5 session    token issuance + revocation
Policy Evaluation Engine (PEE)      L2    Authority Lead        L2 policy registry (L5);  RBAC+ABAC evaluation; no domain logic
                                                                L1 actor claims
Compliance Directive Registry       L2    Compliance Lead       L5 postgres; ext reg feed regulation-to-policy mapping only
E-Signature Obligation Service      L2    Compliance Lead       PEE; L3 command binding   obligation declaration; no UI
Workflow Command Bus (WCB)          L3    Workflow Lead         L2 policy; L4 roots; L5   command dispatch, saga, idempotency
Saga Coordinator                    L3    Workflow Lead         WCB; L5 saga_log          cross-SM compensation; no business logic
State Machine Engine (×14 SMs)      L3    Workflow Lead + DLs   WCB; L4 roots             guard evaluation; transition execution
Domain Root Families (×14 domains)  L4    Backend Lead + DLs    L3 commands; PostgreSQL   authoritative records; no presentation
Operational Truth Graph Engine      L5    Data Platform Lead    CDC from L4; event bus    projection; lineage; no mutation
Materialized View Refresh Service   L5    Data Platform Lead    OTG Engine; PostgreSQL    view refresh; SLO staleness check
WORM / Evidence Object Store        L5    Compliance Lead+SRE   S3 (Object Lock); L3      evidence write-once; no delete path
Frontend SPA + HMV4 Shell           L6    Frontend Lead         L7 REST; Graphics Auth    UI render state; no business logic
Graphics Authority                  L6    Frontend Lead         design_token catalog (L5) visual token governance; no app logic
API Gateway / Route Layer           L7    API Lead              L1 authn; L2 authz; L3   public surface; schema validation
OpenAPI Contract Registry           L7    API Lead              L7 route layer; CI        contract-first governance
RFC 9457 Problem Registry           L7    API Lead              L7 route layer            62-entry error type-URI catalog
Event Bus (RabbitMQ)                L8    SRE Lead + WL         L3 outbox; L5 projectors  async routing; no business logic
Kubernetes Deployment Topology      L8    SRE Lead              all layers (scheduling)   platform substrate; no logic
OpenTelemetry Collector             L8    SRE Lead              all layers (telemetry)    trace + metric + log aggregation
Prometheus + Loki + Grafana         L8    SRE Lead              OTel Collector            metric store; log store; dashboards
AlertManager                        L8    SRE Lead              Prometheus                alert routing; escalation policy
Deployment Pipeline (CI/CD)         L8    SRE Lead              source repo; L8 k8s       build → test → deploy; gate enforcement
Edge Gateway / OT Connector         L9    OT Lead / SRE Lead    SCADA; PLC; OPC UA;       OT-safe bounded write-path; air-gap
                                                                MQTT Sparkplug B
DCC Document Header System          L4/L7 Compliance Lead+API   dcc_document_header       doc-code–keyed header governance
```

---

## 5. Quality attributes (per ISO/IEC 25010:2023)

```
ATTRIBUTE              TARGET LEVEL                  HOW ACHIEVED
──────────────────────────────────────────────────────────────────────────────────────────────
Availability           99.9% per tenant per month     Multi-AZ PostgreSQL hot-standby; RabbitMQ
                       (SLO per B9; SLO-1)            quorum queues; Kubernetes PDB; L8 DR
                                                      runbooks RTO ≤ 4 h; RPO = 0 committed
Reliability            Zero data loss on committed    PostgreSQL synchronous replica for writes;
                       write; zero phantom permits    WORM object-lock for evidence; idempotent
                                                      replay (CC-5) for inflight commands; L1
                                                      fail-closed on outage
Performance            API p95 ≤ 200 ms (read);       Per-layer SLOs in B9; L5 materialized
                       p95 ≤ 500 ms (command);        view refresh ≤ 30 s staleness SLO;
                       projection freshness ≤ 30 s    L7 rate-limit; HTTP/2; connection pool;
                       (SLO-4, SLO-5)                 per-domain read-replica routing
Security               OWASP ASVS 5.0 Level 2;        L1 WebAuthn FIDO2 + OIDC + MFA-required
                       IEC 62443 SL-2 (OT zone);      for regulated actions; L2 RBAC+ABAC;
                       21 CFR Part 11 §11.10 / §11.50 L4 RLS + tenant middleware; L8 secret
                                                      rotation (30-day max); CS-A security stream
Privacy                GDPR Art. 5; NIST SP 800-188   L5 pseudonymization key per tenant;
                       PII minimization; ISO 27018     L2 ROPA + DPA registry; per-field PII
                                                      tagging in domain model; right-to-erasure
                                                      via pseudonymization key deletion
Accessibility          WCAG 2.2 AA — zero serious      L6 HMV4 shell aria-* per APCA; automated
                       violations (CC-12)              axe-core scan in E2E suite; per-slice
                                                      accessibility gate before graduation
Maintainability        Modular namespace isolation;    One PHP namespace per domain; forbidden
                       forbidden dep enforcement;      cross-layer dep CI check (ADR-B-003);
                       ADR governance for changes      ADR mandatory for layer changes; per-
                                                      domain test coverage gate
Testability            100% E2E gate per HMV4 slice;   Playwright spec per slice; contract test
                       contract test per L7 family     per API family (Pact); fixture-first E2E;
                                                      per-layer unit test + integration test
Regulatory             21 CFR Part 11; EU GMP Annex   Audit chain hash-link + daily anchor;
Conformance            11; GAMP 5 V-model; IEC 62443; e-sig obligation enforcement in L2; WORM
                       ISO 13485; IATF 16949; AS9100; evidence in L5; IQ/OQ/PQ per CS-B;
                       FSMA; DSCSA (where applicable) per-wave validation maturity gate
AI Governance          NIST AI RMF (MAP, MEA, GV,     L1 banned-decision enforcement; L2 AI
                       MS); EU AI Act high-risk class  advisory policy registry; CI scan of
                                                      command handlers (RB-CI-003); human-in-
                                                      loop enforced at both L1 and L3; override
                                                      log in L5 for every AI advisory accepted
```

---

## 6. Cross-cutting concerns map

The twelve cross-cutting concerns. For full specification of each, see B6.

```
#     CONCERN                    GOVERNANCE OWNER     THREADS THROUGH
─────────────────────────────────────────────────────────────────────────────────────
CC-1  Audit chain                L3 (event emit)       L1 (deny events), L2 (obligation events),
      hash-linked; daily anchor  + L5 (anchor store)   L3 (mutation events), L4 (audit columns),
      per 21 CFR Part 11 §11.10(e)                     L8 (anchor recency alert)

CC-2  Electronic signature        L2 (obligation)       L1 (actor binding), L6 (UI sig capture),
      per 21 CFR Part 11 §11.50 + L3 (capture +        L7 (transport), L5 (sig record WORM)
      §11.70; EU GMP Annex 11 §9  binding)

CC-3  Internationalization         L6 (render layer)    L4 (locale columns), L5 (translated
      ICU MessageFormat 2.0;      + L7 (locale          projections), L7 (Accept-Language),
      CLDR; Unicode BIDI           headers)             L8 (locale in structured logs)

CC-4  Tenant isolation             L1 (middleware       Every layer — zero exceptions permitted.
      tenant_id; PostgreSQL RLS    extraction) + L5     Absence of tenant_id on any L4 mutation
                                   (RLS policy)         is a SEV-1 rejection.

CC-5  Idempotency                  L3 (store) + L7      L7 (Idempotency-Key extraction),
      Idempotency-Key; 24-h window  (header binding)    L3 (lookup before dispatch),
                                                        L5 (idempotency_key table)

CC-6  Optimistic concurrency        L4 (version col)    L7 (ETag / If-Match extraction),
      ETag / If-Match; HTTP 409     + L7 (header)       L3 (version guard check), L4 (CAS)

CC-7  Problem details               L7 (serialization)  L1 (authn errors), L2 (policy errors),
      RFC 9457; 62-entry registry                       L3 (guard failures), L4 (invariant
                                                        violations), L9 (OT boundary errors)

CC-8  Observability                 L8 (OTel collector) Every layer emits traces + metrics +
      OpenTelemetry 1.x; W3C        aggregates          logs. Dashboards per B9. SLO breach
      Trace Context                                      alert fires from L8 AlertManager.

CC-9  Performance budget            L8 (SLO alerting)   L1 (authn ≤ 20 ms p95), L3 (command
      per-layer SLO targets         + L7 (rate limit)   ≤ 300 ms p95), L7 (read ≤ 200 ms p95;
                                                        write ≤ 500 ms p95), L5 (projection
                                                        freshness ≤ 30 s)

CC-10 Retention and WORM            L2 (retention        L4 (record class tag), L5 (storage tier
      per retention class;          policy registry)     routing to object-lock), L8 (backup
      object-lock per ISO 27001      + L5 (object store) policy enforcement)

CC-11 AI advisory governance        L1 (actor identity   L3 (command handler guards — ActorNotAI
      banned-decision enforcement;   policy) + L2 (AI    guard on 8 banned verbs), L5 (advisory
      override log; NIST AI RMF      policy registry)    override log), L9 (OT advisory gate)

CC-12 Accessibility                 L6 (render layer)    L7 (ARIA-relevant API contracts),
      WCAG 2.2 AA; zero serious                          L8 (axe-core scan in CI per slice)
      violations
```

---

## 7. Decision-record discipline

### 7.1 ADR template

Every ADR follows this template exactly. The template is enforced in CI
by a schema-check script that parses the front-matter block.

```
─────────────────────────────────────────────────────
ADR-B-NNN  [Short imperative title]

Status:        Proposed | Accepted | Superseded | Deprecated
Date:          YYYY-MM-DD
Deciders:      [roles, not names — roles are durable; names change]
Supersedes:    ADR-B-NNN or "none"
Superseded-by: ADR-B-NNN or "none"
Class:         A (layer boundary) | B (CC governance) |
               C (interface contract) | D (public API breaking)

Context:
  Describe the situation, constraints, and forces in play.
  No marketing. No aspirational adjectives. Regulatory
  requirement must be cited by section number if applicable.

Decision:
  The concrete choice made. Present tense. Specific.

Consequences:
  - What is now easier (concrete; not "improved quality")
  - What is now harder (concrete trade-off)
  - Risks accepted (by whom; with what mitigation)
  - Compliance impact (which standard; which clause)
─────────────────────────────────────────────────────
```

### 7.2 ADR classes and ratification requirements

```
Class A — Layer change (new, modified, or deleted layer)
  Ratified by: Platform Lead + all Domain Leads + Compliance Lead
  Review required: 2-week comment window before ratification

Class B — Cross-cutting concern governance change
  Ratified by: Platform Lead + all affected layer leads
  Review required: 1-week comment window

Class C — Inter-layer interface contract change
  Ratified by: affected layer leads (both sides of interface)
  Review required: standard PR review (2 approvers)

Class D — Public API breaking change
  Ratified by: API Lead + all affected consumer teams
  Review required: 2-week deprecation notice published first
```

### 7.3 ADR review cycle

Quarterly review chaired by Platform Lead. All Accepted ADRs are
re-examined for continuing validity. If the decision context has
materially changed, the ADR is moved to Superseded and a new ADR
drafted. Superseded ADRs are never deleted from the registry — they
are the record of architectural reasoning over time.

### 7.4 ADR registry stub (current baseline)

```
ID           TITLE                                                    STATUS    CLASS
──────────────────────────────────────────────────────────────────────────────────────────
ADR-B-001    Modular monolith as deployment architecture              Accepted   A
ADR-B-002    PostgreSQL as authoritative root store (not event-only)  Accepted   A
ADR-B-003    Forbidden cross-layer dependency CI enforcement          Accepted   C
ADR-B-004    OpenTelemetry mandatory instrumentation across all layers Accepted  B
ADR-B-005    L9 OT as a distinct ninth layer (not part of L8)         Accepted   A
ADR-B-006    Authority Ledger as single policy evaluation path        Accepted   A
ADR-B-007    AI banned-decision enforcement at L1 actor + L3 guard   Accepted   B
ADR-B-008    RFC 9457 Problem Details as the single error schema      Accepted   C
ADR-B-009    Hybrid CDC + outbox for L4→L5 (no pure event sourcing)   Accepted  A
ADR-B-010    WebAuthn FIDO2 as primary L1 authentication mechanism    Accepted   A
ADR-B-011    Idempotency-Key mandatory on all mutating L7 endpoints   Accepted   C
ADR-B-012    Tenant isolation double-enforced: middleware + RLS       Accepted   B
ADR-B-013    Per-slice graduation L0→L7; no skipping; decision phrase Accepted  B
ADR-B-014    WORM object-lock for GxP evidence records                Accepted   A
```

---

## 8. Architectural risk register stub

Full entries in M6 Risk Register. Listed here as cross-reference pointers.

```
ARCH-R-001   Layer boundary violation in fast-path hotfix bypasses Command Bus
  Severity: High | Mitigation: CI ADR-B-003 dep check + PR gate | M6: M6-ARCH-001

ARCH-R-002   OTG projection lag exceeds 5-min SLO during high-volume migration
  Severity: High | Mitigation: L5 freshness alert; workspace read-lock on breach | M6: M6-ARCH-002

ARCH-R-003   AI actor identity escapes L1 banned-decision guard via role misconfiguration
  Severity: Critical | Mitigation: CI command handler scan RB-CI-003; 2-person role policy review | M6: M6-ARCH-003

ARCH-R-004   Tenant RLS policy regression leaks cross-tenant row
  Severity: Critical | Mitigation: Per-deploy tenant isolation integration test; L8 RLS coverage alert | M6: M6-ARCH-004

ARCH-R-005   Audit chain anchor gap (daily anchor missed beyond SLO window)
  Severity: High | Mitigation: L8 anchor recency alert (threshold 26 h); compensating anchor on resume | M6: M6-ARCH-005

ARCH-R-006   L9 OT write-path prerequisite bypass during upstream connectivity outage
  Severity: High | Mitigation: N-prerequisite enforcement on edge node locally; L9 fail-closed | M6: M6-ARCH-006

ARCH-R-007   OpenAPI contract drift: implementation response shape diverges from contract
  Severity: Medium | Mitigation: Contract test per API family in CI; schema drift count target zero | M6: M6-ARCH-007

ARCH-R-008   Evidence WORM object-lock disabled by cloud misconfiguration
  Severity: Critical | Mitigation: L8 weekly object-lock compliance report; IaC policy-as-code | M6: M6-ARCH-008
```

---

## 9. Reading order within Part B

For an architect or engineer about to design or modify HESEM components:

```
B0   this overview                              (15 min — mandatory first)
B1   Layered Architecture (9 layers + interfaces) (35 min)
B2   Authority Ledger (Authority Model V10)      (25 min)
B3   Operational Truth Graph                    (25 min)
B4   State Machine Network (14 coupled SMs)     (20 min)
B5   Data Flow & Lineage (CDC, outbox, lineage)  (15 min)
B6   Cross-Cutting Concerns (12 CC specs)        (20 min)
B7   Deployment Topology (K8s, multi-AZ, DR)    (15 min)
B8   Integration Boundaries (Edge, partner)     (15 min)
B9   Observability & Metrics (OTel, SLOs)       (15 min)
```

Total: ~200 minutes for complete Part B absorption. Engineers working on
a single layer may abbreviate by reading B0 + B1 + the specific B2-B9
chapter relevant to their layer, then the cross-cutting concerns chapter
(B6) for the concerns they must implement.

---

## 10. Cross-references to other Parts

```
THIS CHAPTER          REFERENCES                    DEPENDENCY DIRECTION
B0 §2 Principles  →  A1 §6 (P1-P10 non-negotiable) B0 implements what A1 declares
B0 §4 Decomp map  →  C1-C14 (domain capabilities)  C lives in layers defined in B1
B0 §5 Quality     →  A4 (standards list)            A4 names; B0 §5 targets + methods
B0 §8 Risk reg    →  M6 (risk register)             M6 full entries; B0 stubs only
B0 §6 CC map      →  B6 (CC full spec per concern)  B6 expands each CC row in B0 §6
B1 layers         →  B2 (Authority Ledger at L2)    B2 expands L2 governance contract
B1 layers         →  B3 (OTG at L5)                B3 expands L5 projection discipline
B1 layers         →  B4 (State Machines at L3)      B4 expands L3 SM guard catalog
B1 layers         →  B6 (Cross-Cutting Concerns)    B6 owns specification of CC-1..12
B1 layers         →  B7 (Deployment Topology)       B7 expands L8 Kubernetes topology
B1 layers         →  B8 (Integration Boundaries)    B8 expands L7+L9 boundary contracts
B1 layers         →  B9 (Observability & Metrics)   B9 expands L8 SLO / alert catalog
B1 §8 wave map    →  G0-G14 (Wave Plan)             G says when; B1 says what per layer
B1 L6/L7          →  E0-E15 (API catalog)           E expands the public surface of L7
B1 L6             →  F0-F12 (Frontend catalog)      F expands the surfaces of L6
B1 §7 domain map  →  C1-C14 + M2 (Domain Models)   C and M2 own per-domain roots in L4
B1 L8 security    →  I7 (Security Ops)              I7 expands the security posture of L8
```

---

## 11. Decision phrase

```
B0_PART_B_OVERVIEW_V10_DEEP_UPGRADE_COMPLETE
PART_B_OVERVIEW_BASELINE_LOCKED
NEXT: B1_LAYERED_ARCHITECTURE.md (V10 deep upgrade)
```
