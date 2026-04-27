# E11 — Bulk Operation API  ·  V10 Deep-Upgrade

```
api_family:      Bulk Operation
owner_role:      Platform Lead with Compliance Lead
scope:           Mass import; mass export; bulk command (HTTP 207 Multi-Status);
                 status polling; LRO checkpoint/restart; signed manifest output;
                 per-record idempotency; per-pack overlays (J1 DSCSA, J2 PPAP,
                 J3 FAI, J4 UDI, J5 FSMA §204)
sources:         RFC 4918 §13 (HTTP 207 Multi-Status); RFC 7232 (ETag);
                 RFC 9457 (Problem Details); OpenAPI 3.1.1; RFC 4086
                 (randomness); NIST FIPS 186-5 (Ed25519 signature);
                 ISO/IEC 20248 (signed manifest); DSCSA 21 U.S.C. §360eee;
                 IATF 16949 PPAP 4th Ed; AS9102B (FAI); FDA 21 CFR §830 (UDI);
                 FSMA §204 (food traceability); CloudEvents 1.0 (event envelope)
```

The Bulk Operation API is the platform-level surface for all mass-data
movements in HESEM Operations Platform. It provides a uniform contract for
importing thousands of records in a single operation, exporting entire dataset
slices with a tamper-evident signed manifest, issuing commands against record
sets with per-item success/failure reporting (HTTP 207 Multi-Status per
RFC 4918), polling and resuming long-running jobs, and per-pack compliance
overlays that layer industry-specific validation and reporting requirements on
top of the generic bulk engine.

Every bulk operation emits Evidence Class EC-22 (`BULK_OPERATION`) into the
evidence ledger (E8) and is correlated with an LRO handle (E13). All write
endpoints are idempotent when an `Idempotency-Key` header is supplied.

---

## 1. Purpose and scope

### 1.1 In scope

- **Bulk import**: validate, deduplicate, and persist up to 50,000 records per
  job; schema validation per domain contract; per-record authorization check;
  duplicate detection by natural key; partial success with per-item 207 result.
- **Bulk export**: cursor-paginated slice extraction; Ed25519-signed manifest
  listing all exported record refs and their SHA-256 content hashes.
- **Bulk command**: apply a named command (approve, reject, release, hold,
  archive) to an arbitrary record set; per-item 207 result; dry-run mode.
- **Status polling**: GET on the LRO handle returns completion percentage,
  per-shard progress, ETA, and partial result URI.
- **Restart**: resume a failed or cancelled job from its last LRO checkpoint;
  already-committed records are not re-processed (exactly-once semantics).
- **Per-pack overlay endpoints**: domain-specific validation, enrichment, and
  regulatory submission triggered as a post-import or post-export hook.

### 1.2 Out of scope

- Single-record CRUD (E4 Record API)
- LRO lifecycle management beyond correlation (E13 Long-Running Operation API)
- Evidence ledger internals (E8)
- Notification delivery of job completion (E10)
- Streaming real-time feeds (E15 Webhook / Event-Stream API)

### 1.3 Guiding principles

| Principle | Implementation |
|---|---|
| Exactly-once record delivery | Idempotency-Key + natural-key dedup table |
| Partial success, full visibility | HTTP 207 for every multi-record response |
| Tamper evidence | Ed25519 signed manifest on export |
| Resumability | LRO checkpoint every 500 records |
| Compliance layering | Per-pack overlay hooks post-import / post-export |
| Observable | EC-22 evidence + OTEL spans + Prometheus metrics |

---

## 2. Endpoint catalog

The base path for all endpoints is `/api/v1/bulk`.

| # | Method | Path | Purpose |
|---|---|---|---|
| E11-01 | `POST` | `/bulk/import` | Submit a bulk import job |
| E11-02 | `POST` | `/bulk/export` | Submit a bulk export job |
| E11-03 | `POST` | `/bulk/command` | Issue a bulk command against a record set |
| E11-04 | `GET` | `/bulk/jobs/{job_id}` | Poll job status |
| E11-05 | `POST` | `/bulk/jobs/{job_id}/restart` | Restart a failed or cancelled job |
| E11-06 | `GET` | `/bulk/jobs/{job_id}/result` | Retrieve paginated per-record results |
| E11-07 | `GET` | `/bulk/jobs/{job_id}/manifest` | Retrieve the signed export manifest |
| E11-08 | `GET` | `/bulk/jobs` | List bulk jobs for the current tenant |
| E11-09 | `DELETE` | `/bulk/jobs/{job_id}` | Cancel a running job |
| E11-10 | `POST` | `/bulk/overlay/{pack_code}` | Trigger a per-pack compliance overlay |

---

## 3. Shared conventions

### 3.1 Idempotency-Key

All `POST` endpoints that mutate state MUST receive an `Idempotency-Key`
header (UUID v4, 36 characters). The platform stores the key with a TTL of
72 hours. If the same key is replayed within TTL and the original job is still
running or completed, the server returns the original response body with
`X-Idempotent-Replay: true` and does not create a second job.

If an `Idempotency-Key` is absent on a mutation endpoint, the server returns
`HTTP 400` with `problem_code: IDEMPOTENCY_KEY_REQUIRED`.

### 3.2 Per-record idempotency (natural-key dedup)

Within an import payload, each record carries a `natural_key` composed of
domain-defined fields (e.g., `lot_number + gtin` for lot records). The bulk
engine maintains a `bulk_import_dedup` shadow table keyed by
`(tenant_id, domain, natural_key, idempotency_key)`. Records whose natural key
already exists in a prior committed import for the same tenant produce a result
item with `status: 207`, `http_status: 200`, and `disposition: DUPLICATE_SKIPPED`
rather than being re-inserted.

### 3.3 HTTP 207 Multi-Status (RFC 4918)

Endpoints that act on a collection of records return `HTTP 207 Multi-Status`
when at least one item in the collection has a non-uniform outcome. The
`responses` array in the body mirrors the RFC 4918 `<multistatus>` contract
serialized as JSON:

```jsonc
// Canonical 207 envelope
{
  "job_id": "job_01HXXXXX",
  "summary": {
    "total":   1000,
    "success": 995,
    "skipped": 3,
    "failed":  2
  },
  "responses": [
    {
      "index":      0,            // position in submitted records array
      "record_ref": "LOT-0042",  // natural key or assigned ref
      "http_status": 201,
      "disposition": "CREATED",
      "href": "/api/v1/lots/uuid-of-created-lot"
    },
    {
      "index":      7,
      "record_ref": "LOT-0049",
      "http_status": 422,
      "disposition": "VALIDATION_FAILED",
      "errors": [
        { "field": "expiry_date", "code": "PAST_DATE", "message": "Expiry date 2023-01-01 is in the past" }
      ]
    },
    {
      "index":      12,
      "record_ref": "LOT-0054",
      "http_status": 409,
      "disposition": "DUPLICATE_SKIPPED",
      "message": "Record already imported in job job_01HYYYYY"
    }
  ]
}
```

