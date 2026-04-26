# 09_API_CONTRACT_FACTORY.md

## Purpose

GPT Pro V4 §10 lists "API & Workflow Live-API Mutation Graduation" with 8 problem-detail codes (RFC 9457). V5 produces the **API Contract Factory** — a complete specification of how every HESEM REST/GraphQL/AsyncAPI surface is authored, versioned, validated, and evolved.

Standards:

- OpenAPI Specification 3.1.1 (current)
- JSON Schema 2020-12
- RFC 9110 (HTTP semantics)
- RFC 9111 (HTTP caching)
- RFC 9112 (HTTP/1.1)
- RFC 9114 (HTTP/3)
- RFC 9457 (Problem Details for HTTP APIs)
- RFC 7232 (HTTP conditional requests / ETag)
- RFC 8141 (URN)
- RFC 7807 (predecessor problem details, deprecated by 9457)
- RFC 9651 (HTTP Structured Field Values)
- AsyncAPI 2.6 (event APIs)
- GraphQL June 2018 / 2024 spec
- gRPC (HTTP/2 + Protocol Buffers, optional internal use)
- IANA HTTP status codes registry

---

## Section 1 — Contract-first development

V5 mandates **contract-first**: OpenAPI spec authored before implementation. Code-generated handler stubs from spec; spec drives:

```text
- request validation (schema check)
- response validation (schema check)
- problem-detail factory registration
- documentation site (Redoc + Stoplight)
- SDK generation (TypeScript, Python, PHP, Java)
- contract test fixtures
```

V5 ADR-0146: Contract-first mandatory for every new route; PR template includes spec-diff section.

### 1.1 Spec file layout

```text
mom/contracts/openapi/
  common.openapi.yaml             # shared schemas: ProblemDetail, Pagination, Envelope
  brel.openapi.yaml               # BREL resource family
  cdoc.openapi.yaml               # CDOC resource family
  nc.openapi.yaml                 # NC + CAPA + SCAR family
  inspection.openapi.yaml         # INS + IQC + IPC + OQC + MRB
  workforce.openapi.yaml          # TRAIN-COURSE / TRAIN-RECORD / COMP-MATRIX / ROLE
  digital_thread.openapi.yaml     # LOT / IREV / PREC / MWO / genealogy
  workspaces.openapi.yaml         # projection workspaces
  audit.openapi.yaml              # audit chain query + DSAR
  esign.openapi.yaml              # signing session endpoints
  edge.openapi.yaml               # edge gateway envelope (mutual TLS)
  ai_advisory.openapi.yaml        # AI advisory endpoints
  internal/
    auth_decide.openapi.yaml      # internal policy decide
    cdc_consumer.openapi.yaml     # internal CDC consumer probe
    health.openapi.yaml           # health/ready endpoints
```

---

## Section 2 — URI design

### 2.1 Resource path conventions

```text
GET    /api/v1/<resource-family>                      list (cursor pagination)
GET    /api/v1/<resource-family>/{id}                 single item
POST   /api/v1/<resource-family>                      create
PATCH  /api/v1/<resource-family>/{id}                 partial update (rare; mutations preferred)
DELETE /api/v1/<resource-family>/{id}                 soft-delete (rare; supersession preferred)
POST   /api/v1/<resource-family>/{id}:<action>        transition (verb at path tail)
GET    /api/v1/workspace/<workspace-id>               projection query
GET    /api/v1/audit/<resource-family>/{id}           audit history
```

### 2.2 Mutation as verb

V5 ADR-0147: Mutations are **POST `:verb`**, not PUT/PATCH. Reasons:

```text
- transitions are not idempotent in REST terms (state changes)
- verb makes the action explicit (audit-friendly)
- maps cleanly to state_machine.transition_id
- avoids conflating "update" (overwrite) with "transition" (state change)
```

### 2.3 Versioning

```text
- Major version in path: /api/v1/, /api/v2/
- Minor + patch via OpenAPI info.version + media-type parameter (advanced)
- Deprecation: Sunset header per RFC 8594 + 6 months minimum
- Multiple major versions may coexist; each maintained per its lifecycle
```

V5 ADR-0148: SemVer per route; major bump only for breaking; deprecation via Sunset header + Deprecation header (RFC 8594).

---

## Section 3 — Common envelope

### 3.1 Single resource

