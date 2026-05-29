# P29 Multi-Role Adversarial Audit

Decision after audit: `P29_PASS_WITH_CONTROLLED_GAPS`

## Findings

| Role | Challenge | Result | Repair Or Control |
| --- | --- | --- | --- |
| Source authority reviewer | Are item and revision still conflated between `items`, `item`, `item_revisions`, and `item_revision`? | Partially. Canonical tables exist, legacy tables still remain. | Added `item_legacy_key_bridge`; cutover remains P37/P40. |
| Runtime bypass reviewer | Can Generic CRUD mutate P29 governed roots? | Reduced risk. Existing guard plus fallback denylist now includes P29 tables. | P31 must add command-only mutation endpoints and tests. |
| Operator safety reviewer | Can a released drawing/spec change affect running work? | Reduced risk. Service and DB triggers block released revision/spec direct edits; ECO snapshot guard blocks WO snapshot mutation. | P30/P34 must freeze full release package and work-order readiness snapshot. |
| Quality reviewer | Are CTQ/CQA specs executable? | Partial. Columns and release guard exist for critical spec measurement method. | P30/P33 must link inspection/control plans and quality holds. |
| Financial/inventory reviewer | Can site planning, storage, quality, and cost profiles drift per site? | Reduced risk. Site profile authority table separates enterprise item header from local profiles. | P36 must consume profile authority in inventory/cost ledger gates. |
| Security/SoD reviewer | Are release approvals and e-sign enforceable here? | Not complete. P29 has no command envelope or signature spine. | P31/P32 own idempotency, SoD, re-auth, e-sign, and audit records. |
| Migration/cutover reviewer | Is PostgreSQL primary proven live? | No. Runtime audit still reports `JSON_ONLY` and database not reachable. | Keep controlled gap; P37/P40 must run live migration/reconciliation/restore evidence. |
| UI evidence reviewer | Will UI know these tables are governed? | Partial. Governed entity registry and fallback denylist are updated; generated registry is stale. | P37/P40 must regenerate table registry/OpenAPI/frontend projections. |
| Auditor defensibility reviewer | Is this enough to claim enterprise-ready item authority? | No. It is a bounded runtime-proof slice only. | Decision remains `PASS_WITH_CONTROLLED_GAPS`, not `PASS_READY_FOR_NEXT`. |

## Critical Repairs Applied Before Passing

- Added physical P29 authority tables instead of leaving customer/supplier crossrefs and site profiles as narrative only.
- Added released revision/spec immutability triggers so protection is not only application-level.
- Added service-level gates for all required P29 simulations.
- Added `GenericCrudController` fallback denylist entries so generated registry lag does not reopen mutation.
- Kept live PostgreSQL cutover, e-sign, command envelope, and generated registry refresh as explicit controlled gaps.
