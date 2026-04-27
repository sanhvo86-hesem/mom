# E5 — Workspace Projection API (V10 Deep Upgrade)

```
api_family:       Workspace Projection — denormalized read-only views
owner_role:       Projection / Read-Model Lead (Platform Lead)
scope:            Per-workspace projections; record-shell aggregations;
                  dashboard data products; AC console live streams;
                  workspace search; bulk projection export; as-of queries;
                  auditor + customer portal projections; per-pack products;
                  freshness HEAD probes
version:          V10 deep-upgrade (S3-02)
openapi_ref:      mom/contracts/openapi/e5-workspace-projection.yaml (planned)
asyncapi_ref:     mom/contracts/asyncapi/e5-console-stream.yaml (planned)
standards:        OpenAPI 3.1.1; AsyncAPI 3.0; CloudEvents 1.0;
                  RFC 9457; RFC 7234; RFC 6455 (WebSocket); SSE (W3C)
upgrade_from:     V9-shallow (endpoint inventory without full contracts)
upgrade_to:       V10 — full per-endpoint contracts, field shapes, SLOs,
                  per-pack overlays, cardinality discipline, ABAC/RBAC,
                  error catalogs, observability emit, wave assignments
```

---

## 1. Purpose and positioning

The Workspace Projection API is the **query surface for UI workspaces**. It
serves denormalized, query-optimized projections built from authoritative
roots (E4), workflow state (E3), telemetry (B9), and AI advisory signals
(E9). Projections are eventually consistent with a declared freshness SLO;
they are **never authoritative** — all mutations go through E3.

### 1.1 E5 vs E4 — when to use which

| Need | Use |
|------|-----|
| Full canonical record for a record shell | E4 |
| Multi-record workspace (data grid, dashboard) | E5 |
| Real-time live update on shop floor | E5 §2.5 (WSS stream) |
| Historical point-in-time view for audit pack | E5 §2.8 (as-of) |
| Cross-domain aggregated KPI data | E5 §2.4 |
| Auditor scoped read during audit | E5 §2.9 |

### 1.2 Projection substrate

Projections are materialized views rebuilt via CDC (Change Data Capture)
events from the primary database. The rebuild pipeline:

```
Primary DB write  →  WAL  →  Debezium CDC  →  Kafka topic  →
Projection Consumer  →  Materialized View  →  Cache (Redis)  →
E5 endpoint response
```

When the projection consumer falls behind, endpoints return
`503 projection/freshness-stale` with a `Retry-After` header. Regulated
workspace projections never serve stale content — they fall back to a
direct read from E4 (authoritative, slower) rather than serving cached
stale data.

### 1.3 Per-tenant cardinality discipline

```
Workspaces per tenant:          max 500 (soft limit; admin override)
Data products per tenant:       max 200
Custom projection columns:      max 50 per workspace
Console streams per tenant:     max 20 concurrent
Bulk exports in flight:         max 5 concurrent
Auditor portal sessions:        max 10 concurrent per audit token
Search queries per tenant:      600 / min
```

Cardinality limits are enforced at the API gateway. Violations return
`429 rate-limit/cardinality-exceeded`.

### 1.4 Per-region cache isolation

Each tenant's projection cache is keyed `{region_id}:{tenant_id}:{workspace_id}`.
Region pinning (per B6 C5 §3) ensures projections are never served from a
different region than the tenant's declared primary region. Cross-region
cache reads are structurally impossible: the Redis cluster is region-local.

---

## 2. Endpoint inventory

### 2.1 Workspace Projection Read

```
Name:         Workspace Projection Read
Method+Path:  GET /api/v1/workspace/{workspace_id}
Purpose:      Return the current projection for a named workspace context,
              optimized for data-grid rendering (DL/WS/ML UI patterns).
Audience:     UI workspace panels (F3, F4); integration consumers.

Request:
  workspace_id  (uuid, path, required)
  filter        (JSON-encoded object, optional) — per-workspace filter set;
                 keys and allowed values declared in workspace contract
  sort          (string: "field:asc|desc", optional) — overrides default
  cursor        (string, optional) — pagination cursor
  limit         (int 1..500, optional, default 50)
  Accept-Language (header, optional) — ICU locale for formatted values

Response:
  {
    workspace_id   (uuid),
    workspace_name (string),
    projection_schema_version (int),
    columns[]: {
      key (string), label (string), data_type (enum: string|number|date|
      bool|enum|url|badge), sortable (bool), filterable (bool),
      redacted_for_roles (string[])
    },
    rows[]: {
      id (uuid — authoritative record root id),
      _authority_class (string — per E2),
      [column_key]: value,          — typed per columns[].data_type
      _row_meta: { updated_at, freshness_age_ms, source_root_kind }
    },
    pagination: { next_cursor, prev_cursor, total_count, has_more },
    freshness: {
      last_rebuilt_at (ISO-8601),
      freshness_age_ms (int),
      freshness_slo_ms (int),
      slo_breach (bool)
    },
    banner_state: (enum: live|stale|degraded|partial-access|fixture-mode|null),
    meta: { request_id, tenant_id, generated_at, replica_lag_ms }
  }

Cache:        private, max-age=5, stale-while-revalidate=3
              (never stale for regulated workspaces: max-age=0, must-revalidate)
SLO:          p50 ≤ 60 ms | p95 ≤ 200 ms | p99 ≤ 500 ms
              freshness SLO (SLO-5): projection age ≤ 5 s for high-velocity;
              ≤ 300 s for slow-changing master-data workspaces
RBAC:         viewer+; workspace-specific role overrides declared per workspace
ABAC:         workspace_id must be accessible to user's role + tenant;
              field-level redaction enforced per columns[].redacted_for_roles
Idempotency:  GET — naturally idempotent
Errors:
  workspace/not-found              404  workspace_id unknown in tenant
  workspace/not-enabled            403  workspace requires pack toggle not active
  workspace/deprecated             410  workspace sunset; use successor
  projection/freshness-stale       503  age > slo + Retry-After: 5
  projection/incomplete            503  rebuild in progress
  auth/forbidden                   403  user role lacks workspace access
  filter/invalid                   400  filter key unknown or value type mismatch
  filter/banned-attribute          422  filter attribute requires higher role
  pagination/invalid-cursor        400  cursor tampered or expired

Observability:
  span: "e5.workspace.read"
  attrs: tenant_id, workspace_id, filter_keys[], freshness_age_ms, slo_breach

Per-pack overlays:
  J1 Pharma:  workspace_id prefix "pharma/" unlocks GMP-specific workspaces
              (EBR list, batch-release queue, stability dashboard, DSCSA portal).
              Freshness SLO tightened to 3 s for EBR list.
  J2 Auto:    "auto/" prefix unlocks PPAP progress, LPA cycle, 8D queue,
              customer scorecard, JIT demand-vs-supply workspace.
  J3 Aero:    "aero/" unlocks FAI workspace, NADCAP cert tracker,
              service-life-limited tracking, ITAR access log workspace.
  J4 Medical: "md/" unlocks DHF/DHR aggregation, vigilance trend, PSUR draft,
              PMS/PMCF data, risk file aggregation workspace.
  J5 Food:    "food/" unlocks HACCP plan monitor, §204 traceability viewer,
              EMP excursion workspace, mock-recall projection.

Wave:         L3 (Wave 3) — basic workspace projections
              L4 (Wave 4) — pack workspaces
              L5 (Wave 5) — regulated workspaces (no-stale fallback to E4)
```

