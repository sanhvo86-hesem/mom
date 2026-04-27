# E13 — Long-Running Operation API  ·  V10 Deep-Upgrade

```
api_family:      Long-Running Operations (LRO)
owner_role:      Platform Lead
scope:           LRO lifecycle management; checkpoint + restart; per-tenant
                 queue; SLO-11 acknowledge; operation type registry (≥ 22 types);
                 cancellation; progress streaming; dead-letter handling
sources:         Google AIP-151 LRO pattern; OpenAPI 3.1.1; AsyncAPI 3.0;
                 CloudEvents 1.0; RFC 9457; NDJSON streaming; RFC 7232 (ETag)
```

Any API operation whose p95 latency exceeds 10 seconds MUST be implemented as
an LRO. The caller receives an LRO handle immediately (202 Accepted); the
actual work runs asynchronously in a job queue. The LRO handle is used to
poll status, receive progress events via SSE, cancel, restart from checkpoint,
and retrieve the final result. Per SLO-11, every LRO must acknowledge
progress (emit at least one checkpoint event) within 5 minutes of acceptance.

---

## 1. LRO lifecycle

```
ACCEPTED → RUNNING → [CHECKPOINT*] → COMPLETE
                                   ↘ FAILED → (restart) → RUNNING
                                   ↘ CANCELLED (terminal)
```

- `ACCEPTED`: job enqueued, worker not yet started.
- `RUNNING`: worker active; checkpoint events emitted ≥ every 5 min (SLO-11).
- `CHECKPOINT`: intermediate state saved; job survivable across worker restart.
- `COMPLETE`: result available; result retained per operation type retention policy.
- `FAILED`: worker terminated with error; checkpoint preserved for restart.
- `CANCELLED`: explicit cancellation by caller or timeout; non-restartable.

**Worker crash recovery:** If a worker crashes mid-job, the job is automatically
requeued from the last persisted checkpoint. Worker heartbeat timeout: 30 seconds.
After 3 consecutive heartbeat misses, job is declared `STALE_RUNNING` and
rescheduled. At most 3 auto-recoveries per job; after 3 failures → `FAILED` with
`failure_reason: WORKER_CRASH_LIMIT`.

---

## 2. Endpoint contracts

### 2.1 Create LRO (job submission)

All LRO-producing endpoints across the API surface (E8, E9, E11, E12, etc.)
return a standard LRO handle on 202. They do not have a separate
"create LRO" surface — the LRO is created as a side-effect of the initiating
call. This section defines the **standard 202 response shape** all such endpoints
MUST return:

```jsonc
{
  "job_id": "lro-uuid",
  "operation_type": "AUDIT_PACK_EXPORT",
  "status": "ACCEPTED",
  "tenant_id": "tenant-uuid",
  "created_at": "2025-11-14T09:00:00Z",
  "estimated_completion": "2025-11-14T21:00:00Z",
  "priority": "NORMAL",                /* NORMAL | HIGH | CRITICAL */
  "queue_position": 3,                 /* Position in tenant queue */
  "slo_acknowledge_by": "2025-11-14T09:05:00Z",  /* SLO-11: first checkpoint within 5 min */
  "_links": {
    "status":   "/v1/lro/{job_id}",
    "cancel":   "/v1/lro/{job_id}/cancel",
    "events":   "/v1/lro/{job_id}/events",
    "restart":  "/v1/lro/{job_id}/restart"
  }
}
```

---

### 2.2 Poll LRO status

```
PATH        GET /v1/lro/{job_id}
AUTH        Bearer; AAL1; tenant RLS (caller must be same tenant as job initiator or Platform Admin)
```

**Response 200:**

