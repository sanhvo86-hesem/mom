# P28 Multi-Role Adversarial Audit

## Verdict

P28 repaired the physical authority gap for party identity linkage and approval/remap scope, but it is not runtime-complete. The remaining risks are command/e-sign/readiness integration risks assigned to P31, P32, and P34.

## 9-Role Review

| Role | Finding | Severity | Repair Applied Or Owner |
| --- | --- | --- | --- |
| Source authority reviewer | `party`, `party_role`, `users`, `hcm_employees`, and `mes_operator_qualifications` existed, but no `user_party_link`, approval physical tables, or merge remap catalog existed. | P1 | Added migration `232_party_identity_link_authority.sql`. |
| Runtime bypass reviewer | New tables could be mutated by Generic CRUD if not registered. | P1 | Extended `mom/contracts/governed-entities.json` and YAML under `MDA-PARTY-IDENTITY`. |
| Operator safety reviewer | Terminated employee or expired qualification must block start. | P1 | Added `PartyIdentityAuthorityService::evaluateOperatorReadiness()` and tests/smoke. P34 still owns shopfloor command wiring. |
| Quality containment reviewer | Customer quality hold blocking shipment depends on P33 canonical hold, not P28. | P0 inherited | Recorded dependency; no false closure. |
| Financial/inventory reviewer | Duplicate party merge can corrupt SO/PO/NCR/CAPA/inventory/cost references if not enumerated. | P1 | Added `party_merge_remap_catalog` and merge planning guard; P31 owns transactional apply. |
| Security/SoD reviewer | Same person create/approve is blocked only at service-helper level in P28. | P1 | Added SoD evaluator and test; P32 owns e-sign/re-auth/exception lifecycle. |
| Migration/cutover reviewer | New physical tables are not yet in generated table registry or live drift tooling. | P1 | Deliberately not hand-edited; assigned to P37/P40 generation and cutover evidence. |
| UI evidence reviewer | UI can still show legacy customer/supplier/operator projections without authority badges. | P1 | Assigned to P39; P28 adds backend authority only. |
| Auditor defensibility reviewer | This slice has schema, service, tests, smoke, and SSOT guard evidence, but lacks DB migration execution on live PostgreSQL. | P1 | Reported as controlled gap; no runtime-ready claim. |

## Repair Pass

- Physicalized `user_party_link`.
- Added `party_profile_extension` to prevent profile metadata drift.
- Added explicit customer-item and supplier-process approval authority tables.
- Added merge remap catalog.
- Added service tests for terminated employee, expired qualification, expired supplier certificate, self-approval SoD, and unmapped merge references.
- Re-ran PHP syntax, JSON validation, direct smoke, SSOT guard, runtime authority audit, and migration drift check.

## Residual Risk

P28 should pass to P29/P30 only as a controlled-gap step. Production mutation authority is still incomplete until command envelope, idempotency, audit/evidence/outbox, e-sign, and readiness services consume these tables.