### 2.2 Record-Shell Projection

```
Name:         Record-Shell Projection
Method+Path:  GET /api/v1/record-shell/{root_kind}/{root_id}
Purpose:      Pre-aggregated multi-tab envelope for Authoritative Record Shell
              UI (F5). Assembles identification block, state panel, and per-tab
              data in a single response to minimize UI round-trips.
Audience:     F5 Authoritative Record Shell; record detail API consumers.

Request:
  root_kind  (string path: e.g., "nqcase", "capa", "sales-order", "ebr" —
              per M3 root catalog slug)
  root_id    (uuid path, required)
  tabs       (csv query: overview|related|evidence|history|compliance|ai —
              default: overview; fetches only requested tabs)

Response:
  {
    root_kind, root_id,
    identification: {
      title (string), subtitle (string), status_label (string),
      status_color_token (css-variable — per ADR-0009 Graphics Authority),
      badge_text (string), domain (string), authority_class (string)
    },
    state_panel: {
      current_state (string), allowed_transitions[]{label, action_key,
      requires_esig (bool), requires_role (string)},
      state_history[]{state, entered_at, entered_by}
    },
    tabs: {
      overview?: {
        key_fields[]{label, value, data_type, redacted (bool)},
        summary_text (string, nullable)
      },
      related?: {
        relations[]{rel_type, target_root_kind, target_root_id,
                     label, status, href}
      },
      evidence?: {
        attachments[]{id, filename, mime_type, uploaded_by, uploaded_at,
                       download_url (signed, E12), file_size_bytes}
      },
      history?: {
        events[]{event_id, event_type, actor_name, timestamp,
                  change_summary, esig_flag}
      },
      compliance?: {
        regulations[]{code, requirement, status[met|partial|unmet|na]},
        esig_chain[]{step, signer_role, signed_by, signed_at, status}
      },
      ai?: {
        advisory_summary (string), confidence_score (float),
        recommendations[]{text, priority}, last_updated_at
      }
    },
    banner_state: (enum: live|fixture-mode|degraded|partial-access|null),
    freshness: { last_rebuilt_at, freshness_age_ms, slo_breach },
    meta: { request_id, tenant_id, generated_at }
  }

Cache:        private, max-age=0, must-revalidate
              (record shells always fresh — never serve stale for regulated)
SLO:          p50 ≤ 80 ms | p95 ≤ 250 ms | p99 ≤ 600 ms
              (parallel tab fetch assembler; total wall time ≤ sum of slowest tab)
RBAC:         viewer+ for overview; operator+ for evidence, compliance;
              auditor+ for history with full actor detail
ABAC:         root_id tenant-bound; per-tab role enforcement;
              esig_chain: auditor+ only; ai tab: operator+
Errors:
  record/not-found          404
  record/gone               410  (soft-deleted; tombstone)
  workspace/tab-not-enabled 403  (tab requires pack not active)
  auth/forbidden            403
  projection/incomplete     503

Per-pack overlays:
  J1 Pharma:  Extra tab "batch" — EBR summary, QP release chain, deviation
              count. Compliance tab adds 21 CFR 211/GMP regulation rows.
  J4 Medical: Extra tab "dhr" — DHR build progress, UDI assignment,
              EUDAMED sync status. Compliance adds MDR/IVDR rows.
  J3 Aero:    Extra tab "airworthiness" — AD/SB compliance status,
              life-limited remaining hours/cycles.
  J5 Food:    Extra tab "traceability" — §204 KDE set, HACCP CCP results.

Wave:         L4 (Wave 4)
```

### 2.3 Dashboard Data Product

