# B6 — Cross-Cutting Concerns (the 12 concerns)

This chapter describes the 12 concerns that are not layers themselves
but thread vertically through every layer of HESEM. Each concern has its
own discipline, its own owner, its own evidence requirements, and its own
failure mode. Without these cross-cutting concerns operating correctly,
HESEM cannot meet its regulatory, security, performance, or accessibility
commitments.

---

## 1. The 12 concerns

```
C1   Audit Chain               (every mutation hash-chained, daily anchored)
C2   Electronic Signature       (21 CFR Part 11 e-sign captured per regulated transition)
C3   Internationalization (i18n)/Localization (l10n) (per-locale formatting and content)
C4   Tenant Isolation           (every record scoped; double-walled enforcement)
C5   Idempotency                (every mutation idempotent; replay-safe)
C6   Optimistic Concurrency     (every mutation guarded by ETag/If-Match)
C7   Problem Details (RFC 9457) (every error in standardized envelope)
C8   Observability              (every layer emits OpenTelemetry traces, metrics, logs)
C9   Performance Budget         (every route has p50/p95/p99 latency budget)
C10  Retention & WORM           (every record class has retention policy and WORM where regulated)
C11  AI Advisory Governance     (every AI feature governed by NIST AI RMF)
C12  Accessibility (WCAG 2.2 AA) (every UI surface meets accessibility standards)
```

Each concern is described in its own section below.

---

## 2. C1 — Audit Chain

**Purpose.** Every mutation in HESEM produces a hash-chained, daily-
anchored audit event. This is the substrate of regulated trust. A
regulator should be able to verify that no audit event has been tampered
with since its creation.

**Owner.** Compliance Lead with Security Lead.

**Discipline.**
- Every committed mutation produces an audit event with: actor identity,
  action verb, target root and record, before-state hash, after-state
  hash, reason for change (if regulated), correlation identifier,
  timestamp, and chain link to prior audit event.
- The chain is a SHA-256 hash chain. Each event's chain hash is
  hash(prev_chain_hash || payload_hash || timestamp || principal_id).
- Daily at a fixed UTC time (typically 00:30 UTC), a Merkle root is
  computed over all audit events from the prior day, signed with the
  platform's signing key, and stored in the audit_chain_anchor table.
- For regulated tenants, the daily Merkle root is optionally also
  submitted to an external timestamping authority (RFC 3161) to provide
  third-party non-repudiation.
- Audit events are stored in WORM media (S3 Object Lock).
- The chain is verified weekly by an integrity job (sample 1% of audit
  events; recompute their chain hashes; compare).

**Failure mode.** A chain break (any audit event whose recomputed hash
does not match the stored hash) is a SEV-0 incident. The program halts
(STOP-1) until the cause is investigated and resolved.

---

## 3. C2 — Electronic Signature

**Purpose.** Every regulated mutation captures e-signature evidence per
21 CFR Part 11 §11.50 and §11.70 (FDA) and EU GMP Annex 11 (EMA).

**Owner.** Compliance Lead.

**Discipline.**
- Every regulated transition declares an e-signature obligation as part
  of its Authority Ledger entry: required, factor count, number of
  signers, factors per signer (password, TOTP, U2F, HSM smart card,
  biometric).
- When the user submits the mutation, the UI prompts for signatures.
  Each signer authenticates with the required factors within a 5-minute
  time window.
- The captured signature includes: signer's printed name (snapshot at
  signing time, not pulled from current user record), signature meaning
  (e.g., "approval", "disposition", "release"), datetime, factor records,
  and the canonical state hash of the signed record.
- The signature is included in the audit event for the mutation, hashed
  into the chain (cannot be excised).
- For pharma regulated transitions (BREL approve_release, CAPA close,
  ECO approve), the obligation is two-person e-signature with two
  distinct principals.

**Failure mode.** Missing or incomplete e-signature for a regulated
transition returns HTTP 401 with problem-detail "esign/factor-required"
or "esign/two-person-required". The mutation is not committed.

