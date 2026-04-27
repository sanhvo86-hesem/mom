# F9 — Frontend ↔ Backend Binding

```
chapter_purpose: Exhaustive binding contract from every UI surface pattern
                 (F1–F8) to every API family (E1–E15); live/fixture mode
                 discipline; concurrency, idempotency, error, subscription,
                 LRO, bulk, file, AI, authority, e-sig, and cross-region
                 binding flows.
owner_role:      API Lead + Frontend Lead (joint ownership)
version:         V10 deep upgrade
standards:       OpenAPI 3.1.1 · AsyncAPI 3.0 · CloudEvents 1.0 · RFC 9457
                 · RFC 7232 ETag · WebSocket RFC 6455 · SSE · HTTP 207
                 · Google AIP-151 LRO · HMV4 ADR-0001 · ADR-0004 · ADR-0009
```

---

## 1. Purpose and Scope

F9 is the **substrate contract** — the layer that specifies how every pixel
of HESEM frontend connects to every byte of HESEM backend. It is the master
authority read by:

- **Frontend engineers** to know which endpoints to call, in what order, with
  what headers, and how to handle every response variant.
- **Backend engineers** to know which API contracts the frontend depends on so
  they can preserve backward compatibility across releases.
- **API Lead** to assess breaking-change blast radius: which surfaces break if
  an endpoint changes signature.
- **QA and automation** to know which pairs to test together in integration
  and E2E suites.
- **Security reviewers** to verify that sensitive flows (e-sig, evidence
  WORM, LRO cancel) follow the prescribed binding sequence.

### 1.1 Pattern Inventory

Eight UI surface patterns are specified in F0–F8:

| Code | Pattern | Primary Spec |
|------|---------|-------------|
| SH | Shell & Navigation | F1 |
| DL | Dashboard / List Screen | F2 |
| ML | Module Landing Screen | F3 |
| WS | Workspace Projection | F4 |
| AR | Authoritative Record Shell | F5 |
| AC | Action Console | F6 |
| NRD | Non-Routing Drawer / Dialog | F7 |
| WZ | Sub-Flow Wizard | F8 |

### 1.2 API Family Inventory

| Family | Spec | Description |
|--------|------|-------------|
| E1 | Auth + Can | Authentication, authorization, /can capability check |
| E2 | Tenant Governance | Tenant config, authority decisions, feature flags |
| E3 | Workflow Command | State-machine transitions + bulk workflow |
| E4 | Record API (per domain) | CRUD for all 18 root record types across 14 domains |
| E5 | Workspace Projection | CQRS read-side projections with CDC freshness |
| E6 | Audit API | Immutable audit trail, Merkle anchor, RFC 3161 TSA |
| E7 | E-Signature API | 21 CFR 11 / EMA GxP challenge-compose quorum |
| E8 | Evidence API | 38-class evidence attachments, WORM, composition gate |
| E9 | AI Advisory | 32 L2 features, RAG citation, confidence, override capture |
| E10 | Notification | 7-channel push, quiet-hours, SEV-1 bypass, freeze |
| E11 | Bulk Operation | HTTP 207 per-record idempotency, signed manifest |
| E12 | File Upload | 3-step tus/presigned upload, ClamAV scan, WORM lock |
| E13 | Long-Running Operation | Google AIP-151 LRO, checkpoint/restart, per-tenant queue |
| E14 | Search & Analytics | Full-text search, facet aggregations, saved queries |
| E15 | Integration | EDI X12/EDIFACT, DSCSA/EPCIS, regulatory connectors |
| E16 | Admin & Config | Tenant settings, role matrix, token catalog, graphics |

---

## 2. Binding Contract Model

Every UI surface binding is described across the following axes:

```
Surface instance
  [R]  Read path      — what is fetched on render; ETag capture
  [M]  Mutation path  — what is called on user action; idempotency key
  [S]  Subscription   — WebSocket / SSE channel and CloudEvents filter
  [L]  LRO path       — which E13 operation types are initiated + polled
  [B]  Bulk path      — E11 usage; 207 result chip rendering
  [F]  File path       — E12 usage; upload lifecycle + progress UI
  [AI] AI advisory    — E9 endpoint; confidence threshold; override NRD
  [N]  Notification   — E10 inbound push; banner / toast / bell update
  [A]  Authority      — E2.8 button-enable/disable; banned-decision gate
  [ES] E-signature    — E7 full challenge-compose flow; manifestation
  [ER] Error handling — RFC 9457 problem-detail rendering; cause chain
  [CC] Concurrency    — ETag mismatch → re-load → re-edit flow
  [ID] Idempotency    — client-side key generation; replay detection
  [CR] Cross-region   — region-pinned headers; customer portal variant
  [FM] Fixture mode   — ADR-0001/0004 discipline; flag routing
  [KPI] KPIs          — per-pattern latency SLO; success rate target
```

### 2.1 Request Header Disciplines

All API calls from the frontend carry the following standard header set:

```
Authorization:       Bearer <access_token>  (E1 JWT, RS256)
X-Tenant-ID:         <tenant_slug>
X-Request-ID:        <uuid4>               (correlation)
X-Idempotency-Key:   <mutation-uuid4>      (E3/E11 mutations only)
X-HMV4-Fixture-Mode: true | false          (when HMV4_FIXTURE_MODE flag active)
X-HMV4-Root:         <ROOT_CODE>           (e.g. NQCASE, DISP, TRAIN)
If-Match:            <etag>                (optimistic concurrency, E4/E5)
Accept-Language:     <BCP-47>              (ICU MF2 locale for error messages)
```

---

## 3. Per-Pattern Binding Contracts

### 3.1 SH — Shell & Navigation (F1)

**[R] Initial shell hydration**
```
GET /api/v2/auth/me                     → user identity, avatar, AAL level
GET /api/v2/tenant/config               → E2 tenant config (branding, pack flags, region)
GET /api/v2/tenant/feature-flags        → E2 HMV4_LIVE_API_<ROOT> flags per root
GET /api/v2/notifications/badge         → E10 unread count for bell indicator
GET /api/v2/ai/assistant/status         → E9 assistant availability (online/degraded/off)
GET /api/v2/graphics/tokens             → E16 GraphicsAuthority token catalog
```

**[S] Shell subscriptions (WebSocket /ws/v2/shell)**
```
CloudEvents filter: type = "hesem.notification.created"
                    type = "hesem.system.alert"
                    type = "hesem.lro.status_changed"  (for progress toast)
On event: update bell badge count; render toast per E10 channel priority
```

**[A] Authority gate — domain nav items**
```
For each of 14 domain nav items:
  GET /api/v2/auth/can?action=domain.<slug>.view&subject=TENANT
  → enabled=true: render nav item; enabled=false: hide (not disable)
Pack-gated items (J1..J5) additionally check:
  GET /api/v2/tenant/packs → active pack list; suppress non-active pack items
```

**[ER] Problem detail**
```
Any 4xx/5xx from shell hydration endpoints → degraded-shell banner
  (type: hesem:shell/degraded-hydration; suggested_action: reload page)
401 on /auth/me → redirect to login; preserve return_to URL
503 → maintenance banner (F1 §3.6 banner type 6)
```

