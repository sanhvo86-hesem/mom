# E3 — Workflow API

```
api_family:     Workflow & Command Bus
owner_role:     Workflow Lead (Platform Lead)
scope:          Command submission; state-machine introspection;
                transition history; guard preview; saga compensation;
                event subscription; per-domain workflow extensions
sources:        AsyncAPI 3.0, OpenAPI 3.1.1, RFC 9457, Saga / TCC
                patterns, Outbox + CDC patterns, idempotency-key
                draft (IETF), event-sourcing best practice
```

The Workflow API is where every authoritative mutation in HESEM is
expressed. Every D-workflow (D1..D14) calls into this API; every
regulated decision flows through here; every saga begins or
compensates here. The API is intentionally small (one mutation
shape) but expressive (every regulated transition).

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Command submission per state machine   record-level reads (E4)
State-machine introspection             workspace projection (E5)
Transition history (audit-friendly)     audit chain anchoring (B6 C1)
Guard preview                            authority decision (E2.8)
Saga compensation (admin-initiated)     e-signature flow (E7)
Event subscription (webhook + Async)    notification dispatch (E10)
Per-tenant workflow extensions
Per-pack overlays
Idempotency + concurrency control
Bulk command (per E11) entry point
Long-running operation (per E13) entry
 point
```

---

## 2. Endpoint inventory

### 2.1 Submit command

```
PATH                              POST /v1/workflow/command
PURPOSE                            submit typed command per state-
                                  machine transition
AUDIENCE                            UI clients (post user action);
                                  service principals (CDC-driven);
                                  AI advisory consumers (subject
                                  to L1 banned-decision)
REQUEST ENVELOPE
  actor                             identity (per E1) + role
                                  + AAL
  tenant_id                         from JWT (cannot override)
  target_root                       root_kind + root_id
  target_record                      where applicable
  command_type                       per state-machine transition
                                  catalog
  intended_meaning                   per regulated decision: reason
                                  text (≥ N chars per quorum)
  payload                            per command schema (JSON
                                  Schema 2020-12)
  evidence_refs                      per H4 evidence already
                                  captured (e.g., inspection
                                  result before disposition)
  signature_envelope                  if regulated: ref to E7
                                  signature record (with
                                  bindings)
  surface_context                      surface class (per Part F),
                                  route, IP, user-agent, language
  correlation_id                       trace across sub-operations
  idempotency_key                       ULID; per E0 §idempotency
  if_match                              ETag of target record
                                  (mandatory for non-create)
SUCCESS RESPONSE                      transition_result:
                                  new_state, new_etag, audit_event
                                  id, signature_record id (if
                                  applic), evidence_emitted list,
                                  saga_id (if part of saga)
ERROR (RFC 9457)                       per §6 + 5xx infra
IDEMPOTENCY                              required; replay returns
                                       same result
CONCURRENCY                              ETag If-Match required
                                       for non-create
SLO                                       SLO-3 p95 < 500ms
EVIDENCE EMIT                              transaction (EC-4) +
                                       per-cascade evidence per
                                       state-machine
RATE LIMIT                                  per identity + per tenant +
                                       per command-type
DEPRECATION                                per E0 deprecation policy;
                                       command-type retirement is
                                       H7 Class A change
```

### 2.2 State-machine introspection

```
PATH                              GET /v1/workflow/sm/{sm_id}
PURPOSE                            return state-machine definition
                                  (states, transitions, guards,
                                  obligations, emits)
AUDIENCE                            UI workflow visualization;
                                  audit pack assembly;
                                  validation tooling
RESPONSE                             SM definition with version +
                                  effectivity + cross-references
                                  (couplings per M4)
RATE LIMIT                            high; cached per SM-version
CACHE                                  L1 cache 5min TTL
EVIDENCE EMIT                            access_audit on access
                                  (low priority)
```

### 2.3 Transition history (per record)

```
PATH                              GET /v1/workflow/history/
                                  {root_kind}/{root_id}
PURPOSE                            return transition history for a
                                  record (audit-friendly)
AUDIENCE                            record-shell UI (per F5);
                                  audit pack assembly;
                                  inspector portal (per H3 §7)
