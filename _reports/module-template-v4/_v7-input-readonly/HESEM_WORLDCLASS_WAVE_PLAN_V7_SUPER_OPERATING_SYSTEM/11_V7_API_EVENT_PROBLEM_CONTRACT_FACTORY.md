# 11 — API, Event, Problem Contract Factory
## Contract-first policy

No live API without OpenAPI contract. No error without RFC 9457 problem details. No domain event without schema version. No data product without data contract. No mutation without command envelope.

## API family contract template

```yaml
openapi: 3.2.0
info:
  title: HESEM Root API
  version: 0.1.0
paths:
  /api/v1/nonconformance-cases/{id}:
    get:
      summary: Read nonconformance case
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200": { description: OK }
        "404": { description: Not found, content: { application/problem+json: { schema: { $ref: "#/components/schemas/Problem" } } } }
components:
  schemas:
    Problem:
      type: object
      required: [type, title, status]
```

## Problem registry

| Problem type | When used | Stop rule |
| --- | --- | --- |
| authority/root-not-found | record id not found or not visible | do not fabricate id |
| authority/workspace-cannot-mutate | mutation launched from projection | disable launcher |
| workflow/invalid-transition | command not valid for current state | block mutation |
| evidence/missing-required-evidence | required evidence not attached | block command |
| signature/meaning-missing | e-sign meaning not registered | disable e-sign |
| contract/schema-version-unsupported | client/server contract mismatch | fallback/rollback |
| live-api/unavailable | live read unavailable | safe fixture fallback only if allowed |

## Event envelope

```json
{
  "event_id": "evt_01",
  "event_type": "NQCASE_DISPOSITION_APPROVED",
  "event_version": "1.0.0",
  "occurred_at": "2026-04-26T00:00:00Z",
  "tenant_id": "TENANT-001",
  "root_code": "NQCASE",
  "record_id": "NC-001",
  "actor_id": "USER-123",
  "correlation_id": "trace-id",
  "payload_hash": "sha256:...",
  "schema_ref": "event-contracts/NQCASE_DISPOSITION_APPROVED.v1.json"
}
```
