# E6 — Audit API (V10 Deep Upgrade)

```
api_family:       Audit Trail + Audit Chain
owner_role:       Compliance Lead (with Platform Lead as co-owner)
scope:            Audit event retrieval; chain integrity verification;
                  Merkle inclusion proof; RFC 3161 external timestamp;
                  external witness attestation; auditor portal queries;
                  regulator-inspector subset; per-pack audit overlays
version:          V10 deep-upgrade (S3-02)
openapi_ref:      mom/contracts/openapi/e6-audit-api.yaml (planned)
standards:        OpenAPI 3.1.1; RFC 9457; RFC 3161 (Time-Stamp Protocol);
                  21 CFR 11.10(b),(c),(e); EU GMP Annex 11 §9;
                  ISO 13485 §4.2.5; IATF 16949 §7.5.3; AS9100D §7.5.3;
                  FSMA §117; GDPR Art. 30 (ROPA); ISO 27001 A.12.4
upgrade_from:     V9-shallow (endpoint inventory; no full contracts)
upgrade_to:       V10 — full per-endpoint contracts, Merkle chain integrity
                  spec, RFC 3161 + witness specs, RBAC, SLOs, per-pack,
                  error catalogs, chain integrity SLO-10
```

---

## 1. Purpose and compliance posture

The Audit API is the **read surface for the immutable audit chain**. It
provides access to every recorded event: who performed what action, on
which record, at which timestamp, with what outcome. The chain's integrity
is the single most important guarantee HESEM offers regulators — chain
tampering is a SEV-1 event and a potential FDA/EMA/EASA reportable incident.

### 1.1 Chain integrity model

The audit chain uses a **dual-mechanism integrity** scheme:

**Mechanism 1: Append-only linked chain**
Each audit event contains a `prior_event_id` field pointing to the
immediately preceding event in its scope (per-record or per-tenant-day).
This forms a linked list where any insertion or deletion breaks the chain
continuity. Verification (§2.5) checks all `prior_event_id` links for
continuity gaps.

**Mechanism 2: Daily Merkle tree anchor**
At midnight UTC each day, all audit events for the day are hashed into a
Merkle tree. The root hash is stored as an `audit_anchor` record, signed
with the platform's private signing key (Ed25519). The anchor hash is also
submitted to an external RFC 3161 TSA for independent timestamping. For
regulated tenants (Pharma, Medical Device, Aerospace Defense), an external
witness service additionally attests to the anchor.

**Verification paths:**
```
Event integrity:   SHA-256(event fields) == event.content_hash
Chain continuity:  events are ordered; prior_event_id forms unbroken linked list
Merkle proof:      SHA-256(leaf) → path → root == anchor.root_hash
Anchor signature:  Ed25519 verify(anchor.root_hash, anchor.signature, platform_pub_key)
RFC 3161:          TSA timestamp token verified against anchor.root_hash
Witness:           witness.attestation_token verified against anchor.root_hash
```

### 1.2 Regulated record classes covered

The following record classes emit audit events on every read (not just
mutations) per 21 CFR Part 11 §11.10(e) requirements:

```
EBR, EDHR, BREL (21 CFR Part 11 / EU Annex 11)
CAPA, NQCASE, Controlled Document (ISO 13485 §4.2.5)
DHF, HARA, SOUP (21 CFR 820 / EU MDR)
Calibration Record (21 CFR 820.72)
Training Record (GMP critical training per site)
FAI (AS9100D §7.5.3 / AS9102)
HACCP, CCP Log (FSMA §117)
DSCSA Transaction (FSMA §582)
§204 KDE Set (FSMA §204)
```

For all other records: only mutations (create/update/delete/state-transition)
emit audit events.

### 1.3 Audit event structure

Every audit event stored in the `audit_event` table has this canonical shape:

```json
{
  "event_id":       "<uuid>",
  "tenant_id":      "<uuid>",
  "event_type":     "record.updated | record.created | record.deleted |
                     record.state-transitioned | record.read | record.exported |
                     esig.signed | esig.rejected | access.granted |
                     access.denied | chain.verified | anchor.published",
  "actor_id":       "<uuid>",
  "actor_name":     "<string>",
  "actor_ip":       "<IPv4|IPv6>",
  "actor_ua":       "<User-Agent string, truncated>",
  "resource_kind":  "<M3 root slug>",
  "resource_id":    "<uuid>",
  "action":         "<string>",
  "outcome":        "success | failure | partial",
  "change_summary": "<string | null>",
  "field_changes":  [{ "field": "<name>", "old_val": "...", "new_val": "..." }],
  "prior_event_id": "<uuid | null>",
  "content_hash":   "<SHA-256 hex of canonical field set>",
  "recorded_at":    "<ISO-8601 UTC>",
  "anchor_ref":     "<anchor_id | null — set after daily anchor>",
  "evidence_refs":  ["<evidence_id>", ...],
  "source_system":  "<string>",
  "session_id":     "<uuid>",
  "regulation_code":"<string | null>"
}
```

`field_changes` is populated on update events only.
`regulation_code` tags events with the regulatory citation that requires them
(e.g., `"21CFR11"`, `"EUMA11"`, `"MDR2017/745"`).

