# P18 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P18-AUD-ARC-01 | Chief Enterprise Architect | Does UI preserve projection vs authority split? | Yes. | P3 | UI matrix | N | none | low |
| P18-AUD-MES-01 | Manufacturing/MES Architect | Can operators understand block reasons? | Yes by contract; UX implementation pending. | P2 | main | Y | show gate codes and next steps | medium |
| P18-AUD-FIN-01 | ERP/Finance Architect | Are sensitive fields role-gated? | Yes by matrix. | P3 | UI matrix | N | none | low |
| P18-AUD-QUAL-01 | Quality/Regulatory Lead | Are evidence and signature panels mandatory on regulated records? | Yes. | P3 | main | N | none | low |
| P18-AUD-MDG-01 | Master Data Governance Lead | Are shells aligned to canonical roots? | Yes. | P3 | UI matrix | N | none | low |
| P18-AUD-DBA-01 | DBA/PostgreSQL Architect | Could local storage become hidden authority? | Explicitly forbidden. | P3 | main | N | none | low |
| P18-AUD-API-01 | API/Integration Architect | Are actions routed through command endpoints only? | Yes. | P3 | UI matrix | N | none | low |
| P18-AUD-SEC-01 | Security/IAM/SoD Lead | Are permission changes reflected in UI state? | Design requires server-truth refresh. | P2 | simulation | Y | implement permission refresh and deny handling | medium |
| P18-AUD-SHOP-01 | Shopfloor Supervisor | Can mobile offline edit released data? | No, candidate-only. | P3 | main | N | none | low |
| P18-AUD-WH-01 | Warehouse/Inventory Lead | Is hold release blocked from dashboards? | Yes. | P3 | simulation | N | none | low |
| P18-AUD-MNT-01 | Maintenance/Calibration Lead | Will readiness board show PM/calibration blockers? | Yes in projection contract. | P3 | UI matrix | N | none | low |
| P18-AUD-TOOL-01 | Tooling/CNC Process Engineer | Is tool life visible at setup? | Required in record/workspace panels. | P3 | main | N | none | low |
| P18-AUD-DATA-01 | Data/AI Governance Lead | Is projection freshness visible? | Yes. | P3 | UI matrix | N | none | low |
| P18-AUD-SRE-01 | SRE/Observability Lead | Will UI carry correlation and command ids into traces? | Design requires it; implementation pending. | P2 | handoff | Y | wire telemetry ids | medium |
| P18-AUD-EXT-01 | External Auditor/Customer Auditor | Can users navigate from runtime snapshot to frozen sources? | Yes by contract. | P3 | simulation | N | none | low |