When all records succeed, the server MAY return `HTTP 201` (import) or
`HTTP 200` (command/export) instead of 207 to simplify client handling.
Clients MUST handle both 200/201 and 207 on these endpoints.

### 3.4 ETag and conditional requests (RFC 7232)

Every job resource (`/bulk/jobs/{job_id}`) carries an `ETag` header computed
as `SHA-256(job_id + updated_at_unix_ms)` encoded as a quoted hex string.
Clients polling status MAY supply `If-None-Match` to receive `304 Not Modified`
when the job has not progressed since the last poll, saving bandwidth during
long-running exports.

### 3.5 Cursor pagination

`/bulk/jobs` and `/bulk/jobs/{job_id}/result` use opaque cursor pagination:

```
GET /api/v1/bulk/jobs?limit=50&cursor=<opaque_base64_cursor>
```

Response includes:
```jsonc
{
  "data": [ ... ],
  "pagination": {
    "limit": 50,
    "next_cursor": "eyJvZmZzZXQiOjUwfQ==",
    "has_more": true
  }
}
```

Cursors are stable for 24 hours. An expired cursor returns `HTTP 400` with
`problem_code: CURSOR_EXPIRED`.

### 3.6 Evidence class EC-22

Every bulk job creation, completion, partial failure, restart, and manifest
retrieval emits an EC-22 evidence event to the Evidence API (E8):

```jsonc
{
  "evidence_class": "EC-22",
  "subtype": "BULK_OPERATION",
  "job_id": "job_01HXXXXX",
  "action": "JOB_CREATED | JOB_COMPLETED | JOB_FAILED | JOB_RESTARTED | MANIFEST_RETRIEVED",
  "tenant_id": "tenant_abc",
  "actor_id":  "user_xyz",
  "timestamp": "2026-04-27T09:00:00Z",
  "record_count": 1000,
  "pack_code": "J1" // null for generic operations
}
```

---

## 4. Endpoint contracts

### E11-01 — POST /bulk/import

Submit a bulk import job. Records are validated, deduplicated, and persisted
asynchronously. The endpoint returns immediately with an LRO handle; callers
poll E11-04 for completion.

**Request headers**

| Header | Required | Description |
|---|---|---|
| `Idempotency-Key` | Yes | UUID v4, 36 chars |
| `Content-Type` | Yes | `application/json` |
| `X-Tenant-Id` | Yes | Tenant scope |
| `Authorization` | Yes | Bearer JWT |

**Request body**

```jsonc
{
  // Domain identifies which record schema and authorization policy to apply.
  // Allowed values: lot, nonconformance_case, inspection, work_order,
  //                 purchase_order, training_record, equipment, document
  "domain": "lot",

  // Optional: import mode.
  //   CREATE_ONLY     — reject if natural key already exists (default)
  //   UPSERT          — update if exists, create if not
  //   UPDATE_ONLY     — reject if natural key does not exist
  "mode": "CREATE_ONLY",

  // Optional: dry_run=true validates all records and returns a 207 result
  // without persisting anything. No LRO is created; response is synchronous
  // when record count <= 500, asynchronous otherwise.
  "dry_run": false,

  // Records array. Maximum 50,000 items. Each item must conform to the
  // domain schema registered in the Contract Registry.
  "records": [
    {
      // natural_key fields are domain-defined; shown here for "lot" domain.
      "gtin":          "00380777003735",
      "lot_number":    "LOT-2026-04001",
      "expiry_date":   "2028-06-30",
      "quantity":      5000,
      "unit_of_measure": "EA",
      "supplier_id":   "SUP-0042",
      "received_date": "2026-04-01"
    }
    // ... up to 49,999 more records
  ],

  // Optional: per-pack overlay code to invoke after successful import.
  // See Section 7 for overlay specifications.
  "overlay": {
    "pack_code": "J1",
    "params": { "verify_dscsa": true }
  }
}
```

**Response — 202 Accepted**

```jsonc
{
  "job_id":    "job_01HXXXXX",
  "lro_id":    "lro_01HXXXXX",   // correlates with E13 LRO API
  "status":    "QUEUED",
  "domain":    "lot",
  "mode":      "CREATE_ONLY",
  "dry_run":   false,
  "submitted_count": 1000,
  "created_at": "2026-04-27T09:00:00Z",
  "estimated_completion_at": "2026-04-27T09:05:00Z",
  "poll_href": "/api/v1/bulk/jobs/job_01HXXXXX",
  "result_href": "/api/v1/bulk/jobs/job_01HXXXXX/result"
}
```

**Validation errors (400 / 422)**

If the overall request payload is malformed (wrong domain, records array
absent, count exceeds 50,000), the server returns `HTTP 400` synchronously
before enqueuing the job:

```jsonc
// RFC 9457 Problem Details
{
  "type":   "https://hesem.io/problems/bulk/invalid-request",
  "title":  "Bulk import request is invalid",
  "status": 400,
  "detail": "records array exceeds maximum of 50,000 items (submitted: 51,200)",
  "problem_code": "RECORD_LIMIT_EXCEEDED",
  "instance": "/api/v1/bulk/import"
}
```

**Per-record validation** occurs asynchronously; results surface via
E11-06 with `http_status: 422` items.

**Authorization model**: the importer's JWT is checked against the domain's
`bulk_import` permission. Each record's owning organizational unit is
additionally checked if the domain contract declares `per_record_authz: true`.
Records failing the per-record check appear in the 207 result with
`http_status: 403, disposition: UNAUTHORIZED`.

---

### E11-02 — POST /bulk/export

Submit a bulk export job. After completion, the result can be downloaded as a
paginated record stream and the signed manifest can be retrieved from E11-07.

**Request body**

```jsonc
{
  "domain": "lot",

  // Filter expression using the HESEM Filter Query Language (FQL).
  // If omitted, all accessible records in the domain are exported.
  "filter": "supplier_id = 'SUP-0042' AND expiry_date >= '2026-01-01'",

  // Output format: json_lines (default), csv, parquet
  "format": "json_lines",

  // Optional: field projection. If omitted, all fields are exported.
  "fields": ["gtin", "lot_number", "expiry_date", "quantity", "supplier_id"],

  // Optional: per-pack overlay to invoke on the exported dataset.
  "overlay": {
    "pack_code": "J5",
    "params": { "cte_type": "SHIPPING", "kde_profile": "full" }
  },

  // Optional: sign the manifest with the tenant's Ed25519 key (default: true).
  "sign_manifest": true
}
```

**Response — 202 Accepted**

```jsonc
{
  "job_id":     "job_01HYYYYY",
  "lro_id":     "lro_01HYYYYY",
  "status":     "QUEUED",
  "domain":     "lot",
  "format":     "json_lines",
  "filter_applied": "supplier_id = 'SUP-0042' AND expiry_date >= '2026-01-01'",
  "created_at": "2026-04-27T09:10:00Z",
  "estimated_record_count": 4800,
  "poll_href":     "/api/v1/bulk/jobs/job_01HYYYYY",
  "result_href":   "/api/v1/bulk/jobs/job_01HYYYYY/result",
  "manifest_href": "/api/v1/bulk/jobs/job_01HYYYYY/manifest"
}
```