```yaml
components:
  schemas:
    SingleResource:
      type: object
      required: [data, meta]
      properties:
        data:
          $ref: '#/components/schemas/<resource-family>_canonical'
        meta:
          type: object
          required: [version, etag, freshness]
          properties:
            version:    { type: integer, format: int64 }
            etag:       { type: string, pattern: '^W/"[a-f0-9]{64}"$' }
            freshness:  { type: string, format: date-time }
            tenant_id:  { type: string, format: uuid }
            authority_class: { type: string, enum: [authoritative_root, projection_workspace, derived_read_model] }
            source:     { type: string, enum: [live, projection, fixture] }
            trace_id:   { type: string }
```

### 3.2 List

```yaml
ListResource:
  type: object
  required: [data, page, meta]
  properties:
    data: { type: array, items: { ... } }
    page:
      type: object
      required: [next_cursor, has_more, page_size]
      properties:
        next_cursor: { type: string, nullable: true }
        prev_cursor: { type: string, nullable: true }
        has_more:    { type: boolean }
        page_size:   { type: integer, minimum: 1, maximum: 1000 }
        total_estimate: { type: integer, nullable: true, description: "Best-effort estimate; may be expensive" }
    meta:
      type: object
      properties:
        freshness:  { type: string, format: date-time }
        source:     { type: string, enum: [live, projection, fixture] }
        trace_id:   { type: string }
```

### 3.3 Mutation result (transition envelope)

```yaml
TransitionResult:
  type: object
  required: [data, transition, audit, meta]
  properties:
    data: { ... resource canonical state after transition ... }
    transition:
      type: object
      required: [id, from_state, to_state, committed_at]
      properties:
        id:            { type: string, description: "transition_id" }
        from_state:    { type: string }
        to_state:      { type: string }
        committed_at:  { type: string, format: date-time }
        guards_evaluated:  { type: array, items: { type: string } }
    audit:
      type: object
      properties:
        audit_event_id:  { type: string }
        e_sign_record_id: { type: string, nullable: true }
        chain_position:   { type: integer }
    meta:
      type: object
      properties:
        new_etag:    { type: string }
        new_version: { type: integer }
```

---

## Section 4 — Cursor pagination

V5 ADR-0149: Cursor pagination only; offset pagination forbidden (race conditions, scaling).

```text
Cursor = base64url(JSON({
  "v": 1,
  "k": "<sort-key>:<id>",
  "h": "<integrity-hash>"
}))
```

```text
GET /api/v1/brel?cursor=<opaque>&page_size=50
```

The cursor's integrity hash prevents tampering; the cursor's sort-key prevents skipping rows on inserts.

### 4.1 Stable sort discipline

Every list endpoint must declare a stable sort:

```yaml
parameters:
  - name: sort
    in: query
    schema:
      type: string
      enum: [created_at_desc, updated_at_desc, code_asc]
      default: created_at_desc
```

The sort field combines with `id` as tiebreaker for cursor stability.

---

## Section 5 — Problem details (RFC 9457)

### 5.1 Stable type URIs

V5 maintains a registry of problem-detail type URIs:

```text
https://hesem.io/problems/auth/unauthorized
https://hesem.io/problems/auth/forbidden
https://hesem.io/problems/auth/policy-not-published
https://hesem.io/problems/policy/decision-not-applicable
https://hesem.io/problems/concurrency/version-conflict
https://hesem.io/problems/concurrency/precondition-required
https://hesem.io/problems/idempotency/required
https://hesem.io/problems/idempotency/replay-mismatch
https://hesem.io/problems/idempotency/replay-expired
https://hesem.io/problems/workflow/guard-failure
https://hesem.io/problems/workflow/invariant-violation
https://hesem.io/problems/workflow/transition-not-permitted
https://hesem.io/problems/workflow/state-machine-not-found
https://hesem.io/problems/validation/state-stale
https://hesem.io/problems/validation/evidence-missing
https://hesem.io/problems/esign/factor-required
https://hesem.io/problems/esign/factor-rejected
https://hesem.io/problems/esign/session-expired
https://hesem.io/problems/tenant/boundary-violation
https://hesem.io/problems/tenant/quota-exceeded
https://hesem.io/problems/rate-limit/exceeded
https://hesem.io/problems/retention/policy-violation
https://hesem.io/problems/retention/erasure-blocked
https://hesem.io/problems/audit/chain-anchor-pending
https://hesem.io/problems/integrity/dangling-edge
https://hesem.io/problems/integrity/lineage-gap
https://hesem.io/problems/projection/freshness-stale
https://hesem.io/problems/server/internal-error
https://hesem.io/problems/server/dependency-degraded
https://hesem.io/problems/server/timeout
https://hesem.io/problems/contract/schema-violation
https://hesem.io/problems/contract/version-deprecated
https://hesem.io/problems/contract/api-version-removed
https://hesem.io/problems/regulatory/jurisdiction-mismatch  (e.g., recipient outside permitted region)
https://hesem.io/problems/ai/advisory-not-available
https://hesem.io/problems/ai/banned-decision-attempted    (RULE-2)
https://hesem.io/problems/upload/file-too-large
https://hesem.io/problems/upload/checksum-mismatch
https://hesem.io/problems/upload/virus-detected
```

