# P36 Adversarial Audit

| Role | Attack question | Finding | Repair applied | Residual risk |
|---|---|---|---|---|
| Source authority reviewer | Are balances still treated as mutable truth? | Before P36 yes: `stock_balances`, `inventory_balance_snapshot`, and `location_balance` were schema/projection tables without DB guard. | Added Generic CRUD hard stop entries and `inventory_projection_mutation_guard()` trigger path. | Existing legacy code must use trusted projection refresh session setting after migration. |
| Runtime bypass reviewer | Can generic CRUD mutate new P36 packet/reconciliation/recall tables? | New tables would be bypassable if not added to registry/denylist. | Added P36 tables to `GenericCrudController` and governed entity registry. | Runtime policy/generated table registry refresh remains P37/P39. |
| Operator safety reviewer | Can a double scan consume twice? | Existing domain handler absent; risk remained open. | Service proves scope/idempotency/request-hash replay behavior and test covers duplicate scan. | Live command handler must persist packet before side effects. |
| Quality containment reviewer | Can held or expired lots enter WIP? | P33/P34 covered quality hold partially but FEFO/expiry was open. | Service blocks active canonical lot hold, expired lot and non-FEFO issue. | Live handler must lock lot rows and pass quality holds from PG. |
| Financial correctness reviewer | Can completion update WO without WIP/cost parity? | Yes before P36; completion ledger packet was not physical. | Added posting packet table and completion WIP/cost planner. | Real WIP/cost ledger writes remain P37 command work. |
| Security/SoD reviewer | Are regulated inventory adjustments and period close e-signed? | P36 does not add regulated command evidence integration. | Period gate has evidence/signature columns; P32 remains required for regulated adjustment/close. | Live SoD/e-sign policy enforcement remains P37/P40. |
| Migration/cutover reviewer | Can period close proceed with ledger/projection mismatch? | GAP-P11-001 was open. | Added reconciliation run/discrepancy/period-close gate and service mismatch block. | Scheduled runner, dashboard and cutover proof remain P37/P38/P39. |
| UI evidence reviewer | Can users see disabled unsafe actions? | Backend denial exists; UI evidence panels are later prompt scope. | Reports and registry mark P36 governed command requirement. | P39 must expose freshness/disabled-state panels. |
| Auditor defensibility reviewer | Is recall export auditable? | Prior recall was design/read-model level only. | Added recall export table and evidence hash service proof. | Final release/void/review workflow remains P37/P41. |

## Re-audit verdict

Critical P36 bypasses were reduced from unproven design to physical/service/test proof. The implementation is not runtime-complete because live command handlers, PG transaction writes, outbox, e-sign, telemetry and cutover drills are still pending. No P0/P1 issue remains without an owner path; P37/P39/P41 own the remaining runtime closure.
