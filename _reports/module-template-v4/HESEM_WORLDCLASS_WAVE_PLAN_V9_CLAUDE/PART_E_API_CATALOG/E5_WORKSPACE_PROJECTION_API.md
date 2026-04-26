# E5 — Workspace Projection API

```
api_family:     Workspace Projection
owner_role:     Projection / Read-Model Lead (Platform Lead)
scope:          Read-only projections optimized for UI workspaces;
                multi-source aggregations; freshness-promised reads;
                per-tenant + per-region cache; auditor + customer
                read; data-product surface
sources:        CQRS / event-sourcing patterns, materialized-view
                discipline, per ISA-95 functional projection,
                OpenAPI 3.1.1, RFC 9457, RFC 7234 caching
```

The Workspace Projection API is what UI workspaces query. It serves
denormalized, query-optimized projections derived from authoritative
roots (per E4) plus telemetry (per H4 EC-3) plus AI advisory (per
E9). Projections are eventually consistent with bounded freshness
SLO (per SLO-5). They are never authoritative — mutation goes
through E3.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Per-workspace projection read           authoritative record (E4)
Per-record-shell aggregation             mutation (E3)
Per-dashboard data product               audit pack export (E8 + H3)
Per-AC (action console) live data        per-tenant admin (E14)
Bulk projection (per E11)                per-feature AI advisory (E9
Workspace search                          standalone)
Time-window queries (period reports)
Per-pack data product (per J1..J5)
Auditor-portal projection
Customer-portal projection
External-partner data product (DPA)
```

---

## 2. Endpoint inventory

### 2.1 Workspace projection read

```
PATH                              GET /v1/workspace/{workspace_id}
PURPOSE                            return per-workspace projection
                                  (typically per Part F WS pattern)
AUDIENCE                            UI workspaces (DL / WS / ML);
                                  customer dashboard
RESPONSE                            denormalized projection;
                                  metadata (last_updated, freshness
                                  SLO, source-record refs)
ERRORS                              404 unknown_workspace;
                                  503 projection_freshness_stale;
                                  403 not-in-tenant;
                                  410 deprecated workspace
RATE LIMIT                          high (cached)
CACHE                               per-tenant + per-workspace +
                                  per-filter; TTL per workspace
                                  (typ 5-30s high-velocity;
                                  hours master-data view)
SLO                                 per SLO-5 (freshness)
                                  + per SLO-7 (render p95 < 200ms
                                  surrogate)
```

### 2.2 Record-shell projection

```
PATH                              GET /v1/record-shell/
                                  {root_kind}/{root_id}
PURPOSE                            per-record aggregated view for
                                  AR shell (per F5)
RESPONSE                            record-shell envelope:
                                  identification block;
                                  state info; tabbed sections
                                  (overview / related / evidence /
                                  history); per-tab freshness;
                                  per-pack overlay sections;
                                  banner-state (degraded /
                                  partial-access / live-mode)
COUPLINGS                           per-tab fetch may parallelize;
                                  per-tab freshness independently
                                  measured
```

### 2.3 Dashboard data product

```
PATH                              GET /v1/dashboard/{product_id}
PURPOSE                            named, governed data product
                                  surface per dashboard (DL pattern)
INPUT                              named filter set per data product
RESPONSE                            aggregated KPI / time-series /
                                  chart-data; per data product
                                  contract (governed per H7);
                                  freshness SLO declared per
                                  product
DEPRECATION                          per E0 + per data product
                                  governance
```

### 2.4 Action-console projection (real-time)

```
PATH                              GET /v1/console/{ac_id}
                                  WSS /v1/console/{ac_id}/stream
                                  (WebSocket / SSE)
PURPOSE                            live data for action console
                                  (per F6) — shopfloor, dispatch,
                                  recall, complaint
RESPONSE                            initial payload + live stream
                                  (CloudEvents 1.0)
SLO                                 sub-second event delivery
COUPLINGS                           per E3 subscription path
                                  (event source)
```

### 2.5 Workspace search

```
PATH                              GET /v1/workspace/search
PURPOSE                            free-text search across
                                  workspace projections
AUDIENCE                            UI search bars; AI advisory
                                  (RAG; per L2 §3); investigation
RESPONSE                            ranked results with hit
                                  evidence; per-source citation
                                  (for AI use); per-tenant scope
                                  enforced
SPECIAL                             cross-tenant queries impossible
                                  (per B6 C5);
                                  query log retained per H5
