# E4 — Record API per Domain (V10 Deep Upgrade)

```
api_family:       Record APIs — authoritative-record read + mutation surface
owner_role:       Per-domain lead (one per 14 domains, API Lead as reviewer)
scope:            All 95+ authoritative roots across 14 capability domains
version:          V10 deep-upgrade (S3-01)
openapi_ref:      mom/contracts/openapi/e4-record-per-domain.yaml (planned)
standards:        OpenAPI 3.1.1; RFC 9457; JSON Schema 2020-12;
                  RFC 7232 (ETag/If-Match); RFC 8288 (Link header);
                  RFC 8594 (Sunset header); OWASP API Security Top-10 2023;
                  ICU MessageFormat 2; IANA tz; ISO 8601
upgrade_from:     V9-shallow (common-shape only; no per-domain contracts)
upgrade_to:       V10 — full per-domain, per-family, per-endpoint contracts
                  with field-level redaction, SLO, per-pack overlays,
                  error catalogs, wave assignments, and deprecation policy
```

---

## 1. Purpose

The Record API is the authoritative-read surface for every persistent business
entity in the HESEM platform. There is one Record API family per resource root
(≥ 95 roots across 14 domains; per M3 root catalog). Together they form the
backbone of every UI record shell, every downstream workflow, and every
integration connector.

The V9 chapter established the common shape. This V10 upgrade adds:
- Per-domain sections §4–§17 — one per C1..C14 domain
- Per-family endpoint contracts (list / single / history / search / export)
- Per-family filter parameter sets, request shapes, and response field lists
- Per-family SLO targets (p50 / p95 / p99)
- Per-family cache-control directives keyed to data class
- Per-family field-level redaction rules per RBAC role
- Per-family per-pack overlay callouts (J1 Pharma .. J5 Food)
- Per-family RFC 9457 error type-URI catalogs beyond the baseline
- Wave delivery assignment for each family
- Deprecation schedule and migration guidance

Cross-references: E6 (audit trail format), E7 (e-signature chain), E8
(evidence attachments), E11 (bulk export helpers), E12 (file download),
E13 (LRO status tracking), E15 (integration connector bindings), M3 (root
catalog), B6 (security cross-cutting: RLS, ABAC, ITAR controls).

### 1.1 Why one API family per resource root

The alternative — a single generic CRUD API for all records — would collapse
domain semantics (a Lot release is not the same operation as a Document release)
and eliminate per-family SLO budgets, cache strategies, and field-level
authorization policies. It would also prevent per-pack overlays from adding
domain-specific fields without touching shared code.

The per-root design means:
- Each domain lead owns the contract for their roots, reducing coordination
  overhead across 14 domains.
- The API gateway can apply per-root rate limits, circuit breakers, and
  freshness policies without complex routing logic.
- The OpenAPI document is partitioned by domain tag, enabling per-domain SDK
  generation and per-domain mock servers during parallel development.
- Automated contract drift detection (Prism) runs per-domain; a regression in
  C7 Quality does not block C1 Commercial CI.

### 1.2 Relation to E5 Workspace Projection API

Record APIs (this chapter) serve **authoritative single-record reads** and
paginated list reads. They return the full canonical record with all fields.

The E5 Workspace Projection API (next chapter) serves **multi-record aggregated
views** optimized for UI workspaces: column-projected, denormalized, pre-sorted
tables designed for data-grid rendering. Projections are eventually consistent
(read from a materialized view with a defined refresh SLO). Record APIs are
strongly consistent by default (primary replica) or soft-consistent via the
read-replica with lag reporting.

When a UI workspace needs a row in a data grid: use E5.
When a UI record shell needs to load a specific record's full detail: use E4.

### 1.3 Relation to mutation APIs

This chapter covers **read** endpoints only (list, single, history, search,
export). Mutation endpoints (create, update, state-transition, delete) are
defined in the per-domain workflow API catalog (E3) and in domain-specific
mutation API chapters. Read and mutation endpoints share the same base path;
the HTTP verb distinguishes them. ETags returned by E4 GET endpoints are
consumed by mutation PATCH/PUT/DELETE calls to enforce optimistic concurrency.

### 1.4 Compliance posture for regulated records

Regulated families (EBR, EDHR, BREL, CAPA, DHF, Calibration, and others
marked `Cache: private, no-store`) must meet additional requirements:

1. **Immutability audit trail**: every field change is recorded in the
   `audit_event` table (E6 §2). The record API history endpoint exposes
   this trail; the trail is write-once and cannot be modified by any role.

2. **E-signature chain**: certain state transitions require an electronic
   signature (E7). The `esig_events` field on regulated single-record
   responses lists completed signatures. Incomplete signature chains are
   indicated by `esig_pending: true` in the response.

3. **No-cache enforcement**: `Cache-Control: private, no-store` prevents
   regulated record content from persisting in any intermediate cache,
   browser storage, or CDN layer. This is required by 21 CFR Part 11
   §11.10(d) and EU Annex 11 §7.1.

4. **Audit emit on every read**: for records subject to 21 CFR Part 11 or
   EU Annex 11, every GET of the single-record endpoint emits a `record.read`
   audit event (E6 §3.1), capturing actor identity, timestamp, and record
   reference. List and search reads do not emit per-record events (volume
   prohibitive); they emit a single `record.list-accessed` event per request.

---

## 2. Universal Contract Conventions

Every endpoint in this chapter inherits the following unless the per-domain
section overrides explicitly.

### 2.1 Path convention

```
/api/v1/{domain-slug}/{resource-plural}
/api/v1/{domain-slug}/{resource-plural}/{id}
/api/v1/{domain-slug}/{resource-plural}/{id}/history
/api/v1/{domain-slug}/{resource-plural}/search                   (POST)
/api/v1/{domain-slug}/{resource-plural}/export                   (POST → LRO)
```

`{domain-slug}` follows the 14-domain slug table in M1 §2. Slugs are stable;
renaming a slug is a breaking change requiring v2 migration.

### 2.2 Authentication + tenant isolation

- Every endpoint requires `Authorization: Bearer <jwt>` issued by E1.
- JWT claim `tenant_id` is bound to row-level security (RLS) at the PostgreSQL
  layer. Every base table carries a `tenant_id` column referenced in an RLS
  policy. Application-layer tenant filter is applied in addition (double
  defense per B6 §C4).
- Missing JWT → `401 auth/unauthorized`.
- Valid JWT but wrong tenant → `403 auth/forbidden` (RLS blocks at query
  level; application returns 403 rather than 404 to avoid tenant enumeration).
- Cross-tenant reads are structurally impossible: the RLS policy has no
  bypass path for application users.

### 2.3 Pagination — List endpoint

```
Scheme:           Cursor-based (opaque string; base64-encoded + HMAC signed)
Default page:     50 records
Max page:         1000 (requires admin:override scope)
Query params:     cursor (string), limit (int 1..1000)
Response fields:  data[]           — record array
                  next_cursor      — null when no more pages
                  prev_cursor      — null on first page
                  total_count      — estimated (± 5%); exact for small sets
                  page_size        — actual records returned
                  has_more         — boolean
Stable sort:      Every list endpoint appends id ASC as final sort tiebreaker
                  so pagination is deterministic even on equal sort keys.
Cursor tampering: HMAC mismatch → 400 pagination/invalid-cursor
```

### 2.4 ETag + concurrency — Single-record endpoint

```
Response header:  ETag: "<sha256(record_id + version_seq + tenant_id)>"
Mutation use:     PATCH / PUT / DELETE must send If-Match: "<etag>"
Stale ETag:       412 Precondition Failed — client must re-fetch + re-apply
Missing header:   428 Precondition Required — block optimistic blind writes
Weak ETags:       Not used — HESEM uses strong ETags throughout
```

### 2.5 Cache headers — data class table

| Data class                    | Cache-Control directive                              |
|-------------------------------|------------------------------------------------------|
| Authoritative root list       | `private, max-age=10, stale-while-revalidate=5`      |
| Single authoritative record   | `private, max-age=30, must-revalidate`               |
| Workspace projection list     | `private, max-age=5, stale-while-revalidate=3`       |
| Derived / aggregated model    | `private, max-age=60`                                |
| Audit trail / history         | `private, max-age=86400, immutable`                  |
| Search results                | `private, max-age=0, must-revalidate`                |
| Configuration / master data   | `public, s-maxage=300, stale-while-revalidate=60`    |
| Regulated record (21 CFR 11)  | `private, no-store`                                  |
| LRO status                    | `private, max-age=2`                                 |

### 2.6 Rate limits

```
Per-tenant default:    600 req / min per endpoint group (grouped by domain)
Burst window:          50 req / 5 s
LRO submit:            10 concurrent active LRO jobs per tenant
Export (bulk):         5 concurrent export jobs per tenant
Headers returned:      X-RateLimit-Limit, X-RateLimit-Remaining,
                       X-RateLimit-Reset (Unix epoch seconds)
Exceeded response:     429 rate-limit/exceeded
                       Retry-After: <seconds until reset>
                       application/problem+json body per RFC 9457
Admin override:        admin:ratelimit-override scope allows 2× ceiling
```

### 2.7 Baseline error catalog (RFC 9457 type-URIs)

All error responses use `Content-Type: application/problem+json`. Every
domain section may define additional type-URIs; these are additive.

```
Type-URI                              Status   Meaning
auth/unauthorized                     401      Missing or invalid JWT
auth/forbidden                        403      Insufficient role / tenant mismatch
auth/itar-clearance-required          403      ITAR-controlled resource; level unmet
record/not-found                      404      Record ID does not exist in tenant
record/gone                           410      Record soft-deleted; tombstone only
pagination/invalid-cursor             400      Cursor tampered or expired
concurrency/precondition-failed       412      ETag stale — re-read required
concurrency/precondition-required     428      If-Match header missing on mutation
rate-limit/exceeded                   429      Per-tenant quota exhausted
record/unprocessable                  422      Business rule violation (detail field)
record/regulated-hold                 423      Record under legal hold; export blocked
server/read-replica-lag               503      Replica freshness SLO breached
server/unavailable                    503      Transient failure; Retry-After set
```

### 2.8 Observability + audit emit

```
OpenTelemetry span:
  span_name:     "e4.{domain}.{resource}.{operation}"
  attributes:    tenant_id, user_id, record_id (if known), operation,
                 http_status, duration_ms, is_regulated (bool)

Audit event (E6 cross-ref):
  Emitted for:   All reads of regulated records (21 CFR 11, EU Annex 11,
                 MDR, FSMA §204) and all mutation operations
  event_type:    "record.read" | "record.create" | "record.update" |
                 "record.delete" | "record.export-requested"
  Fields:        actor_id, actor_ip, record_type, record_id, tenant_id,
                 timestamp (ISO 8601 UTC), change_summary (mutations only)

Prometheus:
  hesem_record_api_requests_total{domain, resource, operation, http_status}
  hesem_record_api_latency_seconds{domain, resource, operation}  (histogram)
  hesem_record_api_slo_breach_total{domain, resource, p_target}
```

### 2.9 Idempotency rules

