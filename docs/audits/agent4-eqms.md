# Agent 4 - EQMS / Quality / SPC / Compliance

Branch audited: `codex/worldclass-closure-20260415-0913`

## 2026-04-15 05:50 Current-Pass Addendum

- Confirmed P2 EQMS drift remains in legacy sidecars: `QualityIntegrationService` and OQC failure handling still write JSON/JSONL quality/NCR/hold sidecars while canonical EQMS tables exist.
- Confirmed P3 reason-code coverage is partial: active OQC and sidecar paths still use literals such as `oqc_failure`, `open`, and `blocked` rather than a single governed lookup.
- No broad EQMS rewrite was safe in this pass because no existing canonical quality command-service entrypoint cleanly owns the sidecar migration. The blocker is documented; canonical evidence/finalization surfaces remain materially stronger and role/org/signature scoped.

## 2026-04-15 Current-Pass Addendum

- Confirmed remaining P1 EQMS risk is legacy quality sidecars: supplier incoming inspections, SPC analytics, NCR/CAPA compatibility rows, and quality integration JSONL sidecars are not yet one governed EQMS authority.
- Refuted new control-plane weakness: evidence finalization, signature challenge consumption, canonical package reads, and form/document release gates are role/signature/org scoped.
- No safe broad EQMS rewrite was attempted in this pass; the blocker is a DB-backed command service and reconciliation plan for legacy quality surfaces.

## 2026-04-14 Current-Pass Addendum

- Confirmed P1 offline inspection replay gap: mobile inspection controller dropped replay identity fields. Remediation forwards `capture_id`, `client_capture_id`, `client_record_id`, `idempotency_key`, and `captured_at` into the service.
- Confirmed P1 evidence finalization governance gap: finalization was auth/CSRF protected but not role-gated. Remediation requires controlled quality/document/compliance roles.
- Confirmed P1 canonical evidence disclosure/completeness gap: canonical package reads were auth-only and finalization could complete without signature events. Remediation requires EQMS read roles plus org scope for package reads and rejects finalization without at least one structured signature event.
- Deferred: full NCR/CAPA/SPC transactional closure remains blocked by DB-backed workflow bridge design and policy decisions for signature-required evidence classes.

## Findings

- P1: Complaint/MRB/deviation/concession update endpoints bypassed lifecycle discipline by blind field overwrite.
- P1: NCR/CAPA authority remains split between exception stores and `orders/orders.json` compatibility rows.
- P2: SPC calculator endpoints remain ad hoc analysis, not governed inspection-backed SPC streams.
- P2: Evidence idempotency key rules were looser than the platform replay contract.

## Disposition

Fixed now: generic exception updates reject lifecycle fields and unknown fields; evidence idempotency keys use the platform 16-128 character token contract. Deferred: canonical NCR/CAPA authority and inspection-backed SPC stream.