**[FM] Fixture mode**
```
When HMV4_FIXTURE_MODE=true (set by feature flag check):
  Shell still calls live /auth/me and /tenant/config
  Domain nav still driven by live /auth/can
  GraphicsAuthority still live
  ORANGE banner "DEVELOPMENT ENVIRONMENT — FIXTURE DATA ACTIVE" rendered (ADR-0001)
  All subsequent E4/E5 calls intercepted by fixture adapter (§4 below)
```

**[KPI]** Shell hydration p95 < 800 ms total (all parallel calls). Bell badge update latency < 200 ms via WS push.

---

### 3.2 DL — Dashboard / List Screen (F2)

**[R] Dashboard render**
```
GET /api/v2/dashboards/{dashboard_id}/tiles    → tile definitions + data refs
For each tile:
  GET /api/v2/analytics/query/{tile_query_id}  → E14 aggregation result
  ETag captured per tile; stored in DL tile state map
GET /api/v2/notifications/in-context?scope=dashboard → E10 context alerts
```

**[S] Live tile subscription**
```
WebSocket /ws/v2/analytics/live?dashboard_id={id}
CloudEvents: type = "hesem.analytics.tile_data_updated"
On event: re-fetch stale tile(s) only; update ETag; re-render chip
```

**[AI] AI-powered dashboard insight**
```
GET /api/v2/ai/advisory/insight?context=dashboard&dashboard_id={id}
  → E9 response: {feature_id: "AI-08", confidence: 0.87, insight: "...",
                  citations: [{source, excerpt, page}], caveat: "..."}
Confidence threshold (configured per tenant E2 §2.8):
  ≥ threshold → show inline insight chip
  < threshold → show "low confidence" dimmed chip with expand option
Override capture: user dismisses → POST /api/v2/ai/advisory/override-capture
```

**[ER] Tile load failure**
```
404 on tile query → placeholder "Data not available" tile
503 → tile shows degraded badge, retry button
RFC 9457 detail rendered in tile tooltip on hover
```

**[FM]** Tile data from `tests/fixtures/module-template-v4/record-fixtures.json` when HMV4_FIXTURE_MODE=true; tile layout still from live API; AI insight chip hidden in fixture mode (E9 not called).

**[KPI]** DL full render p95 < 600 ms (tile data parallel); individual tile refresh < 200 ms on WS push.

---

### 3.3 ML — Module Landing Screen (F3)

**[R] Module landing render**
```
GET /api/v2/modules/{module_slug}/summary        → counts, KPI tiles, alert count
GET /api/v2/auth/can?action=module.{slug}.create → create button enable/disable
GET /api/v2/notifications/in-context?scope=module&module={slug}
GET /api/v2/ai/advisory/module-health?module={slug}  → E9 AI health digest
```

**[A] Authority — quick-action tiles**
```
Each quick-action tile (create / import / bulk assign) calls:
  GET /api/v2/auth/can?action={action_key}&subject=MODULE:{slug}
  → Button rendered enabled/disabled per response
  Banned-decision actions (per E2.8 §4): tile hidden entirely, not disabled
```

**[M] Create record initiation**
```
POST /api/v2/{domain}/{root_type}            → E4 create (returns 201 + Location)
X-Idempotency-Key: <uuid4>                  → prevents duplicate on retry
On success: navigate to new AR shell via Location header
On 409 Conflict (idempotency replay): navigate to existing record
```

**[FM]** In fixture mode: module summary from fixture JSON; create action disabled (mutation blocked per ADR-0004 fixture discipline).

**[KPI]** ML render p95 < 400 ms.

---

### 3.4 WS — Workspace Projection (F4)

**[R] Workspace load**
```
GET /api/v2/workspaces/{root_type}/projection
  Query params: filter, sort, page, per_page, fields
  Headers: If-None-Match: {cached_etag}
  → E5 projection response with ETag, X-Freshness-Age, X-Projection-Lag-Ms
ETag stored in WS state; X-Freshness-Age drives freshness banner (F4 §2.6)
GET /api/v2/auth/can?action={root}.bulk_action → bulk-action toolbar enable
```

**[S] Row-level subscription**
```
WebSocket /ws/v2/workspaces/{root_type}
CloudEvents filter: type = "hesem.{root_type}.record_updated"
                    type = "hesem.{root_type}.record_created"
                    type = "hesem.{root_type}.record_deleted"
On record_updated: row highlight animation (200 ms); re-fetch single row
  GET /api/v2/{domain}/{root_type}/{id}?fields=projection_fields
On record_created: prepend row if matches current filter
On record_deleted: remove row; decrement count badge
```

**[B] Bulk workspace operation**
```
User selects ≥2 rows → bulk toolbar appears
User clicks bulk action → POST /api/v2/bulk/{operation_type}
  Body: {record_ids: [...], idempotency_key, signed_manifest: {...}}
  → E11 response: HTTP 207 Multi-Status
    [{id, status, result | problem_detail}]
207 result chip per row: ✓ green / ✗ red / ⏳ pending
If any row fails: NRD-08 bulk result drawer (F7) summarizing failures
```

**[CC] Concurrency — projection stale detection**
```
HEAD /api/v2/workspaces/{root_type}/projection
  → If ETag differs from stored: stale banner + "Reload" button
  → On reload: GET with no If-None-Match; update ETag
Per-tab freshness polling interval driven by WS class SLO (F4 §2.4):
  Operational workspaces: 30 s
  QMS record workspaces: 60 s
  Analytics workspaces: 120 s
```

**[LRO] Long-running workspace rebuild**
```
Certain workspace projections (large dataset rebuild) return 202 Accepted
  with Operation-Location header per E13
Frontend polls: GET {Operation-Location} every 5 s
  → status: RUNNING → progress bar (checkpoint % from E13 response)
  → status: DONE → reload projection
  → status: FAILED → error banner with cause_chain from RFC 9457
LRO cancel available: DELETE {Operation-Location} (user can abort)
```

**[FM] Fixture mode discipline per ADR-0004**
```
HMV4_LIVE_API_{ROOT} flag lookup (E2 tenant feature flags):
  false (default): fixture adapter intercepts GET /workspaces/...
    → returns tests/fixtures/module-template-v4/record-fixtures.json slice
    → X-HMV4-Fixture-Mode: true injected in response
    → ORANGE banner rendered (ADR-0001 §2)
  true: live API called; banner text changes to "LIVE DATA — PRE-PRODUCTION"
Mutation calls (POST/PUT/PATCH/DELETE) always blocked in fixture mode
  → NRD-12 "Action blocked in fixture mode" dialog
Subscription (WS) not opened in fixture mode; poll-based simulated refresh instead
```

**[KPI]** WS initial render p95 < 250 ms (per HMV4 slice acceptance criterion). Row update via WS push < 100 ms render. Bulk 207 response to chip render < 50 ms.

---

### 3.5 AR — Authoritative Record Shell (F5)

The AR shell is the most API-intensive surface. It binds to E1, E3, E4, E6,
E7, E8, E9, E10, E11, E12, E13, E14, E15, and E2.