RESPONSE                             time-ordered events with:
                                  state-from, state-to, event,
                                  actor, evidence-refs, signatures,
                                  saga-id (where applic),
                                  audit-anchor reference
PAGINATION                            cursor-based
RATE LIMIT                            medium
EVIDENCE EMIT                            access_audit on auditor query;
                                  sampled on internal user
```

### 2.4 Guard preview

```
PATH                              POST /v1/workflow/preview
PURPOSE                            evaluate guards against a candidate
                                  command without executing
AUDIENCE                            UI clients (to disable buttons
                                  that would fail);
                                  investigation tools
REQUEST                              command envelope (same shape
                                  as 2.1; without idempotency)
RESPONSE                              would_pass (true / false);
                                  if false: per-guard reason list;
                                  proposed remediation text
                                  (machine-readable + human-readable)
RATE LIMIT                            very high; per-action;
                                  cacheable per identity ×
                                  command-shape (short TTL)
EVIDENCE EMIT                            none (read-only)
SPECIAL                                  banned-decision check is
                                       evaluated here too;
                                       AI-principal call returns
                                       false with banned_decision
                                       reason (per L1)
```

### 2.5 Saga compensation initiation

```
PATH                              POST /v1/workflow/saga/{saga_id}/
                                  compensate
PURPOSE                            initiate compensation of a
                                  previously committed saga
AUDIENCE                            operations team handling
                                  exceptional rollback (per H7
                                  + I3 + per emergency channel)
PRECONDITIONS                       saga in compensable state
                                  (not all steps terminal-
                                  irreversible);
                                  H7 emergency CR or compensation-
                                  per-recovery (per RB-INC);
                                  multi-sig per regulated impact
RESPONSE                             compensation_run_id;
                                  per-step status
EVIDENCE EMIT                          saga_compensation (EC-5 +
                                  EC-2 multi-sig)
SLO                                    not bound by SLO-3 (admin
                                  path); per-incident
RATE LIMIT                              very low (admin)
```

### 2.6 Workflow event subscription

```
PATH                              POST /v1/workflow/subscriptions
                                  GET  /v1/workflow/subscriptions
                                  DELETE /v1/workflow/subscriptions/
                                  {sub_id}
PURPOSE                            subscribe / list / unsubscribe
                                  to workflow events
AUDIENCE                            external systems reacting to
                                  HESEM events (CDC consumers,
                                  partner integrations,
                                  customer-side BI)
REQUEST                              subscription envelope: scope
                                  (tenant + resource family +
                                  state-machine + event types),
                                  delivery (webhook URL with
                                  authentication; AsyncAPI
                                  channel; CloudEvents 1.0
                                  compliant); retry policy;
                                  filter expression
EVIDENCE EMIT                          subscription_record (EC-4 +
                                  EC-22)
SLO                                    per delivery: at-least-once
                                  with retry; consumer must be
                                  idempotent
RETRY                                   exponential backoff;
                                  dead-letter after N failed
                                  deliveries
EVIDENCE                                outbound delivery_event
                                  (EC-22)
```

### 2.7 Bulk command + Long-running entry

```
PATH                              per E11 (bulk) and E13 (LRO)
                                  but registered through this API
                                  family
SPECIAL                              command of type "bulk" routes
                                  to E11; command of type
                                  "long-running" routes to E13;
                                  same entry shape; different
                                  underlying processing semantic
```

### 2.8 Per-tenant workflow extensions

```
PATH                              POST /v1/workflow/extensions
                                  (admin / governance)
PURPOSE                            register per-tenant workflow
                                  extension (e.g., extra signoff
                                  step per CSR; pack-specific
                                  branch)
AUDIENCE                            tenant admin + Compliance Lead
PRECONDITIONS                       H7 Class A or B change;
                                  Compliance Lead signoff;
                                  cannot weaken regulator floor
                                  (per L1 §9)
EVIDENCE EMIT                          extension_record (EC-16 +
                                  EC-2)
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated; per E1
2.1 SUBMIT                       per-command authorization via
                                E2.8 (decide); banned-decision
                                routing per L1; AAL-step-up
                                where regulated
2.4 PREVIEW                       same authorization as submit
                                (preview shouldn't reveal
                                allow/deny pattern beyond user
                                scope)
