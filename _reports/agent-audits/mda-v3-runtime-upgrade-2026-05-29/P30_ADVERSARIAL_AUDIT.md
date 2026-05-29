# P30 Multi-Role Adversarial Audit

Decision after audit: `P30_PASS_WITH_CONTROLLED_GAPS`

## Findings

| Role | Challenge | Result | Repair Or Control |
| --- | --- | --- | --- |
| Source authority reviewer | Did P30 invent package tables without repo evidence? | No. BOM/work-definition/control-plan/inspection-plan/NC/work-order sources exist in migrations and reports. | New tables bind existing sources by member type/table/id/hash instead of duplicating full source schemas. |
| Runtime bypass reviewer | Can Generic CRUD mutate new package tables? | Reduced risk. P30 updates governed registry and fallback denylist. | P31 must add command-only mutation endpoints and tests. |
| Operator safety reviewer | Can shopfloor run stale BOM/routing/NC definitions? | Reduced risk. Package member hashes and WO snapshot table exist; service freezes member manifest hash. | P34 must wire release/start commands to this package snapshot. |
| Quality reviewer | Can package release omit inspection plan? | Repaired at guard level. `inspection_plan_missing` blocks release. | P33 must finish canonical quality hold/order integration. |
| Financial/inventory reviewer | Can BOM changes mutate released production baseline? | Reduced risk. Released package/member immutability blocks mutation and requires successor package. | P36 must consume package/BOM snapshot for issue/cost ledger parity. |
| Security/SoD reviewer | Are e-sign and approval controls complete? | Not complete. P30 adds approval/e-sign hook fields only. | P32 owns re-auth, SoD, record hash, and signature validation. |
| Migration/cutover reviewer | Is live PostgreSQL primary proven? | No. Runtime audit remains `JSON_ONLY`. | P37/P40 must run live migration/reconciliation/restore proof. |
| UI evidence reviewer | Will UI/runtime know new tables? | Partial. Governed registry is updated, generated table registry is not. | P37/P40 must regenerate generated artifacts. |
| Auditor defensibility reviewer | Can P30 claim runtime-ready engineering release authority? | No. Physical root/member proof exists; command/runtime integration remains open. | Decision is controlled-gap pass, not ready pass. |

## Critical Repairs Applied Before Passing

- Added physical package root, member, approval, binding, and WO snapshot tables.
- Added released package/member immutability triggers.
- Added release guard service and tests for all required P30 simulations.
- Corrected the proof matrix so SO/JO/WO release command wiring remains open instead of overstated.
- Kept generated registry, command API, e-sign, live DB, and readiness integration as explicit gaps.