```jsonc
{
  "job_id": "lro-uuid",
  "operation_type": "AUDIT_PACK_EXPORT",
  "status": "RUNNING",
  "tenant_id": "tenant-uuid",
  "created_at": "2025-11-14T09:00:00Z",
  "started_at": "2025-11-14T09:00:08Z",
  "estimated_completion": "2025-11-14T21:00:00Z",
  "progress": {
    "percent_complete": 34,
    "records_processed": 285,
    "records_total": 842,
    "current_phase": "EVIDENCE_COLLECTION",
    "phases": [
      { "name": "SCOPE_RESOLUTION",    "status": "COMPLETE", "completed_at": "2025-11-14T09:00:15Z" },
      { "name": "EVIDENCE_COLLECTION", "status": "RUNNING",  "percent": 34 },
      { "name": "SIGNING",             "status": "PENDING" },
      { "name": "ARCHIVE_ASSEMBLY",    "status": "PENDING" }
    ]
  },
  "last_checkpoint_at": "2025-11-14T09:22:00Z",
  "last_checkpoint_seq": 7,
  "slo_11_met": true,
  "result": null,      /* non-null only when status == COMPLETE */
  "error": null        /* non-null only when status == FAILED */
}
```

**ETag:** `ETag: sha256({status}:{last_checkpoint_seq})` — use `If-None-Match` for long-poll polling. `304 Not Modified` if no change since last poll. Clients SHOULD use 304 polling with 5s interval rather than full response polling.

**Result shape on COMPLETE:**

```jsonc
{
  "result": {
    "output_type": "SIGNED_ARCHIVE",
    "download_url": "https://storage.hesem.io/lro-result/lro-uuid?signed=...",
    "download_expires_at": "2025-11-14T22:00:00Z",
    "result_sha256": "sha256:...",
    "result_signed_by": "compliance-hsm-key-v3",
    "record_count": 842,
    "evidence_count": 4183
  }
}
```

**Error shape on FAILED:**

```jsonc
{
  "error": {
    "code": "EVIDENCE_INTEGRITY_MISMATCH",
    "message": "Integrity verification failed for evidence ev-uuid at checkpoint 7",
    "detail_ref": "/v1/lro/lro-uuid/error-detail",
    "last_checkpoint_seq": 7,
    "restartable": true
  }
}
```

**SLO:** p95 < 200ms (status poll is a lightweight DB read from LRO state table).

---

### 2.3 LRO event stream (SSE / WebSocket)

```
PATH        GET /v1/lro/{job_id}/events
AUTH        Bearer; AAL1; same-tenant
Accept      text/event-stream  OR  Upgrade: websocket
```

Real-time progress events as Server-Sent Events (AsyncAPI 3.0):

```
event: lro_checkpoint
data: {
  "job_id": "lro-uuid",
  "seq": 8,
  "timestamp": "2025-11-14T09:27:00Z",
  "phase": "EVIDENCE_COLLECTION",
  "percent_complete": 41,
  "records_processed": 345,
  "message": "Collected 345/842 evidence records"
}

event: lro_phase_change
data: {
  "job_id": "lro-uuid",
  "seq": 15,
  "from_phase": "EVIDENCE_COLLECTION",
  "to_phase": "SIGNING",
  "timestamp": "2025-11-14T14:30:00Z"
}

event: lro_complete
data: {
  "job_id": "lro-uuid",
  "seq": 22,
  "status": "COMPLETE",
  "result": { /* same as §2.2 result shape */ }
}

event: lro_failed
data: {
  "job_id": "lro-uuid",
  "seq": 9,
  "error": { /* same as §2.2 error shape */ }
}
```

**Reconnect:** Client reconnects with `Last-Event-ID: {seq}` — server replays events from that seq. Events buffered for 10 minutes post-completion. After expiry, reconnect returns 410 Gone.

**Checkpoint frequency (SLO-11):** Worker MUST emit at least one `lro_checkpoint` event within 5 minutes of `ACCEPTED`. Subsequent checkpoints: at least every 5 minutes while RUNNING. If worker misses checkpoint window → automatic worker health check → potential requeue.