**[R] AR initial load (parallel fetch)**
```
Fetch group A (record data):
  GET /api/v2/{domain}/{root_type}/{id}          → E4 record; ETag captured
  GET /api/v2/auth/can?action=*&subject={root_type}:{id}  → full capability map

Fetch group B (tabs, loaded lazily on tab activation):
  Tab "Audit":    GET /api/v2/audit/records/{id}/events?page=1&per_page=50   → E6
  Tab "Evidence": GET /api/v2/evidence/{root_type}/{id}/attachments           → E8
  Tab "AI":       GET /api/v2/ai/advisory/record-analysis?record_type={root}&id={id} → E9
  Tab "Workflow": GET /api/v2/workflow/{root_type}/{id}/history                → E3
  Tab "Notif":    GET /api/v2/notifications?record_id={id}                    → E10
  Pack tabs (EBR/DHF/PPAP/FAI/HACCP): GET /api/v2/{pack}/record-overlay/{id} → E15 pack adapter
```

**[CC] ETag concurrency flow**
```
1. AR stores ETag from initial E4 GET
2. User opens edit form: ETag shown in debug panel (developer mode)
3. User submits edit:
   PUT /api/v2/{domain}/{root_type}/{id}
   If-Match: {stored_etag}
   → 200 OK: success; capture new ETag from response ETag header
   → 412 Precondition Failed:
     a. Fetch current record: GET with no If-Match
     b. Open NRD-05 "Conflict Resolution" drawer (F7)
        - Left panel: user's in-progress changes
        - Right panel: current server version with diff highlight
        - Actions: "Accept mine", "Accept theirs", "Merge"
     c. On resolution: re-submit with new ETag
```

**[M] Mutation paths per record state**
```
State-gated mutations (per E3 workflow state machine):
  PATCH /api/v2/{domain}/{root_type}/{id}     → field-level update (no state change)
    Body: JSON Merge Patch (RFC 7396); If-Match required
  POST /api/v2/workflow/{root_type}/{id}/command
    Body: {command: "APPROVE" | "REJECT" | "ESCALATE" | ...,
           comment: "...", e_signature_envelope: {...}}
    → 202 Accepted + Operation-Location (if LRO) or 200 OK (sync)

Action button enable/disable driven by /can map:
  can.{root_type}.approve → Approve button enabled
  can.{root_type}.reject  → Reject button enabled
  ...
Banned-decision actions (E2.8 §4): button hidden; action cannot be AI-auto-committed
```

**[ES] E-Signature flow (E7 full)**
```
Trigger: user clicks regulated action button (approve/release/dispose)
Step 1: POST /api/v2/esig/challenge
  Body: {record_id, action, quorum_required: N, regulation: "21_CFR_11" | "EU_GXP"}
  → {challenge_id, factor_requirements, manifestation_text (per language), bd_code}
Step 2: NRD-03 E-Signature Dialog (F7) opens
  - Manifestation text rendered (per BD manifest, current locale)
  - Reason-for-signature label
  - BD code chip
  - AAL indicator badge (AAL2 → password+OTP; AAL3 → hardware key)
  - Credential input
  - Quorum progress (if multi-sig): signer N of M
  POST /api/v2/esig/factor   (once per factor)
  → {factor_id, verified: true}
Step 3: POST /api/v2/esig/compose
  Body: {challenge_id, factor_ids: [...]}
  → {envelope: {...signed payload...}, expires_at}
  Envelope attached to workflow command in Step 4
Step 4: POST /api/v2/workflow/{root_type}/{id}/command
  Body: {command, e_signature_envelope: <envelope from step 3>}
  → 200 OK | 202 LRO | 422 (invalid envelope) | 423 (lockout)
  On 423: NRD-02 Account Locked drawer (F7 §3.2); notify IT via E10 SEV-1 channel
  On success: AR re-fetches E4 record; new state rendered; audit tab refreshed
```

**[AI] AI advisory in AR**
```
AI chip in AR header:
  GET /api/v2/ai/advisory/record-analysis
    → {feature_id: "AI-03", confidence, insight, citations[{source,excerpt,page}],
       caveat, override_allowed: bool}
Confidence threshold check (E9 §2.6):
  ≥ tenant threshold → insight chip visible, citations expandable
  < threshold → "Low confidence" chip, expand to see raw
  L1 §5 override: if override_allowed, user can accept/dismiss
    POST /api/v2/ai/advisory/override-capture
      Body: {record_id, feature_id, decision: "accepted"|"dismissed", user_comment}
L1 §4 triple defense: all AI suggestions carry defensive banner per feature tier:
  L1 features → "AI suggestion — human review required"
  L2 features → feature-specific caveat from E9 response
Banned-decision guard: if action is in E2.8 banned list, AI chip hides "apply" button;
  user must manually act; override_capture still records the AI suggestion.
```

**[B] Bulk actions from AR (batch on related records)**
```
AR "Related records" tab → user selects subset → POST /api/v2/bulk/{op}
  → E11 207 response → NRD-08 bulk result drawer (F7)
```

**[F] File upload from AR evidence tab**
```
User drags file onto evidence tab:
Step 1: POST /api/v2/files/initiate
  Body: {filename, size, mime_type, evidence_class, record_id}
  → {upload_id, presigned_url | tus_endpoint, scan_required: bool}
Step 2: PUT <presigned_url> | tus PATCH sequence
  Progress bar driven by upload progress event
Step 3: POST /api/v2/files/{upload_id}/commit
  → {file_id, scan_status: "pending"|"clean"|"infected"}
  If scan_status=pending: polling spinner (5 s interval) → GET /api/v2/files/{upload_id}/status
  If infected: NRD-09 "Upload rejected — malware detected" dialog; file purged
  If clean: evidence record created; E8 evidence tab refreshes
WORM lock (if evidence_class requires): POST /api/v2/files/{file_id}/lock
  → {worm_mode: "COMPLIANCE"|"GOVERNANCE", locked_until}
  Locked badge rendered on file row in evidence tab
```

**[LRO] Long-running AR operations**
```
Operations returning 202 (E13): batch release, re-index, bulk state transition
  Frontend opens NRD-10 "Operation in Progress" drawer (F7)
  Polls GET {Operation-Location} every 5 s
  Progress: checkpoint % from E13 response.progress_pct
  Cancel: DELETE {Operation-Location} → user confirms in NRD-07 dialog
  On DONE: drawer closes; AR refreshes record + audit tab
  On FAILED: RFC 9457 cause_chain rendered in NRD; download log button
```

**[ER] Problem-detail rendering**
```
All E4/E3/E7/E8 errors → RFC 9457 problem detail object:
  {type URI, title, status, detail, instance, cause_chain[], suggested_action}
Rendering:
  4xx client errors → inline error in form field (if validation) or toast (if auth)
  5xx server errors → error banner in AR header; cause_chain in expandable panel
  409 Conflict     → ETag flow above (§3.5 CC)
  503 Degraded     → AR degraded banner; read-only mode; refresh button
```

**[KPI]** AR initial render (group A) p95 < 400 ms. Tab lazy load p95 < 300 ms. E-sig NRD open p95 < 200 ms. File commit + scan complete p95 < 10 s.

---

### 3.6 AC — Action Console (F6)

**[R] Console load**
```
GET /api/v2/{domain}/{root_type}/{id}           → E4 record (current state)
GET /api/v2/auth/can?action={console_action}    → E1 authorization
GET /api/v2/ai/advisory/action-assist?action={console_action}&record_id={id}
  → E9 pre-fill suggestions for console form fields
GET /api/v2/workflow/{root_type}/{id}/guard-check?action={action}
  → E3 guard: {passed: bool, blockers: [{field, message}]}
  Blockers rendered as inline warnings on console form
```