---

## 4. C3 — Internationalization (i18n) and Localization (l10n)

**Purpose.** HESEM supports multiple locales for user-facing text, dates,
numbers, currencies, and culturally-specific content. Vietnamese is the
home market locale; English is the technical default; additional locales
are added per customer demand.

**Owner.** Frontend Lead with Localization Lead (when one exists).

**Discipline.**
- All user-facing text uses ICU MessageFormat 2 (or compatible
  international message format) for parameterization, plural, gender,
  and date formats.
- Locale data comes from CLDR (Unicode Common Locale Data Repository).
- Time zone data comes from the IANA tz database.
- Locale is communicated via HTTP Accept-Language header and persisted
  in the user's preference.
- Date and time formatting is locale-aware.
- Number formatting (decimal separator, thousands separator) is
  locale-aware.
- Currency formatting respects locale and customer-declared currency.
- Right-to-left layouts (Arabic, Hebrew) are deferred to Wave 10 unless
  customer demand emerges sooner.

**Baseline locales for V9**:
- en-US (English, US)
- vi-VN (Vietnamese)
- ja-JP (Japanese)
- zh-CN (Chinese, simplified)
- ko-KR (Korean)
- de-DE (German)
- es-ES (Spanish)
- fr-FR (French)

Additional locales added per customer engagement.

**Failure mode.** Missing locale resource falls back to en-US with an
aria-live announcement. Missing date format falls back to ISO 8601.
Missing number format falls back to en-US conventions.

---

## 5. C4 — Tenant Isolation

**Purpose.** Every customer's data is isolated from every other
customer's data. Cross-tenant data leak is a STOP-3 program halt.

**Owner.** Security Lead with Platform Lead.

**Discipline.**
- Every record (every authoritative root row, every OTG node, every
  evidence artifact, every audit event) has a tenant_id column.
- Middleware sets the application's tenant context based on the JWT
  claim on every request.
- Row-level security policies on every relevant database table enforce
  that queries see only the current tenant's rows.
- The CI pipeline includes a query-plan audit step that rejects any
  plan that scans rows from multiple tenants in a non-aggregate join.
- A periodic fuzzing test attempts cross-tenant access via various
  vectors and verifies all are rejected.
- Multi-tenant search uses per-tenant indices (or per-tenant aliases on
  shared indices with strict filter policies).

**Failure mode.** Detection of any cross-tenant access reaching production
is a SEV-0 incident (program halt under STOP-3). Detection in staging is
a SEV-1 incident with mandatory remediation before further deploys.

---

## 6. C5 — Idempotency

**Purpose.** Every mutation is replay-safe. A client retrying a request
must not cause two mutations.

**Owner.** API Lead with Backend Lead.

**Discipline.**
- Every mutation route requires an Idempotency-Key header.
- Server-side replay store: key, tenant, principal, request hash,
  response status, response body, expiration timestamp.
- Replay window: 24 hours by default.
- Behavior:
  - First request with key: execute, store response, return.
  - Replay with same key + same hash: return stored response, do not
    re-execute.
  - Replay with same key + different hash: return HTTP 409 with
    problem-detail "idempotency/replay-mismatch."
  - Replay beyond 24 hours: treat as new request.

**Failure mode.** Missing Idempotency-Key on a mutation returns HTTP 400
with problem-detail "idempotency/required". The mutation is not executed.

---

## 7. C6 — Optimistic Concurrency

**Purpose.** Two clients cannot accidentally overwrite each other's
changes.

**Owner.** Backend Lead.

**Discipline.**
- Every authoritative record has a version column (incremented on every
  mutation).
- Every read response includes an ETag (typically a weak validator
  derived from a canonical hash of the record state).
- Every mutation request includes an If-Match header with the ETag the
  client believes they are mutating.
- Server compares: if mismatch, returns HTTP 412 with problem-detail
  "concurrency/version-conflict"; if missing, returns HTTP 428 with
  problem-detail "concurrency/precondition-required".

