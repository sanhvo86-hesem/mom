# E2 — Authority API

```
api_family:     Authority Ledger
owner_role:     Platform Lead
scope:          Read + governed write of Authority Ledger entries;
                authorization-decision support; per-action allow-list
                lookup; per-decision quorum policy; admin governance
                lifecycle
sources:        OWASP API Top 10, OAuth 2.0 + OIDC, NIST SP 800-162
                ABAC, NIST SP 800-63 IAL/AAL, Casbin / Open Policy
                Agent patterns, RFC 9457, OpenAPI 3.1.1
```

The Authority API is the mediator between identity (per E1) and
action. Every command on the Workflow Command Bus passes an
authority check; every UI button-enable check goes through this
API; every audit pack documents authority chains read here. The
Authority Ledger (per B2) is the substrate.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Authority entry CRUD (governed)        identity issuance (E1)
Active-entry lookup per root           session management (E1)
Authority-decision API for Command     RBAC role authoring tool (E14
  Bus + UI                             admin)
History lookup (regulator + audit)     workflow execution (E3)
Entry validation (integrity)           record persistence (E4)
Quorum policy lookup (per BD)          audit chain anchor (E6)
Per-tenant authority configuration
Cross-tenant lookup (system-only;
 forbidden for tenant)
Banned-decision routing (per L1)
```

---

## 2. Endpoint inventory

### 2.1 Active-entry lookup

```
PATH (canonical, OpenAPI 3.1.1)
  GET /v1/authority/entry/{root_code}
PURPOSE                          return active Authority Ledger
                                 entry for root in current tenant
AUDIENCE                          Command Bus (every mutation);
                                 UI button-enable; audit pack
INPUT                              tenant scope (per JWT);
                                 root_code path param
RESPONSE                            entry metadata: scope, allow-
                                 list of actions, quorum policy,
                                 state-machine reference,
                                 banned-decision flag (L1),
                                 effective period, signature,
                                 last-supersession-reference,
                                 entry-version, axiom-status
                                 hash
ERRORS                              401 unauth; 403 not-in-tenant;
                                 404 unknown root; 422 malformed;
                                 503 signature_unverified;
                                 410 superseded (rare; explicit
                                 historical query)
IDEMPOTENCY                         read-only; cacheable
RATE LIMIT                          high (cached); per-tenant burst
                                 + sustained
CACHE                               L1 / cache 60s; cache-key per
                                 tenant + root_code + entry-version
PROBLEM DETAIL FORMAT (RFC 9457)    type / title / status / detail /
                                 instance / cause + tenant-id +
                                 entry-version
EVIDENCE EMIT                        access_audit (EC-22) for write-
                                 path callers; sampled for read-
                                 path
SLO                                  per SLO-2 (policy directive
                                 availability) + per SLO-1 (auth
                                 decide latency proxy)
```

### 2.2 Active-entry list

```
PATH                              GET /v1/authority/entry?filter=
                                  resource_family,authority_class,
                                  state_machine,banned_flag
PURPOSE                            browse active entries with filter
AUDIENCE                            admin / audit pack assembly
PAGINATION                          cursor-based (per E0 §pagination)
RESPONSE                            page of entries with summary
                                  fields
RATE LIMIT                          medium
CACHE                                short TTL (5s) per tenant +
                                  filter
EVIDENCE EMIT                         access_audit on filter
                                  expansion
```

### 2.3 History lookup

```
PATH                              GET /v1/authority/entry/{root_code}/
                                  history
PURPOSE                            retrieve all entries (active +
                                  superseded) for root
AUDIENCE                            audit pack assembly + regulator
                                  inspector portal
RESPONSE                             time-ordered entries; per entry:
                                  effective period, signers,
                                  supersession reference, audit
                                  anchor reference (per B6 C1)
RATE LIMIT                            low (audit driven)
CACHE                                  none (audit must be fresh)
EVIDENCE EMIT                            access_audit (auditor portal
                                       per H3 §7)