```
Name:         Dashboard Data Product
Method+Path:  GET /api/v1/dashboard/{product_id}
Purpose:      Named, governed data product surface for dashboard panels
              (DL UI pattern, F2). Returns aggregated KPI / time-series /
              chart-ready data per a declared product contract.
Audience:     F2 Dashboard panels; executive reporting; BI consumers.

Request:
  product_id    (slug string, path, required — e.g., "quality-kpi",
                 "oee-trend", "supplier-scorecard")
  period        (enum: day|week|month|quarter|ytd, default month)
  date_from     (ISO-8601 date, optional — overrides period)
  date_to       (ISO-8601 date, optional)
  site_id       (uuid, optional — filter to site)
  compare_prior (bool, default false — include prior period for delta)

Response:
  {
    product_id, product_name, product_version,
    period: { type, from, to, label },
    kpis[]: {
      kpi_code, kpi_name, value (numeric), uom,
      target (numeric), status (enum: green|amber|red),
      trend_direction (enum: up|down|flat),
      delta_vs_prior (numeric, if compare_prior=true),
      sparkline_data[]: { date (ISO-8601), value }
    },
    charts[]: {
      chart_id, chart_type (enum: bar|line|pie|scatter|heatmap),
      title, x_axis_label, y_axis_label,
      series[]: { name, data[]: { x, y } }
    },
    freshness: { last_rebuilt_at, freshness_age_ms, slo_ms },
    data_lineage[]: { source_domain, source_root_kind, record_count },
    meta: { request_id, tenant_id, generated_at }
  }

Cache:        private, max-age=60, stale-while-revalidate=30
SLO:          p50 ≤ 100 ms | p95 ≤ 300 ms | p99 ≤ 800 ms
RBAC:         viewer+ (some data products: analyst+; declared in product contract)
Errors:
  dashboard/product-not-found   404
  dashboard/product-deprecated  410
  dashboard/period-out-of-range 400  (date_from before retention floor)
  auth/forbidden                403

Per-pack overlays:
  J1 Pharma:  "pharma/apr-product" — APR KPIs (batch rejection rate,
              deviation count, complaint rate); "pharma/stability" trend.
  J2 Auto:    "auto/ppap-progress" — PPAP submission funnel;
              "auto/oee-trend" — OEE waterfall by loss category.
  J4 Medical: "md/vigilance-trend" — serious incident trend vs baseline.

Wave:         L5 (Wave 5)
```

### 2.4 Action Console Initial Payload

```
Name:         Action Console Projection (Initial)
Method+Path:  GET /api/v1/console/{ac_id}
Purpose:      Initial synchronous payload for an Action Console (F6).
              Establishes current state before the WSS stream takes over.
Audience:     F6 Action Console panels; shopfloor terminal UIs.

Request:
  ac_id     (slug string, path — e.g., "dispatch", "recall", "complaint")
  site_id   (uuid, optional)
  context   (JSON-encoded context object, optional)

Response:
  {
    ac_id, ac_type (enum: dispatch|recall|complaint|nc-triage|lot-hold|...),
    title, description,
    primary_list: { columns[], rows[], total_count },
    action_buttons[]: { key, label, enabled (bool),
                        requires_esig (bool), requires_role (string) },
    stats_bar: { metrics[]{label, value, status_color_token} },
    stream_endpoint (string — WSS or SSE URL for live updates),
    stream_token (string — short-lived auth token for stream),
    banner_state,
    freshness: { last_rebuilt_at, freshness_age_ms },
    meta: { request_id, tenant_id, generated_at }
  }

Cache:        private, max-age=0, must-revalidate
SLO:          p50 ≤ 60 ms | p95 ≤ 200 ms | p99 ≤ 500 ms
RBAC:         operator+; ac_id-specific role requirements declared per console
Errors:
  console/not-found          404
  console/not-enabled        403  (pack toggle required)
  auth/forbidden             403

Wave:         L4 (Wave 4)
```

### 2.5 Action Console Live Stream (WebSocket / SSE)

```
Name:         Action Console Live Stream
Method+Path:  WSS /api/v1/console/{ac_id}/stream
              (fallback SSE: GET /api/v1/console/{ac_id}/stream)
Purpose:      Real-time event stream delivering projection delta-patches to
              the Action Console after initial load via §2.4.
Audience:     F6 Action Console; shopfloor display terminals.

Connection:
  Protocol: WebSocket (RFC 6455) primary; SSE (W3C EventSource) fallback
  Auth: stream_token from §2.4 response (short-lived JWT, 15-min TTL)
        Passed as query param: ?token=<stream_token>
  Heartbeat: server sends PING every 30 s; client must respond PONG
  Reconnect: exponential backoff (1s→2s→4s…max 30s); auto-resume from
             last event_seq using ?last_seq=<n>

Event envelope (CloudEvents 1.0):
  {
    specversion: "1.0",
    id          (uuid),
    source      (string: "hesem/{tenant_id}/console/{ac_id}"),
    type        (string: "com.hesem.console.row-updated" |
                          "com.hesem.console.row-added"   |
                          "com.hesem.console.row-removed" |
                          "com.hesem.console.stats-updated" |
                          "com.hesem.console.action-state-changed"),
    time        (ISO-8601),
    datacontenttype: "application/json",
    data: {
      seq         (int — monotonic; client uses for reconnect resume),
      patch_type  (enum: row-update|row-add|row-remove|stats|action-state),
      payload     (patch object; row-update uses RFC 6902 JSON Patch)
    }
  }

Rate:        Up to 50 events/s per stream; burst 200 events/5s
             Back-pressure: server drops oldest events and sends
             "com.hesem.console.overflow" event when burst exceeded
SLO:         Event delivery p95 ≤ 800 ms end-to-end from DB commit
             (sub-second target per SLO-7 §4)
Observability: span per stream connection; event counter per type;
               disconnect and reconnect events tracked

Per-pack overlays:
  J1 Pharma:  Batch-queue console: EBR step completion events,
              deviation alert events, QP queue length updates.
  J2 Auto:    Dispatch console: OEE OOC alert, poka-yoke failure events.
  J5 Food:    CCP monitoring console: CCP deviation alert events,
              corrective action trigger events.

Wave:         L4 (Wave 4)
```

