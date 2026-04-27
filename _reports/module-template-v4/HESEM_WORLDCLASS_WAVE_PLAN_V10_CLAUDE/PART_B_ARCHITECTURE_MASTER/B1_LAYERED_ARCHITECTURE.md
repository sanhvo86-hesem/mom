# B1 — Layered Architecture (V10 Deep Upgrade)

```
chapter_id:   B1
version:      V10
upgrade_from: V9-shallow (8 layers, L1-L8)
upgrade_to:   V10 (9 layers, L1-L8 + L9 OT)
key_change:   V9 L1 "Identity, Authority, Authorization" split into
              V10 L1 "Identity & Authentication" + L2 "Authority & Policy";
              V9 L2 "Governance, Compliance, Validation" merged into V10 L2;
              L9 OT added as a new explicit layer.
upgrade_by:   S1-01_B0_B1_LAYERED_ARCHITECTURE_DEEP_UPGRADE
standards:    ISA-95/IEC 62264 Levels 0-4; ISA-88/IEC 61512; IEC 62443 SL-2;
              21 CFR Part 11 §11.10; EU GMP Annex 11; OWASP ASVS 5.0;
              NIST SP 800-204; Team Topologies (Skelton-Pais);
              OpenTelemetry semantic conventions 1.x; RFC 9457
```

---

## 1. Orientation

This chapter describes the nine layers of HESEM's architecture. Every
component lives in exactly one layer. Every layer has: a bounded
responsibility (what it does and what it explicitly does not do), a concrete
component list, defined inputs, defined outputs, the cross-cutting concerns
it owns or consumes, per-layer SLOs, team ownership per Skelton-Pais topology
classification (stream-aligned, enabling, complicated-subsystem, platform),
scaling characteristic, and security posture per IEC 62443.

Layers are presented bottom-up from substrate (L8) to OT edge (L9), skipping
to core (L1 identity) through domain (L4) and projection (L5) to presentation
(L6) and surface (L7). This ordering is pedagogical only; event flows and
request flows cross layers in both directions within a single interaction.

```
L1  Identity & Authentication
L2  Authority & Policy
L3  Workflow & Command Bus
L4  Domain Roots & Mutations
L5  OTG / Persistence
L6  Frontend / Presentation
L7  API Gateway / Public Surface
L8  Platform / SRE / Observability
L9  OT — Operational Technology / Edge
```

---

## 2. The nine layers

---

### L1 — Identity & Authentication

**Bounded responsibility.** L1 answers one question on every incoming request:
*who is acting?* L1 proves the identity of the actor (human user, machine
service, OT edge process, AI advisory service) and issues a cryptographically
signed claims set that downstream layers consume. L1 does not answer whether
the actor is permitted to perform any specific action — that is L2. L1 does
not know what the action is in business terms — that is L3. L1's output is
an actor identity: a verified, tenant-scoped, role-bearing, factor-annotated
claims bundle.

**Components inside L1.**
- WebAuthn FIDO2 authenticator registration and assertion handler (for
  human users; passkeys and hardware security keys accepted)