---

### 2.4 Cancel LRO

```
PATH        POST /v1/lro/{job_id}/cancel
AUTH        Bearer; AAL1; job initiator or Platform Admin
```

**Request body:** `{ "reason": "Audit scope changed — resubmitting with updated filter" }`

**Response 200:** `{ "job_id": "lro-uuid", "status": "CANCELLING", "cancel_effective_at": "..." }`

Cancellation is cooperative — the worker checks for cancellation signal at each checkpoint. If the worker is between checkpoints, cancellation takes effect at the next checkpoint (up to 5 minutes). In-progress writes are rolled back. Partial output (if any) is discarded. Cancellation is terminal — a cancelled job cannot be restarted.

**Non-cancellable operations:** Some operation types (e.g., `REGULATORY_SUBMISSION`, `LEGAL_HOLD_RELEASE`) are non-cancellable once they enter `RUNNING` state. Cancellation attempt returns `409 NON_CANCELLABLE` with the reason.

---

### 2.5 Restart LRO from checkpoint

```
PATH        POST /v1/lro/{job_id}/restart
AUTH        Bearer; AAL1; job initiator or Platform Admin
```

**Pre-conditions:** Job must be in `FAILED` status. Restart is not available for `CANCELLED` or `COMPLETE` jobs.

**Request body:**

```jsonc
{
  "restart_from_checkpoint": 7,   /* null = restart from last persisted checkpoint */
  "parameter_overrides": null      /* null = use original job parameters */
}
```

**Restart semantics:** A restart creates a **new job** (`job_id_new`) linked to the original via `parent_job_id`. The new job begins at the specified checkpoint seq — all work before that checkpoint is not repeated. Per-record idempotency keys from the original job are preserved and respected, preventing duplicate writes on restart.

**Response 202:** Standard LRO handle for the new job with `parent_job_id: "lro-uuid-original"`.

---

### 2.6 List LROs

```
PATH        GET /v1/lro
AUTH        Bearer; AAL1; tenant scope
```

**Query parameters:** `status` filter, `operation_type` filter, `from`, `to`, `initiated_by` (principal_id), cursor pagination.

**Response 200:** Paginated list of LRO summaries. Includes `queue_position` for ACCEPTED jobs (position in tenant queue). Completed jobs retained for 7 days; failed jobs retained for 30 days.

---

### 2.7 LRO error detail

```
PATH        GET /v1/lro/{job_id}/error-detail
AUTH        Bearer; Platform Admin or job initiator; AAL1
```

Returns full error context for FAILED jobs: stack trace (sanitized — no sensitive data), per-record failure breakdown (for bulk operations), checkpoint context at time of failure, worker ID, and diagnostic metadata. Used by Platform Admin to diagnose systemic failures and by job initiator to understand if a restart is viable.

---

## 3. Operation type registry (≥ 22 types)

All LRO-producing operations are registered in `lro_operation_type_registry`. Unregistered operations cannot create LROs. Registry defines: operation_type code, display name, max_duration (auto-cancel if exceeded), restart_allowed, cancellable, priority_default, result_retention_days, SLO reference, per-pack extensions.

