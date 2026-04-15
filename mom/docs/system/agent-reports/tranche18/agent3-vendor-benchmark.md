# Tranche 18 Pass 1 - Agent 3 Global Vendor Benchmark

Date: 2026-04-15

Scope: official vendor sources only; SAP Digital Manufacturing, Siemens Opcenter APS/Quality, Critical Manufacturing, ETQ, and MasterControl.

## Vendor Matrix

| Vendor family | Table stakes | Repo verified matches | Gaps / overclaim guard |
| --- | --- | --- | --- |
| SAP Digital Manufacturing | MOM execution, planning/logistics coordination, dispatch and monitoring, labor tracking, skills/certifications, S/88 and S/95 production model support | Planning/dispatch concepts, governed execution, quality controls, genealogy, trusted release provenance | No SAP-class closed-loop workforce orchestration, optimizer, or SuccessFactors-equivalent skills lifecycle |
| Siemens Opcenter APS | Strategic/tactical/detailed planning, BOM, MTO/MTS, order-based multi-constraint scheduling, capacity modeling, what-if simulation | Deterministic finite-capacity planning slice and dispatch readiness proof | No verified APS-grade optimizer, BOM/MTO/MTS stack, or sequencing depth |
| Siemens Opcenter Quality / Supplier Quality | Inspection plans, incoming/production/outgoing inspection, SPC, supplier quality, assessments, complaints, closed-loop quality | APQP/PPAP, CAPA/NCR, inspection/release controls, traceability and genealogy evidence | No supplier portal parity, no PLM quality twin integration, FAI/PPAP breadth remains partial |
| Critical Manufacturing | MES genealogy, production history, master data/factory model, multisite, event-centric data, enterprise data platform | Genealogy/provenance, production history, schema/registry authority | No proven enterprise data platform CDM across sites or MES-scale graph explorer |
| ETQ | Document control, training, change control, audits, CAPA, supplier quality, receiving inspection, SCAR, supplier rating | QMS manual/policies and service hooks for CAPA, training, supplier/PPAP concepts | No ETQ-suite connected supplier portal and mature SCAR/rating orchestration proof |
| MasterControl | Document control, training, change, CAPA, audits, production/release records, EBR/MPR, training launched from document/CAPA/production events | Connected governance docs, release evidence services, production record adjacency | No MasterControl-equivalent EBR engine or validated suite-level training automation proof |

## Cross-Vendor Conclusion

The repo is strongest as a governed MOM/EQMS authority layer with traceability, release proof, and registry-backed publication truth. It is not vendor-parity world-class across APS, connected quality suite breadth, or enterprise data platform depth.

## Official Sources

- SAP Digital Manufacturing: https://www.sap.com/products/scm/digital-manufacturing.html
- SAP DM for Execution help: https://help.sap.com/docs/sap-digital-manufacturing/execution/38f0325018bc4a27b9b76cf65d6763b3-61.html
- Siemens Opcenter APS: https://plm.sw.siemens.com/en-US/opcenter/advanced-planning-scheduling-aps/
- Siemens advanced planning: https://www.siemens.com/en-us/products/opcenter/advanced-planning-scheduling-aps/advanced-planning-software/
- Siemens advanced scheduling: https://www.siemens.com/en-us/products/opcenter/advanced-planning-scheduling-aps/advanced-scheduling-software/
- Siemens Opcenter Quality Control: https://plm.sw.siemens.com/en-us/products/opcenter/quality/quality-control/
- Siemens supplier assessment portal: https://plm.sw.siemens.com/en-US/products/opcenter/quality/supplier-assessment-portal/
- Siemens inspection plan management: https://plm.sw.siemens.com/en-US/products/opcenter/quality/inspection-plan-management/
- Critical Manufacturing data platform: https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/
- Critical Manufacturing Genealogic: https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/
- ETQ supply chain quality: https://www.etq.com/supply-chain-quality/
- ETQ connected quality: https://www.etq.com/qa-qc-connected-quality/
- MasterControl training controls: https://www.mastercontrol.com/quality/training-software/controls/
- MasterControl production records: https://www.mastercontrol.com/manufacturing/production-records/