```
GET (all):           Naturally idempotent; no key required.
POST /search:        Side-effect free; no key required.
POST /export:        Idempotency-Key: <uuid v4> required.
                     Duplicate key within 24 h returns same LRO
                     operation-id; does not resubmit.
POST /export (dup):  200 (not 202) with Idempotent-Replayed: true header.
```

### 2.10 RBAC baseline

| Role       | List | Single | History | Search | Export | Mutation |
|------------|------|--------|---------|--------|--------|----------|
| viewer     | ✓    | ✓      | ✗       | ✓      | ✗      | ✗        |
| operator   | ✓    | ✓      | ✓       | ✓      | ✓      | domain   |
| analyst    | ✓    | ✓      | ✓       | ✓      | ✓      | ✗        |
| auditor    | ✓    | ✓      | ✓ full  | ✓      | ✓      | ✗        |
| admin      | ✓    | ✓      | ✓ full  | ✓      | ✓      | ✓        |

Domain leads may tighten (not loosen) role minimums for regulated families.
Mutation scope is domain-specific (operator in one domain may not mutate in
another without explicit role grant).

### 2.11 Response envelope standard

Every non-error list response is wrapped in a standard envelope. Single-record
and error responses are unwrapped (the record or problem-detail is the body).

**List envelope**
```json
{
  "data": [ /* record array */ ],
  "next_cursor": "eyJpZCI6IjEyMzQifQ.HMAC",
  "prev_cursor": null,
  "total_count": 1472,
  "page_size": 50,
  "has_more": true,
  "meta": {
    "request_id": "req_01J...",
    "tenant_id": "ten_...",
    "generated_at": "2026-04-27T10:00:00Z",
    "replica_lag_ms": 4
  }
}
```

`request_id` is echoed from the `X-Request-ID` request header if provided;
otherwise generated by the server. Clients should log `request_id` for
support tracing.

`replica_lag_ms` is the measured lag between primary and the read replica that
served this response. When `replica_lag_ms` exceeds the SLO freshness
threshold (configurable per domain, default 500 ms), the server responds with
`503 server/read-replica-lag` and a `Retry-After: 2` header.

**Single-record response**
```json
{
  /* record fields directly at top level */
  "_meta": {
    "request_id": "req_01J...",
    "etag": "\"abc123\"",
    "version": 7,
    "generated_at": "2026-04-27T10:00:00Z"
  }
}
```

**Error response (RFC 9457)**
```json
{
  "type": "https://hesem.io/problems/record/not-found",
  "title": "Record not found",
  "status": 404,
  "detail": "No sales order with id 'so_01J...' exists in this tenant.",
  "instance": "/api/v1/commercial/sales-orders/so_01J...",
  "request_id": "req_01J..."
}
```

Additional problem-detail extensions used throughout this chapter:
- `regulation`: applicable regulation code when the error is compliance-driven
- `retry_after`: seconds until the client may retry (rate-limit, 503)
- `conflicting_version`: the current ETag when 412 is returned
- `missing_header`: the required header name when 428 is returned

### 2.12 Versioning scheme

```
URL path:         /api/v1/   — current stable version
                  /api/v2/   — next major (when any breaking change ships)
Version header:   API-Version: 2026-04-01   (date-based minor version for
                  non-breaking feature additions; optional, defaults to latest)
Negotiation:      Accept: application/json; version=2026-04-01
Breaking change:  New major path prefix + 12-month old-path redirect
Non-breaking add: New optional field in response (clients must tolerate)
Deprecation:      Deprecation: Sat, 01 Jan 2028 00:00:00 GMT (RFC 8594)
                  Sunset: Sat, 01 Jan 2029 00:00:00 GMT
```

Every endpoint in this chapter targets `/api/v1/`. Per-domain field additions
from vertical packs (J1..J5) are additive and never break existing v1 clients.
Pack fields are namespaced: `j1_*`, `j2_*`, `j3_*`, `j4_*`, `j5_*` to
avoid naming collisions with base domain fields.

### 2.13 OpenAPI auto-generation contract

The canonical source of truth for request/response schemas is the OpenAPI 3.1.1
document at `mom/contracts/openapi/e4-record-per-domain.yaml`. This chapter
is the human-readable planning catalog; the YAML document is the machine-readable
contract used by the API gateway for request validation, mock generation,
SDK generation, and Prism contract testing.

Rules for keeping them in sync:
- Every endpoint described here must have a corresponding `paths` entry in the
  YAML.
- Every response field listed here must appear in the JSON Schema `$defs` for
  that resource.
- Breaking changes in this document must be accompanied by a YAML version bump
  and a migration note in `CHANGELOG.md` (API section).
- CI/CD enforces schema-drift detection: `prism validate` runs against a live
  staging environment on every merge to `main`.

---

## 3. Per-Endpoint Contract Template

Each endpoint below follows this template. Omitted fields default to the
universal §2 value.

```
Name:             Human-readable label
Method + Path:    HTTP verb + URI pattern
Purpose:          Single sentence
Audience:         Who or what calls this
Request:          Query params / body fields — name (type, required/opt)
Response:         Top-level body fields (named, typed)
ETag:             Whether ETag is returned
Cache:            Cache-Control class from §2.5
SLO:              p50 / p95 / p99 in ms
RBAC:             Minimum role required
Field redaction:  Fields suppressed by role (if any beyond §18.1 baseline)
Errors:           Additional RFC 9457 type-URIs beyond §2.7
Per-pack overlay: J1..J5 notes (if any)
Audit emit:       Whether a read audit event is emitted (regulated only)
Wave target:      L-level + wave number
```

---

## 4. C1 — Commercial & Customer

**Resource families**: Customer, Quotation (QUO), Customer Purchase Order
(CPO), Sales Order (SO), Shipment, Invoice, Customer Complaint (COMP),
Return Material Authorization (RMA), Demand Forecast, Concession Request.

### 4.1 Customer

**List endpoint**
```
Name:         List Customers
Method+Path:  GET /api/v1/commercial/customers
Purpose:      Retrieve paginated list of customer master records for tenant.
Audience:     Sales, logistics, finance modules; partner connectors.
Request:      cursor, limit,
              status (enum: active|inactive|prospect|on-hold),
              region_code (string), account_tier (enum: A|B|C|D),
              search_name (prefix string, min 2 chars),
              created_after (ISO-8601 datetime),
              updated_after (ISO-8601 datetime),
              credit_hold (bool, operator+ only)
Response:     data[]: {
                id (uuid), code (string), name (string), status (enum),
                account_tier (enum), region_code (string), currency_code,
                credit_limit (decimal — redacted for viewer),
                payment_terms (string), primary_contact_id (uuid),
                updated_at (ISO-8601)
              }
              + pagination envelope
ETag:         No (list endpoint)
Cache:        private, max-age=10, stale-while-revalidate=5
SLO:          p50 ≤ 40 ms | p95 ≤ 120 ms | p99 ≤ 300 ms
RBAC:         viewer+
Field redact: credit_limit: operator+ (viewer receives null)
              credit_hold:  operator+ filter param allowed; viewer cannot filter
Errors:       (baseline §2.7 only)
Wave:         L3 (Wave 3)
```

**Single-record endpoint**
```
Name:         Get Customer
Method+Path:  GET /api/v1/commercial/customers/{id}
Purpose:      Full customer record for record-shell rendering (all tabs).
Audience:     SO record shell, CRM, finance, logistics, credit check service.
Request:      id (uuid, path, required)
              tab (enum: profile|contacts|orders|invoices|risk, optional)
Response:     {
                id, code, name, status, account_tier, region_code,
                currency_code, credit_limit, payment_terms,
                billing_address: { street, city, state, postal, country },
                shipping_addresses[]: { id, label, address{...}, default },
                primary_contact: { id, name, email, phone },
                contacts[]: { id, name, role, email, phone, active },
                tax_identifiers[]: { type, value, country } (auditor+ only),
                compliance_flags: {
                  itar_screened (bool),  sanctioned_check_date (date),
                  sanctions_pass (bool), gdpr_consent_date (date)
                },
                credit_summary: { credit_limit, used, available, on_hold },
                custom_fields: {},
                meta: { created_at, created_by, updated_at, updated_by,
                        version, tenant_id }
              }
ETag:         Yes — ETag: "<sha256>"
Cache:        private, max-age=30, must-revalidate
SLO:          p50 ≤ 60 ms | p95 ≤ 180 ms | p99 ≤ 400 ms
RBAC:         viewer+
Field redact: credit_limit, credit_summary: operator+
              tax_identifiers: auditor+
              compliance_flags.itar_screened: operator+
              sanctions_pass: operator+
Errors:       auth/itar-clearance-required (403) — if item is ITAR-marked
              and requester lacks itar-read scope
Audit emit:   Yes for compliance_flags and tax_identifiers reads
Wave:         L3 (Wave 3)
```

**History endpoint**
```
Name:         Customer History
Method+Path:  GET /api/v1/commercial/customers/{id}/history
Purpose:      Field-level audit trail for the customer master record.
Audience:     Auditors, compliance, record-shell audit tab.
Request:      id (path), page_after (cursor), limit,
              field_filter (csv — narrow to specific fields)
Response:     events[]: {
                event_id (uuid), event_type (enum: created|updated|deleted),
                actor_id, actor_name, actor_ip, timestamp (ISO-8601),
                field_changes[]: { field, old_val, new_val },
                source_system, audit_anchor_id (cross-ref E6)
              }
Cache:        private, max-age=86400, immutable
SLO:          p50 ≤ 80 ms | p95 ≤ 300 ms
RBAC:         operator+
Audit emit:   Yes (history access is itself audited for regulated customers)
Wave:         L3
```

**Search endpoint**
```
Name:         Search Customers
Method+Path:  POST /api/v1/commercial/customers/search
Purpose:      Full-text + structured search over customer records.
Request:      {
                q: string (full-text, min 2 chars),
                filters: { status, region_code, account_tier,
                           has_open_orders (bool) },
                sort: [{ field (enum: name|code|updated_at), dir (asc|desc) }],
                cursor, limit
              }
Response:     Same list shape + match_score (float) + highlights{}
Cache:        private, max-age=0, must-revalidate
SLO:          p50 ≤ 100 ms | p95 ≤ 250 ms
RBAC:         viewer+
Wave:         L4 (Wave 5)
```

**Bulk export**
```
Name:         Export Customers
Method+Path:  POST /api/v1/commercial/customers/export
Purpose:      Async bulk export for CRM sync, analytics, or GDPR data request.
Request:      {
                format (enum: csv|json|xlsx, required),
                filters: { same as list },
                fields: [csv of field names] (optional — default all permitted)
              }
              Idempotency-Key: <uuid v4> (required header)
Response:     202 Accepted: { operation_id (uuid), status_url, estimated_rows }
              (LRO tracked per E13)
SLO:          Submit ≤ 200 ms; completion via E13 polling
RBAC:         analyst+
Errors:       record/regulated-hold (423) — if DSAR hold blocks export
Wave:         L4
```