---

### E11-03 — POST /bulk/command

Issue a named command against a record set. The command is applied to each
record individually; per-item results are returned via HTTP 207.

**Supported commands**

| Command | Description | Applicable domains |
|---|---|---|
| `approve` | Approve records (triggers e-signature if configured) | nonconformance_case, inspection, document |
| `reject` | Reject records with reason | nonconformance_case, inspection |
| `release` | Release lots or work orders | lot, work_order |
| `hold` | Place records on quality hold | lot, work_order, equipment |
| `archive` | Archive inactive records | all |
| `recalculate` | Trigger re-calculation of derived fields | lot, work_order |
| `notify` | Dispatch a notification to record owners | all |

**Request body**

```jsonc
{
  "command": "hold",
  "domain":  "lot",

  // Record references: provide either record_ids OR a filter.
  // Maximum 10,000 records per command job.
  "record_ids": ["lot-uuid-1", "lot-uuid-2", "lot-uuid-3"],

  // Alternatively: "filter": "supplier_id = 'SUP-RISK-007'"

  // Command-specific parameters.
  "params": {
    "hold_reason":  "Supplier deviation investigation",
    "hold_code":    "QH-003",
    "notify_owner": true
  },

  // Optional: dry_run=true returns a 207 preview without committing.
  "dry_run": false
}
```

**Response — 207 Multi-Status**

```jsonc
{
  "job_id": "job_01HZZZZZ",
  "command": "hold",
  "domain":  "lot",
  "dry_run": false,
  "summary": {
    "total":   3,
    "success": 2,
    "skipped": 0,
    "failed":  1
  },
  "responses": [
    {
      "index":      0,
      "record_ref": "lot-uuid-1",
      "http_status": 200,
      "disposition": "COMMAND_APPLIED",
      "href": "/api/v1/lots/lot-uuid-1"
    },
    {
      "index":      1,
      "record_ref": "lot-uuid-2",
      "http_status": 200,
      "disposition": "COMMAND_APPLIED",
      "href": "/api/v1/lots/lot-uuid-2"
    },
    {
      "index":      2,
      "record_ref": "lot-uuid-3",
      "http_status": 409,
      "disposition": "COMMAND_REJECTED",
      "errors": [
        {
          "code":    "ALREADY_ON_HOLD",
          "message": "Lot lot-uuid-3 is already on quality hold QH-001"
        }
      ]
    }
  ]
}
```

When the record set is large (> 500 records), the command runs asynchronously.
The response is `202 Accepted` with an LRO handle, and per-item results are
available via E11-06 after completion.

---

### E11-04 — GET /bulk/jobs/{job_id}

Poll job status. Returns the current state of the bulk job including progress
counters, shard-level detail, ETA, and checkpoint information.

**Path parameter**: `job_id` — the job identifier returned by E11-01, E11-02,
or E11-03.

**Response — 200 OK**

```jsonc
{
  "job_id":   "job_01HXXXXX",
  "lro_id":   "lro_01HXXXXX",
  "type":     "IMPORT",       // IMPORT | EXPORT | COMMAND
  "command":  null,           // command name if type=COMMAND
  "domain":   "lot",
  "status":   "RUNNING",      // QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED | RESTARTING
  "progress": {
    "total":     1000,
    "processed": 650,
    "succeeded": 647,
    "failed":    3,
    "pct_complete": 65
  },
  "shards": [
    { "shard_id": 1, "range": "0–499",   "status": "COMPLETED", "succeeded": 498, "failed": 2 },
    { "shard_id": 2, "range": "500–999", "status": "RUNNING",   "succeeded": 149, "failed": 1 }
  ],
  "checkpoint": {
    "last_committed_index": 649,
    "checkpoint_at": "2026-04-27T09:03:10Z"
  },
  "created_at":   "2026-04-27T09:00:00Z",
  "started_at":   "2026-04-27T09:00:05Z",
  "completed_at": null,
  "estimated_completion_at": "2026-04-27T09:05:30Z",
  "result_href":   "/api/v1/bulk/jobs/job_01HXXXXX/result",
  "manifest_href": null  // non-null only for EXPORT jobs after completion
}
```

**ETag**: The response includes `ETag: "sha256hex"`. Callers polling frequently
SHOULD supply `If-None-Match` to receive `304 Not Modified` when the job has
not progressed.

---

### E11-05 — POST /bulk/jobs/{job_id}/restart

Restart a job that has status `FAILED` or `CANCELLED`. The engine resumes from
the last LRO checkpoint, skipping records already committed in the prior run.
This provides exactly-once semantics: a record committed before the checkpoint
will not be re-inserted or re-commanded.

**Request body**

```jsonc
{
  // Optional: override the original job's parameters on restart.
  // Only "mode" and "params" may be overridden. Domain and command are frozen.
  "override": {
    "mode": "UPSERT"  // e.g., relax CREATE_ONLY to UPSERT on retry
  },

  // Optional: resume_from_index forces the checkpoint to a specific record
  // index. Use only when the automatic checkpoint is corrupted.
  // If omitted, the engine uses the last stored checkpoint.
  "resume_from_index": null
}
```

**Response — 202 Accepted**

```jsonc
{
  "job_id":        "job_01HXXXXX",
  "restart_job_id": "job_01HXXXXX_r1",  // child job tracking the restart
  "lro_id":        "lro_01HXXXXX_r1",
  "status":        "QUEUED",
  "resumed_from_index": 649,
  "remaining_records":  351,
  "poll_href": "/api/v1/bulk/jobs/job_01HXXXXX_r1"
}
```

**Restart limits**: A job may be restarted up to 5 times. If all 5 restart
attempts fail, the job enters `PERMANENTLY_FAILED` status and can only be
re-submitted as a new job. A `problem_code: MAX_RESTARTS_EXCEEDED` error is
returned on the sixth restart attempt.

**Checkpoint mechanics**: The bulk engine writes a checkpoint row to
`bulk_job_checkpoint` every 500 records processed. Each checkpoint stores
`(job_id, committed_index, shard_id, checksum)`. On restart, the engine reads
the highest `committed_index`, re-derives the shard slice, and skips records
`<= committed_index`. The checksum prevents checkpoint tampering.

---

### E11-06 — GET /bulk/jobs/{job_id}/result

Retrieve paginated per-record results for a completed or partially-failed job.
The result stream uses cursor pagination (Section 3.5).

**Query parameters**

| Parameter | Default | Description |
|---|---|---|
| `limit` | 100 | Items per page (max 1,000) |
| `cursor` | — | Opaque cursor from previous response |
| `disposition` | — | Filter by disposition code (CREATED, DUPLICATE_SKIPPED, VALIDATION_FAILED, UNAUTHORIZED, COMMAND_APPLIED, COMMAND_REJECTED) |
| `http_status` | — | Filter by item HTTP status (e.g., 422) |