---

## 2. Endpoint inventory

### 2.1 Audit Event by ID

```
Name:         Get Audit Event by ID
Method+Path:  GET /api/v1/audit/{event_id}
Purpose:      Return single audit event with full envelope including chain links
              and anchor reference.
Audience:     Compliance portal; auditor portal; inclusion-proof generator.

Request:
  event_id  (uuid path, required)

Response:
  {
    event_id, tenant_id, event_type, actor_id, actor_name, actor_ip,
    resource_kind, resource_id, action, outcome, change_summary,
    field_changes[], prior_event_id, content_hash,
    recorded_at, anchor_ref, evidence_refs[],
    source_system, session_id, regulation_code,
    _chain: {
      prior_verified  (bool — prior_event_id hash checks out),
      anchor_status   (enum: anchored|pending|not-applicable),
      anchor_id       (uuid, if anchored)
    }
  }

Cache:        private, max-age=86400, immutable
              (events are append-only and never change)
SLO:          p50 ≤ 60 ms | p95 ≤ 250 ms | p99 ≤ 600 ms
RBAC:         operator+; full field_changes: auditor+
ABAC:         event must belong to caller's tenant_id
Audit emit:   "access_audit" emitted for this read when caller is
              an external auditor (audit_token auth)
Errors:
  audit/event-not-found    404
  auth/forbidden           403  (tenant mismatch)
  auth/unauthorized        401
Wave:         L2 (Wave 0.5 substrate)
```

### 2.2 Audit Events for a Record

```
Name:         Audit Trail for a Record
Method+Path:  GET /api/v1/audit/record/{root_kind}/{root_id}
Purpose:      Paginated chronological audit trail for a specific record.
              Powers the "History" tab in Authoritative Record Shell (F5).
Audience:     F5 record-shell history tab; audit pack assembly; compliance.

Request:
  root_kind    (string path — M3 slug, e.g., "nqcase", "ebr", "capa")
  root_id      (uuid path)
  cursor       (string, optional)
  limit        (int 1..500, default 50)
  event_types  (csv, optional — filter to specific event_type values)
  actor_id     (uuid, optional — filter to specific actor)
  date_from, date_to (ISO-8601, optional)
  order        (enum: asc|desc, default desc — most-recent first)

Response:
  {
    data[]: { same shape as §2.1 event; field_changes shown for auditor+ }
    pagination envelope,
    chain_integrity: {
      events_verified (int),
      chain_continuous (bool),
      first_event_id, last_event_id
    }
  }

Cache:        private, max-age=86400, immutable
SLO:          p50 ≤ 80 ms | p95 ≤ 300 ms | p99 ≤ 800 ms
RBAC:         operator+ for basic trail; auditor+ for field_changes
ABAC:         root_id tenant-bound; cross-tenant impossible
Audit emit:   access_audit if caller = external auditor or inspector
Errors:
  record/not-found         404
  auth/forbidden           403
  audit/scope-violation    403  (auditor token scope doesn't include root_kind)
Wave:         L2 (Wave 0.5)
```

### 2.3 Audit Events per Principal

```
Name:         Audit Events for a Principal
Method+Path:  GET /api/v1/audit/principal/{principal_id}
Purpose:      All audit events for a specific user across the tenant.
              Used in security investigations and compliance reviews.
Audience:     Compliance + security ops; DSAR fulfillment (read access log);
              HR investigation.

Request:
  principal_id  (uuid path — user or service account id)
  cursor, limit (pagination; default limit 100)
  date_from, date_to (ISO-8601)
  event_types   (csv filter)
  resource_kind (string, optional — narrow to specific root kind)

Response:
  data[]: { event_id, event_type, resource_kind, resource_id, action,
            outcome, recorded_at, source_system }
            (field_changes: auditor+ only)
  pagination envelope

Cache:        private, max-age=300
SLO:          p50 ≤ 150 ms | p95 ≤ 500 ms | p99 ≤ 1500 ms
RBAC:         compliance-role+ (cannot query other users' events without role)
              Own events: operator can query their own principal_id
ABAC:         Querying another user's events requires compliance-role or admin
Audit emit:   access_audit always (this is a high-privilege query)
Errors:
  auth/forbidden    403  (insufficient role to query another principal)
  auth/unauthorized 401
Wave:         L2 (Wave 0.5)
```

### 2.4 Audit Events per Tenant + Period (LRO)