SPECIAL                                  inspector portal ↔ same path
                                       with auditor scope token
```

### 2.4 Entry validation

```
PATH                              POST /v1/authority/entry/{root_code}/
                                  verify
PURPOSE                            re-verify entry signature + axiom
                                  satisfaction (B6 OTG)
AUDIENCE                            integrity audit jobs (nightly +
                                  on-demand); admin
RESPONSE                             ok | mismatch (with mismatch
                                  evidence)
RATE LIMIT                            low
EVIDENCE EMIT                            integrity_check (EC-22 +
                                       cross-link audit_anchor)
ON MISMATCH                              SEV-1 incident per RB-INC-005;
                                       halt mutations on affected
                                       scope
```

### 2.5 Entry creation (governed)

```
PATH                              POST /v1/authority/entry
PURPOSE                            create new entry via governance
                                  workflow
AUDIENCE                            Platform Lead, Compliance Lead,
                                  Domain Architect
PRECONDITIONS                       H7 Class A change request
                                  approved; quorum signoff per L1
                                  for banned-decision routing;
                                  evidence signed
INPUT                                  scope, action allow-list,
                                  quorum, state-machine ref,
                                  banned-flag, effective from,
                                  signers (via E7), reason,
                                  CR reference (EC-16)
RESPONSE                             entry id; new state effective
ERRORS                                422 quorum-incomplete;
                                  409 conflict-with-active
IDEMPOTENCY                            idempotency-key REQUIRED
                                  (ULID per IETF draft);
                                  per E0 §idempotency
EVIDENCE EMIT                          authority_change (EC-16) +
                                  signature (EC-2 multi-sig)
SLO                                    per SLO-9 write error budget
RATE LIMIT                              very low (admin / governance)
```

### 2.6 Entry supersession

```
PATH                              POST /v1/authority/entry/{root_code}/
                                  supersede
PURPOSE                            mark existing entry superseded
AUDIENCE                            admin / governance
PRECONDITIONS                       successor entry created (per 2.5)
                                  + governance signoff
RESPONSE                             supersession event id
EVIDENCE EMIT                          authority_change (EC-16) +
                                  signature (EC-2)
COUPLINGS                              cascades to revoke caching;
                                  emits cache-invalidate event
                                  (CDC + outbound per B8)
```

### 2.7 Cross-tenant lookup (system-only)

```
PATH                              GET /v1/authority/system/cross-tenant
                                  /entry/{root_code}
PURPOSE                            platform-wide authority for
                                  service-mesh policy + cross-cutting
AUDIENCE                            HESEM platform identity only
                                  (service principal)
TENANT SCOPE                        explicit hesem-system context
                                  (cannot be invoked from tenant
                                  identity);
                                  banned-by-tenant per B6 C5
RESPONSE                             entries (cross-tenant) for
                                  platform-wide concern
RATE LIMIT                            low
EVIDENCE EMIT                          access_audit (system-tagged)
SPECIAL                                 attempt by tenant-token
                                       returns 403; logged as
                                       BD-equivalent attempt
                                       (cross-tenant breach
                                       indicator)
```

### 2.8 Authority-decision (action allowed?)

```
PATH                              POST /v1/authority/decide
PURPOSE                            consolidated decision call from
                                  Command Bus per command
INPUT                              tenant_id, principal (identity +
                                  role), action, target (root +
                                  resource), context (per-pack
                                  attributes, geo, time-of-day,
                                  device-posture)
RESPONSE                            decision: allow | deny |
                                  needs-quorum | needs-step-up;
                                  if needs-quorum: signers required;
                                  if needs-step-up: AAL required
                                  (per NIST 800-63);
                                  audit_id (linked to EC-22)
SLO                                 per SLO-1 p95 < 20ms;
                                  per SLO-2 availability 99.95%
RATE LIMIT                          very high (every command)
CACHE                               local cache per identity ×
                                  action × scope; TTL short (15s)
                                  + invalidation on rev