**[M] Console submit**
```
POST /api/v2/workflow/{root_type}/{id}/command
  Body: {command, form_data, e_signature_envelope (if required), idempotency_key}
  If regulated action: E7 flow must complete first (§3.5 ES above)
  → 200 OK: success toast; navigate back to AR or WS per routing config
  → 202 Accepted + LRO: NRD-10 progress drawer (§3.5 LRO)
  → 422 Validation: inline field errors from problem_detail.errors[]
  → 409 Conflict: ETag re-load flow
  → 423 Locked: NRD-02 account-locked drawer
```

**[B] Bulk console**
```
AC operating on selected WS rows:
  POST /api/v2/bulk/{operation_type}
    Body: {record_ids, form_data, idempotency_key, signed_manifest}
    → E11 207 response
    Per-record result chips in console results panel
    Download 207 report: CSV export of per-record outcomes
```

**[AI] Action-assist pre-fill**
```
E9 action-assist suggestions pre-fill console form fields:
  Each pre-filled field carries AI badge
  User can accept (no action) or clear (fires override-capture)
  Confidence threshold: below threshold → pre-fill with "suggestion" watermark, not committed value
  L1 §5 override capture always fires when user modifies AI-pre-filled field
```

**[KPI]** Console open p95 < 300 ms. Bulk 207 result render < 100 ms after response.

---

### 3.7 NRD — Non-Routing Drawer / Dialog (F7)

NRDs are secondary surfaces that always operate in the context of a host surface
(WS, AR, or AC). Their binding inherits the host surface's ETag and auth context.

**[R] NRD data load**
```
Most NRDs receive their data from the host surface's already-fetched state
(no extra network call required).
Exceptions that fetch independently:
  NRD-01 Create Record drawer:
    GET /api/v2/{domain}/{root_type}/schema → field definitions + validation rules
  NRD-03 E-Signature dialog:
    POST /api/v2/esig/challenge (as described in §3.5 ES)
  NRD-05 Conflict Resolution:
    GET /api/v2/{domain}/{root_type}/{id} (fresh fetch to get server version)
  NRD-06 Batch Import drawer:
    POST /api/v2/files/initiate (as described in §3.5 F)
  NRD-08 Bulk Result drawer:
    Data from in-memory 207 response; no extra fetch
  NRD-11 LRO Progress drawer:
    Polling GET {Operation-Location} (as described in §3.5 LRO)
  NRD-12 AI Expand drawer:
    GET /api/v2/ai/advisory/explain?citation_id={id} → full citation text
```

**[ID] Idempotency in NRD mutations**
```
NRD-01 (Create): generates idempotency_key on drawer open; attached to POST E4 create
NRD-03 (E-sig): challenge_id serves as session key; factor calls idempotent per factor
NRD-04 (Comment): idempotency_key generated on drawer open; attached to POST /comments
Each NRD mutation is safe to retry if network fails before response arrives;
  server de-duplication returns 200 with existing result (not 201) on replay
```

**[FM] NRD fixture mode**
```
Mutation NRDs (create, edit, comment, e-sig) blocked in fixture mode
→ NRD replaced with NRD-12 "Blocked in fixture mode" notice
Read-only NRDs (audit trail, AI expand, conflict view) functional in fixture mode
  using fixture data
```

**[KPI]** NRD open (animation) < 200 ms. NRD data load (exceptions) < 300 ms p95.

---

### 3.8 WZ — Sub-Flow Wizard (F8)

**[R] Wizard init**
```
GET /api/v2/wizards/{wizard_type}/init?record_id={id}
  → {steps: [{step_id, title, api_refs, required_evidence_classes, guard_check}],
     checkpoint_id: null | {id, resumed_at, progress_pct}}
If checkpoint_id present: "Resume previous session?" prompt
  → Yes: load saved state from checkpoint (E13 checkpoint data)
  → No: start fresh; DELETE previous checkpoint
```

**[M] Step submission**
```
Each wizard step submission:
  PATCH /api/v2/wizards/{wizard_type}/steps/{step_id}
    Body: {record_id, step_data, idempotency_key}
    → {step_result, next_step | null, checkpoint_id}
  checkpoint_id returned after each step; stored in wizard state
  If user closes wizard mid-flow: session saved; resume prompt on re-open
```

**[LRO] Wizard final submit**
```
Final step submit: POST /api/v2/wizards/{wizard_type}/submit
  Body: {record_id, all_step_data, e_signature_envelope (if required)}
  → 202 Accepted + Operation-Location → E13 LRO
  Wizard transitions to progress screen (step kind: LRO_PROGRESS per F8 §2.8)
  Polls LRO per §3.5 LRO; on DONE → success screen; on FAILED → retry or exit
```

**[ES] Wizard e-signature step (step kind: ESIG_CAPTURE)**
```
Wizard calls E7 challenge-initiate for the specific wizard action code
  E7 quorum requirements loaded from BD code manifest
  E-sig NRD-03 embedded within wizard (not separate drawer)
  Envelope carried forward to final submit payload
```

**[F] Wizard file upload step (step kind: FILE_UPLOAD)**
```
Wizard file upload step uses E12 upload flow embedded in step panel
  upload_id and file_id carried in step_data for final submit
  Virus scan result must be "clean" before step can proceed (Next button disabled)
```

**[AI] Wizard AI-assist step (step kind: AI_REVIEW)**
```
GET /api/v2/ai/advisory/wizard-assist?wizard={type}&step={step_id}&record_id={id}
  → suggestions per field; confidence per field
  User reviews, edits, and proceeds — override captured per E9
```

**[ER] Wizard error handling**
```
Step validation failure (422): inline field errors; user stays on step
Network failure during step submit: retry button; idempotency_key unchanged
LRO failure: cause_chain rendered in wizard failure screen; "Retry" button
  re-uses same Operation-Location (E13 checkpoint resume)
Checkpoint expired (>30 days): "Session expired" screen; restart wizard
```

**[KPI]** Wizard open p95 < 300 ms. Step transition (animation + next step fetch) < 200 ms. LRO final submit to first checkpoint response < 5 min (SLO-11).

---

## 4. Live Mode vs Fixture Mode Discipline (ADR-0001 + ADR-0004)

### 4.1 Feature Flag Architecture

```
Global flags (E2 tenant feature flags, checked at shell init):
  HMV4_FIXTURE_MODE       → activates fixture adapter globally
  HMV4_DISABLE_MUTATION_LAUNCHERS → blocks all mutation-initiating actions
  HMV4_PREVIEW_ENABLED    → activates HMV4 shell path in portal.html

Per-root flags (checked per surface):
  HMV4_LIVE_API_{ROOT}    → enables live API for that specific root
    e.g. HMV4_LIVE_API_NQCASE = true → NQCASE surfaces use live E4/E5
         HMV4_LIVE_API_DISP = true  → Dispatch surfaces use live E5/E3
    Default: false (fixture mode for all roots until explicitly enabled)
```

### 4.2 Per-Route Fixture Adapter