### 2.6 Workspace Search

```
Name:         Workspace Search
Method+Path:  POST /api/v1/workspace/search
Purpose:      Full-text + structured search across workspace projections for
              the current tenant. Powers UI search bars and AI RAG retrieval.
Audience:     UI global search (F1); AI advisory (E9 RAG context fetch).

Request:
  {
    q             (string, required, min 2 chars) — full-text query
    workspaces    (string[], optional) — limit to these workspace_ids
    root_kinds    (string[], optional) — limit to these M3 root slugs
    filters       (object, optional) — per-workspace structured filters
    sort          (enum: relevance|updated_at|created_at, default relevance)
    cursor        (string, optional)
    limit         (int 1..100, default 20)
    include_meta  (bool, default false) — include hit explanations
  }

Response:
  {
    hits[]: {
      workspace_id, root_kind, root_id,
      title (string), subtitle (string), status (string),
      match_score (float 0..1),
      highlights: { field: "<em>matched term</em>", ... },
      href (string — deep link to record shell)
    },
    total_hits (estimated),
    query_log_id (uuid — retained per H5 §3 for investigation),
    next_cursor,
    has_more,
    meta: { request_id, tenant_id, generated_at, search_index_age_ms }
  }

Cache:        private, max-age=0, must-revalidate
SLO:          p50 ≤ 120 ms | p95 ≤ 350 ms | p99 ≤ 800 ms
RBAC:         viewer+
ABAC:         Results filtered by user's workspace access list;
              cross-tenant results impossible (per B6 C5)
Idempotency:  POST — no side effects; idempotency key not required
Errors:
  search/query-too-short     400  (q < 2 chars)
  search/quota-exceeded      429
  search/index-lag           503  (search index freshness SLO breached)
  filter/banned-attribute    422

Observability:
  span: "e5.workspace.search"
  attrs: tenant_id, query_length, workspace_filter_count, hit_count
  search_query_log: retained in query_log table per H5 §3

Per-pack overlays:
  J3 Aero:    ITAR-flagged records redacted from search results for users
              without itar-read scope (returns hit with redacted=true marker).
  All packs:  Pack workspaces included in scope when tenant has pack toggle.

Wave:         L4 (Wave 5)
```

### 2.7 Bulk Projection Export (LRO)

```
Name:         Bulk Projection Export
Method+Path:  POST /api/v1/workspace/bulk
Purpose:      Async bulk export of a workspace projection or data product
              for analytics, audit pack assembly, or migration tooling.
Audience:     Customer-side analytics; audit pack assembly; migration.

Request:
  {
    source_type     (enum: workspace|data-product, required)
    source_id       (string, required — workspace_id or product_id)
    format          (enum: csv|json|parquet|xlsx, required)
    filters         (object, optional — same keys as workspace filter)
    columns         (string[], optional — subset of workspace columns)
    period          (object: {from, to}, optional — for data products)
    include_history (bool, default false — include row history)
  }
  Idempotency-Key: <uuid v4> (required header)

Response:
  202 Accepted:
  {
    operation_id (uuid),
    status_url   (string — per E13),
    estimated_rows (int),
    estimated_duration_s (int)
  }

Rate:    5 concurrent bulk exports per tenant
SLO:     Submit ≤ 200 ms; completion per E13 polling
RBAC:    analyst+
Errors:
  workspace/not-found          404
  rate-limit/concurrent-exceeded 429  (> 5 active exports)
  record/regulated-hold        423  (data under legal hold)

Observability:
  audit emit: "export.submitted" event on every bulk export request
  event includes: actor_id, source_id, format, filter_summary

Wave:    L4 (Wave 5)
```

### 2.8 Time-Window (As-Of) Query

```
Name:         Time-Window Projection Query
Method+Path:  GET /api/v1/workspace/{workspace_id}/asof
Purpose:      Return workspace projection as it existed at a specific past
              timestamp. Enables reproducible audit pack snapshots and
              period-end reporting.
Audience:     Audit pack assembly (H3 §4); compliance period reporting;
              customer-side audit pre-flight.

Request:
  workspace_id  (path, required)
  asof          (ISO-8601 datetime, required) — target point-in-time
  filter        (object, optional)
  cursor, limit (pagination)

Response:
  Same shape as §2.1 plus:
  {
    asof_timestamp   (ISO-8601 — resolved target timestamp),
    asof_actual_at   (ISO-8601 — nearest anchor used for replay),
    asof_method      (enum: event-replay|snapshot|anchor),
    reproducibility_ref (string — anchor_id used; enables re-verification)
  }

Cache:        private, max-age=86400, immutable (once served, always same)
SLO:          p95 ≤ 3000 ms (event-source replay; inherently slower)
              Responses > 10 s are demoted to LRO (202 + E13 status)
RBAC:         operator+
Errors:
  asof/before-retention    410  (target timestamp before H5 retention floor)
  asof/future-not-allowed  400  (asof > now)
  asof/anchor-not-ready    404  (anchor for that day not yet published)

Per-pack overlays:
  J1 Pharma:  Used for APR — snapshot as of batch release date.
  J2 Auto:    Used for PPAP submission — as-of APQP gate date.
  J4 Medical: Used for post-market surveillance — as-of MDR reporting date.

Wave:         L5 (Wave 6)
```

### 2.9 Auditor Portal Projection