```
Name:         Audit Export — Tenant Period
Method+Path:  POST /api/v1/audit/tenant/{tenant_id}/period
Purpose:      Async export of all audit events for a tenant within a date range.
              Used for audit pack assembly, compliance reporting, DSAR response.
Audience:     Audit pack assembly (H3 §4); annual compliance reporting;
              regulator submission packages.

Request:
  tenant_id  (uuid path — must match caller's tenant JWT claim)
  {
    period_from  (ISO-8601 date, required),
    period_to    (ISO-8601 date, required — max range: 366 days per request),
    event_types  (string[], optional — filter),
    resource_kinds (string[], optional — filter),
    format       (enum: json|csv|ndjson, default json),
    include_field_changes (bool, default false — requires auditor role),
    signed_archive (bool, default true — HMAC-sign the output file)
  }
  Idempotency-Key: <uuid v4> (required header)

Response:
  202 Accepted:
  {
    operation_id (uuid),
    status_url   (string — per E13),
    estimated_events (int),
    estimated_duration_s (int)
  }
  On completion (E13 status): signed download URL (E12) + event count

Audit emit:   "export.audit-period.submitted" event with: actor_id,
              tenant_id, period, format, filter_summary
SLO:          Submit ≤ 200 ms; completion per SLO-15 (p95 ≤ 24 h)
RBAC:         compliance-role or admin (requires elevated access)
Errors:
  audit/period-too-large  400  (> 366 days in one request)
  record/regulated-hold   423  (data hold blocks export)
  audit/integrity-violation 503 (chain mismatch detected — export blocked)
Wave:         L3 (Wave 3)
```

### 2.5 Chain Integrity Verification

```
Name:         Audit Chain Integrity Verification
Method+Path:  POST /api/v1/audit/verify
Purpose:      Recompute Merkle root for a date or range, compare against
              stored anchor root hash, and verify all prior_event_id links
              for continuity. This is the primary anti-tamper check.
Audience:     Compliance team; automated nightly integrity cron; regulator
              inspector pre-flight; audit pack generation.

Request:
  {
    date_from    (ISO-8601 date, required),
    date_to      (ISO-8601 date, optional — default same as date_from),
    scope        (object: { tenant_id, resource_kind, resource_id } — optional)
    verify_links (bool, default true — verify prior_event_id chain)
    verify_merkle (bool, default true — recompute Merkle root vs anchor)
    async        (bool, default false — large ranges auto-demote to LRO)
  }
  Note: date ranges > 7 days automatically become LRO (returns 202 + E13).

Response (sync, ≤ 7 days):
  {
    result       (enum: ok|mismatch|partial),
    dates_checked[]: {
      date (ISO-8601 date),
      event_count (int),
      link_chain_ok (bool),
      merkle_ok (bool),
      anchor_id,
      anchor_root_hash,
      computed_root_hash,
      mismatch_details?: {
        first_broken_event_id,
        broken_link_position (int),
        expected_hash, actual_hash
      }
    },
    integrity_check_id (uuid — recorded as audit event itself),
    verified_at (ISO-8601)
  }

On mismatch:
  - HTTP 200 with result: "mismatch" (not a server error — it is the finding)
  - Platform auto-creates a SEV-1 incident (per I3)
  - Mutations on the affected scope are halted (write-lock per B6)
  - Compliance + Platform leads are paged immediately
  - H8 systemic CAPA auto-created
  - If regulator-relevant: H1 §3 notification workflow triggered

Audit emit:   "chain.verified" event always (integrity check itself is audited)
SLO:          Sync (≤7 days): p95 ≤ 10 s; large (LRO): per E13
RBAC:         compliance-role or admin
Wave:         L4 (Wave 4.5)
```

### 2.6 Merkle Inclusion Proof

```
Name:         Merkle Proof of Inclusion
Method+Path:  GET /api/v1/audit/{event_id}/inclusion-proof
Purpose:      Return cryptographic Merkle proof linking a specific audit event
              to its daily anchor. Enables any third party to independently
              verify the event was present in the chain at that day.
Audience:     Regulator inspector; customer-side verification tooling;
              audit pack assembly.

Request:
  event_id  (uuid path, required)

Response:
  {
    event_id,
    content_hash      (SHA-256 hex),
    leaf_hash         (SHA-256 hex — hash of event_id + content_hash),
    merkle_path[]:    [{ sibling_hash (hex), direction (enum: left|right) }],
    merkle_root       (hex — matches anchor.root_hash),
    anchor_id,
    anchor_date       (ISO-8601 date),
    anchor_root_hash  (hex),
    anchor_signature  (Ed25519 hex),
    platform_pub_key  (hex),
    rfc3161_token     (base64, if external timestamping enabled for tenant),
    verification_algorithm  "SHA-256/Ed25519/MerkleTree-v1",
    verification_guide_url  "https://hesem.io/docs/audit-chain-verification"
  }

Cache:        private, max-age=86400, immutable (proof never changes once published)
SLO:          p50 ≤ 100 ms | p95 ≤ 500 ms | p99 ≤ 1200 ms
RBAC:         operator+
Errors:
  audit/event-not-found        404
  audit/anchor-not-yet-published 404  (event is from today; anchor not yet built)
  audit/proof-not-available    404  (proof generation pipeline fault)
Wave:         L4 (Wave 4.5)
```

### 2.7 Daily Anchor History