| # | Operation type code | Initiating API | Max duration | Restart | SLO reference | Notes |
|---|---|---|---|---|---|---|
| 1 | `AUDIT_PACK_EXPORT` | E8 §2.8 | 24h | Yes | SLO-15 | Signed archive; compliance WORM |
| 2 | `DSAR_EXPORT` | E6 | 4h | Yes | — | GDPR Art.20 data export |
| 3 | `AI_BATCH_INVOKE` | E9 §2b.2 | 2h | Yes | SLO-14 | Up to 1,000 records |
| 4 | `BULK_IMPORT` | E11 | 4h | Yes | — | Per-record idempotency |
| 5 | `BULK_EXPORT` | E11 | 4h | Yes | — | Signed manifest |
| 6 | `BULK_COMMAND` | E11 | 2h | Yes | — | 207 multi-status |
| 7 | `FILE_VIRUS_SCAN` | E12 | 30min | Yes | — | ClamAV + secondary |
| 8 | `FILE_CONTENT_INSPECT` | E12 | 1h | Yes | — | ITAR / biocomp / FAI |
| 9 | `WORKSPACE_REBUILD` | E5 | 6h | Yes | SLO-7 | CQRS projection rebuild |
| 10 | `OTG_REPLAY` | E6 | 12h | Yes | — | Offline-to-gateway audit replay |
| 11 | `MOCK_RECALL` | E8 | 2h | Yes | — | Simulated recall scope drill |
| 12 | `PSUR_DRAFT` | E9 AI-21 | 1h | Yes | SLO-14 | J4 PSUR draft; PCCP applies |
| 13 | `APR_DRAFT` | E9 AI-21 | 1h | Yes | SLO-14 | J1 APR draft |
| 14 | `AUDIT_PACK_DRAFT` | E9 AI-31 | 2h | Yes | SLO-14 | Narrative section draft |
| 15 | `MULTI_TENANT_MIGRATION` | Admin | 48h | Yes | — | Non-cancellable once RUNNING |
| 16 | `GUDID_BATCH_SUBMIT` | E11 §J4 | 4h | Yes | — | FDA GUDID UDI batch submission |
| 17 | `EUDAMED_BATCH_SYNC` | E11 §J4 | 4h | Yes | — | EU EUDAMED MDR registration |
| 18 | `GIDEP_BATCH_FETCH` | E11 §J3 | 2h | Yes | — | Government-Industry Data Exchange |
| 19 | `FSMA204_BULK_EXPORT` | E11 §J5 | 2h | Yes | — | FSMA §204 CTE/KDE export for FDA |
| 20 | `ICSR_BULK_SUBMIT` | E11 §J1 | 2h | Yes | — | ICH E2B(R3) ICSR pharmacovigilance |
| 21 | `PCCP_REBUILD` | E9 §2.12 | 4h | Yes | — | Rebuild PCCP evidence validation study |
| 22 | `DSCSA_BULK_VERIFY` | E11 §J1 | 2h | Yes | — | Bulk DSCSA VRS lot chain verification |
| 23 | `REGULATORY_SUBMISSION` | Regulatory | 1h | No | — | Non-cancellable; terminal on RUNNING |
| 24 | `LEGAL_HOLD_BULK_APPLY` | E8 | 30min | No | — | Non-cancellable |
| 25 | `DIGEST_BATCH_SEND` | E10 | 30min | Yes | — | Nightly digest email batch |
| 26 | `AI_GOVERNANCE_EXPORT` | E9 §2b.4 | 1h | Yes | — | Monthly AI governance ledger export |

---

## 4. Per-tenant LRO queue

Each tenant has an isolated job queue. Queue properties:

```
GET /v1/lro/queue
AUTH Bearer; Platform Admin or Compliance Lead
```

**Response:**

```jsonc
{
  "tenant_id": "tenant-uuid",
  "queue_depth": 5,
  "running_count": 2,
  "accepted_count": 3,
  "max_concurrent": 5,           /* Configurable per tenant tier */
  "max_queue_depth": 20,         /* 429 returned if exceeded */
  "priority_queue": {
    "CRITICAL": 0,
    "HIGH": 1,
    "NORMAL": 4
  },
  "oldest_accepted_at": "2025-11-14T08:55:00Z",
  "oldest_accepted_age_min": 5
}
```

**Queue priority:** CRITICAL jobs (e.g., SEV-1 triggered operations, regulatory submission) jump to front. HIGH priority: Platform Admin-tagged jobs. NORMAL: all others. Within same priority: FIFO.