```javascript
// Conceptual fixture adapter (not production code — illustration only)
class HMV4FixtureAdapter {
  intercept(url, method, options) {
    if (!isFixtureMode()) return null; // pass-through to live API
    const rootCode = extractRoot(url);
    if (isLiveEnabled(rootCode)) return null; // root is live
    if (method !== 'GET') throw new FixtureMutationBlockedError();
    return loadFixture(rootCode, url);
  }
}
```

Fixture data sources:
```
tests/fixtures/module-template-v4/record-fixtures.json    → E4 record shapes
tests/fixtures/module-template-v4/route-fixtures.json     → route → fixture mapping
tests/fixtures/module-template-v4/bridge-fixtures.json    → bridge state fixtures
```

### 4.3 Banner State Propagation

```
HMV4_FIXTURE_MODE=true, HMV4_LIVE_API_{ROOT}=false (default):
  Banner: ORANGE "DEVELOPMENT ENVIRONMENT — FIXTURE DATA ACTIVE" (F1 banner type 1)
  Mutation buttons: rendered but disabled; tooltip "Disabled in fixture mode"

HMV4_FIXTURE_MODE=true, HMV4_LIVE_API_{ROOT}=true (specific root live):
  Banner: AMBER "DEVELOPMENT ENVIRONMENT — LIVE DATA FOR {ROOT}" (F1 banner type 2)
  Mutations: enabled for that root

HMV4_FIXTURE_MODE=false (full live):
  Banner: "PRE-PRODUCTION ENVIRONMENT" blue ribbon (F1 banner type 3)
  All bindings live; all mutations enabled per /can result

ADR-0001 MANDATORY: the ORANGE banner can NEVER be suppressed in HMV4 when
fixture mode is active. GraphicsAuthority.tokens.read('banner.hmv4-dev') must
render the orange token; never override with CSS.
```

### 4.4 Forbidden File Boundary (ADR-0004)

```
74-module-template-v4-fixtures.js: NEVER loaded by mom/portal.html
  Only loaded by Playwright E2E test harness and local dev server
  Portal feature flag guard: grep "74-module-template-v4-fixtures" mom/portal.html → must return 0 matches
  Quality gate enforced pre-commit

Fixture adapter import chain:
  72-bridge.js → imports fixture adapter only when HMV4_FIXTURE_MODE env = true
  In production portal: HMV4_FIXTURE_MODE env never set → adapter never imported
```

---

## 5. Concurrency and Idempotency Flows

### 5.1 ETag Lifecycle (RFC 7232)

```
Read:
  GET /api/v2/{resource}
  ← 200 OK; ETag: "abc123xyz"
  Frontend stores ETag in surface state (WS row map, AR state, NRD state)

Conditional write:
  PUT /api/v2/{resource}/{id}
  If-Match: "abc123xyz"
  → 200 OK; ETag: "def456uvw"  (update ETag)
  → 412 Precondition Failed    (concurrency conflict → conflict UI)
  → 428 Precondition Required  (If-Match missing — blocked by server)

Conditional freshness check:
  HEAD /api/v2/workspaces/{root}/projection
  If-None-Match: "abc123xyz"
  → 304 Not Modified  (still fresh)
  → 200 OK; ETag: "new"  (stale → reload)
```

### 5.2 Idempotency Key Generation

```
Client generates UUID4 idempotency_key on mutation intent (button click, form submit intent)
  NOT on retry — same key reused for retries of same mutation
Key lifecycle:
  Stored in surface state for duration of mutation flow
  On success: discarded
  On network failure: retained; reused on retry
  On navigation away: discarded (abandon)
Server de-duplication window: 24 hours per E3/E11/E12 contract
  409 Conflict with X-Idempotency-Duplicate: true header → treat as success
  Replay response body identical to original success response
```

### 5.3 Request Correlation

```
Every request carries X-Request-ID: <uuid4> (generated per request, not per session)
Returned in response: X-Request-ID echoed back
On error: X-Request-ID shown in error detail; user can provide to support team
On 5xx: X-Correlation-ID from distributed trace available in response header
RFC 9457 instance field contains: /api/v2/errors/{tenant}/{X-Request-ID}
```

---

## 6. Problem-Detail UI Rendering (RFC 9457)

### 6.1 Problem Object Structure

```json
{
  "type": "https://hesem.io/problems/esig/factor-rejected",
  "title": "E-signature factor rejected",
  "status": 422,
  "detail": "The provided password did not match the stored credential hash.",
  "instance": "/api/v2/errors/tenant-abc/req-uuid",
  "cause_chain": [
    {"code": "ESIG_FACTOR_VERIFY_FAIL", "message": "..."},
    {"code": "CREDENTIAL_HASH_MISMATCH", "message": "..."}
  ],
  "suggested_action": "Re-enter your password. After 3 failures your account will be locked.",
  "retry_after": null,
  "request_id": "req-uuid"
}
```

### 6.2 Rendering Rules Per Surface

```
AR / AC / WZ inline field error (status 422):
  Map errors[].field → form field; render error message below field
  Cause chain collapsed by default; "Show details" expand
  Suggested action rendered as callout box

Toast (transient, 4 s):
  4xx auth errors (401, 403): "Permission denied — {title}"
  Optimistic update failure (412): "Another user edited this record — conflict resolved below"
  Success confirmations: "{action} completed"

Banner (persistent until dismissed or resolved):
  5xx server errors: "Service error — {title}" with retry button
  503 degraded: "System degraded — read-only mode active"
  LRO failure: "Operation failed — {title}" with "View details" link to NRD-11

NRD-dedicated error surface:
  E-sig lockout (423): NRD-02 drawer with IT-contact info
  Malware detected (E12): NRD-09 dialog
  Conflict (412): NRD-05 drawer with diff view
```

### 6.3 Locale-Aware Error Messages

```
All problem detail type URIs are keys in the ICU MessageFormat 2 catalog
  Frontend resolves {type} → locale-specific message template
  Fallback chain: tenant locale → user locale → en-US
  Variables from cause_chain interpolated into template
  {suggested_action} always rendered in user's language (server-generated, locale header)
```

---

## 7. AI Advisory Binding (E9)

### 7.1 Confidence Threshold Enforcement

```
Per-tenant threshold configured in E2 tenant config:
  ai_confidence_threshold_display: 0.70  (default; below → dimmed chip)
  ai_confidence_threshold_apply:   0.85  (below → disallow one-click apply)

Confidence rendering:
  ≥ apply threshold:    Green chip; "Apply" button enabled
  ≥ display threshold:  Amber chip; "Apply" disabled; manual copy allowed
  < display threshold:  Gray chip; "Low confidence — expand to view"
  0 (not available):    Chip hidden entirely
```

### 7.2 RAG Citation Rendering (G1–G10)

```
Citations from E9 response rendered in expandable citation panel:
  G1: citation panel opens on chip expand
  G2: source name, document title, page/section
  G3: excerpt text (≤200 chars) highlighted
  G4: access link if user has permission (E1 /can check on source doc)
  G5: "Not available" placeholder if source is confidential tier
  G6: citation count badge on chip ("3 sources")
  G7: staleness warning if citation last_updated > 90 days
  G8: citation freshness checked server-side; surfaced in E9 response
  G9: user can flag citation as incorrect → POST /api/v2/ai/advisory/citation-flag
  G10: flagged citations removed from display within 24 h (E9 moderation pipeline)
```

