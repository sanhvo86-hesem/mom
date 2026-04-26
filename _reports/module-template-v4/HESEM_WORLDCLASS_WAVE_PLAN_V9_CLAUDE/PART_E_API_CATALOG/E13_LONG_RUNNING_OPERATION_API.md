# E13 — Long-Running Operation API

```
api_family:     Long-Running Operations
owner_role:     API Lead
scope:          Async operation initiation, status polling, result retrieval
```

---

## 1. Purpose

Some HESEM operations take longer than a single HTTP request can
reasonably hold open: bulk export, audit pack generation, DSAR
extraction, OTG event log replay. The Long-Running Operation API
manages these operations through an asynchronous initiate / poll /
retrieve pattern.

---

## 2. Endpoints

### E13.1 — Initiate long-running operation

**Purpose**: Start an asynchronous operation; receive an operation id
to poll.

**Audience**: UI clients initiating exports / pack generation;
external systems initiating bulk operations.

**Success**: HTTP 202 Accepted with Location header pointing to the
status endpoint.

### E13.2 — Operation status

**Purpose**: Poll the status of a long-running operation.

**Status values**: queued, in-progress, completed, failed, cancelled.

**Response includes**: progress percent (when meaningful),
estimated_completion_at, result_uri (when completed), error details
(when failed).

### E13.3 — Cancel operation

**Purpose**: Cancel an in-flight operation when feasible.

**Note**: Some operations are non-cancellable once started (e.g., audit
pack generation that has already produced partial output).

### E13.4 — Result retrieval

**Purpose**: Retrieve the result of a completed operation (typically a
signed download URL).

**Audience**: UI clients after polling indicates completion.

### E13.5 — Operation history

**Purpose**: List long-running operations a user has initiated.

---

## 3. Operation types served by this API

```
- Bulk export (E11.2)
- Audit pack generation (per CAP-C7-12)
- DSAR (Data Subject Access Request) extraction
- OTG event log replay (DR drill, validation rebuild)
- Multi-tenant migration operations
- Connector bulk sync
```

---

## 4. Authentication and authorization

Authenticated session required. Per-operation type role checks.

---

## 5. Idempotency

Initiation is idempotent (idempotency-key required); status polling is
idempotent by nature.

---

## 6. Failure modes

```
- auth/unauthorized      401
- auth/forbidden         403
- server/timeout         504 (operation took too long; retry with
                              shorter scope)
- server/internal-error  500 (operation failed)
```

---

## 7. Wave target

L4 by W4; L5 by W7 (audit pack generator); L7 by W12.

---

## 8. Decision phrase

```
E13_LONG_RUNNING_OPERATION_API_BASELINE_LOCKED
NEXT: E14_ADMIN_API.md
```