**Response — 200 OK**

```jsonc
{
  "job_id": "job_01HXXXXX",
  "data": [
    {
      "index":      0,
      "record_ref": "LOT-2026-04001",
      "http_status": 201,
      "disposition": "CREATED",
      "href": "/api/v1/lots/uuid-abc"
    },
    {
      "index":      7,
      "record_ref": "LOT-2026-04008",
      "http_status": 422,
      "disposition": "VALIDATION_FAILED",
      "errors": [
        { "field": "gtin", "code": "INVALID_FORMAT", "message": "GTIN must be 14 digits" }
      ]
    }
  ],
  "pagination": {
    "limit": 100,
    "next_cursor": "eyJvZmZzZXQiOjEwMH0=",
    "has_more": true
  }
}
```

---

### E11-07 — GET /bulk/jobs/{job_id}/manifest

Retrieve the signed export manifest for a completed export job. The manifest
is only available for jobs of type `EXPORT` that have completed with
`sign_manifest: true`.

**Manifest structure**

```jsonc
{
  "manifest_version": "1.0",
  "job_id":    "job_01HYYYYY",
  "domain":    "lot",
  "tenant_id": "tenant_abc",
  "generated_at": "2026-04-27T09:15:00Z",
  "record_count": 4800,
  "filter_applied": "supplier_id = 'SUP-0042' AND expiry_date >= '2026-01-01'",
  "format":    "json_lines",

  // Each entry lists a record reference and the SHA-256 hash of that
  // record's serialized bytes in the export stream, in export order.
  "entries": [
    { "index": 0,    "record_ref": "LOT-2026-04001", "sha256": "a3b4c5..." },
    { "index": 1,    "record_ref": "LOT-2026-04002", "sha256": "d6e7f8..." }
    // ... 4,798 more entries
  ],

  // Manifest-level hash: SHA-256 of the canonical JSON of all entries
  // (sorted by index, no whitespace).
  "manifest_hash": "9f1a2b3c...",

  // Ed25519 signature over manifest_hash using the tenant's signing key.
  // Key ID references the public key in the tenant's JWKS endpoint.
  "signature": {
    "algorithm": "Ed25519",
    "key_id":    "key_2026_Q2",
    "value":     "base64url_encoded_64_byte_signature"
  },

  // Public key included for offline verification.
  "public_key": {
    "kty": "OKP",
    "crv": "Ed25519",
    "kid": "key_2026_Q2",
    "x":   "base64url_encoded_32_byte_public_key"
  }
}
```

**Verification procedure (offline)**:

1. Compute `SHA-256(canonical_json(entries))` and compare to `manifest_hash`.
2. Verify the Ed25519 signature: `Ed25519.verify(public_key.x, manifest_hash_bytes, signature.value_bytes)`.
3. For each record in the export stream, compute `SHA-256(record_bytes)` and
   compare to the corresponding `entries[i].sha256`.

The manifest is returned with `Content-Type: application/json` and
`Cache-Control: immutable` since manifests are never mutated after generation.

---

### E11-08 — GET /bulk/jobs

List bulk jobs scoped to the current tenant and authenticated user (or
all jobs for users with `bulk:admin` permission).

**Query parameters**

| Parameter | Default | Description |
|---|---|---|
| `limit` | 20 | Items per page (max 100) |
| `cursor` | — | Opaque pagination cursor |
| `type` | — | Filter: IMPORT, EXPORT, COMMAND |
| `status` | — | Filter: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED |
| `domain` | — | Filter by domain |
| `created_after` | — | ISO 8601 timestamp |
| `created_before` | — | ISO 8601 timestamp |

**Response — 200 OK**

```jsonc
{
  "data": [
    {
      "job_id":    "job_01HXXXXX",
      "type":      "IMPORT",
      "domain":    "lot",
      "status":    "COMPLETED",
      "progress":  { "total": 1000, "succeeded": 997, "failed": 3, "pct_complete": 100 },
      "created_at": "2026-04-27T09:00:00Z",
      "completed_at": "2026-04-27T09:05:12Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "next_cursor": "eyJvZmZzZXQiOjIwfQ==",
    "has_more": false
  }
}
```

---

### E11-09 — DELETE /bulk/jobs/{job_id}

Cancel a running or queued job. A checkpoint is committed at the current record
index before the job is cancelled so that a subsequent restart (E11-05) can
resume cleanly.

**Response — 200 OK**

```jsonc
{
  "job_id":       "job_01HXXXXX",
  "status":       "CANCELLED",
  "cancelled_at": "2026-04-27T09:02:30Z",
  "checkpoint": {
    "committed_index": 349,
    "committed_at":    "2026-04-27T09:02:29Z"
  },
  "message": "Job cancelled. 349 records were committed. Use POST /bulk/jobs/{job_id}/restart to resume."
}
```

Cancellation is eventually consistent. The job transitions to `CANCELLING`
immediately, then to `CANCELLED` once the current shard finishes its in-flight
micro-batch (max 100 records). Clients SHOULD poll E11-04 until
`status = CANCELLED` before restarting.

---

### E11-10 — POST /bulk/overlay/{pack_code}

Trigger a per-pack compliance overlay against an already-completed import or
export job. The overlay validates, enriches, or submits records to an external
regulatory system as defined in Section 7.

**Path parameter**: `pack_code` — one of `J1`, `J2`, `J3`, `J4`, `J5`.

**Request body**

```jsonc
{
  "job_id": "job_01HXXXXX",

  // Overlay-specific parameters. See Section 7 for pack-specific schemas.
  "params": {
    "verify_dscsa":    true,  // J1 example
    "submission_mode": "TEST" // J4 example: TEST | PRODUCTION
  }
}
```

**Response — 202 Accepted** (async overlay job)

```jsonc
{
  "overlay_job_id": "ovl_01HAAAAAA",
  "pack_code":      "J1",
  "parent_job_id":  "job_01HXXXXX",
  "status":         "QUEUED",
  "poll_href":      "/api/v1/bulk/jobs/ovl_01HAAAAAA"
}
```

---

## 5. Import validation pipeline

Every import job passes all submitted records through a four-stage pipeline.
Failures in any stage produce a per-item 207 result entry; the pipeline short-
circuits per record (a record failing stage 1 does not proceed to stage 2).

### Stage 1 — Structural validation

The record is validated against the domain's JSON Schema contract (stored in
the Contract Registry at `tests/fixtures/module-template-v4/registries/api/`).
Errors: `MISSING_REQUIRED_FIELD`, `INVALID_TYPE`, `INVALID_FORMAT`,
`VALUE_OUT_OF_RANGE`.

### Stage 2 — Business rule validation

Domain-specific rules are evaluated. Examples for the `lot` domain:
- `expiry_date` must be in the future (> import date)
- `quantity` must be positive
- `gtin` must be a valid GS1 GTIN-14 (check-digit verified)
- `supplier_id` must resolve to an active supplier record

Errors: `PAST_EXPIRY_DATE`, `INVALID_GTIN`, `UNKNOWN_SUPPLIER_ID`.

