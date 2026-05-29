# P16 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P16-AUD-ARC-01 | Chief Enterprise Architect | Is security command-scoped, not UI-scoped? | Yes. | P3 | main | N | none | low |
| P16-AUD-MES-01 | Manufacturing/MES Architect | Can OT devices mutate WO or release state? | No. | P3 | abuse cases | N | none | low |
| P16-AUD-FIN-01 | ERP/Finance Architect | Are sensitive finance actions re-authenticated? | Yes in policy. | P3 | permission matrix | N | none | low |
| P16-AUD-QUAL-01 | Quality/Regulatory Lead | Can AI release or close regulated cases? | No. | P3 | main | N | none | low |
| P16-AUD-MDG-01 | Master Data Governance Lead | Is field-level access explicit? | Yes, at matrix level. | P3 | permission matrix | N | none | low |
| P16-AUD-DBA-01 | DBA/PostgreSQL Architect | Are delete/replace attempts on audit/evidence denied? | Yes by abuse cases and prior policies. | P3 | abuse cases | N | none | low |
| P16-AUD-API-01 | API/Integration Architect | Are API token scopes separated from browser sessions? | Yes by policy; runtime enforcement still partial. | P2 | handoff | Y | bind token scopes in command middleware | medium |
| P16-AUD-SEC-01 | Security/IAM/SoD Lead | Is deny-by-default achievable from this design? | Yes. | P3 | main | N | none | low |
| P16-AUD-SHOP-01 | Shopfloor Supervisor | Will operators see why access is denied? | Depends on UI wire-up. | P2 | handoff | Y | expose reason codes in P18 | medium |
| P16-AUD-WH-01 | Warehouse/Inventory Lead | Are count and adjustment roles segregated? | Yes. | P3 | SoD rules | N | none | low |
| P16-AUD-MNT-01 | Maintenance/Calibration Lead | Can a stale adapter mark a machine ready? | No, trust model blocks it. | P3 | abuse cases | N | none | low |
| P16-AUD-TOOL-01 | Tooling/CNC Process Engineer | Can setup tech override breakage holds without QA? | No in policy. | P3 | SoD rules | N | none | low |
| P16-AUD-DATA-01 | Data/AI Governance Lead | Is PII minimized and redactable? | Yes by matrix and privacy rule. | P3 | permission matrix | N | none | low |
| P16-AUD-SRE-01 | SRE/Observability Lead | Are security events observable? | Yes in telemetry contract; implementation pending. | P2 | matrix | Y | wire to P17 | medium |
| P16-AUD-EXT-01 | External Auditor/Customer Auditor | Is autonomous AI action conclusively prevented? | Yes at design level. | P3 | full artifact set | N | none | low |