2.5 SAGA                          admin role + emergency-CR ref
2.6 SUBSCRIPTION                  scope per tenant; cannot
                                subscribe across tenants;
                                webhook URL validated against
                                allow-list (security)
2.8 EXTENSIONS                    tenant admin + Compliance Lead
```

---

## 4. Idempotency + concurrency

```
2.1 SUBMIT
  Idempotency-Key                  required (ULID; per E0)
  Replay                           same key + same body → return
                                  cached result; same key + diff
                                  body → 422 idempotency_conflict
  ETag (If-Match)                   required for non-create;
                                  mismatch → 409 version_conflict
2.4 PREVIEW                          read-only; no idempotency
2.5 SAGA                              idempotency required
2.6 SUBSCRIPTION                       idempotency on creation;
                                  subscription is itself
                                  authoritative root
2.8 EXTENSIONS                        idempotency required
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        every error; per error class;
                                 per-tenant detail; correlation
                                 id linked to trace
OPENAPI 3.1.1                       command-type registry per
                                 state-machine; spec governed per
                                 H7
ASYNCAPI 3.0                        per 2.6 subscription channels
OBSERVABILITY                       per-command trace + metrics +
                                 logs; per-tenant cardinality;
                                 per-command-type SLI
AUDIT CHAIN                          every successful command emits
                                 transaction; daily anchor (B6
                                 C1)
TENANT BOUNDARY (B6 C5)              cross-tenant submit forbidden;
                                 attempt = SEV-1
SIGNATURE BINDING (per 21 CFR        ref captured at submit;
   11.70 / Annex 11 §14)            verified before commit;
                                 broken-binding rejects command
EVIDENCE COMPOSITION (per H4 §3)     required evidence verified
                                 before commit; missing class →
                                 422 evidence_incomplete
DEPRECATION                            per E0 + E2 §5
RATE LIMITING                            per OWASP API4; per-route +
                                 per-tenant + per-identity
RETRIES                                  read paths safe; write paths
                                 require idempotency-key
PII REDACTION                            per I7 §9
```

---

## 6. Failure-mode catalog (RFC 9457 type-URIs)

```
TYPE                                 STATUS  MEANING
workflow/transition-not-permitted    422     state machine forbids
workflow/guard-failure                422     one or more guards failed
                                            (per-guard reason)
workflow/invariant-violation         422     domain invariant
                                            (per B6 OTG axiom)
esign/factor-required                  401     e-signature obligation
                                            unmet
esign/binding-broken                   422     binding to record-state
                                            mismatch
esign/quorum-incomplete                422     per L1 quorum unmet
concurrency/version-conflict          409     ETag mismatch
idempotency/replay-mismatch           422     idempotency-key conflict
ai/banned-decision-attempted          403     L1 BD-N triple defense
tenant/boundary-violation              403     cross-tenant attempt
                                            (BD-equivalent SEV-1)
authority/forbidden-role              403     RBAC / ABAC denial
authority/aal-step-up-required        401     NIST 800-63 elevation
                                            needed
evidence/incomplete                    422     required H4 class missing
saga/compensation-not-permitted        409     saga in non-compensable
                                            state
subscription/quota-exceeded             429     per tenant + per scope
extension/below-floor                   422     tenant attempted to
                                            relax regulator floor
                                            (per L1 §9)
deprecation/sunset                       410     command-type sunset
                                            past window
maintenance/unavailable                  503     planned window
                                            (per I1)
```

---

## 7. SLO + budget

```
2.1 submit p95                    SLO-3 < 500ms
2.1 submit p99                    SLO-3 < 1200ms
2.1 error rate                    SLO-9 < 0.1%
2.2 introspect p95                  < 100ms
2.3 history p95                      < 200ms
2.4 preview p95                       < 200ms
2.5 saga                                admin path; not bound
2.6 subscription delivery               at-least-once with retry
                                       SLA per partner contract
```

---

## 8. Wave target

```
W0.5      L4 read endpoints (2.2, 2.3, 2.4) test environment
W3        L5 read endpoints production
W4        L5 2.6 subscription
W5        L5 2.1 submit (Stage 3 mutation graduation per
          ADR-0005)
W6        L6 regulated submit (2.1 + 2.5); audit chain
          anchored