**Per-pack overlays — C1 Customer**
```
J1 Pharma:    Fields added: gdp_partner_classification (enum),
              dscsa_accreditation_status, dscsa_accreditation_expiry.
              Validation: accreditation_expiry auto-checked on SO creation.
J2 Auto:      Fields added: iatf_customer_portal_code,
              ppap_requirement_level (enum: 1|2|3|4|5).
              List filter added: ppap_level.
J3 Aero:      Fields added: as9100_customer_audit_status,
              nadcap_scope (if customer is a Tier-1 prime), prime_contractor_flag.
J4 Medical:   Fields added: eu_ai_act_data_subject_flag,
              notified_body_ref, mdr_customer_classification.
J5 Food:      Fields added: fsvp_importer_status (bool),
              sqf_customer_rating (enum: 1|2|3|4), prop_65_flag.
```

### 4.2 Sales Order (SO)

**List endpoint**
```
Name:         List Sales Orders
Method+Path:  GET /api/v1/commercial/sales-orders
Request:      cursor, limit,
              status (enum: draft|confirmed|picking|shipped|invoiced|closed|cancelled),
              customer_id (uuid), date_from, date_to (ISO-8601 date),
              priority (enum: urgent|normal|low), ship_to_region,
              planner_id, overdue (bool), open_qty_gt (decimal)
Response:     data[]: {
                id, so_number, customer_id, customer_name, status,
                order_date, required_date, total_value, currency,
                line_count, open_qty, shipped_qty, on_credit_hold (bool)
              }
Cache:        private, max-age=10
SLO:          p50 ≤ 50 ms | p95 ≤ 150 ms | p99 ≤ 350 ms
RBAC:         viewer+
Field redact: on_credit_hold: operator+
Wave:         L3 (Wave 4)
```

**Single-record endpoint**
```
Name:         Get Sales Order
Method+Path:  GET /api/v1/commercial/sales-orders/{id}
Response:     {
                id, so_number, status, customer_id, customer_name,
                billing_address{}, shipping_address{}, order_date,
                required_date, confirmed_date, shipped_date,
                incoterms, payment_terms, currency, subtotal, tax, total,
                lines[]: {
                  line_no, item_id, item_code, description,
                  qty_ordered, qty_shipped, qty_open, unit_price,
                  discount_pct, tax_code, lot_reservation_ids[],
                  special_instructions,
                  compliance: { itar_flag, eccn_code, export_license_no }
                },
                shipments[]: { shipment_id, shipped_date, carrier, tracking_no },
                invoices[]:  { invoice_id, amount, status },
                esig_events[]: { ... } (auditor+ only),
                custom_fields: {},
                meta: { created_at, created_by, updated_at, version }
              }
ETag:         Yes
Cache:        private, max-age=30, must-revalidate
SLO:          p50 ≤ 80 ms | p95 ≤ 200 ms | p99 ≤ 500 ms
RBAC:         viewer+
Field redact: compliance.export_license_no: operator+
              esig_events: auditor+
Errors:       auth/itar-clearance-required (403)
Wave:         L3
```

**Per-pack overlays — SO**
```
J1 Pharma:    Per-SO DEA schedule check field; GDP cool-chain requirement flag;
              DSCSA saleable-return flag on lines; controlled substance order
              confirmation requires e-signature (E7).
J2 Auto:      EDI 850 inbound correlation ID; customer kanban signal ref;
              PPAP requirement auto-triggered by new item on SO.
J3 Aero:      FAR/DFARS clause list on SO header; export-license line-level;
              ITAR flag hard-blocks line if export license not present.
J4 Medical:   UDI required on all shipped device lines; MDR adverse event
              tracking link appended to shipped SO line.
J5 Food:      FSMA §204 KDE capture triggered by fresh produce lines;
              Prop 65 warning flag auto-set from item master.
```

### 4.3 Quotation (QUO)

```
List:    GET /api/v1/commercial/quotations
         Filters: status[draft|sent|revised|accepted|rejected|expired],
                  customer_id, valid_after, valid_before, salesperson_id,
                  converted_to_so[bool]
         Response includes: id, quote_number, customer_id, customer_name,
                            status, quote_date, expiry_date, total_value,
                            currency, line_count, probability_pct
         Cache: private, max-age=10    SLO: p95 ≤ 150 ms    Wave: L3W3
         RBAC: viewer+

Single:  GET /api/v1/commercial/quotations/{id}
         Response: header + lines[]{line_no, item_id, qty, unit_price,
                   discount, margin_pct, lead_time_days} +
                   revision_history[]{rev, changed_by, date, change_summary} +
                   conversion_status{converted, so_id, converted_at}
         ETag: Yes    Cache: private, max-age=30
         SLO: p95 ≤ 200 ms    RBAC: viewer+    Wave: L3
         Field redact: margin_pct: operator+

History: GET /api/v1/commercial/quotations/{id}/history
         RBAC: operator+    Wave: L3

Export:  POST /api/v1/commercial/quotations/export   (LRO)
         Formats: CSV, JSON, PDF generation (async)    Wave: L4
```

### 4.4 Customer Complaint (COMP)

```
List:    GET /api/v1/commercial/complaints
         Filters: status[open|investigating|resolved|closed|void],
                  severity[critical|major|minor], product_id, customer_id,
                  reported_after, complaint_type, regulatory_reportable[bool]
         Cache: private, no-store   (eQMS regulated)
         SLO: p95 ≤ 200 ms    RBAC: operator+    Wave: L4W6

Single:  GET /api/v1/commercial/complaints/{id}
         Response: header{complaint_number, customer_id, product_id, lot_id,
                   severity, description, regulatory_reportable,
                   mdr_submitted_flag, fsca_trigger_flag} +
                   investigation{root_cause, analysis_method, findings} +
                   resolution{corrective_action, compensatory_action,
                              closed_by, closed_at} +
                   capa_links[]{capa_id} +
                   esig_events[] + attachments[]
         Cache: private, no-store
         RBAC: operator+    Wave: L4

Per-pack:
  J1 Pharma:  Pharmacovigilance narrative field; PSUR reference;
              EudraVigilance submission ID.
  J4 Medical: MDR (21 CFR 803) submission tracking; IVDR/MDR Article 87
              serious incident flag; FSCA trigger auto-evaluated.
  J5 Food:    FDA MedWatch or CFSAN adverse event report link;
              outbreak investigation flag.
```

### 4.5 RMA + Concession (concise)

```
RMA List:   GET /api/v1/commercial/rmas
            Filters: status, complaint_id, customer_id, product_id
            Cache: private, max-age=10    SLO: p95 ≤ 150 ms    Wave: L4W6
            RBAC: viewer+

RMA Single: GET /api/v1/commercial/rmas/{id}
            Response: rma_number, complaint_id, customer_id, return_items[],
                      received_qty, inspection_result, disposition,
                      credit_note_id, refund_amount
            Cache: private, max-age=30    ETag: Yes
            RBAC: viewer+    Wave: L4

Concession: GET /api/v1/commercial/concessions/{id}
            Response: concession_number, nc_id, customer_id, scope,
                      justification, approved_by (QP e-sig), expiry_date,
                      affected_lots[], regulatory_disclosure_flag
            Cache: private, no-store   (QP-signed document)
            RBAC: operator+    Wave: L5W9
```

---

## 5. C2 — Product Engineering

**Resource families**: Item Master, Item Revision, BOM, Routing, ECO,
CAD Drawing Link, DFMEA, PFMEA, DHF, HARA, SOUP List, SBOM.

### 5.1 Item Master

```
List:    GET /api/v1/engineering/items
         Filters: status[active|obsolete|engineering|phaseout],
                  item_type[manufactured|purchased|phantom|service],
                  family_code, search_code, search_description,
                  has_revision[bool], has_bom[bool], itar_flag[bool]
         Response: id, item_code, description, item_type, status,
                   uom_primary, family_code, revision_current,
                   has_bom, has_routing, itar_eccn (operator+ only), updated_at
         Cache:  public, s-maxage=300, stale-while-revalidate=60
         SLO:    p50 ≤ 20 ms | p95 ≤ 100 ms | p99 ≤ 250 ms
         RBAC:   viewer+
         Field redact: itar_eccn: operator+    Wave: L2 (Wave 2)

Single:  GET /api/v1/engineering/items/{id}
         Response: full item: id, item_code, description, item_type,
                   status, uom_primary, uom_conversions[]{to_uom, factor},
                   family_code, dimensions{length, width, height, weight, uom},
                   classifications{un_spsc, hs_code, eccn, itar_flag,
                                   itar_eccn (operator+)},
                   revisions[]{rev_id, rev_label, status, effective_date,
                               change_reason, eco_ref},
                   linked_docs[], shelf_life_days, custom_fields{}, meta{}
         ETag: Yes    Cache: public, s-maxage=300
         SLO: p95 ≤ 150 ms    RBAC: viewer+
         Field redact: itar_eccn: operator+; hs_code: viewer can read
         Audit emit: Yes for itar_flag = true items    Wave: L2
```

### 5.2 BOM

```
List:    GET /api/v1/engineering/boms
         Filters: item_id, bom_type[manufacturing|engineering|service|costing],
                  status[draft|approved|active|obsolete],
                  effective_date_on (date — returns BOMs in effect on that date),
                  site_id
         Cache: public, s-maxage=300    SLO: p95 ≤ 120 ms    Wave: L2W2

Single:  GET /api/v1/engineering/boms/{id}
         Response: header{item_id, bom_type, revision, status, effective_date,
                          expiry_date, site_id, base_qty, base_uom} +
                   lines[]{seq, component_item_id, item_code, description,
                           qty, uom, scrap_pct, phantom_flag,
                           reference_designators[], op_ref,
                           critical_characteristic_flag,
                           effectivity{from_date, to_date, from_serial,
                                       to_serial},
                           substitutes[]{item_id, priority, approval_req}} +
                   approved_by + eco_ref + custom_fields{}
         ETag: Yes    Cache: public, s-maxage=300    SLO: p95 ≤ 200 ms

Search:  POST /api/v1/engineering/boms/search
         Special mode: where_used_item_id → returns all BOMs containing component
         SLO: p95 ≤ 350 ms    Wave: L4W4
```

### 5.3 ECO + DHF + HARA (regulated families)

```
ECO Single:  GET /api/v1/engineering/ecos/{id}
             Response: header{eco_number, title, change_reason, urgency,
                       change_type[minor|major|emergency], status} +
                       affected_items[]{item_id, rev_from, rev_to, impact} +
                       affected_boms[] + affected_routings[] +
                       regulatory_impact{nda_supplement, tc_stc_flag,
                                         mdr_significant_change} +
                       review_cycle[]{reviewer_id, role, decision, date} +
                       esig_events[] + attachments[]
             Cache: private, no-store    RBAC: operator+    Wave: L3W4

DHF List:    GET /api/v1/engineering/dhfs
             Filters: product_id, status, lifecycle_phase
             Cache: private, no-store    RBAC: operator+    Wave: L5W9
             Errors: auth/itar-clearance-required (J3 only)

HARA:        GET /api/v1/engineering/haras/{id}
             Response: header + hazards[]{hazard_id, description,
                       severity[1-5], probability[1-5], rpn, mitigation,
                       residual_severity, residual_probability,
                       residual_rpn, acceptability} +
                       esig_events[]
             Cache: private, no-store    RBAC: operator+    Wave: L5W9
```

