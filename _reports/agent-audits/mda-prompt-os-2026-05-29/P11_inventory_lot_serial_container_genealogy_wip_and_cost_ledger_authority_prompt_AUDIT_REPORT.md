# P11 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P11-AUD-ARC-01 | Chief Enterprise Architect | Is quantity truth single-sourced? | Direct balance mutation is forbidden and called out explicitly. | P3 | P11 main | N | none | low |
| P11-AUD-MES-01 | Manufacturing/MES Architect | Can runtime consume without genealogy? | Missing input links must block completion or shipment. | P2 | recall model | Y | keep genealogy gate | medium |
| P11-AUD-FIN-01 | ERP/Finance Architect | Are period and value rules coherent? | Closed-period and cost-hook rules are explicit but runner not implemented. | P2 | ledger invariants | Y | implement reconciliation runner | medium |
| P11-AUD-QUAL-01 | Quality/Regulatory Lead | Can held material still move? | Hold-aware availability rule is explicit. | P3 | simulation report | N | none | low |
| P11-AUD-MDG-01 | Master Data Governance Lead | Are lot/serial/container identities canonical? | Yes, but container-child parity still depends on projection rebuild quality. | P2 | simulation report | Y | add container parity tests | medium |
| P11-AUD-DBA-01 | DBA/PostgreSQL Architect | Are balances projections only? | Yes, by design. | P3 | main | N | none | low |
| P11-AUD-API-01 | API/Integration Architect | Could APIs still expose manual correction? | Adjustment is governed but command implementation is deferred. | P2 | matrix | Y | complete command rollout in P12 | medium |
| P11-AUD-SEC-01 | Security/IAM/SoD Lead | Can someone adjust stock without approval? | Policy blocks it; runtime command still pending. | P2 | matrix | Y | implement approval gate | medium |
| P11-AUD-SHOP-01 | Shopfloor Supervisor | Will operators see actionable block reasons? | Depends on P18 UI implementation. | P2 | handoff | Y | carry to UI contract | medium |
| P11-AUD-WH-01 | Warehouse/Inventory Lead | Can FEFO be bypassed? | Not in target model; enforcement service still to build. | P2 | simulation report | Y | add FEFO policy gate | medium |
| P11-AUD-MNT-01 | Maintenance/Calibration Lead | Does recall include gage and machine context? | Yes in canonical chain. | P3 | recall model | N | none | low |
| P11-AUD-TOOL-01 | Tooling/CNC Process Engineer | Is tool/program context linked to output genealogy? | Yes, but relies on P14 event spine. | P2 | recall model | Y | bind with runtime snapshot | medium |
| P11-AUD-DATA-01 | Data/AI Governance Lead | Is lineage exportable? | Yes at design level. | P3 | recall model | N | none | low |
| P11-AUD-SRE-01 | SRE/Observability Lead | Will drift show up fast enough? | Needs telemetry wiring from P17. | P2 | handoff | Y | connect invariants to alerts | medium |
| P11-AUD-EXT-01 | External Auditor/Customer Auditor | Can a complaint serial be reconstructed end to end? | Yes if genealogy edges are complete; missing edges remain a controlled gap. | P2 | recall model | Y | implement mandatory edge validation | medium |