W7        AI principal calls 2.4 preview + 2.1 submit (subject
          to L1 banned-decision boundary)
W8        SOC 2 + DORA Elite metrics for write path
W10       per-pack workflow extensions (2.8) per J1..J5
W12       sovereign region variant
```

---

## 9. Per-domain workflow extensions

```
PER PART_C DOMAIN                each domain registers its
                                 state-machines + command catalog
                                 (per M4)
PER PART_J PACK                   pack-specific extensions;
                                 e.g. Pharma SM-DEV; Auto SM-PPAP;
                                 Aero SM-FAI; MD SM-VIG;
                                 Food SM-CCP-MONITOR
PER TENANT (CSR overlay)          per H1 §7 + L1 §9; signed extra
                                 signoff steps within regulator
                                 floor
PER REGULATED CHANGE              extension addition is H7 Class A;
                                 deletion likewise
```

---

## 10. Failure modes (operational)

```
FM1   Idempotency key collision (different body)
      Behavior: 422 idempotency_conflict
      Recovery: client uses unique key per logical
              operation; per E0

FM2   ETag mismatch (concurrent edit)
      Behavior: 409 version_conflict; latest version
      returned
      Recovery: refresh + re-decide

FM3   Signature session expires mid-flow
      Behavior: 401 esign/factor-required
      Recovery: per E7 re-auth

FM4   Cross-tenant attempt
      Behavior: 403 tenant/boundary-violation
      Recovery: SEV-1; investigation; H8 systemic;
              regulator notification per H1 §3

FM5   AI banned-decision attempt
      Behavior: 403 ai/banned-decision-attempted; logged
      Recovery: per L1 §4 triple defense; SEV-1 if
              pattern

FM6   Saga compensation impossible (terminal step)
      Behavior: 409 saga/compensation-not-permitted
      Recovery: per H7 emergency CR; manual recovery
              (per RB-INC); regulator awareness if
              regulated impact

FM7   Subscription delivery failure persistent
      Behavior: dead-letter queue
      Recovery: notify subscriber owner; pause subscription;
              per partner relationship review

FM8   Workflow extension below floor
      Behavior: 422 extension/below-floor
      Recovery: per L1 §9 enforcement; tenant comm

FM9   Evidence incomplete (composition gate)
      Behavior: 422 evidence/incomplete
      Recovery: capture missing class then retry

FM10  AAL step-up loop
      Behavior: per E1 + E7; user step-up; re-submit
      Recovery: session refresh
```

---

## 11. Roles and authority (RACI)

```
ENDPOINT             PLAT  DOM  COMP  SEC  AI  CALLER  TENANT
2.1 submit           A     R    C     -    -   R       R
                                                       (per role
                                                        + per pack)
2.2 introspect       A     R    -     -    -   R       R
2.3 history          A     R    R     -    -   R       R
                                                       (auditor)
2.4 preview          A     R    -     -    R   R       R
2.5 saga compensate  A     A    A     C    -   -       -
2.6 subscription     A     R    -     A    -   R       R
                                            (sec
                                            review)
2.8 extension        A     R    A     -    -   -       A
```

---

## 12. Cross-references

- B2 + B7 — Workflow Command Bus + state machines
- B6 — OTG axiom enforcement at commit
- B8 — CDC outbound for subscription
- D1..D14 — every D-workflow uses E3
- E0 — API conventions
- E1 — Identity / session
- E2 — Authority decision (E2.8)
- E4 — Record API consumed by command payload references
- E5 — Workspace projection consumes events
- E6 — Audit chain (transaction + history)
- E7 — E-signature flow
- E8 — Evidence composition gate
- E10 — Notification dispatch on transition
- E11 — Bulk command entry
- E13 — Long-running operation entry
- E15 — Integration outbound
- H4 — transaction (EC-4); saga (EC-5); access_audit (EC-22)
- L1 — banned-decision routing
- L2 — AI advisory features integrate via 2.4 + 2.1
- M4 — state-machine directory
- M5 — SLO-3 + SLO-9

---

## 13. Decision phrase

```
E3_WORKFLOW_API_BASELINE_LOCKED
NEXT: E4_RECORD_API_PER_DOMAIN.md
```