- OIDC 1.0 relying party integration (for enterprise SSO: Azure AD, Okta,
  Ping, Google Workspace; mapped to HESEM's internal actor model)
- JWT / PASETO-v4 token issuance service (signed with Ed25519; 15-minute
  access tokens; 8-hour refresh tokens for human sessions; 60-second tokens
  for M2M)
- MFA orchestration service (TOTP / FIDO2; MFA required for all GxP actions
  per 21 CFR Part 11 §11.300)
- Session store (Redis; per-tenant key namespace; 15-minute sliding window)
- Actor identity model: {actor_id, tenant_id, roles[], factors_used[],
  auth_method, auth_time, jti, device_id}
- Token revocation list (Redis; per-jti; checked on every request for GxP
  actor classes)
- Machine-to-machine credential store (client_credentials grant; scoped per
  integration service; per ADR-B-010)

**Inputs (from which layers; interface kind).**
- External: HTTPS POST from browser/mobile (WebAuthn assertion JSON per
  FIDO Alliance Level 2 spec)
- External: HTTPS Authorization Code flow redirect from OIDC provider
- L7 → L1: Bearer token header on every API request (HTTP Authorization
  header; verified before route dispatch)
- L9 → L1: Edge service credential verification (client_credentials;
  short-lived M2M token per L9 integration)

**Outputs (to which layers; interface kind).**
- → L2: actor claims object (internal typed struct; not HTTP; passed in
  request context after L1 verification completes)
- → L3: actor_id embedded in command (command constructor requires actor
  claims; not optional)
- → L5: auth_event rows (INSERT; synchronous; before L1 returns response)
- → L8: auth trace span (OTel; actor_id, tenant_id, auth_method, success/fail)

**Cross-cutting concerns owned by L1.**
- CC-4 Tenant isolation: tenant_id extracted from claims; bound to request
  context. If tenant_id absent or mismatched, L1 returns 401 before L2.
- CC-11 AI governance: actor class (human | machine | ai_advisory) embedded
  in claims. L2 and L3 consume actor class for banned-decision enforcement.

**Cross-cutting concerns consumed by L1.**
- CC-7 Problem details: L1 errors serialized as RFC 9457 (type:
  /problems/auth/invalid-credential, /problems/auth/mfa-required,
  /problems/auth/token-expired)
- CC-8 Observability: every authentication attempt emits OTel span
  (auth.method, auth.outcome, auth.tenant_id, auth.factor_count)
- CC-9 Performance budget: L1 SLO — authn decision p95 ≤ 20 ms
  (token verify + claims extraction; no I/O on cached tokens)

**Per-layer SLOs.**
```
SLO-L1-1  Token verification p95 ≤ 20 ms (cache hit; no remote call)
SLO-L1-2  OIDC callback completion p95 ≤ 800 ms (includes IdP round-trip)
SLO-L1-3  Token revocation propagation ≤ 60 s (Redis replication lag)
SLO-L1-4  MFA challenge issuance p95 ≤ 300 ms
```

**Team ownership (Skelton-Pais).** Complicated-subsystem team. Reason:
cryptographic correctness, OIDC protocol compliance, FIDO2 attestation
verification, and regulatory requirements on authentication (21 CFR Part 11
§11.300) make this a specialized subsystem. The identity team owns L1 end-to-
end; other teams consume L1 as a platform service.

**Scaling characteristic.** Stateless with Redis-backed session cache. Token
verification is CPU-bound (Ed25519 verify) with no I/O on cache hits. Scales
horizontally. Session store scales with Redis Cluster per tenant namespace.

**Security posture (per IEC 62443).**
- IEC 62443-3-3 SL-2 on the authentication boundary (identification and
  authentication of users per SR 1.1 to SR 1.11)
- OWASP ASVS 5.0 Chapter 2 (Authentication); Chapter 3 (Session Management)
- Credential storage: PBKDF2-SHA512 (backup codes); no plaintext credential
  anywhere in the system
- FIPS 140-3 Level 1 cipher compliance enforced on all L1 cryptographic
  operations (for ITAR-scope tenants per J3 Aero pack)

---

### L2 — Authority & Policy

**Bounded responsibility.** L2 answers one question per command: *is the
verified actor permitted to perform this specific action on this specific
resource within this tenant right now, and if so, what obligations attach?*
L2 evaluates a combination of RBAC (role-based) and ABAC (attribute-based)
policy directives against the actor claims from L1, the target resource
attributes, and the action verb. L2 returns a permit or deny decision plus
an obligation set (e-signature required, reason-for-change required, two-
person integrity required, etc.). L2 does not know the business meaning of
the action — that is L3 and L4. L2 does not render UI — that is L6.

**Components inside L2.**
- Policy Evaluation Engine (PEE): XACML-inspired multi-attribute rule
  evaluator; evaluates policy directives in priority order; returns
  {decision: permit|deny|not-applicable|indeterminate, obligations[]}
- Policy Directive Registry: table `authority_policy_directive` (per L5);
  per-tenant-per-role-per-resource-family-per-verb rules; cache TTL 60 s
- Compliance Directive Registry: table `compliance_directive` (per L5);
  GxP/ITAR/regulatory obligations mapped to action classes; updated by
  Compliance Lead via governed change control
- E-Signature Obligation Service: evaluates whether a specific action
  requires e-sig (per 21 CFR Part 11 §11.50 / §11.70); issues e-sig
  challenge token to L3 for binding
- Retention Policy Registry: table `retention_policy_class`; per record
  class, per jurisdiction; consumed by L5 storage tier router
- AI Advisory Policy Registry: table `ai_advisory_policy`; defines which
  domains have AI advisory enabled; which verbs are banned for AI principals;
  per-tenant configuration
- ROPA Registry (per GDPR Art. 30): table `ropa_registry`; per data category
  per purpose; consumed by L5 PII pseudonymization service
- /can endpoint (read-only): answers "can actor X perform verb V on resource
  R?" without dispatching a command; consumed by L6 for conditional UI render

**Inputs (from which layers; interface kind).**
- L1 → L2: actor claims (internal typed struct; included in request context;
  not a separate HTTP call — in-process context propagation)
- L7 → L2: resource_family, action_verb, resource_id, tenant_id (extracted
  from the L7 route handler before Command Bus dispatch)
- External (regulatory feeds): compliance directive update publications
  (ingested via L8-controlled regulatory update pipeline; Compliance Lead
  must ratify each update as a policy change before PEE adopts it)

**Outputs (to which layers; interface kind).**
- → L3: policy decision + obligation list (typed PolicyDecision struct;
  Command Bus requires a PERMIT decision before accepting a mutating command)
- → L6: /can response (HTTP 200 JSON {permitted: bool, obligations: []}  ;
  consumed by L6 to show/hide/disable UI elements — L6 never decides locally)
- → L5: obligation_event rows (every obligation issued is an event in
  `obligation_event` for audit trail completeness)
- → L8: policy_eval trace span (OTel; actor_id, resource_family, verb,
  decision, obligations_count, eval_duration_ms)

**Cross-cutting concerns owned by L2.**
- CC-2 E-Signature: obligation declaration authority. L2 declares whether
  e-sig is required; L3 captures the sig; L6 presents the UI capture;
  L5 stores the evidence WORM.
- CC-10 Retention and WORM: L2 owns the retention policy registry.
  L5 routes evidence records to the correct object-lock tier based on
  L2's declared retention class for each record type.
- CC-11 AI governance: L2 AI Advisory Policy Registry defines banned-
  decision verbs for AI principals. PEE enforces: if actor_class = AI
  and action_verb ∈ banned_decision_set → DENY regardless of role.

**Cross-cutting concerns consumed by L2.**
- CC-7 Problem details: policy DENY produces RFC 9457 problem-detail
  (type: /problems/authority/policy-deny; includes policy_directive_id,
  obligation_hints for what would make it a PERMIT)
- CC-8 Observability: every policy evaluation emits OTel span
- CC-9 Performance budget: L2 SLO — policy eval p95 ≤ 15 ms (cache hit)

**Per-layer SLOs.**
```
SLO-L2-1  Policy evaluation p95 ≤ 15 ms (cache hit; warm policy store)
SLO-L2-2  Policy cache miss fill p95 ≤ 80 ms (registry fetch + re-cache)
SLO-L2-3  /can response p95 ≤ 25 ms (used by L6 for UI rendering)
SLO-L2-4  Compliance directive propagation ≤ 5 min after ratification
```

**Team ownership (Skelton-Pais).** Platform team. Reason: L2 policy changes
affect every domain simultaneously. The authority team owns the PEE and the
policy registry schema; domain leads author the policy directives for their
domains following a governed template.

**Scaling characteristic.** Stateless evaluation engine with a replicated
in-process policy cache (per-tenant; 60-second TTL; warm-up on start). Policy
registry is read-heavy; read replicas for the compliance directive table
route traffic. Policy changes are low-frequency; cache invalidation via Redis
pub/sub channel.

**Security posture.** OWASP ASVS 5.0 Chapter 4 (Access Control). PEE is a
closed evaluator: it evaluates directives it holds; it does not accept
arbitrary policy expressions from L7 requests. Policy directives are only
writeable via governed migration scripts or via the Compliance Lead admin
workflow — never via the public API.

---

### L3 — Workflow & Command Bus

**Bounded responsibility.** L3 is the only layer permitted to mutate L4
authoritative roots. L3 receives typed commands from L7 (the public surface)
after L1 authentication and L2 authorization are complete. L3 evaluates
transition guards (business-rule conditions beyond RBAC/ABAC), executes the
mutation via L4's typed transaction interface, emits workflow events and audit
events, and manages cross-SM saga compensation when multi-step operations
need rollback. L3 does not render UI. L3 does not compute projections.
L3 does not call L7 directly (it publishes events; an outbox-to-event-bus
path in L8 delivers them).

**Components inside L3.**
- Workflow Command Bus (WCB): typed command dispatcher; receives Command
  objects; verifies L2 PERMIT decision attached; dispatches to the
  registered state machine handler for the command verb; enforces
  idempotency (CC-5) before dispatch
- State Machine Engine (SME): evaluates the current state of the target
  root (fetched from L4 via direct PostgreSQL read within the same
  transaction); applies the guard list for the requested transition;
  on guard pass, writes the state transition and emits events within the
  same PostgreSQL transaction; on guard fail, returns RFC 9457 problem-
  detail listing failing guards with human-readable reasons per locale
- 14 State Machine Definitions (SMs per M4 directory): SM-1 (Order),
  SM-2 (Procurement), SM-3 (Work Order), SM-4 (Inspection), SM-5 (NC),
  SM-6 (CAPA), SM-7 (Document), SM-8 (Training), SM-9 (Maintenance),
  SM-10 (Batch Release), SM-11 (Calibration), SM-12 (Complaint/Recall),
  SM-13 (Audit), SM-14 (Validation)
- Saga Coordinator: manages multi-SM cross-domain sagas (e.g., D10
  Batch-to-Release requires SM-3, SM-4, SM-10 transitions to succeed
  in sequence with compensating rollbacks on failure); saga log in L5
- Idempotency Store (CC-5): table `idempotency_key` (L5); Idempotency-Key
  → command result; 24-hour TTL; checked before every mutating command
- Transition attempt log: every attempted command recorded (including
  rejected ones) for compliance audit of failed transitions
- /workflow/status endpoint: returns the current workflow state of a root
  plus the legal next transitions for the current actor

**Inputs (from which layers; interface kind).**
- L7 → L3: Command object (typed PHP class; includes actor_claims,
  policy_decision, idempotency_key, target_root_id, payload)
- L9 → L3: OT event translated to typed Command by L9 Edge Gateway
  (bounded write-path; all N prerequisites verified at L9 before
  forwarding to L3)
- L2 → L3: PolicyDecision (PERMIT + obligation list; embedded in command)

**Outputs (to which layers; interface kind).**
- → L4: typed mutation (SQL transaction via repository interface; L3 calls
  the L4 repository's typed mutation method — never raw SQL from L3)
- → L5: workflow_event (INSERT to `workflow_event`; within same Postgres
  txn; CDC picks up for OTG projection update)
- → L5: audit_event (INSERT to `audit_event`; within same Postgres txn;
  hash-linked before commit; part of CC-1 audit chain)
- → L8 outbox → event bus: domain events published via transactional
  outbox pattern (L3 writes to `outbox_event`; L8 outbox relay delivers
  to RabbitMQ after commit — never before)

**Cross-cutting concerns owned by L3.**
- CC-1 Audit chain: L3 is the primary audit event emitter for mutations.
  Every successful transition writes an audit event linked to the previous
  event's hash (SHA3-256). Guard failures also emit audit events.
- CC-5 Idempotency: Idempotency store owned and enforced by L3. L3
  checks before dispatch and stores result after dispatch.
- CC-6 Optimistic concurrency: L3 passes the ETag (version number from
  L7) to the L4 repository CAS (compare-and-swap) check. On version
  mismatch, L3 surfaces HTTP 409 with RFC 9457 problem-detail.

**Per-layer SLOs.**
```
SLO-L3-1  Command execution p95 ≤ 300 ms (L1+L2+L3+L4 end-to-end
           for a single-SM transition with no saga)
SLO-L3-2  Guard evaluation p95 ≤ 50 ms (per guard; excluding I/O guards)
SLO-L3-3  Idempotency lookup p95 ≤ 5 ms (PostgreSQL index scan)
SLO-L3-4  Saga compensation initiation ≤ 2 s after failure detected
SLO-L3-5  Workflow event emission within same Postgres transaction
           (no eventual consistency on the write event; atomic)
```

**Team ownership (Skelton-Pais).** Platform team (WCB, SME, Saga Coordinator)
+ Stream-aligned domain teams (SM definitions per domain; guard authors are
domain engineers; WCB and SME are platform-owned infrastructure).

**Scaling characteristic.** Stateless command processor. The WCB and SME are
pure in-process logic; they scale with the API process. The idempotency store
and saga log in L5 are the durable state; they scale with the PostgreSQL
cluster. The outbox relay in L8 scales independently as a background process.

**Security posture.** OWASP ASVS 5.0 Chapter 5 (Validation); every command
payload is schema-validated before guard evaluation. L3 never accepts raw
SQL input. Guard functions are registered at startup; they cannot be injected
at runtime via API request. AI principal enforcement: every banned-decision
command handler explicitly declares `ActorNotAIPrincipal` as its first guard;
a CI scanner (RB-CI-003) verifies this for all 8 banned verbs.

---

### L4 — Domain Roots & Mutations

**Bounded responsibility.** L4 holds the canonical, authoritative state of
every business object as rows in PostgreSQL tables. L4 is the system of
record — the only place where the definitive, current state of a root lives.
L4 does not contain workflow logic, presentation hints, computed columns for
UI convenience, or cross-domain business rules. A row in L4 is the minimum
complete set of fields needed to define what the object is and prove what
happened to it. Derived views, aggregations, and workspace projections live
in L5.

**Components inside L4.**
- 95 authoritative root table families (examples: `sales_order`,
  `purchase_order`, `lot`, `batch_release`, `nonconformance_case`,
  `capa`, `controlled_document`, `equipment`, `calibration_record`,
  `maintenance_work_order`, `training_record`, `inspection`, `audit_finding`)
- Tenant scoping columns: `tenant_id` NOT NULL on every root table;
  enforced by PostgreSQL RLS policy (per CC-4)
- Optimistic-lock version columns: `version` INTEGER NOT NULL DEFAULT 1
  on every mutable root; incremented on every mutation; base for CC-6 ETag
- Audit columns: `created_at`, `created_by`, `updated_at`, `updated_by`,
  `superseded_by_id` (nullable; set when a new version supersedes this row)
- State columns: `status` (per SM definition); `status_updated_at`;
  `status_updated_by`
- Repository interface: one typed PHP repository class per root family
  (e.g., `LotRepository`); contains mutation methods and targeted read
  methods; no raw SQL exposed to L3
- Migration files: numbered SQL migrations (currently 158+ files in
  `mom/database/migrations/`); one migration per schema change; forward-
  only (no down migrations in production; rollback via compensating
  migration per ADR-B-002)
- Invariant guards: PostgreSQL CHECK constraints + TRIGGER functions for
  invariants that must be enforced even if a bug in L3 sends an invalid
  mutation (defense in depth)

**Inputs (from which layers; interface kind).**
- L3 → L4: typed mutation method call on Repository (in-process;
  wrapped in PostgreSQL transaction started by L3)
- Internal only: no layer below or above L4 writes to L4 except L3

**Outputs (to which layers; interface kind).**
- → L5: CDC events (PostgreSQL logical decoding via `pg_logical`;
  every INSERT/UPDATE/DELETE emits a CDC record to L5 projectors)
- L4 → L3: current state rows (within same Postgres transaction;
  L3 reads current state to evaluate guards before mutating)
- L4 → L7: read-model rows (L7 read endpoints query L4 directly
  for authoritative record reads only; workspace reads go through L5)

**Cross-cutting concerns owned by L4.**
- CC-6 Optimistic concurrency: version column is the source of truth
  for ETag; PostgreSQL constraint enforces CAS (concurrent update
  fails at DB level if version mismatch)

**Cross-cutting concerns consumed by L4.**
- CC-4 Tenant isolation: RLS policy on every table enforces
  `tenant_id = current_setting('app.tenant_id')::uuid` for all queries
- CC-10 Retention and WORM: L4 rows for GxP record classes have a
  `retention_class_id` FK; L5 routes evidence records to correct
  object-lock tier based on this classification

**Per-layer SLOs.**
```
SLO-L4-1  Single-root mutation commit p95 ≤ 50 ms (Postgres write + WAL)
SLO-L4-2  Replica read lag ≤ 5 s (read replica; HA standby sync)
SLO-L4-3  Invariant violation count: target zero (any violation → SEV-2)
SLO-L4-4  Tenant isolation audit pass rate: 100% (any failure → SEV-1)
SLO-L4-5  CDC event emission lag ≤ 2 s from commit (pg_logical)
```

**Team ownership (Skelton-Pais).** Stream-aligned teams per domain (each
domain team owns the root table families for their domain) with a Backend
Platform Lead as integrator (reviews schema migrations affecting multiple
domains or cross-domain FK relationships).

**Scaling characteristic.** Write-heavy rows are on the primary; reads
are distributed to read replicas. Connection pooling via PgBouncer
(transaction-mode). Partitioning by `tenant_id` applied to high-volume
tables (`audit_event`, `workflow_event`, `lot`) at Wave 5 graduation.

**Security posture.** PostgreSQL RLS is the last-resort tenant boundary.
Even if L1 or L2 are misconfigured, RLS prevents cross-tenant reads.
Privilege escalation: no application user has `SUPERUSER`; no application
role can disable RLS (`BYPASSRLS` not granted). Injection: L4 repositories
use parameterized queries exclusively; no dynamic SQL construction.

---

### L5 — OTG / Persistence

**Bounded responsibility.** L5 maintains the Operational Truth Graph (OTG):
the derived, projection-based read model of HESEM's operational state.
L5 consumes CDC events from L4 and workflow events from L3, builds and
maintains projections (materialized views, graph nodes and edges, workspace
read models), manages WORM evidence storage, and provides the analytic
data products consumed by L6 and by external analytics systems. L5 is the
only layer permitted to denormalize. L5 never mutates L4. L5 never emits
audit events on its own (those come from L3 and L1 exclusively).

**Components inside L5.**
- OTG Node table (`otg_node`): one row per operational entity; fields:
  {node_id, tenant_id, root_family, root_id, state, state_updated_at,
  payload JSONB, projection_seq, freshness_ts}
- OTG Edge table (`otg_edge`): one row per relationship between nodes;
  fields: {edge_id, tenant_id, source_node_id, target_node_id, edge_type,
  established_at, dissolved_at}
- OTG Event log (`otg_event`): append-only; every CDC or workflow event
  that feeds the OTG; consumed by drift-detection service
- Projector registry: named projector functions subscribed to specific
  CDC event types; each projector updates OTG node/edge rows within a
  single idempotent apply (event_seq-gated; out-of-order events are
  deduplicated and reordered before apply)
- Materialized views (per domain): `lot_genealogy_view`, `open_nc_by_lot`,
  `release_readiness_view`, `training_eligibility_view`, `supplier_quality_score`,
  `oee_freshness_view`, `ai_advisory_acceptance_view`, `audit_chain_health`
- Workspace read models: per-root-family denormalized tables used by L7
  read endpoints for workspace projections (e.g., `ws_dispatch_board`,
  `ws_nc_case_list`, `ws_training_matrix`)
- WORM / Evidence Object Store: S3-compatible object store with Object Lock
  (Compliance mode; retention period per L2 retention class). Every GxP
  evidence record written here by L3 is immutable after write.
- Idempotency store (`idempotency_key` table): owned by L5 persistence;
  managed by L3 logic
- Saga log (`saga_log` table): owned by L5 persistence; managed by L3
  Saga Coordinator
- Pseudonymization key service: per-tenant symmetric encryption key;
  applied to PII fields before WORM storage; key deletion = functional
  erasure (per GDPR Art. 17 right-to-erasure implementation)
- Drift detection service: periodic job that replays a sample of OTG
  events against current OTG state; flags divergence as SEV-2 alert

**Inputs (from which layers; interface kind).**
- L4 → L5: CDC events via PostgreSQL logical decoding (`pg_logical`;
  decoded by the projector worker as a background L8-managed process)
- L3 → L5: workflow events and audit events (INSERT to `workflow_event`
  and `audit_event` tables; within same Postgres txn as L4 mutation;
  projectors pick up via CDC)
- L8 → L5: telemetry time-series for OEE and equipment KPIs
  (from L9 via L8 event bus → L5 KPI projector)
- L9 → L5: OT sensor readings (via L8 event bus → L5 OT-event projector)

**Outputs (to which layers; interface kind).**
- → L7: workspace projection query results (L7 read endpoints query L5
  workspace read models via indexed PostgreSQL reads)
- → L6: rendered workspace data (indirectly — L7 fetches from L5 and
  serializes to L6)
- External analytics: contract-bound data products (per C13; PostgreSQL
  schema published to Snowflake/Databricks via CDC connector for analytics
  tenants; governed by data product contract per C13)

**Cross-cutting concerns owned by L5.**
- CC-1 Audit chain: anchor generation (daily SHA3-256 anchor over the
  previous 24 hours of audit events; written to `audit_chain_anchor`;
  anchored to L8 timestamping service)
- CC-10 Retention and WORM: L5 routes evidence records to the correct
  object-lock tier (S3 Compliance mode; retention period from L2
  retention class); L5 enforces that no delete path exists for
  WORM-tier records

**Per-layer SLOs.**
```
SLO-L5-1  Projection freshness (workspace read model) ≤ 30 s from L4 commit
SLO-L5-2  OTG event processing lag p95 ≤ 5 s from CDC event reception
SLO-L5-3  Workspace read query p95 ≤ 80 ms (indexed read model query)
SLO-L5-4  Drift detection: zero unresolved drift events (daily check)
SLO-L5-5  Audit chain anchor freshness ≤ 26 h (daily + 2-hour grace)
SLO-L5-6  WORM write p95 ≤ 2 s from L3 evidence emit
```

**Team ownership (Skelton-Pais).** Complicated-subsystem team (Data Platform
Lead). OTG graph semantics, projector correctness, and WORM compliance are
specialized capabilities. Domain teams contribute projector functions for
their domain; the Data Platform team reviews and integrates.

**Scaling characteristic.** Read-heavy (workspace queries). Read replicas for
workspace read models. OTG event processing is a background worker (event-
driven; scales with worker process count). WORM storage scales independently
(object store; no application layer contention).

**Security posture.** WORM evidence store: IAM policy denies `s3:DeleteObject`
and `s3:PutObjectLegalHold` to all application roles; only a break-glass
operator role (with L8 SIEM alert on use) can override. PII pseudonymization:
all WORM records containing PII use the pseudonymization key before storage;
key is stored in a separate secrets vault (not in application database).

---

### L6 — Frontend / Presentation

**Bounded responsibility.** L6 renders HESEM's user-facing surfaces:
workspace projections, authoritative record shells, action consoles,
dialog drawers, sub-flow wizards, and the navigation shell. L6 translates
user intents (button clicks, form submissions, drag actions) into typed
L7 API calls. L6 does not implement business rules. L6 does not hold
authoritative state. L6 render state is ephemeral — a lost browser tab
loses nothing durable.

**Components inside L6.**
- HMV4 navigation shell: the outer chrome (sidebar, header, breadcrumb,
  notification bell, tenant switcher) rendered by `70-module-template-v4-
  hydration.js`; feature-flagged inert by default in pre-production
- Workspace projection surfaces: module views bound to L5-sourced
  projection endpoints; 18 Wave-1 root slices (DISP, NQCASE, TRAIN,
  CAPA, CDOC, INSP, BREL, ECO, JO, SO, WO, CPO, PO, QUO, PREC, LOT,
  IREV, MWO per WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md)
- Authoritative record shell (ARS) pattern: consistent layout for any
  single-root detail view; composed of: header (DCC header renderer),
  status badge, action console, tab panels (Overview, History, Related,
  Evidence), drawer anchors
- Graphics Authority binding: all visual tokens resolved via
  `window.GraphicsAuthority.tokens.read('<token_key>')` at render time;
  no hardcoded colors, spacing, or font-family strings in any L6 file
- ICU MessageFormat 2.0 locale system: all user-visible strings in
  message catalogs; locale resolved from `Accept-Language` + tenant
  preference; no string literals in JS or HTML templates
- Intent log: every user-submitted form and button-click emits a surface
  intent entry (client-side log; aggregated to L8; potential AI training
  data per L11 AI governance CC-11)
- Accessibility layer: aria-* attributes on all interactive elements;
  focus management on modal open/close; color contrast per APCA; axe-core
  run in E2E suite per slice

**Inputs (from which layers; interface kind).**
- L7 → L6: HTTP JSON responses (workspace projections, record details,
  /can responses, problem-detail error responses)
- L2 → L6 (via L7 /can): permitted action set for the current actor
  on the current resource; L6 shows/hides/disables UI elements based on
  this — never decides permission locally

**Outputs (to which layers; interface kind).**
- L6 → L7: HTTP requests (GET for projection reads; POST/PUT/PATCH for
  command dispatches; DELETE for governed soft-deletes)

**Cross-cutting concerns owned by L6.**
- CC-3 Internationalization: L6 is the render owner; ICU MessageFormat 2.0
  catalogs live in L6 source; locale selection is L6's responsibility
- CC-12 Accessibility: L6 is the accessibility owner; WCAG 2.2 AA
  compliance is tested per-slice before graduation

**Per-layer SLOs.**
```
SLO-L6-1  Time to Interactive (TTI) p95 ≤ 2 s on first workspace load
SLO-L6-2  Workspace re-render on data change p95 ≤ 200 ms
SLO-L6-3  Intent submission response display p95 ≤ 500 ms (end-to-end
           including L7 round-trip; measured from button click)
SLO-L6-4  Accessibility violation count: 0 serious per axe-core per slice
```

**Team ownership (Skelton-Pais).** Stream-aligned team (Frontend Lead).
Each domain's workspace slice is authored by the domain's stream-aligned
sub-team; HMV4 shell and ARS pattern are platform-owned by Frontend Lead.

**Scaling characteristic.** Stateless SPA; static assets served from CDN.
Client-side only. L6 scale = CDN capacity; no server-side rendering in
current Wave 1-3 scope (SSR deferred to Wave 7 per ADR when warranted).

**Security posture.** OWASP ASVS 5.0 Chapter 1.2 (architecture) applied:
L6 never holds credentials beyond the session cookie; CSP header (strict;
no `unsafe-inline`); SRI for all third-party scripts; L6 renders no server-
produced HTML (XSS risk); all user-generated content displayed via
text node (not innerHTML). Graphics Authority token read is read-only;
L6 cannot write tokens.

---

### L7 — API Gateway / Public Surface

**Bounded responsibility.** L7 is HESEM's single external-facing surface.
It receives HTTP requests from L6 (the UI) and from external systems
(EDI partners, OEM connectors, third-party integrators), deserializes and
schema-validates the request body (JSON Schema 2020-12 per OpenAPI 3.1.1
spec), delegates to L1 (authentication), L2 (authorization), and L3
(command dispatch) in sequence, and serializes the response. L7 does not
contain domain logic. L7 is a translator: HTTP in, typed command or query
out, typed result back, serialized HTTP response out.

**Components inside L7.**
- Route layer (PHP 8.5 router; `mom/api/index.php` entry point)
- OpenAPI 3.1.1 contract registry: one spec per resource family per API
  family (E0-E15); spec is the authoritative definition; implementation
  must match spec (contract test enforced in CI)
- Request body validator: JSON Schema 2020-12 validation against the
  relevant OpenAPI requestBody schema; validation errors return RFC 9457
  problem-detail before L1 is called (no expensive auth on invalid payloads)
- RFC 9457 Problem Registry: 62 type-URIs registered; each maps to a
  concrete error class, HTTP status code, and recovery path
- Idempotency-Key extractor: extracts `Idempotency-Key` header; passes
  to L3 Command Bus; regenerates response on replay
- ETag / If-Match extractor: extracts `If-Match` header; passes version
  to L3 for optimistic concurrency check (CC-6)
- Rate-limit middleware: per-actor-per-route sliding window; X-RateLimit-*
  headers on every response; HTTP 429 with `Retry-After` on exceed
- API version negotiation: `Accept` header or URL-prefix version;
  deprecated versions return `Deprecation` + `Sunset` headers; version
  manifest per route maintained in L7
- Idempotency replay store (via L3/L5): L7 checks idempotency before
  routing; returns cached response on replay

**Per-layer SLOs.**
```
SLO-L7-1  Read endpoint (GET workspace projection) p95 ≤ 200 ms
SLO-L7-2  Command endpoint (POST/PUT mutation) p95 ≤ 500 ms
           (inclusive of L1 + L2 + L3 + L4 time)
SLO-L7-3  Contract test pass rate: 100% (zero schema drift; CI gate)
SLO-L7-4  Rate-limit exceeded rate: < 0.1% of requests (tenant-level)
SLO-L7-5  API error rate: < 1% (5xx; excluding client errors 4xx)
```

**Team ownership (Skelton-Pais).** Platform team (API Lead) for the gateway
infrastructure; stream-aligned teams for their domain endpoint handlers.
API Lead owns the OpenAPI contract registry and the RFC 9457 Problem Registry;
domain engineers contribute contract additions that API Lead reviews.

**Scaling characteristic.** Stateless PHP-FPM workers behind a reverse proxy
(nginx or Caddy). Horizontal scaling. Rate-limit state in Redis per tenant.
High-cardinality routes (bulk endpoints per E11) dispatched to dedicated
worker pools.

**Security posture.** OWASP API Top 10 (2023): API1 (broken object-level
auth) — L2 evaluates per-resource-id permission; API2 (broken auth) — L1
validates token before any route handler executes; API3 (excessive data
exposure) — response shapes are contract-defined; no `SELECT *` in L4
repositories; API8 (security misconfiguration) — security headers enforced
by middleware (HSTS; X-Content-Type-Options; Referrer-Policy; Permissions-
Policy).

---

### L8 — Platform / SRE / Observability

**Bounded responsibility.** L8 runs every other layer, keeps them available,
proves availability against SLOs, recovers from failures, and collects and
aggregates the telemetry that all layers emit. L8 does not embed business
logic. L8 provides primitives (compute, storage, network, telemetry, secrets,
config) that other layers consume. L8's failure modes are infrastructure
failures, not domain errors.

**Components inside L8.**
- Kubernetes deployment topology (per B7): namespace-per-tenant (GTE Wave 5)
  or shared namespace with L2 tenant network policy; pod disruption budgets
  per service; HPA per service family
- OpenTelemetry Collector: receives traces (OTLP), metrics (OTLP/Prometheus),
  and logs (OTLP/Loki); routes to backends; enforces attribute cardinality
  limits; enriches with `tenant_id` and `service.name` from pod labels
- Prometheus (metrics store): per-SLO recording rules; per-route histogram
  for latency; per-SM gauge for active saga count; per-tenant quota metrics
- Loki (log store): structured JSON log ingestion; per-tenant stream labels;
  6-month hot retention; 7-year cold (per L2 retention class for audit logs)
- Grafana (dashboards): per-domain dashboard, per-SLO dashboard, per-tenant
  cost dashboard, DORA metrics dashboard (deployment frequency, MTTR, CFR,
  lead time)
- AlertManager: per-SLO alert routes; per-severity PagerDuty/Opsgenie
  integration; severity escalation: WARN → P3, CRIT → P2, SEV-1 → P1
- Deployment pipeline (CI/CD): build → lint → unit-test → contract-test →
  E2E (Playwright per slice) → staging deploy → smoke → production deploy;
  gate: every quality gate must PASS (no bypass)
- Secrets management: HashiCorp Vault per environment; secret TTL ≤ 30 days;
  automatic rotation; application reads secrets at startup (injected as env)
- Outbox relay: background process that reads `outbox_event` table (written
  by L3 within Postgres txn) and publishes to RabbitMQ event bus; at-least-
  once delivery; consumers must be idempotent
- Backup and DR: daily logical Postgres dump + continuous WAL archival to
  object store (cross-region); RPO = 0 (committed writes); RTO ≤ 4 h;
  quarterly DR drill with documented outcome
- Cost attribution: per-tenant compute + storage + network metering;
  reported in Grafana tenant cost dashboard

**Per-layer SLOs.**
```
SLO-L8-1  Deployment success rate ≥ 99.5% (failed deploys / total deploys)
SLO-L8-2  MTTR p90 ≤ 2 h (SEV-2); ≤ 30 min (SEV-1)
SLO-L8-3  Alert acknowledge time p90 ≤ 5 min (P1); ≤ 30 min (P2)
SLO-L8-4  Backup completion success rate 100% (daily check)
SLO-L8-5  DR drill pass rate 100% (quarterly; documented RTO/RPO measured)
SLO-L8-6  OTel collector availability: 99.9% (local buffer if collector down)
```

**Team ownership (Skelton-Pais).** Platform team (SRE Lead). All other teams
are consumers of L8 platform services. The SRE team reviews any change that
affects deployment topology, secrets management, alerting thresholds, or
backup/DR procedures.

**Scaling characteristic.** Infrastructure scales per cloud autoscaling groups.
Kubernetes HPA per service. RabbitMQ quorum queues (3-node minimum). Redis
Cluster for session and rate-limit state. Postgres scales via read replicas
and connection pooling; primary scale-up only (vertical) until Wave 9.

**Security posture.** IEC 62443-3-3 SR 7.6 (network and security configuration
settings). SIEM integration: all L8 audit events (IAM changes, secret access,
firewall rule changes, elevated privilege use) forwarded to SIEM with alert
on break-glass use. Supply chain: SBOM generated per release (CycloneDX
format); vulnerability scan (Trivy) in CI; critical CVEs block deploy.

---

### L9 — OT (Operational Technology / Edge)

**Bounded responsibility.** L9 is the interface between HESEM's IT system
and the physical operational environment: PLCs, SCADA systems, sensors,
barcode scanners, weigh scales, vision systems, and automated equipment.
L9 translates OT events into bounded-write-path commands that L3 accepts,
and translates L3 dispatch feedback into device commands where applicable.
L9 enforces the OT security boundary (IEC 62443 SL-2 for OT zones), manages
air-gap aware buffering, and evaluates the N-prerequisites for any OT-
originated mutation locally (at the edge node) before forwarding to L3.

**Components inside L9.**
- Edge Gateway process: runs on an industrial PC or gateway appliance
  at the plant floor; communicates with IT network via L8-managed VPN
  tunnel or dedicated OT DMZ network segment
- OPC UA client (IEC 62541): subscribes to OPC UA Server nodes on PLCs
  and SCADA; receives NodeId value-change notifications; translates to
  HESEM OT event format
- MQTT Sparkplug B subscriber: receives telemetry from MQTT-enabled
  sensors and edge devices; translates to HESEM OT event format
- Modbus TCP / EtherNet/IP adapter: polling adapter for legacy equipment
  without OPC UA or MQTT; translates polled values to OT events
- OT prerequisite evaluator: a local rule engine that evaluates the
  N prerequisites for every OT-originated mutation type before
  forwarding to L3. Example: for a "step-complete" command from an
  operator terminal, the prerequisites include: operator_is_trained,
  equipment_is_calibrated, material_lot_is_on_hold=false,
  operation_sequence_is_current. Each prerequisite is evaluated against
  a locally cached copy of relevant L5 projection state.
- Local state cache: a small PostgreSQL-Lite / SQLite store on the edge
  node containing the OT-relevant subset of L5 projection state
  (training eligibility, equipment calibration status, lot quarantine
  status, current job order dispatch state). Updated via CDC-over-VPN
  from L5 when connectivity is available.
- Air-gap buffer: when the edge gateway loses connectivity to the IT
  network, OT events are buffered locally (ring buffer; capacity =
  8 hours at peak rate). On reconnect, buffered events are forwarded
  to L3 in order with gap-recovery metadata.
- OT security enforcement: IEC 62443-2-1 security management system
  at L9; device certificate-based mutual TLS for OPC UA sessions;
  MQTT broker authentication (X.509 client certs); no plaintext
  credentials on the plant network.

**ISA-95 functional hierarchy mapping.**
```
ISA-95 Level    Description                      HESEM Layer
Level 0         Physical process (sensors, actuators)   External to HESEM
Level 1         Basic control (PLC, DCS)                External; L9 connects
Level 2         Area supervisory (SCADA, HMI)           External; L9 connects
Level 3         Manufacturing operations (MES/MOM)      L9 + L3 + L4 (Job/Work Order SMs)
Level 4         Business planning and logistics (ERP)   L4 + L5 + L7 (Order, Planning roots)
```

L9 bridges Level 2 and Level 3 of the ISA-95 hierarchy. The OT write-path
(L9 → L3 → L4) is the physical realization of the ISA-95 Level 3
manufacturing operations execution path. The IT-OT boundary per IEC 62443
sits between L9 (OT zone) and L3/L7 (IT zone), with a defined DMZ
architecture per B8.

**N prerequisites for OT-originated write commands.**
Every OT-originated command that mutates an L4 root must satisfy N
prerequisites, each evaluated locally at L9 before forwarding. The
prerequisites for a `work_order.step_complete` command are:
1. `operator_training_eligible` — operator has a valid, current training
   record for the operation type (from local training eligibility cache)
2. `equipment_calibration_current` — the equipment used has a calibration
   record within its calibration interval (from local calibration cache)
3. `material_lot_not_on_hold` — the material lot being consumed is not
   on quarantine hold (from local lot status cache)
4. `operation_sequence_valid` — the step being completed is the current
   expected step in the work order sequence (from local job order cache)
5. `environmental_conditions_within_spec` — if CCP monitoring applies
   (J5 Food pack), environmental sensor readings are within the CCP
   limits at the time of the operation (from local sensor reading)
6. `gxp_review_not_required_for_deviation` — if the deviation flag is
   set on this step, a quality review has been opened in L3 (from local
   NC cache)

**Per-layer SLOs.**
```
SLO-L9-1  OT event to L3 command forwarding p95 ≤ 500 ms (connected)
SLO-L9-2  Prerequisite evaluation p95 ≤ 100 ms (local cache; no network)
SLO-L9-3  Air-gap buffer capacity: ≥ 8 h at peak event rate
SLO-L9-4  Local cache freshness: ≤ 120 s from L5 projection update
           (when connected; no SLO when air-gapped)
SLO-L9-5  Reconnect buffer drain: complete within 5 min of reconnect
```

**Team ownership (Skelton-Pais).** Enabling team (OT Lead, if staffed;
otherwise SRE Lead as interim). L9 is a specialized integration; it enables
domain teams to have their work orders and job orders tracked in L4 from
physical events without each domain team building their own OT integration.

**Scaling characteristic.** One edge gateway process per plant zone (per
IEC 62443 security zone definition). Scales by deploying more edge gateway
instances for additional plant zones. No horizontal scaling within a zone
(the gateway is zone-specific).

**Security posture.** IEC 62443-3-3 SL-2 (for connected OT zones) to SL-3
(for safety-instrumented system proximity zones, per J1 Pharma and J4 MD
pack requirements). Physical security: edge gateway appliances in locked
control panel enclosures per ANSI/ISA-62443-2-1. Firmware integrity: signed
firmware images; verified at boot before edge gateway process starts.

---

## 3. Layer-to-layer interface contracts

For each coupled layer pair, the interface contract: direction, protocol,
format, idempotency requirement, tenant boundary handling, failure semantics,
and observability instrumentation.

---

### IF-01: External → L7 (inbound HTTP)

Direction: External client (L6 browser or external integrator) → L7
Protocol: HTTPS/1.1 or HTTP/2 TLS 1.3 minimum (TLS 1.2 with AES-GCM permitted for legacy integrators; TLS 1.0/1.1 rejected)
Format: JSON body per OpenAPI 3.1.1 requestBody schema; Content-Type: application/json
Idempotency: Idempotency-Key header (UUID v4; required for all POST/PUT/PATCH/DELETE; optional for GET)
Tenant boundary: tenant_id extracted from JWT claim `tenant_id`; L7 middleware binds to request context before any routing
Failure semantics: schema validation failure → 400 + RFC 9457 problem-detail before auth; rate-limit → 429 + Retry-After header; missing Idempotency-Key on mutation → 400 (per contract); server error → 500 with RFC 9457 type-URI from the 62-entry registry
Observability: OTel span created at L7 entry; trace_id propagated (W3C traceparent header injected in response); http.method, http.route, http.status_code, tenant_id, actor_id as span attributes

---

### IF-02: L7 → L1 (authentication delegation)

Direction: L7 route handler → L1 token verifier (in-process call; not HTTP)
Protocol: in-process method call; synchronous
Format: typed struct {Authorization_header_value, request_context}; returns ActorClaims struct
Idempotency: not applicable (read-only verification)
Tenant boundary: tenant_id extracted from JWT claim by L1; mismatched or absent → 401 before route dispatch
Failure semantics: invalid token → 401 RFC 9457 /problems/auth/invalid-token; expired → 401 /problems/auth/token-expired; MFA required → 403 /problems/auth/mfa-required; policy store outage → 401 (fail-closed, never 200)
Observability: OTel span child of IF-01 span; auth.method, auth.outcome, auth.tenant_id as attributes; auth.duration_ms histogram

---

### IF-03: L1 → L2 (actor claims → policy evaluation)

Direction: L1 verified actor claims → L2 Policy Evaluation Engine (in-process; context propagation)
Protocol: in-process typed struct propagation (PHP request context object)
Format: ActorClaims {actor_id, tenant_id, roles[], factors_used[], actor_class} embedded in PolicyRequest {actor_claims, resource_family, action_verb, resource_id, resource_attributes}
Idempotency: not applicable (read-only evaluation; same input always produces same output for same policy state)
Tenant boundary: tenant_id from ActorClaims is the tenant scope for policy lookup; policy directives fetched from PEE cache scoped to tenant_id
Failure semantics: PEE cache miss + registry outage → PolicyDecision{decision: INDETERMINATE}; L3 treats INDETERMINATE as DENY (fail-closed); policy directive version mismatch → log warning + use cached version up to 60-s TTL
Observability: OTel span child of IF-02; policy.decision, policy.directive_count, policy.obligation_count, policy.eval_duration_ms as span attributes

---

### IF-04: L2 → L3 (policy decision → command dispatch)

Direction: L2 PolicyDecision → L3 Workflow Command Bus (in-process)
Protocol: in-process method call; Command object carries embedded PolicyDecision
Format: Command {actor_id, tenant_id, idempotency_key, policy_decision: PolicyDecision, target_root_id, payload: typed DTO}; WCB refuses any Command without PERMIT policy_decision
Idempotency: L3 checks Idempotency-Key before dispatch; returns cached CommandResult on replay within 24 h
Tenant boundary: tenant_id from Command is the scope for all L4 writes; PostgreSQL SET LOCAL `app.tenant_id` before any query in the transaction
Failure semantics: policy DENY → Command Bus rejects before guard evaluation (RFC 9457 /problems/authority/policy-deny; HTTP 403); guard failure → CommandResult{failed: true, failing_guards: [], problem_detail}; saga compensation needed → Saga Coordinator invoked asynchronously
Observability: OTel span child of IF-03; sm.name, sm.transition, sm.guard_count, sm.guard_failures, sm.duration_ms as span attributes

---

### IF-05: L3 → L4 (command → mutation)

Direction: L3 state machine handler → L4 root repository (in-process; within same PostgreSQL transaction)
Protocol: in-process typed repository method call; SQL transaction owned by L3 (BEGIN by L3; COMMIT by L3 after event insert)
Format: typed mutation method (e.g., `LotRepository::quarantine(lot_id, reason, actor_id, version)`) with CAS version check; returns mutated root entity
Idempotency: PostgreSQL unique constraint on (root_id, version) prevents double-apply; L3 idempotency store prevents double dispatch
Tenant boundary: PostgreSQL `SET LOCAL app.tenant_id = :tenant_id` at transaction start; RLS enforces this for all queries in the transaction
Failure semantics: version mismatch → PostgreSQL constraint exception → L3 catches → HTTP 409 + RFC 9457 /problems/concurrency/version-conflict; invariant violation → PostgreSQL CHECK constraint exception → HTTP 422 + /problems/domain/invariant-violation; deadlock → retry once; then HTTP 500 + /problems/server/transaction-failed
Observability: OTel span child of IF-04; db.operation, db.table, db.rows_affected, db.duration_ms as span attributes

---

### IF-06: L3 → L5 (workflow events and audit events)

Direction: L3 state machine handler → L5 event tables (within the same PostgreSQL transaction as IF-05)
Protocol: SQL INSERT to `workflow_event` and `audit_event` tables; atomically committed with the L4 mutation in the same transaction
Format: `workflow_event` {event_id, tenant_id, sm_name, transition_name, actor_id, root_id, payload JSONB, event_seq, prev_event_hash}; `audit_event` {event_id, tenant_id, actor_id, action_verb, root_family, root_id, payload_hash, prev_audit_hash, audit_seq}
Idempotency: event_id is idempotency key; Postgres unique constraint prevents duplicate event_id; L3 generates event_id from (command_idempotency_key + transition_name) deterministically
Tenant boundary: tenant_id column on both tables; RLS applied; CDC events downstream include tenant_id
Failure semantics: event INSERT failure → entire transaction rolls back (atomicity ensures audit event and mutation are never split); missed event → SEV-2 alert (audit chain gap detector in L5)
Observability: OTel span child of IF-05; event.type, event.sm_name, event.root_id, event.audit_seq as span attributes

---

### IF-07: L4 → L5 (Change Data Capture)

Direction: PostgreSQL WAL (L4 tables) → L5 projector workers via pg_logical
Protocol: PostgreSQL logical decoding (replication slot); decoded by L5 projector worker process (L8-managed background worker)
Format: pg_logical decoded JSON per table change: {table_name, operation (INSERT/UPDATE/DELETE), old_values, new_values, lsn, commit_timestamp}
Idempotency: each CDC event carries the PostgreSQL LSN (log sequence number); projector tracks last applied LSN per projector per tenant; duplicate events (on reconnect) are detected via LSN comparison and skipped
Tenant boundary: CDC events include tenant_id from the row; projector filters to tenant_id of the projection being updated
Failure semantics: projector lag > SLO-L5-1 (30 s) → L8 SLO alert; projector crash → automatic restart by L8 process supervisor; CDC replication slot overflow (slot lagging too far behind WAL) → SEV-1 alert (slot must stay current or disk fills); projector applies events in LSN order (reorder buffer in projector)
Observability: OTel metric `otg.projector.lag_seconds` per projector per tenant; `otg.projector.events_processed_total` counter; `otg.projector.apply_duration_ms` histogram

---

### IF-08: L5 → L7 (projection query)

Direction: L5 workspace read models → L7 read endpoint handlers
Protocol: PostgreSQL query via L7 read repository (in-process; read replica routing for workspace queries)
Format: typed read query (e.g., `WorkspaceRepository::getDispatchBoard(tenant_id, filters, pagination)`) returning typed DTO; never `SELECT *`; always explicit column list matching OpenAPI response schema
Idempotency: not applicable (read-only)
Tenant boundary: `SET LOCAL app.tenant_id = :tenant_id` before query; RLS applied; read replica used (no write risk)
Failure semantics: read replica lag > SLO-L4-2 (5 s) → switch to primary for affected query; projection staleness > SLO-L5-1 (30 s) → response includes `X-Projection-Staleness: {seconds}` header; L6 displays staleness banner; staleness > 5 min → workspace read-lock returned (HTTP 503 with Retry-After)
Observability: OTel span; db.operation=SELECT, db.table=workspace_read_model_name, db.rows_returned, db.duration_ms, projection.staleness_seconds as span attributes

---

### IF-09: L7 → L6 (HTTP response to UI)

Direction: L7 response → L6 SPA (HTTP)
Protocol: HTTPS; HTTP/2; JSON body per OpenAPI 3.1.1 response schema
Format: success: {data: {...}, meta: {pagination, staleness_ts, etag}};
  error: RFC 9457 problem-detail {type, title, status, detail, instance, extensions}
Idempotency: not applicable (response delivery)
Tenant boundary: response never contains data from another tenant (enforced by IF-08 query scoping and IF-07 CDC tenant filter)
Failure semantics: 4xx errors → L6 displays problem-detail title + detail localized via ICU; 5xx errors → L6 displays generic retry banner + incident reference from response `instance` field; L6 never silently swallows errors
Observability: OTel span child of L7 span; http.status_code, http.response_content_length, http.duration_ms as span attributes; W3C traceparent injected in response header so L6 can log with the same trace_id

---

### IF-10: L9 → L3 (OT event → bounded write-path command)

Direction: L9 Edge Gateway → L3 Workflow Command Bus (HTTP POST to internal L7 endpoint; L7 passes to L3)
Protocol: HTTPS (mTLS; edge gateway client certificate); L7 internal route (not exposed externally); signed OT event payload
Format: OT event {event_id, tenant_id, edge_node_id, ot_event_type, target_root_id, payload: {step_id, operator_id, equipment_id, lot_id, readings[]}, prerequisites_evaluated: [{name, result, evidence_ts}], prerequisite_evaluation_ts}
Idempotency: event_id is the idempotency key; same semantics as IF-01; 24-h window
Tenant boundary: edge_node_id is registered to a tenant_id at provisioning time; L7 verifies edge_node_id → tenant_id mapping before processing
Failure semantics: prerequisite evaluation FAIL → event rejected by L9 (not forwarded to L3); if L9 evaluates prerequisites PASS but L3 guard rejects → L9 logs discrepancy as SEV-2 (indicates a stale prerequisite cache — L9 cache is more than 120 s old); L3 rejection → L9 queues for retry (exponential backoff, 3 retries, then L8 alert)
Observability: OTel span; ot.event_type, ot.edge_node_id, ot.prerequisite_count, ot.prerequisite_pass_count, ot.duration_ms as span attributes; trace_id propagated to L3 for full end-to-end tracing from physical event to L4 mutation

---

### IF-11: L8 → all layers (telemetry collection)

Direction: L8 OpenTelemetry Collector ← all layers (OTLP push from every service)
Protocol: OTLP/gRPC (preferred); OTLP/HTTP (fallback for edge environments)
Format: OpenTelemetry Protocol (OTLP) v1; traces per W3C Trace Context; metrics per Prometheus naming conventions; logs per OTel log data model with trace_id + span_id correlation
Idempotency: OTel Collector deduplicates spans by trace_id + span_id; duplicate spans dropped at collector
Tenant boundary: tenant_id MUST be present as a span attribute on every span; collector validates this in a processor step and routes to per-tenant Prometheus label shard
Failure semantics: Collector unreachable → services buffer telemetry locally (OTLP SDK retry with exponential backoff; 5-minute local buffer); collector restart → buffer drains automatically; metric gap during collector downtime is marked with annotation in Grafana
Observability: L8 monitors itself (the collector's own health metrics are scraped by a secondary Prometheus instance with a separate scrape path)

---

### IF-12: L8 (outbox relay) → Event Bus → L5 projectors

Direction: L8 outbox relay process reads `outbox_event` (L5 table) → publishes to RabbitMQ → L5 projector consumers
Protocol: AMQP 0-9-1 (RabbitMQ); quorum queues (3-node; acks required before message considered delivered)
Format: CloudEvents 1.0 envelope: {specversion, id, source, type, datacontenttype: application/json, time, data: {domain event payload}}
Idempotency: CloudEvents `id` is the idempotency key for consumer; L5 projectors check `id` against processed set before applying
Tenant boundary: CloudEvents `source` includes tenant_id; consumers filter by source prefix
Failure semantics: RabbitMQ node failure → quorum queue maintains availability with 2 of 3 nodes; message acknowledged only after consumer processes and writes to L5; on consumer failure, message returns to queue (redelivered); dead-letter queue after 3 redelivery failures → L8 alert for manual investigation
Observability: RabbitMQ management plugin metrics scraped by Prometheus; queue depth alert (threshold per queue type; workspace queue depth > 1000 → alert); consumer lag metric per L5 projector

---

### IF-13: L2 (policy) → L6 (/can endpoint via L7)

Direction: L6 → L7 GET /can?resource_family=X&action_verb=Y&resource_id=Z → L2 PEE → response → L7 → L6
Protocol: HTTPS GET; JSON response {permitted: bool, obligations: []}; cached by L6 per resource per 60 s (aligned with L2 policy cache TTL)
Format: response {permitted: bool, obligations: [{obligation_type, obligation_params}]}; obligations include e-sig requirements, reason-for-change, two-person-integrity flag
Idempotency: read-only; no idempotency needed
Tenant boundary: tenant_id from L1 actor claims; PEE evaluates against tenant-scoped directives
Failure semantics: L2 PEE outage → /can returns 503; L6 defaults to showing all actions but with a "checking permissions…" state; if 503 persists > 10 s, L6 disables all mutating actions (fail-closed in UI) and displays a system-degraded banner
Observability: OTel span; can.resource_family, can.action_verb, can.permitted, can.obligation_count as span attributes

---

## 4. Why nine layers (not six, not twelve)

### 4.1 Why L1 (Identity) is separate from L2 (Authority)

V9 combined identity and authority in one layer. V10 separates them because:

The performance contracts are different: authentication (L1) must complete
in ≤20 ms for every request, including anonymous reads. Authority evaluation
(L2) has a slightly larger budget (≤15 ms for policy cache hit; ≤80 ms on
cache miss) and is called only for requests that require access control. An
anonymous public resource (product catalog query, health check) skips L2
entirely but still passes through L1. This means L1 must be implementable
independently of L2's policy store — it cannot block on L2 availability.

Additionally, the failure semantics diverge: L1 outage → all requests fail
(no auth possible). L2 outage → L1 still authenticates, but all mutating
commands fail (L3 requires PERMIT). This allows a graceful degradation mode
where read-only operations continue during a L2 policy store outage, which
is impossible if L1 and L2 are combined.

### 4.2 Why L3 (Workflow) is separate from L4 (Domain Roots)

L3 and L4 were sometimes blurred in earlier designs (domain services that
contain both workflow logic and persistence). Separating them means:

L4 can change schema (add columns, add tables, change FK structure) without
changing workflow logic (L3). L3 can add new state machine transitions,
new guards, new saga patterns without migrating the database. This separation
is directly analogous to the CQRS command model vs. write model separation,
extended to the persistence layer.

For regulatory compliance: it is possible to test L3 guard correctness (unit
test each guard function) without a database. It is possible to test L4
schema constraints (integration test each constraint) without running the
full state machine. Validation evidence for GxP systems benefits from this
separability (IQ validates schema; OQ validates workflow).

### 4.3 Why L5 (OTG / Persistence) is separate from L4 (Domain Roots)

L4 is the system-of-record (write truth). L5 is the projection truth (read
truth). This is CQRS. Without the separation, every workspace view query
hits the transactional L4 tables directly, creating read contention with
write-path transactions. As HESEM scales to 50+ concurrent users on a tenant,
this contention becomes the primary latency bottleneck.

More importantly for regulated use: L5 can compute derived regulatory facts
(lot genealogy completeness, training eligibility, release readiness, batch
record completeness) that are too complex to compute in a single L4 query.
These derived facts require aggregating across multiple root families — which
is L5's domain, not L4's.

### 4.4 Why L8 (Platform) is separate from L7 (API Gateway)

L8 is infrastructure. L7 is the application surface. Separating them means
the deployment topology, telemetry collection, secrets management, and CI/CD
pipeline can evolve independently of the API contract. L7 can be versioned
(v1, v2 endpoints) without changing the Kubernetes deployment or the OTel
collector configuration.

In V9, L7 and L8 concerns were occasionally merged (API middleware that also
handled deployment-level rate limiting). V10 makes the boundary explicit:
rate limiting is L7 (per-route, per-actor, application-level); infrastructure-
level throttling (DDoS protection, WAF) is L8 (network-level, pre-application).

### 4.5 Why L9 (OT) is a distinct layer (not part of L8)

L9 OT has categorically different properties from L8 platform infrastructure:
- Different security zone (IEC 62443 OT zone vs. IT zone)
- Different connectivity model (air-gap capable; offline operation required)
- Different update cadence (OT firmware updates are slower and require
  plant shutdown coordination; IT services update continuously)
- Different failure semantics (L9 fails-safe toward OT physical process
  safety; L8 fails toward service availability)
- Different regulatory framework (IEC 62443 for OT; ISO 27001 for IT)

Merging L9 into L8 would force OT components to follow IT deployment
practices (Kubernetes rolling updates, secret rotation, CI/CD pipelines)
that are incompatible with OT operational constraints.

---

## 5. L9 OT special discipline

### 5.1 IEC 62443 security zone mapping

```
ZONE                  LEVEL    HESEM LAYER        IEC 62443 ZONE LEVEL
IT Enterprise         IT       L1-L8              SL-2 (RBAC+ABAC+TLS)
OT DMZ                DMZ      L9 Edge Gateway    SL-2 (mTLS + signed events)
OT Operations Zone    OT-2     SCADA/DCS connects  SL-2 (OPC UA security policies A+B)
OT Control Zone       OT-1     PLC; sensors       SL-1 minimum; SL-2 for GxP
OT Safety Zone        OT-0     SIS                SL-3 (no L9 write path; read-only
                                                   or dedicated SIS integration layer)
```

### 5.2 OT write-path N-prerequisite discipline

No OT-originated command that mutates an L4 root is accepted by L3 without
all N prerequisites being evaluated PASS at L9 before forwarding. The
prerequisites are:

1. `actor_authenticated` — the operator's badge/biometric is verified by
   the plant floor authentication device against the L1-provisioned
   credential (offline-capable via cached credential hash at L9)
2. `operator_training_eligible` — operator has a valid training record for
   the operation type (from local cache updated from L5; SLO-L9-4 = ≤ 120 s)
3. `equipment_calibration_current` — equipment used is within its
   calibration window (from local calibration cache)
4. `material_lot_not_on_hold` — lot being consumed is not quarantined
   (from local lot status cache)
5. `operation_sequence_valid` — the step being completed is the next
   expected step in the work order (from local job order state cache)
6. `environment_conditions_within_ccp_limits` — if CCP monitoring applies
   (J5 Food or J1 Pharma pack), sensor readings at the time of the operation
   are within the defined CCP limits (from local sensor integration)

If any prerequisite evaluates FAIL, L9 rejects the command locally, does
not forward to L3, and displays a reason to the operator at the terminal.
The rejection is logged locally and forwarded to L3's transition attempt
log via a separate (non-blocking) path for compliance audit.

### 5.3 Air-gap considerations

When the edge gateway loses connectivity to the IT network:
- The local prerequisite evaluator continues operating against its
  local state cache (stale after SLO-L9-4 = 120 s)
- Commands for operations where the local cache is too stale
  (> 120 s; configurable per operation class) are queued pending
  connectivity, not immediately executed
- Operations classified as "safety-critical" in the L9 configuration
  proceed using the last-known-good cache state and emit a deviation
  event that requires quality review on reconnect
- The air-gap buffer holds up to 8 hours of events at peak rate;
  if the buffer fills, a physical alarm is triggered at the plant

---

## 6. Forbidden cross-layer dependencies

The following dependency rules are enforced by CI static analysis
(ADR-B-003; scanner: RB-CI-002). Any violation is a build failure.

```
RULE           FORBIDDEN DEPENDENCY
───────────────────────────────────────────────────────────────────────────────
FD-01          L4 MUST NOT call L7 or L6 (domain root never calls API or UI)
FD-02          L4 MUST NOT call L3 (root repository never invokes Command Bus)
FD-03          L6 MUST NOT query L5 directly (UI never queries OTG tables; must go via L7)
FD-04          L6 MUST NOT implement permission logic (must call L7 /can; never decide locally)
FD-05          L3 MUST NOT call L7 (Command Bus publishes events; outbox delivers; never direct L7 call)
FD-06          L3 MUST NOT call L6 (workflow never calls UI)
FD-07          L5 MUST NOT mutate L4 (projectors never write to root tables)
FD-08          L5 MUST NOT emit audit events (audit events come from L3 and L1 only)
FD-09          L9 MUST NOT call L4 directly (OT event must pass through L3 write-path)
FD-10          L8 MUST NOT contain domain logic (platform contains primitives only)
FD-11          L2 MUST NOT call L3 or L4 (policy evaluation must not require domain lookup;
               domain knowledge is encoded in policy directives, not fetched at eval time)
FD-12          L1 MUST NOT call L2 (authentication must not block on policy evaluation;
               L1 output is actor claims; L2 input is actor claims — separate steps)
```

---

## 7. Migration discipline (how layers evolve)

```
ADD A NEW LAYER          ADR Class A; requires Platform Lead + all Domain Leads
                         + Compliance Lead ratification; 2-week comment window;
                         per-layer SLO contract must be defined before ADR ratified

DELETE A LAYER           ADR Class A; same ratification; migration plan for all
                         components in the deleted layer published with the ADR

LAYER RESPONSIBILITY     ADR Class B; if a responsibility moves from L3 to L2,
SHIFT                    both leads ratify; transition plan with backward-compat
                         period of at least one delivery wave

INTER-LAYER INTERFACE    ADR Class C; both affected layer leads ratify; breaking
CONTRACT CHANGE          changes require a versioned transition period (deprecated
                         interface kept for at least one wave before removal)

ADD COMPONENT TO         No ADR required if the component respects all existing
EXISTING LAYER           layer boundary rules (FD-01 through FD-12); standard
                         PR review with the layer lead as required reviewer

REMOVE COMPONENT         PR review; layer lead approves; if component is consumed
FROM EXISTING LAYER      by another layer, deprecation period and migration plan
                         required (per ADR-D-NNN if it affects public API)
```

---

## 8. Mapping to per-domain code (per Part C)

```
DOMAIN (PART_C)          L4 ROOT FAMILIES            L3 STATE MACHINES    L7 API FAMILIES
Commercial (C1)          sales_order, customer,       SM-1 (Order)         E4-C1, E5-C1
                         quote, forecast, contract
Engineering (C2)         item, bom, routing, spec,    SM-7 (Document)      E4-C2, E5-C2
                         eco, dfmea, pfmea
Planning (C3)            mps, mrp, demand_plan,       SM-APQP (Auto J2)    E4-C3, E5-C3
                         capacity_plan
Procurement (C4)         purchase_order, supplier,    SM-2 (Procurement)   E4-C4, E5-C4, E15
                         supplier_qual, scar
Inventory (C5)           lot, serial, bin, stock_move  (none owned)         E4-C5, E5-C5
Shopfloor/MES (C6)       work_order, operation,       SM-3 (Work Order)    E4-C6, E5-C6, E15
                         yield, ebr, ccp
Quality/eQMS (C7)        inspection, nonconformance,  SM-4, SM-5, SM-6,    E4-C7, E5-C7,
                         capa, controlled_doc, audit,  SM-7, SM-10, SM-11,  E7 (e-sig), E8
                         batch_release, risk_file      SM-12, SM-13, SM-14  (evidence)
Traceability (C8)        lot_genealogy, recall,        (none owned)         E4-C8, E5-C8,
                         release_packet                                      E11 (bulk)
Maintenance (C9)         asset, pm_plan, mwo,          SM-9 (Maintenance)   E4-C9, E5-C9
                         calibration_record
Workforce (C10)          person, skill, training,      SM-8 (Training)      E1, E4-C10, E5-C10
                         training_record
Finance (C11)            cost_center, gl, cost_roll    (none owned)         E4-C11, E5-C11
Integration (C12)        connector, subscription       (none owned)         E15
Analytics/AI (C13)       kpi, advisory, model,         (none owned)         E5-C13, E9
                         override_log
Core Platform (C14)      tenant, role, auth_event,     (none owned)         E1, E2, E6, E14
                         audit_event, audit_anchor
```

C12 (Integration) lives primarily at L7 (connector endpoints) and L9 (OT
integration). C13 (Analytics/AI) lives primarily at L5 (data products) and
L6 (AI advisory UI). C14 (Core Platform) spans L1 (identity), L2 (authority),
and L8 (platform infrastructure).

---

## 9. Mapping to wave plan (per Part G)

```
LAYER   W0/W0.5   W1        W2        W3        W4/W4.5   W5        W6/W6.5   W7-W9     W10-W14
L1      L2-stub   L3 OIDC   L4 WebAuthn L5 MFA  L5 MFA+   L5        L5+FIDO2  L6        L7
                            + FIDO2    full      GxP-scope            (OT edge)
L2      L2-stub   L3 RBAC   L3 RBAC+  L4 ABAC   L4 ABAC   L5 full   L5 AI     L6 Compl  L7
                            basic      basic     e-sig      policy    governance iance
L3      L2-stub   L3 WCB    L3 WCB    L3 Saga   L4 full   L5 full   L6 OT     L7 full   L7
                  basic     + 4 SMs   + 14 SMs  guard     14 SMs    write-path
L4      L2-stub   L3 3 roots L3 roots L4 full   L4 full   L5 txn    L6 ERP    L7 Vert   L7
                  (NC, Doc)  + 8 more  QMS+WF   14 domains           roots
L5      L2-stub   L3 OTG    L3 OTG   L4 OTG    L4 OTG    L5 OTG    L6 OTG    L7 full   L7
                  seed      basic     + 3 MVs   native    full      + data    analytics
L6      L3 HMV4  L4 HMV4   L4 HMV4  L4 HMV4   L5 HMV4   L5 HMV4   L6 HMV4   L7 HMV4   L7
        slice 1   slices    slices    slices    slices    18 roots  full      full      full
L7      L2-stub   L3 E4/E5  L3 E4/E5  L4 E4/E5 L4 read   L5 full   L6 E15    L7 E0-E15 L7
                  basic      + E1      + E7/E8   live      CRUD      + E15 OT  full
L8      L3 K8s   L3 OTel   L4 SLO    L4 AlertMgr L4 DR   L5 DORA   L6 SIEM   L7 full   L7
                  basic      alerts    + backup   drill    baseline   integ     SRE
L9      (none)   (none)    (none)    L3 stub    L3 OT     L4 OT     L5 full   L6 adv    L7 adv
                                                edge      full      L9 SL-2   OT
```

W = Wave; L0-L7 = maturity level per per-slice graduation discipline.
Wave numbers match Part G chapter numbering.

---

## 10. Per-pack overlay (J1-J5)

```
LAYER  J1 PHARMA                J2 AUTO               J3 AERO               J4 MD                 J5 FOOD
L1     MFA required for all      Standard MFA           ITAR person-of-record  Standard MFA +         Standard MFA
       GxP actions (enhanced     (no special            identity claim          DHF actor binding      (PCQI actor
       beyond standard MFA);     MFA overlay)           required for ITAR-       (actor must have       class for
       aseptic personnel                                 controlled data access;  DHF authorship         FSMA records)
       qualification in claims                           FIPS 140-3 cipher       claim)
                                                         required for ITAR claims
L2     EBR release authority      PPAP approval          NADCAP certification    DHF / DHR approval    HACCP CCP
       policy (21 CFR 211.68);    authority policy;      authority policy;       authority policy;     override policy
       Batch Release authority    IATF 16949 RBAC        AS9100 RBAC overlays;  ISO 13485 + IEC       (FSMA Part 117
       (EU GMP Annex 16)          overlays               ITAR export control     62304 RBAC overlays   RBAC overlays)
                                                         restriction in ABAC
L3     SM-10 (Batch Release)      SM-APQP (new SM);     SM-FAI (new SM;         SM-DHF-lifecycle      SM-HACCP (new
       + SM-STABILITY (new);      SM-LPA (Layer         per AS9145); SM-        (DHF → DMR);          SM; CCP monitor
       SM-APR (Annual Product     Process Audit SM);    counterfeit (new SM)    SM-FSCA (new SM;      state machine);
       Review SM)                 8D integration in SM-6                        vigilance per MDR)    SM-EMP (Env
                                                                                                      Monitoring SM)
L4     batch_record (EBR);        dfmea, pfmea, ppap,   fai_record, asr,        dhf_record, dmr,      ccp_log,
       stability_study,           lpa_record, apqp_     as9100_finding,         psur_record,          emp_sample,
       annual_product_review,     project, 8d_report    nadcap_cert,            fsca_record,          recall_lot
       dscsa_transaction                                 counterfeit_report      udi_record            (FSMA §204)
L9     Cleanroom sensor           SCADA / OEM           Aerospace shop          Sterilizer cycle      HACCP CCP
       integration (temp,         network OT            OT integration          OT monitoring;        sensor monitoring;
       humidity, EM readings);    integration (per-OEM  (NC-12 programs +       cleanroom EM          kill-step
       sterile-line OT write-     EDI at L7 boundary)   FAI station data);      monitoring (aseptic)  validation data
       path N prerequisites                             ITAR zone at L9
       include aseptic zone
       compliance
```

---

## 11. Decision phrase

```
B1_LAYERED_ARCHITECTURE_V10_DEEP_UPGRADE_COMPLETE
B1_LAYERED_ARCHITECTURE_BASELINE_LOCKED
S1-01_B0_B1_LAYERED_ARCHITECTURE_DEEP_UPGRADE_COMPLETE
NEXT: load S1-02_B2_AUTHORITY_LEDGER.md
```