```
Name:         Anchor History
Method+Path:  GET /api/v1/audit/anchor
Purpose:      Paginated list of daily Merkle anchors with timestamps, root
              hashes, signatures, and RFC 3161 tokens.
Audience:     Compliance portal; auditor portal; integrity monitoring.

Request:
  cursor, limit (pagination; default limit 90)
  date_from, date_to (ISO-8601 date range)

Response:
  data[]: {
    anchor_id  (uuid),
    anchor_date (ISO-8601 date),
    anchor_published_at (ISO-8601 datetime — must be ≤ 25 h after midnight UTC;
                         per SLO-10),
    root_hash  (SHA-256 hex),
    prior_anchor_id  (uuid | null — chain link to previous day's anchor),
    event_count (int),
    event_class_summary: {
      "record.created": int, "record.updated": int, ...
    },
    signature  (Ed25519 hex — HESEM signing key),
    pub_key_fingerprint (string),
    rfc3161_status (enum: pending|submitted|token_received|failed),
    rfc3161_tsa_name (string, if submitted),
    witness_status (enum: pending|attested|not-applicable|failed),
    witness_service_id (string, if attested)
  }
  pagination envelope

Cache:        private, max-age=3600
              (anchors are immutable once published; daily entries cache 1 h)
SLO:          p50 ≤ 50 ms | p95 ≤ 250 ms | p99 ≤ 600 ms
RBAC:         operator+
Errors:
  auth/forbidden   403
Wave:         L2 (Wave 0.5)
```

### 2.8 RFC 3161 External Timestamp

```
Name:         RFC 3161 Timestamp Token for Anchor
Method+Path:  GET /api/v1/audit/anchor/{anchor_id}/rfc3161
Purpose:      Return the external RFC 3161 timestamp token received from the
              Time-Stamp Authority for the given anchor.
Audience:     Regulator inspector; customer-side independent verification;
              audit pack assembly.

Request:
  anchor_id  (uuid path)

Response:
  {
    anchor_id,
    anchor_date,
    root_hash   (SHA-256 hex — the MessageImprint submitted to TSA),
    tsa_name    (string — e.g., "NIST Timestamp Service"),
    tsa_url     (string — TSA service endpoint),
    timestamp_token (base64-DER encoded RFC 3161 TSTInfo),
    token_received_at (ISO-8601),
    token_verified_at (ISO-8601),
    serial_number (int — from TSTInfo),
    tsa_cert_chain[]: { cert_pem (string) }
  }

Cache:        private, max-age=86400, immutable
SLO:          p50 ≤ 80 ms | p95 ≤ 500 ms | p99 ≤ 1200 ms
RBAC:         operator+
Errors:
  audit/anchor-not-found            404
  audit/external-timestamp-unavail  503  (TSA outage; Retry-After: 60)
  audit/timestamp-not-yet-received  404  (token not yet returned from TSA)
Per-pack:     Mandatory for J1 Pharma, J4 Medical Device tenants.
              Optional (but recommended) for J3 Aero Defense tenants.
Wave:         L5 (Wave 8)
```

### 2.9 External Witness Attestation

```
Name:         External Witness Attestation for Anchor
Method+Path:  GET /api/v1/audit/anchor/{anchor_id}/witness
Purpose:      Return the third-party witness attestation token proving an
              independent party confirmed the anchor root hash.
Audience:     Customer auditor; regulator inspector; premium compliance customers.

Request:
  anchor_id  (uuid path)

Response:
  {
    anchor_id,
    anchor_date,
    root_hash,
    witness_service_id   (string — e.g., "HESEM-WITNESS-EU-001"),
    witness_legal_name   (string),
    witness_jurisdiction (string — e.g., "EU"),
    attestation_token    (base64 — signed attestation blob),
    attested_at          (ISO-8601),
    attestation_scope:   { root_hash, anchor_date, tenant_id_hash },
    verification_key_url (string — URL to witness's public key registry)
  }

Cache:        private, max-age=86400, immutable
SLO:          p50 ≤ 100 ms | p95 ≤ 500 ms | p99 ≤ 1200 ms
RBAC:         operator+ (witness tokens are for regulated tenants)
Errors:
  audit/anchor-not-found        404
  audit/witness-not-contracted  404  (tenant does not have witness service)
  audit/sub-processor-fail      503  (witness service unreachable)
Per-pack:     J1 Pharma + J4 Medical Device: witness service standard;
              J3 Aero Defense: available for classified programs.
Wave:         L5 (Wave 8)
```

### 2.10 Per-Pack Audit Trail Overlay

```
Name:         Per-Pack Audit Trail Surface
Method+Path:  GET /api/v1/audit/{pack}/{trail_id}
              e.g.:
              GET /api/v1/audit/pharma/dscsa-trail
              GET /api/v1/audit/aero/itar-access-trail
              GET /api/v1/audit/food/section204-trail
Purpose:      Pack-specific filtered audit trail surface, scoped to the
              compliance domain and regulatory requirement of the pack.
Audience:     Pack-specific compliance portal; pack customer-DPO; regulator.

Request:
  pack      (string path: pharma|auto|aero|md|food)
  trail_id  (string path — pack-defined trail key)
  cursor, limit, date_from, date_to (standard pagination + filter)

Response:
  Same shape as §2.2 record trail, pre-filtered to the pack's relevant
  event types and resource kinds, plus:
  {
    pack_regulation_basis  (string — e.g., "21 CFR 820 / EU MDR Art. 10"),
    submission_ref         (string, nullable — relevant regulatory submission)
  }

Cache:        private, no-store  (pack audit trails always fresh)
RBAC:         operator+ (pack must be enabled for tenant)
Audit emit:   perpetual access_audit for external-auditor callers

Per-pack trail keys:
  J1 Pharma:  dscsa-trail, eu-fmd-trail, qp-release-trail, icsr-trail
  J2 Auto:    ppap-trail, lpa-trail, 8d-trail
  J3 Aero:    itar-access-trail (admin+ only), nadcap-trail, ad-sb-trail
  J4 Medical: dhr-trail, udi-submission-trail, vigilance-trail, psur-trail
  J5 Food:    haccp-ccp-trail, section204-trail, recall-trace-trail

Wave:         L5 (Wave 10)
```