```

### 2.6 Bulk projection (per E11 + E13)

```
PATH                              POST /v1/workspace/bulk
PURPOSE                            bulk export per workspace /
                                  per data product
AUDIENCE                            customer-side analytics;
                                  audit pack assembly;
                                  migration tooling
RESPONSE                            long-running-operation handle
                                  per E13; signed archive on
                                  completion
EVIDENCE EMIT                       export_record (EC-22);
                                  per H3 §4 audit pack contribution
RATE LIMIT                          very low; per-tenant quota
```

### 2.7 Time-window query (as-of)

```
PATH                              GET /v1/workspace/{workspace_id}/
                                  asof
PURPOSE                            point-in-time query
                                  (period report; reproducibility)
AUDIENCE                            audit pack assembly (audit
                                  needs "as-of" view);
                                  customer reporting
RESPONSE                            projection as of given timestamp
SPECIAL                             uses event-source replay
                                  (per B6); slower than 2.1;
                                  cached per asof + scope
```

### 2.8 Auditor / customer projection

```
PATH                              GET /v1/auditor/projection/...
                                  GET /v1/customer/projection/...
PURPOSE                            scoped projection for auditor /
                                  customer portal
SCOPE                              audit-token scoped
                                  (time + resource + window);
                                  customer-tenant scoped
EVIDENCE EMIT                       access_audit (every query
                                  retained perpetual for auditor)
```

### 2.9 Per-pack data product

```
PATH                              GET /v1/{pack}/dataproduct/...
PURPOSE                            pack-specific data product
                                  (e.g., /pharma/apr-data-product;
                                  /auto/ppap-data-product)
SCOPE                              pack-toggled per tenant
EVIDENCE EMIT                       per H3 §4 audit pack
```

### 2.10 Freshness query

```
PATH                              HEAD /v1/workspace/{workspace_id}
PURPOSE                            return last-updated + projection
                                  freshness without payload
AUDIENCE                            UI staleness indicator;
                                  audit / regulator pre-flight
EVIDENCE EMIT                       minimal
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session per E1
TENANT SCOPE                    enforced (per B6 C5);
                                cross-tenant impossible
PER-WORKSPACE AUTH                per workspace id (some
                                workspaces restricted to roles
                                or pack-toggle)
FIELD-LEVEL REDACTION             per role + per pack
                                (e.g., cost data redacted from
                                operator role; PII fields redacted
                                by default)
AUDITOR SCOPE                      time-window + resource scope;
                                cross-tenant impossible;
                                queries logged perpetually
CUSTOMER SCOPE                       customer-tenant; customer-DPO
                                read-only
SUB-PROCESSOR                       per L2 §8 + I8;
                                per-tenant DPA control
```

---

## 4. Cache + freshness

```
PROJECTION FRESHNESS POLICY     per workspace; declared in
                                workspace contract; per SLO-5
                                measurement
TTL                              per workspace (typ 5-30s for
                                high-velocity; hours for slow-
                                changing master data)
INVALIDATION                       on E3 commit → CDC →
                                projection rebuild → cache
                                invalidate (CloudEvents)
STALE-WHILE-REVALIDATE            allowed for low-priority reads
                                with explicit freshness header;
                                regulated workspaces never serve
                                stale
PER-REGION CACHE                    per B6 C5 region pinning;
                                per region invalidation event
SHARED VS PRIVATE CACHE             never shared cache for tenant
                                data
ETag-AS-OF                            per 2.7 time-window query
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class with workspace
                                 + freshness state in detail
OPENAPI 3.1.1                       spec governed per H7
ASYNCAPI 3.0                         per 2.4 console stream
OBSERVABILITY                        per request: trace + tenant +
                                 workspace + freshness
AUDIT CHAIN                          access_audit on regulated
                                 workspaces (sampled);
                                 full on auditor portal
TENANT BOUNDARY                       cross-tenant impossible (B6 C5)
PII REDACTION                        per role + per field (B6 + I7 §9)
DEPRECATION                            per E0
RATE LIMITING                            per identity + per tenant +
                                 per workspace
```

---

## 6. Failure modes (RFC 9457)

```
TYPE                                 STATUS
projection/freshness-stale            503 (per SLO-5 burn)
projection/incomplete                  503 (rebuild in progress)
workspace/not-found                     404
workspace/deprecated                    410
auth/unauthorized                       401
auth/forbidden                           403
tenant/boundary-violation                403 SEV-1
filter/invalid                            400
filter/banned-attribute                   422 (e.g., querying PII
                                       attribute without role)