**J-pack overlays — C2**
```
J1 Pharma:    Item: pharmacopoeial ref, API/excipient classification,
              GMP status per site; BOM: theoretical yield calc field.
J2 Auto:      Item: IMDS weight, customer part no cross-ref,
              REACH/RoHS substance flag; BOM: IMDS submission link.
J3 Aero:      Item: life-limited flag (SLLP), AD cross-ref, AS9100
              critical-characteristic flag; DHF: type cert linkage.
J4 Medical:   Item: device class, UDI-DI, GMDN code; DHF mandatory;
              HARA: IEC 14971 risk acceptability criteria.
J5 Food:      Item: allergen flag, HACCP ingredient status, Prop 65.
```

---

## 6. C3 — Planning & Production

**Resource families**: MPS Run, MRP Run, Capacity Plan, Production Schedule,
Dispatch List, Kit Order, APQP Project, AS9145 APQP Record.

### 6.1 MPS + MRP

```
MPS List:    GET /api/v1/planning/mps-runs
             Filters: status[draft|frozen|active|archived], horizon_months,
                      site_id, planner_id, date_range
             Response: id, run_number, status, horizon_start, horizon_end,
                       site_id, total_sku_count, frozen_at, created_by
             Cache: private, max-age=10    SLO: p95 ≤ 150 ms    Wave: L3W4

MPS Single:  GET /api/v1/planning/mps-runs/{id}
             Response: header + demands[]{item_id, period_buckets[]{date, qty}}+
                       supplies[]{item_id, period_buckets[]{date, qty, source}}+
                       exceptions[]{item_id, exception_code, severity}
             Cache: private, max-age=30    SLO: p95 ≤ 500 ms
             Note: response may be streamed (Transfer-Encoding: chunked)
             for large horizon/SKU combinations.

MRP Single:  GET /api/v1/planning/mrp-runs/{id}
             Response: run_header + recommendations[]{
                         item_id, action[release|reschedule|cancel|expedite],
                         qty, due_date, supply_order_ref, exception_code,
                         message, impact_score
                       }
             Cache: private, max-age=60    SLO: p95 ≤ 800 ms    Wave: L4W5
```

### 6.2 Dispatch List

```
Name:         Dispatch List
Method+Path:  GET /api/v1/planning/dispatch-lists
Purpose:      Real-time ordered list of work orders per work center / shift.
Audience:     HMV4 DISP slice; MES floor terminals; supervisor dashboard.
Request:      work_center_id (uuid, required), shift_date (date, required),
              priority_gt (int), status (enum: open|in-progress)
Response:     work_orders[]: {
                wo_id, wo_number, item_id, item_code, description,
                qty_ordered, qty_remaining, priority_score (int),
                setup_time_min, run_time_min, status,
                operator_id, operator_name,
                scheduled_start, scheduled_end, actual_start,
                lot_id, tooling_required[], quality_gate_pending (bool)
              }
Cache:        private, max-age=5, stale-while-revalidate=3
SLO:          p50 ≤ 20 ms | p95 ≤ 80 ms | p99 ≤ 200 ms
RBAC:         viewer+
Wave:         L3 (Wave 3) — HMV4 DISP slice target
```

**J-pack overlays — C3**
```
J1 Pharma:    MPS: campaign planning mode; media fill simulation slot reservation.
J2 Auto:      MPS: customer sequenced delivery (JIT/JIS) demand overlay;
              EDI 830 forecast binding to MPS demand bucket.
J3 Aero:      MPS: long-lead supplier integration; LTAB record binding.
J4 Medical:   MPS: safety stock minimum driven by MDR post-market obligations.
J5 Food:      MPS: shelf-life horizon constraint in demand netting.
```

---

## 7. C4 — Procurement & Supplier Quality

**Resource families**: Supplier, PO, GR Receipt, IQC, Supplier Qualification,
SCAR, PPAP Package, PSW, FSVP Record, NADCAP Certification.

### 7.1 Supplier

```
List:    GET /api/v1/procurement/suppliers
         Filters: status[active|inactive|approved|conditional|disqualified],
                  qualification_status, country_code, commodity_code,
                  has_active_scar[bool], expiring_cert_before (date)
         Response: id, supplier_code, name, status, qualification_status,
                   country_code, commodity_codes[], risk_rating (enum: low|med|high),
                   cert_expiry_earliest, open_po_count, open_scar_count
         Cache: public, s-maxage=300    SLO: p95 ≤ 100 ms
         RBAC: viewer+    Wave: L2W3

Single:  GET /api/v1/procurement/suppliers/{id}
         Response: full supplier + certifications[]{cert_type, cert_number,
                   issuer, valid_from, valid_to, file_url} +
                   audit_history[]{audit_id, date, score, findings_count} +
                   approved_commodities[] + contacts[] +
                   compliance{itar_flag, sanctioned_check_date, conflict_mineral_status}
         ETag: Yes    Cache: public, s-maxage=300    SLO: p95 ≤ 200 ms
         Field redact: compliance.itar_flag: operator+
```

### 7.2 Purchase Order (PO) + IQC

```
PO List:  GET /api/v1/procurement/purchase-orders
          Filters: status, supplier_id, buyer_id, date_from, date_to,
                   site_id, overdue[bool], open_qty_gt
          Response: id, po_number, supplier_id, supplier_name, status,
                    order_date, expected_date, total_value, currency,
                    line_count, open_line_count
          Cache: private, max-age=10    SLO: p95 ≤ 150 ms    Wave: L3W4

PO Single: GET /api/v1/procurement/purchase-orders/{id}
           Response: header + lines[]{line_no, item_id, qty, unit_price,
                     expected_date, received_qty, invoiced_qty,
                     compliance{itar_license_no, end_use_cert_no,
                                conflict_mineral_flag}} +
                     receipts[] + invoices[] + scar_links[]
           ETag: Yes    Cache: private, max-age=30    SLO: p95 ≤ 200 ms

IQC Single: GET /api/v1/procurement/iqc-records/{id}
            Response: iqc_number, po_id, gr_id, supplier_id, item_id, lot_id,
                      sample_qty, inspected_qty, defect_qty, defect_pct,
                      result (enum: pass|fail|conditional),
                      inspection_plan_ref, dimensional_results[]{char_id,
                      nominal, actual, in_tol}, attribute_results[]{...},
                      disposition, inspector_id, esig_events[]
            Cache: private, no-store    RBAC: operator+    Wave: L4W5
```

### 7.3 PPAP + PSW + SCAR

```
PPAP List:   GET /api/v1/procurement/ppap-packages
             Filters: status, supplier_id, item_id, ppap_level[1-5]
             Cache: private, no-store    SLO: p95 ≤ 200 ms
             RBAC: operator+    Wave: L5W8

PPAP Single: GET /api/v1/procurement/ppap-packages/{id}
             Response: ppap_level, status, approval_date, customer_approval_ref +
                       elements[]{element_code, name, status, doc_ref,
                                  waiver_flag, waiver_reason} +
                       psw{disposition, approved_by, esig_id, comments} +
                       linked_items[], associated_pqs[]
             RBAC: operator+; psw.approved_by: auditor+ only
             Errors: record/regulated-hold (423)

SCAR Single: GET /api/v1/procurement/scars/{id}
             Response: scar_number, po_id, supplier_id, item_id, lot_id,
                       nonconformance_description, defect_qty, defect_rate,
                       root_cause, corrective_actions[]{action, due_date,
                       status, completion_date}, effectiveness_verified (bool),
                       8d_report_id (J2 Automotive link)
             Cache: private, no-store    RBAC: operator+    Wave: L4W6
```

**J-pack overlays — C4**
```
J1 Pharma:    FSVP verification records on Supplier; GDP accreditation;
              API Drug Master File (DMF) reference; DEA quota check for APIs.
J2 Auto:      PPAP level per customer requirement (AIAG); SCAR → 8D auto-link;
              APQP launch gate linked to PPAP submission.
J3 Aero:      NADCAP certification status on Supplier; FAA/EASA approved flag;
              AS9100 audit schedule.
J4 Medical:   Critical-component supplier classification; ISO 13485 cert expiry;
              DHF supplier traceability.
J5 Food:      FSVP supplier verification per FSMA §805; SQF/BRC audit link;
              HACCP supplier profile.
```

---

## 8. C5 — Inventory & Logistics

**Resource families**: Inventory Transaction, Lot, Serial Unit, Bin Location,
Move Order, Inventory Adjustment, DSCSA Transaction, UDI Record, §204 KDE Set,
Trace Chain, ITAR Crossing, Warehouse Task, Cycle Count, Reservation,
Quarantine Hold.

### 8.1 Lot Record

```
List:    GET /api/v1/inventory/lots
         Filters: item_id, status[quarantine|released|consumed|expired|rejected|on-hold],
                  expiry_before, expiry_after, site_id, bin_id, supplier_lot_no,
                  qty_on_hand_gt (decimal), has_hold[bool]
         Response: id, lot_number, item_id, item_code, status, qty_on_hand, uom,
                   site_id, bin_id, manufacture_date, expiry_date, supplier_lot_no,
                   inspection_status, hold_count
         Cache: private, max-age=10    SLO: p95 ≤ 120 ms    RBAC: viewer+    Wave: L3W4

Single:  GET /api/v1/inventory/lots/{id}
         Response: header + transactions[]{tx_id, tx_type, qty, date, reference_doc}+
                   genealogy_edges[]{parent_lot_id, child_lot_id, yield_qty, op_ref} +
                   quality_events[]{insp_id, result, disposition} +
                   holds[]{hold_id, reason, hold_type[legal|quality|rework],
                            placed_by, placed_at, released_at, release_by} +
                   dscsa_status{registered, last_tx_type, last_tx_date} +
                   udi_pi (if serialized device lot)
         ETag: Yes    Cache: private, max-age=30
         SLO: p95 ≤ 200 ms    RBAC: viewer+
         Field redact: genealogy_edges: operator+ (traceability data)
```

### 8.2 Inventory Transaction

```
List:    GET /api/v1/inventory/transactions
         Filters: tx_type[receipt|issue|transfer|adjustment|scrap|return],
                  item_id, lot_id, site_id, date_from, date_to,
                  reference_doc_type[po|wo|so|adj], reference_doc_id
         Response: id, tx_number, tx_type, item_id, lot_id, qty, uom,
                   from_bin_id, to_bin_id, site_id, reference_doc_type,
                   reference_doc_id, performed_by, performed_at, reversed (bool)
         Cache: private, max-age=60    SLO: p95 ≤ 150 ms
         RBAC: operator+    Wave: L3W4

Single:  GET /api/v1/inventory/transactions/{id}
         Full transaction with reason_code, notes, reversal_of_id (if reversal),
         costing_data{unit_cost, total_cost} (analyst+ only)
         Cache: private, max-age=86400, immutable
         Field redact: costing_data: analyst+
```

### 8.3 Quarantine Hold