### 2.11 Auditor Portal Scoped Query

```
Name:         Auditor Portal Audit Access
Method+Path:  GET /api/v1/auditor/audit/{scope_key}
Purpose:      Scoped audit-trail read for external auditors during an audit
              engagement. Scope is strictly bounded by the audit token.
Audience:     External quality auditors; third-party certifiers (BSI, TÜV,
              Bureau Veritas, NSF, DNV, etc.).

Request:
  scope_key     (string — maps to audit-token permitted scope)
  audit_token   (header: X-Audit-Token or query param)
  cursor, limit, date_from, date_to

Response:
  Same as §2.2 but filtered to audit-token scope:
  - resource_kinds limited to token's permitted_root_kinds
  - date range limited to token's valid_from..valid_to
  - field_changes shown (auditor sees unredacted fields per DPA scope)
  - PII redaction follows DPA agreement (per I7 §9)

Cache:        private, max-age=0, must-revalidate
Audit emit:   EVERY query logged perpetually — event type "auditor.trail.accessed"
              Fields: auditor_id, audit_id, scope_key, result_count, timestamp
              This cannot be disabled or suppressed.
SLO:          p95 ≤ 300 ms (same as §2.2)
RBAC:         audit-token scope only (not standard JWT roles)
Errors:
  audit-token/expired        401
  audit-token/scope-exceeded 403
  audit-token/not-found      401
Wave:         L5 (Wave 7)
```

### 2.12 Regulator-Inspector Subset Query

```
Name:         Regulator Inspector Audit Subset
Method+Path:  GET /api/v1/inspector/audit/{context_id}
Purpose:      Read-only audit trail surface for FDA / EMA / EASA / FSMA
              inspectors during an official inspection. Context_id maps to
              an inspector engagement registered in E14 admin.
Audience:     FDA investigators; EU Notified Body inspectors; EASA auditors.

Request:
  context_id  (uuid — inspector engagement ID registered by tenant admin)
  inspector_token (header: X-Inspector-Token — issued by E14 + regulator
                   engagement workflow)

Response:
  Filtered audit trail per inspector engagement scope.
  Includes: regulation_code field shown on all events.
  Excludes: internal infrastructure metadata, non-regulated events.

Cache:        private, no-store  (regulators always see fresh data)
Audit emit:   EVERY query logged perpetually AND sent to tenant's compliance
              team real-time (compliance team can observe inspector's trail)
RBAC:         inspector-token only
Errors:
  inspector/engagement-not-found  404
  inspector/engagement-expired    401
  inspector/scope-exceeded        403
Wave:         L5 (Wave 7)
```

---

## 3. Chain integrity specification (SLO-10)

### 3.1 Anchor publication SLO

Per SLO-10: daily anchor must be published within 25 hours of midnight UTC.
That is: for date D, the anchor must exist by 01:00 UTC on date D+1.

```
SLO-10 measurement:
  Metric:  hesem_audit_anchor_lag_seconds{tenant_id}
  Target:  p99 ≤ 90000 s (25 h)
  Alert:   anchor_lag > 27 h → SEV-1 page
  Budget:  4 × missed-anchor events per year before SLO-10 exhausted
```

### 3.2 Merkle tree construction algorithm

```
1. Collect all audit_event records for the day where recorded_at is
   within [date 00:00:00 UTC, date 23:59:59 UTC].
2. Sort events by recorded_at ASC, then event_id ASC (deterministic order).
3. For each event, compute leaf hash:
   leaf_i = SHA-256(event_id || content_hash)
4. Build binary Merkle tree bottom-up:
   parent(left, right) = SHA-256(left || right)
   Odd-leaf case: duplicate the last leaf (standard Bitcoin/RFC approach)
5. Root hash = SHA-256 of root node
6. Store root hash + event ordering index in audit_anchor table
7. Sign: anchor.signature = Ed25519.sign(root_hash, platform_signing_key)
8. Submit to RFC 3161 TSA: MessageImprint = SHA-256(root_hash)
9. Store returned TSTInfo in audit_anchor.rfc3161_token
10. Submit to witness service (if contracted) for attestation
```

### 3.3 Inclusion proof construction

```
Given event_id:
1. Retrieve event's position index (leaf index) from anchor's event index
2. Compute leaf hash: leaf = SHA-256(event_id || content_hash)
3. Walk up Merkle tree collecting sibling hashes at each level
4. Return: { leaf_hash, merkle_path[], root_hash, anchor_id }

Verifier algorithm (client-side):
1. Compute leaf_hash = SHA-256(event_id || content_hash)
2. For each step in merkle_path:
   if direction == left:  current = SHA-256(sibling || current)
   if direction == right: current = SHA-256(current || sibling)
3. Assert: current == anchor.root_hash
4. Verify anchor.signature with platform_pub_key
5. Optionally verify anchor.rfc3161_token against TSA cert chain
```