### Stage 3 — Duplicate detection

The natural key is computed from domain-defined fields and looked up in the
`bulk_import_dedup` shadow table. Matches within the same idempotency scope
produce `DUPLICATE_SKIPPED`. Matches from a prior job produce
`DUPLICATE_CROSS_JOB` with a reference to the original job ID.

### Stage 4 — Per-record authorization

If the domain contract declares `per_record_authz: true`, each record's
organizational unit scope is checked against the importer's JWT claims. Records
outside the actor's authorized scope produce `http_status: 403`,
`disposition: UNAUTHORIZED`. This stage runs last to avoid leaking existence
information before structural validation has confirmed the record is well-formed.

---

## 6. LRO integration (E13 correlation)

Every bulk job is correlated with exactly one LRO handle from E13 (Long-Running
Operation API). The correlation is bidirectional:

- `POST /bulk/import` → creates `lro_id` via `POST /api/v1/lro` with
  `operation_type: BULK_IMPORT`, `estimated_duration_sec: <computed>`.
- The LRO engine drives the bulk worker queue; bulk workers report progress
  back via `PATCH /api/v1/lro/{lro_id}/progress`.
- Callers may poll either `/bulk/jobs/{job_id}` (richer bulk detail) or
  `/lro/{lro_id}` (generic LRO view) interchangeably.
- On checkpoint write, the bulk engine also writes `checkpoint_data` to the LRO
  record so the LRO API can surface checkpoint state for operations dashboards.
- On restart (E11-05), the bulk engine instructs E13 to create a child LRO with
  `parent_lro_id` pointing to the original.

**Worker concurrency model**: Each job is split into shards of 500 records.
Shards run in parallel with a maximum of 8 concurrent workers per tenant.
Workers are stateless; all state lives in `bulk_job_checkpoint` and the LRO
record so any worker can pick up any shard after a crash.

---

## 7. Per-pack compliance overlays

Per-pack overlays extend the generic bulk engine with industry-specific
validation, enrichment, and regulatory submission. Overlays run as post-import
or post-export hooks. They receive the completed bulk job's record set and
return their own 207 overlay result.

Each overlay is identified by a `pack_code` (`J1`–`J5`) that maps to an
industry solution pack. Overlays are enabled per-tenant via feature flags and
are inert by default in pre-production mode.

### 7.1 J1 — DSCSA Bulk Lot Verification (Pharma)

**Regulatory basis**: Drug Supply Chain Security Act, 21 U.S.C. §360eee-1.
DSCSA requires that pharmaceutical product identifiers (serialized lot-level
data) be verified against the manufacturer's Verification Router Service (VRS)
before lot disposition.

**Trigger**: post-import overlay on `domain: lot` with `pack_code: J1`.

**Overlay actions**:

1. For each imported lot, compose a DSCSA Verification Request (DVR) containing
   `gtin`, `serial_number`, `lot_number`, `expiry_date`.
2. Route the DVR to the manufacturer's VRS endpoint via the configured GS1
   resolver. Batch size: up to 1,000 DVRs per VRS call.
3. Map VRS responses to lot verification status:
   - `VERIFIED` → lot status set to `DSCSA_VERIFIED`
   - `NOT_FOUND` → lot quarantined; EC-22 emitted with `subtype: DSCSA_UNVERIFIED`
   - `MISMATCH` → lot placed on immediate quality hold; regulatory notification
     dispatched via E10 with severity `CRITICAL`
4. Update `dscsa_verification_result` column in the lot record.
5. Return a J1 overlay result with per-lot verification outcomes in the 207
   envelope.

**Overlay-specific 207 disposition codes**: `DSCSA_VERIFIED`,
`DSCSA_NOT_FOUND`, `DSCSA_MISMATCH`, `DSCSA_VRS_TIMEOUT`.

**Params schema**:
```jsonc
{
  "verify_dscsa":      true,            // required
  "vrs_timeout_ms":    5000,            // per-DVR timeout (default 5000)
  "quarantine_on_not_found": true,      // default true
  "hold_on_mismatch":        true       // default true; cannot be overridden
}
```

**SLO**: VRS round-trip p95 < 8 s per batch of 1,000 DVRs. Overlay job
p95 < 30 min for 50,000 lots.

---

### 7.2 J2 — PPAP Per-Part Batch (Automotive)

**Regulatory basis**: IATF 16949 §8.3.4.4, AIAG Production Part Approval
Process (PPAP) 4th Edition. PPAP requires that a production part approval
package is submitted and approved before first production shipment.

**Trigger**: post-import overlay on `domain: inspection` with `pack_code: J2`.

**Overlay actions**:

1. For each imported inspection record, identify the part number and revision
   level.
2. Look up the PPAP submission status from `ppap_submission` table:
   - `APPROVED` → inspection record tagged `PPAP_COMPLIANT`
   - `PENDING_APPROVAL` → inspection record tagged `PPAP_PENDING`; warning
     emitted in overlay result
   - `NOT_SUBMITTED` → inspection record tagged `PPAP_MISSING`; hold applied
     if `hold_on_missing: true`
   - `REJECTED` → inspection record blocked; EC-22 emitted with
     `subtype: PPAP_REJECTED`
3. If `auto_submit_ppap: true` and `NOT_SUBMITTED` records exist, the overlay
   generates draft PPAP submission packages using the part master data and
   queues them for engineering review.
4. Aggregate PPAP coverage metrics per part family and attach to the job result.

**Params schema**:
```jsonc
{
  "hold_on_missing":    true,
  "auto_submit_ppap":   false,
  "ppap_level":         3,    // AIAG PPAP level 1–5 (default 3)
  "notify_quality_eng": true
}
```

**SLO**: Overlay p95 < 10 min for 10,000 inspection records.

---

### 7.3 J3 — FAI Bulk Verification (Aerospace)

**Regulatory basis**: AS9102B First Article Inspection (FAI) standard. FAI
requires physical and functional verification of the first production article
to ensure the manufacturing process, tooling, and documentation produce parts
conforming to design requirements.

**Trigger**: post-import overlay on `domain: inspection` or `domain: work_order`
with `pack_code: J3`.

**Overlay actions**:

1. For each imported inspection or work order record, identify the part number,
   drawing revision, and manufacturing order.
2. Check FAI status in `fai_record` table:
   - `COMPLETED_CONFORMING` → record tagged `FAI_COMPLIANT`
   - `COMPLETED_NONCONFORMING` → record tagged `FAI_NONCONFORMING`; NC case
     auto-created if `auto_create_nc: true`
   - `IN_PROGRESS` → record tagged `FAI_PENDING`
   - `NOT_REQUIRED` → record tagged `FAI_EXEMPT` (requires `fai_exemption_code`)
   - `REQUIRED_NOT_STARTED` → record blocked if `block_on_missing_fai: true`
3. If `generate_fai_report: true`, the overlay batches AS9102B Form 1/2/3
   report generation for all `COMPLETED_CONFORMING` records.