```
Name:         Auditor Portal Projection
Method+Path:  GET /api/v1/auditor/projection/{workspace_id}
Purpose:      Scoped workspace projection for external auditor portal during
              an audit engagement. Scope is time-bounded and resource-bounded
              per audit token.
Audience:     External auditors; customer QA auditors; regulatory inspectors.

Request:
  workspace_id  (path)
  audit_token   (string, query or header — scoped JWT issued by E14 admin)
  filter, cursor, limit (same as §2.1)

Response:
  Same shape as §2.1 plus:
  {
    audit_scope: {
      audit_id, valid_from, valid_to,
      permitted_root_kinds[], permitted_workspaces[],
      read_only (always true)
    }
  }

Cache:        private, max-age=0, must-revalidate
              (auditor portal never serves stale)
SLO:          Same as §2.1 — p95 ≤ 200 ms
RBAC:         auditor-token scope (time + resource + class window)
              Cross-tenant: impossible
              PII fields: shown per DPA agreement (per I7 §9)
Audit emit:   EVERY query logged perpetually to audit trail (per H5)
              Event: "auditor.projection.accessed" — actor=auditor_id,
              audit_id, workspace_id, filter_summary, row_count, timestamp
Errors:
  audit-token/expired        401  (audit_token past valid_to)
  audit-token/scope-exceeded 403  (workspace outside audit scope)
  audit-token/not-found      401

Wave:         L5 (Wave 7)
```

### 2.10 Customer Portal Projection

```
Name:         Customer Portal Projection
Method+Path:  GET /api/v1/customer/projection/{workspace_id}
Purpose:      Read-only projection surface for customer-side portal users.
              Scoped strictly to their own orders, complaints, and quality data.
Audience:     Customer DPO; customer quality teams; B2B portals.

Request:
  workspace_id (path — must be a "customer-facing" workspace type)
  customer_id  (uuid, derived from customer-portal JWT — not overridable)

Response:
  Same as §2.1 — rows filtered to customer_id automatically

Cache:        private, max-age=10
RBAC:         customer-portal role (separate from internal roles)
              Customer can only see their own data; enforced at projection
              view definition level (view WHERE customer_id = :claim)
Audit emit:   "customer.projection.accessed" — logged for DPA compliance

Wave:         L4 (Wave 5)
```

### 2.11 Per-Pack Data Product

```
Name:         Per-Pack Data Product
Method+Path:  GET /api/v1/{pack}/dataproduct/{product_id}
              e.g., GET /api/v1/pharma/dataproduct/apr-data-product
Purpose:      Pack-specific data product surface serving regulated or
              industry-specific aggregated projections.
Audience:     Pack-specific UI; compliance reporting; customer-pack DPO.

Request:
  pack        (string: pharma|auto|aero|md|food)
  product_id  (slug string)
  period, filters (same as §2.3)

Response:
  Same as §2.3 + pack_metadata: { pack, regulation_basis, submission_ref }

Cache:        private, max-age=60 (non-regulated); private, no-store (regulated)
RBAC:         operator+ (pack must be enabled for tenant)
Errors:
  pack/not-enabled           403
  dataproduct/not-found      404

Wave:         L5 (Wave 10) — per-pack GA
```

### 2.12 Freshness HEAD Probe

```
Name:         Freshness HEAD Probe
Method+Path:  HEAD /api/v1/workspace/{workspace_id}
Purpose:      Return last-built timestamp and freshness SLO status without
              body payload. Used by UI staleness indicators and audit pre-flight.
Audience:     UI staleness banner; audit pre-flight check; monitoring probes.

Request:
  workspace_id (path, required)

Response headers:
  X-Projection-Last-Rebuilt:  <ISO-8601>
  X-Projection-Age-Ms:        <int>
  X-Projection-Slo-Ms:        <int>
  X-Projection-Slo-Breach:    true|false
  X-Projection-Banner:        live|stale|degraded|null
  ETag:                       "<hash of last rebuild timestamp>"
  Cache-Control:              private, max-age=2

SLO:          p50 ≤ 5 ms | p95 ≤ 30 ms (no body; pure header response)
RBAC:         viewer+
Wave:         L3 (Wave 3)
```

---

## 3. Authentication + authorization

### 3.1 Token types

```
Standard JWT:     All §2.1–2.7 endpoints; issued by E1
Audit token:      §2.9 auditor portal; scoped by admin (E14);
                  time-bounded (valid_from, valid_to);
                  resource-bounded (permitted workspaces, root_kinds);
                  read-only; perpetual audit emit
Customer token:   §2.10 customer portal; issued by E1 customer-facing IdP;
                  customer_id bound; read-only
Stream token:     §2.5 WSS stream; 15-min TTL; issued by §2.4 initial payload
```

### 3.2 ABAC rules

```
Workspace access:   User must have role covering workspace's required_role field
                    (declared in workspace contract)
Pack workspace:     Workspace requires pack toggle enabled on tenant
Regulated fields:   Columns with redacted_for_roles are stripped at the
                    projection layer before cache — never stored in cache
                    with sensitive values for lower roles
Cross-tenant:       Structurally impossible — projection view is
                    tenant_id-partitioned; cache key includes tenant_id
ITAR fields:        Columns marked itar_controlled:true require itar-read
                    scope on JWT; otherwise column returns redacted:true
```

### 3.3 Field-level redaction enforcement model

Field-level redaction in E5 works differently from E4. In E4, the server
queries all fields and strips sensitive ones before returning the response.
In E5, the projection view itself is **role-partitioned**: separate
materialized views exist per role tier (`viewer_projection`, `operator_projection`,
`analyst_projection`). This means:

- The cache stores a separate projection per role-hash — no risk of a lower-role
  cache hit returning data intended for a higher role.
- The projection consumer applies role masks during materialization, not at
  request time. Request latency is unaffected by redaction complexity.
- Adding a new role to a column's `redacted_for_roles` list triggers a
  projection rebuild for the affected workspace.

Fields that are always redacted from all E5 projections regardless of role:
```
- Raw PII beyond name + employee number (SSN, passport, biometric)
- Private key material (never stored in projections)
- Webhook secrets (stored as hashed preview only)
- JWT tokens (never projected)
- Internal infrastructure metadata (replica host, shard key)
```