**Failure mode.** Mismatched If-Match returns 412. Client must refetch
and retry.

---

## 8. C7 — Problem Details (RFC 9457)

**Purpose.** Every error response uses the RFC 9457 envelope. There are
no ad-hoc error formats anywhere in HESEM.

**Owner.** API Lead.

**Discipline.**
- The problem registry contains 62 problem types organized in 17
  categories (auth, policy, workflow, concurrency, idempotency,
  validation, esign, tenant, rate-limit, retention, audit, integrity,
  projection, server, contract, ai, upload, ot).
- Each type has a stable URI, HTTP status code, localizable title key,
  localizable detail template, retry policy, and client handling
  guidance.
- Type URIs are versioned namespaces; semantic changes require new URIs.
- The middleware ensures every response with status >= 400 carries an
  RFC 9457 envelope.
- Validation in CI: every error path tested produces a registered type.

**Failure mode.** Detection of an error response not in RFC 9457 format
fails the CI build. Schema drift between declared and observed problem
types fails CI.

---

## 9. C8 — Observability

**Purpose.** Every layer emits OpenTelemetry-conformant traces, metrics,
and logs. Without this, HESEM cannot meet DORA Elite-tier reliability or
debug production incidents efficiently.

**Owner.** SRE Lead.

**Discipline.**
- Every service initializes the OpenTelemetry SDK at startup.
- Resource attributes include service.name, service.version,
  deployment.environment, and HESEM-specific attributes
  (hesem.tenant.id, hesem.principal.id, hesem.workflow.machine,
  hesem.workflow.transition_id, hesem.resource_family,
  hesem.authority_class).
- W3C Trace Context (traceparent + tracestate) is propagated across
  service boundaries.
- W3C Baggage carries tenant.id, principal.id, request.id.
- Required spans per layer are described in B1.
- Sampling: head-based 5% by default; 100% on error spans.
- All telemetry routes through OpenTelemetry Collector before reaching
  the storage backends (Tempo or Jaeger for traces, Prometheus for
  metrics, Loki or ELK for logs).

**Failure mode.** Telemetry collector down: services buffer locally for
up to 5 minutes; metrics degraded warning. Prometheus down: alerts go
blind; on-call paged via secondary path (PagerDuty heartbeat).

---

## 10. C9 — Performance Budget

**Purpose.** Every route has a published latency budget (p50, p95, p99).
Without budgets, performance degrades silently over time.

**Owner.** SRE Lead with API Lead.

**Discipline.**
- Per-route p95 latency budget (typical):
  - Read routes: p95 < 200 ms; p99 < 1 s.
  - Mutation routes: p95 < 500 ms; p99 < 2 s.
  - Heavy routes (genealogy, full DSAR, audit pack export): p95 < 2 s; p99 < 10 s.
- Per-route Service Level Objective with multi-window burn-rate alerts
  (fast burn at 5 min: critical; slow burn at 1 hour: warning).
- Continuous load testing in staging before production deploy.
- Per-tenant performance attribution to detect noisy-neighbor problems.

**Failure mode.** Per-route SLO breach triggers an alert. Sustained
breach (over a configured window) triggers an incident.

---

## 11. C10 — Retention & WORM

**Purpose.** Every record class has a defined retention policy. Regulated
records are stored in WORM media.

**Owner.** Compliance Lead.

**Discipline.**
- Per record class retention policy declared in the retention registry
  (per the table in B5 §8).
- Evidence artifacts and audit events stored in S3 Object Lock or
  equivalent WORM storage.
- Retention enforcement job runs daily: identifies records past
  retention; for non-WORM records, optionally tombstones them; for WORM
  records, tracks expiration but does not delete.
- Right-to-erasure (GDPR) requests on regulated records: pseudonymize
  PII; retain regulated portion until retention expires; communicate
  retention expiry to subject.
- Per-vertical retention overrides (e.g., pharma batch records 1 year
  past expiration date per 21 CFR 211.180; medical device DHF 2 years
  past last manufacture per 21 CFR 820.180).