V5 ADR-0150: Type URIs are versioned namespaces; modifying a type's semantics requires a new URI.

### 5.2 Envelope schema

```yaml
ProblemDetail:
  type: object
  required: [type, title, status]
  properties:
    type:           { type: string, format: uri }
    title:          { type: string }
    status:         { type: integer, format: int32 }
    detail:         { type: string, nullable: true }
    instance:       { type: string, format: uri, nullable: true }
    trace_id:       { type: string, nullable: true }
    errors:
      type: array
      items:
        type: object
        properties:
          field:    { type: string }
          code:     { type: string }
          message:  { type: string }
    retry_after:    { type: integer, nullable: true, description: "seconds" }
    correlation_id: { type: string, nullable: true }
```

### 5.3 Error response example

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json
Trace-Id: 4bf92f3577b34da6a3ce929d0e0e4736

{
  "type":   "https://hesem.io/problems/workflow/guard-failure",
  "title":  "Workflow guard failed",
  "status": 422,
  "detail": "Cannot release BREL: 2 inspection plans not yet completed",
  "instance": "/api/v1/brel/0e7a2c0c-..../approve_release",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "errors": [
    {"field": "inspection_plans[0]", "code": "incomplete", "message": "ins-2026-04-25-001 is in_progress"},
    {"field": "inspection_plans[1]", "code": "incomplete", "message": "ins-2026-04-26-002 is draft"}
  ]
}
```

---

## Section 6 — Idempotency

(Per file 04 W0.5.5 baseline.)

### 6.1 Header

```text
Idempotency-Key: <ulid or uuid v4>
```

### 6.2 Behavior matrix

| Server state | Header | Behavior |
|---|---|---|
| First request | present | Execute; store response keyed by (key, tenant, principal) |
| Replay (same hash) | present | Replay stored response; do not re-execute |
| Replay (different hash) | present | 409 idempotency.replay_mismatch |
| Mutation | absent | 400 idempotency.required |
| Read | absent | OK (idempotent by HTTP spec) |
| Past 24h | present | Treat as new request |

V5 ADR-0151: Idempotency-Key required on every mutation; absent → 400.

---

## Section 7 — Concurrency (ETag / If-Match)

### 7.1 ETag generation

```text
ETag: W/"<sha256(canonical_json)>"
```

Weak validators only (W/) — semantically equivalent representations may have different bytes.

### 7.2 If-Match required on mutation

```http
PATCH /api/v1/brel/<id>
If-Match: W/"4f8b9..."
```

Missing If-Match → 428 Precondition Required.
Mismatch → 412 Precondition Failed.

V5 ADR-0152: If-Match required on mutations; weak validators policy.

---

## Section 8 — Rate limiting

### 8.1 Token-bucket per principal × per route

```text
Default budget per route:  100 req/min
Mutation routes budget:    20 req/min
Heavy routes (genealogy, exports): 5 req/min
Per tenant aggregate:      10000 req/min
```

### 8.2 Headers (per IETF draft `draft-ietf-httpapi-ratelimit-headers`)

```text
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1714007340
RateLimit-Policy: "100;w=60"
Retry-After: 13
```

### 8.3 429 response

```text
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 13