### 3.4 Sub-processor boundary

When a workspace uses a third-party search backend (e.g., OpenSearch) or
a BI engine (e.g., Redshift), those services are registered as sub-processors
in the DPA (C12 DPA record). The following rules apply:

- No sub-processor receives raw PII — field values are pseudonymized before
  being written to the search index or analytics store (per I7 §9).
- Sub-processor contracts are per-tenant-region: a tenant pinned to EU-WEST
  cannot have its data routed to a US-based sub-processor search instance.
- Sub-processor outage does not block E5 workspace reads (search path
  gracefully degrades to 503 with a `sub-processor/unavailable` error
  while structured workspace reads continue via the primary projection store).

---

## 4. Cache + freshness

### 4.1 Freshness SLO per workspace class

| Workspace class              | Target age SLO | Max stale served |
|------------------------------|----------------|------------------|
| High-velocity (dispatch, WO) | ≤ 5 s          | 0 s (never stale)|
| Standard transactional       | ≤ 30 s         | 15 s             |
| Master-data workspace        | ≤ 300 s        | 120 s            |
| Dashboard data product       | ≤ 300 s        | 120 s            |
| Regulated workspace (GMP)    | 0 (live)       | 0 (fall to E4)   |
| Auditor portal               | 0 (live)       | 0                |
| As-of query                  | N/A (historical)| immutable       |

### 4.2 Invalidation

CDC events trigger projection invalidation within 1–2 s of DB commit. For
multi-table projections (joining multiple root kinds), the invalidation
is conservative: any participating root kind change triggers a full workspace
rebuild for that tenant.

### 4.3 Per-region cache isolation

Cache key structure: `{region_id}:{tenant_id}:{workspace_id}:{filter_hash}:{role_hash}`.
The `role_hash` component ensures different role-level projections are cached
separately, preventing data leaks across roles.

### 4.4 Workspace contract governance

Every workspace exposed via §2.1–§2.3 must have a registered workspace
contract stored in `mom/contracts/workspaces/<workspace_id>.json`. The
contract defines:

```json
{
  "workspace_id": "quality/nqcase-list",
  "version": 3,
  "display_name": "Nonconformance Case List",
  "domain": "quality_improvement",
  "root_kinds": ["nqcase"],
  "required_role": "viewer",
  "required_packs": [],
  "freshness_slo_ms": 10000,
  "regulated": false,
  "columns": [
    {
      "key": "case_number",
      "label": "Case #",
      "data_type": "string",
      "sortable": true,
      "filterable": true,
      "redacted_for_roles": []
    },
    {
      "key": "severity",
      "label": "Severity",
      "data_type": "enum",
      "enum_values": ["critical", "major", "minor"],
      "sortable": true,
      "filterable": true,
      "redacted_for_roles": []
    }
  ],
  "default_sort": [{"field": "opened_at", "dir": "desc"}],
  "max_page_size": 500,
  "deprecated": false,
  "successor_workspace_id": null
}
```

Contract changes that remove a column, change a column's `data_type`, or
change `required_role` to higher are **breaking changes** and require a
new `workspace_id` with a version suffix (e.g., `quality/nqcase-list-v4`).
The old workspace_id is deprecated with a `Deprecation` + `Sunset` response
header for 6 months.

### 4.5 Projection version negotiation

Clients may specify `Accept-Version: workspace-schema/<version>` to pin
to a specific projection schema version. The server returns
`X-Projection-Schema-Version: <int>` in every response. When a client
receives a higher version than expected, it should re-fetch its column
definitions from the workspace contract endpoint
(`GET /api/v1/workspace/{workspace_id}/contract`).

This prevents UI breakage when a workspace adds new columns mid-session:
the client's column renderer gracefully ignores unknown keys while
existing columns continue to render correctly.

---

## 5. Failure modes

```
projection/freshness-stale       503  age > slo; Retry-After: 5
projection/incomplete            503  rebuild in progress; ETA in detail
workspace/not-found              404  workspace_id unknown in tenant
workspace/deprecated             410  workspace sunset; successor in Link header
auth/unauthorized                401
auth/forbidden                   403
filter/invalid                   400  filter key unknown or value type mismatch
filter/banned-attribute          422  filter attribute requires higher role
pagination/invalid-cursor        400
rate-limit/exceeded              429
rate-limit/cardinality-exceeded  429  workspace limit per tenant
asof/before-retention            410  before H5 retention floor
asof/future-not-allowed          400
sub-processor/unavailable        503  search backend or CDC down
audit-token/expired              401
audit-token/scope-exceeded       403
pack/not-enabled                 403
console/stream-overflow          (WebSocket close code 4001)
```

---

## 6. SLO targets

| Endpoint            | p50    | p95     | p99      | Freshness SLO  |
|---------------------|--------|---------|----------|----------------|
| §2.1 workspace read | 60 ms  | 200 ms  | 500 ms   | per class      |
| §2.2 record-shell   | 80 ms  | 250 ms  | 600 ms   | 0 (no stale)   |
| §2.3 dashboard      | 100 ms | 300 ms  | 800 ms   | 300 s          |
| §2.4 console init   | 60 ms  | 200 ms  | 500 ms   | 0 (no stale)   |
| §2.5 stream event   | —      | 800 ms  | —        | sub-second     |
| §2.6 search         | 120 ms | 350 ms  | 800 ms   | search index   |
| §2.7 bulk submit    | 100 ms | 200 ms  | 400 ms   | N/A (LRO)      |
| §2.8 as-of          | 500 ms | 3000 ms | 10000 ms | N/A            |
| §2.9 auditor        | 60 ms  | 200 ms  | 500 ms   | 0              |
| §2.10 customer      | 60 ms  | 200 ms  | 500 ms   | 30 s           |
| §2.11 pack product  | 100 ms | 300 ms  | 800 ms   | per class      |
| §2.12 HEAD probe    | 5 ms   | 30 ms   | 80 ms    | N/A            |