### 7.3 Override Capture Binding (L1 §5)

```
Every AI suggestion interaction fires override-capture:
  User accepts suggestion (takes action based on AI):
    POST /api/v2/ai/advisory/override-capture
      Body: {record_id, feature_id, decision: "accepted", user_comment: null}
  User dismisses suggestion:
    POST /api/v2/ai/advisory/override-capture
      Body: {record_id, feature_id, decision: "dismissed", user_comment: null}
  User modifies AI pre-fill:
    POST /api/v2/ai/advisory/override-capture
      Body: {record_id, feature_id, decision: "modified", original_value, modified_value}
Override-capture calls fire-and-forget (non-blocking); UI does not wait for response
  Failures silently queued for retry in background
```

### 7.4 Kill Switch (E9 §2.9)

```
E9 /status endpoint returns: {available: false, kill_switch_active: true}
  → All AI chips hidden across all surfaces
  → "AI advisor temporarily unavailable" notice in ML module health tile
  → No E9 calls made while kill switch active (checked at shell init; rechecked every 5 min)
```

---

## 8. Authority Decision Binding (E2.8)

### 8.1 Button Enable / Disable

```
/can response drives per-action button state:
  {action: "nqcase.approve", enabled: true}   → Approve button enabled
  {action: "nqcase.approve", enabled: false,
   reason: "INSUFFICIENT_ROLE"}               → Button disabled; tooltip shows reason
  {action: "nqcase.release", enabled: false,
   reason: "BANNED_DECISION"}                 → Button hidden (not disabled)

Banned-decision actions (E2.8 §4):
  Action code in tenant's banned_decisions list → button hidden entirely
  AI chip "Apply" also hidden for banned-decision actions
  Override capture still fires (records that AI suggested the action)
  NRD "Action not available" shown if user navigates directly to action URL
```

### 8.2 Per-User Role Capability Map

```
On AR/AC open: single /can call with action=* returns full capability map
  Cached for 30 s in surface state; invalidated on role-change event (WS push)
  Map structure: {"{action_key}": {enabled: bool, reason?: string}, ...}
  Frontend binds map to all buttons, menu items, inline actions
  Never call /can per-button on render (N+1 problem); use the batch map
```

---

## 9. Cross-Region Binding

### 9.1 Region Pinning

```
Tenant config (E2) contains:
  primary_region: "ap-southeast-1"
  allowed_regions: ["ap-southeast-1", "us-east-1"]
  data_residency_policy: "STRICT" | "PREFERRED"

Strict residency: all API calls include X-Region-Pin: {primary_region}
  API Gateway routes to correct region datacenter
  If primary region unavailable: 503 with Retry-After; no cross-region fallback
Preferred residency: fallback to nearest region allowed
  Frontend receives X-Served-Region in response; displays region badge in shell footer
```

### 9.2 Customer Portal (CVLP) Variant

```
H2 §14 CVLP portals: customer-facing read-only projections
  Auth: E1 CVLP token (limited scope: cvlp.{root}.read only)
  Surface: WS read-only (no bulk, no mutation toolbar)
  AR: read-only tabs (no edit, no action buttons, no e-sig)
  API calls: same E4/E5/E6 endpoints with CVLP token; server enforces scope
  No E7 (e-sig), E3 (workflow), E8 mutation, E11 (bulk) calls from CVLP
  E9 AI: suppressed (CVLP sessions do not receive AI advisory)
  E10 Notification: customer receives delivery/status notifications only
```

### 9.3 Per-Pack Regional Overlays

```
J1 Pharma (EU): X-Region-Pin: eu-west-1; NMVS routing per E15 §2.10
J2 Automotive: EDI via per-OEM variant (E15 §2.4); no special region pin
J3 Aerospace/Defense: ITAR data controls; export-controlled regions blocked via E2.8 banned list
J4 Medical Device: EUDAMED AS4 calls route via eu-central-1 (E15 §2.11)
J5 Food Safety: FSMA §204 KDE/CTE calls route via us-east-1 FDA gateway (E15 §2.12)
```

---

## 10. Auditor / Inspector Portal Binding (H3 §7)

```
Auditor sessions: E1 auth with role = "EXTERNAL_AUDITOR" or "REGULATORY_INSPECTOR"
  /can map: all mutations disabled; audit, evidence, record read enabled
  Surfaces rendered in read-only mode:
    WS: row click → AR in read-only; no bulk toolbar
    AR: all action buttons disabled; Audit tab + Evidence tab expanded by default
    AC: not accessible; redirect to WS if navigated directly
    DL: visible; tile drill-down → read-only WS

Auditor-specific binding:
  E6 Audit API: full event stream available (no filter suppression)
  E8 Evidence API: all evidence classes readable including restricted EC-30..EC-38
    (read only; download allowed; metadata visible)
  E9 AI: suppressed (auditor sessions do not see AI suggestions)
  E15: regulatory submission history readable (DSCSA/EUDAMED events)
  E7: challenge initiation available for auditor's own sign-off action (where required by workflow)

Inspector portal banner: BLUE "REGULATORY INSPECTION SESSION — {inspector_org} — {session_id}"
  Rendered via F1 banner type 5; cannot be dismissed; logged in E6 audit
```

---

## 11. Edge Gateway / OT Layer Binding (L9)

### 11.1 Edge-Local UI

```
L9 OT layer: operator panels at shop-floor level
  Connectivity model: intermittent WAN; local edge gateway with cached data
  Frontend variant: simplified single-root WS + AR (no DL, no ML, no full shell)
  Binding:
    [R] GET from edge gateway cache (local replica of E5 projection)
        ETag from cache; X-Edge-Cache: true header in response
        X-Cache-Age: {seconds} → freshness indicator in edge UI
    [S] WS subscription to edge gateway (local broker, not cloud WS)
        CloudEvents relayed from cloud to edge on reconnect
    [M] Mutations queued locally (IndexedDB) when offline
        On reconnect: flush queue → POST cloud API; reconcile conflicts
    [LRO] Not available at edge; LRO status polled from cloud on reconnect
    [ES] E-sig at edge: challenge cached locally; factor captured offline;
         compose happens locally; envelope uploaded on reconnect
         Risk: envelope expiry (E7 challenge TTL 1 h); operator warned
    [AI] E9 not called at edge (latency + connectivity); AI chip hidden
    [N] E10 notifications delivered via edge broker; SEV-1 via local siren actuator (L9 §4)
```

### 11.2 OT Operator Panel Simplifications

```
No side nav drawer (space constrained); top-level route selector only
No DL/ML; direct WS for single OT root (e.g. DISP for dispatch, JO for job orders)
Graphics Authority tokens loaded from local edge cache (pre-synced)
Banner: "EDGE OPERATOR MODE — {device_id}" (F1 banner type 6)
ISA-101 HMI compliance: high contrast mode enforced; touch targets ≥ 44×44 px
```

---

## 12. Per-Pack Overlay Binding (J1–J5)

### J1 Pharmaceutical

```
AR EBR tab: GET /api/v2/pharma/ebr/{lot_id}/record → E15 pack adapter
Wizard WZ-07 (Batch Release): E7 two-person signature; DSCSA EPCIS events via E15
Evidence: EC-30 (GMP certificate) class required; WORM=COMPLIANCE; 10-year retention
E15 NMVS: POST /api/v2/integrations/eu-fmd/nmvs/verify → routing per country table E15 §2.10
```