**Failure mode.** Retention policy violation (e.g., evidence artifact
deleted before retention expiry) is a SEV-1 incident. WORM lock failure
(S3 Object Lock not engaged) is STOP-4 program halt.

---

## 12. C11 — AI Advisory Governance

**Purpose.** Every AI feature is governed by NIST AI RMF and the EU AI
Act. AI never commits the eight banned regulated decisions.

**Owner.** AI Lead with Compliance Lead.

**Discipline.**
- Every AI feature has a NIST AI RMF risk profile (tier 1 minimal,
  tier 2 limited, tier 3 high).
- Every AI feature has a model card describing training data, evaluation
  metrics, bias audit, intended use, and out-of-scope uses.
- Every AI advisory call produces an AI Decision Record with input
  references, output, confidence, abstain flag, model name + version,
  training timestamp, and (when human acts on it) override capture.
- The eight banned regulated decisions (per V3 RULE-2 and PART_L) are
  enforced at compile time (CI test), at runtime (middleware), and
  offline (axiom A7 nightly check).
- Quarterly red-team protocol per AI feature in production.

**Failure mode.** AI feature performance degradation (acceptance rate
outside 30-95% band) triggers review. Detected RULE-2 violation is
SEV-0 program halt (STOP-2).

---

## 13. C12 — Accessibility (WCAG 2.2 AA)

**Purpose.** Every UI surface meets WCAG 2.2 Level AA accessibility
standards. This is legally required in the EU and Canada and de-facto
required in the US for B2B software.

**Owner.** Frontend Lead.

**Discipline.**
- Semantic HTML (proper heading hierarchy, landmarks, lists).
- ARIA roles and labels where semantic HTML is insufficient.
- Keyboard navigation: full coverage with logical focus order.
- Focus visible (visible focus indicator on all interactive elements).
- Color contrast: 4.5:1 for body text; 3:1 for large text (18px+).
- Alt text on every image; transcripts for audio and video content.
- Error messages: descriptive, linked to the field, not color-only.
- Form labels associated correctly with inputs.
- Skip-to-content links for repetitive header content.
- Responsive: keyboard-usable at all viewports.
- Reduced motion: respect prefers-reduced-motion.
- Screen reader testing: NVDA, JAWS, VoiceOver per release.
- axe-core continuous integration gate; threshold: zero serious + zero
  critical violations.
- Annual third-party accessibility audit.

**Failure mode.** Serious or critical axe-core violation in CI fails the
build. Manual screen-reader regression triggers SEV-2 incident.

---

## 14. The 8 layers × 12 concerns matrix

Each cell of the 8×12 matrix is either populated (the concern applies to
the layer) or empty (the concern does not apply). The populated cells are
where evidence is captured per slice graduation. The Slice Maturity Cube
in PART_C refers to this matrix.

```
                L1   L2   L3   L4   L5   L6   L7   L8
C1 Audit Chain   •    •    •    •    •    •    •    •
C2 E-Signature   •    •    •    .    .    •    .    .
C3 i18n/l10n     .    .    .    •    •    •    •    .
C4 Tenant Iso    •    .    .    •    •    .    •    .
C5 Idempotency   .    .    •    .    .    .    •    .
C6 Concurrency   .    .    .    •    .    .    •    .
C7 Problem Det.  .    .    •    .    .    .    •    .
C8 Observability •    •    •    •    •    •    •    •
C9 Perf Budget   .    .    .    •    •    •    •    •
C10 Retention    .    •    .    •    •    .    .    .
C11 AI Adv. Gov  .    •    •    .    .    •    .    .
C12 Accessibility .   .    .    .    .    •    .    .
```

A populated cell means a slice that touches that layer must produce
evidence for that concern. A slice failing to produce evidence at any
populated cell that the slice touches fails its wave gate.

---

## 15. Decision phrase

```
B6_CROSS_CUTTING_CONCERNS_BASELINE_LOCKED
NEXT: B7_DEPLOYMENT_TOPOLOGY.md
```
