# B6 — Cross-Cutting Concerns

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B6 (12 concerns; no per-concern intersections, testing, or per-pack overlay)  
**Cross-references:** B1, B2, B3, B7, H1 §4, H4, H5, H7, I2, I7, L1, L4, M5

---

## §0 Catalog

17 concerns thread vertically through every layer and every domain. They are not
owned by any single Part — they are horizontally enforced disciplines that every
Part must implement and every Part may cite rather than restate.

| ID | Name | Owner | Primary Standard |
|---|---|---|---|
| C1 | Audit Chain | Compliance + Security | 21 CFR 11.10(b)(c)(e); EU GMP Annex 11 §9 |
| C2 | OTG Axioms + Integrity | Architecture + Compliance | B3 axiom catalog; SHA3-256; RFC 3161 |
| C3 | Electronic Signature | Compliance | 21 CFR 11.50 + 11.70; EU GMP Annex 11 §14 |
| C4 | Identity + Authentication | Security | NIST SP 800-63-3 IAL/AAL; OWASP ASVS 5.0 §V2 |
| C5 | Tenant Boundary | Security + Architecture | OWASP ASVS 5.0 §V4; B6 C5; GDPR Art 25 |
| C6 | Idempotency | Engineering | E0 API contract; at-least-once CDC |
| C7 | Concurrency | Engineering | HTTP ETag/If-Match; RFC 7232 |
| C8 | Problem Details | Engineering | RFC 9457 |
| C9 | Observability | SRE | OpenTelemetry 1.x; OTLP semantic conventions |
| C10 | Retention + WORM | Compliance + Legal | 21 CFR 11.10(c); EU GMP Annex 11 §17; H5 |
| C11 | i18n + l10n | Product | ICU MessageFormat 2; CLDR; IANA tz |
| C12 | Accessibility | Product | WCAG 2.2 AA; EAA Art 32; Section 508 |
| C13 | PII / Privacy | Legal + Security | GDPR Art 5/25/32; CCPA; PIPL; I7 §9 |
| C14 | Performance Budget | Engineering + SRE | M5 SLO directory |
| C15 | AI Governance | AI Lead + Compliance | NIST AI RMF 1.0; EU AI Act; L1 §4 |
| C16 | Cryptographic Agility | Security | NIST SP 800-131A; NIST SP 800-208 (PQC); I7 §4 |
| C17 | Sustainability | Engineering + Finance | GHG Protocol; I6 cost envelope; K1 |

---

## C1 — Audit Chain

**Definition.** Every committed mutation in HESEM appends an immutable audit event to a SHA3-256 hash chain. The chain is batched into a daily Merkle tree, and the Merkle root is anchored externally via RFC 3161 timestamping. No event may be deleted, modified, or silently dropped without breaking the chain, which is detectable by any party holding the Merkle root.

**Why it matters.** 21 CFR 11.10(b) requires accurate and complete copies of records; 11.10(c) requires protection of records throughout retention; EU GMP Annex 11 §9 requires a complete audit trail of all GMP-relevant actions. Without an intact audit chain, a regulatory inspection could find that records were altered post-hoc, triggering a 483 observation or Warning Letter. The hash chain makes post-hoc alteration computationally detectable.

**Locus in B1.** The audit chain lives at L5 (OTG persistence) for event storage and at L8 (SRE) for the daily anchor job and TSA submission. Every L4 domain root mutation emits an audit event within the same transaction.

**Intersections.**
- Part A: Audit chain is a core platform commitment; cited as P-B-04 (Immutability) in B0.
- B1 L5: `otg_event` table is the storage substrate; `audit_chain_anchor` table stores Merkle roots.
- B2: Every Authority Ledger change is itself an audit event; B2 shares the `audit_chain_anchor` table.
- B3: OTG events are the audit events; hash chain per node (§8.2) and per event (§2.3).
- B4: Every SM transition side-effect includes an evidence emit (H4 EC class); these are audit events.
- Part D: Every workflow step that writes a regulated record triggers an audit emit.
- Part E (E6): Audit trail API queries MV-04; E7 signature history queries MV-06.
- Part H (H1 §4): Audit chain implements clauses 21 CFR 11.10(b)(c)(e)(j).
- Part H (H4): Evidence class taxonomy (EC-2, EC-16, EC-22) maps to audit event types.
- Part H (H5): Audit events have a perpetual retention floor for regulated tenants; WORM export at 30 days.
- Part I (I2): Audit chain lag monitored via L8 observability; SLO-10 anchor lag alert.
- Part L: Every AI advisory action is an audit event; L1 §4 triple-defense verified by daily axiom scan.

**Standards.** 21 CFR Part 11 §11.10(b)(c)(e); EU GMP Annex 11 §9; ISO 13485 §4.2.5 (document control); IATF 16949 §7.5.3 (documented information); AS9100D §7.5.3.

**Implementation contract.** Every service at L4 or above that commits a regulated mutation MUST emit a corresponding H4 audit event within the same Postgres transaction. The event MUST carry: `event_id` (UUID), `tenant_id`, `principal_id`, `action_verb`, `root_id`, `root_revision`, `before_hash` (SHA3-256 of prior state), `after_hash` (SHA3-256 of new state), `reason_text` (where regulated), `command_id` (FK to L3 command_bus), and `predecessor_event_id` (FK to prior event in chain). No service may write a regulated record and skip the audit emit — this is enforced by a CI check on all L4 service commits.

**KPI.** SLO-10 anchor lag < 25h (100% of regulated tenants); SLO-6 axiom violations = 0/7d (no post-commit chain breaks detected). Source: daily reconciliation job + L8 SLO burn alerting.

**Failure modes.** Hash chain break detected by A-09 reconciliation = SEV-1, legal hold, RB-INC-005. Anchor missed > 25h = SEV-1, RB-INC-004. WORM export failure = SEV-2, retry with exponential backoff.

**Testing discipline.** CI gate: unit test that every L4 service method that mutates regulated data calls `AuditChainService::emit()` synchronously. Integration test: insert a record, retrieve its audit trail via E6, verify hash chain is intact. Pen-test: attempt to delete an `otg_event` row directly in the database; verify detection by next reconciliation job. Red-team: simulate anchor service outage; verify SEV-1 alert fires within 25h.

**Per-pack overlay.** PHARMA: batch record audit trail must be producible as a printed accurate copy per 21 CFR 11.10(b). AERO: audit chain events for ITAR-flagged records are scoped to US-region anchor job only (J3). MD: complaint and FSCA events must remain in the audit chain per MDR Annex IX (technical file).

---

## C2 — OTG Axioms + Integrity

**Definition.** The 18 OTG axioms (B3 §4) are invariants that must hold across all OTG data at all times. They are checked at write time (L5 guard), at daily reconciliation (L8 batch job), and on-demand during audit inspections. A detected violation is a data integrity failure, not a validation error.

**Why it matters.** The OTG is the single source of truth for operational facts. An axiom violation means that either a code path bypassed the write guard (bug), a direct database write occurred without application layer controls (operational failure), or data was corrupted in transit (infrastructure failure). Each is a SEV-1 event requiring investigation before any further regulated writes may proceed on the affected tenant's data.

**Locus in B1.** Write-time checks live at L5 (OTG persistence layer). The daily reconciliation job lives at L8. Axiom A-05 (AI_NOT_BANNED_PRINCIPAL) is triple-enforced: at CI (L7/L3 tooling), at L2 runtime middleware, and at L8 daily check.

