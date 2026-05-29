# P13 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P13-AUD-WF-01 | Chief Enterprise Architect | Is there one source of status truth? | Yes in design; generator implementation still pending. | P2 | workflow authority doc | Y | implement generator | medium |
| P13-AUD-MES-01 | Manufacturing/MES Architect | Are execution statuses distinct from service/maintenance? | Yes. | P3 | workflow authority doc | N | none | low |
| P13-AUD-FIN-01 | ERP/Finance Architect | Are derived SLA states separated from lifecycle? | Yes. | P3 | workflow authority doc | N | none | low |
| P13-AUD-REG-01 | Quality/Regulatory Lead | Do signatures include meaning and record hash? | Yes in policy. | P3 | e-sign policy | N | none | low |
| P13-AUD-MDG-01 | Master Data Governance Lead | Can direct field patch still set released? | Design forbids it; runtime guard pending. | P2 | main | Y | finish command-only enforcement | medium |
| P13-AUD-DBA-01 | DBA/PostgreSQL Architect | Is audit append-only? | Yes by policy. | P3 | evidence model | N | none | low |
| P13-AUD-API-01 | API/Integration Architect | Are frontend options generated from same source? | Design says yes; build chain pending. | P2 | matrix | Y | wire generator outputs | medium |
| P13-AUD-SOD-01 | Security/IAM/SoD Lead | Can requester approve own record? | Explicitly blocked. | P3 | approval matrix | N | none | low |
| P13-AUD-SHOP-01 | Shopfloor Supervisor | Will overrides show why extra approval is required? | Depends on UI implementation. | P2 | handoff | Y | bind to P18 | medium |
| P13-AUD-WH-01 | Warehouse/Inventory Lead | Can hold release happen without disposition? | No by policy. | P3 | approval matrix | N | none | low |
| P13-AUD-MNT-01 | Maintenance/Calibration Lead | Do OOT investigations hold affected lots? | Policy supports it; physical object still pending. | P2 | handoff | Y | carry P08/P13 linkage | medium |
| P13-AUD-TOOL-01 | Tooling/CNC Process Engineer | Is NC release signature meaning explicit? | Yes, through regulated release policy. | P3 | e-sign policy | N | none | low |
| P13-AUD-DATA-01 | Data/AI Governance Lead | Can every decision be exported with lineage? | Yes in model. | P3 | evidence model | N | none | low |
| P13-AUD-SRE-01 | SRE/Observability Lead | Are signature and audit failures observable? | Yes in target telemetry; runtime wiring pending. | P2 | matrix | Y | implement in P17 | medium |
| P13-AUD-EXT-01 | External Auditor/Customer Auditor | Can a critical release be reconstructed end to end? | Yes if generator and audit spine are implemented. | P2 | full artifact set | Y | complete runtime spine | medium |