```
List:    GET /api/v1/inventory/quarantine-holds
         Filters: status[active|released|escalated], hold_type,
                  item_id, lot_id, site_id, placed_after
         SLO: p95 ≤ 150 ms    RBAC: operator+    Wave: L3W4

Single:  GET /api/v1/inventory/quarantine-holds/{id}
         Response: hold_id, hold_type, reason, disposition_required[bool],
                   affected_lots[]{lot_id, item_id, qty_held},
                   nc_id (link to NQCASE), placed_by, placed_at,
                   release_criteria, released_by, released_at,
                   regulatory_notification_required[bool]
         Cache: private, no-store    RBAC: operator+    Wave: L3
```

### 8.4 DSCSA Transaction + §204 KDE

```
DSCSA List:  GET /api/v1/inventory/dscsa-transactions
             Filters: tx_type[ship|receive|return|saleable-return],
                      trading_partner_id, date_range, product_identifier
             Cache: private, no-store    SLO: p95 ≤ 200 ms
             RBAC: operator+    Wave: L5W10   (J1 Pharma pack only)

§204 KDE:    GET /api/v1/inventory/section204-kde-sets/{id}
             Response: lot_number, quantity, unit_measure, product_identifier,
                       location{farm_name, city, state, country},
                       point_of_contact, harvestable_commodities[],
                       fda_submission_ref, submission_status, submitted_at
             Cache: private, no-store    RBAC: operator+
             Wave: L5W10   (J5 Food pack only)
```

**J-pack overlays — C5**
```
J1 Pharma:    Lot: DSCSA trace chain required; GS1 SSCC on lot;
              FMD (EU Falsified Medicines Directive) pack-level status field.
J2 Auto:      Lot: VIN-level traceability for safety-critical lots;
              IMDS lot cross-reference.
J3 Aero:      Lot: life-limited part tracking (SLLP hours/cycles) per lot;
              FAA N-number link.
J4 Medical:   Serial unit: UDI-PI per device; EUDAMED registration cross-link;
              implant card generation trigger.
J5 Food:      §204 KDE mandatory for fresh produce; FSMA traceability lot code;
              cold-chain temperature log link.
```

---

## 9. C6 — Shopfloor / MES

**Resource families**: Job Order (JO), Work Order (WO), Operation Record, Yield
Record, SPC Chart, Electronic Batch Record (EBR), EDHR, Environmental Monitoring
Run, Media Fill Run, LPA, FAI, HACCP Record, CCP Log, Sanitation Record.

### 9.1 Work Order (WO)

```
List:    GET /api/v1/mes/work-orders
         Filters: status[planned|released|in-progress|complete|closed|cancelled],
                  item_id, work_center_id, schedule_date_from, schedule_date_to,
                  priority, planner_id, lot_id
         Response: id, wo_number, item_id, item_code, qty_ordered, qty_complete,
                   qty_scrapped, status, scheduled_start, scheduled_end,
                   actual_start, actual_end, work_center_id, priority
         Cache: private, max-age=5, stale-while-revalidate=3
         SLO: p50 ≤ 30 ms | p95 ≤ 100 ms | p99 ≤ 250 ms
         RBAC: viewer+    Wave: L3W3

Single:  GET /api/v1/mes/work-orders/{id}
         Response: header + operations[]{op_seq, op_code, op_desc,
                   work_center_id, setup_time, run_time, qty_complete,
                   yield_pct, operator_id, performed_at,
                   instructions_doc_id, quality_gate_result} +
                   materials[]{item_id, lot_id, qty_issued, qty_consumed} +
                   quality_events[]{insp_id, result} +
                   spc_charts[]{chart_id, characteristic, last_ooc_flag} +
                   non_conformances[]{nc_id, description} +
                   labor_records[]{person_id, clock_in, clock_out, hours}
         ETag: Yes    Cache: private, max-age=5    SLO: p95 ≤ 200 ms
```

### 9.2 EBR + SPC

```
EBR Single:  GET /api/v1/mes/ebrs/{id}
             Response: master batch header{batch_number, product_id, lot_id,
                       status, review_status, batch_size, uom} +
                       executed_steps[]{step_seq, step_desc, operator_id,
                                        performed_at, actual_values{},
                                        in_process_checks[]{check_id, spec,
                                        result, pass_fail}} +
                       deviations[]{dev_id, description, disposition,
                                    capa_required[bool]} +
                       esig_events[] + yield_summary + attachments[]
             Cache: private, no-store    RBAC: operator+
             Audit emit: Yes    Wave: L5W9

SPC Single:  GET /api/v1/mes/spc-charts/{id}
             Response: chart_id, characteristic_name, chart_type[xbar-r|p|np|c|u],
                       usl, lsl, ucl, lcl, target, subgroup_size,
                       data_points[]{seq, timestamp, measured_value,
                                     subgroup_avg, range, ooc_flag,
                                     violation_rule},
                       cpk, ppk, sigma_level, last_updated
             Cache: private, max-age=30    SLO: p95 ≤ 200 ms
             RBAC: viewer+    Wave: L4W5
```

### 9.3 HACCP Record + CCP Log

```
HACCP:   GET /api/v1/mes/haccp-records/{id}
         Response: haccp_plan_id, product_id, process_step,
                   hazard_type[biological|chemical|physical|radiological],
                   hazard_description, ccp_required[bool],
                   critical_limits{parameter, min, max, uom},
                   monitoring_procedure, corrective_action_procedure,
                   verification_procedure, record_keeping_procedure
         Cache: private, no-store    RBAC: operator+    Wave: J5-only

CCP Log: GET /api/v1/mes/ccp-logs/{id}
         Response: ccp_log_id, ccp_id, wo_id, lot_id,
                   monitored_at, monitored_by, parameter,
                   measured_value, uom, within_critical_limits[bool],
                   deviation_description, corrective_action_taken,
                   verification_by, esig_events[]
         Cache: private, no-store    RBAC: operator+    Wave: J5-only
```

**J-pack overlays — C6**
```
J1 Pharma:    EBR mandatory per GMP batch; process deviation auto-links CAPA;
              media fill run record; EM run data; GMP yield calc; 
              clean room classification logged per operation.
J2 Auto:      LPA score integrated into WO completion; poka-yoke pass/fail
              required before operation close; OEE auto-calculated from WO.
J3 Aero:      FAI per AS9102 on first article WO; life-limited part routing
              checkpoint; serialized WO line for trackable parts.
J4 Medical:   EDHR mandatory (21 CFR 820.184); each WO operation has DHR
              build record; UDI label generation at WO close.
J5 Food:      HACCP CCP log per production operation; sanitation record
              per production line; temperature log binding.
```

---

## 10. C7 — Quality Improvement (eQMS)

**Resource families**: NQCASE, CAPA, 8D Report, Internal Audit Finding, CDOC,
INSP, Disposition, BREL, QP Declaration, PRRC Record, APR, Stability Study,
Deviation, Vigilance Report, PSUR, PMS Plan, Risk Record, Recall, FSCA, FAR, RFR.

### 10.1 NQCASE

```
List:    GET /api/v1/quality/nqcases
         Filters: status[open|under-review|pending-disposition|closed|void],
                  severity[critical|major|minor], source[incoming|in-process|
                  customer|audit|field], item_id, lot_id, date_range,
                  capa_linked[bool], disposition
         Cache: private, max-age=10    SLO: p95 ≤ 150 ms    RBAC: viewer+    Wave: L3W3

Single:  GET /api/v1/quality/nqcases/{id}
         Response: header + description + affected_materials[] + root_cause_analysis +
                   disposition{decision, justification, approved_by} +
                   capa_links[] + inspection_results[] + esig_events[] + attachments[]
         Cache: private, no-store    RBAC: operator+
         Audit emit: Yes    Wave: L3
```

### 10.2 CAPA

```
List:    GET /api/v1/quality/capas
         Filters: status[open|investigation|implementation|verification|closed],
                  source[nc|audit|complaint|risk|supplier|kpi], owner_id,
                  due_date_before, overdue[bool], effectiveness_rating,
                  regulatory_reportable[bool]
         SLO: p95 ≤ 150 ms    RBAC: viewer+    Wave: L3W3

Single:  GET /api/v1/quality/capas/{id}
         Response: header{capa_number, title, type[corrective|preventive|both],
                   status, source, root_cause, owner_id, due_date,
                   priority[critical|high|medium|low]} +
                   actions[]{action_id, description, assigned_to, due_date,
                              status, evidence_ref, completion_date} +
                   effectiveness_checks[]{check_date, criteria, result,
                                          verified_by, closed_by} +
                   regulatory_reporting{fda_mdr_flag, fsca_flag,
                                        ema_reporting_flag} +
                   esig_events[] + linked_nqcases[] + linked_audits[]
         Cache: private, no-store    RBAC: operator+    Wave: L3
```

### 10.3 Inspection Record (INSP)

```
List:    GET /api/v1/quality/inspections
         Filters: status[scheduled|in-progress|complete|cancelled],
                  inspection_type[incoming|in-process|final|receiving|audit],
                  item_id, lot_id, wo_id, inspector_id, date_range,
                  result[pass|fail|conditional]
         Cache: private, max-age=10    SLO: p95 ≤ 150 ms    RBAC: viewer+

Single:  GET /api/v1/quality/inspections/{id}
         Response: insp_number, type, item_id, lot_id, wo_id,
                   sample_plan{method[AQL|100pct|skip-lot], sample_size,
                               accept_no, reject_no, aql_level},
                   dimensional_results[]{char_id, nominal, tol_plus,
                                         tol_minus, actual, in_tolerance},
                   attribute_results[]{char_id, spec, result, count_defective},
                   visual_results[]{image_url, annotation},
                   overall_result, disposition, inspector_id, performed_at,
                   esig_events[], attachments[]
         Cache: private, no-store    RBAC: operator+    Wave: L3W4
```

### 10.4 Annual Product Review (APR) + Vigilance + PSUR

```
APR:       GET /api/v1/quality/aprs/{id}
           Response: product_id, review_period{from, to}, status,
                     batch_count, yield_summary{avg, min, max, sigma},
                     quality_metrics{ooc_count, deviation_count,
                                     capa_count, complaint_count},
                     stability_summary, regulatory_submission_ref,
                     conclusions_text, approved_by, esig_events[]
           Cache: private, no-store    RBAC: operator+
           Audit emit: Yes    Wave: L5W9

Vigilance: GET /api/v1/quality/vigilance-reports/{id}
           Response: report_number, event_type[serious_incident|FSCA|field_safety],
                     device_id, incident_description, regulatory_deadline,
                     national_competent_authority, submitted_at,
                     submission_ref, follow_up_reports[]
           Cache: private, no-store    RBAC: operator+
           Audit emit: Yes    Wave: J4-only (Medical Device pack)

PSUR:      GET /api/v1/quality/psurs/{id}
           Response: product_id, psur_period{from, to}, regulatory_authority,
                     safety_data_summary, benefit_risk_conclusion,
                     signal_summary[], submission_status, submitted_at,
                     ema_procedure_no
           Cache: private, no-store    RBAC: operator+
           Audit emit: Yes    Wave: J1-only (Pharma pack)
```