**Queue admission control:** If `queue_depth >= max_queue_depth`, new LRO submissions return `429 QUEUE_FULL` with `Retry-After: 60`. Platform Admin can override queue limit for emergency operations.

**Per-operation-type concurrency limits:** Some operation types have per-type concurrency limits within a tenant:

| Operation type | Max concurrent per tenant |
|---|---|
| `AUDIT_PACK_EXPORT` | 2 |
| `AI_BATCH_INVOKE` | 3 |
| `BULK_IMPORT` / `BULK_EXPORT` | 2 |
| `REGULATORY_SUBMISSION` | 1 |
| `MULTI_TENANT_MIGRATION` | 1 (system-wide) |

---

## 5. SLO-11 acknowledgement

**SLO-11 definition:** Every LRO MUST emit its first checkpoint event within 5 minutes of acceptance. This ensures callers know the job is actively running, not stuck in the queue.

**SLO-11 enforcement:**
- Worker MUST emit `lro_checkpoint` (seq=1) within 300 seconds of `ACCEPTED`.
- If checkpoint is not received within 5 minutes: LRO scheduler marks job `SLO11_BREACH`; SEV-3 alert fires.
- Persistent SLO-11 breach (>3 jobs in 1 hour): SEV-2; Platform Lead investigates worker pool capacity.

**SLO-11 exemptions:** `MULTI_TENANT_MIGRATION` is exempt from SLO-11 (migration lock acquisition can take >5 minutes). Annotated `slo_11_exempt: true` in operation type registry.

**SLO-11 metrics:**
```
hesem_lro_slo11_breach_total{operation_type, tenant}
hesem_lro_time_to_first_checkpoint_seconds{operation_type}
```

---

## 6. Checkpoint and restart mechanics

### 6.1 Checkpoint schema

Every checkpoint saved to `lro_checkpoint` table:

```sql
lro_checkpoint (
  job_id         UUID REFERENCES lro_job(job_id),
  seq            INTEGER,
  phase          TEXT,
  percent        INTEGER,
  state_blob     JSONB,    /* Worker state to resume from */
  created_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (job_id, seq)
)
```

`state_blob` content is operation-type specific — it encodes enough context for the worker to resume without replaying prior work. For bulk operations: last processed record natural key. For audit pack: last evidence_id collected. For AI batch: last input_ref processed.

### 6.2 Exactly-once semantics on restart

Per-record write idempotency is enforced via:

1. **Idempotency key** scoped to `(job_id, record_natural_key)` — stored in `lro_idempotency` table.
2. On restart, worker skips records whose idempotency key is already in the table (already written successfully before the crash).
3. Idempotency keys from parent job are inherited by restart child job (`parent_job_id` link).
4. Idempotency table retention: 30 days per job, then pruned.

This guarantees that even if a worker crashes mid-batch, no record is written twice, and no record is silently skipped.

---

## 7. Result download and retention

LRO results (signed archives, export files) are stored in S3 with pre-signed URL valid for 1 hour after completion. After URL expiry, caller must re-request: `POST /v1/lro/{job_id}/refresh-result-url` (requires same auth; re-generates signed URL for another hour). Maximum re-requests: 10.

**Result retention per operation type:**

| Operation type | Result retained | WORM mode |
|---|---|---|
| `AUDIT_PACK_EXPORT` | 7 years | COMPLIANCE |
| `DSAR_EXPORT` | 90 days | GOVERNANCE |
| `BULK_IMPORT` / `BULK_EXPORT` | 30 days | None |
| `AI_BATCH_INVOKE` | 7 days | None |
| `REGULATORY_SUBMISSION` | 15 years | COMPLIANCE |
| `FSMA204_BULK_EXPORT` | 7 years | COMPLIANCE |
| Other | 7 days | None |

---

## 8. Observability

### 8.1 Prometheus metrics

