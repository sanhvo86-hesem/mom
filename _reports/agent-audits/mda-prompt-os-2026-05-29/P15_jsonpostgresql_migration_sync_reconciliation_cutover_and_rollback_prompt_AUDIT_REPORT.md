# P15 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P15-AUD-MIG-01 | Chief Enterprise Architect | Is cutover sequenced by domain truth, not convenience? | Yes. | P3 | main | N | none | low |
| P15-AUD-MES-01 | Manufacturing/MES Architect | Will runtime snapshots survive cutover? | Yes in target model; rehearsal pending. | P2 | main | Y | include event/history checks in rehearsals | medium |
| P15-AUD-FIN-01 | ERP/Finance Architect | Are ledger mismatches fatal? | Yes. | P3 | protocol | N | none | low |
| P15-AUD-QUAL-01 | Quality/Regulatory Lead | Can archived JSON leak back into authority? | Explicitly forbidden. | P3 | main | N | none | low |
| P15-AUD-MDG-01 | Master Data Governance Lead | Is every governed collection mapped? | Crosswalk covers required minimum set. | P3 | crosswalk | N | none | low |
| P15-AUD-DBA-01 | DBA/PostgreSQL Architect | Is rollback limited to evidence-backed windows? | Yes. | P3 | main | N | none | low |
| P15-AUD-API-01 | API/Integration Architect | Can clients detect fallback and stale reads? | Via telemetry; implementation pending. | P2 | matrix | Y | wire alerts and headers | medium |
| P15-AUD-SEC-01 | Security/IAM/SoD Lead | Can emergency import bypass freeze? | Design blocks it. | P3 | simulation | N | none | low |
| P15-AUD-SHOP-01 | Shopfloor Supervisor | Will production know when cutover is unsafe? | Depends on control tower implementation. | P2 | handoff | Y | expose drift/fallback health | medium |
| P15-AUD-WH-01 | Warehouse/Inventory Lead | Are lot status mismatches cutover blockers? | Yes. | P3 | protocol | N | none | low |
| P15-AUD-MNT-01 | Maintenance/Calibration Lead | Are machine event histories included? | Yes, by reconciliation requirement. | P3 | crosswalk | N | none | low |
| P15-AUD-TOOL-01 | Tooling/CNC Process Engineer | Are NC release receipts preserved? | Yes in crosswalk. | P3 | crosswalk | N | none | low |
| P15-AUD-DATA-01 | Data/AI Governance Lead | Is lineage retained across migration? | Yes via source record mapping. | P3 | crosswalk | N | none | low |
| P15-AUD-SRE-01 | SRE/Observability Lead | Is restore drill mandatory before final switch? | Yes, and still outstanding. | P2 | protocol | Y | run restore rehearsals | medium |
| P15-AUD-EXT-01 | External Auditor/Customer Auditor | Is zero-drift claim evidence-backed? | Not yet; design only. | P2 | full artifact set | Y | produce live reconciliation reports | medium |
