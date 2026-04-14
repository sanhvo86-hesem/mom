# Tranche 15 Pass 1 - Agent 3 Vendor Benchmark

Date: 2026-04-14

## Official Sources

- SAP Digital Manufacturing: https://www.sap.com/products/scm/digital-manufacturing.html
- SAP Digital Manufacturing orders/nonconformance docs: https://help.sap.com/docs/
- Siemens Opcenter APS: https://www.siemens.com/en-us/products/opcenter/advanced-planning-scheduling-aps/advanced-planning-software/
- Siemens Opcenter MOM/Quality: https://www.siemens.com/en-us/products/opcenter/
- Critical Manufacturing Data Platform: https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/
- Microsoft Dynamics 365 production process: https://learn.microsoft.com/en-us/dynamics365/supply-chain/production-control/production-process-overview
- Oracle Fusion Cloud Manufacturing: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faips/about-oracle-fusion-cloud-manufacturing.html
- Epicor Kinetic Production Management: https://www.epicor.com/en/products/enterprise-resource-planning-erp/kinetic/production-management/
- Tulip Composable MES: https://tulip.co/solutions/composable-mes/
- ETQ/Octave supply chain quality: https://www.etq.com/supply-chain-quality/
- MasterControl production records: https://www.mastercontrol.com/manufacturing/production-records/

## Cross-Vendor Findings

| Vendor family | Table stakes | Repo match | Remaining gap |
|---|---|---|---|
| SAP Digital Manufacturing | MOM execution, order release, labor/skills, nonconformance, top-floor/shop-floor flow. | PARTIAL: repo has governed planning/execution/quality primitives. | No SAP-grade workforce/certification or S/4HANA-linked breadth proof. |
| Siemens Opcenter APS/Quality | BOM/MTO/MTS planning, finite scheduling, inspection/SPC/PPAP, supplier quality. | PARTIAL: dispatch/quality/genealogy foundations exist. | No optimizer-grade APS or supplier-quality portal parity. |
| Critical Manufacturing | Canonical data model, event-centric data, genealogy, production history. | STRONG_PARTIAL: canonical registry/event/genealogy shape is real. | No full enterprise data platform or cross-site CDM rollout proof. |
| ETQ/MasterControl | Document control, training, CAPA, audits, production/release records. | STRONG_PARTIAL: controlled records, evidence, signatures, training/governance exist. | No full QMS app-suite breadth or validated production-record package. |
| Epicor/Microsoft/Oracle/Tulip | ERP/MES/QMS suites, production lifecycle, quality orders, composable operator apps. | PARTIAL: repo has contract/governance/integration foundations. | No suite-level breadth, no-code runtime, or finance-quality lifecycle parity. |

## Fix-Now Items

- Do not present generated artifacts as world-class if database/schema authority is stale.
- Highest leverage is authority-safe publication and database/frontend contract truth before adding new features.