{
  "type": "https://hesem.io/problems/rate-limit/exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Per-route budget exhausted; retry in 13s",
  "retry_after": 13
}
```

---

## Section 9 — Caching

### 9.1 Per-resource cache headers

```text
Cache-Control: private, max-age=10, must-revalidate
ETag: W/"..."
Last-Modified: <RFC 7231 date>
```

### 9.2 Cache strategy

```text
authoritative_root        Cache-Control: private, max-age=10, must-revalidate
projection_workspace      Cache-Control: private, max-age=5, must-revalidate
derived_read_model        Cache-Control: private, max-age=60, must-revalidate
audit/historical          Cache-Control: private, max-age=86400, immutable
configuration             Cache-Control: public, max-age=300
```

V5 ADR-0153: Per-class cache policy.

---

## Section 10 — AsyncAPI 2.6 event surface

### 10.1 Subscriber surface

For partners and internal services subscribing to events:

```yaml
asyncapi: 2.6.0
info:
  title: HESEM Event Surface
  version: 1.0.0
servers:
  realtime:
    url: wss://realtime.hesem.io/v1
    protocol: wss
channels:
  /tenant/{tenantId}/workflow/{resourceFamily}/{resourceId}/transition:
    parameters:
      tenantId:        { schema: { type: string } }
      resourceFamily:  { schema: { type: string } }
      resourceId:      { schema: { type: string } }
    subscribe:
      operationId: subscribeTransition
      message:
        $ref: '#/components/messages/WorkflowTransitionEvent'
  /tenant/{tenantId}/workspace/{workspaceId}/freshness:
    subscribe:
      operationId: subscribeFreshness
      message:
        $ref: '#/components/messages/FreshnessEvent'
  /tenant/{tenantId}/audit/anchor:
    subscribe:
      operationId: subscribeAuditAnchor
      message:
        $ref: '#/components/messages/AuditAnchorEvent'
```

### 10.2 Authentication

WebSocket connections authenticated via OIDC bearer token in initial frame. Per-topic ACL evaluated by `auth.decide`.

---

## Section 11 — GraphQL gateway (W9)

### 11.1 Schema mirrors REST

```graphql
type BREL {
  id: ID!
  code: String!
  lifecycleState: BRELState!
  lot: LOT
  releaseHistory: [BRELReleaseHistoryEntry!]!
  validationEvidence: ValidationEvidence
  auditTrail(limit: Int = 50): [AuditEvent!]!
}

type Query {
  brel(id: ID!): BREL
  brels(filter: BRELFilter, page: PageInput): BRELConnection!
}

type Mutation {
  brelSubmitForReview(id: ID!, input: BRELSubmitInput!): TransitionResult!
  brelApproveRelease(id: ID!, input: BRELApproveInput!): TransitionResult!
}
```

V5 ADR-0154: GraphQL is convenience layer; REST stays canonical. Same auth + audit; mutations gated identically.

### 11.2 Persisted queries only in production

```text
- introspection disabled in production
- only persisted query IDs accepted
- raw queries accepted only with admin token
```

---

## Section 12 — gRPC for internal services

For internal high-throughput service-to-service communication, gRPC over HTTP/2 with Protocol Buffers is permitted for:

```text
- inference service ↔ HESEM core (high QPS)
- CDC consumer ↔ HESEM core (CDC stream)
- search service ↔ HESEM core (typeahead)
```

External API surface remains REST (and GraphQL convenience).

V5 ADR-0155: gRPC permitted internally; never exposed externally.

---

## Section 13 — Bulk endpoints

For administrative use:

```http
POST /api/v1/<resource-family>/_bulk
Content-Type: application/x-ndjson

{"action":"create","data":{...}}
{"action":"create","data":{...}}
{"action":"update","id":"...","data":{...}}
```

Bulk endpoints carry their own idempotency semantics (per-line):

```text
- each line has its own Idempotency-Key (in JSON)
- partial success allowed; response is 207 Multi-Status with per-line outcome
```

V5 ADR-0156: Bulk endpoint semantics + 207 multi-status.

---

## Section 14 — Long-running operations

For operations that exceed 10 seconds (e.g., DSAR export):

```http
POST /api/v1/audit/dsar
Idempotency-Key: ...

HTTP/1.1 202 Accepted
Location: /api/v1/operations/<op_id>
```

Client polls:

```http
GET /api/v1/operations/<op_id>