4. FAI compliance rate (pct of records with `FAI_COMPLIANT`) is attached to the
   overlay job result as a quality KPI.

**Params schema**:
```jsonc
{
  "block_on_missing_fai":   true,
  "auto_create_nc":         true,
  "generate_fai_report":    false,
  "fai_form_set":           ["Form1", "Form2", "Form3"]  // AS9102B forms
}
```

**SLO**: Overlay p95 < 15 min for 5,000 work order records. FAI report
generation is further asynchronous (tracked under a separate LRO).

---

### 7.4 J4 — UDI Bulk Submission to GUDID (Medical Devices)

**Regulatory basis**: FDA 21 CFR Part 830 (Unique Device Identification). FDA
requires that device identifier data be submitted to the Global Unique Device
Identification Database (GUDID) via the AccessGUDID API before a device is
placed into commercial distribution.

**Trigger**: post-import overlay on `domain: lot` (device lot) or
`domain: equipment` (device master) with `pack_code: J4`.

**Overlay actions**:

1. For each imported device record, compose a GUDID submission bundle (FDA FHIR
   Device resource format, R4).
2. Submit the bundle to the AccessGUDID API (configured endpoint per FDA
   environment: TEST or PRODUCTION).
3. Map GUDID API responses:
   - `201 Created` → device record tagged `GUDID_SUBMITTED`; GUDID accession
     number stored in `udi_submission_id` field.
   - `200 OK` (update) → device record tagged `GUDID_UPDATED`.
   - `422` → device record tagged `GUDID_REJECTED`; rejection detail stored;
     EC-22 emitted with `subtype: GUDID_SUBMISSION_REJECTED`.
   - `429` → rate-limit backoff applied; retry queued automatically.
4. Maintain `udi_submission_log` with each submission attempt, timestamp, HTTP
   status, and GUDID accession number.
5. Return per-device 207 results with GUDID submission outcomes.

**Params schema**:
```jsonc
{
  "submission_mode":   "TEST",       // TEST | PRODUCTION
  "gudid_api_key_ref": "vault://gudid/api-key",
  "fhir_version":      "R4",
  "batch_size":        100,          // GUDID API max per request
  "retry_on_rate_limit": true
}
```

**SLO**: GUDID submission p95 < 45 min for 5,000 device records in TEST mode.
PRODUCTION mode SLO is FDA-network-dependent; internal processing p95 < 5 min
per 1,000 records.

---

### 7.5 J5 — FSMA §204 Bulk CTE/KDE Export (Food)

**Regulatory basis**: FDA Food Safety Modernization Act §204 (21 U.S.C. §2223),
Food Traceability Rule (21 CFR Part 1, Subpart S). §204 requires food
businesses on the Food Traceability List (FTL) to maintain and, upon FDA
request, provide Key Data Elements (KDEs) for Critical Tracking Events (CTEs)
within 24 hours.

**Trigger**: post-export overlay on `domain: lot` (food lot) with
`pack_code: J5`.

**Overlay actions**:

1. For each exported lot record, identify the CTE type from the overlay params
   (`GROWING`, `RECEIVING`, `TRANSFORMING`, `CREATING`, `SHIPPING`).
2. Extract required KDEs per CTE type per 21 CFR §1.1315–§1.1360:
   - `SHIPPING` CTE KDEs: traceability lot code (TLC), TLC source, quantity and
     unit of measure, product description, location description of subsequent
     recipient, date of shipping.
   - `RECEIVING` CTE KDEs: TLC, TLC source, quantity and UOM, product
     description, location description of immediate previous source, date of
     receiving.
   - Other CTE types follow their respective KDE sets per the rule.
3. Validate that all required KDEs are present in the exported lot records.
   Missing KDEs produce `KDE_MISSING` disposition with field-level detail.
4. Package the CTE/KDE dataset as an FDA-ready JSON-LD traceability record
   bundle (FHIR-inspired structure per FDA draft guidance).
5. Sign the CTE/KDE bundle with the signed manifest mechanism (Ed25519) so that
   the bundle can be submitted to FDA with cryptographic integrity.
6. Attach the signed bundle URI to the overlay job result.

**Params schema**:
```jsonc
{
  "cte_type":        "SHIPPING",   // GROWING | RECEIVING | TRANSFORMING | CREATING | SHIPPING
  "kde_profile":     "full",       // full | minimal (minimal = statutory minimum KDEs only)
  "sign_cte_bundle": true,
  "ftl_category":    "LEAFY_GREENS"  // FDA FTL category for CTE-type validation
}
```

**SLO**: KDE extraction and validation p95 < 20 min for 50,000 lot records.
CTE bundle signing p95 < 2 min.

---

## 8. Service level objectives (SLO)

| Operation | Scope | p50 | p95 | p99 | Error budget (30-day) |
|---|---|---|---|---|---|
| Job submission (E11-01/02/03) | Synchronous response | < 200ms | < 800ms | < 2s | 0.1% |
| Status poll (E11-04) | Synchronous response | < 100ms | < 300ms | < 1s | 0.1% |
| Import throughput | Records per second per tenant | 500 r/s | — | — | — |
| Export throughput | Records per second per tenant | 800 r/s | — | — | — |
| Import job E2E (1,000 records) | Job duration | < 2 min | < 5 min | < 10 min | 1% |
| Import job E2E (50,000 records) | Job duration | < 20 min | < 40 min | < 60 min | 2% |
| Export job E2E (50,000 records) | Job duration | < 15 min | < 30 min | < 50 min | 2% |
| Manifest generation | After export completes | < 5s | < 30s | < 2 min | 0.5% |
| Restart time | From cancel to queued | < 1s | < 5s | < 15s | 0.1% |
| J1 DSCSA overlay (50,000 lots) | Overlay duration | < 15 min | < 30 min | < 60 min | 3% |
| J2 PPAP overlay (10,000 insp) | Overlay duration | < 5 min | < 10 min | < 20 min | 3% |
| J3 FAI overlay (5,000 WOs) | Overlay duration | < 8 min | < 15 min | < 30 min | 3% |
| J4 UDI overlay (5,000 devices) | Overlay duration | < 25 min | < 45 min | < 90 min | 5% |
| J5 §204 overlay (50,000 lots) | Overlay duration | < 10 min | < 20 min | < 40 min | 3% |

SLOs are measured at the API gateway. Overlay SLOs exclude external network
latency to VRS/GUDID/FDA systems, which is documented separately in the
integration SLA annex.

---

## 9. Observability

### 9.1 Prometheus metrics