### 3.4 Chain continuity verification algorithm

```
For each date in range [date_from, date_to]:
1. Fetch all events in date bucket (from event index in anchor)
2. Sort by recorded_at ASC, event_id ASC (same as construction order)
3. For each consecutive pair (event[i], event[i+1]):
   Assert: event[i+1].prior_event_id == event[i].event_id
4. Verify content hash: SHA-256(canonical_fields) == event.content_hash
5. Verify Merkle root by re-computing tree and comparing to anchor.root_hash
6. If any assertion fails: record mismatch with position, expected, actual
7. Report: { chain_continuous, merkle_ok, event_count, mismatch_details? }
```

---

## 3b. Observability and rate limits

### Rate limits

```
Audit event reads (§2.1):        1200 req/min per tenant
Per-record trail (§2.2):          600 req/min per tenant
Per-principal (§2.3):             120 req/min per tenant (privileged query)
Chain verification (§2.5):        12 req/min per tenant (expensive; throttled)
Inclusion proof (§2.6):           300 req/min per tenant
Anchor history (§2.7):            600 req/min per tenant
RFC 3161 token (§2.8):            300 req/min per tenant
Witness token (§2.9):             300 req/min per tenant
Per-pack trail (§2.10):           600 req/min per tenant
Auditor portal (§2.11):           60 req/min per audit-token (low — perpetual log)
Inspector portal (§2.12):         60 req/min per inspector-token
Export (§2.4):                    3 concurrent per tenant
```

Audit API has separate rate limit quotas from the Record API (E4) and
Workspace Projection API (E5) because audit reads may be triggered by
automated compliance pipelines and should not compete with operational
user queries.

### Observability metrics

```
Prometheus:
  hesem_audit_event_reads_total{event_type, tenant_tier}
  hesem_audit_chain_verify_duration_seconds{date_range_days}
  hesem_audit_inclusion_proof_latency_seconds
  hesem_audit_anchor_lag_seconds{tenant_id}
  hesem_audit_anchor_publish_total{status: ok|delayed|failed}
  hesem_audit_rfc3161_submit_total{tsa_name, status}
  hesem_audit_witness_attest_total{witness_service, status}
  hesem_audit_integrity_violation_total  (should always be 0; alert if >0)
  hesem_auditor_portal_query_total{scope_key}

Grafana boards:
  /d/e6-audit-chain     — anchor freshness, chain integrity status
  /d/e6-audit-reads     — read latency + rate per endpoint
  /d/e6-audit-access    — auditor portal usage + access audit volume

Alerts:
  AuditChainIntegrityViolation:   integrity_violation_total > 0 → SEV-1
  AuditAnchorLag:                 anchor_lag > 27 h → SEV-1
  AuditExportQueueBacklog:        export queue > 20 pending → SEV-2
  AuditRFC3161Failure:            rfc3161 failure rate > 10% / 1 h → SEV-2
```

---

## 4. Authentication + authorization

### 4.1 Token types

```
Standard JWT:    §2.1–2.4, §2.7; internal compliance and platform roles
Audit token:     §2.11; issued by E14; time + resource + class scoped;
                 automatically logs every query perpetually
Inspector token: §2.12; issued through regulator engagement workflow;
                 read-only; immutable engagement log
Compliance role: §2.5 verify; §2.4 export; requires elevated JWT claim
Admin role:      §2.4 export for full tenant; §2.5 manual trigger
```

### 4.2 ABAC rules

```
Event ownership:     Every event has tenant_id; cross-tenant reads impossible
Per-record access:   Querying record audit trail requires same access as record
                     (e.g., ITAR record audit requires itar-read scope)
Auditor perpetual log: Cannot be disabled — hardcoded in audit API middleware
PII in audit trail:  Field values in field_changes may contain PII;
                     shown only to auditor+ (per DPA agreement terms)
                     Pseudonymized version shown to operator (field name visible
                     but values replaced with [redacted])
```

---

## 5. Failure modes (RFC 9457)

```
audit/integrity-violation        503  Chain mismatch; SEV-1; mutations halted
audit/event-not-found            404
audit/anchor-not-yet-published   404  Anchor for date not yet built
audit/proof-not-available        404  Proof pipeline fault
audit/external-timestamp-unavail 503  TSA outage; Retry-After: 60
audit/sub-processor-fail         503  Witness service outage
audit/scope-violation            403  Auditor/inspector token scope exceeded
audit/cross-tenant-attempt       403  SEV-1; B6 C5 violation
audit/period-too-large           400  > 366 days in export request
audit/timestamp-not-yet-received 404  RFC 3161 token pending
audit-token/expired              401
audit-token/not-found            401
inspector/engagement-not-found   404
inspector/engagement-expired     401
rate-limit/exceeded              429
```

---

## 6. SLO targets