EVIDENCE EMIT                       access_audit (EC-22) sampled
                                  on read; full on deny / step-up
ERROR                                 standard 401 / 403 + RFC 9457
SPECIAL                               banned-decision routing per
                                  L1 §1: AI principal denied for
                                  banned-set; logged + alerted
```

### 2.9 Quorum policy lookup

```
PATH                              GET /v1/authority/quorum/{action_id}
PURPOSE                            retrieve quorum policy per action
                                  (e.g., BD-1 batch release: QP +
                                  Quality Lead minimum;
                                  pack-specific extensions per L1
                                  §3)
AUDIENCE                            UI sign-flow rendering;
                                  Command Bus enforcement
RESPONSE                             role-quorum (e.g., 2-person from
                                  set [Quality Lead, Compliance
                                  Lead, QP, PRRC]); per-tenant
                                  override per CSR (per H1 §7);
                                  AAL minimum (NIST 800-63);
                                  reason-text minimum length;
                                  hardware-token requirement
                                  (ITAR);
                                  refresh window (per session)
EVIDENCE EMIT                          access_audit (EC-22) on
                                       sign-flow start
```

### 2.10 Per-tenant config (admin)

```
PATH                              POST /v1/authority/config
                                  GET  /v1/authority/config
PURPOSE                            tenant admin sets quorum overrides
                                  + role mappings within regulator
                                  floor (per L1 §9)
PRECONDITIONS                       H7 Class A or B change;
                                  Compliance Lead signoff
RESPONSE                             config snapshot id
ERRORS                                422 below-floor (rejected);
                                  403 not-tenant-admin
EVIDENCE EMIT                          authority_config_change
                                  (EC-16)
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session (per E1)
TENANT SCOPE                    tenant_id from JWT claim
                                (cannot override; cross-tenant
                                rejected per B6 C5)
ABAC + RBAC                     per role + per attribute (geo,
                                pack-scope, time, device)
AAL ENFORCEMENT                 step-up to AAL2/AAL3 for
                                regulated decisions (per NIST
                                800-63);
                                hardware-token mandatory for ITAR
                                (per J3 §5)
SESSION                         JWT bearer + refresh per E1;
                                privileged session shorter idle
                                timeout
SUB-PROCESSOR                   per L2 §8 + I8; sub-processor
                                principal restricted scope
DELEGATION                       supported for non-banned actions;
                                forbidden for banned-set
```

---

## 4. Cache + freshness

```
2.1 active lookup               L1 cache 60s TTL; per tenant +
                                root + version
2.2 active list                  short TTL 5s per filter
2.3 history                      no cache (audit fresh-read)
2.4 verify                        none (always re-run)
2.5/2.6/2.10 governance          no cache (write-path)
2.8 decision                      local cache 15s per principal +
                                action; invalidate on revoke event
2.9 quorum                        L1 cache 5min TTL per action
                                (rarely changes)

INVALIDATION                      on entry-supersede or governance
                                change → CDC → cache invalidate
                                across regions
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        every error response;
                                 type-URI per error class;
                                 per-tenant detail; cause chain
OPENAPI 3.1.1                      spec governed per H7 + I1
                                 deprecation per E0 deprecation
                                 policy
OBSERVABILITY (OTel)               per request: trace + span +
                                 baggage (tenant + principal +
                                 action); metrics per route per
                                 tenant per outcome
AUDIT CHAIN                       authority changes anchored
                                 daily (per B6 C1)
TENANT BOUNDARY (B6 C5)            cross-tenant query rejected;
                                 attempt logged as security-event
IDEMPOTENCY                         write paths: idempotency-key
                                 required (ULID); replay returns
                                 same result (per E0)
CONCURRENCY                         optimistic per entry-version
                                 ETag / If-Match
RETRIES                              read paths idempotent → safe
                                 retry; write paths require
                                 idempotency-key