### 6b. SLO monitoring and alerting

SLO compliance is tracked via Prometheus + Grafana:

```
Metrics:
  hesem_workspace_projection_latency_seconds   {workspace_id, tenant_tier, operation}
  hesem_workspace_freshness_age_seconds        {workspace_id, tenant_id}
  hesem_workspace_slo_breach_total             {workspace_id, slo_type}
  hesem_console_stream_event_delivery_ms       {ac_id, event_type}
  hesem_workspace_search_latency_seconds       {tenant_tier}

Alerting rules (pagerduty on-call):
  WorkspaceFreshnessBreached:    freshness_age > slo * 2 for 60 s
  WorkspaceP95LatencyBreach:     p95 latency > 300 ms for 5 min (sustained)
  ConsoleStreamEventLag:         event delivery p95 > 2 s for 2 min
  WorkspaceProjectionDown:       503 rate > 20% for 30 s on any workspace

Grafana boards:
  /d/e5-workspace-freshness    — per-workspace freshness heatmap
  /d/e5-workspace-latency      — p50/p95/p99 per workspace class
  /d/e5-console-stream         — stream event latency + overflow rate
```

---

## 7. Wave delivery

| Wave | Capability delivered                                                |
|------|---------------------------------------------------------------------|
| W3   | §2.1 basic workspace; §2.12 freshness HEAD; §2.4 console initial   |
| W4   | §2.2 record-shell; §2.5 WSS stream; §2.9 auditor portal            |
| W5   | §2.3 dashboard; §2.6 search; §2.7 bulk; §2.10 customer portal      |
| W6   | §2.8 as-of; regulated workspace fallback to E4                      |
| W10  | §2.11 per-pack data products (J1..J5)                              |

---

## 8b. Deprecation and versioning policy

### Workspace deprecation

Workspaces are deprecated via the workspace contract governance process (§4.4).
A deprecated workspace:
1. Returns `Deprecation: <date>` + `Sunset: <date>` headers (RFC 8594)
2. Is listed in the `GET /api/v1/workspace/deprecated-list` admin endpoint
3. Returns a `Link: <successor_workspace_id>; rel="successor-version"` header
4. Continues to function for 6 months post-deprecation date
5. After sunset: returns `410 workspace/deprecated` with body pointing to successor

### Per-pack data-product versioning

Pack data products follow the same deprecation cycle. Version is embedded in the
`product_id` slug: `pharma/apr-data-product-v2`. Old versions receive
a 12-month overlap. Pack-owner sign-off is required to deprecate a pack product.

### Stream protocol versioning

WebSocket stream protocol version is indicated in the connection handshake:
`Sec-WebSocket-Protocol: hesem-console-stream-v1`. When a new stream protocol
is introduced (v2), the server continues to support v1 for 12 months. Clients
that connect without a version header receive v1 by default until v1 sunset.

### Idempotent workspace reads

GET workspace reads are idempotent by nature. Clients may safely retry on
transient 503 errors using exponential backoff. The freshness SLO applies
to each retry independently — a 503 from one retry does not guarantee the
same from the next retry 5 seconds later (the projection may have rebuilt
in the interim). The `Retry-After` header value is the recommended minimum
wait before retrying.

---

## 9. Cross-references

- B6 C5 — tenant boundary; region pinning; per-tenant cache isolation
- B8 — CDC outbound feeding projection rebuild pipeline
- B9 — telemetry feeds (OEE, SPC) contributing to workspace data
- E0 — API conventions (problem detail, pagination, versioning)
- E1 — identity and JWT issuer; audit-token issuer
- E2 — authority decision (per-workspace allow/deny)
- E3 — workflow commands (event source for projection rebuild)
- E4 — authoritative record API (fallback for regulated workspaces)
- E6 — audit chain consumed by §2.8 as-of (anchor reference)
- E7 — e-signature events displayed in record-shell tab
- E8 — evidence attachments shown in evidence tab (§2.2)
- E9 — AI advisory consumes §2.6 search for RAG context
- E11 — bulk helpers used by §2.7 bulk projection
- E13 — LRO status tracking for §2.7 and §2.8 large as-of
- E14 — admin API for audit token issuance; workspace governance
- F2 — Dashboard panels consuming §2.3
- F3..F4 — Module list and workspace screens consuming §2.1
- F5 — Authoritative Record Shell consuming §2.2
- F6 — Action Console consuming §2.4 and §2.5
- H3 §4, §7 — audit pack assembly using §2.7 bulk + §2.9 auditor
- H5 — retention policy constraining §2.8 as-of floor
- L2 §3 — AI advisory RAG path via §2.6 search
- M5 — SLO-5 (freshness) + SLO-7 (workspace p95) definitions

---

## 10. Operational runbook notes

### 10.1 Projection rebuild failure (FM1)

When the CDC consumer crashes or falls behind:
- All affected workspaces return `503 projection/incomplete` or
  `503 projection/freshness-stale`
- Regulated workspaces automatically fall back to E4 direct reads
  (slower but authoritative; no banner change for user)
- Non-regulated workspaces show `banner_state: "stale"` for up to their
  max-stale window; beyond that, they return 503
- Recovery: CDC consumer restart + replay from last committed offset
  (Kafka consumer group offset tracked per topic + partition)
- Alert: `hesem-projection-lag` Prometheus alert fires at 30 s lag;
  pages on-call at 60 s lag

### 10.2 Console stream overflow (FM-stream)

When a console stream produces events faster than the client can consume
(e.g., burst of 200+ WO status changes per second on a large shop floor):
- Server sends a `com.hesem.console.overflow` CloudEvent with:
  `{ dropped_event_count, from_seq, to_seq }`
