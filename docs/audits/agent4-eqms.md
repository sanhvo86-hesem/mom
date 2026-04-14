# Agent 4 - EQMS / Quality / SPC / Compliance

Branch audited: `codex/worldclass-reaudit-20260414-122702`

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 offline inspection replay gap: mobile inspection controller dropped replay identity fields. Remediation forwards `capture_id`, `client_capture_id`, `client_record_id`, `idempotency_key`, and `captured_at` into the service.
- Confirmed P1 evidence finalization governance gap: finalization was auth/CSRF protected but not role-gated. Remediation requires controlled quality/document/compliance roles.
- Deferred: full NCR/CAPA/SPC transactional closure remains blocked by DB-backed workflow bridge design and policy decisions for signature-required evidence classes.

## Findings

- P1: Complaint/MRB/deviation/concession update endpoints bypassed lifecycle discipline by blind field overwrite.
- P1: NCR/CAPA authority remains split between exception stores and `orders/orders.json` compatibility rows.
- P2: SPC calculator endpoints remain ad hoc analysis, not governed inspection-backed SPC streams.
- P2: Evidence idempotency key rules were looser than the platform replay contract.

## Disposition

Fixed now: generic exception updates reject lifecycle fields and unknown fields; evidence idempotency keys use the platform 16-128 character token contract. Deferred: canonical NCR/CAPA authority and inspection-backed SPC stream.
