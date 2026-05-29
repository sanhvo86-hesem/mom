# P17 Audit Report

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P17-AUD-ARC-01 | Chief Enterprise Architect | Are telemetry signals tied to decisions? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-MES-01 | Manufacturing/MES Architect | Will readiness failures be visible by code? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-FIN-01 | ERP/Finance Architect | Are ledger and period issues observable? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-QUAL-01 | Quality/Regulatory Lead | Are hold/e-sign/audit failures first-class alerts? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-MDG-01 | Master Data Governance Lead | Is data quality owner-bound? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-DBA-01 | DBA/PostgreSQL Architect | Are fallback reads and outbox lag measurable? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-API-01 | API/Integration Architect | Can correlation span commands and projections? | Yes by contract. | P3 | main | N | none | low |
| P17-AUD-SEC-01 | Security/IAM/SoD Lead | Are security incidents integrated? | Yes. | P3 | dashboard spec | N | none | low |
| P17-AUD-SHOP-01 | Shopfloor Supervisor | Will operators see gate spikes reflected back to boards? | Depends on dashboard/UI implementation. | P2 | handoff | Y | bind boards to alerts | medium |
| P17-AUD-WH-01 | Warehouse/Inventory Lead | Are inventory parity failures escalated? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-MNT-01 | Maintenance/Calibration Lead | Is stale adapter heartbeat actionable? | Yes. | P3 | telemetry contract | N | none | low |
| P17-AUD-TOOL-01 | Tooling/CNC Process Engineer | Are breakage and life-stop trends visible? | Covered via gate failures and readiness failures. | P3 | telemetry contract | N | none | low |
| P17-AUD-DQ-01 | Data/AI Governance Lead | Is data quality score actionable not cosmetic? | Yes. | P3 | dashboard spec | N | none | low |
| P17-AUD-SRE-01 | SRE/Observability Lead | Are labels bounded and owners defined? | Yes at design level. | P2 | telemetry contract | Y | implement low-cardinality guards and runbooks | medium |
| P17-AUD-EXT-01 | External Auditor/Customer Auditor | Can incident and reconciliation evidence be exported? | Yes in target model. | P2 | dashboard spec | Y | implement export and retention | medium |
