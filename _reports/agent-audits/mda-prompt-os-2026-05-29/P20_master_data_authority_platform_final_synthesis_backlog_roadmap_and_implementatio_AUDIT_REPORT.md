# P20 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P20-AUD-PORT-01 | Chief Enterprise Architect | Is roadmap dependency-driven? | Yes. | P3 | build plan | N | none | low |
| P20-AUD-MES-01 | Manufacturing/MES Architect | Does roadmap postpone runtime gates too late? | No; runtime gates are Wave 5 after command spine. | P3 | build plan | N | none | low |
| P20-AUD-FIN-01 | ERP/Finance Architect | Are ledger and period controls preserved in backlog? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-QUAL-01 | Quality/Regulatory Lead | Are holds, e-sign, CAPA, and containment in scope? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-MDG-01 | Master Data Governance Lead | Are data stewardship and quality tasks explicit? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-DBA-01 | DBA/PostgreSQL Architect | Is migration after schema and command readiness? | Yes. | P3 | build plan | N | none | low |
| P20-AUD-API-01 | API/Integration Architect | Can a coding agent implement without guessing? | Yes, via handoff prompts and backlog stories. | P3 | handoff prompts | N | none | low |
| P20-AUD-SEC-01 | Security/IAM/SoD Lead | Is security postponed dangerously? | No, it lands before cutover. | P3 | build plan | N | none | low |
| P20-AUD-SHOP-01 | Shopfloor Supervisor | Is operator UX accounted for? | Yes in frontend and simulation waves. | P3 | backlog | N | none | low |
| P20-AUD-WH-01 | Warehouse/Inventory Lead | Are inventory and hold services explicit? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-MNT-01 | Maintenance/Calibration Lead | Are readiness and OT trust explicit? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-TOOL-01 | Tooling/CNC Process Engineer | Are tooling compatibility and breakage tasks explicit? | Yes. | P3 | backlog | N | none | low |
| P20-AUD-DATA-01 | Data/AI Governance Lead | Are AI boundaries and data quality still visible? | Yes. | P3 | risk register and DoD | N | none | low |
| P20-AUD-SRE-01 | SRE/Observability Lead | Are observability and restore drills in the DoD? | Yes. | P3 | DoD | N | none | low |
| P20-AUD-EXT-01 | External Auditor/Customer Auditor | Does synthesis pretend runtime completion? | No, it stays design-level with controlled gaps. | P3 | main | N | none | low |