- Client should disconnect and reconnect with `?last_seq=<last_received_seq>`
  which triggers a full workspace re-fetch followed by stream resume
- Client SDKs (F6 JS helper) handle this automatically via
  `HMV4.ConsoleStream.handleOverflow()` in `73-module-template-v4-renderers.js`

### 10.3 Auditor token expiry (FM-auditor)

Audit tokens have hard expiry (valid_to). Expired tokens return
`401 audit-token/expired`. The auditor is redirected to the audit portal
re-authentication flow. All accesses prior to expiry are permanently logged
in the audit chain (per E6 §3.1). Tokens cannot be extended — a new token
must be issued by E14 admin (per H3 §7 workflow).

### 10.4 Per-region failover

If the primary region's projection infrastructure is unavailable:
- Reads are NOT automatically rerouted to another region (data sovereignty)
- The gateway returns `503 server/unavailable` with
  `X-Region-Failover-Available: false`
- Exception: tenants with explicit DR failover agreement (per I4 §3) may
  have a warm standby in a secondary region; failover is manual and triggered
  by SRE (not automatic) to preserve data-sovereignty guarantees

### 10.5 Pack-toggle propagation delay

When a tenant admin enables a pack (e.g., J1 Pharma), pack workspaces
become available after a propagation delay of up to 60 s (feature-flag
cache TTL). During this window, pack workspace requests return
`403 pack/not-enabled`. After 60 s, the workspace becomes available and
projection seeding begins (initial full-table scan; may take minutes for
large datasets before projections are fresh).

---

## 11. Per-pack overlays — expanded

### J1 Pharmaceutical

Pack toggle: `compliance_packs` includes `"pharma"`.

Workspaces unlocked:
- `pharma/ebr-list` — EBR queue by product; freshness ≤ 5 s
- `pharma/batch-release-queue` — BREL pending QP sign-off
- `pharma/stability-dashboard` — stability study trend per product
- `pharma/deviation-trend` — deviation rate by product / site / period
- `pharma/dscsa-portal` — DSCSA chain-of-custody workspace for trading partners

Data product added: `pharma/apr-data-product` — APR KPIs per product.

Console added: `pharma/batch-queue` — live EBR step completion stream,
deviation alert events, QP queue depth updates.

Record-shell extras: `batch` tab on EBR records, `qp-release` tab on BREL.

### J2 Automotive

Pack toggle: `compliance_packs` includes `"auto"`.

Workspaces unlocked:
- `auto/ppap-progress` — PPAP submission funnel by customer / item
- `auto/lpa-cycle` — LPA audit schedule and completion rate
- `auto/8d-queue` — open 8D investigations by severity and customer
- `auto/customer-scorecard` — per-customer quality KPI mirror
- `auto/jit-demand-supply` — JIT/JIS demand vs supply alignment workspace

Console added: `auto/dispatch` — OEE OOC alerts + poka-yoke failure events.

### J3 Aerospace & Defense

Pack toggle: `compliance_packs` includes `"aero"`.

Workspaces unlocked:
- `aero/fai-workspace` — FAI completion by item / program
- `aero/nadcap-cert-tracker` — NADCAP cert expiry and audit schedule
- `aero/sllp-tracking` — service-life-limited part hours/cycles remaining
- `aero/itar-access-log` — ITAR-controlled record access log workspace
  (restricted: itar-admin role required)
- `aero/counterfeit-suspect` — suspect counterfeit part investigations

ITAR redaction: workspace columns marked `itar_controlled: true` show
`redacted: true` for users without `itar-read` JWT scope.

### J4 Medical Device

Pack toggle: `compliance_packs` includes `"md"`.

Workspaces unlocked:
- `md/dhf-aggregation` — DHF completeness scorecard per device
- `md/dhr-aggregation` — DHR build record traceability per serial
- `md/vigilance-trend` — serious incident trend vs baseline alert
- `md/psur-draft` — PSUR drafting workspace with PMCF data
- `md/risk-file` — risk file aggregation (DFMEA + PFMEA + HARA)

Record-shell extras: `dhr` tab on serialized unit records; `vigilance`
tab on complaint records.

### J5 Food Safety

Pack toggle: `compliance_packs` includes `"food"`.

Workspaces unlocked:
- `food/haccp-monitor` — live HACCP CCP parameter monitoring
- `food/section204-viewer` — §204 KDE trace chain per fresh produce lot
- `food/emp-excursion` — environmental monitoring excursion workspace
- `food/mock-recall` — mock recall execution and trace drill workspace

Console added: `food/ccp-monitor` — live CCP deviation alert stream.

---

## 12. Acceptance criteria

```
[x] ≥ 12 endpoints with full per-endpoint contracts
    (§2.1 workspace read, §2.2 record-shell, §2.3 dashboard,
     §2.4 console initial, §2.5 WSS stream, §2.6 search,
     §2.7 bulk, §2.8 as-of, §2.9 auditor portal,
     §2.10 customer portal, §2.11 per-pack product,
     §2.12 freshness HEAD)
[x] Per-pack overlay (J1..J5) — §2.x inline overlays + §11 expanded
[x] Per-tenant cardinality discipline documented (§1.3)
[x] Auditor + inspector portal scoped read documented (§2.9)
[x] Per-region cache isolation documented (§1.4, §4 invalidation)
[x] Freshness SLO per workspace class (§4.1)
[x] Cross-references resolve (§9)
[x] No marketing language
[x] ≥ 5,500 words
[x] Decision phrase emitted
```

---

## 8. Decision phrase

```
S3-02_E5_WORKSPACE_PROJECTION_API_DEEP_UPGRADE_COMPLETE
```

After: load `E6_AUDIT_API.md`.