### J2 Automotive

```
AR PPAP tab: GET /api/v2/auto/ppap/{record_id}/checklist → E15 pack adapter
Wizard WZ-19 (PPAP Submission): 18-element checklist; per-OEM EDI (E15 §2.4)
E15 X12 862 ship schedule + 830 KANBAN broadcast on release
```

### J3 Aerospace & Defense

```
AR CAGE code validation: GET /api/v2/aero/cage/{code}/verify → E15 GIDEP adapter
Evidence: EC-35 (ITAR export license) mandatory for J3 assemblies
GIDEP alert subscription (E15 §2.13): push to AR Evidence tab + E10 notification
ITAR watermark on file download (E12 §3.5 ITAR mode): rendered client-side via canvas
```

### J4 Medical Device

```
AR DHF tab: GET /api/v2/meddev/dhf/{device_id}/index → E15 pack adapter
Wizard WZ-24 (UDI Registration): GUDID submission via E15 §2.11; EUDAMED AS4 call
Evidence: EC-36 (design verification) required per ISO 13485; WORM=GOVERNANCE
AI PCCP binding (E9 §2.12): performance drift alert chip in AR header
```

### J5 Food Safety

```
AR HACCP tab: GET /api/v2/food/haccp/{plan_id}/ccp-monitor → E15 pack adapter
Evidence: EC-38 (CCP photo) required; FSMA §204 KDE/CTE events via E15 §2.12
Wizard WZ-30 (Recall Initiation): FDA portal notification; E10 SEV-1 channel alert
CCP temperature deviation alert: E10 push to AR header badge; SEV-1 bypass quiet hours
```

---

## 12a. Per-Pattern × Per-API-Family Binding Matrix

The table below is the canonical cross-reference. Each cell marks which axes
apply: **R** = read, **M** = mutation, **S** = subscription, **L** = LRO,
**B** = bulk, **F** = file, **AI** = advisory, **N** = notification,
**A** = authority, **ES** = e-signature.

| API Family | SH | DL | ML | WS | AR | AC | NRD | WZ |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|
| **E1 Auth/Can** | R,A | A | R,A,M | R,A,B | R,A,M,ES | R,A,M | A | R,A,ES |
| **E2 Tenant Gov** | R | R | R | R,A | R,A | A | A | R,A |
| **E3 Workflow** | — | — | — | B | R,M,ES | M,B | — | M,ES |
| **E4 Record API** | — | — | M | R | R,M | R | R | R,M |
| **E5 Workspace Proj** | — | — | — | R,S,CC | — | — | — | R |
| **E6 Audit** | — | — | — | — | R | — | R | — |
| **E7 E-Signature** | — | — | — | — | ES | ES | ES | ES |
| **E8 Evidence** | — | — | — | — | R,F | — | R,F | R,F |
| **E9 AI Advisory** | R | R,AI | R,AI | AI | R,AI | AI | AI | AI |
| **E10 Notification** | R,S,N | N | R,N | N | R,N | N | — | N |
| **E11 Bulk Op** | — | — | — | B | B | B | — | — |
| **E12 File Upload** | — | — | — | — | F | — | F | F |
| **E13 LRO** | S,N | — | — | L | L | L | L | L |
| **E14 Search/Analytics** | — | R | R | R | R | — | — | — |
| **E15 Integration** | — | — | — | — | R | — | — | L,M |
| **E16 Admin/Config** | R | — | — | — | — | — | — | — |

**Reading the matrix**: WS row × E11 column = **B** means the Workspace
Projection surface uses E11 Bulk Operation API for the bulk-action toolbar
(§3.4 B above). AR row × E7 = **ES** means the Authoritative Record Shell
drives the full E7 e-signature challenge-compose flow (§3.5 ES above).
Blank cells mean that API family is not called by that surface pattern under
any normal operating condition; edge cases (e.g. framework-level retries
via E1) are handled by infrastructure, not application code.

---

## 12b. Per-Tab Freshness Binding (E5 §2.10)

AR shells host multiple tabs, each with independent freshness requirements
driven by the underlying E5 HEAD check or E6/E8 poll.

### 12b.1 HEAD-Based Freshness Protocol

```
Every 60 seconds (configurable per tenant in E2), for each open AR tab:
  HEAD /api/v2/{resource}/{id}
  If-None-Match: {tab_etag}
  → 304 Not Modified: tab data still fresh; no re-render
  → 200 OK, ETag changed: stale badge appears on tab label
    "Updated by another user — click to refresh"
    On tab click: GET without If-None-Match; full tab re-render; badge clears
```

### 12b.2 Per-Tab Freshness SLOs

```
Tab               Resource         Poll interval   Stale threshold   SLO class
──────────────────────────────────────────────────────────────────────────────
Summary (header)  E4 record        30 s            30 s              Operational
Workflow history  E3 history       60 s            120 s             QMS-Standard
Audit trail       E6 events        60 s            300 s             Compliance
Evidence          E8 attachments   120 s           600 s             Compliance
AI advisory       E9 analysis      On tab open     On demand         Advisory
Notifications     E10 in-context   WS push         Immediate         Operational
Pack tabs (EBR etc.)  E15 overlay  120 s           600 s             Compliance
```

### 12b.3 Degraded Freshness Handling

```
If HEAD call fails (network error or 5xx):
  Tab label shows amber clock icon (not stale badge)
  Tooltip: "Freshness check unavailable — showing cached data from {timestamp}"
  No auto-reload attempt (to avoid thundering herd on partial outage)
  Background retry after 5 min exponential backoff cap
```

### 12b.4 WS-Driven Freshness (Operational Tabs)

```
Summary tab and Workflow tab also subscribe to WS events:
  CloudEvents type = "hesem.{root_type}.record_updated"
  → immediate tab refresh without waiting for HEAD poll interval
  → replaces HEAD poll for that cycle (resets timer)
This means for actively-edited records (multiple users), tab freshness
is effectively real-time rather than poll-interval-bound.
```

---

## 12c. Per-Event Subscription Binding (CloudEvents 1.0 + AsyncAPI 3.0)

### 12c.1 CloudEvents Envelope

All WebSocket messages from the HESEM event bus carry CloudEvents 1.0 attributes:

```json
{
  "specversion": "1.0",
  "type": "hesem.nqcase.record_updated",
  "source": "https://hesem.io/domains/quality-improvement/nqcase",
  "id": "evt-uuid",
  "time": "2026-04-27T14:30:00Z",
  "datacontenttype": "application/json",
  "tenantid": "tenant-slug",
  "rootcode": "NQCASE",
  "recordid": "nqcase-uuid",
  "data": { "changed_fields": ["status", "assigned_to"], "new_etag": "def456" }
}
```

### 12c.2 AsyncAPI 3.0 Channel Definitions

```yaml
# Excerpt — AsyncAPI 3.0 channel for workspace subscription
channels:
  workspaceProjection:
    address: /ws/v2/workspaces/{rootCode}
    bindings:
      ws:
        method: GET
        headers:
          Authorization: $ref: '#/components/headers/BearerAuth'
          X-Tenant-ID: $ref: '#/components/headers/TenantId'
    messages:
      recordUpdated:
        $ref: '#/components/messages/RecordUpdated'
      recordCreated:
        $ref: '#/components/messages/RecordCreated'
      recordDeleted:
        $ref: '#/components/messages/RecordDeleted'
      projectionLag:
        $ref: '#/components/messages/ProjectionLag'
```

