# P14 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P14-AUD-ARC-01 | Chief Enterprise Architect | Does MDA now gate runtime, not just master data? | Yes. | P3 | main | N | none | low |
| P14-AUD-MES-01 | Manufacturing/MES Architect | Is one readiness service used for release and start? | Defined, not yet implemented. | P2 | matrix | Y | build canonical service | medium |
| P14-AUD-FIN-01 | ERP/Finance Architect | Are completion and scrap cost effects linked? | Yes through P11/P12 hooks. | P3 | simulation | N | none | low |
| P14-AUD-QUAL-01 | Quality/Regulatory Lead | Can failed inspection block completion? | Yes. | P3 | simulation | N | none | low |
| P14-AUD-MDG-01 | Master Data Governance Lead | Are runtime snapshots frozen against later master edits? | Yes by design. | P3 | main | N | none | low |
| P14-AUD-DBA-01 | DBA/PostgreSQL Architect | Is runtime event-first and append-only? | Yes, raw and derived event separation remains. | P3 | main | N | none | low |
| P14-AUD-API-01 | API/Integration Architect | Will worker UI get precise failure codes? | Design requires it; API generation pending. | P2 | handoff | Y | implement command error map | medium |
| P14-AUD-SEC-01 | Security/IAM/SoD Lead | Can offline replay mutate high-risk actions unsafely? | No, candidate-only policy is explicit. | P3 | main | N | none | low |
| P14-AUD-SHOP-01 | Shopfloor Supervisor | Are block reasons actionable? | Depends on P18 UI work. | P2 | handoff | Y | bind gate codes to UI | medium |
| P14-AUD-WH-01 | Warehouse/Inventory Lead | Does issue retry double-consume? | No by command policy. | P3 | simulation | N | none | low |
| P14-AUD-MNT-01 | Maintenance/Calibration Lead | Do critical alarms trigger maintenance or containment? | Yes. | P3 | main | N | none | low |
| P14-AUD-TOOL-01 | Tooling/CNC Process Engineer | Is wrong assembly/program blocked before run? | Yes. | P3 | simulation | N | none | low |
| P14-AUD-DATA-01 | Data/AI Governance Lead | Is operator/machine/tool/program lineage captured? | Yes in frozen snapshot and event model. | P3 | main | N | none | low |
| P14-AUD-SRE-01 | SRE/Observability Lead | Are readiness failures telemetry-ready? | Yes, via P17 contract. | P2 | matrix | Y | wire telemetry | medium |
| P14-AUD-EXT-01 | External Auditor/Customer Auditor | Can you prove why a job was blocked or allowed? | Yes at design level. | P3 | full artifact set | N | none | low |