RATE LIMITING                        per identity + per tenant +
                                 per route; backstop per global
                                 (per OWASP API4)
PII REDACTION                         responses redact sensitive
                                 (per I7 §9); audit access to
                                 PII fields logged
DEPRECATION                            per E0 deprecation policy;
                                 sunset header per RFC 8594
```

---

## 6. Wave target

```
W0.5      L4 (test environment): basic 2.1 + 2.8 +
          audit-evidence emission; integrated with Command
          Bus
W1        L5 (controlled mutation): 2.2 + 2.5 + 2.6
W3        L6 (regulated): 2.3 (history) + 2.4 (verify) +
          per H3 §7 inspector-portal
W6        L6 hardened: 2.7 (system) + 2.10 (per-tenant)
W7        AI advisory features call 2.8 with AI principal;
          banned-decision triple defense at three layers
          (per L1 §4)
W8        SOC 2 Type II ready
W12       Sovereign region variants per I4 §5
```

---

## 7. Failure modes

```
FM1   Active entry not found
      Behavior: 404 unknown_root; per RFC 9457; trace event
      Recovery: governance review; unknown root indicates
              missing setup or stale call

FM2   Signature verify fails (2.4)
      Behavior: 503 signature_unverified
      Recovery: SEV-1 per RB-INC-005; halt mutation on
              affected scope; H8 systemic CAPA

FM3   Governance write attempted without H7 approval
      Behavior: 422 governance_incomplete
      Recovery: complete H7 cycle then retry

FM4   AI principal attempts banned-decision (2.8)
      Behavior: 403 banned_decision; logged per L1 §7
      Recovery: per L1 §4 triple defense; SEV-1 if pattern

FM5   Cross-tenant query attempt
      Behavior: 403 cross_tenant_breach
      Recovery: SEV-1 per B6 C5; H8 systemic; tenant +
              regulator notification per H1 §3

FM6   Cache stale during supersession
      Behavior: stale ENTRY returned briefly
      Recovery: cache invalidation event per CDC; per-region
              propagation; window typically < 5s
              (acceptable for non-banned-decision use)

FM7   Quorum policy mis-configured below floor
      Behavior: 422 quorum_below_floor
      Recovery: H7 governance review; tenant comm

FM8   Authority decision latency exceeds SLO
      Behavior: SLO-1 burn alert
      Recovery: per I3; investigate downstream cache /
              network; fall back to local copy if available
```

---

## 8. Roles and authority (RACI)

```
ENDPOINT             PLAT  COMP  TENANT  AUDIT  AI  CALLER
2.1 active           A     -     R       R      R   R
2.2 list             A     -     R       R      -   R
2.3 history          A     C     R       A      -   R
2.4 verify           A     R     -       -      -   -
2.5 create           A     A     -       -      -   -
2.6 supersede        A     A     -       -      -   -
2.7 system           A     -     -       -      -   -
2.8 decide           A     -     R       -      R   R
                                                (denied
                                                for banned)
2.9 quorum           A     C     R       -      -   R
2.10 config          A     A     A       -      -   -
```

---

## 9. Cross-references

- B2 — Authority Ledger substrate
- B6 — RBAC + ABAC + axiom enforcement
- B7 — Workflow Command Bus
- E0 — API conventions (problem details, idempotency, deprecation)
- E1 — Identity / session
- E3 — Workflow API consumer of E2.8
- E6 — Audit API consumer of E2.3 history
- E7 — E-Signature API for governance signoff
- E8 — Evidence API for authority change + access audit
- E14 — Admin API for governance UI
- H3 §7 — auditor portal
- H1 §3 — regulator notification on cross-tenant breach
- H4 — access_audit (EC-22), authority_change (EC-16)
- I7 — runtime auth middleware
- L1 — banned-decision routing
- M5 — SLO-1 + SLO-2

---

## 10. Decision phrase

```
E2_AUTHORITY_API_BASELINE_LOCKED
NEXT: E3_WORKFLOW_API.md
```