search/quota-exceeded                     429
asof/before-retention                      410 (asof too old per H5)
sub-processor/unavailable                  503
```

---

## 7. SLO + budget

```
2.1 workspace p95                  SLO-7 < 200ms;
                                  freshness SLO-5 < 5s
2.2 record-shell p95                < 250ms
2.3 dashboard p95                    < 300ms
2.4 console initial p95              < 250ms
2.4 console stream                    sub-second per event
2.5 search p95                          < 300ms
2.6 bulk                                  long-running per E13
2.7 asof                                  longer (event-source
                                          replay)
2.8 auditor                                stricter freshness
2.9 per-pack                                per pack contract
2.10 freshness                              < 50ms
```

---

## 8. Wave target

```
W3        L4 read-only workspace projections (per HMV4);
          basic freshness reporting
W4        L5 record-shell projections + AC console
W5        L5 dashboard data products
W7        AI advisory consumes 2.5 search (RAG); per L3 stages
W8        L6 SOC 2 + DORA Elite for read path
W10       per-pack data products (J1..J5)
W12       sovereign region variants
```

---

## 9. Per-pack overlays

```
PHARMA (J1)                      EBR projection; APR aggregation;
                                 stability projection; deviation
                                 trend; DSCSA partner portal
                                 projection
AUTO (J2)                        APQP project tracking;
                                 PPAP submission progress;
                                 LPA cycle visibility;
                                 8D investigation;
                                 customer scorecard mirror
AERO (J3)                        FAI workspace;
                                 NADCAP cert tracking;
                                 counterfeit-suspect projection;
                                 service-life-limited tracking;
                                 ITAR access audit
MD (J4)                          DHF / DHR aggregations;
                                 vigilance trend;
                                 PSUR drafting projection;
                                 PMS / PMCF data;
                                 risk-file aggregation
FOOD (J5)                        HACCP plan + CCP monitoring;
                                 §204 traceability viewer;
                                 EMP excursion;
                                 mock-recall projection
```

---

## 10. Failure modes (operational)

```
FM1   Projection rebuild failure (CDC consumer crash)
      Behavior: 503 projection/incomplete
      Recovery: per RB-INC-001 + RB-INC-013;
              consumer restart; replay from last-anchor

FM2   Cache invalidation lag during supersession
      Behavior: stale projection briefly
      Recovery: typ < 5s; regulated workspaces fresh-read
              fallback; auditor port never caches stale

FM3   Search quota breach
      Behavior: 429
      Recovery: per-tenant quota review; E14 admin override

FM4   Freshness SLO breach sustained
      Behavior: SLO-5 burn alert; workspace banner "stale"
      Recovery: per I3; investigate downstream;
              degraded mode possible

FM5   Cross-tenant projection cache hit
      Behavior: rejected at cache layer (cache-key includes
              tenant); SEV-1 if breach
      Recovery: H8 systemic CAPA

FM6   Time-window query before retention floor
      Behavior: 410 asof/before-retention
      Recovery: per H5; auditor pack alternative path

FM7   Per-pack workspace queried without pack toggle
      Behavior: 404 (workspace not enabled)
      Recovery: per I8 tenant config; per H7 pack toggle CR

FM8   Sub-processor (e.g., search backend) outage
      Behavior: 503 sub-processor/unavailable
      Recovery: per L2 §2 on_failure_behavior;
              degraded search; per I3
```

---

## 11. Cross-references

- B6 — projection substrate; CDC; cache; tenant boundary
- B8 — CDC outbound feeding projections
- E0 — API conventions
- E1 — identity
- E2 — authority decision (per-workspace allow)
- E3 — workflow commands (event source)
- E4 — record API (alternative authoritative read)
- E6 — audit chain consumed by 2.7 asof
- E8 — evidence API for auditor / customer
- E9 — AI advisory consumes 2.5 search (RAG)
- E11 — bulk projection
- E13 — long-running export
- E14 — admin (workspace governance)
- F1..F8 + F11 + F12 — UI patterns + a11y + i18n
- H3 §7 — auditor portal projection
- H4 — access_audit (EC-22)
- H5 — retention (per H5 §2 projection)
- L2 — AI advisory consumes
- M5 — SLO-5 + SLO-7
- M9 — cross-reference

---

## 12. Decision phrase

```
E5_WORKSPACE_PROJECTION_API_BASELINE_LOCKED
NEXT: E6_AUDIT_API.md
```