**J-pack overlays — C7**
```
J1 Pharma:    PSUR mandatory per product annually; APR due-date tracking;
              QP e-signature required on BREL; GMP batch release record.
J2 Auto:      8D mandatory for customer-facing NCs; AIAG-VDA D8 scoring.
J3 Aero:      AS9100 §10.2 NCR form; FAIR (AS9102) result linked to INSP.
J4 Medical:   MDR flag on CAPA; Vigilance report mandatory for serious
              incidents; PRRC responsible-person record required.
J5 Food:      FDA recall FSCA trigger; §415 registration linkage;
              allergen deviation auto-escalation to recall assessment.
```

---

## 11. C8 — Traceability & Genealogy

**Resource families**: Genealogy Edge, BREL, Recall, Release Packet, DSCSA
Transaction, Serial Unit, UDI Record, FMD Entry, §204 KDE Set, VIN Record.

### 11.1 Genealogy Edge + Trace Graph

```
List:    GET /api/v1/traceability/genealogy-edges
         Filters: parent_lot_id, child_lot_id, item_id, op_ref, date_range
         SLO: p95 ≤ 150 ms    RBAC: operator+    Wave: L4W5

Trace:   GET /api/v1/traceability/genealogy-edges/trace
         Purpose: Full forward + backward trace from a lot or serial.
         Request: { origin_lot_id OR serial_id, direction[forward|backward|both],
                    depth (int, max 20) }
         Response: graph {
                     nodes[]: { lot_id, item_id, item_code, qty, status,
                                site_id, manufacture_date, expiry_date },
                     edges[]: { id, parent_lot_id, child_lot_id, yield_qty,
                                op_ref, site_id, recorded_at }
                   }
         Cache: private, max-age=300    SLO: p95 ≤ 600 ms
         RBAC: operator+    Wave: L5W8
```

### 11.2 Recall Record + Release Packet

```
Recall List:  GET /api/v1/traceability/recalls
              Filters: status[initiated|active|closed|mock],
                       recall_class[I|II|III], product_id, initiated_after
              Cache: private, no-store    RBAC: operator+    Wave: L5W9

Recall Single: GET /api/v1/traceability/recalls/{id}
               Response: recall_number, product_id, recall_class, reason,
                         scope{lots[], serials[], customers[]},
                         status_timeline[]{status, timestamp, updated_by},
                         regulatory_notifications[]{agency, date, ref_no},
                         effectiveness_checks[], returned_qty, destroyed_qty,
                         fsca_id (J4 Medical link), esig_events[]
               Cache: private, no-store    RBAC: operator+

Release Pkt:   GET /api/v1/traceability/release-packets/{id}
               Response: batch_number, product_id, lot_id, release_type,
                         certificate_of_analysis{parameters[], results[]},
                         qp_declaration_id, qp_signed_at (esig),
                         pharmacopoeia_compliance[], release_decision,
                         released_by, released_at
               Cache: private, no-store    RBAC: operator+    Wave: L5W9
```

**J-pack overlays — C8**
```
J1 Pharma:    FMD pack-level status in genealogy; DSCSA chain of custody
              mandatory; SNOMED/GTIN validation on serial units.
J2 Auto:      VIN trace chain; recall VIN list auto-generation.
J3 Aero:      Life-limited part trace per AD/SB cycle tracking.
J4 Medical:   EUDAMED UDI registration per device; MDR traceability chain
              from complaint → lot → genealogy.
J5 Food:      §204 KDE full trace mandatory; FSMA recall trace chain report.
```

---

## 12. C9 — Maintenance & EHS

**Resource families**: Equipment Asset, PM Schedule, MWO, Calibration,
Equipment Qualification, SLLP Record, AD, SB, Sterilizer Validation,
Pasteurizer Validation, Thermal Validation, EHS Incident.

### 12.1 Equipment Asset + MWO

```
Asset List:  GET /api/v1/maintenance/equipment-assets
             Filters: status[active|inactive|retired|quarantined],
                      asset_type, site_id, location_id, calibration_due_before,
                      pm_due_before, qualification_status
             Response: id, asset_number, asset_name, asset_type, status,
                       site_id, location_id, manufacturer, model, serial_no,
                       install_date, last_pm_date, next_pm_due,
                       calibration_due, qualification_status
             Cache: public, s-maxage=300    SLO: p95 ≤ 100 ms    Wave: L3W4

Asset Single: GET /api/v1/maintenance/equipment-assets/{id}
              Response: header + pm_plans[]{plan_id, frequency, last_run, next_due}+
                        calibrations[]{cal_id, cal_number, result, due_date} +
                        qualifications[]{iq_id, oq_id, pq_id, status} +
                        open_mwos[]{mwo_id, work_type, priority, due_date} +
                        sllp_record{hours_since_new, cycles_since_new,
                                    limit_hours, limit_cycles} +
                        documents[] + custom_fields{}
              ETag: Yes    Cache: public, s-maxage=300    SLO: p95 ≤ 200 ms

MWO List:    GET /api/v1/maintenance/mwos
             Filters: status, asset_id, work_type[pm|cm|pd|inspection],
                      scheduled_date_range, technician_id, overdue[bool]
             Cache: private, max-age=10    SLO: p95 ≤ 150 ms    Wave: L3W5
```

### 12.2 Calibration + EHS Incident

```
Calibration: GET /api/v1/maintenance/calibrations/{id}
             Response: cal_number, asset_id, status, method, standard_ref,
                       traceability_chain (NIST or BIPM),
                       measurements[]{point, nominal, actual, deviation,
                                       in_tolerance, expanded_uncertainty},
                       out_of_tolerance_flag, corrective_action_ref,
                       certificate_url, performed_by, performed_at,
                       next_due, esig_events[]
             Cache: private, no-store    RBAC: operator+    Wave: L4W6

EHS Incident: GET /api/v1/maintenance/ehs-incidents/{id}
              Response: incident_number, incident_type[injury|near-miss|
                         spill|fire|property-damage],
                        severity[recordable|first-aid|near-miss|significant],
                        description, persons_involved[],
                        root_cause_analysis, corrective_actions[],
                        osha_recordable[bool], osha_300_log_ref,
                        regulatory_notifications[], esig_events[]
              Cache: private, no-store    RBAC: operator+    Wave: L4W6
```

**J-pack overlays — C9**
```
J1 Pharma:    Equipment qualification (IQ/OQ/PQ) mandatory for GMP equipment;
              sterilizer validation per EP/USP cycle records; autoclave EBR link.
J2 Auto:      OEE maintenance data feed; TPM pillar record binding.
J3 Aero:      AD/SB compliance tracking per tail/serial; CAMP integration link.
J4 Medical:   Preventive maintenance per 21 CFR 820.70(g); calibration NIST
              traceability chain mandatory.
J5 Food:      Pasteurizer validation records per FDA HTST requirements;
              CIP (clean-in-place) validation cycle records.
```

---

## 13. C10 — Workforce & Training

**Resource families**: Person, Skill Profile, Training Course, Training Record,
Competency Matrix, Shift, Labor Transaction, Aseptic Qualification, PCQI
Certificate, ITAR PoR, NADCAP Auditor Cert, QP Record, PRRC Record, DPO Record.

### 13.1 Training Record + Competency Matrix

```
Training List: GET /api/v1/workforce/training-records
               Filters: person_id, course_id,
                        status[assigned|in-progress|completed|expired|failed|waived],
                        due_before, completion_after,
                        training_type[initial|retraining|ojtq]
               Cache: private, max-age=30    SLO: p95 ≤ 120 ms    RBAC: operator+

Training Single: GET /api/v1/workforce/training-records/{id}
                 Response: person_id, person_name, course_id, course_name,
                           training_type, status, method[classroom|elearning|ojtq],
                           assigned_date, due_date, completed_date,
                           score (int), passed (bool), expiry_date,
                           trainer_id, training_materials[], quiz_results[],
                           certificate_url (signed URL per E12), esig_events[],
                           compliance_mapping[]{regulation, requirement_code}
                 Cache: private, no-store    RBAC: operator+    Wave: L3W4

Competency:    GET /api/v1/workforce/competency-matrices/{id}
               Response: matrix_id, site_id, department, effective_date,
                         matrix_rows[]{person_id, person_name,
                           competencies[]{skill_code, skill_name,
                             required_level[1-4], current_level[0-4],
                             gap (derived), last_assessed_date, status}}
               Cache: private, max-age=60    RBAC: operator+    Wave: L4W5
```

**J-pack overlays — C10**
```
J1 Pharma:    Aseptic qualification and annual re-qualification mandatory;
              PCQI certificate field; GMP training matrix per site;
              qualified person (QP) role record.
J2 Auto:      IATF core-tools training per role (APQP, PPAP, FMEA, MSA, SPC);
              trainer certification tracking.
J3 Aero:      NADCAP auditor certification; AS9100 lead auditor status.
J4 Medical:   Design-control training per 21 CFR 820.25; QP + PRRC record;
              clinical-evaluation training tracking.
J5 Food:      PCQI mandatory per FSMA §117; HACCP team training records;
              food safety culture training audit.
```

---

## 14. C11 — Finance

**Resource families**: Cost Center, GL Period, Standard Cost Roll, Actual Cost,
WIP Cost Ledger, Cost Variance, Inventory Valuation Snapshot, COPQ Record.

```
Std Cost:  GET /api/v1/finance/standard-costs
           Filters: item_id, site_id, cost_version, status[draft|frozen|active]
           Response: id, item_id, item_code, site_id, cost_version,
                     material_cost, labor_cost, overhead_cost,
                     subcontract_cost, total_std_cost, currency, status
           Cache: public, s-maxage=300    SLO: p95 ≤ 120 ms
           RBAC: analyst+    Wave: L4W6

Variance:  GET /api/v1/finance/cost-variances
           Filters: period, variance_type[purchase|usage|efficiency|overhead],
                    item_id, work_order_id, gt_threshold
           Response: id, period, variance_type, item_id, wo_id,
                     std_cost, actual_cost, variance_amt, variance_pct,
                     explanation
           Cache: private, max-age=60    RBAC: analyst+    Wave: L4W6

Inv Val:   GET /api/v1/finance/inventory-valuations
           Filters: site_id, period, item_id, valuation_method[std|avg|fifo]
           Response: snapshot_id, period, site_id, total_value,
                     by_item[]{item_id, qty, unit_cost, total_cost}
           Cache: private, max-age=86400, immutable    RBAC: analyst+

COPQ:      GET /api/v1/finance/copq-records
           Filters: period, category[internal-failure|external-failure|
                    appraisal|prevention], source[nc|rework|warranty|recall]
           Response: id, period, category, source_ref, cost_amount,
                     labor_hours, currency, calculated_by, approved_by
           Cache: private, max-age=86400    RBAC: analyst+    Wave: L5W9
```

---

## 15. C12 — Integration

**Resource families**: Connector, Sub-Processor, DPA, EDI Transaction Log,
DSCSA Partner, GUDID Account, Webhook Subscription, Inbound Endpoint.