```
hesem_lro_created_total{operation_type, priority, tenant}
hesem_lro_duration_seconds{operation_type, status}      /* COMPLETE | FAILED */
hesem_lro_queue_depth{tenant, priority}
hesem_lro_running_count{operation_type}
hesem_lro_slo11_breach_total{operation_type, tenant}
hesem_lro_checkpoint_interval_seconds{operation_type}
hesem_lro_restart_count{operation_type}
hesem_lro_worker_crash_count{operation_type}
hesem_lro_result_download_count{operation_type}
```

### 8.2 Alerts

| Alert | Condition | Severity |
|---|---|---|
| LRO_SLO11_BREACH | Any `hesem_lro_slo11_breach_total` increment | SEV-3 |
| LRO_SLO11_PERSISTENT | SLO-11 breach rate > 3/hour for any tenant | SEV-2 |
| LRO_QUEUE_FULL | `queue_depth >= max_queue_depth` for any tenant | SEV-3 |
| LRO_WORKER_CRASH | Any `hesem_lro_worker_crash_count` increment | SEV-3 |
| LRO_WORKER_CRASH_LIMIT | Any job reaches FAILED due to WORKER_CRASH_LIMIT | SEV-2 |
| LRO_AUDIT_PACK_OVERDUE | `AUDIT_PACK_EXPORT` job running > 20h (SLO-15 at risk) | SEV-2 |
| LRO_REGULATORY_STUCK | `REGULATORY_SUBMISSION` job in RUNNING > 45min | SEV-1 |

---

## 9. Operational runbook

### 9.1 Job stuck in RUNNING with no checkpoint

1. Alert: `hesem_lro_slo11_breach_total` increments OR no checkpoint event for > 5 min.
2. Check worker heartbeat: `GET /internal/v1/lro/{job_id}/worker-health`.
3. If worker unresponsive: system auto-requeues within 30s. Monitor for new checkpoint.
4. If repeated crash (WORKER_CRASH_LIMIT): `GET /v1/lro/{job_id}/error-detail` — identify root cause (OOM, deadlock, storage unavailability).
5. If OOM: increase worker memory limit; restart job with `POST /v1/lro/{job_id}/restart`.
6. If storage unavailability (WORM backend): wait for storage recovery; job will restart automatically from last checkpoint.

### 9.2 Audit pack job failing at SIGNING phase

1. SIGNING phase uses HSM for Ed25519 signature. If HSM unavailable: job fails at SIGNING phase checkpoint.
2. Check HSM health: `GET /internal/v1/crypto/hsm-status`.
3. If HSM in maintenance: job can be restarted (`restart_from_checkpoint: last EVIDENCE_COLLECTION checkpoint`) once HSM recovers.
4. If HSM permanently unavailable: escalate to Platform Lead; signing key must be rotated to secondary HSM.

### 9.3 Tenant queue full (regulatory urgency)

1. Caller receives `429 QUEUE_FULL`.
2. If the blocked job is regulatory-critical (e.g., FSMA §204 recall response): Platform Admin uses `POST /internal/v1/lro/queue/{tenant_id}/emergency-slot` to add one emergency queue slot.
3. Emergency slot is single-use; requires Platform Admin AAL3 approval.
4. Notify tenant Compliance Lead that queue was at capacity — may indicate need for tenant tier upgrade.

### 9.4 Regulatory submission job non-cancellable

1. Caller attempts `POST /v1/lro/{job_id}/cancel` on a `REGULATORY_SUBMISSION` job.
2. Returns `409 NON_CANCELLABLE`. This is by design.
3. If submission must be aborted: Legal Counsel must contact the regulatory body directly to withdraw the submission. API cannot undo a submitted regulatory notification.
4. Document withdrawal action in EC-22 audit trail manually with Compliance Lead attestation.

---

`S3-05_E13_LRO_DEEP_UPGRADE_COMPLETE`

`S3-05_E10_E11_E12_E13_DEEP_UPGRADE_COMPLETE`