**Intersections.**
- B3: Axiom definitions and per-axiom documentation (§4).
- B2: Authority Ledger axioms AL-A-1..AL-A-4 are a subset of OTG axioms applied specifically to the authority model.
- B4: Every SM transition guard relies on at least one OTG axiom (A-01 NO_SELF_SIGN, A-03 EVIDENCE_COMPOSITION_COMPLETE, A-04 QUORUM_SUFFICIENT).
- Part H (H1 §4): OTG axioms implement 21 CFR 11.10(j) accountability (A-01, A-15), Annex 11 §14 e-sig (A-01, A-04).
- Part L (L1 §4): Axiom A-05 is the third layer of the banned-decision triple defense.
- I2 (observability): Daily axiom reconciliation emits metrics to L8; per-axiom violation count is an SLO metric.

**Standards.** 21 CFR Part 11 §11.10(j); EU GMP Annex 11 §9 and §14; GAMP 5 Section 5.4 (data integrity); ALCOA+ framework (Attributable, Legible, Contemporaneous, Original, Accurate, + Complete, Consistent, Enduring, Available).

**Implementation contract.** Every L5 write path for regulated data MUST call the axiom guard chain before committing the transaction. The guard chain is a composed set of synchronous checks; a single failure rejects the entire transaction with an HTTP 422 response carrying the specific axiom ID in the `problem_type` field (C8). No exception may suppress an axiom guard — this is a hard contract enforced by code review and CI.

**KPI.** SLO-6: axiom violation rate = 0 detected per 7-day window. Source: L8 daily reconciliation job result counts. Alert: any violation > 0 triggers immediate SEV-1 page.

**Failure modes.** Axiom A-06 cycle detected at write = reject + SEV-1. Post-commit violation found in reconciliation = SEV-1 + lock affected tenant records + RB-INC-005. Reconciliation job itself fails = SEV-2, retry, escalate to SEV-1 if not resolved within 2h.

**Testing discipline.** CI gate: each axiom has a negative test case (attempt the violation; assert rejection with correct error code). Integration test: daily reconciliation job run against a fixture dataset that includes a known violation; verify detection and alerting. Red-team: direct DB insert of a SIGNED_BY edge for a banned-decision action with AI principal; verify A-05 detected in next reconciliation.

**Per-pack overlay.** AERO: axiom A-10 upgraded to ECDSA-P384 for ITAR tenants. PHARMA: axiom A-04 quorum policy for BD-9 (QP release) includes QP not being the QA reviewer (BD-1 compound guard).

---

## C3 — Electronic Signature

**Definition.** An electronic signature in HESEM is a typed, auditable, non-repudiable assertion by a natural person that they have reviewed a specific regulated record and attest to its accuracy or authorise its transition. It binds the signer's identity, the record's content hash at the time of signing, the signing reason, and a timestamp, all stored as a signed payload in the E7 signature record.

**Why it matters.** 21 CFR Part 11 §11.50 requires that e-signatures include the signer's printed name, date/time, and the meaning of the signature; §11.70 requires that e-signatures be linked to their respective electronic records such that they cannot be excised, copied, or otherwise transferred without detection. EU GMP Annex 11 §14 extends these requirements to the EU context. Missing or invalid e-signature evidence is the most common 21 CFR Part 11 observation in FDA inspections.

**Locus in B1.** E-signature capture lives at L6 (UI prompt, factor collection) and L1 (authentication re-verification). The signature record is written at L4 (E7 service) within the same L3 command transaction. The OTG SIGNED_BY edge (P-04) links the signature record to the regulated record at L5.

**Intersections.**
- B2: Every Tier-1 action requires an e-signature; the Authority Ledger quorum policy (§4) specifies the required signer count and AAL level per banned decision.
- B3: SIGNED_BY predicate (P-04) and RELEASED_BY (P-02); OTG MV-06 `mv_signature_audit`.
- B4: All SM transitions marked `evidence = EC-2 signature` in §2..§15 require an e-signature.
- Part E (E7): E7 API manages signature lifecycle (capture, history, revocation).
- Part H (H1 §4): Implements 21 CFR 11.50 and 11.70; EU GMP Annex 11 §14.
- Part H (H4): Evidence class EC-2 (signature) is the H4 type for all e-signature events.
- Part I (I7 §4): Signature algorithm governed by cryptographic agility policy (C16).

**Standards.** 21 CFR Part 11 §11.50 (components), §11.70 (record-signature linking), §11.100 (uniqueness); EU GMP Annex 11 §14 (electronic signatures); NIST SP 800-63-3 AAL2 minimum for single-signer regulated actions; AAL3 (hardware token) for ITAR and CMMC-scoped actions; ISO/IEC 27001 A.10.1 cryptographic controls.

**Implementation contract.** Every regulated action that requires an e-signature MUST declare `requires_esig: true` and the `sig_authority_class` in its Authority Ledger entry (B2). When the L3 command handler processes such an action, it MUST verify that all required SIGNED_BY edges are present in the OTG before issuing the Confirm phase of the TCC saga. The UI layer (L6) MUST present the signature prompt within the same user session that initiated the action; it MUST display the full record content hash and the signing meaning before requesting factor re-authentication. The signature record stored in E7 MUST include: `signer_id`, `printed_name` (snapshot at sign time), `signed_at` (RFC 3339), `meaning` (from controlled vocabulary), `record_hash` (SHA3-256 of the record at sign time), `algorithm`, `key_id`, `signature_bytes`.

**KPI.** Signature completeness: fraction of regulated transitions with a linked and valid E7 signature record >= 100% (zero tolerance). Signature verification latency: p95 < 3s (E7 verify endpoint SLO). Source: daily audit scan against SM transition log.

**Failure modes.** Signature record missing for regulated transition = SEV-1 axiom A-04 violation. E7 verify endpoint returns invalid = SEV-1 + lock record. Algorithm deprecated per C16 = migrate per H7 Class B; old signature retained as historical evidence.

**Testing discipline.** CI: each SM transition marked `requires_esig` has an integration test verifying that attempting the transition without a signature fails with `QUORUM_NOT_MET`. Pen-test: attempt to copy a SIGNED_BY edge from one record to another (the §11.70 non-transferability requirement); verify the OTG uniqueness constraint rejects it.

**Per-pack overlay.** PHARMA: QP electronic signature for batch release (BD-9) requires AAL3 hardware token in EU GMP context. AERO: ITAR-scoped signature requires FIPS 140-3 hardware token (ECDSA-P384). MD: PRRC signature on field safety corrective action (SM-J4-02) requires AAL2 + biometric for EUDAMED submission.

---

## C4 — Identity + Authentication

**Definition.** Identity in HESEM is the binding of a platform principal (human or service) to a verified identity record that carries the principal's attributes, authentication assurance level (AAL), and current status. Authentication is the process by which a principal proves that identity to the platform at a specific point in time and at a specific assurance level.

**Why it matters.** All authority decisions (B2), all audit attribution (C1), all e-signature assertions (C3), and all OTG axiom checks (C2) depend on identity being accurate and unforgeable. A compromised identity means that all downstream records authored by that identity are suspect. 21 CFR 11.10(j) requires accountability of individuals using the system.

**Locus in B1.** Identity and authentication live at L1 (Identity & Authentication layer) exclusively. L2 receives a verified identity token from L1 and uses it for authority decisions; L2 never performs authentication directly.