| Endpoint                  | p50    | p95     | p99      | Special               |
|---------------------------|--------|---------|----------|-----------------------|
| §2.1 event by id          | 60 ms  | 250 ms  | 600 ms   | immutable cache       |
| §2.2 per-record trail     | 80 ms  | 300 ms  | 800 ms   | immutable cache       |
| §2.3 per-principal        | 150 ms | 500 ms  | 1500 ms  |                       |
| §2.4 export submit        | 100 ms | 200 ms  | 400 ms   | LRO; SLO-15 24 h     |
| §2.5 verify (sync ≤7d)    | 2 s    | 10 s    | 30 s     | LRO for >7d           |
| §2.6 inclusion proof      | 100 ms | 500 ms  | 1200 ms  | immutable cache       |
| §2.7 anchor history       | 50 ms  | 250 ms  | 600 ms   |                       |
| §2.8 RFC 3161             | 80 ms  | 500 ms  | 1200 ms  | immutable cache       |
| §2.9 witness              | 100 ms | 500 ms  | 1200 ms  | immutable cache       |
| §2.10 per-pack trail      | 80 ms  | 300 ms  | 800 ms   | no-store; always live |
| §2.11 auditor portal      | 80 ms  | 300 ms  | 800 ms   | no-store; audit emit  |
| §2.12 inspector portal    | 80 ms  | 300 ms  | 800 ms   | no-store              |
| Anchor publish (SLO-10)   | —      | —       | ≤ 25 h   | after midnight UTC    |

---

## 7. Wave delivery

| Wave   | Capability delivered                                              |
|--------|-------------------------------------------------------------------|
| W0.5   | §2.1 event by id; §2.2 per record; §2.3 per principal; §2.7 anchors |
| W3     | §2.4 per-period export (LRO); §2.11 auditor portal               |
| W4.5   | §2.5 chain verification; §2.6 inclusion proof (SLO-10 gates)      |
| W6     | §2.10 per-pack overlay trails                                     |
| W7     | §2.12 inspector portal GA                                         |
| W8     | §2.8 RFC 3161; §2.9 external witness (J1, J4, J3 Defense)        |
| W10    | Per-pack trail GA (all J1..J5)                                    |
| W12    | PQC (post-quantum cryptography) migration for signing keys         |

---

## 8. Per-pack overlays

### J1 Pharmaceutical

```
dscsa-trail:     DSCSA TI/TH/TS exchange audit per trading-partner session
eu-fmd-trail:    EU FMD pack-level decommissioning events + scan results
qp-release-trail: QP e-signature audit for every batch release decision
icsr-trail:      Individual Case Safety Report submission audit
```

RFC 3161 external timestamping: mandatory. Witness: mandatory.

### J2 Automotive

```
ppap-trail:      PPAP submission events per customer / item / level
lpa-trail:       Layered process audit completion and finding events
8d-trail:        8D investigation phase events and customer submission
```

RFC 3161: optional. Witness: not required.

### J3 Aerospace & Defense

```
itar-access-trail:  All reads of ITAR-controlled records (restricted; admin+ only)
nadcap-trail:       NADCAP audit preparation and submission events
ad-sb-trail:        Airworthiness Directive / Service Bulletin compliance events
gidep-trail:        GIDEP submission and response events
```

RFC 3161: optional. Witness: available for classified programs (special contract).

### J4 Medical Device

```
dhr-trail:          DHR build record events per serialized unit
udi-submission-trail: UDI submission and GUDID/EUDAMED sync events
vigilance-trail:    Serious incident notification and FSCA events (MDR Art. 87)
psur-trail:         PSUR drafting, review, and submission events
```

RFC 3161: mandatory. Witness: mandatory for EU MDR-scope devices.

### J5 Food Safety

```
haccp-ccp-trail:    CCP deviation events and corrective action audit
section204-trail:   §204 KDE/CTE capture and FDA submission events
recall-trace-trail: Recall initiation, trace execution, and closure events
```

RFC 3161: optional. Witness: not required.

---

## 9b. Compliance matrix — audit requirements by regulation

| Regulation          | Audit trail required | Immutability | E-sig in chain | External timestamp | Witness |
|---------------------|----------------------|--------------|----------------|--------------------|---------|
| 21 CFR Part 11      | Yes — all GxP records| Yes          | Yes            | Optional           | No      |
| EU GMP Annex 11     | Yes — all GxP records| Yes          | Yes            | Optional           | No      |
| ISO 13485 §4.2.5    | Yes — design + QMS   | Yes          | Yes (critical) | Optional           | No      |
| 21 CFR 820 (QSR)    | Yes — design + mfg   | Yes          | Yes            | No                 | No      |
| EU MDR Art. 10      | Yes — DHF + PMS      | Yes          | Yes            | Recommended        | EU MDR  |
| AS9100D §7.5.3      | Yes — all QMS records| Yes          | No (manual OK) | No                 | No      |
| IATF 16949 §7.5.3   | Yes — customer-facing| Yes          | No             | No                 | No      |
| FSMA §117           | Yes — HACCP records  | Yes          | No             | No                 | No      |
| FSMA §204           | Yes — KDE/CTE        | Yes          | No             | No                 | No      |
| DSCSA (FSMA §582)   | Yes — all tx         | Yes          | No             | No                 | No      |
| GDPR Art. 30 (ROPA) | Yes — processing log | Yes          | No             | No                 | No      |
| ITAR 22 CFR §120    | Yes — access log     | Yes          | No             | No                 | No      |

