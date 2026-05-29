# P12 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P12-AUD-ARC-01 | Chief Enterprise Architect | Is all governed mutation command-scoped? | Catalog says yes, runtime implementation still incomplete. | P2 | command catalog | Y | implement remaining commands | medium |
| P12-AUD-MES-01 | Manufacturing/MES Architect | Can workers still mutate via projections? | Policy forbids it; UI/runtime work remains. | P2 | main and handoff | Y | enforce in P18 | medium |
| P12-AUD-FIN-01 | ERP/Finance Architect | Are period-sensitive commands fail-closed? | Yes in contract. | P3 | command catalog | N | none | low |
| P12-AUD-QUAL-01 | Quality/Regulatory Lead | Does e-sign happen before durable commit? | Yes by contract; runtime spine pending. | P2 | main | Y | implement in P13 | medium |
| P12-AUD-MDG-01 | Master Data Governance Lead | Can Generic CRUD call command internals? | Explicitly disallowed. | P3 | main | N | none | low |
| P12-AUD-DBA-01 | DBA/PostgreSQL Architect | Is outbox atomic with domain state? | Yes by contract. | P3 | main | N | none | low |
| P12-AUD-API-01 | API/Integration Architect | Are problem details sufficiently precise? | Yes, but OpenAPI/Arazzo artifacts still need generation. | P2 | matrix | Y | generate API contracts in implementation | medium |
| P12-AUD-SEC-01 | Security/IAM/SoD Lead | Are CSRF and SoD built into command boundary? | Yes in design; runtime enforcement partially exists. | P2 | main | Y | tighten auth middleware and command checks | medium |
| P12-AUD-SHOP-01 | Shopfloor Supervisor | Will duplicate tap be safe? | Yes via idempotency rules. | P3 | simulation | N | none | low |
| P12-AUD-WH-01 | Warehouse/Inventory Lead | Can operator recover stuck in-progress rows unsafely? | No, recovery is operator-governed only. | P3 | main | N | none | low |
| P12-AUD-MNT-01 | Maintenance/Calibration Lead | Do machine events mutate state directly? | No, adapters stay event-only. | P3 | command catalog | N | none | low |
| P12-AUD-TOOL-01 | Tooling/CNC Process Engineer | Is NC load guarded by same envelope? | Yes in catalog. | P3 | command catalog | N | none | low |
| P12-AUD-DATA-01 | Data/AI Governance Lead | Are correlation and causation exported? | Yes in contract. | P3 | command catalog | N | none | low |
| P12-AUD-SRE-01 | SRE/Observability Lead | Can outbox lag and replay conflicts be observed? | Yes in target telemetry; wiring deferred. | P2 | matrix | Y | wire in P17 | medium |
| P12-AUD-EXT-01 | External Auditor/Customer Auditor | Will every failure return reconstructable error context? | Yes at design level. | P3 | main | N | none | low |