| Metric name | Type | Labels | Description |
|---|---|---|---|
| `hesem_bulk_job_submitted_total` | Counter | `type`, `domain`, `tenant_id` | Jobs submitted |
| `hesem_bulk_job_completed_total` | Counter | `type`, `domain`, `status`, `tenant_id` | Jobs completed (COMPLETED / FAILED / CANCELLED) |
| `hesem_bulk_records_processed_total` | Counter | `type`, `domain`, `disposition`, `tenant_id` | Records processed by disposition |
| `hesem_bulk_job_duration_seconds` | Histogram | `type`, `domain`, `tenant_id` | End-to-end job duration (buckets: 30s, 2m, 5m, 15m, 30m, 60m) |
| `hesem_bulk_job_throughput_records_per_sec` | Gauge | `type`, `domain`, `tenant_id` | Current throughput per tenant |
| `hesem_bulk_checkpoint_lag_records` | Gauge | `job_id` | Records processed since last checkpoint |
| `hesem_bulk_overlay_duration_seconds` | Histogram | `pack_code`, `tenant_id` | Overlay job duration |
| `hesem_bulk_overlay_item_total` | Counter | `pack_code`, `disposition`, `tenant_id` | Per-item overlay outcomes |
| `hesem_bulk_manifest_generation_seconds` | Histogram | `domain`, `tenant_id` | Time to generate and sign manifest |
| `hesem_bulk_worker_queue_depth` | Gauge | `tenant_id` | Pending shard tasks in worker queue |
| `hesem_bulk_idempotency_replay_total` | Counter | `type`, `tenant_id` | Idempotency key replays |

### 9.2 OpenTelemetry trace spans

Every bulk job creates a root span `bulk.job` with child spans:

- `bulk.shard.{n}` — per-shard processing span
- `bulk.validate.structural` — stage 1 validation
- `bulk.validate.business` — stage 2 validation
- `bulk.validate.dedup` — stage 3 dedup lookup
- `bulk.validate.authz` — stage 4 per-record authz
- `bulk.persist` — database write span
- `bulk.checkpoint.write` — checkpoint span (every 500 records)
- `bulk.manifest.sign` — manifest signing span (export jobs)
- `bulk.overlay.{pack_code}` — overlay span

All spans carry `job_id`, `lro_id`, `tenant_id`, `domain` attributes.

### 9.3 Alerts

| Alert name | Condition | Severity | Action |
|---|---|---|---|
| `BulkJobHighFailureRate` | `rate(bulk_job_completed_total{status="FAILED"}[5m]) / rate(bulk_job_completed_total[5m]) > 0.05` | Warning | PagerDuty page platform on-call |
| `BulkJobStalled` | `bulk_job_duration_seconds{quantile="0.95"} > 3600` | Critical | PagerDuty + auto-cancel + notify submitter |
| `BulkWorkerQueueBacklog` | `bulk_worker_queue_depth > 200 for 10m` | Warning | Scale out worker pool |
| `BulkCheckpointLagHigh` | `bulk_checkpoint_lag_records > 2000` | Warning | Investigate worker health |
| `BulkManifestSigningFailed` | `rate(bulk_manifest_generation_seconds_count[5m]) == 0 and <any pending export>` | Critical | PagerDuty + block export completion |
| `BulkOverlayJ1DscsaTimeout` | `rate(bulk_overlay_item_total{pack_code="J1",disposition="DSCSA_VRS_TIMEOUT"}[5m]) > 0.1` | Warning | VRS connectivity check |
| `BulkOverlayJ4GuDIDRateLimit` | `rate(bulk_overlay_item_total{pack_code="J4",disposition="GUDID_RATE_LIMITED"}[5m]) > 0` | Info | Backoff already applied; monitor recovery |
| `BulkEvidenceEmissionFailed` | Any EC-22 emission failure (checked via E8 health endpoint) | Critical | PagerDuty + pause bulk worker pool |

### 9.4 Structured logs

All bulk engine log events use structured JSON with the following mandatory
fields: `timestamp`, `level`, `job_id`, `lro_id`, `tenant_id`, `domain`,
`shard_id`, `record_index`, `event_type`, `duration_ms`. Sensitive record
payloads (PII, GTIN+serial) are masked using the platform's log redaction
filter before emission.

---

## 10. Operational runbook

### Scenario A — Large import job stalled mid-flight

**Symptom**: A job of 50,000 records has been `RUNNING` for 75 minutes. SLO
p99 is 60 minutes. The `BulkJobStalled` alert fires.

**Investigation**:

1. Query `GET /bulk/jobs/{job_id}` — note `checkpoint.last_committed_index`
   and `checkpoint.checkpoint_at`. If `checkpoint_at` is more than 10 minutes
   ago, the worker processing that shard has crashed or lost connectivity.
2. Check `hesem_bulk_worker_queue_depth` metric — if depth is 0, the shard
   task was dequeued but the worker died before completing.
3. Check the worker pod logs for OOM or network errors:
   `kubectl logs -l app=bulk-worker --since=30m | grep job_id`.

**Resolution**:

1. Call `DELETE /bulk/jobs/{job_id}` to issue a graceful cancel. This commits
   the last checkpoint.
2. Wait for `status = CANCELLED` (poll E11-04 with `If-None-Match`).
3. Call `POST /bulk/jobs/{job_id}/restart`. The engine resumes from the last
   checkpoint; no already-committed records are re-processed.
4. Monitor the restarted job. If it stalls again, check the specific record
   range in `bulk_job_checkpoint` for a poisoned record causing a validator
   crash.
5. To skip a poisoned record range, use `restart` with
   `"resume_from_index": <checkpoint_index + 1>`.

**Post-incident**: File an incident report. If the worker OOMed, increase the
worker pod memory limit and re-tune shard size (default 500 → 250).

---

### Scenario B — DSCSA overlay returning DSCSA_MISMATCH at scale

**Symptom**: After a 10,000-lot J1 overlay, 200 lots have
`disposition: DSCSA_MISMATCH`. Quality holds have been automatically applied.
Regulatory notification has been dispatched.

**Investigation**:

1. Retrieve overlay result via `GET /bulk/jobs/{overlay_job_id}/result?disposition=DSCSA_MISMATCH`.
2. For each mismatched lot, compare the submitted `gtin + serial_number + lot_number + expiry_date`
   tuple against the VRS response. Check for date format discrepancies (YYYYMMDD
   vs. YYYY-MM-DD) or encoding errors in the ETL pipeline feeding the import.
3. Cross-reference with the supplier's EPCIS event log to determine if the
   mismatch is a data quality issue or a genuine diversion event.

**Resolution**:

1. If data quality issue (encoding/format): correct the source data, re-import
   only the affected lots using a new `Idempotency-Key` and `mode: UPDATE_ONLY`,
   then re-run the J1 overlay.
2. If genuine diversion: escalate to the Regulatory Affairs team. Do NOT lift
   quality holds without RA sign-off. Holds can only be lifted via
   `POST /bulk/command { "command": "release", ... }` with a required
   e-signature (E7).
3. EC-22 evidence records for the mismatch events are immutable; they remain
   in the evidence ledger regardless of resolution.

---

### Scenario C — Export manifest signature verification failure

**Symptom**: A downstream system (trading partner or regulatory portal) rejects
an exported file, reporting that the Ed25519 signature in the manifest does not
verify against the manifest hash.

**Investigation**:

1. Retrieve the manifest via `GET /bulk/jobs/{job_id}/manifest`.
2. Recompute `SHA-256(canonical_json(entries))` locally and compare to
   `manifest_hash`. If these differ, the manifest entries were mutated after
   generation (data integrity breach — escalate immediately).