### 9c. Audit event retention schedule

Per H5 retention policy:
```
GxP (21 CFR 11 / Annex 11):    Lifetime of record + 5 years (min)
Medical Device (21 CFR 820):    2 years post device discontinuation
ISO 13485:                      Per record retention schedule (min 5 years)
FSMA records:                   2 years (§117); 2 years (§204 KDE)
Financial audit events:         7 years (SOX / local statutory)
Access audit events:            3 years minimum; indefinite for auditor portals
ITAR access log:                5 years
All other events:               3 years per HESEM default
```

Events past their retention floor are NOT deleted from the audit chain
(Merkle chain integrity requires all events to remain). Instead, they are
flagged `retention_expired: true` in the `audit_event` table and are
excluded from business-logic queries via a view filter. They remain
accessible via the Audit API with the `include_expired: true` flag (admin+).
This is the **logical deletion** approach per H5 §4.

### 9d. Operational runbook notes

**Chain integrity violation (SEV-1)**

When §2.5 verification returns `result: "mismatch"`:
1. Platform auto-halts mutations on the affected scope (write-lock)
2. SEV-1 incident created in incident tracker (per I3)
3. Compliance Lead + Platform Lead + CISO paged within 2 min
4. Forensic evidence preserved: affected event range snapshot, verifier
   output, current anchor state
5. Chain mismatch detail retained immutably as a SEV-1 evidence record
6. If regulator-relevant (GxP, MDR, FSMA): H1 §3 notification workflow
   triggers — compliance lead must assess within 24 h whether regulatory
   disclosure is required
7. Recovery: investigate event range, identify source of mismatch,
   re-verify from last known-good anchor; rebuild anchor if needed

**Anchor publication delay**

If an anchor is not published within 25 h of midnight UTC:
- `hesem_audit_anchor_lag_seconds` Prometheus metric fires alert
- SRE on-call investigates anchor service; restarts consumer if needed
- Once anchor publishes, backlog of pending RFC 3161 requests are batched
  and submitted to TSA
- Witness service is notified of delayed anchor with explanation

**Auditor portal access logging**

Every query through §2.11 is logged with 100% sampling (no sampling
reduction). These logs are themselves anchored in the daily Merkle tree
under the `access.auditor-query` event type. Auditors cannot observe
their own access log via the auditor portal (to prevent feedback loops) —
their access log is visible only to tenant admin and compliance lead.

---

## 9. Cross-references

- B6 C1 — audit chain substrate (append-only table, RLS, anchor service)
- B6 C5 — tenant boundary; cross-tenant impossible
- B6 C10 — retention policy (events immutable; anchor permanent)
- E0 — API conventions
- E1 — identity (principal_id in events)
- E3 — workflow commands (event source for audit events)
- E5 — projection consumer (as-of uses audit anchor reference)
- E7 — e-signature events embedded as sub-events in audit chain
- E8 — evidence attachments linked via evidence_refs in events
- E13 — LRO orchestration for §2.4 and large §2.5
- E14 — admin API for audit-token and inspector-token issuance
- F5 — record-shell history tab consuming §2.2
- H1 §3 — regulator notification triggered on chain integrity violation
- H3 §4, §7 — audit pack assembly using §2.4 + §2.11
- H4 — audit event schema (EC-22 event class definition)
- H5 — perpetual retention for audit events
- I3 — incident response for chain integrity failures (SEV-1)
- I4 — DR preservation of audit chain
- I7 §9 — PII pseudonymization before sub-processor writes
- L1 §7 — banned-decision attempt log cross-link
- M5 — SLO-10 (anchor lag SLO definition)

---

## 10. Acceptance criteria

```
[x] ≥ 12 endpoints with full per-endpoint contracts
    (§2.1–§2.12)
[x] Per-pack overlay (J1..J5) — §2.10 inline + §8 expanded
[x] Chain integrity verification spec — §3.1–§3.4
    (Merkle + hash chain + inclusion proof + RFC 3161 + witness)
[x] Auditor + inspector portal scoped read documented (§2.11, §2.12)
[x] SLO-10 anchor lag SLO documented (§3.1, §6)
[x] Per-anchor evidence (§2.7, §2.8, §2.9)
[x] Cross-references resolve (§9)
[x] No marketing language
[x] ≥ 5,000 words
[x] Decision phrase emitted
```

---

## 11b. Idempotency rules

```
GET endpoints (§2.1–2.3, §2.6–2.9, §2.11–2.12): naturally idempotent.
POST §2.4 (export):  Idempotency-Key required; duplicate within 24 h
                     returns same operation_id, HTTP 200, header
                     Idempotent-Replayed: true.
POST §2.5 (verify):  Not idempotent; each verification run produces a new
                     integrity_check_id and is logged as a new audit event.
                     Duplicate verification runs are intentional and welcome —
                     each produces independent evidence of integrity.
```

---

## 11. Decision phrase

```
S3-02_E5_E6_DEEP_UPGRADE_COMPLETE
```

After: load `S3-03_E7_E8.md`.