**Intersections.**
- B1 L1: Session management, token issuance, MFA enforcement, OIDC/SAML federation, service principal authentication.
- B2: Identity token is the input to the `decide()` algorithm; principal_id from L1 is the subject of Authority Ledger entries.
- B3: `principal_id` carried on every `otg_event`, `otg_edge`, and `otg_node`; `created_by_principal` on `otg_node`.
- B4: SM transition guards reference `principal.aal_level` (e.g. AAL3 for ITAR), `principal.account_status` (suspended check per A-15), and `principal.role_set`.
- Part E (E1): E1 API manages identity lifecycle (register, activate, suspend, deactivate, federation).
- Part H (H1 §4): 21 CFR 11.10(j) accountability implemented via identity attribution on every event.
- Part I (I7): OWASP ASVS 5.0 §V2 authentication requirements.

**Standards.** NIST SP 800-63-3 IAL1/IAL2/IAL3 identity proofing; AAL1/AAL2/AAL3 authentication assurance; OWASP ASVS 5.0 §V2; OAuth 2.0 / OIDC 1.0; SAML 2.0 for enterprise federation; FIPS 140-3 for hardware token authentication in regulated contexts.

**Implementation contract.** Every inbound API request at L7 MUST present a valid session token issued by L1. L7 validates the token signature; L2 reads the token claims without re-validating (token validation is L1's contract). Service-to-service calls MUST use service principal tokens with scoped audience claims; a service principal token for the analytics service must not be accepted by the authority service. Long-lived tokens (> 8h) are prohibited for human principals.

**KPI.** AAL2 coverage: fraction of Tier-1 SM transitions authenticated at AAL2 or higher = 100%. Failed authentication rate: < 0.5% of login attempts (distinguishes brute-force from legitimate users). Session token expiry compliance: 0 tokens valid beyond the configured lifetime.

**Failure modes.** Identity provider outage = cascade to read-only mode for informational operations; Tier-1 regulated writes blocked; SLO-1 latency breach if identity cache misses. Suspended principal authenticated via stale cache = axiom A-15 violation; SEV-1 if a regulated write occurred with suspended identity.

**Testing discipline.** CI: every L7 route has an integration test verifying that a request without a valid token returns 401. Pen-test: token replay attack with expired token; verify rejection. Pen-test: horizontal privilege escalation (use principal A's token to access principal B's records); verify tenant boundary and role check.

**Per-pack overlay.** AERO: ITAR-scoped roles require in-person IAL3 identity proofing and DDTC US-person verification before any ITAR-related write action. PHARMA: QP role requires identity proofing against regulator-maintained QP register (EU GMP Chapter 5); platform maintains QP certificate expiry tracking.

---

## C5 — Tenant Boundary

**Definition.** Tenant boundary is the guarantee that no data belonging to tenant A can be read, written, or inferred by any principal of tenant B without an explicit, audited inter-company agreement. It is enforced by two independent mechanisms (double-defense): application-layer middleware and Postgres Row-Level Security (RLS).

**Why it matters.** Multi-tenant data isolation is the foundation of the HESEM SaaS trust model. A cross-tenant data leak is a contractual breach, a GDPR Article 32 security incident, and a potential violation of industry regulatory data exclusivity provisions (e.g. pharma dossier confidentiality). Per SLO-19, cross-tenant access attempts must be zero.

**Locus in B1.** Layer L5 enforces RLS. Layer L7 enforces middleware tenant extraction and binding. Layer L2 binds `tenant_id` from session context into every authority decision. L8 monitors for cross-tenant attempts.

**Intersections.**
- B3: OTG axiom A-07 (CROSS_TENANT_BOUNDARY) is the offline post-hoc integrity check; `tenant_id` is the first column of all OTG tables and is hash-partitioned.
- B5 §5: Per-region data residency rules intersect with tenant boundary (ITAR tenant = US-region only).
- Part E (E2): Authority API endpoint E2.7 (system authority) is the only cross-tenant read; vendor L8 only.
- Part H (H1): GDPR Art 32 technical security measures implemented via tenant RLS.
- Part I (I7 §9): PII isolation per tenant is a direct consequence of tenant boundary enforcement.

**Standards.** GDPR Article 25 (data protection by design); Article 32 (security of processing); OWASP ASVS 5.0 §V4 (access control); OWASP API Security Top 10 API5:2023 (broken object-level authorisation).

**Implementation contract — Layer 1 (Middleware).** Every L7 API request MUST have its `tenant_id` extracted from the validated session token and bound to the request context. All downstream service calls within the request MUST propagate the `tenant_id` via context (never via request body or URL parameter). The middleware MUST verify that the resource being accessed (`root.tenant_id`) equals the session `tenant_id` before passing to L4.

**Implementation contract — Layer 2 (RLS).** Every Postgres table that holds tenant-scoped data MUST have an RLS policy of the form `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. The RLS policy is set via a `SET LOCAL` statement at the beginning of every database connection (immediately after authentication). No service may bypass RLS via a superuser connection for tenant data access.

**KPI.** SLO-19: cross-tenant access attempts = 0 per year (measured as `otg_event` rows with mismatched `tenant_id` rejected by either defense layer + RLS policy violations logged). Alert: any single cross-tenant event fires SEV-1.

**Failure modes.** Middleware extracts wrong tenant_id from malformed token = SEV-1 security incident. RLS policy missing on new table = SEV-2 detected by CI RLS coverage check. Vendor L8 cross-tenant aggregate query reads PII = SEV-1 data breach.

**Testing discipline.** CI: RLS coverage test — for every table in schema with a `tenant_id` column, assert an RLS policy exists. Integration test: authenticated as tenant A, attempt to read a record owned by tenant B; assert 403 and no data leakage. Pen-test: horizontal isolation attack across tenants using IDOR (OWASP API5); assert RLS block.

**Per-pack overlay.** AERO: ITAR tenant isolation extends to region isolation (US-only RLS policies; ITAR data never replicates cross-region). PHARMA: EU pharma dossier data (CTD sections) is sub-classified within the tenant; only principals with the REGULATORY_SUBMISSION role can access.

---

## C6 — Idempotency

**Definition.** Idempotency is the guarantee that submitting the same mutation request more than once produces the same result as submitting it once, with no side-effects on the second or subsequent submissions. Every mutating endpoint in HESEM is idempotent by design.

**Why it matters.** At-least-once delivery (B3 §6.3 CDC; B8 outbox relay) means any command may be delivered multiple times due to network retries, client timeouts, or saga retry logic. Without idempotency, duplicate delivery causes double-mutations, double-charges, double-lot-creation, and double-audit-events — all of which corrupt regulated records.

**Locus in B1.** Idempotency keys are enforced at L3 (Command Bus) before the command reaches L4. The idempotency check is a read of the `saga_ledger` or `command_bus` table for the provided `Idempotency-Key` header value.

**Intersections.**
- B3: OTG axiom A-17 (COMMAND_IDEMPOTENT) is the post-hoc integrity check; unique constraint on `(command_id, event_kind='COMMITTED')`.
- Part E (E0): E0 API contract specifies the `Idempotency-Key` header shape and semantics.
- B4: All saga Confirm and Cancel phases are idempotent by design (TCC compensation functions are also idempotent).

**Standards.** IETF draft "The Idempotency-Key HTTP Header Field"; at-least-once delivery with idempotent consumers pattern (Pat Helland, "Idempotence Is Not a Medical Condition"); CloudEvents 1.0 `id` field for event deduplication.

**Implementation contract.** Every mutating HTTP endpoint MUST accept an `Idempotency-Key` header (UUID). If absent, the server generates one from `hash(method + path + body)`. The server MUST store the idempotency key and its result (status code + response body hash) for 24 hours. A repeated request with the same key within 24 hours MUST return the stored result without re-executing. After 24 hours, the key expires and a new execution may occur. The idempotency key shape is: `[tenant_id]-[client_generated-UUID]`. Keys must not be recycled across tenants.

**KPI.** Duplicate command processing rate = 0 (no COMMITTED event for any `command_id` appears more than once in `otg_event`; monitored by axiom A-17 daily reconciliation). Idempotency cache hit rate: monitored via L8 metric `idempotency.cache.hit_ratio`; expected > 0.01% of requests (indicates clients are retrying as expected).

**Failure modes.** Idempotency store unavailable (Redis down) = fall through to re-execution; monitor for duplicate otg_events post-recovery; axiom A-17 detects. Idempotency key collision across tenants = tenant boundary violation; mitigated by `tenant_id` prefix in key.

**Testing discipline.** Integration test: submit the same mutation twice with the same `Idempotency-Key`; assert identical response and single OTG COMMITTED event. Integration test: submit with expired key after 25h; assert re-execution. Load test: 100 concurrent identical requests; assert exactly one committed event.

**Per-pack overlay.** No pack-specific variations. Idempotency is universal across all packs; DSCSA exchange events (J1) and OEM EDI acknowledgments (J2) both require idempotent replay handling at the outbox relay.

---

## C7 — Concurrency (ETag / If-Match)

**Definition.** Optimistic concurrency control prevents two users from unknowingly overwriting each other's mutations on the same record. Every authoritative root carries an ETag (SHA3-256 of the serialised root state at its current `root_revision`). Mutating requests must provide an `If-Match` header; the server rejects mutations whose ETag does not match the current state.

**Why it matters.** Without concurrency control, two concurrent QA reviewers could both approve different versions of a batch record, with the second write silently overwriting the first. In regulated manufacturing, this is not a merge conflict to be resolved — it is a data integrity failure that could result in an untested or unreviewed record being considered approved.

**Locus in B1.** ETag computation and If-Match validation live at L4 (domain root service) before the mutation is applied. The OTG axiom A-08 (MONOTONIC_REVISION) is the integrity check: `root_revision` must be strictly increasing.

**Intersections.**
- B3: Axiom A-08 enforces revision monotonicity at L5; `root_revision` on `otg_node` is the optimistic lock field.
- Part E (E0): ETag and If-Match semantics are specified in the E0 API contract per RFC 7232.
- B4: SM transitions that operate on shared records (e.g. batch record under concurrent review) use If-Match to prevent lost updates.

**Standards.** RFC 7232 §3.1 (If-Match); RFC 9110 §8.8.3 (ETag); HTTP/1.1 conditional request semantics.

**Implementation contract.** Every GET response for an authoritative root MUST include an `ETag` header. Every PUT/PATCH/DELETE request on an authoritative root MUST include an `If-Match` header. If `If-Match` is absent, the server MUST return 428 (Precondition Required). If `If-Match` does not match the current ETag, the server MUST return 412 (Precondition Failed) with a Problem Details body (C8) explaining the conflict. The client MUST retrieve the current state, resolve the conflict at the application layer, and resubmit.

**KPI.** 412 Precondition Failed rate: monitored per endpoint; sustained > 5% indicates a concurrency hotspot requiring investigation. Metric: `api.response.status_412.rate`.

**Failure modes.** If-Match validation bypassed (bug in middleware) = silent lost update; detected by OTG hash chain break (A-09) if data diverges. High 412 rate on a shared record (e.g. batch record under simultaneous review) = application-level merge assistance required; not a platform failure but a UX design issue.

**Testing discipline.** Integration test: fetch a record (get ETag); make two concurrent PUT requests with the same ETag; assert one succeeds (200) and the other fails (412). Integration test: attempt PUT without If-Match header; assert 428.

**Per-pack overlay.** No pack-specific variations; concurrency is universal.

---

## C8 — Problem Details (RFC 9457)

**Definition.** Every error response from any HESEM API endpoint is structured as an RFC 9457 Problem Details object. This provides a machine-readable, human-intelligible error taxonomy that clients, integration partners, and support engineers can consume consistently.

**Why it matters.** Inconsistent error formats across endpoints force every API consumer to implement bespoke error parsing. For regulated integrations (DSCSA, FMD, OEM EDI), a machine-readable error type is required for automated retry and failure triage. For audit purposes, the `instance` URI in a Problem Details object provides a unique, persistent identifier for a specific error occurrence.

**Locus in B1.** Problem Details serialisation lives at L7 (API gateway / error handler). The domain-specific error types are defined per domain at L4.

**Intersections.**
- Part E (E0): E0 API contract specifies the Problem Details schema and the error type registry.
- B4: SM transition axiom violations produce typed errors (e.g. `AXIOM_A01_SELF_SIGN_VIOLATION`).
- B3: OTG axiom violation codes are defined in B3 §4 and appear as `type` URIs in Problem Details.
- Part D: Workflow API errors (saga failure, quorum timeout) produce Problem Details with saga-specific `type` URIs.

**Standards.** RFC 9457 "Problem Details for HTTP APIs"; IANA Problem Type Registry (for standard types); HESEM internal Problem Type Registry (for domain-specific types, registered in E0 Appendix A).

**Implementation contract.** Every 4xx and 5xx response MUST be a valid RFC 9457 document with: `type` (URI identifying the problem type; absolute URI prefixed with `https://hesem.io/problems/`), `title` (human-readable summary; stable; not locale-specific), `status` (HTTP status code), `detail` (locale-specific human-readable explanation; may be i18n'd per C11), `instance` (URI identifying the specific occurrence; globally unique; loggable), and any extension fields specific to the problem type (e.g. `axiom_id` for axiom violations; `quorum_missing_roles` for quorum failures). The Problem Type Registry (E0 Appendix A) is the authoritative source of all `type` URIs; adding a new type is a Class B governance change (H7).

**KPI.** Problem Details compliance: fraction of 4xx/5xx responses that validate against the RFC 9457 schema = 100%. Monitored by automated contract test suite run in CI and nightly against production.

**Failure modes.** Error serialiser throws exception while generating Problem Details = 500 with empty body; monitored by L8 alert on 500 rate. Uncategorised exception escapes to client without Problem Details wrapper = CI contract test failure on next run.

**Testing discipline.** CI: every controller test asserts that error responses are valid RFC 9457 documents. Contract test: automated RFC 9457 schema validation against every endpoint in the OpenAPI spec.

**Per-pack overlay.** Pack-specific error types (e.g. DSCSA serialisation errors for J1, ITAR export authorisation errors for J3) are registered in E0 Appendix A under the pack namespace.

---

## C9 — Observability

**Definition.** Every layer of HESEM emits structured, correlated observability signals — distributed traces, metrics, and logs — conforming to the OpenTelemetry 1.x specification and OTLP semantic conventions. Every service request can be traced end-to-end from L7 gateway to L5 Postgres query.

**Why it matters.** Without correlated observability, diagnosing a latency regression or a regulatory data integrity incident requires log archaeology across multiple services. Per H1 §4, the platform must be able to demonstrate, at any point in an inspection, the real-time state of SLO compliance. SLO burn rate alerting (per I2) is only possible with high-quality, consistent metric definitions.

**Locus in B1.** L8 (Platform / SRE / Observability) owns the OpenTelemetry collector, the metric storage (TSDB), and the trace backend. Every layer L1..L9 emits OTLP data to the L8 collector.

**Intersections.**
- I2: Observability architecture, SLO definitions, and alerting rules.
- M5: SLO directory — all per-SLO targets that must be measurable via observability signals.
- B3: OTG anchor lag (SLO-10), CDC lag (SLO-13), MV freshness (SLO-5) are observability metrics.
- B4: SM transition latency is a per-SLO metric; each transition table row has an SLO target.

**Standards.** OpenTelemetry 1.x specification; OTLP/gRPC for signal transport; OTLP semantic conventions (HTTP server, DB client, messaging); Prometheus exposition format for metrics scrape compatibility.

**Implementation contract.** Every service MUST: (1) initialise an OTel TracerProvider and MeterProvider at startup; (2) instrument all inbound HTTP handlers with OTel HTTP server semantic conventions (`http.method`, `http.route`, `http.status_code`, `http.request.duration`); (3) propagate W3C Trace Context headers across all service-to-service calls; (4) emit a Postgres client span for every database query with `db.statement` (sanitised; no PII), `db.operation`, and `db.name`; (5) emit a custom span for every L3 saga step and SM transition. Logs MUST be structured JSON with `trace_id`, `span_id`, `tenant_id` (never containing PII), and `severity`. Metrics MUST use OTLP delta temporality for counters.

**KPI.** Trace completeness: fraction of inbound requests with a complete end-to-end trace (L7 → L5) > 99.5%. P95 latency reported by traces MUST agree with independently measured p95 within 5%. Alert: `trace_completeness < 99.0%`.

**Failure modes.** OTel collector crash = traces and metrics buffered in SDK memory (default 5s); if not recovered within 5s, data is dropped; SEV-2. Postgres query spans missing = cannot correlate L7 latency to DB query time; SEV-3, investigate instrumentation. Trace context not propagated across service call = orphaned child spans; SEV-3.

**Testing discipline.** CI: OTel instrumentation smoke test — start a service against a test collector, fire one request, assert a trace was emitted with the required semantic convention attributes. Integration test: fire a regulated SM transition; assert the resulting trace includes spans from L7, L3, L4, and L5.

**Per-pack overlay.** AERO: ITAR-scoped traces must not be shipped to a non-US observability backend. The L8 collector must route ITAR-flagged tenant traces to a US-region-only backend.

---

## C10 — Retention + WORM

**Definition.** Every data class in HESEM has a configured retention floor and a WORM (Write Once Read Many) policy where regulatory requirements mandate tamper-evidence beyond the hash chain. After the retention floor, data may be archived to lower-cost storage but may not be deleted until legal authorisation (e.g. post-statute expiry).

**Why it matters.** 21 CFR 11.10(c) requires that records be protected throughout their retention period. EU GMP Annex 11 §17 requires that data storage media be validated and that data is accessible throughout the retention period. Premature deletion of batch records or audit events is a GMP critical finding; GDPR Article 5(1)(e) requires that data not be kept longer than necessary (creating a dual obligation for deletion after retention floor, unless a legal basis for extended retention exists).

**Locus in B1.** Retention policy enforcement lives at L8 (SRE / data platform). WORM export lives at L5 (Postgres partition management) triggered by L8 scheduler. Retention floor guard (axiom A-13) lives at L5.

**Intersections.**
- B3: Monthly `otg_event` partition WORM export (§12.3); axiom A-13 (EVIDENCE_RETENTION_FLOOR) blocks premature deletion.
- B5 §3: Data classification taxonomy maps classifications to retention floors.
- H5: Retention policy per data class (source of truth for retention floors).
- Part I (I7 §9): GDPR erasure requests vs. regulated retention conflict resolution (B5 §6.4).

**Standards.** 21 CFR Part 11 §11.10(c); EU GMP Annex 11 §17 data management; ICH Q10 §3.2 (pharmaceutical quality system records); GDPR Article 5(1)(e) storage limitation; 21 CFR Part 820 §820.70 (device manufacturer records 2y post-distribution); FDA FSMA §204 records (2y for most food); ISO 13485 §4.2.5 (records retained minimum 2y or device lifetime + 2y).

**Implementation contract.** The H5 retention policy table is the authoritative source of retention floors per data classification. The L8 WORM export scheduler reads this table. Axiom A-13 reads this table at runtime. No manual partition drop may be executed without a pre-drop retention check that queries H5. WORM export to S3-compatible Object Lock COMPLIANCE mode is mandatory for all `AUTHORITATIVE_REGULATED` and `AUDIT_IMMUTABLE` data older than 30 days.

**KPI.** Retention compliance: fraction of data classes with WORM export completed within the configured window = 100%. Pre-floor deletion attempt rate = 0 (every attempt blocked by axiom A-13 and logged). Source: L8 WORM export job status + axiom A-13 rejection log.

**Failure modes.** WORM export job fails = SEV-2; retry with exponential backoff; escalate to SEV-1 if not resolved within 48h. Axiom A-13 violation (deletion attempted) = SEV-1; halt deletion; notify compliance. Object Lock period expired before retention floor = SEV-1; re-apply Object Lock.

**Testing discipline.** Integration test: attempt to drop a partition before its retention floor date; assert rejection by axiom A-13. Integration test: verify that WORM export SHA3-256 hash matches the hash stored in `audit_chain_anchor`.

**Per-pack overlay.** PHARMA/MD: 10y retention floor (EU GMP Chapter 4; EU MDR Annex IX). FOOD: 2y retention for FSMA §204 records. AUTO: 15y retention for per-VIN records (German Product Liability Act; Produkthaftungsgesetz). AERO: records retained for the life of the aircraft plus 10y.

---

## C11 — i18n + l10n

**Definition.** HESEM operates across 5 vertical packs, 14 domains, and customer deployments in multiple locales and regulatory jurisdictions. Internationalisation (i18n) is the engineering discipline of designing the platform to support multiple locales without code changes. Localisation (l10n) is the per-locale adaptation of UI strings, date/number formats, and regulatory terminology.

**Why it matters.** EU GMP Annex 11 §4 requires that the system language is defined and that users can interact in the language of their regulatory authority. Incorrect number or date formatting can cause misinterpretation of QC results (e.g. `1,5` vs `1.5` for decimal separator across DE/EN locales). Regulatory submission content must be in the language of the target authority.

**Locus in B1.** i18n lives at L6 (Frontend / Presentation) for UI strings, date/number formatting, and input validation. The backend at L4 uses locale-neutral data storage (ISO 8601 dates, decimal-point numbers, UTF-8 strings); it does not render locale-specific content except for report generation.

**Intersections.**
- Part F (F12): i18n catalog, ICU MessageFormat 2 implementation, locale preference per user.
- C8: Problem Details `detail` field is locale-specific (translated per the user's locale); `title` is locale-neutral.
- Part H (H1 §4): Regulatory text on e-signature prompts must be in the appropriate regulatory language.
- Part J (all packs): Regulatory terminology varies by pack and region (e.g. "Qualified Person" in EU pharma vs. "Responsible Person" in some non-EU contexts).

**Standards.** ICU MessageFormat 2 (MF2; CLDR-backed plural and gender rules); CLDR 44 (locale data); IANA tz database (timezone names); ISO 8601 (date/time); ISO 4217 (currency); Unicode BIDI algorithm (RTL language support for Arabic locales).

**Implementation contract.** Every user-facing string in L6 MUST be sourced from the i18n catalog via `t('key', {params})` using ICU MessageFormat 2 syntax. Date/time values MUST be stored as UTC in the database and converted to the user's preferred timezone at render time using IANA tz. Number values MUST be stored as `NUMERIC` (decimal-safe) in Postgres and formatted per the user's locale at render time. Backend error `detail` fields MUST accept a `locale` parameter and return translated text; if no translation is available, fall back to `en-US`. The i18n catalog is owned by the Product team and versioned in git alongside the UI code.

**KPI.** i18n coverage: fraction of UI strings sourced from the i18n catalog (not hardcoded) = 100%. Monitored by CI lint rule that rejects hardcoded string literals in L6 components. Missing translation rate: fraction of rendered strings falling back to `en-US` for non-English locales < 1%.

**Failure modes.** Missing translation key = UI renders the key string (`[i18n.missing]`); SEV-3 cosmetic; corrected in next release. Date formatted in wrong locale = potential misinterpretation of expiry dates; SEV-2 if in regulated context. ICU MessageFormat parse error = string renders as error; SEV-2 if in regulatory-facing surface.

**Testing discipline.** CI: ICU MessageFormat syntax lint on all catalog files. CI: locale completeness check — for every key in the base locale (en-US), a translation exists in all configured locales. Integration test: render a regulated date field with a DE locale user; assert comma decimal separator and dd.MM.yyyy format.

**Per-pack overlay.** PHARMA EU: French, German, Spanish, Italian regulatory UI strings required for EMA submission interfaces. AERO J3: English-only for ITAR-flagged content (export control; no translation to non-US-ally languages). FOOD J5: Spanish required for US FDA reporting interfaces (bilingual submission requirement in some US states).

---

## C12 — Accessibility

**Definition.** Every user interface surface in HESEM must be perceivable, operable, understandable, and robust for users with disabilities, conforming to WCAG 2.2 Level AA as a minimum. This applies to all 18 HMV4 workspace slices, all administrative surfaces, and all report outputs.

**Why it matters.** The EU Accessibility Act (EAA) Article 32 requires digital products for B2B use in the EU to be accessible by June 2025. US Section 508 requires accessibility for federal contractors. Beyond legal compliance, accessibility engineering produces better UI for all users: keyboard navigation benefits power users; colour contrast benefits users in bright environments; clear focus indicators benefit users on small screens.

**Locus in B1.** Accessibility lives at L6 (Frontend / Presentation). There is no L4 or L5 accessibility implementation — accessibility is a rendering concern. However, API responses (L7) must carry semantic information that enables accessible rendering (e.g. error messages that can be announced by screen readers).

**Intersections.**
- Part F (F11): Accessibility design system — tokens, component contracts, ARIA patterns.
- C8: Problem Details `detail` must be readable by screen readers (no HTML in `detail`; plain text only).
- C11: Accessible strings must be translatable; screen reader announcements must use the user's locale.

**Standards.** WCAG 2.2 Level AA (full, including new SC 2.5.7 Dragging Movements, 2.5.8 Target Size, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication, 3.3.9 Redundant Entry); EU EAA Article 32; Section 508 (36 CFR Part 1194); ARIA 1.2 authoring practices.

**Implementation contract.** Every interactive component in L6 MUST: (1) have a visible focus indicator with a minimum 3:1 contrast ratio against adjacent colours (WCAG 2.4.7); (2) be operable via keyboard without mouse (WCAG 2.1.1); (3) have a minimum touch target size of 24×24 CSS pixels (WCAG 2.5.8); (4) use semantic HTML or ARIA roles, states, and properties such that a screen reader can correctly announce the element's purpose and current state; (5) not rely on colour alone to convey information (WCAG 1.4.1). Authentication flows MUST NOT require cognitive function tests beyond name/password recognition, per WCAG 3.3.8 Accessible Authentication.

**KPI.** Automated accessibility scan pass rate: axe-core or equivalent run in CI against every HMV4 slice; zero critical violations. Manual screen reader test coverage: every Wave 1 root slice tested with NVDA + Chrome and VoiceOver + Safari before release. WCAG 2.2 AA compliance: confirmed by third-party audit at each major release.

**Failure modes.** axe-core critical violation in CI = build blocked until fixed. Screen reader user reports broken flow = SEV-2; accessibility regression; patched in next sprint. EAA audit finding = regulatory action; immediate remediation sprint.

**Testing discipline.** CI: automated axe-core scan on every Playwright E2E test page. Manual: quarterly screen reader testing session per WCAG 2.2 success criteria. Pen-test scope: keyboard-only navigation audit of all regulated workflows.

**Per-pack overlay.** No pack-specific accessibility standard variations. All packs share WCAG 2.2 AA as the baseline. PHARMA EU: EAA compliance specifically required for EU-facing portal surfaces.

---

## C13 — PII / Privacy

**Definition.** PII (Personally Identifiable Information) is any data that can identify or be linked to a specific natural person. In HESEM, PII appears in identity records (E1), signatures (E7, OTG SIGNED_BY edges), training records (SM-8), NC records (reporter identity), and annotation fields. Privacy engineering is the set of design controls that limit PII to its minimum necessary use, protect it in transit and at rest, and enable data subjects to exercise their rights.

**Why it matters.** GDPR Article 5(1)(a)(c) requires purpose limitation and data minimisation. Article 25 requires data protection by design and by default. Article 32 requires technical measures (encryption, pseudonymisation, access control) proportionate to the risk. A PII breach carries fines of up to 4% of global annual turnover under GDPR Article 83. CCPA (California) and PIPL (China) impose parallel obligations.

**Locus in B1.** PII classification (tagging) lives at L4 (domain root field definitions). Redaction-by-default lives at L7 (API response serialisation). Pseudonymisation and erasure live at L5 (database function) and L4 (service layer). Per-region PII residency lives at L8 (replication routing).

**Intersections.**
- B5 §3: Data classification taxonomy includes `PII`, `PHI`, `CUI` classifications.
- B5 §6: PII flow control (tagging, redaction, pseudonymisation, erasure/retention conflict).
- C5: Tenant boundary ensures PII is never crossed between tenants.
- C10: GDPR storage limitation vs. regulated retention conflict resolution.
- I7 §9: Technical controls for PII per security architecture.
- H5 §6: Erasure procedure for post-retention PII.

**Standards.** GDPR Article 5 (principles), Article 25 (data protection by design), Article 32 (security), Article 17 (right to erasure); CCPA §1798.100; PIPL Article 17 (China); HIPAA §164.312 (for PHI).

**Implementation contract.** Every M3 root field that contains PII MUST be tagged with `pii_flag: true` and `pii_category` in the contract schema. API responses for PII-tagged fields MUST apply redaction-by-default at L7 unless the requesting principal holds `DATA_SUBJECT_ACCESS` or `AUDIT_INSPECTOR` authority. PII fields MUST be encrypted at rest using AES-256-GCM with a per-tenant data key. The pseudonymisation key must be separate from the data encryption key. Erasure requests MUST be processed within 30 days; the erasure event MUST be recorded as an OTG event and anchored in the daily Merkle batch.

**KPI.** PII redaction compliance (C8/B5 §8): >= 99.99% of API responses with PII fields correctly redacted for unauthorised principals. Erasure request completion time: < 30 days. Source: automated API response scanner; erasure request tracking system.

**Failure modes.** PII field returned unredacted (FM-B5-03) = SEV-1; GDPR Article 33 breach notification assessed. Erasure not completed within 30 days = GDPR compliance failure; regulatory complaint risk. PHI field logged in telemetry = HIPAA breach; SEV-1; log scrub required.

**Testing discipline.** CI: PII field redaction contract test — for every PII-tagged endpoint, assert that an unauthorised principal receives `<REDACTED>`. Pen-test: extract PII from error messages, logs, and telemetry; verify no PII appears in L8 telemetry signals. Privacy impact assessment: conducted for every new PII-tagged field before release.

**Per-pack overlay.** PHARMA EU: patient data in PV safety reports (pharmacovigilance) is classified as PHI; additional controls per EudraVigilance privacy requirements. MD J4: patient linkage data in vigilance reports is PHI per MDR Article 92. AUTO J2: employee training and assembly records containing employee IDs are PII under EU Works Council data agreements.

---

## C14 — Performance Budget

**Definition.** Every API route and every critical UI interaction has a performance budget expressed as p50/p95/p99 latency targets. Performance budgets are defined in M5 (SLO directory) and are enforceable: a route that consistently misses its p95 budget triggers a SLO burn alert and a performance regression investigation.

**Why it matters.** In regulated manufacturing, a slow response to a lot disposition query or a batch release decision is not just a UX problem — it is a manufacturing throughput problem that can delay patient access to medicines or create pressure to bypass review steps. Performance budgets make the implicit expectation explicit and measurable.

**Locus in B1.** Performance budgets are set at L7 (API gateway; per-route timeout configuration) and enforced via L8 observability (per-route p95 latency monitored). L4 and L5 performance is the primary lever; index design, query plan optimisation, and connection pool sizing are L5 implementation concerns.

**Intersections.**
- M5: SLO directory defines per-route and per-SLO latency targets.
- C9: Observability emits the per-route latency distributions used to evaluate budget compliance.
- B3: OTG write path budget (< 50ms per B3 §11.1); genealogy depth-20 query budget (< 1s per B3 §11.2).
- B2: `decide()` budget (< 20ms p95 per SLO-1 in M5).

**Standards.** ISO/IEC 25010:2023 §4.3 (performance efficiency quality characteristic); Google SRE Book Chapter 4 (SLO engineering); APDEX methodology for user satisfaction scoring.

**Implementation contract.** M5 is the authoritative source for performance budgets per route. L4 service methods that are on the critical path of a regulated transition MUST be benchmarked in CI against a reference dataset (per M3 cardinality estimates). A benchmark regression > 20% from the baseline triggers a CI failure. Query plans for hot database queries MUST be reviewed and approved in code review; unexplained `Seq Scan` on a large table is a blocking comment.

**KPI.** SLO compliance: fraction of time each SLO target (per M5) is met, measured as error budget burn rate. Targets: SLO-1 `decide()` p95 < 20ms; SLO-5 MV freshness < 5s; SLO-13 CDC lag < 60s. Alert: burn rate > 5% of monthly error budget in 1h.

**Failure modes.** p95 latency breach on a regulated endpoint = SEV-2; engineering investigation required within 1 business day. Sustained breach for > 4h = SEV-1. Budget breach due to missing index (Seq Scan on `otg_edge`) = immediate index creation; hotfix.

**Testing discipline.** CI: benchmark test per critical path method. Load test: simulate peak day (per M3 cardinality × 10× safety margin) before each major release. Trace-based bottleneck analysis: use L8 traces to identify which span contributes > 50% of p95 latency.

**Per-pack overlay.** PHARMA: DSCSA trace queries (lot genealogy) subject to 24h FDA response SLO; MV-07 pre-computation ensures query < 5s. AUTO: OEM EDI acknowledgment latency < 5s per OEM contract SLA.

---

## C15 — AI Governance

**Definition.** AI governance is the set of controls that ensure AI advisory outputs in HESEM are transparent, explainable, auditable, and strictly bounded to advisory (Tier-3) authority. No AI principal may commit a banned decision. The triple-defense architecture (L1 §4) enforces this at CI, runtime, and OTG axiom levels.

**Why it matters.** EU AI Act Article 9 requires risk management for high-risk AI systems in regulated manufacturing environments. NIST AI RMF 1.0 requires Govern, Map, Measure, and Manage functions. Without governance, an AI system could subtly influence or perform regulated decisions in ways that are undetectable to auditors, undermining the human accountability required by 21 CFR 11.10(j).

**Locus in B1.** AI advisory lives at L3 (advisory command handlers) with authority bounded to Tier-3 by the L2 Authority Ledger. OTG axiom A-05 (AI_NOT_BANNED_PRINCIPAL) lives at L5.

**Intersections.**
- L1 §1: Banned decision list (BD-1..BD-36); AI excluded from all.
- L1 §4: Triple-defense architecture.
- B2: AI_SERVICE_PRINCIPAL is assigned Tier-3 authority at most; `decide()` rejects AI attempts at Tier-1/Tier-2 actions.
- B3: Every AI advisory is an OTG entity (AI_ADVISORY node); PRODUCED_BY edge to AI_SERVICE_PRINCIPAL; `used` lineage to input entities.
- L4: Red-team AI advisory outputs quarterly; adversarial input testing.
- Part F: AI advisory is presented in L6 workspace with clear "AI advisory — requires human review" labelling (EU AI Act Article 13 transparency).

**Standards.** NIST AI RMF 1.0 (Govern, Map, Measure, Manage); EU AI Act Article 9 (risk management), Article 13 (transparency), Article 14 (human oversight), Article 17 (quality management); ISO/IEC 42001:2023 (AI management systems).

**Implementation contract.** Every AI inference function MUST be declared with `authority_class: Tier-3` in the Authority Ledger. Every AI output MUST be recorded as an OTG AI_ADVISORY entity with full input lineage before being presented to a user. Every AI advisory UI surface MUST display: the advisory recommendation, the confidence score, the input data sources (lineage), and a clear label identifying the output as AI-generated and requiring human review. Human accept/reject/ignore of every advisory MUST be recorded as an OTG event. No AI advisory may trigger a Tier-1 or Tier-2 SM transition directly.

**KPI.** AI authority breach rate: count of AI principal actions on BD-classified events = 0 (SLO-22, per M5). AI advisory lineage resolvability: >= 99.5% of advisories have complete PROV-DM input lineage (per C13/B5 §8). Human review rate: fraction of AI advisories that received explicit human accept/reject = reported per quarter for EU AI Act governance report.

**Failure modes.** AI_SERVICE_PRINCIPAL attempts Tier-1 action = axiom A-05 blocks at L5 + SEV-1 at L2 + CI failure at CI gate (triple defense). AI advisory presented without input lineage = FM-B5-05; SEV-2. AI model drift (output quality degrades) = detected by red-team quarterly review; model replacement via H7 Class A change.

**Testing discipline.** CI: static analysis verifies no AI command handler declares Tier-1 or Tier-2 authority class. Red-team: quarterly adversarial input test — craft inputs designed to push AI advisory toward a BD-classified recommendation; verify human oversight layer intercepts. Integration test: AI advisory event in OTG carries complete lineage; verify E8 endpoint resolves lineage.

**Per-pack overlay.** All packs: AI must never recommend or commit banned decisions specific to each pack (BD-9..BD-36 per pack extensions in L1 §3). PHARMA: EU AI Act high-risk AI system categorisation applies if AI is used in QC accept/reject decision support; full conformity assessment required before deployment.

---

## C16 — Cryptographic Agility

**Definition.** Cryptographic agility is the design property that allows HESEM to migrate from one cryptographic algorithm to another (e.g. from RSA to Ed25519, or from SHA-256 to SHA3-256, or from current algorithms to post-quantum alternatives) without breaking existing records, signature chains, or audit trails.

**Why it matters.** NIST SP 800-131A mandates algorithm transitions (e.g. SHA-1 deprecated). NIST is standardising post-quantum cryptography (CRYSTALS-Kyber for KEM, CRYSTALS-Dilithium for signatures per NIST SP 800-208 / FIPS 203/204). Quantum-capable adversaries could retroactively break current asymmetric signatures on regulated records. Designing for agility now prevents having to rewrite the entire signing infrastructure under time pressure.

**Locus in B1.** Algorithm governance lives at L1 (key management), L4 (signature construction), and L8 (algorithm approval list maintenance). The OTG axiom A-10 (SIGNATURE_ALGORITHM_APPROVED) enforces the algorithm list at L5.

**Intersections.**
- B2: Authority Ledger entries specify `signature_binding_hash_algorithm`; must be from the approved list.
- B3: OTG axiom A-10; E7 signature records carry `algorithm` and `key_id` fields.
- C3: E-signature algorithm is governed by C16; algorithm change for regulated signatures is a H7 Class A change.
- I7 §4: Security architecture for key management and algorithm governance.

**Standards.** NIST SP 800-131A Rev 2 (algorithm transitions); NIST SP 800-208 (hash-based signatures); FIPS 203 (CRYSTALS-Kyber; post-quantum KEM); FIPS 204 (CRYSTALS-Dilithium; post-quantum signatures); FIPS 140-3 (module validation).

**Implementation contract.** The `algorithm_approved_list` table in the platform database is the authoritative source. Approved algorithms are: Ed25519 (standard); ECDSA-P384 (FIPS 140-3 tenants; ITAR); SHA3-256 (hash chain). Deprecated algorithms (RSA-2048, SHA-1, SHA-256 for signature, ECDSA-P256) are in the `algorithm_deprecated_list`. OTG axiom A-10 checks the approved list at write time. Adding a new algorithm = H7 Class B change. Deprecating an algorithm = H7 Class A change (triggers migration job for existing records). Migration job re-signs affected records with the new algorithm; original signatures are retained as historical evidence; a COMPENSATED_BY edge links old and new signature records.

**KPI.** Algorithm coverage: fraction of active signatures using approved algorithms = 100%. Deprecated algorithm age: 0 signatures using deprecated algorithms after migration deadline. Source: daily A-10 reconciliation scan.

**Failure modes.** Deprecated algorithm in use post-deadline = SEV-2; migration job required. Algorithm migration job fails mid-flight = transaction rollback; affected records flagged for manual re-run. Post-quantum migration requires re-signing all historical signatures = planned migration; H7 Class A with 12-month notice period.

**Testing discipline.** CI: OTG axiom A-10 test — attempt to create a SIGNED_BY edge with a deprecated algorithm; assert rejection. Migration test: run algorithm migration job against a fixture dataset; verify all records migrated; verify historical signatures retained.

**Per-pack overlay.** AERO J3: ITAR-scoped records require ECDSA-P384 immediately (FIPS 140-3); no legacy algorithm tolerance. PHARMA J1: EU GMP Annex 11 §14 does not prescribe an algorithm; Ed25519 is accepted. All packs: PQC migration will be applied uniformly when FIPS 204 implementation is certified.

---

## C17 — Sustainability

**Definition.** Sustainability in HESEM covers two dimensions: operational cost efficiency (avoiding wasteful compute and storage) and environmental impact (carbon emissions from infrastructure). Both are tracked against targets in the K1 cost envelope and the I6 platform cost model.

**Why it matters.** Enterprise software that is architected without attention to compute efficiency generates unnecessary cloud spend and carbon emissions. ESG reporting requirements (EU CSRD; SEC climate disclosure rules) increasingly require software operators to account for digital infrastructure carbon footprint. The K1 cost envelope defines what per-tenant, per-transaction cost is acceptable; overrunning it degrades unit economics.

**Locus in B1.** Sustainability is an L8 (Platform / SRE) and L4/L5 (compute efficiency) concern. L8 owns the cost monitoring dashboard; L4/L5 owns query and compute efficiency.

**Intersections.**
- I6: Platform cost model — per-tenant, per-transaction infrastructure cost targets.
- K1: Cost envelope per release wave; sustainability gate in wave progression.
- C9: Observability metrics include CPU time, memory, and Postgres I/O per endpoint — the raw data for cost attribution.

**Standards.** GHG Protocol Scope 3 (cloud infrastructure emissions); Green Software Foundation Software Carbon Intensity (SCI) metric; EU CSRD (Corporate Sustainability Reporting Directive) digital infrastructure reporting.

**Implementation contract.** Every new L4 service method added to the platform MUST include a benchmark showing its per-request CPU and memory footprint against the K1 budget. Database query EXPLAIN ANALYZE plans that generate > 10,000 heap blocks read per query are flagged in code review. Cold storage tiering (B5 §2.3 telemetry warm/cold) and Postgres partition drops (after WORM export) are mandatory — retaining unnecessary data in hot storage is a sustainability violation. The L8 cost dashboard is reviewed monthly by the Engineering Lead.

**KPI.** Carbon intensity: SCI (Software Carbon Intensity) score per 1,000 API requests, trending downward quarter-over-quarter (no absolute target at V10; baseline to be established). Cost per transaction: per K1 budget; reported monthly. Source: I6 cost model + cloud provider billing API + GHG emission factor API.

**Failure modes.** K1 budget exceeded by > 20% = SEV-3 cost review; engineering team identifies and eliminates waste. Unexpected storage growth (retention policy misconfiguration retaining excess data) = SEV-3 investigation; delete-eligible data purged per H5 after legal review.

**Testing discipline.** CI: benchmark regression check per L4 method. Monthly: L8 cost review against K1 envelope. Annual: third-party SCI calculation for ESG reporting.

**Per-pack overlay.** No pack-specific variations in sustainability targets. All packs share the same SCI baseline. AERO: ITAR data residency in US-only region may limit ability to use lower-carbon cloud regions; documented trade-off in the platform sustainability report.

---

## §18 Cross-References

- **B1:** Each concern's locus in B1 documented per concern above; concerns live at specific layers, not all layers.
- **B2 + B3:** Authority Ledger (B2) and OTG (B3) are the substrate for C1, C2, C3, C5, and C15.
- **H1 §4:** C1 implements 21 CFR 11.10(b)(c)(e); C3 implements 11.50/11.70; C5 implements GDPR Art 32; C10 implements 11.10(c) and Annex 11 §17.
- **H4:** Evidence class EC-2 (C3 signature), EC-16 (change), EC-22 (access_audit) appear in every concern's KPI.
- **H5:** Retention floors per data class are the source of C10 implementation; C13 erasure conflict with C10 resolved per H5 §6.
- **H7:** Algorithm changes (C16) = Class A; predicate catalog changes (C2) = Class A; adding a concern = Class A architectural change requiring Compliance sign-off.
- **I2:** Observability architecture (C9) is specified in I2; C9 here defines the platform-wide contract that I2 implements.
- **I7:** Cryptographic controls (C16), PII architecture (C13), and authentication controls (C4) are implemented in I7.
- **L1:** Banned decisions (L1 §1) are the input to C15 governance; L1 §4 triple-defense is implemented via C15 + C2.
- **L4:** AI red-team (L4) is the testing discipline for C15.
- **M5:** SLO directory is the authoritative source of KPI targets cited in C1, C6, C9, C14; concerns may not define SLO targets independently of M5.

---

```
S1-05_B6_CROSS_CUTTING_DEEP_UPGRADE_COMPLETE
```