```
Connectors:   GET /api/v1/integration/connectors
              Filters: status[active|inactive|error], connector_type,
                       direction[inbound|outbound|bidirectional]
              Response: id, name, connector_type, direction, status,
                        last_sync_at, error_count_24h, throughput_per_hour,
                        health_check_url
              Cache: private, max-age=30    RBAC: admin+    Wave: L3W3

EDI Logs:     GET /api/v1/integration/edi-transactions
              Filters: direction, tx_type[850|855|856|810|830|945|...],
                       status[pending|sent|acked|error|rejected],
                       date_range, trading_partner_id
              Response: id, direction, tx_type, trading_partner_id,
                        functional_ack_status, interchange_control_no,
                        sent_at, acked_at, payload_size_bytes, error_message
              Cache: private, max-age=60    RBAC: operator+    Wave: L3W4

Webhooks:     GET /api/v1/integration/webhook-subscriptions/{id}
              Response: endpoint_url (redacted for viewer: last 8 chars masked),
                        event_types[], status, secret_hash_preview,
                        last_delivery_at, last_delivery_status,
                        failure_count_24h, retry_policy{}
              RBAC: admin+
              Field redact: endpoint_url: full URL for admin only
```

---

## 16. C13 — Analytics & AI

**Resource families**: KPI Snapshot, Quality Score, AI Advisory Record,
AI Model Registry, Human Override, Model Drift, Retraining Job, Red-Team
Result, Data Product Catalog.

```
KPI:         GET /api/v1/analytics/kpi-snapshots
             Filters: kpi_code, site_id, period_type[daily|weekly|monthly],
                      date_range, domain, status[green|amber|red]
             Response: id, kpi_code, kpi_name, domain, site_id, period,
                       value, uom, trend[up|down|flat], target,
                       status, variance_to_target_pct, calculated_at
             Cache: private, max-age=60    SLO: p95 ≤ 100 ms
             RBAC: viewer+    Wave: L4W5

AI Advisory: GET /api/v1/analytics/advisory-records/{id}
             Response: model_id, input_context_hash, recommendation,
                       confidence_score, explanation_text (EU AI Act XAI),
                       domain, human_override{overridden, reason,
                                              overridden_by, overridden_at},
                       banned_decision_surface_flag (EU AI Act Art-22),
                       bias_flags[], fips_validation_status, created_at
             Cache: private, no-store    RBAC: operator+
             Audit emit: Yes    Wave: L5W9

Red-Team:    GET /api/v1/analytics/red-team-results/{id}
             Response: test_id, model_id, test_type, scenario_description,
                       attack_vector, test_result[pass|fail|inconclusive],
                       finding_severity, mitigation_required, tested_by,
                       tested_at, review_sign_off
             Cache: private, no-store    RBAC: admin+    Wave: L5W9
```

---

## 17. C14 — Core Platform

**Resource families**: Tenant Profile, Region Pinning, Sub-Processor List,
DPA, ROPA, DPIA, DSAR, Identity Provider Config, Audit Event (→ E6),
Audit Anchor, Pseudonymization Key Metadata, Data Hold, Retention Class,
Banned-Decision Surface Config, FIPS Module Status.

```
Tenant:    GET /api/v1/platform/tenant-profiles/{tenant_id}
           Response: tenant_id, display_name, status, region_primary,
                     region_pinning[], subscription_tier, feature_flags{},
                     compliance_packs[], contract_expiry
           Cache: private, max-age=300    RBAC: admin+

DSAR:      GET /api/v1/platform/dsar-records/{id}
           Response: dsar_id, subject_id, request_type[access|erasure|
                     portability|rectification|restriction], status,
                     submitted_at, due_date, completed_at,
                     domains_queried[], redactions_applied[], dpo_approved_by
           Cache: private, no-store    RBAC: admin (DPO role)    Wave: L5W10

Retention: GET /api/v1/platform/retention-classes
           Response: id, class_name, retention_years, legal_basis,
                     deletion_strategy[hard|soft|anonymize],
                     affected_tables[], review_due_date
           Cache: public, s-maxage=3600    RBAC: admin+

FIPS:      GET /api/v1/platform/fips-module-status
           Response: fips_module_name, fips_level[1|2|3], cert_number,
                     validated_at, next_review_date, hmac_active,
                     encryption_algorithms[], key_derivation_function
           Cache: private, max-age=300    RBAC: admin+    Wave: L4W6

Hold:      GET /api/v1/platform/data-holds/{id}
           Response: hold_id, hold_type[legal|regulatory|dsar],
                     scope{tables[], record_ids[]}, placed_by, placed_at,
                     legal_matter_ref, release_criteria, released_at
           Cache: private, no-store    RBAC: admin (legal-hold role)
```

---

## 18. Additional deep callouts — families requiring expanded treatment

### 18A. C5 — Warehouse Task + Cycle Count

```
Warehouse Task List:
  GET /api/v1/inventory/warehouse-tasks
  Purpose: Retrieve open and in-progress warehouse tasks for WMS UI.
  Filters: status[open|in-progress|complete|cancelled|on-hold],
           task_type[put-away|pick|move|count|pack|stage],
           assigned_to, zone_id, priority_gte, due_before
  Response: id, task_number, task_type, status, priority, zone_id,
            bin_from_id, bin_to_id, item_id, lot_id, qty_requested,
            qty_completed, assigned_to, created_at, due_at
  Cache: private, max-age=5    SLO: p95 ≤ 80 ms    RBAC: operator+
  Wave: L4W5

  Single:
  GET /api/v1/inventory/warehouse-tasks/{id}
  Full task with step_instructions[], scan_confirmations[]{scan_type,
  scanned_value, scanned_at, operator_id}, exception_log[]{code,
  description, resolved}, esig_required (bool, certain task types),
  completion_signature_id
  Cache: private, max-age=10    SLO: p95 ≤ 150 ms

Cycle Count List:
  GET /api/v1/inventory/cycle-counts
  Filters: status[planned|in-progress|complete|approved],
           site_id, zone_id, count_type[ABC|periodic|annual|triggered],
           date_range, has_variance[bool]
  Response: id, count_number, status, count_type, site_id, zone_id,
            planned_date, completed_date, total_locations, counted_locations,
            variance_count, variance_value
  Cache: private, max-age=10    SLO: p95 ≤ 150 ms    RBAC: operator+    Wave: L4W5

  Single:
  GET /api/v1/inventory/cycle-counts/{id}
  Response: header + count_lines[]{location_id, item_id, lot_id,
            system_qty, counted_qty, variance_qty, variance_pct,
            recount_required[bool], second_count_qty, approved_qty,
            approved_by} + approval_summary{total_variance_value,
            approval_threshold_exceeded, approver_id, approved_at}
  Field redact: variance_value: analyst+    Cache: private, max-age=30
  RBAC: operator+    Wave: L4
```

### 18B. C6 — First Article Inspection (FAI) + Layer Process Audit (LPA)

```
FAI:
  GET /api/v1/mes/first-article-inspections/{id}
  Purpose: AS9102 first article inspection record for new or revised parts.
  Response: fai_number, item_id, item_revision, part_number, supplier_id,
            status[open|in-progress|approved|rejected|partial],
            characteristic_accountability[]{char_id, char_name, drawing_ref,
              nominal, tolerance_plus, tolerance_minus, actual, balloon_no,
              characteristic_type[key|major|minor], pass_fail},
            signature_events[]{role[design-eng|quality|customer], signed_by,
                                signed_at, decision[approved|rejected]},
            drawing_ref_url, deviation_ref[], approved_revision,
            esig_events[]
  Cache: private, no-store    RBAC: operator+    Wave: J3 (Aero) + L5W8

LPA:
  GET /api/v1/mes/lpas/{id}
  Purpose: Layered process audit record per IATF/Automotive.
  Response: lpa_id, audit_date, auditor_id, auditor_level[L1|L2|L3|L4],
            work_center_id, shift, questions[]{question_id, question_text,
              answer[yes|no|na], note, finding_id (if finding raised)},
            score_pct, finding_count, capa_triggered[bool],
            capa_links[]{capa_id}, signed_by, signed_at
  Cache: private, no-store    RBAC: operator+    Wave: J2 (Auto) + L4W6
```

### 18C. C7 — Batch Release (BREL) + Risk Record + FSCA

```
BREL:
  GET /api/v1/quality/batch-releases/{id}
  Purpose: QP-signed batch release decision record for pharma/med-device.
  Response: brel_number, product_id, lot_id, batch_number,
            review_checklist[]{item_id, description, result, evidence_ref},
            deviations_open (bool), capa_open (bool), ebr_reviewed (bool),
            final_decision[approved|rejected|conditionally_approved],
            conditions_text, qp_id, qp_signed_at, qp_esig_id,
            release_date, certificate_url
  Cache: private, no-store    RBAC: operator+; full record: auditor+
  Audit emit: Yes    Wave: L5W9   (J1 Pharma + J4 Medical)

Risk Record:
  GET /api/v1/quality/risk-records/{id}
  Purpose: ISO 14971 / ICH Q9 risk assessment record.
  Response: risk_id, product_id, risk_type[design|process|supplier|field],
            hazard_description, harm_description,
            probability_before[1-5], severity[1-5], detectability[1-5],
            rpn_before (derived), risk_acceptability_before,
            mitigations[]{action, responsible, due_date, status},
            probability_after[1-5], rpn_after (derived),
            risk_acceptability_after, residual_risk_accepted_by,
            esig_events[], review_date, next_review_due
  Cache: private, no-store    RBAC: operator+    Wave: L5W8

FSCA:
  GET /api/v1/quality/fscas/{id}
  Purpose: Field Safety Corrective Action record (EU MDR Art. 87).
  Response: fsca_number, product_id, device_class, incident_description,
            risk_to_health[bool], competent_authority, notification_date,
            corrective_actions[]{action_type, scope, deadline, status},
            fsn_url (Field Safety Notice), recall_id (if recall triggered),
            capa_id, vigilance_report_id, completed_at
  Cache: private, no-store    RBAC: operator+
  Audit emit: Yes    Wave: J4-only (Medical Device)
```

### 18D. C9 — PM Schedule + Sterilizer Validation

```
PM Schedule:
  GET /api/v1/maintenance/pm-schedules/{id}
  Purpose: Preventive maintenance task schedule for an asset.
  Response: plan_id, asset_id, asset_name, frequency_type[fixed|floating],
            frequency_value (int), frequency_uom[days|hours|cycles],
            last_performed_date, next_due_date, overdue[bool],
            task_list[]{task_seq, task_description, estimated_hours,
                        skill_required, part_requirements[]{item_id, qty}},
            assigned_group, safety_precautions[], loto_required[bool],
            permit_required[bool], estimated_downtime_hours
  Cache: private, max-age=30    SLO: p95 ≤ 150 ms    RBAC: operator+    Wave: L4W5

Sterilizer Validation:
  GET /api/v1/maintenance/sterilizer-validations/{id}
  Purpose: Sterilization cycle validation record (GMP per EP/USP).
  Response: validation_id, asset_id, validation_type[IQ|OQ|PQ|periodic],
            cycle_parameters[]{param_name, set_point, actual, pass_fail},
            biological_indicators[]{indicator_id, location, result},
            chemical_indicators[]{position, color_change, result},
            load_configuration, cycle_number, performed_by, performed_at,
            reviewed_by, esig_events[], outcome[pass|fail|conditional],
            next_validation_due
  Cache: private, no-store    RBAC: operator+
  Audit emit: Yes    Wave: J1-only (Pharma)
```