HTTP/1.1 200 OK
{
  "operation_id": "...",
  "status": "in_progress | completed | failed",
  "progress_percent": 45,
  "result_uri": "https://...",
  "estimated_completion_at": "..."
}
```

V5 ADR-0157: Long-running operations as 202 + Location + polling.

---

## Section 15 — File upload / download

### 15.1 Pre-signed URL pattern

```http
POST /api/v1/<resource-family>/{id}/attachments:initiate
{
  "filename": "spec.pdf",
  "content_type": "application/pdf",
  "byte_size": 1234567
}

200 OK
{
  "upload_url": "https://storage.hesem.io/...?signature=...",
  "upload_method": "PUT",
  "upload_headers": { ... },
  "upload_expires_at": "...",
  "attachment_id": "..."
}
```

Client PUTs to upload_url. Then:

```http
POST /api/v1/<resource-family>/{id}/attachments/{attachment_id}:confirm
{
  "checksum_sha256": "...",
  "byte_size_actual": 1234567
}
```

Server verifies checksum and size; if mismatch, attachment rejected.

V5 ADR-0158: File upload via pre-signed URL + confirm; virus-scan async; checksum verified.

### 15.2 Virus scanning

```text
- attachment placed in 'pending' state until scan completes
- scan runs async via dedicated worker (ClamAV or commercial)
- on detection: attachment rejected; reason recorded in audit_event
- on clean: attachment promoted to 'available'; ready for download
```

---

## Section 16 — SDK generation

V5 ADR-0159: SDK auto-generated per release for:

```text
TypeScript / JavaScript    npm: @hesem/sdk-ts
Python                     PyPI: hesem-sdk
PHP                        Composer: hesem/sdk
Java                       Maven: io.hesem:sdk
Go                         module: hesem.io/sdk-go
```

SDKs are generated from OpenAPI specs via `openapi-generator`. SDKs include:

```text
- typed clients per resource family
- authentication helpers
- automatic retry with exponential backoff
- automatic idempotency-key generation
- automatic ETag handling
- problem-detail typed exceptions
- OpenTelemetry trace context propagation
```

---

## Section 17 — Contract testing

### 17.1 Contract test types

```text
- consumer-driven contract tests (Pact)
- schema validation tests (every response validated against OpenAPI)
- backward compatibility tests (every PR runs old client against new server)
- deprecation tests (deprecated routes still work + emit Sunset header)
```

### 17.2 CI pipeline integration

```text
on: pull_request
jobs:
  contract_validation:
    - openapi-spec-validator (spec well-formed)
    - openapi-diff (breaking change detection)
    - schema_response_validation (sample requests against staging)
    - backward_compat_test (old client v1.0 against new server)
    - deprecation_test (sunsetted routes still respond + emit headers)
```

V5 ADR-0160: Contract validation in CI as required check.

---

## Section 18 — API observability

```text
spans:        http.server.* per route
metrics:      http_requests_total{route, method, status}
              http_request_duration_seconds_bucket{route, method}
              http_request_payload_bytes{route}
              http_response_payload_bytes{route}
              api_version_in_use{route, version}
              api_deprecation_warnings_emitted{route}
              contract_drift_detected{route}
logs:         per request: trace_id, principal, tenant, route, status, duration
```

Per-route SLOs:

```text
read routes:        p95 < 200ms; error rate < 0.1%
mutation routes:    p95 < 500ms; error rate < 0.5%
heavy routes:       p95 < 2s; error rate < 1%
```

---

## Section 19 — Cumulative ADRs

```text
ADR-0146  Contract-first mandatory
ADR-0147  Mutations as POST :verb
ADR-0148  SemVer per route + Sunset header
ADR-0149  Cursor pagination only
ADR-0150  Versioned problem-detail type URIs
ADR-0151  Idempotency-Key required on mutations
ADR-0152  If-Match required on mutations + weak ETag policy
ADR-0153  Per-class cache policy
ADR-0154  GraphQL convenience layer; REST canonical
ADR-0155  gRPC internal only
ADR-0156  Bulk endpoint multi-status semantics
ADR-0157  Long-running operations 202 + polling
ADR-0158  File upload pre-signed URL + confirm pattern
ADR-0159  SDK auto-generation pipeline
ADR-0160  Contract validation in CI as required
```

---

## Section 20 — Decision phrase

```text
V5_API_CONTRACT_FACTORY_BASELINE_LOCKED
NEXT_FILE: 10_DATA_ENGINEERING_DIGITAL_THREAD.md
```
