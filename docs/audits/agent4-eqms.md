# Agent 4 - EQMS / Quality / SPC / Compliance

Branch audited: `codex/worldclass-reaudit-20260414-102059`

## Findings

- P1: Complaint/MRB/deviation/concession update endpoints bypassed lifecycle discipline by blind field overwrite.
- P1: NCR/CAPA authority remains split between exception stores and `orders/orders.json` compatibility rows.
- P2: SPC calculator endpoints remain ad hoc analysis, not governed inspection-backed SPC streams.
- P2: Evidence idempotency key rules were looser than the platform replay contract.

## Disposition

Fixed now: generic exception updates reject lifecycle fields and unknown fields; evidence idempotency keys use the platform 16-128 character token contract. Deferred: canonical NCR/CAPA authority and inspection-backed SPC stream.