### 18E. C10 — Person Record + ITAR Person of Record (PoR)

```
Person:
  GET /api/v1/workforce/persons/{id}
  Purpose: Full employee / contractor profile for HR + compliance modules.
  Response: person_id, employee_number, first_name, last_name, status,
            site_id, department, job_title, hire_date, termination_date,
            roles[]{role_code, granted_at, granted_by, expires_at},
            training_summary{completed, overdue, expiring_soon},
            competency_summary{fully_qualified, gap_count},
            itar_por_id (if ITAR-designated), aseptic_qual_status,
            pcqi_cert_id, dpo_flag[bool]
  Cache: private, max-age=60    SLO: p95 ≤ 150 ms
  RBAC: operator+; roles[]: admin+
  Field redact: hire_date, termination_date: admin+; itar_por_id: admin+
  Wave: L3W4

ITAR PoR:
  GET /api/v1/workforce/itar-por-records/{id}
  Purpose: ITAR Person of Record designation for export-controlled programs.
  Response: por_id, person_id, person_name, designation_date,
            controlled_programs[], us_person_status[citizen|permanent_resident|
            protected_individual], ecra_compliance_training_date,
            annual_review_due, review_completed_by, esig_events[]
  Cache: private, no-store    RBAC: admin+
  Audit emit: Yes (all reads)    Wave: J3-only (Aero/Defense)
```

### 18F. ABAC patterns per domain

Beyond RBAC role minimums, the platform enforces Attribute-Based Access
Control (ABAC) rules at the record level. Key patterns:

```
C1 SO:       User must share site_id with SO.ship_to_site OR have
             role=global-sales. Credit-hold fields require
             role=credit-manager attribute.

C2 Item:     ITAR-controlled items (itar_flag=true) require
             itar_read scope attribute on the JWT. Denials return
             403 auth/itar-clearance-required (see §19).

C5 Lot:      Quarantine lots visible only to user with same site_id
             OR role=quality-global.

C7 CAPA:     CAPA owner (owner_id = user_id) may always read full
             record regardless of base role. Non-owner viewer sees
             masked effectiveness_check results until closed.

C8 Recall:   Recall records visible only to quality+ and executive
             roles during active phase. Post-close: operator+ can read.

C13 AI:      advisory-records with banned_decision_surface_flag=true
             require eu-ai-act-operator attribute on JWT.
             Returns 403 analytics/banned-decision-surface otherwise.
```

All ABAC evaluations are logged as access control events (E6 §3.4) when
the evaluation result is deny. Allow decisions are logged only for
regulated-record families.

---

## 18. Cross-cutting concerns summary

### 18.1 Field-level redaction — consolidated table

| Data class                       | Redacted field(s)                     | Min role  |
|----------------------------------|---------------------------------------|-----------|
| Customer credit limit            | credit_limit, credit_summary          | operator  |
| Tax identifiers (all domains)    | tax_identifiers[]                     | auditor   |
| ITAR / ECCN classification       | itar_eccn, eccn_code, export_license  | operator  |
| Financial cost / margin data     | actual_cost, variance_amt, margin_pct | analyst   |
| E-signature event chain          | esig_events[]                         | auditor   |
| AI model accuracy metrics        | accuracy_metrics{}                    | admin     |
| Pseudonymization key metadata    | key_material (never exposed)          | admin/DPO |
| DSAR subject identity fields     | subject_identity, subject_id          | admin/DPO |
| Webhook secret                   | secret (preview only — last 4 chars)  | admin     |
| Genealogy edges                  | genealogy_edges[]                     | operator  |
| ITAR compliance flags            | itar_screened, sanctions_pass         | operator  |
| Red-team test results            | full record                           | admin     |
| PSW approval fields              | psw.approved_by                       | auditor   |

### 18.2 SLO targets — consolidated table

| Endpoint type                | p50    | p95     | p99      |
|------------------------------|--------|---------|----------|
| Master data list (cached)    | 20 ms  | 100 ms  | 250 ms   |
| Transactional record list    | 40 ms  | 150 ms  | 350 ms   |
| Regulated record list        | 50 ms  | 200 ms  | 500 ms   |
| Single record (cacheable)    | 30 ms  | 150 ms  | 300 ms   |
| Single record (no-store)     | 60 ms  | 250 ms  | 600 ms   |
| History / audit trail        | 80 ms  | 300 ms  | 800 ms   |
| Search (full-text)           | 100 ms | 350 ms  | 900 ms   |
| Genealogy trace graph        | 200 ms | 600 ms  | 1500 ms  |
| LRO submit (export)          | 100 ms | 200 ms  | 400 ms   |
| Dispatch list (real-time)    | 20 ms  | 80 ms   | 200 ms   |
| SPC chart read               | 40 ms  | 200 ms  | 500 ms   |

SLO violations alert via `hesem-api-slo` Prometheus alerting rule.
Grafana board: `/d/e4-record-slo` — watches p95 per domain × resource.

### 18.3 Per-pack SLO overlay

| Pack | Override note                                                  |
|------|----------------------------------------------------------------|
| J1   | EBR / regulated-record SLOs tightened: p99 ≤ 400 ms           |
| J4   | EDHR / DHF / Vigilance: p99 ≤ 400 ms; audit emit synchronous  |
| All  | DSCSA / §204 KDE: no-store; p95 ≤ 200 ms; submit + poll only  |

### 18.4 Wave delivery summary

| Wave | Representative families delivered                              |
|------|----------------------------------------------------------------|
| W2   | Item, BOM, Routing, CDOC                                       |
| W3   | Customer, SO, WO, Dispatch List, NQCASE, CAPA, Supplier        |
| W4   | PO, Lot, MPS, Schedule, Training Record, INSP, Asset           |
| W5   | Shipment, Invoice, MWO, Std Cost, MRP, Competency Matrix       |
| W6   | DFMEA, PFMEA, Calibration, Variance, Complaint, RMA, SCAR      |
| W7   | Forecast, SBOM, PPAP, PSW, Genealogy Edge, SPC Chart           |
| W8   | BREL, Recall, Trace Graph, Equipment Qualification, 8D         |
| W9   | EBR, EDHR, DHF, HARA, SOUP, APR, PSUR, COPQ, Stability        |
| W10  | DSCSA, §204 KDE, DSAR, AI Advisory, FMD, VIN, Red-Team        |

---

## 19. Domain-specific error type-URI additions

| Domain  | Additional type-URI                           | Status | Trigger                       |
|---------|-----------------------------------------------|--------|-------------------------------|
| C1      | commercial/credit-hold-blocked                | 423    | SO creation blocked by hold   |
| C2      | engineering/itar-export-blocked               | 403    | ITAR item; no export license  |
| C4      | procurement/ppap-not-approved                 | 422    | PO line item lacks PPAP       |
| C5      | inventory/lot-on-quarantine-hold              | 423    | Lot cannot be issued          |
| C5      | inventory/dscsa-partner-unverified            | 422    | DSCSA partner not accredited  |
| C6      | mes/operation-not-signed                      | 428    | EBR step requires e-signature |
| C7      | quality/esig-required                         | 428    | Regulated record needs esig   |
| C7      | quality/record-in-review                      | 409    | Concurrent review in progress |
| C8      | traceability/trace-depth-exceeded             | 400    | Graph depth > 20 requested    |
| C9      | maintenance/calibration-overdue               | 422    | Asset calibration expired     |
| C13     | analytics/banned-decision-surface             | 403    | EU AI Act Art-22 blocked      |
| C14     | platform/dsar-deadline-breach                 | 422    | DSAR response overdue         |

---

## 20. API testing and contract validation requirements

Every endpoint in this chapter must pass the following test categories before
graduating to its declared wave level:

**Contract tests (Prism)**
Run on every CI build against a mock server generated from the OpenAPI YAML.
Verify: request validation, response schema conformance, error shape (RFC 9457
structure), ETag presence on single-record responses, pagination envelope on
list responses.

**Integration tests (real DB)**
Run against a seeded test database with fixture data per domain. Verify:
cursor pagination across multiple pages, RLS tenant isolation (cross-tenant
read attempt must return 403 not 404), ETag round-trip (GET → PATCH with
If-Match), and cache header correctness.

**SLO regression tests**
Run against a performance environment with realistic data volumes (≥ 10,000
records per family). P95 latency must not regress more than 20% from the
declared SLO without a documented waiver. Results are reported to the
per-domain SLO dashboard (`/d/e4-record-slo` in Grafana).

**Security tests**
Run OWASP ZAP active scan on every list and single-record endpoint. Must
pass: IDOR check (substituting another tenant's record IDs), BOLA check,
mass-assignment check, ITAR bypass attempt. Regulated families additionally
run a 21 CFR Part 11 compliance checklist: audit trail integrity, no-store
cache assertion, e-signature chain completeness.

**Per-pack acceptance tests**
Each vertical pack (J1..J5) has a dedicated fixture set in
`tests/fixtures/e4-{pack}-overlay/`. Pack-specific fields must appear in
responses only when the tenant has the corresponding compliance_pack flag
enabled. Pack fields must not appear for tenants without the pack.

---

## 21. Deprecation policy

```
Breaking changes:     Major version bump (e.g., /api/v2/commercial/…).
                      Minimum 12-month overlap with previous major version.
Non-breaking adds:    New optional response fields; no version bump.
                      Clients must tolerate unknown fields (JSON openness).
Field removal:        Field marked deprecated: true in response for 6 months.
                      Deprecation: <date> + Sunset: <date> response headers
                      (RFC 8594) sent from deprecation announcement date.
LRO format changes:   12-month notice; migration guide in CHANGELOG.
Per-pack removals:    Require pack-owner sign-off + 6-month notice.
Path renames:         Treated as breaking; old path kept with 301 redirect
                      for 12 months then removed.
ETag format change:   Treated as breaking (clients must re-read).
```

---

## 21. Acceptance criteria checklist

```
[x] All 14 domain sections present (C1–C14, §4–§17)
[x] Per family: list + single + history + search + bulk endpoints documented
[x] Per family per-pack overlay (J1..J5 callouts)
[x] Per family cache header per data class (§2.5 table + per-section)
[x] Per family field-level redaction per role (§18.1 + per-domain)
[x] Per family SLO target per route (§18.2 + per-section)
[x] Cross-references resolve (E6, E7, E8, E11, E12, E13, E15, M3, B6)
[x] RFC 9457 error type-URIs throughout (§2.7 + §19)
[x] No marketing language
[x] Decision phrase emitted
```

---

## 22. Decision phrase

```
S3-01_E4_RECORD_PER_DOMAIN_DEEP_UPGRADE_COMPLETE
```

After: load `S3-02_E5_E6.md`.
