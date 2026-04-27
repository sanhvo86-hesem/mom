# 10 — Workflow Mutation Command Bus
## Purpose

The Command Bus is the only path for controlled mutation. UI does not mutate roots directly. Workspace projections never mutate. Authoritative record shells may request commands only when Authority Ledger, Workflow Guard, Policy, Evidence and API contract allow it.

## Command envelope

```json
{
  "command_id": "uuid-v7-or-ulid",
  "idempotency_key": "tenant:actor:root:record:command:hash",
  "tenant_id": "TENANT-001",
  "root_code": "NQCASE",
  "record_id": "NC-001",
  "command_type": "NQCASE_APPROVE_DISPOSITION",
  "actor_id": "USER-123",
  "actor_role": "Quality Manager",
  "intended_meaning": "I approve the disposition for this nonconformance",
  "precondition_etag": "record-version-hash",
  "payload": {
    "disposition": "use-as-is",
    "reason_code": "MRB_APPROVED"
  },
  "evidence_refs": [
    "EVID-001",
    "INSP-777"
  ],
  "signature_required": true,
  "client_context": {
    "route": "/ops/records/nonconformance-cases/NC-001?tab=overview",
    "ui_surface": "AR"
  },
  "correlation_id": "trace-id"
}
```

## Lifecycle

| Stage | Required checks | Output |
| --- | --- | --- |
| Receive | schema, idempotency, authn | accepted/rejected problem detail |
| Authorize | tenant/object/action policy, SoD | policy decision audit |
| Guard | workflow state, precondition, evidence, training, equipment/material status | guard evidence |
| Sign | signature challenge/meaning/snapshot if required | ESIGN + AUDIT |
| Apply | transactional state change only at authoritative root | updated root + audit |
| Emit | domain event, workflow event, OTG edge, notification, trace | EVENT/WFEVT/OTG/NOTIF |
| Rollback | compensating command or explicit no-reversal rule | rollback evidence |

## Forbidden mutation patterns

- Button inside WS that directly updates record.
- API endpoint that changes state without workflow guard.
- e-sign challenge without meaning/snapshot.
- mutation endpoint that returns generic errors instead of RFC 9457.
- backend state change without audit/event/evidence.
- AI tool that calls mutation command without human approval.