3. If `manifest_hash` is correct but the signature fails: check that the
   `public_key.x` in the manifest matches the tenant's current JWKS endpoint
   (`GET /api/v1/tenants/{tenant_id}/.well-known/jwks.json`).
4. If the key IDs match but signature still fails, the signing key may have
   been rotated between manifest generation and downstream verification.

**Resolution**:

1. If the key was rotated: re-export the dataset (new export job) to generate
   a fresh manifest signed with the current key. Provide the new manifest to
   the trading partner.
2. If the manifest entries are corrupted: this is a data integrity incident.
   Halt the affected export pipeline, preserve all artifacts for forensic
   review, and notify the Platform Security team.
3. Implement a post-generation verification step in the export pipeline
   (automatic self-check: sign then immediately verify before marking the
   manifest as available).

---

### Scenario D — Bulk command (hold) applied to wrong record set due to filter error

**Symptom**: A `hold` command was submitted with filter `supplier_id = 'SUP-0042'`
but the intent was `supplier_id = 'SUP-0142'`. 3,000 lots belonging to
`SUP-0042` are now on quality hold.

**Prevention**: Always use `dry_run: true` first for commands affecting more
than 100 records. The dry-run returns a 207 preview listing which records would
be affected without committing.

**Resolution**:

1. Retrieve the list of incorrectly held lots:
   `GET /bulk/jobs/{command_job_id}/result?disposition=COMMAND_APPLIED`.
2. Submit a new `release` command targeting the incorrectly held lots:
   `POST /bulk/command { "command": "release", "record_ids": [...], "params": { "release_reason": "Incorrect hold — filter correction" } }`.
3. The release command requires the same e-signature authorization as the hold.
   If the original actor cannot sign, a Quality Manager with `bulk:override`
   permission may authorize the release.
4. EC-22 events for both the erroneous hold and the corrective release are
   appended to the evidence ledger; neither can be deleted. The audit trail is
   complete.
5. Process improvement: configure `max_records_without_dry_run: 100` in tenant
   settings to force dry-run preview for large commands.

---

## 11. Security considerations

### 11.1 Rate limiting

| Endpoint | Rate limit (per tenant) |
|---|---|
| `POST /bulk/import` | 10 jobs per minute |
| `POST /bulk/export` | 10 jobs per minute |
| `POST /bulk/command` | 20 jobs per minute |
| `GET /bulk/jobs/{id}` | 120 requests per minute |
| `POST /bulk/overlay/{pack}` | 5 overlays per minute |

Exceeded limits return `HTTP 429` with `Retry-After` header.

### 11.2 Payload size limits

| Limit | Value |
|---|---|
| Maximum import records per job | 50,000 |
| Maximum command record_ids per job | 10,000 |
| Maximum request body size | 256 MB |
| Maximum export result page size | 1,000 records |
| Maximum manifest entries in single response | 100,000 (paginated beyond) |

### 11.3 Key management for manifest signing

Ed25519 signing keys are stored in the platform's Vault instance under the
`hesem/bulk/signing-keys/{tenant_id}` path. Keys are rotated annually or
immediately upon compromise. The public key is published at
`GET /api/v1/tenants/{tenant_id}/.well-known/jwks.json` with a cache TTL of
1 hour. All manifests embed the signing key's `kid` so verifiers can retrieve
the correct public key even after rotation.

### 11.4 Data residency

Export jobs for tenants with data residency requirements (EU GDPR, Vietnam
Decree 13/2023/ND-CP) are executed in the tenant's designated region. Exported
files and manifests are stored in the region-local object store and never
replicated cross-region. The `data_residency_region` is embedded in the manifest
metadata for auditor reference.

---

## 12. Error reference

| HTTP Status | problem_code | Description |
|---|---|---|
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | `Idempotency-Key` header absent |
| 400 | `IDEMPOTENCY_KEY_INVALID` | Key is not a valid UUID v4 |
| 400 | `RECORD_LIMIT_EXCEEDED` | Records array exceeds 50,000 |
| 400 | `CURSOR_EXPIRED` | Pagination cursor is older than 24 hours |
| 400 | `INVALID_DOMAIN` | Domain value not in allowed set |
| 400 | `INVALID_COMMAND` | Command not supported for the domain |
| 400 | `FILTER_PARSE_ERROR` | FQL filter expression syntax error |
| 400 | `JOB_NOT_RESTARTABLE` | Job status is not FAILED or CANCELLED |
| 400 | `MAX_RESTARTS_EXCEEDED` | Job has reached the 5-restart limit |
| 403 | `INSUFFICIENT_PERMISSION` | Actor lacks `bulk_import` / `bulk_command` permission |
| 404 | `JOB_NOT_FOUND` | `job_id` does not exist for this tenant |
| 404 | `MANIFEST_NOT_AVAILABLE` | Job is not an export or has not completed |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Key already used for a job of different type/domain |
| 422 | `OVERLAY_PACK_NOT_ENABLED` | Pack code not enabled for this tenant |
| 422 | `OVERLAY_WRONG_DOMAIN` | Overlay pack_code incompatible with job domain |
| 429 | `RATE_LIMIT_EXCEEDED` | Tenant rate limit reached |
| 503 | `WORKER_POOL_UNAVAILABLE` | Bulk worker pool is at capacity; retry after backoff |

---

## 13. Database schema summary

The Bulk Operation API persists state across five platform tables:

| Table | Key columns | Description |
|---|---|---|
| `bulk_job` | `job_id`, `tenant_id`, `type`, `domain`, `status`, `lro_id` | Job registry |
| `bulk_job_checkpoint` | `job_id`, `shard_id`, `committed_index`, `checksum` | LRO checkpoint per shard |
| `bulk_import_dedup` | `tenant_id`, `domain`, `natural_key_hash`, `job_id` | Natural-key dedup shadow table |
| `bulk_job_result_item` | `job_id`, `record_index`, `record_ref`, `http_status`, `disposition` | Per-record 207 results |
| `bulk_export_manifest` | `job_id`, `manifest_hash`, `signature_value`, `key_id`, `generated_at` | Signed manifest header |

The `bulk_job_result_item` table is partitioned by `job_id` (hash partition,
64 shards) to support efficient cursor-paginated reads over large result sets.

---

## 14. Versioning and deprecation

The Bulk Operation API follows the platform's semantic versioning policy:

- The current version is `v1` (path prefix `/api/v1/bulk`).
- Backwards-compatible additions (new optional fields, new per-pack codes) are
  released without a version bump.
- Breaking changes (field removal, semantic changes to 207 disposition codes)
  will introduce `v2` with a 12-month parallel support window for `v1`.
- The `Idempotency-Key` contract, 207 response structure, and manifest signing
  algorithm (Ed25519) are frozen and will not change within the v1 lifecycle.

---

`S3-05_E11_BULK_OPERATION_DEEP_UPGRADE_COMPLETE`