### 12c.3 Frontend Subscription Lifecycle

```
On WS connection open:
  → Send subscribe frame: {action: "subscribe", root: ROOT_CODE, tenant: TENANT_SLUG}
  Server confirms: {subscribed: true, channel_id: "ch-uuid"}
  channel_id stored in surface state for unsubscribe

On surface unmount (navigate away):
  → Send unsubscribe frame: {action: "unsubscribe", channel_id: "ch-uuid"}
  Server confirms; connection retained (multiplexed over single WS per session)

On WS disconnect (network loss):
  Exponential backoff reconnect: 1s, 2s, 4s, 8s, 16s, 30s (cap)
  On reconnect: re-subscribe + full projection reload (may have missed events)
  Reconnect toast: "Connection restored — data refreshed"

On WS 1008 (policy violation — session expired):
  E1 token refresh attempt; on success: reconnect
  On refresh failure: redirect to login
```

### 12c.4 Event Filtering

```
Frontend filters CloudEvents client-side before processing:
  event.tenantid MUST equal current session tenant → discard foreign-tenant events
  event.rootcode MUST match surface root → discard other-root events
  event.recordid compared to WS filter scope (if single-record subscription)
Server-side filter also applied (reduces bandwidth); client-side is defense-in-depth
```

---

## 12d. LRO Type Registry → UI Pattern Mapping (E13)

The 26 E13 operation types map to specific UI entry points and progress surfaces:

| LRO Operation Type | Initiating Surface | Progress Surface | Cancel Available |
|---------------------|-------------------|-----------------|-----------------|
| BATCH_RELEASE | WZ-07 (pharma), WZ-19 (auto) | WZ progress screen | Yes |
| PROJECTION_REBUILD | WS (auto-triggered on stale) | WS loading banner | No |
| BULK_STATUS_TRANSITION | AC bulk console | NRD-11 progress drawer | Yes |
| IMPORT_RECORDS | NRD-06 batch import drawer | NRD-11 progress drawer | Yes |
| DOCUMENT_REINDEX | E16 admin console | Admin progress page | Yes |
| COMPLIANCE_REPORT | DL export action | DL progress toast | Yes |
| EVIDENCE_BUNDLE_EXPORT | AR evidence tab | NRD-11 progress drawer | Yes |
| SIGNATURE_ARCHIVE_BUILD | E7 post-quorum | AR audit tab spinner | No |
| DSCSA_SUBMISSION | WZ (J1 release) | WZ progress screen | No (regulatory) |
| EUDAMED_SUBMISSION | WZ (J4 UDI) | WZ progress screen | No (regulatory) |
| FSMA_KDE_BUNDLE | WZ (J5 recall) | WZ progress screen | No (regulatory) |
| GUDID_SUBMISSION | WZ-24 | WZ progress screen | No (regulatory) |
| EDI_BATCH_SEND | AC (send EDI) | NRD-11 progress drawer | Yes |
| GIDEP_ALERT_DISTRIBUTION | E15 auto-triggered | E10 notification only | No |
| AUDIT_MERKLE_ANCHOR | E6 background | E6 admin panel only | No |
| AI_BATCH_ANALYSIS | AC (batch AI review) | NRD-11 progress drawer | Yes |
| BULK_EVIDENCE_LOCK | AR evidence tab | NRD-11 progress drawer | No (WORM) |
| LABEL_PRINT_BATCH | AC (J1/J4 label run) | NRD-11 progress drawer | Yes |
| ARCHIVE_RECORD | WZ-33 | WZ progress screen | No |
| RESTORE_FROM_ARCHIVE | Admin console | Admin progress page | No |
| SCHEMA_MIGRATION | E16 admin | Admin progress page | No |
| TENANT_PROVISION | E16 super-admin | Admin progress page | No |
| BACKUP_EXPORT | Admin console | Admin progress page | No |
| INTEGRITY_CHECK | E6 scheduled | E10 notification only | No |
| PACK_INSTALL | E16 admin | Admin progress page | No |
| PURGE_EXPIRED_DATA | Admin scheduled | E10 notification only | No |

Cancel behavior: regulated submissions (DSCSA, EUDAMED, FSMA, GUDID) cannot
be cancelled once committed to the regulatory gateway. WORM operations
(BULK_EVIDENCE_LOCK) cannot be cancelled once lock is applied. All others
support DELETE {Operation-Location} per E13 §2.5.

---

## 13. KPI Summary

| Pattern | Initial Render p95 | Tab/Step Switch p95 | WS Push Render | Mutation Round-Trip p95 |
|---------|-------------------|--------------------|-----------------|-----------------------|
| SH | 800 ms | — | 200 ms | — |
| DL | 600 ms | 300 ms | 200 ms | — |
| ML | 400 ms | — | — | 300 ms |
| WS | 250 ms | — | 100 ms | 500 ms (incl. 207) |
| AR | 400 ms (group A) | 300 ms | 150 ms | 600 ms (PATCH); 800 ms (command) |
| AC | 300 ms | — | — | 600 ms |
| NRD | 200 ms (open anim) | — | — | 400 ms |
| WZ | 300 ms (init) | 200 ms | — | LRO (SLO-11 ≤5 min first checkpoint) |

Binding success rate target: 99.5% (tracked per pattern per root, reported in E16 admin analytics dashboard per E14).

---

## 14. Backward-Compatibility Discipline

### 14.1 Class A (Breaking) Changes

```
Class A API change (E16 H7 §2):
  Removal of field in E4 response → breaking for AR/WS that render the field
  Rename of action_key → breaking for /can map → button state incorrect
  Status code change (200→202) → breaking for mutation flows expecting sync response

Process:
  1. API Lead raises RFC in api-changes channel
  2. Frontend Lead reviews blast radius (which surfaces are affected)
  3. 6-month deprecation notice published (E16 admin dashboard + E10 API-change notification)
  4. Frontend updated before sunset date; no client-side shims
  5. Sunset enforced per RFC 8594 Sunset header in deprecated response
```

### 14.2 Class B (Additive) Changes

```
Class B API change (H7 §3):
  New optional field in response → safe; frontend ignores unknown fields
  New optional query parameter → safe; frontend does not use until updated
  New action_key in /can map → safe; frontend button hidden until binding added
  New CloudEvents type → safe; frontend WS filter ignores unknown types

No deprecation notice required. No frontend action required.
```

### 14.3 Version Headers

```
All API responses include:
  X-API-Version: 2.14.0   (semantic version of API surface)
  X-Min-Client-Version: 2.0.0   (minimum frontend client that can consume this response)
Frontend checks X-Min-Client-Version on first response each session:
  If client_version < X-Min-Client-Version: hard reload to fetch new frontend bundle
  Enforced by shell hydration (§3.1) before any surface is rendered
```

---

## 15. Decision Phrase

```
S3-11_F9_BINDING_DEEP_UPGRADE_COMPLETE
```

After: load `S3-12_F10_F11_F12.md`.
