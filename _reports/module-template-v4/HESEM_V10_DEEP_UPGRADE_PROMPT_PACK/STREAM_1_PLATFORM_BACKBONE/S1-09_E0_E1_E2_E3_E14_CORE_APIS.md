# S1-09 — E0 + E1 + E2 + E3 + E14 (Core APIs)

```
prompt_id:        S1-09
stream:           1
sequence:         9 of 9 (final S1)
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baselines:
   PART_E_API_CATALOG/E0_PART_E_OVERVIEW.md
   PART_E_API_CATALOG/E1_AUTHENTICATION_IDENTITY_API.md
   PART_E_API_CATALOG/E2_AUTHORITY_API.md
   PART_E_API_CATALOG/E3_WORKFLOW_API.md
   PART_E_API_CATALOG/E14_ADMIN_API.md
3. Cross-references: B1 (layers), B2 (Authority Ledger), B6,
   B7, E5..E15, H4, I7 §3 (PAM), L1 (banned), M3, M5
4. Standards: OpenAPI 3.1.1; RFC 9457; JSON Schema 2020-12;
   OAuth 2.0; OIDC; WebAuthn / FIDO2; NIST 800-63 IAL/AAL;
   OWASP API Top 10; OWASP ASVS 5.0; Casbin / OPA
```

## Deliverable

```
PART_E_API_CATALOG/E0_PART_E_OVERVIEW.md
PART_E_API_CATALOG/E1_AUTHENTICATION_IDENTITY_API.md
PART_E_API_CATALOG/E2_AUTHORITY_API.md
PART_E_API_CATALOG/E3_WORKFLOW_API.md
PART_E_API_CATALOG/E14_ADMIN_API.md
```

## Depth requirements

For each chapter, full per-endpoint contract:

```
PER ENDPOINT (every endpoint in each chapter):
- Path pattern (illustrative)
- HTTP method
- Purpose (1 sentence)
- Audience (who calls)
- Request shape: every field documented (name; type;
  semantic; mandatory/optional; PII flag; constraint;
  example value)
- Response shape: every field
- Headers (X-Idempotency-Key; If-Match ETag; X-Tenant-ID;
  Authorization; Sunset header per RFC 8594)
- Error catalog (RFC 9457 type-URI per error class;
  HTTP code; recovery path)
- Idempotency rule (key shape; replay semantics; conflict
  detection)
- Concurrency rule (ETag / If-Match; If-Unmodified-Since;
  conflict-resolution UI flow)
- RBAC + ABAC requirements (per role per attribute)
- Rate-limit (per identity + per tenant + per route)
- SLO target (p95; p99; error rate)
- Observability emit (trace + log + metric)
- Audit emit (per H4 evidence class)
- Per-tenant boundary (cross-tenant rejection rule)
- Per-pack overlay where applicable
- Wave target (when L4 / L5 / L6 / L7)
- Deprecation policy
```

## Per-chapter deeper requirements

### E0 — overview + conventions

```
- 16 API families with owner per chapter
- 10 design principles (P1..P10) with concrete instantiation
- Problem-detail registry with ≥ 60 type-URIs cataloged
- Pagination convention (cursor-based; opaque; integrity hash;
  no offset)
- Filter + sort discipline
- Versioning policy (major bump for breaking; sunset per
  RFC 8594)
- Deprecation cycle (announce → stop-new → sunset; cycle
  durations)
- OpenAPI spec governance (per H7)
- AsyncAPI 3.0 channel registry
- CloudEvents 1.0 envelope policy
- Contract-first discipline (no live endpoint without spec)
- Per-route OTel trace mandatory
- Per-route SLO mandatory at L4 graduation
- Cross-references inter-chapter
```

### E1 — Identity (≥ 14 endpoints)

```
- 14 endpoints (login; refresh; step-up; service-account;
  logout; self-service; /can decision; /can obligation;
  user mgmt; role mgmt; tenant membership; MFA enroll;
  MFA revoke; access log lookup)
- Per-endpoint full contract (per above)
- WebAuthn / FIDO2 spec deep
- Step-up AAL flow (per NIST 800-63)
- Service-account token lifecycle
- ITAR person-of-record verification
- Hardware-token requirement matrix per pack
- Per-tenant identity provider config
- Per-tenant SCIM sync
- Identity proofing IAL per use case
- Sub-processor identity (per L2 §8)
```

### E2 — Authority (10 endpoints; per V9)

```
Already at 10 endpoints in V9; deepen each per-endpoint contract;
add /decide decision algorithm pseudo-prose; quorum policy
lookup; per-tenant config; banned-decision routing; cache +
freshness governance
```

### E3 — Workflow (8 endpoint groups; per V9)

```
Already at 8 groups; deepen per-endpoint contract;
add per-command schema registry (per OpenAPI route);
per-saga compensation API; per-subscription delivery
guarantee; per-tenant rate-limit
```

### E14 — Admin (16 endpoints; per V9)

```
Already at 16 endpoints; deepen per-endpoint contract;
add tenant offboarding LRO orchestration;
DR initiation multi-sig flow;
region pinning change governance;
quorum policy management;
banned-decision surface management;
sub-processor onboarding flow;
per-tenant retention class change;
PCCP envelope (MD AI) governance;
per-pack toggle governance
```

## Required substance

E0: ≥ 4,000 words (deeper than V9 173 lines)
E1: ≥ 5,000 words
E2: ≥ 5,500 words (already deep at V9; expand further)
E3: ≥ 5,500 words (already deep at V9; expand further)
E14: ≥ 5,500 words (already deep at V9; expand further)

## Acceptance criteria

```
[ ] E0: ≥ 60 problem-detail type-URIs cataloged with per-class
    HTTP code + recovery
[ ] E0: 10 design principles with concrete instantiation
[ ] E0: 16 API families with owner
[ ] E1: 14 endpoints with full contract
[ ] E2: 10 endpoints fully deepened
[ ] E3: 8 endpoint groups fully deepened
[ ] E14: 16 endpoints fully deepened
[ ] All per-endpoint contracts include: path; method; request +
    response shape (full fields); error catalog; idempotency;
    concurrency; RBAC + ABAC; rate-limit; SLO; observability;
    audit emit; tenant boundary
[ ] Per-pack overlay where applicable
[ ] Cross-references resolve
[ ] No marketing language
[ ] Decision phrase emitted
```

## Decision phrase upon completion

```
S1-09_CORE_APIS_DEEP_UPGRADE_COMPLETE
```

After emit: stream 1 complete. Emit:
```
STREAM_1_PLATFORM_BACKBONE_DEEP_UPGRADE_COMPLETE
```
